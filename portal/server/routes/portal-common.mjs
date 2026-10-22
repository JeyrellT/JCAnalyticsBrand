// ============================================================================
//  server/routes/portal-common.mjs
//  Lecturas y avisos del portal de clientes (v5), compartidos por las rutas del
//  equipo y las del cliente. Regla de oro: toda lectura para un cliente recibe
//  su client_id y filtra por él; lo que no es suyo responde 404 (no se revela
//  que existe). Sin dependencias de Node: también corre en la demo.
// ============================================================================

import { PROJECT_ROLES, SERVICES } from '../../shared/catalog.js';
import {
  CLIENT_PROJECT_STATUS, CLIENT_VISIBLE_PROJECT_STATUSES, CLIENT_VISIBLE_APPOINTMENT_KINDS,
} from '../../shared/client-portal.js';
import { fail, invalid } from '../http.mjs';

const SUPPORT_DAYS = 30;
const DAY = 86_400_000;
const VISIBLE_STATUS_SQL = `('${CLIENT_VISIBLE_PROJECT_STATUSES.join("','")}')`;
const VISIBLE_KINDS_SQL = `('${CLIENT_VISIBLE_APPOINTMENT_KINDS.join("','")}')`;

export function createPortalHelpers(ctx) {
  const { db } = ctx;

  // ── Avisos ────────────────────────────────────────────────────────────────
  const insertClientNotification = db.prepare(
    'INSERT INTO client_notifications (account_id, kind, title, body, link, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  );
  /**
   * Aviso en el portal a todas las cuentas activas del cliente (menos quien hizo la acción).
   * Las cuentas con WhatsApp vinculado y permiso vigente lo reciben además por WhatsApp
   * (ctx.wa, server/whatsapp/service.mjs): la cola decide cuándo y cómo sale.
   */
  function notifyClient(clientId, { kind, title, body = null, link = null }, { exceptAccountId = null, urgent = false, actorId = null } = {}) {
    const ids = db.prepare('SELECT id FROM client_accounts WHERE client_id = ? AND active = 1').all(clientId)
      .map((r) => r.id).filter((accountId) => accountId !== exceptAccountId);
    const at = ctx.nowIso();
    const cleanTitle = String(title).slice(0, 160);
    const cleanBody = body ? String(body).slice(0, 300) : null;
    const created = ids.map((accountId) => ({
      accountId, kind, title: cleanTitle, body: cleanBody, link, urgent, createdBy: actorId,
      notificationId: Number(insertClientNotification.run(accountId, kind, cleanTitle, cleanBody, link, at).lastInsertRowid),
    }));
    if (created.length && ctx.wa) {
      try { ctx.wa.onClientNotifications(created); } catch { /* WhatsApp es un extra: nunca rompe la acción */ }
    }
    return ids.length;
  }

  /** Personas del equipo a avisar por algo de un cliente: las indicadas activas o, si no hay, los admin. */
  function teamRecipients(...userIds) {
    const unique = [...new Set(userIds.filter(Boolean))];
    const active = unique.filter((userId) => db.prepare('SELECT 1 FROM users WHERE id = ? AND active = 1').get(userId));
    if (active.length) return active;
    return db.prepare("SELECT id FROM users WHERE active = 1 AND role = 'admin'").all().map((r) => r.id);
  }

  /** Avisa al equipo (buzón + push según preferencias) por una acción de un cliente. */
  function notifyTeam(userIds, { kind, title, body = null, link = null }) {
    // actorId 0: ninguna persona del equipo hizo la acción, así que nadie queda excluido.
    return ctx.notify(teamRecipients(...userIds), 0, { kind, title, body, link });
  }

  // ── Cuentas de cliente ────────────────────────────────────────────────────
  const publicAccount = (row) => row && ({
    id: row.id,
    client_id: row.client_id,
    email: row.email,
    name: row.name,
    phone: row.phone,
    title: row.title,
    can_approve: !!row.can_approve,
    must_change_password: !!row.must_change_password,
    active: !!row.active,
    created_at: row.created_at,
    last_login_at: row.last_login_at,
    wa_linked: !!row.wa_id,
    wa_opt_in: !!row.wa_id && !!row.wa_opt_in,
    wa_linked_at: row.wa_id ? row.wa_linked_at : null,
  });
  const accountsOf = (clientId) => db.prepare('SELECT * FROM client_accounts WHERE client_id = ? ORDER BY active DESC, name').all(clientId).map(publicAccount);

  // ── Proyectos vistos por el cliente ───────────────────────────────────────
  /** Proyecto del cliente visible en su portal, o 404. */
  function clientProjectRow(projectId, clientId) {
    return db.prepare(`SELECT p.*, u.name owner_name, u.phone owner_phone, u.email owner_email FROM projects p LEFT JOIN users u ON u.id = p.owner_id
      WHERE p.id = ? AND p.client_id = ? AND p.status IN ${VISIBLE_STATUS_SQL}`).get(projectId, clientId) ?? fail(404, 'not_found');
  }
  const clientProjectRows = (clientId) => db.prepare(`SELECT p.*, u.name owner_name, u.phone owner_phone, u.email owner_email FROM projects p
    LEFT JOIN users u ON u.id = p.owner_id WHERE p.client_id = ? AND p.status IN ${VISIBLE_STATUS_SQL}
    ORDER BY p.archived, CASE p.status WHEN 'cerrado' THEN 1 ELSE 0 END, p.updated_at DESC`).all(clientId);
  /** ¿El proyecto es del cliente y visible para él? (para validar project_id en lo que crea el cliente) */
  const isClientProject = (projectId, clientId) => !!db.prepare(`SELECT 1 FROM projects WHERE id = ? AND client_id = ? AND status IN ${VISIBLE_STATUS_SQL}`).get(projectId, clientId);

  const milestonesOf = (projectId) => db.prepare(`SELECT id, project_id, title, description, due_date, status, position, completed_at, created_at, updated_at
    FROM project_milestones WHERE project_id = ? ORDER BY position, id`).all(projectId);

  /**
   * Proyecto en lenguaje de cliente: etapas, fechas y responsable. Nunca montos,
   * tareas, notas internas, semáforo interno ni datos de contacto guardados por el equipo.
   */
  function clientProject(p) {
    const milestones = milestonesOf(p.id);
    const done = milestones.filter((m) => m.status === 'completado').length;
    const supportEnds = p.delivered_at ? new Date(Date.parse(`${p.delivered_at}T00:00:00Z`) + SUPPORT_DAYS * DAY).toISOString().slice(0, 10) : null;
    const team = db.prepare(`SELECT u.name, pm.role FROM project_members pm JOIN users u ON u.id = pm.user_id
      WHERE pm.project_id = ? AND u.active = 1 ORDER BY CASE pm.role WHEN 'responsable' THEN 0 ELSE 1 END, u.name`).all(p.id)
      .map((m) => ({ name: m.name, role: m.role, role_label: PROJECT_ROLES[m.role] ?? 'Equipo' }));
    return {
      id: p.id,
      name: p.name,
      service: p.service,
      service_label: SERVICES[p.service] ?? null,
      status: p.status,
      status_label: CLIENT_PROJECT_STATUS[p.status]?.label ?? p.status,
      start_date: p.start_date,
      due_date: p.due_date,
      delivered_at: p.delivered_at,
      support_ends: supportEnds,
      description: p.description,
      url: p.url,
      archived: !!p.archived,
      last_update_at: p.last_update_at,
      owner: p.owner_id ? { name: p.owner_name, phone: p.owner_phone, email: p.owner_email } : null,
      team,
      milestones_total: milestones.length,
      milestones_done: done,
      progress: milestones.length ? done / milestones.length : null,
      next_milestone: milestones.find((m) => m.status !== 'completado') ?? null,
    };
  }

  /** Avances registrados por el equipo (son, por definición, comunicaciones al cliente). */
  function clientUpdates(clientId, { projectId = null, limit = 20 } = {}) {
    const byProject = projectId ? 'AND p.id = ?' : '';
    const args = projectId ? [clientId, projectId, limit] : [clientId, limit];
    return db.prepare(`SELECT pu.id, pu.project_id, pu.channel, pu.note, pu.created_at, u.name author_name, p.name project_name
      FROM project_updates pu JOIN projects p ON p.id = pu.project_id JOIN users u ON u.id = pu.user_id
      WHERE p.client_id = ? AND p.status IN ${VISIBLE_STATUS_SQL} ${byProject} ORDER BY pu.created_at DESC, pu.id DESC LIMIT ?`).all(...args);
  }

  /** Reuniones con el cliente (sin notas internas, sin datos de contacto ni citas internas). */
  function clientMeetings(clientId, { projectId = null, limit = 50 } = {}) {
    const where = projectId
      ? 'a.project_id = ?'
      : `(a.client_id = ? OR a.project_id IN (SELECT id FROM projects WHERE client_id = ? AND status IN ${VISIBLE_STATUS_SQL}))`;
    const args = projectId ? [projectId, limit] : [clientId, clientId, limit];
    return db.prepare(`SELECT a.id, a.title, a.kind, a.status, a.starts_at, a.ends_at, a.location, a.meeting_url, a.project_id, p.name project_name
      FROM appointments a LEFT JOIN projects p ON p.id = a.project_id
      WHERE ${where} AND a.kind IN ${VISIBLE_KINDS_SQL} ORDER BY a.starts_at DESC LIMIT ?`).all(...args);
  }

  // ── Entregables ───────────────────────────────────────────────────────────
  const DELIVERABLE_SELECT = `SELECT d.*, c.name client_name, p.name project_name, b.code brief_code, b.title brief_title,
      u.name shared_by_name, ca.name decided_by_name
    FROM deliverables d JOIN clients c ON c.id = d.client_id LEFT JOIN projects p ON p.id = d.project_id AND p.client_id = d.client_id
    LEFT JOIN briefs b ON b.id = d.brief_id LEFT JOIN users u ON u.id = d.shared_by LEFT JOIN client_accounts ca ON ca.id = d.decided_by_account`;
  const deliverableEvents = (deliverableId) => db.prepare(`SELECT e.id, e.version, e.actor_type, e.kind, e.note, e.created_at,
      COALESCE(u.name, ca.name) actor_name
    FROM deliverable_events e LEFT JOIN users u ON u.id = e.user_id LEFT JOIN client_accounts ca ON ca.id = e.account_id
    WHERE e.deliverable_id = ? ORDER BY e.created_at, e.id`).all(deliverableId);
  /**
   * Entregables filtrados. `clientId` siempre se aplica cuando viene (portal de
   * cliente); `visibleOnly` oculta los de proyectos que el cliente no ve.
   */
  function listDeliverables({ clientId = null, projectId = null, briefId = null, status = null, visibleOnly = false } = {}) {
    const where = ['1 = 1'];
    const args = [];
    if (clientId != null) { where.push('d.client_id = ?'); args.push(clientId); }
    if (projectId != null) { where.push('d.project_id = ?'); args.push(projectId); }
    if (briefId != null) { where.push('d.brief_id = ?'); args.push(briefId); }
    if (status) { where.push('d.status = ?'); args.push(status); }
    if (visibleOnly) where.push(`(d.project_id IS NULL OR p.status IN ${VISIBLE_STATUS_SQL})`);
    return db.prepare(`${DELIVERABLE_SELECT} WHERE ${where.join(' AND ')}
      ORDER BY CASE d.status WHEN 'en_revision' THEN 0 WHEN 'cambios' THEN 1 ELSE 2 END, d.shared_at DESC, d.id DESC`).all(...args);
  }
  const getDeliverable = (deliverableId) => db.prepare(`${DELIVERABLE_SELECT} WHERE d.id = ?`).get(deliverableId) ?? fail(404, 'not_found');
  function getClientDeliverable(deliverableId, clientId) {
    const d = db.prepare(`${DELIVERABLE_SELECT} WHERE d.id = ? AND d.client_id = ? AND (d.project_id IS NULL OR p.status IN ${VISIBLE_STATUS_SQL})`)
      .get(deliverableId, clientId);
    return d ?? fail(404, 'not_found');
  }

  // ── Documentos ────────────────────────────────────────────────────────────
  // El proyecto se une solo si sigue siendo del mismo cliente: si cambia de cliente, nada se filtra al anterior.
  const DOCUMENT_SELECT = `SELECT d.*, p.name project_name, u.name created_by_name FROM client_documents d
    LEFT JOIN projects p ON p.id = d.project_id AND p.client_id = d.client_id LEFT JOIN users u ON u.id = d.created_by`;
  function listDocuments({ clientId, projectId = null, visibleOnly = false }) {
    const where = ['d.client_id = ?'];
    const args = [clientId];
    if (projectId != null) { where.push('d.project_id = ?'); args.push(projectId); }
    if (visibleOnly) where.push(`(d.project_id IS NULL OR p.status IN ${VISIBLE_STATUS_SQL})`);
    return db.prepare(`${DOCUMENT_SELECT} WHERE ${where.join(' AND ')} ORDER BY d.category, d.created_at DESC, d.id DESC`).all(...args);
  }

  // ── Validaciones cruzadas (todo lo que se liga a un cliente debe ser del MISMO cliente) ──
  function projectOfClient(projectId, clientId, field = 'project_id') {
    if (projectId == null) return null;
    const p = db.prepare('SELECT id, name, owner_id, status FROM projects WHERE id = ? AND client_id = ?').get(projectId, clientId);
    if (!p) invalid(field, 'Proyecto no encontrado para este cliente.');
    return p;
  }
  function briefOfClient(briefId, clientId, field = 'brief_id') {
    if (briefId == null) return null;
    const b = db.prepare('SELECT id, code, title, status FROM briefs WHERE id = ? AND client_id = ?').get(briefId, clientId);
    if (!b) invalid(field, 'Brief no encontrado para este cliente.');
    return b;
  }

  return {
    notifyClient, teamRecipients, notifyTeam,
    publicAccount, accountsOf,
    clientProjectRow, clientProjectRows, isClientProject, clientProject, milestonesOf, clientUpdates, clientMeetings,
    DELIVERABLE_SELECT, deliverableEvents, listDeliverables, getDeliverable, getClientDeliverable,
    listDocuments,
    projectOfClient, briefOfClient,
  };
}
