import express from "express";
import { db } from "../config/db.js";
import { authMiddleware } from "../middlewares/auth.js";
import { isAdmin } from "../middlewares/admin.js";

const router = express.Router();

// Crear nuevo servicio (ADMIN)
router.post("/", authMiddleware, isAdmin, async (req, res) => {
  try {
    const { name, description, duration, price } = req.body;

    if (!name || !duration || !price) {
      return res.status(400).json({
        success: false,
        message: "Nombre, duración y precio son obligatorios",
      });
    }

    await db.query(
      `INSERT INTO services (name, description, duration, price)
       VALUES (?, ?, ?, ?)`,
      [name, description, duration, price]
    );

    res.status(201).json({
      success: true,
      message: "Servicio creado correctamente",
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
});

// Obtener todos los servicios (PUBLIC)
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM services WHERE is_active = true"
    );

    res.json({
      success: true,
      data: rows,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
});

// Obtener servicios activos - inactivos (ADMIN)
router.get("/list", authMiddleware, isAdmin, async (req, res) => {
  const [rows] = await db.query(
    "SELECT * FROM services ORDER BY id DESC"
  );

  res.json({
    success: true,
    data: rows,
  });
});

// Actualizar un servicio (ADMIN)
router.put("/:id", authMiddleware, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, duration, price, is_active } = req.body;

    const [result] = await db.query(
      `UPDATE services
       SET name = ?, description = ?, duration = ?, price = ?, is_active = ?
       WHERE id = ?`,
      [name, description, duration, price, is_active, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Servicio no encontrado",
      });
    }

    res.json({
      success: true,
      message: "Servicio actualizado correctamente",
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
});

// Eliminar un servicio (ADMIN)
router.delete("/:id", authMiddleware, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      "UPDATE services SET is_active = false WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Servicio no encontrado",
      });
    }

    res.json({
      success: true,
      message: "Servicio eliminado correctamente",
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
});

export default router;