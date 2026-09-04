import { db } from '../config/db.js';
import {
  sendAppointmentCreatedClient,
  sendAppointmentCreatedAdmin,
  sendAppointmentCancelledClient,
  sendAppointmentCancelledAdmin,
  sendAppointmentRescheduledClient,
  sendAppointmentConfirmedClient,
  sendAppointmentCompletedClient
} from '../utils/email.js';
import { withDateLock } from '../utils/dbLock.js';
import { toMinutes, buildDateTime } from '../utils/time.js';

const MAX_DAYS_AHEAD = 60;
const BUFFER_MINUTES = 30;
const MIN_HOURS_BEFORE_CHANGE = 12;

// Transiciones de estado permitidas para las citas
const ALLOWED_TRANSITIONS = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['CANCELLED', 'COMPLETED'],
  CANCELLED: [],
  COMPLETED: [],
};

// Helper: Obtiene datos completos de una cita con usuario y servicio
const getAppointmentWithDetails = async (appointmentId) => {
  const [rows] = await db.query(
    `SELECT
       a.id, a.date, a.start_time, a.end_time, a.status,
       u.name AS client_name, u.email AS client_email,
       s.name AS service_name
     FROM appointments a
     JOIN users u ON u.id = a.user_id
     JOIN services s ON s.id = a.service_id
     WHERE a.id = ?`,
    [appointmentId]
  );
  return rows[0] || null;
};

// Helper: agrega el flag canModify a una cita según su estado y anticipación
const withCanModify = (appointment) => {
  const appointmentDateTime = buildDateTime(appointment.date, appointment.start_time);
  const diffHours = (appointmentDateTime - new Date()) / (1000 * 60 * 60);
  return {
    ...appointment,
    canModify: ['PENDING', 'CONFIRMED'].includes(appointment.status) &&
      diffHours >= MIN_HOURS_BEFORE_CHANGE,
  };
};

// Helper: Valida disponibilidad del slot y calcula hora de fin
export const validateAndGetEndTime = async ({ service_id, date, start_time, excludeAppointmentId = null }, conn = db) => {
  const [[service]] = await conn.query(
    'SELECT duration FROM services WHERE id = ? AND is_active = true',
    [service_id]
  );

  if (!service)
    throw { status: 404, message: 'Servicio no disponible' };

  const [[blocked]] = await conn.query(
    'SELECT id FROM blocked_days WHERE date = ?',
    [date]
  );

  if (blocked)
    throw { status: 400, message: 'Fecha no disponible para reservas' };

  const [[calc]] = await conn.query(
    'SELECT ADDTIME(?, SEC_TO_TIME(? * 60)) AS end_time',
    [start_time, service.duration]
  );

  const end_time = calc.end_time;
  const [y, m, d] = date.split('-').map(Number);
  const dayOfWeek = new Date(y, m - 1, d).getDay();

  const [[hours]] = await conn.query(
    'SELECT start_time, end_time FROM business_hours WHERE day_of_week = ? AND is_active = true',
    [dayOfWeek]
  );

  if (!hours)
    throw { status: 400, message: 'El negocio no atiende ese día' };

  const startMinutes = toMinutes(start_time);
  const endMinutes = toMinutes(end_time);
  const businessStart = toMinutes(hours.start_time);
  const businessEnd = toMinutes(hours.end_time);

  if (startMinutes < businessStart || endMinutes > businessEnd)
    throw { status: 400, message: 'El horario está fuera del horario laboral' };

  const appointmentDateTime = buildDateTime(date, start_time);
  const minAllowedDateTime = new Date(Date.now() + BUFFER_MINUTES * 60 * 1000);

  if (appointmentDateTime < minAllowedDateTime)
    throw { status: 400, message: `Debes reservar con al menos ${BUFFER_MINUTES} minutos de anticipación` };

  const query = `
    SELECT id FROM appointments
    WHERE date = ?
      AND status != 'CANCELLED'
      AND start_time < ?
      AND end_time > ?
    ${excludeAppointmentId ? 'AND id != ?' : ''}
  `;

  const params = excludeAppointmentId
    ? [date, end_time, start_time, excludeAppointmentId]
    : [date, end_time, start_time];

  const [overlaps] = await conn.query(query, params);

  if (overlaps.length > 0)
    throw { status: 409, message: 'El horario seleccionado ya está ocupado' };

  return end_time;
};

// Obtener horarios disponibles (PUBLIC)
export const getAvailableSlots = async (service_id, date, conn = db) => {
  if (!service_id || !date)
    throw { status: 400, message: 'El servicio y la fecha son obligatorios' };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw { status: 400, message: 'Formato de fecha inválido. Use YYYY-MM-DD.' };

  const [y, m, d] = date.split('-').map(Number);
  const selectedDate = new Date(y, m - 1, d);
  const today = new Date();

  const maxDate = new Date();
  maxDate.setDate(today.getDate() + MAX_DAYS_AHEAD);

  if (selectedDate > maxDate)
    return { success: true, data: [] };

  const [[blocked]] = await conn.query(
    'SELECT id FROM blocked_days WHERE date = ?',
    [date]
  );

  if (blocked)
    return { success: true, data: [] };

  const [[service]] = await conn.query(
    'SELECT duration FROM services WHERE id = ? AND is_active = true',
    [service_id]
  );

  if (!service)
    throw { status: 404, message: 'Servicio no encontrado' };

  const dayOfWeek = selectedDate.getDay();

  const [[hours]] = await conn.query(
    'SELECT start_time, end_time FROM business_hours WHERE day_of_week = ? AND is_active = true',
    [dayOfWeek]
  );

  if (!hours)
    return { success: true, data: [] };

  const [appointments] = await conn.query(
    `SELECT start_time, end_time FROM appointments
     WHERE date = ? AND status != 'CANCELLED'`,
    [date]
  );

  const isToday =
    today.getFullYear() === selectedDate.getFullYear() &&
    today.getMonth() === selectedDate.getMonth() &&
    today.getDate() === selectedDate.getDate();

  const currentMinutes = today.getHours() * 60 + today.getMinutes() + BUFFER_MINUTES;

  const slots = [];
  const businessStart = toMinutes(hours.start_time);
  const businessEnd = toMinutes(hours.end_time);

  for (let start = businessStart; start + service.duration <= businessEnd; start += 15) {
    if (isToday && start <= currentMinutes) continue;

    const end = start + service.duration;

    const overlaps = appointments.some((a) => {
      const aStart = toMinutes(a.start_time);
      const aEnd = toMinutes(a.end_time);
      return start < aEnd && end > aStart;
    });

    if (!overlaps) {
      const h = String(Math.floor(start / 60)).padStart(2, '0');
      const min = String(start % 60).padStart(2, '0');
      slots.push(`${h}:${min}`);
    }
  }

  return { success: true, data: slots };
};

// Obtener citas del usuario autenticado (CLIENT)
export const getByUser = async (userId, query = {}) => {
  const { start, end } = query;

  if (start && end) {
    const [rows] = await db.query(
      `SELECT
         a.id, a.service_id, s.name AS service_name, a.status,
         a.date, a.start_time, a.end_time,
         CONCAT(a.date, ' ', a.start_time) AS start,
         CONCAT(a.date, ' ', a.end_time) AS end
       FROM appointments a
       JOIN services s ON s.id = a.service_id
       WHERE a.user_id = ? AND a.date BETWEEN ? AND ?
       ORDER BY a.date DESC, a.start_time DESC`,
      [userId, start.slice(0, 10), end.slice(0, 10)]
    );

    return { success: true, data: rows.map(withCanModify) };
  }

  const page = Math.max(parseInt(query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit) || 10, 1), 100);
  const offset = (page - 1) * limit;

  const [[{ total }]] = await db.query(
    'SELECT COUNT(*) AS total FROM appointments WHERE user_id = ?',
    [userId]
  );

  const [rows] = await db.query(
    `SELECT
       a.id, a.service_id, s.name AS service_name, a.status,
       a.date, a.start_time, a.end_time,
       CONCAT(a.date, ' ', a.start_time) AS start,
       CONCAT(a.date, ' ', a.end_time) AS end
     FROM appointments a
     JOIN services s ON s.id = a.service_id
     WHERE a.user_id = ?
     ORDER BY a.date DESC, a.start_time DESC
     LIMIT ? OFFSET ?`,
    [userId, limit, offset]
  );

  return {
    success: true,
    data: rows.map(withCanModify),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  };
};

// Crear cita (CLIENT)
export const create = async (userId, data) => {
  const { service_id, date, start_time } = data;

  if (!service_id || !date || !start_time)
    throw { status: 400, message: 'Datos incompletos' };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw { status: 400, message: 'Formato de fecha inválido. Use YYYY-MM-DD.' };

  const insertId = await withDateLock(date, async (conn) => {
    const end_time = await validateAndGetEndTime({ service_id, date, start_time }, conn);

    const [result] = await conn.query(
      `INSERT INTO appointments (user_id, service_id, date, start_time, end_time)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, service_id, date, start_time, end_time]
    );

    return result.insertId;
  });

  const details = await getAppointmentWithDetails(insertId);
  if (details) {
    sendAppointmentCreatedClient(details.client_email, {
      clientName: details.client_name,
      serviceName: details.service_name,
      date: details.date,
      startTime: details.start_time,
      endTime: details.end_time,
    });
    sendAppointmentCreatedAdmin({
      clientName: details.client_name,
      clientEmail: details.client_email,
      serviceName: details.service_name,
      date: details.date,
      startTime: details.start_time,
      endTime: details.end_time,
    });
  }

  return { success: true, message: 'Cita creada correctamente' };
};

// Obtener todas las citas (ADMIN)
export const getAll = async (query = {}) => {
  const page = Math.max(parseInt(query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit) || 10, 1), 100);
  const offset = (page - 1) * limit;

  const conditions = [];
  const params = [];

  if (query.search) {
    conditions.push('(u.name LIKE ? OR s.name LIKE ?)');
    const term = `%${query.search}%`;
    params.push(term, term);
  }

  if (query.status && query.status !== 'ALL') {
    conditions.push('a.status = ?');
    params.push(query.status);
  }

  if (query.start && query.end) {
    conditions.push('a.date BETWEEN ? AND ?');
    params.push(query.start, query.end);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total
     FROM appointments a
     JOIN users u ON u.id = a.user_id
     JOIN services s ON s.id = a.service_id
     ${whereClause}`,
    params
  );

  const [rows] = await db.query(
    `SELECT
       a.*,
       u.name AS client_name,
       s.name AS service_name
     FROM appointments a
     JOIN users u ON u.id = a.user_id
     JOIN services s ON s.id = a.service_id
     ${whereClause}
     ORDER BY a.date DESC, a.start_time DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    success: true,
    data: rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  };
};

// Obtener citas del día indicado (ADMIN)
export const getByDay = async (date) => {
  if (!date)
    throw { status: 400, message: 'La fecha es obligatoria' };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw { status: 400, message: 'Formato de fecha inválido. Use YYYY-MM-DD.' };

  const [rows] = await db.query(
    `SELECT
       a.id, a.date, a.start_time, a.end_time, a.status,
       u.name AS client_name,
       s.name AS service_name,
       CONCAT(a.date, ' ', a.start_time) AS start,
       CONCAT(a.date, ' ', a.end_time) AS end
     FROM appointments a
     JOIN users u ON u.id = a.user_id
     JOIN services s ON s.id = a.service_id
     WHERE a.date = ?
       AND a.status NOT IN ('CANCELLED', 'COMPLETED')
     ORDER BY a.start_time`,
    [date]
  );

  return { success: true, data: rows };
};

// Obtener resumen de citas (ADMIN)
export const getSummary = async () => {
  const [[{ today }]] = await db.query(
    `SELECT COUNT(*) AS today
     FROM appointments
     WHERE date = CURDATE()
       AND status NOT IN ('CANCELLED', 'COMPLETED')`
  );

  const [[{ pending }]] = await db.query(
    "SELECT COUNT(*) AS pending FROM appointments WHERE status = 'PENDING'"
  );

  const [[{ cancelled }]] = await db.query(
    "SELECT COUNT(*) AS cancelled FROM appointments WHERE status = 'CANCELLED'"
  );

  const [upcoming] = await db.query(
    `SELECT
       a.id, a.date, a.start_time, a.end_time,
       u.name AS client_name,
       s.name AS service_name
     FROM appointments a
     JOIN users u ON u.id = a.user_id
     JOIN services s ON s.id = a.service_id
     WHERE a.status IN ('PENDING', 'CONFIRMED')
       AND TIMESTAMP(a.date, a.start_time) > NOW()
     ORDER BY a.date ASC, a.start_time ASC
     LIMIT 3`
  );

  return {
    success: true,
    data: { today, pending, cancelled, upcoming },
  };
};

// Obtener cita por ID (CLIENT)
export const getById = async (appointmentId, userId) => {
  const [rows] = await db.query(
    `SELECT
       a.id, a.service_id,
       s.name AS service_name, s.description AS service_description, s.duration, s.price,
       a.status, a.date, a.start_time, a.end_time
     FROM appointments a
     JOIN services s ON s.id = a.service_id
     WHERE a.id = ? AND a.user_id = ?`,
    [appointmentId, userId]
  );

  if (!rows.length)
    throw { status: 404, message: 'Cita no encontrada' };

  return { success: true, data: withCanModify(rows[0]) };
};

// Cancelar cita (CLIENT)
export const cancel = async (appointmentId, userId) => {
  const [[appointment]] = await db.query(
    `SELECT a.date, a.start_time, a.end_time, a.status,
            u.name AS client_name, u.email AS client_email,
            s.name AS service_name
     FROM appointments a
     JOIN users u ON u.id = a.user_id
     JOIN services s ON s.id = a.service_id
     WHERE a.id = ? AND a.user_id = ?`,
    [appointmentId, userId]
  );

  if (!appointment)
    throw { status: 404, message: 'Cita no encontrada' };

  if (appointment.status === 'CANCELLED')
    throw { status: 400, message: 'La cita ya fue cancelada' };

  if (appointment.status === 'COMPLETED')
    throw { status: 400, message: 'No se puede cancelar una cita completada' };

  const appointmentDateTime = buildDateTime(appointment.date, appointment.start_time);
  const diffHours = (appointmentDateTime - new Date()) / (1000 * 60 * 60);

  if (diffHours < MIN_HOURS_BEFORE_CHANGE)
    throw {
      status: 400,
      message: `Solo puedes cancelar con al menos ${MIN_HOURS_BEFORE_CHANGE} horas de anticipación`,
    };

  await db.query(
    'UPDATE appointments SET status = "CANCELLED" WHERE id = ?',
    [appointmentId]
  );

  sendAppointmentCancelledClient(appointment.client_email, {
    clientName: appointment.client_name,
    serviceName: appointment.service_name,
    date: appointment.date,
    startTime: appointment.start_time,
    endTime: appointment.end_time,
    cancelledByAdmin: false,
  });
  sendAppointmentCancelledAdmin({
    clientName: appointment.client_name,
    clientEmail: appointment.client_email,
    serviceName: appointment.service_name,
    date: appointment.date,
    startTime: appointment.start_time,
    endTime: appointment.end_time,
  });

  return { success: true, message: 'Cita cancelada correctamente' };
};

// Reprogramar cita (CLIENT)
export const reschedule = async (appointmentId, userId, data) => {
  const { date, start_time } = data;

  if (!date || !start_time)
    throw { status: 400, message: 'La nueva fecha y hora son obligatorias' };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw { status: 400, message: 'Formato de fecha inválido. Use YYYY-MM-DD.' };

  const [[appointment]] = await db.query(
    `SELECT a.*, u.name AS client_name, u.email AS client_email,
            s.name AS service_name
     FROM appointments a
     JOIN users u ON u.id = a.user_id
     JOIN services s ON s.id = a.service_id
     WHERE a.id = ? AND a.user_id = ?`,
    [appointmentId, userId]
  );

  if (!appointment)
    throw { status: 404, message: 'Cita no encontrada' };

  if (!['PENDING', 'CONFIRMED'].includes(appointment.status))
    throw { status: 400, message: 'Solo se pueden reprogramar citas pendientes o confirmadas' };

  const originalDateTime = buildDateTime(appointment.date, appointment.start_time);
  const diffHours = (originalDateTime - new Date()) / (1000 * 60 * 60);

  if (diffHours < MIN_HOURS_BEFORE_CHANGE)
    throw {
      status: 400,
      message: `Solo puedes reprogramar con al menos ${MIN_HOURS_BEFORE_CHANGE} horas de anticipación`,
    };

  const requiresReconfirmation = appointment.status === 'CONFIRMED';
  const newStatus = requiresReconfirmation ? 'PENDING' : appointment.status;

  let end_time;

  await withDateLock(date, async (conn) => {
    end_time = await validateAndGetEndTime({
      service_id: appointment.service_id,
      date,
      start_time,
      excludeAppointmentId: appointmentId,
    }, conn);

    await conn.query(
      'UPDATE appointments SET date = ?, start_time = ?, end_time = ?, status = ? WHERE id = ?',
      [date, start_time, end_time, newStatus, appointmentId]
    );
  });

  sendAppointmentRescheduledClient(appointment.client_email, {
    clientName: appointment.client_name,
    serviceName: appointment.service_name,
    date,
    startTime: start_time,
    endTime: end_time,
  });

  return {
    success: true,
    message: requiresReconfirmation
      ? 'Cita reprogramada correctamente. Queda pendiente de confirmación.'
      : 'Cita reprogramada correctamente',
  };
};

// Actualizar estado de una cita (ADMIN)
export const updateStatus = async (appointmentId, status) => {
  const allowed = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'];

  if (!allowed.includes(status))
    throw { status: 400, message: 'Estado no válido' };

  const [[appointment]] = await db.query(
    'SELECT status, date, start_time FROM appointments WHERE id = ?',
    [appointmentId]
  );

  if (!appointment)
    throw { status: 404, message: 'Cita no encontrada' };

  if (appointment.status === status)
    throw { status: 400, message: `La cita ya se encuentra en estado ${status}` };

  if (!ALLOWED_TRANSITIONS[appointment.status].includes(status))
    throw {
      status: 400,
      message: `No se puede cambiar una cita de ${appointment.status} a ${status}`,
    };

  if (status === 'COMPLETED') {
    const appointmentDateTime = buildDateTime(appointment.date, appointment.start_time);
    if (appointmentDateTime > new Date())
      throw { status: 400, message: 'No puedes marcar como completada una cita que aún no ha ocurrido' };
  }

  await db.query(
    'UPDATE appointments SET status = ? WHERE id = ?',
    [status, appointmentId]
  );

  const details = await getAppointmentWithDetails(appointmentId);
  if (details) {
    if (status === 'CONFIRMED') {
      sendAppointmentConfirmedClient(details.client_email, {
        clientName: details.client_name,
        serviceName: details.service_name,
        date: details.date,
        startTime: details.start_time,
        endTime: details.end_time,
      });
    } else if (status === 'CANCELLED') {
      sendAppointmentCancelledClient(details.client_email, {
        clientName: details.client_name,
        serviceName: details.service_name,
        date: details.date,
        startTime: details.start_time,
        endTime: details.end_time,
        cancelledByAdmin: true,
      });
    } else if (status === 'COMPLETED') {
      sendAppointmentCompletedClient(details.client_email, {
        clientName: details.client_name,
        serviceName: details.service_name,
        date: details.date,
        startTime: details.start_time,
        endTime: details.end_time,
      });
    }
  }

  return { success: true, message: 'Estado actualizado correctamente' };
};