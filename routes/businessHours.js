import express from 'express';
import { isAdmin } from '../middlewares/admin.js';
import { authMiddleware } from '../middlewares/auth.js';
import * as controller from '../controllers/businessHours.js';

const router = express.Router();

// Obtener horarios laborales activos (PUBLIC)
router.get('/', controller.getActiveBusinessHours);

// Obtener todos los horarios laborales (ADMIN)
router.get('/admin', authMiddleware, isAdmin, controller.getAllBusinessHours);

// Guardar o actualizar horario laboral (ADMIN)
router.post('/', authMiddleware, isAdmin, controller.saveBusinessHour);

export default router;