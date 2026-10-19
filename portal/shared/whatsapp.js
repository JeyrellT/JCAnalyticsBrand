// ============================================================================
//  shared/whatsapp.js
//  Catálogo de WhatsApp (Cloud API de Meta) compartido por servidor, demo e
//  interfaz: plantillas aprobadas, estados de la cola de avisos, bandejas del
//  panel y normalización de teléfonos. Ver docs/whatsapp.md.
// ============================================================================

/**
 * Plantillas que deben existir APROBADAS en WhatsApp Manager con este nombre exacto,
 * categoría UTILITY y el idioma de WHATSAPP_TEMPLATE_LANG (por defecto "es").
 * `body` documenta el texto tal como debe quedar en Meta; `vars` explica cada {{n}}.
 */
export const WA_TEMPLATES = {
  jc_aviso_portal: {
    label: 'Novedad en el portal',
    body: 'Hola {{1}}, tenés una novedad en tu portal de clientes de JC Analytics: {{2}}. Podés verla en portal.jcanalytic.com/cliente',
    vars: ['Nombre de la persona', 'Título del aviso'],
  },
  jc_recordatorio_reunion: {
    label: 'Recordatorio de reunión',
    body: 'Hola {{1}}, te recordamos la reunión "{{2}}" con JC Analytics el {{3}}. Si necesitás moverla, respondé a este mensaje.',
    vars: ['Nombre de la persona', 'Título de la reunión', 'Fecha y hora'],
  },
  jc_aviso_cuenta: {
    label: 'Aviso del equipo',
    body: 'Hola {{1}}, te escribimos de JC Analytics sobre tu servicio: {{2}}',
    vars: ['Nombre de la persona', 'Mensaje del equipo'],
  },
};

/** Plantilla de cada tipo de aviso al cliente (client_notifications.kind). */
export const WA_TEMPLATE_BY_KIND = {
  avance: 'jc_aviso_portal',
  deliverable: 'jc_aviso_portal',
  documento: 'jc_aviso_portal',
  brief: 'jc_aviso_portal',
  aviso: 'jc_aviso_cuenta',
  reunion: 'jc_recordatorio_reunion',
};

/** Avisos al cliente que NO salen por WhatsApp (la bienvenida llega antes de que vincule su número). */
export const WA_SKIPPED_KINDS = ['cuenta'];

export const WA_OUTBOX_STATUS = {
  pendiente: { label: 'En cola', tone: 'amber' },
  enviando: { label: 'Enviando', tone: 'blue' },
  enviado: { label: 'Enviado', tone: 'teal' },
  omitido: { label: 'Omitido', tone: 'slate' },
  fallido: { label: 'Falló', tone: 'red' },
};

export const WA_ORIGINS = {
  cliente: 'Cliente',
  asistente: 'Asistente',
  equipo: 'Equipo',
  plantilla: 'Aviso automático',
  aviso: 'Aviso para el equipo',
  sistema: 'Nota interna',
};

/** Bandejas del panel (se derivan de los datos, sin columnas extra). */
export const WA_TRAYS = {
  atender: 'Por atender',
  sin_respuesta: 'Sin respuesta',
  equipo: 'Con el equipo',
  resueltas: 'Resueltas',
  todas: 'Todas',
};

/** Horario en que salen los avisos no urgentes (hora de Costa Rica). Fuera de él, quedan para la mañana. */
export const WA_SEND_WINDOW = { start: '07:00', end: '20:00' };
/** El texto libre solo se puede enviar dentro de las 24 h desde el último mensaje del cliente (regla de Meta). */
export const WA_SESSION_HOURS = 24;
/** Minutos que el asistente se calla después de que alguien del equipo contesta o recibe el caso. */
export const WA_TEAM_PAUSE_MINUTES = 30;
/** Vigencia del código para activar los avisos desde el portal. */
export const WA_LINK_CODE_MINUTES = 30;

/**
 * Teléfono a formato wa_id (solo dígitos con código de país). 8 dígitos se asumen
 * de Costa Rica. Devuelve null si no parece un número válido.
 */
export function normalizeWaPhone(phone) {
  let digits = String(phone ?? '').replace(/\D/g, '');
  if (digits.length === 8) digits = `506${digits}`;
  return /^\d{10,15}$/.test(digits) ? digits : null;
}

/** "50688887777" → "+506 8888-7777" (otros países: +<dígitos>). */
export function formatWaPhone(waId) {
  const d = String(waId ?? '');
  const cr = /^506(\d{4})(\d{4})$/.exec(d);
  if (cr) return `+506 ${cr[1]}-${cr[2]}`;
  return d ? `+${d}` : '';
}

/** Últimos 4 dígitos para mostrar sin revelar el número completo. */
export const maskWaPhone = (waId) => (waId ? `•••• ${String(waId).slice(-4)}` : null);
