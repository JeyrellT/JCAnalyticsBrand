# v5 · Portal de clientes y brief creativo

> Contrato entre backend y frontend. Lo implementado en `server/` y `shared/` es la fuente de verdad; este documento resume formas y reglas.

## 1. Objetivo

1. **Brief creativo blindado.** Es el formato "CREATIVIDAD" de JC Analytics hecho módulo:
   - formulario guiado;
   - validación compartida;
   - versiones congeladas con huella SHA-256;
   - flujo de aprobación y bitácora;
   - vista imprimible A4 con el logo.
2. **Portal de clientes.** Cada cliente sigue el servicio en un portal donde se guarda y maneja el control de sus proyectos con JC Analytics, sin micro-gestión:
   - etapas, avances, entregables por aprobar, solicitudes (briefs), documentos y reuniones;
   - nunca tareas internas, montos, notas internas ni datos de otros clientes.
3. **Blindaje:**
   - identidad de cliente separada;
   - aislamiento por cliente;
   - límites, encabezados y auditoría.

## 2. Modelo de seguridad

**Dos identidades que no se mezclan:**
- El equipo usa la tabla `users`, la cookie `jcp_session` y las rutas `/api/*`.
- Los clientes usan la tabla `client_accounts`, la cookie `jcc_session` y solo las rutas `/api/client/*`.
- Cada ruta lee **solo** su cookie, y además `router.authorize` verifica el tipo de principal.
- Una cookie de cliente da 401 en cualquier ruta del equipo, y viceversa.

**Niveles de acceso nuevos:** `client_any` (incluye clave temporal) y `client`.

**Aislamiento por cliente:**
- Toda consulta del cliente filtra por `account.client_id`.
- Un id ajeno responde **404**, no 403, para no revelar que existe.
- Si un proyecto cambia de cliente, los joins lo ocultan al cliente anterior.

**Lo que el cliente ve:**
- Proyectos en estado `en_curso`, `en_revision`, `entregado`, `soporte`, `pausado` o `cerrado`. Los prospectos son pipeline interno.
- Citas que no son `interna`, sin `notes` ni contacto.
- Avances (`project_updates`). Son, por definición, comunicaciones al cliente, y el formulario interno lo advierte.

**Sesión del cliente:** expira tras 8 h sin uso y siempre a los 3 días.

**Cambios de acceso con efecto inmediato:**
- Clave temporal obligatoria al crear o restablecer una cuenta.
- Al cambiar la clave se cierran las demás sesiones.
- Quitar el acceso o cambiar el correo cierra todas las sesiones.

**Límites:**
- El login de clientes comparte el limitador del equipo (IP + correo).
- Freno por cuenta: 120 escrituras cada 10 min.
- Máximo 15 borradores abiertos por cliente.

**Un correo = una persona en todo el portal:** no se repite entre `users` y `client_accounts`.

**Enlaces:** solo `http(s)` en briefs, entregables y documentos. No se aceptan `javascript:`, `data:` ni `file:`.

**Bloqueo optimista:**
- Las escrituras del brief aceptan `if_updated_at`.
- Si no coincide responden `409 conflict`.
- Una decisión sobre un entregable acepta `version` y responde `409 stale_version` si no coincide.

**Encabezados nuevos:**
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Resource-Policy: same-origin`
- CSP con `object-src 'none'`, `worker-src 'self'` y `manifest-src 'self'`.
- Las cookies malformadas se ignoran: nunca producen un 500.

**Auditoría:**
- `brief_events` registra creado, enviado, estado, comentario y nota_interna.
- `deliverable_events` registra compartido, nueva_version, aprobado y cambios.
- `activity` lleva la bitácora general. Las acciones de clientes van con `user_id` NULL y el nombre de la cuenta en el resumen.

## 3. Brief (`shared/brief.js`)

**Campos:** `BRIEF_SECTIONS` sigue el orden del formato CREATIVIDAD.

| Sección | Campos |
|---|---|
| requerimiento | `brand`* · `materials`* (multi) · `materials_other` · `objective`* · `kpi_target` |
| oferta | `offer`* · `key_message`* (≥20) · `cta` · `tone` |
| canales | `social_accounts` (RRSS) · `database_segment` (Base de datos) · `links` (≤3 `{label,url}`) |
| produccion | `includes_creative` (Creatividad) · `editable_format` (Editable) · `send_setup` (Configuración de envío) · `test_email` (Correo de testeo) · `send_start`* · `send_end` |
| marca | `graphic_line` (Línea gráfica) · `brand_guide_url` · `is_contest` · `promo_rules_url` · `disclaimer` · `notes` (Nota) |
| confirmacion | `rights_confirmed`* |

\* obligatorio para **enviar**. Un borrador se guarda incompleto.

**Reglas cruzadas (`briefChecklist`):**
- Si se marca "otro" en materiales, `materials_other` es obligatorio.
- Si hay email y JC configura el envío, `test_email` es obligatorio.
- Los objetivos `conversion`, `trafico` y `leads` necesitan al menos un enlace.
- `send_end` debe ser igual o posterior a `send_start`.
- Un sorteo necesita `promo_rules_url` o un `disclaimer` de al menos 20 caracteres.
- `rights_confirmed` es obligatorio.

**Plazo mínimo (`leadTimeProblem`):**
- `send_start` debe ser igual o posterior a hoy + `brief_lead_days` (ajuste, 3 por defecto).
- El equipo puede marcar el brief urgente con motivo para saltarse el plazo.
- Una fecha pasada nunca se acepta.

**Funciones:**
- `normalizeBriefData`: descarta claves desconocidas, vacía campos que no aplican (`when`) y ordena `materials`.
- `briefCompleteness`: devuelve `{done,total,pct}` para la barra de avance.
- `briefFieldText(field, value)` da el texto para la vista y la impresión.

**Estados:**
- Flujo: `borrador → enviado → (observado ↔ enviado) → aprobado → en_produccion → entregado → cerrado`, más `cancelado`.
- El contenido se edita solo en `borrador` u `observado`. Al enviar se congela una versión `brief_versions(version, data, hash)`.
- La huella es `sha256(canonicalJson({code, version, title, data}))`.
- `GET …/versions/:n` devuelve `hash_ok` recalculado.

**Transiciones del equipo:** ver `BRIEF_TEAM_TRANSITIONS` y las etiquetas de `BRIEF_ACTIONS`.
- Pedir ajustes, cancelar y reabrir producción exigen nota (`transitionNeedsNote`).
- Aprobar fija `approved_version`.

**El cliente:**
- crea, edita (borrador/observado), envía y comenta;
- cancela solo en borrador, enviado u observado.

**Código:** `BRF-AAAA-NNNN`, correlativo por año.

## 4. API del equipo (acceso `user`)

**Briefs**

| Método y ruta | Cuerpo / respuesta |
|---|---|
| `GET /api/briefs?status&client_id&project_id` | `{ briefs: Brief[] (sin data), counts: {estado:n} }` |
| `POST /api/briefs` | `{client_id, project_id?, title, data?, owner_id?}` → `{ brief }` (data arranca con `brand` = nombre del cliente) |
| `GET /api/briefs/:id` | `{ brief, events (incluye nota_interna), versions, deliverables, lead_days }` |
| `PATCH /api/briefs/:id` | `{title?, data?, project_id?, owner_id?, urgent?, urgent_reason?, if_updated_at?}` → `{ brief }` |
| `POST /api/briefs/:id/submit` | `{if_updated_at?}` → `{ brief, version, hash }` · 400 `validation` con `problems[]` o `field:'send_start'` |
| `POST /api/briefs/:id/transition` | `{to, note?}` → `{ brief, events }` · 409 `invalid_transition` |
| `POST /api/briefs/:id/comments` | `{body, internal?}` → `{ events }` |
| `GET /api/briefs/:id/versions/:version` | `{ version: {code, version, title, data, hash, hash_ok, created_at, submitted_by_name, submitted_by_type}, brief }` |

`Brief` = `{ id, code, client_id, client_name, project_id, project_name, title, status, status_label, version, approved_version, owner_id, owner_name, urgent, urgent_reason (solo equipo), send_start, send_end, objective, materials, brand, submitted_at, approved_at, closed_at, created_at, updated_at, created_by:{type,name}, editable, completeness:{done,total,pct}, data? }`

`Event` = `{ id, actor_type: equipo|cliente|sistema, actor_name, kind, from_status, to_status, version, body, created_at }`

**Accesos, documentos, etapas y entregables**

| Método y ruta | Notas |
|---|---|
| `GET /api/clients/:id/accounts` | `{ accounts }` |
| `POST /api/clients/:id/accounts` | `{name, email, phone?, title?, can_approve?}` → `{ account, temporary_password }` — **solo admin, socios y quien lleva al cliente** (403 si no) |
| `PATCH /api/client-accounts/:id` | `{name?, email?, phone?, title?, can_approve?, active?}` |
| `POST /api/client-accounts/:id/reset-password` | `{ temporary_password }` |
| `GET/POST /api/clients/:id/documents` | `{title, url, category, project_id?, note?}` |
| `PATCH/DELETE /api/client-documents/:id` | |
| `GET/POST /api/projects/:id/milestones` | `{title, description?, due_date?, status?, position?}` → `{ milestones }` |
| `PATCH/DELETE /api/milestones/:id` | → `{ milestones }`. Completar una etapa avisa al cliente |
| `GET /api/deliverables?client_id&project_id&status` | `{ deliverables }` |
| `GET /api/deliverables/:id` | `{ deliverable, events }` |
| `POST /api/deliverables` | `{client_id, project_id?, brief_id?, title, description?, url?, note?}` |
| `PATCH /api/deliverables/:id` | `{title?, description?, url?, new_version?, note?}`. Cambiar `url` **siempre** crea una versión nueva y vuelve a `en_revision` |
| `DELETE /api/deliverables/:id` | 409 `deliverable_locked` si el cliente ya decidió alguna vez |

`Account` = `{ id, client_id, email, name, phone, title, can_approve, must_change_password, active, created_at, last_login_at }`

`Deliverable` = `{ id, client_id, client_name, project_id, project_name, brief_id, brief_code, brief_title, title, description, url, version, status: en_revision|aprobado|cambios, shared_by_name, shared_at, decided_by_name, decided_at, decision_note }`

**Ampliaciones de rutas existentes:**
- `GET /api/clients/:id` agrega `portal: { accounts, can_manage, briefs, deliverables, documents }`.
- `GET /api/projects/:id` agrega:
  - `milestones`
  - `deliverables`
  - `briefs`
  - `client_portal` (bool: el cliente tiene acceso activo y ve este proyecto)
- `GET /api/dashboard` agrega `client_portal: { briefs_to_review, changes_requested, waiting_client }` y alertas `kind: 'brief' | 'deliverable'`.
- `PATCH /api/settings` acepta `brief_lead_days` (1–30).
- Categoría de avisos nueva: `clientes` (kinds `brief` y `deliverable`).

## 5. API del cliente (`/api/client/*`)

| Método y ruta | Acceso | Respuesta |
|---|---|---|
| `POST /api/client/auth/login` | public | `{ account }` + cookie `jcc_session` |
| `POST /api/client/auth/logout` | client_any | |
| `GET /api/client/me` | client_any | `{ account (+client_name), client:{id,name}, contact:{name,phone,email}\|null, unread, lead_days, today }` |
| `PATCH /api/client/me` | client | `{name?, phone?}` |
| `POST /api/client/me/password` | client_any | `{current_password, new_password}` |
| `GET /api/client/overview` | client | `{ client, kpis:{active_projects,pending_approvals,open_briefs,upcoming_meetings}, projects: ClientProject[], approvals: Deliverable[], briefs: Brief[], meetings:{upcoming,recent}, updates, documents_count }` |
| `GET /api/client/projects` | client | `{ projects: ClientProject[] }` |
| `GET /api/client/projects/:id` | client | `{ project, milestones, updates, deliverables, documents, meetings, briefs }` |
| `GET /api/client/briefs` | client | `{ briefs }` |
| `POST /api/client/briefs` | client | `{title, project_id?, data?}` → `{ brief, events, versions, deliverables, lead_days }` |
| `GET /api/client/briefs/:id` | client | igual (eventos **sin** notas internas) |
| `PATCH /api/client/briefs/:id` | client | `{title?, data?, project_id?, if_updated_at?}` |
| `POST /api/client/briefs/:id/submit` | client | + `{ version, hash }` |
| `POST /api/client/briefs/:id/cancel` | client | `{note?}` |
| `POST /api/client/briefs/:id/comments` | client | `{body}` → `{ events }` |
| `GET /api/client/briefs/:id/versions/:version` | client | igual que el equipo |
| `GET /api/client/deliverables` | client | `{ deliverables, can_approve }` |
| `GET /api/client/deliverables/:id` | client | `{ deliverable, events, can_approve }` |
| `POST /api/client/deliverables/:id/decision` | client | `{decision: aprobado\|cambios, note (obligatoria en cambios), version}` |
| `GET /api/client/documents` | client | `{ documents }` |
| `GET /api/client/notifications` | client | `{ notifications, unread }` |
| `POST /api/client/notifications/read` | client | `{ids}` o `{all:true}` → `{ unread }` |

`ClientProject` = `{ id, name, service, service_label, status, status_label, start_date, due_date, delivered_at, support_ends, description, url, archived, last_update_at, owner:{name,phone,email}|null, team:[{name, role, role_label}], milestones_total, milestones_done, progress (0..1 o null sin etapas), next_milestone }`

**Enlaces de los avisos del cliente:**
- `/cliente`
- `/cliente/proyectos/:id`
- `/cliente/solicitudes/:id`
- `/cliente/entregables/:id`
- `/cliente/documentos`

## 6. Frontend: rutas y pantallas

**Sesión (`src/lib/session.jsx`, ya hecho):**
- Expone `kind: 'team' | 'client'`, `isClient`, `account`, `client`, `contact`, `leadDays`, `today`, `mustChangePassword`, `signedInClient()` y `logout()` (cierra la sesión que corresponda).
- La detección inicial prueba primero el cliente si la URL empieza con `/cliente`.
- `App.jsx` monta `src/client/ClientApp.jsx` cuando `isClient`.

**Equipo:**
- `/briefs` es la bandeja con estados, filtros y pestaña Entregables.
- `/briefs/nuevo` y `/briefs/:id` son el formulario, las acciones de estado, la bitácora con notas internas y las versiones con huella.
- `/briefs/:id/imprimir` es la vista A4.
- La ficha de cliente tiene una sección "Portal del cliente" (accesos, documentos, briefs y entregables).
- La ficha de proyecto tiene Etapas y Entregables.

**Cliente:**

| Ruta | Pantalla |
|---|---|
| `/cliente` | Inicio |
| `/cliente/proyectos` y `/cliente/proyectos/:id` | Proyectos |
| `/cliente/solicitudes`, `/cliente/solicitudes/nueva`, `/cliente/solicitudes/:id`, `/cliente/solicitudes/:id/imprimir` | Solicitudes (briefs) |
| `/cliente/entregables` y `/cliente/entregables/:id` | Entregables |
| `/cliente/documentos` | Documentos |
| `/cliente/avisos` | Avisos |
| `/cliente/cuenta` | Cuenta |

**Login:** selector "Equipo / Cliente". Con `/cliente` en la URL arranca en Cliente.

**Lenguaje con el cliente:**
- "Solicitud" en vez de "brief" en la navegación. El documento se sigue llamando "Brief creativo".
- Voseo costarricense, como el resto del portal.
