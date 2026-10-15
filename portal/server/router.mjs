// ============================================================================
//  server/router.mjs
//  Tabla de rutas y autorización por rol, SIN dependencias de Node: la usan el
//  servidor HTTP (app.mjs) y la demo que corre en el navegador.
//
//  Parámetros de ruta:  :id  → número entero   ·   :key → texto [a-z0-9_]
//  Acceso: public · any (incluye contraseña temporal) · user · invest (socio/admin) · admin
// ============================================================================

import { canInvest } from '../shared/catalog.js';
import { HttpError } from './http.mjs';

export function createRouter() {
  const routes = [];

  function route(method, path, access, handler) {
    const keys = [];
    const source = path.replace(/\./g, '\\.').replace(/:(\w+)/g, (_, k) => {
      keys.push(k);
      return k === 'key' ? '([a-z0-9_]+)' : '(\\d+)';
    });
    routes.push({ method, pattern: new RegExp(`^${source}$`), keys, access, handler });
  }

  /** Busca la ruta; lanza 404/405 si no existe. Devuelve { route, params }. */
  function match(method, pathname) {
    const candidates = routes.filter((r) => r.pattern.test(pathname));
    if (!candidates.length) throw new HttpError(404, 'not_found');
    const found = candidates.find((r) => r.method === method);
    if (!found) throw new HttpError(405, 'method_not_allowed');
    const values = found.pattern.exec(pathname).slice(1);
    const params = Object.fromEntries(found.keys.map((k, i) => [k, k === 'key' ? values[i] : Number(values[i])]));
    return { route: found, params };
  }

  /** Verifica el acceso de la ruta para el usuario actual (o lanza 401/403). */
  function authorize(found, user) {
    if (found.access === 'public') return;
    if (!user) throw new HttpError(401, 'unauthenticated');
    // Con contraseña temporal solo se permite ver el perfil, cambiarla o salir.
    if (found.access !== 'any' && user.must_change_password) throw new HttpError(403, 'password_change_required');
    if (found.access === 'invest' && !canInvest(user)) throw new HttpError(403, 'forbidden');
    if (found.access === 'admin' && user.role !== 'admin') throw new HttpError(403, 'forbidden');
  }

  return { route, match, authorize, routes };
}
