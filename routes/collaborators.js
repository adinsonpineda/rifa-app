const express = require('express');
const router = express.Router();
const Collaborator = require('../models/Collaborator');

// GET /api/collaborators/:code
// Ruta publica de solo lectura: valida si un codigo de colaborador existe
// y esta activo, devolviendo unicamente su nombre (nada mas). La usa el
// frontend para mostrar "Vendiendo como: Nombre" cuando alguien entra con
// un enlace de vendedor (?v=CODIGO).
router.get('/:code', async (req, res) => {
  try {
    const code = (req.params.code || '').trim();
    if (!code) {
      return res.status(400).json({ error: 'Codigo invalido.' });
    }

    const collaborator = await Collaborator.findOne({ code, active: true }).select('name code');
    if (!collaborator) {
      return res.status(404).json({ error: 'Codigo de vendedor no valido.' });
    }

    res.json({ name: collaborator.name, code: collaborator.code });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al validar el codigo.' });
  }
});

module.exports = router;
