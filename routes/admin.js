const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const RaffleNumber = require('../models/RaffleNumber');
const Collaborator = require('../models/Collaborator');

// Middleware: valida la clave de administrador, ya sea en el encabezado
// "x-admin-key" (recomendado, no queda en el historial de la URL) o en el
// parametro de consulta "?key=" (por compatibilidad).
function requireAdminKey(req, res, next) {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'No autorizado. Falta o es incorrecta la clave de administrador.' });
  }
  next();
}

// GET /api/admin/participants
// Devuelve la lista completa (incluye nombre, telefono, taken, paid, soldBy) de
// numeros ya tomados.
router.get('/participants', requireAdminKey, async (req, res) => {
  try {
    const participants = await RaffleNumber.find({ taken: true }).sort({ number: 1 });
    res.json(participants);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener los participantes.' });
  }
});

// PATCH /api/admin/numbers/:number/paid
// Marca o desmarca un numero como pagado. Body: { "paid": true } o { "paid": false }
router.patch('/numbers/:number/paid', requireAdminKey, async (req, res) => {
  try {
    const numberValue = parseInt(req.params.number, 10);
    const paid = Boolean(req.body && req.body.paid);

    if (!Number.isInteger(numberValue) || numberValue < 0) {
      return res.status(400).json({ error: 'Numero invalido.' });
    }

    const updated = await RaffleNumber.findOneAndUpdate(
      { number: numberValue, taken: true },
      { $set: { paid, paidAt: paid ? new Date() : null } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: 'El numero no existe o no ha sido apartado todavia.' });
    }

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar el estado de pago.' });
  }
});

// ---------- Gestion de colaboradores (vendedores) ----------

// GET /api/admin/collaborators -> lista todos los colaboradores
router.get('/collaborators', requireAdminKey, async (req, res) => {
  try {
    const collaborators = await Collaborator.find({}).sort({ createdAt: -1 });
    res.json(collaborators);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener los colaboradores.' });
  }
});

// POST /api/admin/collaborators -> crea un colaborador nuevo. Body: { "name": "Maria" }
// Genera automaticamente un codigo unico para su enlace de venta.
router.post('/collaborators', requireAdminKey, async (req, res) => {
  try {
    const name = (req.body && req.body.name ? String(req.body.name) : '').trim();
    if (!name) {
      return res.status(400).json({ error: 'El nombre del colaborador es obligatorio.' });
    }

    // Genera un codigo corto y unico (8 caracteres hexadecimales).
    let code = crypto.randomBytes(4).toString('hex');
    let attempts = 0;
    let existing = await Collaborator.findOne({ code });
    while (existing && attempts < 5) {
      code = crypto.randomBytes(4).toString('hex');
      attempts += 1;
      // eslint-disable-next-line no-await-in-loop
      existing = await Collaborator.findOne({ code });
    }

    const collaborator = await Collaborator.create({ name, code });
    res.status(201).json(collaborator);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear el colaborador.' });
  }
});

// PATCH /api/admin/collaborators/:id -> activa/desactiva o renombra un colaborador.
// Body: { "active": false } y/o { "name": "Nuevo nombre" }
router.patch('/collaborators/:id', requireAdminKey, async (req, res) => {
  try {
    const update = {};
    if (typeof req.body.active === 'boolean') update.active = req.body.active;
    if (typeof req.body.name === 'string' && req.body.name.trim()) {
      update.name = req.body.name.trim();
    }

    const collaborator = await Collaborator.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
    if (!collaborator) {
      return res.status(404).json({ error: 'Colaborador no encontrado.' });
    }
    res.json(collaborator);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar el colaborador.' });
  }
});

// DELETE /api/admin/collaborators/:id -> elimina un colaborador (no borra sus ventas ya registradas)
router.delete('/collaborators/:id', requireAdminKey, async (req, res) => {
  try {
    const collaborator = await Collaborator.findByIdAndDelete(req.params.id);
    if (!collaborator) {
      return res.status(404).json({ error: 'Colaborador no encontrado.' });
    }
    res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar el colaborador.' });
  }
});

module.exports = router;
