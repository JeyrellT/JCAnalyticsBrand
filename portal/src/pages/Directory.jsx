// Libro amarillo: el directorio de negocios a los que el equipo llama para ofrecer
// servicios. Se busca, se filtra, se llama con un toque y cada llamada queda registrada.
// Los contactos se cargan a mano o importando un Excel (se suman sin duplicar teléfonos).
import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Plus, Search, Upload, Download, Phone, PhoneCall, Users, X, ChevronDown } from 'lucide-react';
import { useResource, useSession } from '../lib/session.jsx';
import { navigate, useLocation } from '../lib/router.jsx';
import { PageHeader, PageLoader, EmptyState, Tabs, Select, Avatar, cx } from '../components/ui.jsx';
import { ContactSheet, ContactForm, ImportDialog, DirectoryStatusBadge, telLink, dueLabel } from '../components/directory.jsx';
import { DIRECTORY_STATUS, DIRECTORY_OPEN_STATUSES, fold } from '../../shared/directory.js';
import { timeAgo } from '../lib/format.js';
import '../styles/directory.css';

const LETTERS = [...'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ', '#'];
const PAGE = 150;
const TABS = [
  { value: 'todos', label: 'Todos' },
  { value: 'abiertos', label: 'Por trabajar' },
  ...Object.entries(DIRECTORY_STATUS).map(([value, s]) => ({ value, label: s.label })),
];

/** Letra del índice: la inicial sin tilde ("Ñ" se respeta, como en la guía); números y símbolos van a "#". */
function letterOf(name) {
  const first = String(name ?? '').trim().charAt(0).toUpperCase();
  if (first === 'Ñ') return 'Ñ';
  const plain = first.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return /^[A-Z]$/.test(plain) ? plain : '#';
}

const isDue = (e, today) => e.next_call_at && e.next_call_at <= today && DIRECTORY_OPEN_STATUSES.includes(e.status);

function Row({ e, today, onOpen }) {
  const tel = telLink(e.phone);
  const due = isDue(e, today);
  const place = [e.canton, e.province].filter(Boolean).join(', ');
  const note = e.last_note || e.observations || e.opportunity;
  return (
    <div className="yb-row">
      <button type="button" className="yb-row-open" onClick={() => onOpen(e.id)} aria-label={`Abrir ${e.name}`} />
      <div className="min-w-0">
        <p className="truncate font-semibold text-ink">{e.name}</p>
        <p className="truncate text-sm text-muted">{[e.category, place].filter(Boolean).join(' · ') || 'Sin datos de ubicación'}</p>
      </div>
      <p className="hidden min-w-0 truncate text-sm text-ink-2 min-[900px]:block" title={e.address ?? ''}>{place || '—'}</p>
      <div className="hidden min-[900px]:block"><DirectoryStatusBadge status={e.status} /></div>
      <div className="hidden min-w-0 text-sm min-[900px]:block">
        {due ? <p className="font-semibold text-coral-ink">{dueLabel(e, today)}</p>
          : e.next_call_at && DIRECTORY_OPEN_STATUSES.includes(e.status) ? <p className="text-violet-ink">{dueLabel(e, today)}</p> : null}
        {note ? <p className="yb-note text-muted" title={note}>{note}</p> : !due && <p className="text-muted-2">Sin observaciones</p>}
      </div>
      <div className="yb-actions flex items-center justify-end gap-2">
        <span className="min-[900px]:hidden"><DirectoryStatusBadge status={e.status} /></span>
        {tel ? (
          <a href={tel} className="btn btn-outline btn-sm min-h-9" aria-label={`Llamar a ${e.name} al ${e.phone}`}>
            <Phone className="h-4 w-4 text-brand-ink" /><span className="num hidden sm:inline">{e.phone}</span>
          </a>
        ) : <span className="text-xs text-muted-2">Sin teléfono</span>}
      </div>
      {/* En el celular, la nota y la próxima llamada van debajo. */}
      {(due || note) && (
        <p className={cx('col-span-2 truncate text-xs min-[900px]:hidden', due ? 'font-semibold text-coral-ink' : 'text-muted')}>
          {due ? dueLabel(e, today) : note}
        </p>
      )}
    </div>
  );
}

export default function Directory() {
  const { user } = useSession();
  const { query } = useLocation();
  const { data, error, reload, setData } = useResource('/api/directory');
  const [tab, setTab] = useState('todos');
  const [q, setQ] = useState('');
  const [province, setProvince] = useState('');
  const [canton, setCanton] = useState('');
  const [mine, setMine] = useState(false);
  const [dueOnly, setDueOnly] = useState(false);
  const [letter, setLetter] = useState(null);
  const [limit, setLimit] = useState(PAGE);
  const [openId, setOpenId] = useState(null);
  const [editing, setEditing] = useState(null); // {} = nuevo
  const [importing, setImporting] = useState(false);

  // Accesos directos: ?nuevo=1 (botón rápido / Ctrl K) y ?importar=1 abren el formulario al llegar.
  const shortcut = query.get('nuevo') === '1' ? 'nuevo' : query.get('importar') === '1' ? 'importar' : null;
  const [seenShortcut, setSeenShortcut] = useState(null);
  if (shortcut !== seenShortcut) {
    setSeenShortcut(shortcut);
    if (shortcut === 'nuevo') setEditing({});
    if (shortcut === 'importar') setImporting(true);
  }
  useEffect(() => { if (shortcut) navigate('/libro-amarillo', { replace: true }); }, [shortcut]);

  const today = data?.today;
  const all = useMemo(() => data?.entries ?? [], [data]);

  const provinces = useMemo(() => [...new Set(all.map((e) => e.province).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es')), [all]);
  const cantons = useMemo(() => [...new Set(all.filter((e) => !province || e.province === province).map((e) => e.canton).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'es')), [all, province]);

  const counts = useMemo(() => {
    const out = { todos: all.length, abiertos: 0 };
    for (const e of all) {
      out[e.status] = (out[e.status] ?? 0) + 1;
      if (DIRECTORY_OPEN_STATUSES.includes(e.status)) out.abiertos += 1;
    }
    return out;
  }, [all]);
  const due = useMemo(() => all.filter((e) => isDue(e, today)).sort((a, b) => a.next_call_at.localeCompare(b.next_call_at)), [all, today]);

  // Todo menos la letra: así el índice A–Z muestra qué letras tienen resultados.
  const filtered = useMemo(() => {
    const text = fold(q);
    const digits = q.replace(/\D/g, '');
    return all.filter((e) => {
      if (tab === 'abiertos' ? !DIRECTORY_OPEN_STATUSES.includes(e.status) : tab !== 'todos' && e.status !== tab) return false;
      if (province && e.province !== province) return false;
      if (canton && e.canton !== canton) return false;
      if (mine && e.assigned_to !== user.id) return false;
      if (dueOnly && !isDue(e, today)) return false;
      if (!text) return true;
      if (digits.length >= 4 && [e.phone, e.phone_alt, e.whatsapp].some((p) => String(p ?? '').replace(/\D/g, '').includes(digits))) return true;
      return fold([e.name, e.category, e.canton, e.province, e.district, e.address, e.observations, e.last_note, e.assigned_name].filter(Boolean).join(' ')).includes(text);
    });
  }, [all, tab, province, canton, mine, dueOnly, q, user.id, today]);

  const available = useMemo(() => new Set(filtered.map((e) => letterOf(e.name))), [filtered]);
  const visible = useMemo(() => {
    const list = letter ? filtered.filter((e) => letterOf(e.name) === letter) : filtered;
    return dueOnly ? [...list].sort((a, b) => a.next_call_at.localeCompare(b.next_call_at)) : list;
  }, [filtered, letter, dueOnly]);

  // Agrupado por letra, como la guía telefónica (salvo en "Hoy toca", que va por fecha).
  const groups = useMemo(() => {
    const shown = visible.slice(0, limit);
    if (dueOnly) return [{ key: 'due', entries: shown }];
    const out = [];
    for (const e of shown) {
      const key = letterOf(e.name);
      if (out.at(-1)?.key !== key) out.push({ key, entries: [] });
      out.at(-1).entries.push(e);
    }
    return out;
  }, [visible, limit, dueOnly]);

  const filtersOn = !!(q.trim() || province || canton || mine || dueOnly || letter || tab !== 'todos');
  function resetFilters() {
    setQ(''); setProvince(''); setCanton(''); setMine(false); setDueOnly(false); setLetter(null); setTab('todos'); setLimit(PAGE);
  }
  const replaceEntry = (entry) => setData((d) => (d ? { ...d, entries: d.entries.some((x) => x.id === entry.id) ? d.entries.map((x) => (x.id === entry.id ? entry : x)) : [...d.entries, entry].sort((a, b) => a.name.localeCompare(b.name, 'es')) } : d));
  const removeEntry = (entryId) => setData((d) => (d ? { ...d, entries: d.entries.filter((x) => x.id !== entryId) } : d));

  const actions = (
    <>
      <button type="button" className="btn btn-outline" onClick={() => setImporting(true)}><Upload className="h-4 w-4" />Importar Excel</button>
      {all.length > 0 && <a className="btn btn-outline" href="/api/directory/export.csv" download><Download className="h-4 w-4" />Descargar</a>}
      <button type="button" className="btn btn-primary" onClick={() => setEditing({})}><Plus className="h-4 w-4" />Agregar contacto</button>
    </>
  );

  return (
    <>
      <PageHeader eyebrow="Prospección" title="Libro amarillo" icon={BookOpen} tone="amber" actions={actions}
        subtitle="Los negocios a los que llamamos para ofrecer servicios. Buscá, llamá con un toque y dejá anotado cómo te fue." />

      {!data ? <PageLoader error={error} onRetry={reload} /> : all.length === 0 ? (
        <EmptyState icon={BookOpen} tone="amber" title="El libro está vacío"
          action={<div className="flex flex-wrap justify-center gap-2"><button type="button" className="btn btn-primary" onClick={() => setImporting(true)}><Upload className="h-4 w-4" />Importar un Excel</button>
            <button type="button" className="btn btn-outline" onClick={() => setEditing({})}><Plus className="h-4 w-4" />Agregar a mano</button></div>}>
          Subí el Excel de contactos (nombre, teléfono y ubicación) y el equipo empieza a llamar desde aquí.
        </EmptyState>
      ) : (
        <>
          {/* Lo que toca hoy */}
          {due.length > 0 && !dueOnly && (
            <section className="yb-due card animate-rise mb-5 p-4 sm:p-5" aria-labelledby="yb-due-title">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 id="yb-due-title" className="flex items-center gap-2 font-display text-lg font-bold"><PhoneCall className="h-5 w-5 text-amber-ink" />
                  Hoy toca llamar <span className="num text-amber-ink">{due.length}</span></h2>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => { setDueOnly(true); setLetter(null); setTab('todos'); }}>Ver solo estos</button>
              </div>
              <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {due.slice(0, 6).map((e) => (
                  <li key={e.id}>
                    <button type="button" onClick={() => setOpenId(e.id)} className="tap flex w-full items-center gap-3 rounded-xl bg-surface px-3 py-2 text-left shadow-card hover:bg-surface-2">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{e.name}</span>
                        <span className={cx('block truncate text-xs', e.next_call_at < today ? 'font-semibold text-coral-ink' : 'text-muted')}>{dueLabel(e, today)}{e.last_note ? ` · ${e.last_note}` : ''}</span>
                      </span>
                      <DirectoryStatusBadge status={e.status} />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Filtros */}
          <div className="animate-rise mb-4 space-y-3">
            <div className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <Tabs value={tab} onChange={(v) => { setTab(v); setLimit(PAGE); }} tabs={TABS.map((t) => ({ ...t, count: counts[t.value] ?? 0 }))} className="whitespace-nowrap" />
            </div>
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">Buscar en el libro</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" aria-hidden="true" />
                <input className="input pl-9" type="search" placeholder="Nombre, teléfono, cantón, comida u observación" value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }} />
              </label>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <Select aria-label="Provincia" className="sm:w-40" value={province} onChange={(v) => { setProvince(v); setCanton(''); }}
                  options={[{ value: '', label: 'Toda provincia' }, ...provinces.map((p) => ({ value: p, label: p }))]} />
                <Select aria-label="Cantón" className="sm:w-44" value={canton} onChange={setCanton}
                  options={[{ value: '', label: 'Todo cantón' }, ...cantons.map((c) => ({ value: c, label: c }))]} />
                <button type="button" aria-pressed={mine} onClick={() => setMine((v) => !v)} className={cx('btn btn-sm min-h-10', mine ? 'btn-dark' : 'btn-outline')}>
                  <Users className="h-4 w-4" />Míos
                </button>
                <button type="button" aria-pressed={dueOnly} onClick={() => { setDueOnly((v) => !v); setLetter(null); }} className={cx('btn btn-sm min-h-10', dueOnly ? 'btn-dark' : 'btn-outline')}>
                  <PhoneCall className="h-4 w-4" />Toca hoy{due.length > 0 && <span className="num opacity-70">{due.length}</span>}
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
              <span><span className="num font-semibold text-ink">{visible.length}</span> de {all.length} contactos</span>
              {filtersOn && <button type="button" className="link inline-flex items-center gap-1" onClick={resetFilters}><X className="h-3.5 w-3.5" />Quitar filtros</button>}
              {data.imports[0] && <span className="ml-auto hidden text-xs sm:inline">Última importación: {data.imports[0].file_name} · {timeAgo(data.imports[0].created_at)}</span>}
            </div>
          </div>

          <div className="yb-layout">
            {/* Índice A–Z (arriba en el celular, al costado en escritorio) */}
            <nav className="yb-rail lg:order-2" aria-label="Índice alfabético">
              {LETTERS.map((l) => (
                <button key={l} type="button" className="yb-letter" disabled={dueOnly || !available.has(l)} aria-pressed={letter === l}
                  onClick={() => { setLetter((cur) => (cur === l ? null : l)); setLimit(PAGE); }} aria-label={`Negocios con ${l === '#' ? 'número o símbolo' : l}`}>
                  {l}
                </button>
              ))}
            </nav>

            <div className="min-w-0 lg:order-1">
              {visible.length === 0 ? (
                <EmptyState icon={Search} tone="amber" title={q.trim() ? `Nada coincide con “${q.trim()}”` : 'Ningún contacto con estos filtros'}
                  action={<button type="button" className="btn btn-outline" onClick={resetFilters}>Quitar filtros</button>}>
                  Probá con otra palabra, otro cantón o mirá todos los estados.
                </EmptyState>
              ) : (
                <>
                  {groups.map((g) => (
                    <section key={g.key} className="yb-group" aria-label={g.key === 'due' ? 'Llamadas para hoy' : `Letra ${g.key}`}>
                      {g.key !== 'due' && <div className="yb-group-head"><span className="yb-group-letter" aria-hidden="true">{g.key}</span></div>}
                      <div className="yb-list card">
                        {g.entries.map((e) => <Row key={e.id} e={e} today={today} onOpen={setOpenId} />)}
                      </div>
                    </section>
                  ))}
                  {visible.length > limit && (
                    <div className="mt-4 flex justify-center">
                      <button type="button" className="btn btn-outline" onClick={() => setLimit((n) => n + PAGE)}><ChevronDown className="h-4 w-4" />Mostrar {Math.min(PAGE, visible.length - limit)} más</button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Quiénes están trabajando el libro */}
          <TeamPulse entries={all} />
        </>
      )}

      {openId && (
        <ContactSheet entryId={openId} today={today} onClose={() => setOpenId(null)} onChanged={replaceEntry} onDeleted={removeEntry}
          onEdit={(entry) => setEditing(entry)} />
      )}
      {editing && <ContactForm entry={editing.id ? editing : null} onClose={() => setEditing(null)} onSaved={(entry) => { replaceEntry(entry); if (!editing.id) setOpenId(entry.id); }} />}
      {importing && <ImportDialog imports={data?.imports ?? []} onClose={() => setImporting(false)} onImported={reload} />}
    </>
  );
}

/** Resumen discreto al pie: cuántos contactos lleva cada persona y cuántos ya se convirtieron. */
function TeamPulse({ entries }) {
  const people = useMemo(() => {
    const map = new Map();
    for (const e of entries) {
      if (!e.assigned_to) continue;
      const p = map.get(e.assigned_to) ?? { id: e.assigned_to, name: e.assigned_name, color: e.assigned_color, total: 0, won: 0, interested: 0 };
      p.total += 1;
      if (e.status === 'cliente') p.won += 1;
      if (e.status === 'interesado') p.interested += 1;
      map.set(e.assigned_to, p);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [entries]);
  if (!people.length) return null;
  return (
    <section className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-line pt-5 text-sm" aria-label="Quién trabaja el libro">
      {people.map((p) => (
        <span key={p.id} className="flex items-center gap-2">
          <Avatar name={p.name ?? 'Alguien'} color={p.color ?? undefined} size={26} />
          <span><span className="font-semibold">{(p.name ?? '').split(' ')[0]}</span> <span className="text-muted">lleva {p.total} · {p.interested} interesados · {p.won} clientes</span></span>
        </span>
      ))}
    </section>
  );
}
