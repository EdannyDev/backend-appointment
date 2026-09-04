import { db } from '../config/db.js';
import { isTimeMultipleOf } from '../utils/time.js';

// Obtener horarios laborales activos (PUBLIC)
export const getActiveBusinessHours = async () => {
  const [rows] = await db.query(
    `SELECT day_of_week, start_time, end_time
     FROM business_hours
     WHERE is_active = true
     ORDER BY day_of_week`
  );

  return { success: true, data: rows };
};

// Obtener todos los horarios laborales (ADMIN)
export const getAllBusinessHours = async () => {
  const [rows] = await db.query(
    `SELECT id, day_of_week, start_time, end_time, is_active
     FROM business_hours
     ORDER BY day_of_week`
  );

  return { success: true, data: rows };
};

// Guardar o actualizar horario laboral de un día (ADMIN)
export const saveBusinessHour = async (day, start, end) => {
  if (day === undefined)
    throw { status: 400, message: 'El día es obligatorio' };

  if (!Number.isInteger(day) || day < 0 || day > 6)
    throw { status: 400, message: 'El día debe ser un número entre 0 (domingo) y 6 (sábado)' };

  const [rows] = await db.query(
    `SELECT id, start_time, end_time, is_active
     FROM business_hours
     WHERE day_of_week = ?`,
    [day]
  );

  if (start === null && end === null) {
    if (rows.length === 0) {
      await db.query(
        'INSERT INTO business_hours (day_of_week, is_active) VALUES (?, false)',
        [day]
      );
    } else {
      await db.query(
        'UPDATE business_hours SET start_time = NULL, end_time = NULL, is_active = false WHERE day_of_week = ?',
        [day]
      );
    }
    return { success: true, message: 'Día desactivado correctamente' };
  }

  if (!start || !end)
    throw { status: 400, message: 'La hora de inicio y fin son obligatorias' };

  if (start >= end)
    throw { status: 400, message: 'La hora de inicio debe ser menor a la hora de fin' };

  if (!isTimeMultipleOf(start, 15) || !isTimeMultipleOf(end, 15))
    throw { status: 400, message: 'Los horarios deben ser múltiplos de 15 minutos' };

  const [conflicts] = await db.query(
    `SELECT id FROM appointments
     WHERE DAYOFWEEK(date) - 1 = ?
     AND date >= CURDATE()
     AND status IN ('PENDING', 'CONFIRMED')
     AND (start_time < ? OR end_time > ?)`,
    [day, start, end]
  );

  if (conflicts.length > 0)
    throw { status: 409, message: 'Hay citas futuras fuera del nuevo rango horario' };

  if (rows.length === 0) {
    await db.query(
      `INSERT INTO business_hours (day_of_week, start_time, end_time, is_active)
       VALUES (?, ?, ?, true)`,
      [day, start, end]
    );
  } else {
    await db.query(
      `UPDATE business_hours
       SET start_time = ?, end_time = ?, is_active = true
       WHERE day_of_week = ?`,
      [start, end, day]
    );
  }
  return { success: true, message: 'Horario guardado correctamente' };
};