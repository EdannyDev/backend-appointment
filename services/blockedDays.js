import { db } from '../config/db.js';

const MAX_RANGE_DAYS = 90;

// Obtener días bloqueados (ADMIN)
export const getBlockedDays = async (start_date, end_date) => {
  let query = 'SELECT id, date, reason FROM blocked_days';
  const params = [];

  if (start_date && end_date) {
    query += ' WHERE date BETWEEN ? AND ?';
    params.push(start_date, end_date);
  } else if (start_date) {
    query += ' WHERE date >= ?';
    params.push(start_date);
  } else if (end_date) {
    query += ' WHERE date <= ?';
    params.push(end_date);
  }
  query += ' ORDER BY date';

  const [rows] = await db.query(query, params);

  return { success: true, data: rows };
};

// Bloquear día individual (ADMIN)
export const blockDay = async (date, reason) => {
  if (!date)
    throw { status: 400, message: 'La fecha es obligatoria.' };

  const [conflicts] = await db.query(
    `SELECT id FROM appointments
     WHERE date = ?
     AND status IN ('PENDING', 'CONFIRMED')`,
    [date]
  );

  if (conflicts.length > 0)
    throw {
      status: 400,
      message: `No se puede bloquear el día ${date}, ya existen citas registradas.`,
    };

  try {
    await db.query(
      'INSERT INTO blocked_days (date, reason) VALUES (?, ?)',
      [date, reason || null]
    );
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY')
      throw { status: 400, message: `El día ${date} ya se encuentra bloqueado.` };
    throw error;
  }
  return { success: true, message: 'Día bloqueado correctamente.' };
};

// Bloquear rango de días (ADMIN)
export const blockRange = async (start_date, end_date, reason) => {
  if (!start_date || !end_date)
    throw { status: 400, message: 'Fecha inicial y final son obligatorias.' };

  const start = new Date(start_date);
  const end = new Date(end_date);

  if (start > end)
    throw { status: 400, message: 'La fecha inicial no puede ser mayor a la final.' };

  const rangeDays = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;

  if (rangeDays > MAX_RANGE_DAYS)
    throw {
      status: 400,
      message: `El rango no puede ser mayor a ${MAX_RANGE_DAYS} días. Seleccionaste ${rangeDays} días.`,
    };

  const dates = [];
  let current = new Date(start);

  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }

  const [conflicts] = await db.query(
    `SELECT DISTINCT date FROM appointments
     WHERE date IN (?)
     AND status IN ('PENDING', 'CONFIRMED')`,
    [dates]
  );

  if (conflicts.length > 0) {
    const conflictDates = conflicts.map((c) => c.date).join(', ');
    throw {
      status: 400,
      message: `No se puede bloquear el rango. Existen citas en: ${conflictDates}.`,
    };
  }

  const values = dates.map((d) => [d, reason || null]);

  await db.query(
    'INSERT IGNORE INTO blocked_days (date, reason) VALUES ?',
    [values]
  );

  return { success: true, message: 'Rango de fechas bloqueado correctamente.' };
};

// Eliminar rango de días bloqueados (ADMIN)
export const deleteBlockedRange = async (start_date, end_date) => {
  if (!start_date || !end_date)
    throw { status: 400, message: 'Fecha inicial y final son obligatorias.' };

  const [result] = await db.query(
    'DELETE FROM blocked_days WHERE date BETWEEN ? AND ?',
    [start_date, end_date]
  );

  if (result.affectedRows === 0)
    throw { status: 404, message: 'No se encontraron días bloqueados en ese rango.' };

  return { success: true, message: 'Rango eliminado correctamente.' };
};

// Eliminar día bloqueado por ID (ADMIN)
export const deleteBlockedDay = async (id) => {
  const [result] = await db.query(
    'DELETE FROM blocked_days WHERE id = ?',
    [id]
  );

  if (result.affectedRows === 0)
    throw { status: 404, message: 'Día bloqueado no encontrado.' };

  return { success: true, message: 'Día bloqueado eliminado correctamente.' };
};