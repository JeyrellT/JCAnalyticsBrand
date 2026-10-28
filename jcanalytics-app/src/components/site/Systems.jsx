import { t } from '../../i18n/locale';
import { useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Box, Check, Globe2, Layers3, LockKeyhole, Settings2 } from 'lucide-react';
import { Label, MaskLines, Reveal } from './primitives';
import ContactCTA from './ContactCTA';
import '../../styles/systems.css';

const _MOTION = motion;
const MODULES = [
  {
    id: 'inventario', label: t("Inventario", "Inventory"), icon: Box, title: t("Cada movimiento, en su lugar.", "Every movement, in its place."),
    benefit: t("Consultá existencias y registrá entradas y salidas desde un panel conectado a tu web.", "Check stock and record incoming and outgoing items from a dashboard connected to your website."),
    detail: t("Productos, insumos y movimientos, organizados según la operación de tu negocio.", "Products, supplies and stock movements, organized around your business."),
    shot: 'laburrada/inventario', caption: t("Bodega y recetas de La Burrada: cuánto preparar de viernes a domingo, por producto.", "La Burrada’s stock and recipes: how much to prep from Friday to Sunday, per product."),
  },
  {
    id: 'procesos', label: t("Procesos", "Processes"), icon: Layers3, title: t("Sabé qué sigue. Y quién lo hace.", "Know what comes next. And who owns it."),
    benefit: t("Seguí el trabajo desde que llega una solicitud hasta que se completa, con etapas claras para tu equipo.", "Track work from the first request to completion, with clear stages for your team."),
    detail: t("Estados, responsables y flujos de trabajo definidos para tu manera de operar.", "Statuses, owners and workflows built around the way you work."),
    shot: 'laburrada/cocina', caption: t("La tablet de cocina: cada pedido pasa por aprobación, cola, preparación y listo, en vivo.", "The kitchen tablet: every order moves through approval, queue, preparation and ready, live."),
  },
  {
    id: 'administracion', label: t("Administración", "Administration"), icon: Settings2, title: t("El control, en tus manos.", "Control, in your hands."),
    benefit: t("Administrá contenido, usuarios y accesos desde un mismo lugar, con permisos según cada rol.", "Manage content, users and access in one place, with permissions for each role."),
    detail: t("Un panel para gestionar tu plataforma y conectar sistemas cuando el alcance lo requiere.", "A dashboard to manage your platform and connect systems when your project requires it."),
    shot: 'laburrada/admin', caption: t("Centro operativo: estado del turno, pulso del servicio y siguiente movimiento.", "Operations centre: shift status, service pulse and next move."),
  },
];

const shotUrl = (screen) => `${import.meta.env.BASE_URL}projects/${screen}-desktop.webp`;

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
          <div className="systems-scene__label"><span className="systems-example-dot" aria-hidden="true" />{t("Proyecto real · La Burrada Street Food · capturas con datos de demostración", "Real project · La Burrada Street Food · screenshots with demo data")}</div>
          <div className="systems-mobile-switch" role="group" aria-label={t("Las dos caras de tu sistema", "The two sides of your system")}>
            <button type="button" aria-pressed={layer === 'experience'} onClick={() => setLayer('experience')}><Globe2 size={17} aria-hidden="true" /><span>{t("La experiencia", "The experience")}<small>{t("Lo que ve tu cliente", "What your customer sees")}</small></span></button>
            <button type="button" aria-pressed={layer === 'operation'} onClick={() => setLayer('operation')}><Layers3 size={17} aria-hidden="true" /><span>{t("La operación", "The operation")}<small>{t("Lo que mueve todo", "What keeps it running")}</small></span></button>
          </div>
          <div className="systems-layers">
            <div className="systems-public-layer">
              <div className="systems-layer-heading"><span>{t("01 / EXPERIENCIA", "01 / EXPERIENCE")}</span><Globe2 size={18} aria-hidden="true" /></div>
              <h3 className="font-display">{t("Lo que ve", "What your")}<br /><span className="font-serif italic">{t("tu cliente.", "customer sees.")}</span></h3>
              <figure className="systems-website systems-website--real">
                <div className="systems-website__bar"><span><i /><i /><i /></span><span>laburradacr.com</span><LockKeyhole size={10} aria-hidden="true" /></div>
                <img src={shotUrl('laburrada/home')} width={1600} height={1000} loading="lazy" decoding="async" alt={t("Menú en línea de La Burrada: categorías, combos y carrito.", "La Burrada’s online menu: categories, combos and cart.")} />
              </figure>
              <p className="systems-layer-note">{t("El cliente arma su pedido desde el celular. El precio lo calcula el servidor, no el navegador.", "Customers build their order from their phone. The server, not the browser, computes the price.")}</p>
            </div>

            <DataConnections active={active} reduce={reduce} />

            <div className="systems-operation-layer">
              <div className="systems-layer-heading"><span>{t("02 / OPERACIÓN", "02 / OPERATIONS")}</span><Layers3 size={18} aria-hidden="true" /></div>
              <h3 className="font-display">{t("Lo que mueve", "What drives")}<br /><span className="font-serif italic">{t("tu negocio.", "your business.")}</span></h3>
              <div className="systems-dashboard">
                <div className="systems-dashboard__bar"><span><span className="systems-dashboard__mark">LB</span>{t("Panel de La Burrada", "La Burrada dashboard")}</span><span><LockKeyhole size={12} aria-hidden="true" />{t("Acceso por rol", "Role-based access")}</span></div>
                <div className="systems-tabs" role="tablist" aria-label={t("Explorar módulos reales", "Explore real modules")}>
                  {MODULES.map((module, index) => {
                    const Icon = module.icon;
                    return (
                      <button key={module.id} ref={(element) => { tabs.current[index] = element; }} id={`${id}-tab-${module.id}`} type="button" role="tab" aria-selected={active === index} aria-controls={`${id}-panel`} tabIndex={active === index ? 0 : -1} onClick={() => setActive(index)} onKeyDown={(event) => onTabKeyDown(event, index)} className={`systems-tab ${active === index ? 'systems-tab--active' : ''}`}>
                        <Icon size={15} aria-hidden="true" /><span>{module.label}</span>
                      </button>
                    );
                  })}
                </div>
                <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${selected.id}`} tabIndex={0} className="systems-panel">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div key={selected.id} initial={reduce ? false : { opacity: 0, y: 8, filter: 'blur(2px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={reduce ? { opacity: 1 } : { opacity: 0, y: -5, filter: 'blur(2px)' }} transition={{ duration: reduce ? 0 : 0.22, ease: 'easeOut' }}>
                      <figure className="systems-shot">
                        <img src={shotUrl(selected.shot)} width={1600} height={1000} loading="lazy" decoding="async" alt={selected.caption} />
                        <figcaption>{selected.caption}</figcaption>
                      </figure>
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
