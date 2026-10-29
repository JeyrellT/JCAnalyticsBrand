// ============================================================================
//  src/data/packages.js
//  PAQUETES · lo que se puede comprar hoy, con precio publicado. Los montos,
//  plazos y alcances salen de portal/shared/service-pricing.js (la misma fuente
//  del cotizador y del portal): acá solo va el texto de venta de cada tarjeta.
//
//  Anuncios: ?p=<alias> en la URL pone ese paquete primero y lo marca como
//  "el que viste en el anuncio" (ver docs/anuncios.md).
// ============================================================================
import { locale, t } from '../i18n/locale';
import { SERVICE_PRICING } from '../../../portal/shared/service-pricing.js';
import { CURRENCIES } from './currencies';

// `need`: la necesidad con la que la consulta llega al portal (misma lista que el formulario de contacto).
const DEFS = [
  { key: 'pagina_web', badge: t('Más pedido', 'Most requested'), aliases: ['web', 'pagina', 'sitio', 'reservas', 'website'], example: 'laburrada', need: 'Página web',
    pitch: t('Para vender y recibir reservas en línea, sin depender de llamadas.', 'To sell and take bookings online, without relying on phone calls.') },
  { key: 'dashboard_inicial', aliases: ['dashboard', 'reporte', 'kpi'], example: 'maison', need: 'Dashboard',
    pitch: t('Para dejar de armar el reporte a mano cada semana.', 'To stop building the report by hand every week.') },
  { key: 'excel_vba', badge: t('Desde $60', 'From $60'), aliases: ['excel', 'vba', 'reportes'], need: 'Automatización',
    pitch: t('Para equipos que viven en Excel y quieren dejar de copiar y pegar.', 'For teams that live in Excel and want to stop copying and pasting.') },
  { key: 'power_automate', aliases: ['automatizacion', 'automation', 'automate', 'procesos'], need: 'Automatización',
    pitch: t('Para tareas repetidas entre correo, Excel y tus sistemas.', 'For repeated tasks across email, Excel and your systems.') },
  { key: 'chatbot_atencion', aliases: ['chatbot', 'bot', 'atencion'], need: 'Integración de IA',
    pitch: t('Para responder las preguntas frecuentes y pasar a una persona cuando hace falta.', 'To answer common questions and hand off to a person when needed.') },
  { key: 'software_medida', aliases: ['software', 'sistema', 'app'], example: 'transportesluna', need: 'Sistema / backend',
    pitch: t('Para ordenar un proceso con pantallas, roles y base de datos propios.', 'To organize a process with its own screens, roles and database.') },
  { key: 'crm_inicial', aliases: ['crm', 'ventas', 'clientes'], example: 'caviq', need: 'Sistema / backend',
    pitch: t('Para dar seguimiento a cada cliente y oportunidad sin perder ninguna.', 'To follow up on every client and opportunity without losing any.') },
  { key: 'inventario_inicial', aliases: ['inventario', 'bodega', 'stock'], example: 'multiagencia', need: 'Sistema / backend',
    pitch: t('Para saber qué hay en bodega sin contar a mano.', 'To know what is in stock without counting by hand.') },
  { key: 'power_bi', aliases: ['powerbi', 'bi', 'gestion'], need: 'Dashboard',
    pitch: t('Para gerencias que deciden con varias fuentes de datos.', 'For managers who decide with several data sources.') },
  { key: 'asistente_ia_documental', aliases: ['ia', 'ai', 'asistente', 'documentos'], need: 'Integración de IA',
    pitch: t('Para consultar tus documentos con IA y respuestas con referencias.', 'To query your documents with AI and get referenced answers.') },
];

export const FEATURED_COUNT = 6;
const CRC = CURRENCIES.CRC.rateFromUSD;
const money = (usd) => `$${usd.toLocaleString(locale === 'es' ? 'es-CR' : 'en-US')}`;
const colones = (usd) => `₡${(Math.round((usd * CRC) / 1000) * 1000).toLocaleString('es-CR')}`;

const timeLabel = (pricing) => pricing.days_min
  ? t(`${pricing.days_min}–${pricing.days_max} días hábiles`, `${pricing.days_min}–${pricing.days_max} business days`)
  : t(`${pricing.weeks_min}–${pricing.weeks_max} semanas`, `${pricing.weeks_min}–${pricing.weeks_max} weeks`);

export const PACKAGES = DEFS.map((def) => {
  const pricing = SERVICE_PRICING[def.key];
  const name = t(pricing.label, pricing.label_en);
  return {
    ...def,
    name,
    price: pricing.base_usd,
    priceLabel: money(pricing.base_usd),
    colones: colones(pricing.base_usd),
    time: timeLabel(pricing),
    scope: t(pricing.scope, pricing.scope_en),
    support: pricing.support_monthly_usd ? t(`Soporte opcional ${money(pricing.support_monthly_usd)}/mes`, `Optional support ${money(pricing.support_monthly_usd)}/month`) : null,
    withAi: !pricing.ai_included && pricing.with_ai_usd > pricing.base_usd ? t(`Con IA: ${money(pricing.with_ai_usd)} en total`, `With AI: ${money(pricing.with_ai_usd)} total`) : null,
    message: t(
      `Hola JC Analytics, quiero el paquete ${name} (${money(pricing.base_usd)}). ¿Qué necesitan para empezar?`,
      `Hi JC Analytics, I want the ${name} package (${money(pricing.base_usd)}). What do you need to get started?`,
    ),
  };
});

// Paquete pedido por el anuncio: ?p=web, ?p=dashboard… (también lee utm_content).
export const adPackage = (() => {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const wanted = (params.get('p') || params.get('paquete') || params.get('utm_content') || '').toLowerCase().replace(/[^a-z_]/g, '');
  if (!wanted) return null;
  return PACKAGES.find((item) => item.key === wanted || item.aliases.includes(wanted)) ?? null;
})();
