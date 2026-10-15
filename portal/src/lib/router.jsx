// Router mínimo sobre la History API (el servidor devuelve index.html en cualquier ruta).
// Modo "memory" (demo embebida): la ruta vive en memoria y nunca se toca
// window.location ni history, porque algunos iframes solo permiten anclas #.
import { useSyncExternalStore } from 'react';

const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn());
if (typeof window !== 'undefined') window.addEventListener('popstate', emit);

let mode = 'history';
let memoryPath = '/';

/** 'history' (por defecto) o 'memory'. En memoria se empieza en initialPath. */
export function setRouterMode(next, { initialPath = '/' } = {}) {
  mode = next === 'memory' ? 'memory' : 'history';
  if (mode === 'memory') memoryPath = initialPath;
  emit();
}
export const getRouterMode = () => mode;

const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const snapshot = () => (mode === 'memory' ? memoryPath : window.location.pathname + window.location.search);

export function navigate(to, { replace = false } = {}) {
  if (to === snapshot()) return;
  if (mode === 'memory') memoryPath = to;
  else window.history[replace ? 'replaceState' : 'pushState'](null, '', to);
  window.scrollTo({ top: 0 });
  emit();
}

export function useLocation() {
  const full = useSyncExternalStore(subscribe, snapshot);
  // Base fija: en un iframe aislado window.location.origin puede ser "null".
  const url = new URL(full, 'http://localhost');
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
  const memory = mode === 'memory';
  return (
    <a
      href={memory ? `#${to}` : to}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || props.target) return;
        if (!memory && (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) return;
        e.preventDefault();
        navigate(to);
      }}
      {...props}
    >
      {children}
    </a>
  );
}
