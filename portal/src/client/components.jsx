// Piezas del portal de clientes (v5): etapas, entregables, reuniones, avances y contacto.
// Lenguaje de cliente, sin jerga interna. Todo color pasa por tokens (claro y oscuro).
import { createContext, useContext } from 'react';
import {
  Check, ArrowLeft, MapPin, Video, CalendarPlus, MessageCircle, Mail, Eye, CircleCheck, PenLine, ClipboardList,
  ExternalLink, UserRound, ChevronRight, FileSignature, Receipt, ChartColumn, BookOpen, Palette, FileText,
} from 'lucide-react';
import { Link } from '../lib/router.jsx';
import { Badge, IconTile, Avatar, RowArrow, cx } from '../components/ui.jsx';
import { TZ, dayKey, formatTime, formatDate, formatDateTime, daysUntil, whatsappLink, downloadIcs } from '../lib/format.js';
import { CLIENT_PROJECT_STATUS, MILESTONE_STATUS, DELIVERABLE_STATUS, DOCUMENT_CATEGORIES } from '../../shared/client-portal.js';
import { BRIEF_STATUS } from '../../shared/brief.js';
import { APPOINTMENT_KINDS, APPOINTMENT_STATUS, UPDATE_CHANNELS } from '../../shared/catalog.js';

// ── Contadores compartidos por la cáscara (entregables por revisar) ─────────
export const ClientCountsContext = createContext({ approvals: 0, refreshCounts: () => {} });
export const useClientCounts = () => useContext(ClientCountsContext);

// ── Utilidades ──────────────────────────────────────────────────────────────
/** Solo enlaces http(s): defensa extra aunque el servidor ya los valida. */
export const safeHref = (url) => (typeof url === 'string' && /^https?:\/\//i.test(url.trim()) ? url.trim() : null);

export const firstName = (name = '') => name.trim().split(/\s+/)[0] ?? '';

export function greeting() {
  const h = Number(new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', hourCycle: 'h23' }).format(new Date()));
  return h < 12 ? 'Buenos días' : h < 18 ? 'Buenas tardes' : 'Buenas noches';
}

export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** Fecha de un instante en Costa Rica ("12 oct"). */
export const dateOf = (iso) => (iso ? formatDate(dayKey(iso)) : '—');

const weekdayFmt = new Intl.DateTimeFormat('es-CR', { timeZone: TZ, weekday: 'short' });
const monthFmt = new Intl.DateTimeFormat('es-CR', { timeZone: TZ, month: 'short' });
const dayNumFmt = new Intl.DateTimeFormat('es-CR', { timeZone: TZ, day: 'numeric' });
const longDayFmt = new Intl.DateTimeFormat('es-CR', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' });

/** "Hoy", "Mañana" o "jueves 16 de octubre" para una reunión (hora de Costa Rica). */
export function meetingDay(iso) {
  const d = daysUntil(dayKey(iso));
  if (d === 0) return 'Hoy';
  if (d === 1) return 'Mañana';
  const text = longDayFmt.format(new Date(iso)).replace(',', '');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Enlace externo seguro (pestaña nueva, sin opener). Sin URL válida no se muestra. */
export function ExternalAnchor({ href, className, children, ...props }) {
  const url = safeHref(href);
  if (!url) return null;
  return <a href={url} target="_blank" rel="noopener noreferrer" className={className} {...props}>{children}</a>;
}

/** Volver a la sección (va dentro de PageHeader.back). */
export function BackLink({ to, children }) {
  return (
    <Link to={to} className="tap -ml-2 mb-1 inline-flex items-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-muted transition hover:bg-surface-3 hover:text-ink lg:min-h-9">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />{children}
    </Link>
  );
}

// ── Indicadores ─────────────────────────────────────────────────────────────
const KPI_TEXT = { blue: 'text-brand-ink', teal: 'text-teal-ink', amber: 'text-amber-ink', violet: 'text-violet-ink', red: 'text-coral-ink', slate: 'text-ink' };
const KPI_BAR = { blue: 'bg-brand', teal: 'bg-teal', amber: 'bg-amber', violet: 'bg-violet', red: 'bg-coral', slate: 'bg-slate' };

/** Mosaico de indicador enlazado (como Stat, pero con el router del portal); con onClick es un botón. */
export function KpiTile({ to, onClick, icon, label, value, hint, tone = 'blue' }) {
  const className = 'card card-hover relative flex min-h-[112px] min-w-0 flex-col justify-between gap-2 overflow-hidden p-3.5 text-left sm:p-4';
  const body = (
    <>
      <span className="flex items-start justify-between gap-2">
        <span className="pt-0.5 text-[12px] font-semibold leading-tight text-muted sm:text-[11px] sm:font-bold sm:uppercase sm:tracking-[0.12em]">{label}</span>
        <IconTile icon={icon} tone={tone} size="sm" />
      </span>
      <span className={cx('font-display text-[28px] font-bold leading-none tabular-nums', KPI_TEXT[tone])}>{value}</span>
      <span className="truncate text-xs text-muted">{hint}</span>
      <span className={cx('absolute inset-x-0 bottom-0 h-[3px] opacity-70', KPI_BAR[tone])} aria-hidden="true" />
    </>
  );
  if (!to) return <button type="button" onClick={onClick} className={className}>{body}</button>;
  return <Link to={to} className={className}>{body}</Link>;
}

// ── Avance de un proyecto ───────────────────────────────────────────────────
/** Anillo de avance (etapas completadas). value: 0..1 o null (sin etapas). */
export function ProgressRing({ value, size = 56, stroke = 5, className }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = value == null ? null : Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <span className={cx('relative inline-flex shrink-0 items-center justify-center', className)} style={{ width: size, height: size }}
      role="img" aria-label={pct == null ? 'Etapas por definir' : `Avance ${pct} %`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} stroke="currentColor" className="text-surface-3" />
        {pct != null && pct > 0 && (
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} stroke="currentColor" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} className={cx('transition-[stroke-dashoffset] duration-700 ease-out', pct === 100 ? 'text-teal' : 'text-brand')} />
        )}
      </svg>
      <span className="absolute font-display text-[13px] font-bold tabular-nums text-ink">{pct == null ? '—' : `${pct}%`}</span>
    </span>
  );
}

/** Barra segmentada: una pieza por etapa (completadas, la actual y las que faltan). */
export function StageBar({ total, done, currentActive = false, className }) {
  if (!total) return null;
  return (
    <div className={cx('flex gap-1', className)} aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={cx('h-1.5 flex-1 rounded-full', i < done ? 'bg-teal' : i === done && currentActive ? 'bg-brand' : 'bg-surface-3')} />
      ))}
    </div>
  );
}

/** Texto de la etapa actual de un proyecto (para tarjetas). */
export function stageSummary(p) {
  if (!p.milestones_total) return { label: 'Etapas', title: 'El equipo está definiendo las etapas', meta: null };
  if (!p.next_milestone) return { label: 'Etapas', title: 'Todas las etapas completadas', meta: `${p.milestones_done} de ${p.milestones_total} etapas` };
  const m = p.next_milestone;
  const label = m.status === 'en_curso' ? 'Etapa actual' : 'Próxima etapa';
  const meta = [`${p.milestones_done} de ${p.milestones_total} etapas`, m.due_date && `prevista para el ${formatDate(m.due_date)}`].filter(Boolean).join(' · ');
  return { label, title: m.title, meta };
}

export function ProjectStatusBadge({ status, label }) {
  const meta = CLIENT_PROJECT_STATUS[status];
  return <Badge tone={meta?.tone ?? 'slate'} dot>{label ?? meta?.label ?? status}</Badge>;
}

/** Tarjeta de proyecto: estado, anillo de avance, etapa actual y responsable. */
export function ProjectCard({ project: p, showDescription = false }) {
  const stage = stageSummary(p);
  const done = p.milestones_total > 0 && !p.next_milestone;
  return (
    <Link to={`/cliente/proyectos/${p.id}`} className="card card-hover group flex min-w-0 flex-col gap-4 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="eyebrow truncate">{p.service_label ?? 'Proyecto'}</p>
          <h3 className="mt-1 font-display text-[18px] font-bold leading-snug text-ink">{p.name}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <ProjectStatusBadge status={p.status} label={p.status_label} />
            {p.due_date && !p.delivered_at && <span className="text-xs text-muted">Entrega estimada {formatDate(p.due_date)}</span>}
            {p.delivered_at && <span className="text-xs text-muted">Entregado el {formatDate(p.delivered_at)}</span>}
          </div>
        </div>
        <ProgressRing value={p.progress} />
      </div>
      {showDescription && p.description && <p className="line-clamp-2 text-sm text-muted">{p.description}</p>}
      <div className="rounded-xl bg-surface-2 px-3.5 py-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{stage.label}</p>
        <p className={cx('mt-0.5 text-sm font-semibold', done ? 'text-teal-ink' : 'text-ink')}>{stage.title}</p>
        {stage.meta && <p className="mt-0.5 text-xs text-muted">{stage.meta}</p>}
        <StageBar total={p.milestones_total} done={p.milestones_done} currentActive={p.next_milestone?.status === 'en_curso'} className="mt-2.5" />
      </div>
      <div className="mt-auto flex items-center gap-2.5 text-xs text-muted">
        {p.owner ? (
          <>
            <Avatar name={p.owner.name} color="#00a6b2" size={26} />
            <span className="min-w-0 flex-1 truncate">Responsable: <span className="font-semibold text-ink">{p.owner.name}</span></span>
          </>
        ) : <span className="flex-1">Equipo de JC Analytics</span>}
        <RowArrow />
      </div>
    </Link>
  );
}

// ── Etapas (línea vertical) ─────────────────────────────────────────────────
export function MilestoneStepper({ milestones }) {
  return (
    <ol className="space-y-0" aria-label="Etapas del proyecto">
      {milestones.map((m, i) => {
        const last = i === milestones.length - 1;
        const doneStep = m.status === 'completado';
        const current = m.status === 'en_curso';
        const meta = MILESTONE_STATUS[m.status] ?? MILESTONE_STATUS.pendiente;
        const when = doneStep
          ? `Completada el ${dateOf(m.completed_at)}`
          : m.due_date ? `Prevista para el ${formatDate(m.due_date)}` : 'Fecha por definir';
        return (
          <li key={m.id} className={cx('relative flex gap-4', !last && 'pb-6')} aria-current={current ? 'step' : undefined}>
            {!last && <span className={cx('absolute bottom-0 left-[15px] top-9 w-0.5 rounded-full', doneStep ? 'bg-teal' : 'bg-line')} aria-hidden="true" />}
            <span className={cx('relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums',
              doneStep ? 'bg-[var(--accent-teal)] text-[var(--accent-teal-fg)]'
                : current ? 'bg-brand-soft text-brand-ink ring-2 ring-brand'
                  : 'bg-surface-2 text-muted ring-1 ring-line-strong')} aria-hidden="true">
              {doneStep ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
              {current && <span className="pulse-dot absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-teal ring-2 ring-surface" />}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className={cx('font-semibold leading-snug', doneStep ? 'text-ink-2' : 'text-ink')}>{m.title}</p>
                <Badge tone={meta.tone}>{meta.label}</Badge>
              </div>
              <p className="mt-0.5 text-xs text-muted">{when}</p>
              {m.description && <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{m.description}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// ── Entregables ─────────────────────────────────────────────────────────────
export const DELIVERABLE_ICON = { en_revision: Eye, aprobado: CircleCheck, cambios: PenLine };

export function DeliverableStatusBadge({ status }) {
  const meta = DELIVERABLE_STATUS[status];
  if (!meta) return null;
  return <Badge tone={meta.tone} dot>{meta.label}</Badge>;
}

/** Fila de entregable enlazada a su detalle. */
export function DeliverableRow({ d, showProject = true }) {
  const meta = DELIVERABLE_STATUS[d.status] ?? DELIVERABLE_STATUS.en_revision;
  const detail = [showProject && d.project_name, `Versión ${d.version}`, d.status === 'en_revision' ? `compartido ${dateOf(d.shared_at)}` : d.decided_at && `${d.status === 'aprobado' ? 'aprobado' : 'pedido'} ${dateOf(d.decided_at)}`]
    .filter(Boolean).join(' · ');
  return (
    <Link to={`/cliente/entregables/${d.id}`} className="group row min-h-[64px] px-4 py-3 sm:px-5">
      <IconTile icon={DELIVERABLE_ICON[d.status] ?? Eye} tone={meta.tone} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink">{d.title}</span>
        <span className="block truncate text-xs text-muted">{detail}</span>
      </span>
      <span className="hidden sm:inline-flex"><DeliverableStatusBadge status={d.status} /></span>
      <RowArrow />
    </Link>
  );
}

// ── Solicitudes (briefs) ────────────────────────────────────────────────────
export function BriefStatusBadge({ status }) {
  const meta = BRIEF_STATUS[status];
  if (!meta) return null;
  return <Badge tone={meta.tone} dot>{meta.label}</Badge>;
}

export function BriefRow({ b, hint }) {
  const meta = BRIEF_STATUS[b.status] ?? BRIEF_STATUS.borrador;
  return (
    <Link to={`/cliente/solicitudes/${b.id}`} className="group row min-h-[64px] px-4 py-3 sm:px-5">
      <IconTile icon={ClipboardList} tone={meta.tone} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink">{b.title}</span>
        <span className="block truncate text-xs text-muted">{hint ?? [b.code, meta.hint].filter(Boolean).join(' · ')}</span>
      </span>
      <span className="hidden sm:inline-flex"><BriefStatusBadge status={b.status} /></span>
      <RowArrow />
    </Link>
  );
}

// ── Documentos ──────────────────────────────────────────────────────────────
export const DOCUMENT_ICON = { contrato: FileSignature, facturacion: Receipt, reporte: ChartColumn, manual: BookOpen, marca: Palette, otro: FileText };

/** Documento compartido: se abre en otra pestaña (solo enlaces http/https). */
export function DocumentRow({ doc, showCategory = false, showProject = true }) {
  const meta = DOCUMENT_CATEGORIES[doc.category] ?? DOCUMENT_CATEGORIES.otro;
  const href = safeHref(doc.url);
  const detail = [showCategory && meta.label, showProject && doc.project_name, `Compartido ${dateOf(doc.created_at)}`].filter(Boolean).join(' · ');
  const body = (
    <>
      <IconTile icon={DOCUMENT_ICON[doc.category] ?? FileText} tone={meta.tone} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink">{doc.title}</span>
        {doc.note && <span className="block truncate text-xs text-ink-2">{doc.note}</span>}
        <span className="block truncate text-xs text-muted">{detail}</span>
      </span>
    </>
  );
  if (!href) return <div className="row min-h-16 px-4 py-3 sm:px-5">{body}<span className="text-xs text-muted">Sin enlace</span></div>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="group row min-h-16 px-4 py-3 sm:px-5">
      {body}
      <span className="hidden text-xs font-semibold text-brand-ink sm:inline">Abrir</span>
      <ExternalLink className="h-4 w-4 shrink-0 text-muted-2 transition group-hover:text-brand-ink" aria-hidden="true" />
      <span className="sr-only">(se abre en otra pestaña)</span>
    </a>
  );
}

// ── Reuniones ───────────────────────────────────────────────────────────────
function DateTile({ iso }) {
  const d = daysUntil(dayKey(iso));
  const soon = d === 0 || d === 1;
  return (
    <span className={cx('flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl', soon ? 'bg-brand-soft text-brand-ink' : 'bg-surface-2 text-ink')} aria-hidden="true">
      <span className={cx('text-[10px] font-bold uppercase leading-none tracking-wide', soon ? 'text-brand-ink' : 'text-muted')}>{d === 0 ? 'Hoy' : weekdayFmt.format(new Date(iso)).replace('.', '')}</span>
      <span className="mt-1 font-display text-xl font-bold leading-none tabular-nums">{dayNumFmt.format(new Date(iso))}</span>
      <span className={cx('mt-0.5 text-[10px] font-semibold uppercase leading-none', soon ? 'text-brand-ink' : 'text-muted')}>{monthFmt.format(new Date(iso)).replace('.', '')}</span>
    </span>
  );
}

/** Reunión con el cliente: día y hora de Costa Rica, tipo, lugar o enlace. */
export function MeetingRow({ m, showProject = false, past = false }) {
  const kind = APPOINTMENT_KINDS[m.kind];
  const status = APPOINTMENT_STATUS[m.status];
  const join = safeHref(m.meeting_url);
  const showStatus = status && (past || m.status !== 'programada');
  return (
    <li className={cx('flex gap-3.5 px-4 py-3.5 sm:px-5', past && 'opacity-80')}>
      <DateTile iso={m.starts_at} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="min-w-0 truncate text-sm font-semibold text-ink">{m.title}</p>
          {showStatus && <Badge tone={status.tone}>{status.label}</Badge>}
        </div>
        <p className="mt-0.5 text-xs text-muted">
          <span className="font-semibold text-ink-2">{meetingDay(m.starts_at)}</span> · {formatTime(m.starts_at)} – {formatTime(m.ends_at)}
          {kind && <> · {kind.label}</>}
        </p>
        {showProject && m.project_name && <p className="mt-0.5 truncate text-xs text-muted">{m.project_name}</p>}
        {m.location && <p className="mt-1 flex items-start gap-1.5 text-xs text-muted"><MapPin className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" /><span className="min-w-0">{m.location}</span></p>}
        {!past && (
          <div className="mt-2.5 flex flex-wrap gap-2">
            {join && <a href={join} target="_blank" rel="noopener noreferrer" className="btn btn-soft btn-sm tap lg:min-h-8"><Video className="h-3.5 w-3.5" />Unirse a la reunión</a>}
            <button type="button" className="btn btn-ghost btn-sm tap text-muted lg:min-h-8" onClick={() => downloadIcs(m)}>
              <CalendarPlus className="h-3.5 w-3.5" />Agregar al calendario
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

// ── Avances ─────────────────────────────────────────────────────────────────
/** Línea de tiempo de avances que el equipo comunicó. */
export function UpdatesTimeline({ updates, showProject = false }) {
  return (
    <ol className="relative">
      {updates.map((u, i) => (
        <li key={u.id} className={cx('relative pl-7', i < updates.length - 1 && 'pb-5')}>
          {i < updates.length - 1 && <span className="absolute bottom-0 left-[7px] top-5 w-px bg-line" aria-hidden="true" />}
          <span className={cx('absolute left-0 top-1 h-[15px] w-[15px] rounded-full ring-4 ring-surface', i === 0 ? 'bg-teal' : 'bg-line-strong')} aria-hidden="true" />
          <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted">
            <span className="font-semibold text-ink">{u.author_name}</span>
            <span aria-hidden="true">·</span>
            <span className="first-letter:uppercase">{formatDateTime(u.created_at)}</span>
            {UPDATE_CHANNELS[u.channel] && u.channel !== 'otro' && <Badge className="ml-0.5">{`Por ${UPDATE_CHANNELS[u.channel]}`}</Badge>}
          </p>
          {showProject && u.project_name && <p className="mt-0.5 truncate text-xs font-semibold text-brand-ink">{u.project_name}</p>}
          <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink-2">{u.note}</p>
        </li>
      ))}
    </ol>
  );
}

// ── Contacto del ejecutivo ──────────────────────────────────────────────────
/** Tarjeta "Tu ejecutivo de cuenta": nombre, WhatsApp y correo. */
export function ContactCard({ contact, clientName, title = 'Tu ejecutivo de cuenta', className }) {
  const wa = contact?.phone ? whatsappLink(contact.phone, `Hola ${firstName(contact.name)}, te escribo desde el portal de clientes${clientName ? ` de ${clientName}` : ''}.`) : null;
  return (
    <section className={cx('card overflow-hidden', className)} aria-labelledby="contact-title">
      <div className="flex items-center gap-3.5 p-4 sm:p-5">
        {contact ? <Avatar name={contact.name} color="#00a6b2" size={48} /> : <IconTile icon={UserRound} tone="teal" size="lg" />}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted" id="contact-title">{title}</p>
          <p className="mt-0.5 truncate font-display text-[17px] font-bold text-ink">{contact?.name ?? 'Equipo JC Analytics'}</p>
          <p className="truncate text-xs text-muted">{contact ? 'Tu contacto directo en JC Analytics' : 'Te asignamos un ejecutivo muy pronto'}</p>
        </div>
      </div>
      {contact && (wa || contact.email) && (
        <div className="grid gap-2 border-t border-line bg-surface-2/50 p-3 sm:grid-cols-2 sm:p-4">
          {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-teal tap"><MessageCircle className="h-4 w-4" />WhatsApp</a>}
          {contact.email && (
            <a href={`mailto:${contact.email}`} className={cx('btn btn-outline tap min-w-0', !wa && 'sm:col-span-2')}>
              <Mail className="h-4 w-4 shrink-0" /><span className="truncate">{wa ? 'Correo' : contact.email}</span>
            </a>
          )}
        </div>
      )}
    </section>
  );
}

/** Enlace "ver todo" para el encabezado de una sección. */
export function SeeAll({ to, children }) {
  return (
    <Link to={to} className="link tap -my-2 flex items-center gap-0.5 text-sm lg:min-h-9">
      {children}<ChevronRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}
