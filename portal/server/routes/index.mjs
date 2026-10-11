// Registro único de todas las rutas de la API (servidor y demo usan esta lista).
import { coreRoutes } from './core.mjs';
import { dashboardRoutes } from './dashboard.mjs';
import { workRoutes } from './work.mjs';
import { investmentRoutes } from './investments.mjs';
import { clientRoutes } from './clients.mjs';
import { serviceRoutes } from './services.mjs';
import { peopleRoutes } from './people.mjs';
import { pushRoutes } from './push.mjs';
import { automationRoutes } from './automations.mjs';
import { installPushDispatch } from '../notify-policy.mjs';
import { createAutomationEngine } from '../automations.mjs';

export function registerRoutes(route, ctx, session) {
  // v3: cada aviso de ctx.notify pasa por la política de push, y el motor de
  // automatizaciones queda en ctx.automations (index.mjs y la demo llaman a runDue()).
  installPushDispatch(ctx);
  if (!ctx.automations) ctx.automations = createAutomationEngine(ctx);

  coreRoutes(route, ctx, session);
  dashboardRoutes(route, ctx);
  workRoutes(route, ctx);
  investmentRoutes(route, ctx);
  clientRoutes(route, ctx);
  serviceRoutes(route, ctx);
  peopleRoutes(route, ctx);
  pushRoutes(route, ctx);
  automationRoutes(route, ctx);
}
