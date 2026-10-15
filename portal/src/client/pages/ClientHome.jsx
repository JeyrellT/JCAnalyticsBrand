// Inicio del portal de clientes: el estado del servicio con JC Analytics de un vistazo.
// Sin micro-gestión: etapas, lo que espera una respuesta del cliente, reuniones, avances y su contacto.
import {
  FolderKanban, PackageCheck, ClipboardList, CalendarClock, Sparkles, Plus, FolderOpen, BellRing, History, PenLine, FilePen,
  Eye, ArrowRight,
} from 'lucide-react';
import { useSession, useResource } from '../../lib/session.jsx';
import { Link } from '../../lib/router.jsx';
import { PageLoader, EmptyState, IconTile, SectionHead, Badge, RowArrow, cx } from '../../components/ui.jsx';
import { formatDayLong, todayKey } from '../../lib/format.js';
import {
  KpiTile, ProjectCard, MeetingRow, UpdatesTimeline, ContactCard, BriefRow, SeeAll, greeting, firstName, plural, dateOf,
} from '../components.jsx';

const STRIPE = { amber: 'bg-amber', violet: 'bg-violet', slate: 'bg-slate' };

/** Fila de "Requiere tu atención": franja de tono, ícono, contexto y la acción esperada. */
function AttentionRow({ to, icon, tone, title, detail, cta }) {
  return (
    <Link to={to} className="group row relative min-h-[68px] px-4 py-3 pl-5 sm:px-5 sm:pl-6">
      <span className={cx('absolute inset-y-2 left-0 w-1 rounded-r-full', STRIPE[tone] ?? 'bg-brand')} aria-hidden="true" />
      <IconTile icon={icon} tone={tone} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink">{title}</span>
        <span className="block truncate text-xs text-muted">{detail}</span>
      </span>
      <span className="hidden shrink-0 items-center gap-1 rounded-full bg-brand-soft px-3 py-1.5 text-xs font-semibold text-brand-ink transition group-hover:bg-brand/15 sm:inline-flex">
        {cta}<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      <RowArrow className="sm:hidden" />
    </Link>
  );
}

function statusLine({ approvals, toFix, drafts, canApprove, hasProjects }) {
  if (approvals) {
    return canApprove
      ? `Tenés ${plural(approvals, 'entregable esperando', 'entregables esperando')} tu revisión.`
      : `${plural(approvals, 'entregable espera', 'entregables esperan')} la aprobación de tu empresa.`;
  }
  if (toFix) return `JC Analytics te dejó observaciones en ${plural(toFix, 'solicitud', 'solicitudes')}.`;
  if (drafts) return `Tenés ${plural(drafts, 'borrador', 'borradores')} de solicitud sin enviar.`;
  return hasProjects ? 'Nada pendiente de tu parte. Tu proyecto avanza.' : 'Nada pendiente de tu parte.';
}

export default function ClientHome() {
  const { account, client, contact, today } = useSession();
  const { data, error, reload } = useResource('/api/client/overview');
  if (!data) return <PageLoader error={error} onRetry={reload} />;

  const { kpis, projects, approvals, briefs, meetings, updates, documents_count: docs } = data;
  const companyName = data.client?.name ?? client?.name;
  const canApprove = !!account.can_approve;
  const toFix = briefs.filter((b) => b.status === 'observado');
  const drafts = briefs.filter((b) => b.status === 'borrador');
  const inProgress = briefs.filter((b) => b.status !== 'observado' && b.status !== 'borrador');
  const attention = kpis.pending_approvals + toFix.length + drafts.length;
  const pending = statusLine({ approvals: kpis.pending_approvals, toFix: toFix.length, drafts: drafts.length, canApprove, hasProjects: projects.length > 0 });
  const manyProjects = new Set(updates.map((u) => u.project_id)).size > 1;
  const scrollToMeetings = () => document.getElementById('reuniones')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="space-y-6">
      {/* Bienvenida: momento de marca, con el estado en una frase y la acción principal. */}
      <section className="card-panel animate-rise p-5 sm:p-7 lg:p-8" aria-labelledby="home-title">
        <div className="grid-dots-light absolute inset-0 opacity-40 [mask-image:radial-gradient(60%_90%_at_85%_0%,black,transparent)]" aria-hidden="true" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 max-w-2xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-teal first-letter:uppercase">{formatDayLong(today ?? todayKey())}</p>
            <h1 id="home-title" className="mt-2 font-display text-[28px] font-bold leading-tight text-white sm:text-[36px]">{greeting()}, {firstName(account.name)}</h1>
            <p className="mt-1.5 text-[15px] leading-relaxed text-white/75">Así avanza el trabajo de JC Analytics con <span className="font-semibold text-white">{companyName}</span>.</p>
            <p className={cx('mt-4 inline-flex items-start gap-2 rounded-xl bg-white/[0.08] px-3 py-2 text-sm font-medium text-white/90', attention && 'ring-1 ring-amber/50')}>
              {attention ? <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-amber" aria-hidden="true" /> : <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-teal" aria-hidden="true" />}
              {pending}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
            <Link to="/cliente/solicitudes/nueva" className="btn btn-lg bg-white text-panel shadow-raised hover:bg-white/90">
              <Plus className="h-5 w-5 text-brand" strokeWidth={2.5} />Nueva solicitud
            </Link>
            {approvals.length > 0 && (
              <Link to={`/cliente/entregables/${approvals[0].id}`} className="btn btn-lg border border-white/15 bg-white/10 text-white hover:bg-white/15">
                <Eye className="h-5 w-5" />Revisar entregable
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="stagger grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4" aria-label="Resumen">
        <KpiTile to="/cliente/proyectos" icon={FolderKanban} tone="blue" label="Proyectos activos" value={kpis.active_projects}
          hint={kpis.active_projects ? 'En marcha' : 'Sin proyectos activos'} />
        <KpiTile to="/cliente/entregables" icon={PackageCheck} tone={kpis.pending_approvals ? 'amber' : 'teal'} label="Por aprobar" value={kpis.pending_approvals}
          hint={kpis.pending_approvals ? (canApprove ? 'Esperan tu revisión' : 'Esperan aprobación') : 'Nada pendiente'} />
        <KpiTile to="/cliente/solicitudes" icon={ClipboardList} tone="violet" label="Solicitudes abiertas" value={kpis.open_briefs}
          hint={kpis.open_briefs ? 'En curso con el equipo' : 'Pedí algo cuando quieras'} />
        <KpiTile onClick={scrollToMeetings} icon={CalendarClock} tone="teal" label="Próximas reuniones" value={kpis.upcoming_meetings}
          hint={meetings.upcoming[0] ? `La próxima: ${dateOf(meetings.upcoming[0].starts_at)}` : 'Ninguna agendada'} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <section className="card animate-rise overflow-hidden" aria-labelledby="attention-title">
            <SectionHead flush id="attention-title" icon={attention ? BellRing : Sparkles} tone={attention ? 'amber' : 'teal'} title="Requiere tu atención"
              hint={attention ? 'Lo que espera una respuesta de tu parte' : 'Te avisamos cuando haya algo para revisar'}
              action={attention > 0 && <Badge tone="amber">{attention}</Badge>} />
            {attention === 0 ? (
              <div className="flex items-start gap-3 px-4 py-5 sm:px-5">
                <IconTile icon={Sparkles} tone="teal" />
                <div className="min-w-0">
                  <p className="font-semibold text-teal-ink">Nada pendiente de tu parte</p>
                  <p className="mt-0.5 text-sm text-muted">El equipo sigue avanzando. Cuando haya un entregable para revisar, aparece aquí y te llega un aviso.</p>
                </div>
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {approvals.map((d) => (
                  <li key={`d${d.id}`}>
                    <AttentionRow to={`/cliente/entregables/${d.id}`} icon={PackageCheck} tone="amber" title={d.title}
                      detail={[d.project_name, `Versión ${d.version}`, `compartido ${dateOf(d.shared_at)}`].filter(Boolean).join(' · ')}
                      cta={canApprove ? 'Revisar y aprobar' : 'Ver entregable'} />
                  </li>
                ))}
                {toFix.map((b) => (
                  <li key={`b${b.id}`}>
                    <AttentionRow to={`/cliente/solicitudes/${b.id}`} icon={PenLine} tone="amber" title={b.title}
                      detail={`${b.code} · JC Analytics te pidió algunos ajustes`} cta="Ajustar" />
                  </li>
                ))}
                {drafts.map((b) => (
                  <li key={`b${b.id}`}>
                    <AttentionRow to={`/cliente/solicitudes/${b.id}`} icon={FilePen} tone="slate" title={b.title}
                      detail={`${b.code} · Borrador sin enviar · ${b.completeness?.pct ?? 0} % completo`} cta="Continuar" />
                  </li>
                ))}
              </ul>
            )}
            {kpis.pending_approvals > approvals.length && (
              <Link to="/cliente/entregables" className="tap flex items-center justify-center gap-1.5 border-t border-line bg-surface-2/60 px-4 py-3 text-sm font-semibold text-brand-ink">
                Ver los {kpis.pending_approvals} entregables por revisar<ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </section>

          <section aria-labelledby="projects-title" className="animate-rise">
            <div className="section-head mb-3">
              <div className="flex items-center gap-3">
                <IconTile icon={FolderKanban} tone="blue" size="sm" />
                <h2 id="projects-title" className="section-title">Tus proyectos</h2>
              </div>
              {projects.length > 0 && <SeeAll to="/cliente/proyectos">Ver todos</SeeAll>}
            </div>
            {projects.length === 0 ? (
              <EmptyState icon={FolderKanban} title="Todavía no hay proyectos activos"
                action={<Link to="/cliente/solicitudes/nueva" className="btn btn-primary"><Plus className="h-4 w-4" />Nueva solicitud</Link>}>
                Cuando arranquemos un proyecto juntos, vas a ver aquí cada etapa y cómo avanza.
              </EmptyState>
            ) : (
              <div className={cx('stagger grid gap-3 sm:gap-4', projects.length > 1 && 'md:grid-cols-2')}>
                {projects.map((p) => <ProjectCard key={p.id} project={p} showDescription={projects.length === 1} />)}
              </div>
            )}
          </section>

          <section className="card animate-rise overflow-hidden" aria-labelledby="updates-title">
            <SectionHead flush id="updates-title" icon={History} tone="teal" title="Últimos avances" hint="Lo que el equipo te ha contado" />
            {updates.length === 0 ? (
              <p className="px-4 py-5 text-sm text-muted sm:px-5">Cuando el equipo te cuente un avance, queda registrado aquí para que lo consultés cuando quieras.</p>
            ) : (
              <div className="px-4 py-5 sm:px-5"><UpdatesTimeline updates={updates} showProject={manyProjects} /></div>
            )}
          </section>
        </div>

        <aside className="min-w-0 space-y-6" aria-label="Contacto, reuniones y documentos">
          <ContactCard contact={contact} clientName={companyName} className="animate-rise" />

          <section id="reuniones" className="card animate-rise scroll-mt-28 overflow-hidden" aria-labelledby="meetings-title">
            <SectionHead flush id="meetings-title" icon={CalendarClock} tone="teal" title="Próximas reuniones" hint="Hora de Costa Rica" />
            {meetings.upcoming.length === 0 ? (
              <p className="px-4 py-5 text-sm text-muted sm:px-5">No hay reuniones agendadas. Si necesitás una, escribile a tu ejecutivo de cuenta.</p>
            ) : (
              <ul className="divide-y divide-line">{meetings.upcoming.map((m) => <MeetingRow key={m.id} m={m} showProject />)}</ul>
            )}
            {meetings.recent.length > 0 && (
              <>
                <p className="border-t border-line bg-surface-2/60 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted sm:px-5">Recientes</p>
                <ul className="divide-y divide-line">{meetings.recent.map((m) => <MeetingRow key={m.id} m={m} showProject past />)}</ul>
              </>
            )}
          </section>

          <Link to="/cliente/documentos" className="card card-hover group animate-rise flex items-center gap-3.5 p-4 sm:p-5">
            <IconTile icon={FolderOpen} tone="violet" size="lg" />
            <span className="min-w-0 flex-1">
              <span className="block font-display text-[17px] font-bold text-ink">Documentos</span>
              <span className="block text-sm text-muted">{docs ? `${plural(docs, 'documento compartido', 'documentos compartidos')}: contratos, facturas, marca y reportes.` : 'Aquí vas a encontrar contratos, facturas y reportes.'}</span>
            </span>
            <RowArrow />
          </Link>

          <section className="card animate-rise overflow-hidden" aria-labelledby="briefs-title">
            <SectionHead flush id="briefs-title" icon={ClipboardList} tone="violet" title="Solicitudes en curso"
              action={<SeeAll to="/cliente/solicitudes">Ver todas</SeeAll>} />
            {inProgress.length === 0 ? (
              <div className="px-4 py-5 sm:px-5">
                <p className="text-sm text-muted">¿Necesitás una campaña, piezas para redes o un cambio? Contanos en una solicitud y el equipo la toma.</p>
                <Link to="/cliente/solicitudes/nueva" className="btn btn-soft tap mt-3"><Plus className="h-4 w-4" />Nueva solicitud</Link>
              </div>
            ) : (
              <ul className="divide-y divide-line">{inProgress.map((b) => <li key={b.id}><BriefRow b={b} hint={b.code} /></li>)}</ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
