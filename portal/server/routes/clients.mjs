// ============================================================================
//  server/routes/clients.mjs
//  Directorio de clientes y prospectos: ficha, proyectos, citas y avances.
//  No hay DELETE: para dar de baja se usa status 'inactivo'.
// ============================================================================

import { CLIENT_STATUS } from '../../shared/catalog.js';
import { fail, invalid, has, text, oneOf, id, email } from '../http.mjs';
import { transaction } from '../schema.mjs';
import { createHelpers, sameName } from './common.mjs';
import { createPortalHelpers } from './portal-common.mjs';
import { createBriefService } from './brief-service.mjs';
import { canManagePortal } from './portal-admin.mjs';

export function clientRoutes(route, ctx) {
  const { db } = ctx;
  const { keepOrCheck, PROJECT_SELECT, decorateProject, APPOINTMENT_SELECT, decorateAppointment, listClients, getClient } = createHelpers(ctx);
  const portal = createPortalHelpers(ctx);
  const briefs = createBriefService(ctx, portal);

  const optionalEmail = (v, field) => (v == null || (typeof v === 'string' && v.trim() === '') ? null : email(v, field));

  function readClientBody(body, current = {}) {
    const pick = (key, fn) => (has(body, key) ? fn(body[key]) : current[key] ?? null);
    const c = {
      name: pick('name', (v) => text(v, 'name', { max: 120, min: 2, required: true })),
      sector: pick('sector', (v) => text(v, 'sector', { max: 80 })),
      status: pick('status', (v) => oneOf(v, 'status', CLIENT_STATUS, { fallback: current.status ?? 'activo' })) ?? 'activo',
      contact_name: pick('contact_name', (v) => text(v, 'contact_name', { max: 120 })),
      contact_phone: pick('contact_phone', (v) => text(v, 'contact_phone', { max: 30 })),
      contact_email: pick('contact_email', (v) => optionalEmail(v, 'contact_email')),
      notes: pick('notes', (v) => text(v, 'notes', { max: 4000 })),
      owner_id: pick('owner_id', (v) => keepOrCheck(id(v, 'owner_id'), current.owner_id, 'owner_id')),
    };
    if (!c.name) invalid('name', 'Campo requerido.');
    // Nombre único sin distinguir mayúsculas (se compara en JS para cubrir tildes: "Ñ" / "ñ").
    const clash = db.prepare('SELECT id, name FROM clients WHERE id <> ?').all(current.id ?? 0).find((r) => sameName(r.name, c.name));
    if (clash) invalid('name', 'Ya existe un cliente con ese nombre.');
    return c;
  }

  route('GET', '/api/clients', 'user', ({ query }) => {
    const status = oneOf(query.get('status'), 'status', CLIENT_STATUS);
    return { clients: status ? listClients('c.status = ?', [status]) : listClients() };
  });

  route('POST', '/api/clients', 'user', ({ user, body }) => {
    // Sin owner_id explícito, lleva la relación quien registra al cliente (igual que en proyectos).
    const c = readClientBody(body, { status: 'activo', owner_id: user.id });
    const at = ctx.nowIso();
    const { lastInsertRowid } = db.prepare(`INSERT INTO clients (name, sector, status, contact_name, contact_phone, contact_email, notes, owner_id,
      created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      c.name, c.sector, c.status, c.contact_name, c.contact_phone, c.contact_email, c.notes, c.owner_id, user.id, at, at,
    );
    const clientId = Number(lastInsertRowid);
    ctx.log(user.id, 'client', clientId, 'created', `${user.name} registró ${c.status === 'prospecto' ? 'el prospecto' : 'el cliente'} ${c.name}`);
    return { client: getClient(clientId) };
  });

  route('GET', '/api/clients/:id', 'user', ({ user, params }) => {
    const client = getClient(params.id);
    const projects = db.prepare(`${PROJECT_SELECT} WHERE p.client_id = ? ORDER BY p.archived, p.updated_at DESC`).all(client.id);
    const appointments = db.prepare(`${APPOINTMENT_SELECT}
      WHERE a.client_id = ? OR a.project_id IN (SELECT id FROM projects WHERE client_id = ?) ORDER BY a.starts_at DESC LIMIT 50`).all(client.id, client.id);
    const updates = db.prepare(`SELECT pu.*, u.name user_name, u.color user_color, p.name project_name FROM project_updates pu
      JOIN projects p ON p.id = pu.project_id JOIN users u ON u.id = pu.user_id
      WHERE p.client_id = ? ORDER BY pu.created_at DESC, pu.id DESC LIMIT 20`).all(client.id);
    // v5: lo que este cliente ve en su portal (accesos, briefs, entregables y documentos).
    const portalInfo = {
      accounts: portal.accountsOf(client.id),
      can_manage: canManagePortal(user, client),
      briefs: db.prepare(`${briefs.BRIEF_SELECT} WHERE b.client_id = ? ORDER BY b.updated_at DESC LIMIT 50`).all(client.id)
        .map((r) => briefs.decorate(r, 'team', { withData: false })),
      deliverables: portal.listDeliverables({ clientId: client.id }),
      documents: portal.listDocuments({ clientId: client.id }),
    };
    return { client, projects: projects.map(decorateProject), appointments: appointments.map(decorateAppointment), updates, portal: portalInfo };
  });

  route('PATCH', '/api/clients/:id', 'user', ({ user, body, params }) => {
    const current = db.prepare('SELECT * FROM clients WHERE id = ?').get(params.id) ?? fail(404, 'not_found');
    const c = readClientBody(body, current);
    const renamed = c.name !== current.name;
    transaction(db, () => {
      db.prepare(`UPDATE clients SET name = ?, sector = ?, status = ?, contact_name = ?, contact_phone = ?, contact_email = ?, notes = ?,
        owner_id = ?, updated_at = ? WHERE id = ?`).run(
        c.name, c.sector, c.status, c.contact_name, c.contact_phone, c.contact_email, c.notes, c.owner_id, ctx.nowIso(), current.id,
      );
      // Los proyectos enlazados muestran siempre el nombre vigente de la ficha.
      if (renamed) db.prepare('UPDATE projects SET client = ? WHERE client_id = ?').run(c.name, current.id);
    });
    const changes = [];
    if (renamed) changes.push(`antes ${current.name}`);
    if (c.status !== current.status) changes.push(`estado → ${CLIENT_STATUS[c.status].label}`);
    ctx.log(user.id, 'client', current.id, 'updated', `${user.name} actualizó el cliente ${c.name}${changes.length ? ` (${changes.join(', ')})` : ''}`);
    return { client: getClient(current.id) };
  });
}
