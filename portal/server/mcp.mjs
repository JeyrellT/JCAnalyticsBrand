// ============================================================================
//  server/mcp.mjs
//  Conexión con Claude: servidor MCP (Model Context Protocol) en /mcp, dentro
//  del mismo proceso del portal. Ver docs/mcp-claude.md.
//
//  Transporte: "Streamable HTTP" sin estado (POST con JSON-RPC 2.0, respuesta
//  JSON). No abre SSE ni guarda sesiones: cada petición se autentica sola.
//
//  Autenticación: token personal (tabla mcp_tokens, solo el hash) por
//    · encabezado  Authorization: Bearer jcp_…   (Claude Code, Claude Desktop)
//    · o en la ruta /mcp/jcp_…                   (conector personalizado de claude.ai)
//  El token actúa con la identidad y los permisos de su dueño.
//
//  Seguridad: cada herramienta llama a una ruta de la API YA EXISTENTE (lista
//  cerrada abajo) pasando por router.authorize y por los mismos validadores,
//  bitácora y avisos que usa el portal. Nada de SQL propio aquí. En la
//  bitácora y los avisos la persona aparece como "Nombre (vía Claude)".
// ============================================================================

import {
  PROJECT_KINDS, PROJECT_STATUS, PROJECT_ROLES, SERVICES, UPDATE_CHANNELS, TASK_STATUS, TASK_PRIORITY, CLIENT_STATUS,
} from '../shared/catalog.js';
import { HttpError } from './http.mjs';
import { hashToken } from './auth.mjs';
import { MCP_TOKEN_PREFIX } from './routes/mcp-tokens.mjs';

const PROTOCOL_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];
const SERVER_INFO = { name: 'jc-analytics-portal', title: 'Portal JC Analytics', version: '1.0.0' };
const MAX_BODY = 256 * 1024;
const RATE_LIMIT = 120; // llamadas por minuto y token
const TOUCH_MS = 5 * 60_000; // last_used_at se escribe a lo sumo cada 5 min

const INSTRUCTIONS = [
  'Portal privado de proyectos de JC Analytics (Costa Rica).',
  'Antes de crear o editar, llamá a portal_contexto para obtener los id de personas y clientes y los valores válidos de cada catálogo.',
  'Fechas en formato AAAA-MM-DD (hora de Costa Rica). Montos en unidades normales (570 = US$570; 250000 = ₡250 000), moneda CRC o USD.',
  'Mostrá al usuario un resumen de lo que vas a crear y pedí confirmación antes de escribir. Cada acción queda en la bitácora a nombre del usuario "(vía Claude)".',
].join(' ');

// ── Esquemas reutilizables ──────────────────────────────────────────────────
const enumOf = (catalog) => ({ type: 'string', enum: Object.keys(catalog) });
const DATE = { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', description: 'AAAA-MM-DD' };
const ID = { type: 'integer', minimum: 1 };

const PROJECT_FIELDS = {
  name: { type: 'string', minLength: 2, maxLength: 120, description: 'Nombre del proyecto.' },
  kind: { ...enumOf(PROJECT_KINDS), description: 'cliente (para un cliente), producto (propio) o interno.' },
  status: { ...enumOf(PROJECT_STATUS), description: 'Estado. en_curso arranca el reloj del avance de 72 h.' },
  service: { ...enumOf(SERVICES), description: 'Línea de servicio del catálogo.' },
  client_id: { ...ID, description: 'Cliente del directorio (ver portal_contexto). Recomendado para proyectos de cliente.' },
  client: { type: 'string', maxLength: 120, description: 'Nombre del cliente en texto libre, solo si no está en el directorio.' },
  owner_id: { ...ID, description: 'Responsable (persona del equipo). Por defecto, quien conecta a Claude.' },
  start_date: DATE,
  due_date: DATE,
  value: { type: 'number', minimum: 0, description: 'Valor del proyecto en unidades normales de la moneda.' },
  currency: { type: 'string', enum: ['CRC', 'USD'] },
  description: { type: 'string', maxLength: 4000, description: 'Alcance, entregables y notas.' },
  contact_name: { type: 'string', maxLength: 120 },
  contact_phone: { type: 'string', maxLength: 30 },
  url: { type: 'string', maxLength: 500, description: 'Enlace https:// (repositorio, carpeta, sitio).' },
  members: {
    type: 'array',
    maxItems: 30,
    description: 'Equipo completo del proyecto (reemplaza el actual). El responsable se agrega solo.',
    items: { type: 'object', properties: { user_id: ID, role: enumOf(PROJECT_ROLES) }, required: ['user_id'] },
  },
};

const PROJECT_FIELD_KEYS = Object.keys(PROJECT_FIELDS);

/** Copia solo los campos presentes y convierte el valor a unidades menores (como el portal). */
function projectBody(args) {
  const body = {};
  for (const key of PROJECT_FIELD_KEYS) if (args[key] !== undefined) body[key] = args[key];
  if (body.value !== undefined) {
    body.value_amount = typeof body.value === 'number' && Number.isFinite(body.value) ? Math.round(body.value * 100) : body.value;
    delete body.value;
  }
  return body;
}

const label = (catalog, key) => (catalog[key] && typeof catalog[key] === 'object' ? catalog[key].label : catalog[key]) ?? key;
const fromMinor = (amount) => (amount == null ? null : amount / 100);

function compactProject(p, origin) {
  return {
    id: p.id,
    name: p.name,
    kind: p.kind,
    status: p.status,
    status_label: label(PROJECT_STATUS, p.status),
    service: p.service,
    client: p.client,
    client_id: p.client_id,
    owner: p.owner_name ?? null,
    owner_id: p.owner_id,
    start_date: p.start_date,
    due_date: p.due_date,
    delivered_at: p.delivered_at,
    value: fromMinor(p.value_amount),
    currency: p.currency,
    description: p.description,
    url: p.url,
    progress: Math.round((p.progress ?? 0) * 100),
    tasks: { total: p.tasks_total, done: p.tasks_done, overdue: p.tasks_overdue },
    sla_state: p.sla_state,
    hours_since_update: p.hours_since_update,
    members: (p.members ?? []).map((m) => ({ id: m.id, name: m.name, role: m.role })),
    archived: !!p.archived,
    link: `${origin}/proyectos/${p.id}`,
  };
}

const compactTask = (t) => ({
  id: t.id, title: t.title, status: t.status, priority: t.priority, assignee: t.assignee_name ?? null, due_date: t.due_date, project_id: t.project_id,
});

// ── Herramientas ────────────────────────────────────────────────────────────
// Cada una: { description, inputSchema, annotations, run(call, args, origin) }.
// call(method, path, { body, query }) invoca la ruta de la API como el dueño del token.
const TOOLS = {
  portal_contexto: {
    title: 'Contexto del portal',
    description: 'Personas del equipo, clientes y catálogos válidos (tipos, estados, servicios, roles, prioridades). Llamar primero.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false },
    async run(call, _args, _origin, user) {
      const [{ people }, { clients }] = await Promise.all([call('GET', '/api/people'), call('GET', '/api/clients')]);
      const list = (catalog) => Object.fromEntries(Object.keys(catalog).map((k) => [k, label(catalog, k)]));
      return {
        you: { id: user.id, name: user.realName, role: user.role },
        people: people.map((p) => ({ id: p.id, name: p.name, role: p.role })),
        clients: clients.map((c) => ({ id: c.id, name: c.name, status: c.status })),
        catalogs: {
          project_kinds: list(PROJECT_KINDS), project_status: list(PROJECT_STATUS), services: list(SERVICES),
          project_roles: list(PROJECT_ROLES), update_channels: list(UPDATE_CHANNELS), task_status: list(TASK_STATUS),
          task_priority: list(TASK_PRIORITY), client_status: list(CLIENT_STATUS),
        },
      };
    },
  },

  listar_proyectos: {
    title: 'Listar proyectos',
    description: 'Lista los proyectos con estado, responsable, avance y semáforo de 72 h. Filtros opcionales.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { ...enumOf(PROJECT_STATUS), description: 'Solo este estado.' },
        search: { type: 'string', maxLength: 80, description: 'Texto a buscar en nombre o cliente.' },
        archived: { type: 'boolean', description: 'true para ver los archivados.' },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    async run(call, args, origin) {
      const { projects } = await call('GET', '/api/projects', { query: args.archived ? { archived: '1' } : {} });
      const needle = String(args.search ?? '').trim().toLowerCase();
      const rows = projects
        .filter((p) => !args.status || p.status === args.status)
        .filter((p) => !needle || `${p.name} ${p.client ?? ''}`.toLowerCase().includes(needle));
      return { count: rows.length, projects: rows.map((p) => compactProject(p, origin)) };
    },
  },

  ver_proyecto: {
    title: 'Ver proyecto',
    description: 'Detalle de un proyecto: datos, equipo, tareas, últimos avances y etapas.',
    inputSchema: { type: 'object', properties: { id: ID }, required: ['id'], additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false },
    async run(call, args, origin) {
      const d = await call('GET', `/api/projects/${args.id}`);
      return {
        project: compactProject(d.project, origin),
        tasks: d.tasks.map(compactTask),
        updates: d.updates.slice(0, 10).map((u) => ({ at: u.created_at, by: u.user_name, channel: u.channel, note: u.note })),
        milestones: (d.milestones ?? []).map((m) => ({ id: m.id, title: m.title, status: m.status, due_date: m.due_date })),
      };
    },
  },

  crear_proyecto: {
    title: 'Crear proyecto',
    description: 'Crea un proyecto en el portal. Requiere name, kind y status; lo demás es opcional. Avisa al responsable y al equipo.',
    inputSchema: { type: 'object', properties: PROJECT_FIELDS, required: ['name', 'kind', 'status'], additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    async run(call, args, origin) {
      const { project } = await call('POST', '/api/projects', { body: projectBody(args) });
      return { created: true, project: compactProject(project, origin) };
    },
  },

  actualizar_proyecto: {
    title: 'Actualizar proyecto',
    description: 'Cambia campos de un proyecto existente (solo los que se envían). Para archivar usar archived: true.',
    inputSchema: {
      type: 'object',
      properties: { id: ID, ...PROJECT_FIELDS, archived: { type: 'boolean' } },
      required: ['id'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    async run(call, args, origin) {
      const body = projectBody(args);
      if (args.archived !== undefined) body.archived = args.archived;
      const { project } = await call('PATCH', `/api/projects/${args.id}`, { body });
      return { updated: true, project: compactProject(project, origin) };
    },
  },

  registrar_avance: {
    title: 'Registrar avance al cliente',
    description: 'Deja constancia de un avance comunicado al cliente y reinicia el reloj de 72 h. Si el cliente tiene portal, lo ve ahí.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: ID,
        channel: { ...enumOf(UPDATE_CHANNELS), description: 'Por dónde se comunicó.' },
        note: { type: 'string', minLength: 3, maxLength: 2000, description: 'Qué se le informó al cliente.' },
      },
      required: ['project_id', 'channel', 'note'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async run(call, args, origin) {
      const { project } = await call('POST', `/api/projects/${args.project_id}/updates`, { body: { channel: args.channel, note: args.note } });
      return { registered: true, project: compactProject(project, origin) };
    },
  },

  crear_tarea: {
    title: 'Crear tarea',
    description: 'Crea una tarea en el tablero, opcionalmente ligada a un proyecto y asignada a una persona.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', minLength: 2, maxLength: 200 },
        project_id: ID,
        description: { type: 'string', maxLength: 4000 },
        status: { ...enumOf(TASK_STATUS), description: 'Columna del tablero. Por defecto por_hacer.' },
        priority: { ...enumOf(TASK_PRIORITY), description: 'Por defecto media.' },
        assignee_id: ID,
        due_date: DATE,
      },
      required: ['title'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    async run(call, args) {
      const { task } = await call('POST', '/api/tasks', { body: args });
      return { created: true, task: compactTask(task) };
    },
  },

  crear_cliente: {
    title: 'Crear cliente',
    description: 'Registra un cliente o prospecto en el directorio (nombre único). Devuelve su id para usarlo en crear_proyecto.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 2, maxLength: 120 },
        status: enumOf(CLIENT_STATUS),
        sector: { type: 'string', maxLength: 80 },
        contact_name: { type: 'string', maxLength: 120 },
        contact_phone: { type: 'string', maxLength: 30 },
        contact_email: { type: 'string', maxLength: 160 },
        notes: { type: 'string', maxLength: 4000 },
        owner_id: ID,
      },
      required: ['name'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    async run(call, args, origin) {
      const { client } = await call('POST', '/api/clients', { body: args });
      return { created: true, client: { id: client.id, name: client.name, status: client.status, link: `${origin}/clientes/${client.id}` } };
    },
  },
};

export const MCP_TOOL_NAMES = Object.keys(TOOLS);

const toolList = () => Object.entries(TOOLS).map(([name, t]) => ({
  name, title: t.title, description: t.description, inputSchema: t.inputSchema, annotations: t.annotations,
}));

/** Texto legible de un error de la API para que Claude lo corrija o se lo explique al usuario. */
function apiErrorText(error) {
  const { code, extra = {} } = error;
  if (code === 'validation') return `Dato inválido en "${extra.field}": ${extra.message}`;
  if (code === 'not_found') return 'No existe ese registro.';
  if (code === 'forbidden') return 'Tu usuario no tiene permiso para esta acción.';
  if (code === 'password_change_required') return 'Tu usuario tiene una contraseña temporal: entrá al portal y cambiala antes de usar Claude.';
  return extra.message ?? `Error ${error.status}: ${code}`;
}

// ── Servidor ────────────────────────────────────────────────────────────────

/**
 * @param {object} o
 * @param {object} o.ctx     contexto del portal (db, reloj, bitácora)
 * @param {object} o.router  router con las rutas ya registradas
 * @param {(req) => boolean} o.isSecure
 * @param {(req) => boolean} o.originAllowed
 */
export function createMcpHandler({ ctx, router, isSecure, originAllowed, logger = console }) {
  const { db } = ctx;
  const buckets = new Map();

  function rateLimited(tokenId) {
    const t = ctx.now();
    const b = buckets.get(tokenId);
    if (!b || t - b.start >= 60_000) {
      buckets.set(tokenId, { start: t, count: 1 });
      return false;
    }
    b.count += 1;
    return b.count > RATE_LIMIT;
  }

  /** Dueño activo del token (o null). */
  function principal(token) {
    if (!token || !token.startsWith(MCP_TOKEN_PREFIX) || token.length > 120) return null;
    const row = db.prepare(`SELECT t.id token_id, t.last_used_at, u.* FROM mcp_tokens t JOIN users u ON u.id = t.user_id
      WHERE t.token_hash = ? AND t.revoked_at IS NULL`).get(hashToken(token));
    if (!row || !row.active) return null;
    const last = row.last_used_at ? new Date(row.last_used_at).getTime() : 0;
    if (ctx.now() - last > TOUCH_MS) db.prepare('UPDATE mcp_tokens SET last_used_at = ? WHERE id = ?').run(ctx.nowIso(), row.token_id);
    return row;
  }

  const send = (res, status, body, headers = {}) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
    res.end(body === undefined ? undefined : JSON.stringify(body));
  };

  async function readBody(req) {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > MAX_BODY) return { error: 'too_large' };
      chunks.push(chunk);
    }
    try { return { value: JSON.parse(Buffer.concat(chunks).toString('utf8')) }; } catch { return { error: 'parse' }; }
  }

  async function callTool(user, name, args, origin) {
    const tool = Object.hasOwn(TOOLS, name) ? TOOLS[name] : null;
    if (!tool) return { error: { code: -32602, message: `Herramienta desconocida: ${name}` } };
    if (args != null && (typeof args !== 'object' || Array.isArray(args))) return { error: { code: -32602, message: 'arguments debe ser un objeto.' } };
    // La persona actúa "vía Claude": así queda en la bitácora y en los avisos al resto del equipo.
    const actor = { ...user, realName: user.name, name: `${user.name} (vía Claude)` };
    const call = async (method, path, { body = {}, query = {} } = {}) => {
      const { route: found, params } = router.match(method, path);
      router.authorize(found, actor);
      return found.handler({ req: { headers: {} }, res: null, params, query: new URLSearchParams(query), body, ip: 'mcp', user: actor, account: null });
    };
    try {
      const data = await tool.run(call, args ?? {}, origin, actor);
      return { result: { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] } };
    } catch (error) {
      if (error instanceof HttpError) return { result: { isError: true, content: [{ type: 'text', text: apiErrorText(error) }] } };
      logger.error(`[portal] mcp ${name} failed: ${error?.stack ?? error}`);
      return { result: { isError: true, content: [{ type: 'text', text: 'Error interno del portal. Intentá de nuevo.' }] } };
    }
  }

  async function dispatch(message, user, origin) {
    const isRequest = message && message.jsonrpc === '2.0' && typeof message.method === 'string';
    if (!isRequest) return { jsonrpc: '2.0', id: message?.id ?? null, error: { code: -32600, message: 'Invalid Request' } };
    // Notificaciones (sin id): no llevan respuesta.
    if (message.id === undefined) return null;
    const reply = (out) => ({ jsonrpc: '2.0', id: message.id, ...out });
    const params = message.params ?? {};
    switch (message.method) {
      case 'initialize': {
        const asked = params.protocolVersion;
        return reply({
          result: {
            protocolVersion: PROTOCOL_VERSIONS.includes(asked) ? asked : PROTOCOL_VERSIONS[0],
            capabilities: { tools: { listChanged: false } },
            serverInfo: SERVER_INFO,
            instructions: INSTRUCTIONS,
          },
        });
      }
      case 'ping':
        return reply({ result: {} });
      case 'tools/list':
        return reply({ result: { tools: toolList() } });
      case 'tools/call':
        return reply(await callTool(user, params.name, params.arguments, origin));
      case 'resources/list':
        return reply({ result: { resources: [] } });
      case 'prompts/list':
        return reply({ result: { prompts: [] } });
      default:
        return reply({ error: { code: -32601, message: `Method not found: ${message.method}` } });
    }
  }

  /** Atiende /mcp y /mcp/<token>. */
  return async function handleMcp(req, res, pathname) {
    // Protección contra DNS rebinding: si llega Origin, debe ser el propio o uno permitido.
    if (!originAllowed(req)) return send(res, 403, { error: 'origin_blocked' });

    const pathToken = pathname.startsWith('/mcp/') ? decodeURIComponent(pathname.slice(5)) : null;
    const bearer = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization ?? '')?.[1] ?? null;
    const user = principal(bearer ?? pathToken);
    if (!user) {
      return send(res, 401, { jsonrpc: '2.0', id: null, error: { code: -32001, message: 'Token inválido o revocado. Generá uno en el portal: Equipo → Mi perfil → Conectar con Claude.' } },
        { 'WWW-Authenticate': 'Bearer realm="jc-portal"' });
    }
    // Sin SSE: este servidor responde todo en JSON (transporte sin estado).
    if (req.method !== 'POST') return send(res, 405, undefined, { Allow: 'POST' });
    if (rateLimited(user.token_id)) return send(res, 429, { jsonrpc: '2.0', id: null, error: { code: -32002, message: 'Demasiadas llamadas. Esperá un minuto.' } });

    const { value, error } = await readBody(req);
    if (error === 'too_large') return send(res, 413, { jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Petición demasiado grande.' } });
    if (error) return send(res, 400, { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });

    const origin = `${isSecure(req) ? 'https' : 'http'}://${req.headers.host}`;
    if (Array.isArray(value)) {
      const out = (await Promise.all(value.map((m) => dispatch(m, user, origin)))).filter(Boolean);
      return out.length ? send(res, 200, out) : send(res, 202);
    }
    const out = await dispatch(value, user, origin);
    return out ? send(res, 200, out) : send(res, 202);
  };
}
