# Cómo poner esta app en internet usando GitHub + Render

Esta guía asume que no tienes nada configurado todavía. Vamos a hacer 3 cosas:

1. Crear una base de datos gratis en MongoDB Atlas.
2. Subir el código a un repositorio en GitHub.
3. Conectar ese repositorio a Render para que la app quede en línea.

---

## Paso 1: Crear la base de datos en MongoDB Atlas (gratis)

1. Entra a https://www.mongodb.com/cloud/atlas/register y crea una cuenta.
2. Cuando te pregunte, crea un cluster **gratuito (M0)**.
3. En "Security" → "Database Access", crea un usuario de base de datos
   (usuario + contraseña). Guárdalos, los usarás en un momento.
4. En "Security" → "Network Access", agrega la IP `0.0.0.0/0` (permitir
   acceso desde cualquier lugar) — así Render podrá conectarse.
5. En "Database" → botón **Connect** → "Drivers", copia la cadena de
   conexión. Se ve así:
   ```
   mongodb+srv://usuario:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Reemplaza `<password>` por tu contraseña real, y agrega el nombre de la
   base de datos antes del `?`, por ejemplo:
   ```
   mongodb+srv://usuario:tupassword@cluster0.xxxxx.mongodb.net/rifa?retryWrites=true&w=majority
   ```
   Guarda esta cadena completa, la necesitarás en el Paso 3.

---

## Paso 2: Subir el proyecto a GitHub

### Si nunca has usado git/GitHub en esta computadora:

1. Crea una cuenta en https://github.com si no tienes una.
2. Instala Git si no lo tienes: https://git-scm.com/downloads
3. Entra a GitHub → botón **New repository** (arriba a la derecha, ícono "+").
   - Nombre: `rifa-app` (o el que prefieras)
   - Puede ser público o privado
   - **No** marques "Add a README" (ya tenemos uno)
   - Crea el repositorio

### Subir el código (desde una terminal, dentro de la carpeta `rifa-app`):

```bash
cd rifa-app
git init
git add .
git commit -m "Primera version de la app de rifa"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/rifa-app.git
git push -u origin main
```

Reemplaza `TU-USUARIO` por tu nombre de usuario de GitHub. Si es la primera
vez que usas git desde esa terminal, te pedirá iniciar sesión en GitHub
(puede abrir el navegador o pedirte un token de acceso).

> El archivo `.gitignore` ya está configurado para que `node_modules/` y tu
> `.env` (con contraseñas) **nunca** se suban a GitHub. Eso es correcto y
> esperado: las variables de entorno se configuran directamente en Render,
> no en el repositorio.

---

## Paso 3: Desplegar en Render

1. Entra a https://render.com y crea una cuenta (puedes registrarte
   directamente con tu cuenta de GitHub, es lo más rápido).
2. Click en **New +** → **Web Service**.
3. Conecta tu cuenta de GitHub si te lo pide, y selecciona el repositorio
   `rifa-app`.
4. Render detectará el archivo `render.yaml` incluido y sugerirá la
   configuración automáticamente (Node, `npm install`, `npm start`). Si no
   lo detecta automáticamente, configura manualmente:
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free
5. En la sección **Environment Variables**, agrega:
   | Variable | Valor |
   |---|---|
   | `MONGODB_URI` | la cadena de conexión completa del Paso 1 |
   | `TOTAL_NUMBERS` | `100` |
   | `ADMIN_KEY` | una clave secreta que inventes tú, ej: `mi-clave-2026` |
6. Click en **Create Web Service** (o **Deploy**).
7. Espera 1-2 minutos mientras Render instala dependencias y arranca el
   servidor. Cuando termine, te dará una URL pública como:
   ```
   https://rifa-app.onrender.com
   ```

Abre esa URL y ya tendrás la rifa funcionando en internet, accesible para
cualquier persona con el link.

---

## Actualizaciones futuras

Cada vez que quieras cambiar algo, edítalo localmente y luego:

```bash
git add .
git commit -m "Descripcion del cambio"
git push
```

Render detecta el push automáticamente y vuelve a desplegar la app sola
(esto se llama "despliegue continuo").

---

## Notas sobre el plan gratuito de Render

- El plan gratis "duerme" el servicio tras ~15 minutos sin uso; la primera
  visita después de eso tarda unos 30-50 segundos en despertar. Es normal.
- Si necesitas que esté siempre activo (para un evento en vivo, por
  ejemplo), Render ofrece planes pagos desde muy pocos dólares al mes.
- Los datos en MongoDB Atlas **no se pierden** cuando el servicio duerme;
  solo se pausa el servidor web, no la base de datos.
