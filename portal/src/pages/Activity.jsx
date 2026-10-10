// Bitácora: quién hizo qué y cuándo. Control interno y trazabilidad (los movimientos de dinero solo los ven socios).
import { useState } from 'react';
import { History } from 'lucide-react';
import { useResource, useSession } from '../lib/session.jsx';
import { PageHeader, PageLoader, EmptyState, Avatar, Select } from '../components/ui.jsx';
import { formatDateTime, dayKey, formatDayLong } from '../lib/format.js';

const ENTITIES = [
  { value: 'project', label: 'Proyectos' }, { value: 'task', label: 'Tareas' }, { value: 'appointment', label: 'Citas' },
  { value: 'investment', label: 'Inversiones' }, { value: 'movement', label: 'Movimientos de dinero' }, { value: 'user', label: 'Personas' },
  { value: 'settings', label: 'Ajustes y respaldos' }, { value: 'auth', label: 'Accesos' },
];

export default function Activity() {
  const { canInvest } = useSession();
  const [entity, setEntity] = useState('');
  const { data, error, reload } = useResource(`/api/activity?limit=300${entity ? `&entity=${entity}` : ''}`);
  const options = ENTITIES.filter((e) => canInvest || !['investment', 'movement'].includes(e.value));
  const groups = [];
  for (const a of data?.activity ?? []) {
    const key = dayKey(a.created_at);
    if (groups.at(-1)?.key !== key) groups.push({ key, items: [] });
    groups.at(-1).items.push(a);
  }
  return (
    <>
      <PageHeader eyebrow="Control interno" title="Bitácora" subtitle="Registro inalterable de las acciones del equipo. Útil para auditar decisiones y movimientos."
        actions={<Select className="w-auto" aria-label="Filtrar" options={options} value={entity} onChange={setEntity} placeholder="Todo" />} />
      {!data ? <PageLoader error={error} onRetry={reload} /> : groups.length === 0 ? <EmptyState icon={History} title="Sin registros" /> : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.key}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{formatDayLong(g.key)}</h2>
              <ul className="card divide-y divide-line">
                {g.items.map((a) => (
                  <li key={a.id} className="flex items-start gap-3 px-4 py-3">
                    <Avatar name={a.user_name ?? 'Sistema'} color={a.user_color ?? '#5b6b82'} size={26} />
                    <p className="min-w-0 flex-1 text-sm">{a.summary}</p>
                    <time className="shrink-0 text-xs text-muted" dateTime={a.created_at}>{formatDateTime(a.created_at).split(',').pop().trim()}</time>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
