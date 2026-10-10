// Router mínimo sobre la History API (el servidor devuelve index.html en cualquier ruta).
import { useSyncExternalStore } from 'react';

const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn());
if (typeof window !== 'undefined') window.addEventListener('popstate', emit);

const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const snapshot = () => window.location.pathname + window.location.search;

export function navigate(to, { replace = false } = {}) {
  if (to === snapshot()) return;
  window.history[replace ? 'replaceState' : 'pushState'](null, '', to);
  window.scrollTo({ top: 0 });
  emit();
}

export function useLocation() {
  const full = useSyncExternalStore(subscribe, snapshot);
  const url = new URL(full, window.location.origin);
  return { path: url.pathname, query: url.searchParams, full };
}

/** Coincide "/proyectos/:id" con "/proyectos/12" → { id: '12' }. */
export function matchPath(pattern, path) {
  const keys = [];
  const re = new RegExp(`^${pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; })}/?$`);
  const m = re.exec(path);
  return m ? Object.fromEntries(keys.map((k, i) => [k, decodeURIComponent(m[i + 1])])) : null;
}

export function Link({ to, onClick, children, ...props }) {
  return (
    <a
      href={to}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || props.target) return;
        e.preventDefault();
        navigate(to);
      }}
      {...props}
    >
      {children}
    </a>
  );
}
