import './config/env.js';
import cors from 'cors';
import helmet from 'helmet';
import express from 'express';
import { db } from './config/db.js';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/user.js';
import servicesRoutes from './routes/services.js';
import blockedDaysRoutes from './routes/blockedDays.js';
import appointmentsRoutes from './routes/appointments.js';
import businessHoursRoutes from './routes/businessHours.js';

const app = express();
app.use(helmet());

app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'Appointments API',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.status(200).json({
      success: true,
      status: 'UP',
      database: 'CONNECTED',
      timestamp: new Date().toISOString(),
    });
  } catch {
    res.status(503).json({
      success: false,
      status: 'DOWN',
      database: 'DISCONNECTED',
    });
  }
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/services', servicesRoutes);
app.use('/api/v1/blocked-days', blockedDaysRoutes);
app.use('/api/v1/appointments', appointmentsRoutes);
app.use('/api/v1/business-hours', businessHoursRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada',
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
  });
});

const startServer = async () => {
  try {
    await db.getConnection();
    console.log('MySQL conectado correctamente');
    app.listen(process.env.PORT, () => {
      console.log(`Servidor funcionando en puerto ${process.env.PORT}`);
    });
  } catch (error) {
    console.error('Error al conectar a MySQL:', error.message);
    process.exit(1);
  }
};

startServer();