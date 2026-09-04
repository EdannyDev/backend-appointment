import * as userService from '../services/users.js';

// Función auxiliar para configurar la cookie de autenticación
const setAuthCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  });
};

// Registrar usuario (PUBLIC)
export const register = async (req, res, next) => {
  try {
    const result = await userService.registerUser(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

// Iniciar sesión (PUBLIC)
export const login = async (req, res, next) => {
  try {
    const { user, token } = await userService.loginUser(req.body);
    setAuthCookie(res, token);
    res.json({
      success: true,
      message: 'Inicio de sesión exitoso',
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

// Reactivar cuenta previamente desactivada (PUBLIC)
export const reactivateMyAccount = async (req, res, next) => {
  try {
    const { user, token } = await userService.reactivateAccount(req.body);
    setAuthCookie(res, token);
    res.json({
      success: true,
      message: 'Cuenta reactivada correctamente',
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

// Cerrar sesión (PUBLIC)
export const logout = (req, res) => {
  res.clearCookie('token');
  res.json({
    success: true,
    message: 'Sesión cerrada correctamente',
  });
};

// Solicitar restablecimiento de contraseña (PUBLIC)
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await userService.forgotPassword(email);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// Restablecer contraseña con token (PUBLIC)
export const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    const result = await userService.resetPassword(token, newPassword);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// Obtener perfil del usuario autenticado (CLIENT | ADMIN)
export const getProfile = async (req, res, next) => {
  try {
    const user = await userService.getProfileUser(req.user.id);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

// Actualizar perfil del usuario autenticado (CLIENT | ADMIN)
export const updateMyProfile = async (req, res, next) => {
  try {
    const result = await userService.updateProfile(req.user.id, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// Cambiar contraseña del usuario autenticado (CLIENT | ADMIN)
export const updateMyPassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await userService.changePassword(
      req.user.id,
      currentPassword,
      newPassword
    );
    res.clearCookie('token');
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// Desactivar cuenta del usuario autenticado (CLIENT | ADMIN)
export const deleteMyAccount = async (req, res, next) => {
  try {
    const result = await userService.deactivateAccount(req.user.id);
    res.clearCookie('token');
    res.json(result);
  } catch (err) {
    next(err);
  }
};