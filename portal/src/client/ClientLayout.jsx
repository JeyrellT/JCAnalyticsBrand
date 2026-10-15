// Cáscara del portal de clientes (v5). Mismo lenguaje visual que el portal del equipo,
// pero claro y sereno: nada de barra lateral "tinta" ni herramientas internas.
// Escritorio: barra superior de vidrio con la marca, el nombre de la empresa, avisos y
// cuenta, y debajo las secciones como pestañas. Celular: barra superior compacta y
// barra inferior de pestañas (con la zona segura del iPhone).
import { useEffect, useRef, useState } from 'react';
import {
  House, FolderKanban, ClipboardList, PackageCheck, FolderOpen, Bell, ChevronDown, UserRound, LogOut, ShieldCheck,
  Building2,
} from 'lucide-react';
import { Link, useLocation } from '../lib/router.jsx';
import { useSession } from '../lib/session.jsx';
import { Avatar, ThemeToggle, ThemePicker, cx } from '../components/ui.jsx';
import { Sheet, SheetHeader } from '../components/QuickActions.jsx';
import { useClientCounts, firstName } from './components.jsx';
import logoMark from '../assets/logo-mark.webp';

const NAV = [
  { to: '/cliente', label: 'Inicio', icon: House, exact: true },
  { to: '/cliente/proyectos', label: 'Proyectos', icon: FolderKanban },
  { to: '/cliente/solicitudes', label: 'Solicitudes', icon: ClipboardList },
  { to: '/cliente/entregables', label: 'Entregables', icon: PackageCheck, badge: true },
  { to: '/cliente/documentos', label: 'Documentos', icon: FolderOpen },
];

const ACCOUNT_COLOR = '#0065df';

function useNav() {
  const { path } = useLocation();
  const { approvals } = useClientCounts();
  const isActive = (n) => (n.exact ? path === n.to : path === n.to || path.startsWith(`${n.to}/`));
  return { isActive, approvals, path };
}

const countText = (n) => (n > 99 ? '99+' : String(n));

function Count({ n, tone = 'brand', className }) {
  if (!n) return null;
  return (
    <span className={cx('min-w-5 rounded-full px-1.5 text-center text-[11px] font-bold leading-5 tabular-nums text-white', tone === 'coral' ? 'bg-coral' : 'bg-brand', className)} aria-hidden="true">
      {countText(n)}
    </span>
  );
}

/** Marca: logo de JC Analytics y "Portal de clientes". */
function Brand() {
  return (
    <Link to="/cliente" className="flex shrink-0 items-center gap-2.5 rounded-xl" aria-label="JC Analytics · Portal de clientes, inicio">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-card ring-1 ring-line">
        <img src={logoMark} alt="" className="h-7 w-7 object-contain" />
      </span>
      <span className="hidden leading-tight lg:block">
        <span className="block font-display text-[15px] font-bold text-ink">JC Analytics</span>
        <span className="block text-[10.5px] font-semibold uppercase tracking-[0.18em] text-teal-ink">Portal de clientes</span>
      </span>
    </Link>
  );
}

/** Nombre de la empresa del cliente, protagonista de la barra. */
function Company({ name }) {
  return (
    <div className="min-w-0 leading-tight">
      <p className="truncate font-display text-[16px] font-bold text-ink lg:text-[17px]" title={name}>{name}</p>
      <p className="truncate text-[11px] font-medium text-muted">
        <span className="lg:hidden">Portal de clientes</span>
        <span className="hidden items-center gap-1 lg:inline-flex"><Building2 className="h-3 w-3" aria-hidden="true" />Tu espacio con JC Analytics</span>
      </p>
    </div>
  );
}

function BellLink() {
  const { unread } = useSession();
  const { path } = useLocation();
  const active = path === '/cliente/avisos';
  return (
    <Link to="/cliente/avisos" aria-label={unread ? `Avisos, ${unread} sin leer` : 'Avisos'} aria-current={active ? 'page' : undefined}
      className={cx('tap relative flex items-center justify-center rounded-xl transition lg:min-h-10 lg:min-w-10', active ? 'bg-brand-soft text-brand-ink' : 'text-muted hover:bg-surface-3 hover:text-ink')}>
      <Bell className="h-[19px] w-[19px]" strokeWidth={active ? 2.4 : 2} />
      {unread > 0 && <Count n={unread} tone="coral" className="absolute -right-0.5 top-0.5 ring-2 ring-surface lg:-right-1 lg:-top-0.5" />}
    </Link>
  );
}

/** Menú de cuenta (escritorio): divulgación simple con enlaces, cierra con Escape o clic afuera. */
function AccountMenu() {
  const { account, client, unread, logout } = useSession();
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
      <button ref={button} type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls="client-account-menu"
        className={cx('flex min-h-11 items-center gap-2.5 rounded-xl py-1 pl-1 pr-2.5 text-left transition hover:bg-surface-3', open && 'bg-surface-3')}>
        <Avatar name={account.name} color={ACCOUNT_COLOR} size={34} />
        <span className="max-w-[180px] leading-tight">
          <span className="block truncate text-sm font-semibold text-ink">{account.name}</span>
          <span className="block truncate text-[11.5px] text-muted">{account.title || 'Mi cuenta'}</span>
        </span>
        <ChevronDown className={cx('h-4 w-4 text-muted transition', open && 'rotate-180')} aria-hidden="true" />
        <span className="sr-only">, menú de cuenta</span>
      </button>
      {open && (
        <div id="client-account-menu" className="animate-pop absolute right-0 top-full z-40 mt-2 w-[300px] rounded-2xl border border-line bg-surface p-2 shadow-pop">
          <div className="flex items-center gap-3 px-3 py-2.5">
            <Avatar name={account.name} color={ACCOUNT_COLOR} size={40} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{account.name}</p>
              <p className="truncate text-xs text-muted">{account.email}</p>
              <p className="truncate text-xs font-medium text-teal-ink">{client?.name}</p>
            </div>
          </div>
          <div className="my-1.5 h-px bg-line" />
          <Link to="/cliente/cuenta" onClick={close} className={item}><UserRound className="h-4 w-4 text-muted" />Mi cuenta</Link>
          <Link to="/cliente/avisos" onClick={close} className={item}>
            <Bell className="h-4 w-4 text-muted" /><span className="flex-1">Avisos</span><Count n={unread} tone="coral" />
          </Link>
          <div className="my-1.5 h-px bg-line" />
          <button type="button" onClick={logout} className={cx(item, 'w-full text-coral-ink hover:bg-coral-soft')}><LogOut className="h-4 w-4" />Salir</button>
        </div>
      )}
    </div>
  );
}

/** Hoja de cuenta (celular): datos, accesos, tema y salir. */
function AccountSheet({ onClose }) {
  const { account, client, unread, logout } = useSession();
  const tiles = [
    { to: '/cliente/cuenta', label: 'Mi cuenta', icon: UserRound, tone: 'tile-blue' },
    { to: '/cliente/avisos', label: 'Avisos', icon: Bell, tone: 'tile-amber', count: unread },
  ];
  return (
    <Sheet label="Tu cuenta" onClose={onClose}>
      <SheetHeader title="Tu cuenta" hint={client?.name} onClose={onClose} />
      <div className="mx-5 mt-1 flex items-center gap-3 rounded-2xl border border-line bg-surface-2 p-3">
        <Avatar name={account.name} color={ACCOUNT_COLOR} size={44} />
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{account.name}</p>
          <p className="truncate text-xs text-muted">{account.email}</p>
        </div>
      </div>
      <ul className="grid grid-cols-2 gap-2.5 px-5 pt-3">
        {tiles.map((t) => (
          <li key={t.to}>
            <Link to={t.to} onClick={onClose} className="relative flex min-h-[84px] flex-col items-center justify-center gap-2 rounded-2xl border border-line bg-surface-2 px-2 py-3 text-[13px] font-semibold text-ink transition hover:border-line-strong active:scale-[0.98]">
              <span className={cx('icon-tile', t.tone)}><t.icon className="h-5 w-5" /></span>
              {t.label}
              {t.count > 0 && <Count n={t.count} tone="coral" className="absolute right-2 top-2" />}
            </Link>
          </li>
        ))}
      </ul>
      <div className="space-y-3 px-5 pb-2 pt-4">
        <ThemePicker />
        <button type="button" onClick={logout} className="btn btn-outline tap w-full text-coral-ink"><LogOut className="h-4 w-4" />Salir del portal</button>
        <p className="flex items-start gap-2 text-xs text-muted"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-ink" />Solo las personas de {client?.name ?? 'tu empresa'} con acceso ven este portal.</p>
      </div>
    </Sheet>
  );
}

function DesktopTabs() {
  const { isActive, approvals } = useNav();
  return (
    <nav className="-mb-px hidden lg:block" aria-label="Secciones del portal">
      <ul className="flex gap-1">
        {NAV.map((n) => {
          const active = isActive(n);
          return (
            <li key={n.to}>
              <Link to={n.to} aria-current={active ? 'page' : undefined}
                className={cx('group relative flex h-12 items-center gap-2 px-3 text-sm font-semibold transition',
                  active ? 'text-ink' : 'text-muted hover:text-ink')}>
                <n.icon className={cx('h-4 w-4', active ? 'text-brand' : 'text-muted-2 group-hover:text-muted')} strokeWidth={active ? 2.4 : 2} aria-hidden="true" />
                {n.label}
                {n.badge && approvals > 0 && <><Count n={approvals} /><span className="sr-only">, {approvals} por revisar</span></>}
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
  const { isActive, approvals } = useNav();
  return (
    <nav className="safe-bottom glass fixed inset-x-0 bottom-0 z-30 border-t border-line shadow-up lg:hidden" aria-label="Secciones del portal">
      <ul className="mx-auto grid max-w-lg grid-cols-5 px-1">
        {NAV.map((n) => {
          const active = isActive(n);
          return (
            <li key={n.to}>
              <Link to={n.to} aria-current={active ? 'page' : undefined}
                className={cx('group relative flex min-h-[60px] flex-col items-center justify-center gap-0.5 rounded-xl text-[10.5px] font-semibold transition', active ? 'text-brand-ink' : 'text-muted hover:text-ink')}>
                <span className={cx('flex h-7 w-12 items-center justify-center rounded-full transition', active ? 'bg-brand-soft' : 'group-active:bg-surface-3')}>
                  <n.icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} aria-hidden="true" />
                </span>
                {n.label}
                {n.badge && approvals > 0 && (
                  <>
                    <Count n={approvals} className="absolute left-1/2 top-1 ml-2 ring-2 ring-surface" />
                    <span className="sr-only">, {approvals} por revisar</span>
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
  const { contact, client } = useSession();
  return (
    <footer className="mt-12 flex flex-col gap-2 border-t border-line pt-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 shrink-0 text-teal-ink" aria-hidden="true" />Espacio privado de {client?.name ?? 'tu empresa'} con JC Analytics.</p>
      <p>
        {contact ? <>¿Dudas? Escribile a <Link to="/cliente/cuenta" className="link">{firstName(contact.name)}</Link>, tu ejecutivo de cuenta.</> : <>¿Dudas? Escribinos a tu ejecutivo de cuenta.</>}
      </p>
    </footer>
  );
}

export default function ClientLayout({ children }) {
  const { full } = useLocation();
  const { account, client } = useSession();
  // La hoja de cuenta se cierra sola al cambiar de página (también con atrás/adelante).
  const [sheet, setSheet] = useState(false);
  const [seenAt, setSeenAt] = useState(full);
  if (seenAt !== full) {
    setSeenAt(full);
    setSheet(false);
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#contenido" className="sr-only z-50 rounded-xl bg-surface px-4 py-2 text-sm font-semibold text-ink shadow-pop focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Saltar al contenido</a>
      <header className="glass sticky top-0 z-30 border-b border-line" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="h-[3px] bg-linear-to-r from-brand to-teal" aria-hidden="true" />
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center gap-3 lg:h-[68px] lg:gap-4">
            <Brand />
            <span className="hidden h-8 w-px bg-line lg:block" aria-hidden="true" />
            <div className="min-w-0 flex-1"><Company name={client?.name ?? 'Tu empresa'} /></div>
            <div className="flex shrink-0 items-center gap-0.5 lg:gap-1.5">
              {/* En el celular el tema vive en la hoja "Tu cuenta" (así cabe el nombre de la empresa). */}
              <span className="hidden lg:block"><ThemeToggle className="lg:min-h-10 lg:min-w-10" /></span>
              <BellLink />
              <AccountMenu />
              <button type="button" onClick={() => setSheet(true)} aria-haspopup="dialog" aria-label="Tu cuenta"
                className="tap flex items-center justify-center rounded-xl hover:bg-surface-3 lg:hidden">
                <Avatar name={account.name} color={ACCOUNT_COLOR} size={32} />
              </button>
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
      {sheet && <AccountSheet onClose={() => setSheet(false)} />}
    </div>
  );
}

