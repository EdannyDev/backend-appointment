import express from 'express';
import { isAdmin } from '../middlewares/admin.js';
import { authMiddleware } from '../middlewares/auth.js';
import * as controller from '../controllers/appointments.js';

const router = express.Router();

// Obtener horarios disponibles (PUBLIC)
router.get('/available-slots', controller.getAvailableSlots);

// Obtener mis citas (CLIENT)
router.get('/my', authMiddleware, controller.getMyAppointments);

// Crear una nueva cita (CLIENT)
router.post('/', authMiddleware, controller.create);

// Obtener citas por día (ADMIN)
router.get('/day', authMiddleware, isAdmin, controller.getByDay);

// Obtener todas las citas (ADMIN)
router.get('/', authMiddleware, isAdmin, controller.getAll);

// Obtener cita por ID (CLIENT)
router.get('/:id', authMiddleware, controller.getById);

// Cancelar una cita (CLIENT)
router.put('/:id/cancel', authMiddleware, controller.cancel);

// Reprogramar una cita (CLIENT)
router.put('/:id/reschedule', authMiddleware, controller.reschedule);

// Actualizar el estado de una cita (ADMIN)
router.put('/:id/status', authMiddleware, isAdmin, controller.updateStatus);

export default router;