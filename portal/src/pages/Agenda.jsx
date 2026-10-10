// Agenda de citas: semana en escritorio, lista por día en móvil. Detecta choques por persona,
// exporta a calendario (.ics) y arma el recordatorio de WhatsApp para el cliente.
import { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft, ChevronRight, Plus, Video, MapPin, Download, MessageCircle, CheckCircle2, XCircle, CalendarDays, AlertTriangle, Pencil, Trash2, Phone, FolderKanban,
} from 'lucide-react';
import { useResource, useSession } from '../lib/session.jsx';
import { api } from '../lib/api.js';
import { useLocation, navigate, Link } from '../lib/router.jsx';
import { PageHeader, PageLoader, Badge, Modal, Field, Select, AvatarStack, EmptyState, useAction, useConfirm, cx } from '../components/ui.jsx';
import { PeoplePicker, StatusBadge } from '../components/common.jsx';
import { APPOINTMENT_KINDS, APPOINTMENT_STATUS } from '../../shared/catalog.js';
import {
  todayKey, weekStart, addDays, startOfDayIso, dayKey, formatTime, formatDayShort, formatDayLong, formatDateTime, minutesOfDay, toLocalInput, fromLocalInput, whatsappLink, downloadIcs,
} from '../lib/format.js';

const HOUR_START = 7;
const HOUR_END = 21;
const HOUR_PX = 56;
const kindOptions = Object.entries(APPOINTMENT_KINDS).map(([value, v]) => ({ value, label: v.label }));
const statusOptions = Object.entries(APPOINTMENT_STATUS).map(([value, v]) => ({ value, label: v.label }));

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
      location: form.location || null, meeting_url: form.meeting_url || null, project_id: form.project_id || null,
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
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 sm:col-span-2" role="alert">
            <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" />Choque de horario</p>
            <ul className="mt-1 space-y-0.5">{visibleConflicts.map((c, i) => <li key={`${c.id}-${i}`}>{c.attendee_name}: “{c.title}” · {formatTime(c.starts_at)}–{formatTime(c.ends_at)}</li>)}</ul>
          </div>
        )}
        <Field label="Enlace de videollamada">{(id) => <input id={id} className="input" value={form.meeting_url ?? ''} onChange={(e) => set('meeting_url')(e.target.value)} placeholder="https://meet.google.com/…" />}</Field>
        <Field label="Lugar">{(id) => <input id={id} className="input" value={form.location ?? ''} onChange={(e) => set('location')(e.target.value)} placeholder="Oficina, cliente, virtual…" />}</Field>
        <Field label="Contacto del cliente">{(id) => <input id={id} className="input" value={form.contact_name ?? ''} onChange={(e) => set('contact_name')(e.target.value)} />}</Field>
        <Field label="WhatsApp del contacto">{(id) => <input id={id} className="input" inputMode="tel" value={form.contact_phone ?? ''} onChange={(e) => set('contact_phone')(e.target.value)} placeholder="8888-0000" />}</Field>
        <Field label="Proyecto" className="sm:col-span-2">{(id) => <Select id={id} options={projects.map((p) => ({ value: String(p.id), label: p.name }))} value={form.project_id ? String(form.project_id) : ''} onChange={(v) => set('project_id')(v ? Number(v) : null)} placeholder="Sin proyecto" />}</Field>
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
      <button type="button" className="btn btn-ghost mr-auto text-coral" onClick={remove} disabled={busy}><Trash2 className="h-4 w-4" />Eliminar</button>
      <button type="button" className="btn btn-outline" onClick={() => downloadIcs(a)}><Download className="h-4 w-4" />.ics</button>
      <button type="button" className="btn btn-primary" onClick={onEdit}><Pencil className="h-4 w-4" />Editar</button>
    </>}>
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <span className={cx('mt-1 h-12 w-1.5 shrink-0 rounded-full', `dot-${tone}`)} />
          <div>
            <h3 className="font-display text-xl font-bold">{a.title}</h3>
            <p className="mt-0.5 text-sm text-muted">{formatDateTime(a.starts_at)} – {formatTime(a.ends_at)}</p>
            <div className="mt-2 flex flex-wrap gap-1.5"><Badge tone={tone}>{APPOINTMENT_KINDS[a.kind]?.label}</Badge><StatusBadge map={APPOINTMENT_STATUS} value={a.status} /></div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {a.status === 'programada' && <button type="button" className="btn btn-teal btn-sm" onClick={() => setStatus('confirmada', 'Cita confirmada')} disabled={busy}><CheckCircle2 className="h-3.5 w-3.5" />Confirmada por el cliente</button>}
          {['programada', 'confirmada'].includes(a.status) && <button type="button" className="btn btn-outline btn-sm" onClick={() => setStatus('realizada', 'Cita marcada como realizada')} disabled={busy}>Marcar realizada</button>}
          {['programada', 'confirmada'].includes(a.status) && <button type="button" className="btn btn-outline btn-sm" onClick={() => setStatus('no_asistio', 'Registrado: no asistió')} disabled={busy}>No asistió</button>}
          {a.status !== 'cancelada' && <button type="button" className="btn btn-ghost btn-sm text-coral" onClick={() => setStatus('cancelada', 'Cita cancelada')} disabled={busy}><XCircle className="h-3.5 w-3.5" />Cancelar</button>}
        </div>
        <dl className="space-y-2.5 rounded-2xl bg-paper p-4 text-sm">
          {a.meeting_url && <div className="flex items-center gap-2"><Video className="h-4 w-4 text-muted" /><a href={a.meeting_url} target="_blank" rel="noreferrer" className="truncate font-semibold text-brand hover:underline">Unirse a la videollamada</a></div>}
          {a.location && <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted" />{a.location}</div>}
          {a.project_name && <div className="flex items-center gap-2"><FolderKanban className="h-4 w-4 text-muted" /><Link to={`/proyectos/${a.project_id}`} className="font-semibold text-brand hover:underline">{a.project_name}</Link></div>}
          {(a.contact_name || a.contact_phone) && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted" />{a.contact_name} {a.contact_phone && <span className="text-muted">· {a.contact_phone}</span>}</div>}
          <div className="flex items-center gap-2"><span className="text-muted">Equipo:</span><AvatarStack people={a.attendees} size={26} max={6} /><span className="text-xs text-muted">{a.attendees.map((p) => p.name.split(' ')[0]).join(', ')}</span></div>
        </dl>
        {a.notes && <p className="whitespace-pre-line text-sm">{a.notes}</p>}
        {reminder && a.status !== 'cancelada' && <a href={reminder} target="_blank" rel="noreferrer" className="btn btn-outline w-full"><MessageCircle className="h-4 w-4 text-teal-dark" />Enviar recordatorio por WhatsApp</a>}
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

export default function Agenda() {
  const { query } = useLocation();
  const [week, setWeek] = useState(() => weekStart(todayKey()));
  const from = startOfDayIso(week);
  const to = startOfDayIso(addDays(week, 7));
  const { data, error, reload } = useResource(`/api/appointments?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
  const { data: pdata } = useResource('/api/projects');
  const projects = pdata?.projects ?? [];
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(() => {
    if (query.get('nueva') !== '1') return null;
    const nextHour = Math.min(Math.max(Math.floor(minutesOfDay(new Date().toISOString()) / 60) + 1, 8), 17);
    return { ...defaultSlot(todayKey(), nextHour), project_id: Number(query.get('proyecto')) || null };
  });
  const today = todayKey();
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(week, i)), [week]);

  const citaId = Number(query.get('cita')) || null;
  const inWeek = citaId ? data?.appointments.find((a) => a.id === citaId) : null;
  // Si la cita enlazada no está en la semana visible, se busca en un rango amplio (≈ 13 meses).
  const wideRange = `/api/appointments?from=${encodeURIComponent(startOfDayIso(addDays(today, -300)))}&to=${encodeURIComponent(startOfDayIso(addDays(today, 90)))}`;
  const { data: wide } = useResource(citaId && data && !inWeek ? wideRange : null);
  const viewing = inWeek ?? wide?.appointments.find((a) => a.id === citaId) ?? null;

  const nueva = query.get('nueva');
  useEffect(() => { if (nueva) navigate('/agenda', { replace: true }); }, [nueva]);

  const byDay = useMemo(() => {
    const map = Object.fromEntries(days.map((d) => [d, []]));
    for (const a of data?.appointments ?? []) { const k = dayKey(a.starts_at); if (map[k]) map[k].push(a); }
    return map;
  }, [data, days]);

  const nowMinutes = minutesOfDay(new Date().toISOString());
  const closeView = () => navigate('/agenda', { replace: true });
  const weekLabel = `${formatDayShort(days[0])} – ${formatDayShort(days[6])}`;

  return (
    <>
      <PageHeader eyebrow="Centro de operaciones" title="Agenda" subtitle="Citas con clientes y reuniones internas. Hora de Costa Rica."
        actions={<button type="button" className="btn btn-primary" onClick={() => setCreating(defaultSlot(today, 9))}><Plus className="h-4 w-4" />Nueva cita</button>} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border border-line bg-white p-1">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setWeek(addDays(week, -7))} aria-label="Semana anterior"><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setWeek(weekStart(today))}>Hoy</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setWeek(addDays(week, 7))} aria-label="Semana siguiente"><ChevronRight className="h-4 w-4" /></button>
        </div>
        <p className="font-display text-lg font-bold first-letter:uppercase">{weekLabel}</p>
        <div className="ml-auto hidden flex-wrap gap-2 md:flex">
          {Object.entries(APPOINTMENT_KINDS).map(([k, v]) => <span key={k} className="flex items-center gap-1.5 text-xs text-muted"><span className={cx('h-2 w-2 rounded-full', `dot-${v.tone}`)} />{v.label}</span>)}
        </div>
      </div>

      {!data ? <PageLoader error={error} onRetry={reload} /> : (
        <>
          {/* Semana (escritorio) */}
          <div className="card hidden overflow-hidden md:block">
            <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b border-line">
              <div />
              {days.map((d) => (
                <div key={d} className={cx('border-l border-line px-2 py-2.5 text-center', d === today && 'bg-brand-soft')}>
                  <p className={cx('text-xs font-semibold uppercase', d === today ? 'text-brand' : 'text-muted')}>{formatDayShort(d)}</p>
                </div>
              ))}
            </div>
            <div className="relative grid max-h-[68vh] grid-cols-[56px_repeat(7,minmax(0,1fr))] overflow-y-auto">
              <div>
                {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
                  <div key={i} className="relative text-right text-[11px] text-muted" style={{ height: HOUR_PX }}><span className="absolute -top-2 right-2">{HOUR_START + i}:00</span></div>
                ))}
              </div>
              {days.map((d) => (
                <div key={d} className={cx('relative border-l border-line', d === today && 'bg-brand-soft/30')} style={{ height: HOUR_PX * (HOUR_END - HOUR_START) }}>
                  {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
                    <button key={i} type="button" aria-label={`Agendar ${formatDayShort(d)} ${HOUR_START + i}:00`} onClick={() => setCreating(defaultSlot(d, HOUR_START + i))}
                      className="absolute inset-x-0 border-t border-line/70 hover:bg-brand-soft/60" style={{ top: i * HOUR_PX, height: HOUR_PX }} />
                  ))}
                  {d === today && nowMinutes > HOUR_START * 60 && nowMinutes < HOUR_END * 60 && (
                    <div className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-coral" style={{ top: ((nowMinutes - HOUR_START * 60) / 60) * HOUR_PX }}><span className="absolute -left-1 -top-[5px] h-2 w-2 rounded-full bg-coral" /></div>
                  )}
                  {layoutDay(byDay[d]).map(({ e, lane, lanes }) => {
                    const startMin = Math.max(minutesOfDay(e.starts_at), HOUR_START * 60);
                    const endMin = Math.min(dayKey(e.ends_at) === d ? minutesOfDay(e.ends_at) : HOUR_END * 60, HOUR_END * 60);
                    const top = ((startMin - HOUR_START * 60) / 60) * HOUR_PX;
                    const height = Math.max(((endMin - startMin) / 60) * HOUR_PX - 2, 22);
                    const tone = APPOINTMENT_KINDS[e.kind]?.tone ?? 'slate';
                    return (
                      <button key={e.id} type="button" onClick={() => navigate(`/agenda?cita=${e.id}`)}
                        className={cx('absolute z-20 overflow-hidden rounded-lg border-l-[3px] px-1.5 py-1 text-left text-[11px] leading-tight shadow-sm transition hover:z-30 hover:shadow-md', `tone-${tone}`, e.status === 'cancelada' && 'line-through opacity-50')}
                        style={{ top, height, left: `calc(${(lane / lanes) * 100}% + 2px)`, width: `calc(${100 / lanes}% - 4px)`, borderLeftColor: 'currentColor' }}>
                        <span className="block truncate font-bold">{e.title}</span>
                        <span className="block truncate opacity-80">{formatTime(e.starts_at)}{e.status === 'programada' && e.kind !== 'interna' ? ' · sin confirmar' : ''}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Lista (móvil) */}
          <div className="space-y-4 md:hidden">
            {days.map((d) => (
              <section key={d}>
                <h2 className={cx('mb-2 text-sm font-bold first-letter:uppercase', d === today ? 'text-brand' : 'text-ink')}>{d === today ? 'Hoy · ' : ''}{formatDayLong(d)}</h2>
                {byDay[d].length === 0 ? (
                  <button type="button" onClick={() => setCreating(defaultSlot(d, 9))} className="w-full rounded-2xl border border-dashed border-line px-4 py-3 text-left text-sm text-muted">Libre · tocá para agendar</button>
                ) : (
                  <ul className="space-y-2">
                    {byDay[d].sort((a, b) => a.starts_at.localeCompare(b.starts_at)).map((a) => (
                      <li key={a.id}>
                        <button type="button" onClick={() => navigate(`/agenda?cita=${a.id}`)} className={cx('card flex w-full items-center gap-3 p-3 text-left', a.status === 'cancelada' && 'opacity-50')}>
                          <span className={cx('h-10 w-1 shrink-0 rounded-full', `dot-${APPOINTMENT_KINDS[a.kind]?.tone}`)} />
                          <span className="w-[76px] shrink-0 font-display text-sm font-bold tabular">{formatTime(a.starts_at)}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold">{a.title}</span>
                            <span className="block truncate text-xs text-muted">{APPOINTMENT_KINDS[a.kind]?.label}{a.project_name ? ` · ${a.project_name}` : ''}</span>
                          </span>
                          <AvatarStack people={a.attendees} size={22} max={2} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
          {data.appointments.length === 0 && <div className="mt-4 hidden md:block"><EmptyState icon={CalendarDays} title="Semana libre">Tocá cualquier hora de la grilla para agendar una cita.</EmptyState></div>}
        </>
      )}

      {viewing && !editing && <AppointmentView a={viewing} onClose={closeView} onEdit={() => setEditing(viewing)} onChanged={reload} />}
      {editing && <AppointmentForm appointment={editing} projects={projects} onClose={() => setEditing(null)} onSaved={() => { reload(); }} />}
      {creating && <AppointmentForm defaults={creating} projects={projects} onClose={() => setCreating(null)} onSaved={(a) => { setWeek(weekStart(dayKey(a.starts_at))); reload(); }} />}
    </>
  );
}
