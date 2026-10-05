import { t, locale } from '../../i18n/locale';
// ============================================================================
//  src/components/site/Services.jsx
//  Lista editorial de servicios sobre fondo oscuro. Una línea por servicio,
//  precio "desde" (sale de data/cotizador.js para no desincronizarse) y un
//  acordeón con el detalle: qué incluye, para quién es, ejemplo en el sitio y
//  CTA a WhatsApp con el servicio ya escrito.
// ============================================================================
import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Check, Plus } from 'lucide-react';
import { SERVICES } from '../../data/cotizador';
import { servicePages } from '../../content/services';
import { servicePath } from '../../seo/routes';
import { CTA, Label, MaskLines, Reveal } from './primitives';
import { wa, EASE } from './links';

// eslint (sin plugin de react) no reconoce a `motion` usado solo como <motion.x>.
const _MOTION = motion;

// Miles con punto, igual que el resto del sitio ($2.000).
const fmt = (n) => '$' + n.toLocaleString(locale === 'es' ? 'es-CR' : 'en-US');

const serviceHref = (id) => servicePath(servicePages.find((service) => service.id === id), locale);

const ROWS = [
  {
    id: 'finanzas',
    name: t("Análisis financiero", "Financial analysis"),
    desc: t("Flujo de caja, costos y presupuestos.", "Cash flow, costs and budgets."),
    includes: [t("Modelos financieros adaptados a tu operación", "Financial models tailored to your operations"), t("Análisis de ingresos, costos y márgenes", "Revenue, cost and margin analysis"), t("Escenarios de presupuesto y flujo de caja", "Budget and cash flow scenarios"), t("Reportes conectados a tus fuentes de datos", "Reports connected to your data sources")],
    ideal: t("Negocios que necesitan entender sus números y planificar con información organizada.", "Businesses that need to understand their numbers and plan with organized information."),
    example: { label: t("Explorar finanzas y dashboards", "Explore finance and dashboards"), href: serviceHref('business-intelligence') },
    time: t("Según fuentes de datos y alcance", "Based on data sources and scope"),
  },
  {
    id: 'inteligencia',
    name: t("Machine learning e IA", "Machine learning & AI"),
    desc: t("Modelos predictivos e IA en tus sistemas.", "Predictive models and AI in your systems."),
    includes: [t("Evaluación del caso de uso y calidad de los datos", "Use case and data quality assessment"), t("Modelos predictivos o asistentes con tus documentos", "Predictive models or assistants using your documents"), t("Integración a tus herramientas mediante APIs", "Integration with your tools through APIs"), t("Validación, permisos y revisión humana según el proceso", "Validation, permissions and human review for your process")],
    ideal: t("Equipos que quieren anticipar patrones o integrar IA a un proceso concreto del negocio.", "Teams that want to anticipate patterns or integrate AI into a specific business process."),
    example: { label: t("Explorar integración de IA", "Explore AI integration"), href: serviceHref('ai-integration') },
    time: t("Según datos, validación e integraciones", "Based on data, validation and integrations"),
  },
  {
    id: 'web',
    name: t("Páginas web", "Websites"),
    desc: t("Tu marca al frente. Tu operación conectada.", "Your brand in front. Your operations connected."),
    from: SERVICES.pagina_web.priceMin,
    includes: [t("Diseño propio con tu marca, jerarquía visual e interacción", "Custom design with your brand, visual hierarchy and interaction"), t("Backend y panel administrativo según el alcance", "Backend and admin dashboard according to scope"), t("Inventario, pedidos o procesos según tu negocio y alcance", "Inventory, orders or workflows tailored to your business and scope"), t("Dominio, SEO base y publicación incluidos; integraciones según alcance", "Domain, foundational SEO and launch included; integrations according to scope")],
    ideal: t("Empresas, comercios y servicios que necesitan una presencia propia y una operación conectada.", "Companies, stores and service businesses that need their own presence and connected operations."),
    example: { label: t("Explorar desarrollo web", "Explore web development"), href: serviceHref('web-development') },
    time: t("2 a 7 semanas", "2 to 7 weeks"),
  },
  {
    id: 'software',
    name: t("Software a la medida", "Custom software"),
    desc: t("Datos, roles y procesos conectados.", "Connected data, roles and processes."),
    from: SERVICES.software_medida.priceMin,
    includes: [t("Interfaz, backend y base de datos para tus procesos", "Interface, backend and database for your processes"), t("Roles, permisos y bitácora de cambios", "Roles, permissions and change history"), t("Integraciones con tus sistemas, WhatsApp o correo según alcance", "Integrations with your systems, WhatsApp or email according to scope"), t("Despliegue, manual y 30 días de soporte", "Deployment, documentation and 30 days of support")],
    ideal: t("Equipos que necesitan ordenar inventarios, pedidos y procesos con datos compartidos y responsabilidades claras.", "Teams that need to organize inventory, orders and processes with shared data and clear responsibilities."),
    example: { label: t("Explorar desarrollo a medida", "Explore custom development"), href: serviceHref('web-development') },
    time: t("5 a 14 semanas", "5 to 14 weeks"),
  },
  {
    id: 'dashboards',
    name: 'Dashboards',
    desc: t("Power BI conectado a tus datos.", "Power BI connected to your data."),
    from: SERVICES.power_bi.priceMin,
    includes: [t("Conexión a Excel, ERP, SQL o APIs", "Connections to Excel, ERP, SQL or APIs"), t("Modelo de datos y medidas DAX documentadas", "Documented data model and DAX measures"), t("Acceso por rol (RLS) y actualización programada", "Role-based access (RLS) and scheduled refresh"), t("Un tablero por decisión, no cincuenta gráficos", "One dashboard for each decision, with focused visuals")],
    ideal: t("Gerencias que hoy arman el reporte a mano cada lunes.", "Managers who currently build reports by hand every Monday."),
    example: { label: t("Explorar dashboards y datos", "Explore dashboards and data"), href: serviceHref('business-intelligence') },
    time: t("1 a 6 semanas", "1 to 6 weeks"),
  },
  {
    id: 'automatizacion',
    name: t("Automatización", "Automation"),
    desc: t("Excel, Power Automate y Python.", "Excel, Power Automate and Python."),
    from: SERVICES.excel_vba.priceMin,
    includes: [t("Reportes, correos y documentos que se generan solos", "Reports, emails and documents generated automatically"), t("Flujos entre sistemas con aprobaciones y alertas", "Cross-system workflows with approvals and alerts"), t("Manejo de errores, logs y reintentos", "Error handling, logs and retries"), t("Documentación para que no dependa de nadie", "Documentation so knowledge stays with your team")],
    ideal: t("Cualquier tarea repetitiva que alguien hace \"a mano\" más de una vez por semana.", "Any repetitive task someone performs manually more than once a week."),
    example: { label: t("Explorar automatización", "Explore automation"), href: serviceHref('process-automation') },
    time: t("1 a 6 semanas", "1 to 6 weeks"),
  },
  {
    id: 'fiscal',
    name: t("Fiscal y planilla", "Tax & payroll"),
    desc: t("Factura v4.4, CCSS y planilla CR.", "E-invoicing v4.4, CCSS and Costa Rica payroll."),
    from: SERVICES.fiscal_planilla.priceMin,
    includes: [t("Validación de comprobantes contra el esquema v4.4", "Invoice validation against the v4.4 schema"), t("Conciliación de respuestas de Hacienda el mismo día", "Same-day reconciliation of Hacienda responses"), t("Cálculo de CCSS y archivo listo para SICERE", "CCSS calculations and a SICERE-ready file"), t("Alertas de rechazos y vencimientos", "Rejection and deadline alerts")],
    ideal: t("Contadores y PYMEs de Costa Rica que cierran el mes corriendo.", "Accountants and small businesses in Costa Rica racing to close the month."),
    example: { label: t("Explorar automatización de procesos", "Explore process automation"), href: serviceHref('process-automation') },
    time: t("2 a 7 semanas", "2 to 7 weeks"),
  },
  {
    id: 'redes',
    name: 'Community manager',
    desc: t("Redes sociales, contenido y Meta Ads.", "Social media, content and Meta Ads."),
    from: SERVICES.community_manager.priceMin,
    unit: t("/mes", "/month"),
    includes: [t("Calendario mensual y diseño publicitario con tu marca", "Monthly calendar and branded ad design"), t("Publicación, respuesta a mensajes y comentarios", "Publishing and replies to messages and comments"), t("Campañas en Meta Ads con seguimiento semanal", "Meta Ads campaigns with weekly monitoring"), t("Reporte mensual con lo que funcionó y lo que no", "Monthly report showing what worked and what did not")],
    ideal: t("Negocios que ya tienen clientes felices y nadie lo está contando.", "Businesses with happy customers whose stories deserve to be told."),
    example: { label: t("Ver cómo lo hacemos", "See how we do it"), href: '#redes' },
    time: t("Plan mensual · arranque en 1 a 2 semanas", "Monthly plan · starts in 1 to 2 weeks"),
  },
  {
    id: 'video',
    name: t("Edición de video", "Video editing"),
    desc: t("Reels, anuncios y videos cortos.", "Reels, ads and short videos."),
    from: SERVICES.video_edicion.priceMin,
    unit: t("/pieza", "/video"),
    includes: [t("Corte, ritmo y subtítulos que se leen sin sonido", "Editing, pacing and captions that work without sound"), t("Música, voz en off y gráficos con tu marca", "Music, voiceover and branded graphics"), t("Versiones para Reels, TikTok, YouTube y anuncios", "Versions for Reels, TikTok, YouTube and ads"), t("Gancho en los primeros 3 segundos", "A hook in the first 3 seconds")],
    ideal: t("Marcas que graban con el celular y quieren que se vea profesional.", "Brands that shoot on a phone and want a professional finish."),
    example: { label: t("Ver un reel de ejemplo", "Watch an example reel"), href: '#redes' },
    time: t("3 a 10 días por pieza", "3 to 10 days per video"),
  },
];

const PRIORITY = ['software', 'web', 'finanzas', 'dashboards', 'inteligencia', 'automatizacion', 'fiscal', 'redes', 'video'];
const ORDERED_ROWS = [...ROWS].sort((a, b) => PRIORITY.indexOf(a.id) - PRIORITY.indexOf(b.id));

const ServiceRow = ({ row, index, open, onToggle }) => {
  const reduce = useReducedMotion();
  const panelId = `servicio-${row.id}`;
  const buttonId = `servicio-boton-${row.id}`;
  return (
    <Reveal as="li" delay={index * 0.04} className={`studio-service ${open ? 'studio-service--open' : ''}`}>
      <button
        id={buttonId}
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="studio-service__trigger group relative w-full text-left"
      >
        <span className="studio-service__number font-mono">0{index + 1}</span>
        <span className={`studio-service__name font-display font-semibold tracking-[-0.035em] ${open ? 'text-lime' : ''}`}>
          {row.name}
        </span>
        <span className="studio-service__desc">{row.desc}</span>
        <span className="studio-service__price font-mono">
          <span className="studio-service__from">{row.from ? t("Desde", "From") : t("A medida", "Custom")}</span>
          {row.from ? fmt(row.from) : t("Según alcance", "Based on scope")}<span className="studio-service__unit">{row.unit ?? ''}</span>
        </span>
        <span
          aria-hidden="true"
          className="studio-service__toggle"
        >
          <Plus size={20} className={`transition-transform duration-300 ${open ? 'rotate-45' : ''}`} />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            role="region"
            aria-labelledby={buttonId}
            key="panel"
            initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.45, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="studio-service__panel grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-8 lg:gap-14">
              <div>
                <Label className="text-lime">{t("Qué incluye", "What's included")}</Label>
                <ul className="mt-4 grid sm:grid-cols-2 gap-x-8 gap-y-3">
                  {row.includes.map((b) => (
                    <li key={b} className="flex items-start gap-3 text-paper/85 text-[15px] leading-relaxed">
                      <span className="mt-0.5 grid place-items-center w-5 h-5 rounded-full bg-lime/15 text-lime shrink-0">
                        <Check size={12} strokeWidth={3} />
                      </span>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col gap-5">
                <div>
                  <Label className="text-lime">{t("Pensado para", "Designed for")}</Label>
                  <p className="mt-2 text-paper/80 text-[15px] leading-relaxed">{row.ideal}</p>
                </div>
                <div>
                  <Label className="text-lime">{t("Tiempo estimado", "Estimated timeline")}</Label>
                  <p className="mt-2 font-mono text-sm text-paper/85">{row.time}</p>
                </div>
                <div className="flex flex-wrap gap-3 pt-1">
                  <CTA href={wa(t(`Hola, me interesa: ${row.name}. ¿Me ayudan a cotizar?`, `Hi, I am interested in ${row.name}. Could you help me with a quote?`))} variant="lime">
                   {t("Cotizar", "Get a quote for")} {row.name.toLowerCase()}
                  </CTA>
                  <a
                    href={row.example.href}
                    {...(/^https?:/.test(row.example.href) ? { target: '_blank', rel: 'noopener' } : {})}
                    className="tap-press inline-flex items-center gap-2 min-h-12 px-5 rounded-full border border-paper/20 hover:border-lime hover:text-lime text-[15px] font-medium transition-colors"
                  >
                    {row.example.label}
                    <ArrowUpRight size={16} />
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reveal>
  );
};

const Services = () => {
  const [open, setOpen] = useState(() => window.matchMedia('(max-width: 767px)').matches ? null : 'software');
  return (
    <section id="servicios" className="studio-services scroll-mt-24 bg-ink text-paper py-20 sm:py-32 rounded-t-[2rem] sm:rounded-t-[3rem] -mt-8 relative z-10">
      <div className="relative mx-auto max-w-[1400px] px-4 sm:px-8">
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6 mb-12 sm:mb-20">
          <div>
            <Label className="text-lime">{t("Capacidades / Del concepto al sistema", "Capabilities / From concept to system")}</Label>
            <h2 className="mt-5 font-display font-semibold tracking-[-0.045em] leading-[0.98] text-[clamp(2.6rem,6.8vw,6rem)]">
              <MaskLines lines={[t("La idea es tuya.", "The idea is yours."), <span key="b" className="text-lime">{t("La construimos juntos.", "Let's build it together.")}</span>]} />
            </h2>
          </div>
          <Reveal delay={0.2}>
            <p className="max-w-xs text-paper/75 text-base leading-relaxed">
             {t("Primero, sistemas. Después, finanzas, datos e inteligencia. Y para llevarlo más lejos, marketing y contenido.", "First, systems. Then finance, data and intelligence. And to take it further, marketing and content.")}
            </p>
          </Reveal>
        </div>

        <div className="studio-services__legend">
          <span>{String(ROWS.length).padStart(2, '0')} {t("especialidades · un solo equipo", "specialties · one team")}</span>
          <span>{t("Elegí un servicio para conocerlo", "Choose a service to explore")} <span aria-hidden="true">↙</span></span>
        </div>

        <ul>
          {ORDERED_ROWS.map((r, i) => (
            <ServiceRow key={r.id} row={r} index={i} open={open === r.id} onToggle={() => setOpen((v) => (v === r.id ? null : r.id))} />
          ))}
        </ul>

        <Reveal delay={0.2} className="mt-10 sm:mt-14 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
          <CTA href="#cotizar" variant="lime" size="lg">{t("Estimar mi proyecto", "Estimate my project")}</CTA>
          <span className="text-paper/70 text-[15px]">{t("Un rango en tu moneda, sin dejar correo.", "A range in your currency, no email required.")}</span>
        </Reveal>
      </div>
    </section>
  );
};

export default Services;
