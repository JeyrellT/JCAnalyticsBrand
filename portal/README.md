# Portal del equipo JC Analytics

La experiencia **Punto de encuentro** incorpora un inicio visual para el equipo, foco personal con cambios de tareas, búsqueda con Ctrl/⌘ K y un estudio interactivo de automatizaciones. Ver [uso y verificación](docs/punto-de-encuentro.md).

Aplicación privada (detrás de login) para el equipo de 5 personas: **portal de proyectos**, **centro de operaciones** (tablero kanban + agenda de citas) e **inversiones de socios**, donde la administración aprueba cada movimiento de dinero.

Desde la v5 incluye además el **portal de clientes** (`/cliente`). Cada cliente sigue su servicio con JC Analytics desde ahí: etapas, avances, entregables por aprobar, solicitudes, documentos y reuniones. Las solicitudes usan el **brief creativo** (el formato "CREATIVIDAD" de JC), con versiones congeladas y verificables. El cliente no ve la operación interna: ni tareas, ni montos, ni notas del equipo. Ver `docs/v5-contrato.md`.

Está separada del sitio público (`jcanalytics-app/`, GitHub Pages): el portal necesita servidor, base de datos y sesiones, así que se publica como un servicio propio (Railway), en un subdominio como `portal.jcanalytic.com`.

## Qué resuelve

**Cómo se navega.** El menú sigue el orden de la empresa:
- **Operación:** Inicio, Tablero, Agenda y Buzón.
- **Empresa:** Proyectos, Clientes, Servicios y Equipo.
- **Web:** Consultas y Tráfico del sitio.
- **Socios:** Cobros, Inversiones y Finanzas.
- **Control:** Bitácora.

En el celular, la barra inferior trae Inicio, Tablero, un botón **"+"** de acciones rápidas, Agenda y **"Más"**. El botón "+" sirve para crear una tarea, agendar una cita, registrar el avance a un cliente, crear un cliente o registrar un aporte; "Más" abre el resto de secciones en mosaicos grandes.

**Centro de operaciones (`/`).** En el celular funciona como "Mi día": tus citas de hoy, tus tareas y (al admin) la plata por aprobar. Agrupa todo lo que requiere acción hoy: proyectos de cliente sin avance en 72 h, tareas vencidas, citas sin confirmar en las próximas 24 h, plata esperando tu aprobación, soportes de 30 días por terminar. Muestra además la agenda de la semana, tus tareas y el pulso de las inversiones.

**Proyectos (`/proyectos`).** Clientes (La Burrada, Uniquex…), productos propios (BarberXCR, Taller Ticos…) e internos. Cada uno tiene responsable, servicio del catálogo, valor en ₡ o $, fechas y contacto. Para proyectos de cliente en curso o en revisión aplica el **semáforo del compromiso público "avance cada 72 h"**. El reloj corre desde que el proyecto entra en curso o desde el último avance registrado. "Registrar avance" deja constancia, arma el mensaje de WhatsApp y reinicia el reloj. Al marcarlo entregado arranca el **soporte de 30 días**.

**Cobros (`/cobros`, solo socios y admin).** Cada proyecto lleva sus líneas de cobro, en la tarjeta "Cobros" de su ficha:
- **Pago único** (una fecha) o **recurrente**: semanal, quincenal, mensual, bimestral, trimestral, semestral o anual, con "hasta" opcional.
- Un mismo proyecto puede tener varias líneas: por ejemplo, una mensualidad y una pauta que se cobra cada quincena.
- **Quincenal** son dos cobros por mes separados 15 días (1 y 16, o 15 y 30; en febrero, el último día). **Mensual** usa el mismo día de cada mes y el 31 pasa al último día de los meses cortos.
- El portal calcula el **equivalente mensual** (quincenal × 2, semanal × 52 ÷ 12…), el **próximo cobro**, los cobros de cada mes y la proyección de 6 meses. Los dólares se convierten con el tipo de cambio vigente.
- Solo suman los proyectos que cobran: en curso, en revisión, entregados o en soporte, sin archivar. Prospectos, pausados y cerrados se ven, pero no suman.
- Todo el equipo ve los cobros de un proyecto; solo socios y admin los crean o cambian. El día del cobro aparece "Hoy toca cobrar" en el centro de operaciones. "Excel (12 meses)" descarga el calendario con separador `;`.

**Clientes (`/clientes`).** Ficha de cada cliente con contacto (WhatsApp y correo), quién lleva la relación, proyectos, valor abierto, último contacto, próxima cita e historial de avances. Los clientes se eligen desde proyectos y agenda, y la agenda completa el contacto sola.

**Servicios (`/servicios`).** Catálogo de las líneas de negocio agrupadas por área: sistemas y web, datos y BI, automatización, fiscal, marketing, formación y productos propios. Cada línea muestra su precio "desde", el **líder**, el equipo, los proyectos activos, el valor activo y las tareas abiertas. El admin edita líder, equipo, precio y descripción.

**Equipo (`/equipo`).** Directorio de personas con su **carga de trabajo** (disponible / con carga / saturado), los servicios que lideran y sus proyectos. Cada persona tiene una ficha (`/equipo/:id`) con servicios, proyectos y su rol en cada uno, tareas abiertas, próximas citas y actividad. Las pestañas *Mi perfil* y *Ajustes* reúnen la contraseña, el tipo de cambio, el plazo de 72 h, los límites WIP y el respaldo. Cada proyecto tiene además su **equipo con roles**: responsable, desarrollo, diseño, datos, contenido, comercial y soporte.

**Tablero (`/tablero`).** Kanban con Backlog, Por hacer, En progreso, Revisión y Hecho. En escritorio se arrastra entre columnas. En el celular se ve una columna a la vez, se cambia con chips y cada tarjeta tiene "Mover a". Tiene **límites WIP** (Lean) configurables, filtros por proyecto, persona y vencidas, y comentarios con aviso a los involucrados.

**Agenda (`/agenda`).** Vista semanal en escritorio y lista por día en móvil, siempre en hora de Costa Rica. Detecta **choques de horario por persona** antes de guardar. Ofrece descarga `.ics` para Google Calendar u Outlook y un recordatorio por WhatsApp al cliente con un toque.

**Inversiones (`/inversiones`, solo socios y admin).** El ciclo del dinero es el siguiente:

1. Se registra un **aporte** (socio → inversión) o un **retorno** (inversión → socio) con **mensaje obligatorio** y referencia SINPE opcional.
2. **La administración aprueba toda la plata** (rol admin):
   - si lo registra un administrador, queda **aprobado de una vez** y la persona del movimiento recibe el aviso;
   - si lo registra un socio o lo avisa un inversionista, queda **por aprobar** hasta que un administrador lo revise.
   Ni los socios ni los inversionistas aprueban movimientos, tampoco los suyos.
3. El administrador **aprueba con un toque** (desde el buzón o la inversión; la nota es opcional) o **rechaza** con el motivo.
4. **Solo lo aprobado** suma en los indicadores. Un movimiento aprobado no se edita: si hubo un error, un admin lo **anula con motivo** y queda en la bitácora.

"Repartir retorno" divide un monto entre los socios **según su capital aprobado**, con redondeo exacto (la suma siempre da el total). Si lo reparte el admin, todas las partes quedan aprobadas; si lo reparte un socio, esperan la aprobación del admin.

Indicadores disponibles:
- capital aportado, retornado y neto;
- **MOIC** (múltiplo sobre el capital);
- **TIR anual** (equivalente a `XIRR` de Excel);
- participación por socio;
- monto en tránsito.

Los movimientos en dólares **guardan su tipo de cambio**, así el consolidado en colones no cambia con el tiempo. La exportación a Excel usa separador `;` y BOM UTF-8.

**Buzón (`/buzon`).** Al admin le reúne los movimientos por aprobar, con "Aprobar" y "Rechazar" en cada uno; a los socios, lo que registraron y sigue esperando. También trae los avisos (tareas asignadas, citas, comentarios, aprobaciones).

**Libro amarillo (`/libro-amarillo`).** Directorio de prospección por teléfono para todo el equipo: búsqueda, filtros por estado, provincia y cantón, índice A–Z, "Hoy toca llamar", llamada con un toque, registro de cada llamada con resultado y próxima fecha, observaciones y responsable. Se alimenta a mano o **importando Excel/CSV**: la lista crece sola sin duplicar teléfonos y cada importación se puede deshacer. Ver [docs/libro-amarillo.md](docs/libro-amarillo.md).

**Briefs (`/briefs`).** Bandeja de los briefs creativos de todos los clientes, ordenada por lo que requiere acción: primero los enviados por revisar, después los que tienen ajustes y los que están en producción.
- El formulario sigue el formato CREATIVIDAD: material requerido, objetivo, marca, oferta, mensaje clave, URLs de redireccionamiento, RRSS, base de datos, editable, creatividad, configuración de envío, correo de testeo, fecha de envío, disclaimer, línea gráfica y nota.
- Valida lo que hace falta para enviar:
  - un sorteo necesita reglamento o disclaimer;
  - una conversión necesita al menos un enlace;
  - el envío de email necesita correo de testeo;
  - la fecha respeta el plazo mínimo de producción (3 días, ajustable). Un brief urgente se marca con motivo.
- Al enviarse, el brief **se congela** como versión con huella SHA-256 y ya no se edita. Para cambiarlo, el equipo "pide ajustes" con motivo y el cliente reenvía (versión 2, 3…).
- Flujo: borrador → enviado → aprobado → en producción → entregado → cerrado.
- Cada paso, comentario y **nota interna** queda en la bitácora del brief. El cliente nunca ve las notas internas.
- Se imprime o se guarda en PDF en A4 con el logo de JC.

**Portal de clientes (`/cliente`).** Es un acceso aparte para cada persona del cliente. Lo crean un admin, un socio o quien lleva la cuenta, desde la ficha del cliente → "Portal del cliente". El cliente ve:
- sus proyectos con **etapas** y avance;
- los **avances** que le registró el equipo;
- los **entregables** por aprobar: aprueba la versión que vio o pide cambios con nota;
- sus **solicitudes** (briefs);
- los **documentos** compartidos (contrato, facturas, manual de marca, reportes);
- sus **reuniones**;
- el contacto de su ejecutivo.

Cada aprobación, cambio pedido o brief enviado avisa al equipo, en el buzón y por push (categoría "Portal de clientes"). El equipo, a su vez, avisa al cliente dentro de su portal.

**Consultas y tráfico del sitio (`/consultas`, `/trafico`).** Las personas que dejan su WhatsApp o correo en jcanalytic.com llegan a la bandeja "Consultas": se contactan con un toque, se asignan, llevan notas, muestran el recorrido de su visita y se pasan a clientes. "Tráfico del sitio" está hecho para decidir: compara cada cifra con el periodo anterior, abre con **"Qué hacer esta semana"** (recomendaciones por reglas, solo cuando la muestra alcanza), da un **veredicto a cada página** (engancha, mucho tráfico y poca acción, rebote, pocos datos) con su detalle al tocarla, muestra **cuándo entra la gente** (día × hora de Costa Rica), **qué CTA convierte** por sección y el **embudo de las consultas** (contactadas, mediana a primer contacto, tasa de cierre, sin atender más de 24 h). El inicio avisa en rojo cuando una consulta lleva más de 24 h sin respuesta. Medición propia sin cookies; el texto del visitante nunca llega a una IA. Ver [docs/consultas-y-trafico.md](docs/consultas-y-trafico.md).

**Conectar con Claude (`/mcp`).** Cada persona del equipo genera una conexión en "Equipo → Mi perfil → Conectar con Claude". Desde una conversación con Claude (claude.ai, escritorio, celular o Claude Code) se crean y consultan proyectos, clientes, tareas y avances, con sus mismos permisos y con registro en la bitácora ("vía Claude"). Ver [docs/mcp-claude.md](docs/mcp-claude.md).

**Bitácora (`/bitacora`).** Registro de quién hizo qué y cuándo. Los colaboradores no ven las entradas de dinero.

**Automatizaciones (`/automatizaciones`).** El portal revisa la operación cada minuto y avisa a la persona correcta, en el buzón y en el celular. Cada aviso sale una sola vez. Hay 10 automatizaciones:

| Automatización | Cuándo | A quién |
|---|---|---|
| Resumen "Mi día" | A la hora que elige cada persona (7:30 por defecto) | Cada persona: citas y tareas de hoy; al admin, también la plata por aprobar |
| Resumen semanal de tráfico | Lunes 8:00 (ajustable): los últimos 7 días contra los 7 anteriores | Admin y socios: visitas y su variación, consultas nuevas y sin atender, mejor y peor página, qué hacer primero. No sale sin visitas ni consultas |
| Recordatorio de citas | 60 min antes (ajustable) | Participantes |
| Cita sin confirmar | Menos de 24 h antes, si sigue "programada" | Quien agendó y participantes |
| Avance de 72 h | A los 2/3 del plazo y al vencer | Responsable; si vence, también los admin |
| Tareas que vencen hoy | 8:00 | Asignado |
| Dinero sin aprobar | 9:00, si lleva más de 24 h | Los administradores |
| Fin del soporte de 30 días | 7 días antes, 8:30 | Responsable |
| Tareas recurrentes | 6:00, según cada regla (diaria, semanal o mensual) | Crea la tarea y avisa al asignado |
| Tipo de cambio | 8:15, desde la API de Hacienda | Actualiza el valor de referencia y avisa a los admin |

El admin las pausa, ajusta su hora y las prueba con "Probar ahora". "Lo que hizo el portal" guarda el historial.

**Avisos y app (`/notificaciones`).** Cada persona:
- instala el portal en su celular;
- activa los avisos en ese dispositivo;
- elige qué le avisamos: tareas, citas, proyectos, dinero (solo socios), resumen y alertas;
- define su horario tranquilo (21:00–7:00 por defecto). De noche solo suenan los movimientos de plata; todo lo demás queda en el buzón.

### Apariencia: claro, oscuro o automático

El portal tiene **tema claro y oscuro**. Por defecto sigue al celular o la compu; cada persona puede fijarlo en
"Equipo → Mi perfil → Apariencia", con el sol/luna de la barra lateral o en la hoja "Más" del celular. La
preferencia se guarda en el navegador (`jcp:theme`) y se aplica antes de pintar, sin destello. Los colores de la
barra del sistema (`theme-color`) y la página "Sin conexión" acompañan al tema.

Todo el sistema visual (tokens, componentes y reglas) está documentado en `docs/v4-diseno.md`.
Para revisar las pantallas en los dos temas y en los dos anchos:

```sh
npm run build
node scripts/capturas.mjs capturas --tema=light     # escritorio 1440 px y celular 390 px
node scripts/capturas.mjs capturas --tema=dark --solo=inicio,inversiones
```

### Instalar en el celular

- **Android (Chrome):** en "Avisos y app" tocá **Instalar**, o usá el menú ⋮ → *Instalar app*. Los avisos se activan desde ahí mismo.
- **iPhone/iPad (iOS 16.4 o superior):** abrí el portal en **Safari** → *Compartir* → **Agregar a inicio** → abrí *JC Portal* desde el ícono. Recién ahí, en "Avisos y app", activá los avisos. Apple solo permite avisos en apps agregadas a la pantalla de inicio.
- Al mantener presionado el ícono aparecen atajos: Nueva tarea, Agendar cita, Buzón y Registrar avance. El globo del ícono muestra los avisos sin leer.

### Roles

- **Administrador.** Puede hacer todo, además de gestionar personas, permisos por inversionista, ajustes y respaldos. Es **quien aprueba o rechaza** cada aporte y retorno, y anula movimientos ya aprobados.
- **Socio.** Accede a proyectos, tablero, agenda y todas las inversiones. Registra aportes y retornos, que quedan por aprobar. Solo el administrador cambia los permisos de los inversionistas.
- **Colaborador.** Accede a proyectos, tablero y agenda. **No ve inversiones** (ni en la API, el centro de operaciones, la bitácora o los avisos). Puede dar accesos al portal de clientes solo para los clientes que lleva.
- **Cliente** (v5). Es una identidad aparte y solo entra a `/cliente`. Ve solo lo de su empresa. Puede aprobar entregables si su acceso lo permite.
- **Inversionista** (v6). Solo entra a `/inversionista`, su portal:
  - ve su capital, sus retornos, su participación y su TIR;
  - avisa sus aportes (quedan por aprobar) y escribe en el hilo de sus movimientos; no aprueba nada;
  - explora las inversiones que le habilitó el administrador, avisa aportes en ellas y descarga su estado de cuenta en Excel;
  - conserva su historial, aprobaciones y retornos si el administrador retira el permiso para nuevos aportes.

  No ve la operación, ni los nombres o montos de otros socios, ni las notas internas. Ver `docs/v6-contrato.md` y `docs/club-de-inversionistas.md`.

## Arquitectura

```
portal/
├── server/            Node 22 sin frameworks: API JSON + archivos estáticos en el mismo origen
│   ├── app.mjs        rutas, sesión, permisos por rol, CSRF, encabezados de seguridad
│   ├── db.mjs         SQLite (node:sqlite) con migraciones versionadas
│   ├── routes/        core (sesión/equipo/ajustes/buzón/bitácora/respaldo), work (proyectos/tablero/agenda),
│   │                  charges (cobros únicos y recurrentes/CSV), investments (aportes/retornos/aprobaciones/CSV), dashboard
│   ├── cli.mjs        alta y reseteo de usuarios por consola
│   └── seed-demo.mjs  datos de demostración (nunca en producción)
├── shared/            lógica compartida servidor/navegador: montos, reparto pro-rata, TIR, calendario de cobros, catálogos
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

Inversionista (v6): `angel@demo.jcanalytic.local`, que tiene un aporte aprobado y otro que avisó él, esperando la aprobación del admin en BarberXCR.

Portal de clientes (v5): `laburrada@clientes.demo.jcanalytic.local` (aprueba entregables), `marketing.laburrada@clientes.demo.jcanalytic.local` (solo lectura de entregables) y `uniquex@clientes.demo.jcanalytic.local`, con la misma contraseña. Se ingresa en `/cliente` con la opción "Cliente" del login.

En Windows (PowerShell): `$env:PORTAL_DB_PATH="data/demo.sqlite"; npm run dev:api`.

### Demo para revisar en el celular

```sh
npm run build:demo       # → demo-dist/portal-demo.html (un solo archivo, ~2,3 MB)
npm run dev:demo         # la misma demo con recarga en vivo: http://localhost:5173/demo/
```

Es el portal completo **sin servidor**: el backend real (migraciones, rutas y permisos de `server/`) corre dentro del navegador sobre SQLite en memoria (sql.js), con los datos ficticios de `server/demo-data.mjs`. Al abrirla se elige una persona (admin, socios o colaboradora) en lugar de usuario y contraseña; "Cambiar de persona" vuelve al selector. Los cambios se pierden al recargar y las descargas (Excel, respaldo, .ics) muestran un aviso. El archivo es un fragmento HTML pensado para publicarse como artefacto de claude.ai y abrirse en la app de Claude. Detalles en `demo/README.md`.

## Verificación antes de publicar

```sh
npm run lint
npm test            # API, permisos, aprobación del admin, reparto, TIR, CSV, sesiones
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
   - `PORTAL_SETUP_CODE=<código largo y aleatorio>` (v6): con la base vacía, el portal muestra **"Configurá tu portal"**. Ahí el dueño pone este código, su nombre, correo y contraseña, y queda como administrador. Después la pantalla desaparece para siempre. Si no definís la variable, el servidor genera un código y lo muestra en el registro (*Deploy Logs*).
   - Alternativa sin pantalla: `PORTAL_ADMIN_EMAIL`, `PORTAL_ADMIN_NAME` y `PORTAL_ADMIN_PASSWORD` crean al admin al arrancar con la base vacía (con clave temporal).
   - Avisos push (recomendado): `PORTAL_VAPID_PUBLIC_KEY` y `PORTAL_VAPID_PRIVATE_KEY`.
     - Sin estas variables, el portal genera las claves una vez y las guarda en la base.
     - Si las claves cambian, cada persona debe volver a activar los avisos.
     - Opcionales: `PORTAL_VAPID_SUBJECT` (por defecto `mailto:gerencia@jcanalytic.com`), `PORTAL_FX_URL` (API del tipo de cambio) y `PORTAL_SCHEDULER=0` para apagar las automatizaciones.
   - Los avisos y la instalación exigen **HTTPS** y un dominio propio. Railway lo da por defecto.
4. **Servicio (Settings):**
   - *Root Directory* `/portal`, builder Railpack.
   - *Build Command* `npm run build`. Railpack ya instala las dependencias; no repitas `npm ci`, porque `node_modules/.vite` es un caché montado y falla con EBUSY.
   - *Start* `npm start` · *Healthcheck* `/health` · *Watch Paths* `/portal/**`.
   - Con `NODE_ENV=production`, agregá `NPM_CONFIG_PRODUCTION=false` para que se instale Vite, que es dependencia de desarrollo.
5. **Dominio:** generar uno de Railway o apuntar `portal.jcanalytic.com` (CNAME) al servicio.
6. **Primer ingreso:** abrí el portal, completá "Configurá tu portal" con el código y tus datos, y entrás como administrador.
7. **Agregar gente:**
   - En *Equipo y ajustes → Agregar persona* se crean socios, colaboradores e **inversionistas**. Cada persona recibe una contraseña temporal, con un mensaje listo para WhatsApp que lleva el enlace correcto (`/` para el equipo, `/inversionista` para inversionistas).
   - El administrador habilita inversiones en *Inversiones → abrir inversión → Acceso de inversionistas → Administrar acceso*. Marca las personas y guarda. Las inversiones nuevas empiezan sin inversionistas habilitados; los socios mantienen acceso a todas.
   - Los **clientes** se agregan en *Clientes → ficha → Portal del cliente → Dar acceso*.

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

Portal de clientes (v5):

**Identidad separada.**
- Tiene su propia tabla (`client_accounts`), su propia cookie (`jcc_session`) y solo las rutas `/api/client/*`.
- Una sesión de cliente no abre ninguna ruta del equipo, ni al revés. El router lo verifica dos veces: por la cookie y por el tipo de usuario.

**Aislamiento.**
- Cada consulta filtra por la empresa del cliente.
- Un id de otro cliente responde 404, no 403, para no revelar que existe.
- Los prospectos, las citas internas, las tareas, los montos y las notas internas nunca salen por la API de clientes.

**Sesiones.**
- Vencen tras 8 h sin uso y siempre a los 3 días.
- Clave temporal obligatoria al crear o restablecer un acceso.
- Quitar el acceso o cambiar el correo cierra las sesiones al instante.

**Límites.**
- El login comparte el limitador del equipo.
- Freno de 120 escrituras cada 10 minutos por cuenta.
- Máximo 15 borradores abiertos por cliente.

**Integridad.**
- Cada versión enviada de un brief guarda su huella SHA-256, y el portal la recalcula para detectar alteraciones.
- Un entregable aprobado no cambia en silencio: un enlace nuevo es siempre una versión nueva.
- Lo que el cliente ya decidió no se puede borrar.
- Los guardados concurrentes no se pisan (bloqueo optimista).

**Entradas.**
- Solo se aceptan enlaces `http(s)`.
- Las claves desconocidas del brief se descartan.
- Un mismo correo no puede ser a la vez del equipo y de un cliente.

**Encabezados.**
- `Cross-Origin-Opener-Policy` y `Cross-Origin-Resource-Policy: same-origin`.
- CSP con `object-src 'none'`.
- Una cookie malformada se ignora en lugar de romper la petición.

Auditoría:
- La bitácora registra accesos fallidos, cambios de contraseña, altas y bajas de personas, respaldos, exportaciones y cada movimiento de dinero.

## Próximas iteraciones sugeridas

1. **Avisos por WhatsApp Business API o correo** como segundo canal, para quien no instale la app. Hoy los avisos llegan al buzón y por push.
5. **Verificar en producción el formato de la API de Hacienda** para el tipo de cambio. Desde el entorno de desarrollo no hubo acceso; el lector acepta los formatos conocidos y, si no reconoce la respuesta, deja el valor anterior y lo registra.
2. **Comprobantes adjuntos** (foto del SINPE) en cada movimiento, usando almacenamiento en Railway o Drive.
3. **Respaldo automático diario** a Drive o a un bucket.
4. **Tablero Power BI** conectado a la exportación CSV o a una vista de solo lectura.

## Enlaces de registro (v7)

En lugar de crear cuentas a mano, compartí un enlace y cada persona se registra sola con su propia contraseña:

- **Una persona:** *Equipo → Agregar persona → Solo el nombre*. Te da un enlace personal (un uso).
- **Un grupo:** *Equipo → Enlaces de registro → Nuevo enlace → Para un grupo*: rol, cupo máximo (1–200), vigencia y mensaje de bienvenida.
- **Clientes:** ficha del cliente → *Portal del cliente → Enlaces de registro*.
- Compartí por WhatsApp, copiando el enlace o mostrando el **código QR**. Podés renovar, ampliar cupo o desactivar cuando quieras.

Detalle técnico en `docs/v7-contrato.md`.
