import express from 'express';
import { isAdmin } from '../middlewares/admin.js';
import { authMiddleware } from '../middlewares/auth.js';
import * as controller from '../controllers/appointments.js';

const router = express.Router();

// Obtener horarios disponibles (PUBLIC)
router.get('/available-slots', controller.getAvailableSlots);

// Obtener citas del usuario autenticado (CLIENT)
router.get('/my', authMiddleware, controller.getMyAppointments);

// Crear cita (CLIENT)
router.post('/', authMiddleware, controller.create);

// Obtener todas las citas (ADMIN)
router.get('/', authMiddleware, isAdmin, controller.getAll);

// Obtener citas del día indicado (ADMIN)
router.get('/day', authMiddleware, isAdmin, controller.getByDay);

// Obtener resumen de citas (ADMIN)
router.get('/summary', authMiddleware, isAdmin, controller.getSummary);

// Obtener cita por ID (CLIENT)
router.get('/:id', authMiddleware, controller.getById);

// Cancelar cita (CLIENT)
router.put('/:id/cancel', authMiddleware, controller.cancel);

// Reprogramar cita (CLIENT)
router.put('/:id/reschedule', authMiddleware, controller.reschedule);

// Actualizar estado de una cita (ADMIN)
router.put('/:id/status', authMiddleware, isAdmin, controller.updateStatus);

export default router;