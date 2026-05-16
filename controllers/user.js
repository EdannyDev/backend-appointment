import * as userService from '../services/user.js';

// Registrar usuario
export const register = async (req, res) => {
  try {
    const result = await userService.registerUser(req.body);
    res.status(201).json(result);
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message || 'Error interno del servidor' });
  }
};

// Iniciar sesión
export const login = async (req, res) => {
  try {
    const { user, token } = await userService.loginUser(req.body);
    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 24*60*60*1000 });
    res.json({ success: true, message: 'Inicio de sesión exitoso', data: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message || 'Error interno del servidor' });
  }
};

// Cerrar sesión
export const logout = async (req, res) => {
  try {
    await userService.logoutUser();
    res.clearCookie('token');
    res.json({ success: true, message: 'Sesión cerrada correctamente' });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message || 'Error interno del servidor' });
  }
};

// Obtener perfil
export const getProfile = async (req, res) => {
  try {
    const user = await userService.getProfileUser(req.user.id);
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message || 'Error interno del servidor' });
  }
};

// Actualizar perfil
export const updateMyProfile = async (req, res) => {
  try {
    const result = await userService.updateProfile(req.user.id, req.body);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message || 'Error interno del servidor' });
  }
};

// Cambiar contraseña
export const updateMyPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await userService.changePassword(req.user.id, currentPassword, newPassword);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message || 'Error interno del servidor' });
  }
};

// Desactivar cuenta
export const deleteMyAccount = async (req, res) => {
  try {
    const result = await userService.deactivateAccount(req.user.id);
    res.clearCookie('token');
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message || 'Error interno del servidor' });
  }
};