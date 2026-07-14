// Este script BORRA todos los documentos de la coleccion de numeros
// (numeros, nombres, telefonos, todo). Utilo antes de cambiar el rango de
// la rifa (por ejemplo, de 1-100 a 000-999) para empezar limpio.
//
// Por seguridad, no hace nada a menos que le pases la bandera --yes:
//   npm run clear -- --yes

require('dotenv').config();
const mongoose = require('mongoose');
const RaffleNumber = require('./models/RaffleNumber');
const { buildMongoUri } = require('./config/mongoUri');

async function clear() {
  const uri = buildMongoUri();
  if (!uri) {
    console.error(
      'Falta la configuracion de MongoDB. Define MONGODB_URI, o bien ' +
        'MONGODB_USER + MONGODB_PASSWORD + MONGODB_HOST. Revisa tu archivo .env'
    );
    process.exit(1);
  }

  if (!process.argv.includes('--yes')) {
    console.log('');
    console.log('ADVERTENCIA: esto va a BORRAR todos los numeros y los datos');
    console.log('de participantes (nombre, telefono) que ya existan en la base');
    console.log('de datos. Esta accion no se puede deshacer.');
    console.log('');
    console.log('Si estas seguro, vuelve a ejecutar:');
    console.log('  npm run clear -- --yes');
    console.log('');
    process.exit(0);
  }

  await mongoose.connect(uri);
  console.log('Conectado a MongoDB...');

  const result = await RaffleNumber.deleteMany({});
  console.log(`Listo. Se eliminaron ${result.deletedCount} numeros de la coleccion.`);
  console.log('Ejecuta "npm run seed" (o simplemente inicia el servidor) para');
  console.log('crear los numeros del nuevo rango desde cero.');

  await mongoose.disconnect();
}

clear()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error al vaciar la coleccion:', err);
    process.exit(1);
  });
