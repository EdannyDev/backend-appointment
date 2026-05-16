import { db } from '../config/db.js';
import { isMultipleOf } from '../utils/number.js';

// Crear servicio
export const createService = async ({ name, description, duration, price }) => {
  if (!name || typeof name !== 'string')
    throw { status: 400, message: 'El nombre es obligatorio' };

  if (!Number.isInteger(duration) || duration <= 0)
    throw { status: 400, message: 'La duración debe ser un entero mayor a 0' };

  if (!isMultipleOf(duration, 15))
    throw { status: 400, message: 'La duración debe ser múltiplo de 15 minutos' };

  if (typeof price !== 'number' || price <= 0)
    throw { status: 400, message: 'El precio debe ser mayor a 0' };

  await db.query(
    `INSERT INTO services (name, description, duration, price)
     VALUES (?, ?, ?, ?)`,
    [name.trim(), description || null, duration, price]
  );

  return {
    success: true,
    message: 'Servicio creado correctamente'
  };
};

// Obtener servicios activos
export const getActiveServices = async () => {
  const [rows] = await db.query(
    `SELECT id, name, description, duration, price
     FROM services
     WHERE is_active = true`
  );

  return {
    success: true,
    data: rows
  };
};

// Obtener todos (admin)
export const getAllServices = async () => {
  const [rows] = await db.query(
    `SELECT *
     FROM services
     ORDER BY id DESC`
  );

  return {
    success: true,
    data: rows
  };
};

// Actualizar servicio
export const updateService = async (id, data) => {
  const [rows] = await db.query(
    `SELECT * FROM services WHERE id = ?`,
    [id]
  );

  const existing = rows[0];

  if (!existing)
    throw { status: 404, message: 'Servicio no encontrado' };

  const name = data.name ?? existing.name;
  const description = data.description ?? existing.description;
  const duration = data.duration ?? existing.duration;
  const price = data.price ?? existing.price;
  const is_active = data.is_active ?? existing.is_active;

  if (!existing.is_active && is_active !== true)
    throw { status: 400, message: 'No se puede modificar un servicio inactivo' };

  if (!Number.isInteger(duration) || duration <= 0)
    throw { status: 400, message: 'Duración inválida' };

  if (!isMultipleOf(duration, 15))
    throw { status: 400, message: 'La duración debe ser múltiplo de 15 minutos' };

  if (typeof price !== 'number' || price <= 0)
    throw { status: 400, message: 'Precio inválido' };

  await db.query(
    `UPDATE services
     SET name = ?, description = ?, duration = ?, price = ?, is_active = ?
     WHERE id = ?`,
    [name.trim(), description || null, duration, price, is_active, id]
  );

  return {
    success: true,
    message: 'Servicio actualizado correctamente'
  };
};

// Desactivar servicio
export const deactivateService = async (id) => {
  const [result] = await db.query(
    `UPDATE services
     SET is_active = false
     WHERE id = ?`,
    [id]
  );

  if (result.affectedRows === 0)
    throw { status: 404, message: 'Servicio no encontrado' };

  return {
    success: true,
    message: 'Servicio desactivado. No aparecerá para nuevas reservas.'
  };
};