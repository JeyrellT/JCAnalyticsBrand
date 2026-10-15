// ============================================================================
//  server/http.mjs
//  Utilidades HTTP sin dependencias: errores tipados, lectura de JSON con
//  límite de tamaño, cookies y validadores de entrada. Todo dato que entra por
//  la API pasa por estos validadores antes de tocar la base.
// ============================================================================

export class HttpError extends Error {
  constructor(status, code, extra = {}) {
    super(code);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

export const fail = (status, code, extra) => { throw new HttpError(status, code, extra); };
export const invalid = (field, message) => fail(400, 'validation', { field, message });

const MAX_BODY = 64 * 1024;

export async function readJson(request) {
  if (request.method === 'GET' || request.method === 'DELETE') return {};
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY) fail(413, 'body_too_large');
    chunks.push(chunk);
  }
  // Una acción sin datos (cerrar sesión, restablecer contraseña) llega sin cuerpo.
  if (!size) return {};
  const type = request.headers['content-type']?.split(';')[0].trim();
  if (type !== 'application/json') fail(415, 'json_required');
  try {
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'invalid_json');
    return body;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    return fail(400, 'invalid_json');
  }
}

export function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const key = part.slice(0, idx).trim();
    if (!key) continue;
    // Una cookie mal codificada (%E0…) se ignora en vez de tumbar la petición con un 500.
    try { out[key] = decodeURIComponent(part.slice(idx + 1).trim()); } catch { /* cookie inválida */ }
  }
  return out;
}

export function serializeCookie(name, value, { maxAge, secure, httpOnly = true, sameSite = 'Strict', path = '/' } = {}) {
  let cookie = `${name}=${encodeURIComponent(value)}; Path=${path}; SameSite=${sameSite}`;
  if (httpOnly) cookie += '; HttpOnly';
  if (secure) cookie += '; Secure';
  if (maxAge != null) cookie += `; Max-Age=${Math.floor(maxAge)}`;
  return cookie;
}

// ── Validadores ─────────────────────────────────────────────────────────────

/** Texto recortado; null si viene vacío y no es requerido. */
export function text(value, field, { max = 200, min = 0, required = false } = {}) {
  if (value == null || (typeof value === 'string' && value.trim() === '')) {
    if (required) invalid(field, 'Campo requerido.');
    return null;
  }
  if (typeof value !== 'string') invalid(field, 'Debe ser texto.');
  const v = value.trim().replaceAll('\0', '');
  if (v.length < min) invalid(field, `Mínimo ${min} caracteres.`);
  if (v.length > max) invalid(field, `Máximo ${max} caracteres.`);
  return v;
}

export function oneOf(value, field, options, { required = false, fallback = null } = {}) {
  if (value == null || value === '') {
    if (required) invalid(field, 'Campo requerido.');
    return fallback;
  }
  const keys = Array.isArray(options) ? options : Object.keys(options);
  if (!keys.includes(value)) invalid(field, 'Valor no permitido.');
  return value;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export function dateOnly(value, field, { required = false } = {}) {
  if (value == null || value === '') {
    if (required) invalid(field, 'Fecha requerida.');
    return null;
  }
  if (typeof value !== 'string' || !DATE_RE.test(value)) invalid(field, 'Formato de fecha AAAA-MM-DD.');
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) invalid(field, 'Fecha inválida.');
  return value;
}

export function dateTime(value, field, { required = false } = {}) {
  if (value == null || value === '') {
    if (required) invalid(field, 'Fecha y hora requeridas.');
    return null;
  }
  if (typeof value !== 'string' || value.length > 40) invalid(field, 'Fecha y hora inválidas.');
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) invalid(field, 'Fecha y hora inválidas.');
  return d.toISOString();
}

export function id(value, field, { required = false } = {}) {
  if (value == null || value === '') {
    if (required) invalid(field, 'Campo requerido.');
    return null;
  }
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n <= 0) invalid(field, 'Identificador inválido.');
  return n;
}

export function minorAmount(value, field, { required = false, allowZero = false } = {}) {
  if (value == null || value === '') {
    if (required) invalid(field, 'Monto requerido.');
    return null;
  }
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 0 || (!allowZero && n === 0)) invalid(field, 'Monto inválido.');
  if (n > 1e15) invalid(field, 'Monto fuera de rango.');
  return n;
}

export function number(value, field, { min = -Infinity, max = Infinity, required = false } = {}) {
  if (value == null || value === '') {
    if (required) invalid(field, 'Campo requerido.');
    return null;
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) invalid(field, `Valor entre ${min} y ${max}.`);
  return n;
}

export function email(value, field = 'email') {
  const v = text(value, field, { max: 160, required: true }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) invalid(field, 'Correo inválido.');
  return v;
}

export function url(value, field) {
  const v = text(value, field, { max: 500 });
  if (v == null) return null;
  try {
    const u = new URL(v);
    if (!['http:', 'https:'].includes(u.protocol)) throw new Error('protocol');
    return u.toString();
  } catch {
    return invalid(field, 'Enlace inválido (usar https://…).');
  }
}

export function color(value, field) {
  if (value == null || value === '') return null;
  if (typeof value !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(value)) invalid(field, 'Color inválido.');
  return value.toLowerCase();
}

/** Solo copia las claves presentes en body (para PATCH parciales). */
export const has = (body, key) => Object.prototype.hasOwnProperty.call(body, key);
