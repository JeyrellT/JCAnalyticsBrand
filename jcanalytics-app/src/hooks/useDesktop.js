// ============================================================================
//  src/hooks/useDesktop.js — ¿computadora con mouse o celular/tableta?
//
//  Decide el camino de contacto por dispositivo:
//    · Celular y tableta (puntero táctil): los botones abren WhatsApp, que ahí
//      está instalado y es un toque.
//    · Computadora (mouse): WhatsApp Web exige tener la sesión iniciada y mucha
//      gente abandona. Los mismos botones abren el formulario corto y la
//      consulta llega al portal del equipo (ver ui/LeadDialog.jsx).
//
//  Los navegadores automatizados (prerender, pruebas) se comportan como celular
//  para que el HTML estático no cambie entre builds; una prueba puede forzar el
//  modo computadora redefiniendo navigator.webdriver en false.
// ============================================================================
import { useEffect, useState } from 'react';

const QUERY = '(hover: hover) and (pointer: fine)';

export const isDesktopPointer = () => typeof window !== 'undefined'
  && window.navigator.webdriver !== true
  && Boolean(window.matchMedia?.(QUERY).matches);

/** true en computadora con mouse; false en el primer render, en táctil y en navegadores automatizados. */
export function useDesktop() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const query = window.matchMedia(QUERY);
    const sync = () => setDesktop(isDesktopPointer());
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);
  return desktop;
}
