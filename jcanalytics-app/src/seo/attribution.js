// ============================================================================
//  src/seo/attribution.js
//  De qué anuncio viene cada visita. Lee los parámetros que agregan Google Ads
//  (gclid/gbraid/wbraid), Meta (fbclid) y ChatGPT (utm_source=chatgpt.com),
//  más cualquier utm_*. Se guarda 30 días en este navegador para que el
//  WhatsApp que llega diga "Vi el anuncio en Google", aunque la persona vuelva
//  días después. No guarda datos personales: solo plataforma y campaña.
// ============================================================================
const KEY = 'jc_attr';
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

const detect = (params) => {
  const source = (params.get('utm_source') || '').toLowerCase();
  if (params.has('gclid') || params.has('gbraid') || params.has('wbraid') || /google|adwords/.test(source)) return 'Google';
  if (params.has('fbclid') || /facebook|instagram|^fb$|^ig$|^meta/.test(source)) return 'Meta';
  if (/chatgpt|openai/.test(source)) return 'ChatGPT';
  return source ? source.slice(0, 30) : null;
};

const read = () => {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const source = detect(params);
  if (source) {
    const value = {
      source,
      medium: (params.get('utm_medium') || '').slice(0, 30),
      campaign: (params.get('utm_campaign') || '').slice(0, 60),
      content: (params.get('utm_content') || '').slice(0, 60),
      at: Date.now(),
    };
    try { window.localStorage.setItem(KEY, JSON.stringify(value)); } catch { /* sin almacenamiento: vale solo esta visita */ }
    return value;
  }
  try {
    const stored = JSON.parse(window.localStorage.getItem(KEY) || 'null');
    if (stored && Date.now() - stored.at < TTL_MS) return stored;
  } catch { /* almacenamiento bloqueado o dato viejo */ }
  return null;
};

// Un clic nuevo en un anuncio empieza otra visita. sessionStorage dura lo que dure la pestaña (días en un celular)
// y sobrevive a salir y volver: sin esto, quien regresaba por otro anuncio ya no contaba para ese anuncio, ni en
// WhatsApp ni al dejar sus datos, y el portal pegaba la consulta nueva a la fuente y la sesión de la visita
// anterior (revisión de código, nov. 2026). Al llegar un identificador de clic que esta pestaña no vio se borran
// las marcas de la visita: la conversión de WhatsApp ya contada (`jc_wa`, analytics.js), la consulta ya captada
// (`jc_lead`), la hoja «¿Pudiste enviar tu mensaje?» ya mostrada (`jc_wa_return`, ui/WhatsAppReturn.jsx) y, en
// la medición del portal (site-tracker.js), la sesión (`jc_sid`) y la fuente con que empezó (`jc_visit`).
// Va acá porque este módulo se evalúa antes que los que leen esas claves. Recargar o volver a la dirección de
// un anuncio ya visto no reinicia nada. El identificador no es un dato de la persona y no sale de este
// navegador. Meta agrega `fbclid` también a enlaces que no son anuncios (una publicación compartida): es
// igualmente una llegada nueva desde afuera.
const CLICK_KEY = 'jc_click';
const CLICKS_KEPT = 8;
const VISIT_KEYS = ['jc_wa', 'jc_lead', 'jc_wa_return', 'jc_sid', 'jc_visit'];
function newAdClickStartsAVisit() {
  if (typeof window === 'undefined') return;
  try {
    const params = new URLSearchParams(window.location.search);
    const click = (params.get('gclid') || params.get('gbraid') || params.get('wbraid') || params.get('fbclid') || '').slice(-48);
    if (!click) return;
    let seen = [];
    try { seen = JSON.parse(window.sessionStorage.getItem(CLICK_KEY) || '[]'); } catch { /* dato viejo: se empieza de cero */ }
    if (!Array.isArray(seen)) seen = [];
    if (seen.includes(click)) return;
    window.sessionStorage.setItem(CLICK_KEY, JSON.stringify([...seen, click].slice(-CLICKS_KEPT)));
    for (const key of VISIT_KEYS) window.sessionStorage.removeItem(key);
  } catch { /* sin almacenamiento: cada página es su propia visita */ }
}
newAdClickStartsAVisit();

export const ATTRIBUTION = read();

// Línea que se agrega al final del WhatsApp para saber qué anuncio funcionó.
export const attributionNote = (language) => {
  if (!ATTRIBUTION) return '';
  const platform = ATTRIBUTION.source === 'Meta' ? 'Facebook/Instagram' : ATTRIBUTION.source;
  const campaign = ATTRIBUTION.campaign ? ` · ${ATTRIBUTION.campaign}` : '';
  return language === 'es' ? `(Vi el anuncio en ${platform}${campaign})` : `(I saw the ad on ${platform}${campaign})`;
};
