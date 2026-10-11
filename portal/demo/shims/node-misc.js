// Sustitutos mínimos de node:os, node:path, node:util y node:fs/promises para la
// demo del navegador. Solo existen para que los módulos de server/ carguen; lo
// que necesita disco (respaldo de la base) responde con un error claro.

const unavailable = (what) => new Error(`${what} no está disponible en la demo del navegador`);

// ── node:os ──
export const tmpdir = () => '/tmp';
export const hostname = () => 'demo';
export const EOL = '\n';

// ── node:path (POSIX) ──
export const sep = '/';
export function join(...parts) {
  const joined = parts.filter((p) => p !== '').join('/');
  return joined.replace(/\/{2,}/g, '/') || '.';
}
export const dirname = (p) => (String(p).includes('/') ? String(p).replace(/\/[^/]*\/?$/, '') || '/' : '.');
export const basename = (p, ext = '') => {
  const base = String(p).replace(/\/+$/, '').split('/').pop();
  return ext && base.endsWith(ext) ? base.slice(0, -ext.length) : base;
};
export const extname = (p) => /(\.[^./]+)$/.exec(basename(p))?.[1] ?? '';

// ── node:util ──
export function promisify(fn) {
  return (...args) => new Promise((resolve, reject) => {
    fn(...args, (error, value) => (error ? reject(error) : resolve(value)));
  });
}

// ── node:fs/promises ──
export const readFile = async () => { throw unavailable('readFile'); };
export const writeFile = async () => { throw unavailable('writeFile'); };
export const stat = async () => { throw unavailable('stat'); };
export const mkdir = async () => { throw unavailable('mkdir'); };
export const readdir = async () => { throw unavailable('readdir'); };
export const rm = async () => {};
export const unlink = async () => {};

export default { tmpdir, hostname, EOL, sep, join, dirname, basename, extname, promisify, readFile, writeFile, stat, mkdir, readdir, rm, unlink };
