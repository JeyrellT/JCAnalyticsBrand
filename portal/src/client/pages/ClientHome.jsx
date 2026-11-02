// Inicio del portal de clientes ("Mis proyectos"): lo mínimo para saber cómo va todo.
//   1. Saludo y una frase con el estado, más "Pedir una actualización".
//   2. "Requiere tu atención" solo si hay algo: montos por aprobar, pagos y entregables por revisar.
//   3. Sus proyectos con el avance, y los últimos avances que el equipo le contó.
//   4. Al lado: la cuenta de pagos, sus actualizaciones abiertas y su ejecutivo.
import {
  FolderKanban, PackageCheck, Sparkles, Plus, BellRing, History, ArrowRight, Wallet, Receipt, CircleCheck,
} from 'lucide-react';
import { useSession, useResource } from '../../lib/session.jsx';
import { Link } from '../../lib/router.jsx';
import { PageLoader, EmptyState, IconTile, SectionHead, Badge, RowArrow, cx } from '../../components/ui.jsx';
import { formatDayLong, formatDate, todayKey } from '../../lib/format.js';
import {
  ProjectCard, UpdatesTimeline, ContactCard, RequestStatusBadge, SeeAll, greeting, firstName, plural, dateOf, totalsText, requestPrice,
} from '../components.jsx';

const STRIPE = { amber: 'bg-amber', red: 'bg-coral', slate: 'bg-slate', blue: 'bg-brand' };

/** Fila de "Requiere tu atención": franja de tono, ícono, contexto y la acción esperada. */
function AttentionRow({ to, icon, tone, title, detail, cta }) {
  return (
    <Link to={to} className="group row relative min-h-[68px] px-4 py-3 pl-5 sm:px-5 sm:pl-6">
      <span className={cx('absolute inset-y-2 left-0 w-1 rounded-r-full', STRIPE[tone] ?? 'bg-brand')} aria-hidden="true" />
      <IconTile icon={icon} tone={tone} />
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 block text-sm font-semibold text-ink">{title}</span>
        <span className="line-clamp-2 block text-xs text-muted">{detail}</span>
      </span>
      <span className="hidden shrink-0 items-center gap-1 rounded-full bg-brand-soft px-3 py-1.5 text-xs font-semibold text-brand-ink transition group-hover:bg-brand/15 sm:inline-flex">
        {cta}<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      <RowArrow className="sm:hidden" />
    </Link>
  );
}

/** Una frase con lo más importante, en orden de urgencia. */
function statusLine({ quotes, overdue, pending, approvals, hasProjects }) {
  if (quotes) return `Tenés ${plural(quotes, 'actualización con monto', 'actualizaciones con monto')} por aprobar.`;
  if (overdue) return `Tenés ${plural(overdue, 'pago vencido', 'pagos vencidos')}.`;
  if (approvals) return `Tenés ${plural(approvals, 'entregable', 'entregables')} por revisar.`;
  if (pending) return `Tenés ${plural(pending, 'pago pendiente', 'pagos pendientes')}.`;
  return hasProjects ? 'Nada pendiente de tu parte. Tu proyecto avanza.' : 'Nada pendiente de tu parte.';
}

/** Tarjeta "Pagos": por pagar, vencido y el próximo cobro. */
function PaymentsCard({ payments, nextCharge }) {
  const overdue = payments.overdue_count > 0;
  const pending = payments.pending_count > 0;
  // Con algo pendiente, lo que vence primero; si está al día, el próximo cobro de su plan.
  const next = payments.next_due
    ? { lead: 'Vence primero', label: payments.next_due.concept, date: payments.next_due.due_date }
    : nextCharge ? { lead: 'Próximo cobro', label: nextCharge.concept, date: nextCharge.date } : null;
  return (
    <Link to="/cliente/pagos" className="card card-hover group animate-rise block overflow-hidden" aria-labelledby="home-pay-title">
      <div className="flex items-center gap-3 border-b border-line px-4 py-3.5 sm:px-5">
        <IconTile icon={Wallet} tone={overdue ? 'red' : pending ? 'amber' : 'teal'} size="sm" />
        <h2 id="home-pay-title" className="section-title flex-1">Pagos</h2>
        <RowArrow />
      </div>
      <div className="px-4 py-4 sm:px-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{overdue ? 'Vencido' : 'Por pagar'}</p>
        <p className={cx('num mt-1 font-display text-[28px] font-bold leading-none', overdue ? 'text-coral-ink' : pending ? 'text-ink' : 'text-teal-ink')}>
          {totalsText(overdue ? payments.overdue : payments.pending)}
        </p>
        <p className="mt-1.5 text-sm text-muted">
          {overdue
            ? `${plural(payments.overdue_count, 'pago vencido', 'pagos vencidos')}${payments.pending_count > payments.overdue_count ? ` · ${payments.pending_count} en total por pagar` : ''}`
            : pending ? plural(payments.pending_count, 'pago pendiente', 'pagos pendientes') : 'Estás al día. ¡Gracias!'}
        </p>
        {next && (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-surface-2 px-3 py-2 text-xs text-ink-2">
            <Receipt className="mt-px h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
            <span className="min-w-0">{next.lead}: <span className="font-semibold text-ink">{next.label}</span> · {formatDate(next.date)}</span>
          </p>
        )}
      </div>
    </Link>
  );
}

/** Actualizaciones abiertas (por cotizar, por aprobar o en proceso) y el botón para pedir otra. */
function RequestsCard({ requests }) {
  return (
    <section className="card animate-rise overflow-hidden" aria-labelledby="home-req-title">
      <SectionHead flush id="home-req-title" icon={Sparkles} tone="violet" title="Actualizaciones"
        hint={requests.length ? plural(requests.length, 'abierta', 'abiertas') : 'Cambios o mejoras a tu proyecto'}
        action={requests.length > 0 && <SeeAll to="/cliente/actualizaciones">Ver todas</SeeAll>} />
      {requests.length === 0 ? (
        <div className="px-4 py-5 sm:px-5">
          <p className="text-sm text-muted">¿Querés cambiar o agregar algo? Pedilo aquí: te decimos el monto y vos decidís.</p>
          <Link to="/cliente/actualizaciones?nueva=1" className="btn btn-soft tap mt-3"><Plus className="h-4 w-4" />Pedir una actualización</Link>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {requests.slice(0, 4).map((r) => (
            <li key={r.id}>
              <Link to={`/cliente/actualizaciones?ver=${r.id}`} className="group row min-h-[60px] px-4 py-3 sm:px-5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">{r.title}</span>
                  <span className="block truncate text-xs text-muted">{[requestPrice(r), r.project_name].filter(Boolean).join(' · ') || `Pedida ${dateOf(r.created_at)}`}</span>
                </span>
                <RequestStatusBadge status={r.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function ClientHome() {
  const { account, client, contact, today } = useSession();
  const { data, error, reload } = useResource('/api/client/overview');
  if (!data) return <PageLoader error={error} onRetry={reload} />;

  const { projects, approvals, updates, requests = [], payments, next_charge: nextCharge } = data;
  const companyName = data.client?.name ?? client?.name;
  const quotes = requests.filter((r) => r.status === 'cotizada');
  const canApprove = !!account.can_approve;
  const hasPayments = payments.pending_count > 0;
  const attention = quotes.length + approvals.length + (hasPayments ? 1 : 0);
  const pending = statusLine({
    quotes: quotes.length, overdue: payments.overdue_count, pending: payments.pending_count, approvals: approvals.length, hasProjects: projects.length > 0,
  });
  const manyProjects = new Set(updates.map((u) => u.project_id)).size > 1;

  return (
    <div className="space-y-6">
      {/* Bienvenida: el estado en una frase y la acción principal. */}
      <section className="card-panel animate-rise p-5 sm:p-7" aria-labelledby="home-title">
        <div className="grid-dots-light absolute inset-0 opacity-40 [mask-image:radial-gradient(60%_90%_at_85%_0%,black,transparent)]" aria-hidden="true" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 max-w-2xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-teal first-letter:uppercase">{formatDayLong(today ?? todayKey())}</p>
            <h1 id="home-title" className="mt-2 font-display text-[28px] font-bold leading-tight text-white sm:text-[34px]">{greeting()}, {firstName(account.name)}</h1>
            <p className="mt-1.5 text-[15px] leading-relaxed text-white/75">Así van tus proyectos con JC Analytics en <span className="font-semibold text-white">{companyName}</span>.</p>
            <p className={cx('mt-4 inline-flex items-start gap-2 rounded-xl bg-white/[0.08] px-3 py-2 text-sm font-medium text-white/90', attention && 'ring-1 ring-amber/50')}>
              {attention ? <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-amber" aria-hidden="true" /> : <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal" aria-hidden="true" />}
              {pending}
            </p>
          </div>
          <Link to="/cliente/actualizaciones?nueva=1" className="btn btn-lg bg-white text-panel shadow-raised hover:bg-white/90">
            <Plus className="h-5 w-5 text-brand" strokeWidth={2.5} />Pedir una actualización
          </Link>
        </div>
      </section>

      {attention > 0 && (
        <section className="card animate-rise overflow-hidden" aria-labelledby="attention-title">
          <SectionHead flush id="attention-title" icon={BellRing} tone="amber" title="Requiere tu atención"
            hint="Lo que espera una respuesta de tu parte" action={<Badge tone="amber">{attention}</Badge>} />
          <ul className="divide-y divide-line">
            {quotes.map((r) => (
              <li key={`r${r.id}`}>
                <AttentionRow to={`/cliente/actualizaciones?ver=${r.id}`} icon={Sparkles} tone="amber" title={r.title}
                  detail={[requestPrice(r), canApprove ? 'Aprobá el monto para que arranquemos' : 'Espera la aprobación de tu empresa'].join(' · ')}
                  cta={canApprove ? 'Revisar monto' : 'Ver'} />
              </li>
            ))}
            {hasPayments && (
              <li>
                <AttentionRow to="/cliente/pagos" icon={Wallet} tone={payments.overdue_count ? 'red' : 'amber'}
                  title={payments.overdue_count ? `${plural(payments.overdue_count, 'pago vencido', 'pagos vencidos')} · ${totalsText(payments.overdue)}` : `Por pagar · ${totalsText(payments.pending)}`}
                  detail={payments.next_due ? `${payments.next_due.concept} · vence ${formatDate(payments.next_due.due_date)}` : plural(payments.pending_count, 'pago pendiente', 'pagos pendientes')}
                  cta="Ver pagos" />
              </li>
            )}
            {approvals.map((d) => (
              <li key={`d${d.id}`}>
                <AttentionRow to={`/cliente/entregables/${d.id}`} icon={PackageCheck} tone="blue" title={d.title}
                  detail={[d.project_name, `Versión ${d.version}`, `compartido ${dateOf(d.shared_at)}`].filter(Boolean).join(' · ')}
                  cta={canApprove ? 'Revisar y aprobar' : 'Ver entregable'} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <section aria-labelledby="projects-title" className="animate-rise">
            <div className="section-head mb-3">
              <div className="flex items-center gap-3">
                <IconTile icon={FolderKanban} tone="blue" size="sm" />
                <h2 id="projects-title" className="section-title">Tus proyectos</h2>
              </div>
              <SeeAll to="/cliente/proyectos">Todos</SeeAll>
            </div>
            {projects.length === 0 ? (
              <EmptyState icon={FolderKanban} title="Todavía no hay proyectos activos"
                action={<Link to="/cliente/actualizaciones?nueva=1" className="btn btn-primary"><Plus className="h-4 w-4" />Pedir algo</Link>}>
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

        <aside className="min-w-0 space-y-6" aria-label="Pagos, actualizaciones y contacto">
          <PaymentsCard payments={payments} nextCharge={nextCharge} />
          <RequestsCard requests={requests} />
          <ContactCard contact={contact} clientName={companyName} className="animate-rise" />
        </aside>
      </div>
    </div>
  );
}
