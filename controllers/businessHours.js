import * as businessHoursService from '../services/businessHours.js';

// Guardar o actualizar horario laboral
export const saveBusinessHour = async (req, res) => {
  try {
    const { day_of_week, start_time, end_time } = req.body;
    const result = await businessHoursService.saveBusinessHour(
      day_of_week,
      start_time,
      end_time
    );
    res.status(201).json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error interno del servidor'
    });
  }
};

// Obtener horarios laborales activos
export const getActiveBusinessHours = async (req, res) => {
  try {
    const result = await businessHoursService.getActiveBusinessHours();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener todos los horarios laborales
export const getAllBusinessHours = async (req, res) => {
  try {
    const result = await businessHoursService.getAllBusinessHours();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};