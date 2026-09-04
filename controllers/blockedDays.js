import * as blockedDaysService from '../services/blockedDays.js';

// Obtener días bloqueados (ADMIN)
export const getBlockedDays = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    const result = await blockedDaysService.getBlockedDays(start_date, end_date);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// Bloquear día individual (ADMIN)
export const blockDay = async (req, res, next) => {
  try {
    const { date, reason } = req.body;
    const result = await blockedDaysService.blockDay(date, reason);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

// Bloquear rango de días (ADMIN)
export const blockRange = async (req, res, next) => {
  try {
    const { start_date, end_date, reason } = req.body;
    const result = await blockedDaysService.blockRange(start_date, end_date, reason);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

// Eliminar rango de días bloqueados (ADMIN)
export const deleteBlockedRange = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    const result = await blockedDaysService.deleteBlockedRange(start_date, end_date);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// Eliminar día bloqueado por ID (ADMIN)
export const deleteBlockedDay = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await blockedDaysService.deleteBlockedDay(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};