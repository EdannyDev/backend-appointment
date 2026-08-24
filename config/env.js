import dotenv from 'dotenv';

dotenv.config();

// Variables de entorno requeridas en todos los entornos
const requiredEnv = [
  'PORT',
  'DB_HOST',
  'DB_USER',
  'DB_NAME',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'CLIENT_URL',
  'RESEND_API_KEY',
  'RESEND_FROM',
  'ADMIN_EMAIL'
];

// Verifica que todas las variables requeridas estén definidas
requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    console.error(`Variable de entorno faltante: ${key}`);
    process.exit(1);
  }
});

// En producción, puerto y contraseña de la BD son obligatorios
if (process.env.NODE_ENV === 'production') {
  if (!process.env.DB_PASSWORD) {
    console.error('DB_PASSWORD es obligatorio en producción');
    process.exit(1);
  }
  if (!process.env.DB_PORT) {
    console.error('DB_PORT es obligatorio en producción');
    process.exit(1);
  }
}