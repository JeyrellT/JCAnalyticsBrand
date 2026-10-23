// ============================================================================
//  server/automations.mjs
//  Motor de automatizaciones (compatible con el navegador: corre también en la
//  demo). Las 9 automatizaciones incluidas revisan la base y avisan por
//  ctx.notify (buzón + push según la política de cada persona).
//
//  · runDue() se llama cada minuto (index.mjs en el servidor, un intervalo
//    propio en la demo). Las que tienen hora (`config.time`) corren desde esa
//    hora de Costa Rica; las demás revisan en cada minuto.
//  · run(key, { force: true }) ignora la hora pero nunca repite un aviso: cada
//    aviso reclama antes su `automation_log.dedupe_key` (UNIQUE) con
//    INSERT OR IGNORE y solo avisa si la fila se insertó.
//  · Cada ejecución actualiza automations.last_run_at / last_result / runs.
//    automation_log guarda una línea por cada aviso o acción (con dedupe_key)
//    y una línea por cada ejecución manual; las revisiones sin novedades no
//    escriben en el historial.
// ============================================================================

import { AUTOMATIONS, SLA_STATUSES, MOVEMENT_TYPE_LABEL, WEEKDAYS } from '../shared/catalog.js';
import { formatMoney } from '../shared/finance.js';
import { HttpError, invalid, has } from './http.mjs';
import { transaction } from './schema.mjs';
import { pendingForUser } from './routes/common.mjs';
import { readPrefs, crMinutes, hhmmToMinutes, HHMM_RE, DEFAULT_PREFS } from './notify-policy.mjs';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const SUPPORT_DAYS = 30;
/** El resumen "Mi día" solo sale dentro de las 3 h siguientes a la hora elegida (no llega por la tarde tras un reinicio). */
const DIGEST_WINDOW_MINUTES = 180;
/** Si la consulta del tipo de cambio falla, se reintenta a los 30 minutos. */
const FX_RETRY_MS = 30 * MINUTE;
export const FX_MIN = 300;
export const FX_MAX = 1500;

const timeField = (label, def) => ({ key: 'time', label, type: 'time', min: '00:00', max: '23:59', default: def });

/** Configuración editable de cada automatización (config_schema) con su valor por defecto. */
export const AUTOMATION_CONFIG = {
  resumen_diario: [],
  recordatorio_citas: [{ key: 'minutes_before', label: 'Minutos antes de la cita', type: 'number', min: 10, max: 240, default: 60 }],
  cita_sin_confirmar: [],
  avance_72h: [],
  tareas_vencen: [timeField('Hora del aviso', '08:00')],
  dinero_pendiente: [timeField('Hora del aviso', '09:00')],
  fin_soporte: [timeField('Hora del aviso', '08:30')],
  tareas_recurrentes: [timeField('Hora en que se crean', '06:00')],
  tipo_cambio: [timeField('Hora de la consulta', '08:15')],
};
export const AUTOMATION_KEYS = Object.keys(AUTOMATION_CONFIG);

// ── Utilidades de fecha (hora de negocio: Costa Rica, UTC−6 fijo) ───────────

export const addDays = (date, n) => new Date(Date.parse(`${date}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
/** Inicio del día `date` de Costa Rica en ISO UTC. */
const crDayStartIso = (date) => new Date(Date.parse(`${date}T00:00:00Z`) + 6 * HOUR).toISOString();
const weekdayOf = (date) => new Date(`${date}T00:00:00Z`).getUTCDay() || 7;
const whenFmt = new Intl.DateTimeFormat('es-CR', { timeZone: 'America/Costa_Rica', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const dayFmt = new Intl.DateTimeFormat('es-CR', { timeZone: 'America/Costa_Rica', weekday: 'short', day: 'numeric', month: 'short' });
const fmtWhen = (iso) => whenFmt.format(new Date(iso));
const fmtDay = (iso) => dayFmt.format(new Date(iso));
const fmtMinutes = (m) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}`);
const fmtRate = (v) => `₡${new Intl.NumberFormat('es-CR', { maximumFractionDigits: 2 }).format(v)}`;
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const firstName = (name) => String(name ?? '').trim().split(/\s+/)[0] || 'alguien';

/**
 * Lector tolerante del tipo de cambio: acepta `{ venta: { valor } }`,
 * `{ dolar: { venta: { valor } } }` (API de Hacienda) o un número.
 * @returns {number|null}
 */
export function parseExchangeRate(raw) {
  const num = (v) => {
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    if (typeof v === 'string' && v.trim() !== '') {
      const n = Number(v.trim().replace(',', '.'));
      return Number.isFinite(n) ? n : null;
    }
    return null;
  };
  if (raw == null) return null;
  if (typeof raw !== 'object') return num(raw);
  return num(raw.venta?.valor ?? raw.dolar?.venta?.valor);
}

// ── Tareas recurrentes ──────────────────────────────────────────────────────

/** ¿Le toca a la regla crear tarea en `date` (AAAA-MM-DD)? */
export function ruleDueOn(rule, date) {
  if (rule.frequency === 'diaria') return true;
  if (rule.frequency === 'semanal') return Number(rule.weekday) === weekdayOf(date);
  if (rule.frequency === 'mensual') return Number(rule.monthday) === Number(date.slice(8, 10));
  return false;
}

/** Texto humano de una regla: "Cada lunes · tarea para Hillary · vence el mismo día". */
export function recurringSummary(rule) {
  const when = rule.frequency === 'diaria' ? 'Cada día'
    : rule.frequency === 'semanal' ? `Cada ${WEEKDAYS[rule.weekday] ?? '¿día?'}`
      : `El día ${rule.monthday} de cada mes`;
  const who = rule.assignee_name ? `tarea para ${firstName(rule.assignee_name)}` : 'tarea sin asignar';
  const days = Number(rule.due_in_days) || 0;
  const due = days === 0 ? 'vence el mismo día' : days === 1 ? 'vence al día siguiente' : `vence en ${days} días`;
  return [when, who, due, ...(rule.active ? [] : ['pausada'])].join(' · ');
}

/** Próxima fecha (desde `today`) en que la regla crea una tarea; null si está pausada. */
export function nextRuleDate(rule, today) {
  if (!rule.active) return null;
  for (let i = 0; i <= 31; i += 1) {
    const date = addDays(today, i);
    if (ruleDueOn(rule, date) && rule.last_created_on !== date) return date;
  }
  return null;
}

// ── Motor ───────────────────────────────────────────────────────────────────

export function createAutomationEngine(ctx) {
  const { db } = ctx;

  function ensureRows() {
    const stmt = db.prepare("INSERT OR IGNORE INTO automations (key, enabled, config, runs, updated_at) VALUES (?, 1, '{}', 0, ?)");
    const at = ctx.nowIso();
    for (const key of AUTOMATION_KEYS) stmt.run(key, at);
  }
  const getRow = (key) => db.prepare('SELECT * FROM automations WHERE key = ?').get(key);

  function configOf(key, row) {
    let stored = {};
    try { stored = JSON.parse(row?.config || '{}') ?? {}; } catch { stored = {}; }
    const out = {};
    for (const f of AUTOMATION_CONFIG[key]) {
      const v = stored[f.key];
      const ok = f.type === 'time' ? typeof v === 'string' && HHMM_RE.test(v) : Number.isInteger(v) && v >= f.min && v <= f.max;
      out[f.key] = ok ? v : f.default;
    }
    return out;
  }

  function clockNow() {
    const ms = ctx.now();
    const date = ctx.today();
    return { ms, iso: new Date(ms).toISOString(), date, minutes: crMinutes(ms), weekday: weekdayOf(date) };
  }

  // ── Historial y deduplicación ─────────────────────────────────────────────
  const logged = (dedupeKey) => !!db.prepare('SELECT 1 FROM automation_log WHERE dedupe_key = ?').get(dedupeKey);
  /** Reclama la clave; devuelve el id de la línea nueva o null si ya existía (no se avisa de nuevo). */
  function claim(key, dedupeKey, summary) {
    const r = db.prepare('INSERT OR IGNORE INTO automation_log (automation_key, dedupe_key, summary, recipients, created_at) VALUES (?, ?, ?, 0, ?)')
      .run(key, dedupeKey, summary.slice(0, 300), ctx.nowIso());
    return r.changes > 0 ? Number(r.lastInsertRowid) : null;
  }
  const setRecipients = (logId, n) => db.prepare('UPDATE automation_log SET recipients = ? WHERE id = ?').run(n, logId);

  /** Reclama la clave y avisa (todo o nada). Devuelve cuántas personas recibieron el aviso, o null si ya se había avisado. */
  function emit(key, dedupeKey, summary, userIds, notification) {
    return transaction(db, () => {
      const logId = claim(key, dedupeKey, summary);
      if (logId == null) return null;
      const n = ctx.notify(userIds, null, notification);
      setRecipients(logId, n);
      return n;
    });
  }

  /** Acumulador de resultados de una ejecución. */
  function tally() {
    const t = { items: 0, recipients: 0 };
    t.add = (n) => { if (n != null) { t.items += 1; t.recipients += n; } };
    return t;
  }

  const adminIds = () => db.prepare("SELECT id FROM users WHERE active = 1 AND role = 'admin' ORDER BY id").all().map((r) => r.id);
  const attendeeIds = (appointmentId) => db.prepare('SELECT user_id FROM appointment_attendees WHERE appointment_id = ? ORDER BY user_id').all(appointmentId).map((r) => r.user_id);

  // ── Las 9 automatizaciones ────────────────────────────────────────────────

  function digestFor(user, date) {
    const start = crDayStartIso(date);
    const end = crDayStartIso(addDays(date, 1));
    const citas = db.prepare(`SELECT COUNT(*) n FROM appointments a JOIN appointment_attendees x ON x.appointment_id = a.id
      WHERE x.user_id = ? AND a.status NOT IN ('cancelada') AND a.starts_at >= ? AND a.starts_at < ?`).get(user.id, start, end).n;
    const t = db.prepare(`SELECT COUNT(*) total, SUM(CASE WHEN due_date < ? THEN 1 ELSE 0 END) overdue FROM tasks
      WHERE assignee_id = ? AND status <> 'hecho' AND due_date IS NOT NULL AND due_date <= ?`).get(date, user.id, date);
    const tareas = t.total ?? 0;
    const vencidas = t.overdue ?? 0;
    // Solo la administración aprueba la plata: a los demás no se les cuenta lo pendiente.
    const approver = user.role === 'admin';
    const pendientes = approver ? pendingForUser(ctx, user).length : 0;
    const text = `Hoy: ${plural(citas, 'cita', 'citas')} · ${plural(tareas, 'tarea', 'tareas')}`
      + `${vencidas ? ` (${plural(vencidas, 'vencida', 'vencidas')})` : ''}${approver ? ` · ${pendientes} por aprobar` : ''}`;
    return { total: citas + tareas + pendientes, text };
  }

  const HANDLERS = {
    resumen_diario({ clock, force }) {
      const t = tally();
      // El resumen "Mi día" es de la operación: los inversionistas no lo reciben.
      for (const user of db.prepare("SELECT * FROM users WHERE active = 1 AND role <> 'inversionista' ORDER BY id").all()) {
        const prefs = readPrefs(db, user.id);
        if (!prefs.digest_enabled) continue;
        const from = hhmmToMinutes(prefs.digest_time);
        if (!force && (clock.minutes < from || clock.minutes >= from + DIGEST_WINDOW_MINUTES)) continue;
        const dedupeKey = `digest:${clock.date}:${user.id}`;
        if (logged(dedupeKey)) continue;
        const digest = digestFor(user, clock.date);
        if (!digest.total) continue;
        t.add(emit('resumen_diario', dedupeKey, `Resumen "Mi día" para ${user.name}`, [user.id], {
          kind: 'digest', title: `Mi día · ${fmtDay(clock.iso)}`, body: digest.text, link: '/',
        }));
      }
      return { summary: t.items ? `Resumen enviado a ${plural(t.items, 'persona', 'personas')}.` : 'Sin resúmenes pendientes.', recipients: t.recipients };
    },

    recordatorio_citas({ config, clock }) {
      const t = tally();
      const until = new Date(clock.ms + config.minutes_before * MINUTE).toISOString();
      const rows = db.prepare(`SELECT * FROM appointments WHERE status NOT IN ('cancelada','realizada','no_asistio')
        AND starts_at > ? AND starts_at <= ? ORDER BY starts_at`).all(clock.iso, until);
      for (const a of rows) {
        const people = attendeeIds(a.id);
        if (!people.length) continue;
        const minutes = Math.max(1, Math.round((Date.parse(a.starts_at) - clock.ms) / MINUTE));
        const place = a.location || (a.meeting_url ? 'Videollamada' : null);
        t.add(emit('recordatorio_citas', `appt:${a.id}:${a.starts_at}`, `Recordatorio de "${a.title}" (${fmtWhen(a.starts_at)})`, people, {
          kind: 'appointment', title: `En ${fmtMinutes(minutes)}: ${a.title}`, body: [fmtWhen(a.starts_at), place].filter(Boolean).join(' · '), link: `/agenda?cita=${a.id}`,
        }));
      }
      return { summary: t.items ? `${plural(t.items, 'recordatorio enviado', 'recordatorios enviados')}.` : 'Sin citas por recordar.', recipients: t.recipients };
    },

    cita_sin_confirmar({ clock }) {
      const t = tally();
      const until = new Date(clock.ms + DAY).toISOString();
      const rows = db.prepare(`SELECT a.*, c.name client_name FROM appointments a LEFT JOIN clients c ON c.id = a.client_id
        WHERE a.kind <> 'interna' AND a.status = 'programada' AND a.starts_at > ? AND a.starts_at <= ? ORDER BY a.starts_at`).all(clock.iso, until);
      for (const a of rows) {
        const people = [a.created_by, ...attendeeIds(a.id)].filter(Boolean);
        const who = a.client_name || a.contact_name || 'el cliente';
        t.add(emit('cita_sin_confirmar', `appt-confirm:${a.id}:${a.starts_at}`, `Cita sin confirmar: "${a.title}"`, people, {
          kind: 'appointment', title: `Confirmá con ${who}`,
          body: [a.title, fmtWhen(a.starts_at), a.contact_phone].filter(Boolean).join(' · '), link: `/agenda?cita=${a.id}`,
        }));
      }
      return { summary: t.items ? `${plural(t.items, 'cita por confirmar avisada', 'citas por confirmar avisadas')}.` : 'Sin citas por confirmar.', recipients: t.recipients };
    },

    avance_72h() {
      const t = tally();
      const slaHours = ctx.numberSetting('update_sla_hours', 72);
      const admins = adminIds();
      const statuses = SLA_STATUSES.map(() => '?').join(',');
      const rows = db.prepare(`SELECT * FROM projects WHERE kind = 'cliente' AND archived = 0 AND status IN (${statuses}) ORDER BY id`).all(...SLA_STATUSES);
      for (const p of rows) {
        const { sla_state: state, hours_since_update: hours } = ctx.projectSla(p);
        // Misma referencia que ctx.projectSla: el último avance o la entrada en curso, lo más reciente.
        const ref = [p.last_update_at, p.sla_started_at].filter(Boolean).sort().at(-1) ?? p.created_at;
        const label = p.client || p.name;
        if (state === 'late') {
          t.add(emit('avance_72h', `sla-late:${p.id}:${ref}`, `Avance vencido: ${label}`, [p.owner_id, ...admins], {
            kind: 'automation', title: `Avance vencido: ${label}`, body: `${hours} h sin avance (compromiso de ${slaHours} h) · ${p.name}`, link: `/proyectos/${p.id}`,
          }));
        } else if (state === 'warn' && p.owner_id) {
          t.add(emit('avance_72h', `sla-warn:${p.id}:${ref}`, `Avance pronto: ${label}`, [p.owner_id], {
            kind: 'automation', title: `Avance pronto: ${label}`, body: `${hours} h desde el último avance; el compromiso es cada ${slaHours} h.`, link: `/proyectos/${p.id}`,
          }));
        }
      }
      return { summary: t.items ? `${plural(t.items, 'alerta de avance enviada', 'alertas de avance enviadas')}.` : 'Todos los proyectos al día.', recipients: t.recipients };
    },

    tareas_vencen({ clock }) {
      const t = tally();
      const rows = db.prepare(`SELECT t.*, p.name project_name FROM tasks t LEFT JOIN projects p ON p.id = t.project_id
        WHERE t.status <> 'hecho' AND t.due_date = ? AND t.assignee_id IS NOT NULL ORDER BY t.id`).all(clock.date);
      for (const task of rows) {
        t.add(emit('tareas_vencen', `due:${task.id}:${clock.date}`, `Vence hoy: "${task.title}"`, [task.assignee_id], {
          kind: 'task', title: `Vence hoy: ${task.title}`, body: task.project_name ? `Proyecto ${task.project_name}` : 'Tarea del tablero', link: `/tablero?tarea=${task.id}`,
        }));
      }
      return { summary: t.items ? `${plural(t.items, 'tarea avisada', 'tareas avisadas')}.` : 'Ninguna tarea vence hoy.', recipients: t.recipients };
    },

    dinero_pendiente({ clock }) {
      const t = tally();
      const cutoff = new Date(clock.ms - DAY).toISOString();
      const byMovement = new Map();
      for (const user of db.prepare("SELECT * FROM users WHERE active = 1 AND role IN ('admin','socio','inversionista') ORDER BY id").all()) {
        for (const m of pendingForUser(ctx, user)) {
          if (m.created_at > cutoff) continue;
          const entry = byMovement.get(m.id) ?? { m, users: [] };
          entry.users.push(user.id);
          byMovement.set(m.id, entry);
        }
      }
      for (const { m, users } of byMovement.values()) {
        const investment = db.prepare('SELECT name FROM investments WHERE id = ?').get(m.investment_id);
        t.add(emit('dinero_pendiente', `money:${m.id}:${clock.date}`, `Movimiento #${m.id} sin aprobar hace más de 24 h`, users, {
          kind: 'movement', title: `Por aprobar: ${MOVEMENT_TYPE_LABEL[m.type] ?? 'Movimiento'} de ${formatMoney(m.amount, m.currency)}`,
          body: `${investment?.name ?? 'Inversión'} · espera tu aprobación desde ${fmtDay(m.created_at)}`, link: `/inversiones/${m.investment_id}?mov=${m.id}`,
        }));
      }
      return { summary: t.items ? `${plural(t.items, 'movimiento recordado', 'movimientos recordados')}.` : 'Sin movimientos atrasados.', recipients: t.recipients };
    },

    fin_soporte({ clock }) {
      const t = tally();
      const admins = adminIds();
      const limit = addDays(clock.date, 7);
      const rows = db.prepare(`SELECT * FROM projects WHERE archived = 0 AND status IN ('entregado','soporte') AND delivered_at IS NOT NULL ORDER BY id`).all();
      for (const p of rows) {
        const ends = addDays(p.delivered_at, SUPPORT_DAYS);
        if (ends < clock.date || ends > limit) continue;
        const label = p.client || p.name;
        t.add(emit('fin_soporte', `support:${p.id}:${ends}`, `Fin de soporte de ${label} (${ends})`, p.owner_id ? [p.owner_id] : admins, {
          kind: 'automation', title: `El soporte de ${label} termina el ${ends}`, body: `${p.name}. Definí cierre o plan de mantenimiento.`, link: `/proyectos/${p.id}`,
        }));
      }
      return { summary: t.items ? `${plural(t.items, 'aviso de fin de soporte', 'avisos de fin de soporte')}.` : 'Ningún soporte termina esta semana.', recipients: t.recipients };
    },

    tareas_recurrentes({ clock }) {
      const t = tally();
      const rules = db.prepare('SELECT * FROM recurring_tasks WHERE active = 1 ORDER BY id').all();
      for (const rule of rules) {
        if (!ruleDueOn(rule, clock.date) || rule.last_created_on === clock.date) continue;
        const due = addDays(clock.date, Number(rule.due_in_days) || 0);
        const created = transaction(db, () => {
          const logId = claim('tareas_recurrentes', `recurring:${rule.id}:${clock.date}`, `Tarea recurrente creada: "${rule.title}"`);
          if (logId == null) return null;
          const assignee = rule.assignee_id && db.prepare('SELECT 1 FROM users WHERE id = ? AND active = 1').get(rule.assignee_id) ? rule.assignee_id : null;
          const projectId = rule.project_id && db.prepare('SELECT 1 FROM projects WHERE id = ?').get(rule.project_id) ? rule.project_id : null;
          // Mismo flujo que POST /api/tasks: al final de la columna, bitácora y aviso a quien la recibe.
          const position = (db.prepare("SELECT MAX(position) m FROM tasks WHERE status = 'por_hacer'").get().m ?? 0) + 1024;
          const at = ctx.nowIso();
          const { lastInsertRowid } = db.prepare(`INSERT INTO tasks (project_id, title, description, status, priority, assignee_id, due_date, position,
            created_by, created_at, updated_at, completed_at) VALUES (?, ?, ?, 'por_hacer', ?, ?, ?, ?, ?, ?, ?, NULL)`).run(
            projectId, rule.title, rule.description, rule.priority, assignee, due, position, rule.created_by ?? null, at, at,
          );
          const taskId = Number(lastInsertRowid);
          db.prepare('UPDATE recurring_tasks SET last_created_on = ? WHERE id = ?').run(clock.date, rule.id);
          ctx.log(null, 'task', taskId, 'created', `El portal creó la tarea recurrente "${rule.title}"`);
          return { logId, taskId, assignee };
        });
        if (!created) continue;
        let n = 0;
        if (created.assignee) {
          n = ctx.notify([created.assignee], null, {
            kind: 'task', title: `Nueva tarea: ${rule.title}`, body: `Tarea recurrente · vence ${due}`, link: `/tablero?tarea=${created.taskId}`,
          });
          setRecipients(created.logId, n);
        }
        t.add(n);
      }
      return { summary: t.items ? `${plural(t.items, 'tarea recurrente creada', 'tareas recurrentes creadas')}.` : 'Ninguna regla toca hoy.', recipients: t.recipients };
    },

    async tipo_cambio({ clock }) {
      const fetcher = ctx.fetchExchangeRate;
      const current = Number(ctx.settings().fx_usd_crc);
      const keep = Number.isFinite(current) && current > 0 ? ` Se mantiene ${fmtRate(current)}.` : '';
      if (typeof fetcher !== 'function') return { summary: `Sin conexión configurada.${keep}`, recipients: 0 };
      let raw;
      try {
        raw = await fetcher();
      } catch (error) {
        return { summary: `No se pudo consultar Hacienda (${String(error?.message ?? error).slice(0, 120)}).${keep}`, recipients: 0, error: true };
      }
      const rate = parseExchangeRate(raw);
      if (rate == null) return { summary: `Respuesta de Hacienda no reconocida.${keep}`, recipients: 0, error: true };
      if (rate < FX_MIN || rate > FX_MAX) return { summary: `Valor fuera de rango (${rate}); se esperaba entre ${FX_MIN} y ${FX_MAX}.${keep}`, recipients: 0, error: true };
      const value = Math.round(rate * 100) / 100;
      const dedupeKey = `fx:${clock.date}`;
      if (value === current) {
        claim('tipo_cambio', dedupeKey, `Tipo de cambio sin cambios: ${fmtRate(value)}`);
        return { summary: `Sin cambios: ${fmtRate(value)} por dólar (venta).`, recipients: 0 };
      }
      const n = transaction(db, () => {
        db.prepare("INSERT INTO settings (key, value) VALUES ('fx_usd_crc', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(String(value));
        ctx.log(null, 'settings', null, 'updated', `El portal actualizó el tipo de cambio desde Hacienda: ${fmtRate(current)} → ${fmtRate(value)}`);
        const logId = claim('tipo_cambio', dedupeKey, `Tipo de cambio: ${fmtRate(current)} → ${fmtRate(value)}`);
        if (logId == null) return null;
        const sent = ctx.notify(adminIds(), null, {
          kind: 'automation', title: `Tipo de cambio: ${fmtRate(value)}`, body: `Antes ${fmtRate(current)} · dólar venta según Hacienda.`, link: '/equipo',
        });
        setRecipients(logId, sent);
        return sent;
      });
      return { summary: `Actualizado: ${fmtRate(current)} → ${fmtRate(value)}${n == null ? ' (el aviso de hoy ya se había enviado)' : ''}.`, recipients: n ?? 0 };
    },
  };

  // ── Programación ──────────────────────────────────────────────────────────

  function isDue(key, config, clock, row) {
    if (!config.time) return true; // revisa en cada minuto
    if (clock.minutes < hhmmToMinutes(config.time)) return false;
    if (key === 'tipo_cambio') {
      if (logged(`fx:${clock.date}`)) return false; // ya se consultó hoy
      const last = row.last_run_at ? Date.parse(row.last_run_at) : 0;
      if (clock.ms - last < FX_RETRY_MS) return false; // falló hace poco: reintenta más tarde
    }
    return true;
  }

  function scheduleText(key, config) {
    switch (key) {
      case 'resumen_diario': return 'Cada día, a la hora del resumen de cada persona';
      case 'recordatorio_citas': return `${config.minutes_before} min antes de cada cita`;
      case 'cita_sin_confirmar': return 'Revisa cada minuto las citas de las próximas 24 h';
      case 'avance_72h': return `Revisa cada minuto el compromiso de ${ctx.numberSetting('update_sla_hours', 72)} h`;
      case 'fin_soporte': return `Cada día a las ${config.time}, 7 días antes del fin`;
      case 'tareas_recurrentes': return `Cada día a las ${config.time}, según cada regla`;
      case 'tipo_cambio': return `Cada día a las ${config.time} (Hacienda, dólar venta)`;
      default: return `Cada día a las ${config.time}`;
    }
  }

  function nextRunHint(key, config, row, clock) {
    if (!row.enabled) return 'Desactivada';
    if (key === 'resumen_diario') return `Cada mañana a la hora de cada persona (${DEFAULT_PREFS.digest_time} por defecto)`;
    if (!config.time) return 'En el próximo minuto';
    if (clock.minutes < hhmmToMinutes(config.time)) return `Hoy a las ${config.time}`;
    if (key === 'tipo_cambio' && !logged(`fx:${clock.date}`)) return 'Reintenta en menos de 30 min';
    return `Mañana a las ${config.time}`;
  }

  function describe(key, row, clock) {
    const meta = AUTOMATIONS[key];
    const config = configOf(key, row);
    return {
      key,
      name: meta.name,
      description: meta.description,
      schedule: scheduleText(key, config),
      category: meta.category,
      enabled: !!row.enabled,
      config,
      config_schema: AUTOMATION_CONFIG[key].map((f) => ({ ...f })),
      last_run_at: row.last_run_at,
      last_result: row.last_result,
      runs: row.runs,
      next_run_hint: nextRunHint(key, config, row, clock),
    };
  }

  function list() {
    ensureRows();
    const clock = clockNow();
    return AUTOMATION_KEYS.map((key) => describe(key, getRow(key), clock));
  }

  function get(key) {
    if (!AUTOMATION_CONFIG[key]) throw new HttpError(404, 'not_found');
    ensureRows();
    return describe(key, getRow(key), clockNow());
  }

  /** Cambia enabled y/o config (validada contra config_schema). */
  function configure(key, body) {
    if (!AUTOMATION_CONFIG[key]) throw new HttpError(404, 'not_found');
    ensureRows();
    const row = getRow(key);
    let enabled = row.enabled;
    if (has(body, 'enabled')) {
      if (![true, false, 0, 1].includes(body.enabled)) invalid('enabled', 'Debe ser sí o no.');
      enabled = body.enabled ? 1 : 0;
    }
    let config = configOf(key, row);
    if (has(body, 'config')) {
      const patch = body.config;
      if (!patch || typeof patch !== 'object' || Array.isArray(patch)) invalid('config', 'Configuración inválida.');
      const fields = new Map(AUTOMATION_CONFIG[key].map((f) => [f.key, f]));
      config = { ...config };
      for (const [k, v] of Object.entries(patch)) {
        const f = fields.get(k);
        if (!f) invalid('config', `Opción no reconocida: ${k}.`);
        if (f.type === 'time') {
          if (typeof v !== 'string' || !HHMM_RE.test(v)) invalid('config', `${f.label}: usar el formato HH:MM.`);
        } else if (!Number.isInteger(v) || v < f.min || v > f.max) {
          invalid('config', `${f.label}: un número entero entre ${f.min} y ${f.max}.`);
        }
        config[k] = v;
      }
    }
    db.prepare('UPDATE automations SET enabled = ?, config = ?, updated_at = ? WHERE key = ?').run(enabled, JSON.stringify(config), ctx.nowIso(), key);
    return describe(key, getRow(key), clockNow());
  }

  /**
   * Ejecuta una automatización. Sin `force` respeta la hora; con `force` la
   * ignora, pero nunca repite avisos ya enviados. Una desactivada no corre
   * (con `force` responde 409).
   * @returns {Promise<{ key, summary, recipients, error? }|null>} null si no tocaba
   */
  async function run(key, { force = false } = {}) {
    if (!AUTOMATION_CONFIG[key]) throw new HttpError(404, 'not_found');
    ensureRows();
    const row = getRow(key);
    if (!row.enabled) {
      if (force) throw new HttpError(409, 'automation_disabled');
      return null;
    }
    const config = configOf(key, row);
    const clock = clockNow();
    if (!force && !isDue(key, config, clock, row)) return null;
    let result;
    try {
      result = await HANDLERS[key]({ config, clock, force });
    } catch (error) {
      result = { summary: `Error: ${String(error?.message ?? error).slice(0, 200)}`, recipients: 0, error: true };
    }
    const summary = String(result.summary).slice(0, 300);
    db.prepare('UPDATE automations SET last_run_at = ?, last_result = ?, runs = runs + 1 WHERE key = ?').run(clock.iso, summary, key);
    if (force) {
      db.prepare('INSERT INTO automation_log (automation_key, dedupe_key, summary, recipients, created_at) VALUES (?, NULL, ?, ?, ?)')
        .run(key, `Ejecución manual: ${summary}`.slice(0, 300), result.recipients, clock.iso);
    }
    return { key, summary, recipients: result.recipients, ...(result.error ? { error: true } : {}) };
  }

  let busy = false;
  /** Corre todo lo que toca ahora (una vez por minuto). Nunca lanza; los errores van en cada resultado. */
  async function runDue() {
    if (busy) return [];
    busy = true;
    const out = [];
    try {
      for (const key of AUTOMATION_KEYS) {
        try {
          const r = await run(key);
          if (r) out.push(r);
        } catch (error) {
          out.push({ key, summary: `Error: ${error?.message ?? error}`, recipients: 0, error: true });
        }
      }
    } finally {
      busy = false;
    }
    return out;
  }

  return { list, get, configure, run, runDue, keys: AUTOMATION_KEYS };
}
