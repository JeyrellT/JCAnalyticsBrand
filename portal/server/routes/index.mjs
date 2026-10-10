// Registro único de todas las rutas de la API (servidor y demo usan esta lista).
import { coreRoutes } from './core.mjs';
import { dashboardRoutes } from './dashboard.mjs';
import { workRoutes } from './work.mjs';
import { investmentRoutes } from './investments.mjs';

export function registerRoutes(route, ctx, session) {
  coreRoutes(route, ctx, session);
  dashboardRoutes(route, ctx);
  workRoutes(route, ctx);
  investmentRoutes(route, ctx);
}
