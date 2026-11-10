// ============================================================================
//  src/data/packages.js
//  PAQUETES · lo que se puede comprar hoy, con precio publicado. Los montos,
//  plazos, alcances, exclusiones y agregados salen de
//  portal/shared/service-pricing.js (la misma fuente de las páginas de servicio
//  y del portal): acá solo va el texto de venta de cada tarjeta.
//
//  Anuncios: ?p=<alias> en la URL pone ese paquete primero y lo marca como
//  "el que viste en el anuncio" (ver docs/anuncios.md).
// ============================================================================
import { locale, t } from '../i18n/locale';
import { SERVICE_PRICING } from '../../../portal/shared/service-pricing.js';
import { EXTRA_LABELS_EN } from '../content/service-offers.js';
import { CURRENCIES } from './currencies';

// `category`: la página de servicio donde ese paquete se ofrece y se explica (auditoría de noviembre de
// 2026: el chatbot apuntaba a automatización, donde no aparece; CRM e inventario a una página que no los
// nombraba). `featured`: los seis que se ven sin desplegar en computadora. `need`: la necesidad con la que
// la consulta llega al portal (misma lista que el formulario de contacto).
// `related`: un proyecto real de ese tipo de sistema. Suele ser más amplio que el paquete: se presenta
// como «proyecto relacionado», nunca como lo que se recibe por ese precio.
// `ready`: lo que hace falta de parte de quien compra para empezar, tomado del alcance y de las
// exclusiones publicadas (texto por validar con el equipo cuando cambie el tarifario).
const DEFS = [
  { key: 'pagina_web', category: 'web-development', featured: true, need: 'Página web', badge: t('Más pedido', 'Most requested'), aliases: ['web', 'pagina', 'sitio', 'reservas', 'website'], related: 'laburrada',
    pitch: t('Para vender y recibir reservas en línea, sin depender de llamadas.', 'To sell and take bookings online, without relying on phone calls.'),
    ready: t('Textos e imágenes de hasta 5 secciones, tu lista de servicios con precios y los horarios de la agenda.', 'Text and images for up to 5 sections, your service list with prices and the calendar hours.') },
  { key: 'software_medida', category: 'web-development', featured: true, need: 'Sistema / backend', aliases: ['software', 'sistema', 'app'], related: 'transportesluna',
    pitch: t('Para ordenar un proceso con pantallas, roles y base de datos propios.', 'To organize a process with its own screens, roles and database.'),
    ready: t('El proceso que querés ordenar, quiénes lo usan (hasta 2 roles) y el reporte que necesitás.', 'The process you want to organize, who uses it (up to 2 roles) and the report you need.') },
  { key: 'crm_inicial', category: 'web-development', need: 'Sistema / backend', aliases: ['crm', 'ventas', 'clientes'], related: 'caviq',
    pitch: t('Para dar seguimiento a cada cliente y oportunidad sin perder ninguna.', 'To follow up on every client and opportunity without losing any.'),
    ready: t('Tu lista de contactos ordenada (hasta 1.000) y tus etapas de venta (hasta 6).', 'Your clean contact list (up to 1,000) and your sales stages (up to 6).') },
  { key: 'inventario_inicial', category: 'web-development', need: 'Sistema / backend', aliases: ['inventario', 'bodega', 'stock'], related: 'multiagencia',
    pitch: t('Para saber qué hay en bodega sin contar a mano.', 'To know what is in stock without counting by hand.'),
    ready: t('Tu lista de productos (hasta 1.000) y quiénes registran movimientos (hasta 5 personas).', 'Your product list (up to 1,000) and who records movements (up to 5 people).') },
  { key: 'power_automate', category: 'process-automation', featured: true, need: 'Automatización', aliases: ['automatizacion', 'automation', 'automate', 'procesos'], related: 'crimson',
    pitch: t('Para tareas repetidas entre correo, Excel y tus sistemas.', 'For repeated tasks across email, Excel and your systems.'),
    ready: t('Una tarea que se repite, los sistemas que toca (hasta 2) y quién revisa las excepciones.', 'One repeating task, the systems it touches (up to 2) and who reviews exceptions.') },
  { key: 'excel_vba', category: 'process-automation', need: 'Automatización', aliases: ['excel', 'vba', 'reportes'],
    pitch: t('Para equipos que viven en Excel y quieren dejar de copiar y pegar.', 'For teams that live in Excel and want to stop copying and pasting.'),
    ready: t('El archivo y hasta 3 tablas de entrada con formato estable.', 'The file and up to 3 input tables in a stable format.') },
  { key: 'dashboard_inicial', category: 'business-intelligence', featured: true, need: 'Dashboard', aliases: ['dashboard', 'reporte', 'kpi'], related: 'transportesluna',
    pitch: t('Tu reporte de siempre en una página, con hasta 5 indicadores y filtros.', 'Your regular report on one page, with up to 5 indicators and filters.'),
    ready: t('Una fuente ordenada: un Excel, una exportación de tu sistema o una base de datos.', 'One clean source: a spreadsheet, an export from your system or a database.') },
  { key: 'power_bi', category: 'business-intelligence', featured: true, need: 'Dashboard', aliases: ['powerbi', 'bi', 'gestion'],
    pitch: t('Para gerencias que deciden con varias fuentes de datos.', 'For managers who decide with several data sources.'),
    ready: t('Hasta 2 fuentes de datos con acceso; las licencias de Power BI se cotizan aparte.', 'Up to 2 accessible data sources; Power BI licenses are quoted separately.') },
  { key: 'asistente_ia_documental', category: 'ai-integration', featured: true, need: 'Integración de IA', aliases: ['ia', 'ai', 'asistente', 'documentos'],
    pitch: t('Para consultar tus documentos con IA y respuestas con referencias.', 'To query your documents with AI and get referenced answers.'),
    ready: t('Documentos legibles y aprobados (hasta 30 documentos o 300 páginas).', 'Readable, approved documents (up to 30 documents or 300 pages).') },
  { key: 'chatbot_atencion', category: 'ai-integration', need: 'Integración de IA', aliases: ['chatbot', 'bot', 'atencion'],
    pitch: t('Para responder las preguntas frecuentes y pasar a una persona cuando hace falta.', 'To answer common questions and hand off to a person when needed.'),
    ready: t('Tus 20 preguntas con su respuesta aprobada y el canal donde va a atender.', 'Your 20 questions with approved answers and the channel it will serve.') },
];

const CRC = CURRENCIES.CRC.rateFromUSD;
export const money = (usd) => `$${usd.toLocaleString(locale === 'es' ? 'es-CR' : 'en-US')}`;
export const colones = (usd) => `₡${(Math.round((usd * CRC) / 1000) * 1000).toLocaleString('es-CR')}`;

const timeLabel = (pricing) => pricing.days_min
  ? t(`${pricing.days_min}–${pricing.days_max} días hábiles`, `${pricing.days_min}–${pricing.days_max} business days`)
  : t(`${pricing.weeks_min}–${pricing.weeks_max} semanas`, `${pricing.weeks_min}–${pricing.weeks_max} weeks`);

/** Mensaje ya escrito de un paquete, con lo que la persona marcó en su hoja (IA y agregados). */
export function packageMessage(item, { withAi = false, extras = [] } = {}) {
  const lines = [t(
    `Hola JC Analytics, me interesa el paquete ${item.name} (${item.priceLabel} + IVA).`,
    `Hi JC Analytics, I am interested in the ${item.name} package (${item.priceLabel} + tax).`,
  )];
  if (withAi && item.ai) lines.push(t(`Con IA: ${money(item.ai.total)} en total.`, `With AI: ${money(item.ai.total)} total.`));
  if (extras.length) lines.push(`${t('Agregados', 'Add-ons')}: ${extras.map((extra) => `${extra.label} (+${money(extra.price)})`).join(', ')}.`);
  if (withAi || extras.length) lines.push(t(`Total preliminar: ${money(packageTotal(item, { withAi, extras }))} + IVA.`, `Preliminary total: ${money(packageTotal(item, { withAi, extras }))} + tax.`));
  lines.push(t('¿Me confirman si calza con mi caso y qué necesitan para empezar?', 'Can you confirm it fits my case and what you need to get started?'));
  return lines.join('\n');
}
/** Total de pago único: el precio con IA reemplaza al base (no se suma) y los agregados se suman. */
export const packageTotal = (item, { withAi = false, extras = [] } = {}) => (withAi && item.ai ? item.ai.total : item.price) + extras.reduce((sum, extra) => sum + extra.price, 0);

export const PACKAGES = DEFS.map((def) => {
  const pricing = SERVICE_PRICING[def.key];
  const name = t(pricing.label, pricing.label_en);
  const item = {
    ...def,
    name,
    price: pricing.base_usd,
    priceLabel: money(pricing.base_usd),
    colones: colones(pricing.base_usd),
    time: timeLabel(pricing),
    scope: t(pricing.scope, pricing.scope_en),
    exclusions: t(pricing.exclusions, pricing.exclusions_en),
    // Opción con IA: null cuando la IA ya viene incluida en el paquete.
    ai: !pricing.ai_included && pricing.with_ai_usd > pricing.base_usd ? { total: pricing.with_ai_usd, scope: t(pricing.ai_scope, pricing.ai_scope_en) } : null,
    aiIncluded: Boolean(pricing.ai_included),
    aiScope: t(pricing.ai_scope, pricing.ai_scope_en),
    extras: (pricing.extras ?? []).map((extra) => ({ key: extra.key, price: extra.price_usd, label: locale === 'es' ? extra.label : EXTRA_LABELS_EN[`${def.key}.${extra.key}`] ?? extra.label })),
    supportMonthly: pricing.support_monthly_usd ? { price: pricing.support_monthly_usd, hours: pricing.support_hours_per_week } : null,
  };
  return { ...item, message: packageMessage(item) };
});
export const FEATURED_COUNT = PACKAGES.filter((item) => item.featured).length;

// Paquete pedido por el anuncio: ?p=web, ?p=dashboard… `p` y `paquete` son explícitos y aceptan alias.
// `utm_content` solo cuenta si es exactamente la clave o un alias, sin limpiar: antes un anuncio de Meta
// llamado «IA-2» o «Web 1» activaba un paquete que la persona no había visto.
export const adPackage = (() => {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const explicit = (params.get('p') || params.get('paquete') || '').toLowerCase().replace(/[^a-z_]/g, '');
  const content = (params.get('utm_content') || '').trim().toLowerCase();
  const wanted = explicit || (/^[a-z_]+$/.test(content) ? content : '');
  if (!wanted) return null;
  return PACKAGES.find((item) => item.key === wanted || item.aliases.includes(wanted)) ?? null;
})();
