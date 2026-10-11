// ============================================================================
//  server/routes/common.mjs
//  Lecturas compartidas entre módulos de rutas: proyecto decorado (avance,
//  tareas, equipo), cita con asistentes y cliente con sus campos calculados.
//  Sin dependencias de Node: también corre en la demo del navegador.
// ============================================================================

import { toCRC } from '../../shared/finance.js';
import { fail, invalid } from '../http.mjs';

const SUPPORT_DAYS = 30;
const DAY = 86_400_000;

/** Estados que cuentan como proyecto activo (igual que el centro de operaciones). */
export const ACTIVE_PROJECT_STATUSES = ['en_curso', 'en_revision', 'soporte'];
export const ACTIVE_SQL = `('${ACTIVE_PROJECT_STATUSES.join("','")}')`;

/** Normaliza un nombre para compararlo sin distinguir mayúsculas ni espacios. */
export const sameName = (a, b) => String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();

export function createHelpers(ctx) {
  const { db } = ctx;

  // ── Personas ──────────────────────────────────────────────────────────────
  const userExists = (userId, field) => {
    if (userId == null) return null;
    if (!db.prepare('SELECT 1 FROM users WHERE id = ? AND active = 1').get(userId)) invalid(field, 'Persona no encontrada.');
    return userId;
  };
  /** Valida solo si cambia: alguien ya asignado y luego desactivado no impide editar. */
  const keepOrCheck = (value, current, field) => (value != null && value === current ? value : userExists(value, field));

  // ── Proyectos ─────────────────────────────────────────────────────────────
  const PROJECT_SELECT = `SELECT p.*, u.name owner_name, u.color owner_color FROM projects p LEFT JOIN users u ON u.id = p.owner_id`;
  const getProjectFull = (projectId) => db.prepare(`${PROJECT_SELECT} WHERE p.id = ?`).get(projectId) ?? fail(404, 'not_found');

  /** Equipo del proyecto: primero el responsable, luego por nombre. */
  function membersOf(projectId) {
    return db.prepare(`SELECT u.id, u.name, u.color, pm.role FROM project_members pm JOIN users u ON u.id = pm.user_id
      WHERE pm.project_id = ? ORDER BY CASE pm.role WHEN 'responsable' THEN 0 ELSE 1 END, u.name`).all(projectId);
  }

  function decorateProject(p) {
    const counts = db.prepare(`SELECT COUNT(*) total,
        SUM(CASE WHEN status = 'hecho' THEN 1 ELSE 0 END) done,
        SUM(CASE WHEN status <> 'hecho' AND due_date IS NOT NULL AND due_date < ? THEN 1 ELSE 0 END) overdue
      FROM tasks WHERE project_id = ?`).get(ctx.today(), p.id);
    const supportEnds = p.delivered_at ? new Date(new Date(`${p.delivered_at}T00:00:00Z`).getTime() + SUPPORT_DAYS * DAY).toISOString().slice(0, 10) : null;
    return {
      ...p,
      client_id: p.client_id ?? null,
      archived: !!p.archived,
      tasks_total: counts.total ?? 0,
      tasks_done: counts.done ?? 0,
      tasks_overdue: counts.overdue ?? 0,
      progress: counts.total ? (counts.done ?? 0) / counts.total : 0,
      support_ends: supportEnds,
      members: membersOf(p.id),
      ...ctx.projectSla(p),
    };
  }

  // ── Agenda ────────────────────────────────────────────────────────────────
  const APPOINTMENT_SELECT = `SELECT a.*, p.name project_name, c.name client_name FROM appointments a
    LEFT JOIN projects p ON p.id = a.project_id LEFT JOIN clients c ON c.id = a.client_id`;
  function attendeesOf(appointmentId) {
    return db.prepare(`SELECT u.id, u.name, u.color FROM appointment_attendees a JOIN users u ON u.id = a.user_id WHERE a.appointment_id = ? ORDER BY u.name`).all(appointmentId);
  }
  const decorateAppointment = (a) => ({ ...a, attendees: attendeesOf(a.id) });

  // ── Clientes ──────────────────────────────────────────────────────────────
  const CLIENT_ORDER = ['activo', 'prospecto', 'inactivo'];
  /** Citas del cliente: las ligadas directo o por alguno de sus proyectos. */
  const CLIENT_APPOINTMENTS = `(a.client_id = c.id OR a.project_id IN (SELECT id FROM projects WHERE client_id = c.id))`;

  /**
   * Clientes con sus campos calculados. `where` filtra sobre la tabla `c`.
   * Orden: activo, prospecto, inactivo; dentro de cada grupo, lo más reciente primero.
   */
  function listClients(where = '1 = 1', args = []) {
    const now = ctx.nowIso();
    const rows = db.prepare(`SELECT c.*, u.name owner_name, u.color owner_color,
        (SELECT COUNT(*) FROM projects p WHERE p.client_id = c.id AND p.archived = 0 AND p.status IN ${ACTIVE_SQL}) projects_active,
        (SELECT COUNT(*) FROM projects p WHERE p.client_id = c.id) projects_total,
        (SELECT MAX(p.last_update_at) FROM projects p WHERE p.client_id = c.id) last_update_at,
        (SELECT MAX(a.starts_at) FROM appointments a WHERE ${CLIENT_APPOINTMENTS}
          AND a.starts_at <= ? AND a.status NOT IN ('cancelada','no_asistio')) last_appointment_at,
        (SELECT MIN(a.starts_at) FROM appointments a WHERE ${CLIENT_APPOINTMENTS}
          AND a.starts_at > ? AND a.status IN ('programada','confirmada')) next_appointment_at
      FROM clients c LEFT JOIN users u ON u.id = c.owner_id WHERE ${where}`).all(now, now, ...args);
    if (!rows.length) return [];
    const fx = ctx.numberSetting('fx_usd_crc', 515);
    const value = new Map();
    for (const r of db.prepare(`SELECT client_id, currency, SUM(value_amount) total FROM projects
        WHERE client_id IS NOT NULL AND status <> 'cerrado' AND value_amount IS NOT NULL GROUP BY client_id, currency`).all()) {
      value.set(r.client_id, (value.get(r.client_id) ?? 0) + (toCRC(r.total, r.currency, fx) ?? 0));
    }
    return rows
      .map(({ last_update_at: lastUpdate, last_appointment_at: lastAppointment, ...c }) => ({
        ...c,
        value_crc: value.get(c.id) ?? 0,
        last_contact_at: [lastUpdate, lastAppointment].filter(Boolean).sort().at(-1) ?? null,
      }))
      .sort((a, b) => CLIENT_ORDER.indexOf(a.status) - CLIENT_ORDER.indexOf(b.status) || b.updated_at.localeCompare(a.updated_at) || b.id - a.id);
  }
  const getClient = (clientId) => listClients('c.id = ?', [clientId])[0] ?? fail(404, 'not_found');
  const clientExists = (clientId, field = 'client_id') => {
    if (clientId == null) return null;
    const row = db.prepare('SELECT id, name, contact_name, contact_phone FROM clients WHERE id = ?').get(clientId);
    if (!row) invalid(field, 'Cliente no encontrado.');
    return row;
  };

  return {
    userExists, keepOrCheck,
    PROJECT_SELECT, getProjectFull, membersOf, decorateProject,
    APPOINTMENT_SELECT, attendeesOf, decorateAppointment,
    listClients, getClient, clientExists,
  };
}
