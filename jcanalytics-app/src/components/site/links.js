// ============================================================================
//  src/components/site/links.js
//  Constantes de contacto y navegación del sitio (separadas de los componentes
//  para que Fast Refresh funcione).
// ============================================================================

import { t } from '../../i18n/locale';

// Dos líneas de WhatsApp atienden las consultas. Cada visitante queda asignado
// al azar (50/50) a una de ellas y la conserva en todo el sitio y en visitas
// siguientes: así ambas reciben la misma oportunidad y un mismo cliente no
// escribe a las dos. Para probar una línea: ?wa_line=a o ?wa_line=b.
export const WA_LINES = [
  { id: 'a', phone: '50670330596', display: '+506 7033 0596' },
  { id: 'b', phone: '50688646581', display: '+506 8864 6581' },
];
const LINE_KEY = 'jc_wa_line';

const pickLine = () => {
  if (typeof window === 'undefined') return WA_LINES[0];
  const byId = (id) => WA_LINES.find((line) => line.id === id);
  const forced = byId(new URLSearchParams(window.location.search).get('wa_line'));
  if (forced) return forced;
  // El prerender (navegador automatizado) siempre usa la línea principal para
  // que el HTML estático no cambie entre builds.
  if (window.navigator?.webdriver) return WA_LINES[0];
  let stored = null;
  try { stored = byId(window.localStorage.getItem(LINE_KEY)); } catch { /* almacenamiento bloqueado */ }
  if (stored) return stored;
  const line = WA_LINES[Math.random() < 0.5 ? 0 : 1];
  try { window.localStorage.setItem(LINE_KEY, line.id); } catch { /* sin persistencia: se sortea por visita */ }
  return line;
};

const LINE = pickLine();
export const WA_LINE = LINE.id;
export const PHONE = LINE.phone;
export const PHONE_DISPLAY = LINE.display;
export const EMAIL = 'gerencia@jcanalytic.com';

// Entrada al portal privado del equipo (proyectos, agenda, inversiones de socios).
// Se puede cambiar al compilar con VITE_PORTAL_URL sin tocar el código.
export const PORTAL_URL = import.meta.env.VITE_PORTAL_URL || 'https://portal.jcanalytic.com';

export const prepareContact = ({ need, source = '' }) => {
  window.dispatchEvent(new CustomEvent('jca:contact-intent', { detail: { need, source } }));
};

// Link de WhatsApp con mensaje precargado: el visitante solo toca "enviar".
export const wa = (text) =>
  `https://wa.me/${PHONE}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

// Curva de easing de toda la v3 (salida exponencial).
export const EASE = [0.19, 1, 0.22, 1];

export const NAV_LINKS = [
  { label: t('Sistemas', 'Software'), href: '#plataformas' },
  { label: t('Finanzas & BI', 'Finance & BI'), href: '#finanzas' },
  { label: t('IA & ML', 'AI & ML'), href: '#inteligencia' },
  { label: t('Ejemplos', 'Examples'), href: '#trabajo' },
  { label: 'Marketing', href: '#redes' },
  { label: t('Contacto', 'Contact'), href: '#contacto' },
];
