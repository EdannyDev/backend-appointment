import express from 'express';
import { authMiddleware } from '../middlewares/auth.js';
import { isAdmin } from '../middlewares/admin.js';
import * as Controller from '../controllers/services.js';

const router = express.Router();

// Crear servicio (ADMIN)
router.post('/', authMiddleware, isAdmin, Controller.createService);

// Obtener servicios activos (PUBLIC)
router.get('/', Controller.getActiveServices);

// Obtener todos los servicios (ADMIN)
router.get('/admin', authMiddleware, isAdmin, Controller.getAllServices);

// Actualizar servicio (ADMIN)
router.put('/:id', authMiddleware, isAdmin, Controller.updateService);

// Desactivar servicio (ADMIN)
router.delete('/:id', authMiddleware, isAdmin, Controller.deactivateService);

export default router;