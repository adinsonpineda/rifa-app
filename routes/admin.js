const express = require('express');
const router = express.Router();
const RaffleNumber = require('../models/RaffleNumber');

// GET /api/admin/participants?key=TU_CLAVE
// Devuelve la lista completa (incluye nombre, email, telefono) de numeros ya tomados.
// Protegido con una clave simple definida en la variable de entorno ADMIN_KEY.
router.get('/participants', async (req, res) => {
  try {
    const key = req.query.key;
    if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
      return res.status(401).json({ error: 'No autorizado. Falta o es incorrecta la clave "key".' });
    }

    const participants = await RaffleNumber.find({ taken: true }).sort({ number: 1 });
    res.json(participants);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener los participantes.' });
  }
});

module.exports = router;
