// Servicio: precio, descripción, quién lo hace y sus proyectos. El admin edita líder, equipo, precio y estado.
import { useMemo, useState } from 'react';
import { ArrowLeft, Pencil, Users, FolderKanban, UserPlus, FileText, Wallet, ListChecks, Layers, Crown } from 'lucide-react';
import { useResource, useSession } from '../lib/session.jsx';
import { api } from '../lib/api.js';
import { Link } from '../lib/router.jsx';
import { PageLoader, EmptyState, Badge, Avatar, AvatarStack, Stat, Modal, Field, Select, IconTile, SectionHead, RowArrow, useAction, cx } from '../components/ui.jsx';
import { StatusBadge, SlaBadge, PersonSelect, PeoplePicker } from '../components/common.jsx';
import { priceParts, groupIcon, SERVICE_UNITS } from '../components/services.jsx';
import { formatMoney } from '../lib/format.js';
import { PROJECT_STATUS, SERVICE_GROUPS } from '../../shared/catalog.js';

const PEOPLE_ROLES = {
  lider: { label: 'Líder', tone: 'ink', order: 0 },
  equipo: { label: 'Equipo', tone: 'blue', order: 1 },
  proyecto: { label: 'En proyectos', tone: 'slate', order: 2 },
};

// Color del número en la franja compacta de celular (en escritorio lo resuelve <Stat>).
const STAT_TEXT = { blue: 'text-brand-ink', teal: 'text-teal-ink', amber: 'text-amber-ink', slate: 'text-ink' };

function Toggle({ id, checked, onChange, label, hint }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl bg-surface-2 p-3">
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-semibold">{label}</label>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
      <button id={id} type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={cx('relative h-7 w-12 shrink-0 rounded-full transition', checked ? 'bg-teal' : 'bg-line-strong')}>
        <span className={cx('absolute top-1 h-5 w-5 rounded-full bg-panel-fg shadow transition-all', checked ? 'left-6' : 'left-1')} />
      </button>
    </div>
  );
}

function ServiceForm({ service, fx, onClose, onSaved }) {
  const [run, busy] = useAction();
  const [form, setForm] = useState(() => ({
    lead_id: service.lead_id ?? null,
    members: (service.members ?? []).map((m) => m.id),
    price: service.price_from_usd == null ? '' : String(service.price_from_usd),
    unit: service.unit ?? '',
    description: service.description ?? '',
    active: !!service.active,
  }));
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const price = form.price.trim() === '' ? null : Number(form.price);
  const priceOk = price === null || (Number.isInteger(price) && price >= 0);
  const preview = priceParts({ price_from_usd: priceOk ? price : null, unit: form.unit || null }, fx);

  async function save(e) {
    e.preventDefault();
    if (!priceOk) return;
    const body = {
      lead_id: form.lead_id ?? null,
      members: form.members,
      price_from_usd: price,
      unit: form.unit || null,
      description: form.description.trim() || null,
      active: form.active,
    };
    const res = await run(() => api(`/api/services/${service.key}`, { method: 'PATCH', body }), { success: 'Servicio actualizado' });
    if (res) { onSaved(res.service); onClose(); }
  }

  return (
    <Modal open onClose={onClose} title={`Editar ${service.name}`}
      footer={<><button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button><button type="submit" form="service-form" className="btn btn-primary" disabled={busy || !priceOk}>{busy ? 'Guardando…' : 'Guardar'}</button></>}>
      <form id="service-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field label="Líder" hint="Quien responde por este servicio." className="sm:col-span-2">
          {(id) => <PersonSelect id={id} value={form.lead_id} onChange={set('lead_id')} placeholder="Sin responsable" />}
        </Field>
        <Field label="Equipo" hint="Tocá para sumar o quitar personas." className="sm:col-span-2">
          <PeoplePicker value={form.members} onChange={set('members')} />
        </Field>
        <Field label="Precio desde (US$)" error={priceOk ? null : 'Escribí un número entero, sin decimales.'}
          hint={form.price.trim() === '' ? 'Vacío = "A convenir".' : [preview.text, preview.approx].filter(Boolean).join(' · ')}>
          {(id) => (
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-semibold text-muted">$</span>
              <input id={id} className="input pl-7 tabular" inputMode="numeric" autoComplete="off" placeholder="A convenir"
                value={form.price} onChange={(e) => set('price')(e.target.value.replace(/[^\d]/g, ''))} />
            </div>
          )}
        </Field>
        <Field label="Cómo se cobra">{(id) => <Select id={id} options={SERVICE_UNITS} value={form.unit} onChange={set('unit')} />}</Field>
        <Field label="Descripción" hint="Qué incluye, en palabras simples." className="sm:col-span-2">
          {(id) => <textarea id={id} className="input" rows={3} value={form.description} onChange={(e) => set('description')(e.target.value)} />}
        </Field>
        <div className="sm:col-span-2">
          <Toggle id="service-active" checked={form.active} onChange={set('active')} label="Servicio activo"
            hint={form.active ? 'Se muestra en la lista principal.' : 'Queda en "Pausados" hasta que lo reactivés.'} />
        </div>
      </form>
    </Modal>
  );
}

function ProjectRow({ p }) {
  return (
    <li>
      <Link to={`/proyectos/${p.id}`} className="group row min-h-14 px-4 py-3 sm:px-5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold group-hover:text-brand-ink">{p.name}</p>
          <p className="truncate text-xs text-muted">{p.client || 'Sin cliente'}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <StatusBadge map={PROJECT_STATUS} value={p.status} />
            <SlaBadge state={p.sla_state} hours={p.hours_since_update} />
          </div>
        </div>
        <RowArrow />
      </Link>
    </li>
  );
}

export default function ServiceDetail({ params }) {
  const { isAdmin, settings } = useSession();
  const fx = Number(settings?.fx_usd_crc) || null;
  const { data, error, reload, setData } = useResource(`/api/services/${encodeURIComponent(params.key)}`);
  const [editing, setEditing] = useState(false);

  const people = useMemo(() => {
    const byId = new Map();
    for (const p of data?.people ?? []) {
      const entry = byId.get(p.id) ?? { ...p, roles: [] };
      if (PEOPLE_ROLES[p.role] && !entry.roles.includes(p.role)) entry.roles.push(p.role);
      byId.set(p.id, entry);
    }
    const rank = (p) => Math.min(...p.roles.map((r) => PEOPLE_ROLES[r].order), 9);
    return [...byId.values()].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, 'es'));
  }, [data]);

  const back = <Link to="/servicios" className="tap inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" />Servicios</Link>;
  if (!data) return <>{back}<PageLoader error={error} onRetry={reload} /></>;
  const s = data.service;
  const projects = data.projects ?? [];
  const price = priceParts(s, fx);
  const groupTone = SERVICE_GROUPS[s.group]?.tone ?? 'slate';
  const team = (s.members ?? []).filter((m) => m.id !== s.lead_id);
  const stats = [
    { label: 'Proyectos activos', value: s.projects_active ?? 0, icon: FolderKanban, tone: 'blue' },
    { label: 'Valor activo', value: formatMoney(s.value_crc_active ?? 0, 'CRC', { compact: true }), icon: Wallet, tone: 'teal' },
    { label: 'Tareas abiertas', value: s.open_tasks ?? 0, icon: ListChecks, tone: s.open_tasks ? 'amber' : 'slate' },
    { label: 'Total proyectos', value: s.projects_total ?? projects.length, icon: Layers, tone: 'slate' },
  ];

  return (
    <div className="space-y-6">
      <header className="animate-rise">
        {back}
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <IconTile icon={groupIcon(s.group)} tone={groupTone} size="lg" className="h-14 w-14 shadow-card sm:h-16 sm:w-16" iconClassName="h-7 w-7" />
            <div className="min-w-0">
              <p className="eyebrow flex items-center gap-2">
                <span className={cx('h-2 w-2 rounded-full', `dot-${groupTone}`)} aria-hidden="true" />{s.group_label ?? SERVICE_GROUPS[s.group]?.label}
              </p>
              <h1 className="mt-0.5 break-words font-display text-[26px] font-bold leading-tight sm:text-[32px]">{s.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {s.active ? <Badge tone="teal" dot>Activo</Badge> : <Badge tone="slate" dot>Pausado</Badge>}
                {s.unit && <Badge tone="slate">{SERVICE_UNITS.find((u) => u.value === s.unit)?.label}</Badge>}
              </div>
            </div>
          </div>
          {isAdmin && <button type="button" className="btn btn-outline w-full sm:w-auto lg:shrink-0" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" />Editar servicio</button>}
        </div>

        <div className="card mt-5 overflow-hidden">
          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Precio base</p>
              <p className="num mt-1 truncate text-2xl font-bold leading-none sm:text-[28px]">{price.text}</p>
              {price.approx && <p className="mt-1.5 text-sm text-muted tabular">{price.approx}</p>}
            </div>
            <div className="flex items-center gap-5 border-t border-line pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
              {s.lead_id ? (
                <Link to={`/equipo/${s.lead_id}`} className="flex min-w-0 items-center gap-2.5 hover:text-brand-ink">
                  <Avatar name={s.lead_name} color={s.lead_color} size={36} />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted"><Crown className="h-3 w-3" aria-hidden="true" />Líder</span>
                    <span className="block truncate text-sm font-semibold">{s.lead_name}</span>
                  </span>
                </Link>
              ) : <span className="text-sm text-muted">Sin responsable</span>}
              {team.length > 0 && (
                <span className="flex min-w-0 items-center gap-2.5">
                  <AvatarStack people={team} size={28} />
                  <span className="text-xs text-muted">{team.length} en el equipo</span>
                </span>
              )}
            </div>
          </div>
          {/* Celular: los cuatro números en una franja compacta (en escritorio van como <Stat>). */}
          <dl className="grid grid-cols-2 gap-px border-t border-line bg-line sm:hidden" aria-label="Indicadores">
            {stats.map((st) => (
              <div key={st.label} className="min-w-0 bg-surface px-4 py-3">
                <dt className="truncate text-[10px] font-bold uppercase tracking-[0.1em] text-muted">{st.label}</dt>
                <dd className={cx('num mt-0.5 truncate text-xl font-bold', STAT_TEXT[st.tone])}>{st.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      {/* Sin animación de entrada: al alternar display (celular ↔ escritorio) se reiniciaría. */}
      <div className="hidden gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-4" aria-label="Indicadores">
        {stats.map((st) => <Stat key={st.label} label={st.label} value={st.value} icon={st.icon} tone={st.tone} />)}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-6">
          <section className="card animate-rise overflow-hidden" aria-labelledby="people-title">
            <SectionHead flush id="people-title" icon={Users} tone={groupTone} title="Quién lo hace" hint={people.length ? `${people.length} ${people.length === 1 ? 'persona' : 'personas'}` : 'Sin equipo asignado'}
              action={isAdmin && people.length > 0 && <button type="button" className="btn btn-ghost btn-sm -my-1" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5" />Editar</button>} />
            {people.length === 0 ? (
              <div className="p-4 sm:p-5">
                <EmptyState icon={Users} tone={groupTone} title="Nadie asignado todavía"
                  action={isAdmin && <button type="button" className="btn btn-primary" onClick={() => setEditing(true)}><UserPlus className="h-4 w-4" />Asignar equipo</button>}>
                  {isAdmin ? 'Elegí un líder y quiénes trabajan en este servicio.' : 'El administrador puede asignar un líder y un equipo.'}
                </EmptyState>
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {people.map((p) => (
                  <li key={p.id}>
                    <Link to={`/equipo/${p.id}`} className="group row min-h-14 px-4 py-3 sm:px-5">
                      <Avatar name={p.name} color={p.color} size={36} />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold group-hover:text-brand-ink">{p.name}</span>
                      <span className="flex shrink-0 flex-wrap justify-end gap-1">
                        {p.roles.map((r) => <Badge key={r} tone={PEOPLE_ROLES[r].tone}>{PEOPLE_ROLES[r].label}</Badge>)}
                      </span>
                      <RowArrow />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card animate-rise overflow-hidden" aria-labelledby="desc-title">
            <SectionHead flush id="desc-title" icon={FileText} tone="slate" title="Descripción" hint="Qué incluye" />
            <div className="p-4 sm:p-5">
              {s.description
                ? <p className="whitespace-pre-line text-sm leading-relaxed text-ink-2">{s.description}</p>
                : <p className="text-sm text-muted">Todavía no tiene descripción.{isAdmin && ' Tocá "Editar servicio" para contar qué incluye.'}</p>}
            </div>
          </section>
        </div>

        <section className="card animate-rise self-start overflow-hidden" aria-labelledby="projects-title">
          <SectionHead flush id="projects-title" icon={FolderKanban} tone="blue" title="Proyectos" hint={projects.length ? `${projects.length} con este servicio` : 'Ninguno todavía'}
            action={projects.length > 0 && <Link to="/proyectos" className="link tap -my-2 flex items-center text-sm">Ver todos</Link>} />
          {projects.length === 0 ? (
            <div className="p-4 sm:p-5">
              <EmptyState icon={FolderKanban} title="Sin proyectos de este servicio" action={<Link to="/proyectos" className="btn btn-outline">Ir a proyectos</Link>}>
                Cuando creés un proyecto y elijás este servicio, aparece acá.
              </EmptyState>
            </div>
          ) : (
            <ul className="divide-y divide-line">{projects.map((p) => <ProjectRow key={p.id} p={p} />)}</ul>
          )}
        </section>
      </div>

      {editing && <ServiceForm service={s} fx={fx} onClose={() => setEditing(false)}
        onSaved={(service) => { if (service) setData((d) => ({ ...d, service: { ...d.service, ...service } })); reload(); }} />}
    </div>
  );
}
