# Demo del portal en el navegador

`npm run build:demo` genera `demo-dist/portal-demo.html`: el portal completo en un
solo archivo, con el backend real corriendo en la pestaña y datos ficticios.

## Cómo funciona

| Pieza | Archivo | Qué hace |
| --- | --- | --- |
| Entrada | `main.jsx` | Pantalla "Preparando la demo…", siembra, conecta la app y monta `<Root />` de `src/App.jsx`, la barra de la demo y los avisos simulados. |
| Base | `sqljs-adapter.js` | sql.js **asm.js** (`sql.js/dist/sql-asm.js`: JS puro, sin `.wasm` ni `eval`) con la API de `node:sqlite` que usa `server/`: `exec`, `prepare().get/all/run`, `close`. Reutiliza una sentencia por texto SQL para no agotar la memoria de SQLite. |
| Backend | `backend.js` | `migrate()` + `createContext()` + `createRouter()` + `registerRoutes()`, igual que `server/app.mjs`. `dispatch(path, { method, body })` hace lo de `handleApi`: rutas, permisos por rol, cuerpo JSON y `HttpError` → `{ status, data }`. Sesiones lógicas en memoria (la siembra entra como cada persona; quien mira usa `viewer`). |
| Shims | `shims/` | Reemplazan `node:crypto`, `node:os`, `node:path`, `node:util`, `node:fs/promises` y `server/auth.mjs` (scrypt → SHA-256 con sal; el resto de `auth.mjs` es el real). |
| Interfaz | `src/lib/api.js`, `src/lib/router.jsx`, `src/pages/Login.jsx` | `setTransport()` cambia fetch por `dispatch`; `setRouterMode('memory')` evita tocar `location`/`history` (los enlaces quedan como `#/ruta`); con `isDemo()` el login es un selector de personas del equipo y, desde la v5, también de cliente. |

## Avisos push y automatizaciones (v3)

Un artefacto no puede usar service worker ni push real, así que la demo los
**simula** sin tocar `server/`: la política de avisos y el motor de
automatizaciones son los reales; solo cambia el último paso (el envío).

| Pieza | Archivo | Qué hace |
| --- | --- | --- |
| Push simulado | `backend.js` → `simulatePush(onShow)` | Asigna `ctx.push = { publicKey: 'demo', deliver }`. Cada envío "sale bien" (actualiza `last_success_at`) y solo se muestra en pantalla lo que va a la persona que mira (sesión `viewer`), una vez por aviso aunque tenga varios dispositivos. |
| Siembra de avisos | `backend.js` → `seed()` | Después de `seedDemoData`, cada persona queda con un "celular" con avisos (`push_subscriptions` directo en la base: `https://fcm.googleapis.com/fcm/send/demo-<id>`, `p256dh` de 65 bytes que empieza con 0x04, `auth` de 16, `platform: 'demo'`; en "Mis dispositivos" se ve como *iPhone · App instalada*) y, por la API, horario tranquilo vacío (`00:00`–`00:00` = sin horario) para que los avisos se vean a cualquier hora. |
| Aviso tipo celular | `notifications.jsx` → `<PhoneNotifications />`, `showPhoneNotification()` | Baja desde arriba (respeta `safe-area-inset-top`), muestra ícono, "JC Portal · ahora", título y 2 líneas; se apilan hasta 3, se van solos a los ~6 s, se descartan deslizando (arriba o a un lado), con Escape o con la ×; al tocarlo navega a `payload.url` con el router en memoria. Región `aria-live="polite"` y `prefers-reduced-motion` (solo fundido). Dispara `portal:push` como el SW real, así el buzón refresca sus contadores. |
| Motor | `main.jsx` → `startAutomations()` | `ctx.automations.runDue()` 3 s después de cada ingreso y luego cada 30 s (no corre en el selector de personas, así los avisos del día aparecen al entrar). Los errores se registran como aviso de consola y nunca rompen la interfaz. |
| "Simular aviso" | `scenarios.js` + `SimulateSheet` en la barra de la demo | Escenarios de un toque que crean datos como **otra** persona del equipo por las rutas reales (`backend.as(userId, api => …)`, una sesión lógica temporal) o corren la automatización real: resumen «Mi día» (`run('resumen_diario', { force: true })`), aporte por confirmar (solo si quien mira es socio o admin), tarea asignada y cita en 1 hora + `recordatorio_citas`. Si no aparece el aviso, explica por qué (categoría apagada, sin dispositivos, resumen en cero…). |

El resumen «Mi día» se deduplica por día y persona (`digest:<fecha>:<id>`). Para
que el escenario y "Probar ahora" se puedan repetir, la demo renombra esa clave de
quien mira antes de correrlo (la línea queda en el historial). El tipo de cambio
queda en "Sin conexión configurada": la demo no puede consultar Hacienda.

"Avisos en este dispositivo" (`/notificaciones`) usa la rama de demo de
`src/lib/pwa.js`: registra una suscripción falsa más por `POST /api/push/subscribe`
(aparece como "Este dispositivo") y "Enviar aviso de prueba" la muestra en pantalla.

El build (`vite.demo.config.js` + `scripts/build-demo.mjs`) incrusta JS, CSS y el
logo, y escribe un **fragmento** para artefactos de claude.ai: empieza con
`<title>`, sigue con las fuentes de Google, `<style>`, `<div id="root">` y un
`<script type="module">`; sin `<!doctype>`, `<html>`, `<head>` ni `<body>`.

## Portal de clientes (v5)

La demo trae las dos identidades del portal, cada una con su sesión lógica
(`sessions` para el equipo, `clientSessions` para clientes, igual que las cookies
`jcp_session` y `jcc_session` del servidor).

| Pieza | Archivo | Qué hace |
| --- | --- | --- |
| Personas de cliente | `main.jsx` → `enableDemo({ personas, clientPersonas, password })` | `clientPersonas` = `backend.clientPersonas()`: cuentas activas `{ id, name, email, title, client_name }`. El selector entra con `POST /api/client/auth/login` y la clave de la demo (`demoInfo().password`). |
| Quién mira | `main.jsx` → `readViewer()` | La barra de la demo dice "Viendo como cliente: Dueño La Burrada (La Burrada Street Food)" o la persona del equipo con su rol. "Simular aviso" es solo del equipo (los clientes no reciben push: ven sus avisos en el portal). |
| Cambiar de persona | `main.jsx` → `DemoBar` | Cierra las dos sesiones posibles (`/api/auth/logout` y `/api/client/auth/logout`) y vuelve al selector con un 401. |
| Claves del selector | `main.jsx` → `createDemoPasswords()` | Si en la demo se da un acceso, se restablece una clave o alguien cambia la suya, se recuerda la vigente: el selector la usa al entrar con esa persona (y pasa por "Cambiá tu clave temporal", como en producción). También refresca las personas del selector cuando se dan o quitan accesos. |
| Escenario "Un cliente pidió cambios" | `scenarios.js` | Quien mira comparte un entregable con un cliente que tiene acceso (los suyos primero) y esa cuenta lo devuelve con ajustes por `POST /api/client/deliverables/:id/decision`: llega el aviso push de la categoría «Portal de clientes». |

Datos sembrados (`seedClientPortal` en `server/demo-data.mjs`):

| Cuenta | Cliente | Aprueba entregables |
| --- | --- | --- |
| Dueño La Burrada · `laburrada@clientes.demo.jcanalytic.local` | La Burrada Street Food | Sí |
| Marketing La Burrada · `marketing.laburrada@clientes.demo.jcanalytic.local` | La Burrada Street Food | No (solo ve) |
| Gerencia Uniquex · `uniquex@clientes.demo.jcanalytic.local` | Uniquex Costa Rica | Sí |

Más: 4 etapas en "Pedidos en línea La Burrada" y en "Landing narrativa Uniquex", 3 documentos de La Burrada, el brief
"Giveaway Tacos" **enviado** por el cliente (queda por revisar), un brief del equipo
en producción y entregables por aprobar, aprobados y de Uniquex.

### Recorrido sugerido

1. **Equipo · Catalina (socia, lleva La Burrada).** En Inicio, «Requiere acción» trae
   "Brief por revisar" y la tarjeta **Portal de clientes** cuenta briefs por revisar,
   cambios pedidos y entregables esperando al cliente.
2. **Clientes → La Burrada Street Food → Portal del cliente.**
   - *Accesos*: «Dar acceso» crea una cuenta y muestra la **clave temporal una sola
     vez**, con el mensaje listo para copiar o enviar por WhatsApp. En cada persona:
     editar, «Aprueba entregables», «Nueva clave» y «Quitar acceso» / «Reactivar».
   - *Solicitudes*, *Entregables* y *Documentos* (agregar, editar o quitar enlaces por
     categoría y proyecto).
3. **Proyectos → Pedidos en línea La Burrada.** *Etapas*: agregar, iniciar, completar
   (el cliente recibe un aviso), reabrir, editar, eliminar y «Ordenar». *Entregables*:
   compartir, «Subir versión nueva», «Historial» y «Retirar» (solo si el cliente aún no
   decidió). *Briefs* del proyecto y «Nuevo brief». El formulario de «Registrar avance»
   avisa que el texto es visible para el cliente.
4. **Cambiar de persona → Dueño La Burrada (cliente).** Ve sus proyectos con etapas,
   el entregable por aprobar, sus solicitudes y documentos. Aprobá o pedí cambios.
5. **Volver como Catalina.** El aviso y la alerta de "pidió cambios" llevan al
   proyecto para subir la versión nueva. Con **Hillary** (colaboradora) la sección de
   accesos es de solo lectura: solo admin, socios o quien lleva la cuenta dan accesos.

## Reglas para quien toque `server/`

- Los módulos de rutas, `context.mjs`, `schema.mjs`, `router.mjs`, `http.mjs`,
  `demo-data.mjs` y `shared/` también corren en el navegador: nada de `Buffer`,
  `process`, archivos ni red. Si una ruta importa otro `node:*`, el build avisa y
  lo reemplaza por un módulo que falla al usarse; agregá un shim en `shims/`.
- Las rutas nuevas se registran solo en `server/routes/index.mjs`: la demo llama a
  `registerRoutes()` y las toma sola.
- Las descargas se responden con `res.writeHead()/res.end()`; la demo captura el
  texto, pero en el artefacto los enlaces de descarga muestran "Disponible en el
  portal publicado".
- La siembra (`seedDemoData`) pasa por la API real: si una validación nueva la
  rompe, la demo muestra el error en la pantalla de carga.

## Restricciones del artefacto

Sin `fetch`/XHR (CSP `connect-src 'none'`), sin `eval`, sin `window.confirm/alert`,
sin service workers y solo `#anclas` como enlaces. El build falla si queda algún
archivo sin incrustar o si pasa de 16 MB.
