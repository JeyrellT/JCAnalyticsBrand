// Piezas de las personas del equipo: nivel de carga, contadores y tarjeta con enlace a su ficha.
// v6: RoleBadge también nombra a los inversionistas (rol 'inversionista', fuera de la operación).
import { Link } from '../lib/router.jsx';
import { Avatar, Badge, cx } from './ui.jsx';
import { ServiceChip } from './services.jsx';
import { ROLES } from '../../shared/catalog.js';

/** Nivel de carga → tono del sistema (chips `tone-*`, puntos `dot-*`). */
export const LOAD_META = {
  baja: { tone: 'teal', label: 'Disponible', plural: 'disponibles' },
  media: { tone: 'amber', label: 'Con carga', plural: 'con carga' },
  alta: { tone: 'red', label: 'Saturado', plural: 'saturados' },
};

// v6: el inversionista va en violeta (el tono de las confirmaciones de dinero), aparte del equipo.
export const ROLE_TONE = { admin: 'ink', socio: 'blue', colaborador: 'slate', inversionista: 'violet' };

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

/** Los 4 contadores de trabajo de una persona, en una grilla hundida; "Vencidas" se enciende en coral si hay. */
export function PersonCounts({ person, size = 'sm' }) {
  const items = [
    { label: 'Proyectos activos', value: person.projects_active },
    { label: 'Tareas abiertas', value: person.open_tasks },
    { label: 'Vencidas', value: person.overdue_tasks, alert: person.overdue_tasks > 0 },
    { label: 'Citas esta semana', value: person.week_appointments },
  ];
  if (items.every((i) => i.value == null)) return null;
  const lg = size === 'lg';
  return (
    <dl className={cx('grid grid-cols-4 rounded-xl bg-surface-2 text-center', lg ? 'gap-1.5 p-1.5' : 'gap-1 p-1')}>
      {items.map((i) => (
        <div key={i.label} className={cx('flex min-w-0 flex-col-reverse rounded-lg px-1', lg ? 'py-3' : 'py-2', i.alert && 'bg-coral-soft text-coral-ink')}>
          <dt className={cx('mt-0.5 text-[11px] leading-tight', i.alert ? 'font-semibold' : 'text-muted')}>{i.label}</dt>
          <dd className={cx('num font-bold', lg ? 'text-2xl leading-7' : 'text-lg leading-6')}>{i.value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

// Chips de servicio visibles en la tarjeta antes de resumir con "+N".
const MAX_SERVICE_CHIPS = 4;

/**
 * Tarjeta de persona: toda la tarjeta lleva a /equipo/:id; los chips de servicio
 * y las acciones (children) quedan por encima y siguen siendo clicables.
 */
export function PersonCard({ person, isMe = false, note, children }) {
  const lead = person.services_lead ?? [];
  const member = (person.services_member ?? []).filter((k) => !lead.includes(k));
  const all = [...lead.map((k) => ({ key: k, lead: true })), ...member.map((k) => ({ key: k, lead: false }))];
  const shown = all.slice(0, MAX_SERVICE_CHIPS);
  const extra = all.length - shown.length;
  return (
    <article className="card card-hover group relative flex flex-col gap-3.5 p-4">
      <div className="flex items-start gap-3">
        <Avatar name={person.name} color={person.color} size={48} />
        <div className="min-w-0 flex-1">
          <Link to={`/equipo/${person.id}`} className="block truncate font-display text-base font-bold leading-snug after:absolute after:inset-0 after:rounded-2xl group-hover:text-brand-ink">
            {person.name}{isMe && <span className="ml-1.5 font-sans text-xs font-normal text-muted">(vos)</span>}
          </Link>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <RoleBadge role={person.role} />
            <LoadBadge load={person.load} />
          </div>
        </div>
      </div>

      {all.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {shown.map((s) => <ServiceChip key={s.key} serviceKey={s.key} lead={s.lead} />)}
          {extra > 0 && (
            <Link to={`/equipo/${person.id}`} className="chip tone-slate relative z-10 px-2.5 py-1 text-xs" title={`${extra} ${extra === 1 ? 'servicio más' : 'servicios más'}`}>+{extra}</Link>
          )}
        </div>
      )}

      <PersonCounts person={person} />
      {note && <p className="text-xs text-muted">{note}</p>}
      {children && <div className="relative z-10 mt-auto border-t border-line pt-3">{children}</div>}
    </article>
  );
}
