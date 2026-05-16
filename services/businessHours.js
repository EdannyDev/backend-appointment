import { db } from '../config/db.js';
import { isTimeMultipleOf } from '../utils/time.js';

// Guardar o actualizar horario laboral
export const saveBusinessHour = async (day, start, end) => {
  if (day === undefined) {
    throw { status: 400, message: 'Día requerido' };
  }

  if (!Number.isInteger(day) || day < 0 || day > 6) {
    throw { status: 400, message: 'Día inválido' };
  }

  const [rows] = await db.query(
    `SELECT id, start_time, end_time, is_active
     FROM business_hours
     WHERE day_of_week = ?`,
    [day]
  );

  if (start === null && end === null) {
    if (rows.length === 0) {
      await db.query(
        `INSERT INTO business_hours (day_of_week, is_active)
         VALUES (?, false)`,
        [day]
      );
      return { success: true, message: 'Día desactivado' };
    }

    await db.query(
      `UPDATE business_hours
       SET is_active = false
       WHERE day_of_week = ?`,
      [day]
    );

    return { success: true, message: 'Día desactivado' };
  }

  if (!start || !end) {
    throw { status: 400, message: 'Horas requeridas' };
  }

  if (start >= end) {
    throw { status: 400, message: 'Inicio debe ser menor' };
  }

  if (!isTimeMultipleOf(start, 15) || !isTimeMultipleOf(end, 15)) {
    throw { status: 400, message: 'Debe ser múltiplo de 15' };
  }

  const [conflicts] = await db.query(
    `SELECT id
     FROM appointments
     WHERE DAYOFWEEK(date) - 1 = ?
     AND status IN ('PENDING', 'CONFIRMED')
     AND (start_time < ? OR end_time > ?)`,
    [day, start, end]
  );

  if (conflicts.length > 0) {
    throw { status: 400, message: 'Hay citas fuera del nuevo rango horario' };
  }

  if (rows.length === 0) {
    await db.query(
      `INSERT INTO business_hours (day_of_week, start_time, end_time, is_active)
       VALUES (?, ?, ?, true)`,
      [day, start, end]
    );
  } else {
    await db.query(
      `UPDATE business_hours
       SET 
         start_time = ?,
         end_time = ?,
         is_active = true
       WHERE day_of_week = ?`,
      [start, end, day]
    );
  }

  return {
    success: true,
    message: 'Horario guardado'
  };
};

// Obtener horarios laborales activos
export const getActiveBusinessHours = async () => {
  const [rows] = await db.query(
    `SELECT day_of_week, start_time, end_time 
     FROM business_hours 
     WHERE is_active = true 
     ORDER BY day_of_week`
  );

  return {
    success: true,
    data: rows
  };
};

// Obtener todos los horarios laborales
export const getAllBusinessHours = async () => {
  const [rows] = await db.query(
    `SELECT id, day_of_week, start_time, end_time, is_active 
     FROM business_hours 
     ORDER BY day_of_week`
  );

  return {
    success: true,
    data: rows
  };
};