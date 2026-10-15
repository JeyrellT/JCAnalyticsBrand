// ============================================================================
//  server/routes/brief-service.mjs
//  Reglas del brief creativo compartidas por el equipo y el portal de clientes:
//  numeración BRF-AAAA-NNNN, edición solo en borrador/observado, envío con
//  versión congelada + huella SHA-256, flujo de estados, bitácora (brief_events)
//  y avisos al otro lado. Las rutas solo deciden QUIÉN puede llamar a qué.
// ============================================================================

import { createHash } from 'node:crypto';
import {
  BRIEF_STATUS, BRIEF_EDITABLE_STATUSES, BRIEF_FINAL_STATUSES, BRIEF_CLIENT_CANCELABLE, BRIEF_TEAM_TRANSITIONS, BRIEF_TITLE_MAX,
  normalizeBriefData, briefProblems, briefCompleteness, leadTimeProblem, versionPayload, transitionNeedsNote, emptyBriefData,
} from '../../shared/brief.js';
import { fail, invalid, text } from '../http.mjs';
import { transaction } from '../schema.mjs';

export const sha256Hex = (value) => createHash('sha256').update(value).digest('hex');

/** Mensaje al cliente según el estado al que pasa su solicitud. */
const CLIENT_STATUS_MESSAGES = {
  observado: 'Tu solicitud necesita ajustes',
  aprobado: 'Aprobamos tu solicitud',
  en_produccion: 'Tu solicitud está en producción',
  entregado: 'Entregamos tu solicitud',
  cerrado: 'Cerramos tu solicitud',
  cancelado: 'Solicitud cancelada',
};

export function createBriefService(ctx, portal) {
  const { db } = ctx;

  const BRIEF_SELECT = `SELECT b.*, c.name client_name, c.owner_id client_owner_id, p.name project_name, p.owner_id project_owner_id,
      u.name owner_name, u.phone owner_phone, cu.name created_by_user_name, ca.name created_by_account_name
    FROM briefs b JOIN clients c ON c.id = b.client_id LEFT JOIN projects p ON p.id = b.project_id AND p.client_id = b.client_id
    LEFT JOIN users u ON u.id = b.owner_id LEFT JOIN users cu ON cu.id = b.created_by_user LEFT JOIN client_accounts ca ON ca.id = b.created_by_account`;

  const parse = (json) => {
    try { return { ...emptyBriefData(), ...JSON.parse(json) }; } catch { return emptyBriefData(); }
  };

  const getRow = (briefId) => db.prepare(`${BRIEF_SELECT} WHERE b.id = ?`).get(briefId);
  const getForTeam = (briefId) => getRow(briefId) ?? fail(404, 'not_found');
  /** Brief de ESTE cliente o 404: un id ajeno no revela si existe. */
  function getForClient(briefId, clientId) {
    const row = getRow(briefId);
    if (!row || row.client_id !== clientId) fail(404, 'not_found');
    return row;
  }

  // ── Presentación ──────────────────────────────────────────────────────────
  /** @param {'team'|'client'} audience  el cliente no ve el motivo interno de urgencia */
  function decorate(row, audience, { withData = true } = {}) {
    const data = parse(row.data);
    const out = {
      id: row.id,
      code: row.code,
      client_id: row.client_id,
      client_name: row.client_name,
      project_id: row.project_id,
      project_name: row.project_name,
      title: row.title,
      status: row.status,
      status_label: BRIEF_STATUS[row.status]?.label ?? row.status,
      version: row.version,
      approved_version: row.approved_version,
      owner_id: row.owner_id,
      owner_name: row.owner_name,
      urgent: !!row.urgent,
      send_start: data.send_start,
      send_end: data.send_end,
      objective: data.objective,
      materials: data.materials,
      brand: data.brand,
      submitted_at: row.submitted_at,
      approved_at: row.approved_at,
      closed_at: row.closed_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      created_by: row.created_by_account
        ? { type: 'cliente', name: row.created_by_account_name }
        : { type: 'equipo', name: row.created_by_user_name },
      editable: BRIEF_EDITABLE_STATUSES.includes(row.status),
      completeness: briefCompleteness(data, { title: row.title }),
    };
    if (audience === 'team') out.urgent_reason = row.urgent_reason;
    else out.owner_phone = row.owner_phone;
    if (withData) out.data = data;
    return out;
  }

  function events(briefId, audience) {
    const internal = audience === 'team' ? '' : "AND e.kind <> 'nota_interna'";
    return db.prepare(`SELECT e.id, e.actor_type, e.kind, e.from_status, e.to_status, e.version, e.body, e.created_at,
        CASE e.actor_type WHEN 'sistema' THEN 'JC Analytics' ELSE COALESCE(u.name, ca.name) END actor_name
      FROM brief_events e LEFT JOIN users u ON u.id = e.user_id LEFT JOIN client_accounts ca ON ca.id = e.account_id
      WHERE e.brief_id = ? ${internal} ORDER BY e.created_at, e.id`).all(briefId);
  }

  const versions = (briefId) => db.prepare(`SELECT v.version, v.title, v.hash, v.created_at,
      CASE WHEN v.submitted_by_account IS NOT NULL THEN 'cliente' ELSE 'equipo' END submitted_by_type,
      COALESCE(u.name, ca.name) submitted_by_name
    FROM brief_versions v LEFT JOIN users u ON u.id = v.submitted_by_user LEFT JOIN client_accounts ca ON ca.id = v.submitted_by_account
    WHERE v.brief_id = ? ORDER BY v.version DESC`).all(briefId);

  /** Una versión congelada, con la huella recalculada para verificar que nadie la alteró. */
  function version(row, number) {
    const v = db.prepare(`SELECT v.*, COALESCE(u.name, ca.name) submitted_by_name FROM brief_versions v
      LEFT JOIN users u ON u.id = v.submitted_by_user LEFT JOIN client_accounts ca ON ca.id = v.submitted_by_account
      WHERE v.brief_id = ? AND v.version = ?`).get(row.id, number) ?? fail(404, 'not_found');
    const data = parse(v.data);
    const hash = sha256Hex(versionPayload({ code: row.code, version: v.version, title: v.title, data }));
    return {
      code: row.code, version: v.version, title: v.title, data, hash: v.hash, hash_ok: hash === v.hash,
      created_at: v.created_at, submitted_by_name: v.submitted_by_name,
      submitted_by_type: v.submitted_by_account ? 'cliente' : 'equipo',
    };
  }

  // ── Entrada ───────────────────────────────────────────────────────────────
  function readData(raw) {
    const { data, errors } = normalizeBriefData(raw);
    if (errors.length) fail(400, 'validation', { field: errors[0].field, message: errors[0].message, errors });
    return data;
  }
  const readTitle = (value, required = true) => text(value, 'title', { max: BRIEF_TITLE_MAX, min: 3, required });

  /** Bloqueo optimista: si el cliente y el equipo editan a la vez, el segundo guardado no pisa al primero. */
  function checkFresh(row, body) {
    if (body && Object.hasOwn(body, 'if_updated_at') && body.if_updated_at !== row.updated_at) fail(409, 'conflict', { updated_at: row.updated_at });
  }

  // ── Bitácora ──────────────────────────────────────────────────────────────
  const insertEvent = db.prepare(`INSERT INTO brief_events (brief_id, actor_type, user_id, account_id, kind, from_status, to_status, version, body, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  /** actor: { type: 'equipo', user } | { type: 'cliente', account } | { type: 'sistema' } */
  function addEvent(briefId, actor, kind, { from = null, to = null, version: v = null, body = null } = {}) {
    insertEvent.run(briefId, actor.type, actor.user?.id ?? null, actor.account?.id ?? null, kind, from, to, v, body, ctx.nowIso());
  }
  const actorLabel = (actor) => (actor.type === 'cliente' ? `${actor.account.name} (${actor.account.client_name ?? 'cliente'})` : actor.user?.name ?? 'JC Analytics');
  const logActivity = (actor, briefId, action, summary) => ctx.log(actor.user?.id ?? null, 'brief', briefId, action, summary);

  // ── Avisos ────────────────────────────────────────────────────────────────
  const teamLink = (row) => `/briefs/${row.id}`;
  const clientLink = (row) => `/cliente/solicitudes/${row.id}`;
  /** Al equipo: responsable del brief, del proyecto y del cliente (o los admin si no hay nadie). */
  const toTeam = (row, payload) => portal.notifyTeam([row.owner_id, row.project_owner_id, row.client_owner_id], { kind: 'brief', link: teamLink(row), ...payload });
  const toClient = (row, payload, exceptAccountId = null) => portal.notifyClient(row.client_id, { kind: 'brief', link: clientLink(row), ...payload }, { exceptAccountId });

  // ── Acciones ──────────────────────────────────────────────────────────────
  function nextCode() {
    const year = ctx.today().slice(0, 4);
    const last = db.prepare('SELECT MAX(CAST(SUBSTR(code, 10) AS INTEGER)) n FROM briefs WHERE code LIKE ?').get(`BRF-${year}-%`).n ?? 0;
    return `BRF-${year}-${String(last + 1).padStart(4, '0')}`;
  }

  /** Crea un borrador. Devuelve el id. */
  function create({ clientId, projectId = null, title, data, ownerId = null, actor }) {
    const at = ctx.nowIso();
    const briefId = transaction(db, () => {
      const code = nextCode();
      const { lastInsertRowid } = db.prepare(`INSERT INTO briefs (code, client_id, project_id, title, status, data, owner_id, send_start,
        created_by_user, created_by_account, created_at, updated_at) VALUES (?, ?, ?, ?, 'borrador', ?, ?, ?, ?, ?, ?, ?)`).run(
        code, clientId, projectId, title, JSON.stringify(data), ownerId, data.send_start, actor.user?.id ?? null, actor.account?.id ?? null, at, at,
      );
      const id = Number(lastInsertRowid);
      addEvent(id, actor, 'creado', { to: 'borrador' });
      return id;
    });
    const row = getRow(briefId);
    logActivity(actor, briefId, 'created', `${actorLabel(actor)} creó el brief ${row.code} · ${title}`);
    if (actor.type === 'cliente') toTeam(row, { title: `${row.client_name} empezó un brief`, body: `${row.code} · ${title} (borrador)` });
    return briefId;
  }

  /**
   * Cambios parciales. Título y datos solo en borrador/observado; responsable,
   * proyecto y urgencia los decide quien llama (la ruta filtra qué claves acepta).
   */
  function update(row, changes, actor) {
    if (BRIEF_FINAL_STATUSES.includes(row.status)) fail(409, 'brief_closed');
    const content = Object.hasOwn(changes, 'title') || Object.hasOwn(changes, 'data');
    if (content && !BRIEF_EDITABLE_STATUSES.includes(row.status)) fail(409, 'brief_locked');
    const pick = (key, current) => (Object.hasOwn(changes, key) ? changes[key] : current);
    const next = {
      title: pick('title', row.title),
      data: pick('data', null) ?? parse(row.data),
      project_id: pick('project_id', row.project_id),
      owner_id: pick('owner_id', row.owner_id),
      urgent: pick('urgent', !!row.urgent) ? 1 : 0,
      urgent_reason: pick('urgent_reason', row.urgent_reason),
    };
    if (next.urgent && !next.urgent_reason) invalid('urgent_reason', 'Indicá el motivo de la urgencia.');
    if (!next.urgent) next.urgent_reason = null;
    db.prepare(`UPDATE briefs SET title = ?, data = ?, project_id = ?, owner_id = ?, urgent = ?, urgent_reason = ?, send_start = ?, updated_at = ?
      WHERE id = ?`).run(next.title, JSON.stringify(next.data), next.project_id, next.owner_id, next.urgent, next.urgent_reason,
      next.data.send_start, ctx.nowIso(), row.id);
    if (next.owner_id && next.owner_id !== row.owner_id && actor.type === 'equipo') {
      ctx.notify([next.owner_id], actor.user.id, { kind: 'brief', title: `Sos responsable del brief ${row.code}`, body: `${row.client_name} · ${next.title}`, link: teamLink(row) });
    }
    if (next.urgent && !row.urgent) logActivity(actor, row.id, 'urgent', `${actorLabel(actor)} marcó urgente el brief ${row.code}: ${next.urgent_reason}`);
  }

  /** Envía (o reenvía) el brief: valida, congela la versión con su huella y avisa al otro lado. */
  function submit(row, actor) {
    if (!BRIEF_EDITABLE_STATUSES.includes(row.status)) fail(409, 'brief_locked');
    const data = parse(row.data);
    const problems = briefProblems(data, { title: row.title });
    if (problems.length) fail(400, 'validation', { field: problems[0].field, message: problems[0].message, problems });
    const late = leadTimeProblem(data, { today: ctx.today(), leadDays: ctx.numberSetting('brief_lead_days', 3), urgent: !!row.urgent });
    if (late) fail(400, 'validation', { field: 'send_start', message: late });
    const number = row.version + 1;
    const hash = sha256Hex(versionPayload({ code: row.code, version: number, title: row.title, data }));
    const at = ctx.nowIso();
    transaction(db, () => {
      db.prepare(`INSERT INTO brief_versions (brief_id, version, title, data, hash, submitted_by_user, submitted_by_account, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(row.id, number, row.title, JSON.stringify(data), hash, actor.user?.id ?? null, actor.account?.id ?? null, at);
      db.prepare("UPDATE briefs SET status = 'enviado', version = ?, submitted_at = ?, send_start = ?, updated_at = ? WHERE id = ?")
        .run(number, at, data.send_start, at, row.id);
      addEvent(row.id, actor, 'enviado', { from: row.status, to: 'enviado', version: number });
    });
    const again = number > 1 ? ` (versión ${number})` : '';
    logActivity(actor, row.id, 'submitted', `${actorLabel(actor)} envió el brief ${row.code}${again}`);
    if (actor.type === 'cliente') {
      toTeam(row, { title: `${row.client_name} envió el brief ${row.code}${again}`, body: `${row.title}. Revisalo y aprobalo o pedí ajustes.` });
      toClient(row, { title: `Recibimos tu solicitud ${row.code}`, body: 'La revisamos y te avisamos por aquí.' }, actor.account.id);
    } else {
      toClient(row, { title: `Registramos tu solicitud ${row.code}${again}`, body: row.title });
    }
    return { version: number, hash };
  }

  /** Cambio de estado hecho por el equipo (aprobar, pedir ajustes, producción, entrega, cierre, cancelación). */
  function transition(row, to, rawNote, user) {
    if (!Object.hasOwn(BRIEF_STATUS, to)) invalid('to', 'Estado no permitido.');
    if (!(BRIEF_TEAM_TRANSITIONS[row.status] ?? []).includes(to)) fail(409, 'invalid_transition', { from: row.status, to });
    const needsNote = transitionNeedsNote(row.status, to);
    const note = text(rawNote, 'note', { max: 2000, min: needsNote ? 5 : 0, required: needsNote });
    const at = ctx.nowIso();
    const final = BRIEF_FINAL_STATUSES.includes(to);
    transaction(db, () => {
      db.prepare(`UPDATE briefs SET status = ?, updated_at = ?,
          approved_version = CASE WHEN ? = 'aprobado' THEN version WHEN ? = 'observado' THEN NULL ELSE approved_version END,
          approved_at = CASE WHEN ? = 'aprobado' THEN ? WHEN ? = 'observado' THEN NULL ELSE approved_at END,
          closed_at = CASE WHEN ? THEN ? ELSE closed_at END
        WHERE id = ?`).run(to, at, to, to, to, at, to, final ? 1 : 0, at, row.id);
      addEvent(row.id, { type: 'equipo', user }, 'estado', { from: row.status, to, version: row.version, body: note });
    });
    ctx.log(user.id, 'brief', row.id, 'status', `${user.name} pasó el brief ${row.code} a ${BRIEF_STATUS[to].label}${note ? `: ${note}` : ''}`);
    toClient(row, { title: `${CLIENT_STATUS_MESSAGES[to]} · ${row.code}`, body: note ?? row.title });
  }

  /** El cliente retira su solicitud antes de la aprobación. */
  function clientCancel(row, account, rawNote) {
    if (!BRIEF_CLIENT_CANCELABLE.includes(row.status)) fail(409, 'invalid_transition', { from: row.status, to: 'cancelado' });
    const note = text(rawNote, 'note', { max: 2000 });
    const at = ctx.nowIso();
    const actor = { type: 'cliente', account };
    transaction(db, () => {
      db.prepare("UPDATE briefs SET status = 'cancelado', closed_at = ?, updated_at = ? WHERE id = ?").run(at, at, row.id);
      addEvent(row.id, actor, 'estado', { from: row.status, to: 'cancelado', version: row.version, body: note });
    });
    logActivity(actor, row.id, 'cancelled', `${actorLabel(actor)} canceló el brief ${row.code}`);
    if (row.status !== 'borrador') toTeam(row, { title: `${row.client_name} canceló el brief ${row.code}`, body: note ?? row.title });
  }

  /** Comentario visible para ambos lados o nota interna (solo equipo). */
  function comment(row, actor, rawBody, { internal = false } = {}) {
    if (BRIEF_FINAL_STATUSES.includes(row.status)) fail(409, 'brief_closed');
    const body = text(rawBody, 'body', { max: 2000, min: 2, required: true });
    const kind = internal && actor.type === 'equipo' ? 'nota_interna' : 'comentario';
    addEvent(row.id, actor, kind, { version: row.version || null, body });
    db.prepare('UPDATE briefs SET updated_at = ? WHERE id = ?').run(ctx.nowIso(), row.id);
    if (kind === 'nota_interna') return;
    if (actor.type === 'cliente') {
      toTeam(row, { title: `${row.client_name} comentó el brief ${row.code}`, body });
    } else {
      toClient(row, { title: `Nuevo comentario en ${row.code}`, body });
    }
  }

  return {
    BRIEF_SELECT, parse, getRow, getForTeam, getForClient, decorate, events, versions, version,
    readData, readTitle, checkFresh, create, update, submit, transition, clientCancel, comment,
  };
}
