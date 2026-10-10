// ============================================================================
//  server/routes/core.mjs
//  Sesión, perfil, equipo (usuarios), configuración, buzón, bitácora y respaldo.
// ============================================================================

import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFile, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { ROLES, MEMBER_COLORS, canInvest } from '../../shared/catalog.js';
import { publicUser, SENSITIVE_KINDS } from '../context.mjs';
import { fail, invalid, has, text, oneOf, email, color, id, number } from '../http.mjs';
import { hashPassword, verifyPassword, passwordProblem, temporaryPassword, burnPasswordCheck } from '../auth.mjs';

export function coreRoutes(route, ctx, session) {
  const { db } = ctx;

  // ── Sesión ────────────────────────────────────────────────────────────────
  route('POST', '/api/auth/login', 'public', async ({ body, req, res, ip }) => {
    const mail = typeof body.email === 'string' ? body.email.trim().toLowerCase().slice(0, 160) : '';
    const password = typeof body.password === 'string' ? body.password.slice(0, 200) : '';
    const keys = [`ip:${ip}`, `email:${mail}`];
    if (session.limiter.blocked(keys)) fail(429, 'too_many_attempts');
    // Se cuenta antes de verificar: así varias peticiones en paralelo no esquivan el límite.
    session.limiter.fail(keys);
    const row = mail ? db.prepare('SELECT * FROM users WHERE email = ?').get(mail) : null;
    const ok = row && row.active ? await verifyPassword(password, row.password_hash) : (await burnPasswordCheck(password), false);
    if (!ok) {
      ctx.log(row?.id, 'auth', row?.id, 'login_failed', `Intento de acceso fallido${mail ? ` (${mail})` : ''}`);
      fail(401, 'invalid_credentials');
    }
    session.limiter.reset(keys);
    session.start(res, req, row.id, ip);
    db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(ctx.nowIso(), row.id);
    ctx.log(row.id, 'auth', row.id, 'login', `${row.name} inició sesión`);
    return { user: publicUser(row) };
  });

  route('POST', '/api/auth/logout', 'any', ({ req, res }) => {
    session.end(req, res);
    return { ok: true };
  });

  route('GET', '/api/me', 'any', ({ user }) => ({
    user: publicUser(user),
    settings: ctx.settings(),
    unread: unreadCount(user),
    pending_confirmations: canInvest(user) ? pendingForUser(ctx, user).length : 0,
  }));

  route('PATCH', '/api/me', 'user', ({ user, body }) => {
    const name = has(body, 'name') ? text(body.name, 'name', { max: 80, min: 2, required: true }) : user.name;
    const c = has(body, 'color') ? color(body.color, 'color') ?? user.color : user.color;
    const phone = has(body, 'phone') ? text(body.phone, 'phone', { max: 30 }) : user.phone;
    db.prepare('UPDATE users SET name = ?, color = ?, phone = ? WHERE id = ?').run(name, c, phone, user.id);
    return { user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(user.id)) };
  });

  route('POST', '/api/me/password', 'any', async ({ user, body, req }) => {
    const current = typeof body.current_password === 'string' ? body.current_password : '';
    const next = body.new_password;
    if (!(await verifyPassword(current, user.password_hash))) invalid('current_password', 'La contraseña actual no coincide.');
    const problem = passwordProblem(next);
    if (problem) invalid('new_password', problem);
    if (next === current) invalid('new_password', 'Elegí una contraseña distinta a la actual.');
    db.prepare('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?').run(await hashPassword(next), user.id);
    session.endOthers(req, user.id);
    ctx.log(user.id, 'auth', user.id, 'password_changed', `${user.name} cambió su contraseña`);
    return { ok: true };
  });

  // ── Equipo ────────────────────────────────────────────────────────────────
  route('GET', '/api/users', 'user', () => ({
    users: db.prepare('SELECT * FROM users ORDER BY active DESC, name').all().map(publicUser),
    roles: ROLES,
  }));

  route('POST', '/api/users', 'admin', async ({ user, body }) => {
    const name = text(body.name, 'name', { max: 80, min: 2, required: true });
    const mail = email(body.email);
    const role = oneOf(body.role, 'role', ROLES, { required: true });
    const count = db.prepare('SELECT COUNT(*) n FROM users').get().n;
    const c = color(body.color, 'color') ?? MEMBER_COLORS[count % MEMBER_COLORS.length];
    const phone = text(body.phone, 'phone', { max: 30 });
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(mail)) invalid('email', 'Ya existe una persona con ese correo.');
    const temp = temporaryPassword();
    const { lastInsertRowid } = db.prepare(
      'INSERT INTO users (email, name, role, color, phone, password_hash, must_change_password, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)',
    ).run(mail, name, role, c, phone, await hashPassword(temp), ctx.nowIso());
    ctx.log(user.id, 'user', Number(lastInsertRowid), 'created', `${user.name} agregó a ${name} (${ROLES[role].label})`);
    return { user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(lastInsertRowid)), temporary_password: temp };
  });

  route('PATCH', '/api/users/:id', 'admin', ({ user, body, params }) => {
    const target = db.prepare('SELECT * FROM users WHERE id = ?').get(params.id) ?? fail(404, 'not_found');
    const next = {
      name: has(body, 'name') ? text(body.name, 'name', { max: 80, min: 2, required: true }) : target.name,
      role: has(body, 'role') ? oneOf(body.role, 'role', ROLES, { required: true }) : target.role,
      color: has(body, 'color') ? color(body.color, 'color') ?? target.color : target.color,
      phone: has(body, 'phone') ? text(body.phone, 'phone', { max: 30 }) : target.phone,
      active: has(body, 'active') ? (body.active ? 1 : 0) : target.active,
    };
    // Candado anti-bloqueo: siempre debe quedar al menos un administrador activo.
    const losesAdmin = target.role === 'admin' && target.active && (next.role !== 'admin' || !next.active);
    if (losesAdmin) {
      const admins = db.prepare("SELECT COUNT(*) n FROM users WHERE role = 'admin' AND active = 1").get().n;
      if (admins <= 1) invalid('role', 'Debe quedar al menos un administrador activo.');
    }
    if (target.id === user.id && !next.active) invalid('active', 'No podés desactivar tu propio usuario.');
    db.prepare('UPDATE users SET name = ?, role = ?, color = ?, phone = ?, active = ? WHERE id = ?')
      .run(next.name, next.role, next.color, next.phone, next.active, target.id);
    if (!next.active) db.prepare('DELETE FROM sessions WHERE user_id = ?').run(target.id);
    ctx.log(user.id, 'user', target.id, 'updated', `${user.name} actualizó a ${next.name}${!next.active ? ' (desactivado)' : ''}`);
    return { user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(target.id)) };
  });

  route('POST', '/api/users/:id/reset-password', 'admin', async ({ user, params }) => {
    const target = db.prepare('SELECT * FROM users WHERE id = ?').get(params.id) ?? fail(404, 'not_found');
    const temp = temporaryPassword();
    db.prepare('UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?').run(await hashPassword(temp), target.id);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(target.id);
    ctx.log(user.id, 'user', target.id, 'password_reset', `${user.name} restableció la contraseña de ${target.name}`);
    return { temporary_password: temp };
  });

  // ── Configuración ─────────────────────────────────────────────────────────
  route('GET', '/api/settings', 'user', () => ({ settings: ctx.settings() }));

  route('PATCH', '/api/settings', 'admin', ({ user, body }) => {
    const rules = {
      fx_usd_crc: { min: 100, max: 2000 },
      update_sla_hours: { min: 12, max: 336 },
      wip_en_progreso: { min: 1, max: 50 },
      wip_revision: { min: 1, max: 50 },
    };
    const upsert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
    const changed = [];
    for (const [key, range] of Object.entries(rules)) {
      if (!has(body, key)) continue;
      const v = number(body[key], key, { ...range, required: true });
      upsert.run(key, String(v));
      changed.push(`${key}=${v}`);
    }
    if (changed.length) ctx.log(user.id, 'settings', null, 'updated', `${user.name} actualizó la configuración: ${changed.join(', ')}`);
    return { settings: ctx.settings() };
  });

  // ── Buzón ─────────────────────────────────────────────────────────────────
  // Quien deja de ser socio (o es desactivado y reactivado como colaborador) tampoco ve avisos viejos de dinero.
  const hiddenKinds = (user) => (canInvest(user) ? '' : `AND kind NOT IN (${SENSITIVE_KINDS.map((k) => `'${k}'`).join(',')})`);
  function unreadCount(user) {
    return db.prepare(`SELECT COUNT(*) n FROM notifications WHERE user_id = ? AND read_at IS NULL ${hiddenKinds(user)}`).get(user.id).n;
  }

  route('GET', '/api/notifications', 'user', ({ user }) => ({
    notifications: db.prepare(`SELECT * FROM notifications WHERE user_id = ? ${hiddenKinds(user)} ORDER BY created_at DESC, id DESC LIMIT 80`).all(user.id),
    unread: unreadCount(user),
  }));

  route('POST', '/api/notifications/read', 'user', ({ user, body }) => {
    const at = ctx.nowIso();
    if (body.all) {
      db.prepare('UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL').run(at, user.id);
    } else {
      if (!Array.isArray(body.ids) || body.ids.length > 200) invalid('ids', 'Lista inválida.');
      const stmt = db.prepare('UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ? AND read_at IS NULL');
      for (const raw of body.ids) stmt.run(at, id(raw, 'ids', { required: true }), user.id);
    }
    return { unread: unreadCount(user) };
  });

  // ── Bitácora ──────────────────────────────────────────────────────────────
  route('GET', '/api/activity', 'user', ({ user, query }) => {
    const limit = Math.max(1, Math.min(Math.trunc(Number(query.get('limit'))) || 100, 300));
    const entity = query.get('entity');
    const sensitive = canInvest(user) ? '' : 'AND a.sensitive = 0';
    const byEntity = entity ? 'AND a.entity = ?' : '';
    const args = entity ? [entity, limit] : [limit];
    return {
      activity: db.prepare(`SELECT a.*, u.name user_name, u.color user_color FROM activity a LEFT JOIN users u ON u.id = a.user_id
        WHERE a.action <> 'login_failed' ${sensitive} ${byEntity} ORDER BY a.created_at DESC, a.id DESC LIMIT ?`).all(...args),
    };
  });

  // ── Respaldo (solo admin) ─────────────────────────────────────────────────
  route('GET', '/api/admin/backup', 'admin', async ({ user, res }) => {
    const file = join(tmpdir(), `jc-portal-backup-${randomUUID()}.sqlite`);
    try {
      db.prepare('VACUUM INTO ?').run(file);
      const data = await readFile(file);
      ctx.log(user.id, 'settings', null, 'backup', `${user.name} descargó un respaldo de la base`);
      res.writeHead(200, {
        'Content-Type': 'application/vnd.sqlite3',
        'Content-Disposition': `attachment; filename="jc-portal-${ctx.today()}.sqlite"`,
        'Cache-Control': 'no-store',
      });
      res.end(data);
    } finally {
      await rm(file, { force: true });
    }
  });
}

/** Movimientos que este usuario debe confirmar (regla de doble control). */
export function pendingForUser(ctx, user) {
  // Misma regla que canResolve() en routes/investments.mjs.
  return ctx.db.prepare(`SELECT m.* FROM movements m JOIN users p ON p.id = m.partner_id
    WHERE m.status = 'pendiente' AND m.created_by <> ?
      AND (m.created_by = m.partner_id OR m.partner_id = ? OR p.active = 0 OR p.role NOT IN ('admin','socio'))
    ORDER BY m.created_at`).all(user.id, user.id);
}
