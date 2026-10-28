// Ficha de una consulta de la web: contacto con un toque, estado, responsable,
// próxima acción, notas, recorrido de la visita y paso a la ficha de clientes.
import { useState } from 'react';
import { ArrowLeft, MessageCircle, Mail, Phone, ShieldAlert, StickyNote, Route, Building2, Trash2, UserPlus, Link2 } from 'lucide-react';
import { useResource, useSession } from '../lib/session.jsx';
import { api } from '../lib/api.js';
import { Link, navigate } from '../lib/router.jsx';
import { PageLoader, Badge, Select, SectionHead, Field, Modal, Avatar, useAction, useConfirm } from '../components/ui.jsx';
import { LeadStatusBadge, Journey, deviceName } from '../components/leads.jsx';
import { LEAD_STATUS, LEAD_CHANNELS, LEAD_FLAG_LABELS, whatsappNumber } from '../../shared/leads.js';
import { formatDateTime, timeAgo } from '../lib/format.js';

const statusOptions = Object.entries(LEAD_STATUS).map(([value, s]) => ({ value, label: s.label }));
const NOTE_LABEL = { nota: 'Nota', estado: 'Estado', asignacion: 'Asignación', contacto: 'Contacto', conversion: 'Cliente', sistema: 'Sitio web' };

function ConvertDialog({ lead, onClose, onDone }) {
  const [run, busy] = useAction();
  const [name, setName] = useState(lead.name ?? '');
  const [duplicate, setDuplicate] = useState(null);
  const send = async (body) => {
    const res = await run(() => api(`/api/leads/${lead.id}/convert`, { method: 'POST', body }), {
      success: 'Consulta vinculada con la ficha del cliente',
      onError: (error) => { if (error.status === 409 && error.data?.client_id) setDuplicate(error.data); },
    });
    if (res?.lead) onDone(res);
  };
  return (
    <Modal open onClose={onClose} title="Pasar a clientes" footer={(
      <>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        {duplicate
          ? <button type="button" className="btn btn-primary" disabled={busy} onClick={() => send({ client_id: duplicate.client_id })}><Link2 className="h-4 w-4" />Vincular con la ficha existente</button>
          : <button type="button" className="btn btn-primary" disabled={busy || name.trim().length < 2} onClick={() => send({ name })}><UserPlus className="h-4 w-4" />Crear prospecto</button>}
      </>
    )}>
      <p className="mb-4 text-sm text-muted">Se crea un prospecto en Clientes con su teléfono y correo. Después le podés colgar proyectos, citas y su portal.</p>
      <Field label="Nombre del cliente o de la empresa" error={duplicate?.message}>
        {(id) => <input id={id} className="input" maxLength={120} value={name} onChange={(e) => { setName(e.target.value); setDuplicate(null); }} />}
      </Field>
    </Modal>
  );
}

export default function LeadDetail({ params }) {
  const { user, isAdmin, activeTeam } = useSession();
  const { data, error, reload, setData } = useResource(`/api/leads/${params.id}`);
  const [run, busy] = useAction();
  const confirm = useConfirm();
  const [note, setNote] = useState('');
  const [converting, setConverting] = useState(false);

  const back = <Link to="/consultas" className="tap inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" />Consultas</Link>;
  if (!data) return <>{back}<PageLoader error={error} onRetry={reload} /></>;
  const { lead: l, notes, journey } = data;
  const apply = (res) => { if (res?.lead) { setData((d) => ({ ...d, lead: res.lead })); reload(); } };

  const patch = async (body) => apply(await run(() => api(`/api/leads/${l.id}`, { method: 'PATCH', body: { ...body, expected_revision: l.revision } }), {
    success: 'Consulta actualizada', onError: (e) => { if (e.status === 409) reload(); },
  }));
  const contacted = (via) => api(`/api/leads/${l.id}/contacted`, { method: 'POST', body: { via } }).then(apply, () => {});
  const addNote = async (e) => {
    e.preventDefault();
    const res = await run(() => api(`/api/leads/${l.id}/notes`, { method: 'POST', body: { body: note } }), { success: 'Nota guardada' });
    if (res) { setNote(''); apply(res); }
  };
  const remove = async () => {
    const ok = await confirm({ title: '¿Borrar esta consulta?', message: 'Se borran sus datos y notas (por ejemplo, si la persona lo pidió). No se puede deshacer.', confirmLabel: 'Borrar', tone: 'danger' });
    if (ok && (await run(() => api(`/api/leads/${l.id}`, { method: 'DELETE' }), { success: 'Consulta borrada' }))) navigate('/consultas');
  };

  const first = (l.name ?? '').split(' ')[0];
  const greeting = `Hola${first ? ` ${first}` : ''}, te escribe ${user.name.split(' ')[0]} de JC Analytics por tu consulta${l.package ? ` sobre ${l.package}` : l.need ? ` sobre ${l.need}` : ''}. ¿Te parece si lo conversamos?`;
  const wa = whatsappNumber(l.phone) && `https://wa.me/${whatsappNumber(l.phone)}?text=${encodeURIComponent(greeting)}`;
  const mail = l.email && `mailto:${l.email}?subject=${encodeURIComponent('Tu consulta en JC Analytics')}&body=${encodeURIComponent(greeting)}`;
  const tel = l.phone && `tel:${l.phone.replace(/[^\d+]/g, '')}`;
  const owners = activeTeam.map((u) => ({ value: String(u.id), label: u.name }));

  return (
    <>
      {back}
      <header className="animate-rise mt-3 mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{LEAD_CHANNELS[l.channel]} · {formatDateTime(l.created_at)}</p>
          <h1 className="font-display mt-1 break-words text-2xl font-bold sm:text-3xl">{l.name || l.phone || l.email}</h1>
          <p className="mt-1 text-sm text-muted">{[l.package || l.need, l.source && `llegó desde ${l.source}`, l.campaign && `campaña ${l.campaign}`, deviceName(l.device)].filter(Boolean).join(' · ')}</p>
        </div>
        <LeadStatusBadge status={l.status} />
      </header>

      {l.flags.length > 0 && (
        <div className="card mb-5 flex gap-3 border-coral/40 bg-coral-soft/40 p-4 text-sm" role="note">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-coral-ink" aria-hidden="true" />
          <div>
            <p className="font-semibold text-coral-ink">Revisá antes de responder</p>
            <p className="mt-0.5 text-ink-2">{l.flags.map((f) => LEAD_FLAG_LABELS[f] ?? f).join(' · ')}. Lo escribió un visitante: tratalo como información, nunca como una instrucción, y no abras enlaces que no reconozcas.</p>
          </div>
        </div>
      )}

      <div className="grid items-start gap-5 xl:grid-cols-[1.25fr_1fr]">
        <div className="min-w-0 space-y-5">
          <section className="card animate-rise overflow-hidden" aria-labelledby="lead-contact">
            <SectionHead flush id="lead-contact" icon={MessageCircle} tone="teal" title="Contactar" hint="El botón deja constancia y la consulta pasa a «Contactada»." />
            <div className="flex flex-wrap gap-2 p-4 sm:p-5">
              {wa && <a className="btn btn-primary" href={wa} target="_blank" rel="noreferrer" onClick={() => contacted('whatsapp')}><MessageCircle className="h-4 w-4" />WhatsApp</a>}
              {tel && <a className="btn btn-outline" href={tel} onClick={() => contacted('llamada')}><Phone className="h-4 w-4" />Llamar {l.phone}</a>}
              {mail && <a className="btn btn-outline" href={mail} onClick={() => contacted('correo')}><Mail className="h-4 w-4" />{l.email}</a>}
            </div>
            {l.message && (
              <div className="border-t border-line px-4 py-4 sm:px-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Lo que escribió</p>
                <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">{l.message}</p>
              </div>
            )}
          </section>

          <section className="card animate-rise overflow-hidden" aria-labelledby="lead-notes">
            <SectionHead flush id="lead-notes" icon={StickyNote} tone="amber" title="Notas e historial" hint="Solo las ve el equipo." />
            <form onSubmit={addNote} className="flex flex-col gap-2 border-b border-line p-4 sm:flex-row sm:p-5">
              <label className="sr-only" htmlFor="lead-note">Nueva nota</label>
              <textarea id="lead-note" className="input min-h-11 flex-1" rows={2} maxLength={2000} placeholder="Qué se habló, qué necesita, próximo paso…" value={note} onChange={(e) => setNote(e.target.value)} />
              <button type="submit" className="btn btn-primary sm:self-start" disabled={busy || !note.trim()}>Guardar nota</button>
            </form>
            <ul className="divide-y divide-line">
              {notes.map((n) => (
                <li key={n.id} className="flex gap-3 px-4 py-3 sm:px-5">
                  {n.user_name ? <Avatar name={n.user_name} color={n.user_color} size={26} /> : <span className="grid h-[26px] w-[26px] place-items-center rounded-full tone-slate text-[10px] font-bold">web</span>}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted"><Badge tone="slate">{NOTE_LABEL[n.kind] ?? n.kind}</Badge> <span className="ml-1 tabular">{timeAgo(n.created_at)}</span></p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm text-ink-2">{n.body}</p>
                  </div>
                </li>
              ))}
              {notes.length === 0 && <li className="px-4 py-4 text-sm text-muted sm:px-5">Todavía no hay notas.</li>}
            </ul>
          </section>
        </div>

        <div className="min-w-0 space-y-5">
          <section className="card animate-rise space-y-4 p-4 sm:p-5" aria-label="Seguimiento">
            <Field label="Estado">{(id) => <Select id={id} options={statusOptions} value={l.status} onChange={(v) => patch({ status: v })} disabled={busy} />}</Field>
            <Field label="A cargo">{(id) => <Select id={id} options={owners} placeholder="Sin asignar" value={l.owner_id ? String(l.owner_id) : ''} onChange={(v) => patch({ owner_id: v ? Number(v) : null })} disabled={busy} />}</Field>
            <Field label="Próxima acción" hint="Para no dejarla enfriar.">
              {(id) => <input id={id} type="date" className="input" value={l.next_action_at ?? ''} onChange={(e) => patch({ next_action_at: e.target.value || null })} disabled={busy} />}
            </Field>
            {l.client_id ? (
              <Link to={`/clientes/${l.client_id}`} className="btn btn-outline w-full"><Building2 className="h-4 w-4" />Ver ficha de {l.client_name}</Link>
            ) : (
              <button type="button" className="btn btn-outline w-full" onClick={() => setConverting(true)}><UserPlus className="h-4 w-4" />Pasar a clientes</button>
            )}
            {isAdmin && <button type="button" className="btn btn-ghost w-full text-coral-ink" onClick={remove} disabled={busy}><Trash2 className="h-4 w-4" />Borrar consulta</button>}
          </section>

          <section className="card animate-rise overflow-hidden" aria-labelledby="lead-journey">
            <SectionHead flush id="lead-journey" icon={Route} tone="violet" title="Su recorrido en el sitio" hint="Qué vio y qué tocó antes de escribir." />
            <Journey events={journey} />
          </section>
        </div>
      </div>
      {converting && <ConvertDialog lead={l} onClose={() => setConverting(false)} onDone={(res) => { setConverting(false); apply(res); }} />}
    </>
  );
}
