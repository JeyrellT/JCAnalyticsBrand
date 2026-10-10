// Estructura del portal: barra lateral en escritorio, barra superior + pestañas inferiores en móvil.
import { useState } from 'react';
import {
  LayoutDashboard, FolderKanban, KanbanSquare, CalendarDays, TrendingUp, Inbox, Users, History, LogOut, Menu, X,
} from 'lucide-react';
import { Link, useLocation } from '../lib/router.jsx';
import { useSession } from '../lib/session.jsx';
import { ROLES } from '../../shared/catalog.js';
import { Avatar, cx } from './ui.jsx';
import logoMark from '../assets/logo-mark.webp';

const NAV = [
  { to: '/', label: 'Centro de operaciones', short: 'Inicio', icon: LayoutDashboard, exact: true },
  { to: '/proyectos', label: 'Proyectos', short: 'Proyectos', icon: FolderKanban },
  { to: '/tablero', label: 'Tablero', short: 'Tablero', icon: KanbanSquare },
  { to: '/agenda', label: 'Agenda', short: 'Agenda', icon: CalendarDays },
  { to: '/inversiones', label: 'Inversiones', short: 'Inversiones', icon: TrendingUp, invest: true },
  { to: '/buzon', label: 'Buzón', short: 'Buzón', icon: Inbox, badge: true },
  { to: '/equipo', label: 'Equipo y ajustes', short: 'Equipo', icon: Users },
  { to: '/bitacora', label: 'Bitácora', short: 'Bitácora', icon: History },
];

function useNav() {
  const { canInvest, unread, pending } = useSession();
  const { path } = useLocation();
  const items = NAV.filter((n) => !n.invest || canInvest);
  const isActive = (n) => (n.exact ? path === n.to : path === n.to || path.startsWith(`${n.to}/`));
  return { items, isActive, badge: unread + pending };
}

function BadgeCount({ n, className }) {
  if (!n) return null;
  return <span className={cx('min-w-5 rounded-full bg-coral px-1.5 text-center text-[11px] font-bold leading-5 text-white', className)}>{n > 99 ? '99+' : n}</span>;
}

function Brand({ compact = false }) {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <img src={logoMark} alt="" className="h-9 w-9 rounded-xl bg-white object-contain p-1" />
      {!compact && (
        <span className="leading-tight">
          <span className="block font-display text-[15px] font-bold text-white">JC Analytics</span>
          <span className="block text-[11px] font-medium uppercase tracking-[0.16em] text-teal">Portal del equipo</span>
        </span>
      )}
    </Link>
  );
}

function UserBlock({ onNavigate }) {
  const { user, logout } = useSession();
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-3">
      <Avatar name={user.name} color={user.color} size={34} />
      <Link to="/equipo" onClick={onNavigate} className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-white">{user.name}</span>
        <span className="block truncate text-xs text-slate-400">{ROLES[user.role]?.label}</span>
      </Link>
      <button type="button" onClick={logout} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white" title="Cerrar sesión" aria-label="Cerrar sesión">
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}

function NavList({ onNavigate }) {
  const { items, isActive, badge } = useNav();
  return (
    <nav className="flex flex-col gap-1" aria-label="Secciones">
      {items.map((n) => (
        <Link key={n.to} to={n.to} onClick={onNavigate} aria-current={isActive(n) ? 'page' : undefined}
          className={cx('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
            isActive(n) ? 'bg-white text-ink shadow-sm' : 'text-slate-300 hover:bg-white/8 hover:text-white')}>
          <n.icon className={cx('h-[18px] w-[18px]', isActive(n) ? 'text-brand' : '')} />
          <span className="flex-1">{n.label}</span>
          {n.badge && <BadgeCount n={badge} />}
        </Link>
      ))}
    </nav>
  );
}

export default function Layout({ children }) {
  const [drawer, setDrawer] = useState(false);
  const { items, isActive, badge } = useNav();
  const mobileTabs = items.filter((n) => ['/', '/tablero', '/agenda', '/inversiones', '/buzon'].includes(n.to)).slice(0, 5);

  return (
    <div className="min-h-dvh lg:flex">
      {/* Escritorio */}
      <aside className="sticky top-0 hidden h-dvh w-[264px] shrink-0 flex-col gap-6 bg-ink p-4 lg:flex">
        <div className="px-1 pt-1"><Brand /></div>
        <NavList />
        <div className="mt-auto"><UserBlock /></div>
      </aside>

      {/* Móvil: barra superior */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-ink px-4 py-3 lg:hidden" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        <Brand />
        <button type="button" onClick={() => setDrawer(true)} className="relative rounded-xl p-2 text-white hover:bg-white/10" aria-label="Abrir menú">
          <Menu className="h-5 w-5" />
          {badge > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-coral" />}
        </button>
      </header>

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <button type="button" className="absolute inset-0 bg-ink/50" onClick={() => setDrawer(false)} aria-label="Cerrar menú" />
          <div className="animate-rise absolute inset-y-0 right-0 flex w-[84%] max-w-xs flex-col gap-5 bg-ink p-4">
            <div className="flex items-center justify-between"><Brand /><button type="button" onClick={() => setDrawer(false)} className="rounded-xl p-2 text-white hover:bg-white/10" aria-label="Cerrar"><X className="h-5 w-5" /></button></div>
            <NavList onNavigate={() => setDrawer(false)} />
            <div className="mt-auto"><UserBlock onNavigate={() => setDrawer(false)} /></div>
          </div>
        </div>
      )}

      <main className="min-w-0 flex-1 px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">
        <div className="mx-auto max-w-[1280px]">{children}</div>
      </main>

      {/* Móvil: pestañas inferiores */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 grid border-t border-line bg-white/95 backdrop-blur lg:hidden" style={{ gridTemplateColumns: `repeat(${mobileTabs.length}, minmax(0, 1fr))` }} aria-label="Accesos rápidos">
        {mobileTabs.map((n) => (
          <Link key={n.to} to={n.to} aria-current={isActive(n) ? 'page' : undefined}
            className={cx('relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold', isActive(n) ? 'text-brand' : 'text-muted')}>
            <n.icon className="h-5 w-5" />
            {n.short}
            {n.badge && badge > 0 && <BadgeCount n={badge} className="absolute right-[18%] top-1" />}
          </Link>
        ))}
      </nav>
    </div>
  );
}
