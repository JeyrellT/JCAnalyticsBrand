# Portal simple del cliente: proyectos, actualizaciones y pagos

> Contrato entre backend y frontend. Lo implementado en `server/routes/client-billing.mjs`, `server/routes/client-portal.mjs` y `shared/client-portal.js` es la fuente de verdad.

## 1. Qué ve el cliente

El portal de clientes (`/cliente`) queda en **tres secciones**:

1. **Proyectos** (`/cliente`): saludo con el estado en una frase, "Requiere tu atención" (solo si hay algo), sus proyectos con el avance por etapas y los últimos avances. Al lado: su cuenta de pagos, sus actualizaciones abiertas y su ejecutivo.
2. **Actualizaciones** (`/cliente/actualizaciones`): pide un cambio o mejora; JC Analytics le pone el monto; el cliente lo acepta o lo rechaza.
3. **Pagos** (`/cliente/pagos`): por pagar, próximo cobro, pagado en el año, cómo pagar e historial.

Entregables, documentos y briefs siguen funcionando (avisos y enlaces), pero salen de la barra principal: están en el menú de la cuenta y en la ficha de cada proyecto **solo si existen**. La ficha de proyecto ya no muestra secciones vacías.

Globos de la barra: **Actualizaciones** = montos por aprobar; **Pagos** = pagos vencidos (en coral).

## 2. Actualizaciones (`client_requests`)

**Flujo:**

```
pendiente ──(socio/admin pone el monto)──▶ cotizada ──(cliente acepta)──▶ en_proceso ──▶ lista
   │                                          │
   ├─(cliente la retira)──▶ cancelada          └─(cliente o equipo la rechaza)──▶ rechazada
   └─(equipo la descarta con motivo)──▶ rechazada
```

- **Monto 0 = sin costo**: pasa directo a `en_proceso`, sin cobro.
- **Al aceptar** con monto > 0 nace **un** cobro `pendiente` en `client_payments` (vence ese día; índice único por `request_id`).
- El cliente acepta **el monto que vio**: si cambió, responde `409 stale_quote`.
- Solo cuentas con `can_approve` aceptan o rechazan (las demás ven el monto y piden a quien aprueba).
- El equipo puede **registrar** una actualización que llegó por WhatsApp (con o sin monto) y marcar **"Aceptó por WhatsApp"** (solo socios/admin: compromete un cobro).

**Permisos:** todo el equipo ve; **solo socios y admin ponen o cambian montos** (acceso `invest`). Cualquiera del equipo marca `lista` o descarta con motivo.

**Avisos:** el pedido del cliente avisa al responsable del proyecto, a quien lleva al cliente y a la administración (categoría "Portal de clientes", tipo `request`). Monto, aceptación, lista y descarte avisan al cliente en su portal (tipo `actualizacion`). El inicio del equipo muestra la alerta "pidió una actualización" mientras haya alguna sin monto.

## 3. Pagos (`client_payments`)

Un cobro nace de:

| Origen | `source` | Cuándo |
|---|---|---|
| Actualización aceptada | `actualizacion` | Al aceptar (vence ese día) |
| Cobro programado del proyecto (`project_charges`) | `programado` | Cada fecha del calendario que ya llegó, una sola vez (índice único `charge_id + due_date`) |
| Cobro manual del equipo | `manual` | Al crearlo; puede registrarse ya pagado |

**Sin deuda inventada:** cada cobro programado tiene `ledger_from` (el día en que se registró; los existentes al migrar, el día de la migración). Solo las fechas desde ahí generan pendientes. Lo anterior, si quedó debiendo, se agrega como cobro manual.

**Sincronización:** idempotente, al abrir la cuenta del cliente (equipo o cliente) y el inicio del equipo. Solo cuentan proyectos que cobran (en curso, en revisión, entregados o en soporte, sin archivar).

**Estados:** `pendiente → pagado` (fecha ≤ hoy y referencia SINPE opcional) o `pendiente → anulado` (motivo obligatorio). `pagado → pendiente` con **"Deshacer"** y motivo. Todo queda en la bitácora.

- **Editar el cobro programado** del proyecto recalcula lo pendiente con el calendario nuevo; lo pagado y lo anulado no cambia.
- **Borrar el cobro programado** quita lo que nunca se pagó; lo pagado queda como historial.
- La fecha de un pendiente programado no se edita (sale del calendario del proyecto).
- El cliente **nunca ve los anulados** ni campos internos (motivo de anulación, quién registró).
- Montos en CRC o USD; los totales se muestran **por moneda, sin convertir** ("₡65 000 + $150,00").

**"Cómo pagar":** ajuste `payment_info` (texto, máx. 600) que el admin edita en *Equipo → Ajustes*; el cliente lo ve en Pagos. "Avisar que pagué" abre WhatsApp con su ejecutivo con el cobro ya escrito.

El inicio del equipo (socios/admin) avisa cuando un cliente tiene pagos vencidos.

## 4. API del cliente (`/api/client/*`, acceso `client`)

| Método y ruta | Respuesta |
|---|---|
| `GET /api/client/requests` | `{ requests, can_approve, projects:[{id,name}] }` |
| `POST /api/client/requests` | `{title (3–120), detail?, project_id?}` → `{ request }` · 409 `too_many_requests` con 20 sin cotizar |
| `POST /api/client/requests/:id/decision` | `{decision: aceptar\|rechazar, note?, amount?, currency?}` → `{ request }` · 403 `approval_not_allowed` · 409 `already_decided` / `stale_quote` |
| `POST /api/client/requests/:id/cancel` | solo `pendiente` → `{ request }` |
| `GET /api/client/payments` | `{ payments, summary, upcoming, payment_info }` |
| `GET /api/client/counts` | `{ quotes, payments_pending, payments_overdue, approvals }` |

`GET /api/client/overview` agrega `requests` (abiertas), `payments` (= `summary`), `next_charge` y en `kpis`: `quotes_to_decide`, `open_requests`, `payments_pending`, `payments_overdue`. `GET /api/client/projects/:id` agrega `requests` del proyecto.

`summary` = `{ pending_count, pending:{CRC?,USD?}, overdue_count, overdue, paid_year, paid_year_count, year, next_due }`.

## 5. API del equipo

| Método y ruta | Acceso | Notas |
|---|---|---|
| `GET /api/clients/:id/requests` | user | `{ requests }` (incluye `quoted_by_name`) |
| `POST /api/clients/:id/requests` | user | `{title, detail?, project_id?, amount?, currency?}`; con monto exige socio/admin |
| `POST /api/client-requests/:id/quote` | invest | `{amount (≥ 0), currency, note?}`; desde `pendiente` o `cotizada` |
| `POST /api/client-requests/:id/status` | user | `{to: en_proceso\|lista\|rechazada, note}`; `en_proceso` (aceptó fuera del portal) exige socio/admin; `rechazada` exige nota |
| `GET /api/clients/:id/payments` | user | `{ payments, summary, upcoming, payment_info }` (incluye anulados) |
| `POST /api/clients/:id/payments` | invest | `{concept, amount, currency, due_date?, project_id?, note?, paid_date?, reference?}` |
| `PATCH /api/client-payments/:id` | invest | solo `pendiente`: `{concept?, amount?, currency?, due_date?, note?}` |
| `POST /api/client-payments/:id/pay` | invest | `{paid_date?, reference?, note?}` |
| `POST /api/client-payments/:id/void` | invest | `{reason (≥ 5)}` |
| `POST /api/client-payments/:id/reopen` | invest | `{reason (≥ 5)}` |

`GET /api/clients/:id` agrega en `portal`: `requests`, `billing` (la cuenta completa) y `can_bill`. `GET /api/dashboard` agrega `client_portal.requests_to_quote` y alertas `kind: 'request'` y (socios/admin) `kind: 'billing'` por pagos vencidos. `PATCH /api/settings` acepta `payment_info`.

## 6. Ficha del cliente (equipo)

"Portal del cliente" tiene seis pestañas: **Actualizaciones**, **Pagos**, Accesos, Entregables, Documentos y Briefs. Abre en Actualizaciones si el cliente ya tiene acceso (si no, en Accesos). `?portal=pagos` (o cualquier pestaña) abre esa pestaña, también desde alertas y avisos.

## 7. Verificación

```sh
npm test                                   # incluye tests/client-billing.test.mjs
npm run build && npm run e2e               # recorre cliente y equipo en escritorio y celular
```

Casos cubiertos: aislamiento entre clientes (404), quién pone montos (403), monto viejo (409), monto 0 sin cobro, aceptar por WhatsApp, cobros programados sin deuda vieja y una sola vez por fecha, editar/borrar el cobro programado, anular, deshacer, "Cómo pagar" y alertas del inicio.
