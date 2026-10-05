import { t } from '../../i18n/locale';
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
    id: 'inventario', label: t("Inventario", "Inventory"), icon: Box, title: t("Cada movimiento, en su lugar.", "Every movement, in its place."),
    benefit: t("Consultá existencias y registrá entradas y salidas desde un panel conectado a tu web.", "Check stock and record incoming and outgoing items from a dashboard connected to your website."),
    detail: t("Productos, insumos y movimientos, organizados según la operación de tu negocio.", "Products, supplies and stock movements, organized around your business."),
  },
  {
    id: 'procesos', label: t("Procesos", "Processes"), icon: Layers3, title: t("Sabé qué sigue. Y quién lo hace.", "Know what comes next. And who owns it."),
    benefit: t("Seguí el trabajo desde que llega una solicitud hasta que se completa, con etapas claras para tu equipo.", "Track work from the first request to completion, with clear stages for your team."),
    detail: t("Estados, responsables y flujos de trabajo definidos para tu manera de operar.", "Statuses, owners and workflows built around the way you work."),
  },
  {
    id: 'administracion', label: t("Administración", "Administration"), icon: Settings2, title: t("El control, en tus manos.", "Control, in your hands."),
    benefit: t("Administrá contenido, usuarios y accesos desde un mismo lugar, con permisos según cada rol.", "Manage content, users and access in one place, with permissions for each role."),
    detail: t("Un panel para gestionar tu plataforma y conectar sistemas cuando el alcance lo requiere.", "A dashboard to manage your platform and connect systems when your project requires it."),
  },
];

const InventoryExample = () => (
  <div className="systems-inventory">
    <div className="systems-preview-heading"><span>{t("Existencias", "Stock levels")}</span><span className="systems-example-tag">{t("Ejemplo", "Example")}</span></div>
    <table>
      <caption className="sr-only">{t("Datos ilustrativos de un módulo de inventario", "Illustrative inventory module data")}</caption>
      <thead><tr><th scope="col">{t("Artículo", "Item")}</th><th scope="col">{t("Unidades", "Units")}</th><th scope="col">{t("Estado", "Status")}</th></tr></thead>
      <tbody>
        <tr><th scope="row"><span className="systems-item-icon"><Box size={15} aria-hidden="true" /></span>{t("Producto A", "Product A")}</th><td>42</td><td><span className="systems-status">{t("Disponible", "Available")}</span></td></tr>
        <tr><th scope="row"><span className="systems-item-icon"><Box size={15} aria-hidden="true" /></span>{t("Insumo B", "Supply B")}</th><td>18</td><td><span className="systems-status">{t("Disponible", "Available")}</span></td></tr>
        <tr><th scope="row"><span className="systems-item-icon"><Box size={15} aria-hidden="true" /></span>{t("Empaque C", "Packaging C")}</th><td>7</td><td><span className="systems-status systems-status--review">{t("Revisar", "Review")}</span></td></tr>
      </tbody>
    </table>
    <div className="systems-preview-foot"><span>{t("Entradas / salidas", "Stock in / out")}</span><span>{t("Registro de movimientos", "Movement history")} <ChevronRight size={14} aria-hidden="true" /></span></div>
  </div>
);

const ProcessExample = () => (
  <div className="systems-process-preview">
    <div className="systems-preview-heading"><span>{t("Flujo de trabajo", "Workflow")}</span><span className="systems-example-tag">{t("Ejemplo", "Example")}</span></div>
    <div className="systems-kanban">
      {[
        { title: t("Recibido", "Received"), task: t("Solicitud de cliente", "Customer request"), owner: t("Por asignar", "Unassigned"), state: 'pending' },
        { title: t("En proceso", "In progress"), task: t("Preparación de pedido", "Order preparation"), owner: t("Operaciones", "Operations"), state: 'active' },
        { title: t("Listo", "Ready"), task: t("Revisión de entrega", "Delivery review"), owner: t("Responsable", "Owner"), state: 'done' },
      ].map((stage) => (
        <div key={stage.title} className={`systems-kanban__column systems-kanban__column--${stage.state}`}>
          <span className="systems-kanban__label"><i aria-hidden="true" />{stage.title}</span>
          <div className="systems-kanban__task"><span>{stage.task}</span><small>{stage.owner}</small></div>
        </div>
      ))}
    </div>
    <div className="systems-preview-foot"><span>{t("Etapas a medida", "Custom stages")}</span><span>{t("Visibilidad para tu equipo", "Visibility for your team")} <ChevronRight size={14} aria-hidden="true" /></span></div>
  </div>
);

const AdministrationExample = () => (
  <div className="systems-admin-preview">
    <div className="systems-preview-heading"><span>{t("Roles y permisos", "Roles and permissions")}</span><span className="systems-example-tag">{t("Ejemplo", "Example")}</span></div>
    <ul className="systems-role-list">
      {[
        { initial: 'A', role: t("Administración", "Administration"), access: t("Configuración y usuarios", "Settings and users"), full: true },
        { initial: 'O', role: t("Operaciones", "Operations"), access: t("Inventario y procesos", "Inventory and processes") },
        { initial: 'C', role: t("Comercial", "Sales"), access: t("Consulta y seguimiento", "View and follow up") },
      ].map((person) => (
        <li key={person.role}>
          <span className="systems-role-avatar" aria-hidden="true">{person.initial}</span>
          <span><strong>{person.role}</strong><small>{person.access}</small></span>
          <span className="systems-role-access"><LockKeyhole size={13} aria-hidden="true" />{person.full ? t("Gestión", "Management") : t("Según rol", "By role")}</span>
        </li>
      ))}
    </ul>
    <div className="systems-preview-foot"><span>{t("Accesos definidos", "Defined access")}</span><span><ShieldCheck size={14} aria-hidden="true" />{t("Permisos a medida", "Custom permissions")}</span></div>
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
    <span>{t("Datos conectados", "Connected data")}</span>
  </div>
);

const Systems = () => {
  const [active, setActive] = useState(0);
  const [layer, setLayer] = useState('operation');
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
            <Label className="systems-section-label">{t("01 / Desarrollo de sistemas", "01 / Software development")}</Label>
            <h2 id={`${id}-heading`} className="systems-title font-display">
              <MaskLines lines={[t("Del primer píxel", "From the first pixel"), <em key="inside" className="font-serif font-normal">{t("al último dato.", "to the last data point.")}</em>]} />
            </h2>
          </div>
          <Reveal delay={0.15} className="systems-intro">
            <span className="systems-eyebrow">{t("Frontend + backend + base de datos.", "Frontend + backend + database.")}</span>
            <p>{t("Diseñamos páginas web, aplicaciones y sistemas completos. Una experiencia visual propia por fuera; inventarios, procesos, APIs y administración conectados por dentro.", "We design websites, applications and complete systems. A distinct visual experience on the outside; connected inventory, workflows, APIs and administration on the inside.")}</p>
          </Reveal>
        </div>

        <Reveal className={`systems-scene systems-scene--${layer}`}>
          <div className="systems-scene__label"><span className="systems-example-dot" aria-hidden="true" />{t("Ejemplo ilustrativo · módulos a medida", "Illustrative example · custom modules")}</div>
          <div className="systems-mobile-switch" role="group" aria-label={t("Las dos caras de tu sistema", "The two sides of your system")}>
            <button type="button" aria-pressed={layer === 'experience'} onClick={() => setLayer('experience')}><Globe2 size={17} aria-hidden="true" /><span>{t("La experiencia", "The experience")}<small>{t("Lo que ve tu cliente", "What your customer sees")}</small></span></button>
            <button type="button" aria-pressed={layer === 'operation'} onClick={() => setLayer('operation')}><Layers3 size={17} aria-hidden="true" /><span>{t("La operación", "The operation")}<small>{t("Lo que mueve todo", "What keeps it running")}</small></span></button>
          </div>
          <div className="systems-layers">
            <div className="systems-public-layer">
              <div className="systems-layer-heading"><span>{t("01 / EXPERIENCIA", "01 / EXPERIENCE")}</span><Globe2 size={18} aria-hidden="true" /></div>
              <h3 className="font-display">{t("Lo que ve", "What your")}<br /><span className="font-serif italic">{t("tu cliente.", "customer sees.")}</span></h3>
              <div className="systems-website" aria-hidden="true">
                <div className="systems-website__bar"><span><i /><i /><i /></span><span>{t("tu-negocio.com", "your-business.com")}</span><LockKeyhole size={10} /></div>
                <div className="systems-website__content">
                  <div className="systems-website__nav"><span>{t("Tu negocio", "Your business")}<span className="systems-website__mark">.</span></span><span>{t("Explorá", "Explore")} <ArrowUpRight size={11} /></span></div>
                  <span className="systems-website__eyebrow">{t("Una experiencia a tu medida", "An experience built for you")}</span>
                  <p className="font-display">{t("Encontrá lo que", "Find what")}<br /><span className="font-serif italic">{t("necesitás.", "you need.")}</span></p>
                  <div className="systems-website__art">
                    <img src={`${import.meta.env.BASE_URL}artwork/connected-materials-v2.webp`} alt="" width="1200" height="800" loading="lazy" decoding="async" />
                    <span className="systems-website__art-index">{t("OBJETO 001 / CONEXIÓN", "OBJECT 001 / CONNECTION")}</span>
                    <svg className="systems-website__reticle" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="15" stroke="currentColor" strokeWidth=".6" /><path d="M20 0V40M0 20H40" stroke="currentColor" strokeWidth=".6" /></svg>
                    <div className="systems-website__art-caption"><span>{t("Diseñado para conectar.", "Designed to connect.")}</span><span>↗</span></div>
                  </div>
                  <div className="systems-website__action"><span>{t("Ver opciones", "View options")}</span><ArrowUpRight size={15} /></div>
                </div>
              </div>
              <p className="systems-layer-note">{t("Catálogo, reservas o consultas. La experiencia pública se diseña para tu servicio.", "Catalogs, bookings or inquiries. The public experience is designed around your service.")}</p>
            </div>

            <DataConnections active={active} reduce={reduce} />

            <div className="systems-operation-layer">
              <div className="systems-layer-heading"><span>{t("02 / OPERACIÓN", "02 / OPERATIONS")}</span><Layers3 size={18} aria-hidden="true" /></div>
              <h3 className="font-display">{t("Lo que mueve", "What drives")}<br /><span className="font-serif italic">{t("tu negocio.", "your business.")}</span></h3>
              <div className="systems-dashboard">
                <div className="systems-dashboard__bar"><span><span className="systems-dashboard__mark">JC</span>{t("Panel de gestión", "Management dashboard")}</span><span><LockKeyhole size={12} aria-hidden="true" />{t("Acceso por rol", "Role-based access")}</span></div>
                <div className="systems-tabs" role="tablist" aria-label={t("Explorar módulos de ejemplo", "Explore example modules")}>
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
              <div className="systems-capabilities"><span><Check size={13} aria-hidden="true" />{t("Roles y permisos", "Roles and permissions")}</span><span><Check size={13} aria-hidden="true" />{t("Sistemas conectados según alcance", "Connected systems within your scope")}</span></div>
            </div>
          </div>
          <div className="systems-benefit" aria-live="polite" aria-atomic="true">
            <span className="systems-benefit__index font-display">0{active + 1}</span>
            <div>
              <span className="systems-eyebrow">{selected.label} {t("/ a tu medida", "/ built for you")}</span>
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
          <p>{t("Las funcionalidades, integraciones, roles y permisos se definen con cada cliente. Los módulos se cotizan según alcance.", "Features, integrations, roles and permissions are defined with each client. Modules are quoted according to scope.")}</p>
          <ContactCTA need="Sistema / backend" source={`${t("Desarrollo de sistemas", "Software development")} · ${selected.label}`} variant="ink" size="lg">{t("Definamos mi sistema", "Let's define my system")}</ContactCTA>
        </Reveal>
      </div>
    </section>
  );
};

export default Systems;
