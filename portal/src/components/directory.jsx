// Libro amarillo: ficha del contacto (registrar llamada, observaciones, historial),
// formulario de alta/edición e importación de Excel/CSV con vista previa.
import { useRef, useState } from 'react';
import {
  Phone, MessageCircle, Globe, AtSign, PhoneCall, Pencil, Trash2, FileSpreadsheet, Upload, Download,
  CheckCircle2, AlertTriangle, Undo2, History, MapPin, NotebookPen,
} from 'lucide-react';
import { api, ApiError } from '../lib/api.js';
import { useResource, useSession } from '../lib/session.jsx';
import { whatsappLink, formatDateTime, formatDate, timeAgo } from '../lib/format.js';
import { readSpreadsheetFile } from '../lib/xlsx.js';
import { Modal, Field, Select, Badge, Avatar, Spinner, useAction, useConfirm, useToast, cx } from './ui.jsx';
import { PersonSelect, StatusBadge } from './common.jsx';
import {
  DIRECTORY_STATUS, PROVINCES, IMPORT_CHUNK, rowsFromSheet, extractPhones,
} from '../../shared/directory.js';
import '../styles/directory.css';

const OUTCOMES = Object.keys(DIRECTORY_STATUS).filter((k) => k !== 'pendiente');
const NEEDS_DATE = new Set(['no_contesta', 'volver_a_llamar', 'interesado']);
const clean = (v) => (typeof v === 'string' ? v.trim() || null : v ?? null);

export function DirectoryStatusBadge({ status }) {
  return <StatusBadge map={DIRECTORY_STATUS} value={status} />;
}

/** tel: con prefijo de Costa Rica para que el celular marque directo. */
export function telLink(phone) {
  const [digits] = extractPhones(phone);
  if (digits) return `tel:+506${digits}`;
  const raw = String(phone ?? '').replace(/[^\d+]/g, '');
  return raw ? `tel:${raw}` : null;
}

/** "fb.com/x · instagram.com/y" → enlaces abribles (solo http/https). */
function socialLinks(value) {
  return String(value ?? '').split(/\s*[·|,]\s*|\s+/).filter(Boolean).map((part) => {
    const url = /^https?:\/\//i.test(part) ? part : /\.(com|net|org|cr|me|tree|app)\b/i.test(part) ? `https://${part}` : null;
    try { return url ? new URL(url).toString() : null; } catch { return null; }
  }).filter(Boolean);
}

const firstName = (name) => (name ?? '').trim().split(/\s+/)[0] ?? '';
const isOverdue = (entry, today) => entry.next_call_at && entry.next_call_at <= today && NEEDS_DATE.has(entry.status);
export const dueLabel = (entry, today) => {
  if (!entry.next_call_at) return null;
  if (entry.next_call_at < today) return `Atrasada desde ${formatDate(entry.next_call_at)}`;
  if (entry.next_call_at === today) return 'Llamar hoy';
  return `Llamar el ${formatDate(entry.next_call_at)}`;
};

// ── Ficha del contacto ──────────────────────────────────────────────────────

/**
 * @param {{ entryId: number, today: string, onClose: () => void, onChanged: (entry) => void,
 *           onDeleted: (id) => void, onEdit: (entry) => void }} props
 */
export function ContactSheet({ entryId, today, onClose, onChanged, onDeleted, onEdit }) {
  const { user, isAdmin } = useSession();
  const toast = useToast();
  const confirm = useConfirm();
  const [run, busy] = useAction();
  const { data: detail, error: loadError, reload, setData } = useResource(`/api/directory/${entryId}`);
  const [outcome, setOutcome] = useState(null);
  const [note, setNote] = useState('');
  const [next, setNext] = useState('');
  const [obs, setObs] = useState(null); // null = sin cambios locales

  const entry = detail?.entry;

  /** Aplica un contacto actualizado y recarga el historial. */
  function applyEntry(updated) {
    onChanged(updated);
    setData((d) => (d ? { ...d, entry: updated } : d));
    reload();
  }

  async function saveCall(e) {
    e.preventDefault();
    if (!outcome) return;
    const res = await run(() => api(`/api/directory/${entry.id}/calls`, {
      method: 'POST', body: { outcome, note: clean(note), next_call_at: NEEDS_DATE.has(outcome) ? next || null : null },
    }), { success: `Llamada registrada: ${DIRECTORY_STATUS[outcome].label}` });
    if (res?.entry) { setOutcome(null); setNote(''); setNext(''); applyEntry(res.entry); }
  }

  async function patch(body, success) {
    try {
      const res = await api(`/api/directory/${entry.id}`, { method: 'PATCH', body: { ...body, expected_revision: entry.revision } });
      toast(success);
      applyEntry(res.entry);
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.data?.error === 'conflict') {
        toast('Alguien más acaba de guardar este contacto. Te mostramos la versión actual.', 'error');
        applyEntry(error.data.entry);
      } else toast(error?.data?.message ?? 'No se pudo guardar.', 'error');
      return false;
    }
  }

  async function remove() {
    const ok = await confirm({ title: `¿Borrar ${entry.name}?`, message: 'Se borra del libro con su historial de llamadas. No se puede deshacer.', confirmLabel: 'Borrar', tone: 'danger' });
    if (!ok) return;
    const res = await run(() => api(`/api/directory/${entry.id}`, { method: 'DELETE' }), { success: 'Contacto borrado' });
    if (res?.ok) { onDeleted(entry.id); onClose(); }
  }

  const canDelete = entry && (isAdmin || (entry.created_by === user.id && entry.call_count === 0));
  const wa = entry && (entry.whatsapp || entry.phone) && whatsappLink(entry.whatsapp || entry.phone, `Hola, le saluda ${firstName(user.name)} de JC Analytics.`);
  const links = entry ? socialLinks(entry.social) : [];
  const site = entry ? socialLinks(entry.website)[0] : null;
  const obsValue = obs ?? entry?.observations ?? '';

  return (
    <Modal open onClose={onClose} size="lg" title={entry?.name ?? 'Contacto'}
      footer={entry && <>
        {canDelete && <button type="button" className="btn btn-ghost mr-auto text-coral-ink" onClick={remove} disabled={busy}><Trash2 className="h-4 w-4" />Borrar</button>}
        <button type="button" className="btn btn-outline" onClick={() => onEdit(entry)}><Pencil className="h-4 w-4" />Editar datos</button>
        <button type="button" className="btn btn-primary" onClick={onClose}>Listo</button>
      </>}>
      {!entry ? (
        loadError ? <p className="py-6 text-center text-sm text-muted">No se pudo abrir el contacto. Puede que lo hayan borrado.</p> : <div className="flex justify-center py-10"><Spinner /></div>
      ) : (
        <div className="space-y-6">
          {/* Quién es y cómo contactarlo */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <DirectoryStatusBadge status={entry.status} />
              {entry.category && <Badge tone="amber">{entry.category}</Badge>}
              {isOverdue(entry, today) && <Badge tone="red" dot>{dueLabel(entry, today)}</Badge>}
              {entry.call_count > 0 && <span className="text-xs text-muted">{entry.call_count} {entry.call_count === 1 ? 'llamada' : 'llamadas'} · última {timeAgo(entry.last_call_at)}</span>}
            </div>
            {(entry.address || entry.canton || entry.province) && (
              <p className="flex items-start gap-2 text-sm text-ink-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-2" />
                <span>{[entry.address, entry.district, entry.canton, entry.province].filter(Boolean).join(', ')}</span></p>
            )}
            <div className="flex flex-wrap gap-2">
              {[entry.phone, entry.phone_alt].filter(Boolean).map((p) => telLink(p) && (
                <a key={p} href={telLink(p)} className="btn btn-primary"><Phone className="h-4 w-4" /><span className="num">{p}</span></a>
              ))}
              {wa && <a href={wa} target="_blank" rel="noreferrer" className="btn btn-outline"><MessageCircle className="h-4 w-4 text-teal-ink" />WhatsApp{entry.whatsapp && entry.whatsapp !== entry.phone ? ` ${entry.whatsapp}` : ''}</a>}
              {links.slice(0, 2).map((l) => <a key={l} href={l} target="_blank" rel="noreferrer" className="btn btn-outline"><AtSign className="h-4 w-4" />{new URL(l).hostname.replace(/^www\./, '')}</a>)}
              {site && <a href={site} target="_blank" rel="noreferrer" className="btn btn-outline"><Globe className="h-4 w-4" />Sitio web</a>}
            </div>
            {!entry.phone && <p className="text-sm text-amber-ink">Este contacto no tiene teléfono. Buscalo en Google Maps o en sus redes y agregalo con "Editar datos".</p>}
            {entry.opportunity && (
              <p className="rounded-xl bg-surface-2 px-3 py-2 text-sm text-ink-2"><span className="font-semibold text-ink">Oportunidad: </span>{entry.opportunity}</p>
            )}
          </section>

          {/* Registrar la llamada */}
          <form onSubmit={saveCall} className="space-y-3 rounded-2xl border border-line p-4">
            <h3 className="flex items-center gap-2 font-display text-base font-bold"><PhoneCall className="h-4 w-4 text-brand-ink" />¿Cómo terminó la llamada?</h3>
            <div className="yb-outcomes" role="radiogroup" aria-label="Resultado de la llamada">
              {OUTCOMES.map((key) => (
                <button key={key} type="button" role="radio" aria-checked={outcome === key} className="yb-outcome" onClick={() => setOutcome(key)}>
                  <span className={cx('h-2 w-2 shrink-0 rounded-full', `dot-${DIRECTORY_STATUS[key].tone}`)} aria-hidden="true" />
                  {DIRECTORY_STATUS[key].label}
                </button>
              ))}
            </div>
            {outcome && (
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem]">
                <Field label="Qué pasó en la llamada">
                  {(id) => <textarea id={id} className="input" rows={2} value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)}
                    placeholder="Con quién hablaste, qué le interesa, a qué hora atiende…" />}
                </Field>
                {NEEDS_DATE.has(outcome) && (
                  <Field label="Próxima llamada">
                    {(id) => <input id={id} type="date" className="input" min={today} value={next} onChange={(e) => setNext(e.target.value)} />}
                  </Field>
                )}
              </div>
            )}
            <div className="flex justify-end">
              <button type="submit" className="btn btn-dark" disabled={!outcome || busy}>{busy ? 'Guardando…' : 'Guardar llamada'}</button>
            </div>
          </form>

          {/* Observaciones permanentes y responsable */}
          <section className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_14rem]">
            <Field label="Observaciones" hint="Lo que todo el equipo debe saber antes de llamar.">
              {(id) => (
                <>
                  <textarea id={id} className="input" rows={3} maxLength={2000} value={obsValue} onChange={(e) => setObs(e.target.value)}
                    placeholder="Ej.: el dueño es Carlos, atiende después de las 3 p. m.; ya usa Uber Eats." />
                  {obs !== null && obs !== (entry.observations ?? '') && (
                    <div className="mt-2 flex gap-2">
                      <button type="button" className="btn btn-primary btn-sm" onClick={async () => { if (await patch({ observations: clean(obs) }, 'Observaciones guardadas')) setObs(null); }}>Guardar observaciones</button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setObs(null)}>Descartar</button>
                    </div>
                  )}
                </>
              )}
            </Field>
            <Field label="Quién lo trabaja">
              {(id) => <PersonSelect id={id} value={entry.assigned_to} onChange={(v) => patch({ assigned_to: v }, v ? 'Contacto asignado' : 'Contacto sin asignar')} placeholder="Nadie todavía" />}
            </Field>
          </section>

          {/* Historial */}
          <section>
            <h3 className="mb-2 flex items-center gap-2 font-display text-base font-bold"><History className="h-4 w-4 text-muted" />Historial de llamadas</h3>
            {detail.calls.length === 0 ? (
              <p className="text-sm text-muted">Nadie lo ha llamado todavía.</p>
            ) : (
              <ol className="space-y-3">
                {detail.calls.map((c) => (
                  <li key={c.id} className="flex gap-3">
                    <Avatar name={c.user_name ?? 'Alguien'} color={c.user_color ?? undefined} size={28} />
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"><span className="font-semibold">{c.user_name ?? 'Alguien'}</span>
                        <DirectoryStatusBadge status={c.outcome} /><span className="text-xs text-muted first-letter:uppercase">{formatDateTime(c.created_at)}</span></p>
                      {c.note && <p className="mt-1 whitespace-pre-line text-sm text-ink-2">{c.note}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
            <p className="mt-4 text-xs text-muted">
              {entry.source && <>Fuente: <span className="break-all">{entry.source}</span>. </>}
              Agregado {entry.created_by_name ? `por ${entry.created_by_name} ` : ''}{timeAgo(entry.created_at)}.
            </p>
          </section>
        </div>
      )}
    </Modal>
  );
}

// ── Alta y edición ──────────────────────────────────────────────────────────

const FORM_FIELDS = [
  ['name', 'Nombre del negocio', { span: 2, placeholder: 'Ej.: Soda La Esquina', required: true }],
  ['category', 'Tipo de comida o rubro', { placeholder: 'Hamburguesas, pizzería, soda…', list: 'yb-categories' }],
  ['phone', 'Teléfono', { placeholder: '2430-8888', inputMode: 'tel' }],
  ['phone_alt', 'Teléfono 2', { placeholder: 'Opcional', inputMode: 'tel' }],
  ['whatsapp', 'WhatsApp', { placeholder: 'Si es otro número', inputMode: 'tel' }],
  ['province', 'Provincia', { select: true }],
  ['canton', 'Cantón', { placeholder: 'Ej.: Santo Domingo' }],
  ['district', 'Distrito', { placeholder: 'Opcional' }],
  ['address', 'Dirección / referencia', { span: 2, placeholder: '100 m sur del Banco Popular…' }],
  ['social', 'Redes sociales', { span: 2, placeholder: 'facebook.com/… · instagram.com/…' }],
  ['website', 'Sitio web', { placeholder: 'https://…' }],
  ['source', 'Fuente del dato', { placeholder: 'Google Maps, Facebook…' }],
  ['opportunity', 'Oportunidad comercial', { span: 2, area: true, placeholder: 'Qué le podemos ofrecer: web, pedidos sin comisión, redes…' }],
];
const CATEGORY_SUGGESTIONS = ['Hamburguesas', 'Pizzería', 'Soda', 'Comida rápida', 'Pollo frito', 'Taquería', 'Comida mexicana', 'Sushi', 'Cafetería', 'Food truck', 'Mariscos'];

/** Agregar o editar un contacto. onSaved(entry). */
export function ContactForm({ entry, onClose, onSaved }) {
  const [run, busy] = useAction();
  const [form, setForm] = useState(() => ({ ...entry }));
  const [errors, setErrors] = useState({});
  const set = (k) => (v) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => (e[k] ? { ...e, [k]: null } : e)); };
  const name = (form.name ?? '').trim();

  async function save(e) {
    e.preventDefault();
    e.stopPropagation();
    if (name.length < 2) { setErrors({ name: 'Escribí el nombre del negocio.' }); return; }
    const body = Object.fromEntries(FORM_FIELDS.map(([k]) => [k, clean(form[k])]));
    if (entry?.id) body.expected_revision = entry.revision;
    const res = await run(() => api(entry?.id ? `/api/directory/${entry.id}` : '/api/directory', { method: entry?.id ? 'PATCH' : 'POST', body }), {
      success: entry?.id ? 'Contacto actualizado' : 'Contacto agregado',
      onError: (err, msg) => setErrors({ [err?.data?.field ?? 'name']: err?.data?.message ?? msg }),
    });
    if (res?.entry) { onSaved(res.entry); onClose(); }
  }

  return (
    <Modal open onClose={onClose} title={entry?.id ? 'Editar contacto' : 'Agregar al libro amarillo'} size="lg"
      footer={<>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button type="submit" form="yb-form" className="btn btn-primary" disabled={busy || name.length < 2}>{busy ? 'Guardando…' : entry?.id ? 'Guardar' : 'Agregar contacto'}</button>
      </>}>
      <form id="yb-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2" noValidate>
        {FORM_FIELDS.map(([key, label, o]) => (
          <Field key={key} label={label} error={errors[key]} className={o.span === 2 ? 'sm:col-span-2' : undefined}>
            {(id) => o.select ? (
              <Select id={id} value={form[key] ?? ''} onChange={set(key)} options={[{ value: '', label: 'Sin provincia' }, ...PROVINCES.map((p) => ({ value: p, label: p }))]} />
            ) : o.area ? (
              <textarea id={id} className="input" rows={2} value={form[key] ?? ''} onChange={(ev) => set(key)(ev.target.value)} placeholder={o.placeholder} />
            ) : (
              <input id={id} className="input" value={form[key] ?? ''} onChange={(ev) => set(key)(ev.target.value)} placeholder={o.placeholder}
                inputMode={o.inputMode} list={o.list} autoComplete="off" required={o.required} />
            )}
          </Field>
        ))}
        <datalist id="yb-categories">{CATEGORY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}</datalist>
      </form>
    </Modal>
  );
}

// ── Importar Excel ──────────────────────────────────────────────────────────

const TEMPLATE_HEADER = ['Nombre del negocio', 'Tipo de comida', 'Provincia', 'Cantón', 'Dirección / referencia', 'Teléfono', 'Teléfono 2', 'WhatsApp',
  'Redes sociales', 'Sitio web', 'Fuente', 'Oportunidad', 'Estado', 'Observaciones', 'Próxima llamada'];
const TEMPLATE_EXAMPLE = ['Soda Ejemplo (borrar esta fila)', 'Soda', 'Heredia', 'Barva', '100 m norte de la iglesia', '2260-0000', '', '8888-0000',
  'facebook.com/sodaejemplo', '', 'Google Maps', 'Sin web; pedidos solo por WhatsApp', 'Por llamar', '', ''];

function downloadTemplate() {
  const esc = (v) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const csv = `\uFEFF${[TEMPLATE_HEADER, TEMPLATE_EXAMPLE].map((r) => r.map(esc).join(';')).join('\r\n')}\r\n`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = 'plantilla-libro-amarillo.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const COLUMN_LABELS = {
  name: 'Nombre', category: 'Tipo', province: 'Provincia', canton: 'Cantón', district: 'Distrito', address: 'Dirección', phone: 'Teléfono',
  phone_alt: 'Teléfono 2', whatsapp: 'WhatsApp', social: 'Redes', website: 'Sitio web', source: 'Fuente', opportunity: 'Oportunidad',
  status: 'Estado', observations: 'Observaciones', next_call_at: 'Próxima llamada',
};

/** Subir un Excel o CSV: vista previa con las mismas reglas del servidor y envío por partes. */
export function ImportDialog({ imports = [], onClose, onImported }) {
  const { user, isAdmin } = useSession();
  const confirm = useConfirm();
  const [run, busy] = useAction();
  const input = useRef(null);
  const [over, setOver] = useState(false);
  const [phase, setPhase] = useState('pick'); // pick · preview · running · done
  const [error, setError] = useState(null);
  const [file, setFile] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState(null);

  async function choose(f) {
    if (!f) return;
    setError(null);
    try {
      const { matrix, sheet } = await readSpreadsheetFile(f);
      const result = rowsFromSheet(matrix);
      if (result.headerRow < 0) {
        setError('No encontramos la fila de encabezados. La hoja necesita al menos una columna "Nombre del negocio" y otra como "Teléfono" o "Cantón". Descargá la plantilla para ver el formato.');
        return;
      }
      if (!result.rows.length) { setError('El archivo no trae contactos con nombre.'); return; }
      setFile(f);
      setParsed({ ...result, sheet });
      setPhase('preview');
    } catch (e) {
      setError(e?.message ?? 'No se pudo leer el archivo.');
    }
  }

  async function start() {
    setPhase('running');
    const total = { inserted: 0, merged: 0, skipped: 0, errors: [] };
    let importId = null;
    const { rows } = parsed;
    for (let i = 0; i < rows.length; i += IMPORT_CHUNK) {
      const part = rows.slice(i, i + IMPORT_CHUNK);
      const last = i + IMPORT_CHUNK >= rows.length;
      try {
        const res = await api('/api/directory/import', { method: 'POST', body: { file_name: file.name, import_id: importId, rows: part, last } });
        importId = res.import_id;
        total.inserted += res.inserted; total.merged += res.merged; total.skipped += res.skipped; total.errors.push(...res.errors);
      } catch (e) {
        total.failedAt = i + 1;
        total.failure = e?.data?.message ?? 'Se cortó la conexión.';
        break;
      }
      setProgress(Math.min(rows.length, i + IMPORT_CHUNK));
    }
    setSummary({ ...total, importId, fileSkipped: parsed.skipped });
    setPhase('done');
    onImported();
  }

  async function undo(batch) {
    const ok = await confirm({ title: `¿Deshacer "${batch.file_name}"?`, tone: 'danger', confirmLabel: 'Deshacer importación',
      message: 'Se borran los contactos que trajo ese archivo y que nadie ha llamado. Los que ya se trabajaron se conservan.' });
    if (!ok) return;
    const res = await run(() => api(`/api/directory/imports/${batch.id}`, { method: 'DELETE' }));
    if (res) { onImported(); setSummary((s) => (s ? { ...s, undone: res } : s)); }
  }

  const preview = parsed?.rows.slice(0, 8) ?? [];
  const shownColumns = parsed ? ['name', ...parsed.columns.filter((c) => c !== 'name')].slice(0, 7) : [];

  return (
    <Modal open onClose={phase === 'running' ? () => {} : onClose} size="lg" title="Importar contactos desde Excel"
      footer={phase === 'preview' ? <>
        <button type="button" className="btn btn-ghost" onClick={() => { setPhase('pick'); setParsed(null); }}>Elegir otro archivo</button>
        <button type="button" className="btn btn-primary" onClick={start}><Upload className="h-4 w-4" />Importar {parsed.rows.length} contactos</button>
      </> : phase === 'done' ? <button type="button" className="btn btn-primary" onClick={onClose}>Listo</button> : null}>
      {phase === 'pick' && (
        <div className="space-y-5">
          <label className="yb-drop cursor-pointer" data-over={over}
            onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); choose(e.dataTransfer.files?.[0]); }}>
            <FileSpreadsheet className="h-9 w-9 text-amber" aria-hidden="true" />
            <span className="font-semibold">Arrastrá tu Excel aquí o tocá para elegirlo</span>
            <span className="max-w-sm text-sm text-muted">Acepta .xlsx y .csv. Los teléfonos que ya estén en el libro no se duplican: solo se completan los datos que falten.</span>
            <input ref={input} type="file" className="sr-only" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              onChange={(e) => { choose(e.target.files?.[0]); e.target.value = ''; }} />
          </label>
          {error && <p className="flex gap-2 rounded-xl bg-coral-soft px-3 py-2 text-sm text-coral-ink"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <p className="text-muted">¿Primera vez? La plantilla trae las columnas que el portal reconoce.</p>
            <button type="button" className="btn btn-outline btn-sm" onClick={downloadTemplate}><Download className="h-4 w-4" />Descargar plantilla</button>
          </div>
          <RecentImports imports={imports} user={user} isAdmin={isAdmin} onUndo={undo} busy={busy} />
        </div>
      )}

      {phase === 'preview' && parsed && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <FileSpreadsheet className="h-4 w-4 text-amber" /><span className="font-semibold">{file.name}</span>
            <span className="text-muted">· hoja “{parsed.sheet}”</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="card-sunken rounded-2xl p-3"><p className="kpi-value text-teal-ink">{parsed.rows.length}</p><p className="text-xs text-muted">contactos listos</p></div>
            <div className="card-sunken rounded-2xl p-3"><p className="kpi-value">{parsed.rows.filter((r) => !r.phone).length}</p><p className="text-xs text-muted">sin teléfono (se agregan igual)</p></div>
            <div className="card-sunken rounded-2xl p-3"><p className="kpi-value text-amber-ink">{parsed.skipped.length}</p><p className="text-xs text-muted">filas omitidas</p></div>
          </div>
          <p className="text-sm text-muted">Columnas reconocidas: {parsed.columns.map((c) => COLUMN_LABELS[c]).join(', ')}.</p>
          <div className="yb-preview rounded-2xl border border-line">
            <table>
              <thead><tr><th>Fila</th>{shownColumns.map((c) => <th key={c}>{COLUMN_LABELS[c]}</th>)}</tr></thead>
              <tbody>{preview.map((r) => <tr key={r.row}><td className="num text-muted">{r.row}</td>{shownColumns.map((c) => <td key={c} title={r[c] ?? ''}>{c === 'status' ? DIRECTORY_STATUS[r[c]]?.label ?? 'Por llamar' : r[c] ?? '—'}</td>)}</tr>)}</tbody>
            </table>
          </div>
          {parsed.rows.length > preview.length && <p className="text-xs text-muted">Y {parsed.rows.length - preview.length} más.</p>}
          {parsed.skipped.length > 0 && (
            <details className="rounded-xl bg-surface-2 px-3 py-2 text-sm">
              <summary className="cursor-pointer font-semibold">Ver las {parsed.skipped.length} filas omitidas</summary>
              <ul className="mt-2 space-y-1 text-muted">{parsed.skipped.slice(0, 50).map((s) => <li key={s.row}>Fila {s.row}: {s.reason}</li>)}</ul>
            </details>
          )}
        </div>
      )}

      {phase === 'running' && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <Spinner className="h-8 w-8" />
          <p className="font-semibold">Importando {progress} de {parsed.rows.length}…</p>
          <p className="text-sm text-muted">No cierres esta ventana.</p>
        </div>
      )}

      {phase === 'done' && summary && (
        <div className="space-y-4">
          <p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-5 w-5 text-teal" />
            {summary.failure ? 'La importación quedó a medias' : 'Importación terminada'}</p>
          <ul className="grid gap-3 sm:grid-cols-3">
            <li className="card-sunken rounded-2xl p-3"><p className="kpi-value text-teal-ink">{summary.inserted}</p><p className="text-xs text-muted">contactos nuevos</p></li>
            <li className="card-sunken rounded-2xl p-3"><p className="kpi-value text-brand-ink">{summary.merged}</p><p className="text-xs text-muted">ya existían y se completaron</p></li>
            <li className="card-sunken rounded-2xl p-3"><p className="kpi-value">{summary.skipped}</p><p className="text-xs text-muted">ya existían, sin cambios</p></li>
          </ul>
          {summary.failure && <p className="rounded-xl bg-coral-soft px-3 py-2 text-sm text-coral-ink">Se detuvo en el contacto {summary.failedAt}: {summary.failure} Volvé a subir el mismo archivo: lo ya importado no se duplica.</p>}
          {summary.errors.length > 0 && (
            <div className="rounded-xl bg-amber-soft px-3 py-2 text-sm text-amber-ink">
              <p className="font-semibold">{summary.errors.length} filas no se pudieron guardar:</p>
              <ul className="mt-1 space-y-0.5">{summary.errors.slice(0, 20).map((e) => <li key={`${e.row}-${e.field}`}>Fila {e.row}: {e.message}</li>)}</ul>
            </div>
          )}
          {summary.undone ? (
            <p className="text-sm text-muted">Importación deshecha: {summary.undone.removed} contactos borrados{summary.undone.kept ? `, ${summary.undone.kept} se conservaron` : ''}.</p>
          ) : summary.importId && summary.inserted > 0 && (
            <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => undo({ id: summary.importId, file_name: file.name })}><Undo2 className="h-4 w-4" />Deshacer esta importación</button>
          )}
        </div>
      )}
    </Modal>
  );
}

function RecentImports({ imports, user, isAdmin, onUndo, busy }) {
  if (!imports.length) return null;
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-ink-2">Importaciones recientes</h3>
      <ul className="divide-y divide-line rounded-2xl border border-line">
        {imports.slice(0, 6).map((b) => (
          <li key={b.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 text-sm">
            <NotebookPen className="h-4 w-4 shrink-0 text-muted-2" />
            <span className="min-w-0 flex-1 truncate font-medium" title={b.file_name}>{b.file_name}</span>
            <span className="text-xs text-muted">{b.user_name ?? 'Alguien'} · {timeAgo(b.created_at)} · {b.inserted} nuevos</span>
            {b.undone_at ? <Badge tone="slate">Deshecha</Badge>
              : (isAdmin || b.user_id === user.id) && b.inserted > 0 && (
                <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => onUndo(b)}><Undo2 className="h-4 w-4" />Deshacer</button>
              )}
          </li>
        ))}
      </ul>
    </section>
  );
}
