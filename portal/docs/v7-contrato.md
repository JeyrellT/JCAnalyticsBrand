# v7 · Enlaces de registro

> Contrato entre backend y frontend. Lo implementado en `server/routes/invites.mjs` es la fuente de verdad.

## Idea

El admin ya no tiene que escribir correos ni repartir claves temporales: comparte un **enlace** y cada persona se registra sola (nombre, correo, WhatsApp y **su propia contraseña**). Entra directo, sin cambio de clave obligatorio.

- **Personal** ("Agregar persona → Solo el nombre"): lleva el nombre de UNA persona, sirve una vez.
- **Abierto (grupo)**: un enlace con **cupo máximo** (1–200), p. ej. "Socios fundadores 2026".
- Para **todos los tipos**: administrador, socio, colaborador, inversionista y personas de un cliente.
- Vigencia: 24 h a 90 días. Un enlace de **administrador** es siempre personal, de un uso y ≤ 7 días.

## Datos (migración 7)

- `invites`: `token` (256 bits, base64url), `kind` (`team`|`client`), `role` o `client_id`, `can_approve`, `name` (personal), `label`, `message`, `max_uses`, `uses`, `expires_at`, `revoked_at`, `created_by`.
- `invite_uses`: quién se registró con cada enlace (`user_id` o `account_id`, nombre, correo, IP, fecha).

## API

| Método y ruta | Acceso | Notas |
|---|---|---|
| `GET /api/invites[?client_id=]` | user | Enlaces que la persona puede administrar, con `status` (`activo`/`agotado`/`vencido`/`revocado`), `remaining` y `registrations`. |
| `POST /api/invites` | user | `{ kind, role \| client_id, name?, max_uses?, days?, label?, message?, can_approve? }`. Equipo: solo admin. Cliente: admin, socios o quien lleva la cuenta. |
| `PATCH /api/invites/:id` | user | `{ days?, max_uses?, label?, message?, active? }`: renovar, ampliar cupo, desactivar/reactivar. |
| `DELETE /api/invites/:id` | user | Solo si nadie lo usó (si no, 409 `invite_used`: se desactiva). |
| `POST /api/invites/lookup` | public | `{ token }` → bienvenida sin token ni cupos. 404 `invite_not_found`, 410 `invite_unavailable` + `status`. |
| `POST /api/invites/accept` | public | `{ token, name, email, phone?, title?, password }` → crea la persona o el acceso del cliente y abre su sesión. Devuelve `home`. |

## Blindaje

- El token va en el cuerpo, nunca en la URL de la API. Tokens inválidos cuentan para el freno por IP del ingreso.
- Cupo, vigencia y estado se verifican de nuevo dentro de la transacción del alta: el último cupo nunca se reparte dos veces.
- Un correo identifica a una sola persona en todo el portal (equipo o cliente).
- El creador recibe un aviso (`kind: 'registro'`, categoría "Registros con enlace") por cada alta.

## Interfaz

- `/registro/:token`: pantalla pública (funciona con o sin sesión; si hay una abierta, lo explica).
- *Equipo → Agregar persona*: "Solo el nombre" (recomendado) o "Con su correo" (clave temporal, como antes).
- *Equipo → Enlaces de registro*: crear, compartir (copiar, WhatsApp, compartir del celular, **código QR** descargable), renovar, +5 cupos, desactivar, eliminar y ver quién se registró.
- *Equipo → Personas*: "Esperando registro" con las invitaciones personales pendientes.
- *Ficha del cliente → Portal del cliente → Enlaces de registro*: lo mismo para personas del cliente.
