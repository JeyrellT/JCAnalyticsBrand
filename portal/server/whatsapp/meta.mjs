// ============================================================================
//  server/whatsapp/meta.mjs — SOLO Node (node:crypto + fetch). La demo no lo carga.
//  Cliente de la Graph API de Meta para WhatsApp Cloud API: firma del webhook,
//  token de verificación derivado, envío de texto, botones, listas y plantillas,
//  "visto" con "escribiendo…" y estado del número.
//
//  Variables de entorno (docs/whatsapp.md):
//    META_APP_SECRET            secreto · firma de los webhooks (y de él se deriva el token de verificación)
//    WHATSAPP_TOKEN             secreto · token permanente del usuario del sistema
//    WHATSAPP_PHONE_NUMBER_ID   id del número (no es el teléfono)
//    WHATSAPP_WABA_ID           id de la cuenta de WhatsApp Business (solo para el estado)
//    WHATSAPP_DISPLAY_NUMBER    el número en dígitos (50670330596): enlaces wa.me para activar avisos
//    WHATSAPP_AVISOS=activos    enciende la cola de avisos a clientes (sin esto, nada se encola)
//    WHATSAPP_TEMPLATE_LANG     idioma EXACTO con que se crearon las plantillas (por defecto es)
//    META_VERIFY_TOKEN          opcional; si falta, se deriva de META_APP_SECRET
//    META_GRAPH_VERSION         opcional; por defecto v23.0
// ============================================================================

import { createHmac, timingSafeEqual } from 'node:crypto';

const GRAPH = 'https://graph.facebook.com';
const DEFAULT_VERSION = 'v23.0';
const TIMEOUT_MS = 10_000;
const STATUS_CACHE_MS = 2 * 60_000;
export const MAX_WEBHOOK_BYTES = 512 * 1024;

const REQUIRED = ['META_APP_SECRET', 'WHATSAPP_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID'];

/** Nombres de las variables que faltan (nunca sus valores). */
export function missingConfig(env = process.env) {
  const missing = REQUIRED.filter((k) => !env[k]?.trim());
  if (env.META_APP_SECRET?.trim() && env.META_APP_SECRET.trim().length < 32) missing.push('META_APP_SECRET (mínimo 32 caracteres)');
  return missing;
}

/** Token de verificación del webhook: META_VERIFY_TOKEN (≥24) o derivado del secreto de la app. */
export function verifyToken(env = process.env) {
  const own = env.META_VERIFY_TOKEN?.trim();
  if (own && own.length >= 24) return own;
  const secret = env.META_APP_SECRET?.trim();
  if (!secret || secret.length < 32) return null;
  return createHmac('sha256', secret).update('verificacion-webhook-meta', 'utf8').digest('base64url').slice(0, 40);
}

function safeEqual(a, b) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Firma X-Hub-Signature-256 del cuerpo CRUDO, comparada en tiempo constante. */
export function signatureValid(rawBody, header, secret) {
  if (!secret || typeof header !== 'string' || !/^sha256=[0-9a-f]{64}$/i.test(header)) return false;
  const expected = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;
  return safeEqual(header.toLowerCase(), expected);
}

export class WhatsAppError extends Error {
  constructor(message, { status = 0, code = null, transient = false } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.transient = transient;
  }
}

/**
 * @param {object} o
 * @param {object} [o.env]
 * @param {object} [o.logger]
 * @param {typeof fetch} [o.fetchImpl]
 * @param {string} [o.baseUrl]  solo para pruebas (Graph falso en 127.0.0.1)
 * @param {() => number} [o.now]
 * @returns {object|null} null si faltan variables obligatorias
 */
export function createWhatsAppTransport({ env = process.env, logger = console, fetchImpl = fetch, baseUrl = GRAPH, now = Date.now } = {}) {
  if (missingConfig(env).length) return null;
  const token = env.WHATSAPP_TOKEN.trim();
  const secret = env.META_APP_SECRET.trim();
  const phoneId = env.WHATSAPP_PHONE_NUMBER_ID.trim();
  const wabaId = env.WHATSAPP_WABA_ID?.trim() || null;
  const version = /^v\d{1,3}\.\d$/.test(env.META_GRAPH_VERSION?.trim() ?? '') ? env.META_GRAPH_VERSION.trim() : DEFAULT_VERSION;
  const lang = /^[a-z]{2}(_[A-Z]{2})?$/.test(env.WHATSAPP_TEMPLATE_LANG?.trim() ?? '') ? env.WHATSAPP_TEMPLATE_LANG.trim() : 'es';
  const displayNumber = (env.WHATSAPP_DISPLAY_NUMBER ?? '').replace(/\D/g, '') || null;

  /** Quita del texto los secretos y cualquier número de 6 dígitos o más (teléfonos, ids). */
  const scrub = (value) => String(value ?? '').split(token).join('[token]').split(secret).join('[secreto]')
    .replace(/\d{6,}/g, '[número]').slice(0, 300);

  async function graph(path, { method = 'GET', body } = {}) {
    let res;
    try {
      res = await fetchImpl(`${baseUrl}/${version}/${path}`, {
        method,
        headers: { authorization: `Bearer ${token}`, ...(body ? { 'content-type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined,
        redirect: 'error',
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      throw new WhatsAppError(error?.name === 'TimeoutError' ? 'Meta no respondió en 10 s' : `Error de red: ${scrub(error?.cause?.code || error?.message)}`, { transient: true });
    }
    let data = null;
    try { data = await res.json(); } catch { /* sin JSON */ }
    if (!res.ok || data?.error) {
      const e = data?.error ?? {};
      // Meta pone la causa real en error_data.details o error_user_msg; `message` suele ser genérico.
      const detail = [e.message, e.error_user_msg, e.error_data?.details].filter(Boolean).join(' · ');
      const transient = res.status === 429 || res.status >= 500 || [1, 2, 4, 80007, 130429, 131000, 131016].includes(e.code);
      throw new WhatsAppError(scrub(detail || `HTTP ${res.status}`), { status: res.status, code: e.code ?? null, transient });
    }
    return data ?? {};
  }

  const message = (to, payload) => graph(`${phoneId}/messages`, {
    method: 'POST',
    body: { messaging_product: 'whatsapp', recipient_type: 'individual', to, ...payload },
  }).then((d) => ({ id: d.messages?.[0]?.id ?? null }));

  const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

  let statusCache = null;

  return {
    outbound: env.WHATSAPP_AVISOS?.trim() === 'activos',
    lang,
    displayNumber,
    verifyToken: verifyToken(env),
    secret,
    sendText: (to, body) => message(to, { type: 'text', text: { body: clip(body, 4096), preview_url: false } }),
    /** ≤3 opciones → botones (título ≤20); 4–10 → lista (fila ≤24). */
    sendOptions(to, body, options) {
      const opts = options.slice(0, 10);
      if (opts.length <= 3) {
        return message(to, { type: 'interactive', interactive: { type: 'button', body: { text: clip(body, 1024) },
          action: { buttons: opts.map((title, i) => ({ type: 'reply', reply: { id: `op${i}`, title: clip(title, 20) } })) } } });
      }
      return message(to, { type: 'interactive', interactive: { type: 'list', body: { text: clip(body, 1024) },
        action: { button: 'Ver opciones', sections: [{ title: 'Opciones', rows: opts.map((title, i) => ({ id: `op${i}`, title: clip(title, 24) })) }] } } });
    },
    sendTemplate: (to, name, variables) => message(to, {
      type: 'template',
      template: { name, language: { code: lang }, components: [{ type: 'body', parameters: variables.map((v) => ({ type: 'text', text: clip(String(v), 1000) })) }] },
    }),
    /** Marca leído y muestra "escribiendo…" (hasta 25 s o hasta el siguiente envío). Nunca impide contestar. */
    async markRead(messageId) {
      try {
        await graph(`${phoneId}/messages`, { method: 'POST', body: { messaging_product: 'whatsapp', status: 'read', message_id: messageId, typing_indicator: { type: 'text' } } });
      } catch (error) {
        logger.info?.(`[whatsapp] visto/escribiendo no se pudo marcar: ${error.message}`);
      }
    },
    /** Diagnóstico oficial del número (health_status.can_send_message) con caché de 2 minutos. */
    async phoneStatus({ fresh = false } = {}) {
      if (!fresh && statusCache && now() - statusCache.at < STATUS_CACHE_MS) return statusCache.value;
      const fields = 'display_phone_number,verified_name,status,code_verification_status,name_status,quality_rating,platform_type,account_mode,health_status';
      let value;
      try {
        const d = await graph(`${phoneId}?fields=${fields}`);
        value = {
          ok: true,
          display_phone_number: d.display_phone_number ?? null,
          verified_name: d.verified_name ?? null,
          status: d.status ?? null,
          name_status: d.name_status ?? null,
          quality_rating: d.quality_rating ?? null,
          account_mode: d.account_mode ?? null,
          can_send: d.health_status?.can_send_message ?? null,
          problems: (d.health_status?.entities ?? []).flatMap((en) => (en.errors ?? []).map((er) => scrub(er.error_description || er.possible_solution || er.error_code))).slice(0, 5),
          waba_id: wabaId ? 'configurado' : null,
        };
      } catch (error) {
        value = { ok: false, error: error.message };
      }
      statusCache = { at: now(), value };
      return value;
    },
  };
}

/** Lee el cuerpo crudo con tope (aunque no venga content-length). null si se pasa. */
export async function readRawBody(req, max = MAX_WEBHOOK_BYTES) {
  const declared = Number(req.headers['content-length']);
  if (Number.isFinite(declared) && declared > max) return null;
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > max) return null;
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
