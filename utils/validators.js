// Valida formato básico de email
export const isValidEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

// Valida si la contraseña es fuerte
export const isStrongPassword = (password) => {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
  return regex.test(password);
};

// Normaliza un email: elimina espacios y convierte a minúsculas
export const normalizeEmail = (email) =>
  email.trim().toLowerCase();