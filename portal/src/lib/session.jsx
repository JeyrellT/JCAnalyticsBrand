// Sesión del usuario, equipo y contadores del buzón, compartidos por toda la app.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, onUnauthenticated } from './api.js';
import { canInvest } from '../../shared/catalog.js';

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', user: null, settings: {}, unread: 0, pending: 0 });
  const [team, setTeam] = useState([]);

  const refresh = useCallback(async () => {
    try {
      const me = await api('/api/me');
      setState({ status: 'ready', user: me.user, settings: me.settings, unread: me.unread, pending: me.pending_confirmations });
      return me;
    } catch (error) {
      if (error.status === 401) setState({ status: 'anonymous', user: null, settings: {}, unread: 0, pending: 0 });
      else setState((s) => ({ ...s, status: s.user ? s.status : 'offline' }));
      return null;
    }
  }, []);

  const loadTeam = useCallback(async () => {
    try { setTeam((await api('/api/users')).users); } catch { /* sin permiso aún */ }
  }, []);

  useEffect(() => {
    let alive = true;
    api('/api/me').then(
      (me) => alive && setState({ status: 'ready', user: me.user, settings: me.settings, unread: me.unread, pending: me.pending_confirmations }),
      (error) => alive && setState({ status: error.status === 401 ? 'anonymous' : 'offline', user: null, settings: {}, unread: 0, pending: 0 }),
    );
    const off = onUnauthenticated(() => setState({ status: 'anonymous', user: null, settings: {}, unread: 0, pending: 0 }));
    return () => { alive = false; off(); };
  }, []);

  const ready = state.status === 'ready' && !state.user?.must_change_password;
  useEffect(() => {
    if (!ready) return undefined;
    let alive = true;
    api('/api/users').then((r) => alive && setTeam(r.users), () => {});
    // Contadores del buzón: se refrescan cada minuto y al volver a la pestaña.
    const tick = () => { if (document.visibilityState === 'visible') refresh(); };
    const timer = setInterval(tick, 60_000);
    document.addEventListener('visibilitychange', tick);
    return () => { alive = false; clearInterval(timer); document.removeEventListener('visibilitychange', tick); };
  }, [ready, refresh]);

  const value = useMemo(() => ({
    ...state,
    team,
    activeTeam: team.filter((u) => u.active),
    investors: team.filter((u) => u.active && (u.role === 'admin' || u.role === 'socio')),
    canInvest: canInvest(state.user),
    isAdmin: state.user?.role === 'admin',
    refresh,
    loadTeam,
    signedIn: (user) => setState((s) => ({ ...s, status: 'ready', user })),
    logout: async () => {
      try { await api('/api/auth/logout', { method: 'POST' }); } finally { setState({ status: 'anonymous', user: null, settings: {}, unread: 0, pending: 0 }); setTeam([]); }
    },
  }), [state, team, refresh, loadTeam]);

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
