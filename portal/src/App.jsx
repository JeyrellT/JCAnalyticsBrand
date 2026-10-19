import { Suspense, lazy, useEffect, useState } from 'react';
import { SessionProvider, useSession } from './lib/session.jsx';
import { useLocation, matchPath, navigate } from './lib/router.jsx';
import { ToastProvider, ConfirmProvider, PageLoader, EmptyState } from './components/ui.jsx';
import Layout from './components/Layout.jsx';
import { Login, ForcePasswordChange } from './pages/Login.jsx';
import { api, isDemo } from './lib/api.js';
import Dashboard from './pages/Dashboard.jsx';
import { WifiOff, Compass } from 'lucide-react';

// Las secciones pesadas (gráficos) se cargan bajo demanda.
const Projects = lazy(() => import('./pages/Projects.jsx'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail.jsx'));
const Board = lazy(() => import('./pages/Board.jsx'));
const Agenda = lazy(() => import('./pages/Agenda.jsx'));
const Investments = lazy(() => import('./pages/Investments.jsx'));
const InvestmentDetail = lazy(() => import('./pages/InvestmentDetail.jsx'));
const Finance = lazy(() => import('./pages/Finance.jsx'));
const InboxPage = lazy(() => import('./pages/Inbox.jsx'));
const WhatsApp = lazy(() => import('./pages/WhatsApp.jsx'));
const Team = lazy(() => import('./pages/Team.jsx'));
const Activity = lazy(() => import('./pages/Activity.jsx'));
const Services = lazy(() => import('./pages/Services.jsx'));
const ServiceDetail = lazy(() => import('./pages/ServiceDetail.jsx'));
const Clients = lazy(() => import('./pages/Clients.jsx'));
const ClientDetail = lazy(() => import('./pages/ClientDetail.jsx'));
const Person = lazy(() => import('./pages/Person.jsx'));
const Automations = lazy(() => import('./pages/Automations.jsx'));
const NotificationSettings = lazy(() => import('./pages/NotificationSettings.jsx'));
// v5: portal de clientes (identidad aparte; nunca monta el Layout ni las rutas del equipo).
const ClientApp = lazy(() => import('./client/ClientApp.jsx'));
// v6: portal de inversionistas (personas con rol 'inversionista'; nunca montan el Layout del equipo).
const InvestorApp = lazy(() => import('./investor/InvestorApp.jsx'));
// v5: brief creativo (bandeja, ficha y vista A4 imprimible sin el Layout).
const Briefs = lazy(() => import('./pages/Briefs.jsx'));
const BriefDetail = lazy(() => import('./pages/BriefDetail.jsx'));
const BriefPrint = lazy(() => import('./pages/BriefPrint.jsx'));
// v6: configuración inicial del dueño (solo con la base vacía) y su bienvenida de una sola vez.
const Setup = lazy(() => import('./pages/Setup.jsx').then((m) => ({ default: m.Setup })));
const SetupWelcome = lazy(() => import('./pages/Setup.jsx').then((m) => ({ default: m.SetupWelcome })));
// v7: registro con enlace (pública; quien la abre completa sus datos y elige su contraseña).
const Register = lazy(() => import('./pages/Register.jsx'));

const ROUTES = [
  ['/', Dashboard],
  ['/proyectos', Projects],
  ['/proyectos/:id', ProjectDetail],
  ['/tablero', Board],
  ['/agenda', Agenda],
  ['/inversiones', Investments, { invest: true }],
  ['/inversiones/:id', InvestmentDetail, { invest: true }],
  ['/finanzas', Finance, { invest: true }],
  ['/buzon', InboxPage],
  ['/whatsapp', WhatsApp],
  ['/whatsapp/:id', WhatsApp],
  ['/equipo', Team],
  ['/equipo/:id', Person],
  ['/servicios', Services],
  ['/servicios/:key', ServiceDetail],
  ['/clientes', Clients],
  ['/clientes/:id', ClientDetail],
  // v5: '/briefs/nuevo' va antes que '/briefs/:id'.
  ['/briefs', Briefs],
  ['/briefs/nuevo', BriefDetail],
  ['/briefs/:id', BriefDetail],
  ['/automatizaciones', Automations],
  ['/notificaciones', NotificationSettings],
  ['/bitacora', Activity],
];

const TITLES = { '/': 'Centro de operaciones', '/proyectos': 'Proyectos', '/clientes': 'Clientes', '/servicios': 'Servicios', '/tablero': 'Tablero', '/agenda': 'Agenda', '/inversiones': 'Inversiones', '/finanzas': 'Finanzas y costos', '/buzon': 'Buzón', '/whatsapp': 'WhatsApp', '/equipo': 'Equipo', '/bitacora': 'Bitácora', '/automatizaciones': 'Automatizaciones', '/notificaciones': 'Avisos y app', '/briefs': 'Briefs' /* v5 */ };

function Router() {
  const { path } = useLocation();
  const { canInvest } = useSession();
  const section = `/${path.split('/')[1]}`;
  // Un enlace al portal de inversionistas o de clientes abierto con sesión del equipo lleva al inicio del equipo.
  const otherPortal = section === '/inversionista' || section === '/cliente';
  useEffect(() => { if (otherPortal) navigate('/', { replace: true }); }, [otherPortal]);
  useEffect(() => { document.title = `${TITLES[section] ?? 'Portal'} · JC Analytics`; }, [section]);
  if (otherPortal) return <PageLoader />;
  for (const [pattern, Page, opts] of ROUTES) {
    const params = matchPath(pattern, path);
    if (!params) continue;
    if (opts?.invest && !canInvest) break;
    // La clave por patrón remonta la página al cambiar de sección (entrada suave) sin remontar al cambiar solo el id.
    return <Suspense fallback={<PageLoader />}><div key={pattern} className="animate-fade"><Page params={params} /></div></Suspense>;
  }
  return <EmptyState icon={Compass} title="Esta sección no existe">Revisá el enlace o volvé al centro de operaciones.</EmptyState>;
}

/**
 * v6: ¿falta la configuración inicial del dueño? Se pregunta una sola vez y solo sin sesión
 * (la demo nunca la necesita). null mientras se averigua; si la consulta falla, se sigue al ingreso.
 */
function useSetupStatus(anonymous) {
  const [status, setStatus] = useState(null);
  const ask = anonymous && status === null && !isDemo();
  useEffect(() => {
    if (!ask) return undefined;
    let alive = true;
    const settle = (next) => { if (alive) setStatus(next); };
    api('/api/setup', { quiet: true }).then(
      (r) => settle({ needed: !!r?.needed, available: !!r?.available }),
      () => settle({ needed: false, available: false }),
    );
    return () => { alive = false; };
  }, [ask]);
  return [status, setStatus];
}

export function App() {
  const session = useSession();
  const { path } = useLocation(); // v5: la vista imprimible del brief va sin Layout
  const [setup, setSetup] = useSetupStatus(session.status === 'anonymous' && !path.startsWith('/registro/'));
  const [welcome, setWelcome] = useState(null); // v6: bienvenida de una sola vez tras la configuración inicial
  // v7: /registro/:token se muestra con o sin sesión (si hay una abierta, Register lo explica).
  const registerParams = matchPath('/registro/:token', path);
  if (session.status === 'loading') return <PageLoader />;
  if (registerParams && session.status !== 'offline') return <Suspense fallback={<PageLoader />}><Register params={registerParams} /></Suspense>;
  if (session.status === 'offline') {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <EmptyState icon={WifiOff} tone="slate" className="w-full max-w-md" title="No hay conexión con el portal" action={<button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>Reintentar</button>}>
          El servidor no respondió. Revisá tu conexión a internet.
        </EmptyState>
      </div>
    );
  }
  if (session.status === 'anonymous') {
    // v6: con la base vacía, el dueño crea su cuenta (una sola vez) en lugar de ingresar.
    if (!setup && !isDemo()) return <PageLoader />;
    if (setup?.needed) {
      const closed = { needed: false, available: false };
      return (
        <Suspense fallback={<PageLoader />}>
          <Setup available={setup.available} onDone={(user) => { setSetup(closed); setWelcome(user); }} onConfigured={() => setSetup(closed)} />
        </Suspense>
      );
    }
    return <Login />;
  }
  if (session.isClient) return <Suspense fallback={<PageLoader />}><ClientApp /></Suspense>;
  if (session.user.must_change_password) return <ForcePasswordChange />;
  if (session.isInvestor) return <Suspense fallback={<PageLoader />}><InvestorApp /></Suspense>;
  // v5: brief en A4 (para imprimir o guardar como PDF), sin la barra lateral ni la inferior.
  const printParams = matchPath('/briefs/:id/imprimir', path);
  if (printParams) return <Suspense fallback={<PageLoader />}><BriefPrint params={printParams} /></Suspense>;
  return (
    <>
      <Layout><Router /></Layout>
      {welcome && <Suspense fallback={null}><SetupWelcome user={welcome} onClose={() => setWelcome(null)} /></Suspense>}
    </>
  );
}

/** Raíz de la app con sus proveedores (la usan main.jsx y la demo del navegador). */
export function Root() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <SessionProvider>
          <App />
        </SessionProvider>
      </ConfirmProvider>
    </ToastProvider>
  );
}
