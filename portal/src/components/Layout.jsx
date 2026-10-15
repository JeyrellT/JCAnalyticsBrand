// Estructura del portal, ordenada como trabaja la empresa:
// Operación (el día a día) · Empresa (proyectos, clientes, servicios, equipo) · Socios · Control.
// Escritorio: barra lateral "tinta" con botón "Crear", grupos y acento en la sección activa.
// Móvil: barra superior + barra inferior de vidrio (Inicio, Tablero, Crear, Agenda, Más) con hojas.
import { useState } from 'react';
import {
  LayoutDashboard, FolderKanban, KanbanSquare, CalendarDays, TrendingUp, Inbox, Users, History, LogOut, Menu, X,
  Building2, Layers, Plus, LayoutGrid, Bot, BellRing, ChevronRight,
  ClipboardList, // v5
} from 'lucide-react';
import { Link, useLocation } from '../lib/router.jsx';
import { useSession } from '../lib/session.jsx';
import { ROLES } from '../../shared/catalog.js';
import { Avatar, ThemeToggle, ThemePicker, cx } from './ui.jsx';
import QuickActions, { Sheet, SheetHeader } from './QuickActions.jsx';
import logoMark from '../assets/logo-mark.webp';

// `label` se usa en la barra lateral y el menú; `short`, en las pestañas y mosaicos del celular.
const GROUPS = [
  {
    label: 'Operación',
    items: [
      { to: '/', label: 'Inicio', short: 'Inicio', icon: LayoutDashboard, exact: true, tone: 'blue' },
      { to: '/tablero', label: 'Tablero', short: 'Tablero', icon: KanbanSquare, tone: 'blue' },
      { to: '/agenda', label: 'Agenda', short: 'Agenda', icon: CalendarDays, tone: 'violet' },
      { to: '/buzon', label: 'Buzón', short: 'Buzón', icon: Inbox, badge: true, tone: 'teal' },
    ],
  },
  {
    label: 'Empresa',
    items: [
      { to: '/proyectos', label: 'Proyectos', short: 'Proyectos', icon: FolderKanban, tone: 'blue' },
      { to: '/clientes', label: 'Clientes', short: 'Clientes', icon: Building2, tone: 'amber' },
      { to: '/briefs', label: 'Briefs', short: 'Briefs', icon: ClipboardList, tone: 'violet' }, // v5
      { to: '/servicios', label: 'Servicios', short: 'Servicios', icon: Layers, tone: 'violet' },
      { to: '/equipo', label: 'Equipo y ajustes', short: 'Equipo', icon: Users, tone: 'teal' },
    ],
  },
  { label: 'Socios', invest: true, items: [{ to: '/inversiones', label: 'Inversiones', short: 'Inversiones', icon: TrendingUp, tone: 'teal' }] },
  {
    label: 'Control',
    items: [
      { to: '/automatizaciones', label: 'Automatizaciones', short: 'Automatiz.', icon: Bot, tone: 'violet' },
      { to: '/notificaciones', label: 'Avisos y app', short: 'Avisos', icon: BellRing, tone: 'amber' },
      { to: '/bitacora', label: 'Bitácora', short: 'Bitácora', icon: History, tone: 'slate' },
    ],
  },
];

const ALL = GROUPS.flatMap((g) => g.items.map((n) => ({ ...n, invest: g.invest })));
const byPath = Object.fromEntries(ALL.map((n) => [n.to, n]));
const TABS = ['/', '/tablero'].map((to) => byPath[to]);
const TABS_END = [byPath['/agenda']];
// Mosaicos de "Más", en el orden en que se piensa la empresa.
const MORE = ['/proyectos', '/clientes', '/briefs' /* v5 */, '/servicios', '/equipo', '/inversiones', '/buzon', '/automatizaciones', '/notificaciones', '/bitacora'].map((to) => byPath[to]);

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
    <span className={cx('min-w-5 rounded-full bg-coral px-1.5 text-center text-[11px] font-bold leading-5 text-white shadow-[0_0_0_2px_var(--panel)]', className)}>
      {n > 99 ? '99+' : n}<span className="sr-only"> pendientes</span>
    </span>
  );
}

function Brand({ onNavigate, compact = false }) {
  return (
    <Link to="/" onClick={onNavigate} className="flex items-center gap-2.5 rounded-xl">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.25),inset_0_0_0_1px_rgba(7,26,54,0.06)]">
        <img src={logoMark} alt="" className="h-7 w-7 object-contain" />
      </span>
      <span className="leading-tight">
        <span className="block font-display text-[15px] font-bold text-white">JC Analytics</span>
        {!compact && <span className="block text-[10.5px] font-semibold uppercase tracking-[0.18em] text-teal">Portal del equipo</span>}
      </span>
    </Link>
  );
}

function UserBlock({ onNavigate, light = false }) {
  const { user, logout } = useSession();
  return (
    <div className={cx('flex items-center gap-3 rounded-2xl p-2.5', light ? 'border border-line bg-surface-2' : 'border border-panel-line bg-white/[0.04]')}>
      <Link to="/equipo?tab=perfil" onClick={onNavigate} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl" aria-label={`${user.name}, mi perfil`}>
        <Avatar name={user.name} color={user.color} size={36} />
        <span className="min-w-0 flex-1">
          <span className={cx('block truncate text-sm font-semibold', light ? 'text-ink' : 'text-white')}>{user.name}</span>
          <span className={cx('block truncate text-[11.5px]', light ? 'text-muted' : 'text-panel-muted')}>{ROLES[user.role]?.label} · Mi perfil</span>
        </span>
      </Link>
      {light ? (
        <button type="button" onClick={logout} className="btn btn-outline tap" aria-label="Cerrar sesión">
          <LogOut className="h-4 w-4" />Cerrar sesión
        </button>
      ) : (
        <button type="button" onClick={logout} className="tap flex items-center justify-center rounded-xl text-panel-muted transition hover:bg-white/10 hover:text-white lg:min-h-9 lg:min-w-9" title="Cerrar sesión" aria-label="Cerrar sesión">
          <LogOut className="h-[18px] w-[18px]" />
        </button>
      )}
    </div>
  );
}

/** Lista agrupada (barra lateral de escritorio y menú lateral del celular). */
function NavList({ onNavigate }) {
  const { groups, isActive, badge } = useNav();
  return (
    <nav className="flex flex-col gap-5" aria-label="Secciones">
      {groups.map((g) => (
        <div key={g.label} role="group" aria-label={g.label}>
          <p className="px-3 pb-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-panel-muted/80" aria-hidden="true">{g.label}</p>
          <ul className="flex flex-col gap-0.5">
            {g.items.map((n) => {
              const active = isActive(n);
              return (
                <li key={n.to}>
                  <Link to={n.to} onClick={onNavigate} aria-current={active ? 'page' : undefined}
                    className={cx('relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-[13.5px] font-medium transition lg:min-h-10',
                      active ? 'nav-active bg-white/[0.09] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]' : 'text-panel-muted hover:bg-white/[0.06] hover:text-white')}>
                    <n.icon className={cx('h-[18px] w-[18px] shrink-0 transition', active ? 'text-teal' : 'opacity-90')} strokeWidth={active ? 2.3 : 2} />
                    <span className="flex-1">{n.label}</span>
                    {n.badge && <BadgeCount n={badge} />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function TabLink({ n, active }) {
  return (
    <Link to={n.to} aria-current={active ? 'page' : undefined}
      className={cx('group flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold transition', active ? 'text-brand-ink' : 'text-muted hover:text-ink')}>
      <span className={cx('flex h-7 w-12 items-center justify-center rounded-full transition', active ? 'bg-brand-soft' : 'group-active:bg-surface-3')}>
        <n.icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
      </span>
      {n.short}
    </Link>
  );
}

/** Hoja "Más": mosaicos grandes con el resto de secciones, tema y sesión. */
function MoreSheet({ onClose }) {
  const { allowed, isActive, badge } = useNav();
  const tiles = MORE.filter(allowed);
  return (
    <Sheet label="Más secciones" onClose={onClose}>
      <SheetHeader title="Más secciones" hint="Todo el portal, ordenado como trabajamos." onClose={onClose} />
      <ul className="stagger grid grid-cols-3 gap-2.5 px-5 pb-4 pt-1">
        {tiles.map((n, i) => {
          const active = isActive(n);
          return (
            <li key={n.to}>
              <Link to={n.to} onClick={onClose} aria-current={active ? 'page' : undefined} data-autofocus={i === 0 ? '' : undefined}
                className={cx('relative flex min-h-[92px] flex-col items-center justify-center gap-2 rounded-2xl border px-1.5 py-3 text-center text-[13px] font-semibold leading-tight transition active:scale-[0.97]',
                  active ? 'border-brand/40 bg-brand-soft text-brand-ink' : 'border-line bg-surface-2 text-ink hover:border-line-strong')}>
                <span className={cx('icon-tile', active ? 'tile-brand shadow-brand' : `tile-${n.tone ?? 'blue'}`)}>
                  <n.icon className="h-5 w-5" />
                </span>
                {n.short}
                {n.badge && <BadgeCount n={badge} className="absolute right-2 top-2 shadow-none" />}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="space-y-3 px-5">
        <ThemePicker />
        <UserBlock onNavigate={onClose} light />
      </div>
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
      <aside className="shell-panel sticky top-0 hidden h-dvh w-[268px] shrink-0 flex-col gap-5 border-r border-panel-line p-4 lg:flex">
        <div className="flex items-center justify-between pl-1 pt-1"><Brand /><ThemeToggle light className="lg:min-h-9 lg:min-w-9" /></div>
        <button type="button" onClick={() => setSheet('crear')} className="btn btn-primary w-full justify-start" aria-haspopup="dialog" aria-label="Crear">
          <Plus className="h-4 w-4" strokeWidth={2.5} />Crear
          <span className="ml-auto flex items-center gap-1 text-[11.5px] font-medium text-white/70">Tarea, cita, avance <ChevronRight className="h-3.5 w-3.5" /></span>
        </button>
        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1"><NavList /></div>
        <UserBlock />
      </aside>

      {/* Móvil: barra superior */}
      <header className="shell-panel sticky top-0 z-30 flex items-center justify-between px-4 py-2.5 lg:hidden" style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top))' }}>
        <Brand />
        <div className="flex items-center gap-0.5">
          <ThemeToggle light />
          <button type="button" onClick={() => setSheet('menu')} className="tap relative flex items-center justify-center rounded-xl text-white hover:bg-white/10" aria-label="Abrir menú" aria-haspopup="dialog">
            <Menu className="h-5 w-5" />
            {badge > 0 && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-coral ring-2 ring-[var(--panel)]" />}
          </button>
        </div>
      </header>

      <main className="main-safe min-w-0 flex-1 px-4 pt-5 sm:px-6 lg:px-8 lg:pt-8">
        <div className="mx-auto max-w-[1280px]">{children}</div>
      </main>

      {/* Móvil: barra inferior */}
      <nav className="safe-bottom glass fixed inset-x-0 bottom-0 z-30 border-t border-line shadow-up lg:hidden" aria-label="Accesos rápidos">
        <div className="mx-auto grid max-w-lg grid-cols-5 items-end px-1">
          {TABS.map((n) => <TabLink key={n.to} n={n} active={isActive(n)} />)}
          <div className="flex justify-center">
            <button type="button" onClick={() => setSheet('crear')} aria-label="Crear" aria-haspopup="dialog"
              className="-mt-5 mb-1 flex flex-col items-center gap-0.5 rounded-2xl text-[11px] font-semibold text-brand-ink">
              <span className="fab flex h-14 w-14 items-center justify-center rounded-full text-white transition"><Plus className="h-6 w-6" strokeWidth={2.5} /></span>
              Crear
            </button>
          </div>
          {TABS_END.map((n) => <TabLink key={n.to} n={n} active={isActive(n)} />)}
          <button type="button" onClick={() => setSheet('mas')} aria-haspopup="dialog" aria-expanded={sheet === 'mas'}
            aria-label={badge > 0 ? `Más, ${badge} pendientes en el buzón` : 'Más'}
            className={cx('group relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold transition', moreActive ? 'text-brand-ink' : 'text-muted hover:text-ink')}>
            <span className={cx('flex h-7 w-12 items-center justify-center rounded-full transition', moreActive ? 'bg-brand-soft' : 'group-active:bg-surface-3')}>
              <LayoutGrid className="h-5 w-5" strokeWidth={moreActive ? 2.4 : 2} />
            </span>
            Más
            {badge > 0 && <span className="absolute right-[18%] top-1 min-w-5 rounded-full bg-coral px-1.5 text-center text-[11px] font-bold leading-5 text-white ring-2 ring-surface" aria-hidden="true">{badge > 99 ? '99+' : badge}</span>}
          </button>
        </div>
      </nav>

      {sheet === 'crear' && <QuickActions onClose={close} />}
      {sheet === 'mas' && <MoreSheet onClose={close} />}
      {sheet === 'menu' && (
        <Sheet label="Menú" placement="right" onClose={close} className="shell-panel gap-5 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
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
