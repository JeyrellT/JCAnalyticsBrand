// Sesión (equipo o cliente), equipo y contadores del buzón, compartidos por toda la app.
// v5: hay dos identidades separadas. El equipo usa /api/me; un cliente usa
// /api/client/me (otra cookie). `kind` dice cuál está activa.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, onUnauthenticated } from './api.js';
import { canInvest } from '../../shared/catalog.js';
import { useAppBadge, onPortalPush, unsubscribePush } from './pwa.js';
import { navigate } from './router.jsx';

const SessionContext = createContext(null);

const ANONYMOUS = { status: 'anonymous', kind: null, user: null, account: null, client: null, contact: null, settings: {}, unread: 0, pending: 0, leadDays: 3, today: null };

const teamState = (me) => ({ ...ANONYMOUS, status: 'ready', kind: 'team', user: me.user, settings: me.settings, unread: me.unread, pending: me.pending_confirmations });
const clientState = (me) => ({
  ...ANONYMOUS, status: 'ready', kind: 'client', account: me.account, client: me.client, contact: me.contact, unread: me.unread, leadDays: me.lead_days, today: me.today,
});

/** ¿La pantalla actual es del portal de clientes? Decide qué sesión se prueba primero. */
const prefersClient = () => typeof window !== 'undefined' && /^\/cliente(\/|$)/.test(window.location.pathname);

/** Prueba las dos sesiones (sin cerrar nada en pantalla por un 401) y devuelve el estado inicial. */
async function detectSession() {
  const probes = prefersClient()
    ? [['/api/client/me', clientState], ['/api/me', teamState]]
    : [['/api/me', teamState], ['/api/client/me', clientState]];
  for (const [path, toState] of probes) {
    try {
      return toState(await api(path, { quiet: true }));
    } catch (error) {
      if (error.status !== 401) return { ...ANONYMOUS, status: 'offline' };
    }
  }
  return ANONYMOUS;
}

export function SessionProvider({ children }) {
  const [state, setState] = useState({ ...ANONYMOUS, status: 'loading' });
  const [team, setTeam] = useState([]);

  const refresh = useCallback(async () => {
    const isClient = state.kind === 'client';
    try {
      const me = await api(isClient ? '/api/client/me' : '/api/me');
      setState(isClient ? clientState(me) : teamState(me));
      return me;
    } catch (error) {
      if (error.status === 401) setState(ANONYMOUS);
      else setState((s) => ({ ...s, status: s.user || s.account ? s.status : 'offline' }));
      return null;
    }
  }, [state.kind]);

  const loadTeam = useCallback(async () => {
    try { setTeam((await api('/api/users')).users); } catch { /* sin permiso aún */ }
  }, []);

  useEffect(() => {
    let alive = true;
    detectSession().then((next) => alive && setState(next));
    const off = onUnauthenticated(() => setState(ANONYMOUS));
    return () => { alive = false; off(); };
  }, []);

  // Globo del ícono instalado = avisos sin leer; un push recibido refresca los contadores.
  useAppBadge(state.status === 'ready' ? state.unread : 0);
  useEffect(() => onPortalPush(() => refresh()), [refresh]);

  const mustChange = state.kind === 'client' ? state.account?.must_change_password : state.user?.must_change_password;
  const ready = state.status === 'ready' && !mustChange;
  useEffect(() => {
    if (!ready) return undefined;
    let alive = true;
    if (state.kind === 'team') api('/api/users').then((r) => alive && setTeam(r.users), () => {});
    // Contadores del buzón: se refrescan cada minuto y al volver a la pestaña.
    const tick = () => { if (document.visibilityState === 'visible') refresh(); };
    const timer = setInterval(tick, 60_000);
    document.addEventListener('visibilitychange', tick);
    return () => { alive = false; clearInterval(timer); document.removeEventListener('visibilitychange', tick); };
  }, [ready, refresh, state.kind]);

  const value = useMemo(() => ({
    ...state,
    isClient: state.kind === 'client',
    mustChangePassword: !!mustChange,
    team,
    activeTeam: team.filter((u) => u.active),
    investors: team.filter((u) => u.active && (u.role === 'admin' || u.role === 'socio')),
    canInvest: canInvest(state.user),
    isAdmin: state.user?.role === 'admin',
    refresh,
    loadTeam,
    /** Login del equipo correcto. */
    signedIn: (user) => {
      setState((s) => ({ ...s, ...ANONYMOUS, status: 'ready', kind: 'team', user }));
      api('/api/me').then((me) => setState(teamState(me)), () => {});
    },
    /** Login de un cliente correcto: carga su sesión completa y abre su portal. */
    signedInClient: async () => {
      try {
        setState(clientState(await api('/api/client/me')));
        navigate('/cliente', { replace: true });
      } catch {
        setState(ANONYMOUS);
      }
    },
    logout: async () => {
      try {
        if (state.kind === 'client') {
          await api('/api/client/auth/logout', { method: 'POST' });
        } else {
          // En un celular compartido, este dispositivo deja de recibir los avisos de esta persona.
          await unsubscribePush().catch(() => {});
          await api('/api/auth/logout', { method: 'POST' });
        }
      } finally {
        setState(ANONYMOUS);
        setTeam([]);
      }
    },
  }), [state, team, refresh, loadTeam, mustChange]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export const useSession = () => useContext(SessionContext);

/** Carga un recurso de la API y expone reload(); evita condiciones de carrera al cambiar la URL. */
export function useResource(path) {
  const [state, setState] = useState({ data: null, error: null, path: null });
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!path) return undefined;
    let alive = true;
    api(path).then(
      (data) => alive && setState({ data, error: null, path }),
      (error) => alive && setState((s) => ({ data: s.path === path ? s.data : null, error, path })),
    );
    return () => { alive = false; };
  }, [path, version]);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const loading = state.path !== path || (!state.data && !state.error);
  return { data: state.path === path ? state.data : null, error: state.path === path ? state.error : null, loading, reload, setData: (fn) => setState((s) => ({ ...s, data: typeof fn === 'function' ? fn(s.data) : fn })) };
}
