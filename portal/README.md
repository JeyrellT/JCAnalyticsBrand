# Portal del equipo JC Analytics

Aplicación privada (detrás de login) para el equipo de 5 personas: **portal de proyectos**, **centro de operaciones** (tablero kanban + agenda de citas) e **inversiones de socios** con confirmación de cada movimiento de dinero y su "mensaje de vuelta".

Está separada del sitio público (`jcanalytics-app/`, GitHub Pages): el portal necesita servidor, base de datos y sesiones, así que se publica como un servicio propio (Railway), en un subdominio como `portal.jcanalytic.com`.

## Qué resuelve

**Centro de operaciones (`/`).** Agrupa todo lo que requiere acción hoy: proyectos de cliente sin avance en 72 h, tareas vencidas, citas sin confirmar en las próximas 24 h, plata esperando tu confirmación, soportes de 30 días por terminar. Muestra además la agenda de la semana, tus tareas y el pulso de las inversiones.

**Proyectos (`/proyectos`).** Clientes (La Burrada, Uniquex…), productos propios (BarberXCR, Taller Ticos…) e internos. Cada uno tiene responsable, servicio del catálogo, valor en ₡ o $, fechas y contacto. Para proyectos de cliente en curso o en revisión aplica el **semáforo del compromiso público "avance cada 72 h"**. El reloj corre desde que el proyecto entra en curso o desde el último avance registrado. "Registrar avance" deja constancia, arma el mensaje de WhatsApp y reinicia el reloj. Al marcarlo entregado arranca el **soporte de 30 días**.

**Tablero (`/tablero`).** Kanban con Backlog, Por hacer, En progreso, Revisión y Hecho. Se usa arrastrando en escritorio y con "Mover a" en el celular. Tiene **límites WIP** (Lean) configurables, filtros por proyecto, persona y vencidas, y comentarios con aviso a los involucrados.

**Agenda (`/agenda`).** Vista semanal en escritorio y lista por día en móvil, siempre en hora de Costa Rica. Detecta **choques de horario por persona** antes de guardar. Ofrece descarga `.ics` para Google Calendar u Outlook y un recordatorio por WhatsApp al cliente con un toque.

**Inversiones (`/inversiones`, solo socios y admin).** El ciclo del dinero es el siguiente:

1. Se registra un **aporte** (socio → inversión) o un **retorno** (inversión → socio) con **mensaje obligatorio** y referencia SINPE opcional.
2. Queda **por confirmar**, con **doble control**:
   - si lo registra el mismo socio, lo confirma otro socio (quien recibió la plata);
   - si lo registra otra persona, lo confirma el socio del movimiento;
   - si ese socio ya no tiene acceso (desactivado o pasado a colaborador), lo confirma otro socio, que custodia su parte.
3. Quien confirma responde con su **mensaje de vuelta** ("Recibido ✓…") u **objeta** con el motivo.
4. **Solo lo confirmado** suma en los indicadores. Un movimiento confirmado no se edita: si hubo un error, un admin lo **anula con motivo** y queda en la bitácora.

"Repartir retorno" divide un monto entre los socios **según su capital confirmado**, con redondeo exacto (la suma siempre da el total). Cada socio confirma su parte.

Indicadores disponibles:
- capital aportado, retornado y neto;
- **MOIC** (múltiplo sobre el capital);
- **TIR anual** (equivalente a `XIRR` de Excel);
- participación por socio;
- monto en tránsito.

Los movimientos en dólares **guardan su tipo de cambio**, así el consolidado en colones no cambia con el tiempo. La exportación a Excel usa separador `;` y BOM UTF-8.

**Buzón (`/buzon`).** Reúne los movimientos por confirmar, con la respuesta en el mismo lugar, y los avisos (tareas asignadas, citas, comentarios, confirmaciones).

**Equipo y ajustes (`/equipo`).** Gestión de personas y roles, perfil y contraseña. Los ajustes operativos son el tipo de cambio, el plazo del avance (72 h) y los límites WIP. Desde aquí se descarga el **respaldo** de la base.

**Bitácora (`/bitacora`).** Registro de quién hizo qué y cuándo. Los colaboradores no ven las entradas de dinero.

### Roles

- **Administrador.** Puede hacer todo, además de gestionar personas, ajustes y respaldos, y anular movimientos ya confirmados.
- **Socio.** Accede a proyectos, tablero, agenda e inversiones.
- **Colaborador.** Accede a proyectos, tablero y agenda. **No ve inversiones** (ni en la API, el centro de operaciones, la bitácora o los avisos).

## Arquitectura

```
portal/
├── server/            Node 22 sin frameworks: API JSON + archivos estáticos en el mismo origen
│   ├── app.mjs        rutas, sesión, permisos por rol, CSRF, encabezados de seguridad
│   ├── db.mjs         SQLite (node:sqlite) con migraciones versionadas
│   ├── routes/        core (sesión/equipo/ajustes/buzón/bitácora/respaldo), work (proyectos/tablero/agenda),
│   │                  investments (aportes/retornos/confirmaciones/CSV), dashboard
│   ├── cli.mjs        alta y reseteo de usuarios por consola
│   └── seed-demo.mjs  datos de demostración (nunca en producción)
├── shared/            lógica compartida servidor/navegador: montos, reparto pro-rata, TIR, catálogos
├── src/               React 19 + Vite + Tailwind 4 (marca JC Analytics, responsive)
└── tests/             node:test (API + finanzas) y prueba E2E en navegador real
```

Decisiones y trade-offs:
- **SQLite en un archivo.** Para 5 personas sobra, no hay servidor de base que administrar y el respaldo es un solo archivo. A cambio exige **una sola réplica** y un volumen persistente. Si el equipo crece mucho o se necesitan varias réplicas, se migra a Postgres: el SQL es estándar.
- **Montos en unidades menores enteras** (céntimos). Nunca hay errores de coma flotante.
- **Mismo origen para API y frontend.** La cookie es `HttpOnly` + `SameSite=Strict` y no hace falta CORS.
- **Sin dependencias en el servidor.** Solo usa módulos nativos de Node, así que hay menos superficie de ataque y menos mantenimiento.

## Desarrollo local

Requisitos: Node **22.13 o superior**.

```sh
cd portal
npm ci
npm run seed:demo        # crea data/demo.sqlite con 5 personas y datos de ejemplo
PORTAL_DB_PATH=data/demo.sqlite npm run dev:api   # API en :3002
npm run dev              # en otra terminal: interfaz en http://localhost:5173
```

Las cuentas demo son `jeyrell@demo.jcanalytic.local` (admin), `catalina@…`, `alex@…`, `socio5@…` (socios) y `hillary@…` (colaboradora). La contraseña de todas es `DemoPortal2026`. Para recrear la base demo: `npm run seed:demo -- --reset`.

En Windows (PowerShell): `$env:PORTAL_DB_PATH="data/demo.sqlite"; npm run dev:api`.

## Verificación antes de publicar

```sh
npm run lint
npm test            # API, permisos, doble control, reparto, TIR, CSV, sesiones
npm run build
npm run e2e         # navegador real: escritorio 1440 px y móvil 390 px, capturas en test-results/
```

La E2E usa Chromium. Busca primero `PLAYWRIGHT_CHROMIUM`, después `/opt/pw-browsers/chromium` y por último el navegador de Playwright.

## Publicación en Railway

1. **Servicio nuevo** en el proyecto de Railway desde este repositorio, con *Root Directory* `portal`.
2. **Volumen** montado en `/data`, para que la base sobreviva a cada despliegue.
3. **Variables:**
   - `NODE_ENV=production` → cookies `Secure` y HSTS
   - `PORTAL_DB_PATH=/data/portal.sqlite`
   - `PORTAL_ADMIN_EMAIL=gerencia@jcanalytic.com`, `PORTAL_ADMIN_NAME=Jeyrell Tardencilla` y `PORTAL_ADMIN_PASSWORD=<temporal de 10+ caracteres con letras y números>`. Solo se usan si la base está vacía.
4. **Build:** `npm ci && npm run build` · **Start:** `npm start` · **Healthcheck:** `/health`.
5. **Dominio:** generar uno de Railway o apuntar `portal.jcanalytic.com` (CNAME) al servicio.
6. Primer ingreso: entrar con el correo del admin y la contraseña temporal. El portal pide cambiarla. **Después borrá `PORTAL_ADMIN_PASSWORD`** de las variables.
7. En *Equipo y ajustes → Agregar persona*, crear las otras 4 cuentas. Cada una recibe una contraseña temporal, que se puede enviar por WhatsApp desde el mismo modal.

Una sola réplica, siempre: los límites de intentos de login viven en memoria y SQLite no admite escritores en paralelo entre réplicas.

### Respaldos

- **Manual:** *Equipo y ajustes → Descargar respaldo* (solo admin) baja una copia consistente (`VACUUM INTO`).
- **Recomendado:** respaldo semanal guardado en Drive y antes de cada cambio grande. Restaurar es detener el servicio, reemplazar `/data/portal.sqlite` y volver a iniciar.

### Recuperar acceso

Desde la consola de Railway (o local con `PORTAL_DB_PATH`):

```sh
npm run user:list
npm run user:reset -- --email persona@jcanalytic.com
npm run user:create -- --email nuevo@jcanalytic.com --name "Nombre" --role socio
```

## Seguridad

Contraseñas:
- Se guardan con hash **scrypt** y salt por usuario.
- La política pide al menos 10 caracteres, con letras y números.
- Las contraseñas temporales obligan a cambiarse al entrar.

Sesiones:
- Viven en una cookie `HttpOnly`, `SameSite=Strict` y `Secure` en producción.
- En la base solo se guarda el **hash** del token.
- Vencen tras 12 h sin uso y siempre a los 7 días.
- Cambiar la contraseña cierra las otras sesiones.

Protección contra ataques:
- **Fuerza bruta:** bloqueo de 15 min tras 5 intentos fallidos por correo (20 por IP). Cada intento se cuenta antes de verificar la contraseña, así que enviar intentos en paralelo no esquiva el límite. La IP sale del último salto de `X-Forwarded-For`, el que agrega el proxy de Railway, porque el cliente no puede falsificarlo. El tiempo de respuesta es igual exista o no el correo.
- **CSRF:** toda escritura exige el encabezado `X-Portal-Request` y un `Origin` propio.
- **Permisos por rol** en cada ruta del servidor, no solo en la interfaz.
- **Encabezados:** CSP estricta, `X-Frame-Options: DENY`, `noindex` y HSTS.
- **Excel:** la exportación neutraliza fórmulas (`=`, `+`, `-`, `@`) para evitar inyección.

Datos de dinero:
- Si un socio pasa a colaborador, deja de recibir avisos de dinero y tampoco ve los anteriores.

Auditoría:
- La bitácora registra accesos fallidos, cambios de contraseña, altas y bajas de personas, respaldos, exportaciones y cada movimiento de dinero.

## Próximas iteraciones sugeridas

1. **Avisos por correo o WhatsApp Business API** para confirmaciones pendientes de más de 48 h. Hoy los avisos llegan dentro del portal y los mensajes de WhatsApp se abren con un toque.
2. **Comprobantes adjuntos** (foto del SINPE) en cada movimiento, usando almacenamiento en Railway o Drive.
3. **Respaldo automático diario** a Drive o a un bucket.
4. **Tablero Power BI** conectado a la exportación CSV o a una vista de solo lectura.
