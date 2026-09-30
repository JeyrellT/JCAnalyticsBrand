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
    id: 'web',
    name: 'Páginas web',
    desc: 'Tu marca, reservas y pedidos en línea.',
    from: SERVICES.pagina_web.priceMin,
    includes: ['Diseño propio con tu marca, no una plantilla', 'Reservas o pedidos 24/7 con confirmación por WhatsApp', 'Panel para administrar citas, clientes y catálogo', 'Dominio, SEO base y publicación incluidos'],
    ideal: 'Barberías, salones, restaurantes, talleres y servicios que viven de la agenda.',
    example: { label: 'Ver sitios en línea', href: '#trabajo' },
    time: '2 a 7 semanas',
  },
  {
    id: 'software',
    name: 'Software a la medida',
    desc: 'Apps web, portales y sistemas internos.',
    from: SERVICES.software_medida.priceMin,
    includes: ['Interfaz, lógica y base de datos construidas para tu proceso', 'Roles, permisos y bitácora de cambios', 'Integración con WhatsApp, correo y tus sistemas', 'Despliegue, manual y 30 días de soporte'],
    ideal: 'Negocios con un Excel que ya no aguanta o un proceso que hoy depende de una persona.',
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

const ServiceRow = ({ row, index, open, onToggle }) => {
  const reduce = useReducedMotion();
  const panelId = `servicio-${row.id}`;
  return (
    <Reveal as="li" delay={index * 0.05} className="border-b border-paper/15">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="service-row group relative w-full text-left grid grid-cols-[auto_1fr_auto] md:grid-cols-[3.5rem_minmax(0,1.5fr)_minmax(0,1fr)_8.5rem_3.5rem] items-center gap-x-4 sm:gap-x-8 gap-y-1 py-6 sm:py-8"
      >
        <span className="font-mono text-xs text-paper/40 self-start md:self-center pt-2 md:pt-0">0{index + 1}</span>
        <span className={`font-display text-[clamp(1.7rem,4.6vw,3.6rem)] font-semibold tracking-[-0.03em] leading-none transition-transform duration-500 group-hover:translate-x-2 ${open ? 'text-lime' : ''}`}>
          {row.name}
        </span>
        <span className="hidden md:block text-paper/55 text-[15px]">{row.desc}</span>
        <span className="col-start-2 md:col-start-auto font-mono text-sm text-lime whitespace-nowrap">
          desde {fmt(row.from)}{row.unit ?? ''}
        </span>
        <span
          aria-hidden="true"
          className={`row-start-1 col-start-3 md:row-start-auto md:col-start-auto grid place-items-center w-12 h-12 sm:w-14 sm:h-14 rounded-full border transition-colors duration-300 ${
            open ? 'bg-lime text-ink border-lime' : 'border-paper/20 group-hover:bg-lime group-hover:text-ink group-hover:border-lime'
          }`}
        >
          <Plus size={22} className={`transition-transform duration-500 ${open ? 'rotate-45' : ''}`} />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            key="panel"
            initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: reduce ? 0.15 : 0.6, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="pb-8 sm:pb-10 md:pl-[calc(3.5rem+2rem)] grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-8 lg:gap-14">
              <div>
                <p className="md:hidden text-paper/60 text-base mb-5">{row.desc}</p>
                <Label className="text-paper/40">Qué incluye</Label>
                <ul className="mt-4 grid sm:grid-cols-2 gap-x-8 gap-y-3">
                  {row.includes.map((b) => (
                    <li key={b} className="flex items-start gap-3 text-paper/85 text-[15px] leading-snug">
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
                  <Label className="text-paper/40">Ideal para</Label>
                  <p className="mt-2 text-paper/75 text-[15px] leading-snug">{row.ideal}</p>
                </div>
                <div>
                  <Label className="text-paper/40">Tiempo</Label>
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
  const [open, setOpen] = useState(null);
  return (
    <section id="servicios" className="scroll-mt-24 bg-ink text-paper py-20 sm:py-32 rounded-t-[2rem] sm:rounded-t-[3rem] -mt-8 relative z-10">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12 sm:mb-20">
          <div>
            <Label className="text-paper/45">(02) Servicios</Label>
            <h2 className="mt-4 font-display font-semibold tracking-[-0.04em] leading-[0.92] text-[clamp(2.6rem,7vw,6rem)]">
              <MaskLines lines={['Lo que', <span key="b" className="font-serif italic font-normal text-lime">hacemos.</span>]} />
            </h2>
          </div>
          <Reveal delay={0.2}>
            <p className="max-w-xs text-paper/55 text-lg leading-snug">
              Precios reales, publicados. Sin letra chica. <span className="text-paper/35">Tocá cada servicio para ver el detalle.</span>
            </p>
          </Reveal>
        </div>

        <ul className="border-t border-paper/15">
          {ROWS.map((r, i) => (
            <ServiceRow key={r.id} row={r} index={i} open={open === r.id} onToggle={() => setOpen((v) => (v === r.id ? null : r.id))} />
          ))}
        </ul>

        <Reveal delay={0.2} className="mt-10 sm:mt-14 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
          <CTA href="#cotizar" variant="lime" size="lg">Cotizar en 3 clics</CTA>
          <span className="text-paper/50 text-[15px]">Rango en tu moneda, sin dejar correo.</span>
        </Reveal>
      </div>
    </section>
  );
};

export default Services;
