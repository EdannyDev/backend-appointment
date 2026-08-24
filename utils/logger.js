const isDev = process.env.NODE_ENV !== 'production';

// Logger centralizado — en producción silencia detalles técnicos
export const logger = {
  info: (...args) => {
    if (isDev) console.log('INFO:', ...args);
  },
  warn: (...args) => {
    if (isDev) console.warn('WARN:', ...args);
  },
  error: (...args) => {
    if (isDev) console.error('ERROR:', ...args);
  },
};