// ============================================================================
//  shared/brief.js
//  Brief creativo de JC Analytics (formato "CREATIVIDAD"): campos, reglas de
//  validación, flujo de estados y huella de cada versión. Lo usan el servidor
//  (valida y guarda), la interfaz del equipo, el portal de clientes y la vista
//  imprimible, así que un campo o una regla se cambia en un solo lugar.
//  Sin dependencias: corre en Node y en el navegador. Ver docs/v5-contrato.md.
// ============================================================================

// ── Vocabulario ─────────────────────────────────────────────────────────────

export const BRIEF_MATERIALS = {
  email: 'Email marketing',
  redes_post: 'Redes: publicaciones',
  redes_historias: 'Redes: historias',
  reels_video: 'Reels / video',
  pauta_meta: 'Pauta Meta Ads',
  pauta_google: 'Pauta Google Ads',
  landing: 'Landing / sitio web',
  whatsapp: 'WhatsApp (difusión)',
  impreso: 'Impreso / punto de venta',
  otro: 'Otro',
};

export const BRIEF_OBJECTIVES = {
  conversion: { label: 'Conversión', hint: 'Ventas, pedidos o reservas inmediatas.' },
  leads: { label: 'Prospectos', hint: 'Datos de contacto, cotizaciones o citas.' },
  trafico: { label: 'Tráfico', hint: 'Visitas a la web, al WhatsApp o a la tienda.' },
  alcance: { label: 'Alcance y reconocimiento', hint: 'Que más personas conozcan la marca o la promoción.' },
  engagement: { label: 'Interacción', hint: 'Comentarios, compartidos y participación.' },
  lanzamiento: { label: 'Lanzamiento', hint: 'Producto, sucursal o servicio nuevo.' },
  retencion: { label: 'Fidelización', hint: 'Que los clientes actuales vuelvan a comprar.' },
};

/** Objetivos que exigen al menos una URL de redireccionamiento. */
export const OBJECTIVES_NEED_LINK = ['conversion', 'trafico', 'leads'];

export const BRIEF_EDITABLE = {
  template: 'Template editable',
  pieza_final: 'Pieza final cerrada',
  ambos: 'Template y pieza final',
};

export const BRIEF_TONES = {
  urgente: 'Promocional / urgencia',
  cercano: 'Cercano',
  divertido: 'Divertido',
  premium: 'Premium',
  institucional: 'Institucional',
};

export const BRIEF_STATUS = {
  borrador: { label: 'Borrador', tone: 'slate', hint: 'Se está completando. Nadie lo revisa todavía.' },
  enviado: { label: 'Enviado', tone: 'blue', hint: 'Recibido por JC Analytics. En revisión.' },
  observado: { label: 'Con observaciones', tone: 'amber', hint: 'JC Analytics pidió ajustes antes de aprobar.' },
  aprobado: { label: 'Aprobado', tone: 'teal', hint: 'Alcance aprobado. La versión queda congelada.' },
  en_produccion: { label: 'En producción', tone: 'violet', hint: 'El equipo está creando las piezas.' },
  entregado: { label: 'Entregado', tone: 'teal', hint: 'Piezas entregadas para revisión del cliente.' },
  cerrado: { label: 'Cerrado', tone: 'ink', hint: 'Requerimiento finalizado.' },
  cancelado: { label: 'Cancelado', tone: 'red', hint: 'No se va a producir.' },
};

/** Camino feliz, para la línea de etapas. */
export const BRIEF_FLOW = ['borrador', 'enviado', 'aprobado', 'en_produccion', 'entregado', 'cerrado'];
/** Solo en estos estados se puede editar el contenido (el resto queda congelado por versión). */
export const BRIEF_EDITABLE_STATUSES = ['borrador', 'observado'];
/** Estados terminales: ya no admiten cambios ni comentarios. */
export const BRIEF_FINAL_STATUSES = ['cerrado', 'cancelado'];
/** El cliente puede retirar su solicitud mientras no esté aprobada. */
export const BRIEF_CLIENT_CANCELABLE = ['borrador', 'enviado', 'observado'];

/**
 * Transiciones que hace el equipo con POST /api/briefs/:id/transition.
 * El envío (borrador/observado → enviado) va por /submit porque congela una versión.
 */
export const BRIEF_TEAM_TRANSITIONS = {
  borrador: ['cancelado'],
  enviado: ['observado', 'aprobado', 'cancelado'],
  observado: ['cancelado'],
  aprobado: ['en_produccion', 'observado', 'cancelado'],
  en_produccion: ['entregado', 'cancelado'],
  entregado: ['cerrado', 'en_produccion'],
  cerrado: [],
  cancelado: [],
};

/** Botón de la interfaz para cada transición del equipo. */
export const BRIEF_ACTIONS = {
  observado: { label: 'Pedir ajustes', tone: 'amber' },
  aprobado: { label: 'Aprobar brief', tone: 'teal' },
  en_produccion: { label: 'Pasar a producción', tone: 'violet' },
  entregado: { label: 'Marcar entregado', tone: 'teal' },
  cerrado: { label: 'Cerrar requerimiento', tone: 'ink' },
  cancelado: { label: 'Cancelar', tone: 'red' },
};

/** ¿La transición exige una nota (motivo)? Pedir ajustes, cancelar y reabrir producción, sí. */
export const transitionNeedsNote = (from, to) => to === 'observado' || to === 'cancelado' || (from === 'entregado' && to === 'en_produccion');

export const BRIEF_EVENT_KINDS = {
  creado: 'Creado',
  enviado: 'Enviado',
  estado: 'Cambio de estado',
  comentario: 'Comentario',
  nota_interna: 'Nota interna',
};

// ── Campos (en el orden del formato CREATIVIDAD) ────────────────────────────
//  type: text · textarea · select · multi · bool · email · url · date · links
//  required: obligatorio para ENVIAR (un borrador se guarda incompleto).
//  when(data): el campo solo aplica si devuelve true; si no, se guarda vacío.

const hasMaterial = (d, key) => Array.isArray(d.materials) && d.materials.includes(key);

export const BRIEF_SECTIONS = [
  {
    key: 'requerimiento',
    title: 'Requerimiento',
    hint: 'Qué se necesita, para qué marca y con qué objetivo.',
    fields: [
      { key: 'brand', label: 'Marca o cliente que hará parte del requerimiento', type: 'text', max: 120, required: true, placeholder: 'Ej.: La Burrada' },
      { key: 'materials', label: 'Material requerido', type: 'multi', options: BRIEF_MATERIALS, required: true, hint: 'Marcá todo lo que se necesita producir.' },
      { key: 'materials_other', label: 'Otro material', type: 'text', max: 200, when: (d) => hasMaterial(d, 'otro'), placeholder: 'Describí el material' },
      { key: 'objective', label: 'Objetivo del requerimiento', type: 'select', options: BRIEF_OBJECTIVES, required: true },
      { key: 'kpi_target', label: 'Meta medible', type: 'text', max: 200, placeholder: 'Ej.: 150 pedidos por WhatsApp durante la promoción' },
    ],
  },
  {
    key: 'oferta',
    title: 'Oferta y mensaje',
    hint: 'Lo que la pieza tiene que comunicar.',
    fields: [
      { key: 'offer', label: 'Oferta / beneficio a destacar', type: 'textarea', max: 1000, required: true, placeholder: 'Ej.: Giveaway de tacos y 2×1 los martes' },
      { key: 'key_message', label: 'Mensaje clave', type: 'textarea', min: 20, max: 3000, required: true, placeholder: 'Qué tiene que entender y hacer la persona al ver la pieza.' },
      { key: 'cta', label: 'Llamado a la acción (CTA)', type: 'text', max: 120, placeholder: 'Ej.: Pedí ya por WhatsApp' },
      { key: 'tone', label: 'Tono', type: 'select', options: BRIEF_TONES },
    ],
  },
  {
    key: 'canales',
    title: 'Canales y audiencia',
    hint: 'Dónde sale y a quién le llega.',
    fields: [
      { key: 'social_accounts', label: 'RRSS', type: 'textarea', max: 500, placeholder: 'Cuentas y nombre de la campaña. Ej.: La Burrada · GIVEAWAY TACOS' },
      { key: 'database_segment', label: 'Base de datos', type: 'textarea', max: 1500, placeholder: 'Segmentación, exclusiones y enfoque de los asuntos (subject lines).' },
      { key: 'links', label: 'URL de redireccionamiento', type: 'links', max: 3, hint: 'Hasta 3 destinos (WhatsApp, Facebook, sitio web…).' },
    ],
  },
  {
    key: 'produccion',
    title: 'Producción y envío',
    hint: 'Qué entrega JC Analytics y cuándo sale.',
    fields: [
      { key: 'includes_creative', label: 'Creatividad: JC Analytics diseña las piezas', type: 'bool' },
      { key: 'editable_format', label: 'Editable', type: 'select', options: BRIEF_EDITABLE },
      { key: 'send_setup', label: 'Configuración de envío a cargo de JC Analytics', type: 'bool' },
      { key: 'test_email', label: 'Correo de testeo', type: 'email', when: (d) => hasMaterial(d, 'email'), placeholder: 'pruebas@tuempresa.com', hint: 'Recibe las pruebas antes del envío real.' },
      { key: 'send_start', label: 'Fecha de envío: desde', type: 'date', required: true },
      { key: 'send_end', label: 'Fecha de envío: hasta', type: 'date' },
    ],
  },
  {
    key: 'marca',
    title: 'Marca y legal',
    hint: 'Lineamientos gráficos y textos legales.',
    fields: [
      { key: 'graphic_line', label: 'Línea gráfica', type: 'textarea', max: 1500, placeholder: 'Colores, tipografías, estilo de fotos o referencias.' },
      { key: 'brand_guide_url', label: 'Manual de marca o carpeta de recursos', type: 'url', placeholder: 'https://…' },
      { key: 'is_contest', label: 'Incluye sorteo, giveaway o concurso', type: 'bool' },
      { key: 'promo_rules_url', label: 'Reglamento o bases de la promoción', type: 'url', when: (d) => d.is_contest === true, placeholder: 'https://…' },
      { key: 'disclaimer', label: 'Disclaimer', type: 'textarea', max: 2000, placeholder: 'Ej.: Válido del 20 al 30 de octubre o hasta agotar existencias. Aplican restricciones.' },
      { key: 'notes', label: 'Nota', type: 'textarea', max: 2000 },
    ],
  },
  {
    key: 'confirmacion',
    title: 'Confirmación',
    hint: 'Requisito para enviar el brief.',
    fields: [
      {
        key: 'rights_confirmed',
        label: 'Confirmo que la información es correcta y que tenemos derecho de uso sobre marcas, logos, fotos y la promoción descrita.',
        type: 'bool',
        required: true,
      },
    ],
  },
];

export const BRIEF_FIELDS = Object.fromEntries(BRIEF_SECTIONS.flatMap((s) => s.fields.map((f) => [f.key, { ...f, section: s.key }])));

export const BRIEF_TITLE_MAX = 120;
export const MAX_LINKS = 3;
export const LINK_LABEL_MAX = 60;

// ── Validación de forma (siempre, también en borradores) ────────────────────

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanText(raw, f, errors) {
  if (raw == null || (typeof raw === 'string' && raw.trim() === '')) return null;
  if (typeof raw !== 'string') { errors.push({ field: f.key, message: 'Debe ser texto.' }); return null; }
  const v = raw.trim().replaceAll('\0', '');
  if (f.max && v.length > f.max) errors.push({ field: f.key, message: `Máximo ${f.max} caracteres.` });
  return v.slice(0, f.max ?? 2000);
}

export function cleanUrl(raw, field, errors) {
  if (raw == null || (typeof raw === 'string' && raw.trim() === '')) return null;
  if (typeof raw !== 'string' || raw.length > 500) { errors.push({ field, message: 'Enlace inválido (usar https://…).' }); return null; }
  try {
    const u = new URL(raw.trim());
    // Solo http(s): nada de javascript:, data: o file: en un enlace que otra persona va a abrir.
    if (!['http:', 'https:'].includes(u.protocol)) throw new Error('protocol');
    return u.toString();
  } catch {
    errors.push({ field, message: 'Enlace inválido (usar https://…).' });
    return null;
  }
}

function cleanDate(raw, field, errors) {
  if (raw == null || raw === '') return null;
  if (typeof raw !== 'string' || !DATE_RE.test(raw)) { errors.push({ field, message: 'Formato de fecha AAAA-MM-DD.' }); return null; }
  const d = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== raw) { errors.push({ field, message: 'Fecha inválida.' }); return null; }
  return raw;
}

const CLEANERS = {
  text: cleanText,
  textarea: cleanText,
  select(raw, f, errors) {
    if (raw == null || raw === '') return null;
    if (!Object.hasOwn(f.options, raw)) { errors.push({ field: f.key, message: 'Valor no permitido.' }); return null; }
    return raw;
  },
  multi(raw, f, errors) {
    if (raw == null) return [];
    if (!Array.isArray(raw) || raw.length > Object.keys(f.options).length) { errors.push({ field: f.key, message: 'Selección inválida.' }); return []; }
    const out = [];
    for (const v of raw) {
      if (typeof v !== 'string' || !Object.hasOwn(f.options, v)) { errors.push({ field: f.key, message: 'Valor no permitido.' }); return []; }
      if (!out.includes(v)) out.push(v);
    }
    // Orden canónico (el del catálogo): la misma selección produce la misma huella.
    return Object.keys(f.options).filter((k) => out.includes(k));
  },
  bool(raw, f, errors) {
    if (raw == null) return false;
    if (typeof raw !== 'boolean') { errors.push({ field: f.key, message: 'Debe ser sí o no.' }); return false; }
    return raw;
  },
  email(raw, f, errors) {
    if (raw == null || (typeof raw === 'string' && raw.trim() === '')) return null;
    const v = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
    if (!v || v.length > 160 || !EMAIL_RE.test(v)) { errors.push({ field: f.key, message: 'Correo inválido.' }); return null; }
    return v;
  },
  url: (raw, f, errors) => cleanUrl(raw, f.key, errors),
  date: (raw, f, errors) => cleanDate(raw, f.key, errors),
  links(raw, f, errors) {
    if (raw == null) return [];
    if (!Array.isArray(raw) || raw.length > MAX_LINKS) { errors.push({ field: f.key, message: `Hasta ${MAX_LINKS} enlaces.` }); return []; }
    const out = [];
    raw.forEach((item, i) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) { errors.push({ field: f.key, message: 'Enlace inválido.' }); return; }
      const label = cleanText(item.label, { key: f.key, max: LINK_LABEL_MAX }, errors);
      const href = cleanUrl(item.url, `${f.key}.${i}`, errors);
      if (!label && !href) return; // fila vacía del formulario
      if (!href) { if (item.url == null || item.url === '') errors.push({ field: `${f.key}.${i}`, message: 'Falta el enlace.' }); return; }
      out.push({ label: label ?? `Destino ${out.length + 1}`, url: href });
    });
    return out;
  },
};

/** Datos vacíos con la forma completa (lo que muestra un brief nuevo). */
export function emptyBriefData(overrides = {}) {
  const data = {};
  for (const f of Object.values(BRIEF_FIELDS)) {
    data[f.key] = f.type === 'multi' || f.type === 'links' ? [] : f.type === 'bool' ? false : null;
  }
  return { ...data, ...overrides };
}

/**
 * Limpia y valida la FORMA de los datos de un brief. Las claves desconocidas se
 * descartan y los campos que no aplican (when) quedan vacíos, así lo guardado
 * siempre tiene exactamente los campos del formato.
 * @returns {{ data: object, errors: {field: string, message: string}[] }}
 */
export function normalizeBriefData(input) {
  const errors = [];
  if (input == null) input = {};
  if (typeof input !== 'object' || Array.isArray(input)) return { data: emptyBriefData(), errors: [{ field: 'data', message: 'Formato inválido.' }] };
  const data = {};
  for (const f of Object.values(BRIEF_FIELDS)) data[f.key] = CLEANERS[f.type](input[f.key], f, errors);
  for (const f of Object.values(BRIEF_FIELDS)) {
    if (f.when && !f.when(data)) data[f.key] = f.type === 'multi' || f.type === 'links' ? [] : f.type === 'bool' ? false : null;
  }
  return { data, errors };
}

// ── Reglas para ENVIAR ──────────────────────────────────────────────────────

const isEmpty = (v) => v == null || v === false || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0);

/**
 * Lista de verificación para enviar el brief (obligatorios + reglas cruzadas).
 * @returns {{ field: string, ok: boolean, message: string }[]}
 */
export function briefChecklist(data, { title } = {}) {
  const d = data ?? {};
  const checks = [];
  const add = (field, ok, message) => checks.push({ field, ok: !!ok, message });
  if (title !== undefined) add('title', !isEmpty(title), 'Ponele un nombre al requerimiento.');
  for (const f of Object.values(BRIEF_FIELDS)) {
    if (!f.required) continue;
    if (f.key === 'rights_confirmed') continue; // va al final
    const v = d[f.key];
    const ok = !isEmpty(v) && !(f.min && typeof v === 'string' && v.length < f.min);
    add(f.key, ok, f.min ? `${f.label}: mínimo ${f.min} caracteres.` : `${f.label}: requerido.`);
  }
  if (hasMaterial(d, 'otro')) add('materials_other', !isEmpty(d.materials_other), 'Describí el "otro" material requerido.');
  if (hasMaterial(d, 'email') && d.send_setup) add('test_email', !isEmpty(d.test_email), 'Con envío de email a cargo de JC hace falta un correo de testeo.');
  if (OBJECTIVES_NEED_LINK.includes(d.objective)) {
    add('links', Array.isArray(d.links) && d.links.length > 0, `Un objetivo de ${BRIEF_OBJECTIVES[d.objective].label.toLowerCase()} necesita al menos una URL de redireccionamiento.`);
  }
  if (d.send_start && d.send_end) add('send_end', d.send_end >= d.send_start, 'La fecha final no puede ser anterior a la inicial.');
  if (d.is_contest) {
    add('promo_rules_url', !isEmpty(d.promo_rules_url) || (typeof d.disclaimer === 'string' && d.disclaimer.trim().length >= 20),
      'Un sorteo o giveaway necesita el reglamento (enlace) o un disclaimer con las condiciones.');
  }
  add('rights_confirmed', d.rights_confirmed === true, 'Falta la confirmación de datos y derechos de uso.');
  return checks;
}

/** Problemas que impiden enviar (vacío = listo). */
export const briefProblems = (data, opts) => briefChecklist(data, opts).filter((c) => !c.ok);

/** Avance del formulario: { done, total, pct } sobre la lista de verificación. */
export function briefCompleteness(data, opts) {
  const checks = briefChecklist(data, opts);
  const done = checks.filter((c) => c.ok).length;
  return { done, total: checks.length, pct: checks.length ? Math.round((done / checks.length) * 100) : 0 };
}

const addDays = (isoDate, days) => new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

/**
 * Plazo mínimo de producción: el envío no puede arrancar antes de hoy + N días
 * naturales, salvo que el equipo marque el brief urgente con un motivo.
 * @returns {string|null} mensaje del problema o null
 */
export function leadTimeProblem(data, { today, leadDays, urgent = false }) {
  if (!data?.send_start) return null;
  // Una fecha pasada nunca se acepta, ni siquiera como urgente.
  if (data.send_start < today) return 'La fecha de envío ya pasó.';
  if (urgent) return null;
  const earliest = addDays(today, leadDays);
  if (data.send_start < earliest) return `Necesitamos al menos ${leadDays} días de producción: la fecha más próxima es ${earliest}. Si es urgente, coordiná con tu ejecutivo.`;
  return null;
}

/** Fecha más próxima permitida para el envío. */
export const earliestSendDate = (today, leadDays) => addDays(today, leadDays);

// ── Huella de versión ───────────────────────────────────────────────────────

/** JSON con claves ordenadas: el mismo contenido produce siempre el mismo texto (y la misma huella). */
export function canonicalJson(value) {
  if (value === undefined) return 'null';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(',')}}`;
}

/** Texto que se firma en cada versión enviada (code + versión + título + datos). */
export const versionPayload = ({ code, version, title, data }) => canonicalJson({ code, version, title, data });

/** Valor de un campo listo para mostrar (vista, impresión y bitácora). */
export function briefFieldText(field, value) {
  const f = typeof field === 'string' ? BRIEF_FIELDS[field] : field;
  if (!f) return '';
  if (value == null || value === '' || (Array.isArray(value) && !value.length)) return '';
  switch (f.type) {
    case 'bool': return value ? 'Sí' : 'No';
    case 'select': return typeof f.options[value] === 'string' ? f.options[value] : f.options[value]?.label ?? String(value);
    case 'multi': return value.map((k) => f.options[k] ?? k).join(' · ');
    case 'links': return value.map((l) => `${l.label}: ${l.url}`).join('\n');
    default: return String(value);
  }
}
