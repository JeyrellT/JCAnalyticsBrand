// Sustituto de server/auth.mjs para la demo del navegador. scrypt no existe en
// el navegador (y sería lento en JS puro), así que solo se reemplazan hash y
// verificación de contraseñas por SHA-256 con sal. Todo lo demás (política de
// contraseñas, contraseñas temporales, tokens, limitador) es el módulo real:
// vite.demo.config.js redirige a este archivo cualquier import de
// server/auth.mjs, excepto el de aquí abajo.
//
// NO es seguro para producción: los datos de la demo son ficticios y viven
// solo en la memoria de la pestaña.

import {
  MIN_PASSWORD_LENGTH, passwordProblem, temporaryPassword, newSessionToken, hashToken, createLoginLimiter,
} from '../../server/auth.mjs';
import { randomBytes, sha256 } from './crypto.js';

export { MIN_PASSWORD_LENGTH, passwordProblem, temporaryPassword, newSessionToken, hashToken, createLoginLimiter };

const PREFIX = 'demo-sha256';
const digest = (salt, password) => sha256(new TextEncoder().encode(`${salt}:${password}`)).toString('hex');

export async function hashPassword(password) {
  const salt = randomBytes(12).toString('hex');
  return `${PREFIX}$${salt}$${digest(salt, String(password))}`;
}

export async function verifyPassword(password, stored) {
  const [kind, salt, expected] = String(stored).split('$');
  if (kind !== PREFIX || !salt || !expected) return false;
  return digest(salt, String(password)) === expected;
}

export async function burnPasswordCheck(password) {
  await verifyPassword(password, `${PREFIX}$0$0`);
}
