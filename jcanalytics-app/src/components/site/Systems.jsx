import { useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Box, Check, ChevronRight, Globe2, Layers3, LockKeyhole, Settings2, ShieldCheck } from 'lucide-react';
import { Label, MaskLines, Reveal } from './primitives';
import ContactCTA from './ContactCTA';
import { ArchitectureBlueprint } from './StudioIllustrations';
import '../../styles/systems.css';

const _MOTION = motion;
const MODULES = [
  {
    id: 'inventario', label: 'Inventario', icon: Box, title: 'Cada movimiento, en su lugar.',
    benefit: 'Consultá existencias y registrá entradas y salidas desde un panel conectado a tu web.',
    detail: 'Productos, insumos y movimientos, organizados según la operación de tu negocio.',
  },
  {
    id: 'procesos', label: 'Procesos', icon: Layers3, title: 'Sabé qué sigue. Y quién lo hace.',
    benefit: 'Seguí el trabajo desde que llega una solicitud hasta que se completa, con etapas claras para tu equipo.',
    detail: 'Estados, responsables y flujos de trabajo definidos para tu manera de operar.',
  },
  {
    id: 'administracion', label: 'Administración', icon: Settings2, title: 'El control, en tus manos.',
    benefit: 'Administrá contenido, usuarios y accesos desde un mismo lugar, con permisos según cada rol.',
    detail: 'Un panel para gestionar tu plataforma y conectar sistemas cuando el alcance lo requiere.',
  },
];

const InventoryExample = () => (
  <div className="systems-inventory">
    <div className="systems-preview-heading"><span>Existencias</span><span className="systems-example-tag">Ejemplo</span></div>
    <table>
      <caption className="sr-only">Datos ilustrativos de un módulo de inventario</caption>
      <thead><tr><th scope="col">Artículo</th><th scope="col">Unidades</th><th scope="col">Estado</th></tr></thead>
      <tbody>
        <tr><th scope="row"><span className="systems-item-icon"><Box size={15} aria-hidden="true" /></span>Producto A</th><td>42</td><td><span className="systems-status">Disponible</span></td></tr>
        <tr><th scope="row"><span className="systems-item-icon"><Box size={15} aria-hidden="true" /></span>Insumo B</th><td>18</td><td><span className="systems-status">Disponible</span></td></tr>
        <tr><th scope="row"><span className="systems-item-icon"><Box size={15} aria-hidden="true" /></span>Empaque C</th><td>7</td><td><span className="systems-status systems-status--review">Revisar</span></td></tr>
      </tbody>
    </table>
    <div className="systems-preview-foot"><span>Entradas / salidas</span><span>Registro de movimientos <ChevronRight size={14} aria-hidden="true" /></span></div>
  </div>
);

const ProcessExample = () => (
  <div className="systems-process-preview">
    <div className="systems-preview-heading"><span>Flujo de trabajo</span><span className="systems-example-tag">Ejemplo</span></div>
    <div className="systems-kanban">
      {[
        { title: 'Recibido', task: 'Solicitud de cliente', owner: 'Por asignar', state: 'pending' },
        { title: 'En proceso', task: 'Preparación de pedido', owner: 'Operaciones', state: 'active' },
        { title: 'Listo', task: 'Revisión de entrega', owner: 'Responsable', state: 'done' },
      ].map((stage) => (
        <div key={stage.title} className={`systems-kanban__column systems-kanban__column--${stage.state}`}>
          <span className="systems-kanban__label"><i aria-hidden="true" />{stage.title}</span>
          <div className="systems-kanban__task"><span>{stage.task}</span><small>{stage.owner}</small></div>
        </div>
      ))}
    </div>
    <div className="systems-preview-foot"><span>Etapas a medida</span><span>Visibilidad para tu equipo <ChevronRight size={14} aria-hidden="true" /></span></div>
  </div>
);

const AdministrationExample = () => (
  <div className="systems-admin-preview">
    <div className="systems-preview-heading"><span>Roles y permisos</span><span className="systems-example-tag">Ejemplo</span></div>
    <ul className="systems-role-list">
      {[
        { initial: 'A', role: 'Administración', access: 'Configuración y usuarios', full: true },
        { initial: 'O', role: 'Operaciones', access: 'Inventario y procesos' },
        { initial: 'C', role: 'Comercial', access: 'Consulta y seguimiento' },
      ].map((person) => (
        <li key={person.role}>
          <span className="systems-role-avatar" aria-hidden="true">{person.initial}</span>
          <span><strong>{person.role}</strong><small>{person.access}</small></span>
          <span className="systems-role-access"><LockKeyhole size={13} aria-hidden="true" />{person.full ? 'Gestión' : 'Según rol'}</span>
        </li>
      ))}
    </ul>
    <div className="systems-preview-foot"><span>Accesos definidos</span><span><ShieldCheck size={14} aria-hidden="true" />Permisos a medida</span></div>
  </div>
);

const EXAMPLES = [InventoryExample, ProcessExample, AdministrationExample];

const DataConnections = ({ active, reduce }) => (
  <div className="systems-connections" aria-hidden="true">
    <svg className="systems-connections__desktop" viewBox="0 0 130 320" fill="none">
      {[68, 160, 252].map((position, index) => (
        <g key={position}>
          <path d={`M6 ${position} H32 C78 ${position} 55 160 110 160 H124`} stroke="#afc5d5" strokeWidth="1" />
          {index === active && <motion.path key={active} d={`M6 ${position} H32 C78 ${position} 55 160 110 160 H124`} stroke="#00a6b2" strokeWidth="2" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduce ? 0 : 0.7, ease: 'easeOut' }} />}
          <circle cx="6" cy={position} r="3" fill={index === active ? '#0065df' : '#afc5d5'} />
        </g>
      ))}
      <circle cx="124" cy="160" r="4" fill="#00a6b2" />
      <circle cx="73" cy="160" r="21" fill="#e4ebdf" stroke="#7a9b84" strokeWidth=".7" />
      <circle cx="73" cy="160" r="15" stroke="#7a9b84" strokeWidth=".7" strokeDasharray="2 3" />
      <path d="M67 154L61 160L67 166M79 154L85 160L79 166M76 152L70 168" stroke="#426b50" strokeWidth="1.4" />
    </svg>
    <svg className="systems-connections__mobile" viewBox="0 0 320 70" fill="none">
      <path d="M60 5 V16 C60 42 160 24 160 64 M160 5 V64 M260 5 V16 C260 42 160 24 160 64" stroke="#afc5d5" />
      <motion.path key={active} d={['M60 5 V16 C60 42 160 24 160 64', 'M160 5 V64', 'M260 5 V16 C260 42 160 24 160 64'][active]} stroke="#00a6b2" strokeWidth="2" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduce ? 0 : 0.6 }} />
      <circle cx="160" cy="64" r="3" fill="#00a6b2" />
    </svg>
    <span>Datos conectados</span>
  </div>
);

const Systems = () => {
  const [active, setActive] = useState(0);
  const tabs = useRef([]);
  const id = useId();
  const reduce = useReducedMotion();
  const selected = MODULES[active];
  const Example = EXAMPLES[active];

  const onTabKeyDown = (event, index) => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % MODULES.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + MODULES.length) % MODULES.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = MODULES.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    setActive(next);
    tabs.current[next]?.focus();
  };

  return (
    <section id="plataformas" className="systems-section scroll-mt-24" aria-labelledby={`${id}-heading`}>
      <div className="systems-container">
        <div className="systems-heading">
          <div>
            <Label className="systems-section-label">01 / Desarrollo de sistemas</Label>
            <h2 id={`${id}-heading`} className="systems-title font-display">
              <MaskLines lines={['Del primer píxel', <em key="inside" className="font-serif font-normal">al último dato.</em>]} />
            </h2>
          </div>
          <Reveal delay={0.15} className="systems-intro">
            <span className="systems-eyebrow">Frontend + backend + base de datos.</span>
            <p>Diseñamos páginas web, aplicaciones y sistemas completos. Una experiencia visual propia por fuera; inventarios, procesos, APIs y administración conectados por dentro.</p>
          </Reveal>
        </div>

        <Reveal className="systems-scene">
          <div className="systems-scene__label"><span className="systems-example-dot" aria-hidden="true" />Ejemplo de solución · módulos a medida</div>
          <div className="systems-layers">
            <div className="systems-public-layer">
              <div className="systems-layer-heading"><span>01 / EXPERIENCIA</span><Globe2 size={18} aria-hidden="true" /></div>
              <h3 className="font-display">Lo que ve<br /><span className="font-serif italic">tu cliente.</span></h3>
              <div className="systems-website" aria-hidden="true">
                <div className="systems-website__bar"><span><i /><i /><i /></span><span>tu-negocio.com</span><LockKeyhole size={10} /></div>
                <div className="systems-website__content">
                  <div className="systems-website__nav"><span>Tu negocio<span className="systems-website__mark">.</span></span><span>Explorá <ArrowUpRight size={11} /></span></div>
                  <span className="systems-website__eyebrow">Una experiencia a tu medida</span>
                  <p className="font-display">Encontrá lo que<br /><span className="font-serif italic">necesitás.</span></p>
                  <div className="systems-website__art">
                    <img src={`${import.meta.env.BASE_URL}artwork/connected-materials-v2.webp`} alt="" width="1200" height="800" loading="lazy" decoding="async" />
                    <span className="systems-website__art-index">OBJETO 001 / CONEXIÓN</span>
                    <svg className="systems-website__reticle" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="15" stroke="currentColor" strokeWidth=".6" /><path d="M20 0V40M0 20H40" stroke="currentColor" strokeWidth=".6" /></svg>
                    <div className="systems-website__art-caption"><span>Diseñado para conectar.</span><span>↗</span></div>
                  </div>
                  <div className="systems-website__action"><span>Ver opciones</span><ArrowUpRight size={15} /></div>
                </div>
              </div>
              <p className="systems-layer-note">Catálogo, reservas o consultas. La experiencia pública se diseña para tu servicio.</p>
            </div>

            <DataConnections active={active} reduce={reduce} />

            <div className="systems-operation-layer">
              <div className="systems-layer-heading"><span>02 / OPERACIÓN</span><Layers3 size={18} aria-hidden="true" /></div>
              <h3 className="font-display">Lo que mueve<br /><span className="font-serif italic">tu negocio.</span></h3>
              <div className="systems-dashboard">
                <div className="systems-dashboard__bar"><span><span className="systems-dashboard__mark">JC</span>Panel de gestión</span><span><LockKeyhole size={12} aria-hidden="true" />Acceso por rol</span></div>
                <div className="systems-tabs" role="tablist" aria-label="Explorar módulos de ejemplo">
                  {MODULES.map((module, index) => {
                    const Icon = module.icon;
                    return (
                      <button key={module.id} ref={(element) => { tabs.current[index] = element; }} id={`${id}-tab-${module.id}`} type="button" role="tab" aria-selected={active === index} aria-controls={`${id}-panel`} tabIndex={active === index ? 0 : -1} onClick={() => setActive(index)} onKeyDown={(event) => onTabKeyDown(event, index)} className={`systems-tab ${active === index ? 'systems-tab--active' : ''}`}>
                        <Icon size={15} aria-hidden="true" /><span>{module.label}</span>
                      </button>
                    );
                  })}
                </div>
                <ArchitectureBlueprint active={active} />
                <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${selected.id}`} tabIndex={0} className="systems-panel">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div key={selected.id} initial={reduce ? false : { opacity: 0, y: 8, filter: 'blur(2px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={reduce ? { opacity: 1 } : { opacity: 0, y: -5, filter: 'blur(2px)' }} transition={{ duration: reduce ? 0 : 0.22, ease: 'easeOut' }}>
                      <Example />
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
              <div className="systems-capabilities"><span><Check size={13} aria-hidden="true" />Roles y permisos</span><span><Check size={13} aria-hidden="true" />Sistemas conectados según alcance</span></div>
            </div>
          </div>
          <div className="systems-benefit" aria-live="polite" aria-atomic="true">
            <span className="systems-benefit__index font-display">0{active + 1}</span>
            <div>
              <span className="systems-eyebrow">{selected.label} / a tu medida</span>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={selected.id} initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: reduce ? 1 : 0 }} transition={{ duration: reduce ? 0 : 0.18 }}>
                  <h4 className="font-display">{selected.title}</h4><p>{selected.benefit}</p>
                </motion.div>
              </AnimatePresence>
            </div>
            <p className="systems-benefit__detail">{selected.detail}</p>
          </div>
        </Reveal>

        <Reveal className="systems-action">
          <p>Las funcionalidades, integraciones, roles y permisos se definen con cada cliente. Los módulos se cotizan según alcance.</p>
          <ContactCTA need="Sistema / backend" source={`Desarrollo de sistemas · ${selected.label}`} variant="ink" size="lg">Definamos mi sistema</ContactCTA>
        </Reveal>
      </div>
    </section>
  );
};

export default Systems;
