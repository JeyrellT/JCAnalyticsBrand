# Conexión con Claude (MCP)

El portal expone un servidor **MCP** (Model Context Protocol) en `/mcp`. Con él, Claude (claude.ai, la app de escritorio o del celular y Claude Code) puede crear y consultar proyectos, clientes y tareas del portal desde una conversación. Por ejemplo: *"Creá un proyecto Power BI para Uniquex, en curso, de US$420, con entrega el 30 de noviembre, y armale 4 tareas."*

## Cómo conectarlo (2 minutos)

1. En el portal: **Equipo → Mi perfil → Conectar con Claude → Generar conexión**.
2. Copiá lo que te muestra (el token **se ve una sola vez**):
   - **claude.ai / escritorio / celular:** Configuración → Conectores → *Agregar conector personalizado*. Nombre `Portal JC`, URL `https://<dominio-del-portal>/mcp/jcp_…`. En Team/Enterprise lo agrega un owner de la organización.
   - **Claude Code:**
     ```sh
     claude mcp add --transport http jc-portal https://<dominio-del-portal>/mcp \
       --header "Authorization: Bearer jcp_…"
     ```
3. Probalo: *"¿Qué proyectos tengo en curso en el portal?"*

Sin acceso a la pantalla (por ejemplo, desde la consola de Railway):

```sh
npm run mcp:token -- --email ana@jcanalytic.com --name "Claude Code"
```

## Herramientas

| Herramienta | Qué hace | Ruta de la API que usa |
|---|---|---|
| `portal_contexto` | Personas, clientes y catálogos válidos (ids y valores). | `GET /api/people`, `GET /api/clients` |
| `listar_proyectos` | Lista con filtros por estado, texto y archivados. | `GET /api/projects` |
| `ver_proyecto` | Detalle con equipo, tareas, avances y etapas. | `GET /api/projects/:id` |
| `crear_proyecto` | Crea el proyecto y avisa al responsable y al equipo. | `POST /api/projects` |
| `actualizar_proyecto` | Cambia solo los campos enviados; archiva. | `PATCH /api/projects/:id` |
| `registrar_avance` | Registra el avance al cliente y reinicia el reloj de 72 h. | `POST /api/projects/:id/updates` |
| `crear_tarea` | Tarea en el tablero, ligada a un proyecto. | `POST /api/tasks` |
| `crear_cliente` | Cliente o prospecto en el directorio. | `POST /api/clients` |

Los montos viajan en unidades normales (`value: 420` = US$420) y el servidor los guarda en unidades menores, igual que el portal. Las fechas son `AAAA-MM-DD`.

## Seguridad y control

- **Mismos permisos que la persona.** Cada herramienta invoca una ruta existente de la API con `router.authorize`, los mismos validadores, la bitácora y los avisos. No hay SQL propio en `server/mcp.mjs` ni rutas fuera de la lista cerrada. Nada de inversiones, finanzas ni administración.
- **Trazabilidad.** En la bitácora y en los avisos la acción aparece como *"Ana (vía Claude) creó el proyecto…"*.
- **Tokens.** Prefijo `jcp_`, 256 bits aleatorios; en la base solo vive el hash SHA-256. Hasta 10 conexiones activas por persona; se revocan desde el perfil y el corte es inmediato. Desactivar a la persona también corta el acceso. Los inversionistas no pueden crear conexiones.
- **Token en la URL (claude.ai).** Los conectores personalizados de claude.ai no permiten encabezados propios, por eso el token va en la ruta. Tratá esa URL como una contraseña. El registro de peticiones la enmascara (`/mcp/…`). Si se filtra, revocala.
- **Límites.** 120 llamadas por minuto por token, cuerpo máximo de 256 KB. Si llega un `Origin`, debe ser el del portal o uno de `PORTAL_ALLOWED_ORIGINS` (protección contra DNS rebinding).
- **Contraseña temporal.** Con la contraseña temporal pendiente, las herramientas responden que primero hay que cambiarla.

## Protocolo

Transporte *Streamable HTTP* sin estado: `POST /mcp` con JSON-RPC 2.0 y respuesta JSON (sin SSE ni `Mcp-Session-Id`). `GET` responde 405, y los clientes oficiales lo interpretan como "sin canal de eventos". Versiones aceptadas: `2025-11-25`, `2025-06-18`, `2025-03-26` y `2024-11-05`. Métodos: `initialize`, `ping`, `tools/list`, `tools/call`, `resources/list` y `prompts/list` (vacíos). Las notificaciones reciben `202`.

Pruebas: `tests/mcp.test.mjs` (protocolo, autenticación, permisos, bitácora, validación y revocación).

## Siguientes pasos posibles

- OAuth 2.1 para conectar desde claude.ai sin token en la URL.
- Herramientas de agenda (`crear_cita`) y de etapas del portal de clientes.
- Plantillas de proyecto por servicio (tareas estándar por línea de negocio).
