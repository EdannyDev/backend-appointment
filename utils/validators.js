// Valor máximo de caracteres para contraseñas seguras
const MAX_PASSWORD_LENGTH = 72;

// Valida formato básico de email
export const isValidEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

// Valida si la contraseña es fuerte
export const isStrongPassword = (password) => {
  if (password.length > MAX_PASSWORD_LENGTH) return false;
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
  return regex.test(password);
};

// Valida específicamente si la contraseña excede la longitud máxima soportada
export const exceedsMaxPasswordLength = (password) =>
  password.length > MAX_PASSWORD_LENGTH;

// Normaliza un email: elimina espacios y convierte a minúsculas
export const normalizeEmail = (email) =>
  email.trim().toLowerCase();