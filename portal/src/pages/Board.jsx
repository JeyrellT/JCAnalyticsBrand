// Tablero kanban del equipo: arrastrar y soltar en escritorio, "Mover a…" en móvil y teclado.
// Los límites WIP (Lean) de "En progreso" y "Revisión" se configuran en Equipo y ajustes.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search, MessageSquare, CalendarClock, Trash2, Send, Filter, KanbanSquare } from 'lucide-react';
import { useResource, useSession } from '../lib/session.jsx';
import { api } from '../lib/api.js';
import { useLocation, navigate, Link } from '../lib/router.jsx';
import { PageHeader, PageLoader, Badge, Modal, Field, Select, Avatar, useAction, cx } from '../components/ui.jsx';
import { PersonSelect } from '../components/common.jsx';
import { TASK_STATUS, TASK_STATUS_ORDER, TASK_PRIORITY } from '../../shared/catalog.js';
import { dueLabel, timeAgo, todayKey } from '../lib/format.js';

const statusOptions = TASK_STATUS_ORDER.map((s) => ({ value: s, label: TASK_STATUS[s].label }));
const priorityOptions = Object.entries(TASK_PRIORITY).map(([value, v]) => ({ value, label: v.label }));

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
            <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm bg-paper px-3 py-2">
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
  const [form, setForm] = useState(() => task ?? { status: 'por_hacer', priority: 'media', ...defaults });
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  async function save(e) {
    e.preventDefault();
    const body = { title: form.title, description: form.description || null, status: form.status, priority: form.priority, assignee_id: form.assignee_id || null, project_id: form.project_id || null, due_date: form.due_date || null };
    const res = await run(() => api(task ? `/api/tasks/${task.id}` : '/api/tasks', { method: task ? 'PATCH' : 'POST', body }), { success: task ? 'Tarea actualizada' : 'Tarea creada' });
    if (res) { onSaved(); onClose(); }
  }
  async function remove() {
    if (!window.confirm('¿Eliminar esta tarea y sus comentarios?')) return;
    if (await run(() => api(`/api/tasks/${task.id}`, { method: 'DELETE' }), { success: 'Tarea eliminada' })) { onSaved(); onClose(); }
  }

  return (
    <Modal open onClose={onClose} title={task ? 'Tarea' : 'Nueva tarea'} size="lg"
      footer={<>
        {task && <button type="button" className="btn btn-ghost mr-auto text-coral" onClick={remove} disabled={busy}><Trash2 className="h-4 w-4" />Eliminar</button>}
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
  const pr = TASK_PRIORITY[t.priority];
  return (
    <article
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(t.id)); setDragging(t.id); }}
      onDragEnd={() => setDragging(null)}
      data-task={t.id}
      className={cx('group relative cursor-grab rounded-2xl border border-line bg-white p-3 shadow-[0_1px_2px_rgba(7,26,54,0.05)] transition hover:border-slate-300 hover:shadow-md active:cursor-grabbing', dragging === t.id && 'opacity-40')}
    >
      <button type="button" onClick={() => onOpen(t)} className="block w-full text-left">
        <div className="mb-1.5 flex items-center gap-1.5">
          <span className={cx('h-1.5 w-6 rounded-full', `dot-${pr.tone}`)} title={`Prioridad ${pr.label}`} />
          {t.priority === 'urgente' && <span className="text-[11px] font-bold uppercase text-coral">Urgente</span>}
        </div>
        <p className={cx('text-sm font-semibold leading-snug', t.status === 'hecho' && 'text-muted line-through')}>{t.title}</p>
        {t.project_name && <p className="mt-1 truncate text-xs text-muted">{t.project_name}</p>}
      </button>
      <div className="mt-2.5 flex items-center gap-2">
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {due && <Badge tone={due.tone}><CalendarClock className="h-3 w-3" />{due.text}</Badge>}
          {t.comments > 0 && <span className="flex items-center gap-1 text-xs text-muted"><MessageSquare className="h-3.5 w-3.5" />{t.comments}</span>}
        </span>
        {t.assignee_name ? <Avatar name={t.assignee_name} color={t.assignee_color} size={24} /> : <span className="h-6 w-6 shrink-0 rounded-full border border-dashed border-slate-300" title="Sin asignar" />}
      </div>
      {/* En escritorio se arrastra (o se cambia la columna en el detalle); en táctil, este selector. */}
      <label className="mt-2 flex items-center gap-2 border-t border-line pt-2 text-[11px] font-semibold text-muted lg:hidden">
        Mover a
        <select className="h-8 min-w-0 flex-1 rounded-lg border border-line bg-white px-1.5 text-xs text-ink" value={t.status} onChange={(e) => onMove(t, e.target.value)} aria-label={`Mover "${t.title}"`}>
          {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
    </article>
  );
}

function QuickAdd({ status, defaults, onCreated }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [run, busy] = useAction();
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center gap-1.5 rounded-xl px-2 py-2 text-sm font-medium text-muted hover:bg-white hover:text-ink"><Plus className="h-4 w-4" />Agregar tarea</button>;
  async function add(e) {
    e.preventDefault();
    if (title.trim().length < 2) return;
    if (await run(() => api('/api/tasks', { method: 'POST', body: { title, status, ...defaults } }))) { setTitle(''); onCreated(); }
  }
  return (
    <form onSubmit={add} className="space-y-2">
      <textarea autoFocus className="input" rows={2} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título de la tarea" aria-label="Título"
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) add(e); if (e.key === 'Escape') setOpen(false); }} />
      <div className="flex gap-2"><button type="submit" className="btn btn-dark btn-sm" disabled={busy}>Agregar</button><button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Cancelar</button></div>
    </form>
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
  const [dragging, setDragging] = useState(null);
  const [dropHint, setDropHint] = useState(null);
  const [creating, setCreating] = useState(query.get('nueva') === '1');
  const [run] = useAction();
  const columnsRef = useRef({});

  const openTaskId = Number(query.get('tarea')) || null;
  const openTask = openTaskId ? data?.tasks.find((t) => t.id === openTaskId) : null;
  // Una tarea "hecha" hace más de 21 días no viene en la lista por defecto: se busca aparte.
  const { data: oldTask } = useResource(openTaskId && data && !openTask ? '/api/tasks?all=1' : null);
  const modalTask = openTask ?? oldTask?.tasks.find((t) => t.id === openTaskId) ?? null;

  const nueva = query.get('nueva');
  useEffect(() => {
    if (nueva === '1') navigate('/tablero', { replace: true });
  }, [nueva]);

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
  const wip = { en_progreso: Number(settings.wip_en_progreso) || null, revision: Number(settings.wip_revision) || null };

  async function moveTo(task, status, position) {
    const pos = position ?? (Math.max(0, ...(data.tasks.filter((t) => t.status === status).map((t) => t.position))) + 1024);
    // Optimista: se ve al instante; si falla, se recarga el estado real.
    setData((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === task.id ? { ...t, status, position: pos } : t)) }));
    const ok = await run(() => api(`/api/tasks/${task.id}`, { method: 'PATCH', body: { status, position: pos } }));
    if (!ok) reload();
    else if (status === 'hecho' && task.status !== 'hecho') reload();
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
    <>
      <PageHeader eyebrow="Centro de operaciones" title="Tablero" subtitle="Arrastrá las tarjetas entre columnas. En el celular usá «Mover a» en cada tarjeta."
        actions={<button type="button" className="btn btn-primary" onClick={() => setCreating(true)}><Plus className="h-4 w-4" />Nueva tarea</button>} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="relative min-w-0 flex-1 sm:max-w-xs">
          <span className="sr-only">Buscar tareas</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input className="input pl-9" placeholder="Buscar tareas" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <Select className="w-auto max-w-[220px]" aria-label="Proyecto" options={projects.map((p) => ({ value: String(p.id), label: p.name }))} value={project} onChange={setProject} placeholder="Todos los proyectos" />
        <PersonSelect className="w-auto" value={assignee} onChange={setAssignee} placeholder="Todo el equipo" />
        <button type="button" className={cx('btn', onlyOverdue ? 'btn-danger' : 'btn-outline')} aria-pressed={onlyOverdue} onClick={() => setOnlyOverdue((v) => !v)}><Filter className="h-4 w-4" />Vencidas</button>
        {(project || assignee || onlyOverdue || q) && <button type="button" className="btn btn-ghost" onClick={() => { setProject(''); setAssignee(null); setOnlyOverdue(false); setQ(''); }}>Limpiar</button>}
      </div>

      {!data ? <PageLoader error={error} onRetry={reload} /> : (
        <div className="board-scroll relative -mx-4 flex gap-3 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0">
          {columns.map(({ status, tasks }) => {
            const limit = wip[status];
            const over = limit && tasks.length > limit;
            return (
              <section key={status} aria-label={TASK_STATUS[status].label}
                className={cx('flex w-[82vw] max-w-[320px] shrink-0 flex-col rounded-3xl p-2.5 transition sm:w-[300px] lg:w-auto lg:max-w-none', dropHint === status ? 'bg-brand-soft ring-2 ring-brand/40' : over ? 'bg-coral-soft/60' : 'bg-slate-100/80')}
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
                <header className="flex items-center justify-between px-1.5 pb-2.5 pt-1">
                  <h2 className="flex items-center gap-2 text-sm font-bold">
                    <span className={cx('h-2 w-2 rounded-full', `dot-${TASK_STATUS[status].tone}`)} />
                    {TASK_STATUS[status].label}
                  </h2>
                  <span className={cx('rounded-full px-2 text-xs font-semibold tabular', over ? 'bg-coral text-white' : 'bg-white text-muted')} title={limit ? `Límite WIP: ${limit}` : undefined}>
                    {tasks.length}{limit ? `/${limit}` : ''}
                  </span>
                </header>
                {over && <p className="mx-1.5 mb-2 rounded-xl bg-white px-2.5 py-1.5 text-xs font-medium text-coral">Límite WIP superado: terminen antes de empezar más.</p>}
                <div ref={(el) => { columnsRef.current[status] = el; }} className="flex min-h-16 flex-1 flex-col gap-2">
                  {tasks.map((t) => <TaskCard key={t.id} t={t} onOpen={openModal} onMove={(task, s) => moveTo(task, s)} dragging={dragging} setDragging={setDragging} />)}
                </div>
                {status !== 'hecho' && <div className="mt-2"><QuickAdd status={status} defaults={{ project_id: project ? Number(project) : null, assignee_id: assignee }} onCreated={reload} /></div>}
                {status === 'hecho' && <p className="mt-2 px-1.5 text-[11px] text-muted">Muestra lo cerrado en los últimos 21 días.</p>}
              </section>
            );
          })}
        </div>
      )}

      {data && filtered.length === 0 && (
        <p className="mt-2 flex items-center gap-2 text-sm text-muted"><KanbanSquare className="h-4 w-4" />No hay tareas con estos filtros. <Link to="/proyectos" className="font-semibold text-brand hover:underline">Ver proyectos</Link></p>
      )}

      {creating && <TaskModal projects={projects} defaults={{ project_id: project ? Number(project) : null, assignee_id: assignee ?? user.id }} onClose={() => setCreating(false)} onSaved={reload} />}
      {modalTask && <TaskModal key={modalTask.id} task={modalTask} projects={projects} onClose={closeModal} onSaved={reload} />}
    </>
  );
}
