# v6 · Configuración inicial del dueño y portal de inversionistas

> Contrato entre backend y frontend. Lo implementado en `server/` es la fuente de verdad.

## 1. Configuración inicial (primer ingreso)

**Objetivo:** con la base vacía, el dueño abre el portal, pone sus datos y su contraseña, y queda como **administrador**. Desde ese momento la pantalla deja de existir y solo se entra con usuario y contraseña.

**Seguridad:** el portal está en internet, así que la configuración pide un **código de un solo uso**. El código sale de una de estas fuentes:
- la variable `PORTAL_SETUP_CODE`, que se define en Railway;
- si la variable falta, el servidor lo genera una vez, lo guarda en `app_secrets` y lo muestra en el registro (log).

Así nadie más puede adueñarse del portal entre el despliegue y el primer ingreso.

**Cierre y límites:**
- Al crearse la primera persona, las rutas se cierran para siempre (`409 setup_done`) y el código se borra.
- Hay un freno por IP: 5 intentos fallidos cada 15 minutos.
- Si dos pestañas envían a la vez, la segunda recibe 409.

| Método y ruta | Acceso | Notas |
|---|---|---|
| `GET /api/setup` | public | `{ needed: bool, available: bool }`. `needed` = no hay nadie en la base. `available` = hay código configurado. |
| `POST /api/setup` | public | `{ code, name, email, password, phone? }` → `{ user }` + cookie de sesión (queda adentro). Errores: 400 `validation` (`code` / `email` / `password` / `name`), 409 `setup_done`, 429 `too_many_attempts`, 503 `setup_unavailable`. |

El código se acepta sin importar mayúsculas, espacios ni guiones.

La contraseña sigue la política de siempre: 10 o más caracteres, letras y números, y nada de contraseñas de diccionario.

**Interfaz:**
- Si no hay sesión y `GET /api/setup` devuelve `needed: true`, se muestra la pantalla **"Configurá tu portal"** en lugar del login. Pide código, nombre, correo, teléfono (opcional), contraseña y confirmación.
- Si `available` es false, se explica que falta `PORTAL_SETUP_CODE` y se remite al README.

## 2. Rol "inversionista"

**Qué es:** es una persona de `users` con `role = 'inversionista'`. La migración 6 reconstruye `users` para admitir el rol; conserva ids, sesiones y claves foráneas.

**Diferencia con los otros roles:**
- **Socio:** trabaja en la operación y administra **todas** las inversiones.
- **Inversionista:** solo pone capital y ve **lo suyo**.

**Quién lo da de alta:** el admin, en *Equipo y ajustes → Agregar persona → rol Inversionista*. Recibe una clave temporal y debe cambiarla al entrar.

**Acceso:**
- Rutas `investor` y `any`: `/api/me`, `/api/me/password` y `/api/auth/logout`.
- Cualquier otra ruta del equipo responde **403**.
- Las rutas `investor` responden 403 a cualquier otra persona.

**No es parte de la operación:**
- No se le asignan tareas, proyectos ni citas.
- No aparece en `/api/people`.
- No recibe el resumen "Mi día".

**Aprobación (actualizado):**
- Toda la plata la aprueba la administración (rol admin). El inversionista no confirma ni objeta nada.
- Lo que registra un admin a su nombre llega aprobado, con aviso ("Aporte registrado…", "Retorno registrado…").
- Los aportes que avisa él mismo quedan por aprobar hasta que un admin los revise; mientras tanto puede retirarlos.
- Si algo no coincide, lo escribe en el hilo del movimiento.

**Avisos:**
- Recibe los dirigidos a él: movimientos registrados a su nombre, aprobaciones, rechazos y mensajes.
- No recibe los generales de inversiones (nueva inversión, notas internas, cambios de estado).

**Del lado del equipo:**
- La cartera de `GET /api/investments` incluye inversionistas en `partners`.
- Al registrar un movimiento, `partner_id` puede ser un inversionista.
- El reparto pro-rata le asigna su parte.

## 3. API del inversionista (`/api/investor/*`, acceso `investor`)

| Método y ruta | Respuesta |
|---|---|
| `GET /api/investor/overview` | `{ me, portfolio, investments: Position[], to_confirm: Movement[], recent: Movement[], series, contacts: [{name, phone, email}], fx_usd_crc }` |
| `GET /api/investor/investments/:id` | `{ investment: Position, movements: Movement[], series }`. 404 si no participa. |
| `GET /api/investor/movements` | `{ movements, portfolio }`: estado de cuenta completo. |
| `POST /api/investor/movements/:id/confirm` | `{ message? }`. Solo movimientos a su nombre registrados por otro. |
| `POST /api/investor/movements/:id/object` | `{ message }` (obligatorio). |
| `POST /api/investor/movements/:id/messages` | `{ body }` → `{ messages }`. |
| `POST /api/investor/investments/:id/movements` | `{ amount (céntimos), date?, message, reference? }`: avisa un **aporte** propio (queda pendiente para un socio). Solo `type: 'aporte'`. |
| `POST /api/investor/movements/:id/annul` | `{ message }`: retira su propio aviso mientras siga pendiente. |
| `GET /api/investor/statement.csv` | Estado de cuenta para Excel (`;`, BOM UTF-8). |
| `PATCH /api/investor/me` | `{ name?, phone? }` |
| `GET /api/investor/notifications`, `POST /api/investor/notifications/read` | Igual que el buzón del equipo (`{ ids }` o `{ all: true }`). |

**Formas de los datos:**
- `portfolio` (en colones; cada movimiento en dólares usa su tipo de cambio guardado):

  `{ contributed_crc, returned_crc, net_crc, moic, irr, in_transit_crc, pending_count, to_confirm_count }`
- `Position`: `{ id, name, category, category_label, status, status_label, currency, description, project_name, target_amount, expected_return_pct, expected_date, updated_at, totals: { contributed, returned, holders, target_progress }, mine: { contributed, returned, net, moic, irr, share, pending_contributions, pending_returns, pending_count } }`. Los montos van en céntimos de la moneda de la inversión.
- `Movement`: `{ id, investment_id, investment_name, type, amount, currency, fx_rate, amount_crc, date, status, message, reference, created_by_name, resolved_by_name, messages: [{ kind, body, user_name, mine }], can_resolve, can_annul, awaiting }`.

**Privacidad:**
- `totals` solo trae agregados: cuántos participan (`holders`), nunca nombres ni montos de otros.
- Las notas internas de los socios no salen por esta API.

**Enlaces de avisos:**
- Llegan como `/inversiones/:id?mov=:m`.
- El portal del inversionista los traduce a `/inversionista/inversiones/:id`.

## 4. Frontend

**Login:** tres accesos, Equipo · Inversionistas · Clientes.
- Equipo e Inversionistas usan `POST /api/auth/login`.
- Una URL que empieza con `/inversionista` preselecciona Inversionistas.

**`App.jsx`:** si `user.role === 'inversionista'`, monta `src/investor/InvestorApp.jsx` (nunca el `Layout` del equipo). Primero va el cambio de clave temporal.

**Rutas:**

| Ruta | Pantalla |
|---|---|
| `/inversionista` | Mi inversión: resumen, por confirmar, inversiones, evolución y contacto |
| `/inversionista/inversiones/:id` | Detalle de una inversión con sus movimientos |
| `/inversionista/movimientos` | Estado de cuenta y descarga |
| `/inversionista/avisos` | Avisos |
| `/inversionista/cuenta` | Perfil y contraseña |

**Equipo:**
- *Equipo y ajustes* permite crear inversionistas y los muestra aparte.
- *Inversiones* los incluye en la cartera y en el selector de socio del movimiento.
- Los selectores de personas de la operación los excluyen.

**Demo:** incluye a la inversionista **Ángel Mora** (`angel@demo.jcanalytic.local`), con un aporte confirmado y otro por confirmar en BarberXCR.
