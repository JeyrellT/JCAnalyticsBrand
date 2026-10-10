import { StrictMode, Suspense, lazy, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { SessionProvider, useSession } from './lib/session.jsx';
import { useLocation, matchPath } from './lib/router.jsx';
import { ToastProvider, PageLoader, EmptyState } from './components/ui.jsx';
import Layout from './components/Layout.jsx';
import { Login, ForcePasswordChange } from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import { WifiOff, Compass } from 'lucide-react';

// Las secciones pesadas (gráficos) se cargan bajo demanda.
const Projects = lazy(() => import('./pages/Projects.jsx'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail.jsx'));
const Board = lazy(() => import('./pages/Board.jsx'));
const Agenda = lazy(() => import('./pages/Agenda.jsx'));
const Investments = lazy(() => import('./pages/Investments.jsx'));
const InvestmentDetail = lazy(() => import('./pages/InvestmentDetail.jsx'));
const InboxPage = lazy(() => import('./pages/Inbox.jsx'));
const Team = lazy(() => import('./pages/Team.jsx'));
const Activity = lazy(() => import('./pages/Activity.jsx'));

const ROUTES = [
  ['/', Dashboard],
  ['/proyectos', Projects],
  ['/proyectos/:id', ProjectDetail],
  ['/tablero', Board],
  ['/agenda', Agenda],
  ['/inversiones', Investments, { invest: true }],
  ['/inversiones/:id', InvestmentDetail, { invest: true }],
  ['/buzon', InboxPage],
  ['/equipo', Team],
  ['/bitacora', Activity],
];

const TITLES = { '/': 'Centro de operaciones', '/proyectos': 'Proyectos', '/tablero': 'Tablero', '/agenda': 'Agenda', '/inversiones': 'Inversiones', '/buzon': 'Buzón', '/equipo': 'Equipo', '/bitacora': 'Bitácora' };

function Router() {
  const { path } = useLocation();
  const { canInvest } = useSession();
  const section = `/${path.split('/')[1]}`;
  useEffect(() => { document.title = `${TITLES[section] ?? 'Portal'} · JC Analytics`; }, [section]);
  for (const [pattern, Page, opts] of ROUTES) {
    const params = matchPath(pattern, path);
    if (!params) continue;
    if (opts?.invest && !canInvest) break;
    return <Suspense fallback={<PageLoader />}><Page key={pattern} params={params} /></Suspense>;
  }
  return <EmptyState icon={Compass} title="Esta sección no existe">Revisá el enlace o volvé al centro de operaciones.</EmptyState>;
}

function App() {
  const session = useSession();
  if (session.status === 'loading') return <PageLoader />;
  if (session.status === 'offline') {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <EmptyState icon={WifiOff} title="No hay conexión con el portal" action={<button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>Reintentar</button>}>
          El servidor no respondió. Revisá tu conexión a internet.
        </EmptyState>
      </div>
    );
  }
  if (session.status === 'anonymous') return <Login />;
  if (session.user.must_change_password) return <ForcePasswordChange />;
  return <Layout><Router /></Layout>;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastProvider>
      <SessionProvider>
        <App />
      </SessionProvider>
    </ToastProvider>
  </StrictMode>,
);
