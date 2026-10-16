// ============================================================================
//  server/routes/invites.mjs
//  Enlaces de registro (v7, ver docs/v7-contrato.md).
//
//  El admin (o quien administra el portal de un cliente) crea un enlace; cada
//  persona lo abre, completa SUS datos y elige SU contraseña. Nadie recibe
//  claves temporales por WhatsApp.
//
//  Blindaje:
//  · Token aleatorio de 256 bits; las rutas públicas lo reciben en el cuerpo (no en la URL de la API).
//  · Freno por IP ante tokens inválidos (mismo limitador del ingreso).
//  · Cupo, vigencia y estado se vuelven a verificar dentro de la transacción del alta:
//    dos personas a la vez nunca pasan el máximo.
//  · Un enlace de administrador es siempre personal, de un solo uso y vence en ≤ 7 días.
//  · Un correo identifica a una sola persona en todo el portal (equipo o cliente).
// ============================================================================

import { ROLES, MEMBER_COLORS } from '../../shared/catalog.js';
import { INVITE_KINDS, INVITE_LIMITS, inviteStatus, isInviteToken } from '../../shared/invites.js';
import { publicUser } from '../context.mjs';
import { fail, invalid, has, text, oneOf, id, email, number } from '../http.mjs';
import { hashPassword, passwordProblem, newSessionToken } from '../auth.mjs';
import { transaction } from '../schema.mjs';
import { canManagePortal } from './portal-admin.mjs';

const DAY = 86_400_000;
/** Adónde entra cada quien después de registrarse. */
const homeOf = (invite) => (invite.kind === 'client' ? '/cliente' : invite.role === 'inversionista' ? '/inversionista' : '/');

export function inviteRoutes(route, ctx, session) {
  const { db } = ctx;

  const SELECT = `SELECT i.*, c.name client_name, u.name creator_name FROM invites i
    LEFT JOIN clients c ON c.id = i.client_id LEFT JOIN users u ON u.id = i.created_by`;
  const getInvite = (inviteId) => db.prepare(`${SELECT} WHERE i.id = ?`).get(inviteId) ?? fail(404, 'not_found');
  const byToken = (token) => (isInviteToken(token) ? db.prepare(`${SELECT} WHERE i.token = ?`).get(token) : null);

  /** Quién puede crear o tocar un enlace: los de equipo, solo el admin; los de cliente, quien administra ese cliente. */
  function canManage(user, invite) {
    if (user.role === 'admin') return true;
    if (invite.kind !== 'client') return false;
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(invite.client_id);
    return !!client && canManagePortal(user, client);
  }

  function publicInvite(row, { registrations = false } = {}) {
    const status = inviteStatus(row, ctx.now());
    const out = {
      id: row.id,
      token: row.token,
      kind: row.kind,
      role: row.role,
      client_id: row.client_id,
      client_name: row.client_name ?? null,
      can_approve: !!row.can_approve,
      name: row.name,
      label: row.label,
      message: row.message,
      personal: !!row.name,
      max_uses: row.max_uses,
      uses: row.uses,
      remaining: Math.max(0, row.max_uses - row.uses),
      expires_at: row.expires_at,
      revoked_at: row.revoked_at,
      created_by: row.created_by,
      creator_name: row.creator_name ?? null,
      created_at: row.created_at,
      status,
      home: homeOf(row),
    };
    if (registrations) {
      out.registrations = db.prepare(`SELECT iu.name, iu.email, iu.used_at, iu.user_id, iu.account_id FROM invite_uses iu
        WHERE iu.invite_id = ? ORDER BY iu.used_at DESC, iu.id DESC`).all(row.id);
    }
    return out;
  }

  /** Lo que ve quien abre el enlace: sin token, sin cupos ni datos de otros registrados. */
  function welcomeOf(row) {
    return {
      kind: row.kind,
      role: row.role,
      role_label: row.role ? ROLES[row.role].label : null,
      client_name: row.client_name ?? null,
      name: row.name,
      message: row.message,
      inviter_name: row.creator_name ?? 'JC Analytics',
      expires_at: row.expires_at,
      home: homeOf(row),
    };
  }

  const days = (value, max) => number(value ?? INVITE_LIMITS.defaultDays, 'days', { min: 1, max, required: true });

  // ── Administración ────────────────────────────────────────────────────────
  route('GET', '/api/invites', 'user', ({ user, query }) => {
    const clientId = query.get('client_id') ? id(query.get('client_id'), 'client_id', { required: true }) : null;
    const rows = clientId
      ? db.prepare(`${SELECT} WHERE i.client_id = ? ORDER BY i.created_at DESC, i.id DESC LIMIT 100`).all(clientId)
      : db.prepare(`${SELECT} ORDER BY i.created_at DESC, i.id DESC LIMIT 200`).all();
    return { invites: rows.filter((row) => canManage(user, row)).map((row) => publicInvite(row, { registrations: true })) };
  });

  route('POST', '/api/invites', 'user', ({ user, body }) => {
    const kind = oneOf(body.kind, 'kind', INVITE_KINDS, { required: true });
    const role = kind === 'team' ? oneOf(body.role, 'role', ROLES, { required: true }) : null;
    const clientId = kind === 'client' ? id(body.client_id, 'client_id', { required: true }) : null;
    if (kind === 'client' && !db.prepare('SELECT 1 FROM clients WHERE id = ?').get(clientId)) invalid('client_id', 'Ese cliente no existe.');
    if (!canManage(user, { kind, client_id: clientId })) fail(403, 'forbidden');

    const name = text(body.name, 'name', { max: 80 });
    if (name && name.length < 2) invalid('name', 'Escribí al menos 2 letras.');
    // Un enlace personal (con nombre) o de administrador sirve una sola vez.
    const single = !!name || role === 'admin';
    if (role === 'admin' && !name) invalid('name', 'Un enlace de administrador es personal: escribí el nombre de la persona.');
    const maxUses = single ? 1 : number(body.max_uses ?? 1, 'max_uses', { min: 1, max: INVITE_LIMITS.maxUses, required: true });
    const validDays = days(body.days, role === 'admin' ? INVITE_LIMITS.adminMaxDays : INVITE_LIMITS.maxDays);
    const label = text(body.label, 'label', { max: 80 });
    const message = text(body.message, 'message', { max: 400 });
    const canApprove = body.can_approve == null ? true : !!body.can_approve;

    const now = ctx.now();
    const { lastInsertRowid } = db.prepare(`INSERT INTO invites (token, kind, role, client_id, can_approve, name, label, message, max_uses,
      expires_at, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      newSessionToken(), kind, role, clientId, canApprove ? 1 : 0, name, label, message, Math.trunc(maxUses),
      new Date(now + Math.trunc(validDays) * DAY).toISOString(), user.id, new Date(now).toISOString(),
    );
    const invite = getInvite(Number(lastInsertRowid));
    const target = kind === 'team' ? ROLES[role].label.toLowerCase() : `cliente ${invite.client_name}`;
    ctx.log(user.id, 'invite', invite.id, 'created', name
      ? `${user.name} creó un enlace de registro para ${name} (${target})`
      : `${user.name} creó un enlace de registro abierto (${target}, ${maxUses} cupo${maxUses === 1 ? '' : 's'})`);
    return { invite: publicInvite(invite, { registrations: true }) };
  });

  route('PATCH', '/api/invites/:id', 'user', ({ user, body, params }) => {
    const row = getInvite(params.id);
    if (!canManage(user, row)) fail(403, 'forbidden');
    const next = {
      label: has(body, 'label') ? text(body.label, 'label', { max: 80 }) : row.label,
      message: has(body, 'message') ? text(body.message, 'message', { max: 400 }) : row.message,
      max_uses: row.max_uses,
      expires_at: row.expires_at,
      revoked_at: row.revoked_at,
    };
    if (has(body, 'max_uses')) {
      if (row.name || row.role === 'admin') invalid('max_uses', 'Un enlace personal sirve una sola vez.');
      next.max_uses = Math.trunc(number(body.max_uses, 'max_uses', { min: Math.max(1, row.uses), max: INVITE_LIMITS.maxUses, required: true }));
    }
    if (has(body, 'days')) {
      const d = days(body.days, row.role === 'admin' ? INVITE_LIMITS.adminMaxDays : INVITE_LIMITS.maxDays);
      next.expires_at = new Date(ctx.now() + Math.trunc(d) * DAY).toISOString();
    }
    if (has(body, 'active')) next.revoked_at = body.active ? null : (row.revoked_at ?? ctx.nowIso());
    db.prepare('UPDATE invites SET label = ?, message = ?, max_uses = ?, expires_at = ?, revoked_at = ? WHERE id = ?')
      .run(next.label, next.message, next.max_uses, next.expires_at, next.revoked_at, row.id);
    const what = has(body, 'active') ? (body.active ? 'reactivó' : 'desactivó') : 'ajustó';
    ctx.log(user.id, 'invite', row.id, 'updated', `${user.name} ${what} el enlace de registro ${row.name ? `de ${row.name}` : row.label ? `"${row.label}"` : `#${row.id}`}`);
    return { invite: publicInvite(getInvite(row.id), { registrations: true }) };
  });

  // Borrar solo se permite si nadie lo usó (si no, se desactiva y queda como registro).
  route('DELETE', '/api/invites/:id', 'user', ({ user, params }) => {
    const row = getInvite(params.id);
    if (!canManage(user, row)) fail(403, 'forbidden');
    if (row.uses > 0) fail(409, 'invite_used');
    db.prepare('DELETE FROM invites WHERE id = ?').run(row.id);
    ctx.log(user.id, 'invite', row.id, 'deleted', `${user.name} eliminó un enlace de registro sin usar`);
    return { ok: true };
  });

  // ── Públicas: abrir el enlace y registrarse ───────────────────────────────
  /** Freno por IP: los tokens inválidos cuentan como intentos fallidos de ingreso. */
  function usable(token, ip) {
    const keys = [`ip:${ip}`, `invite:${ip}`];
    if (session.limiter.blocked(keys)) fail(429, 'too_many_attempts');
    const row = byToken(token);
    if (!row) {
      session.limiter.fail(keys);
      fail(404, 'invite_not_found');
    }
    const status = inviteStatus(row, ctx.now());
    if (status !== 'activo') fail(410, 'invite_unavailable', { status });
    if (row.kind === 'client' && !row.client_name) fail(410, 'invite_unavailable', { status: 'revocado' });
    return row;
  }

  route('POST', '/api/invites/lookup', 'public', ({ body, ip }) => ({ invite: welcomeOf(usable(body.token, ip)) }));

  route('POST', '/api/invites/accept', 'public', async ({ body, req, res, ip }) => {
    const first = usable(body.token, ip);
    const name = text(body.name, 'name', { max: 80, min: 2, required: true });
    const mail = email(body.email);
    const phone = text(body.phone, 'phone', { max: 30 });
    const title = first.kind === 'client' ? text(body.title, 'title', { max: 80 }) : null;
    const problem = passwordProblem(body.password);
    if (problem) invalid('password', problem);
    const hash = await hashPassword(body.password);

    // Todo se vuelve a verificar adentro: el hash tarda y otra persona pudo usar el último cupo.
    const created = transaction(db, () => {
      const row = byToken(body.token) ?? fail(404, 'invite_not_found');
      const status = inviteStatus(row, ctx.now());
      if (status !== 'activo') fail(410, 'invite_unavailable', { status });
      if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(mail) || db.prepare('SELECT 1 FROM client_accounts WHERE email = ?').get(mail)) {
        invalid('email', 'Ese correo ya tiene acceso al portal. Ingresá con él o usá otro.');
      }
      const at = ctx.nowIso();
      let userId = null;
      let accountId = null;
      if (row.kind === 'team') {
        const count = db.prepare('SELECT COUNT(*) n FROM users').get().n;
        userId = Number(db.prepare(`INSERT INTO users (email, name, role, color, phone, password_hash, must_change_password, created_at)
          VALUES (?, ?, ?, ?, ?, ?, 0, ?)`).run(mail, name, row.role, MEMBER_COLORS[count % MEMBER_COLORS.length], phone, hash, at).lastInsertRowid);
      } else {
        accountId = Number(db.prepare(`INSERT INTO client_accounts (client_id, email, name, phone, title, can_approve, password_hash,
          must_change_password, active, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?)`).run(
          row.client_id, mail, name, phone, title, row.can_approve, hash, row.created_by, at,
        ).lastInsertRowid);
        db.prepare('INSERT INTO client_notifications (account_id, kind, title, body, link, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
          accountId, 'cuenta', 'Bienvenida al portal de JC Analytics', 'Aquí ves tus proyectos, solicitudes, entregables y documentos.', '/cliente', at,
        );
      }
      db.prepare('UPDATE invites SET uses = uses + 1 WHERE id = ?').run(row.id);
      db.prepare('INSERT INTO invite_uses (invite_id, user_id, account_id, name, email, ip, used_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(row.id, userId, accountId, name, mail, ip, at);
      return { row, userId, accountId };
    });

    const { row, userId, accountId } = created;
    const what = row.kind === 'team' ? ROLES[row.role].label.toLowerCase() : `cliente de ${row.client_name}`;
    const link = row.kind === 'team' ? '/equipo?tab=enlaces' : `/clientes/${row.client_id}`;
    ctx.notify([row.created_by], null, {
      kind: 'registro',
      title: `${name} se registró como ${what}`,
      body: row.label ? `Enlace "${row.label}" · ${row.uses + 1} de ${row.max_uses}` : 'Con su enlace personal de registro',
      link,
    });
    if (row.kind === 'team') {
      ctx.log(userId, 'user', userId, 'registered', `${name} se registró con un enlace como ${what}`);
      session.start(res, req, userId, ip);
      db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(ctx.nowIso(), userId);
      return { kind: 'team', home: homeOf(row), user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(userId)) };
    }
    ctx.log(row.created_by, 'client_account', accountId, 'registered', `${name} se registró en el portal de ${row.client_name} con un enlace`);
    session.client.start(res, req, accountId, ip);
    db.prepare('UPDATE client_accounts SET last_login_at = ? WHERE id = ?').run(ctx.nowIso(), accountId);
    return { kind: 'client', home: '/cliente', account: { id: accountId, name, email: mail } };
  });
}
