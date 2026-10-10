// ============================================================================
//  server/routes/work.mjs
//  Portal de proyectos, tablero kanban y agenda de citas.
// ============================================================================

import {
  PROJECT_KINDS, PROJECT_STATUS, SERVICES, UPDATE_CHANNELS, TASK_STATUS, TASK_PRIORITY,
  APPOINTMENT_KINDS, APPOINTMENT_STATUS, SLA_STATUSES, canInvest,
} from '../../shared/catalog.js';
import { fail, invalid, has, text, oneOf, dateOnly, dateTime, id, minorAmount, url } from '../http.mjs';
import { transaction } from '../schema.mjs';

const SUPPORT_DAYS = 30;
const DAY = 86_400_000;

export function workRoutes(route, ctx) {
  const { db } = ctx;
  const getProject = (projectId) => db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) ?? fail(404, 'not_found');
  const userExists = (userId, field) => {
    if (userId == null) return null;
    if (!db.prepare('SELECT 1 FROM users WHERE id = ? AND active = 1').get(userId)) invalid(field, 'Persona no encontrada.');
    return userId;
  };
  /** Valida solo si cambia: un responsable ya asignado y luego desactivado no impide editar. */
  const keepOrCheck = (value, current, field) => (value != null && value === current ? value : userExists(value, field));
  const projectExists = (projectId, field = 'project_id') => {
    if (projectId == null) return null;
    if (!db.prepare('SELECT 1 FROM projects WHERE id = ?').get(projectId)) invalid(field, 'Proyecto no encontrado.');
    return projectId;
  };

  function decorateProject(p) {
    const counts = db.prepare(`SELECT COUNT(*) total,
        SUM(CASE WHEN status = 'hecho' THEN 1 ELSE 0 END) done,
        SUM(CASE WHEN status <> 'hecho' AND due_date IS NOT NULL AND due_date < ? THEN 1 ELSE 0 END) overdue
      FROM tasks WHERE project_id = ?`).get(ctx.today(), p.id);
    const supportEnds = p.delivered_at ? new Date(new Date(`${p.delivered_at}T00:00:00Z`).getTime() + SUPPORT_DAYS * DAY).toISOString().slice(0, 10) : null;
    return {
      ...p,
      archived: !!p.archived,
      tasks_total: counts.total ?? 0,
      tasks_done: counts.done ?? 0,
      tasks_overdue: counts.overdue ?? 0,
      progress: counts.total ? (counts.done ?? 0) / counts.total : 0,
      support_ends: supportEnds,
      ...ctx.projectSla(p),
    };
  }

  function readProjectBody(body, current = {}) {
    const pick = (key, fn) => (has(body, key) ? fn(body[key]) : current[key] ?? null);
    const out = {
      name: pick('name', (v) => text(v, 'name', { max: 120, min: 2, required: true })),
      client: pick('client', (v) => text(v, 'client', { max: 120 })),
      kind: pick('kind', (v) => oneOf(v, 'kind', PROJECT_KINDS, { required: true })),
      service: pick('service', (v) => oneOf(v, 'service', SERVICES)),
      status: pick('status', (v) => oneOf(v, 'status', PROJECT_STATUS, { required: true })),
      owner_id: pick('owner_id', (v) => keepOrCheck(id(v, 'owner_id'), current.owner_id, 'owner_id')),
      start_date: pick('start_date', (v) => dateOnly(v, 'start_date')),
      due_date: pick('due_date', (v) => dateOnly(v, 'due_date')),
      delivered_at: pick('delivered_at', (v) => dateOnly(v, 'delivered_at')),
      value_amount: pick('value_amount', (v) => minorAmount(v, 'value_amount', { allowZero: true })),
      currency: pick('currency', (v) => oneOf(v, 'currency', ['CRC', 'USD'], { fallback: 'CRC' })) ?? 'CRC',
      description: pick('description', (v) => text(v, 'description', { max: 4000 })),
      contact_name: pick('contact_name', (v) => text(v, 'contact_name', { max: 120 })),
      contact_phone: pick('contact_phone', (v) => text(v, 'contact_phone', { max: 30 })),
      url: pick('url', (v) => url(v, 'url')),
    };
    if (!out.kind) invalid('kind', 'Campo requerido.');
    if (!out.status) invalid('status', 'Campo requerido.');
    if (out.start_date && out.due_date && out.due_date < out.start_date) invalid('due_date', 'La fecha de entrega es anterior al inicio.');
    // Al pasar a "entregado" o "soporte" se fija la fecha de entrega (arranca el soporte de 30 días).
    if (['entregado', 'soporte'].includes(out.status) && !out.delivered_at) out.delivered_at = ctx.today();
    return out;
  }

  // ── Proyectos ─────────────────────────────────────────────────────────────
  route('GET', '/api/projects', 'user', ({ query }) => {
    const archived = query.get('archived') === '1' ? 1 : 0;
    const rows = db.prepare(`SELECT p.*, u.name owner_name, u.color owner_color FROM projects p
      LEFT JOIN users u ON u.id = p.owner_id WHERE p.archived = ? ORDER BY p.updated_at DESC`).all(archived);
    return { projects: rows.map(decorateProject) };
  });

  route('POST', '/api/projects', 'user', ({ user, body }) => {
    const p = readProjectBody(body, { status: 'en_curso', kind: 'cliente', currency: 'CRC', owner_id: user.id });
    const at = ctx.nowIso();
    const { lastInsertRowid } = db.prepare(`INSERT INTO projects (name, client, kind, service, status, owner_id, start_date, due_date,
      delivered_at, value_amount, currency, description, contact_name, contact_phone, url, sla_started_at, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      p.name, p.client, p.kind, p.service, p.status, p.owner_id, p.start_date, p.due_date, p.delivered_at,
      p.value_amount, p.currency, p.description, p.contact_name, p.contact_phone, p.url, SLA_STATUSES.includes(p.status) ? at : null, user.id, at, at,
    );
    const projectId = Number(lastInsertRowid);
    ctx.log(user.id, 'project', projectId, 'created', `${user.name} creó el proyecto ${p.name}`);
    if (p.owner_id) ctx.notify([p.owner_id], user.id, { kind: 'project', title: `Sos responsable de ${p.name}`, body: `${user.name} te asignó el proyecto.`, link: `/proyectos/${projectId}` });
    return { project: decorateProject(getProject(projectId)) };
  });

  route('GET', '/api/projects/:id', 'user', ({ user, params }) => {
    const p = db.prepare(`SELECT p.*, u.name owner_name, u.color owner_color FROM projects p LEFT JOIN users u ON u.id = p.owner_id WHERE p.id = ?`).get(params.id)
      ?? fail(404, 'not_found');
    return {
      project: decorateProject(p),
      tasks: db.prepare(`SELECT t.*, u.name assignee_name, u.color assignee_color FROM tasks t LEFT JOIN users u ON u.id = t.assignee_id
        WHERE t.project_id = ? ORDER BY CASE t.status WHEN 'hecho' THEN 1 ELSE 0 END, t.position`).all(p.id),
      updates: db.prepare(`SELECT pu.*, u.name user_name, u.color user_color FROM project_updates pu JOIN users u ON u.id = pu.user_id
        WHERE pu.project_id = ? ORDER BY pu.created_at DESC LIMIT 50`).all(p.id),
      appointments: db.prepare(`SELECT * FROM appointments WHERE project_id = ? ORDER BY starts_at DESC LIMIT 20`).all(p.id),
      investments: canInvest(user) ? db.prepare('SELECT id, name, status, currency FROM investments WHERE project_id = ?').all(p.id) : [],
    };
  });

  route('PATCH', '/api/projects/:id', 'user', ({ user, body, params }) => {
    const current = getProject(params.id);
    const p = readProjectBody(body, current);
    const archived = has(body, 'archived') ? (body.archived ? 1 : 0) : current.archived;
    // Al entrar en curso/revisión (desde prospecto, pausado…) arranca el reloj del avance de 72 h.
    const entersSla = SLA_STATUSES.includes(p.status) && !SLA_STATUSES.includes(current.status);
    const slaStartedAt = entersSla ? ctx.nowIso() : current.sla_started_at;
    db.prepare(`UPDATE projects SET name = ?, client = ?, kind = ?, service = ?, status = ?, owner_id = ?, start_date = ?, due_date = ?,
      delivered_at = ?, value_amount = ?, currency = ?, description = ?, contact_name = ?, contact_phone = ?, url = ?, archived = ?,
      sla_started_at = ?, updated_at = ? WHERE id = ?`).run(
      p.name, p.client, p.kind, p.service, p.status, p.owner_id, p.start_date, p.due_date, p.delivered_at, p.value_amount,
      p.currency, p.description, p.contact_name, p.contact_phone, p.url, archived, slaStartedAt, ctx.nowIso(), current.id,
    );
    const changes = [];
    if (p.status !== current.status) changes.push(`estado → ${PROJECT_STATUS[p.status].label}`);
    if (archived !== current.archived) changes.push(archived ? 'archivado' : 'restaurado');
    ctx.log(user.id, 'project', current.id, 'updated', `${user.name} actualizó ${p.name}${changes.length ? ` (${changes.join(', ')})` : ''}`);
    if (p.owner_id && p.owner_id !== current.owner_id) {
      ctx.notify([p.owner_id], user.id, { kind: 'project', title: `Sos responsable de ${p.name}`, body: `${user.name} te asignó el proyecto.`, link: `/proyectos/${current.id}` });
    }
    return { project: decorateProject(getProject(current.id)) };
  });

  route('POST', '/api/projects/:id/updates', 'user', ({ user, body, params }) => {
    const p = getProject(params.id);
    const channel = oneOf(body.channel, 'channel', UPDATE_CHANNELS, { required: true });
    const note = text(body.note, 'note', { max: 2000, min: 3, required: true });
    const at = ctx.nowIso();
    transaction(db, () => {
      db.prepare('INSERT INTO project_updates (project_id, user_id, channel, note, created_at) VALUES (?, ?, ?, ?, ?)').run(p.id, user.id, channel, note, at);
      db.prepare('UPDATE projects SET last_update_at = ?, updated_at = ? WHERE id = ?').run(at, at, p.id);
    });
    ctx.log(user.id, 'project', p.id, 'client_update', `${user.name} registró un avance a ${p.client || p.name} por ${UPDATE_CHANNELS[channel]}`);
    return { project: decorateProject(getProject(p.id)) };
  });

  // ── Tablero (tareas) ──────────────────────────────────────────────────────
  const taskSelect = `SELECT t.*, u.name assignee_name, u.color assignee_color, p.name project_name,
      (SELECT COUNT(*) FROM task_comments c WHERE c.task_id = t.id) comments
    FROM tasks t LEFT JOIN users u ON u.id = t.assignee_id LEFT JOIN projects p ON p.id = t.project_id`;
  const getTask = (taskId) => db.prepare(`${taskSelect} WHERE t.id = ?`).get(taskId) ?? fail(404, 'not_found');

  route('GET', '/api/tasks', 'user', ({ query }) => {
    // "Hecho" muestra solo lo cerrado en los últimos 21 días para que el tablero no crezca sin fin.
    const doneSince = new Date(ctx.now() - 21 * DAY).toISOString();
    const where = ["(t.status <> 'hecho' OR t.completed_at >= ? OR ? = '1')"];
    const args = [doneSince, query.get('all') ?? '0'];
    if (query.get('project_id')) { where.push('t.project_id = ?'); args.push(id(query.get('project_id'), 'project_id')); }
    if (query.get('assignee_id')) { where.push('t.assignee_id = ?'); args.push(id(query.get('assignee_id'), 'assignee_id')); }
    return { tasks: db.prepare(`${taskSelect} WHERE ${where.join(' AND ')} ORDER BY t.status, t.position`).all(...args) };
  });

  function nextPosition(status) {
    return (db.prepare('SELECT MAX(position) m FROM tasks WHERE status = ?').get(status).m ?? 0) + 1024;
  }

  /** Si dos posiciones quedan demasiado cerca, renumera la columna. */
  function normalizeColumn(status) {
    const rows = db.prepare('SELECT id, position FROM tasks WHERE status = ? ORDER BY position, id').all(status);
    const tight = rows.some((r, i) => i > 0 && r.position - rows[i - 1].position < 1e-6);
    if (!tight) return;
    const stmt = db.prepare('UPDATE tasks SET position = ? WHERE id = ?');
    rows.forEach((r, i) => stmt.run((i + 1) * 1024, r.id));
  }

  route('POST', '/api/tasks', 'user', ({ user, body }) => {
    const status = oneOf(body.status, 'status', TASK_STATUS, { fallback: 'por_hacer' });
    const t = {
      title: text(body.title, 'title', { max: 200, min: 2, required: true }),
      description: text(body.description, 'description', { max: 4000 }),
      priority: oneOf(body.priority, 'priority', TASK_PRIORITY, { fallback: 'media' }),
      assignee_id: userExists(id(body.assignee_id, 'assignee_id'), 'assignee_id'),
      project_id: projectExists(id(body.project_id, 'project_id')),
      due_date: dateOnly(body.due_date, 'due_date'),
    };
    const at = ctx.nowIso();
    const { lastInsertRowid } = db.prepare(`INSERT INTO tasks (project_id, title, description, status, priority, assignee_id, due_date, position,
      created_by, created_at, updated_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      t.project_id, t.title, t.description, status, t.priority, t.assignee_id, t.due_date, nextPosition(status),
      user.id, at, at, status === 'hecho' ? at : null,
    );
    const taskId = Number(lastInsertRowid);
    ctx.log(user.id, 'task', taskId, 'created', `${user.name} creó la tarea "${t.title}"`);
    if (t.assignee_id) ctx.notify([t.assignee_id], user.id, { kind: 'task', title: `Nueva tarea: ${t.title}`, body: `Asignada por ${user.name}${t.due_date ? ` · vence ${t.due_date}` : ''}`, link: `/tablero?tarea=${taskId}` });
    return { task: getTask(taskId) };
  });

  route('PATCH', '/api/tasks/:id', 'user', ({ user, body, params }) => {
    const current = getTask(params.id);
    const pick = (key, fn) => (has(body, key) ? fn(body[key]) : current[key]);
    const t = {
      title: pick('title', (v) => text(v, 'title', { max: 200, min: 2, required: true })),
      description: pick('description', (v) => text(v, 'description', { max: 4000 })),
      status: pick('status', (v) => oneOf(v, 'status', TASK_STATUS, { required: true })),
      priority: pick('priority', (v) => oneOf(v, 'priority', TASK_PRIORITY, { required: true })),
      assignee_id: pick('assignee_id', (v) => keepOrCheck(id(v, 'assignee_id'), current.assignee_id, 'assignee_id')),
      project_id: pick('project_id', (v) => projectExists(id(v, 'project_id'))),
      due_date: pick('due_date', (v) => dateOnly(v, 'due_date')),
    };
    let position = current.position;
    if (has(body, 'position')) {
      const n = Number(body.position);
      if (!Number.isFinite(n)) invalid('position', 'Posición inválida.');
      position = n;
    } else if (t.status !== current.status) {
      position = nextPosition(t.status);
    }
    const completedAt = t.status === 'hecho' ? current.completed_at ?? ctx.nowIso() : null;
    transaction(db, () => {
      db.prepare(`UPDATE tasks SET title = ?, description = ?, status = ?, priority = ?, assignee_id = ?, project_id = ?, due_date = ?,
        position = ?, completed_at = ?, updated_at = ? WHERE id = ?`).run(
        t.title, t.description, t.status, t.priority, t.assignee_id, t.project_id, t.due_date, position, completedAt, ctx.nowIso(), current.id,
      );
      normalizeColumn(t.status);
      if (t.project_id) db.prepare('UPDATE projects SET updated_at = ? WHERE id = ?').run(ctx.nowIso(), t.project_id);
    });
    if (t.status !== current.status) {
      ctx.log(user.id, 'task', current.id, 'moved', `${user.name} movió "${t.title}" a ${TASK_STATUS[t.status].label}`);
      if (current.created_by && t.status === 'hecho') ctx.notify([current.created_by], user.id, { kind: 'task', title: `Tarea terminada: ${t.title}`, body: `${user.name} la marcó como hecha.`, link: `/tablero?tarea=${current.id}` });
    } else if (Object.keys(body).some((k) => k !== 'position')) {
      ctx.log(user.id, 'task', current.id, 'updated', `${user.name} editó "${t.title}"`);
    }
    if (t.assignee_id && t.assignee_id !== current.assignee_id) {
      ctx.notify([t.assignee_id], user.id, { kind: 'task', title: `Te asignaron: ${t.title}`, body: `Asignada por ${user.name}${t.due_date ? ` · vence ${t.due_date}` : ''}`, link: `/tablero?tarea=${current.id}` });
    }
    return { task: getTask(current.id) };
  });

  route('DELETE', '/api/tasks/:id', 'user', ({ user, params }) => {
    const t = getTask(params.id);
    db.prepare('DELETE FROM tasks WHERE id = ?').run(t.id);
    ctx.log(user.id, 'task', t.id, 'deleted', `${user.name} eliminó la tarea "${t.title}"`);
    return { ok: true };
  });

  route('GET', '/api/tasks/:id/comments', 'user', ({ params }) => {
    getTask(params.id);
    return {
      comments: db.prepare(`SELECT c.*, u.name user_name, u.color user_color FROM task_comments c JOIN users u ON u.id = c.user_id
        WHERE c.task_id = ? ORDER BY c.created_at`).all(params.id),
    };
  });

  route('POST', '/api/tasks/:id/comments', 'user', ({ user, body, params }) => {
    const t = getTask(params.id);
    const bodyText = text(body.body, 'body', { max: 2000, min: 1, required: true });
    db.prepare('INSERT INTO task_comments (task_id, user_id, body, created_at) VALUES (?, ?, ?, ?)').run(t.id, user.id, bodyText, ctx.nowIso());
    const participants = db.prepare('SELECT DISTINCT user_id FROM task_comments WHERE task_id = ?').all(t.id).map((r) => r.user_id);
    ctx.notify([t.assignee_id, t.created_by, ...participants], user.id, { kind: 'comment', title: `Comentario en "${t.title}"`, body: `${user.name}: ${bodyText.slice(0, 140)}`, link: `/tablero?tarea=${t.id}` });
    return { ok: true };
  });

  // ── Agenda ────────────────────────────────────────────────────────────────
  function attendeesOf(appointmentId) {
    return db.prepare(`SELECT u.id, u.name, u.color FROM appointment_attendees a JOIN users u ON u.id = a.user_id WHERE a.appointment_id = ? ORDER BY u.name`).all(appointmentId);
  }
  const decorateAppointment = (a) => ({ ...a, attendees: attendeesOf(a.id) });
  const getAppointment = (appointmentId) => db.prepare(`SELECT a.*, p.name project_name FROM appointments a LEFT JOIN projects p ON p.id = a.project_id WHERE a.id = ?`).get(appointmentId) ?? fail(404, 'not_found');

  function conflictsFor(startsAt, endsAt, attendeeIds, excludeId = 0) {
    if (!attendeeIds.length) return [];
    const marks = attendeeIds.map(() => '?').join(',');
    return db.prepare(`SELECT DISTINCT a.id, a.title, a.starts_at, a.ends_at, u.name attendee_name FROM appointments a
      JOIN appointment_attendees aa ON aa.appointment_id = a.id JOIN users u ON u.id = aa.user_id
      WHERE a.id <> ? AND a.status NOT IN ('cancelada','no_asistio') AND aa.user_id IN (${marks})
        AND a.starts_at < ? AND a.ends_at > ? ORDER BY a.starts_at`).all(excludeId, ...attendeeIds, endsAt, startsAt);
  }

  function readAppointmentBody(body, current = {}, previousAttendees = []) {
    const pick = (key, fn) => (has(body, key) ? fn(body[key]) : current[key] ?? null);
    const a = {
      title: pick('title', (v) => text(v, 'title', { max: 160, min: 2, required: true })),
      kind: pick('kind', (v) => oneOf(v, 'kind', APPOINTMENT_KINDS, { required: true })),
      status: pick('status', (v) => oneOf(v, 'status', APPOINTMENT_STATUS, { fallback: 'programada' })) ?? 'programada',
      starts_at: pick('starts_at', (v) => dateTime(v, 'starts_at', { required: true })),
      ends_at: pick('ends_at', (v) => dateTime(v, 'ends_at', { required: true })),
      location: pick('location', (v) => text(v, 'location', { max: 200 })),
      meeting_url: pick('meeting_url', (v) => url(v, 'meeting_url')),
      project_id: pick('project_id', (v) => projectExists(id(v, 'project_id'))),
      contact_name: pick('contact_name', (v) => text(v, 'contact_name', { max: 120 })),
      contact_phone: pick('contact_phone', (v) => text(v, 'contact_phone', { max: 30 })),
      notes: pick('notes', (v) => text(v, 'notes', { max: 4000 })),
    };
    if (!a.kind) invalid('kind', 'Campo requerido.');
    if (!a.starts_at || !a.ends_at) invalid('starts_at', 'Fecha y hora requeridas.');
    const duration = new Date(a.ends_at) - new Date(a.starts_at);
    if (duration <= 0) invalid('ends_at', 'La cita debe terminar después de empezar.');
    if (duration > 12 * 3_600_000) invalid('ends_at', 'Una cita no puede durar más de 12 horas.');
    let attendees = null;
    if (has(body, 'attendees')) {
      if (!Array.isArray(body.attendees) || body.attendees.length > 20) invalid('attendees', 'Lista inválida.');
      attendees = [...new Set(body.attendees.map((v) => {
        const uid = id(v, 'attendees', { required: true });
        return previousAttendees.includes(uid) ? uid : userExists(uid, 'attendees');
      }))];
    }
    return { a, attendees };
  }

  function saveAttendees(appointmentId, attendees) {
    db.prepare('DELETE FROM appointment_attendees WHERE appointment_id = ?').run(appointmentId);
    const stmt = db.prepare('INSERT INTO appointment_attendees (appointment_id, user_id) VALUES (?, ?)');
    for (const userId of attendees) stmt.run(appointmentId, userId);
  }

  const fmtWhen = (iso) => new Intl.DateTimeFormat('es-CR', { timeZone: 'America/Costa_Rica', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));

  route('GET', '/api/appointments', 'user', ({ query }) => {
    const from = dateTime(query.get('from'), 'from') ?? new Date(ctx.now() - 7 * DAY).toISOString();
    const to = dateTime(query.get('to'), 'to') ?? new Date(ctx.now() + 60 * DAY).toISOString();
    if (new Date(to) - new Date(from) > 400 * DAY) invalid('to', 'Rango demasiado amplio.');
    const rows = db.prepare(`SELECT a.*, p.name project_name FROM appointments a LEFT JOIN projects p ON p.id = a.project_id
      WHERE a.starts_at < ? AND a.ends_at > ? ORDER BY a.starts_at`).all(to, from);
    return { appointments: rows.map(decorateAppointment) };
  });

  route('POST', '/api/appointments', 'user', ({ user, body }) => {
    const { a, attendees } = readAppointmentBody(body);
    const people = attendees ?? [user.id];
    const at = ctx.nowIso();
    const appointmentId = transaction(db, () => {
      const { lastInsertRowid } = db.prepare(`INSERT INTO appointments (title, kind, status, starts_at, ends_at, location, meeting_url, project_id,
        contact_name, contact_phone, notes, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        a.title, a.kind, a.status, a.starts_at, a.ends_at, a.location, a.meeting_url, a.project_id, a.contact_name, a.contact_phone, a.notes, user.id, at, at,
      );
      saveAttendees(Number(lastInsertRowid), people);
      return Number(lastInsertRowid);
    });
    ctx.log(user.id, 'appointment', appointmentId, 'created', `${user.name} agendó "${a.title}" para ${fmtWhen(a.starts_at)}`);
    ctx.notify(people, user.id, { kind: 'appointment', title: `Nueva cita: ${a.title}`, body: `${fmtWhen(a.starts_at)} · agendada por ${user.name}`, link: `/agenda?cita=${appointmentId}` });
    return { appointment: decorateAppointment(getAppointment(appointmentId)), conflicts: conflictsFor(a.starts_at, a.ends_at, people, appointmentId) };
  });

  route('PATCH', '/api/appointments/:id', 'user', ({ user, body, params }) => {
    const current = getAppointment(params.id);
    const previous = attendeesOf(current.id).map((p) => p.id);
    const { a, attendees } = readAppointmentBody(body, current, previous);
    const people = attendees ?? previous;
    transaction(db, () => {
      db.prepare(`UPDATE appointments SET title = ?, kind = ?, status = ?, starts_at = ?, ends_at = ?, location = ?, meeting_url = ?, project_id = ?,
        contact_name = ?, contact_phone = ?, notes = ?, updated_at = ? WHERE id = ?`).run(
        a.title, a.kind, a.status, a.starts_at, a.ends_at, a.location, a.meeting_url, a.project_id, a.contact_name, a.contact_phone, a.notes, ctx.nowIso(), current.id,
      );
      if (attendees) saveAttendees(current.id, attendees);
    });
    const moved = a.starts_at !== current.starts_at;
    const statusChanged = a.status !== current.status;
    ctx.log(user.id, 'appointment', current.id, 'updated', `${user.name} actualizó "${a.title}"${statusChanged ? ` (${APPOINTMENT_STATUS[a.status].label})` : ''}${moved ? ` → ${fmtWhen(a.starts_at)}` : ''}`);
    if (moved || statusChanged) {
      ctx.notify(people, user.id, { kind: 'appointment', title: `${statusChanged ? APPOINTMENT_STATUS[a.status].label : 'Cita reprogramada'}: ${a.title}`, body: fmtWhen(a.starts_at), link: `/agenda?cita=${current.id}` });
    }
    const added = people.filter((p) => !previous.includes(p));
    if (added.length && !moved && !statusChanged) ctx.notify(added, user.id, { kind: 'appointment', title: `Te sumaron a: ${a.title}`, body: fmtWhen(a.starts_at), link: `/agenda?cita=${current.id}` });
    return { appointment: decorateAppointment(getAppointment(current.id)), conflicts: a.status === 'cancelada' ? [] : conflictsFor(a.starts_at, a.ends_at, people, current.id) };
  });

  route('DELETE', '/api/appointments/:id', 'user', ({ user, params }) => {
    const a = getAppointment(params.id);
    const people = attendeesOf(a.id).map((p) => p.id);
    db.prepare('DELETE FROM appointments WHERE id = ?').run(a.id);
    ctx.log(user.id, 'appointment', a.id, 'deleted', `${user.name} eliminó la cita "${a.title}"`);
    ctx.notify(people, user.id, { kind: 'appointment', title: `Cita eliminada: ${a.title}`, body: fmtWhen(a.starts_at), link: '/agenda' });
    return { ok: true };
  });

  route('POST', '/api/appointments/check', 'user', ({ body }) => {
    const startsAt = dateTime(body.starts_at, 'starts_at', { required: true });
    const endsAt = dateTime(body.ends_at, 'ends_at', { required: true });
    const people = Array.isArray(body.attendees) ? body.attendees.slice(0, 20).map((v) => id(v, 'attendees', { required: true })) : [];
    return { conflicts: conflictsFor(startsAt, endsAt, people, id(body.exclude_id, 'exclude_id') ?? 0) };
  });
}
