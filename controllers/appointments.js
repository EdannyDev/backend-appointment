import * as appointmentService from '../services/appointments.js';

// Obtener horarios disponibles (PUBLIC)
export const getAvailableSlots = async (req, res, next) => {
  try {
    const { service_id, date } = req.query;
    const result = await appointmentService.getAvailableSlots(service_id, date);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// Obtener citas del usuario autenticado (CLIENT)
export const getMyAppointments = async (req, res, next) => {
  try {
    const result = await appointmentService.getByUser(req.user.id, req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// Crear cita (CLIENT)
export const create = async (req, res, next) => {
  try {
    const result = await appointmentService.create(req.user.id, req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

// Obtener todas las citas (ADMIN)
export const getAll = async (req, res, next) => {
  try {
    const result = await appointmentService.getAll(req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// Obtener citas del día indicado (ADMIN)
export const getByDay = async (req, res, next) => {
  try {
    const { date } = req.query;
    const result = await appointmentService.getByDay(date);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// Obtener resumen de citas (ADMIN)
export const getSummary = async (req, res, next) => {
  try {
    const result = await appointmentService.getSummary();
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// Obtener cita por ID (CLIENT)
export const getById = async (req, res, next) => {
  try {
    const result = await appointmentService.getById(req.params.id, req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// Cancelar cita (CLIENT)
export const cancel = async (req, res, next) => {
  try {
    const result = await appointmentService.cancel(req.params.id, req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// Reprogramar cita (CLIENT)
export const reschedule = async (req, res, next) => {
  try {
    const result = await appointmentService.reschedule(
      req.params.id,
      req.user.id,
      req.body
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// Actualizar estado de una cita (ADMIN)
export const updateStatus = async (req, res, next) => {
  try {
    const result = await appointmentService.updateStatus(
      req.params.id,
      req.body.status
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};