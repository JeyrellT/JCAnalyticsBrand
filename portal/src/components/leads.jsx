// Piezas compartidas de Consultas y Tráfico: estado, nombres de las secciones del
// sitio y el recorrido de una visita. Todo texto del visitante se pinta como texto.
import { Eye, MousePointerClick, ArrowDownToLine, Timer, PenLine, Send, Inbox } from 'lucide-react';
import { Badge, cx } from './ui.jsx';
import { LEAD_STATUS, CLICK_KINDS, DEVICES } from '../../shared/leads.js';

export function LeadStatusBadge({ status }) {
  const s = LEAD_STATUS[status] ?? { label: status, tone: 'slate' };
  return <Badge tone={s.tone} dot>{s.label}</Badge>;
}

/** Secciones de jcanalytic.com (ids de los <section>) en palabras del equipo. */
export const SITE_SECTIONS = {
  top: 'Portada', paquetes: 'Paquetes y precios', trabajo: 'Proyectos reales', plataformas: 'Sistemas', finanzas: 'Finanzas y BI',
  inteligencia: 'IA y machine learning', servicios: 'Servicios', redes: 'Marketing', equipo: 'Equipo', proceso: 'Proceso',
  ideas: 'Ideas (blog)', cotizar: 'Cotizador', preguntas: 'Preguntas frecuentes', contacto: 'Contacto', 'practical-tool': 'Herramienta del artículo',
};
export const sectionName = (id) => SITE_SECTIONS[id] ?? (id ? id.replace(/-/g, ' ') : 'Sin sección');
export const FORM_NAMES = { contacto: 'Formulario de contacto', devolucion: 'Que me contacten', cotizar: 'Cotizador' };
export const formName = (id) => FORM_NAMES[id] ?? id;
export const clickKind = (k) => CLICK_KINDS[k]?.label ?? 'Botón';
export const deviceName = (d) => DEVICES[d] ?? 'Sin dato';

/** Duración corta: 42 s · 3 min 5 s · 1 h 2 min. */
export function formatDuration(ms) {
  const s = Math.round((ms ?? 0) / 1000);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return s % 60 ? `${m} min ${s % 60} s` : `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}
export const percent = (v) => `${Math.round((v ?? 0) * 100)} %`;

const JOURNEY = {
  view: { icon: Eye, tone: 'blue', text: (e) => `Abrió ${e.path === '/' ? 'la portada' : e.path}` },
  section: { icon: Timer, tone: 'violet', text: (e) => `${formatDuration(e.value)} en ${sectionName(e.section)}` },
  scroll: { icon: ArrowDownToLine, tone: 'slate', text: (e) => `Bajó hasta el ${e.value} % de la página` },
  click: { icon: MousePointerClick, tone: 'amber', text: (e) => `Tocó ${clickKind(e.target).toLowerCase()}${e.label ? `: “${e.label}”` : ''}` },
  form_start: { icon: PenLine, tone: 'teal', text: (e) => `Empezó: ${formName(e.target)}` },
  form_submit: { icon: Send, tone: 'teal', text: (e) => `Envió: ${formName(e.target)}` },
  lead: { icon: Inbox, tone: 'teal', text: () => 'Dejó sus datos (llegó al portal)' },
};

/** Recorrido de la visita que terminó en la consulta, sin repetir secciones seguidas. */
export function Journey({ events }) {
  if (!events?.length) return <p className="px-4 py-4 text-sm text-muted sm:px-5">Sin recorrido registrado: la persona tenía la medición desactivada o llegó antes de activarla.</p>;
  return (
    <ol className="space-y-0.5 px-4 py-3 sm:px-5">
      {events.map((e, i) => {
        const meta = JOURNEY[e.type] ?? JOURNEY.view;
        const Icon = meta.icon;
        return (
          <li key={i} className="flex items-start gap-3 py-1.5 text-sm">
            <span className={cx('mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full', `tone-${meta.tone}`)}><Icon className="h-3.5 w-3.5" aria-hidden="true" /></span>
            <span className="min-w-0 flex-1 break-words text-ink-2">{meta.text(e)}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** Celda segura para CSV/Excel: comillas escapadas y fórmulas desactivadas (= + - @ al inicio). */
export function csvCell(value) {
  let v = String(value ?? '').replace(/\r?\n/g, ' ');
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`;
  return /[;"]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}
