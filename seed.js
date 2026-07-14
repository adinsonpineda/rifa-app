// Este script crea (si no existen) los numeros del RAFFLE_START al RAFFLE_END
// en la base de datos. Se ejecuta automaticamente al iniciar el servidor,
// pero tambien puedes correrlo manualmente con: npm run seed

require('dotenv').config();
const mongoose = require('mongoose');
const RaffleNumber = require('./models/RaffleNumber');
const { buildMongoUri } = require('./config/mongoUri');

const RAFFLE_START = parseInt(process.env.RAFFLE_START ?? '0', 10);
const RAFFLE_END = parseInt(process.env.RAFFLE_END ?? '999', 10);

async function seed() {
  const uri = buildMongoUri();
  if (!uri) {
    console.error(
      'Falta la configuracion de MongoDB. Define MONGODB_URI, o bien ' +
        'MONGODB_USER + MONGODB_PASSWORD + MONGODB_HOST. Revisa tu archivo .env'
    );
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Conectado a MongoDB para inicializar numeros...');

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

  const result = await RaffleNumber.bulkWrite(bulkOps);
  const total = RAFFLE_END - RAFFLE_START + 1;
  console.log(
    `Listo. Numeros insertados nuevos: ${result.upsertedCount || 0}. Total esperado: ${total}`
  );

  await mongoose.disconnect();
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error al inicializar los numeros:', err);
    process.exit(1);
  });
