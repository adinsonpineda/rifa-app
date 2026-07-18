const express = require('express');
const router = express.Router();
const RaffleNumber = require('../models/RaffleNumber');

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
// Devuelve la lista completa (incluye nombre, telefono, taken, paid) de
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

module.exports = router;
