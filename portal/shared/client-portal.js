// ============================================================================
//  shared/client-portal.js
//  Vocabulario del portal de clientes (v5): hitos, entregables, documentos,
//  estados de proyecto en lenguaje de cliente y avisos. Sin dependencias.
//  El cliente ve el control del servicio (etapas, avances, entregas,
//  documentos y reuniones), nunca la operación interna (tareas, montos, notas).
//  Excepción del portal simple: sus actualizaciones cotizadas y su cuenta de pagos.
// ============================================================================

import { formatMoney } from './finance.js';

export const MILESTONE_STATUS = {
  pendiente: { label: 'Pendiente', tone: 'slate' },
  en_curso: { label: 'En curso', tone: 'blue' },
  completado: { label: 'Completado', tone: 'teal' },
};

export const DELIVERABLE_STATUS = {
  en_revision: { label: 'Por revisar', tone: 'amber', hint: 'Esperando la revisión del cliente.' },
  aprobado: { label: 'Aprobado', tone: 'teal', hint: 'El cliente aprobó esta versión.' },
  cambios: { label: 'Cambios solicitados', tone: 'red', hint: 'El cliente pidió ajustes. El equipo sube una versión nueva.' },
};

export const DELIVERABLE_EVENT_KINDS = {
  compartido: 'Compartido para revisión',
  nueva_version: 'Nueva versión',
  aprobado: 'Aprobado',
  cambios: 'Cambios solicitados',
};

export const DOCUMENT_CATEGORIES = {
  contrato: { label: 'Contrato y propuesta', tone: 'blue' },
  facturacion: { label: 'Facturación', tone: 'amber' },
  reporte: { label: 'Reportes', tone: 'violet' },
  manual: { label: 'Manuales y guías', tone: 'teal' },
  marca: { label: 'Marca y recursos', tone: 'red' },
  otro: { label: 'Otro', tone: 'slate' },
};

/** Estado del proyecto contado al cliente (sin jerga interna). */
export const CLIENT_PROJECT_STATUS = {
  en_curso: { label: 'En desarrollo', tone: 'blue' },
  en_revision: { label: 'En revisión', tone: 'violet' },
  entregado: { label: 'Entregado', tone: 'teal' },
  soporte: { label: 'Soporte 30 días', tone: 'amber' },
  pausado: { label: 'En pausa', tone: 'slate' },
  cerrado: { label: 'Finalizado', tone: 'ink' },
};

/** Estados de proyecto visibles para el cliente (los prospectos son pipeline interno). */
export const CLIENT_VISIBLE_PROJECT_STATUSES = Object.keys(CLIENT_PROJECT_STATUS);

/** Tipos de cita que el cliente ve (las internas nunca). */
export const CLIENT_VISIBLE_APPOINTMENT_KINDS = ['alcance', 'demo', 'entrega', 'seguimiento', 'otro'];

/** Avisos dentro del portal de clientes (client_notifications.kind). */
export const CLIENT_NOTIFICATION_KINDS = {
  brief: 'Solicitudes',
  deliverable: 'Entregables',
  avance: 'Avances',
  documento: 'Documentos',
  cuenta: 'Cuenta',
  actualizacion: 'Actualizaciones',
  pago: 'Pagos',
};

/** Cuántos borradores abiertos puede tener un cliente a la vez (freno a abuso o duplicados). */
export const MAX_OPEN_CLIENT_DRAFTS = 15;

// ── Actualizaciones y pagos (portal simple) ─────────────────────────────────
//  El cliente pide una actualización; el equipo (socios y admin) pone el monto;
//  el cliente la acepta y queda como cobro pendiente en "Pagos".

/** Estados de una actualización pedida por el cliente (client_requests.status). */
export const REQUEST_STATUS = {
  pendiente: { label: 'Por cotizar', client: 'Esperando cotización', tone: 'slate', hint: 'JC Analytics la está revisando para darte el monto.' },
  cotizada: { label: 'Cotizada', client: 'Lista para aprobar', tone: 'amber', hint: 'Revisá el monto y aceptala o rechazala.' },
  en_proceso: { label: 'En proceso', client: 'En proceso', tone: 'blue', hint: 'Aceptada. El equipo está trabajando en ella.' },
  lista: { label: 'Lista', client: 'Lista', tone: 'teal', hint: 'Actualización terminada.' },
  rechazada: { label: 'Rechazada', client: 'No se hará', tone: 'red', hint: 'Quedó descartada.' },
  cancelada: { label: 'Retirada', client: 'Retirada', tone: 'slate', hint: 'El cliente la retiró antes de cotizarla.' },
};

/** Estados que siguen abiertos (no son un cierre). */
export const REQUEST_OPEN_STATUSES = ['pendiente', 'cotizada', 'en_proceso'];

/** Estados de un cobro al cliente (client_payments.status). Los anulados no se muestran al cliente. */
export const PAYMENT_STATUS = {
  pendiente: { label: 'Por pagar', tone: 'amber' },
  pagado: { label: 'Pagado', tone: 'teal' },
  anulado: { label: 'Anulado', tone: 'slate' },
};

/** Cuántas actualizaciones abiertas "por cotizar" puede tener un cliente a la vez (freno a spam). */
export const MAX_OPEN_CLIENT_REQUESTS = 20;

/** "₡65 000" · "₡65 000 + $150,00" · "₡0": totales por moneda en texto. */
export function totalsText(totals) {
  const parts = ['CRC', 'USD'].filter((c) => totals?.[c]).map((c) => formatMoney(totals[c], c));
  return parts.length ? parts.join(' + ') : formatMoney(0, 'CRC');
}

/** Suma de montos por moneda: { CRC: n, USD: n } (sin convertir: al cliente se le muestra lo que paga). */
export function totalsByCurrency(items, amountOf = (x) => x.amount) {
  const out = {};
  for (const item of items) {
    const value = amountOf(item);
    if (!value) continue;
    out[item.currency] = (out[item.currency] ?? 0) + value;
  }
  return out;
}
