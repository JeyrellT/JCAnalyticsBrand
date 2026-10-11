// Estructura del portal, ordenada como trabaja la empresa:
// Operación (el día a día) · Empresa (proyectos, clientes, servicios, equipo) · Socios · Control.
// Escritorio: barra lateral agrupada con botón "Crear".
// Móvil: barra superior + barra inferior (Inicio, Tablero, Crear, Agenda, Más) con hojas inferiores.
import { useState } from 'react';
import {
  LayoutDashboard, FolderKanban, KanbanSquare, CalendarDays, TrendingUp, Inbox, Users, History, LogOut, Menu, X,
  Building2, Layers, Plus, LayoutGrid, Bot, BellRing,
} from 'lucide-react';
import { Link, useLocation } from '../lib/router.jsx';
import { useSession } from '../lib/session.jsx';
import { ROLES } from '../../shared/catalog.js';
import { Avatar, cx } from './ui.jsx';
import QuickActions, { Sheet, SheetHeader } from './QuickActions.jsx';
import logoMark from '../assets/logo-mark.webp';

// `label` se usa en la barra lateral y el menú; `short`, en las pestañas y mosaicos del celular.
const GROUPS = [
  {
    label: 'Operación',
    items: [
      { to: '/', label: 'Inicio', short: 'Inicio', icon: LayoutDashboard, exact: true },
      { to: '/tablero', label: 'Tablero', short: 'Tablero', icon: KanbanSquare },
      { to: '/agenda', label: 'Agenda', short: 'Agenda', icon: CalendarDays },
      { to: '/buzon', label: 'Buzón', short: 'Buzón', icon: Inbox, badge: true },
    ],
  },
  {
    label: 'Empresa',
    items: [
      { to: '/proyectos', label: 'Proyectos', short: 'Proyectos', icon: FolderKanban },
      { to: '/clientes', label: 'Clientes', short: 'Clientes', icon: Building2 },
      { to: '/servicios', label: 'Servicios', short: 'Servicios', icon: Layers },
      { to: '/equipo', label: 'Equipo y ajustes', short: 'Equipo', icon: Users },
    ],
  },
  { label: 'Socios', invest: true, items: [{ to: '/inversiones', label: 'Inversiones', short: 'Inversiones', icon: TrendingUp }] },
  {
    label: 'Control',
    items: [
      { to: '/automatizaciones', label: 'Automatizaciones', short: 'Automatiz.', icon: Bot },
      { to: '/notificaciones', label: 'Avisos y app', short: 'Avisos', icon: BellRing },
      { to: '/bitacora', label: 'Bitácora', short: 'Bitácora', icon: History },
    ],
  },
];

const ALL = GROUPS.flatMap((g) => g.items.map((n) => ({ ...n, invest: g.invest })));
const byPath = Object.fromEntries(ALL.map((n) => [n.to, n]));
const TABS = ['/', '/tablero'].map((to) => byPath[to]);
const TABS_END = [byPath['/agenda']];
// Mosaicos de "Más", en el orden en que se piensa la empresa.
const MORE = ['/proyectos', '/clientes', '/servicios', '/equipo', '/inversiones', '/buzon', '/automatizaciones', '/notificaciones', '/bitacora'].map((to) => byPath[to]);

function useNav() {
  const { canInvest, unread, pending } = useSession();
  const { path } = useLocation();
  const allowed = (n) => !n.invest || canInvest;
  const groups = GROUPS.filter(allowed);
  const isActive = (n) => (n.exact ? path === n.to : path === n.to || path.startsWith(`${n.to}/`));
  return { groups, allowed, isActive, badge: unread + pending };
}

function BadgeCount({ n, className }) {
  if (!n) return null;
  return (
    <span className={cx('min-w-5 rounded-full bg-coral px-1.5 text-center text-[11px] font-bold leading-5 text-white', className)}>
      {n > 99 ? '99+' : n}<span className="sr-only"> pendientes</span>
    </span>
  );
}

function Brand({ onNavigate }) {
  return (
    <Link to="/" onClick={onNavigate} className="flex items-center gap-2.5 rounded-xl">
      <img src={logoMark} alt="" className="h-9 w-9 rounded-xl bg-white object-contain p-1" />
      <span className="leading-tight">
        <span className="block font-display text-[15px] font-bold text-white">JC Analytics</span>
        <span className="block text-[11px] font-medium uppercase tracking-[0.16em] text-teal">Portal del equipo</span>
      </span>
    </Link>
  );
}

function UserBlock({ onNavigate, light = false }) {
  const { user, logout } = useSession();
  return (
    <div className={cx('flex items-center gap-3 rounded-2xl p-3', light ? 'bg-paper' : 'bg-white/5')}>
      <Avatar name={user.name} color={user.color} size={34} />
      <Link to="/equipo?tab=perfil" onClick={onNavigate} className="min-w-0 flex-1 rounded-lg">
        <span className={cx('block truncate text-sm font-semibold', light ? 'text-ink' : 'text-white')}>{user.name}</span>
        <span className={cx('block truncate text-xs', light ? 'text-muted' : 'text-slate-400')}>{ROLES[user.role]?.label} · Mi perfil</span>
      </Link>
      {light ? (
        <button type="button" onClick={logout} className="btn btn-outline tap" aria-label="Cerrar sesión">
          <LogOut className="h-4 w-4" />Cerrar sesión
        </button>
      ) : (
        <button type="button" onClick={logout} className="tap flex items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white lg:min-h-9 lg:min-w-9" title="Cerrar sesión" aria-label="Cerrar sesión">
          <LogOut className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/** Lista agrupada (barra lateral de escritorio y menú lateral del celular). */
function NavList({ onNavigate }) {
  const { groups, isActive, badge } = useNav();
  return (
    <nav className="flex flex-col gap-4" aria-label="Secciones">
      {groups.map((g) => (
        <div key={g.label} role="group" aria-label={g.label}>
          <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500" aria-hidden="true">{g.label}</p>
          <ul className="flex flex-col gap-0.5">
            {g.items.map((n) => (
              <li key={n.to}>
                <Link to={n.to} onClick={onNavigate} aria-current={isActive(n) ? 'page' : undefined}
                  className={cx('flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition lg:min-h-10',
                    isActive(n) ? 'bg-white text-ink shadow-sm' : 'text-slate-300 hover:bg-white/8 hover:text-white')}>
                  <n.icon className={cx('h-[18px] w-[18px] shrink-0', isActive(n) ? 'text-brand' : '')} />
                  <span className="flex-1">{n.label}</span>
                  {n.badge && <BadgeCount n={badge} />}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function TabLink({ n, active }) {
  return (
    <Link to={n.to} aria-current={active ? 'page' : undefined}
      className={cx('flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold transition', active ? 'text-brand' : 'text-muted hover:text-ink')}>
      <n.icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
      {n.short}
    </Link>
  );
}

/** Hoja "Más": mosaicos grandes con el resto de secciones y la sesión. */
function MoreSheet({ onClose }) {
  const { allowed, isActive, badge } = useNav();
  const tiles = MORE.filter(allowed);
  return (
    <Sheet label="Más secciones" onClose={onClose}>
      <SheetHeader title="Más secciones" hint="Todo el portal, ordenado como trabajamos." onClose={onClose} />
      <ul className="grid grid-cols-3 gap-2.5 px-5 pb-4 pt-1">
        {tiles.map((n, i) => {
          const active = isActive(n);
          return (
            <li key={n.to}>
              <Link to={n.to} onClick={onClose} aria-current={active ? 'page' : undefined} data-autofocus={i === 0 ? '' : undefined}
                className={cx('relative flex min-h-[92px] flex-col items-center justify-center gap-2 rounded-2xl border px-1.5 py-3 text-center text-[13px] font-semibold leading-tight transition active:scale-[0.98]',
                  active ? 'border-brand/40 bg-brand-soft text-brand' : 'border-line bg-paper text-ink hover:border-slate-300')}>
                <span className={cx('flex h-10 w-10 items-center justify-center rounded-2xl', active ? 'bg-brand text-white' : 'bg-white text-brand shadow-[0_1px_2px_rgba(7,26,54,0.08)]')}>
                  <n.icon className="h-5 w-5" />
                </span>
                {n.short}
                {n.badge && <BadgeCount n={badge} className="absolute right-2 top-2" />}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="px-5"><UserBlock onNavigate={onClose} light /></div>
    </Sheet>
  );
}

export default function Layout({ children }) {
  const { full } = useLocation();
  const { isActive, allowed, badge } = useNav();
  // Hoja abierta: 'crear' | 'mas' | 'menu'. Se cierra sola al cambiar de página (también con atrás/adelante).
  const [sheet, setSheet] = useState(null);
  const [seenAt, setSeenAt] = useState(full);
  if (seenAt !== full) {
    setSeenAt(full);
    setSheet(null);
  }
  const close = () => setSheet(null);
  const moreActive = MORE.filter(allowed).some(isActive);

  return (
    <div className="min-h-dvh lg:flex">
      {/* Escritorio */}
      <aside className="sticky top-0 hidden h-dvh w-[264px] shrink-0 flex-col gap-5 bg-ink p-4 lg:flex">
        <div className="px-1 pt-1"><Brand /></div>
        <button type="button" onClick={() => setSheet('crear')} className="btn btn-primary w-full justify-start" aria-haspopup="dialog" aria-label="Crear">
          <Plus className="h-4 w-4" />Crear
          <span className="ml-auto text-xs font-medium text-white/70">Tarea, cita, avance…</span>
        </button>
        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1"><NavList /></div>
        <UserBlock />
      </aside>

      {/* Móvil: barra superior */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-ink px-4 py-2.5 lg:hidden" style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top))' }}>
        <Brand />
        <button type="button" onClick={() => setSheet('menu')} className="tap relative flex items-center justify-center rounded-xl text-white hover:bg-white/10" aria-label="Abrir menú" aria-haspopup="dialog">
          <Menu className="h-5 w-5" />
          {badge > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-coral" />}
        </button>
      </header>

      <main className="main-safe min-w-0 flex-1 px-4 pt-5 sm:px-6 lg:px-8 lg:pt-8">
        <div className="mx-auto max-w-[1280px]">{children}</div>
      </main>

      {/* Móvil: barra inferior */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur lg:hidden" aria-label="Accesos rápidos">
        <div className="mx-auto grid max-w-lg grid-cols-5 items-end px-1">
          {TABS.map((n) => <TabLink key={n.to} n={n} active={isActive(n)} />)}
          <div className="flex justify-center">
            <button type="button" onClick={() => setSheet('crear')} aria-label="Crear" aria-haspopup="dialog"
              className="-mt-5 mb-1 flex flex-col items-center gap-0.5 rounded-2xl text-[11px] font-semibold text-brand">
              <span className="fab flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white transition"><Plus className="h-6 w-6" strokeWidth={2.5} /></span>
              Crear
            </button>
          </div>
          {TABS_END.map((n) => <TabLink key={n.to} n={n} active={isActive(n)} />)}
          <button type="button" onClick={() => setSheet('mas')} aria-haspopup="dialog" aria-expanded={sheet === 'mas'}
            aria-label={badge > 0 ? `Más, ${badge} pendientes en el buzón` : 'Más'}
            className={cx('relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold transition', moreActive ? 'text-brand' : 'text-muted hover:text-ink')}>
            <LayoutGrid className="h-5 w-5" strokeWidth={moreActive ? 2.4 : 2} />
            Más
            {badge > 0 && <span className="absolute right-[22%] top-1.5 min-w-5 rounded-full bg-coral px-1.5 text-center text-[11px] font-bold leading-5 text-white" aria-hidden="true">{badge > 99 ? '99+' : badge}</span>}
          </button>
        </div>
      </nav>

      {sheet === 'crear' && <QuickActions onClose={close} />}
      {sheet === 'mas' && <MoreSheet onClose={close} />}
      {sheet === 'menu' && (
        <Sheet label="Menú" placement="right" onClose={close} className="gap-5 bg-ink px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="flex items-center justify-between">
            <Brand onNavigate={close} />
            <button type="button" onClick={close} className="tap flex items-center justify-center rounded-xl text-white hover:bg-white/10" aria-label="Cerrar"><X className="h-5 w-5" /></button>
          </div>
          <NavList onNavigate={close} />
          <div className="mt-auto safe-bottom"><UserBlock onNavigate={close} /></div>
        </Sheet>
      )}
    </div>
  );
}
