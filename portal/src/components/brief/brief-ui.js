// ============================================================================
//  components/brief/brief-ui.js
//  Ayudas de presentación del brief creativo (v5) compartidas por el equipo,
//  el portal de clientes y la vista imprimible. Los campos, reglas y estados
//  viven en shared/brief.js: acá solo se decide CÓMO se muestran.
// ============================================================================
import { useState } from 'react';
import { BRIEF_STATUS, BRIEF_FIELDS, BRIEF_SECTIONS, canonicalJson, normalizeBriefData } from '../../../shared/brief.js';
import { formatDate } from '../../lib/format.js';

/** Base de la API según quién mira: el equipo (/api/briefs) o el cliente (/api/client/briefs). */
export const briefApi = (audience) => (audience === 'client' ? '/api/client/briefs' : '/api/briefs');
/** Ruta de la ficha del brief en la interfaz de cada lado. */
export const briefPath = (audience, id) => (audience === 'client' ? `/cliente/solicitudes/${id}` : `/briefs/${id}`);
/** Vista A4 imprimible (opcionalmente de una versión congelada). */
export const briefPrintPath = (audience, id, version) => `${briefPath(audience, id)}/imprimir${version ? `?version=${version}` : ''}`;

/** Con el cliente se habla de "solicitud" (femenino) y sin jerga interna. */
const CLIENT_STATUS = {
  borrador: { label: 'Borrador', hint: 'Todavía no la enviaste: completala con calma y enviala cuando esté lista.' },
  enviado: { label: 'Enviada', hint: 'La recibimos y la estamos revisando. Te avisamos por aquí.' },
  observado: { label: 'Necesita ajustes', hint: 'Te pedimos algunos ajustes antes de aprobarla. Revisá la nota y volvé a enviarla.' },
  aprobado: { label: 'Aprobada', hint: 'Aprobamos el alcance: esta versión queda congelada y arrancamos a producir.' },
  en_produccion: { label: 'En producción', hint: 'Estamos creando las piezas.' },
  entregado: { label: 'Entregada', hint: 'Te entregamos las piezas para que las revisés.' },
  cerrado: { label: 'Cerrada', hint: 'Solicitud finalizada.' },
  cancelado: { label: 'Cancelada', hint: 'Esta solicitud no se va a producir.' },
};

/** { label, tone, hint } del estado, con el lenguaje de cada lado. */
export function briefStatusMeta(status, audience = 'team') {
  const meta = BRIEF_STATUS[status] ?? { label: status ?? '—', tone: 'slate', hint: '' };
  if (audience !== 'client') return meta;
  return { ...meta, ...CLIENT_STATUS[status] };
}

/** Texto de un sí/no cuando el "sí" pide contexto (formulario, vista e impresión). */
const BOOL_TEXT = {
  includes_creative: ['Sí, JC Analytics diseña las piezas', 'No, el cliente entrega las piezas'],
  send_setup: ['Sí, JC Analytics configura y programa el envío', 'No, el envío lo hace el cliente'],
  is_contest: ['Sí, incluye una dinámica', 'No incluye'],
  rights_confirmed: ['Confirmado', 'Sin confirmar'],
};
export const boolText = (key) => BOOL_TEXT[key] ?? ['Sí', 'No'];

/** "Creatividad: JC Analytics diseña las piezas" → ["Creatividad", "JC Analytics diseña las piezas"]. */
export function splitLabel(label) {
  const i = label.indexOf(':');
  return i > 0 && i < 40 ? [label.slice(0, i), label.slice(i + 1).trim()] : [label, null];
}

/** Primeros 12 caracteres de la huella SHA-256 (para listas). */
export const shortHash = (hash) => (hash ? hash.slice(0, 12) : '');

// ── Fechas (AAAA-MM-DD en hora de Costa Rica, sin corrimientos) ─────────────
const TZ = 'America/Costa_Rica';
const asDate = (key) => new Date(`${key.slice(0, 10)}T12:00:00-06:00`);
const longFmt = new Intl.DateTimeFormat('es-CR', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' });
const dayMonthFmt = new Intl.DateTimeFormat('es-CR', { timeZone: TZ, day: 'numeric', month: 'long' });
const dayFmt = new Intl.DateTimeFormat('es-CR', { timeZone: TZ, day: 'numeric' });

/** "21 de octubre de 2026". */
export const formatDateLong = (key) => (key ? longFmt.format(asDate(key)) : '');

/** "Del 20 al 30 de octubre de 2026" · "Del 28 de octubre al 5 de noviembre de 2026" · "Desde el 20 de octubre de 2026". */
export function formatSendRangeLong(start, end) {
  if (!start) return '';
  if (!end || end === start) return end ? `El ${formatDateLong(start)}` : `Desde el ${formatDateLong(start)}`;
  if (start.slice(0, 7) === end.slice(0, 7)) return `Del ${dayFmt.format(asDate(start))} al ${formatDateLong(end)}`;
  if (start.slice(0, 4) === end.slice(0, 4)) return `Del ${dayMonthFmt.format(asDate(start))} al ${formatDateLong(end)}`;
  return `Del ${formatDateLong(start)} al ${formatDateLong(end)}`;
}

// ── Borrador local del formulario ───────────────────────────────────────────

/** Datos del brief listos para editar: siempre con al menos una fila de enlace a la vista. */
export function editableData(data) {
  const links = Array.isArray(data?.links) && data.links.length ? data.links.map((l) => ({ label: l.label ?? '', url: l.url ?? '' })) : [{ label: '', url: '' }];
  return { ...data, links };
}

/** Huella local del contenido (título + datos normalizados): dice si hay cambios sin guardar. */
export const contentKey = (title, data) => canonicalJson({ title: (title ?? '').trim(), data: normalizeBriefData(data).data });

/** Orden de los campos en pantalla: sirve para llevar a la persona al primer problema. */
const FIELD_ORDER = ['title', ...BRIEF_SECTIONS.flatMap((s) => s.fields.map((f) => f.key))];
const baseField = (key) => String(key).split('.')[0];
export const firstField = (keys) => [...keys].sort((a, b) => FIELD_ORDER.indexOf(baseField(a)) - FIELD_ORDER.indexOf(baseField(b)))[0] ?? null;

/** Texto corto de un punto de la lista de verificación. */
export function checkLabel(check) {
  if (check.field === 'title') return 'Nombre del requerimiento';
  if (check.field === 'rights_confirmed') return 'Confirmación de datos y derechos de uso';
  const f = BRIEF_FIELDS[check.field];
  if (f && f.required && check.message.startsWith(`${f.label}:`)) return f.min ? `${f.label} (mínimo ${f.min} caracteres)` : f.label;
  return check.message;
}

/** Mensaje en línea (debajo del campo) para un punto pendiente de la lista. */
export function inlineMessage(check) {
  if (check.field === 'title') return 'Ponele un nombre al requerimiento.';
  const f = BRIEF_FIELDS[check.field];
  if (f && f.required && check.message === `${f.label}: requerido.`) return f.type === 'bool' ? 'Marcá esta confirmación para poder enviar.' : 'Requerido para enviar.';
  if (f?.min && check.message.startsWith(`${f.label}: mínimo`)) return `Mínimo ${f.min} caracteres para enviar.`;
  return check.message;
}

/** Fechas AAAA-MM-DD dentro de un mensaje (p. ej. el del plazo mínimo) → "el 18 oct". */
export const humanDates = (text) => (typeof text === 'string' ? text.replace(/\d{4}-\d{2}-\d{2}/g, (key) => `el ${formatDate(key)}`) : text);

/** Errores de un 400 `validation` del servidor → { campo: mensaje } (incluye claves tipo `links.0`). */
export function serverFieldErrors(error) {
  const d = error?.data ?? {};
  if (d.error !== 'validation') return {};
  const list = Array.isArray(d.errors) ? d.errors : Array.isArray(d.problems) ? d.problems.map((p) => ({ field: p.field, message: inlineMessage(p) })) : d.field ? [{ field: d.field, message: d.message }] : [];
  const out = {};
  for (const e of list) if (e?.field && !out[e.field]) out[e.field] = humanDates(e.message);
  return out;
}

/** Última observación del equipo (nota de "Pedir ajustes") para destacarla mientras el brief está observado. */
export function lastObservation(events = []) {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const e = events[i];
    if (e.kind === 'estado' && e.to_status === 'observado') return e;
  }
  return null;
}

/** Estado desde el que se canceló (para dibujar la línea de etapas). */
export function cancelledFrom(events = []) {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const e = events[i];
    if (e.to_status === 'cancelado') return e.from_status;
  }
  return null;
}

/**
 * Mantiene a la vista el último dato cargado mientras llega el siguiente
 * (al cambiar un filtro no parpadea el cargador).
 */
export function useLastData(data) {
  const [last, setLast] = useState(data);
  if (data && data !== last) setLast(data);
  return data ?? last;
}
