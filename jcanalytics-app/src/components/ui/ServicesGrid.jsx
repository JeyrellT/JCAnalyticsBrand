// ============================================================================
//  src/components/ui/ServicesGrid.jsx
//  Sección de servicios (#soluciones). Reemplaza al carrusel horizontal con
//  pinning de GSAP (jul-26): el scroll secuestrado y las animaciones de
//  clip-path se veían bien pero enterraban el contenido — para leer los seis
//  servicios había que recorrer toda la pista. Ahora es una grilla plana:
//  todo visible de un golpe, con la imagen y el modal de casos intactos.
//
//  Cada card abre el modal de casos reales de su categoría, salvo las que
//  traen `cta` propio (servicios que todavía no tienen casos documentados).
// ============================================================================
import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ShieldCheck, Target, Database, ArrowRight, Receipt, Globe, Megaphone, Calculator } from 'lucide-react';
import CaseStudyModal from './CaseStudyModal';
import { casesData } from '../../data/caseStudies';
import { WEB_SERVICE_SHOT } from '../../data/webProperties';

const _MOTION = motion;

// Fondo branded autocontenido para la card fiscal (data-URI SVG: siempre carga,
// no depende de Unsplash). Gradiente cian + motivo de comprobante validado.
const FISCAL_BG =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500">' +
    '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0" stop-color="#0e7490"/><stop offset="1" stop-color="#0b1220"/>' +
    '</linearGradient></defs><rect width="800" height="500" fill="url(#g)"/>' +
    '<g fill="none" stroke="#67e8f9" stroke-opacity="0.18" stroke-width="7" stroke-linecap="round">' +
    '<line x1="80" y1="150" x2="430" y2="150"/><line x1="80" y1="200" x2="540" y2="200"/>' +
    '<line x1="80" y1="250" x2="360" y2="250"/><line x1="80" y1="300" x2="480" y2="300"/></g>' +
    '<circle cx="630" cy="330" r="74" fill="#22d3ee" fill-opacity="0.12" stroke="#22d3ee" stroke-opacity="0.45" stroke-width="4"/>' +
    '<path d="M598 330 l22 24 l44 -50" fill="none" stroke="#a5f3fc" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</svg>'
  );

const IMG_FALLBACK =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='10'%3E%3Crect width='100%25' height='100%25' fill='%23e2e8f0'/%3E%3C/svg%3E";

const SERVICES = [
  {
    id: 'inteligencia',
    tag: 'Datos',
    title: 'Inteligencia de Datos',
    desc: 'Dashboard ejecutivo de ventas e inventario, cartera de clientes con aging y forecast de demanda.',
    icon: Target,
    accent: 'text-blue-600',
    dot: 'bg-blue-500',
    img: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800',
    points: ['Assessment: $500', 'Implementación desde $1,500'],
  },
  {
    id: 'fiscal',
    tag: 'Fiscal CR',
    title: 'Cumplimiento Fiscal y Planilla',
    desc: 'Factura electrónica v4.4, rechazos de Hacienda, CCSS y cierre de planilla — validado para Costa Rica.',
    icon: Receipt,
    accent: 'text-cyan-600',
    dot: 'bg-cyan-500',
    img: FISCAL_BG,
    points: ['Factura v4.4 + rechazos de Hacienda', 'Planilla y CCSS sin Excel manual'],
  },
  {
    id: 'web',
    tag: 'Web',
    title: 'Páginas Web y Reservas',
    desc: 'Sitio con tu marca, catálogo de servicios y reservas que se agendan solas. La misma base de nuestros tres sitios propios.',
    icon: Globe,
    accent: 'text-violet-600',
    dot: 'bg-violet-500',
    img: WEB_SERVICE_SHOT,
    points: ['Reservas 24/7 sin llamadas', '3 sitios propios en producción'],
  },
  {
    id: 'community',
    tag: 'Redes',
    title: 'Community Manager',
    desc: 'Gestión de tus redes con la misma disciplina de datos del resto: calendario de contenido, publicación, respuesta a mensajes y reporte de lo que funcionó.',
    icon: Megaphone,
    accent: 'text-pink-600',
    dot: 'bg-pink-500',
    img: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&q=80&w=800',
    points: ['Calendario de contenido y publicación', 'Reporte mensual con métricas reales'],
    // Servicio nuevo: todavía sin casos documentados, así que en vez del modal
    // el CTA abre la conversación.
    cta: {
      label: 'Consultar plan mensual',
      href: 'https://wa.me/50670330596?text=Hola%2C%20quiero%20informaci%C3%B3n%20del%20servicio%20de%20community%20manager.',
    },
  },
  {
    id: 'automatizacion',
    tag: 'Automatización',
    title: 'Automatización de Procesos',
    desc: 'Cierre de reportes automático, alertas de SLA por Teams o WhatsApp y limpieza de datos desde tu ERP.',
    icon: Database,
    accent: 'text-orange-600',
    dot: 'bg-orange-500',
    img: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?auto=format&fit=crop&q=80&w=800',
    points: ['Proceso de 3 h reducido a 30 s', 'Alertas automáticas'],
  },
  {
    id: 'transferencia',
    tag: 'Capacitación',
    title: 'Transferencia de Conocimiento',
    desc: 'Capacitación en Power BI y Python para tu equipo, con SOPs y documentación del modelo de datos.',
    icon: ShieldCheck,
    accent: 'text-emerald-600',
    dot: 'bg-emerald-500',
    img: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&q=80&w=800',
    points: ['Capacitación de tu equipo en CR', 'Mantenimiento autónomo'],
  },
];

const onImgError = (e) => {
  if (e.currentTarget.dataset.f) return;
  e.currentTarget.dataset.f = '1';
  e.currentTarget.src = IMG_FALLBACK;
};

export default function ServicesGrid() {
  const [activeModalId, setActiveModalId] = useState(null);
  const reduce = useReducedMotion();

  return (
    <>
      <section id="servicios" className="py-14 sm:py-20 md:py-24 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4">
          {/* Encabezado */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={reduce ? { duration: 0 } : { duration: 0.6 }}
            className="max-w-2xl mb-9 sm:mb-12"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white text-slate-600 rounded-full text-[11px] font-mono font-medium uppercase tracking-[0.16em] mb-4 border border-slate-200">
              <Target size={12} className="text-blue-500" /> Servicios
            </div>
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-[2.75rem] font-bold text-slate-900 mb-4 tracking-tight leading-[1.1]">
              Qué hacemos, en concreto.
            </h2>
            <p className="font-sans text-base sm:text-lg text-slate-500 leading-relaxed">
              Seis líneas de servicio con entregables definidos. Cada una abre los casos reales donde ya la aplicamos —
              sin catálogo genérico y sin letra chica.
            </p>
          </motion.div>

          {/* Grilla */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {SERVICES.map((s, idx) => {
              const Icon = s.icon;
              return (
                <motion.article
                  key={s.id}
                  initial={reduce ? false : { opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={reduce ? { duration: 0 } : { duration: 0.5, delay: Math.min(idx, 3) * 0.06 }}
                  className="group flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden transition-all duration-300 hover:border-slate-300 hover:shadow-[0_12px_30px_-18px_rgba(15,23,42,0.25)]"
                >
                  {/* Imagen */}
                  <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                    <img
                      src={s.img}
                      alt={s.title}
                      loading="lazy"
                      decoding="async"
                      width={800}
                      height={500}
                      onError={onImgError}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    />
                  </div>

                  {/* Cuerpo */}
                  <div className="p-5 sm:p-6 flex flex-col flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <Icon size={15} className={s.accent} aria-hidden="true" />
                      <span className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">
                        {s.tag}
                      </span>
                    </div>

                    <h3 className="font-display text-lg font-semibold text-slate-900 leading-snug mb-2">{s.title}</h3>
                    <p className="font-sans text-sm text-slate-500 leading-relaxed mb-4">{s.desc}</p>

                    <ul className="space-y-1.5 mb-5">
                      {s.points.map((p) => (
                        <li key={p} className="flex items-start gap-2.5 text-[13px] text-slate-600 leading-snug">
                          <span className={`shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full ${s.dot}`} />
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA: modal de casos, o conversación si el servicio aún no tiene casos */}
                    <div className="mt-auto pt-4 border-t border-slate-100">
                      {s.cta ? (
                        <a
                          href={s.cta.href}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors group/cta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 rounded"
                        >
                          {s.cta.label}
                          <ArrowRight
                            size={14}
                            className="transition-transform duration-300 group-hover/cta:translate-x-0.5"
                            aria-hidden="true"
                          />
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setActiveModalId(s.id)}
                          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors group/cta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 rounded"
                        >
                          Ver casos reales
                          <ArrowRight
                            size={14}
                            className="transition-transform duration-300 group-hover/cta:translate-x-0.5"
                            aria-hidden="true"
                          />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>

          {/* Cierre: precios */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={reduce ? { duration: 0 } : { duration: 0.5 }}
            className="mt-8 sm:mt-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl px-5 sm:px-7 py-5"
          >
            <p className="font-sans text-sm sm:text-base text-slate-600 max-w-xl">
              <strong className="text-slate-900 font-semibold">Precios sin sorpresas.</strong> El rango de tu proyecto se
              estima antes de que hablemos, y la cifra final se cierra en una sesión sin costo.
            </p>
            <a
              href="#roi"
              className="inline-flex items-center justify-center gap-2 shrink-0 bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 rounded-xl font-semibold text-sm transition-colors min-h-11"
            >
              <Calculator size={16} /> Ver mi rango en el cotizador
            </a>
          </motion.div>
        </div>
      </section>

      <CaseStudyModal
        isOpen={!!activeModalId}
        onClose={() => setActiveModalId(null)}
        categoryId={activeModalId}
        casesData={casesData}
      />
    </>
  );
}
