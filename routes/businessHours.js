import express from 'express';
import { authMiddleware } from '../middlewares/auth.js';
import { isAdmin } from '../middlewares/admin.js';
import * as Controller from '../controllers/businessHours.js';

const router = express.Router();

// Guardar o actualizar horario laboral (ADMIN)
router.post('/', authMiddleware, isAdmin, Controller.saveBusinessHour);

// Obtener horarios laborales activos (PUBLIC)
router.get('/', Controller.getActiveBusinessHours);

// Obtener todos los horarios laborales (ADMIN)
router.get('/admin', authMiddleware, isAdmin, Controller.getAllBusinessHours);

export default router;