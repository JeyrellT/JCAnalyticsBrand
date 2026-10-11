// Piezas de clientes y del equipo por proyecto, compartidas por Clientes, Proyectos y Agenda.
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Lock } from 'lucide-react';
import { api } from '../lib/api.js';
import { useResource, useSession } from '../lib/session.jsx';
import { whatsappLink } from '../lib/format.js';
import { Modal, Field, Select, Avatar, useAction, cx } from './ui.jsx';
import { PersonSelect, StatusBadge } from './common.jsx';
import { CLIENT_STATUS, PROJECT_ROLES } from '../../shared/catalog.js';

const SECTOR_SUGGESTIONS = ['Restaurante', 'Domótica', 'Logística', 'Ferretería', 'Comercio', 'Barbería y belleza', 'Taller', 'Salud', 'Educación', 'Servicios profesionales'];
const statusOptions = Object.entries(CLIENT_STATUS).map(([value, v]) => ({ value, label: v.label }));
const clean = (v) => (typeof v === 'string' ? v.trim() || null : v ?? null);
const firstName = (name) => (name ?? '').trim().split(/\s+/)[0] ?? '';

export function ClientStatusBadge({ status }) {
  return <StatusBadge map={CLIENT_STATUS} value={status} />;
}

/** Enlace de WhatsApp al contacto del cliente con un saludo del equipo. */
export function clientWhatsapp(client, senderName) {
  if (!client?.contact_phone) return null;
  const hi = client.contact_name ? `Hola ${firstName(client.contact_name)}` : 'Hola';
  const from = senderName ? `${firstName(senderName)} de JC Analytics` : 'el equipo de JC Analytics';
  return whatsappLink(client.contact_phone, `${hi}, te escribe ${from}.`);
}

/** Crear o editar un cliente. onSaved(client) recibe el cliente guardado. */
export function ClientForm({ open = true, client, defaults, onClose, onSaved }) {
  const { user } = useSession();
  const [run, busy] = useAction();
  const [form, setForm] = useState(() => (client ? { ...client } : { status: 'activo', owner_id: user.id, ...defaults }));
  const [errors, setErrors] = useState({});
  const set = (k) => (v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => (e[k] ? { ...e, [k]: null } : e));
  };
  const setE = (k) => (e) => set(k)(e.target.value);
  const name = (form.name ?? '').trim();
  const email = (form.contact_email ?? '').trim();
  const emailInvalid = email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  async function save(e) {
    e.preventDefault();
    // Puede abrirse encima de otro formulario (proyecto, cita): que el envío no llegue al de abajo.
    e.stopPropagation();
    if (name.length < 2) { setErrors({ name: 'Escribí el nombre del cliente (mínimo 2 letras).' }); return; }
    if (emailInvalid) { setErrors({ contact_email: 'Revisá el correo.' }); return; }
    const body = {
      name, sector: clean(form.sector), status: form.status, contact_name: clean(form.contact_name), contact_phone: clean(form.contact_phone),
      contact_email: clean(email), owner_id: form.owner_id || null, notes: clean(form.notes),
    };
    const res = await run(() => api(client ? `/api/clients/${client.id}` : '/api/clients', { method: client ? 'PATCH' : 'POST', body }), {
      success: client ? 'Cliente actualizado' : 'Cliente creado',
      onError: (err, msg) => { if (err?.data?.field) setErrors({ [err.data.field]: msg }); },
    });
    if (res?.client) { onSaved?.(res.client); onClose(); }
  }

  return (
    <Modal open={open} onClose={onClose} title={client ? 'Editar cliente' : 'Nuevo cliente'}
      footer={<>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button type="submit" form="client-form" className="btn btn-primary" disabled={busy || name.length < 2}>{busy ? 'Guardando…' : client ? 'Guardar' : 'Crear cliente'}</button>
      </>}>
      <form id="client-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Field label="Nombre del cliente" className="sm:col-span-2" error={errors.name}>
          {(id) => <input id={id} className="input" value={form.name ?? ''} onChange={setE('name')} placeholder="Ej.: La Burrada" autoComplete="off" required />}
        </Field>
        <Field label="Sector" error={errors.sector}>
          {(id) => (
            <>
              <input id={id} className="input" list="client-sectors" value={form.sector ?? ''} onChange={setE('sector')} placeholder="Restaurante, logística…" autoComplete="off" />
              <datalist id="client-sectors">{SECTOR_SUGGESTIONS.map((s) => <option key={s} value={s} />)}</datalist>
            </>
          )}
        </Field>
        <Field label="Estado" error={errors.status}>{(id) => <Select id={id} options={statusOptions} value={form.status} onChange={set('status')} />}</Field>
        <Field label="Persona de contacto" error={errors.contact_name}>
          {(id) => <input id={id} className="input" value={form.contact_name ?? ''} onChange={setE('contact_name')} placeholder="Nombre y apellido" autoComplete="off" />}
        </Field>
        <Field label="WhatsApp / teléfono" hint="Para escribirle con un toque." error={errors.contact_phone}>
          {(id) => <input id={id} className="input" inputMode="tel" value={form.contact_phone ?? ''} onChange={setE('contact_phone')} placeholder="8888-0000" autoComplete="off" />}
        </Field>
        <Field label="Correo" error={errors.contact_email ?? (emailInvalid ? 'Revisá el correo.' : null)}>
          {(id) => <input id={id} type="email" inputMode="email" className="input" value={form.contact_email ?? ''} onChange={setE('contact_email')} placeholder="nombre@empresa.com" autoComplete="off" />}
        </Field>
        <Field label="Quién lleva la relación" hint="La persona del equipo que habla con este cliente." error={errors.owner_id}>
          {(id) => <PersonSelect id={id} value={form.owner_id} onChange={set('owner_id')} placeholder="Sin asignar" />}
        </Field>
        <Field label="Notas" className="sm:col-span-2" error={errors.notes}>
          {(id) => <textarea id={id} className="input" rows={3} value={form.notes ?? ''} onChange={setE('notes')} placeholder="Cómo nos conoció, qué le importa, horarios para llamarle…" />}
        </Field>
      </form>
    </Modal>
  );
}

/**
 * Selector de cliente con la opción "+ Nuevo cliente…", que abre el formulario
 * y deja elegido el cliente creado. onChange(clientId | null, client | null).
 */
export function ClientSelect({ value, onChange, id, placeholder = 'Elegí un cliente', selectedLabel, allowCreate = true, className }) {
  const { data, error, reload } = useResource('/api/clients');
  const [created, setCreated] = useState([]);
  const [creating, setCreating] = useState(false);

  const clients = useMemo(() => {
    const list = data?.clients ?? [];
    const ids = new Set(list.map((c) => c.id));
    return [...list, ...created.filter((c) => !ids.has(c.id))];
  }, [data, created]);
  const groups = Object.entries(CLIENT_STATUS)
    .map(([status, meta]) => [status, meta.label, clients.filter((c) => c.status === status).sort((a, b) => a.name.localeCompare(b.name, 'es'))])
    .filter(([, , list]) => list.length);
  const current = value ? Number(value) : null;
  const missing = current && !clients.some((c) => c.id === current);

  // El formulario del cliente se abre encima de otro modal: Escape cierra solo el de arriba.
  useEffect(() => {
    if (!creating) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); setCreating(false); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [creating]);

  function pick(v) {
    if (v === '__new') { setCreating(true); return; }
    const cid = v ? Number(v) : null;
    onChange(cid, clients.find((c) => c.id === cid) ?? null);
  }

  return (
    <>
      <select id={id} className={cx('input', className)} value={current ?? ''} onChange={(e) => pick(e.target.value)}>
        <option value="">{!data && !error ? 'Cargando clientes…' : placeholder}</option>
        {missing && <option value={current}>{selectedLabel || 'Cliente elegido'}</option>}
        {groups.map(([status, label, list]) => (
          <optgroup key={status} label={label}>
            {list.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </optgroup>
        ))}
        {allowCreate && <option value="__new">+ Nuevo cliente…</option>}
      </select>
      {error && <p className="mt-1 text-xs text-coral">No se pudo cargar la lista de clientes. <button type="button" className="font-semibold underline" onClick={reload}>Reintentar</button></p>}
      {creating && createPortal(
        <ClientForm onClose={() => setCreating(false)} onSaved={(c) => { setCreated((list) => [...list, c]); reload(); onChange(c.id, c); }} />,
        document.body,
      )}
    </>
  );
}

/** Equipo con el responsable primero; acepta miembros del API ({ id, … }) o del formulario ({ user_id, … }). */
export function normalizeMembers(members = [], ownerId) {
  const seen = new Set();
  const out = [];
  if (ownerId) { out.push({ user_id: ownerId, role: 'responsable' }); seen.add(ownerId); }
  for (const m of members) {
    const uid = m.user_id ?? m.id;
    if (!uid || seen.has(uid)) continue;
    seen.add(uid);
    out.push({ user_id: uid, role: PROJECT_ROLES[m.role] ? m.role : 'equipo' });
  }
  return out;
}

/** Miembros del proyecto que vienen del API → valor del editor. */
export const membersToForm = (members = []) => members.map((m) => ({ user_id: m.user_id ?? m.id, role: m.role ?? 'equipo' }));

/**
 * Editor del equipo de un proyecto: el responsable queda fijo arriba y el resto
 * se agrega con su rol. value = [{ user_id, role }].
 */
export function MembersEditor({ value = [], onChange, ownerId }) {
  const { team, activeTeam } = useSession();
  const person = (uid) => team.find((u) => u.id === uid);
  const owner = ownerId ? person(ownerId) : null;
  const others = value.filter((m) => m.user_id !== ownerId);
  const available = activeTeam.filter((u) => u.id !== ownerId && !others.some((m) => m.user_id === u.id));
  const roleOptions = (current) => Object.entries(PROJECT_ROLES)
    .filter(([key]) => key !== 'responsable' || current === 'responsable')
    .map(([v, label]) => ({ value: v, label }));

  const setRole = (uid, role) => onChange(value.map((m) => (m.user_id === uid ? { ...m, role } : m)));
  const remove = (uid) => onChange(value.filter((m) => m.user_id !== uid));
  const add = (uid) => { if (uid) onChange([...value, { user_id: uid, role: 'equipo' }]); };

  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        <li className="flex min-h-[52px] items-center gap-3 rounded-xl border border-line bg-paper px-3 py-2">
          {owner ? (
            <>
              <Avatar name={owner.name} color={owner.color} size={30} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{owner.name}</span>
                <span className="block truncate text-xs text-muted">Se cambia en «Responsable»</span>
              </span>
              <span className="chip tone-blue shrink-0"><Lock className="h-3 w-3" />Responsable</span>
            </>
          ) : <span className="text-sm text-muted">Elegí primero quién es responsable del proyecto.</span>}
        </li>
        {others.map((m) => {
          const u = person(m.user_id);
          const label = u?.name ?? 'Persona del equipo';
          return (
            <li key={m.user_id} className="flex min-h-[52px] items-center gap-2 rounded-xl border border-line px-3 py-2">
              <Avatar name={label} color={u?.color} size={30} />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{label}</span>
              <Select className="w-32 shrink-0 sm:w-40" aria-label={`Rol de ${label}`} options={roleOptions(m.role)} value={m.role} onChange={(r) => setRole(m.user_id, r)} />
              <button type="button" className="btn btn-ghost shrink-0 px-2.5 text-muted hover:text-coral" onClick={() => remove(m.user_id)} aria-label={`Quitar a ${label}`} title="Quitar">
                <X className="h-4 w-4" />
              </button>
            </li>
          );
        })}
      </ul>
      {available.length > 0 ? (
        <select className="input" value="" aria-label="Agregar persona al equipo" onChange={(e) => add(Number(e.target.value) || null)}>
          <option value="">+ Agregar persona</option>
          {available.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      ) : (
        <p className="text-xs text-muted">Todo el equipo activo ya está en este proyecto.</p>
      )}
    </div>
  );
}
