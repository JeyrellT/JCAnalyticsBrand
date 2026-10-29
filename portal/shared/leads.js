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
  // Juego de caracteres estricto: sin ? & = % ni espacios, para que nunca agregue parámetros a un mailto:.
  return v && /^[a-z0-9._+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i.test(v) ? v : null;
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

// ── Rutas del sitio ─────────────────────────────────────────────────────────

/** Ruta del sitio tal como la manda el navegador: sin query, sin hash, solo caracteres de URL. */
export const SITE_PATH_RE = /^\/[\w\-./~%]*$/;
export const isSitePath = (value) => typeof value === 'string' && value.length <= 160 && SITE_PATH_RE.test(value);

/** Nombre legible de una página del sitio para tablas y recomendaciones. */
export function pageLabel(path) {
  if (!path || path === '/') return 'Portada';
  let p = path;
  let prefix = '';
  if (p === '/en/' || p === '/en') return 'EN · Portada';
  if (p.startsWith('/en/')) { prefix = 'EN · '; p = p.slice(3); }
  const parts = p.split('/').filter(Boolean);
  const words = (slug) => slug.replace(/-/g, ' ');
  if (parts[0] === 'servicios' || parts[0] === 'services') return `${prefix}${parts[1] ? `Servicio · ${words(parts[1])}` : 'Servicios'}`;
  if (parts[0] === 'ideas' || parts[0] === 'insights') return `${prefix}${parts[1] ? `Idea · ${words(parts[1])}` : 'Ideas'}`;
  return `${prefix}${p}`;
}

// ── Veredicto por página ────────────────────────────────────────────────────

/** Umbrales del veredicto por página. Debajo de `min_sessions` no se opina. */
export const PAGE_THRESHOLDS = {
  min_sessions: 10,
  engage_ms: 60_000,        // "Engancha": un minuto leyendo…
  engage_cta_rate: 0.08,    // …y más del 8 % toca un CTA
  busy_share: 0.15,         // "Mucho tráfico, poca acción": al menos 15 % de las visitas…
  busy_cta_rate: 0.03,      // …y menos del 3 % toca un CTA
  bounce_ms: 10_000,        // "Rebote": menos de 10 s leyendo…
  bounce_scroll50: 0.25,    // …y menos del 25 % baja a la mitad
};

export const PAGE_VERDICTS = {
  engancha: { label: 'Engancha', tone: 'teal', hint: 'Se lee más de un minuto y más del 8 % toca un CTA. Conviene traerle más visitas.' },
  mucho_trafico_poca_accion: { label: 'Mucho tráfico, poca acción', tone: 'amber', hint: 'Recibe muchas visitas y menos del 3 % toca un CTA. Revisar el llamado a la acción y que el precio esté a la vista.' },
  rebote: { label: 'Rebote', tone: 'red', hint: 'Menos de 10 s leyendo y pocos bajan a la mitad. Revisar el titular, la velocidad y que el anuncio prometa lo que la página muestra.' },
  poca_muestra: { label: 'Pocos datos', tone: 'slate', hint: 'Menos de 10 visitas en el periodo: todavía no se puede concluir nada.' },
  ok: { label: 'Normal', tone: 'blue', hint: 'Sin señales fuertes en ningún sentido.' },
};

/** Veredicto de una página según sus cifras del periodo y las visitas totales del sitio. */
export function pageVerdict({ sessions = 0, avg_engaged_ms = 0, cta_rate = 0, scroll50_rate = 0 }, totalSessions = 0) {
  const T = PAGE_THRESHOLDS;
  if (sessions < T.min_sessions) return 'poca_muestra';
  if (avg_engaged_ms >= T.engage_ms && cta_rate >= T.engage_cta_rate) return 'engancha';
  if (sessions >= Math.max(T.min_sessions, T.busy_share * totalSessions) && cta_rate < T.busy_cta_rate) return 'mucho_trafico_poca_accion';
  if (avg_engaged_ms < T.bounce_ms && scroll50_rate < T.bounce_scroll50) return 'rebote';
  return 'ok';
}

// ── Recomendaciones ─────────────────────────────────────────────────────────

const pct = (v) => `${Math.round((v ?? 0) * 100)} %`;
const TONE_ORDER = { red: 0, amber: 1, blue: 2, teal: 3 };

/**
 * Reglas que convierten los agregados de /api/analytics en recomendaciones. Sin acceso a la base:
 * recibe los mismos objetos que devuelve la ruta (totals, previous, pages, devices, sources, sections,
 * forms, hours, leads_pipeline). Cada regla exige una muestra mínima; con pocos datos no opina.
 */
export function buildInsights(data = {}) {
  const { totals = {}, previous = null, pages = [], devices = [], sources = [], sections = [], forms = [], hours = null, leads_pipeline: pipeline = null } = data;
  const out = [];
  const add = (key, tone, title, detail, link) => out.push({ key, tone, title, detail, ...(link ? { link } : {}) });

  // Consultas sin respuesta: lo más urgente (prometemos responder en menos de 24 h).
  if (pipeline?.unattended_over_24h > 0) {
    const n = pipeline.unattended_over_24h;
    add('leads_unattended', 'red', `${n} ${n === 1 ? 'consulta lleva' : 'consultas llevan'} más de 24 h sin respuesta`,
      'Respondé o asigná un responsable. Cada hora que pasa baja la probabilidad de cerrar.', '/consultas?status=nuevo');
  }

  // Tendencia de visitas (mínimo 20 visitas en el periodo anterior, cambio de al menos 20 %).
  if (previous && previous.sessions >= 20 && totals.sessions != null) {
    const change = (totals.sessions - previous.sessions) / previous.sessions;
    if (Math.abs(change) >= 0.2) {
      const up = change > 0;
      add('visits_trend', up ? 'teal' : 'amber', `Las visitas ${up ? 'subieron' : 'bajaron'} ${pct(Math.abs(change))} frente al periodo anterior`,
        up ? `${totals.sessions} visitas contra ${previous.sessions}. Revisá en “¿De dónde llegan?” qué fuente creció para sostenerla.`
          : `${totals.sessions} visitas contra ${previous.sessions}. Revisá si una campaña se detuvo o si una fuente dejó de traer gente.`);
    }
  }

  // Páginas con tráfico que no mueve a la acción.
  for (const page of pages.filter((p) => p.verdict === 'mucho_trafico_poca_accion').slice(0, 2)) {
    add(`page_${page.path}`, 'amber', `${pageLabel(page.path)}: ${page.sessions} visitas y solo ${pct(page.cta_rate)} toca un CTA`,
      'Acercá el precio y el botón de WhatsApp al inicio de la página, y revisá que el titular prometa lo que la gente busca.');
  }

  // Brecha entre celular y escritorio (mínimo 30 visitas en cada uno).
  const dev = Object.fromEntries(devices.map((d) => [d.name, d]));
  const rate = (d) => (d && d.sessions ? d.cta_sessions / d.sessions : null);
  const mobile = dev.mobile;
  const desktop = dev.desktop;
  if (mobile && desktop && mobile.sessions >= 30 && desktop.sessions >= 30) {
    const rm = rate(mobile);
    const rd = rate(desktop);
    if (rd > 0 && rm < 0.5 * rd) add('device_mobile', 'amber', `En celular toca un CTA el ${pct(rm)}; en escritorio, el ${pct(rd)}`, 'Revisá los botones en el celular: tamaño, posición y que el precio se vea sin bajar.');
    else if (rm > 0 && rd < 0.5 * rm) add('device_desktop', 'blue', `En escritorio toca un CTA el ${pct(rd)}; en celular, el ${pct(rm)}`, 'La versión de escritorio convierte menos: revisá el primer pantallazo y el botón de WhatsApp arriba.');
  }

  // Fuentes que traen gente pero ninguna consulta (mínimo 25 visitas).
  for (const s of sources.filter((s) => s.sessions >= 25 && !s.leads && s.name !== 'sin dato').slice(0, 2)) {
    add(`source_${s.name}`, 'amber', `${s.name}: ${s.sessions} visitas y ninguna consulta`,
      ['google', 'meta', 'chatgpt'].includes(s.name) ? 'Revisá las palabras clave o la audiencia del anuncio y que la página de destino coincida con la promesa.' : 'Revisá qué página abren y si llegan al precio y al botón de WhatsApp.');
  }

  // Secciones que retienen pero pocas personas alcanzan (mínimo 10 visitas en la sección).
  const hidden = sections.filter((s) => s.sessions >= 10 && s.reach <= 0.3 && s.avg_ms >= 45_000).sort((a, b) => b.avg_ms - a.avg_ms)[0];
  if (hidden) add(`section_${hidden.section}`, 'blue', `La sección “${hidden.section}” retiene ${Math.round(hidden.avg_ms / 1000)} s, pero solo la ve el ${pct(hidden.reach)}`, 'Buen contenido escondido abajo: probá subirla en la página o enlazarla desde el inicio.');

  // Formularios que se abandonan (mínimo 10 inicios).
  for (const f of forms.filter((f) => f.starts >= 10 && f.submits / f.starts < 0.4).slice(0, 1)) {
    add(`form_${f.form}`, 'amber', `Formulario “${f.form}”: ${f.starts} lo empezaron y solo ${f.submits} lo enviaron`, 'Pedí menos datos o dejá claro qué pasa al enviar. Un botón de WhatsApp junto al formulario suele destrabar.');
  }

  // Horas pico (mínimo 50 visitas en el periodo): la ventana de 3 horas con más entradas.
  if (hours?.by_hour && (hours.total ?? 0) >= 50) {
    let best = { start: 0, n: -1 };
    for (let h = 0; h < 24; h += 1) {
      const n = hours.by_hour[h] + hours.by_hour[(h + 1) % 24] + hours.by_hour[(h + 2) % 24];
      if (n > best.n) best = { start: h, n };
    }
    const share = best.n / hours.total;
    if (share >= 0.25) add('peak_hours', 'blue', `El ${pct(share)} de las visitas entra entre las ${best.start} y las ${(best.start + 3) % 24} h`, 'Tené a alguien respondiendo WhatsApp en esa ventana y programá las publicaciones un poco antes.');
  }

  // Tasa de cierre (mínimo 5 consultas cerradas).
  if (pipeline && pipeline.won + pipeline.lost >= 5 && pipeline.win_rate != null) {
    const r = pipeline.win_rate;
    add('win_rate', r >= 0.3 ? 'teal' : 'amber', `Se cierra el ${pct(r)} de las consultas que llegan a una decisión`,
      r >= 0.3 ? `${pipeline.won} ganadas y ${pipeline.lost} perdidas en el periodo. Anotá en cada consulta qué la cerró para repetirlo.` : `${pipeline.won} ganadas y ${pipeline.lost} perdidas. Revisá las perdidas: precio, tiempos o seguimiento tardío.`);
  }

  return out.sort((a, b) => (TONE_ORDER[a.tone] ?? 9) - (TONE_ORDER[b.tone] ?? 9)).slice(0, 8);
}
