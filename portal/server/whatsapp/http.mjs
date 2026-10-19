// ============================================================================
//  server/whatsapp/http.mjs — SOLO Node. Ruta /webhooks/whatsapp para Meta.
//    GET  verificación al suscribir (hub.mode, hub.verify_token → hub.challenge).
//    POST cuerpo crudo con tope de 512 KB → firma HMAC → 200 "EVENT_RECEIVED" de
//         inmediato (Meta reintenta si tarda) → el trabajo sigue en segundo plano.
// ============================================================================

import { timingSafeEqual } from 'node:crypto';
import { readRawBody, signatureValid } from './meta.mjs';
import { parseWebhook } from './webhook.mjs';

function plain(res, status, body) {
  if (res.headersSent) return;
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}

const sameText = (a, b) => {
  const x = Buffer.from(String(a ?? ''));
  const y = Buffer.from(String(b ?? ''));
  return x.length === y.length && timingSafeEqual(x, y);
};

export function createWhatsAppWebhook({ ctx, logger = console }) {
  return async function handleWhatsApp(req, res, query) {
    const t = ctx.whatsapp;
    if (req.method === 'GET') {
      if (!t?.verifyToken) return plain(res, 503, 'No configurado');
      const challenge = query.get('hub.challenge') ?? '';
      if (query.get('hub.mode') === 'subscribe' && sameText(query.get('hub.verify_token'), t.verifyToken) && /^[\w-]{1,200}$/.test(challenge)) {
        return plain(res, 200, challenge);
      }
      return plain(res, 403, 'Token inválido');
    }
    if (req.method !== 'POST') return plain(res, 405, 'Método no permitido');
    if (!t?.secret) return plain(res, 503, 'No configurado');
    const raw = await readRawBody(req);
    if (raw === null) return plain(res, 413, 'Demasiado grande');
    if (!signatureValid(raw, req.headers['x-hub-signature-256'], t.secret)) return plain(res, 401, 'Firma inválida');
    let payload;
    try { payload = JSON.parse(raw.toString('utf8')); } catch { return plain(res, 400, 'JSON inválido'); }
    const parsed = parseWebhook(payload);
    plain(res, 200, 'EVENT_RECEIVED');
    // Después de responder: guardar, agrupar y contestar sin que Meta espere.
    setImmediate(() => {
      ctx.wa.handleWebhook(parsed).catch((error) => logger.error(`[whatsapp] webhook: ${error?.stack ?? error}`));
    });
  };
}
