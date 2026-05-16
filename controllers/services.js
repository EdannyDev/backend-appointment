import * as servicesService from '../services/services.js';

// Crear servicio
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

// Obtener activos
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

// Obtener todos (admin)
export const getAllServices = async (req, res) => {
  try {
    const result = await servicesService.getAllServices();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
};

// Actualizar servicio
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

// Desactivar servicio
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