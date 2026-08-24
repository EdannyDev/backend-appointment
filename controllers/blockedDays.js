import * as blockedDaysService from '../services/blockedDays.js';

// Obtener días bloqueados (ADMIN)
export const getBlockedDays = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const result = await blockedDaysService.getBlockedDays(start_date, end_date);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error interno del servidor',
    });
  }
};

// Bloquear día individual (ADMIN)
export const blockDay = async (req, res) => {
  try {
    const { date, reason } = req.body;
    const result = await blockedDaysService.blockDay(date, reason);
    res.status(201).json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error interno del servidor',
    });
  }
};

// Bloquear rango de días (ADMIN)
export const blockRange = async (req, res) => {
  try {
    const { start_date, end_date, reason } = req.body;
    const result = await blockedDaysService.blockRange(start_date, end_date, reason);
    res.status(201).json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error interno del servidor',
    });
  }
};

// Eliminar rango de días bloqueados (ADMIN)
export const deleteBlockedRange = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const result = await blockedDaysService.deleteBlockedRange(start_date, end_date);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error interno del servidor',
    });
  }
};

// Eliminar día bloqueado por ID (ADMIN)
export const deleteBlockedDay = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await blockedDaysService.deleteBlockedDay(id);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Error interno del servidor',
    });
  }
};