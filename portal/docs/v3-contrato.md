# Contrato v3: app instalable (PWA), avisos push y automatizaciones

Este documento es la fuente de verdad compartida entre backend y frontend para la v3. Se mantienen las convenciones de v1/v2:
- montos en unidades menores;
- fechas `AAAA-MM-DD`;
- fechas con hora en ISO UTC;
- hora de negocio en **America/Costa_Rica (UTC−6, sin horario de verano)**;
- rutas bajo `/api`, con sesión por cookie y `X-Portal-Request: 1` en las escrituras.

**Regla de oro:** la lógica de negocio (rutas, automatizaciones, política de avisos) debe ser **compatible con el navegador**, porque también corre en la demo con sql.js:
- no puede usar `Buffer`, `process`, `fs` ni red directa;
- solo usa `db.prepare().get/all/run` y `db.exec`;
- el único import de Node permitido es `randomUUID` de `node:crypto`.

Lo que sí necesita Node (cifrado Web Push, `fetch` a servicios de push o a Hacienda, `setInterval`) se **inyecta**.

## Categorías de aviso

`notifications.kind` existente se asigna a una categoría que el usuario puede silenciar en el push:

| categoría (`kinds` en preferencias) | `kind` que incluye | etiqueta UI |
|---|---|---|
| `tareas` | `task`, `comment` | Tareas y comentarios |
| `agenda` | `appointment` | Citas y recordatorios |
| `proyectos` | `project`, `service` | Proyectos, clientes y servicios |
| `dinero` | `movement`, `investment`, `message` | Dinero de socios (solo socios/admin) |
| `resumen` | `digest` | Resumen "Mi día" |
| `automatizaciones` | `automation` | Alertas automáticas (72 h, soporte, tipo de cambio) |

Exportar desde `shared/catalog.js` como `NOTIFICATION_CATEGORIES` (lo agrega el agente de backend). Su forma es `{ [cat]: { label, hint, kinds: [...] } }`.

## Esquema (migración 4, en `server/schema.mjs`)

```sql
CREATE TABLE push_subscriptions (
  id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE, p256dh TEXT NOT NULL, auth TEXT NOT NULL,
  platform TEXT, user_agent TEXT, created_at TEXT NOT NULL,
  last_success_at TEXT, last_error TEXT, failures INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE notification_prefs (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  push_enabled INTEGER NOT NULL DEFAULT 1,
  categories TEXT NOT NULL DEFAULT '{}',          -- JSON { tareas: true, dinero: false, … }; falta = true
  quiet_start TEXT NOT NULL DEFAULT '21:00', quiet_end TEXT NOT NULL DEFAULT '07:00', -- 'HH:MM' hora CR
  digest_enabled INTEGER NOT NULL DEFAULT 1, digest_time TEXT NOT NULL DEFAULT '07:30',
  updated_at TEXT
);
CREATE TABLE automations (
  key TEXT PRIMARY KEY, enabled INTEGER NOT NULL DEFAULT 1, config TEXT NOT NULL DEFAULT '{}',
  last_run_at TEXT, last_result TEXT, runs INTEGER NOT NULL DEFAULT 0, updated_at TEXT
);
CREATE TABLE automation_log (
  id INTEGER PRIMARY KEY, automation_key TEXT NOT NULL, dedupe_key TEXT UNIQUE,
  summary TEXT NOT NULL, recipients INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
);
CREATE INDEX automation_log_created ON automation_log(created_at);
CREATE TABLE recurring_tasks (
  id INTEGER PRIMARY KEY, title TEXT NOT NULL, description TEXT,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL, assignee_id INTEGER REFERENCES users(id),
  priority TEXT NOT NULL DEFAULT 'media',
  frequency TEXT NOT NULL CHECK (frequency IN ('diaria','semanal','mensual')),
  weekday INTEGER,            -- 1=lunes … 7=domingo (semanal)
  monthday INTEGER,           -- 1…28 (mensual)
  due_in_days INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1, last_created_on TEXT,
  created_by INTEGER REFERENCES users(id), created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE app_secrets (key TEXT PRIMARY KEY, value TEXT NOT NULL);  -- nunca se expone por la API
```

## Push: arquitectura

- **`server/push.mjs`** (solo Node, NO se importa desde rutas) implementa `createPushService({ db, env, fetchImpl = fetch, now, logger })` y devuelve `{ publicKey, deliver(subscriptionRow, payloadObject) → Promise<{ ok, status, gone }> }`.
  - **Claves VAPID:**
    - se leen de `PORTAL_VAPID_PUBLIC_KEY` / `PORTAL_VAPID_PRIVATE_KEY` (base64url: el público sin comprimir, 65 bytes; el privado como escalar `d`, 32 bytes);
    - si no existen, se generan una vez y se guardan en `app_secrets`;
    - el asunto (`sub`) sale de `PORTAL_VAPID_SUBJECT` o, por defecto, es `mailto:gerencia@jcanalytic.com`.
  - **Envío:** RFC 8030. La cabecera es `Authorization: vapid t=<JWT ES256>, k=<publicKey>`, con `TTL` (24 h) y `Urgency` (`high` para dinero y citas, `normal` para lo demás).
  - **Cifrado:** el payload va cifrado **aes128gcm** según RFC 8291 + RFC 8188, implementado con `node:crypto` (ECDH P-256, `hkdfSync`, `aes-128-gcm`). Se valida en pruebas con `http_ece` (devDependency).
  - **Errores:** con 404 o 410, `gone: true` y se borra la suscripción. Otro error suma `failures`; a las 10 fallas seguidas, se borra.
  - **Seguridad (SSRF):** solo se aceptan suscripciones cuyo `endpoint` sea `https:` y su host termine en uno de estos:
    - `fcm.googleapis.com` / `android.googleapis.com`
    - `push.services.mozilla.com`
    - `push.apple.com`
    - `notify.windows.com`
- **`server/notify-policy.mjs`** (compatible con navegador) implementa `installPushDispatch(ctx)`, que registra `ctx.setPushHook(fn)`. Por cada aviso creado por `ctx.notify`:
  1. Busca categoría y preferencias de cada destinatario. Si no hay fila en `notification_prefs`, aplica los valores por defecto.
  2. Descarta el push si `push_enabled = 0`, si la categoría está apagada o si la persona no puede ver dinero y la categoría es `dinero`.
  3. En **horario tranquilo**, por defecto de 21:00 a 07:00 CR, no envía push salvo la categoría `dinero` con aviso de confirmación (`kind: 'movement'`). El aviso queda en el buzón igual.
  4. Si corresponde enviar, llama `ctx.push.deliver(sub, payload)` para cada suscripción de la persona, sin bloquear la respuesta HTTP (fire-and-forget, con captura de errores).
  - **Payload** (JSON, ≤ 3 KB): `{ title, body, url: link || '/buzon', tag: kind + ':' + (link || id), category, badge: <avisos sin leer de esa persona>, ts }`
- **`ctx.push`** puede ser `null` (sin push, por ejemplo en pruebas viejas) o, en la demo, un **simulador** con la misma forma `{ publicKey: 'demo', deliver }`, que muestra un aviso falso tipo teléfono dentro de la página.
- **Registro:** `routes/index.mjs` llama a `installPushDispatch(ctx)` y registra las rutas nuevas, así servidor y demo quedan iguales.

## Endpoints nuevos

| Método y ruta | Acceso | Descripción |
|---|---|---|
| `GET /api/push/config` | user | `{ available: !!ctx.push, publicKey, devices: [{ id, platform, user_agent, created_at, last_success_at }], prefs }` |
| `POST /api/push/subscribe` | user | `{ subscription: { endpoint, keys: { p256dh, auth } }, platform }` → `{ device }`. Hace upsert por `endpoint` (lo reasigna a la persona actual). Valida endpoint con la lista permitida, `p256dh` (base64url, 65 bytes) y `auth` (16 bytes). |
| `POST /api/push/unsubscribe` | user | `{ endpoint }` → borra solo si es de la persona actual. |
| `DELETE /api/push/devices/:id` | user | Borra un dispositivo propio. |
| `POST /api/push/test` | user | Envía un push de prueba a los dispositivos propios → `{ sent, failed, devices }`. Si `ctx.push` es null, responde 409 `push_unavailable`. |
| `GET /api/me/notification-prefs` | any | `{ prefs }` |
| `PATCH /api/me/notification-prefs` | user | `{ push_enabled, categories: { cat: bool }, quiet_start, quiet_end, digest_enabled, digest_time }`. Valida `HH:MM`. |
| `GET /api/automations` | user | `{ automations: [Automation], log: [últimas 50 entradas de automation_log], recurring: [RecurringTask] }` |
| `PATCH /api/automations/:key` | admin | `{ enabled, config }`. Valida `config` según cada automatización. |
| `POST /api/automations/:key/run` | admin | Ejecuta ya (`force`, ignorando la hora pero sin duplicar avisos ya enviados) → `{ result: { summary, recipients } }` |
| `GET /api/recurring-tasks` | user | Lista |
| `POST /api/recurring-tasks` | user | `{ title*, description, project_id, assignee_id, priority, frequency*, weekday, monthday, due_in_days, active }` |
| `PATCH /api/recurring-tasks/:id` | creador o admin | |
| `DELETE /api/recurring-tasks/:id` | creador o admin | |

Cada `Automation` trae `{ key, name, description, schedule, category, enabled, config, config_schema: [{ key, label, type: 'time'|'number', min, max }], last_run_at, last_result, runs, next_run_hint }`. Los campos `schedule` y `next_run_hint` son texto para mostrar.

Cada `RecurringTask` trae la fila, más `assignee_name`, `project_name` y `summary` (texto humano, por ejemplo "Cada lunes · tarea para Hillary · vence el mismo día").

Además, `GET /api/me` agrega `push_available: !!ctx.push`.

## Automatizaciones (`server/automations.mjs`, compatible con navegador)

`createAutomationEngine(ctx)` devuelve `{ list(), run(key, { force }), runDue() }`. `runDue()` se llama cada minuto: en el servidor con `setInterval` en `index.mjs`; en la demo, con su propio intervalo. La deduplicación usa `automation_log.dedupe_key` (UNIQUE): `INSERT OR IGNORE` y, si no insertó, no se avisa de nuevo.

Las 9 automatizaciones incluidas, con la clave en snake_case:

1. **`resumen_diario`**: resumen de "Mi día" a la `digest_time` de cada persona (por defecto 07:30), con `kind: 'digest'`.
   - Contenido: "Hoy: N citas · M tareas (K vencidas) · P por confirmar". Las confirmaciones pendientes solo aparecen si la persona es socia.
   - No se envía si todo está en 0.
   - Deduplicación: `digest:<fecha>:<userId>`.
2. **`recordatorio_citas`**: `config.minutes_before` (por defecto 60; rango 10–240) antes de cada cita no cancelada, a los participantes (`kind: 'appointment'`).
   - Deduplicación: `appt:<id>:<starts_at>`.
3. **`cita_sin_confirmar`**: citas de cliente (`kind ≠ 'interna'`) en estado `programada` que empiezan en menos de 24 h. Se avisa al creador y a los participantes con "Confirmá con <cliente/contacto>" y enlace a la cita.
   - Deduplicación: `appt-confirm:<id>:<starts_at>`.
4. **`avance_72h`**: proyectos de cliente en SLA.
   - Al pasar 2/3 del plazo (`warn`), avisa al responsable.
   - Al vencer (`late`), avisa al responsable y a los admins (`kind: 'automation'`).
   - Deduplicación por ciclo: `sla-warn:<projectId>:<referencia>` y `sla-late:<projectId>:<referencia>`. La referencia es `last_update_at` o `sla_started_at`, el que aplique.
5. **`tareas_vencen`**: a las `config.time` (por defecto 08:00), las tareas que vencen hoy, al asignado (`kind: 'task'`).
   - Deduplicación: `due:<taskId>:<fecha>`.
6. **`dinero_pendiente`**: a las `config.time` (por defecto 09:00), los movimientos `pendiente` con más de 24 h, a quienes deben confirmarlos (misma regla que `pendingForUser`), con `kind: 'movement'`.
   - Deduplicación: `money:<movementId>:<fecha>`.
7. **`fin_soporte`**: 7 días antes de que termine el soporte de 30 días, avisa al responsable (`kind: 'automation'`).
   - Deduplicación: `support:<projectId>:<fecha de fin>`.
8. **`tareas_recurrentes`**: a las `config.time` (por defecto 06:00), crea las tareas de las reglas activas que tocan hoy, con `status: 'por_hacer'` y `due_date = hoy + due_in_days`.
   - Las crea con el mismo flujo de inserción del tablero y avisa al asignado.
   - Actualiza `last_created_on` en la regla.
   - Deduplicación: `recurring:<ruleId>:<fecha>`.
9. **`tipo_cambio`**: a las `config.time` (por defecto 08:15), consulta el tipo de cambio del dólar (venta) en Hacienda CR con `ctx.fetchExchangeRate()`, que se inyecta (en Node: `fetch(PORTAL_FX_URL || 'https://api.hacienda.go.cr/indicadores/tc/dolar')`).
   - El lector es tolerante: acepta `{ venta: { valor } }`, `{ dolar: { venta: { valor } } }` o un número.
   - Solo acepta valores entre 300 y 1500.
   - Si cambia `fx_usd_crc`, lo actualiza, lo registra en la bitácora y avisa a los admins (`kind: 'automation'`).
   - Si falla, deja el valor anterior y registra el error en `last_result`.
   - Deduplicación: `fx:<fecha>`.

Cada ejecución actualiza `automations.last_run_at`, `last_result` y `runs`, y escribe una línea en `automation_log`. Solo ejecuta las automatizaciones `enabled`.

## Frontend

- **PWA:**
  - `public/manifest.webmanifest`:
    - `name` "Portal JC Analytics", `short_name` "JC Portal";
    - `display` `standalone`, `start_url` `/?source=pwa`, `scope` `/`;
    - `theme_color` `#071a36`, `background_color` `#f5f8fb`;
    - íconos 192/512 y maskable 512;
    - `shortcuts`: Nueva tarea `/tablero?nueva=1`, Agendar cita `/agenda?nueva=1`, Buzón `/buzon`.
  - `public/sw.js`: caché del armazón y de `/assets/*`; red primero para navegación, con respaldo `index.html` sin conexión; eventos `push`, `notificationclick` y `pushsubscriptionchange`; `setAppBadge`.
  - Etiquetas en `index.html`: `apple-mobile-web-app-*`, `apple-touch-icon` y `theme-color`.
- **`src/lib/pwa.js`:**
  - registra el SW (no en la demo ni en desarrollo);
  - captura `beforeinstallprompt`;
  - expone `isStandalone`, `isIOS` y `subscribePush` / `unsubscribePush`;
  - actualiza el globo del ícono con el conteo de avisos sin leer.
- **`/notificaciones` ("Avisos y app"):**
  - instalación: botón en Android y pasos en iPhone;
  - avisos en este dispositivo (permiso, suscripción y prueba);
  - categorías, horario tranquilo y resumen diario;
  - mis dispositivos.
- **`/automatizaciones`:**
  - centro de automatizaciones: tarjetas con interruptor y "Probar ahora", ambos solo para admin;
  - historial "Lo que hizo el portal";
  - tareas recurrentes.
