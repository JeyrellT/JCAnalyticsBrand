// ============================================================================
//  server/routes/client-portal.mjs
//  API del PORTAL DE CLIENTES (/api/client/*). Identidad aparte del equipo:
//  cookie jcc_session, tabla client_accounts, acceso client / client_any.
//
//  Reglas de blindaje:
//    · Cada consulta filtra por account.client_id; un id ajeno responde 404.
//    · El cliente ve el control del servicio (etapas, avances, entregables,
//      solicitudes, documentos y reuniones), nunca tareas, montos, notas internas
//      ni datos de otros clientes.
//    · Escrituras con freno por cuenta (además del límite de login).
// ============================================================================

import { DELIVERABLE_STATUS, MAX_OPEN_CLIENT_DRAFTS } from '../../shared/client-portal.js';
import { BRIEF_FINAL_STATUSES } from '../../shared/brief.js';
import { fail, invalid, has, text, id } from '../http.mjs';
import { hashPassword, verifyPassword, passwordProblem, burnPasswordCheck, createLoginLimiter } from '../auth.mjs';
import { transaction } from '../schema.mjs';
import { createPortalHelpers } from './portal-common.mjs';
import { createBriefService } from './brief-service.mjs';

const WRITE_LIMIT = 120;            // escrituras por cuenta…
const WRITE_WINDOW_MS = 10 * 60_000; // …cada 10 minutos

export function clientPortalRoutes(route, ctx, session) {
  const { db } = ctx;
  const portal = createPortalHelpers(ctx);
  const briefs = createBriefService(ctx, portal);
  const writes = createLoginLimiter({ max: WRITE_LIMIT, windowMs: WRITE_WINDOW_MS, now: ctx.now });
  const clientSession = session.client;

  /** Freno por cuenta para escrituras del cliente (spam de comentarios, borradores, etc.). */
  function guardWrite(account) {
    const key = [`account:${account.id}`];
    if (writes.blocked(key)) fail(429, 'too_many_requests');
    writes.fail(key);
  }
  const asClient = (account) => ({ type: 'cliente', account });

  const meAccount = (account) => ({ ...portal.publicAccount(account), client_name: account.client_name });
  const unreadCount = (account) => db.prepare('SELECT COUNT(*) n FROM client_notifications WHERE account_id = ? AND read_at IS NULL').get(account.id).n;

  // ── Sesión ────────────────────────────────────────────────────────────────
  route('POST', '/api/client/auth/login', 'public', async ({ body, req, res, ip }) => {
    const mail = typeof body.email === 'string' ? body.email.trim().toLowerCase().slice(0, 160) : '';
    const password = typeof body.password === 'string' ? body.password.slice(0, 200) : '';
    const keys = [`ip:${ip}`, `client:${mail}`];
    if (session.limiter.blocked(keys)) fail(429, 'too_many_attempts');
    session.limiter.fail(keys);
    const row = mail ? db.prepare('SELECT a.*, c.name client_name FROM client_accounts a JOIN clients c ON c.id = a.client_id WHERE a.email = ?').get(mail) : null;
    const ok = row && row.active ? await verifyPassword(password, row.password_hash) : (await burnPasswordCheck(password), false);
    if (!ok) {
      ctx.log(null, 'client_auth', row?.id ?? null, 'login_failed', `Intento fallido en el portal de clientes${mail ? ` (${mail})` : ''}`);
      fail(401, 'invalid_credentials');
    }
    session.limiter.reset(keys);
    clientSession.start(res, req, row.id, ip);
    db.prepare('UPDATE client_accounts SET last_login_at = ? WHERE id = ?').run(ctx.nowIso(), row.id);
    ctx.log(null, 'client_auth', row.id, 'client_login', `${row.name} (${row.client_name}) entró al portal de clientes`);
    return { account: meAccount(row) };
  });

  route('POST', '/api/client/auth/logout', 'client_any', ({ req, res }) => {
    clientSession.end(req, res);
    return { ok: true };
  });

  route('GET', '/api/client/me', 'client_any', ({ account }) => {
    const client = db.prepare(`SELECT c.id, c.name, u.name owner_name, u.phone owner_phone, u.email owner_email FROM clients c
      LEFT JOIN users u ON u.id = c.owner_id AND u.active = 1 WHERE c.id = ?`).get(account.client_id);
    return {
      account: meAccount(account),
      client: { id: client.id, name: client.name },
      // Ejecutivo de cuenta: a quién escribir fuera del portal.
      contact: client.owner_name ? { name: client.owner_name, phone: client.owner_phone, email: client.owner_email } : null,
      unread: unreadCount(account),
      lead_days: ctx.numberSetting('brief_lead_days', 3),
      today: ctx.today(),
    };
  });

  route('PATCH', '/api/client/me', 'client', ({ account, body }) => {
    guardWrite(account);
    const name = has(body, 'name') ? text(body.name, 'name', { max: 80, min: 2, required: true }) : account.name;
    const phone = has(body, 'phone') ? text(body.phone, 'phone', { max: 30 }) : account.phone;
    db.prepare('UPDATE client_accounts SET name = ?, phone = ? WHERE id = ?').run(name, phone, account.id);
    const row = db.prepare('SELECT a.*, c.name client_name FROM client_accounts a JOIN clients c ON c.id = a.client_id WHERE a.id = ?').get(account.id);
    return { account: meAccount(row) };
  });

  route('POST', '/api/client/me/password', 'client_any', async ({ account, body, req }) => {
    guardWrite(account);
    const current = typeof body.current_password === 'string' ? body.current_password : '';
    const next = body.new_password;
    if (!(await verifyPassword(current, account.password_hash))) invalid('current_password', 'La contraseña actual no coincide.');
    const problem = passwordProblem(next);
    if (problem) invalid('new_password', problem);
    if (next === current) invalid('new_password', 'Elegí una contraseña distinta a la actual.');
    db.prepare('UPDATE client_accounts SET password_hash = ?, must_change_password = 0 WHERE id = ?').run(await hashPassword(next), account.id);
    clientSession.endOthers(req, account.id);
    ctx.log(null, 'client_account', account.id, 'password_changed', `${account.name} (${account.client_name}) cambió su contraseña del portal`);
    return { ok: true };
  });

  // ── Inicio ────────────────────────────────────────────────────────────────
  route('GET', '/api/client/overview', 'client', ({ account }) => {
    const clientId = account.client_id;
    const nowIso = ctx.nowIso();
    const projects = portal.clientProjectRows(clientId).map(portal.clientProject);
    const active = projects.filter((p) => !p.archived && p.status !== 'cerrado');
    const deliverables = portal.listDeliverables({ clientId, visibleOnly: true });
    const approvals = deliverables.filter((d) => d.status === 'en_revision');
    const openBriefs = db.prepare(`${briefs.BRIEF_SELECT} WHERE b.client_id = ? AND b.status NOT IN ('${BRIEF_FINAL_STATUSES.join("','")}')
      ORDER BY b.updated_at DESC LIMIT 8`).all(clientId).map((r) => briefs.decorate(r, 'client', { withData: false }));
    const meetings = portal.clientMeetings(clientId, { limit: 60 });
    const upcoming = meetings.filter((m) => m.ends_at >= nowIso && !['cancelada', 'no_asistio'].includes(m.status)).reverse().slice(0, 5);
    const recent = meetings.filter((m) => m.ends_at < nowIso).slice(0, 3);
    return {
      client: { id: clientId, name: account.client_name },
      kpis: {
        active_projects: active.length,
        pending_approvals: approvals.length,
        open_briefs: openBriefs.length,
        upcoming_meetings: upcoming.length,
      },
      projects: active,
      approvals: approvals.slice(0, 5),
      briefs: openBriefs,
      meetings: { upcoming, recent },
      updates: portal.clientUpdates(clientId, { limit: 6 }),
      documents_count: portal.listDocuments({ clientId, visibleOnly: true }).length,
    };
  });

  // ── Proyectos ─────────────────────────────────────────────────────────────
  route('GET', '/api/client/projects', 'client', ({ account }) => ({
    projects: portal.clientProjectRows(account.client_id).map(portal.clientProject),
  }));

  route('GET', '/api/client/projects/:id', 'client', ({ account, params }) => {
    const row = portal.clientProjectRow(params.id, account.client_id);
    const clientId = account.client_id;
    return {
      project: portal.clientProject(row),
      milestones: portal.milestonesOf(row.id),
      updates: portal.clientUpdates(clientId, { projectId: row.id, limit: 50 }),
      deliverables: portal.listDeliverables({ clientId, projectId: row.id }),
      documents: portal.listDocuments({ clientId, projectId: row.id }),
      meetings: portal.clientMeetings(clientId, { projectId: row.id, limit: 30 }),
      briefs: db.prepare(`${briefs.BRIEF_SELECT} WHERE b.client_id = ? AND b.project_id = ? ORDER BY b.updated_at DESC`).all(clientId, row.id)
        .map((r) => briefs.decorate(r, 'client', { withData: false })),
    };
  });

  // ── Solicitudes (briefs) ──────────────────────────────────────────────────
  const clientBrief = (account, briefId) => briefs.getForClient(briefId, account.client_id);
  const fullBrief = (row) => ({
    brief: briefs.decorate(row, 'client'),
    events: briefs.events(row.id, 'client'),
    versions: briefs.versions(row.id),
    deliverables: portal.listDeliverables({ clientId: row.client_id, briefId: row.id, visibleOnly: true }),
    lead_days: ctx.numberSetting('brief_lead_days', 3),
  });
  /** El cliente solo liga solicitudes a proyectos suyos que ve en el portal. */
  function clientProjectId(account, raw) {
    const projectId = id(raw, 'project_id');
    if (projectId != null && !portal.isClientProject(projectId, account.client_id)) invalid('project_id', 'Proyecto no encontrado.');
    return projectId;
  }

  route('GET', '/api/client/briefs', 'client', ({ account }) => ({
    briefs: db.prepare(`${briefs.BRIEF_SELECT} WHERE b.client_id = ? ORDER BY CASE WHEN b.status IN ('cerrado','cancelado') THEN 1 ELSE 0 END,
      b.updated_at DESC, b.id DESC LIMIT 200`).all(account.client_id).map((r) => briefs.decorate(r, 'client', { withData: false })),
  }));

  route('POST', '/api/client/briefs', 'client', ({ account, body }) => {
    guardWrite(account);
    const drafts = db.prepare("SELECT COUNT(*) n FROM briefs WHERE client_id = ? AND status = 'borrador'").get(account.client_id).n;
    if (drafts >= MAX_OPEN_CLIENT_DRAFTS) fail(409, 'too_many_drafts', { max: MAX_OPEN_CLIENT_DRAFTS });
    const projectId = clientProjectId(account, body.project_id);
    const title = briefs.readTitle(body.title);
    const raw = body.data ?? {};
    if (typeof raw !== 'object' || Array.isArray(raw)) invalid('data', 'Formato inválido.');
    const data = briefs.readData({ brand: account.client_name, ...raw });
    const owners = db.prepare('SELECT c.owner_id client_owner, p.owner_id project_owner FROM clients c LEFT JOIN projects p ON p.id = ? WHERE c.id = ?')
      .get(projectId, account.client_id);
    const briefId = briefs.create({
      clientId: account.client_id, projectId, title, data, ownerId: owners.project_owner ?? owners.client_owner ?? null, actor: asClient(account),
    });
    return fullBrief(briefs.getForTeam(briefId));
  });

  route('GET', '/api/client/briefs/:id', 'client', ({ account, params }) => fullBrief(clientBrief(account, params.id)));

  route('PATCH', '/api/client/briefs/:id', 'client', ({ account, body, params }) => {
    guardWrite(account);
    const row = clientBrief(account, params.id);
    briefs.checkFresh(row, body);
    const changes = {};
    if (has(body, 'title')) changes.title = briefs.readTitle(body.title);
    if (has(body, 'data')) changes.data = briefs.readData(body.data);
    if (has(body, 'project_id')) changes.project_id = clientProjectId(account, body.project_id);
    // El cliente solo toca contenido: fuera de borrador/observado todo queda congelado.
    if (!Object.keys(changes).length) return fullBrief(row);
    if (!['borrador', 'observado'].includes(row.status)) fail(409, 'brief_locked');
    briefs.update(row, changes, asClient(account));
    return fullBrief(clientBrief(account, row.id));
  });

  route('POST', '/api/client/briefs/:id/submit', 'client', ({ account, body, params }) => {
    guardWrite(account);
    const row = clientBrief(account, params.id);
    briefs.checkFresh(row, body);
    const result = briefs.submit(row, asClient(account));
    return { ...fullBrief(clientBrief(account, row.id)), ...result };
  });

  route('POST', '/api/client/briefs/:id/cancel', 'client', ({ account, body, params }) => {
    guardWrite(account);
    const row = clientBrief(account, params.id);
    briefs.clientCancel(row, account, body.note);
    return fullBrief(clientBrief(account, row.id));
  });

  route('POST', '/api/client/briefs/:id/comments', 'client', ({ account, body, params }) => {
    guardWrite(account);
    const row = clientBrief(account, params.id);
    briefs.comment(row, asClient(account), body.body);
    return { events: briefs.events(row.id, 'client') };
  });

  route('GET', '/api/client/briefs/:id/versions/:version', 'client', ({ account, params }) => {
    const row = clientBrief(account, params.id);
    if (params.version < 1) fail(404, 'not_found');
    return { version: briefs.version(row, params.version), brief: briefs.decorate(row, 'client', { withData: false }) };
  });

  // ── Entregables ───────────────────────────────────────────────────────────
  route('GET', '/api/client/deliverables', 'client', ({ account }) => ({
    deliverables: portal.listDeliverables({ clientId: account.client_id, visibleOnly: true }),
    can_approve: !!account.can_approve,
  }));

  route('GET', '/api/client/deliverables/:id', 'client', ({ account, params }) => {
    const d = portal.getClientDeliverable(params.id, account.client_id);
    return { deliverable: d, events: portal.deliverableEvents(d.id), can_approve: !!account.can_approve };
  });

  route('POST', '/api/client/deliverables/:id/decision', 'client', ({ account, body, params }) => {
    guardWrite(account);
    const d = portal.getClientDeliverable(params.id, account.client_id);
    if (!account.can_approve) fail(403, 'approval_not_allowed');
    if (d.status !== 'en_revision') fail(409, 'already_decided', { status: d.status });
    const decision = body.decision;
    if (decision !== 'aprobado' && decision !== 'cambios') invalid('decision', 'Elegí aprobar o pedir cambios.');
    const note = text(body.note, 'note', { max: 2000, min: decision === 'cambios' ? 5 : 0, required: decision === 'cambios' });
    // Se aprueba exactamente la versión que el cliente estaba viendo.
    if (has(body, 'version') && body.version !== d.version) fail(409, 'stale_version', { version: d.version });
    const at = ctx.nowIso();
    transaction(db, () => {
      db.prepare('UPDATE deliverables SET status = ?, decided_by_account = ?, decided_at = ?, decision_note = ?, updated_at = ? WHERE id = ?')
        .run(decision, account.id, at, note, at, d.id);
      db.prepare(`INSERT INTO deliverable_events (deliverable_id, version, actor_type, user_id, account_id, kind, note, created_at)
        VALUES (?, ?, 'cliente', NULL, ?, ?, ?, ?)`).run(d.id, d.version, account.id, decision, note, at);
    });
    const verb = decision === 'aprobado' ? 'aprobó' : 'pidió cambios en';
    ctx.log(null, 'deliverable', d.id, decision === 'aprobado' ? 'client_approved' : 'client_changes',
      `${account.name} (${account.client_name}) ${verb} "${d.title}" v${d.version}${note ? `: ${note}` : ''}`);
    const project = d.project_id ? db.prepare('SELECT owner_id FROM projects WHERE id = ?').get(d.project_id) : null;
    const owner = db.prepare('SELECT owner_id FROM clients WHERE id = ?').get(d.client_id);
    portal.notifyTeam([d.shared_by, project?.owner_id, owner?.owner_id], {
      kind: 'deliverable',
      title: `${account.client_name} ${verb} "${d.title}"`,
      body: note ?? `Versión ${d.version} · ${DELIVERABLE_STATUS[decision].label}`,
      link: d.project_id ? `/proyectos/${d.project_id}` : `/clientes/${d.client_id}`,
    });
    portal.notifyClient(d.client_id, {
      kind: 'deliverable', title: `${account.name} ${verb} "${d.title}"`, body: note, link: `/cliente/entregables/${d.id}`,
    }, { exceptAccountId: account.id });
    return { deliverable: portal.getClientDeliverable(d.id, account.client_id), events: portal.deliverableEvents(d.id) };
  });

  // ── Documentos ────────────────────────────────────────────────────────────
  route('GET', '/api/client/documents', 'client', ({ account }) => ({
    documents: portal.listDocuments({ clientId: account.client_id, visibleOnly: true }),
  }));

  // ── Avisos ────────────────────────────────────────────────────────────────
  route('GET', '/api/client/notifications', 'client', ({ account }) => ({
    notifications: db.prepare('SELECT id, kind, title, body, link, read_at, created_at FROM client_notifications WHERE account_id = ? ORDER BY created_at DESC, id DESC LIMIT 80')
      .all(account.id),
    unread: unreadCount(account),
  }));

  route('POST', '/api/client/notifications/read', 'client', ({ account, body }) => {
    const at = ctx.nowIso();
    if (body.all === true) {
      db.prepare('UPDATE client_notifications SET read_at = ? WHERE account_id = ? AND read_at IS NULL').run(at, account.id);
    } else {
      if (!Array.isArray(body.ids) || body.ids.length > 200) invalid('ids', 'Lista inválida.');
      const stmt = db.prepare('UPDATE client_notifications SET read_at = ? WHERE id = ? AND account_id = ? AND read_at IS NULL');
      for (const raw of body.ids) stmt.run(at, id(raw, 'ids', { required: true }), account.id);
    }
    return { unread: unreadCount(account) };
  });
}
