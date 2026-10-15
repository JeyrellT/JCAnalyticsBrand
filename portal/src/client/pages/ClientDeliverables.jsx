// Entregables del cliente agrupados por lo que piden de él: por revisar, con cambios pedidos y aprobados.
import { PackageCheck, Eye, PenLine, CircleCheck, Sparkles, Info } from 'lucide-react';
import { useSession, useResource } from '../../lib/session.jsx';
import { PageHeader, PageLoader, EmptyState, SectionHead, Badge, IconTile } from '../../components/ui.jsx';
import { DeliverableRow, firstName } from '../components.jsx';

export default function ClientDeliverables() {
  const { client, contact } = useSession();
  const { data, error, reload } = useResource('/api/client/deliverables');
  if (!data) return <PageLoader error={error} onRetry={reload} />;

  const { deliverables, can_approve: canApprove } = data;
  const by = (status) => deliverables.filter((d) => d.status === status);
  const groups = [
    {
      key: 'en_revision', title: 'Por revisar', icon: Eye, tone: 'amber', items: by('en_revision'),
      hint: canApprove ? 'Abrí cada uno y contanos si está listo.' : 'Los aprueba una persona autorizada.',
    },
    { key: 'cambios', title: 'Con cambios pedidos', icon: PenLine, tone: 'red', items: by('cambios'), hint: 'El equipo prepara una versión nueva.' },
    { key: 'aprobado', title: 'Aprobados', icon: CircleCheck, tone: 'teal', items: by('aprobado'), hint: 'Quedan como registro, con su versión.' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Revisión y aprobación" title="Entregables" icon={PackageCheck} tone="amber"
        subtitle="Cada versión que el equipo te comparte para revisar. Tu decisión queda registrada con la fecha y la versión exacta." />

      {!canApprove && deliverables.length > 0 && (
        <div className="animate-rise flex items-start gap-3 rounded-2xl border border-line bg-surface-2 p-4 text-sm">
          <IconTile icon={Info} tone="blue" size="sm" />
          <p className="min-w-0 text-ink-2">
            Podés ver y abrir todos los entregables. La aprobación la hace una persona autorizada de {client?.name ?? 'tu empresa'}.
            {contact && <> Si necesitás ese permiso, pedíselo a {firstName(contact.name)}, tu ejecutivo de cuenta.</>}
          </p>
        </div>
      )}

      {deliverables.length === 0 ? (
        <EmptyState icon={PackageCheck} tone="amber" title="Todavía no hay entregables">
          Cuando el equipo comparta una versión para revisar (un diseño, un prototipo, un reporte), aparece aquí y te llega un aviso.
        </EmptyState>
      ) : (
        groups.map((g) => {
          if (!g.items.length && g.key !== 'en_revision') return null;
          return (
            <section key={g.key} className="card animate-rise overflow-hidden" aria-labelledby={`group-${g.key}`}>
              <SectionHead flush id={`group-${g.key}`} icon={g.icon} tone={g.tone} title={g.title} hint={g.hint}
                action={g.items.length > 0 && <Badge tone={g.tone}>{g.items.length}</Badge>} />
              {g.items.length === 0 ? (
                <div className="flex items-center gap-3 px-4 py-5 text-sm text-teal-ink sm:px-5">
                  <Sparkles className="h-5 w-5 shrink-0" aria-hidden="true" />Nada por revisar. Te avisamos cuando haya una versión nueva.
                </div>
              ) : (
                <ul className="divide-y divide-line">{g.items.map((d) => <li key={d.id}><DeliverableRow d={d} /></li>)}</ul>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
