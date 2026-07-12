// Construye la cadena de conexion a MongoDB de forma segura.
//
// Opcion A (una sola variable): define MONGODB_URI con la cadena completa.
// Opcion B (recomendada si tienes problemas de "bad auth"): define estas
// variables por separado y el codigo arma la cadena, codificando
// automaticamente cualquier caracter especial en el usuario/contraseña:
//   MONGODB_USER      -> el usuario de "Database Access" en Atlas
//   MONGODB_PASSWORD  -> la contraseña de ese usuario
//   MONGODB_HOST      -> solo el host del cluster, ej: cluster0.xxxxx.mongodb.net
//   MONGODB_DB        -> nombre de la base de datos (opcional, por defecto "rifa")
//
// Si defines MONGODB_USER/MONGODB_PASSWORD/MONGODB_HOST, estas tienen
// prioridad sobre MONGODB_URI, para evitar ambigüedad.
function buildMongoUri() {
  const { MONGODB_USER, MONGODB_PASSWORD, MONGODB_HOST, MONGODB_DB, MONGODB_URI } = process.env;

  if (MONGODB_USER && MONGODB_PASSWORD && MONGODB_HOST) {
    const user = encodeURIComponent(MONGODB_USER.trim());
    const pass = encodeURIComponent(MONGODB_PASSWORD.trim());
    const host = MONGODB_HOST.trim().replace(/^mongodb\+srv:\/\//, '').replace(/\/$/, '');
    const db = (MONGODB_DB || 'rifa').trim();
    return `mongodb+srv://${user}:${pass}@${host}/${db}?retryWrites=true&w=majority`;
  }

  if (MONGODB_URI) {
    return MONGODB_URI.trim();
  }

  return null;
}

module.exports = { buildMongoUri };
