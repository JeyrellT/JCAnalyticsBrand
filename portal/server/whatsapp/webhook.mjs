// ============================================================================
//  server/whatsapp/webhook.mjs
//  Lectura del webhook de WhatsApp Cloud API (object = whatsapp_business_account).
//  PURO y tolerante: un JSON raro nunca lanza, solo se ignora lo que no se entiende.
//  La firma HMAC se verifica antes, en server/whatsapp/meta.mjs.
// ============================================================================

/** Cuenta oficial de avisos de WhatsApp: no es un cliente. */
const SYSTEM_SENDERS = new Set(['16505551111']);
const MEDIA_TYPES = { image: 'IMAGEN', audio: 'AUDIO', video: 'VIDEO', document: 'DOCUMENTO', sticker: 'STICKER' };
const STATUS = new Set(['sent', 'delivered', 'read', 'failed']);

const str = (v, max = 4096) => (typeof v === 'string' ? v.slice(0, max) : '');
const arr = (v) => (Array.isArray(v) ? v : []);

/** Texto legible de un mensaje de WhatsApp (botones y listas cuentan como si la persona hubiera escrito el título). */
function messageText(m) {
  switch (m.type) {
    case 'text': return str(m.text?.body);
    case 'interactive': return str(m.interactive?.button_reply?.title || m.interactive?.list_reply?.title, 200);
    case 'button': return str(m.button?.text, 200);
    case 'location': {
      const { latitude: lat, longitude: lng, name, address } = m.location ?? {};
      if (typeof lat !== 'number' || typeof lng !== 'number' || Math.abs(lat) > 90 || Math.abs(lng) > 180) return '';
      return `[Ubicación${name ? `: ${str(name, 120)}` : ''}${address ? ` · ${str(address, 200)}` : ''}]`;
    }
    default: return '';
  }
}

/**
 * @returns {{ messages: Array<{ waId: string, externalId: string, name: string|null, text: string, media: null|{ type: string, id: string, mime: string|null, filename: string|null } }>,
 *             statuses: Array<{ externalId: string, status: string, error: string|null }> }}
 */
export function parseWebhook(payload) {
  const messages = [];
  const statuses = [];
  if (!payload || typeof payload !== 'object' || payload.object !== 'whatsapp_business_account') return { messages, statuses };
  for (const entry of arr(payload.entry)) {
    for (const change of arr(entry?.changes)) {
      if (change?.field !== 'messages') continue;
      const value = change.value ?? {};
      const names = new Map(arr(value.contacts).map((c) => [str(c?.wa_id, 20), str(c?.profile?.name, 80) || null]));
      for (const m of arr(value.messages)) {
        const waId = str(m?.from, 20);
        const externalId = str(m?.id, 200);
        if (!/^\d{8,15}$/.test(waId) || !externalId || SYSTEM_SENDERS.has(waId) || m.type === 'system') continue;
        let media = null;
        let text = messageText(m);
        const mediaType = MEDIA_TYPES[m.type];
        if (mediaType) {
          const raw = m[m.type] ?? {};
          if (!/^\d{1,30}$/.test(str(raw.id, 40))) continue;
          media = { type: mediaType, id: raw.id, mime: str(raw.mime_type, 100) || null, filename: str(raw.filename, 200) || null };
          text = str(raw.caption, 1000);
        }
        if (!text && !media) continue; // reacciones, encuestas y tipos sin soporte
        messages.push({ waId, externalId, name: names.get(waId) ?? null, text, media });
      }
      for (const s of arr(value.statuses)) {
        const externalId = str(s?.id, 200);
        if (!externalId || !STATUS.has(s?.status)) continue;
        const err = arr(s.errors)[0];
        statuses.push({ externalId, status: s.status, error: err ? str(`${err.code ?? ''} ${err.title ?? err.message ?? ''}`.trim(), 200) : null });
      }
    }
  }
  return { messages, statuses };
}

/** Texto que se guarda en la conversación para un adjunto. */
export function mediaLabel(media, caption = '') {
  const label = { IMAGEN: 'Foto', AUDIO: 'Audio', VIDEO: 'Video', DOCUMENTO: 'Documento', STICKER: 'Sticker' }[media.type] ?? 'Archivo';
  return `[${label}${media.filename ? `: ${media.filename}` : ''}]${caption ? `\n${caption}` : ''}`;
}
