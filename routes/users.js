import express from 'express';
import {
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter
} from '../middlewares/rateLimiters.js';
import * as controller from '../controllers/users.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = express.Router();

// Registrar usuario (PUBLIC)
router.post('/register', registerLimiter, controller.register);

// Iniciar sesión (PUBLIC)
router.post('/login', loginLimiter, controller.login);

// Reactivar cuenta previamente desactivada (PUBLIC)
router.post('/reactivate-account', loginLimiter, controller.reactivateMyAccount);

// Cerrar sesión (PUBLIC)
router.post('/logout', controller.logout);

// Solicitar restablecimiento de contraseña (PUBLIC)
router.post('/forgot-password', forgotPasswordLimiter, controller.forgotPassword);

// Restablecer contraseña con token (PUBLIC)
router.post('/reset-password', forgotPasswordLimiter, controller.resetPassword);

// Obtener perfil del usuario autenticado (CLIENT | ADMIN)
router.get('/me', authMiddleware, controller.getProfile);

// Actualizar perfil del usuario autenticado (CLIENT | ADMIN)
router.patch('/profile', authMiddleware, controller.updateMyProfile);

// Cambiar contraseña del usuario autenticado (CLIENT | ADMIN)
router.patch('/profile/password', authMiddleware, controller.updateMyPassword);

// Desactivar cuenta del usuario autenticado (CLIENT | ADMIN)
router.delete('/deactivate-account', authMiddleware, controller.deleteMyAccount);

export default router;