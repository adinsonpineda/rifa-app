// Este script crea (si no existen) los numeros del 1 al TOTAL_NUMBERS en la base de datos.
// Se ejecuta automaticamente al iniciar el servidor, pero tambien puedes correrlo
// manualmente con: npm run seed

require('dotenv').config();
const mongoose = require('mongoose');
const RaffleNumber = require('./models/RaffleNumber');

const TOTAL_NUMBERS = parseInt(process.env.TOTAL_NUMBERS || '100', 10);

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Falta la variable de entorno MONGODB_URI. Revisa tu archivo .env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Conectado a MongoDB para inicializar numeros...');

  const bulkOps = [];
  for (let i = 1; i <= TOTAL_NUMBERS; i++) {
    bulkOps.push({
      updateOne: {
        filter: { number: i },
        update: { $setOnInsert: { number: i, taken: false } },
        upsert: true,
      },
    });
  }

  const result = await RaffleNumber.bulkWrite(bulkOps);
  console.log(
    `Listo. Numeros insertados nuevos: ${result.upsertedCount || 0}. Total esperado: ${TOTAL_NUMBERS}`
  );

  await mongoose.disconnect();
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error al inicializar los numeros:', err);
    process.exit(1);
  });
