import express from 'express';
import { db } from '../config/db.js';
import { authMiddleware } from '../middlewares/auth.js';
import { isAdmin } from '../middlewares/admin.js';

const router = express.Router();

// Crear un día bloqueado (ADMIN)
router.post('/', authMiddleware, isAdmin, async (req, res) => {
  try {
    const { date, reason } = req.body;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'La fecha es obligatoria',
      });
    }

    await db.query(
      'INSERT INTO blocked_days (date, reason) VALUES (?, ?)',
      [date, reason || null]
    );

    res.status(201).json({
      success: true,
      message: 'Día bloqueado correctamente',
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        message: 'Ese día ya se encuentra bloqueado',
      });
    }

    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
});

// Obtener todos los días bloqueados (ADMIN)
router.get('/', authMiddleware, isAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, date, reason FROM blocked_days ORDER BY date'
    );

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
});

// Eliminar un día bloqueado (ADMIN)
router.delete('/:id', authMiddleware, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      'DELETE FROM blocked_days WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Día bloqueado no encontrado',
      });
    }

    res.json({
      success: true,
      message: 'Día bloqueado eliminado correctamente',
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