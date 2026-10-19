// Portal del cliente desde la ficha del cliente (v5): accesos, solicitudes (briefs),
// entregables y documentos. Quién da accesos lo decide el servidor (can_manage):
// admin, socios y quien lleva la cuenta.
import { useRef, useState } from 'react';
import {
  KeyRound, ClipboardList, PackageCheck, FolderOpen, UserPlus, Pencil, Power, Lock, Copy, MessageCircle, AlertTriangle, Globe, Plus,
  FileText, Receipt, ChartColumn, BookOpen, Palette, File, ExternalLink, Trash2, FilePlus2, FolderKanban, ShieldCheck, Mail, Phone, Link2, ChevronDown,
} from 'lucide-react';
import { api, isDemo } from '../lib/api.js';
import { Link, useLocation } from '../lib/router.jsx';
import { useSession } from '../lib/session.jsx';
import { Badge, Modal, Field, Select, IconTile, SectionHead, EmptyState, useAction, useConfirm, useToast, cx } from './ui.jsx';
import { Switch } from './automations.jsx';
import { BriefRow, DeliverableItem, Callout, SwitchRow, Layer, isWebLink } from './portal-project.jsx';
import { DOCUMENT_CATEGORIES } from '../../shared/client-portal.js';
import { initials, formatDate, dayKey, timeAgo, whatsappLink } from '../lib/format.js';
import { InvitesPanel } from './invites.jsx';

const clean = (v) => (typeof v === 'string' ? v.trim() || null : v ?? null);
const firstName = (name) => String(name ?? '').trim().split(/\s+/)[0] ?? '';
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const SMALL_BTN = 'btn btn-sm max-sm:min-h-11';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const fieldError = (setErrors) => (err, msg) => { if (err?.data?.field) setErrors({ [err.data.field]: msg }); };

/** Dirección del portal de clientes. En la demo (o un iframe sin origen) se muestra la del portal publicado. */
export function clientPortalUrl() {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  if (isDemo() || !/^https?:\/\//.test(origin)) return 'https://portal.jcanalytic.com/cliente';
  return `${origin}/cliente`;
}

/** Copia texto al portapapeles; si el navegador lo bloquea (iframe), prueba el método clásico. */
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      Object.assign(area.style, { position: 'fixed', top: '-1000px', opacity: '0' });
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

function useCopy() {
  const toast = useToast();
  return async (text, done) => {
    if (await copyText(text)) toast(done);
    else toast('No se pudo copiar: seleccioná el texto y copialo a mano.', 'error');
  };
}

// ── Clave temporal: se muestra una sola vez ─────────────────────────────────
/** Mensaje listo para enviar por WhatsApp o correo con el acceso. */
function accessMessage({ name, email, password, reset }, senderName) {
  const lead = reset
    ? 'te restablecimos el acceso al portal de clientes de JC Analytics.'
    : 'ya tenés acceso al portal de clientes de JC Analytics. Ahí ves el avance de tus proyectos, tus solicitudes, los entregables por aprobar y tus documentos.';
  return [
    `Hola ${firstName(name) || ''}, ${lead}`.replace('Hola ,', 'Hola,'),
    '',
    `Entrá en: ${clientPortalUrl()}`,
    `Correo: ${email}`,
    `Clave temporal: ${password}`,
    '',
    'Al ingresar te va a pedir que la cambiés por una tuya.',
    senderName ? `${firstName(senderName)} · JC Analytics` : 'Equipo JC Analytics',
  ].join('\n');
}

/** result = { name, email, phone, password, reset } */
export function AccessReveal({ result, onClose }) {
  const { user } = useSession();
  const copy = useCopy();
  const message = accessMessage(result, user?.name);
  const wa = whatsappLink(result.phone, message);
  return (
    <Modal open onClose={onClose} title={result.reset ? 'Clave temporal nueva' : 'Acceso listo'}
      footer={<button type="button" className="btn btn-primary" onClick={onClose}>Listo, ya la compartí</button>}>
      <div className="space-y-4">
        <Callout tone="amber" icon={AlertTriangle}>
          <span className="font-semibold">Se muestra una sola vez.</span> Copiala o enviala ahora. Si se pierde, se restablece y se genera otra.
        </Callout>

        <dl className="card-panel divide-y divide-panel-line px-4">
          <div className="relative flex items-center justify-between gap-3 py-2.5">
            <dt className="text-xs text-panel-muted">Portal</dt>
            <dd className="min-w-0 truncate text-sm font-semibold">{clientPortalUrl().replace(/^https?:\/\//, '')}</dd>
          </div>
          <div className="relative flex items-center justify-between gap-3 py-2.5">
            <dt className="text-xs text-panel-muted">Correo</dt>
            <dd className="min-w-0 break-all text-right text-sm font-semibold">{result.email}</dd>
          </div>
          <div className="relative py-3">
            <dt className="text-xs text-panel-muted">Clave temporal</dt>
            <dd className="mt-1 flex min-w-0 items-center justify-between gap-2">
              <span className="select-all break-all font-mono text-xl font-semibold tracking-wider">{result.password}</span>
              <button type="button" className="tap flex shrink-0 items-center justify-center rounded-lg text-panel-muted transition hover:bg-white/10 hover:text-white"
                aria-label="Copiar clave temporal" title="Copiar clave" onClick={() => copy(result.password, 'Clave copiada')}><Copy className="h-4 w-4" /></button>
            </dd>
          </div>
        </dl>

        <div>
          <p className="label">Mensaje para enviar</p>
          <p className="whitespace-pre-line rounded-xl border border-line bg-surface-2 p-3 text-sm leading-relaxed text-ink-2">{message}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button type="button" className="btn btn-outline" onClick={() => copy(message, 'Mensaje copiado')}><Copy className="h-4 w-4" />Copiar mensaje</button>
            {wa ? (
              <a className="btn btn-teal" href={wa} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" />Enviar por WhatsApp</a>
            ) : (
              <p className="flex items-center text-xs text-muted">Sin WhatsApp registrado: copiá el mensaje y envialo por el canal que usen.</p>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ── Accesos ─────────────────────────────────────────────────────────────────
function AccountForm({ clientId, account, defaults, onClose, onSaved }) {
  const [run, busy] = useAction();
  const [form, setForm] = useState(() => ({
    name: account?.name ?? defaults?.name ?? '', email: account?.email ?? defaults?.email ?? '', phone: account?.phone ?? defaults?.phone ?? '',
    title: account?.title ?? '', can_approve: account ? account.can_approve : true,
  }));
  const [errors, setErrors] = useState({});
  const set = (k) => (v) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => (e[k] ? { ...e, [k]: null } : e)); };
  const name = form.name.trim();
  const email = form.email.trim().toLowerCase();
  const emailBad = email && !EMAIL_RE.test(email);
  const emailChanged = account && email !== account.email.toLowerCase();

  async function save(e) {
    e.preventDefault();
    if (name.length < 2) { setErrors({ name: 'Escribí el nombre de la persona (mínimo 2 letras).' }); return; }
    if (!email || emailBad) { setErrors({ email: 'Revisá el correo: con él entra al portal.' }); return; }
    const body = { name, email, phone: clean(form.phone), title: clean(form.title), can_approve: form.can_approve };
    const res = await run(
      () => api(account ? `/api/client-accounts/${account.id}` : `/api/clients/${clientId}/accounts`, { method: account ? 'PATCH' : 'POST', body }),
      { success: account ? 'Acceso actualizado' : `Acceso creado para ${firstName(name)}`, onError: fieldError(setErrors) },
    );
    if (res?.account) { onSaved(res, body); onClose(); }
  }

  return (
    <Modal open onClose={onClose} title={account ? `Editar acceso de ${firstName(account.name)}` : 'Dar acceso al portal'}
      footer={<>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button type="submit" form="account-form" className="btn btn-primary" disabled={busy || name.length < 2 || !email}>
          {busy ? 'Guardando…' : account ? 'Guardar' : <><KeyRound className="h-4 w-4" />Dar acceso</>}
        </button>
      </>}>
      <form id="account-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2" noValidate>
        {!account && (
          <p className="text-sm text-muted sm:col-span-2">Se genera una clave temporal que se muestra una sola vez. Al entrar, la persona la cambia por una suya.</p>
        )}
        <Field label="Nombre" className="sm:col-span-2" error={errors.name}>
          {(id) => <input id={id} className="input" value={form.name} onChange={(e) => set('name')(e.target.value)} placeholder="Nombre y apellido" maxLength={80} autoComplete="off" required />}
        </Field>
        <Field label="Correo" className="sm:col-span-2" error={errors.email ?? (emailBad ? 'Revisá el correo.' : null)}
          hint={emailChanged ? 'Al cambiar el correo se cierran sus sesiones abiertas.' : 'Con este correo entra al portal.'}>
          {(id) => <input id={id} type="email" inputMode="email" className="input" value={form.email} onChange={(e) => set('email')(e.target.value)} placeholder="nombre@empresa.com" maxLength={160} autoComplete="off" required />}
        </Field>
        <Field label="WhatsApp / teléfono" hint="Para enviarle el acceso con un toque." error={errors.phone}>
          {(id) => <input id={id} className="input" inputMode="tel" value={form.phone ?? ''} onChange={(e) => set('phone')(e.target.value)} placeholder="8888-0000" maxLength={30} autoComplete="off" />}
        </Field>
        <Field label="Cargo" error={errors.title}>
          {(id) => <input id={id} className="input" value={form.title ?? ''} onChange={(e) => set('title')(e.target.value)} placeholder="Gerente, marketing…" maxLength={80} autoComplete="off" />}
        </Field>
        <div className="sm:col-span-2">
          <SwitchRow id="account-can-approve" checked={form.can_approve} onChange={set('can_approve')} label="Aprueba entregables"
            hint="Puede aprobar o pedir cambios en lo que el equipo comparte. Sin este permiso solo los ve." />
        </div>
      </form>
    </Modal>
  );
}

/** Aviso del equipo a un cliente: queda en su portal y sale por WhatsApp a quienes activaron los avisos. */
function AnnounceForm({ client, accounts, onClose, onSent }) {
  const [run, busy] = useAction();
  const toast = useToast();
  const [form, setForm] = useState({ title: '', text: '', urgent: false });
  const [errors, setErrors] = useState({});
  const set = (k) => (v) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => (e[k] ? { ...e, [k]: null } : e)); };
  const withWa = accounts.filter((a) => a.active && a.wa_opt_in).length;
  const active = accounts.filter((a) => a.active).length;

  async function send(e) {
    e.preventDefault();
    if (form.title.trim().length < 3) { setErrors({ title: 'Escribí un título corto (mínimo 3 letras).' }); return; }
    if (form.text.trim().length < 5) { setErrors({ text: 'Escribí el mensaje para el cliente.' }); return; }
    const res = await run(() => api(`/api/clients/${client.id}/announce`, { method: 'POST', body: { title: form.title.trim(), text: form.text.trim(), urgent: form.urgent } }), { onError: fieldError(setErrors) });
    if (!res) return;
    toast(res.whatsapp ? `Aviso en el portal de ${plural(res.accounts, 'persona', 'personas')} y en cola para ${plural(res.whatsapp, 'WhatsApp', 'WhatsApps')}.` : `Aviso en el portal de ${plural(res.accounts, 'persona', 'personas')}.`);
    onSent();
    onClose();
  }

  return (
    <Modal open onClose={onClose} title={`Enviar aviso a ${client.name}`}
      footer={<>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button type="submit" form="announce-form" className="btn btn-primary" disabled={busy}><MessageCircle className="h-4 w-4" />{busy ? 'Enviando…' : 'Enviar aviso'}</button>
      </>}>
      <form id="announce-form" onSubmit={send} className="space-y-4" noValidate>
        <Callout tone={withWa ? 'teal' : 'slate'} icon={MessageCircle}>
          {withWa
            ? `Llega al portal de ${plural(active, 'persona', 'personas')} y por WhatsApp a ${plural(withWa, 'persona que activó', 'personas que activaron')} los avisos.`
            : `Llega al portal de ${plural(active, 'persona', 'personas')}. Nadie de ${client.name} activó todavía los avisos por WhatsApp (lo hacen desde Mi cuenta en su portal).`}
        </Callout>
        <Field label="Título" hint="Aparece en el portal y en el aviso de WhatsApp." error={errors.title}>
          {(id) => <input id={id} className="input" value={form.title} onChange={(e) => set('title')(e.target.value)} placeholder="Ej.: Cambio de fecha de entrega" maxLength={120} />}
        </Field>
        <Field label="Mensaje" hint="Concreto y sobre su servicio: así Meta lo trata como aviso, no como publicidad." error={errors.text}>
          {(id) => <textarea id={id} className="input" rows={4} value={form.text} onChange={(e) => set('text')(e.target.value)} placeholder="Ej.: Movimos la entrega al jueves 16 para incluir las fotos nuevas." maxLength={600} />}
        </Field>
        <SwitchRow id="announce-urgent" checked={form.urgent} onChange={set('urgent')} label="Urgente"
          hint="Sale de inmediato aunque sea fuera del horario de 7:00 a 20:00. Usalo solo si no puede esperar." />
      </form>
    </Modal>
  );
}

function WhatsappBadge({ account: a }) {
  if (!a.active) return null;
  if (a.wa_opt_in) return <Badge tone="teal"><MessageCircle className="h-3 w-3" aria-hidden="true" />Avisos por WhatsApp</Badge>;
  if (a.wa_linked) return <Badge tone="slate"><MessageCircle className="h-3 w-3" aria-hidden="true" />WhatsApp pausado</Badge>;
  return null;
}

function AccountRow({ account: a, canManage, busy, onEdit, onToggleApprove, onToggleActive, onReset }) {
  const lastLogin = a.last_login_at ? `Último ingreso ${timeAgo(a.last_login_at)}` : 'Aún no ingresa';
  return (
    <li className={cx('px-4 py-3.5 sm:px-5', !a.active && 'bg-surface-2/50')}>
      <div className="flex items-start gap-3">
        <IconTile tone={a.active ? 'amber' : 'slate'} className={cx('text-sm', !a.active && 'opacity-70')}>{initials(a.name)}</IconTile>
        <div className="min-w-0 flex-1">
          <p className={cx('break-words font-semibold leading-snug', a.active ? 'text-ink' : 'text-muted')}>
            {a.name}{a.title && <span className="font-normal text-muted"> · {a.title}</span>}
          </p>
          <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-sm text-muted"><Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /><span className="min-w-0 select-all break-all">{a.email}</span></p>
          {a.phone && <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted"><Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /><span className="num select-all">{a.phone}</span></p>}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {a.active ? <Badge tone="teal" dot>Con acceso</Badge> : <Badge tone="slate" dot>Sin acceso</Badge>}
            {!canManage && a.can_approve && <Badge tone="blue"><ShieldCheck className="h-3 w-3" aria-hidden="true" />Aprueba entregables</Badge>}
            {a.active && a.must_change_password && <Badge tone="amber"><KeyRound className="h-3 w-3" aria-hidden="true" />Clave temporal pendiente</Badge>}
            <WhatsappBadge account={a} />
            <span className="text-xs text-muted">{a.active ? lastLogin : 'Su historial se conserva'}</span>
          </div>
        </div>
      </div>
      {canManage && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:pl-[52px]">
          {a.active ? (
            <div className="flex items-center gap-3">
              <Switch checked={a.can_approve} onChange={() => onToggleApprove(a)} disabled={busy} label={`Aprueba entregables: ${a.name}`} />
              <span className="text-sm text-ink-2" aria-hidden="true">Aprueba entregables</span>
            </div>
          ) : <span className="hidden sm:block" />}
          <div className="grid grid-cols-3 gap-1.5 sm:flex">
            <button type="button" className={cx(SMALL_BTN, 'btn-outline')} onClick={() => onEdit(a)}><Pencil className="h-3.5 w-3.5" />Editar</button>
            {a.active && <button type="button" className={cx(SMALL_BTN, 'btn-ghost')} onClick={() => onReset(a)} disabled={busy}><KeyRound className="h-3.5 w-3.5" />Nueva clave</button>}
            <button type="button" className={cx(SMALL_BTN, a.active ? 'btn-ghost text-coral-ink' : 'btn-teal col-span-2')} onClick={() => onToggleActive(a)} disabled={busy}>
              <Power className="h-3.5 w-3.5" />{a.active ? 'Quitar acceso' : 'Reactivar'}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

function AccessesPanel({ client, accounts, canManage, onReload }) {
  const { user } = useSession();
  const [run, busy] = useAction();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(null);
  const [reveal, setReveal] = useState(null);
  const [announcing, setAnnouncing] = useState(false);
  const active = accounts.filter((a) => a.active);
  // El primer acceso se precarga con la persona de contacto de la ficha.
  const defaults = accounts.length ? null : { name: client.contact_name ?? '', email: client.contact_email ?? '', phone: client.contact_phone ?? '' };

  const patch = async (a, body, success) => { if (await run(() => api(`/api/client-accounts/${a.id}`, { method: 'PATCH', body }), { success })) onReload(); };
  const toggleApprove = (a) => patch(a, { can_approve: !a.can_approve }, a.can_approve ? `${firstName(a.name)} ya no aprueba entregables` : `${firstName(a.name)} ahora aprueba entregables`);
  async function toggleActive(a) {
    const ok = await confirm(a.active
      ? { title: `Quitar el acceso de ${a.name}`, message: 'Deja de entrar al portal de inmediato y se cierran sus sesiones abiertas. Sus aprobaciones y solicitudes se conservan. Podés reactivarlo cuando quieras.', confirmLabel: 'Quitar acceso', tone: 'danger' }
      : { title: `Reactivar a ${a.name}`, message: 'Vuelve a entrar al portal con su clave actual. Si no la recuerda, generale una nueva.', confirmLabel: 'Reactivar' });
    if (ok) patch(a, { active: !a.active }, a.active ? 'Acceso quitado' : 'Acceso reactivado');
  }
  async function reset(a) {
    if (!(await confirm({ title: 'Nueva clave temporal', message: `Se genera una clave temporal para ${a.name} y se cierran sus sesiones abiertas. Al entrar le pedirá cambiarla.`, confirmLabel: 'Generar clave' }))) return;
    const res = await run(() => api(`/api/client-accounts/${a.id}/reset-password`, { method: 'POST' }));
    if (res?.temporary_password) {
      setReveal({ name: a.name, email: a.email, phone: a.phone, password: res.temporary_password, reset: true });
      onReload();
    }
  }
  const saved = (res, body) => {
    onReload();
    if (res.temporary_password) setReveal({ name: res.account.name, email: res.account.email, phone: body.phone, password: res.temporary_password, reset: false });
  };

  return (
    <>
      <div className="flex flex-col gap-3 border-b border-line bg-surface-2/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <p className="flex min-w-0 items-start gap-2 text-sm text-muted">
          <Globe className="mt-0.5 h-4 w-4 shrink-0 text-muted-2" aria-hidden="true" />
          <span className="min-w-0">Cada persona entra con su correo en <span className="break-all font-semibold text-ink-2">{clientPortalUrl().replace(/^https?:\/\//, '')}</span></span>
        </p>
        {canManage && accounts.length > 0 && (
          <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex">
            {active.length > 0 && <button type="button" className="btn btn-outline" onClick={() => setAnnouncing(true)}><MessageCircle className="h-4 w-4 text-teal-ink" />Enviar aviso</button>}
            <button type="button" className="btn btn-soft" onClick={() => setEditing('new')}><UserPlus className="h-4 w-4" />Dar acceso</button>
          </div>
        )}
      </div>
      {!canManage && (
        <div className="px-4 pt-4 sm:px-5">
          <Callout tone="slate" icon={Lock}>Solo admin, socios o quien lleva la cuenta dan accesos.{client.owner_name ? ` Pedíselo a ${firstName(client.owner_name)}.` : ''}</Callout>
        </div>
      )}
      {accounts.length === 0 ? (
        <div className="p-4 sm:p-5">
          <EmptyState icon={KeyRound} tone="amber" title="Nadie del cliente entra todavía"
            action={canManage && <button type="button" className="btn btn-soft" onClick={() => setEditing('new')}><UserPlus className="h-4 w-4" />Dar acceso</button>}>
            Con acceso, {client.contact_name ? firstName(client.contact_name) : 'el cliente'} sigue etapas, avances y entregables sin pedirte actualizaciones.
          </EmptyState>
        </div>
      ) : (
        <ul className="divide-y divide-line" aria-label="Accesos al portal">
          {accounts.map((a) => (
            <AccountRow key={a.id} account={a} canManage={canManage} busy={busy}
              onEdit={setEditing} onToggleApprove={toggleApprove} onToggleActive={toggleActive} onReset={reset} />
          ))}
        </ul>
      )}
      {accounts.length > 0 && active.length === 0 && (
        <p className="border-t border-line px-4 py-3 text-xs text-muted sm:px-5">Ninguna persona tiene acceso activo: el cliente no ve su portal.</p>
      )}
      {editing && (
        <Layer>
          <AccountForm clientId={client.id} account={editing === 'new' ? null : editing} defaults={defaults}
            onClose={() => setEditing(null)} onSaved={saved} />
        </Layer>
      )}
      {reveal && <Layer><AccessReveal result={reveal} onClose={() => setReveal(null)} /></Layer>}
      {announcing && <Layer><AnnounceForm client={client} accounts={accounts} onClose={() => setAnnouncing(false)} onSent={onReload} /></Layer>}
      {canManage && (
        <details className="group border-t border-line">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold sm:px-5">
            <span className="flex items-center gap-2"><Link2 className="h-4 w-4 text-teal-ink" aria-hidden="true" />Enlaces de registro<span className="font-normal text-muted">· que cada persona del cliente se registre sola</span></span>
            <ChevronDown className="h-4 w-4 text-muted transition group-open:rotate-180" aria-hidden="true" />
          </summary>
          <InvitesPanel clientId={client.id} preset={{ kind: 'client', client_id: client.id, mode: 'open' }} isAdmin={false} senderName={user?.name} compact />
        </details>
      )}
    </>
  );
}

// ── Documentos ──────────────────────────────────────────────────────────────
const DOC_ICON = { contrato: FileText, facturacion: Receipt, reporte: ChartColumn, manual: BookOpen, marca: Palette, otro: File };
const categoryOptions = Object.entries(DOCUMENT_CATEGORIES).map(([value, v]) => ({ value, label: v.label }));

function DocumentForm({ clientId, document: doc, projects, hasPortal, onClose, onSaved }) {
  const [run, busy] = useAction();
  const [form, setForm] = useState(() => ({
    title: doc?.title ?? '', url: doc?.url ?? '', category: doc?.category ?? 'contrato', project_id: doc?.project_id ? String(doc.project_id) : '', note: doc?.note ?? '',
  }));
  const [errors, setErrors] = useState({});
  const set = (k) => (v) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => (e[k] ? { ...e, [k]: null } : e)); };
  const title = form.title.trim();
  const link = form.url.trim();
  const linkBad = link && !isWebLink(link);
  const projectOptions = projects.map((p) => ({ value: String(p.id), label: p.name }));

  async function save(e) {
    e.preventDefault();
    if (title.length < 2) { setErrors({ title: 'Escribí el nombre del documento.' }); return; }
    if (!link || linkBad) { setErrors({ url: 'Pegá el enlace completo del documento (https://…).' }); return; }
    const body = { title, url: link, category: form.category, project_id: form.project_id ? Number(form.project_id) : null, note: clean(form.note) };
    const res = await run(
      () => api(doc ? `/api/client-documents/${doc.id}` : `/api/clients/${clientId}/documents`, { method: doc ? 'PATCH' : 'POST', body }),
      { success: doc ? 'Documento actualizado' : hasPortal ? 'Documento compartido: el cliente recibe un aviso' : 'Documento agregado', onError: fieldError(setErrors) },
    );
    if (res) { onSaved(); onClose(); }
  }

  return (
    <Modal open onClose={onClose} title={doc ? 'Editar documento' : 'Agregar documento'}
      footer={<>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button type="submit" form="document-form" className="btn btn-primary" disabled={busy || title.length < 2 || !link}>{busy ? 'Guardando…' : doc ? 'Guardar' : 'Compartir documento'}</button>
      </>}>
      <form id="document-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Field label="Título" className="sm:col-span-2" error={errors.title}>
          {(id) => <input id={id} className="input" value={form.title} onChange={(e) => set('title')(e.target.value)} placeholder="Ej.: Propuesta y alcance firmados" maxLength={120} autoComplete="off" required />}
        </Field>
        <Field label="Enlace" className="sm:col-span-2" hint="Drive, Dropbox, OneDrive… Revisá que el cliente tenga permiso para abrirlo." error={errors.url ?? (linkBad ? 'Pegá un enlace completo que empiece con https://' : null)}>
          {(id) => <input id={id} type="url" inputMode="url" className="input" value={form.url} onChange={(e) => set('url')(e.target.value)} placeholder="https://" autoComplete="off" required />}
        </Field>
        <Field label="Categoría" error={errors.category}>
          {(id) => <Select id={id} options={categoryOptions} value={form.category} onChange={set('category')} />}
        </Field>
        <Field label="Proyecto" error={errors.project_id}>
          {(id) => <Select id={id} options={projectOptions} value={form.project_id} onChange={set('project_id')} placeholder="General (sin proyecto)" />}
        </Field>
        <Field label="Nota" className="sm:col-span-2" hint="Opcional. El cliente la ve junto al documento." error={errors.note}>
          {(id) => <textarea id={id} className="input" rows={2} maxLength={500} value={form.note} onChange={(e) => set('note')(e.target.value)} placeholder="Ej.: Pagada. Saldo contra entrega." />}
        </Field>
      </form>
    </Modal>
  );
}

function DocumentsPanel({ clientId, documents, projects, hasPortal, onReload }) {
  const [run, busy] = useAction();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(null);
  const groups = Object.entries(DOCUMENT_CATEGORIES)
    .map(([key, meta]) => [key, meta, documents.filter((d) => (DOCUMENT_CATEGORIES[d.category] ? d.category : 'otro') === key)])
    .filter(([, , list]) => list.length);

  async function remove(d) {
    if (!(await confirm({ title: 'Quitar documento', message: `"${d.title}" deja de verse en el portal del cliente. El archivo original no se borra.`, confirmLabel: 'Quitar', tone: 'danger' }))) return;
    if (await run(() => api(`/api/client-documents/${d.id}`, { method: 'DELETE' }), { success: 'Documento quitado' })) onReload();
  }

  return (
    <>
      <div className="flex flex-col gap-3 border-b border-line bg-surface-2/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <p className="text-sm text-muted">Contratos, facturas, reportes y manuales que el cliente consulta en su portal.</p>
        {documents.length > 0 && <button type="button" className="btn btn-soft shrink-0" onClick={() => setEditing('new')}><Plus className="h-4 w-4" />Agregar documento</button>}
      </div>
      {documents.length === 0 ? (
        <div className="p-4 sm:p-5">
          <EmptyState icon={FolderOpen} tone="violet" title="Sin documentos compartidos" action={<button type="button" className="btn btn-soft" onClick={() => setEditing('new')}><Plus className="h-4 w-4" />Agregar documento</button>}>
            Compartí la propuesta firmada, facturas o el manual de uso para que el cliente los tenga siempre a mano.
          </EmptyState>
        </div>
      ) : groups.map(([key, meta, list], gi) => (
        <div key={key}>
          <p className={cx('flex items-center gap-2 bg-surface-2/70 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted sm:px-5', gi > 0 && 'border-t border-line')}>
            <span className={cx('h-1.5 w-1.5 rounded-full', `dot-${meta.tone}`)} aria-hidden="true" />
            {meta.label} <span className="num font-semibold text-muted-2">{list.length}</span>
          </p>
          <ul className="divide-y divide-line border-t border-line">
            {list.map((d) => (
              <li key={d.id} className="flex items-start gap-3 px-4 py-3 sm:px-5">
                <IconTile icon={DOC_ICON[d.category] ?? File} tone={meta.tone} size="sm" className="mt-0.5" />
                <div className="min-w-0 flex-1">
                  <a href={d.url} target="_blank" rel="noreferrer" className="group inline-flex max-w-full items-start gap-1.5 text-sm font-semibold leading-snug text-ink hover:text-brand-ink">
                    <span className="min-w-0 break-words">{d.title}</span><ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-2 group-hover:text-brand-ink" aria-hidden="true" />
                  </a>
                  <p className="mt-0.5 text-xs text-muted">
                    {d.project_name && <><FolderKanban className="mr-1 inline h-3 w-3 align-[-2px]" aria-hidden="true" />{d.project_name}{' · '}</>}
                    {d.created_by_name ? `${firstName(d.created_by_name)} · ` : ''}{formatDate(dayKey(d.updated_at ?? d.created_at))}
                  </p>
                  {d.note && <p className="mt-1 whitespace-pre-line text-sm text-ink-2">{d.note}</p>}
                </div>
                <div className="flex shrink-0 items-center">
                  <button type="button" className="btn btn-ghost btn-icon tap text-muted hover:text-ink" onClick={() => setEditing(d)} aria-label={`Editar "${d.title}"`} title="Editar"><Pencil className="h-4 w-4" /></button>
                  <button type="button" className="btn btn-ghost btn-icon tap text-muted hover:text-coral-ink" onClick={() => remove(d)} disabled={busy} aria-label={`Quitar "${d.title}"`} title="Quitar"><Trash2 className="h-4 w-4" /></button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {editing && (
        <Layer>
          <DocumentForm clientId={clientId} document={editing === 'new' ? null : editing} projects={projects} hasPortal={hasPortal}
            onClose={() => setEditing(null)} onSaved={onReload} />
        </Layer>
      )}
    </>
  );
}

// ── Sección completa con pestañas ───────────────────────────────────────────
const TAB_KEYS = ['accesos', 'solicitudes', 'entregables', 'documentos'];

/**
 * "Portal del cliente" en la ficha del cliente.
 * portal = { accounts, can_manage, briefs, deliverables, documents } de GET /api/clients/:id
 */
export function ClientPortalSection({ client, portal, projects, onReload }) {
  const { query } = useLocation();
  const requested = query.get('portal');
  const [tab, setTab] = useState(TAB_KEYS.includes(requested) ? requested : 'accesos');
  const tabRefs = useRef({});
  const { accounts = [], can_manage: canManage = false, briefs = [], deliverables = [], documents = [] } = portal ?? {};
  const activeAccounts = accounts.filter((a) => a.active).length;
  const toReview = briefs.filter((b) => b.status === 'enviado').length;
  const changes = deliverables.filter((d) => d.status === 'cambios').length;
  const waiting = deliverables.filter((d) => d.status === 'en_revision').length;
  // Proyectos que el cliente puede ligar a un documento (los archivados también: son su historial).
  const clientProjects = projects.filter((p) => p.status !== 'prospecto');

  const tabs = [
    { value: 'accesos', label: 'Accesos', icon: KeyRound, count: activeAccounts },
    { value: 'solicitudes', label: 'Solicitudes', icon: ClipboardList, count: briefs.length, flag: toReview ? 'amber' : null, flagLabel: `${toReview} por revisar` },
    { value: 'entregables', label: 'Entregables', icon: PackageCheck, count: deliverables.length, flag: changes ? 'red' : null, flagLabel: `${changes} con cambios pedidos` },
    { value: 'documentos', label: 'Documentos', icon: FolderOpen, count: documents.length },
  ];

  function onKeyDown(e) {
    const i = TAB_KEYS.indexOf(tab);
    const next = e.key === 'ArrowRight' ? (i + 1) % TAB_KEYS.length : e.key === 'ArrowLeft' ? (i - 1 + TAB_KEYS.length) % TAB_KEYS.length
      : e.key === 'Home' ? 0 : e.key === 'End' ? TAB_KEYS.length - 1 : null;
    if (next == null) return;
    e.preventDefault();
    setTab(TAB_KEYS[next]);
    tabRefs.current[TAB_KEYS[next]]?.focus();
  }

  const hint = activeAccounts
    ? `${plural(activeAccounts, 'persona entra', 'personas entran')} · ve etapas, avances, entregables y documentos`
    : 'Sin accesos activos: el cliente todavía no ve su portal';

  return (
    <section id="portal-cliente" className="card animate-rise scroll-mt-20 overflow-hidden" aria-labelledby="portal-title">
      <SectionHead flush id="portal-title" icon={Globe} tone="teal" title="Portal del cliente" hint={hint}
        action={activeAccounts ? <Badge tone="teal" dot>Activo</Badge> : <Badge tone="slate" dot>Sin acceso</Badge>} />

      <div role="tablist" aria-label="Portal del cliente" className="grid grid-cols-4 border-b border-line" onKeyDown={onKeyDown}>
        {tabs.map((t) => {
          const on = tab === t.value;
          return (
            <button key={t.value} ref={(el) => { tabRefs.current[t.value] = el; }} type="button" role="tab" id={`portal-tab-${t.value}`}
              aria-selected={on} aria-controls={`portal-panel-${t.value}`} tabIndex={on ? 0 : -1} onClick={() => setTab(t.value)}
              className={cx('relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-xs font-semibold transition sm:min-h-12 sm:flex-row sm:gap-2 sm:text-sm',
                on ? 'text-ink' : 'text-muted hover:bg-surface-2 hover:text-ink')}>
              <span className="relative">
                <t.icon className={cx('h-[18px] w-[18px] sm:h-4 sm:w-4', on && 'text-brand-ink')} aria-hidden="true" />
                {t.flag && <span className={cx('absolute -right-1 -top-1 h-2 w-2 rounded-full ring-2 ring-surface', `dot-${t.flag}`)} aria-hidden="true" />}
              </span>
              <span className="max-w-full truncate">{t.label}</span>
              <span className={cx('num hidden rounded-full px-1.5 text-[11px] leading-5 sm:inline', on ? 'bg-brand-soft text-brand-ink' : 'bg-surface-3 text-muted')} aria-hidden="true">{t.count}</span>
              <span className="sr-only">{`(${t.count}${t.flag ? `, ${t.flagLabel}` : ''})`}</span>
              {on && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-brand" aria-hidden="true" />}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={`portal-panel-${tab}`} aria-labelledby={`portal-tab-${tab}`}>
        {tab === 'accesos' && <AccessesPanel client={client} accounts={accounts} canManage={canManage} onReload={onReload} />}

        {tab === 'solicitudes' && (
          <>
            <div className="flex flex-col gap-3 border-b border-line bg-surface-2/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="text-sm text-muted">{briefs.length ? `${plural(briefs.length, 'brief', 'briefs')}${toReview ? ` · ${toReview} por revisar` : ''}. El cliente también puede enviarlos desde su portal.` : 'Requerimientos creativos con el formato de JC. El cliente también puede enviarlos desde su portal.'}</p>
              <Link to={`/briefs/nuevo?cliente=${client.id}`} className="btn btn-soft shrink-0"><FilePlus2 className="h-4 w-4" />Nuevo brief</Link>
            </div>
            {briefs.length === 0 ? (
              <p className="flex items-start gap-2 px-4 py-5 text-sm text-muted sm:px-5"><ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-muted-2" aria-hidden="true" />Todavía no hay solicitudes de este cliente.</p>
            ) : <ul className="divide-y divide-line">{briefs.map((b) => <BriefRow key={b.id} brief={b} showProject />)}</ul>}
          </>
        )}

        {tab === 'entregables' && (
          <>
            <p className="border-b border-line bg-surface-2/50 px-4 py-3 text-sm text-muted sm:px-5">
              {deliverables.length ? `${[changes && `${changes} con cambios pedidos`, waiting && `${waiting} esperando al cliente`].filter(Boolean).join(' · ') || 'Todo decidido'}. ` : ''}
              Se comparten desde la ficha de cada proyecto; el cliente los aprueba o pide cambios.
            </p>
            {deliverables.length === 0 ? (
              <p className="flex items-start gap-2 px-4 py-5 text-sm text-muted sm:px-5"><PackageCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-2" aria-hidden="true" />Nada compartido para aprobación todavía.</p>
            ) : (
              <ul className="divide-y divide-line">
                {deliverables.map((d) => (
                  <DeliverableItem key={d.id} d={d} showProject>
                    {d.url && <a href={d.url} target="_blank" rel="noreferrer" className={cx(SMALL_BTN, 'btn-ghost')}><ExternalLink className="h-3.5 w-3.5" />Abrir</a>}
                    {d.project_id && <Link to={`/proyectos/${d.project_id}`} className={cx(SMALL_BTN, 'btn-outline')}><FolderKanban className="h-3.5 w-3.5" />Ver proyecto</Link>}
                  </DeliverableItem>
                ))}
              </ul>
            )}
          </>
        )}

        {tab === 'documentos' && <DocumentsPanel clientId={client.id} documents={documents} projects={clientProjects} hasPortal={activeAccounts > 0} onReload={onReload} />}
      </div>
    </section>
  );
}
