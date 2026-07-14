require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

const numbersRouter = require('./routes/numbers');
const adminRouter = require('./routes/admin');
const RaffleNumber = require('./models/RaffleNumber');
const { buildMongoUri } = require('./config/mongoUri');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = buildMongoUri();
const RAFFLE_START = parseInt(process.env.RAFFLE_START ?? '0', 10);
const RAFFLE_END = parseInt(process.env.RAFFLE_END ?? '999', 10);

if (!MONGODB_URI) {
  console.error(
    'ERROR: Falta la configuracion de MongoDB. Define MONGODB_URI, o bien ' +
      'MONGODB_USER + MONGODB_PASSWORD + MONGODB_HOST. Revisa tu archivo .env'
  );
  process.exit(1);
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/numbers', numbersRouter);
app.use('/api/admin', adminRouter);

async function ensureNumbersExist() {
  const bulkOps = [];
  for (let i = RAFFLE_START; i <= RAFFLE_END; i++) {
    bulkOps.push({
      updateOne: {
        filter: { number: i },
        update: { $setOnInsert: { number: i, taken: false } },
        upsert: true,
      },
    });
  }
  await RaffleNumber.bulkWrite(bulkOps);
}

async function start() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Conectado a MongoDB correctamente.');

    await ensureNumbersExist();
    console.log(
      `Numeros del ${String(RAFFLE_START).padStart(3, '0')} al ${String(RAFFLE_END).padStart(3, '0')} listos en la base de datos.`
    );

    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('No se pudo iniciar el servidor:', err);
    process.exit(1);
  }
}

start();
