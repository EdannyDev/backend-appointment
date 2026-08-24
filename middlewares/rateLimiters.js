import rateLimit from 'express-rate-limit';

const isDev = process.env.NODE_ENV !== 'production';

// Limita intentos de login: 10 intentos por IP cada 15 minutos
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 100 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en unos minutos.',
  },
});

// Limita solicitudes de registro: 5 por IP cada hora
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isDev ? 50 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiadas solicitudes de registro. Intenta de nuevo más tarde.',
  },
});

// Limita solicitudes de restablecimiento de contraseña: 5 por IP cada 15 minutos
export const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 50 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiadas solicitudes de restablecimiento. Intenta de nuevo en unos minutos.',
  },
});

// Limitador general para el resto de la API: 200 solicitudes por IP cada 15 minutos
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 2000 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiadas solicitudes. Intenta de nuevo más tarde.',
  },
});