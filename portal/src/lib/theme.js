// Tema claro / oscuro / automático del portal.
//   · La preferencia se guarda en localStorage ('jcp:theme' = 'light' | 'dark' | 'auto').
//   · 'auto' sigue al sistema (prefers-color-scheme); los tokens viven en src/index.css.
//   · index.html aplica la preferencia antes de pintar (sin destello); acá se mantiene al día
//     y se actualiza <meta name="theme-color"> para que la barra del celular acompañe.
import { useSyncExternalStore } from 'react';

export const THEME_KEY = 'jcp:theme';
export const THEMES = [
  { value: 'auto', label: 'Automático', hint: 'Sigue al celular o la compu' },
  { value: 'light', label: 'Claro', hint: 'Siempre claro' },
  { value: 'dark', label: 'Oscuro', hint: 'Siempre oscuro' },
];
const THEME_COLOR = { light: '#071a36', dark: '#070e1b' };

const hasWindow = typeof window !== 'undefined' && typeof document !== 'undefined';
const listeners = new Set();

function readPreference() {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === 'light' || v === 'dark' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

function systemDark() {
  try { return window.matchMedia('(prefers-color-scheme: dark)').matches; } catch { return false; }
}

/** 'light' | 'dark' efectivo. */
export function resolvedTheme(preference = readPreference()) {
  return preference === 'auto' ? (systemDark() ? 'dark' : 'light') : preference;
}

export function getThemePreference() {
  return readPreference();
}

/** Aplica la preferencia al documento (atributo + color de la barra del sistema). */
export function applyTheme(preference = readPreference()) {
  if (!hasWindow) return;
  const root = document.documentElement;
  if (preference === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', preference);
  const resolved = resolvedTheme(preference);
  root.style.colorScheme = resolved;
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = THEME_COLOR[resolved];
}

export function setThemePreference(preference) {
  const value = preference === 'light' || preference === 'dark' ? preference : 'auto';
  try {
    if (value === 'auto') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, value);
  } catch { /* almacenamiento bloqueado: igual se aplica en esta pestaña */ }
  applyTheme(value);
  snapshot = null;
  listeners.forEach((fn) => fn());
}

/** Alterna entre claro y oscuro a partir del tema efectivo. */
export function toggleTheme() {
  setThemePreference(resolvedTheme() === 'dark' ? 'light' : 'dark');
}

let snapshot = null;
function getSnapshot() {
  if (!snapshot) {
    const preference = readPreference();
    snapshot = { preference, resolved: resolvedTheme(preference) };
  }
  return snapshot;
}
const serverSnapshot = { preference: 'auto', resolved: 'light' };

function subscribe(fn) {
  listeners.add(fn);
  let media = null;
  const onSystem = () => { snapshot = null; applyTheme(); fn(); };
  const onStorage = (e) => { if (e.key === THEME_KEY) { snapshot = null; applyTheme(); fn(); } };
  try {
    media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', onSystem);
  } catch { /* sin matchMedia */ }
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(fn);
    media?.removeEventListener('change', onSystem);
    window.removeEventListener('storage', onStorage);
  };
}

/** const { preference, resolved, setPreference, toggle } = useTheme(); */
export function useTheme() {
  const state = useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot);
  return { ...state, setPreference: setThemePreference, toggle: toggleTheme };
}

// Al cargar el módulo, deja el documento consistente con la preferencia guardada.
if (hasWindow) applyTheme();
