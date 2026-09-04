import { db } from '../config/db.js';
import { isMultipleOf } from '../utils/number.js';

// Obtener servicios activos (PUBLIC)
export const getActiveServices = async () => {
  const [rows] = await db.query(
    `SELECT id, name, description, duration, price
     FROM services
     WHERE is_active = true`
  );

  return { success: true, data: rows };
};

// Obtener todos los servicios (ADMIN)
export const getAllServices = async (query = {}) => {
  const page = Math.max(parseInt(query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit) || 10, 1), 100);
  const offset = (page - 1) * limit;
  const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM services');

  const [rows] = await db.query(
    `SELECT *
     FROM services
     ORDER BY id DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );

  return {
    success: true,
    data: rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  };
};

// Crear servicio (ADMIN)
export const createService = async ({ name, description, duration, price }) => {
  if (!name || typeof name !== 'string')
    throw { status: 400, message: 'El nombre es obligatorio' };

  if (!Number.isInteger(duration) || duration <= 0)
    throw { status: 400, message: 'La duración debe ser un número entero mayor a 0' };

  if (!isMultipleOf(duration, 15))
    throw { status: 400, message: 'La duración debe ser múltiplo de 15 minutos' };

  if (typeof price !== 'number' || price <= 0)
    throw { status: 400, message: 'El precio debe ser mayor a 0' };

  await db.query(
    `INSERT INTO services (name, description, duration, price)
      VALUES (?, ?, ?, ?)`,
    [name.trim(), description || null, duration, price]
  );

  return { success: true, message: 'Servicio creado correctamente' };
};

// Actualizar servicio (ADMIN)
export const updateService = async (id, data) => {
  const [rows] = await db.query(
    'SELECT * FROM services WHERE id = ?',
    [id]
  );

  if (!rows.length)
    throw { status: 404, message: 'Servicio no encontrado' };

  const existing = rows[0];

  const name = data.name ?? existing.name;
  const description = data.description ?? existing.description;
  const duration = data.duration ?? existing.duration;
  const price = data.price ?? existing.price;
  const is_active = data.is_active ?? existing.is_active;

  if (!existing.is_active && is_active !== true)
    throw { status: 400, message: 'No se puede modificar un servicio inactivo' };

  if (!Number.isInteger(duration) || duration <= 0)
    throw { status: 400, message: 'La duración debe ser un número entero mayor a 0' };

  if (!isMultipleOf(duration, 15))
    throw { status: 400, message: 'La duración debe ser múltiplo de 15 minutos' };

  if (typeof price !== 'number' || price <= 0)
    throw { status: 400, message: 'El precio debe ser mayor a 0' };

  await db.query(
    `UPDATE services
     SET name = ?, description = ?, duration = ?, price = ?, is_active = ?
     WHERE id = ?`,
    [name.trim(), description || null, duration, price, is_active, id]
  );

  return { success: true, message: 'Servicio actualizado correctamente' };
};

// Desactivar servicio (ADMIN)
export const deactivateService = async (id) => {
  const [result] = await db.query(
    'UPDATE services SET is_active = false WHERE id = ?',
    [id]
  );

  if (result.affectedRows === 0)
    throw { status: 404, message: 'Servicio no encontrado' };

  return {
    success: true,
    message: 'Servicio desactivado. No aparecerá para nuevas reservas.',
  };
};