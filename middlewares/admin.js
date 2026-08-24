// Verifica que el usuario autenticado tenga rol de administrador
export const isAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado: se requieren privilegios de administrador',
    });
  }

  next();
};