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

export const ATTRIBUTION = read();

// Línea que se agrega al final del WhatsApp para saber qué anuncio funcionó.
export const attributionNote = (language) => {
  if (!ATTRIBUTION) return '';
  const platform = ATTRIBUTION.source === 'Meta' ? 'Facebook/Instagram' : ATTRIBUTION.source;
  const campaign = ATTRIBUTION.campaign ? ` · ${ATTRIBUTION.campaign}` : '';
  return language === 'es' ? `(Vi el anuncio en ${platform}${campaign})` : `(I saw the ad on ${platform}${campaign})`;
};
