// Portal de inversionistas (v6): app aparte del equipo, montada por App.jsx cuando la persona
// tiene rol 'inversionista' (la clave temporal ya se cambió antes, en ForcePasswordChange).
// Nunca usa el Layout ni las rutas del equipo:
//   · los enlaces de los avisos (/inversiones/:id?mov=:m) se traducen a /inversionista/inversiones/:id;
//   · cualquier otra ruta ajena vuelve a /inversionista sin dejar rastro en el historial.
import { Suspense, lazy, useEffect } from 'react';
import { useLocation, matchPath, navigate } from '../lib/router.jsx';
import { PageLoader } from '../components/ui.jsx';
import InvestorLayout from './InvestorLayout.jsx';
import { investorLink } from './components.jsx';

const InvestorHome = lazy(() => import('./pages/InvestorHome.jsx'));
const InvestorInvestment = lazy(() => import('./pages/InvestorInvestment.jsx'));
const InvestorMovements = lazy(() => import('./pages/InvestorMovements.jsx'));
const InvestorNotifications = lazy(() => import('./pages/InvestorNotifications.jsx'));
const InvestorAccount = lazy(() => import('./pages/InvestorAccount.jsx'));

// [patrón, página, título de la pestaña del navegador]
const ROUTES = [
  ['/inversionista', InvestorHome, 'Mi inversión'],
  ['/inversionista/inversiones/:id', InvestorInvestment, 'Inversión'],
  ['/inversionista/movimientos', InvestorMovements, 'Movimientos'],
  ['/inversionista/avisos', InvestorNotifications, 'Avisos'],
  ['/inversionista/cuenta', InvestorAccount, 'Mi cuenta'],
];

function resolve(path) {
  for (const [pattern, Page, title] of ROUTES) {
    const params = matchPath(pattern, path);
    if (params) return { pattern, Page, title, params };
  }
  return null;
}

export default function InvestorApp() {
  const { path, full } = useLocation();
  const match = resolve(path);
  // Ruta ajena: el enlace de un aviso se traduce; todo lo demás vuelve al inicio.
  const target = match ? null : (path.startsWith('/inversiones/') && investorLink(full)) || '/inversionista';
  const title = match?.title;

  useEffect(() => { if (target) navigate(target, { replace: true }); }, [target]);
  useEffect(() => { if (title) document.title = `${title} · Inversionistas · JC Analytics`; }, [title]);

  if (!match) return <PageLoader />;
  const { Page, params, pattern } = match;
  return (
    <InvestorLayout>
      <Suspense fallback={<PageLoader />}>
        {/* La clave por patrón da la entrada suave al cambiar de sección sin remontar al cambiar solo el id. */}
        <div key={pattern} className="animate-fade"><Page params={params} /></div>
      </Suspense>
    </InvestorLayout>
  );
}
