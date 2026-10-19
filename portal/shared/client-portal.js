// ============================================================================
//  shared/client-portal.js
//  Vocabulario del portal de clientes (v5): hitos, entregables, documentos,
//  estados de proyecto en lenguaje de cliente y avisos. Sin dependencias.
//  El cliente ve el control del servicio (etapas, avances, entregas,
//  documentos y reuniones), nunca la operación interna (tareas, montos, notas).
// ============================================================================

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
  aviso: 'Avisos del equipo',
  cuenta: 'Cuenta',
};

/** Cuántos borradores abiertos puede tener un cliente a la vez (freno a abuso o duplicados). */
export const MAX_OPEN_CLIENT_DRAFTS = 15;
