import * as businessHoursService from '../services/businessHours.js';

// Obtener horarios laborales activos (PUBLIC)
export const getActiveBusinessHours = async (req, res, next) => {
  try {
    const result = await businessHoursService.getActiveBusinessHours();
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// Obtener todos los horarios laborales (ADMIN)
export const getAllBusinessHours = async (req, res, next) => {
  try {
    const result = await businessHoursService.getAllBusinessHours();
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// Guardar o actualizar horario laboral (ADMIN)
export const saveBusinessHour = async (req, res, next) => {
  try {
    const { day_of_week, start_time, end_time } = req.body;
    const result = await businessHoursService.saveBusinessHour(
      day_of_week,
      start_time,
      end_time
    );
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};