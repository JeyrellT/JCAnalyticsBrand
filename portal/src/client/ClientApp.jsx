// Portal de clientes (v5): app aparte del equipo, montada por App.jsx cuando la sesión es de cliente.
// Nunca usa el Layout ni las rutas del equipo: cualquier ruta ajena vuelve a /cliente.
// Con clave temporal, primero se cambia la contraseña.
import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from '../lib/session.jsx';
import { useLocation, matchPath, navigate } from '../lib/router.jsx';
import { api } from '../lib/api.js';
import { PageLoader } from '../components/ui.jsx';
import { ClientForcePasswordChange } from '../pages/Login.jsx';
import ClientLayout from './ClientLayout.jsx';
import { ClientCountsContext } from './components.jsx';

const ClientHome = lazy(() => import('./pages/ClientHome.jsx'));
const ClientProjects = lazy(() => import('./pages/ClientProjects.jsx'));
const ClientProjectDetail = lazy(() => import('./pages/ClientProjectDetail.jsx'));
const ClientBriefs = lazy(() => import('./pages/ClientBriefs.jsx'));
const ClientBriefDetail = lazy(() => import('./pages/ClientBriefDetail.jsx'));
const ClientDeliverables = lazy(() => import('./pages/ClientDeliverables.jsx'));
const ClientDeliverableDetail = lazy(() => import('./pages/ClientDeliverableDetail.jsx'));
const ClientDocuments = lazy(() => import('./pages/ClientDocuments.jsx'));
const ClientNotifications = lazy(() => import('./pages/ClientNotifications.jsx'));
const ClientAccount = lazy(() => import('./pages/ClientAccount.jsx'));
const BriefPrint = lazy(() => import('../pages/BriefPrint.jsx'));

// [patrón, página, título de la pestaña del navegador, opciones]. El orden importa: "nueva" antes de ":id".
const ROUTES = [
  ['/cliente', ClientHome, 'Inicio'],
  ['/cliente/proyectos', ClientProjects, 'Proyectos'],
  ['/cliente/proyectos/:id', ClientProjectDetail, 'Proyecto'],
  ['/cliente/solicitudes', ClientBriefs, 'Solicitudes'],
  ['/cliente/solicitudes/nueva', ClientBriefDetail, 'Nueva solicitud'],
  ['/cliente/solicitudes/:id/imprimir', BriefPrint, 'Brief creativo', { bare: true }],
  ['/cliente/solicitudes/:id', ClientBriefDetail, 'Solicitud'],
  ['/cliente/entregables', ClientDeliverables, 'Entregables'],
  ['/cliente/entregables/:id', ClientDeliverableDetail, 'Entregable'],
  ['/cliente/documentos', ClientDocuments, 'Documentos'],
  ['/cliente/avisos', ClientNotifications, 'Avisos'],
  ['/cliente/cuenta', ClientAccount, 'Mi cuenta'],
];

function resolve(path) {
  for (const [pattern, Page, title, opts] of ROUTES) {
    const params = matchPath(pattern, path);
    if (params) return { pattern, Page, title, params, bare: !!opts?.bare };
  }
  return null;
}

/** Entregables por revisar (globo de la pestaña "Entregables"). Se refresca con los avisos. */
function CountsProvider({ children }) {
  const { unread } = useSession();
  const [approvals, setApprovals] = useState(0);
  const refreshCounts = useCallback(() => api('/api/client/deliverables').then(
    (r) => setApprovals(r.deliverables.filter((d) => d.status === 'en_revision').length),
    () => {},
  ), []);
  useEffect(() => { refreshCounts(); }, [refreshCounts, unread]);
  const value = useMemo(() => ({ approvals, refreshCounts }), [approvals, refreshCounts]);
  return <ClientCountsContext.Provider value={value}>{children}</ClientCountsContext.Provider>;
}

function ClientRouter() {
  const { path } = useLocation();
  const match = resolve(path);
  const missing = !match;
  const title = match?.title;

  // Rutas del equipo o desconocidas: al inicio del portal de clientes, sin dejar rastro en el historial.
  useEffect(() => { if (missing) navigate('/cliente', { replace: true }); }, [missing]);
  useEffect(() => { if (title) document.title = `${title} · Portal de clientes · JC Analytics`; }, [title]);

  if (!match) return <PageLoader />;
  const { Page, params, pattern, bare } = match;
  // La vista imprimible del brief va sin la cáscara (hoja A4 limpia).
  if (bare) return <Suspense fallback={<PageLoader />}><Page params={params} audience="client" /></Suspense>;
  return (
    <ClientLayout>
      <Suspense fallback={<PageLoader />}>
        {/* La clave por patrón da la entrada suave al cambiar de sección sin remontar al cambiar solo el id. */}
        <div key={pattern} className="animate-fade"><Page params={params} /></div>
      </Suspense>
    </ClientLayout>
  );
}

export default function ClientApp() {
  const { mustChangePassword } = useSession();
  useEffect(() => {
    if (mustChangePassword) document.title = 'Primer ingreso · Portal de clientes · JC Analytics';
  }, [mustChangePassword]);
  if (mustChangePassword) return <ClientForcePasswordChange />;
  return <CountsProvider><ClientRouter /></CountsProvider>;
}
