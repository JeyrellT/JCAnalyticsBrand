// ============================================================================
//  src/seo/analytics.js
//  Qué le contamos a cada plataforma de anuncios (Google Ads, Meta, ChatGPT):
//
//    · Intención de contacto (trackContactIntent): la persona tocó WhatsApp,
//      correo o teléfono. En celular, el clic a WhatsApp es la conversión
//      "Clic WhatsApp" de Google Ads, como hasta ahora.
//    · Consulta captada (trackLeadCaptured): la persona dejó su WhatsApp o
//      correo y el portal del equipo aceptó la consulta. Es la señal fuerte y la
//      única que existe en computadora, donde los botones de WhatsApp abren el
//      formulario corto en vez de WhatsApp Web (ver ui/LeadDialog.jsx).
//
//  Nunca se envían nombres, correos, teléfonos ni texto libre a las plataformas:
//  solo canal, sección, paquete, idioma y fuente del tráfico.
// ============================================================================
import { locale } from '../i18n/locale';
import { WA_LINE } from '../components/site/links';
import { ATTRIBUTION } from './attribution';

const ADS_ACCOUNT = 'AW-18237462818';
// Acción "Clic WhatsApp" (objetivo Contactos, principal, una por clic, valor fijo $10).
const ADS_WHATSAPP_LABEL = '5C2RCMSwvaIdEKKypvhD';
// Acción "Envío de formulario": su etiqueta se define al compilar (VITE_ADS_FORM_LABEL, ver docs/anuncios.md).
// Mientras no exista, los formularios cuentan en "Clic WhatsApp" para no perder ninguna consulta en Google Ads.
export const ADS_FORM_LABEL = import.meta.env.VITE_ADS_FORM_LABEL || ADS_WHATSAPP_LABEL;
const CONVERSION_DEDUPE_MS = 3000;

let lastConversion = 0;
let lastLead = 0; // ChatGPT Ads: una sola `lead_created` por persona y acción

const trafficSource = () => ATTRIBUTION?.source ?? 'directo';
const eventId = (prefix) => `${prefix}_${window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;

function adsConversion(label, value) {
  if (typeof window.gtag !== 'function' || Date.now() - lastConversion < CONVERSION_DEDUPE_MS) return;
  lastConversion = Date.now();
  window.gtag('event', 'conversion', { send_to: `${ADS_ACCOUNT}/${label}`, value, currency: 'USD', transport_type: 'beacon' });
}

function chatgptLead(prefix) {
  if (typeof window.oaiq !== 'function' || Date.now() - lastLead < CONVERSION_DEDUPE_MS) return;
  lastLead = Date.now();
  window.oaiq('measure', 'lead_created', { type: 'customer_action' }, { event_id: eventId(prefix) });
}

// Meta Pixel: `Contact` por intención, `Lead` por consulta captada. El paquete y su precio dicen qué se pide.
function metaEvent(name, { packageId, fallbackName, packageValue }) {
  if (typeof window.fbq !== 'function') return;
  window.fbq('track', name, { content_name: packageId ?? fallbackName, content_category: locale, ...(packageValue ? { value: packageValue, currency: 'USD' } : {}) });
}

const packageParams = (packageId, packageValue) => (packageId ? { package_id: packageId, package_value: packageValue } : {});

/**
 * Intención de contacto: clic a WhatsApp, correo o teléfono.
 * `mode: 'form'` = en computadora el botón de WhatsApp abrió el formulario corto en vez de WhatsApp Web.
 * Se registra la intención, pero la conversión de Google Ads y ChatGPT se mide al enviar ese formulario.
 */
export function trackContactIntent({ channel, section = 'navigation', packageId, packageValue, mode = 'direct' }) {
  const direct = channel === 'whatsapp' && mode === 'direct';
  metaEvent('Contact', { packageId, fallbackName: channel, packageValue });
  if (direct) chatgptLead('wa');
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', 'contact_click', {
    contact_channel: channel,
    ...(mode === 'form' ? { cta_mode: 'form' } : {}),
    site_language: locale,
    section_id: section,
    traffic_source: trafficSource(),
    ...packageParams(packageId, packageValue),
    // Cuál de las dos líneas asignadas al azar recibió el contacto (a / b).
    ...(channel === 'email' ? {} : { contact_line: WA_LINE }),
  });
  if (direct) adsConversion(ADS_WHATSAPP_LABEL, 10);
}

/**
 * Consulta captada: la persona dejó WhatsApp o correo y el portal la aceptó.
 * Meta recibe `Lead`, ChatGPT `lead_created` y Google Ads la conversión de formulario.
 * `ads: false` cuando la misma acción ya contó como "Clic WhatsApp" (celular: abrió WhatsApp y además dejó su contacto).
 */
export function trackLeadCaptured({ form, section, packageId, packageValue, ads = true }) {
  metaEvent('Lead', { packageId, fallbackName: form, packageValue });
  chatgptLead('form');
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', 'lead_submit', {
    form_id: form,
    site_language: locale,
    section_id: section ?? form,
    traffic_source: trafficSource(),
    ...packageParams(packageId, packageValue),
    contact_line: WA_LINE,
  });
  if (ads) adsConversion(ADS_FORM_LABEL, packageValue || 10);
}

/**
 * Mide los clics en enlaces de contacto (WhatsApp, correo, teléfono) de toda la página.
 * Un enlace a WhatsApp cuyo clic fue interceptado (preventDefault: en computadora abrió el
 * formulario corto) se mide como intención, no como conversión.
 */
export function trackContactClicks() {
  const track = (event) => {
    const link = event.target.closest?.('a[href]');
    if (!link) return;
    const href = link.getAttribute('href') ?? '';
    const channel = href.startsWith('https://wa.me/') ? 'whatsapp' : href.startsWith('mailto:') ? 'email' : href.startsWith('tel:') ? 'phone' : null;
    if (!channel) return;
    trackContactIntent({
      channel,
      // Un elemento fijo (barra de CTA) no está dentro de ninguna sección: declara la suya con data-track-section.
      section: link.closest('[data-track-section]')?.dataset.trackSection ?? link.closest('section[id]')?.id ?? 'navigation',
      // Paquete elegido (botones "Lo quiero"): nombre y precio para medir qué se pide.
      packageId: link.dataset.package,
      packageValue: Number(link.dataset.value) || undefined,
      mode: channel === 'whatsapp' && event.defaultPrevented ? 'form' : 'direct',
    });
  };
  document.addEventListener('click', track);
  return () => document.removeEventListener('click', track);
}
