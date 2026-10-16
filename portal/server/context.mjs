// ============================================================================
//  server/context.mjs
//  Servicios compartidos por todas las rutas: reloj (inyectable en pruebas),
//  zona horaria de Costa Rica, configuración, notificaciones y bitácora.
// ============================================================================

import { SLA_STATUSES } from '../shared/catalog.js';

export const TIME_ZONE = 'America/Costa_Rica';
/** Tipos de aviso con información de inversiones. */
export const SENSITIVE_KINDS = ['movement', 'investment', 'message'];
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/**
 * @param {object} o
 * @param {object} o.db
 * @param {() => number} [o.now]
 * @param {object|null} [o.push]  servicio de envío Web Push (server/push.mjs) o un simulador en la demo;
 *        null = sin push (las notificaciones quedan solo en el buzón).
 * @param {(() => Promise<unknown>)|null} [o.fetchExchangeRate]  consulta el tipo de cambio (automatización
 *        tipo_cambio). En Node lo inyecta index.mjs con fetch; null = "sin conexión configurada".
 */
export function createContext({ db, now = () => Date.now(), push = null, fetchExchangeRate = null }) {
  /** Gancho que recibe cada aviso creado para decidir si además se envía como push. */
  let pushHook = null;
  const nowIso = () => new Date(now()).toISOString();
  const dateFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
  /** Fecha AAAA-MM-DD en Costa Rica (UTC−6, sin horario de verano). */
  const today = (offsetDays = 0) => dateFmt.format(new Date(now() + offsetDays * DAY));

  const settings = () => Object.fromEntries(db.prepare('SELECT key, value FROM settings').all().map((r) => [r.key, r.value]));
  const numberSetting = (key, fallback) => {
    const v = Number(db.prepare('SELECT value FROM settings WHERE key = ?').get(key)?.value);
    return Number.isFinite(v) && v > 0 ? v : fallback;
  };

  const insertNotification = db.prepare(
    'INSERT INTO notifications (user_id, kind, title, body, link, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  );
  /** Notifica a los usuarios indicados, nunca a quien hizo la acción. Los avisos de dinero solo llegan a socios y admin activos. */
  function notify(userIds, actorId, { kind, title, body = null, link = null }) {
    let unique = [...new Set(userIds.filter((u) => u && u !== actorId))];
    if (SENSITIVE_KINDS.includes(kind)) {
      // Socios, admin e inversionistas. Los avisos generales de dinero se envían a investorIds()
      // (sin inversionistas); a un inversionista solo le llegan los dirigidos a él (sus movimientos).
      const allowed = new Set(moneyHolderIds());
      unique = unique.filter((u) => allowed.has(u));
    }
    const at = nowIso();
    /** id del aviso creado para cada persona (el push lo usa como etiqueta si no hay enlace). */
    const ids = {};
    for (const userId of unique) ids[userId] = Number(insertNotification.run(userId, kind, title, body, link, at).lastInsertRowid);
    if (unique.length && pushHook) {
      try { pushHook(unique, { kind, title, body, link, ids }); } catch { /* un fallo de push nunca rompe la acción */ }
    }
    return unique.length;
  }

  const insertActivity = db.prepare(
    'INSERT INTO activity (user_id, entity, entity_id, action, summary, sensitive, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  );
  function log(actorId, entity, entityId, action, summary, { sensitive = false } = {}) {
    insertActivity.run(actorId ?? null, entity, entityId ?? null, action, summary.slice(0, 300), sensitive ? 1 : 0, nowIso());
  }

  const userName = (userId) => db.prepare('SELECT name FROM users WHERE id = ?').get(userId)?.name ?? 'Alguien';
  /** Socios y admin activos: custodian el dinero del equipo y reciben los avisos generales de inversiones. */
  const investorIds = () => db.prepare("SELECT id FROM users WHERE active = 1 AND role IN ('admin','socio')").all().map((r) => r.id);
  const moneyHolderIds = () => db.prepare("SELECT id FROM users WHERE active = 1 AND role IN ('admin','socio','inversionista')").all().map((r) => r.id);
  /** Personas de la operación (sin inversionistas). */
  const activeUserIds = () => db.prepare("SELECT id FROM users WHERE active = 1 AND role <> 'inversionista'").all().map((r) => r.id);

  /**
   * Semáforo del compromiso "avance cada N horas" para proyectos de cliente
   * en curso o en revisión: ok (< 2/3 del plazo), warn, late (vencido).
   */
  function projectSla(project) {
    if (project.kind !== 'cliente' || !SLA_STATUSES.includes(project.status)) return { sla_state: null, hours_since_update: null };
    const slaHours = numberSetting('update_sla_hours', 72);
    // El reloj corre desde el último avance o desde que el proyecto entró en curso, lo más reciente.
    const marks = [project.last_update_at, project.sla_started_at].filter(Boolean).sort();
    const ref = marks.at(-1) ?? project.created_at;
    const hours = Math.max(0, (now() - new Date(ref).getTime()) / HOUR);
    const state = hours > slaHours ? 'late' : hours > (slaHours * 2) / 3 ? 'warn' : 'ok';
    return { sla_state: state, hours_since_update: Math.round(hours) };
  }

  return {
    db, now, nowIso, today, settings, numberSetting, notify, log, userName, investorIds, moneyHolderIds, activeUserIds, projectSla,
    // push y fetchExchangeRate se leen siempre como ctx.push / ctx.fetchExchangeRate: la demo puede
    // reemplazarlos después de crear el contexto.
    push, fetchExchangeRate, setPushHook: (fn) => { pushHook = typeof fn === 'function' ? fn : null; },
  };
}

export function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    color: row.color,
    phone: row.phone,
    active: !!row.active,
    must_change_password: !!row.must_change_password,
    last_login_at: row.last_login_at,
  };
}
