// Registro único de todas las rutas de la API (servidor y demo usan esta lista).
import { coreRoutes } from './core.mjs';
import { dashboardRoutes } from './dashboard.mjs';
import { workRoutes } from './work.mjs';
import { chargeRoutes } from './charges.mjs';
import { investmentRoutes } from './investments.mjs';
import { clientRoutes } from './clients.mjs';
import { serviceRoutes } from './services.mjs';
import { peopleRoutes } from './people.mjs';
import { pushRoutes } from './push.mjs';
import { automationRoutes } from './automations.mjs';
import { briefRoutes } from './briefs.mjs';
import { portalAdminRoutes } from './portal-admin.mjs';
import { clientPortalRoutes } from './client-portal.mjs';
import { investorRoutes } from './investor.mjs';
import { inviteRoutes } from './invites.mjs';
import { financeRoutes } from './finance.mjs';
import { mcpTokenRoutes } from './mcp-tokens.mjs';
import { directoryRoutes } from './directory.mjs';
import { leadRoutes } from './leads.mjs';
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
  chargeRoutes(route, ctx);
  investmentRoutes(route, ctx);
  financeRoutes(route, ctx);
  clientRoutes(route, ctx);
  serviceRoutes(route, ctx);
  peopleRoutes(route, ctx);
  pushRoutes(route, ctx);
  automationRoutes(route, ctx);
  // v5: brief creativo y portal de clientes (docs/v5-contrato.md).
  briefRoutes(route, ctx);
  portalAdminRoutes(route, ctx);
  clientPortalRoutes(route, ctx, session);
  // v6: portal de inversionistas (docs/v6-contrato.md).
  investorRoutes(route, ctx);
  // v7: enlaces de registro (docs/v7-contrato.md).
  inviteRoutes(route, ctx, session);
  // Conexión con Claude por MCP (docs/mcp-claude.md).
  mcpTokenRoutes(route, ctx);
  // Libro amarillo: prospección por teléfono (docs/libro-amarillo.md).
  directoryRoutes(route, ctx);
  // Consultas del sitio y analítica de tráfico (docs/consultas-y-trafico.md).
  leadRoutes(route, ctx);
}
