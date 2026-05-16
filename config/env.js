import dotenv from 'dotenv';

dotenv.config();

const requiredEnv = [
  'PORT',
  'DB_HOST',
  'DB_USER',
  'DB_NAME',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'CLIENT_URL',
];

requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    console.error(`Variable de entorno faltante: ${key}`);
    process.exit(1);
  }
});

if (
  process.env.NODE_ENV === 'production' &&
  !process.env.DB_PASSWORD
) {
  console.error('DB_PASSWORD es obligatorio en producción');
  process.exit(1);
}