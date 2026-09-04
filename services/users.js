import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { db } from '../config/db.js';
import { generateToken } from '../utils/jwt.js';
import { sendPasswordResetEmail } from '../utils/email.js';
import { isValidEmail, isStrongPassword, exceedsMaxPasswordLength, normalizeEmail } from '../utils/validators.js';

const MAX_ATTEMPTS = 5;
const LOCK_TIME_MINUTES = 15;
const TOKEN_EXPIRES_MINUTES = 10;
const REACTIVATION_COOLDOWN_HOURS = 24;

// Registrar usuario (PUBLIC)
export const registerUser = async ({ name, email, password }) => {
  if (!name || !email || !password)
    throw { status: 400, message: 'Todos los campos son obligatorios' };

  const normalizedEmail = normalizeEmail(email);

  if (!isValidEmail(normalizedEmail))
    throw { status: 400, message: 'Correo inválido' };

  if (exceedsMaxPasswordLength(password))
    throw { status: 400, message: `La contraseña no puede superar los 72 caracteres` };

  if (!isStrongPassword(password))
    throw { status: 400, message: 'La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial' };

  const [existing] = await db.query(
    'SELECT id FROM users WHERE email = ?',
    [normalizedEmail]
  );

  if (existing.length)
    throw { status: 409, message: 'El correo ya está registrado' };

  const hashed = await bcrypt.hash(password, 10);

  await db.query(
    'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
    [name.trim(), normalizedEmail, hashed]
  );

  return { success: true, message: 'Usuario registrado correctamente' };
};

// Iniciar sesión (PUBLIC)
export const loginUser = async ({ email, password }) => {
  if (!email || !password)
    throw { status: 400, message: 'Correo y contraseña son obligatorios' };

  const normalizedEmail = normalizeEmail(email);

  const [rows] = await db.query(
    'SELECT * FROM users WHERE email = ?',
    [normalizedEmail]
  );

  if (!rows.length)
    throw { status: 401, message: 'Credenciales inválidas' };

  const user = rows[0];

  if (!user.is_active) {
    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches)
      throw { status: 401, message: 'Credenciales inválidas' };

    throw {
      status: 403,
      code: 'ACCOUNT_DEACTIVATED',
      message: 'Tu cuenta está desactivada. ¿Deseas reactivarla?',
    };
  }

  if (user.lock_until && new Date(user.lock_until) > new Date())
    throw { status: 423, message: 'Cuenta bloqueada temporalmente. Intenta más tarde.' };

  const match = await bcrypt.compare(password, user.password);

  if (!match) {
    const attempts = user.failed_attempts + 1;

    if (attempts >= MAX_ATTEMPTS) {
      const lockUntil = new Date(Date.now() + LOCK_TIME_MINUTES * 60000);
      await db.query(
        'UPDATE users SET failed_attempts = ?, lock_until = ? WHERE id = ?',
        [attempts, lockUntil, user.id]
      );
    } else {
      await db.query(
        'UPDATE users SET failed_attempts = ? WHERE id = ?',
        [attempts, user.id]
      );
    }
    throw { status: 401, message: 'Credenciales inválidas' };
  }

  await db.query(
    'UPDATE users SET failed_attempts = 0, lock_until = NULL WHERE id = ?',
    [user.id]
  );

  const token = generateToken({ id: user.id, role: user.role });
  return { user, token };
};

// Reactivar cuenta previamente desactivada (PUBLIC)
export const reactivateAccount = async ({ email, password }) => {
  if (!email || !password)
    throw { status: 400, message: 'Correo y contraseña son obligatorios' };

  const normalizedEmail = normalizeEmail(email);

  const [rows] = await db.query(
    'SELECT * FROM users WHERE email = ?',
    [normalizedEmail]
  );

  if (!rows.length)
    throw { status: 401, message: 'Credenciales inválidas' };

  const user = rows[0];

  if (user.is_active)
    throw { status: 409, message: 'Esta cuenta ya está activa' };

  const match = await bcrypt.compare(password, user.password);

  if (!match)
    throw { status: 401, message: 'Credenciales inválidas' };

  await db.query(
    `UPDATE users
     SET is_active = true, failed_attempts = 0, lock_until = NULL, last_reactivated_at = NOW()
     WHERE id = ?`,
    [user.id]
  );

  const token = generateToken({ id: user.id, role: user.role });
  return { user: { ...user, is_active: true }, token };
};

// Solicitar restablecimiento de contraseña (PUBLIC)
export const forgotPassword = async (email) => {
  if (!email)
    throw { status: 400, message: 'El correo es obligatorio' };

  const normalizedEmail = normalizeEmail(email);

  if (!isValidEmail(normalizedEmail))
    throw { status: 400, message: 'Correo inválido' };

  const [rows] = await db.query(
    'SELECT id, is_active FROM users WHERE email = ?',
    [normalizedEmail]
  );

  if (!rows.length || !rows[0].is_active)
    return { success: true, message: 'Si el correo está registrado, recibirás un enlace en breve' };

  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expires = new Date(Date.now() + TOKEN_EXPIRES_MINUTES * 60 * 1000);

  await db.query(
    'UPDATE users SET password_token = ?, password_token_expires = ? WHERE id = ?',
    [hashedToken, expires, rows[0].id]
  );

  const resetUrl = `${process.env.CLIENT_URL}/resetPassword?token=${rawToken}`;

  await sendPasswordResetEmail(normalizedEmail, resetUrl);

  return { success: true, message: 'Si el correo está registrado, recibirás un enlace en breve' };
};

// Restablecer contraseña con token (PUBLIC)
export const resetPassword = async (rawToken, newPassword) => {
  if (!rawToken || !newPassword)
    throw { status: 400, message: 'Datos incompletos' };

  if (exceedsMaxPasswordLength(newPassword))
    throw { status: 400, message: `La nueva contraseña no puede superar los 72 caracteres` };

  if (!isStrongPassword(newPassword))
    throw { status: 400, message: 'La nueva contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial' };

  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

  const [rows] = await db.query(
    `SELECT id FROM users
     WHERE password_token = ?
       AND password_token_expires > NOW()
       AND is_active = true`,
    [hashedToken]
  );

  if (!rows.length)
    throw { status: 400, message: 'El enlace es inválido o ha expirado' };

  const hashed = await bcrypt.hash(newPassword, 10);

  await db.query(
    `UPDATE users
     SET password = ?, password_token = NULL, password_token_expires = NULL,
         failed_attempts = 0, lock_until = NULL
     WHERE id = ?`,
    [hashed, rows[0].id]
  );

  return { success: true, message: 'Contraseña restablecida correctamente' };
};

// Obtener perfil del usuario autenticado (CLIENT | ADMIN)
export const getProfileUser = async (userId) => {
  const [rows] = await db.query(
    'SELECT id, name, email, role FROM users WHERE id = ?',
    [userId]
  );

  return rows[0];
};

// Actualizar perfil del usuario autenticado (CLIENT | ADMIN)
export const updateProfile = async (userId, data) => {
  const { name, email } = data;

  const [[current]] = await db.query(
    'SELECT name, email FROM users WHERE id = ?',
    [userId]
  );

  if (!current)
    throw { status: 404, message: 'Usuario no encontrado' };

  const updates = [];
  const values = [];

  const trimmedName = name?.trim();
  if (trimmedName && trimmedName !== current.name) {
    updates.push('name = ?');
    values.push(trimmedName);
  }

  if (email) {
    const normalizedEmail = normalizeEmail(email);

    if (!isValidEmail(normalizedEmail))
      throw { status: 400, message: 'Correo inválido' };

    if (normalizedEmail !== current.email) {
      const [existing] = await db.query(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [normalizedEmail, userId]
      );

      if (existing.length)
        throw { status: 409, message: 'El correo ya está registrado' };

      updates.push('email = ?');
      values.push(normalizedEmail);
    }
  }

  if (!updates.length)
    throw { status: 400, message: 'No hay cambios para actualizar' };

  await db.query(
    `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
    [...values, userId]
  );

  return { success: true, message: 'Perfil actualizado correctamente' };
};

// Cambiar contraseña del usuario autenticado (CLIENT | ADMIN)
export const changePassword = async (userId, currentPassword, newPassword) => {
  if (!currentPassword || !newPassword)
    throw { status: 400, message: 'Datos incompletos' };

  const [rows] = await db.query(
    'SELECT password FROM users WHERE id = ?',
    [userId]
  );

  const match = await bcrypt.compare(currentPassword, rows[0].password);

  if (!match)
    throw { status: 400, message: 'Contraseña actual incorrecta' };

  if (exceedsMaxPasswordLength(newPassword))
    throw { status: 400, message: `La nueva contraseña no puede superar los 72 caracteres` };

  if (!isStrongPassword(newPassword))
    throw { status: 400, message: 'La nueva contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial' };

  if (currentPassword === newPassword)
    throw { status: 400, message: 'La nueva contraseña debe ser diferente a la actual' };

  const hashed = await bcrypt.hash(newPassword, 10);

  await db.query(
    'UPDATE users SET password = ? WHERE id = ?',
    [hashed, userId]
  );

  return { success: true, message: 'Contraseña actualizada correctamente' };
};

// Desactivar cuenta del usuario autenticado (CLIENT | ADMIN)
export const deactivateAccount = async (userId) => {
  const [[user]] = await db.query(
    'SELECT last_reactivated_at FROM users WHERE id = ?',
    [userId]
  );

  if (user?.last_reactivated_at) {
    const cooldownEnds = new Date(
      new Date(user.last_reactivated_at).getTime() + REACTIVATION_COOLDOWN_HOURS * 60 * 60 * 1000
    );

    if (cooldownEnds > new Date()) {
      const hoursLeft = Math.ceil((cooldownEnds - new Date()) / (60 * 60 * 1000));
      throw {
        status: 409,
        message: `Reactivaste tu cuenta recientemente. Podrás desactivarla de nuevo en aproximadamente ${hoursLeft} hora${hoursLeft === 1 ? '' : 's'}.`,
      };
    }
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    await connection.query(
      'UPDATE users SET is_active = false WHERE id = ?',
      [userId]
    );

    await connection.query(
      'UPDATE appointments SET status = "CANCELLED" WHERE user_id = ? AND date >= CURDATE()',
      [userId]
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return { success: true, message: 'Cuenta desactivada correctamente' };
};