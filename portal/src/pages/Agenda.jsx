// Agenda de citas: semana en escritorio, lista por día en móvil. Detecta choques por persona,
// exporta a calendario (.ics) y arma el recordatorio de WhatsApp para el cliente.
import { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft, ChevronRight, Plus, Video, MapPin, Download, MessageCircle, CheckCircle2, XCircle, CalendarDays, AlertTriangle, Pencil, Trash2, Phone, FolderKanban, Building2, Users,
} from 'lucide-react';
import { useResource, useSession } from '../lib/session.jsx';
import { api } from '../lib/api.js';
import { useLocation, navigate, Link } from '../lib/router.jsx';
import { PageHeader, PageLoader, Badge, Modal, Field, Select, AvatarStack, EmptyState, useAction, useConfirm, cx } from '../components/ui.jsx';
import { PeoplePicker, StatusBadge } from '../components/common.jsx';
import { ClientSelect } from '../components/clients.jsx';
import { APPOINTMENT_KINDS, APPOINTMENT_STATUS } from '../../shared/catalog.js';
import {
  TZ, todayKey, weekStart, addDays, startOfDayIso, dayKey, formatTime, formatDayShort, formatDayLong, formatDateTime, minutesOfDay, toLocalInput, fromLocalInput, whatsappLink, downloadIcs,
} from '../lib/format.js';

const HOUR_START = 7;
const HOUR_END = 21;
const HOUR_PX = 56;
const kindOptions = Object.entries(APPOINTMENT_KINDS).map(([value, v]) => ({ value, label: v.label }));
const statusOptions = Object.entries(APPOINTMENT_STATUS).map(([value, v]) => ({ value, label: v.label }));

const monthFmt = new Intl.DateTimeFormat('es-CR', { timeZone: TZ, month: 'long', year: 'numeric' });
const monthShortFmt = new Intl.DateTimeFormat('es-CR', { timeZone: TZ, month: 'short' });
const noon = (key) => new Date(`${key}T12:00:00-06:00`);
/** "mié 14" → ["mié", "14"] para el encabezado de día (abreviatura arriba, número grande abajo). */
const splitDay = (key) => {
  const [wd, ...rest] = formatDayShort(key).replace(',', '').split(' ');
  return [wd, rest.join(' ')];
};

function defaultSlot(dateKey, hour) {
  const start = new Date(`${dateKey}T${String(hour).padStart(2, '0')}:00:00-06:00`);
  return { starts_at: start.toISOString(), ends_at: new Date(start.getTime() + 3_600_000).toISOString() };
}

function AppointmentForm({ appointment, defaults, projects, onClose, onSaved }) {
  const { user } = useSession();
  const [run, busy] = useAction();
  const [form, setForm] = useState(() => appointment
    ? { ...appointment, attendees: appointment.attendees.map((a) => a.id), start: toLocalInput(appointment.starts_at), end: toLocalInput(appointment.ends_at) }
    : { kind: 'alcance', status: 'programada', attendees: [user.id], ...defaults, start: toLocalInput(defaults.starts_at), end: toLocalInput(defaults.ends_at) });
  const [conflicts, setConflicts] = useState([]);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  // Al elegir el cliente se completa su contacto si todavía está vacío.
  function pickClient(clientId, client) {
    setForm((f) => ({
      ...f,
      client_id: clientId,
      client_name: client?.name ?? null,
      contact_name: f.contact_name || client?.contact_name || '',
      contact_phone: f.contact_phone || client?.contact_phone || '',
    }));
  }
  // Al elegir un proyecto de cliente, el cliente se toma del proyecto si no hay otro elegido.
  function pickProject(projectId) {
    const project = projects.find((p) => p.id === projectId);
    setForm((f) => ({ ...f, project_id: projectId, client_id: f.client_id || project?.client_id || null, client_name: f.client_id ? f.client_name : project?.client ?? f.client_name }));
  }

  // Al mover el inicio, el fin conserva la duración.
  function setStart(value) {
    setForm((f) => {
      const duration = f.start && f.end ? new Date(fromLocalInput(f.end)) - new Date(fromLocalInput(f.start)) : 3_600_000;
      const end = value ? toLocalInput(new Date(new Date(fromLocalInput(value)).getTime() + Math.max(duration, 15 * 60_000)).toISOString()) : f.end;
      return { ...f, start: value, end };
    });
  }

  useEffect(() => {
    const startsAt = fromLocalInput(form.start);
    const endsAt = fromLocalInput(form.end);
    if (!startsAt || !endsAt || endsAt <= startsAt || !form.attendees.length) return undefined;
    let alive = true;
    const timer = setTimeout(() => {
      api('/api/appointments/check', { method: 'POST', body: { starts_at: startsAt, ends_at: endsAt, attendees: form.attendees, exclude_id: appointment?.id } })
        .then((r) => alive && setConflicts(r.conflicts), () => {});
    }, 300);
    return () => { alive = false; clearTimeout(timer); };
  }, [form.start, form.end, form.attendees, appointment?.id]);

  const invalidRange = form.start && form.end && fromLocalInput(form.end) <= fromLocalInput(form.start);
  const visibleConflicts = invalidRange || !form.attendees.length ? [] : conflicts;

  async function save(e) {
    e.preventDefault();
    const body = {
      title: form.title, kind: form.kind, status: form.status, starts_at: fromLocalInput(form.start), ends_at: fromLocalInput(form.end),
      location: form.location || null, meeting_url: form.meeting_url || null, project_id: form.project_id || null, client_id: form.client_id || null,
      contact_name: form.contact_name || null, contact_phone: form.contact_phone || null, notes: form.notes || null, attendees: form.attendees,
    };
    const res = await run(() => api(appointment ? `/api/appointments/${appointment.id}` : '/api/appointments', { method: appointment ? 'PATCH' : 'POST', body }), { success: appointment ? 'Cita actualizada' : 'Cita agendada' });
    if (res) { onSaved(res.appointment); onClose(); }
  }

  return (
    <Modal open onClose={onClose} title={appointment ? 'Editar cita' : 'Nueva cita'} size="lg"
      footer={<><button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button><button type="submit" form="appt-form" className="btn btn-primary" disabled={busy || !form.title?.trim() || invalidRange}>{busy ? 'Guardando…' : visibleConflicts.length ? 'Guardar igual' : 'Guardar'}</button></>}>
      <form id="appt-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field label="Asunto" className="sm:col-span-2">{(id) => <input id={id} className="input" value={form.title ?? ''} onChange={(e) => set('title')(e.target.value)} placeholder="Ej.: Sesión de alcance con Ferretería El Roble" />}</Field>
        <Field label="Tipo">{(id) => <Select id={id} options={kindOptions} value={form.kind} onChange={set('kind')} />}</Field>
        <Field label="Estado">{(id) => <Select id={id} options={statusOptions} value={form.status} onChange={set('status')} />}</Field>
        <Field label="Inicio (hora CR)">{(id) => <input id={id} type="datetime-local" className="input" value={form.start} onChange={(e) => setStart(e.target.value)} />}</Field>
        <Field label="Fin" error={invalidRange ? 'Debe terminar después de empezar.' : null}>{(id) => <input id={id} type="datetime-local" className="input" value={form.end} onChange={(e) => set('end')(e.target.value)} />}</Field>
        <Field label="Participantes del equipo" className="sm:col-span-2"><PeoplePicker value={form.attendees} onChange={set('attendees')} /></Field>
        {visibleConflicts.length > 0 && (
          <div className="animate-pop flex gap-3 rounded-2xl border border-amber/30 bg-amber-soft p-3 text-sm text-amber-ink sm:col-span-2" role="alert">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-semibold">Choque de horario</p>
              <ul className="mt-1 space-y-0.5">{visibleConflicts.map((c, i) => <li key={`${c.id}-${i}`}>{c.attendee_name}: “{c.title}” · {formatTime(c.starts_at)}–{formatTime(c.ends_at)}</li>)}</ul>
            </div>
          </div>
        )}
        <Field label="Enlace de videollamada">{(id) => <input id={id} className="input" value={form.meeting_url ?? ''} onChange={(e) => set('meeting_url')(e.target.value)} placeholder="https://meet.google.com/…" />}</Field>
        <Field label="Lugar">{(id) => <input id={id} className="input" value={form.location ?? ''} onChange={(e) => set('location')(e.target.value)} placeholder="Oficina, cliente, virtual…" />}</Field>
        <Field label="Cliente">{(id) => <ClientSelect id={id} value={form.client_id} selectedLabel={form.client_name} onChange={pickClient} placeholder="Sin cliente" />}</Field>
        <Field label="Proyecto">{(id) => <Select id={id} options={projects.map((p) => ({ value: String(p.id), label: p.name }))} value={form.project_id ? String(form.project_id) : ''} onChange={(v) => pickProject(v ? Number(v) : null)} placeholder="Sin proyecto" />}</Field>
        <Field label="Contacto del cliente" hint={form.client_id && !form.contact_name ? 'Si lo dejás vacío, se usa el contacto del cliente.' : null}>{(id) => <input id={id} className="input" value={form.contact_name ?? ''} onChange={(e) => set('contact_name')(e.target.value)} />}</Field>
        <Field label="WhatsApp del contacto">{(id) => <input id={id} className="input" inputMode="tel" value={form.contact_phone ?? ''} onChange={(e) => set('contact_phone')(e.target.value)} placeholder="8888-0000" />}</Field>
        <Field label="Notas / agenda de la reunión" className="sm:col-span-2">{(id) => <textarea id={id} className="input" rows={3} value={form.notes ?? ''} onChange={(e) => set('notes')(e.target.value)} />}</Field>
      </form>
    </Modal>
  );
}

function AppointmentView({ a, onClose, onEdit, onChanged }) {
  const { user } = useSession();
  const [run, busy] = useAction();
  const confirm = useConfirm();
  const setStatus = async (status, success) => { if (await run(() => api(`/api/appointments/${a.id}`, { method: 'PATCH', body: { status } }), { success })) onChanged(); };
  const remove = async () => {
    if (!(await confirm({ title: 'Eliminar cita', message: 'Se avisará a los participantes.', confirmLabel: 'Eliminar', tone: 'danger' }))) return;
    if (await run(() => api(`/api/appointments/${a.id}`, { method: 'DELETE' }), { success: 'Cita eliminada' })) { onChanged(); onClose(); }
  };
  const reminder = whatsappLink(a.contact_phone, `Hola${a.contact_name ? ` ${a.contact_name.split(' ')[0]}` : ''}, te recordamos nuestra cita "${a.title}" el ${formatDateTime(a.starts_at)}${a.meeting_url ? `.\nEnlace: ${a.meeting_url}` : a.location ? ` en ${a.location}` : ''}.\n¿Nos confirmás tu asistencia?\n\n${user.name.split(' ')[0]} · JC Analytics`);
  const tone = APPOINTMENT_KINDS[a.kind]?.tone ?? 'slate';
  return (
    <Modal open onClose={onClose} title="Detalle de la cita" footer={<>
      <button type="button" className="btn btn-ghost mr-auto text-coral-ink" onClick={remove} disabled={busy}><Trash2 className="h-4 w-4" />Eliminar</button>
      <button type="button" className="btn btn-outline" onClick={() => downloadIcs(a)}><Download className="h-4 w-4" />.ics</button>
      <button type="button" className="btn btn-primary" onClick={onEdit}><Pencil className="h-4 w-4" />Editar</button>
    </>}>
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <span className={cx('mt-1 h-12 w-1.5 shrink-0 rounded-full', `dot-${tone}`)} aria-hidden="true" />
          <div className="min-w-0">
            <h3 className="font-display text-xl font-bold leading-tight">{a.title}</h3>
            <p className="mt-1 text-sm text-muted first-letter:uppercase">{formatDateTime(a.starts_at)} – {formatTime(a.ends_at)}</p>
            <div className="mt-2 flex flex-wrap gap-1.5"><Badge tone={tone} dot>{APPOINTMENT_KINDS[a.kind]?.label}</Badge><StatusBadge map={APPOINTMENT_STATUS} value={a.status} /></div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {a.status === 'programada' && <button type="button" className="btn btn-teal btn-sm" onClick={() => setStatus('confirmada', 'Cita confirmada')} disabled={busy}><CheckCircle2 className="h-3.5 w-3.5" />Confirmada por el cliente</button>}
          {['programada', 'confirmada'].includes(a.status) && <button type="button" className="btn btn-outline btn-sm" onClick={() => setStatus('realizada', 'Cita marcada como realizada')} disabled={busy}>Marcar realizada</button>}
          {['programada', 'confirmada'].includes(a.status) && <button type="button" className="btn btn-outline btn-sm" onClick={() => setStatus('no_asistio', 'Registrado: no asistió')} disabled={busy}>No asistió</button>}
          {a.status !== 'cancelada' && <button type="button" className="btn btn-ghost btn-sm text-coral-ink" onClick={() => setStatus('cancelada', 'Cita cancelada')} disabled={busy}><XCircle className="h-3.5 w-3.5" />Cancelar</button>}
        </div>
        <dl className="space-y-3 rounded-2xl bg-surface-2 p-4 text-sm">
          {a.meeting_url && <div className="flex items-center gap-2.5"><Video className="h-4 w-4 shrink-0 text-muted" /><a href={a.meeting_url} target="_blank" rel="noreferrer" className="link truncate">Unirse a la videollamada</a></div>}
          {a.location && <div className="flex items-center gap-2.5"><MapPin className="h-4 w-4 shrink-0 text-muted" /><span className="min-w-0 truncate">{a.location}</span></div>}
          {a.client_id && <div className="flex items-center gap-2.5"><Building2 className="h-4 w-4 shrink-0 text-muted" /><Link to={`/clientes/${a.client_id}`} className="link min-w-0 truncate">{a.client_name || 'Ver cliente'}</Link></div>}
          {a.project_name && <div className="flex items-center gap-2.5"><FolderKanban className="h-4 w-4 shrink-0 text-muted" /><Link to={`/proyectos/${a.project_id}`} className="link min-w-0 truncate">{a.project_name}</Link></div>}
          {(a.contact_name || a.contact_phone) && <div className="flex items-center gap-2.5"><Phone className="h-4 w-4 shrink-0 text-muted" /><span className="min-w-0 truncate">{a.contact_name} {a.contact_phone && <span className="tabular text-muted">· {a.contact_phone}</span>}</span></div>}
          <div className="flex items-center gap-2.5"><Users className="h-4 w-4 shrink-0 text-muted" /><AvatarStack people={a.attendees} size={26} max={6} /><span className="min-w-0 truncate text-xs text-muted">{a.attendees.map((p) => p.name.split(' ')[0]).join(', ')}</span></div>
        </dl>
        {a.notes && <p className="whitespace-pre-line text-sm text-ink-2">{a.notes}</p>}
        {reminder && a.status !== 'cancelada' && <a href={reminder} target="_blank" rel="noreferrer" className="btn btn-outline w-full"><MessageCircle className="h-4 w-4 text-teal-ink" />Enviar recordatorio por WhatsApp</a>}
      </div>
    </Modal>
  );
}

/** Reparte citas que se traslapan en carriles para que no se tapen. */
function layoutDay(events) {
  const sorted = [...events].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const lanes = [];
  const placed = sorted.map((e) => {
    let lane = lanes.findIndex((end) => end <= e.starts_at);
    if (lane < 0) { lane = lanes.length; lanes.push(e.ends_at); } else lanes[lane] = e.ends_at;
    return { e, lane };
  });
  return placed.map((p) => ({ ...p, lanes: lanes.length }));
}

/** Tarjeta de fecha de la lista móvil: abreviatura del día arriba y la hora grande abajo (como en Inicio). */
function DateTile({ dayKey: key, time, today }) {
  const [wd] = splitDay(key);
  return (
    <span className={cx('flex h-12 w-[78px] shrink-0 flex-col items-center justify-center rounded-xl', today ? 'bg-brand-soft text-brand-ink' : 'bg-surface-2 text-ink')}>
      <span className={cx('text-[10px] font-bold uppercase tracking-wide', today ? 'text-brand-ink' : 'text-muted')}>{today ? 'Hoy' : wd}</span>
      <span className="font-display text-[14px] font-bold leading-none tabular">{time}</span>
    </span>
  );
}

export default function Agenda() {
  const { query } = useLocation();
  const [week, setWeek] = useState(() => weekStart(todayKey()));
  const from = startOfDayIso(week);
  const to = startOfDayIso(addDays(week, 7));
  const { data, error, reload } = useResource(`/api/appointments?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
  const { data: pdata } = useResource('/api/projects');
  const projects = pdata?.projects ?? [];
  const [editing, setEditing] = useState(null);
  // ?nueva=1 (&proyecto=ID, &cliente=ID) abre una cita nueva en la próxima hora; también si ya estábamos en la agenda.
  const nueva = query.get('nueva') === '1';
  const fromQuery = () => {
    const nextHour = Math.min(Math.max(Math.floor(minutesOfDay(new Date().toISOString()) / 60) + 1, 8), 17);
    return { ...defaultSlot(todayKey(), nextHour), project_id: Number(query.get('proyecto')) || null, client_id: Number(query.get('cliente')) || null };
  };
  const [creating, setCreating] = useState(() => (nueva ? fromQuery() : null));
  const [seenNueva, setSeenNueva] = useState(nueva);
  if (nueva !== seenNueva) {
    setSeenNueva(nueva);
    if (nueva) setCreating(fromQuery());
  }
  const today = todayKey();
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(week, i)), [week]);

  const citaId = Number(query.get('cita')) || null;
  const inWeek = citaId ? data?.appointments.find((a) => a.id === citaId) : null;
  // Si la cita enlazada no está en la semana visible, se busca en un rango amplio (≈ 13 meses).
  const wideRange = `/api/appointments?from=${encodeURIComponent(startOfDayIso(addDays(today, -300)))}&to=${encodeURIComponent(startOfDayIso(addDays(today, 90)))}`;
  const { data: wide } = useResource(citaId && data && !inWeek ? wideRange : null);
  const viewing = inWeek ?? wide?.appointments.find((a) => a.id === citaId) ?? null;

  useEffect(() => { if (nueva) navigate('/agenda', { replace: true }); }, [nueva]);

  const byDay = useMemo(() => {
    const map = Object.fromEntries(days.map((d) => [d, []]));
    for (const a of data?.appointments ?? []) { const k = dayKey(a.starts_at); if (map[k]) map[k].push(a); }
    return map;
  }, [data, days]);

  const nowMinutes = minutesOfDay(new Date().toISOString());
  const closeView = () => navigate('/agenda', { replace: true });
  const weekLabel = `${formatDayShort(days[0])} – ${formatDayShort(days[6])}`;
  const sameMonth = days[0].slice(0, 7) === days[6].slice(0, 7);
  const monthLabel = sameMonth ? monthFmt.format(noon(days[0])) : `${monthShortFmt.format(noon(days[0])).replace('.', '')} – ${monthFmt.format(noon(days[6]))}`;
  const isCurrentWeek = week === weekStart(today);
  const weekCount = data?.appointments.length ?? 0;

  return (
    <>
      <PageHeader eyebrow="Operación" title="Agenda" icon={CalendarDays} tone="violet" subtitle="Citas con clientes y reuniones internas. Hora de Costa Rica."
        actions={<button type="button" className="btn btn-primary" onClick={() => setCreating(defaultSlot(today, 9))}><Plus className="h-4 w-4" />Nueva cita</button>} />

      <div className="animate-rise mb-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex items-stretch overflow-hidden rounded-xl border border-line bg-surface shadow-card" role="group" aria-label="Cambiar de semana">
          <button type="button" className="tap flex items-center justify-center px-3 text-ink transition hover:bg-surface-2 active:bg-surface-3 lg:min-h-10 lg:min-w-10" onClick={() => setWeek(addDays(week, -7))} aria-label="Semana anterior"><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" className={cx('tap flex items-center justify-center border-x border-line px-3.5 text-sm font-semibold transition hover:bg-surface-2 active:bg-surface-3 lg:min-h-10', isCurrentWeek ? 'text-muted' : 'text-brand-ink')} onClick={() => setWeek(weekStart(today))}>Hoy</button>
          <button type="button" className="tap flex items-center justify-center px-3 text-ink transition hover:bg-surface-2 active:bg-surface-3 lg:min-h-10 lg:min-w-10" onClick={() => setWeek(addDays(week, 7))} aria-label="Semana siguiente"><ChevronRight className="h-4 w-4" /></button>
        </div>
        <div className="min-w-0">
          <p className="font-display text-lg font-bold leading-tight first-letter:uppercase">{weekLabel}</p>
          <p className="truncate text-xs text-muted first-letter:uppercase">{monthLabel}{data ? ` · ${weekCount} ${weekCount === 1 ? 'cita' : 'citas'}` : ''}</p>
        </div>
        <ul className="ml-auto hidden flex-wrap items-center gap-x-3.5 gap-y-1 md:flex" aria-label="Tipos de cita">
          {Object.entries(APPOINTMENT_KINDS).map(([k, v]) => (
            <li key={k} className="flex items-center gap-1.5 text-xs font-medium text-muted"><span className={cx('h-2 w-2 rounded-full', `dot-${v.tone}`)} aria-hidden="true" />{v.label}</li>
          ))}
        </ul>
      </div>

      {!data ? <PageLoader error={error} onRetry={reload} /> : (
        <>
          {/* Semana (escritorio) */}
          <div className="card animate-rise hidden overflow-hidden md:block">
            <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b border-line">
              <div aria-hidden="true" />
              {days.map((d) => {
                const [wd, num] = splitDay(d);
                const isToday = d === today;
                const count = byDay[d].length;
                return (
                  <div key={d} className={cx('border-l border-line px-1 pb-2 pt-2.5 text-center', isToday && 'bg-brand-soft/35')}>
                    <p className={cx('text-[10px] font-bold uppercase tracking-[0.14em]', isToday ? 'text-brand-ink' : 'text-muted')}>{wd}</p>
                    <p className={cx('mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-full font-display text-[20px] font-bold leading-none tabular', isToday ? 'bg-brand text-white shadow-brand' : 'text-ink')}>{num}</p>
                    <p className={cx('mt-1 text-[10px] font-medium', count ? 'text-muted' : 'text-muted-2')}>{count ? `${count} ${count === 1 ? 'cita' : 'citas'}` : 'libre'}</p>
                  </div>
                );
              })}
            </div>
            <div className="relative grid max-h-[68vh] grid-cols-[56px_repeat(7,minmax(0,1fr))] overflow-y-auto pt-2">
              <div>
                {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
                  <div key={i} className="relative text-right text-[11px] tabular text-muted-2" style={{ height: HOUR_PX }}><span className="absolute -top-2 right-2">{HOUR_START + i}:00</span></div>
                ))}
              </div>
              {days.map((d) => (
                <div key={d} className={cx('relative border-l border-line', d === today && 'bg-brand-soft/35')} style={{ height: HOUR_PX * (HOUR_END - HOUR_START) }}>
                  {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
                    <button key={i} type="button" aria-label={`Agendar ${formatDayShort(d)} ${HOUR_START + i}:00`} onClick={() => setCreating(defaultSlot(d, HOUR_START + i))}
                      className="absolute inset-x-0 border-t border-line hover:bg-brand-soft/60" style={{ top: i * HOUR_PX, height: HOUR_PX }} />
                  ))}
                  {d === today && nowMinutes > HOUR_START * 60 && nowMinutes < HOUR_END * 60 && (
                    <div className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-coral" style={{ top: ((nowMinutes - HOUR_START * 60) / 60) * HOUR_PX }} aria-hidden="true">
                      <span className="absolute -left-[5px] -top-[5px] h-2 w-2 rounded-full bg-coral ring-2 ring-surface" />
                    </div>
                  )}
                  {layoutDay(byDay[d]).map(({ e, lane, lanes }) => {
                    const startMin = Math.max(minutesOfDay(e.starts_at), HOUR_START * 60);
                    const endMin = Math.min(dayKey(e.ends_at) === d ? minutesOfDay(e.ends_at) : HOUR_END * 60, HOUR_END * 60);
                    const top = ((startMin - HOUR_START * 60) / 60) * HOUR_PX;
                    const height = Math.max(((endMin - startMin) / 60) * HOUR_PX - 2, 22);
                    const tone = APPOINTMENT_KINDS[e.kind]?.tone ?? 'slate';
                    const detail = `${formatTime(e.starts_at)}${e.status === 'programada' && e.kind !== 'interna' ? ' · sin confirmar' : ''}`;
                    // Citas de media hora o menos: una sola línea (título y hora) para que nada quede recortado.
                    const compact = height < 36;
                    return (
                      <button key={e.id} type="button" onClick={() => navigate(`/agenda?cita=${e.id}`)} title={`${e.title} · ${detail}`}
                        className={cx('absolute z-20 overflow-hidden rounded-lg border-l-[3px] px-1.5 text-left text-[11px] leading-tight shadow-card transition hover:z-30 hover:shadow-raised hover:brightness-[0.98]', compact ? 'flex items-center' : 'py-1', `tone-${tone}`, e.status === 'cancelada' && 'line-through opacity-50')}
                        style={{ top, height, left: `calc(${(lane / lanes) * 100}% + 2px)`, width: `calc(${100 / lanes}% - 4px)`, borderLeftColor: 'currentColor' }}>
                        {compact ? (
                          <span className="block w-full truncate"><span className="font-bold">{e.title}</span> <span className="opacity-80">{detail}</span></span>
                        ) : (
                          <>
                            <span className="block truncate font-bold">{e.title}</span>
                            <span className="block truncate opacity-80">{detail}</span>
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Lista (móvil) */}
          <div className="stagger space-y-5 md:hidden">
            {days.map((d) => {
              const isToday = d === today;
              const items = [...byDay[d]].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
              return (
                <section key={d} aria-labelledby={`agenda-day-${d}`}>
                  <h2 id={`agenda-day-${d}`} className="mb-2 flex items-center gap-2 text-sm font-bold">
                    {isToday && <Badge tone="blue" dot>Hoy</Badge>}
                    <span className={cx('inline-block min-w-0 truncate first-letter:uppercase', isToday ? 'text-brand-ink' : 'text-ink')}>{formatDayLong(d)}</span>
                  </h2>
                  {items.length === 0 ? (
                    <button type="button" onClick={() => setCreating(defaultSlot(d, 9))} className="flex min-h-12 w-full items-center gap-2 rounded-2xl border border-dashed border-line-strong bg-surface/60 px-4 text-left text-sm text-muted transition active:bg-surface-2">
                      <Plus className="h-4 w-4 text-muted-2" aria-hidden="true" />Libre · tocá para agendar
                    </button>
                  ) : (
                    <ul className="space-y-2">
                      {items.map((a) => {
                        const tone = APPOINTMENT_KINDS[a.kind]?.tone ?? 'slate';
                        const cancelled = a.status === 'cancelada';
                        return (
                          <li key={a.id}>
                            <button type="button" onClick={() => navigate(`/agenda?cita=${a.id}`)} className={cx('card flex min-h-16 w-full items-center gap-3 p-2.5 pr-3 text-left transition active:scale-[0.99]', cancelled && 'opacity-60')}>
                              <DateTile dayKey={d} time={formatTime(a.starts_at)} today={isToday} />
                              <span className={cx('h-10 w-1 shrink-0 rounded-full', `dot-${tone}`)} aria-hidden="true" />
                              <span className="min-w-0 flex-1">
                                <span className={cx('block truncate text-sm font-semibold', cancelled && 'line-through')}>{a.title}</span>
                                <span className="flex items-center gap-1.5 truncate text-xs text-muted">
                                  {a.meeting_url ? <Video className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : a.location ? <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : null}
                                  <span className="truncate">{APPOINTMENT_KINDS[a.kind]?.label}{a.client_name ? ` · ${a.client_name}` : a.project_name ? ` · ${a.project_name}` : ''}</span>
                                </span>
                                {a.status === 'programada' && a.kind !== 'interna' && <Badge tone="amber" className="mt-1">Sin confirmar</Badge>}
                              </span>
                              <AvatarStack people={a.attendees} size={22} max={2} />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
          {data.appointments.length === 0 && <div className="mt-4 hidden md:block"><EmptyState icon={CalendarDays} tone="violet" title="Semana libre">Tocá cualquier hora de la grilla para agendar una cita.</EmptyState></div>}
        </>
      )}

      {viewing && !editing && <AppointmentView a={viewing} onClose={closeView} onEdit={() => setEditing(viewing)} onChanged={reload} />}
      {editing && <AppointmentForm appointment={editing} projects={projects} onClose={() => setEditing(null)} onSaved={() => { reload(); }} />}
      {creating && <AppointmentForm defaults={creating} projects={projects} onClose={() => setCreating(null)} onSaved={(a) => { setWeek(weekStart(dayKey(a.starts_at))); reload(); }} />}
    </>
  );
}
