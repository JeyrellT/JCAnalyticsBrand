// ============================================================================
//  src/data/cotizador.js
//  COTIZADOR · modelo simple por banda de precio · JC Analytics
//  Precios REALES del dueño (ago-26): entrada accesible por servicio —
//  Excel $30 · documentos $40 · tesis/proyectos $50 · Alteryx/KNIME $65 ·
//  Power Platform $85 · Power BI $125 · web con reservas $900 ·
//  software a la medida $2.000. Tope global $6.000 (USD).
//  Cada servicio tiene su sub-banda [priceMin, priceMax]; tamaño y complejidad
//  interpolan dentro de ella. El extremo bajo NUNCA baja del "desde" publicado.
//  El cliente ve SOLO el rango (USD/su moneda) + ventana de entrega.
// ============================================================================

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
  { idx: 0, val: 0.0,  label: 'Puntual',  hint: 'algo concreto y acotado' },
  { idx: 1, val: 0.4,  label: 'Estándar', hint: 'alcance típico' },
  { idx: 2, val: 0.75, label: 'Grande',   hint: 'varias piezas o fuentes' },
  { idx: 3, val: 1.0,  label: 'Completo', hint: 'solución integral' },
];

// Complejidad visible (3 niveles) → score 0..1
export const COMPLEXITY_UI = [
  { id: 'estandar',   label: 'Estándar',   score: 0.0, dot: 'emerald', sub: 'Directo sobre datos existentes.' },
  { id: 'con_reglas', label: 'Con reglas', score: 0.5, dot: 'amber',   sub: 'Lógica, validaciones, seguridad por rol.' },
  { id: 'avanzada',   label: 'Avanzada',   score: 1.0, dot: 'red',     sub: 'Multi-sistema, lógica y validación pesada.' },
];

export const URGENCY_UI = [
  { id: 'tranquila', label: 'Sin prisa',     dot: 'emerald' },
  { id: 'normal',    label: 'Normal',        dot: 'blue', preferred: true },
  { id: 'urgente',   label: 'Urgente / ya',  dot: 'amber' },
];

// ============================================================================
//  SERVICES · 8 líneas. Cada una con su sub-banda de precio [priceMin, priceMax]
//  dentro de [500, 6000], y su rango de semanas. bullets = "qué incluye".
// ============================================================================

export const SERVICES = {
  excel_vba: {
    label: 'Excel / VBA', icon: 'Layers', accent: 'amber',
    micro: 'Macros y reportes que se llenan solos. Desde $30.',
    priceMin: 30, priceMax: 400, weeksMin: 0.5, weeksMax: 3,
    bullets: ['Automatización de macros y reportes', 'Compatibilidad entre versiones de Office', 'Plantilla reutilizable + instrucciones'],
  },
  doc_generation: {
    label: 'Generación de documentos', icon: 'Settings', accent: 'orange',
    micro: 'Facturas, actas y PPTX en lote desde tus datos. Desde $40.',
    priceMin: 40, priceMax: 500, weeksMin: 0.5, weeksMax: 3,
    bullets: ['Plantillas con tu marca', 'Generación automática desde tus datos', 'Listo para imprimir o enviar'],
  },
  analisis_tfg: {
    label: 'Tesis y proyectos', icon: 'Lightbulb', accent: 'green',
    micro: 'Análisis de datos para tesis, TFG y proyectos. Desde $50, sube según dificultad.',
    priceMin: 50, priceMax: 650, weeksMin: 0.5, weeksMax: 4,
    bullets: ['Limpieza y orden de tus datos', 'Preguntas de investigación respondidas', 'Informe de hallazgos + recomendaciones'],
  },
  alteryx_knime: {
    label: 'Alteryx / KNIME', icon: 'Database', accent: 'cyan',
    micro: 'Flujos de datos y conciliaciones sin código. Desde $65.',
    priceMin: 65, priceMax: 900, weeksMin: 1, weeksMax: 5,
    bullets: ['Cruces y joins entre datasets', 'Reglas de tolerancia y conciliación', 'Workflow documentado y reejecutable'],
  },
  power_automate: {
    label: 'Power Platform', icon: 'Zap', accent: 'emerald',
    micro: 'Power Automate, Apps y SharePoint: flujos que trabajan solos 24/7. Desde $85.',
    priceMin: 85, priceMax: 1200, weeksMin: 1, weeksMax: 6,
    bullets: ['Flujos automáticos entre sistemas', 'Aprobaciones y lógica condicional', 'Manejo de errores + documentación'],
  },
  power_bi: {
    label: 'Dashboard Power BI', icon: 'BarChart3', accent: 'blue',
    micro: 'Reportes vivos conectados a tus datos. Desde $125.',
    priceMin: 125, priceMax: 1500, weeksMin: 1, weeksMax: 6,
    bullets: ['Conexión a tus fuentes de datos', 'Modelo de datos + medidas DAX', 'Publicación y acceso por rol (RLS)'],
  },
  fiscal_planilla: {
    label: 'Fiscal y planilla CR', icon: 'Receipt', accent: 'cyan',
    micro: 'Factura electrónica v4.4, CCSS y planilla — validado para Costa Rica.',
    priceMin: 150, priceMax: 2500, weeksMin: 2, weeksMax: 7,
    bullets: ['Factura electrónica v4.4 + rechazos de Hacienda', 'Cálculo de CCSS y cierre de planilla', 'Validado contra la normativa tributaria CR'],
  },
  pagina_web: {
    label: 'Página web con reservas', icon: 'Globe', accent: 'violet',
    micro: 'Sitio personalizado con tu marca y citas que se agendan solas. Desde $900.',
    priceMin: 900, priceMax: 3200, weeksMin: 2, weeksMax: 6,
    bullets: ['Sitio responsive con tu marca y catálogo de servicios', 'Reservas en línea 24/7 con confirmación automática', 'Panel de citas y clientes + publicación con tu dominio'],
  },
  python_pipeline: {
    label: 'Pipeline Python', icon: 'Cpu', accent: 'purple',
    micro: 'ETL programado, desplegado y monitoreado.',
    priceMin: 1200, priceMax: 5200, weeksMin: 2, weeksMax: 8,
    bullets: ['Ingesta y transformación de datos', 'Programación / despliegue automático', 'Logs, alertas y manejo de errores'],
  },
  software_medida: {
    label: 'Software a la medida', icon: 'MonitorSmartphone', accent: 'red',
    micro: 'Web o app construida desde cero. A partir de $2.000.',
    priceMin: 2000, priceMax: 5600, weeksMin: 5, weeksMax: 14, isMajor: true,
    bullets: ['Interfaz + lógica + base de datos', 'Integraciones con tus sistemas', 'Despliegue + manual de uso'],
  },
};

// Orden de las cards (de más accesible a más complejo, por precio de entrada)
export const SERVICE_ORDER = [
  'excel_vba', 'doc_generation', 'analisis_tfg', 'alteryx_knime', 'power_automate',
  'power_bi', 'fiscal_planilla', 'pagina_web', 'python_pipeline', 'software_medida',
];

// Garantías SIEMPRE presentes en "qué incluye"
export const GUARANTEE_BULLETS = [
  'Avances cada 72 h, no al final',
  '30 días de soporte post-entrega',
  'Primera sesión de alcance sin costo',
];

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

  return {
    investUSD: { low, high },
    delivery: {
      weeksLow, weeksHigh,
      display: weeksLow === weeksHigh ? `${weeksHigh} semanas` : `${weeksLow}–${weeksHigh} semanas`,
    },
    _internal: { score, mid },
  };
}
