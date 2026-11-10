// ============================================================================
//  src/components/site/links.js
//  Constantes de contacto y navegación del sitio (separadas de los componentes
//  para que Fast Refresh funcione).
// ============================================================================

import { t, locale } from '../../i18n/locale';
import { attributionNote } from '../../seo/attribution';
import { servicePath } from '../../seo/routes';
import { CATEGORIES } from '../../content/categories';

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

// Avisa al formulario de contacto desde dónde llega la persona y, solo si ella lo eligió, qué necesita.
// Sin `need` el formulario no marca nada: antes todo acceso genérico llegaba como «Sistema / backend».
// `form: true` = la persona pidió un formulario (en celular, «¿Sin WhatsApp?»): el botón principal del
// formulario envía la consulta al portal en vez de abrir WhatsApp.
export const prepareContact = ({ need = null, source = '', form = false } = {}) => {
  window.dispatchEvent(new CustomEvent('jca:contact-intent', { detail: { need, source, form } }));
};

// Link de WhatsApp con mensaje precargado: el visitante solo toca "enviar".
// Si llegó desde un anuncio, el mensaje termina con la plataforma y campaña,
// así el equipo sabe qué anuncio trajo cada conversación.
// Cuando el mensaje tiene varias líneas y termina con una línea abierta («Mi negocio:»), la nota del anuncio
// va antes de esa línea: así WhatsApp deja el cursor donde la persona tiene que seguir escribiendo.
export const wa = (text) => {
  const note = attributionNote(locale);
  const lines = String(text ?? '').split('\n');
  const open = note && lines.length > 1 && lines[lines.length - 1].trim().endsWith(':');
  const message = open
    ? [...lines.slice(0, -1), note, lines[lines.length - 1]].join('\n')
    : [text, note].filter(Boolean).join('\n\n');
  return `https://wa.me/${PHONE}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
};

// Curva de easing de toda la v3 (salida exponencial).
export const EASE = [0.19, 1, 0.22, 1];

// Menú principal (reunión del 31 de octubre de 2026): cada categoría abre su propia página en vez
// de un ancla del one-page; la portada conserva los proyectos reales arriba y los precios más abajo.
// `key` identifica el capítulo (icono y detalle del menú de celular en Nav.jsx). Los nombres y el orden
// de las categorías salen de content/categories.js, igual que en el hero, «Qué hacemos» y el pie.
export const CATEGORY_LINKS = CATEGORIES.map((category) => ({
  key: category.key, id: category.id, label: category.name[locale], short: category.short[locale], href: servicePath(category.page, locale),
}));
export const NAV_LINKS = [
  ...CATEGORY_LINKS,
  { key: 'projects', label: t('Proyectos', 'Projects'), short: t('Proyectos', 'Projects'), href: '#trabajo' },
  { key: 'pricing', label: t('Precios', 'Pricing'), short: t('Precios', 'Pricing'), href: '#paquetes' },
];
