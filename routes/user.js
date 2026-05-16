import express from 'express';
import * as controller from '../controllers/user.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = express.Router();

// Registrar usuario
router.post('/register', controller.register);

// Iniciar sesión
router.post('/login', controller.login);

// Cerrar sesión
router.post('/logout', controller.logout);

// Obtener datos del usuario autenticado
router.get('/me', authMiddleware, controller.getProfile);

// Actualizar datos del usuario autenticado
router.patch('/profile', authMiddleware, controller.updateMyProfile);

// Actualizar contraseña del usuario autenticado
router.patch('/profile/password', authMiddleware, controller.updateMyPassword);

// Desactivar cuenta
router.delete('/profile', authMiddleware, controller.deleteMyAccount);

export default router;