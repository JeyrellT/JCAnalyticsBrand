// Cáscara del portal de inversionistas (v6). Sobria y tranquila, como un estado de cuenta
// de banca privada: nada de herramientas internas ni barra lateral del equipo.
// Escritorio: barra superior de vidrio (marca, nombre del inversionista, tema, avisos y
// cuenta) y debajo las secciones como pestañas. Celular: barra superior compacta y barra
// inferior de pestañas con la zona segura del iPhone.
import { useEffect, useRef, useState } from 'react';
import { House, ReceiptText, Bell, UserRound, ChevronDown, LogOut, ShieldCheck, Lock } from 'lucide-react';
import { Link, useLocation } from '../lib/router.jsx';
import { useSession } from '../lib/session.jsx';
import { Avatar, ThemeToggle, cx } from '../components/ui.jsx';
import { displayName, firstName } from './components.jsx';
import logoMark from '../assets/logo-mark.webp';

const HOME = '/inversionista';

// Inicio también queda activo en el detalle de una inversión (es parte de "Mi inversión").
const NAV = [
  { to: HOME, label: 'Inicio', icon: House, match: (p) => p === HOME || p.startsWith(`${HOME}/inversiones`) },
  { to: `${HOME}/movimientos`, label: 'Movimientos', icon: ReceiptText, count: 'pending' },
  { to: `${HOME}/avisos`, label: 'Avisos', icon: Bell, count: 'unread' },
];
const MOBILE_NAV = [...NAV, { to: `${HOME}/cuenta`, label: 'Cuenta', icon: UserRound }];

const isActive = (n, path) => (n.match ? n.match(path) : path === n.to || path.startsWith(`${n.to}/`));
const countText = (n) => (n > 99 ? '99+' : String(n));
const COUNT_HINT = { pending: 'por confirmar', unread: 'sin leer' };

function Count({ n, tone = 'brand', className }) {
  if (!n) return null;
  return (
    <span className={cx('min-w-5 rounded-full px-1.5 text-center text-[11px] font-bold leading-5 tabular-nums',
      tone === 'coral' ? 'bg-coral text-white' : tone === 'amber' ? 'bg-amber text-panel' : 'bg-brand text-white', className)} aria-hidden="true">
      {countText(n)}
    </span>
  );
}

/** Contadores de la barra: movimientos que esperan tu confirmación y avisos sin leer. */
function useCounts() {
  const { pending, unread } = useSession();
  return { pending: pending ?? 0, unread: unread ?? 0 };
}
const COUNT_TONE = { pending: 'amber', unread: 'coral' };

/** Marca: logo de JC Analytics y "Portal de inversionistas". */
function Brand() {
  return (
    <Link to={HOME} className="flex shrink-0 items-center gap-2.5 rounded-xl" aria-label="JC Analytics · Portal de inversionistas, inicio">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-card ring-1 ring-line">
        <img src={logoMark} alt="" className="h-7 w-7 object-contain" />
      </span>
      <span className="hidden leading-tight lg:block">
        <span className="block font-display text-[15px] font-bold text-ink">JC Analytics</span>
        <span className="block text-[10.5px] font-semibold uppercase tracking-[0.18em] text-teal-ink">Inversionistas</span>
      </span>
    </Link>
  );
}

/** Quién está adentro: nombre del inversionista y la promesa de privacidad. */
function Identity({ name }) {
  return (
    <div className="min-w-0 leading-tight">
      <p className="truncate font-display text-[16px] font-bold text-ink lg:text-[17px]">
        <span className="lg:hidden">Portal de inversionistas</span>
        <span className="hidden lg:inline" title={name}>{displayName(name)}</span>
      </p>
      <p className="flex min-w-0 items-center gap-1 truncate text-[11px] font-medium text-muted">
        <Lock className="h-3 w-3 shrink-0" aria-hidden="true" />
        <span className="truncate lg:hidden">{displayName(name)}</span>
        <span className="hidden truncate lg:inline">Cuenta privada · Portal de inversionistas</span>
      </p>
    </div>
  );
}

function BellLink() {
  const { unread } = useCounts();
  const { path } = useLocation();
  const active = path === `${HOME}/avisos`;
  return (
    <Link to={`${HOME}/avisos`} aria-label={unread ? `Avisos, ${unread} sin leer` : 'Avisos'} aria-current={active ? 'page' : undefined}
      className={cx('tap relative hidden items-center justify-center rounded-xl transition lg:flex lg:min-h-10 lg:min-w-10',
        active ? 'bg-brand-soft text-brand-ink' : 'text-muted hover:bg-surface-3 hover:text-ink')}>
      <Bell className="h-[19px] w-[19px]" strokeWidth={active ? 2.4 : 2} aria-hidden="true" />
      {unread > 0 && <Count n={unread} tone="coral" className="absolute -right-1 -top-0.5 ring-2 ring-surface" />}
    </Link>
  );
}

/** Menú de cuenta (escritorio): se cierra con Escape, clic afuera o al elegir una opción. */
function AccountMenu() {
  const { user, logout } = useSession();
  const { unread, pending } = useCounts();
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
        className={cx('flex min-h-11 items-center gap-2.5 rounded-xl py-1 pl-1 pr-2.5 text-left transition hover:bg-surface-3', open && 'bg-surface-3')}>
        <Avatar name={displayName(user.name)} color={user.color || '#0065df'} size={34} />
        <span className="max-w-[180px] leading-tight">
          <span className="block truncate text-sm font-semibold text-ink">{firstName(user.name)}</span>
          <span className="block truncate text-[11.5px] text-muted">Inversionista</span>
        </span>
        <ChevronDown className={cx('h-4 w-4 text-muted transition', open && 'rotate-180')} aria-hidden="true" />
        <span className="sr-only">, menú de cuenta</span>
      </button>
      {open && (
        <div id="investor-account-menu" className="animate-pop absolute right-0 top-full z-40 mt-2 w-[300px] rounded-2xl border border-line bg-surface p-2 shadow-pop">
          <div className="flex items-center gap-3 px-3 py-2.5">
            <Avatar name={displayName(user.name)} color={user.color || '#0065df'} size={40} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{displayName(user.name)}</p>
              <p className="truncate text-xs text-muted">{user.email}</p>
              <p className="truncate text-xs font-medium text-teal-ink">Inversionista de JC Analytics</p>
            </div>
          </div>
          <div className="my-1.5 h-px bg-line" />
          <Link to={`${HOME}/cuenta`} onClick={close} className={item}><UserRound className="h-4 w-4 text-muted" aria-hidden="true" />Mi cuenta</Link>
          <Link to={`${HOME}/movimientos`} onClick={close} className={item}>
            <ReceiptText className="h-4 w-4 text-muted" aria-hidden="true" /><span className="flex-1">Estado de cuenta</span><Count n={pending} tone="amber" />
          </Link>
          <Link to={`${HOME}/avisos`} onClick={close} className={item}>
            <Bell className="h-4 w-4 text-muted" aria-hidden="true" /><span className="flex-1">Avisos</span><Count n={unread} tone="coral" />
          </Link>
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
    <nav className="-mb-px hidden lg:block" aria-label="Secciones del portal">
      <ul className="flex gap-1">
        {NAV.map((n) => {
          const active = isActive(n, path);
          const count = n.count ? counts[n.count] : 0;
          return (
            <li key={n.to}>
              <Link to={n.to} aria-current={active ? 'page' : undefined}
                className={cx('group relative flex h-12 items-center gap-2 px-3 text-sm font-semibold transition', active ? 'text-ink' : 'text-muted hover:text-ink')}>
                <n.icon className={cx('h-4 w-4', active ? 'text-brand' : 'text-muted-2 group-hover:text-muted')} strokeWidth={active ? 2.4 : 2} aria-hidden="true" />
                {n.label}
                {count > 0 && <><Count n={count} tone={COUNT_TONE[n.count]} /><span className="sr-only">, {count} {COUNT_HINT[n.count]}</span></>}
                <span className={cx('absolute inset-x-2 bottom-0 h-[2.5px] rounded-full transition', active ? 'bg-linear-to-r from-brand to-teal' : 'bg-transparent group-hover:bg-line-strong')} aria-hidden="true" />
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
    <nav className="safe-bottom glass fixed inset-x-0 bottom-0 z-30 border-t border-line shadow-up lg:hidden" aria-label="Secciones del portal">
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
                    <Count n={count} tone={COUNT_TONE[n.count]} className="absolute left-1/2 top-1 ml-2 ring-2 ring-surface" />
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

function Footer() {
  return (
    <footer className="mt-12 flex flex-col gap-2 border-t border-line pt-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-start gap-2"><ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0 text-teal-ink" aria-hidden="true" />Espacio privado de inversionistas de JC Analytics. Tus montos y movimientos solo los ven vos y la administración.</p>
      <p className="shrink-0">Fechas en hora de Costa Rica.</p>
    </footer>
  );
}

export default function InvestorLayout({ children }) {
  const { user } = useSession();
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#contenido" className="sr-only z-50 rounded-xl bg-surface px-4 py-2 text-sm font-semibold text-ink shadow-pop focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Saltar al contenido</a>
      <header className="glass sticky top-0 z-30 border-b border-line" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="h-[3px] bg-linear-to-r from-brand to-teal" aria-hidden="true" />
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center gap-3 lg:h-[68px] lg:gap-4">
            <Brand />
            <span className="hidden h-8 w-px bg-line lg:block" aria-hidden="true" />
            <div className="min-w-0 flex-1"><Identity name={user.name} /></div>
            <div className="flex shrink-0 items-center gap-0.5 lg:gap-1.5">
              <ThemeToggle className="lg:min-h-10 lg:min-w-10" />
              <BellLink />
              <AccountMenu />
            </div>
          </div>
          <DesktopTabs />
        </div>
      </header>

      <main id="contenido" className="main-safe flex-1 px-4 pt-5 sm:px-6 lg:px-8 lg:pt-8">
        <div className="mx-auto max-w-[1200px]">
          {children}
          <Footer />
        </div>
      </main>

      <MobileTabs />
    </div>
  );
}
