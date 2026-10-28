// ============================================================================
//  shared/leads.js
//  Consultas que llegan desde el sitio público y analítica de tráfico (sin
//  dependencias: lo usan el servidor, la demo y la interfaz).
//
//  Todo lo que escribe un visitante es DATO NO CONFIABLE:
//  - se limpia (caracteres de control, marcas bidi y de ancho cero) y se recorta;
//  - se muestra siempre como texto, nunca como HTML ni como enlace propio;
//  - nunca se envía a un modelo de IA ni se expone por MCP (ver docs/consultas-y-trafico.md);
//  - si parece spam o instrucciones para una IA, se marca para que el equipo lo revise.
// ============================================================================

export const LEAD_STATUS = {
  nuevo: { label: 'Nueva', tone: 'blue', open: true },
  contactado: { label: 'Contactada', tone: 'violet', open: true },
  en_conversacion: { label: 'En conversación', tone: 'amber', open: true },
  cotizado: { label: 'Cotizada', tone: 'teal', open: true },
  ganado: { label: 'Ganada', tone: 'teal', open: false },
  perdido: { label: 'Perdida', tone: 'slate', open: false },
  spam: { label: 'Spam', tone: 'red', open: false },
};
export const LEAD_OPEN_STATUSES = Object.keys(LEAD_STATUS).filter((k) => LEAD_STATUS[k].open);

/** Por dónde llegó: el formulario de contacto, un paquete con precio o el aviso de "que me contacten". */
export const LEAD_CHANNELS = {
  formulario: 'Formulario de contacto',
  paquete: 'Paquete con precio',
  devolucion: 'Pidió que lo contacten',
};

export const LEAD_CONTACT_VIA = { whatsapp: 'WhatsApp', llamada: 'Llamada', correo: 'Correo' };

/** Necesidades que ofrece el formulario del sitio (mismas claves que jcanalytics-app/src/components/site/Contact.jsx). */
export const LEAD_NEEDS = ['Sistema / backend', 'Página web', 'Finanzas', 'Dashboard', 'Machine learning', 'Integración de IA', 'Automatización', 'Marketing digital', 'Otro'];

export const LEAD_LIMITS = { name: 100, phone: 30, email: 160, message: 600, need: 40, package: 60, note: 2000 };

// ── Analítica ───────────────────────────────────────────────────────────────

/** Tipos de evento que acepta la ingesta. `value`: ms visibles (section) o % de scroll (scroll). */
export const SITE_EVENT_TYPES = ['view', 'section', 'click', 'scroll', 'form_start', 'form_submit'];
/** Qué se tocó: los CTA cuentan para el embudo. */
export const CLICK_KINDS = {
  whatsapp: { label: 'WhatsApp', cta: true },
  package: { label: 'Paquete con precio', cta: true },
  contact: { label: 'Formulario o contacto', cta: true },
  phone: { label: 'Llamada', cta: true },
  email: { label: 'Correo', cta: true },
  nav: { label: 'Menú', cta: false },
  project: { label: 'Proyecto', cta: false },
  link: { label: 'Enlace', cta: false },
  button: { label: 'Botón', cta: false },
};
export const CTA_KINDS = Object.keys(CLICK_KINDS).filter((k) => CLICK_KINDS[k].cta);
export const DEVICES = { mobile: 'Celular', tablet: 'Tableta', desktop: 'Escritorio' };
export const ANALYTICS_PERIODS = [7, 30, 90];
/** Días que se guardan los eventos crudos (las consultas no se borran solas). */
export const ANALYTICS_RETENTION_DAYS = 180;

// ── Limpieza de texto no confiable ──────────────────────────────────────────

// Controles C0/C1 (salvo salto de línea y tab), marcas de dirección bidi y caracteres de ancho cero.
// eslint-disable-next-line no-control-regex
const UNSAFE_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/g;

/** Texto de un visitante listo para guardar: sin caracteres invisibles, sin espacios de sobra y recortado. */
export function cleanVisitorText(value, max, { multiline = false } = {}) {
  if (typeof value !== 'string') return null;
  let v = value.normalize('NFC').replace(/\r\n?/g, '\n').replace(UNSAFE_CHARS, '');
  v = multiline ? v.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n') : v.replace(/\s+/g, ' ');
  v = v.trim().slice(0, max).trim();
  return v || null;
}

/** Teléfono: solo dígitos, espacios, guiones, paréntesis y un "+" inicial; 8 a 15 dígitos. null si no sirve. */
export function cleanPhone(value) {
  const v = cleanVisitorText(value, LEAD_LIMITS.phone);
  if (!v || !/^\+?[\d\s\-()]+$/.test(v)) return null;
  const digits = v.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15 ? v : null;
}

export function cleanEmail(value) {
  const v = cleanVisitorText(value, LEAD_LIMITS.email)?.toLowerCase() ?? null;
  return v && /^[^\s@<>()"',;:]+@[^\s@<>()"',;:]+\.[a-z]{2,}$/i.test(v) ? v : null;
}

/** Número para wa.me: 8 dígitos de Costa Rica reciben el 506. */
export function whatsappNumber(phone) {
  const digits = String(phone ?? '').replace(/\D/g, '');
  if (digits.length === 8) return `506${digits}`;
  return digits.length >= 10 && digits.length <= 15 ? digits : null;
}

const SUSPICIOUS = [
  /ignor(?:e|a|á|ar|ing)?(?![a-z]).{0,40}?(instruc|previous|anterior|prompt|regla)/i,
  /\b(system|sistema)\s*prompt\b/i,
  /\byou are (now )?(an?|the) (ai|assistant|model)\b/i,
  /\b(act|actu[aá]) (as|como)\b.{0,30}\b(ai|ia|assistant|asistente|model|modelo|admin)/i,
  /<\s*\/?\s*(script|iframe|img|svg|a|style)\b/i,
  /\bjavascript:/i,
  /\b(viagra|casino|crypto|bitcoin|forex|loan offer|seo services)\b/i,
  /https?:\/\//i,
];

/** Motivos para que el equipo revise la consulta antes de confiar en ella (spam, enlaces o texto dirigido a una IA). */
export function leadFlags({ name, message }) {
  const text = `${name ?? ''}\n${message ?? ''}`;
  const flags = [];
  if (SUSPICIOUS.slice(0, 4).some((re) => re.test(text))) flags.push('instrucciones');
  if (SUSPICIOUS.slice(4, 6).some((re) => re.test(text))) flags.push('codigo');
  if (SUSPICIOUS[6].test(text)) flags.push('spam');
  if (SUSPICIOUS[7].test(text)) flags.push('enlace');
  return flags;
}

export const LEAD_FLAG_LABELS = {
  instrucciones: 'Texto que parece instrucciones para una IA',
  codigo: 'Contiene código o etiquetas HTML',
  spam: 'Palabras típicas de spam',
  enlace: 'Incluye enlaces',
};

/** Fuente del tráfico normalizada: utm_source o, si no hay, el sitio de referencia. */
export function trafficSource({ source, referrer }) {
  const s = String(source ?? '').toLowerCase();
  const r = String(referrer ?? '').toLowerCase();
  const pick = s || r;
  if (!pick) return 'directo';
  if (/google|gclid|gbraid|wbraid/.test(pick)) return 'google';
  if (/facebook|instagram|fb\b|ig\b|meta|fbclid/.test(pick)) return 'meta';
  if (/chatgpt|openai/.test(pick)) return 'chatgpt';
  if (/bing|yahoo|duckduckgo|ecosia/.test(pick)) return 'otros buscadores';
  if (/linkedin|tiktok|twitter|x\.com|youtube|whatsapp/.test(pick)) return 'otras redes';
  if (/jcanalytic/.test(pick)) return 'directo';
  return s ? s.slice(0, 40) : 'otros sitios';
}
