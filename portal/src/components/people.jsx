// Piezas de las personas del equipo: nivel de carga, contadores y tarjeta con enlace a su ficha.
import { Link } from '../lib/router.jsx';
import { Avatar, Badge, cx } from './ui.jsx';
import { ServiceChip } from './services.jsx';
import { ROLES } from '../../shared/catalog.js';

export const LOAD_META = {
  baja: { tone: 'teal', label: 'Disponible', plural: 'disponibles' },
  media: { tone: 'amber', label: 'Con carga', plural: 'con carga' },
  alta: { tone: 'red', label: 'Saturado', plural: 'saturados' },
};

export const ROLE_TONE = { admin: 'ink', socio: 'blue', colaborador: 'slate' };

export function LoadBadge({ load }) {
  const meta = LOAD_META[load];
  if (!meta) return null;
  return (
    <span title="Según tareas abiertas, vencidas y proyectos activos">
      <Badge tone={meta.tone} dot>{meta.label}</Badge>
    </span>
  );
}

export function RoleBadge({ role }) {
  if (!ROLES[role]) return null;
  return <Badge tone={ROLE_TONE[role] ?? 'slate'}>{ROLES[role].label}</Badge>;
}

/** Los 4 contadores de trabajo de una persona. */
export function PersonCounts({ person, size = 'sm' }) {
  const items = [
    { label: 'Proyectos activos', value: person.projects_active },
    { label: 'Tareas abiertas', value: person.open_tasks },
    { label: 'Vencidas', value: person.overdue_tasks, alert: person.overdue_tasks > 0 },
    { label: 'Citas esta semana', value: person.week_appointments },
  ];
  if (items.every((i) => i.value == null)) return null;
  return (
    <dl className={cx('grid grid-cols-4 gap-1.5 text-center', size === 'lg' && 'gap-2 sm:gap-3')}>
      {items.map((i) => (
        <div key={i.label} className={cx('flex min-w-0 flex-col-reverse rounded-xl px-1 py-2', i.alert ? 'bg-coral-soft text-coral' : 'bg-paper', size === 'lg' && 'py-3')}>
          <dt className={cx('mt-0.5 text-[11px] leading-tight', i.alert ? 'font-semibold' : 'text-muted')}>{i.label}</dt>
          <dd className={cx('font-display font-bold tabular', size === 'lg' ? 'text-2xl' : 'text-lg leading-6')}>{i.value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Tarjeta de persona: toda la tarjeta lleva a /equipo/:id; los chips de servicio
 * y las acciones (children) quedan por encima y siguen siendo clicables.
 */
export function PersonCard({ person, isMe = false, note, children }) {
  const lead = person.services_lead ?? [];
  const member = (person.services_member ?? []).filter((k) => !lead.includes(k));
  return (
    <article className="card relative flex flex-col gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start gap-3">
        <Avatar name={person.name} color={person.color} size={44} />
        <div className="min-w-0 flex-1">
          <Link to={`/equipo/${person.id}`} className="block truncate font-semibold after:absolute after:inset-0 after:rounded-2xl hover:text-brand">
            {person.name}{isMe && <span className="ml-1.5 text-xs font-normal text-muted">(vos)</span>}
          </Link>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <RoleBadge role={person.role} />
            <LoadBadge load={person.load} />
          </div>
        </div>
      </div>

      {(lead.length > 0 || member.length > 0) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {lead.map((k) => <ServiceChip key={k} serviceKey={k} lead />)}
          {member.length > 0 && <span className="text-xs text-muted">{lead.length ? 'También en' : 'Equipo en'} {member.length} {member.length === 1 ? 'servicio' : 'servicios'}</span>}
        </div>
      )}

      <PersonCounts person={person} />
      {note && <p className="text-xs text-muted">{note}</p>}
      {children && <div className="relative z-10 mt-auto border-t border-line pt-3">{children}</div>}
    </article>
  );
}
