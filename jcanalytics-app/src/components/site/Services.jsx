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
import { CTA, Label, MaskLines, Reveal } from './primitives';
import { wa, EASE } from './links';

// eslint (sin plugin de react) no reconoce a `motion` usado solo como <motion.x>.
const _MOTION = motion;

// Miles con punto, igual que el resto del sitio ($2.000).
const fmt = (n) => `$${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

const ROWS = [
  {
    id: 'finanzas',
    name: 'Análisis financiero',
    desc: 'Flujo de caja, costos y presupuestos.',
    includes: ['Modelos financieros adaptados a tu operación', 'Análisis de ingresos, costos y márgenes', 'Escenarios de presupuesto y flujo de caja', 'Reportes conectados a tus fuentes de datos'],
    ideal: 'Negocios que necesitan entender sus números y planificar con información organizada.',
    example: { label: 'Explorar el dashboard financiero', href: '#finanzas' },
    time: 'Según fuentes de datos y alcance',
  },
  {
    id: 'inteligencia',
    name: 'Machine learning e IA',
    desc: 'Modelos predictivos e IA en tus sistemas.',
    includes: ['Evaluación del caso de uso y calidad de los datos', 'Modelos predictivos o asistentes con tus documentos', 'Integración a tus herramientas mediante APIs', 'Validación, permisos y revisión humana según el proceso'],
    ideal: 'Equipos que quieren anticipar patrones o integrar IA a un proceso concreto del negocio.',
    example: { label: 'Explorar ejemplos de IA', href: '#inteligencia' },
    time: 'Según datos, validación e integraciones',
  },
  {
    id: 'web',
    name: 'Páginas web',
    desc: 'Tu marca al frente. Tu operación conectada.',
    from: SERVICES.pagina_web.priceMin,
    includes: ['Diseño propio con tu marca, jerarquía visual e interacción', 'Backend y panel administrativo según el alcance', 'Inventario, pedidos o procesos según tu negocio y alcance', 'Dominio, SEO base y publicación incluidos; integraciones según alcance'],
    ideal: 'Empresas, comercios y servicios que necesitan una presencia propia y una operación conectada.',
    example: { label: 'Explorar web y gestión', href: '#plataformas' },
    time: '2 a 7 semanas',
  },
  {
    id: 'software',
    name: 'Software a la medida',
    desc: 'Datos, roles y procesos conectados.',
    from: SERVICES.software_medida.priceMin,
    includes: ['Interfaz, backend y base de datos para tus procesos', 'Roles, permisos y bitácora de cambios', 'Integraciones con tus sistemas, WhatsApp o correo según alcance', 'Despliegue, manual y 30 días de soporte'],
    ideal: 'Equipos que necesitan ordenar inventarios, pedidos y procesos con datos compartidos y responsabilidades claras.',
    example: { label: 'Probar el cotizador VIP', href: 'https://client-production-a96b.up.railway.app/branding' },
    time: '5 a 14 semanas',
  },
  {
    id: 'dashboards',
    name: 'Dashboards',
    desc: 'Power BI conectado a tus datos.',
    from: SERVICES.power_bi.priceMin,
    includes: ['Conexión a Excel, ERP, SQL o APIs', 'Modelo de datos y medidas DAX documentadas', 'Acceso por rol (RLS) y actualización programada', 'Un tablero por decisión, no cincuenta gráficos'],
    ideal: 'Gerencias que hoy arman el reporte a mano cada lunes.',
    example: { label: 'Abrir un dashboard demo', href: 'https://jeyrellt.github.io/DashboardBI' },
    time: '1 a 6 semanas',
  },
  {
    id: 'automatizacion',
    name: 'Automatización',
    desc: 'Excel, Power Automate y Python.',
    from: SERVICES.excel_vba.priceMin,
    includes: ['Reportes, correos y documentos que se generan solos', 'Flujos entre sistemas con aprobaciones y alertas', 'Manejo de errores, logs y reintentos', 'Documentación para que no dependa de nadie'],
    ideal: 'Cualquier tarea repetitiva que alguien hace "a mano" más de una vez por semana.',
    example: { label: 'Ver una automatización en vivo', href: '#automatizacion' },
    time: '1 a 6 semanas',
  },
  {
    id: 'fiscal',
    name: 'Fiscal y planilla',
    desc: 'Factura v4.4, CCSS y planilla CR.',
    from: SERVICES.fiscal_planilla.priceMin,
    includes: ['Validación de comprobantes contra el esquema v4.4', 'Conciliación de respuestas de Hacienda el mismo día', 'Cálculo de CCSS y archivo listo para SICERE', 'Alertas de rechazos y vencimientos'],
    ideal: 'Contadores y PYMEs de Costa Rica que cierran el mes corriendo.',
    example: { label: 'Ver el flujo fiscal', href: '#automatizacion' },
    time: '2 a 7 semanas',
  },
  {
    id: 'redes',
    name: 'Community manager',
    desc: 'Redes sociales, contenido y Meta Ads.',
    from: SERVICES.community_manager.priceMin,
    unit: '/mes',
    includes: ['Calendario mensual y diseño publicitario con tu marca', 'Publicación, respuesta a mensajes y comentarios', 'Campañas en Meta Ads con seguimiento semanal', 'Reporte mensual con lo que funcionó y lo que no'],
    ideal: 'Negocios que ya tienen clientes felices y nadie lo está contando.',
    example: { label: 'Ver cómo lo hacemos', href: '#redes' },
    time: 'Plan mensual · arranque en 1 a 2 semanas',
  },
  {
    id: 'video',
    name: 'Edición de video',
    desc: 'Reels, anuncios y videos cortos.',
    from: SERVICES.video_edicion.priceMin,
    unit: '/pieza',
    includes: ['Corte, ritmo y subtítulos que se leen sin sonido', 'Música, voz en off y gráficos con tu marca', 'Versiones para Reels, TikTok, YouTube y anuncios', 'Gancho en los primeros 3 segundos'],
    ideal: 'Marcas que graban con el celular y quieren que se vea profesional.',
    example: { label: 'Ver un reel de ejemplo', href: '#redes' },
    time: '3 a 10 días por pieza',
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
          <span className="studio-service__from">{row.from ? 'Desde' : 'A medida'}</span>
          {row.from ? fmt(row.from) : 'Según alcance'}<span className="studio-service__unit">{row.unit ?? ''}</span>
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
                <Label className="text-lime">Qué incluye</Label>
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
                  <Label className="text-lime">Pensado para</Label>
                  <p className="mt-2 text-paper/80 text-[15px] leading-relaxed">{row.ideal}</p>
                </div>
                <div>
                  <Label className="text-lime">Tiempo estimado</Label>
                  <p className="mt-2 font-mono text-sm text-paper/85">{row.time}</p>
                </div>
                <div className="flex flex-wrap gap-3 pt-1">
                  <CTA href={wa(`Hola, me interesa: ${row.name}. ¿Me ayudan a cotizar?`)} variant="lime">
                    Cotizar {row.name.toLowerCase()}
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
            <Label className="text-lime">Capacidades / Del concepto al sistema</Label>
            <h2 className="mt-5 font-display font-semibold tracking-[-0.045em] leading-[0.98] text-[clamp(2.6rem,6.8vw,6rem)]">
              <MaskLines lines={['La idea es tuya.', <span key="b" className="text-lime">La construimos juntos.</span>]} />
            </h2>
          </div>
          <Reveal delay={0.2}>
            <p className="max-w-xs text-paper/75 text-base leading-relaxed">
              Primero, sistemas. Después, finanzas, datos e inteligencia. Y para llevarlo más lejos, marketing y contenido.
            </p>
          </Reveal>
        </div>

        <div className="studio-services__legend">
          <span>{String(ROWS.length).padStart(2, '0')} especialidades · un solo equipo</span>
          <span>Elegí un servicio para conocerlo <span aria-hidden="true">↙</span></span>
        </div>

        <ul>
          {ORDERED_ROWS.map((r, i) => (
            <ServiceRow key={r.id} row={r} index={i} open={open === r.id} onToggle={() => setOpen((v) => (v === r.id ? null : r.id))} />
          ))}
        </ul>

        <Reveal delay={0.2} className="mt-10 sm:mt-14 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
          <CTA href="#cotizar" variant="lime" size="lg">Estimar mi proyecto</CTA>
          <span className="text-paper/70 text-[15px]">Un rango en tu moneda, sin dejar correo.</span>
        </Reveal>
      </div>
    </section>
  );
};

export default Services;
