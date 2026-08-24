import './config/env.js';
import cors from 'cors';
import helmet from 'helmet';
import express from 'express';
import { db } from './config/db.js';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/users.js';
import { logger } from './utils/logger.js';
import servicesRoutes from './routes/services.js';
import blockedDaysRoutes from './routes/blockedDays.js';
import appointmentsRoutes from './routes/appointments.js';
import businessHoursRoutes from './routes/businessHours.js';
import { generalLimiter } from './middlewares/rateLimiters.js';

const app = express();

// Proxy para obtener la IP real del cliente
app.set('trust proxy', 1);

// Seguridad HTTP
app.use(helmet());

// CORS solo para el cliente configurado
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
}));

// Parseo de JSON y cookies
app.use(express.json());
app.use(cookieParser());

// Límite general de solicitudes por IP
app.use('/api/v2', generalLimiter);

// Ruta raíz del servidor
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Bienvenido al servidor de gestión de citas',
  });
});

// Healthcheck para plataformas de despliegue
app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.status(200).json({ success: true, status: 'ok' });
  } catch (error) {
    res.status(503).json({ success: false, status: 'db_unreachable' });
  }
});

// Rutas de la API
app.use('/api/v2/auth', authRoutes);
app.use('/api/v2/services', servicesRoutes);
app.use('/api/v2/blocked-days', blockedDaysRoutes);
app.use('/api/v2/appointments', appointmentsRoutes);
app.use('/api/v2/business-hours', businessHoursRoutes);

// Ruta no encontrada
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada',
  });
});

// Manejador global de errores
app.use((err, req, res, next) => {
  const isControlled = err.status && err.status < 500;
  logger.error(`[${req.method}] ${req.originalUrl}`, err);

  if (isControlled) {
    return res.status(err.status).json({
      success: false,
      message: err.message,
    });
  }

  return res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'Ocurrió un error inesperado. Intenta de nuevo más tarde'
      : err.message || 'Error interno del servidor',
  });
});

// Inicia el servidor verificando la conexión a la BD
const startServer = async () => {
  try {
    await db.getConnection();
    logger.info('MySQL conectado correctamente');
    app.listen(process.env.PORT, () => {
      logger.info(`Servidor funcionando en puerto ${process.env.PORT}`);
    });
  } catch (error) {
    logger.error('Error al conectar a MySQL:', error.message);
    process.exit(1);
  }
};

startServer();