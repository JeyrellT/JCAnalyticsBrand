// ============================================================================
//  server/routes/portal-admin.mjs
//  Lo que el EQUIPO administra del portal de clientes: accesos (cuentas de
//  cliente), documentos compartidos, hitos de proyecto y entregables para
//  aprobación. Cada cosa ligada a un cliente se valida contra ESE cliente.
// ============================================================================

import { DELIVERABLE_STATUS, DOCUMENT_CATEGORIES, MILESTONE_STATUS } from '../../shared/client-portal.js';
import { fail, invalid, has, text, oneOf, id, email, url, dateOnly, number } from '../http.mjs';
import { hashPassword, temporaryPassword } from '../auth.mjs';
import { transaction } from '../schema.mjs';
import { createPortalHelpers } from './portal-common.mjs';

/** Quién puede dar, cambiar o quitar accesos de un cliente: admin, socios y quien lleva la relación. */
export const canManagePortal = (user, client) => user.role === 'admin' || user.role === 'socio' || client.owner_id === user.id;

export function portalAdminRoutes(route, ctx) {
  const { db } = ctx;
  const portal = createPortalHelpers(ctx);

  const getClientRow = (clientId) => db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId) ?? fail(404, 'not_found');
  const bool = (value, field, fallback) => {
    if (value == null) return fallback;
    if (typeof value !== 'boolean') invalid(field, 'Debe ser sí o no.');
    return value;
  };

  // ── Accesos al portal ─────────────────────────────────────────────────────
  /** Un correo identifica a UNA sola persona en todo el portal (equipo o cliente). */
  function emailFree(mail, exceptAccountId = 0) {
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(mail)) invalid('email', 'Ese correo pertenece a alguien del equipo.');
    if (db.prepare('SELECT 1 FROM client_accounts WHERE email = ? AND id <> ?').get(mail, exceptAccountId)) invalid('email', 'Ya existe un acceso con ese correo.');
  }
  const getAccount = (accountId) => db.prepare('SELECT * FROM client_accounts WHERE id = ?').get(accountId) ?? fail(404, 'not_found');

  route('GET', '/api/clients/:id/accounts', 'user', ({ params }) => {
    const client = getClientRow(params.id);
    return { accounts: portal.accountsOf(client.id) };
  });

  route('POST', '/api/clients/:id/accounts', 'user', async ({ user, body, params }) => {
    const client = getClientRow(params.id);
    if (!canManagePortal(user, client)) fail(403, 'forbidden');
    const name = text(body.name, 'name', { max: 80, min: 2, required: true });
    const mail = email(body.email);
    emailFree(mail);
    const phone = text(body.phone, 'phone', { max: 30 });
    const title = text(body.title, 'title', { max: 80 });
    const canApprove = bool(body.can_approve, 'can_approve', true);
    const temp = temporaryPassword();
    const { lastInsertRowid } = db.prepare(`INSERT INTO client_accounts (client_id, email, name, phone, title, can_approve, password_hash,
      must_change_password, active, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)`).run(
      client.id, mail, name, phone, title, canApprove ? 1 : 0, await hashPassword(temp), user.id, ctx.nowIso(),
    );
    const accountId = Number(lastInsertRowid);
    ctx.log(user.id, 'client_account', accountId, 'created', `${user.name} dio acceso al portal a ${name} (${client.name})`);
    db.prepare('INSERT INTO client_notifications (account_id, kind, title, body, link, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
      accountId, 'cuenta', 'Bienvenida al portal de JC Analytics', 'Aquí ves tus proyectos, solicitudes, entregables y documentos.', '/cliente', ctx.nowIso(),
    );
    return { account: portal.publicAccount(getAccount(accountId)), temporary_password: temp };
  });

  route('PATCH', '/api/client-accounts/:id', 'user', ({ user, body, params }) => {
    const current = getAccount(params.id);
    const client = getClientRow(current.client_id);
    if (!canManagePortal(user, client)) fail(403, 'forbidden');
    const next = {
      name: has(body, 'name') ? text(body.name, 'name', { max: 80, min: 2, required: true }) : current.name,
      email: has(body, 'email') ? email(body.email) : current.email,
      phone: has(body, 'phone') ? text(body.phone, 'phone', { max: 30 }) : current.phone,
      title: has(body, 'title') ? text(body.title, 'title', { max: 80 }) : current.title,
      can_approve: has(body, 'can_approve') ? (bool(body.can_approve, 'can_approve', true) ? 1 : 0) : current.can_approve,
      active: has(body, 'active') ? (bool(body.active, 'active', true) ? 1 : 0) : current.active,
    };
    const emailChanged = next.email.toLowerCase() !== current.email.toLowerCase();
    if (emailChanged) emailFree(next.email, current.id);
    db.prepare('UPDATE client_accounts SET name = ?, email = ?, phone = ?, title = ?, can_approve = ?, active = ? WHERE id = ?')
      .run(next.name, next.email, next.phone, next.title, next.can_approve, next.active, current.id);
    // Quitar el acceso o cambiar el correo cierra al instante las sesiones abiertas.
    if (!next.active || emailChanged) db.prepare('DELETE FROM client_sessions WHERE account_id = ?').run(current.id);
    const changes = [];
    if (next.active !== current.active) changes.push(next.active ? 'reactivado' : 'acceso quitado');
    if (emailChanged) changes.push('correo nuevo');
    if (next.can_approve !== current.can_approve) changes.push(next.can_approve ? 'puede aprobar' : 'sin permiso de aprobación');
    ctx.log(user.id, 'client_account', current.id, 'updated', `${user.name} actualizó el acceso de ${next.name} (${client.name})${changes.length ? `: ${changes.join(', ')}` : ''}`);
    return { account: portal.publicAccount(getAccount(current.id)) };
  });

  route('POST', '/api/client-accounts/:id/reset-password', 'user', async ({ user, params }) => {
    const current = getAccount(params.id);
    const client = getClientRow(current.client_id);
    if (!canManagePortal(user, client)) fail(403, 'forbidden');
    const temp = temporaryPassword();
    db.prepare('UPDATE client_accounts SET password_hash = ?, must_change_password = 1 WHERE id = ?').run(await hashPassword(temp), current.id);
    db.prepare('DELETE FROM client_sessions WHERE account_id = ?').run(current.id);
    ctx.log(user.id, 'client_account', current.id, 'password_reset', `${user.name} restableció la contraseña de ${current.name} (${client.name})`);
    return { temporary_password: temp };
  });

  // ── Documentos compartidos ────────────────────────────────────────────────
  const getDocument = (documentId) => db.prepare('SELECT * FROM client_documents WHERE id = ?').get(documentId) ?? fail(404, 'not_found');
  function readDocument(body, current, clientId) {
    const pick = (key, fn) => (has(body, key) ? fn(body[key]) : current[key] ?? null);
    const d = {
      title: pick('title', (v) => text(v, 'title', { max: 120, min: 2, required: true })),
      url: pick('url', (v) => url(v, 'url')),
      category: pick('category', (v) => oneOf(v, 'category', DOCUMENT_CATEGORIES, { fallback: 'otro' })) ?? 'otro',
      note: pick('note', (v) => text(v, 'note', { max: 500 })),
      project_id: pick('project_id', (v) => portal.projectOfClient(id(v, 'project_id'), clientId)?.id ?? null),
    };
    if (!d.title) invalid('title', 'Campo requerido.');
    if (!d.url) invalid('url', 'Pegá el enlace del documento (https://…).');
    return d;
  }

  route('GET', '/api/clients/:id/documents', 'user', ({ params }) => {
    const client = getClientRow(params.id);
    return { documents: portal.listDocuments({ clientId: client.id }) };
  });

  route('POST', '/api/clients/:id/documents', 'user', ({ user, body, params }) => {
    const client = getClientRow(params.id);
    const d = readDocument(body, {}, client.id);
    const at = ctx.nowIso();
    const { lastInsertRowid } = db.prepare(`INSERT INTO client_documents (client_id, project_id, title, url, category, note, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(client.id, d.project_id, d.title, d.url, d.category, d.note, user.id, at, at);
    ctx.log(user.id, 'client', client.id, 'document_shared', `${user.name} compartió el documento "${d.title}" con ${client.name}`);
    portal.notifyClient(client.id, { kind: 'documento', title: `Nuevo documento: ${d.title}`, body: DOCUMENT_CATEGORIES[d.category].label, link: '/cliente/documentos' });
    return { document: portal.listDocuments({ clientId: client.id }).find((x) => x.id === Number(lastInsertRowid)) };
  });

  route('PATCH', '/api/client-documents/:id', 'user', ({ user, body, params }) => {
    const current = getDocument(params.id);
    const d = readDocument(body, current, current.client_id);
    db.prepare('UPDATE client_documents SET project_id = ?, title = ?, url = ?, category = ?, note = ?, updated_at = ? WHERE id = ?')
      .run(d.project_id, d.title, d.url, d.category, d.note, ctx.nowIso(), current.id);
    ctx.log(user.id, 'client', current.client_id, 'document_updated', `${user.name} actualizó el documento "${d.title}"`);
    return { document: portal.listDocuments({ clientId: current.client_id }).find((x) => x.id === current.id) };
  });

  route('DELETE', '/api/client-documents/:id', 'user', ({ user, params }) => {
    const current = getDocument(params.id);
    db.prepare('DELETE FROM client_documents WHERE id = ?').run(current.id);
    ctx.log(user.id, 'client', current.client_id, 'document_removed', `${user.name} quitó el documento "${current.title}" del portal`);
    return { ok: true };
  });

  // ── Hitos (etapas) de proyecto ────────────────────────────────────────────
  const getProjectRow = (projectId) => db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) ?? fail(404, 'not_found');
  const getMilestone = (milestoneId) => db.prepare('SELECT * FROM project_milestones WHERE id = ?').get(milestoneId) ?? fail(404, 'not_found');
  function readMilestone(body, current) {
    const pick = (key, fn) => (has(body, key) ? fn(body[key]) : current[key] ?? null);
    const m = {
      title: pick('title', (v) => text(v, 'title', { max: 120, min: 2, required: true })),
      description: pick('description', (v) => text(v, 'description', { max: 1000 })),
      due_date: pick('due_date', (v) => dateOnly(v, 'due_date')),
      status: pick('status', (v) => oneOf(v, 'status', MILESTONE_STATUS, { fallback: 'pendiente' })) ?? 'pendiente',
      position: pick('position', (v) => number(v, 'position', { min: -1e9, max: 1e9 })),
    };
    if (!m.title) invalid('title', 'Campo requerido.');
    return m;
  }
  /** Avisa al cliente cuando se completa una etapa de un proyecto que él ve. */
  function announceMilestone(project, milestone) {
    if (!project.client_id || project.kind !== 'cliente' || project.status === 'prospecto') return;
    portal.notifyClient(project.client_id, {
      kind: 'avance', title: `Etapa completada: ${milestone.title}`, body: project.name, link: `/cliente/proyectos/${project.id}`,
    });
  }

  route('GET', '/api/projects/:id/milestones', 'user', ({ params }) => ({ milestones: portal.milestonesOf(getProjectRow(params.id).id) }));

  route('POST', '/api/projects/:id/milestones', 'user', ({ user, body, params }) => {
    const project = getProjectRow(params.id);
    const m = readMilestone(body, {});
    const at = ctx.nowIso();
    const position = m.position ?? (db.prepare('SELECT MAX(position) p FROM project_milestones WHERE project_id = ?').get(project.id).p ?? 0) + 1;
    db.prepare(`INSERT INTO project_milestones (project_id, title, description, due_date, status, position, completed_at, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(project.id, m.title, m.description, m.due_date, m.status, position,
      m.status === 'completado' ? at : null, user.id, at, at);
    ctx.log(user.id, 'project', project.id, 'milestone_added', `${user.name} agregó la etapa "${m.title}" a ${project.name}`);
    if (m.status === 'completado') announceMilestone(project, m);
    return { milestones: portal.milestonesOf(project.id) };
  });

  route('PATCH', '/api/milestones/:id', 'user', ({ user, body, params }) => {
    const current = getMilestone(params.id);
    const project = getProjectRow(current.project_id);
    const m = readMilestone(body, current);
    const completes = m.status === 'completado' && current.status !== 'completado';
    const completedAt = m.status === 'completado' ? current.completed_at ?? ctx.nowIso() : null;
    db.prepare('UPDATE project_milestones SET title = ?, description = ?, due_date = ?, status = ?, position = ?, completed_at = ?, updated_at = ? WHERE id = ?')
      .run(m.title, m.description, m.due_date, m.status, m.position ?? current.position, completedAt, ctx.nowIso(), current.id);
    if (m.status !== current.status) {
      ctx.log(user.id, 'project', project.id, 'milestone_status', `${user.name} marcó la etapa "${m.title}" como ${MILESTONE_STATUS[m.status].label.toLowerCase()} (${project.name})`);
    }
    if (completes) announceMilestone(project, m);
    return { milestones: portal.milestonesOf(project.id) };
  });

  route('DELETE', '/api/milestones/:id', 'user', ({ user, params }) => {
    const current = getMilestone(params.id);
    db.prepare('DELETE FROM project_milestones WHERE id = ?').run(current.id);
    ctx.log(user.id, 'project', current.project_id, 'milestone_removed', `${user.name} quitó la etapa "${current.title}"`);
    return { milestones: portal.milestonesOf(current.project_id) };
  });

  // ── Entregables para aprobación del cliente ───────────────────────────────
  const insertDeliverableEvent = db.prepare(`INSERT INTO deliverable_events (deliverable_id, version, actor_type, user_id, account_id, kind, note, created_at)
    VALUES (?, ?, 'equipo', ?, NULL, ?, ?, ?)`);
  const deliverableLink = (deliverableId) => `/cliente/entregables/${deliverableId}`;

  route('GET', '/api/deliverables', 'user', ({ query }) => ({
    deliverables: portal.listDeliverables({
      clientId: id(query.get('client_id'), 'client_id'),
      projectId: id(query.get('project_id'), 'project_id'),
      status: oneOf(query.get('status'), 'status', DELIVERABLE_STATUS),
    }),
  }));

  route('GET', '/api/deliverables/:id', 'user', ({ params }) => {
    const d = portal.getDeliverable(params.id);
    return { deliverable: d, events: portal.deliverableEvents(d.id) };
  });

  route('POST', '/api/deliverables', 'user', ({ user, body }) => {
    const clientId = id(body.client_id, 'client_id', { required: true });
    const client = db.prepare('SELECT id, name FROM clients WHERE id = ?').get(clientId) ?? invalid('client_id', 'Cliente no encontrado.');
    const project = portal.projectOfClient(id(body.project_id, 'project_id'), client.id);
    const brief = portal.briefOfClient(id(body.brief_id, 'brief_id'), client.id);
    const title = text(body.title, 'title', { max: 120, min: 2, required: true });
    const description = text(body.description, 'description', { max: 2000 });
    const link = url(body.url, 'url');
    const note = text(body.note, 'note', { max: 1000 });
    const at = ctx.nowIso();
    const deliverableId = transaction(db, () => {
      const { lastInsertRowid } = db.prepare(`INSERT INTO deliverables (client_id, project_id, brief_id, title, description, url, version, status,
        shared_by, shared_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, 'en_revision', ?, ?, ?, ?)`).run(
        client.id, project?.id ?? null, brief?.id ?? null, title, description, link, user.id, at, at, at,
      );
      const newId = Number(lastInsertRowid);
      insertDeliverableEvent.run(newId, 1, user.id, 'compartido', note, at);
      return newId;
    });
    ctx.log(user.id, 'deliverable', deliverableId, 'shared', `${user.name} compartió "${title}" con ${client.name} para aprobación`);
    portal.notifyClient(client.id, { kind: 'deliverable', title: `Nuevo entregable para revisar: ${title}`, body: project?.name ?? brief?.code ?? null, link: deliverableLink(deliverableId) });
    return { deliverable: portal.getDeliverable(deliverableId) };
  });

  route('PATCH', '/api/deliverables/:id', 'user', ({ user, body, params }) => {
    const current = portal.getDeliverable(params.id);
    const title = has(body, 'title') ? text(body.title, 'title', { max: 120, min: 2, required: true }) : current.title;
    const description = has(body, 'description') ? text(body.description, 'description', { max: 2000 }) : current.description;
    const link = has(body, 'url') ? url(body.url, 'url') : current.url;
    const note = text(body.note, 'note', { max: 1000 });
    if (has(body, 'new_version') && typeof body.new_version !== 'boolean') invalid('new_version', 'Debe ser sí o no.');
    // Cambiar el enlace SIEMPRE es una versión nueva: lo aprobado nunca cambia en silencio.
    const newVersion = body.new_version === true || link !== current.url;
    const at = ctx.nowIso();
    transaction(db, () => {
      if (newVersion) {
        db.prepare(`UPDATE deliverables SET title = ?, description = ?, url = ?, version = version + 1, status = 'en_revision', shared_by = ?, shared_at = ?,
          decided_by_account = NULL, decided_at = NULL, decision_note = NULL, updated_at = ? WHERE id = ?`).run(title, description, link, user.id, at, at, current.id);
        insertDeliverableEvent.run(current.id, current.version + 1, user.id, 'nueva_version', note, at);
      } else {
        db.prepare('UPDATE deliverables SET title = ?, description = ?, updated_at = ? WHERE id = ?').run(title, description, at, current.id);
      }
    });
    if (newVersion) {
      ctx.log(user.id, 'deliverable', current.id, 'new_version', `${user.name} subió la versión ${current.version + 1} de "${title}" (${current.client_name})`);
      portal.notifyClient(current.client_id, { kind: 'deliverable', title: `Versión ${current.version + 1} lista para revisar: ${title}`, body: note, link: deliverableLink(current.id) });
    }
    return { deliverable: portal.getDeliverable(current.id), events: portal.deliverableEvents(current.id) };
  });

  route('DELETE', '/api/deliverables/:id', 'user', ({ user, params }) => {
    const current = portal.getDeliverable(params.id);
    // Lo que el cliente ya decidió (aprobó o pidió cambios) queda como registro: no se borra.
    const decided = db.prepare("SELECT 1 FROM deliverable_events WHERE deliverable_id = ? AND kind IN ('aprobado','cambios')").get(current.id);
    if (decided) fail(409, 'deliverable_locked');
    db.prepare('DELETE FROM deliverables WHERE id = ?').run(current.id);
    ctx.log(user.id, 'deliverable', current.id, 'removed', `${user.name} retiró el entregable "${current.title}" (${current.client_name})`);
    return { ok: true };
  });
}
