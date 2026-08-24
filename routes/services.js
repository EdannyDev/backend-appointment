import express from 'express';
import { isAdmin } from '../middlewares/admin.js';
import { authMiddleware } from '../middlewares/auth.js';
import * as controller from '../controllers/services.js';

const router = express.Router();

// Obtener servicios activos (PUBLIC)
router.get('/', controller.getActiveServices);

// Obtener todos los servicios (ADMIN)
router.get('/admin', authMiddleware, isAdmin, controller.getAllServices);

// Crear servicio (ADMIN)
router.post('/', authMiddleware, isAdmin, controller.createService);

// Actualizar servicio (ADMIN)
router.put('/:id', authMiddleware, isAdmin, controller.updateService);

// Desactivar servicio (ADMIN)
router.delete('/:id', authMiddleware, isAdmin, controller.deactivateService);

export default router;