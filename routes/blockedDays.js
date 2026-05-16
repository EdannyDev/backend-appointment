import express from 'express';
import { authMiddleware } from '../middlewares/auth.js';
import { isAdmin } from '../middlewares/admin.js';
import * as Controller from '../controllers/blockedDays.js';

const router = express.Router();

// Bloquear día (ADMIN)
router.post('/', authMiddleware, isAdmin, Controller.blockDay);

// Bloquear rango de días (ADMIN)
router.post('/range', authMiddleware, isAdmin, Controller.blockRange);

// Obtener días bloqueados (ADMIN) - permite filtro por rango
router.get('/', authMiddleware, isAdmin, Controller.getBlockedDays);

// Eliminar rango de días bloqueados (ADMIN)
router.delete('/range', authMiddleware, isAdmin, Controller.deleteBlockedRange);

// Eliminar día bloqueado (ADMIN)
router.delete('/:id', authMiddleware, isAdmin, Controller.deleteBlockedDay);

export default router;