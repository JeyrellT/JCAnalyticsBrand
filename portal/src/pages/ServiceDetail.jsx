// Servicio: precio, descripción, quién lo hace y sus proyectos. El admin edita líder, equipo, precio y estado.
import { useMemo, useState } from 'react';
import { ArrowLeft, Pencil, Users, FolderKanban, ChevronRight, UserPlus } from 'lucide-react';
import { useResource, useSession } from '../lib/session.jsx';
import { api } from '../lib/api.js';
import { Link } from '../lib/router.jsx';
import { PageLoader, EmptyState, Badge, Avatar, Stat, Modal, Field, Select, useAction, cx } from '../components/ui.jsx';
import { StatusBadge, SlaBadge, PersonSelect, PeoplePicker } from '../components/common.jsx';
import { priceParts, SERVICE_UNITS } from '../components/services.jsx';
import { formatMoney } from '../lib/format.js';
import { PROJECT_STATUS, SERVICE_GROUPS } from '../../shared/catalog.js';

const PEOPLE_ROLES = {
  lider: { label: 'Líder', tone: 'ink', order: 0 },
  equipo: { label: 'Equipo', tone: 'blue', order: 1 },
  proyecto: { label: 'En proyectos', tone: 'slate', order: 2 },
};

function Toggle({ id, checked, onChange, label, hint }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl bg-paper p-3">
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-semibold">{label}</label>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
      <button id={id} type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={cx('relative h-7 w-12 shrink-0 rounded-full transition', checked ? 'bg-teal-dark' : 'bg-slate-300')}>
        <span className={cx('absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all', checked ? 'left-6' : 'left-1')} />
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
      <Link to={`/proyectos/${p.id}`} className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-slate-50 sm:px-5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{p.name}</p>
          <p className="truncate text-xs text-muted">{p.client || 'Sin cliente'}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <StatusBadge map={PROJECT_STATUS} value={p.status} />
            <SlaBadge state={p.sla_state} hours={p.hours_since_update} />
          </div>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
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


  const back = <Link to="/servicios" className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" />Servicios</Link>;
  if (!data) return <>{back}<PageLoader error={error} onRetry={reload} /></>;
  const s = data.service;
  const projects = data.projects ?? [];
  const price = priceParts(s, fx);
  const groupTone = SERVICE_GROUPS[s.group]?.tone ?? 'slate';

  return (
    <div className="space-y-6">
      <header>
        {back}
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-teal-dark">
              <span className={cx('h-2 w-2 rounded-full', `dot-${groupTone}`)} />{s.group_label ?? SERVICE_GROUPS[s.group]?.label}
            </p>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">{s.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-base font-semibold">{price.text}</span>
              {price.approx && <span className="text-sm text-muted tabular">{price.approx}</span>}
              {s.active ? <Badge tone="teal" dot>Activo</Badge> : <Badge tone="slate" dot>Pausado</Badge>}
            </div>
          </div>
          {isAdmin && <button type="button" className="btn btn-outline w-full sm:w-auto" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" />Editar servicio</button>}
        </div>
        {s.description
          ? <p className="mt-4 max-w-3xl whitespace-pre-line text-sm leading-relaxed text-ink/80">{s.description}</p>
          : <p className="mt-4 text-sm text-muted">Todavía no tiene descripción.{isAdmin && ' Tocá "Editar servicio" para contar qué incluye.'}</p>}
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Proyectos activos" value={s.projects_active ?? 0} tone="blue" />
        <Stat label="Valor activo" value={formatMoney(s.value_crc_active ?? 0, 'CRC', { compact: true })} tone="teal" />
        <Stat label="Tareas abiertas" value={s.open_tasks ?? 0} tone={s.open_tasks ? 'amber' : undefined} />
        <Stat label="Total proyectos" value={s.projects_total ?? projects.length} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <section className="card self-start" aria-labelledby="people-title">
          <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-4 sm:px-5">
            <h2 id="people-title" className="section-title">Quién lo hace</h2>
            <span className="text-sm text-muted">{people.length}</span>
          </div>
          {people.length === 0 ? (
            <div className="p-4 sm:p-5">
              <EmptyState icon={Users} title="Nadie asignado todavía"
                action={isAdmin && <button type="button" className="btn btn-primary" onClick={() => setEditing(true)}><UserPlus className="h-4 w-4" />Asignar equipo</button>}>
                {isAdmin ? 'Elegí un líder y quiénes trabajan en este servicio.' : 'El administrador puede asignar un líder y un equipo.'}
              </EmptyState>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {people.map((p) => (
                <li key={p.id}>
                  <Link to={`/equipo/${p.id}`} className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-slate-50 sm:px-5">
                    <Avatar name={p.name} color={p.color} size={36} />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">{p.name}</span>
                    <span className="flex shrink-0 flex-wrap justify-end gap-1">
                      {p.roles.map((r) => <Badge key={r} tone={PEOPLE_ROLES[r].tone}>{PEOPLE_ROLES[r].label}</Badge>)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card self-start" aria-labelledby="projects-title">
          <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-4 sm:px-5">
            <h2 id="projects-title" className="section-title">Proyectos</h2>
            <span className="text-sm text-muted">{projects.length}</span>
          </div>
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
