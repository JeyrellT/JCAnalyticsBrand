// ============================================================================
//  server/auth.mjs
//  Contraseñas con scrypt (node:crypto), tokens de sesión aleatorios y un
//  limitador de intentos de login. Solo se guarda el HASH del token: si la base
//  se filtra, las sesiones no se pueden reutilizar.
// ============================================================================

import { randomBytes, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const KEY_LEN = 64;
const PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export const MIN_PASSWORD_LENGTH = 10;

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, KEY_LEN, PARAMS);
  return `scrypt$${PARAMS.N}$${PARAMS.r}$${PARAMS.p}$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(password, stored) {
  const parts = String(stored).split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, N, r, p, saltB64, keyB64] = parts;
  const expected = Buffer.from(keyB64, 'base64');
  const key = await scryptAsync(password, Buffer.from(saltB64, 'base64'), expected.length, {
    N: Number(N), r: Number(r), p: Number(p), maxmem: PARAMS.maxmem,
  });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/** Hash ficticio para igualar el tiempo de respuesta cuando el correo no existe. */
let dummyHash;
export async function burnPasswordCheck(password) {
  dummyHash ??= await hashPassword('jc-portal-dummy-password');
  await verifyPassword(password, dummyHash);
}

/** Patrones que aparecen primero en cualquier diccionario de ataque. */
const WEAK_PATTERNS = /password|contrase[nñ]a|qwerty|asdfgh|123456|abc123|jcanalytic|(.)\1{4,}/i;

export function passwordProblem(password) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) return `La contraseña necesita al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  if (password.length > 200) return 'La contraseña es demasiado larga.';
  if (!/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(password) || !/\d/.test(password)) return 'Usá letras y al menos un número.';
  if (WEAK_PATTERNS.test(password)) return 'Esa contraseña es muy fácil de adivinar. Evitá "password", "123456", el nombre de la empresa o caracteres repetidos.';
  return null;
}

/** Contraseña temporal legible (sin 0/O/l/1) para entregar por un canal seguro. */
export function temporaryPassword() {
  const letters = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const bytes = randomBytes(16);
  // Patrón letra/letra/letra/dígito por grupo: siempre cumple la política.
  const chars = [...bytes].map((b, i) => (i % 4 === 3 ? digits[b % digits.length] : letters[b % letters.length]));
  return [0, 4, 8, 12].map((i) => chars.slice(i, i + 4).join('')).join('-');
}

export const newSessionToken = () => randomBytes(32).toString('base64url');
export const hashToken = (token) => createHash('sha256').update(token).digest('hex');

/**
 * Limitador de intentos fallidos por clave (IP y correo). En memoria: correcto
 * con una sola réplica, igual que la API del asistente.
 */
export function createLoginLimiter({ max = 5, windowMs = 15 * 60_000, now = Date.now } = {}) {
  const buckets = new Map();
  const prune = () => {
    const t = now();
    for (const [key, b] of buckets) if (t - b.start >= windowMs) buckets.delete(key);
  };
  return {
    blocked(keys) {
      prune();
      return keys.some((k) => (buckets.get(k)?.count ?? 0) >= max);
    },
    fail(keys) {
      prune();
      for (const k of keys) {
        const b = buckets.get(k) ?? { start: now(), count: 0 };
        b.count += 1;
        buckets.set(k, b);
      }
    },
    reset(keys) { for (const k of keys) buckets.delete(k); },
    /** Devuelve un intento contado de antemano (login correcto). */
    release(keys) {
      for (const k of keys) {
        const b = buckets.get(k);
        if (b) b.count = Math.max(0, b.count - 1);
      }
    },
  };
}
