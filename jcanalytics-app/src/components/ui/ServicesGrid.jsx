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

// Cada card se describe por la dependencia que elimina, no por la herramienta
// que usa (las herramientas son mecanismo interno; el cliente compra el cambio
// de estado operacional).
const SERVICES = [
  {
    id: 'inteligencia',
    tag: 'Decisión',
    title: 'Sistemas de Decisión',
    desc: 'La decisión que hoy espera a que alguien actualice el Excel: ventas, inventario, cartera y margen en una sola fuente, actualizados sin intervención humana.',
    icon: Target,
    accent: 'text-blue-600',
    dot: 'bg-blue-500',
    img: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800',
    points: ['Dashboard ejecutivo con fuente única de verdad', 'Cartera con aging y prioridades automáticas'],
  },
  {
    id: 'fiscal',
    tag: 'Cumplimiento CR',
    title: 'Cumplimiento Fiscal y Planilla',
    desc: 'Factura electrónica v4.4, rechazos de Hacienda, CCSS y planilla: las reglas del país convertidas en validaciones automáticas, no en memoria institucional.',
    icon: Receipt,
    accent: 'text-cyan-600',
    dot: 'bg-cyan-500',
    img: FISCAL_BG,
    points: ['Rechazos de Hacienda detectados el mismo día', 'Planilla y CCSS sin fórmulas frágiles'],
  },
  {
    id: 'web',
    tag: 'Web',
    title: 'Plataformas Web y Reservas',
    desc: 'Sitio con tu marca y una agenda que se llena sola, sin llamadas ni mensajes. La misma base técnica que corre en nuestros tres productos propios.',
    icon: Globe,
    accent: 'text-violet-600',
    dot: 'bg-violet-500',
    img: WEB_SERVICE_SHOT,
    points: ['Reservas 24/7 sin depender de quien contesta', '3 productos propios en producción como prueba'],
  },
  {
    id: 'community',
    tag: 'Redes',
    title: 'Community Manager',
    desc: 'Tus redes gestionadas con la misma disciplina de sistemas: calendario de contenido, publicación, respuesta a mensajes y reporte mensual de lo que funcionó.',
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
    desc: 'El proceso que alguien arma a mano cada semana, convertido en pipeline con validaciones: se ejecuta solo y avisa cuando algo no cuadra.',
    icon: Database,
    accent: 'text-orange-600',
    dot: 'bg-orange-500',
    img: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?auto=format&fit=crop&q=80&w=800',
    points: ['Proceso de 3 h reducido a 30 s (caso documentado)', 'Alertas automáticas por Teams o WhatsApp'],
  },
  {
    id: 'transferencia',
    tag: 'Autonomía',
    title: 'Transferencia de Conocimiento',
    desc: 'La anti-dependencia aplicada a nosotros mismos: capacitación, SOPs y documentación para que tu equipo opere y mantenga el sistema sin llamarnos.',
    icon: ShieldCheck,
    accent: 'text-emerald-600',
    dot: 'bg-emerald-500',
    img: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&q=80&w=800',
    points: ['Capacitación con tus datos, no con demos', 'Tu equipo mantiene el sistema solo'],
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
              <Target size={12} className="text-blue-500" /> Sistemas que construimos
            </div>
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-[2.75rem] font-bold text-slate-900 mb-4 tracking-tight leading-[1.1]">
              Seis maneras de convertir tu operación en sistema.
            </h2>
            <p className="font-sans text-base sm:text-lg text-slate-500 leading-relaxed">
              Cada línea ataca una dependencia concreta — un proceso que hoy vive en una persona, un Excel o una rutina
              manual. Y cada card abre los casos reales donde ya la eliminamos.
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
                  whileHover={reduce ? undefined : { y: -5 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={reduce ? { duration: 0 } : { duration: 0.5, delay: Math.min(idx, 3) * 0.06 }}
                  onPointerMove={(e) => {
                    const el = e.currentTarget;
                    const r = el.getBoundingClientRect();
                    el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
                    el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
                  }}
                  className="spotlight group flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden transition-all duration-300 hover:border-slate-300 hover:shadow-[0_16px_40px_-18px_rgba(15,23,42,0.3)]"
                >
                  {/* Imagen — srcset solo para remotas (Unsplash acepta &w=): en móvil
                      baja ~60% del peso por card frente al asset de 800px */}
                  <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                    <img
                      src={s.img}
                      {...(s.img.includes('unsplash.com')
                        ? {
                            srcSet: `${s.img.replace('w=800', 'w=480')} 480w, ${s.img} 800w`,
                            sizes: '(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw',
                          }
                        : {})}
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

                    {/* CTA: modal de casos, o conversación si el servicio aún no tiene casos.
                        En móvil es una fila completa de 44px+ (tap cómodo); en sm+ vuelve a enlace inline. */}
                    <div className="mt-auto pt-3 sm:pt-4 border-t border-slate-100">
                      {s.cta ? (
                        <a
                          href={s.cta.href}
                          target="_blank"
                          rel="noreferrer"
                          className="tap-press flex sm:inline-flex w-full sm:w-auto items-center justify-between sm:justify-start gap-1.5 min-h-11 sm:min-h-0 -mx-2 sm:mx-0 px-2 sm:px-0 rounded-lg active:bg-slate-50 sm:active:bg-transparent text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors group/cta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                        >
                          {s.cta.label}
                          <ArrowRight
                            size={15}
                            className="transition-transform duration-300 group-hover/cta:translate-x-0.5"
                            aria-hidden="true"
                          />
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setActiveModalId(s.id)}
                          className="tap-press flex sm:inline-flex w-full sm:w-auto items-center justify-between sm:justify-start gap-1.5 min-h-11 sm:min-h-0 -mx-2 sm:mx-0 px-2 sm:px-0 rounded-lg active:bg-slate-50 sm:active:bg-transparent text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors group/cta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                        >
                          Ver casos reales
                          <ArrowRight
                            size={15}
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
