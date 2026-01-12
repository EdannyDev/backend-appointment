import express from 'express';
import { db } from '../config/db.js';
import { authMiddleware } from '../middlewares/auth.js';
import { isAdmin } from '../middlewares/admin.js';

const router = express.Router();

const toMinutes = (time) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const buildDateTime = (date, time) => {
  let baseDate;
  if (date instanceof Date) {
    baseDate = new Date(date);
  } 
  else {
    const [y, m, d] = date.split('-').map(Number);
    baseDate = new Date(y, m - 1, d);
  }
  const [h, min] = time.split(':').map(Number);
  baseDate.setHours(h, min, 0, 0);
  return baseDate;
};

// Crear una nueva cita (CLIENT)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { service_id, date, start_time } = req.body;
    const user_id = req.user.id;

    if (!service_id || !date || !start_time) {
      return res.status(400).json({
        success: false,
        message: 'Datos incompletos',
      });
    }

    const [[service]] = await db.query(
      'SELECT duration FROM services WHERE id = ? AND is_active = true',
      [service_id]
    );

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no disponible',
      });
    }

    const [[blocked]] = await db.query(
      'SELECT id FROM blocked_days WHERE date = ?',
      [date]
    );

    if (blocked) {
      return res.status(400).json({
        success: false,
        message: 'Fecha no disponible para reservas',
      });
    }

    const [[calc]] = await db.query(
      'SELECT ADDTIME(?, SEC_TO_TIME(? * 60)) AS end_time',
      [start_time, service.duration]
    );

    const end_time = calc.end_time;

    const [y, m, d] = date.split('-').map(Number);
    const dayOfWeek = new Date(y, m - 1, d).getDay();

    const [[hours]] = await db.query(
      'SELECT start_time, end_time FROM business_hours WHERE day_of_week = ? AND is_active = true',
      [dayOfWeek]
    );

    if (!hours) {
      return res.status(400).json({
        success: false,
        message: 'Horario fuera del horario laboral',
      });
    }

    const startMinutes = toMinutes(start_time);
    const endMinutes = toMinutes(end_time);
    const businessStart = toMinutes(hours.start_time);
    const businessEnd = toMinutes(hours.end_time);

    if (startMinutes < businessStart || endMinutes > businessEnd) {
      return res.status(400).json({
        success: false,
        message: 'Horario fuera del horario laboral',
      });
    }

    const [overlaps] = await db.query(
      `
      SELECT id FROM appointments
      WHERE date = ?
        AND status != 'CANCELLED'
        AND start_time < ?
        AND end_time > ?
      `,
      [date, end_time, start_time]
    );

    if (overlaps.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'El horario ya está ocupado',
      });
    }

    await db.query(
      `
      INSERT INTO appointments
      (user_id, service_id, date, start_time, end_time)
      VALUES (?, ?, ?, ?, ?)
      `,
      [user_id, service_id, date, start_time, end_time]
    );

    res.status(201).json({
      success: true,
      message: 'Cita creada correctamente',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
});

// Mis citas (CLIENT)
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      `
      SELECT a.*, s.name AS service_name
      FROM appointments a
      JOIN services s ON s.id = a.service_id
      WHERE a.user_id = ?
      ORDER BY a.date, a.start_time
      `,
      [req.user.id]
    );

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
});

// Obtener todas las citas (ADMIN)
router.get('/', authMiddleware, isAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      `
      SELECT 
        a.*,
        u.name AS client_name,
        s.name AS service_name
      FROM appointments a
      JOIN users u ON u.id = a.user_id
      JOIN services s ON s.id = a.service_id
      ORDER BY a.date, a.start_time
      `
    );

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
});

// Cancelar una cita (CLIENT)
router.put('/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const [[appointment]] = await db.query(
      'SELECT date, start_time, status FROM appointments WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Cita no encontrada',
      });
    }

    if (appointment.status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        message: 'La cita ya fue cancelada',
      });
    }

    if (appointment.status === 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: 'No se puede cancelar una cita completada',
      });
    }

    const appointmentDateTime = buildDateTime(
      appointment.date,
      appointment.start_time
    );

    if (appointmentDateTime <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'No se puede cancelar una cita pasada',
      });
    }

    await db.query(
      'UPDATE appointments SET status = "CANCELLED" WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Cita cancelada correctamente',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
});

// Cambiar estado de cita (ADMIN)
router.put('/:id/status', authMiddleware, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'];

    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Estado no válido',
      });
    }

    const [result] = await db.query(
      'UPDATE appointments SET status = ? WHERE id = ?',
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cita no encontrada',
      });
    }

    res.json({
      success: true,
      message: 'Estado actualizado correctamente',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
});

// Obtener horarios disponibles (PUBLIC)
router.get('/available-slots', async (req, res) => {
  try {
    const { service_id, date } = req.query;

    if (!service_id || !date) {
      return res.status(400).json({
        success: false,
        message: 'Servicio y fecha son obligatorios',
      });
    }

    const [[blocked]] = await db.query(
      'SELECT id FROM blocked_days WHERE date = ?',
      [date]
    );

    if (blocked) {
      return res.json({ success: true, data: [] });
    }

    const [[service]] = await db.query(
      'SELECT duration FROM services WHERE id = ? AND is_active = true',
      [service_id]
    );

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado',
      });
    }

    const duration = service.duration;

    const [y, m, d] = date.split('-').map(Number);
    const dayOfWeek = new Date(y, m - 1, d).getDay();

    const [[hours]] = await db.query(
      'SELECT start_time, end_time FROM business_hours WHERE day_of_week = ? AND is_active = true',
      [dayOfWeek]
    );

    if (!hours) {
      return res.json({ success: true, data: [] });
    }

    const [appointments] = await db.query(
      `
      SELECT start_time, end_time
      FROM appointments
      WHERE date = ?
        AND status != 'CANCELLED'
      `,
      [date]
    );

    const slots = [];
    const step = 15;

    const businessStart = toMinutes(hours.start_time);
    const businessEnd = toMinutes(hours.end_time);

    for (
      let start = businessStart;
      start + duration <= businessEnd;
      start += step
    ) {
      const end = start + duration;

      const overlaps = appointments.some((a) => {
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

    res.json({
      success: true,
      data: slots,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
});

export default router;