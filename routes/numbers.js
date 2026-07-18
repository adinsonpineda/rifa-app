const express = require('express');
const router = express.Router();
const RaffleNumber = require('../models/RaffleNumber');

// GET /api/numbers -> devuelve el estado de todos los numeros
router.get('/', async (req, res) => {
  try {
    const numbers = await RaffleNumber.find({})
      .select('number taken takenAt paid') // no exponemos datos personales al listado publico
      .sort({ number: 1 });
    res.json(numbers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener los numeros.' });
  }
});

// POST /api/numbers/:number/select -> selecciona/reserva un numero
router.post('/:number/select', async (req, res) => {
  try {
    const numberValue = parseInt(req.params.number, 10);
    const { name, phone } = req.body || {};

    if (!Number.isInteger(numberValue) || numberValue < 0) {
      return res.status(400).json({ error: 'Numero invalido.' });
    }

    const trimmedName = (name || '').trim();
    if (!trimmedName) {
      return res.status(400).json({ error: 'El nombre es obligatorio.' });
    }

    // Operacion atomica: solo actualiza si taken es actualmente false.
    // Esto evita que dos personas se queden con el mismo numero al mismo tiempo.
    const updated = await RaffleNumber.findOneAndUpdate(
      { number: numberValue, taken: false },
      {
        $set: {
          taken: true,
          name: trimmedName,
          phone: (phone || '').trim(),
          takenAt: new Date(),
        },
      },
      { new: true }
    );

    if (!updated) {
      // O el numero no existe, o ya estaba tomado
      const exists = await RaffleNumber.findOne({ number: numberValue });
      if (!exists) {
        return res.status(404).json({ error: 'El numero no existe.' });
      }
      return res.status(409).json({ error: 'Ese numero ya fue seleccionado por otra persona.' });
    }

    res.json({
      number: updated.number,
      taken: updated.taken,
      takenAt: updated.takenAt,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al seleccionar el numero.' });
  }
});

// (Opcional) POST /api/numbers/:number/release -> libera un numero, util para el administrador
router.post('/:number/release', async (req, res) => {
  try {
    const numberValue = parseInt(req.params.number, 10);
    const updated = await RaffleNumber.findOneAndUpdate(
      { number: numberValue },
      {
        $set: {
          taken: false,
          name: '',
          phone: '',
          takenAt: null,
          paid: false,
          paidAt: null,
        },
      },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'El numero no existe.' });
    res.json({ number: updated.number, taken: updated.taken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al liberar el numero.' });
  }
});

module.exports = router;
