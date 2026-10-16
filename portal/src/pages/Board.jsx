// Tablero kanban del equipo: arrastrar, avanzar o mover con teclado entre 5 columnas.
// En el celular se ve una columna a la vez (chips arriba) y cada tarjeta trae "Mover a…".
// Los límites WIP (Lean) de "En progreso" y "Revisión" se configuran en Equipo y ajustes.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search, MessageSquare, CalendarClock, Trash2, Send, Filter, KanbanSquare, SlidersHorizontal, Inbox, AlertTriangle, ArrowRight, ArrowUpRight, Check, UsersRound, UserRound, Layers3, Rows3, LayoutList, GripVertical, FolderKanban, X } from 'lucide-react';
import { useResource, useSession } from '../lib/session.jsx';
import { api } from '../lib/api.js';
import { useLocation, navigate, Link } from '../lib/router.jsx';
import { PageLoader, Badge, Modal, Field, Select, Avatar, useAction, useConfirm, cx } from '../components/ui.jsx';
import { PersonSelect } from '../components/common.jsx';
import { TASK_STATUS, TASK_STATUS_ORDER, TASK_PRIORITY } from '../../shared/catalog.js';
import { dueLabel, timeAgo, todayKey } from '../lib/format.js';
import '../styles/board-studio.css';

const statusOptions = TASK_STATUS_ORDER.map((s) => ({ value: s, label: TASK_STATUS[s].label }));
const priorityOptions = Object.entries(TASK_PRIORITY).map(([value, v]) => ({ value, label: v.label }));

const COLUMN_HINTS = { backlog: 'Ideas que esperan su momento', por_hacer: 'El siguiente paso está claro', en_progreso: 'El equipo está en ello', revision: 'Un último vistazo', hecho: 'Trabajo que ya suma' };

function Comments({ taskId }) {
  const { data, reload } = useResource(`/api/tasks/${taskId}/comments`);
  const [body, setBody] = useState('');
  const [run, busy] = useAction();
  async function send(e) {
    e.preventDefault();
    if (!body.trim()) return;
    if (await run(() => api(`/api/tasks/${taskId}/comments`, { method: 'POST', body: { body } }))) { setBody(''); reload(); }
  }
  return (
    <div className="border-t border-line pt-4">
      <p className="label">Comentarios</p>
      <ul className="mb-3 space-y-3">
        {(data?.comments ?? []).map((c) => (
          <li key={c.id} className="flex gap-2.5">
            <Avatar name={c.user_name} color={c.user_color} size={26} />
            <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm bg-surface-2 px-3 py-2">
              <p className="text-xs text-muted"><span className="font-semibold text-ink">{c.user_name}</span> · {timeAgo(c.created_at)}</p>
              <p className="whitespace-pre-line text-sm">{c.body}</p>
            </div>
          </li>
        ))}
        {data?.comments.length === 0 && <li className="text-sm text-muted">Sin comentarios todavía.</li>}
      </ul>
      <form onSubmit={send} className="flex gap-2">
        <input className="input" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Escribí un comentario…" aria-label="Comentario" />
        <button type="submit" className="btn btn-dark" disabled={busy || !body.trim()} aria-label="Enviar comentario"><Send className="h-4 w-4" /></button>
      </form>
    </div>
  );
}

function TaskModal({ task, defaults, projects, onClose, onSaved }) {
  const [run, busy] = useAction();
  const confirm = useConfirm();
  const [form, setForm] = useState(() => task ?? { status: 'por_hacer', priority: 'media', ...defaults });
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  async function save(e) {
    e.preventDefault();
    const body = { title: form.title, description: form.description || null, status: form.status, priority: form.priority, assignee_id: form.assignee_id || null, project_id: form.project_id || null, due_date: form.due_date || null };
    const res = await run(() => api(task ? `/api/tasks/${task.id}` : '/api/tasks', { method: task ? 'PATCH' : 'POST', body }), { success: task ? 'Tarea actualizada' : 'Tarea creada' });
    if (res) { onSaved(); onClose(); }
  }
  async function remove() {
    if (!(await confirm({ title: 'Eliminar tarea', message: 'Se borran la tarea y sus comentarios. No se puede deshacer.', confirmLabel: 'Eliminar', tone: 'danger' }))) return;
    if (await run(() => api(`/api/tasks/${task.id}`, { method: 'DELETE' }), { success: 'Tarea eliminada' })) { onSaved(); onClose(); }
  }

  return (
    <Modal open onClose={onClose} title={task ? 'Tarea' : 'Nueva tarea'} size="lg"
      footer={<>
        {task && <button type="button" className="btn btn-ghost mr-auto text-coral-ink" onClick={remove} disabled={busy}><Trash2 className="h-4 w-4" />Eliminar</button>}
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cerrar</button>
        <button type="submit" form="task-form" className="btn btn-primary" disabled={busy || !form.title?.trim()}>{busy ? 'Guardando…' : 'Guardar'}</button>
      </>}>
      <form id="task-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field label="Título" className="sm:col-span-2">{(id) => <input id={id} className="input" value={form.title ?? ''} onChange={(e) => set('title')(e.target.value)} placeholder="¿Qué hay que hacer?" />}</Field>
        <Field label="Columna">{(id) => <Select id={id} options={statusOptions} value={form.status} onChange={set('status')} />}</Field>
        <Field label="Prioridad">{(id) => <Select id={id} options={priorityOptions} value={form.priority} onChange={set('priority')} />}</Field>
        <Field label="Responsable">{(id) => <PersonSelect id={id} value={form.assignee_id} onChange={set('assignee_id')} />}</Field>
        <Field label="Vence">{(id) => <input id={id} type="date" className="input" value={form.due_date ?? ''} onChange={(e) => set('due_date')(e.target.value)} />}</Field>
        <Field label="Proyecto" className="sm:col-span-2">{(id) => <Select id={id} options={projects.map((p) => ({ value: String(p.id), label: p.name }))} value={form.project_id ? String(form.project_id) : ''} onChange={(v) => set('project_id')(v ? Number(v) : null)} placeholder="Sin proyecto" />}</Field>
        <Field label="Detalle" className="sm:col-span-2">{(id) => <textarea id={id} className="input" rows={3} value={form.description ?? ''} onChange={(e) => set('description')(e.target.value)} placeholder="Criterio de terminado, enlaces, notas…" />}</Field>
      </form>
      {task && <div className="mt-5"><Comments taskId={task.id} /></div>}
    </Modal>
  );
}

function TaskCard({ t, onOpen, onMove, dragging, setDragging }) {
  const due = t.status !== 'hecho' ? dueLabel(t.due_date) : null;
  const pr = TASK_PRIORITY[t.priority] ?? TASK_PRIORITY.media;
  const isDragging = dragging === t.id;
  const next = TASK_STATUS_ORDER[TASK_STATUS_ORDER.indexOf(t.status) + 1];
  return (
    <article
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(t.id)); setDragging(t.id); }}
      onDragEnd={() => setDragging(null)}
      data-task={t.id}
      className={cx('board-task', `board-priority-${t.priority}`, t.status === 'hecho' && 'board-task-complete', isDragging && 'board-task-dragging')}
    >
      <div className="board-task-topline"><span className="board-priority"><i aria-hidden="true" />{pr.label}</span><span className="board-task-reference">#{t.id}</span><GripVertical size={14} className="board-task-grip" aria-hidden="true" /></div>
      <button type="button" onClick={() => onOpen(t)} className="board-task-open">
        <p className="board-task-title">{t.title}</p>
        {t.project_name && <p className="board-task-project" title={t.project_name}><FolderKanban size={12} aria-hidden="true" /><span>{t.project_name}</span></p>}
      </button>
      <div className="board-task-meta">
        {due ? <Badge tone={due.tone}><CalendarClock size={12} aria-hidden="true" />{due.text}</Badge> : t.status === 'hecho' ? <span className="board-task-done"><Check size={13} aria-hidden="true" />Terminada</span> : <span className="board-task-no-date"><CalendarClock size={12} aria-hidden="true" />Sin fecha</span>}
        {t.comments > 0 && <span className="board-task-comments" aria-label={`${t.comments} comentarios`}><MessageSquare size={13} aria-hidden="true" />{t.comments}</span>}
      </div>
      <div className="board-task-owner">{t.assignee_name ? <><Avatar name={t.assignee_name} color={t.assignee_color} size={23} /><span title={t.assignee_name}>{t.assignee_name}</span></> : <><span className="board-unassigned"><UserRound size={12} aria-hidden="true" /></span><span>Sin asignar</span></>}</div>
      {/* El selector nativo permite mover con teclado en escritorio y se conserva en móvil. */}
      <div className="board-task-actions">
        {next ? (
          <button type="button" className="board-task-advance" onClick={() => onMove(t, next)} aria-label={`Pasar "${t.title}" a ${TASK_STATUS[next].label}`} title={`Pasar a ${TASK_STATUS[next].label}`}>
            <span>{TASK_STATUS[next].label}</span><ArrowRight size={14} aria-hidden="true" />
          </button>
        ) : <span className="board-task-closed">Hecho <Check size={13} aria-hidden="true" /></span>}
        <select className="board-task-move" value={t.status} onChange={(e) => onMove(t, e.target.value)} aria-label={`Mover "${t.title}" a otra columna`}>
          {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.value === t.status ? 'Mover a…' : o.label}</option>)}
        </select>
      </div>
    </article>
  );
}

function QuickAdd({ status, defaults, onCreated }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [run, busy] = useAction();
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="board-quick-add">
        <Plus className="h-4 w-4" />Agregar tarea
      </button>
    );
  }
  async function add(e) {
    e.preventDefault();
    if (title.trim().length < 2) return;
    if (await run(() => api('/api/tasks', { method: 'POST', body: { title, status, ...defaults } }))) { setTitle(''); onCreated(); }
  }
  return (
    <form onSubmit={add} className="animate-pop space-y-2">
      <textarea autoFocus className="input" rows={2} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título de la tarea" aria-label="Título"
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) add(e); if (e.key === 'Escape') setOpen(false); }} />
      <div className="flex gap-2"><button type="submit" className="btn btn-dark btn-sm" disabled={busy}>Agregar</button><button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Cancelar</button></div>
    </form>
  );
}

/** La vista cuenta las tareas filtradas; el WIP siempre mide la carga del equipo completo. */
function WipChip({ count, totalCount, limit, className }) {
  const atLimit = Boolean(limit) && totalCount >= limit;
  return (
    <span className={cx('board-column-count', atLimit && 'board-wip-at-limit', className)} title={limit ? `${count} en esta vista · ${totalCount} tareas del equipo / límite WIP ${limit}` : `${count} tareas en esta vista`}>
      <strong>{count}</strong>{limit ? <small>WIP {totalCount}/{limit}</small> : null}
    </span>
  );
}

export default function Board() {
  const { user, settings } = useSession();
  const { query } = useLocation();
  const { data, error, reload, setData } = useResource('/api/tasks');
  const { data: pdata } = useResource('/api/projects');
  const projects = useMemo(() => pdata?.projects ?? [], [pdata]);
  const [q, setQ] = useState('');
  const [project, setProject] = useState(query.get('proyecto') ?? '');
  const [assignee, setAssignee] = useState(query.get('mias') ? user.id : null);
  const [onlyOverdue, setOnlyOverdue] = useState(query.get('filtro') === 'vencidas');
  const [showFilters, setShowFilters] = useState(false);
  const [density, setDensity] = useState('comfortable');
  const [dragging, setDragging] = useState(null);
  const [dropHint, setDropHint] = useState(null);
  const [creating, setCreating] = useState(false);
  // Celular: una columna a la vez. Por defecto "Por hacer"; si se abre una tarea, la columna de esa tarea.
  const [mobileCol, setMobileCol] = useState('por_hacer');
  const [run] = useAction();
  const columnsRef = useRef({});
  const chipsRef = useRef(null);

  const openTaskId = Number(query.get('tarea')) || null;
  const openTask = openTaskId ? data?.tasks.find((t) => t.id === openTaskId) : null;
  // Una tarea "hecha" hace más de 21 días no viene en la lista por defecto: se busca aparte.
  const { data: oldTask } = useResource(openTaskId && data && !openTask ? '/api/tasks?all=1' : null);
  const modalTask = openTask ?? oldTask?.tasks.find((t) => t.id === openTaskId) ?? null;

  const [syncedTask, setSyncedTask] = useState(null);
  if (modalTask && modalTask.id !== syncedTask) {
    setSyncedTask(modalTask.id);
    setMobileCol(modalTask.status);
  }

  // ?nueva=1 (botón Crear, inicio) abre "Nueva tarea", también si el tablero ya estaba abierto.
  const nueva = query.get('nueva') === '1';
  const [seenNueva, setSeenNueva] = useState(false);
  if (nueva !== seenNueva) {
    setSeenNueva(nueva);
    if (nueva) setCreating(true);
  }
  useEffect(() => {
    if (nueva) navigate('/tablero', { replace: true });
  }, [nueva]);

  // El chip de la columna elegida queda a la vista dentro de su fila (sin mover la página).
  useEffect(() => {
    const row = chipsRef.current;
    const chip = row?.querySelector('[aria-pressed="true"]');
    if (!row || !chip) return;
    const left = chip.offsetLeft - row.offsetLeft;
    if (left < row.scrollLeft || left + chip.offsetWidth > row.scrollLeft + row.clientWidth) {
      row.scrollTo({ left: Math.max(0, left - 16), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
  }, [mobileCol]);

  const today = todayKey();
  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase();
    return (data?.tasks ?? []).filter((t) =>
      (!project || String(t.project_id) === String(project))
      && (!assignee || t.assignee_id === assignee)
      && (!onlyOverdue || (t.due_date && t.due_date < today && t.status !== 'hecho'))
      && (!text || `${t.title} ${t.project_name ?? ''}`.toLowerCase().includes(text)));
  }, [data, q, project, assignee, onlyOverdue, today]);

  const columns = TASK_STATUS_ORDER.map((s) => ({ status: s, tasks: filtered.filter((t) => t.status === s).sort((a, b) => a.position - b.position) }));
  const totalByStatus = Object.fromEntries(TASK_STATUS_ORDER.map((s) => [s, (data?.tasks ?? []).filter((t) => t.status === s).length]));
  const inFlight = filtered.filter((t) => t.status === 'en_progreso' || t.status === 'revision').length;
  const overdueCount = filtered.filter((t) => t.due_date && t.due_date < today && t.status !== 'hecho').length;
  const completedCount = filtered.filter((t) => t.status === 'hecho').length;
  const wip = { en_progreso: Number(settings.wip_en_progreso) || null, revision: Number(settings.wip_revision) || null };
  const activeFilters = [project, assignee, onlyOverdue].filter(Boolean).length;
  const anyFilter = Boolean(project || assignee || onlyOverdue || q);

  async function moveTo(task, status, position) {
    const pos = position ?? (Math.max(0, ...(data.tasks.filter((t) => t.status === status).map((t) => t.position))) + 1024);
    // Optimista: se ve al instante; si falla, se recarga el estado real.
    setData((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === task.id ? { ...t, status, position: pos } : t)) }));
    const ok = await run(() => api(`/api/tasks/${task.id}`, { method: 'PATCH', body: { status, position: pos } }));
    if (!ok) reload();
    else if (status === 'hecho' && task.status !== 'hecho') reload();
  }

  // Celular: un deslizamiento horizontal claro (> 70 px y más horizontal que vertical) cambia de columna.
  const swipe = useRef(null);
  const swipeStart = (e) => { const p = e.touches[0]; swipe.current = { x: p.clientX, y: p.clientY }; };
  const swipeEnd = (e) => {
    const from = swipe.current;
    swipe.current = null;
    if (!from || window.matchMedia('(min-width: 64rem)').matches) return;
    const p = e.changedTouches[0];
    const dx = p.clientX - from.x;
    const dy = p.clientY - from.y;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const i = TASK_STATUS_ORDER.indexOf(mobileCol) + (dx < 0 ? 1 : -1);
    if (i >= 0 && i < TASK_STATUS_ORDER.length) setMobileCol(TASK_STATUS_ORDER[i]);
  };

  // Celular: al mover con "Mover a", la vista sigue a la tarjeta hasta su nueva columna.
  function moveFromSelect(task, status) {
    setMobileCol(status);
    moveTo(task, status);
  }

  function dropPosition(status, clientY) {
    const col = columnsRef.current[status];
    const list = columns.find((c) => c.status === status).tasks.filter((t) => t.id !== dragging);
    if (!col) return { index: list.length, position: undefined };
    const cards = [...col.querySelectorAll('[data-task]')].filter((el) => Number(el.dataset.task) !== dragging);
    let index = cards.findIndex((el) => { const r = el.getBoundingClientRect(); return clientY < r.top + r.height / 2; });
    if (index < 0) index = list.length;
    const before = list[index - 1]?.position;
    const after = list[index]?.position;
    const position = before == null && after == null ? 1024 : before == null ? after - 1024 : after == null ? before + 1024 : (before + after) / 2;
    return { index, position };
  }

  const openModal = (t) => navigate(`/tablero?tarea=${t.id}`);
  const closeModal = () => navigate('/tablero', { replace: true });

  return (
    <div className={cx('board-studio', density === 'compact' && 'board-density-compact')}>
      <header className="board-intro">
        <div><p className="board-eyebrow"><span />DEL PLAN AL HECHO</p><h1>Tablero</h1><p className="board-intro-copy">Las ideas se convierten en avances.<br className="board-intro-break" /> Un paso, una persona, una tarea a la vez.</p></div>
        <button type="button" className="board-create" onClick={() => setCreating(true)}><Plus size={18} aria-hidden="true" />Nueva tarea<ArrowUpRight size={17} aria-hidden="true" /></button>
      </header>

      {data && <section className="board-pulse" aria-label="Resumen de tareas de esta vista">
        <div className="board-pulse-overview"><span className="board-overline">EL TRABAJO, EN PERSPECTIVA</span><div><strong>{String(filtered.length).padStart(2, '0')}</strong><p>tareas en esta vista<span>{assignee === user.id ? 'Mi trabajo' : assignee ? 'Responsable seleccionado' : 'Todo el equipo'}</span></p></div><div className="board-pipeline" aria-hidden="true">{columns.filter((c) => c.tasks.length).map((c) => <span key={c.status} className={`board-stage-${c.status}`} style={{ flex: c.tasks.length }} />)}</div></div>
        <div className="board-pulse-stat"><span className="board-stat-icon"><Layers3 size={18} aria-hidden="true" /></span><strong>{String(inFlight).padStart(2, '0')}</strong><span>En marcha</span><small>En progreso + revisión</small></div>
        <div className={cx('board-pulse-stat', overdueCount > 0 && 'board-pulse-overdue')}><span className="board-stat-icon"><CalendarClock size={18} aria-hidden="true" /></span><strong>{String(overdueCount).padStart(2, '0')}</strong><span>Vencidas</span><small>Necesitan un siguiente paso</small></div>
        <div className="board-pulse-stat"><span className="board-stat-icon"><Check size={18} aria-hidden="true" /></span><strong>{String(completedCount).padStart(2, '0')}</strong><span>Hechas</span><small>Cerradas en los últimos 21 días</small></div>
      </section>}

      <section className="board-workbench" aria-label="Espacio de trabajo de tareas">
        <div className="board-viewbar">
          <div className="board-scope" role="group" aria-label="Alcance del tablero"><button type="button" aria-pressed={!assignee} onClick={() => setAssignee(null)}><UsersRound size={15} aria-hidden="true" />Todo el equipo</button><button type="button" aria-pressed={assignee === user.id} onClick={() => setAssignee(user.id)}><UserRound size={15} aria-hidden="true" />Mi trabajo</button></div>
          <div className="board-density" role="group" aria-label="Densidad de tarjetas"><button type="button" title="Densidad cómoda" aria-label="Densidad cómoda" aria-pressed={density === 'comfortable'} onClick={() => setDensity('comfortable')}><LayoutList size={17} aria-hidden="true" /></button><button type="button" title="Densidad compacta" aria-label="Densidad compacta" aria-pressed={density === 'compact'} onClick={() => setDensity('compact')}><Rows3 size={17} aria-hidden="true" /></button></div>
        </div>
        <div className="board-toolbar">
          <label className="board-search"><span className="sr-only">Buscar tareas</span><Search size={16} aria-hidden="true" /><input type="search" placeholder="Buscar tareas" value={q} onChange={(e) => setQ(e.target.value)} /></label>
          <button type="button" className={cx('board-filter-toggle', activeFilters > 0 && 'is-active')} aria-expanded={showFilters} aria-controls="board-filters" onClick={() => setShowFilters((v) => !v)}><SlidersHorizontal size={16} aria-hidden="true" />Filtros{activeFilters > 0 && <span>{activeFilters}</span>}</button>
          <div id="board-filters" className={cx('board-filters', showFilters && 'is-open')}>
            <Select aria-label="Proyecto" options={projects.map((p) => ({ value: String(p.id), label: p.name }))} value={project} onChange={setProject} placeholder="Todos los proyectos" />
            <label className="sr-only" htmlFor="board-assignee-filter">Responsable</label><PersonSelect id="board-assignee-filter" value={assignee} onChange={setAssignee} placeholder="Todo el equipo" />
            <button type="button" className={cx('board-overdue-filter', onlyOverdue && 'is-active')} aria-pressed={onlyOverdue} onClick={() => setOnlyOverdue((v) => !v)}><Filter size={14} aria-hidden="true" />Vencidas</button>
            {anyFilter && <button type="button" className="board-clear" onClick={() => { setProject(''); setAssignee(null); setOnlyOverdue(false); setQ(''); }}><X size={14} aria-hidden="true" />Limpiar</button>}
          </div>
        </div>
        <div className="board-toolbar-caption"><p id="board-drag-hint"><GripVertical size={14} aria-hidden="true" /><span className="board-desktop-hint">Arrastrá para organizar o usá «Mover a…» en cada tarjeta.</span><span className="board-mobile-hint">Deslizá entre columnas o tocá su nombre.</span></p>{data && <span>{filtered.length} de {data.tasks.length} tareas</span>}</div>

        {!data ? <PageLoader error={error} onRetry={reload} /> : <>
          <div ref={chipsRef} className="board-mobile-columns" role="group" aria-label="Columnas del tablero">
            {columns.map(({ status, tasks }) => {
              const limit = wip[status];
              const atLimit = Boolean(limit) && totalByStatus[status] >= limit;
              const selected = mobileCol === status;
              return <button key={status} type="button" aria-pressed={selected} onClick={() => setMobileCol(status)} className={cx(`board-stage-${status}`, atLimit && 'board-mobile-wip')}><i aria-hidden="true" />{TASK_STATUS[status].label}<span>{tasks.length}{limit ? ` · ${totalByStatus[status]}/${limit}` : ''}</span></button>;
            })}
          </div>
          <div className="board-lanes-scroll" tabIndex={0} aria-label="Columnas de tareas" aria-describedby="board-drag-hint">
            <div className="board-lanes" onTouchStart={swipeStart} onTouchEnd={swipeEnd}>
              {columns.map(({ status, tasks }, index) => {
                const limit = wip[status];
                const over = Boolean(limit) && totalByStatus[status] > limit;
                const isTarget = dropHint === status && dragging != null;
                return <section key={status} aria-label={TASK_STATUS[status].label} className={cx('board-lane', `board-stage-${status}`, mobileCol === status && 'is-current', isTarget && 'is-drop-target', over && 'is-over-wip')}
                  onDragOver={(e) => { e.preventDefault(); setDropHint(status); }}
                  onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDropHint(null); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDropHint(null);
                    const task = data.tasks.find((t) => t.id === Number(e.dataTransfer.getData('text/plain')));
                    if (!task) return;
                    const { position } = dropPosition(status, e.clientY);
                    moveTo(task, status, position);
                    setDragging(null);
                  }}>
                  <header className="board-lane-heading"><div className="board-lane-kicker"><span>0{index + 1}</span><WipChip count={tasks.length} totalCount={totalByStatus[status]} limit={limit} /></div><h2><span aria-hidden="true" />{TASK_STATUS[status].label}</h2><p>{COLUMN_HINTS[status]}</p></header>
                  {over && <p className="board-wip-notice"><AlertTriangle size={14} aria-hidden="true" />Límite WIP superado: terminen antes de empezar más.</p>}
                  <div ref={(el) => { columnsRef.current[status] = el; }} className="board-lane-tasks">
                    {tasks.map((t) => <TaskCard key={t.id} t={t} onOpen={openModal} onMove={moveFromSelect} dragging={dragging} setDragging={setDragging} />)}
                    {tasks.length === 0 && <div className="board-lane-empty"><Inbox size={21} aria-hidden="true" /><p>{isTarget ? 'Soltá aquí' : `Nada en ${TASK_STATUS[status].label.toLowerCase()}.`}</p><span>{isTarget ? 'La tarea seguirá su camino.' : anyFilter ? 'Probá ajustar los filtros.' : status === 'hecho' ? 'Los próximos logros van aquí.' : 'Hay espacio para el siguiente paso.'}</span></div>}
                  </div>
                  {status !== 'hecho' && <div className="board-lane-add"><QuickAdd status={status} defaults={{ project_id: project ? Number(project) : null, assignee_id: assignee }} onCreated={reload} /></div>}
                  {status === 'hecho' && <p className="board-completed-note">Muestra lo cerrado en los últimos 21 días.</p>}
                </section>;
              })}
            </div>
          </div>
        </>}
      </section>
      {data && filtered.length === 0 && <p className="board-no-results"><KanbanSquare size={18} aria-hidden="true" />No hay tareas con estos filtros. <Link to="/proyectos">Ver proyectos<ArrowUpRight size={13} aria-hidden="true" /></Link></p>}
      {creating && <TaskModal projects={projects} defaults={{ project_id: project ? Number(project) : null, assignee_id: assignee ?? user.id }} onClose={() => setCreating(false)} onSaved={reload} />}
      {modalTask && <TaskModal key={modalTask.id} task={modalTask} projects={projects} onClose={closeModal} onSaved={reload} />}
    </div>
  );
}
