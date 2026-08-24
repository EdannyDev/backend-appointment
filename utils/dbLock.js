import { db } from '../config/db.js';
import { logger } from './logger.js';

const LOCK_TIMEOUT_SECONDS = 10;

// Ejecuta un callback bajo un lock nombrado de MySQL, exclusivo por fecha
export const withDateLock = async (date, callback) => {
  const connection = await db.getConnection();
  const lockName = `appt_lock:${date}`;

  try {
    const [[lockResult]] = await connection.query(
      'SELECT GET_LOCK(?, ?) AS acquired',
      [lockName, LOCK_TIMEOUT_SECONDS]
    );

    if (!lockResult.acquired)
      throw { status: 409, message: 'El sistema está procesando otra reserva para esta fecha. Intenta de nuevo en unos segundos.' };

    return await callback(connection);
  } finally {
    try {
      await connection.query('SELECT RELEASE_LOCK(?)', [lockName]);
    } catch (releaseError) {
      logger.warn(`No se pudo liberar el lock ${lockName}:`, releaseError.message);
    }
    connection.release();
  }
};