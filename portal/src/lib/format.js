// Formato de fechas y montos para Costa Rica (UTC−6 todo el año, sin horario de verano).
export { formatMoney, formatPercent, formatMultiple, toMinor } from '../../shared/finance.js';

export const TZ = 'America/Costa_Rica';
const CR_OFFSET = '-06:00';

const fmt = (opts) => new Intl.DateTimeFormat('es-CR', { timeZone: TZ, ...opts });
const dayKeyFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const timeFmt = fmt({ hour: 'numeric', minute: '2-digit' });

/** AAAA-MM-DD en Costa Rica para un instante. */
export const dayKey = (date = new Date()) => dayKeyFmt.format(new Date(date));
export const todayKey = () => dayKey(new Date());

/** "10:00 a.m." — compacto para columnas angostas. */
export const formatTime = (iso) => timeFmt.format(new Date(iso)).replace(/\s*([ap])\.\s*m\./i, '\u00a0$1.m.');
export const formatDateTime = (iso) => fmt({ weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
export const formatDayLong = (key) => fmt({ weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${key}T12:00:00${CR_OFFSET}`));
export const formatDayShort = (key) => fmt({ weekday: 'short', day: 'numeric' }).format(new Date(`${key}T12:00:00${CR_OFFSET}`));

/** "12 oct" / "12 oct 2025" si no es el año actual. */
export function formatDate(key) {
  if (!key) return '—';
  const d = new Date(`${key.slice(0, 10)}T12:00:00${CR_OFFSET}`);
  const sameYear = key.slice(0, 4) === todayKey().slice(0, 4);
  return fmt({ day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) }).format(d);
}

/** Días entre hoy (CR) y una fecha AAAA-MM-DD: negativo = vencida. */
export function daysUntil(key) {
  if (!key) return null;
  const a = new Date(`${todayKey()}T00:00:00Z`).getTime();
  const b = new Date(`${key.slice(0, 10)}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function dueLabel(key) {
  const d = daysUntil(key);
  if (d == null) return null;
  if (d < 0) return { text: `Vencida hace ${-d} d`, tone: 'red' };
  if (d === 0) return { text: 'Vence hoy', tone: 'amber' };
  if (d === 1) return { text: 'Vence mañana', tone: 'amber' };
  if (d <= 7) return { text: `En ${d} días`, tone: 'blue' };
  return { text: formatDate(key), tone: 'slate' };
}

export function timeAgo(iso) {
  if (!iso) return '';
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'hace un momento';
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  if (d < 30) return `hace ${d} ${d === 1 ? 'día' : 'días'}`;
  return formatDate(dayKey(iso));
}

/** Valor para <input type="datetime-local"> en hora de Costa Rica. */
export function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(new Date(iso).getTime() - 6 * 3_600_000);
  return d.toISOString().slice(0, 16);
}
/** De <input type="datetime-local"> (hora CR) a ISO UTC. */
export const fromLocalInput = (value) => (value ? new Date(`${value}:00${CR_OFFSET}`).toISOString() : null);

/** Minutos desde medianoche en CR (para ubicar citas en la grilla). */
export function minutesOfDay(iso) {
  const d = new Date(new Date(iso).getTime() - 6 * 3_600_000);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

/** Lunes de la semana que contiene la fecha (AAAA-MM-DD). */
export function weekStart(key) {
  const d = new Date(`${key}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7;
  return new Date(d.getTime() - dow * 86_400_000).toISOString().slice(0, 10);
}
export const addDays = (key, n) => new Date(new Date(`${key}T00:00:00Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10);
export const startOfDayIso = (key) => new Date(`${key}T00:00:00${CR_OFFSET}`).toISOString();

export const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

/** Enlace de WhatsApp con mensaje precargado (números de 8 dígitos se asumen de Costa Rica). */
export function whatsappLink(phone, text) {
  let digits = String(phone ?? '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 8) digits = `506${digits}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

/** Descarga un archivo .ics para agregar la cita a Google Calendar / Outlook. */
export function downloadIcs(appointment) {
  const stamp = (iso) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const esc = (s = '') => String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, (c) => `\\${c}`);
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//JC Analytics//Portal//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
    `UID:cita-${appointment.id}@portal.jcanalytic.com`, `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(appointment.starts_at)}`, `DTEND:${stamp(appointment.ends_at)}`, `SUMMARY:${esc(appointment.title)}`,
    appointment.location ? `LOCATION:${esc(appointment.location)}` : null,
    appointment.meeting_url ? `URL:${appointment.meeting_url}` : null,
    `DESCRIPTION:${esc([appointment.notes, appointment.meeting_url, appointment.contact_name && `Contacto: ${appointment.contact_name} ${appointment.contact_phone ?? ''}`].filter(Boolean).join('\n'))}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].filter(Boolean);
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `cita-${appointment.id}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
