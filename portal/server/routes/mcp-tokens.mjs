// ============================================================================
//  server/routes/mcp-tokens.mjs
//  Tokens personales para conectar Claude al portal por MCP (docs/mcp-claude.md).
//  Cada persona gestiona solo los suyos. El token se muestra UNA vez al crearlo;
//  en la base vive solo su hash. Sin dependencias de Node: corre en la demo.
// ============================================================================

import { fail, text } from '../http.mjs';
import { newSessionToken, hashToken } from '../auth.mjs';

export const MCP_TOKEN_PREFIX = 'jcp_';
const MAX_ACTIVE_TOKENS = 10;

export function mcpTokenRoutes(route, ctx) {
  const { db } = ctx;

  const listFor = (userId) => db.prepare(`SELECT id, name, hint, created_at, last_used_at FROM mcp_tokens
    WHERE user_id = ? AND revoked_at IS NULL ORDER BY created_at DESC`).all(userId);

  route('GET', '/api/me/mcp-tokens', 'user', ({ user }) => ({ tokens: listFor(user.id), mcp_path: '/mcp' }));

  route('POST', '/api/me/mcp-tokens', 'user', ({ user, body }) => {
    const name = text(body.name, 'name', { max: 60, min: 2 }) ?? 'Claude';
    const active = db.prepare('SELECT COUNT(*) n FROM mcp_tokens WHERE user_id = ? AND revoked_at IS NULL').get(user.id).n;
    if (active >= MAX_ACTIVE_TOKENS) fail(409, 'too_many_tokens', { message: `Máximo ${MAX_ACTIVE_TOKENS} conexiones activas. Revocá una que no uses.` });
    const token = `${MCP_TOKEN_PREFIX}${newSessionToken()}`;
    const at = ctx.nowIso();
    const { lastInsertRowid } = db.prepare('INSERT INTO mcp_tokens (user_id, name, token_hash, hint, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(user.id, name, hashToken(token), token.slice(-4), at);
    ctx.log(user.id, 'mcp_token', Number(lastInsertRowid), 'created', `${user.name} conectó Claude al portal (${name})`);
    return { token, id: Number(lastInsertRowid), name, mcp_path: '/mcp', tokens: listFor(user.id) };
  });

  route('DELETE', '/api/me/mcp-tokens/:id', 'user', ({ user, params }) => {
    const row = db.prepare('SELECT * FROM mcp_tokens WHERE id = ? AND user_id = ? AND revoked_at IS NULL').get(params.id, user.id) ?? fail(404, 'not_found');
    db.prepare('UPDATE mcp_tokens SET revoked_at = ? WHERE id = ?').run(ctx.nowIso(), row.id);
    ctx.log(user.id, 'mcp_token', row.id, 'revoked', `${user.name} revocó la conexión con Claude (${row.name})`);
    return { tokens: listFor(user.id) };
  });
}
