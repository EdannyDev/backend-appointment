import express from 'express';
import { isAdmin } from '../middlewares/admin.js';
import { authMiddleware } from '../middlewares/auth.js';
import * as controller from '../controllers/blockedDays.js';

const router = express.Router();

// Obtener días bloqueados (ADMIN)
router.get('/', authMiddleware, isAdmin, controller.getBlockedDays);

// Bloquear día individual (ADMIN)
router.post('/', authMiddleware, isAdmin, controller.blockDay);

// Bloquear rango de días (ADMIN)
router.post('/range', authMiddleware, isAdmin, controller.blockRange);

// Eliminar rango de días bloqueados (ADMIN)
router.delete('/range', authMiddleware, isAdmin, controller.deleteBlockedRange);

// Eliminar día bloqueado por ID (ADMIN)
router.delete('/:id', authMiddleware, isAdmin, controller.deleteBlockedDay);

export default router;