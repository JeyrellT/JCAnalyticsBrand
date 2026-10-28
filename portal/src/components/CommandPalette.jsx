import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowDown, ArrowUp, ArrowUpRight, BellRing, Bot, Building2, CalendarDays, CalendarPlus,
  CheckCheck, ChevronRight, ClipboardList, Command, CornerDownLeft, FolderKanban,
  History, Inbox, KanbanSquare, LayoutDashboard, Layers, Link2, ListPlus, LoaderCircle,
  Plus, Receipt, Search, Settings2, Sparkles, TrendingUp, Users, X, WalletCards, BookOpen, FileSpreadsheet, MessagesSquare, BarChart3,
} from 'lucide-react';
import { navigate, useLocation } from '../lib/router.jsx';
import { useResource, useSession } from '../lib/session.jsx';
import '../styles/command-palette.css';

const normalize = (value) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const FILTERS = [{ key: 'all', label: 'Todo' }, { key: 'action', label: 'Acciones' }, { key: 'project', label: 'Proyectos' }, { key: 'task', label: 'Tareas' }];
const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), [href], [tabindex="0"]';
const COMMANDS = [
  { key: 'new-task', title: 'Crear una tarea', detail: 'Dale un siguiente paso a una idea.', to: '/tablero?nueva=1', icon: ListPlus, type: 'action', words: 'nueva pendiente asignar' },
  { key: 'new-meeting', title: 'Agendar una cita', detail: 'Conectá al equipo alrededor de una fecha.', to: '/agenda?nueva=1', icon: CalendarPlus, type: 'action', words: 'nueva reunion evento calendario' },
  { key: 'new-project', title: 'Crear un proyecto', detail: 'El próximo gran avance empieza acá.', to: '/proyectos?nuevo=1', icon: Plus, type: 'action', words: 'nuevo iniciar' },
  { key: 'new-client', title: 'Agregar un cliente', detail: 'Una nueva relación para el equipo.', to: '/clientes?nuevo=1', icon: Building2, type: 'action', words: 'nuevo contacto prospecto' },
  { key: 'import-directory', title: 'Importar contactos al libro amarillo', detail: 'Subí un Excel y la lista crece sola.', to: '/libro-amarillo?importar=1', icon: FileSpreadsheet, type: 'action', words: 'excel csv subir prospectos telefonos' },
  { key: 'home', title: 'Centro de operaciones', detail: 'Tu panorama de hoy.', to: '/', icon: LayoutDashboard, type: 'section', words: 'inicio dashboard resumen' },
  { key: 'inbox', title: 'Buzón', detail: 'Lo que necesita tu atención.', to: '/buzon', icon: Inbox, type: 'section', words: 'pendientes avisos confirmar notificaciones' },
  { key: 'board', title: 'Tablero', detail: 'Ideas, tareas y entregas en movimiento.', to: '/tablero', icon: KanbanSquare, type: 'section', words: 'kanban tareas trabajo' },
  { key: 'calendar', title: 'Agenda', detail: 'El calendario compartido.', to: '/agenda', icon: CalendarDays, type: 'section', words: 'citas reuniones calendario' },
  { key: 'projects', title: 'Proyectos', detail: 'Todo lo que estamos construyendo.', to: '/proyectos', icon: FolderKanban, type: 'section' },
  { key: 'directory', title: 'Libro amarillo', detail: 'Negocios para llamar y ofrecer servicios.', to: '/libro-amarillo', icon: BookOpen, type: 'section', words: 'prospectos llamadas telefonos directorio guia contactos restaurantes' },
  { key: 'leads', title: 'Consultas de la web', detail: 'Personas que dejaron sus datos en el sitio.', to: '/consultas', icon: MessagesSquare, type: 'section', words: 'leads prospectos formulario contacto whatsapp sitio pagina' },
  { key: 'traffic', title: 'Tráfico del sitio', detail: 'Dónde se queda la gente y qué toca.', to: '/trafico', icon: BarChart3, type: 'section', words: 'analitica visitas clics embudo conversion anuncios campañas' },
  { key: 'clients', title: 'Clientes', detail: 'Relaciones, contactos y oportunidades.', to: '/clientes', icon: Building2, type: 'section' },
  { key: 'briefs', title: 'Briefs', detail: 'Del pedido a un plan compartido.', to: '/briefs', icon: ClipboardList, type: 'section', words: 'solicitudes requerimientos' },
  { key: 'services', title: 'Servicios', detail: 'Lo que hacemos y quién lo lidera.', to: '/servicios', icon: Layers, type: 'section' },
  { key: 'team', title: 'Equipo', detail: 'Las personas detrás de cada avance.', to: '/equipo', icon: Users, type: 'section', words: 'socios personas miembros' },
  { key: 'automations', title: 'Automatizaciones', detail: 'Rutinas, recordatorios y tareas recurrentes.', to: '/automatizaciones', icon: Bot, type: 'section', words: 'automatico reglas flujos' },
  { key: 'notifications', title: 'Avisos y app', detail: 'Elegí cómo mantenerte conectado.', to: '/notificaciones', icon: BellRing, type: 'section', words: 'notificaciones push instalar' },
  { key: 'activity', title: 'Bitácora', detail: 'La historia de lo que va pasando.', to: '/bitacora', icon: History, type: 'section', words: 'actividad historial cambios' },
  { key: 'profile', title: 'Mi perfil', detail: 'Tus datos y tu apariencia.', to: '/equipo?tab=perfil', icon: Settings2, type: 'section', words: 'tema oscuro claro cuenta contraseña' },
];
const GROUP_LABELS = { action: 'HACÉ QUE PASE', section: 'EXPLORÁ TU ESPACIO', project: 'PROYECTOS', task: 'TAREAS' };

function PaletteDialog({ onClose }) {
  const { isAdmin, canInvest } = useSession();
  const projects = useResource('/api/projects');
  const tasks = useResource('/api/tasks');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const dialog = useRef(null);
  const search = useRef(null);
  const uid = useId();

  const commands = useMemo(() => [
    ...COMMANDS,
    ...(canInvest ? [
      { key: 'billing', title: 'Cobros', detail: 'Pagos únicos y recurrentes: qué toca cobrar cada mes.', to: '/cobros', icon: Receipt, type: 'section', words: 'cobrar mensualidad quincena quincenal recurrente facturar clientes pagos' },
      { key: 'investments', title: 'Inversiones', detail: 'Capital, movimientos y aprobaciones.', to: '/inversiones', icon: TrendingUp, type: 'section', words: 'socios aportes retornos' },
      { key: 'finance', title: 'Finanzas y costos', detail: 'Ventas cobradas, gastos, costos y repartos.', to: '/finanzas', icon: WalletCards, type: 'section', words: 'dinero utilidad publicidad meta google ads costos costear tarifas capital ganancias' },
    ] : []),
    ...(isAdmin ? [
      { key: 'invite', title: 'Gestionar invitaciones', detail: 'Abrí la puerta a nuevos colaboradores.', to: '/equipo?tab=enlaces', icon: Link2, type: 'action', words: 'invitar socio enlace registro acceso' },
      { key: 'settings', title: 'Ajustes de la operación', detail: 'Configurá las reglas del equipo.', to: '/equipo?tab=ajustes', icon: Settings2, type: 'section', words: 'configuracion administrar limites' },
    ] : []),
    ...(projects.data?.projects ?? []).map((p) => ({
      key: `project-${p.id}`, title: p.name, detail: [p.client || p.client_name, p.owner_name].filter(Boolean).join(' · ') || 'Abrir proyecto',
      to: `/proyectos/${encodeURIComponent(p.id)}`, icon: FolderKanban, type: 'project', words: `proyecto ${p.service ?? ''}`,
    })),
    ...(tasks.data?.tasks ?? []).map((t) => ({
      key: `task-${t.id}`, title: t.title, detail: [t.project_name, t.assignee_name].filter(Boolean).join(' · ') || 'Abrir tarea en el tablero',
      to: `/tablero?tarea=${encodeURIComponent(t.id)}`, icon: CheckCheck, type: 'task', words: `tarea ${t.status ?? ''}`,
    })),
  ], [canInvest, isAdmin, projects.data, tasks.data]);

  const matches = useMemo(() => {
    const tokens = normalize(query).split(/\s+/).filter(Boolean);
    return commands.filter((item) => (filter === 'all' || item.type === filter)
      && tokens.every((token) => normalize(`${item.title} ${item.detail} ${item.words ?? ''}`).includes(token)));
  }, [commands, filter, query]);
  const results = matches.slice(0, 40);
  const selectedIndex = Math.max(0, results.findIndex((item) => item.key === selected));
  const active = results[selectedIndex];
  const activeId = active ? `${uid}-${active.key}` : undefined;
  const loading = projects.loading || tasks.loading;
  const failed = projects.error || tasks.error;

  useEffect(() => {
    const node = dialog.current;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    node.showModal();
    search.current?.focus({ preventScroll: true });
    return () => {
      node.close();
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView({ block: 'nearest' });
  }, [activeId]);

  const go = (item) => { onClose(); navigate(item.to); };
  const changeFilter = (next) => { setFilter(next); setSelected(null); search.current?.focus(); };
  const handleKeys = (event) => {
    if (event.key === 'Tab') {
      const items = [...dialog.current.querySelectorAll(FOCUSABLE)].filter((el) => el.getClientRects().length > 0);
      const first = items[0];
      const last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      return;
    }
    if (event.target !== search.current || event.nativeEvent.isComposing) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (results.length) setSelected(results[(selectedIndex + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length].key);
    } else if (event.key === 'Enter' && active) {
      event.preventDefault();
      go(active);
    }
  };

  return createPortal(
    <dialog ref={dialog} className="jca-command-dialog" aria-modal="true" aria-labelledby={`${uid}-title`} aria-describedby={`${uid}-hint`}
      onCancel={(event) => { event.preventDefault(); onClose(); }} onKeyDown={handleKeys}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="jca-command-panel">
        <header className="jca-command-header">
          <div className="jca-command-eyebrow"><Command size={13} aria-hidden="true" /> JC / ATAJOS</div>
          <button className="jca-command-close" type="button" onClick={onClose} aria-label="Cerrar búsqueda"><X size={18} /></button>
          <h2 id={`${uid}-title`}>Tu próximo <em>movimiento.</em></h2>
          <p id={`${uid}-hint`}>Un proyecto, una tarea, una idea. Encontrá por dónde seguir.</p>
          <Sparkles className="jca-command-spark" size={70} strokeWidth={0.8} aria-hidden="true" />
        </header>
        <div className="jca-command-search">
          <Search size={22} aria-hidden="true" />
          <input ref={search} value={query} onChange={(event) => { setQuery(event.target.value); setSelected(null); }}
            role="combobox" aria-label="Buscar acciones, proyectos y tareas" aria-autocomplete="list" aria-expanded="true"
            aria-controls={`${uid}-results`} aria-activedescendant={activeId} placeholder="¿Qué querés poner en marcha?"
            autoComplete="off" spellCheck="false" />
          {query && <button type="button" className="jca-command-clear" onClick={() => { setQuery(''); setSelected(null); search.current?.focus(); }} aria-label="Limpiar búsqueda"><X size={16} /></button>}
          <kbd className="jca-command-escape" aria-hidden="true">esc</kbd>
        </div>
        <div className="jca-command-filters" aria-label="Filtrar resultados">
          {FILTERS.map((item) => <button key={item.key} type="button" onClick={() => changeFilter(item.key)} aria-pressed={filter === item.key}>{item.label}</button>)}
          <span className="jca-command-count" role="status">{matches.length} {matches.length === 1 ? 'resultado' : 'resultados'}</span>
        </div>
        <div className="jca-command-results" id={`${uid}-results`} role="listbox" aria-label="Resultados de búsqueda" aria-busy={loading}>
          {results.map((item, index) => {
            const Icon = item.icon;
            const showGroup = index === 0 || item.type !== results[index - 1].type;
            return <div key={item.key} role="presentation">
              {showGroup && <div className="jca-command-group" role="presentation">{GROUP_LABELS[item.type]}</div>}
              <div id={`${uid}-${item.key}`} role="option" aria-selected={active?.key === item.key}
                className={`jca-command-result${active?.key === item.key ? ' jca-command-result-active' : ''}`}
                onMouseMove={() => setSelected(item.key)} onMouseDown={(event) => event.preventDefault()} onClick={() => go(item)}>
                <span className={`jca-command-icon jca-command-icon-${item.type}`}><Icon size={19} strokeWidth={1.7} aria-hidden="true" /></span>
                <span className="jca-command-result-text"><strong>{item.title}</strong><span>{item.detail}</span></span>
                {item.type === 'action' ? <ArrowUpRight className="jca-command-result-arrow" size={17} aria-hidden="true" /> : <ChevronRight className="jca-command-result-arrow" size={17} aria-hidden="true" />}
              </div>
            </div>;
          })}
        </div>
        {!results.length && <div className="jca-command-empty"><Search size={28} strokeWidth={1.3} aria-hidden="true" /><strong>{loading ? 'Buscando en tu espacio…' : 'Todavía no encontramos eso.'}</strong><p>{loading ? 'Tus proyectos y tareas están en camino.' : query ? 'Probá con otro nombre o elegí otra categoría.' : 'Cuando haya elementos en esta categoría, aparecerán acá.'}</p></div>}
        {loading && results.length > 0 && <div className="jca-command-status" role="status"><LoaderCircle size={14} className="jca-command-spinner" aria-hidden="true" />Cargando proyectos y tareas…</div>}
        {failed && <div className="jca-command-status jca-command-error" role="status"><span>No pudimos cargar {projects.error && tasks.error ? 'los proyectos y las tareas' : projects.error ? 'los proyectos' : 'las tareas'}.</span><button type="button" onClick={() => { if (projects.error) projects.reload(); if (tasks.error) tasks.reload(); }}>Reintentar</button></div>}
        {matches.length > results.length && <p className="jca-command-status">Mostrando {results.length} de {matches.length}. Escribí un poco más para afinar.</p>}
        <footer className="jca-command-footer"><span><kbd><ArrowUp size={11} /><ArrowDown size={11} /></kbd> para explorar <kbd><CornerDownLeft size={12} /></kbd> para abrir</span><span>MENOS CLICS. MÁS AVANCE.</span></footer>
      </div>
    </dialog>, document.body,
  );
}

/** Mount once in the team Layout; data is loaded only while the palette is open. */
export default function CommandPalette({ className = '' }) {
  const [open, setOpen] = useState(false);
  const { full } = useLocation();
  const [seenRoute, setSeenRoute] = useState(full);
  if (seenRoute !== full) { setSeenRoute(full); setOpen(false); }
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const shortcut = (event) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.key.toLowerCase() !== 'k' || event.repeat || event.defaultPrevented) return;
      // Leave other forms and dialogs in control of their keyboard shortcuts.
      if (!open && document.querySelector('[aria-modal="true"], dialog[open]')) return;
      event.preventDefault();
      setOpen((value) => !value);
    };
    document.addEventListener('keydown', shortcut);
    return () => document.removeEventListener('keydown', shortcut);
  }, [open]);

  return <>
    <button type="button" className={`jca-command-trigger ${className}`} onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open} aria-keyshortcuts="Control+K Meta+K">
      <Search size={17} strokeWidth={1.8} aria-hidden="true" /><span>Buscar o hacer algo…</span><kbd aria-hidden="true">Ctrl / ⌘ K</kbd>
    </button>
    {open && <PaletteDialog onClose={close} />}
  </>;
}
