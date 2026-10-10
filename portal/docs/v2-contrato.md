# Contrato v2: clientes, servicios, personas y equipo por proyecto

Este documento es la fuente de verdad compartida entre backend y frontend para la v2.

Convenciones vigentes:
- Los montos van en **unidades menores enteras** (céntimos).
- Las fechas son `AAAA-MM-DD`; las fechas y horas, ISO UTC.
- Todo cuelga de `/api`, con sesión por cookie.
- Las escrituras llevan `X-Portal-Request: 1`.
- Los errores siguen el formato `{ error, field?, message? }`.

Los catálogos están en `shared/catalog.js`: `SERVICES`, `SERVICE_GROUPS`, `SERVICE_DEFAULTS`, `PROJECT_ROLES` y `CLIENT_STATUS`.

En las rutas, `:id` es numérico y `:key` es texto `[a-z0-9_]` (ver `server/router.mjs`).

## Esquema (migración 3, en `server/schema.mjs`)

```sql
CREATE TABLE clients (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, sector TEXT,
  status TEXT NOT NULL DEFAULT 'activo' CHECK (status IN ('prospecto','activo','inactivo')),
  contact_name TEXT, contact_phone TEXT, contact_email TEXT, notes TEXT,
  owner_id INTEGER REFERENCES users(id),          -- quién lleva la relación
  created_by INTEGER REFERENCES users(id), created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
ALTER TABLE projects ADD COLUMN client_id INTEGER REFERENCES clients(id);
ALTER TABLE appointments ADD COLUMN client_id INTEGER REFERENCES clients(id);
CREATE TABLE service_lines (
  key TEXT PRIMARY KEY,                           -- clave de SERVICES
  lead_id INTEGER REFERENCES users(id), price_from_usd INTEGER, unit TEXT,
  description TEXT, active INTEGER NOT NULL DEFAULT 1, updated_at TEXT
);
CREATE TABLE service_members (service_key TEXT NOT NULL REFERENCES service_lines(key) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id), PRIMARY KEY (service_key, user_id));
CREATE TABLE project_members (project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id), role TEXT NOT NULL DEFAULT 'equipo', PRIMARY KEY (project_id, user_id));
-- Relleno: un cliente por cada projects.client distinto (enlazando client_id);
-- el owner_id de cada proyecto entra como miembro con rol 'responsable'.
```

`migrate()` siembra las filas de `service_lines` que falten (`INSERT OR IGNORE`) a partir de `SERVICE_DEFAULTS`, igual que los ajustes por defecto. En la demo, una función aparte asigna líderes y equipos de ejemplo.

## Clientes (cualquier usuario autenticado)

- `GET /api/clients?status=` → `{ clients: [Client] }`
  - Cada `Client` trae `{ id, name, sector, status, contact_name, contact_phone, contact_email, notes, owner_id, owner_name, owner_color, created_at, updated_at }`.
  - Además trae campos calculados: `projects_active`, `projects_total`, `value_crc` (suma de `value_amount` de sus proyectos no cerrados, convertida a CRC con `fx_usd_crc` si son USD), `last_contact_at` (último avance de cualquiera de sus proyectos o la última cita pasada) y `next_appointment_at`.
  - Orden: primero `activo`, luego `prospecto`, luego `inactivo`; dentro de cada grupo, por `updated_at` descendente.
- `POST /api/clients` con `{ name*, sector, status, contact_name, contact_phone, contact_email, notes, owner_id }` → `{ client }`.
  - Valida `name` (2–120 caracteres) y `status` contra `CLIENT_STATUS`, `owner_id` como persona activa y `contact_email` como correo opcional.
  - Si el nombre ya existe (sin distinguir mayúsculas), responde 400 con `field: 'name'`.
  - Registra en bitácora: `entity: 'client'`.
- `GET /api/clients/:id` → `{ client, projects: [ProyectoDecorado], appointments: [Cita con attendees], updates: [últimos 20 project_updates de sus proyectos, con user_name] }`
- `PATCH /api/clients/:id` → actualización parcial, igual que POST. Si cambia `name`, también se actualiza `projects.client` de sus proyectos.
- No hay DELETE: para dar de baja se usa `status: 'inactivo'`.

## Servicios (líneas de negocio)

- `GET /api/services` → `{ services: [Service] }` en el orden de `SERVICES`.
  - Cada `Service` trae `{ key, name, group, group_label, lead_id, lead_name, lead_color, price_from_usd, unit, description, active, members: [{ id, name, color }] }`.
  - Además trae `projects_active` (en `en_curso`, `en_revision` o `soporte` y sin archivar), `projects_total`, `value_crc_active` y `open_tasks` (tareas no hechas de proyectos de ese servicio).
- `GET /api/services/:key` → `{ service, projects: [ProyectoDecorado de ese servicio, sin archivar], people: [{ id, name, color, role: 'lider'|'equipo'|'proyecto' }] }`
  - En `people` cuentan también quienes son miembros de proyectos de ese servicio.
- `PATCH /api/services/:key` (**solo admin**) con `{ lead_id, price_from_usd (entero ≥ 0 o null), unit (null|'mes'|'pieza'), description, active, members: [userIds] }` → `{ service }`.
  - `members` reemplaza el conjunto completo.
  - Cada cambio de líder o de miembros notifica a los afectados con `kind: 'service'` y `link: /servicios/:key`.

## Personas

- `GET /api/people` → `{ people: [Person] }`, solo personas activas.
  - Cada `Person` = `publicUser` + `{ services_lead: [keys], services_member: [keys], projects_active, open_tasks, overdue_tasks, week_appointments, load }`.
  - `load` es `'baja'`, `'media'` o `'alta'`. Se calcula con `score = open_tasks + 2*overdue_tasks + 2*projects_active`: baja si es < 6, media si es < 12 y alta en el resto.
- `GET /api/people/:id` → `{ person, services: [{ key, name, role: 'lider'|'equipo' }], projects: [{ id, name, client, status, kind, sla_state, hours_since_update, role }], tasks: [tareas abiertas asignadas, con project_name], appointments: [próximos 14 días donde participa], activity: [últimas 30 acciones suyas] }`
  - `activity` excluye las acciones `sensitive` si quien consulta no es socio ni admin.

## Proyectos (cambios)

- `POST /api/projects` y `PATCH /api/projects/:id` aceptan además:
  - `client_id`: debe existir; el servidor copia `clients.name` en `projects.client`. Si se envía `client` en texto sin `client_id`, se mantiene el comportamiento actual.
  - `members: [{ user_id, role }]` reemplaza el equipo completo. `role` se valida contra `PROJECT_ROLES` y las personas deben estar activas o ser ya miembros.
    - El `owner_id` siempre queda como miembro con rol `responsable`.
    - Quien se agrega recibe un aviso `kind: 'project'`.
- `GET /api/projects` y `GET /api/projects/:id` incluyen en cada proyecto `client_id`, `client` y `members: [{ id, name, color, role }]`. El detalle incluye además `client` como objeto, o `null`.

## Agenda (cambios)

- `POST` y `PATCH` de `/api/appointments` aceptan `client_id`.
  - Si viene sin `contact_name` o `contact_phone`, el servidor los completa con el contacto del cliente.
  - Las respuestas incluyen `client_id` y `client_name`.

## Demo en el navegador

`server/demo-data.mjs` (`seedDemoData`) siembra, por la API:
- clientes: La Burrada, Uniquex, Freight forwarder VIP y Ferretería El Roble como prospecto;
- líderes y equipos por servicio;
- miembros por proyecto.

La demo carga las mismas rutas con `registerRoutes()`; no hay que tocar nada más.
