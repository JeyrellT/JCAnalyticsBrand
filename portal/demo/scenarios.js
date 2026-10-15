// ============================================================================
//  demo/scenarios.js
//  "Simular aviso": escenarios de un toque para ver los avisos push en la demo.
//  Cada escenario crea los datos como OTRA persona del equipo, por las rutas
//  reales (backend.as → dispatch con su sesión lógica) o corre una
//  automatización del motor real; la política de avisos decide y el push
//  simulado muestra el aviso a quien mira la demo.
//
//  Sin dependencias del navegador: se puede probar desde Node.
// ============================================================================

import { canInvest, NOTIFICATION_CATEGORIES, notificationCategory } from '../shared/catalog.js';
import { CLIENT_VISIBLE_PROJECT_STATUSES } from '../shared/client-portal.js';
import { readPrefs, pushBlockReason } from '../server/notify-policy.mjs';

const MINUTE = 60_000;
const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });
const firstName = (name) => String(name ?? '').trim().split(/\s+/)[0] || 'Alguien';

const TASK_TITLES = [
  'Revisar la propuesta para Ferretería El Roble',
  'Llamar a Uniquex para coordinar la visita técnica',
  'Elegir las fotos del reel de La Burrada',
  'Revisar el reporte de pauta de octubre',
];
const APPOINTMENTS = [
  { title: 'Llamada de seguimiento · Uniquex', kind: 'seguimiento', meeting_url: 'https://meet.google.com/jca-demo-uqx' },
  { title: 'Revisión rápida del tablero', kind: 'interna', location: 'Oficina' },
  { title: 'Demo de BarberXCR a una barbería de Heredia', kind: 'demo', location: 'Barbería El Clásico, Heredia' },
];
// v5: entregables que un cliente revisa y devuelve con ajustes desde su portal.
const DELIVERABLE_REVIEWS = [
  { title: 'Arte del combo de temporada', description: '3 historias y 1 publicación cuadrada.', note: 'Nos encanta, pero el precio debe verse más grande y el logo arriba.' },
  { title: 'Correo de lanzamiento', description: 'Asunto, preencabezado y cuerpo con botón a WhatsApp.', note: 'Cambiemos el asunto por algo más directo y agreguen la foto del local.' },
  { title: 'Video corto del menú', description: 'Reel de 20 s con subtítulos.', note: 'La música está muy alta y falta el horario al final.' },
];
const VISIBLE_STATUS_SQL = `('${CLIENT_VISIBLE_PROJECT_STATUSES.filter((st) => st !== 'cerrado' && st !== 'pausado').join("','")}')`;

const MONEY = [
  { amount: 75_000_00, message: 'Aporte para la pauta de la próxima semana.' },
  { amount: 120_000_00, message: 'Mi parte para el onboarding de barberías nuevas.' },
  { amount: 50_000_00, message: 'Aporte extra para dominios y herramientas.' },
];

/** Por qué no apareció el aviso aunque quedó en el buzón (mismas reglas que la política). */
const BLOCK_REASONS = {
  push_disabled: 'Tenés los avisos pausados en «Avisos y app». Igual quedó en tu buzón.',
  quiet_hours: 'Estás en tu horario tranquilo («Avisos y app»). Igual quedó en tu buzón.',
  not_investor: 'Tu rol no recibe avisos de dinero.',
};

export function createScenarios(backend) {
  const { db, ctx } = backend;
  let turn = 0;

  const viewer = () => {
    const id = backend.viewerId();
    return id == null ? null : db.prepare('SELECT * FROM users WHERE id = ? AND active = 1').get(id) ?? null;
  };

  /** Otra persona activa que puede actuar (sin contraseña temporal); socios primero. */
  function actorFor(me, { investor = false, offset = 0 } = {}) {
    const rows = db.prepare(`SELECT * FROM users WHERE active = 1 AND must_change_password = 0 AND id <> ?
      ORDER BY CASE role WHEN 'socio' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, id`).all(me.id)
      .filter((u) => !investor || canInvest(u));
    return rows.length ? rows[offset % rows.length] : null;
  }

  /**
   * Cuenta de cliente que puede decidir (activa, aprueba, sin clave temporal) con un proyecto
   * que ve en su portal; primero los clientes y proyectos de quien mira.
   */
  function approverFor(me) {
    return db.prepare(`SELECT a.id account_id, c.id client_id, c.name client_name, p.id project_id
      FROM client_accounts a JOIN clients c ON c.id = a.client_id
      JOIN projects p ON p.client_id = c.id AND p.kind = 'cliente' AND p.archived = 0 AND p.status IN ${VISIBLE_STATUS_SQL}
      WHERE a.active = 1 AND a.can_approve = 1 AND a.must_change_password = 0
      ORDER BY (c.owner_id = ?) DESC, (p.owner_id = ?) DESC, a.id LIMIT 1`).get(me.id, me.id) ?? null;
  }

  /** Explica un aviso que no se mostró: preferencias, dispositivos o la regla del escenario. */
  function explain(me, kind) {
    const reason = pushBlockReason(me, kind, readPrefs(db, me.id), ctx.now());
    if (reason === 'category_off') {
      return `Apagaste «${NOTIFICATION_CATEGORIES[notificationCategory(kind)]?.label ?? 'esta categoría'}» en «Avisos y app». Igual quedó en tu buzón.`;
    }
    if (reason) return BLOCK_REASONS[reason] ?? 'Este aviso quedó solo en tu buzón.';
    const devices = db.prepare('SELECT COUNT(*) n FROM push_subscriptions WHERE user_id = ?').get(me.id).n;
    if (!devices) return 'No tenés dispositivos con avisos activos: activalos en «Avisos y app». Igual quedó en tu buzón.';
    return null;
  }

  /**
   * "Probar ahora" del resumen y el escenario se pueden repetir en la demo: la clave
   * del día de esta persona se renombra (queda en el historial) para que el
   * motor real lo vuelva a enviar.
   */
  function freeDigest(userId) {
    const key = `digest:${ctx.today()}:${userId}`;
    db.prepare('UPDATE automation_log SET dedupe_key = ? WHERE dedupe_key = ?').run(`${key}:demo-${ctx.now()}`, key);
  }

  const SCENARIOS = {
    resumen: {
      title: 'Resumen «Mi día»',
      hint: () => 'El aviso de cada mañana con tus citas, tareas y pendientes de hoy.',
      async run(me) {
        const prefs = readPrefs(db, me.id);
        if (!prefs.digest_enabled || prefs.categories.resumen === false) return { reason: 'Tenés el resumen «Mi día» apagado en «Avisos y app».' };
        freeDigest(me.id);
        const since = ctx.nowIso();
        try {
          await ctx.automations.run('resumen_diario', { force: true });
        } catch (error) {
          if (error?.code === 'automation_disabled') return { reason: '«Resumen Mi día» está en pausa en Automatizaciones.' };
          throw error;
        }
        const sent = db.prepare("SELECT 1 FROM notifications WHERE user_id = ? AND kind = 'digest' AND created_at >= ?").get(me.id, since);
        if (!sent) return { reason: 'Hoy no tenés citas, tareas ni confirmaciones: el resumen no se envía cuando todo está en cero.' };
        return { kind: 'digest' };
      },
    },

    dinero: {
      title: 'Un socio te envió plata',
      available: (me) => canInvest(me) && actorFor(me, { investor: true }) !== null,
      hint: (me) => `${firstName(actorFor(me, { investor: true })?.name)} registra un aporte y te pide confirmarlo.`,
      async run(me) {
        const actor = actorFor(me, { investor: true });
        const investment = db.prepare(`SELECT id FROM investments WHERE status NOT IN ('cerrada')
          ORDER BY (status = 'activa') DESC, (currency = 'CRC') DESC, id LIMIT 1`).get();
        if (!actor || !investment) return { reason: 'No hay una inversión abierta para registrar el aporte.' };
        const money = MONEY[turn % MONEY.length];
        await backend.as(actor.id, (api) => api('POST', `/api/investments/${investment.id}/movements`, {
          type: 'aporte', partner_id: actor.id, amount: money.amount, date: ctx.today(), reference: `SINPE ${4100 + turn}`, message: money.message,
        }));
        return { kind: 'movement' };
      },
    },

    tarea: {
      title: 'Te asignaron una tarea',
      hint: (me) => `${firstName(actorFor(me)?.name)} te asigna una tarea en el tablero.`,
      async run(me) {
        const actor = actorFor(me);
        if (!actor) return { reason: 'No hay otra persona activa en el equipo.' };
        await backend.as(actor.id, (api) => api('POST', '/api/tasks', {
          title: TASK_TITLES[turn % TASK_TITLES.length], assignee_id: me.id, priority: 'alta', due_date: ctx.today(1),
        }));
        return { kind: 'task' };
      },
    },

    cambios: {
      title: 'Un cliente pidió cambios',
      available: (me) => approverFor(me) !== null,
      hint: (me) => `Compartís un entregable con ${approverFor(me)?.client_name ?? 'un cliente'} y lo devuelve con ajustes desde su portal.`,
      async run(me) {
        const target = approverFor(me);
        if (!target) return { reason: 'Ningún cliente con acceso al portal puede aprobar entregables.' };
        const item = DELIVERABLE_REVIEWS[turn % DELIVERABLE_REVIEWS.length];
        // Quien mira comparte (así el aviso de la decisión le llega a él) y el cliente decide desde su sesión.
        const { deliverable } = await backend.as(me.id, (api) => api('POST', '/api/deliverables', {
          client_id: target.client_id, project_id: target.project_id, title: item.title, description: item.description,
          url: 'https://docs.example.com/demo/entregable',
        }));
        await wait(1200);
        await backend.asClient(target.account_id, (api) => api('POST', `/api/client/deliverables/${deliverable.id}/decision`, {
          decision: 'cambios', version: deliverable.version, note: item.note,
        }));
        return { kind: 'deliverable' };
      },
    },

    cita: {
      title: 'Recordatorio de cita',
      hint: (me) => `${firstName(actorFor(me, { offset: 1 })?.name)} agenda una cita con vos en 1 hora y el portal te la recuerda.`,
      async run(me) {
        const actor = actorFor(me, { offset: 1 });
        if (!actor) return { reason: 'No hay otra persona activa en el equipo.' };
        const start = Math.floor((ctx.now() + 60 * MINUTE) / MINUTE) * MINUTE;
        const base = APPOINTMENTS[turn % APPOINTMENTS.length];
        await backend.as(actor.id, (api) => api('POST', '/api/appointments', {
          ...base, status: 'confirmada', starts_at: new Date(start).toISOString(), ends_at: new Date(start + 30 * MINUTE).toISOString(),
          attendees: [actor.id, me.id],
        }));
        // El aviso "Nueva cita" llega al instante; el recordatorio, cuando lo revisa la automatización real.
        await wait(2500);
        const result = await ctx.automations.run('recordatorio_citas');
        if (result === null) return { kind: 'appointment', note: '«Recordatorio de citas» está en pausa: solo llegó el aviso de la cita nueva.' };
        return { kind: 'appointment' };
      },
    },
  };

  /** Escenarios para quien mira ahora: [{ key, title, hint }]. */
  function list() {
    const me = viewer();
    if (!me) return [];
    return Object.entries(SCENARIOS)
      .filter(([, s]) => !s.available || s.available(me))
      .map(([key, s]) => ({ key, title: s.title, hint: s.hint(me) }));
  }

  /**
   * Corre un escenario. → { shown: n avisos en pantalla, message?: texto para explicar si no apareció ninguno }
   */
  async function run(key) {
    const me = viewer();
    const scenario = SCENARIOS[key];
    if (!me || !scenario || (scenario.available && !scenario.available(me))) return { shown: 0, message: 'Este escenario no está disponible para esta persona.' };
    turn += 1;
    const before = backend.pushShown();
    const out = (await scenario.run(me)) ?? {};
    const shown = backend.pushShown() - before;
    if (shown > 0) return { shown, message: out.note ?? null };
    return { shown, message: out.reason ?? (out.kind && explain(me, out.kind)) ?? 'El aviso quedó en tu buzón.' };
  }

  return { list, run, freeDigest };
}
