// Marco del portal de inversionistas: sobrio y centrado en el control del capital.
// Escritorio: una sola barra con la marca, las secciones (con sus contadores), el tema y
// la cuenta. Celular: barra superior compacta y pestañas inferiores con la zona segura del iPhone.
// Sin animaciones decorativas: solo la entrada suave entre secciones.
import { useEffect, useRef, useState } from 'react';
import { House, ReceiptText, Bell, UserRound, ChevronDown, LogOut, Lock, Download } from 'lucide-react';
import { Link, useLocation } from '../lib/router.jsx';
import { useSession } from '../lib/session.jsx';
import { Avatar, ThemeToggle, cx } from '../components/ui.jsx';
import { displayName, firstName } from './components.jsx';
import logoMark from '../assets/logo-mark.webp';
import { useTypingFlag, SectionJump, PullToRefresh } from '../components/mobile.jsx';

const HOME = '/inversionista';

// Inicio también queda activo en el detalle de una inversión (es parte del resumen).
const NAV = [
  { to: HOME, label: 'Inicio', icon: House, match: (p) => p === HOME || p.startsWith(`${HOME}/inversiones`) },
  { to: `${HOME}/movimientos`, label: 'Movimientos', icon: ReceiptText, count: 'pending' },
  { to: `${HOME}/avisos`, label: 'Avisos', icon: Bell, count: 'unread' },
];
const MOBILE_NAV = [...NAV, { to: `${HOME}/cuenta`, label: 'Cuenta', icon: UserRound }];

const isActive = (n, path) => (n.match ? n.match(path) : path === n.to || path.startsWith(`${n.to}/`));
const countText = (n) => (n > 99 ? '99+' : String(n));
const COUNT_HINT = { pending: 'por confirmar', unread: 'sin leer' };
const COUNT_TONE = { pending: 'bg-amber text-panel', unread: 'bg-coral text-white' };

function Count({ n, kind, className }) {
  if (!n) return null;
  return (
    <span className={cx('min-w-5 rounded-full px-1.5 text-center text-[11px] font-bold leading-5 tabular-nums', COUNT_TONE[kind], className)} aria-hidden="true">
      {countText(n)}
    </span>
  );
}

/** Contadores de la barra: movimientos que esperan tu confirmación y avisos sin leer. */
function useCounts() {
  const { pending, unread } = useSession();
  return { pending: pending ?? 0, unread: unread ?? 0 };
}

function Brand() {
  return (
    <Link to={HOME} className="flex shrink-0 items-center gap-2.5 rounded-xl" aria-label="JC Analytics · Portal de inversionistas, inicio">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-card ring-1 ring-line">
        <img src={logoMark} alt="" className="h-6 w-6 object-contain" />
      </span>
      <span className="leading-tight">
        <span className="block font-display text-[15px] font-bold text-ink">JC Analytics</span>
        <span className="block text-xs font-medium text-muted">Inversionistas</span>
      </span>
    </Link>
  );
}

/** Menú de cuenta (escritorio): se cierra con Escape, clic afuera o al elegir una opción. */
function AccountMenu() {
  const { user, logout } = useSession();
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const button = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); button.current?.focus(); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);
  const close = () => setOpen(false);
  const item = 'flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium text-ink transition hover:bg-surface-2';
  return (
    <div ref={box} className="relative hidden lg:block">
      <button ref={button} type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls="investor-account-menu"
        className={cx('flex min-h-10 items-center gap-2 rounded-xl py-1 pl-1 pr-2 text-left transition hover:bg-surface-3', open && 'bg-surface-3')}>
        <Avatar name={displayName(user.name)} color={user.color || '#0065df'} size={30} />
        <span className="max-w-[160px] truncate text-sm font-semibold text-ink">{firstName(user.name)}</span>
        <ChevronDown className={cx('h-4 w-4 text-muted transition', open && 'rotate-180')} aria-hidden="true" />
        <span className="sr-only">, menú de cuenta</span>
      </button>
      {open && (
        <div id="investor-account-menu" className="animate-pop absolute right-0 top-full z-40 mt-2 w-[280px] rounded-2xl border border-line bg-surface p-2 shadow-pop">
          <div className="min-w-0 px-3 py-2.5">
            <p className="truncate text-sm font-semibold text-ink">{displayName(user.name)}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          <div className="my-1.5 h-px bg-line" />
          <Link to={`${HOME}/cuenta`} onClick={close} className={item}><UserRound className="h-4 w-4 text-muted" aria-hidden="true" />Mi cuenta</Link>
          <a href="/api/investor/statement.csv" download onClick={close} className={item}><Download className="h-4 w-4 text-muted" aria-hidden="true" />Estado de cuenta (Excel)</a>
          <div className="my-1.5 h-px bg-line" />
          <button type="button" onClick={logout} className={cx(item, 'w-full text-coral-ink hover:bg-coral-soft')}><LogOut className="h-4 w-4" aria-hidden="true" />Salir</button>
        </div>
      )}
    </div>
  );
}

function DesktopTabs() {
  const { path } = useLocation();
  const counts = useCounts();
  return (
    <nav className="hidden lg:block" aria-label="Secciones del portal">
      <ul className="flex gap-1">
        {NAV.map((n) => {
          const active = isActive(n, path);
          const count = n.count ? counts[n.count] : 0;
          return (
            <li key={n.to}>
              <Link to={n.to} aria-current={active ? 'page' : undefined}
                className={cx('flex h-9 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition', active ? 'bg-brand-soft text-brand-ink' : 'text-muted hover:bg-surface-3 hover:text-ink')}>
                <n.icon className="h-4 w-4" strokeWidth={active ? 2.4 : 2} aria-hidden="true" />
                {n.label}
                {count > 0 && <><Count n={count} kind={n.count} /><span className="sr-only">, {count} {COUNT_HINT[n.count]}</span></>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function MobileTabs() {
  const { path } = useLocation();
  const counts = useCounts();
  return (
    <nav className="mobile-tabbar safe-bottom glass fixed inset-x-0 bottom-0 z-30 border-t border-line shadow-up lg:hidden" aria-label="Secciones del portal">
      <ul className="mx-auto grid max-w-lg grid-cols-4 px-1">
        {MOBILE_NAV.map((n) => {
          const active = isActive(n, path);
          const count = n.count ? counts[n.count] : 0;
          return (
            <li key={n.to}>
              <Link to={n.to} aria-current={active ? 'page' : undefined}
                className={cx('group relative flex min-h-[60px] flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold transition', active ? 'text-brand-ink' : 'text-muted hover:text-ink')}>
                <span className={cx('flex h-7 w-12 items-center justify-center rounded-full transition', active ? 'bg-brand-soft' : 'group-active:bg-surface-3')}>
                  <n.icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} aria-hidden="true" />
                </span>
                {n.label}
                {count > 0 && (
                  <>
                    <Count n={count} kind={n.count} className="absolute left-1/2 top-1 ml-2 ring-2 ring-surface" />
                    <span className="sr-only">, {count} {COUNT_HINT[n.count]}</span>
                  </>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default function InvestorLayout({ children }) {
  const { full } = useLocation();
  useTypingFlag(); // v8: con el teclado abierto se esconde la barra inferior
  return (
    <div className="investor-club flex min-h-dvh flex-col">
      <a href="#contenido" onClick={(event) => { event.preventDefault(); document.getElementById('contenido')?.focus(); }} className="sr-only z-50 rounded-xl bg-surface px-4 py-2 text-sm font-semibold text-ink shadow-pop focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Saltar al contenido</a>
      <header className="glass sticky top-0 z-30 border-b border-line" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="mx-auto flex h-16 max-w-[1120px] items-center gap-3 px-4 sm:px-6 lg:gap-6 lg:px-8">
          <Brand />
          <DesktopTabs />
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <ThemeToggle className="lg:min-h-10 lg:min-w-10" />
            <AccountMenu />
          </div>
        </div>
      </header>

      <main id="contenido" tabIndex={-1} className="main-safe flex-1 px-4 pt-5 outline-none sm:px-6 lg:px-8 lg:pt-8">
        <div className="mx-auto max-w-[1120px]">
          {children}
          <footer className="mt-10 flex flex-col gap-1.5 border-t border-line pt-4 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-2"><Lock className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />Tus montos y movimientos solo los ven vos y la administración de JC Analytics.</p>
            <p className="shrink-0">Fechas en hora de Costa Rica.</p>
          </footer>
        </div>
      </main>
      <SectionJump routeKey={full} />
      <PullToRefresh />

      <MobileTabs />
    </div>
  );
}
