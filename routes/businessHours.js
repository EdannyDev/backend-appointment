import express from 'express';
import { db } from '../config/db.js';
import { authMiddleware } from '../middlewares/auth.js';
import { isAdmin } from '../middlewares/admin.js';

const router = express.Router();

// Crear o actualizar horarios laborales (ADMIN)
router.post('/', authMiddleware, isAdmin, async (req, res) => {
  try {
    const { day_of_week, start_time, end_time } = req.body;

    if (
      day_of_week === undefined ||
      !start_time ||
      !end_time
    ) {
      return res.status(400).json({
        success: false,
        message: 'Día y horario son obligatorios',
      });
    }

    if (start_time >= end_time) {
      return res.status(400).json({
        success: false,
        message: 'La hora de inicio debe ser menor a la hora de fin',
      });
    }

    await db.query(
      `UPDATE business_hours
       SET is_active = false
       WHERE day_of_week = ?`,
      [day_of_week]
    );

    await db.query(
      `INSERT INTO business_hours (day_of_week, start_time, end_time)
       VALUES (?, ?, ?)`,
      [day_of_week, start_time, end_time]
    );

    res.status(201).json({
      success: true,
      message: 'Horario laboral guardado correctamente',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
});

// Obtener horarios laborales activos (PUBLIC)
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT day_of_week, start_time, end_time
       FROM business_hours
       WHERE is_active = true
       ORDER BY day_of_week`
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

export default router;