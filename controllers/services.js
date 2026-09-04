import * as servicesService from '../services/services.js';

// Obtener servicios activos (PUBLIC)
export const getActiveServices = async (req, res, next) => {
  try {
    const result = await servicesService.getActiveServices();
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// Obtener todos los servicios (ADMIN)
export const getAllServices = async (req, res, next) => {
  try {
    const result = await servicesService.getAllServices(req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// Crear servicio (ADMIN)
export const createService = async (req, res, next) => {
  try {
    const result = await servicesService.createService(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

// Actualizar servicio (ADMIN)
export const updateService = async (req, res, next) => {
  try {
    const result = await servicesService.updateService(
      req.params.id,
      req.body
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// Desactivar servicio (ADMIN)
export const deactivateService = async (req, res, next) => {
  try {
    const result = await servicesService.deactivateService(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};