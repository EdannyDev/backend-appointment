import './config/env.js';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/user.js';
import servicesRoutes from './routes/services.js';
import blockedDaysRoutes from './routes/blockedDays.js';
import appointmentsRoutes from './routes/appointments.js';
import businessHoursRoutes from './routes/businessHours.js';
import { db } from './config/db.js';

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/services', servicesRoutes);
app.use('/api/v1/blocked-days', blockedDaysRoutes);
app.use('/api/v1/appointments', appointmentsRoutes);
app.use('/api/v1/business-hours', businessHoursRoutes);

const startServer = async () => {
  try {
    await db.getConnection();
    console.log('MySQL conectado correctamente');

    app.listen(process.env.PORT, () => {
      console.log(`Servidor funcionando en el puerto: ${process.env.PORT}`);
    });
  } catch (error) {
    console.error('Error al conectar a MySQL:', error.message);
    process.exit(1);
  }
};

startServer();