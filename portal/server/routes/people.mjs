// ============================================================================
//  server/routes/people.mjs
//  Personas del equipo: qué lideran, en qué proyectos están y cuánta carga
//  llevan (tareas abiertas, vencidas, proyectos activos y citas de la semana).
// ============================================================================

import { SERVICES, canInvest } from '../../shared/catalog.js';
import { publicUser } from '../context.mjs';
import { fail } from '../http.mjs';
import { createHelpers, ACTIVE_PROJECT_STATUSES, ACTIVE_SQL } from './common.mjs';

const DAY = 86_400_000;

/** Nivel de carga: score = abiertas + 2·vencidas + 2·proyectos activos. */
export function loadLevel({ open_tasks: open, overdue_tasks: overdue, projects_active: projects }) {
  const score = open + 2 * overdue + 2 * projects;
  return score < 6 ? 'baja' : score < 12 ? 'media' : 'alta';
}

export function peopleRoutes(route, ctx) {
  const { db } = ctx;
  const { APPOINTMENT_SELECT, decorateAppointment } = createHelpers(ctx);
  const serviceOrder = Object.keys(SERVICES);
  const byCatalog = (a, b) => serviceOrder.indexOf(a) - serviceOrder.indexOf(b);

  /** Filas de users → Person (publicUser + servicios y métricas de carga). */
  function describePeople(users) {
    const today = ctx.today();
    const nowIso = ctx.nowIso();
    const in7d = new Date(ctx.now() + 7 * DAY).toISOString();
    const leads = db.prepare('SELECT key, lead_id FROM service_lines WHERE lead_id IS NOT NULL').all();
    const members = db.prepare('SELECT service_key, user_id FROM service_members').all();
    const projects = new Map(db.prepare(`SELECT x.user_id, COUNT(DISTINCT x.project_id) n FROM (
        SELECT user_id, project_id FROM project_members
        UNION SELECT owner_id, id FROM projects WHERE owner_id IS NOT NULL
      ) x JOIN projects p ON p.id = x.project_id
      WHERE p.archived = 0 AND p.status IN ${ACTIVE_SQL} GROUP BY x.user_id`).all().map((r) => [r.user_id, r.n]));
    const tasks = new Map(db.prepare(`SELECT assignee_id, COUNT(*) open,
        SUM(CASE WHEN due_date IS NOT NULL AND due_date < ? THEN 1 ELSE 0 END) overdue
      FROM tasks WHERE status <> 'hecho' AND assignee_id IS NOT NULL GROUP BY assignee_id`).all(today).map((r) => [r.assignee_id, r]));
    const week = new Map(db.prepare(`SELECT aa.user_id, COUNT(*) n FROM appointment_attendees aa JOIN appointments a ON a.id = aa.appointment_id
      WHERE a.ends_at >= ? AND a.starts_at <= ? AND a.status <> 'cancelada' GROUP BY aa.user_id`).all(nowIso, in7d).map((r) => [r.user_id, r.n]));
    return users.map((u) => {
      const person = {
        ...publicUser(u),
        services_lead: leads.filter((s) => s.lead_id === u.id && Object.hasOwn(SERVICES, s.key)).map((s) => s.key).sort(byCatalog),
        services_member: members.filter((s) => s.user_id === u.id && Object.hasOwn(SERVICES, s.service_key)).map((s) => s.service_key).sort(byCatalog),
        projects_active: projects.get(u.id) ?? 0,
        open_tasks: tasks.get(u.id)?.open ?? 0,
        overdue_tasks: tasks.get(u.id)?.overdue ?? 0,
        week_appointments: week.get(u.id) ?? 0,
      };
      return { ...person, load: loadLevel(person) };
    });
  }

  route('GET', '/api/people', 'user', () => ({
    // Directorio de la operación (carga de trabajo): los inversionistas no están.
    people: describePeople(db.prepare("SELECT * FROM users WHERE active = 1 AND role <> 'inversionista' ORDER BY name").all()),
  }));

  route('GET', '/api/people/:id', 'user', ({ user, params }) => {
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(params.id) ?? fail(404, 'not_found');
    const [person] = describePeople([row]);

    const services = [
      ...person.services_lead.map((key) => ({ key, name: SERVICES[key], role: 'lider' })),
      ...person.services_member.filter((key) => !person.services_lead.includes(key)).map((key) => ({ key, name: SERVICES[key], role: 'equipo' })),
    ].sort((a, b) => byCatalog(a.key, b.key));

    const projects = db.prepare(`SELECT p.*, CASE WHEN p.owner_id = ? THEN 'responsable' ELSE pm.role END member_role FROM projects p
      LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
      WHERE p.archived = 0 AND (pm.user_id IS NOT NULL OR p.owner_id = ?) ORDER BY p.updated_at DESC`).all(row.id, row.id, row.id)
      .map((p) => ({
        id: p.id, name: p.name, client: p.client, client_id: p.client_id, service: p.service, status: p.status, kind: p.kind,
        due_date: p.due_date, ...ctx.projectSla(p), role: p.member_role,
      }))
      .sort((a, b) => Number(!ACTIVE_PROJECT_STATUSES.includes(a.status)) - Number(!ACTIVE_PROJECT_STATUSES.includes(b.status)));

    const tasks = db.prepare(`SELECT t.*, p.name project_name FROM tasks t LEFT JOIN projects p ON p.id = t.project_id
      WHERE t.assignee_id = ? AND t.status <> 'hecho'
      ORDER BY CASE WHEN t.due_date IS NULL THEN 1 ELSE 0 END, t.due_date,
        CASE t.priority WHEN 'urgente' THEN 0 WHEN 'alta' THEN 1 WHEN 'media' THEN 2 ELSE 3 END, t.position`).all(row.id);

    const appointments = db.prepare(`${APPOINTMENT_SELECT} JOIN appointment_attendees aa ON aa.appointment_id = a.id AND aa.user_id = ?
      WHERE a.ends_at >= ? AND a.starts_at <= ? AND a.status <> 'cancelada' ORDER BY a.starts_at`)
      .all(row.id, ctx.nowIso(), new Date(ctx.now() + 14 * DAY).toISOString()).map(decorateAppointment);

    // Las acciones con dinero solo las ven socios y admin.
    const sensitive = canInvest(user) ? '' : 'AND a.sensitive = 0';
    const activity = db.prepare(`SELECT a.*, u.name user_name, u.color user_color FROM activity a LEFT JOIN users u ON u.id = a.user_id
      WHERE a.user_id = ? AND a.action NOT IN ('login', 'login_failed') ${sensitive} ORDER BY a.created_at DESC, a.id DESC LIMIT 30`).all(row.id);

    return { person, services, projects, tasks, appointments, activity };
  });
}
