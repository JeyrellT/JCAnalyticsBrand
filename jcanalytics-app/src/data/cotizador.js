// ============================================================================
//  src/data/cotizador.js
//  COTIZADOR · modelo simple por banda de precio · JC Analytics
//  Precios REALES del dueño (ago-26): entrada accesible por servicio —
//  Excel $30 · documentos $40 · tesis/proyectos $50 · Alteryx/KNIME $65 ·
//  Power Platform $85 · Power BI $125 · web con reservas $900 ·
//  software a la medida $2.000. Tope global $6.000 (USD).
//  Servicios con unidad propia (sep-26): edición de video $45 por pieza y
//  community manager $150 por mes (plan recurrente, `unit: 'mes'`). Sus
//  bandas son de referencia: ajustar aquí si el dueño fija otra tarifa.
//  Cada servicio tiene su sub-banda [priceMin, priceMax]; tamaño y complejidad
//  interpolan dentro de ella. El extremo bajo NUNCA baja del "desde" publicado.
//  El cliente ve SOLO el rango (USD/su moneda) + ventana de entrega.
// ============================================================================

import { t } from '../i18n/locale';

export const CONFIG = {
  PRICE_MIN: 30,         // piso absoluto (Excel puntual)
  PRICE_MAX: 6000,       // techo absoluto
  RANGE_LOW: 0.92,       // extremo bajo del rango = medio * 0.92
  RANGE_HIGH: 1.10,      // extremo alto = medio * 1.10
  SIZE_WEIGHT: 0.55,     // peso del "tamaño" en el score (0..1)
  CX_WEIGHT: 0.45,       // peso de la "complejidad" en el score
  BACKLOG_WEEKS: 0.5,    // cola de arranque sumada a la entrega
  URGENCY: {
    tranquila: { price: 1.0,  speed: 1.0 },
    normal:    { price: 1.0,  speed: 1.0 },
    urgente:   { price: 1.15, speed: 0.6 }, // sube precio, comprime calendario
  },
};

// Tamaño del proyecto (4 paradas) → valor 0..1
export const SIZE_UI = [
  { idx: 0, val: 0.0,  label: t('Puntual', 'Focused'),  hint: t('algo concreto y acotado', 'a specific, clearly defined task') },
  { idx: 1, val: 0.4,  label: t('Estándar', 'Standard'), hint: t('alcance típico', 'a typical project scope') },
  { idx: 2, val: 0.75, label: t('Grande', 'Large'),   hint: t('varias piezas o fuentes', 'multiple components or data sources') },
  { idx: 3, val: 1.0,  label: t('Completo', 'Complete'), hint: t('solución integral', 'a comprehensive solution') },
];

// Complejidad visible (3 niveles) → score 0..1
export const COMPLEXITY_UI = [
  { id: 'estandar',   label: t('Estándar', 'Standard'),   score: 0.0, dot: 'emerald', sub: t('Directo sobre datos existentes.', 'Straightforward work with existing data.') },
  { id: 'con_reglas', label: t('Con reglas', 'With rules'), score: 0.5, dot: 'amber',   sub: t('Lógica, validaciones, seguridad por rol.', 'Business logic, validation and role-based security.') },
  { id: 'avanzada',   label: t('Avanzada', 'Advanced'),   score: 1.0, dot: 'red',     sub: t('Multi-sistema, lógica y validación pesada.', 'Multiple systems, complex logic and extensive validation.') },
];

export const URGENCY_UI = [
  { id: 'tranquila', label: t('Sin prisa', 'Flexible'),     dot: 'emerald' },
  { id: 'normal',    label: t('Normal', 'Standard'),        dot: 'blue', preferred: true },
  { id: 'urgente',   label: t('Urgente / ya', 'Urgent / ASAP'),  dot: 'amber' },
];

// ============================================================================
//  SERVICES · 8 líneas. Cada una con su sub-banda de precio [priceMin, priceMax]
//  dentro de [500, 6000], y su rango de semanas. bullets = "qué incluye".
// ============================================================================

export const SERVICES = {
  excel_vba: {
    label: 'Excel / VBA', icon: 'Layers', accent: 'amber',
    micro: t('Macros y reportes que se llenan solos. Desde $30.', 'Macros and reports that update themselves. From $30.'),
    priceMin: 30, priceMax: 400, weeksMin: 0.5, weeksMax: 3,
    bullets: t(['Automatización de macros y reportes', 'Compatibilidad entre versiones de Office', 'Plantilla reutilizable + instrucciones'], ['Macro and report automation', 'Compatibility across Office versions', 'Reusable template + instructions']),
  },
  doc_generation: {
    label: t('Generación de documentos', 'Document generation'), icon: 'Settings', accent: 'orange',
    micro: t('Facturas, actas y PPTX en lote desde tus datos. Desde $40.', 'Generate invoices, meeting minutes and PowerPoint files in batches from your data. From $40.'),
    priceMin: 40, priceMax: 500, weeksMin: 0.5, weeksMax: 3,
    bullets: t(['Plantillas con tu marca', 'Generación automática desde tus datos', 'Listo para imprimir o enviar'], ['Templates with your branding', 'Automatic generation from your data', 'Ready to print or send']),
  },
  analisis_tfg: {
    label: t('Tesis y proyectos', 'Theses and projects'), icon: 'Lightbulb', accent: 'green',
    micro: t('Análisis de datos para tesis, TFG y proyectos. Desde $50, sube según dificultad.', 'Data analysis for theses, capstones and research projects. From $50, depending on complexity.'),
    priceMin: 50, priceMax: 650, weeksMin: 0.5, weeksMax: 4,
    bullets: t(['Limpieza y orden de tus datos', 'Preguntas de investigación respondidas', 'Informe de hallazgos + recomendaciones'], ['Clean and organize your data', 'Answers to your research questions', 'Findings report + recommendations']),
  },
  alteryx_knime: {
    label: 'Alteryx / KNIME', icon: 'Database', accent: 'cyan',
    micro: t('Flujos de datos y conciliaciones sin código. Desde $65.', 'No-code data workflows and reconciliations. From $65.'),
    priceMin: 65, priceMax: 900, weeksMin: 1, weeksMax: 5,
    bullets: t(['Cruces y joins entre datasets', 'Reglas de tolerancia y conciliación', 'Workflow documentado y reejecutable'], ['Match and join datasets', 'Tolerance and reconciliation rules', 'Documented, repeatable workflow']),
  },
  power_automate: {
    label: 'Power Platform', icon: 'Zap', accent: 'emerald',
    micro: t('Power Automate, Apps y SharePoint: flujos que trabajan solos 24/7. Desde $85.', 'Power Automate, Apps and SharePoint: workflows that run around the clock. From $85.'),
    priceMin: 85, priceMax: 1200, weeksMin: 1, weeksMax: 6,
    bullets: t(['Flujos automáticos entre sistemas', 'Aprobaciones y lógica condicional', 'Manejo de errores + documentación'], ['Automated workflows across systems', 'Approvals and conditional logic', 'Error handling + documentation']),
  },
  power_bi: {
    label: t('Dashboard Power BI', 'Power BI dashboard'), icon: 'BarChart3', accent: 'blue',
    micro: t('Reportes vivos conectados a tus datos. Desde $125.', 'Live reports connected to your data. From $125.'),
    priceMin: 125, priceMax: 1500, weeksMin: 1, weeksMax: 6,
    bullets: t(['Conexión a tus fuentes de datos', 'Modelo de datos + medidas DAX', 'Publicación y acceso por rol (RLS)'], ['Connect your data sources', 'Data model + DAX measures', 'Publishing and role-based access (RLS)']),
  },
  fiscal_planilla: {
    label: t('Fiscal y planilla CR', 'Costa Rica tax & payroll'), icon: 'Receipt', accent: 'cyan',
    micro: t('Factura electrónica v4.4, CCSS y planilla — validado para Costa Rica.', 'Electronic invoicing v4.4, CCSS and payroll — validated for Costa Rica.'),
    priceMin: 150, priceMax: 2500, weeksMin: 2, weeksMax: 7,
    bullets: t(['Factura electrónica v4.4 + rechazos de Hacienda', 'Cálculo de CCSS y cierre de planilla', 'Validado contra la normativa tributaria CR'], ['Electronic invoicing v4.4 + Hacienda rejection handling', 'CCSS calculations and payroll closing', 'Validated against Costa Rican tax regulations']),
  },
  video_edicion: {
    label: t('Edición de video', 'Video editing'), icon: 'Clapperboard', accent: 'pink',
    micro: t('Reels, anuncios y videos cortos editados con tu marca. Desde $45 por pieza.', 'Reels, ads and short videos edited with your branding. From $45 per video.'),
    priceMin: 45, priceMax: 600, weeksMin: 0.5, weeksMax: 2,
    unit: 'pieza',
    bullets: t(['Corte, ritmo y subtítulos con tu marca', 'Música, voz y llamado a la acción', 'Formatos para Reels, TikTok, YouTube y anuncios'], ['Editing, pacing and branded subtitles', 'Music, voice and call to action', 'Formats for Reels, TikTok, YouTube and ads']),
  },
  community_manager: {
    label: 'Community manager', icon: 'Megaphone', accent: 'orange',
    micro: t('Plan mensual: contenido, publicación, atención a clientes y Meta Ads. Desde $150 al mes.', 'Monthly plan: content, publishing, customer engagement and Meta Ads. From $150 per month.'),
    priceMin: 150, priceMax: 900, weeksMin: 1, weeksMax: 2,
    unit: 'mes',
    bullets: t(['Calendario y diseño de contenido con tu marca', 'Publicación, respuesta a mensajes y comentarios', 'Campañas en Meta Ads con reporte mensual'], ['Content calendar and branded design', 'Publishing and replies to messages and comments', 'Meta Ads campaigns with monthly reporting']),
  },
  pagina_web: {
    label: t('Web y plataforma a medida', 'Custom website & platform'), icon: 'Globe', accent: 'violet',
    micro: t('Tu marca en línea, con gestión adaptada a tu negocio según alcance. Desde $900.', 'Your brand online, with management tools tailored to the agreed scope. From $900.'),
    priceMin: 900, priceMax: 3200, weeksMin: 2, weeksMax: 6,
    bullets: t(['Web responsive con diseño propio y catálogo de servicios', 'Backend y panel de gestión según alcance acordado', 'Módulos de reservas, inventario, pedidos o procesos según alcance', 'Publicación con tu dominio'], ['Responsive website with custom design and service catalog', 'Backend and management dashboard for the agreed scope', 'Booking, inventory, order or process modules as agreed', 'Launch on your domain']),
  },
  python_pipeline: {
    label: t('Pipeline Python', 'Python pipeline'), icon: 'Cpu', accent: 'purple',
    micro: t('ETL programado, desplegado y monitoreado.', 'Scheduled, deployed and monitored ETL.'),
    priceMin: 1200, priceMax: 5200, weeksMin: 2, weeksMax: 8,
    bullets: t(['Ingesta y transformación de datos', 'Programación / despliegue automático', 'Logs, alertas y manejo de errores'], ['Data ingestion and transformation', 'Automated scheduling / deployment', 'Logs, alerts and error handling']),
  },
  software_medida: {
    label: t('Software a la medida', 'Custom software'), icon: 'MonitorSmartphone', accent: 'red',
    micro: t('Datos, permisos y procesos en un sistema propio. A partir de $2.000.', 'Data, permissions and workflows in your own system. Starting at $2,000.'),
    priceMin: 2000, priceMax: 5600, weeksMin: 5, weeksMax: 14, isMajor: true,
    bullets: t(['Interfaz, backend y base de datos para tus procesos', 'Roles, permisos y bitácora según alcance', 'Integraciones con tus sistemas según alcance acordado', 'Despliegue + manual de uso'], ['Interface, backend and database for your workflows', 'Roles, permissions and audit logs as agreed', 'Integrations with your systems within the agreed scope', 'Deployment + user guide']),
  },
};

// Prioridad de negocio: sistemas, finanzas y datos; marketing como complemento.
export const SERVICE_ORDER = [
  'software_medida', 'pagina_web', 'fiscal_planilla', 'power_bi', 'python_pipeline',
  'alteryx_knime', 'power_automate', 'excel_vba', 'doc_generation', 'analisis_tfg',
  'community_manager', 'video_edicion',
];

// Garantías SIEMPRE presentes en "qué incluye"
export const GUARANTEE_BULLETS = t([
  'Avances cada 72 h, no al final',
  '30 días de soporte post-entrega',
  'Primera sesión de alcance sin costo',
], [
  'Progress updates every 72 hours, not just at the end',
  '30 days of support after delivery',
  'Free initial scoping consultation',
]);

// ============================================================================
//  estimate()  — devuelve rango USD + ventana de entrega
//  · Redondeo ADAPTIVO: $5 bajo $150, $10 bajo $400, $25 bajo $1.500, $50 arriba
//    (con un piso de $30 el redondeo fijo de $50 aplastaría los precios chicos).
//  · El extremo bajo se ancla al priceMin del servicio: el rango nunca muestra
//    menos que el "desde" publicado.
// ============================================================================

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const floorHalf = (n) => Math.floor(n * 2) / 2;
const ceilHalf = (n) => Math.ceil(n * 2) / 2;

// Paso de redondeo según magnitud del monto
const roundStep = (v) => (v < 150 ? 5 : v < 400 ? 10 : v < 1500 ? 25 : 50);
const roundAdaptive = (v) => Math.round(v / roundStep(v)) * roundStep(v);

/**
 * @param {Object} input { service, size (0..1), complexityScore (0..1), urgency }
 * @returns {Object|null}
 */
export function estimate(input) {
  const s = SERVICES[input.service];
  if (!s) return null;
  const cfg = CONFIG;
  const urg = cfg.URGENCY[input.urgency] ?? cfg.URGENCY.normal;
  const size = clamp(input.size ?? 0, 0, 1);
  const cx = clamp(input.complexityScore ?? 0, 0, 1);

  // Score combinado 0..1 → posición dentro de la sub-banda del servicio
  const score = clamp(cfg.SIZE_WEIGHT * size + cfg.CX_WEIGHT * cx, 0, 1);
  const mid = (s.priceMin + score * (s.priceMax - s.priceMin)) * urg.price;

  const low = clamp(roundAdaptive(mid * cfg.RANGE_LOW), s.priceMin, cfg.PRICE_MAX);
  const high = clamp(roundAdaptive(mid * cfg.RANGE_HIGH), low, cfg.PRICE_MAX);

  // Ventana de entrega (semanas)
  const wMid = s.weeksMin + score * (s.weeksMax - s.weeksMin);
  const wAdj = wMid * urg.speed + cfg.BACKLOG_WEEKS;
  const weeksLow = Math.max(1, floorHalf(wAdj * 0.85));
  const weeksHigh = Math.max(weeksLow, ceilHalf(wAdj * 1.15));

  const unit = s.unit ?? null; // 'mes' | 'pieza' | null (proyecto único)
  const weeksText = weeksLow === weeksHigh
    ? `${weeksHigh} ${t(weeksHigh === 1 ? 'semana' : 'semanas', weeksHigh === 1 ? 'week' : 'weeks')}`
    : `${weeksLow}–${weeksHigh} ${t('semanas', 'weeks')}`;

  return {
    investUSD: { low, high },
    unit,
    // Sufijo para mostrar junto al precio: "/mes", "/pieza" o nada.
    unitSuffix: unit ? `/${unit === 'mes' ? t('mes', 'month') : t('pieza', 'video')}` : '',
    delivery: {
      weeksLow, weeksHigh,
      // Para un plan mensual la ventana es el arranque, no la entrega.
      label: unit === 'mes' ? t('Arranque del plan', 'Plan setup') : t('Ventana de entrega', 'Delivery window'),
      display: weeksText,
    },
    _internal: { score, mid },
  };
}
