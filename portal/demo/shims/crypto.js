// Sustituto de node:crypto para la demo del navegador (vite.demo.config.js lo
// inyecta en lugar del módulo de Node). Solo cubre lo que usan las rutas y
// server/auth.mjs: randomUUID, randomBytes, createHash('sha256') y
// timingSafeEqual. scrypt no existe aquí: la demo reemplaza hashPassword y
// verifyPassword en shims/auth.js.

/** Uint8Array con toString(hex|base64|base64url), como un Buffer mínimo. */
class DemoBuffer extends Uint8Array {
  toString(encoding = 'utf8') {
    if (encoding === 'hex') return Array.from(this, (b) => b.toString(16).padStart(2, '0')).join('');
    if (encoding === 'base64' || encoding === 'base64url') {
      let binary = '';
      for (const b of this) binary += String.fromCharCode(b);
      const b64 = btoa(binary);
      return encoding === 'base64' ? b64 : b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
    return new TextDecoder().decode(this);
  }
}

const webCrypto = globalThis.crypto;

export function randomBytes(size) {
  const out = new DemoBuffer(size);
  if (webCrypto?.getRandomValues) webCrypto.getRandomValues(out);
  else for (let i = 0; i < size; i += 1) out[i] = Math.floor(Math.random() * 256);
  return out;
}

/** crypto.randomUUID solo existe en contextos seguros: se arma un UUID v4 si falta. */
export function randomUUID() {
  if (typeof webCrypto?.randomUUID === 'function') return webCrypto.randomUUID();
  const b = randomBytes(16);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = b.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// ── SHA-256 en JS puro (síncrono, sin crypto.subtle) ────────────────────────
const PRIMES = [];
for (let n = 2; PRIMES.length < 64; n += 1) if (PRIMES.every((p) => n % p)) PRIMES.push(n);
const frac32 = (x) => ((x - Math.floor(x)) * 2 ** 32) >>> 0;
const K = Uint32Array.from(PRIMES, (p) => frac32(Math.cbrt(p)));
const H0 = Uint32Array.from(PRIMES.slice(0, 8), (p) => frac32(Math.sqrt(p)));
const rotr = (x, n) => (x >>> n) | (x << (32 - n));

export function sha256(bytes) {
  const length = bytes.length;
  const padded = new Uint8Array(Math.ceil((length + 9) / 64) * 64);
  padded.set(bytes);
  padded[length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor(length / 2 ** 29));
  view.setUint32(padded.length - 4, (length << 3) >>> 0);
  const h = H0.slice();
  const w = new Uint32Array(64);
  for (let off = 0; off < padded.length; off += 64) {
    for (let i = 0; i < 16; i += 1) w[i] = view.getUint32(off + i * 4);
    for (let i = 16; i < 64; i += 1) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = w[i - 16] + s0 + w[i - 7] + s1;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i += 1) {
      const t1 = (hh + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    h[0] += a; h[1] += b; h[2] += c; h[3] += d; h[4] += e; h[5] += f; h[6] += g; h[7] += hh;
  }
  const out = new DemoBuffer(32);
  const outView = new DataView(out.buffer);
  h.forEach((word, i) => outView.setUint32(i * 4, word));
  return out;
}

const toBytes = (data) => (typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data));

export function createHash(algorithm) {
  if (String(algorithm).toLowerCase() !== 'sha256') throw new Error(`createHash(${algorithm}) no está disponible en la demo`);
  const parts = [];
  return {
    update(data) { parts.push(toBytes(data)); return this; },
    digest(encoding) {
      const all = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
      let at = 0;
      for (const p of parts) { all.set(p, at); at += p.length; }
      const out = sha256(all);
      return encoding ? out.toString(encoding) : out;
    },
  };
}

export function timingSafeEqual(a, b) {
  if (a.length !== b.length) throw new RangeError('Input buffers must have the same byte length');
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

export function scrypt(...args) {
  const callback = args.at(-1);
  const error = new Error('scrypt no está disponible en la demo del navegador');
  if (typeof callback === 'function') queueMicrotask(() => callback(error));
  else throw error;
}

export default { randomBytes, randomUUID, createHash, timingSafeEqual, scrypt };
