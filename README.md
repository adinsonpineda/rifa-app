# Rifa Web (000 al 999) con MongoDB

Aplicación web para gestionar una rifa: cuadrícula de números del 000 al 999,
selección de número con registro de datos opcionales, y marcado automático
de "apartado" guardado en MongoDB.

## Estructura del proyecto

```
rifa-app/
├── server.js              # Servidor Express
├── seed.js                # Inicializa los numeros 000-999 en la base de datos
├── models/
│   └── RaffleNumber.js    # Esquema de Mongoose
├── routes/
│   ├── numbers.js         # API publica: listar y seleccionar numeros
│   └── admin.js           # API protegida: ver participantes
├── public/
│   ├── index.html
│   ├── style.css
│   └── script.js
├── package.json
└── .env.example
```

## 1. Requisitos

- Node.js 18 o superior
- Una base de datos MongoDB. Dos opciones:
  - **Local**: instalar MongoDB Community Server en tu computadora.
  - **En la nube (recomendado, gratis)**: crear un cluster gratuito en
    [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register).

## 2. Instalación

```bash
cd rifa-app
npm install
```

## 3. Configuración

Copia el archivo de ejemplo y edítalo con tu cadena de conexión real:

```bash
cp .env.example .env
```

Edita `.env`:

```
MONGODB_URI=mongodb+srv://usuario:password@cluster0.xxxxx.mongodb.net/rifa?retryWrites=true&w=majority
PORT=3000
RAFFLE_START=0
RAFFLE_END=999
ADMIN_KEY=elige-una-clave-secreta
```

> Si usas MongoDB local, deja: `MONGODB_URI=mongodb://127.0.0.1:27017/rifa`

`ADMIN_KEY` es la clave que usarás para consultar la lista de participantes
con sus datos personales (ver sección 6).

## 4. Ejecutar

```bash
npm start
```

Veras en la consola:

```
Conectado a MongoDB correctamente.
Numeros del 000 al 999 listos en la base de datos.
Servidor corriendo en http://localhost:3000
```

Abre tu navegador en **http://localhost:3000**

El servidor crea automáticamente los 100 números en la base de datos la
primera vez que arranca (no borra datos existentes en arranques posteriores).

## 5. Cómo funciona

- La cuadrícula muestra los números 000-999 como "boletos".
- Al hacer clic en un número disponible, se abre un formulario opcional
  (nombre obligatorio, teléfono opcional).
- Al confirmar, se envía una petición `POST /api/numbers/:numero/select`.
- El servidor usa una actualización **atómica** en MongoDB
  (`findOneAndUpdate` con condición `taken: false`), así que si dos personas
  hacen clic en el mismo número casi al mismo tiempo, solo la primera lo
  obtiene y la segunda recibe un aviso de que ya fue tomado.
- El número queda marcado visualmente como "APARTADO" para todos los que
  visiten la página (se actualiza al recargar o pulsar "Actualizar").

## 6. Ver los participantes y marcar pagos (administrador)

Visita en tu navegador:

```
http://localhost:3000/admin.html
```

Ingresa tu `ADMIN_KEY` (la misma que pusiste en `.env` / Render). Ahí puedes:

- Ver la lista completa de números apartados, con nombre, teléfono y fecha.
- Buscar por número, nombre o teléfono.
- Marcar cada número como **"Pagado"** (o desmarcarlo si te equivocaste).

Cuando marcas un número como pagado, en el tablero público ese número deja
de mostrar el sello rojo "APARTADO" y pasa a mostrar un sello verde
"PAGADO", visible para cualquier persona que visite la página (sin exponer
nombre, teléfono ni ningún dato personal — sigue siendo información
pública solo del número).

Esta página no está enlazada desde ningún lugar visible de la app; solo
quien conozca la URL exacta y la clave puede entrar. La clave se guarda
temporalmente en el navegador mientras esa pestaña esté abierta (no queda
guardada de forma permanente).

También puedes seguir usando la ruta de la API directamente si prefieres:

```
http://localhost:3000/api/admin/participants?key=TU_ADMIN_KEY
```

Reemplaza `TU_ADMIN_KEY` por el valor que pusiste en `.env`. Esto devuelve
un JSON con todos los números tomados y sus datos.

## 7. Despliegue en internet (opcional)

Puedes subir este proyecto a servicios como Render, Railway o Fly.io:

1. Sube el código a un repositorio de GitHub.
2. Crea un servicio "Web Service" en la plataforma elegida, apuntando a
   este repositorio.
3. Configura las variables de entorno (`MONGODB_URI` o las separadas, `PORT`, `RAFFLE_START`, `RAFFLE_END`,
   `ADMIN_KEY`) en el panel de esa plataforma (usa tu cadena de Atlas).
4. Comando de inicio: `npm start`.

## 8. Notas de seguridad

- Los datos personales solo se guardan si el usuario decide llenarlos;
  el número puede apartarse dejando todos los campos vacíos.
- La ruta pública `/api/numbers` **no** expone nombres ni
  teléfonos — solo el número y si está tomado. Los datos personales solo
  son visibles a través de la ruta protegida de administrador.
- Cambia `ADMIN_KEY` por una clave larga y única antes de usar esto en
  producción, y evita compartir el enlace de administrador públicamente.
