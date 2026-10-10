// ============================================================================
//  server/routes/dashboard.mjs
//  Centro de operaciones: un solo llamado con lo que el equipo necesita ver al
//  abrir el portal. Las alertas siguen la lógica de excepciones: solo aparece
//  lo que requiere acción (avance vencido, tareas atrasadas, plata sin confirmar).
// ============================================================================

import { canInvest, PROJECT_STATUS } from '../../shared/catalog.js';
import { toCRC, formatMoney } from '../../shared/finance.js';
import { pendingForUser } from './core.mjs';

export function dashboardRoutes(route, ctx) {
  const { db } = ctx;

  route('GET', '/api/dashboard', 'user', ({ user }) => {
    const today = ctx.today();
    const nowIso = ctx.nowIso();
    const in24h = new Date(ctx.now() + 86_400_000).toISOString();
    const in7d = new Date(ctx.now() + 7 * 86_400_000).toISOString();

    const projects = db.prepare(`SELECT p.*, u.name owner_name FROM projects p LEFT JOIN users u ON u.id = p.owner_id
      WHERE p.archived = 0 AND p.status NOT IN ('cerrado')`).all().map((p) => ({ ...p, ...ctx.projectSla(p) }));
    const active = projects.filter((p) => ['en_curso', 'en_revision', 'soporte'].includes(p.status));
    const slaLate = projects.filter((p) => p.sla_state === 'late');
    const slaWarn = projects.filter((p) => p.sla_state === 'warn');

    const openTasks = db.prepare(`SELECT t.*, p.name project_name, u.name assignee_name, u.color assignee_color FROM tasks t
      LEFT JOIN projects p ON p.id = t.project_id LEFT JOIN users u ON u.id = t.assignee_id WHERE t.status <> 'hecho'`).all();
    const overdue = openTasks.filter((t) => t.due_date && t.due_date < today);
    const priorityWeight = { urgente: 0, alta: 1, media: 2, baja: 3 };
    const myTasks = openTasks
      .filter((t) => t.assignee_id === user.id)
      .sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999') || priorityWeight[a.priority] - priorityWeight[b.priority])
      .slice(0, 8);

    const upcoming = db.prepare(`SELECT a.*, p.name project_name FROM appointments a LEFT JOIN projects p ON p.id = a.project_id
      WHERE a.ends_at >= ? AND a.starts_at <= ? AND a.status NOT IN ('cancelada') ORDER BY a.starts_at LIMIT 12`).all(nowIso, in7d)
      .map((a) => ({ ...a, attendees: db.prepare('SELECT u.id, u.name, u.color FROM appointment_attendees x JOIN users u ON u.id = x.user_id WHERE x.appointment_id = ?').all(a.id) }));
    const todayAppointments = upcoming.filter((a) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Costa_Rica' }).format(new Date(a.starts_at)) === today);
    const unconfirmedSoon = upcoming.filter((a) => a.status === 'programada' && a.starts_at <= in24h && a.kind !== 'interna');

    const alerts = [];
    for (const p of slaLate) {
      alerts.push({ tone: 'red', kind: 'sla', title: `${p.client || p.name}: ${p.hours_since_update} h sin avance`, detail: `Compromiso de avance vencido · responsable ${p.owner_name ?? 'sin asignar'}`, link: `/proyectos/${p.id}` });
    }
    if (overdue.length) {
      alerts.push({ tone: 'amber', kind: 'tasks', title: `${overdue.length} ${overdue.length === 1 ? 'tarea vencida' : 'tareas vencidas'}`, detail: overdue.slice(0, 3).map((t) => t.title).join(' · '), link: '/tablero?filtro=vencidas' });
    }
    for (const a of unconfirmedSoon) {
      alerts.push({ tone: 'amber', kind: 'appointment', title: `Cita sin confirmar: ${a.title}`, detail: 'Empieza en menos de 24 h. Confirmá con el cliente.', link: `/agenda?cita=${a.id}` });
    }
    for (const p of slaWarn) {
      alerts.push({ tone: 'blue', kind: 'sla', title: `${p.client || p.name}: avance pronto`, detail: `${p.hours_since_update} h desde el último avance`, link: `/proyectos/${p.id}` });
    }
    const supportEnding = projects.filter((p) => ['entregado', 'soporte'].includes(p.status) && p.delivered_at)
      .map((p) => ({ ...p, ends: new Date(new Date(`${p.delivered_at}T00:00:00Z`).getTime() + 30 * 86_400_000).toISOString().slice(0, 10) }))
      .filter((p) => p.ends >= today && p.ends <= ctx.today(7));
    for (const p of supportEnding) {
      alerts.push({ tone: 'blue', kind: 'support', title: `Soporte de ${p.client || p.name} termina el ${p.ends}`, detail: `${PROJECT_STATUS[p.status].label}. Definí cierre o plan de mantenimiento.`, link: `/proyectos/${p.id}` });
    }

    let investments = null;
    if (canInvest(user)) {
      const movements = db.prepare('SELECT * FROM movements').all();
      const confirmed = movements.filter((m) => m.status === 'confirmado');
      const total = (type, list = confirmed) => list.filter((m) => m.type === type).reduce((a, m) => a + (toCRC(m.amount, m.currency, m.fx_rate) ?? 0), 0);
      const mine = confirmed.filter((m) => m.partner_id === user.id);
      const myPending = pendingForUser(ctx, user);
      const monthStart = `${today.slice(0, 7)}-01`;
      investments = {
        contributed_crc: total('aporte'),
        returned_crc: total('retorno'),
        net_crc: total('retorno') - total('aporte'),
        month_returned_crc: total('retorno', confirmed.filter((m) => m.date >= monthStart)),
        my_contributed_crc: total('aporte', mine),
        my_returned_crc: total('retorno', mine),
        pending_count: movements.filter((m) => m.status === 'pendiente').length,
        my_pending_count: myPending.length,
        active_count: db.prepare("SELECT COUNT(*) n FROM investments WHERE status = 'activa'").get().n,
      };
      if (myPending.length) {
        const sum = myPending.reduce((a, m) => a + (toCRC(m.amount, m.currency, m.fx_rate) ?? 0), 0);
        alerts.unshift({ tone: 'violet', kind: 'movement', title: `${myPending.length} ${myPending.length === 1 ? 'movimiento espera' : 'movimientos esperan'} tu confirmación`, detail: `Total ≈ ${formatMoney(sum, 'CRC')}. Respondé con tu mensaje de vuelta.`, link: '/buzon' });
      }
      const objected = movements.filter((m) => m.status === 'objetado' && m.created_by === user.id);
      if (objected.length) alerts.unshift({ tone: 'red', kind: 'movement', title: `${objected.length} ${objected.length === 1 ? 'movimiento tuyo fue objetado' : 'movimientos tuyos fueron objetados'}`, detail: 'Revisá el motivo y corregí o anulá el registro.', link: '/inversiones' });
    }

    const sensitive = canInvest(user) ? '' : 'AND a.sensitive = 0';
    return {
      today,
      kpis: {
        active_projects: active.length,
        sla_late: slaLate.length,
        overdue_tasks: overdue.length,
        my_open_tasks: openTasks.filter((t) => t.assignee_id === user.id).length,
        today_appointments: todayAppointments.length,
        week_appointments: upcoming.length,
      },
      alerts,
      agenda: upcoming.slice(0, 8),
      my_tasks: myTasks,
      projects_attention: [...slaLate, ...slaWarn].slice(0, 6),
      investments,
      activity: db.prepare(`SELECT a.*, u.name user_name, u.color user_color FROM activity a LEFT JOIN users u ON u.id = a.user_id
        WHERE a.action NOT IN ('login', 'login_failed') ${sensitive} ORDER BY a.created_at DESC, a.id DESC LIMIT 12`).all(),
    };
  });
}
