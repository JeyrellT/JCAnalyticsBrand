// Ficha de un proyecto para el cliente: estado y fechas, etapas, avances, entregables,
// documentos, reuniones, solicitudes ligadas y el equipo de JC Analytics que lo lleva.
import {
  FolderKanban, Route, PackageCheck, History, Users, CalendarClock, FolderOpen, ClipboardList, Globe, ExternalLink, Plus, Mail,
  MessageCircle,
} from 'lucide-react';
import { useSession, useResource } from '../../lib/session.jsx';
import { Link } from '../../lib/router.jsx';
import { PageHeader, PageLoader, SectionHead, Avatar, Badge } from '../../components/ui.jsx';
import { formatDate, timeAgo, whatsappLink } from '../../lib/format.js';
import {
  BackLink, ProgressRing, ProjectStatusBadge, MilestoneStepper, DeliverableRow, UpdatesTimeline, MeetingRow, DocumentRow, BriefRow,
  ExternalAnchor, StageBar, plural, firstName,
} from '../components.jsx';

/** Una frase tranquila sobre el estado, en lenguaje de cliente. */
function statusHint(p) {
  switch (p.status) {
    case 'en_curso': return 'Tu proyecto avanza. Te contamos cada avance importante.';
    case 'en_revision': return 'Estamos afinando los últimos detalles contigo.';
    case 'entregado': return 'Proyecto entregado. Si necesitás un ajuste, escribinos.';
    case 'soporte': return p.support_ends ? `Soporte incluido hasta el ${formatDate(p.support_ends)}.` : 'Estás en el periodo de soporte incluido.';
    case 'pausado': return 'El proyecto está en pausa. Tu ejecutivo te avisa cuándo retomamos.';
    case 'cerrado': return 'Proyecto finalizado. ¡Gracias por confiar en JC Analytics!';
    default: return null;
  }
}

function Fact({ label, value, hint }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{label}</dt>
      <dd className="mt-1 truncate font-display text-[15px] font-bold text-ink">{value}</dd>
      {hint && <dd className="truncate text-xs text-muted">{hint}</dd>}
    </div>
  );
}

export default function ClientProjectDetail({ params }) {
  const { client } = useSession();
  const { data, error, reload } = useResource(`/api/client/projects/${params.id}`);
  if (!data) return <PageLoader error={error} onRetry={reload} />;

  const { project: p, milestones, updates, deliverables, documents, meetings, briefs } = data;
  const nowIso = new Date().toISOString();
  const upcoming = meetings.filter((m) => m.ends_at >= nowIso && !['cancelada', 'no_asistio'].includes(m.status)).reverse();
  const past = meetings.filter((m) => m.ends_at < nowIso).slice(0, 4);
  const toReview = deliverables.filter((d) => d.status === 'en_revision').length;
  const current = milestones.find((m) => m.status !== 'completado');
  const owner = p.owner;
  const ownerWa = owner?.phone ? whatsappLink(owner.phone, `Hola ${firstName(owner.name)}, te escribo por el proyecto "${p.name}" desde el portal de clientes.`) : null;
  const facts = [
    { label: 'Inicio', value: p.start_date ? formatDate(p.start_date) : 'Por definir' },
    p.delivered_at
      ? { label: 'Entregado', value: formatDate(p.delivered_at) }
      : { label: 'Entrega estimada', value: p.due_date ? formatDate(p.due_date) : 'Por definir' },
    p.support_ends && { label: 'Soporte hasta', value: formatDate(p.support_ends), hint: '30 días incluidos' },
    { label: 'Último avance', value: p.last_update_at ? timeAgo(p.last_update_at) : 'Pronto', hint: p.last_update_at ? null : 'Te contamos en cuanto haya' },
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <PageHeader back={<BackLink to="/cliente/proyectos">Proyectos</BackLink>} eyebrow={p.service_label ?? 'Proyecto'} title={p.name}
        subtitle={p.description} icon={FolderKanban} tone="blue"
        actions={p.url && (
          <ExternalAnchor href={p.url} className="btn btn-outline">
            <Globe className="h-4 w-4" />Ver el resultado<ExternalLink className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
            <span className="sr-only">(se abre en otra pestaña)</span>
          </ExternalAnchor>
        )} />

      {/* Resumen: avance por etapas y fechas clave. */}
      <section className="card animate-rise p-4 sm:p-6" aria-label="Resumen del proyecto">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:gap-8">
          <div className="flex min-w-0 items-center gap-4 lg:w-[46%]">
            <ProgressRing value={p.progress} size={88} stroke={7} />
            <div className="min-w-0 flex-1">
              <ProjectStatusBadge status={p.status} label={p.status_label} />
              <p className="mt-1.5 font-display text-lg font-bold leading-snug text-ink">
                {p.milestones_total ? `${p.milestones_done} de ${plural(p.milestones_total, 'etapa completada', 'etapas completadas')}` : 'Etapas por definir'}
              </p>
              <p className="mt-0.5 text-sm text-muted">{statusHint(p)}</p>
              <StageBar total={p.milestones_total} done={p.milestones_done} currentActive={current?.status === 'en_curso'} className="mt-3 max-w-xs" />
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4 border-t border-line pt-4 sm:grid-cols-4 lg:flex-1 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            {facts.map((f) => <Fact key={f.label} {...f} />)}
          </dl>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <section className="card animate-rise overflow-hidden" aria-labelledby="stages-title">
            <SectionHead flush id="stages-title" icon={Route} tone="blue" title="Etapas del proyecto"
              hint={milestones.length ? (current ? `Ahora: ${current.title}` : 'Todas las etapas completadas') : 'El plan de trabajo, paso a paso'} />
            <div className="px-4 py-5 sm:px-6">
              {milestones.length === 0
                ? <p className="text-sm text-muted">El equipo está definiendo las etapas de este proyecto. Apenas estén, vas a ver aquí cada paso y su fecha prevista.</p>
                : <MilestoneStepper milestones={milestones} />}
            </div>
          </section>

          <section className="card animate-rise overflow-hidden" aria-labelledby="deliverables-title">
            <SectionHead flush id="deliverables-title" icon={PackageCheck} tone="amber" title="Entregables"
              hint={toReview ? `${plural(toReview, 'versión espera', 'versiones esperan')} tu revisión` : 'Versiones compartidas para tu revisión'}
              action={toReview > 0 && <Badge tone="amber">{toReview}</Badge>} />
            {deliverables.length === 0
              ? <p className="px-4 py-5 text-sm text-muted sm:px-5">Cuando el equipo comparta algo para revisar, aparece aquí y te llega un aviso.</p>
              : <ul className="divide-y divide-line">{deliverables.map((d) => <li key={d.id}><DeliverableRow d={d} showProject={false} /></li>)}</ul>}
          </section>

          <section className="card animate-rise overflow-hidden" aria-labelledby="updates-title">
            <SectionHead flush id="updates-title" icon={History} tone="teal" title="Avances" hint={updates.length ? plural(updates.length, 'avance comunicado', 'avances comunicados') : 'Lo que el equipo te ha contado'} />
            {updates.length === 0
              ? <p className="px-4 py-5 text-sm text-muted sm:px-5">Los avances que te comuniquemos quedan registrados aquí.</p>
              : <div className="px-4 py-5 sm:px-5"><UpdatesTimeline updates={updates} /></div>}
          </section>
        </div>

        <aside className="min-w-0 space-y-6" aria-label="Equipo, reuniones, documentos y solicitudes">
          <section className="card animate-rise overflow-hidden" aria-labelledby="team-title">
            <SectionHead flush id="team-title" icon={Users} tone="teal" title="Quién lo lleva" hint="Equipo de JC Analytics en este proyecto" />
            {owner && (
              <div className="border-b border-line p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <Avatar name={owner.name} color="#00a6b2" size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Responsable</p>
                    <p className="truncate font-semibold text-ink">{owner.name}</p>
                  </div>
                </div>
                {(ownerWa || owner.email) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {ownerWa && <a href={ownerWa} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm tap lg:min-h-8"><MessageCircle className="h-3.5 w-3.5 text-teal-ink" />WhatsApp</a>}
                    {owner.email && <a href={`mailto:${owner.email}`} className="btn btn-outline btn-sm tap lg:min-h-8"><Mail className="h-3.5 w-3.5" />Escribir correo</a>}
                  </div>
                )}
              </div>
            )}
            {p.team.filter((m) => m.role !== 'responsable' || m.name !== owner?.name).length > 0 ? (
              <ul className="divide-y divide-line">
                {p.team.filter((m) => m.role !== 'responsable' || m.name !== owner?.name).map((m) => (
                  <li key={`${m.name}-${m.role}`} className="flex min-h-14 items-center gap-3 px-4 py-2.5 sm:px-5">
                    <Avatar name={m.name} color="#5b6b82" size={32} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{m.name}</span>
                    <Badge>{m.role_label}</Badge>
                  </li>
                ))}
              </ul>
            ) : !owner && <p className="px-4 py-5 text-sm text-muted sm:px-5">Pronto te presentamos al equipo de este proyecto.</p>}
          </section>

          <section className="card animate-rise overflow-hidden" aria-labelledby="meetings-title">
            <SectionHead flush id="meetings-title" icon={CalendarClock} tone="teal" title="Reuniones" hint="Hora de Costa Rica" />
            {upcoming.length === 0 && past.length === 0 && <p className="px-4 py-5 text-sm text-muted sm:px-5">No hay reuniones de este proyecto por ahora.</p>}
            {upcoming.length > 0 && <ul className="divide-y divide-line">{upcoming.map((m) => <MeetingRow key={m.id} m={m} />)}</ul>}
            {past.length > 0 && (
              <>
                <p className="border-t border-line bg-surface-2/60 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted sm:px-5">Anteriores</p>
                <ul className="divide-y divide-line">{past.map((m) => <MeetingRow key={m.id} m={m} past />)}</ul>
              </>
            )}
          </section>

          <section className="card animate-rise overflow-hidden" aria-labelledby="docs-title">
            <SectionHead flush id="docs-title" icon={FolderOpen} tone="violet" title="Documentos" hint={documents.length ? plural(documents.length, 'documento', 'documentos') : 'Contratos, reportes y recursos'} />
            {documents.length === 0
              ? <p className="px-4 py-5 text-sm text-muted sm:px-5">Los documentos de este proyecto van a aparecer aquí. <Link to="/cliente/documentos" className="link">Ver todos tus documentos</Link></p>
              : <ul className="divide-y divide-line">{documents.map((doc) => <li key={doc.id}><DocumentRow doc={doc} showCategory showProject={false} /></li>)}</ul>}
          </section>

          <section className="card animate-rise overflow-hidden" aria-labelledby="project-briefs-title">
            <SectionHead flush id="project-briefs-title" icon={ClipboardList} tone="violet" title="Solicitudes" hint="Pedidos ligados a este proyecto" />
            {briefs.length > 0 && <ul className="divide-y divide-line">{briefs.map((b) => <li key={b.id}><BriefRow b={b} hint={`${b.code} · ${b.status_label}`} /></li>)}</ul>}
            <div className={briefs.length ? 'border-t border-line bg-surface-2/50 p-3 sm:px-5' : 'px-4 py-5 sm:px-5'}>
              {briefs.length === 0 && <p className="mb-3 text-sm text-muted">¿Necesitás algo nuevo para {client?.name ?? 'tu empresa'}? Contanos en una solicitud.</p>}
              <Link to="/cliente/solicitudes/nueva" className="btn btn-soft tap w-full sm:w-auto"><Plus className="h-4 w-4" />Nueva solicitud</Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
