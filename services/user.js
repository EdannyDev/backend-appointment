import bcrypt from 'bcryptjs';
import { db } from '../config/db.js';
import { generateToken } from '../utils/jwt.js';
import { isValidEmail, isStrongPassword, normalizeEmail } from '../utils/validators.js';

const MAX_ATTEMPTS = 5;
const LOCK_TIME_MINUTES = 15;

// Registrar usuario
export const registerUser = async ({ name, email, password }) => {
  if (!name || !email || !password)
    throw { status: 400, message: 'Todos los campos son obligatorios' };

  const normalizedEmail = normalizeEmail(email);
  if (!isValidEmail(normalizedEmail))
    throw { status: 400, message: 'Correo inválido' };
  if (!isStrongPassword(password))
    throw { status: 400, message: 'Contraseña débil' };

  const [existing] = await db.query('SELECT id FROM users WHERE email=?', [normalizedEmail]);
  if (existing.length) throw { status: 400, message: 'El correo ya está registrado' };

  const hashed = await bcrypt.hash(password, 10);
  await db.query('INSERT INTO users (name,email,password) VALUES (?,?,?)', [
    name.trim(),
    normalizedEmail,
    hashed
  ]);

  return { success: true, message: 'Usuario registrado correctamente' };
};

// Iniciar sesión
export const loginUser = async ({ email, password }) => {
  if (!email || !password)
    throw { status: 400, message: 'Correo y contraseña son obligatorios' };

  const normalizedEmail = normalizeEmail(email);
  const [rows] = await db.query('SELECT * FROM users WHERE email=?', [normalizedEmail]);
  if (!rows.length) throw { status: 401, message: 'Credenciales inválidas' };

  const user = rows[0];
  if (!user.is_active) throw { status: 403, message: 'Cuenta desactivada' };
  if (user.lock_until && new Date(user.lock_until) > new Date())
    throw { status: 423, message: 'Cuenta bloqueada temporalmente' };

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    const attempts = user.failed_attempts + 1;
    const lockUntil = attempts >= MAX_ATTEMPTS ? new Date(Date.now() + LOCK_TIME_MINUTES * 60000) : null;
    await db.query(
      attempts >= MAX_ATTEMPTS
        ? 'UPDATE users SET failed_attempts=?, lock_until=? WHERE id=?'
        : 'UPDATE users SET failed_attempts=? WHERE id=?',
      attempts >= MAX_ATTEMPTS ? [attempts, lockUntil, user.id] : [attempts, user.id]
    );
    throw { status: 401, message: 'Credenciales inválidas' };
  }

  await db.query('UPDATE users SET failed_attempts=0, lock_until=NULL WHERE id=?', [user.id]);
  const token = generateToken({ id: user.id, role: user.role });

  return { user, token };
};

// Cerrar sesión
export const logoutUser = async () => ({ success: true, message: 'Sesión cerrada correctamente' });

// Obtener perfil
export const getProfileUser = async (userId) => {
  const [rows] = await db.query('SELECT id, name, email, role FROM users WHERE id=?', [userId]);
  return rows[0];
};

// Actualizar perfil
export const updateProfile = async (userId, data) => {
  const { name, email } = data;
  if (!name && !email) throw { status: 400, message: 'No hay campos para actualizar' };

  const updates = [];
  const values = [];
  if (name) { updates.push('name=?'); values.push(name.trim()); }
  if (email) {
    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) throw { status: 400, message: 'Correo inválido' };
    updates.push('email=?'); values.push(normalizedEmail);
  }

  await db.query(`UPDATE users SET ${updates.join(',')} WHERE id=?`, [...values, userId]);
  return { success: true, message: 'Perfil actualizado correctamente' };
};

// Cambiar contraseña
export const changePassword = async (userId, currentPassword, newPassword) => {
  if (!currentPassword || !newPassword) throw { status: 400, message: 'Datos incompletos' };

  const [rows] = await db.query('SELECT password FROM users WHERE id=?', [userId]);
  const user = rows[0];
  const match = await bcrypt.compare(currentPassword, user.password);
  if (!match) throw { status: 400, message: 'Contraseña actual incorrecta' };
  if (!isStrongPassword(newPassword)) throw { status: 400, message: 'Contraseña débil' };

  const hashed = await bcrypt.hash(newPassword, 10);
  await db.query('UPDATE users SET password=? WHERE id=?', [hashed, userId]);
  return { success: true, message: 'Contraseña actualizada correctamente' };
};

// Desactivar cuenta
export const deactivateAccount = async (userId) => {
  await db.query('UPDATE users SET is_active=false WHERE id=?', [userId]);
  await db.query('UPDATE appointments SET status="CANCELLED" WHERE user_id=? AND date>=CURDATE()', [userId]);
  return { success: true, message: 'Cuenta desactivada correctamente' };
};