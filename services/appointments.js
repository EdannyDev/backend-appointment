import { db } from '../config/db.js';
import { toMinutes, buildDateTime } from '../utils/time.js';

const MIN_HOURS_BEFORE_CHANGE = 12;

// Función interna: valida disponibilidad y calcula hora de fin
const validateAndGetEndTime = async ({ service_id, date, start_time, excludeAppointmentId = null }) => {
  const [[service]] = await db.query('SELECT duration FROM services WHERE id = ? AND is_active = true', [service_id]);
  if (!service) throw { status: 404, message: 'Servicio no disponible' };

  const [[blocked]] = await db.query('SELECT id FROM blocked_days WHERE date = ?', [date]);
  if (blocked) throw { status: 400, message: 'Fecha no disponible para reservas' };

  const [[calc]] = await db.query('SELECT ADDTIME(?, SEC_TO_TIME(? * 60)) AS end_time', [start_time, service.duration]);
  const end_time = calc.end_time;

  const [y, m, d] = date.split('-').map(Number);
  const dayOfWeek = new Date(y, m - 1, d).getDay();

  const [[hours]] = await db.query('SELECT start_time, end_time FROM business_hours WHERE day_of_week = ? AND is_active = true', [dayOfWeek]);
  if (!hours) throw { status: 400, message: 'Horario fuera del horario laboral' };

  const startMinutes = toMinutes(start_time);
  const endMinutes = toMinutes(end_time);
  const businessStart = toMinutes(hours.start_time);
  const businessEnd = toMinutes(hours.end_time);
  if (startMinutes < businessStart || endMinutes > businessEnd) throw { status: 400, message: 'Horario fuera del horario laboral' };

  const query = `
    SELECT id FROM appointments 
    WHERE date = ?
      AND status != 'CANCELLED'
      AND start_time < ?
      AND end_time > ?
      ${excludeAppointmentId ? 'AND id != ?' : ''}
  `;
  const params = excludeAppointmentId ? [date, end_time, start_time, excludeAppointmentId] : [date, end_time, start_time];
  const [overlaps] = await db.query(query, params);
  if (overlaps.length > 0) throw { status: 400, message: 'El horario ya está ocupado' };

  return end_time;
};

// Crear cita
export const create = async (userId, data) => {
  const { service_id, date, start_time } = data;
  if (!service_id || !date || !start_time) throw { status: 400, message: 'Datos incompletos' };
  
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw{status:400,message:'Fecha inválida'}

  const appointmentDateTime = buildDateTime(date, start_time);
  if (appointmentDateTime <= new Date()) throw { status: 400, message: 'La cita debe ser futura' };

  const end_time = await validateAndGetEndTime({ service_id, date, start_time });

  await db.query('INSERT INTO appointments (user_id, service_id, date, start_time, end_time) VALUES (?, ?, ?, ?, ?)', [userId, service_id, date, start_time, end_time]);

  return { success: true, message: 'Cita creada correctamente' };
};

// Obtener citas por usuario
export const getByUser = async (userId) => {
  const [rows] = await db.query(`
    SELECT a.id, a.service_id, s.name AS service_name, a.status,
      a.date, a.start_time,
      CONCAT(a.date, ' ', a.start_time) AS start,
      CONCAT(a.date, ' ', a.end_time) AS end
    FROM appointments a
    JOIN services s ON s.id = a.service_id
    WHERE a.user_id = ?
    ORDER BY a.date DESC, a.start_time DESC
  `, [userId]);

    const dataWithPermissions = rows.map(appointment => {
    const appointmentDateTime = buildDateTime(appointment.date, appointment.start_time);
    const diffHours = (appointmentDateTime - new Date()) / (1000 * 60 * 60);
    return {
      ...appointment,
      canModify: ['PENDING', 'CONFIRMED'].includes(appointment.status) && diffHours >= MIN_HOURS_BEFORE_CHANGE
    };
  });
  return { success: true, data: dataWithPermissions };
};

// Obtener una cita específica por ID
export const getById = async (appointmentId, userId) => {
  const [rows] = await db.query(`
    SELECT a.id, a.service_id, s.name AS service_name, 
      s.duration, s.price, a.status, a.date, 
      a.start_time, a.end_time
    FROM appointments a
    JOIN services s ON s.id = a.service_id
    WHERE a.id = ? AND a.user_id = ?
  `, [appointmentId, userId]);

  if (rows.length === 0) throw { status: 404, message: 'Cita no encontrada' };

  const appointment = rows[0];
  const appointmentDateTime = buildDateTime(appointment.date, appointment.start_time);
  const diffHours = (appointmentDateTime - new Date()) / (1000 * 60 * 60);
  const dataWithPermissions = {
    ...appointment,
    canModify: ['PENDING', 'CONFIRMED'].includes(appointment.status) && diffHours >= MIN_HOURS_BEFORE_CHANGE
  };
  return { success: true, data: dataWithPermissions };
};

// Obtener todas las citas ADMIN
export const getAll = async () => {
  const [rows] = await db.query(`
    SELECT a.*, u.name AS client_name, s.name AS service_name
    FROM appointments a
    JOIN users u ON u.id = a.user_id
    JOIN services s ON s.id = a.service_id
    ORDER BY a.date DESC, a.start_time DESC
  `);

  return { success: true, data: rows };
};

// Obtener citas por día (ADMIN)
export const getByDay=async(date)=>{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw{status:400,message:'Fecha inválida'}
      const[rows]=await db.query(`
      SELECT a.id, a.date, a.start_time, a.end_time, a.status, u.name AS client_name, s.name AS service_name,
      CONCAT(a.date,' ',a.start_time) AS start, CONCAT(a.date,' ',a.end_time) AS end
      FROM appointments a JOIN users u ON u.id=a.user_id JOIN services s ON s.id=a.service_id
      WHERE a.date = ? AND a.status NOT IN ('CANCELLED', 'COMPLETED') ORDER BY a.start_time`,[date])
  return{success:true,data:rows}
}

// Cancelar cita
export const cancel = async (appointmentId, userId) => {
  const [[appointment]] = await db.query('SELECT date, start_time, status FROM appointments WHERE id = ? AND user_id = ?', [appointmentId, userId]);
  if (!appointment) throw { status: 404, message: 'Cita no encontrada' };
  if (appointment.status === 'CANCELLED') throw { status: 400, message: 'La cita ya fue cancelada' };
  if (appointment.status === 'COMPLETED') throw { status: 400, message: 'No se puede cancelar una cita completada' };

  const appointmentDateTime = buildDateTime(appointment.date, appointment.start_time);
  const diffHours = (appointmentDateTime - new Date()) / (1000 * 60 * 60);
  if (diffHours < MIN_HOURS_BEFORE_CHANGE) throw { status: 400, message: `No se puede cancelar con menos de ${MIN_HOURS_BEFORE_CHANGE} horas de anticipación` };

  await db.query('UPDATE appointments SET status = "CANCELLED" WHERE id = ?', [appointmentId]);
  return { success: true, message: 'Cita cancelada correctamente' };
};

// Reprogramar cita
export const reschedule = async (appointmentId, userId, data) => {
  const { date, start_time } = data;
  if (!date || !start_time) throw { status: 400, message: 'Fecha y hora son obligatorias' };

  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw{status:400,message:'Fecha inválida'}

  const [[appointment]] = await db.query('SELECT a.* FROM appointments a WHERE a.id = ? AND a.user_id = ?', [appointmentId, userId]);
  if (!appointment) throw { status: 404, message: 'Cita no encontrada' };
  if (!['PENDING', 'CONFIRMED'].includes(appointment.status)) throw { status: 400, message: 'No se pueden reprogramar citas canceladas o completadas' };

  const originalDateTime = buildDateTime(appointment.date, appointment.start_time);
  const diffHours = (originalDateTime - new Date()) / (1000 * 60 * 60);
  if (diffHours < MIN_HOURS_BEFORE_CHANGE) throw { status: 400, message: `No puedes reprogramar con menos de ${MIN_HOURS_BEFORE_CHANGE} horas de anticipación` };

  const newAppointmentDateTime = buildDateTime(date, start_time);
  if (newAppointmentDateTime <= new Date()) throw { status: 400, message: 'La nueva fecha debe ser futura' };

  const end_time = await validateAndGetEndTime({ service_id: appointment.service_id, date, start_time, excludeAppointmentId: appointmentId });
  const requiresReconfirmation = appointment.status === 'CONFIRMED';
  const newStatus = requiresReconfirmation ? 'PENDING' : appointment.status;

  await db.query(`UPDATE appointments SET date = ?, start_time = ?, end_time = ?, status = ? WHERE id = ?`, [date, start_time, end_time, newStatus, appointmentId]);
  return { success: true, message: requiresReconfirmation ? 'Cita reprogramada correctamente y enviada nuevamente para confirmación' : 'Cita reprogramada correctamente' };
};

// Cambiar estado de cita (ADMIN)
export const updateStatus = async (appointmentId, status) => {
  const allowed = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'];
  if (!allowed.includes(status)) throw { status: 400, message: 'Estado no válido' };

  const [result] = await db.query('UPDATE appointments SET status = ? WHERE id = ?', [status, appointmentId]);
  if (result.affectedRows === 0) throw { status: 404, message: 'Cita no encontrada' };

  return { success: true, message: 'Estado actualizado correctamente' };
};

// Obtener horarios disponibles (PUBLIC)
export const getAvailableSlots = async (service_id, date) => {
  if (!service_id || !date) throw { status: 400, message: 'Servicio y fecha son obligatorios' };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw { status: 400, message: 'Fecha inválida' };

  const [y, m, d] = date.split('-').map(Number);
  const selectedDate = new Date(y, m - 1, d);
  const today = new Date();
  const MAX_DAYS_AHEAD = 60;
  const BUFFER_MINUTES = 30;
  const maxDate = new Date();
  maxDate.setDate(today.getDate() + MAX_DAYS_AHEAD);

  if (selectedDate > maxDate)
    return { success: true, data: [] };

  const [[blocked]] = await db.query(
    'SELECT id FROM blocked_days WHERE date = ?',
    [date]
  );

  if (blocked) return { success: true, data: [] };

  const [[service]] = await db.query(
    'SELECT duration FROM services WHERE id = ? AND is_active = true',
    [service_id]
  );

  if (!service) throw { status: 404, message: 'Servicio no encontrado' };
  const duration = service.duration;

  const isToday =
    today.getFullYear() === selectedDate.getFullYear() &&
    today.getMonth() === selectedDate.getMonth() &&
    today.getDate() === selectedDate.getDate();

  const currentMinutes =
    today.getHours() * 60 +
    today.getMinutes() +
    BUFFER_MINUTES;

  const dayOfWeek = selectedDate.getDay();
  const [[hours]] = await db.query(
    'SELECT start_time, end_time FROM business_hours WHERE day_of_week = ? AND is_active = true',
    [dayOfWeek]
  );

  if (!hours) return { success: true, data: [] };

  const [appointments] = await db.query(
    'SELECT start_time, end_time FROM appointments WHERE date = ? AND status != "CANCELLED"',
    [date]
  );

  const slots = [];
  const step = 15;
  const businessStart = toMinutes(hours.start_time);
  const businessEnd = toMinutes(hours.end_time);

  for (let start = businessStart; start + duration <= businessEnd; start += step) {

    if (isToday && start <= currentMinutes) continue;
    const end = start + duration;

    const overlaps = appointments.some(a => {
      const aStart = toMinutes(a.start_time);
      const aEnd = toMinutes(a.end_time);
      return start < aEnd && end > aStart;
    });

    if (!overlaps) {
      const h = String(Math.floor(start / 60)).padStart(2, '0');
      const m = String(start % 60).padStart(2, '0');
      slots.push(`${h}:${m}`);
    }
  }

  return { success: true, data: slots };
};