import * as servicesService from '../services/services.js';

// Obtener servicios activos (PUBLIC)
export const getActiveServices = async (req, res) => {
  try {
    const result = await servicesService.getActiveServices();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
};

// Obtener todos los servicios (ADMIN)
export const getAllServices = async (req, res) => {
  try {
    const result = await servicesService.getAllServices(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
};

// Crear servicio (ADMIN)
export const createService = async (req, res) => {
  try {
    const result = await servicesService.createService(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error interno del servidor',
    });
  }
};

// Actualizar servicio (ADMIN)
export const updateService = async (req, res) => {
  try {
    const result = await servicesService.updateService(
      req.params.id,
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error interno del servidor',
    });
  }
};

// Desactivar servicio (ADMIN)
export const deactivateService = async (req, res) => {
  try {
    const result = await servicesService.deactivateService(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error interno del servidor',
    });
  }
};