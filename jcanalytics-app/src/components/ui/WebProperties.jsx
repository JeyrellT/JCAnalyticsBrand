// ============================================================================
//  src/components/ui/WebProperties.jsx
//  Sección "Sitios propios": los productos web que construimos, operamos y
//  mantenemos en producción. Doble función — prueba de trabajo real y soporte
//  del servicio "Páginas Web y Reservas en Línea".
//
//  La card muestra la captura REAL del sitio dentro de un marco de navegador.
//  En escritorio la captura se desplaza en hover (recorre la página) y el marco
//  de teléfono se levanta. En táctil no hay hover, así que el recorrido se
//  dispara solo al entrar en viewport — si no, el efecto quedaría muerto justo
//  donde está la mayor parte del tráfico. Todo se anula con reduced-motion.
//
//  rel="noopener" (y NO "noreferrer" como el resto de los enlaces externos del
//  sitio): son propiedades nuestras, así que conviene conservar el referrer
//  para que su propia analítica atribuya el tráfico que llega de jcanalytic.com.
// ============================================================================
import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Globe, Check, ArrowUpRight, ArrowRight, Calculator, Lock } from 'lucide-react';
import { WEB_PROPERTIES, WEB_STATS } from '../../data/webProperties';

// Cuánto de la captura se recorre (deja margen: nunca llega al blanco del final).
const PAN = '-58%';

// El proyecto no usa eslint-plugin-react, así que no-unused-vars no reconoce a
// `motion` usado solo como <motion.x>. Misma referencia que en CaseStudyModal.
const _MOTION = motion;

// Marco de navegador + captura desplazable + marco de teléfono.
// autoPan: en táctil el recorrido se dispara al entrar en viewport (no hay hover).
const SitePreview = ({ site, autoPan }) => (
  <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-slate-950 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.8)]">
    {/* Barra del navegador */}
    <div className="relative z-20 flex items-center gap-2 px-3 h-9 bg-slate-900 border-b border-white/10">
      <span className="flex gap-1.5 shrink-0" aria-hidden="true">
        <span className="w-2 h-2 rounded-full bg-slate-600" />
        <span className="w-2 h-2 rounded-full bg-slate-600" />
        <span className="w-2 h-2 rounded-full bg-slate-600" />
      </span>
      <span className="flex-1 flex items-center gap-1.5 h-5 min-w-0 rounded-full bg-slate-950/80 border border-white/5 px-2">
        <Lock size={8} className="text-slate-500 shrink-0" aria-hidden="true" />
        <span className="font-mono text-[10px] text-slate-400 truncate">{site.domain}</span>
      </span>
      <span className="flex items-center gap-1.5 shrink-0" aria-hidden="true">
        <span className="relative flex w-1.5 h-1.5">
          <span
            className="absolute inline-flex w-full h-full rounded-full opacity-70 animate-ping motion-reduce:animate-none"
            style={{ backgroundColor: site.accent }}
          />
          <span className="relative inline-flex w-1.5 h-1.5 rounded-full" style={{ backgroundColor: site.accent }} />
        </span>
        <span className="font-mono text-[9px] uppercase tracking-widest text-slate-500">live</span>
      </span>
    </div>

    {/* Captura desplazable: en hover entra lento y vuelve rápido al salir.
        En táctil (autoPan) el recorrido lo dispara el contenedor al entrar en
        viewport y baja a la imagen por variantes. El trigger va en el
        contenedor y no en la imagen a propósito: la imagen es mucho más alta
        que la ventana que la recorta, así que su ratio de intersección nunca
        llegaría al umbral. */}
    <motion.div
      className="relative h-[210px] sm:h-[240px] overflow-hidden"
      {...(autoPan
        ? { initial: 'rest', whileInView: 'pan', viewport: { once: true, amount: 0.6 } }
        : {})}
    >
      <motion.img
        src={site.shot}
        alt={`Captura del sitio ${site.name} (${site.domain})`}
        loading="lazy"
        decoding="async"
        width={1200}
        height={2400}
        {...(autoPan
          ? {
              variants: { rest: { y: 0 }, pan: { y: PAN } },
              transition: { duration: 6, ease: 'linear', delay: 0.3 },
            }
          : {})}
        className={`absolute inset-x-0 top-0 w-full h-auto ${
          autoPan
            ? ''
            : 'transition-transform duration-500 ease-out group-hover:duration-[4500ms] group-hover:ease-linear group-hover:-translate-y-[58%] motion-reduce:transition-none motion-reduce:group-hover:translate-y-0'
        }`}
      />
      {/* Degradado inferior: funde la captura con el cuerpo de la card */}
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent pointer-events-none z-10" />

      {/* Marco de teléfono — misma página en móvil */}
      <div className="absolute bottom-3 right-3 z-20 w-[62px] sm:w-[68px] rounded-[11px] border-2 border-slate-700 bg-slate-950 overflow-hidden shadow-[0_10px_28px_-6px_rgba(0,0,0,0.9)] transition-transform duration-500 group-hover:-translate-y-1.5 group-hover:border-slate-500 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0">
        <img
          src={site.shotMobile}
          alt=""
          loading="lazy"
          decoding="async"
          width={390}
          height={1900}
          className="w-full h-[112px] sm:h-[124px] object-cover object-top"
        />
      </div>
    </motion.div>
  </div>
);

export default function WebProperties() {
  const reduce = useReducedMotion();

  // En táctil no hay hover: el recorrido de la captura se dispara al entrar en
  // viewport. Con reduced-motion no se dispara nada (queda la captura estática).
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(hover: none), (pointer: coarse)');
    const sync = () => setIsTouch(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);
  const autoPan = isTouch && !reduce;

  const fadeUp = (delay = 0) => ({
    initial: reduce ? false : { opacity: 0, y: 32 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-50px' },
    transition: reduce ? { duration: 0 } : { duration: 0.7, delay, ease: [0.25, 0.46, 0.45, 0.94] },
  });

  return (
    <section
      id="sitios"
      className="scroll-mt-20 py-14 sm:py-20 md:py-24 bg-slate-950 text-white relative overflow-hidden z-20"
    >
      {/* Glows ambientales — mismo lenguaje que #equipo */}
      <div className="absolute top-0 left-1/4 w-[240px] h-[240px] sm:w-[340px] sm:h-[340px] lg:w-[460px] lg:h-[460px] bg-violet-600/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-0 right-1/4 w-[240px] h-[240px] sm:w-[340px] sm:h-[340px] lg:w-[460px] lg:h-[460px] bg-cyan-500/10 rounded-full blur-[110px] pointer-events-none mix-blend-screen" />

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-9 sm:mb-12">
          <motion.div {...fadeUp()}>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-xs sm:text-sm font-bold mb-5 backdrop-blur-md text-violet-300">
              <Globe size={14} /> Productos propios · en producción
            </div>
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-5 tracking-tight text-balance">
              Cuando un problema se repite en toda una industria,{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-300">
                lo convertimos en producto.
              </span>
            </h2>
            <p className="font-sans text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
              No solo resolvemos problemas por encargo: los mejores los transformamos en tecnología propia. Tres
              productos que diseñamos, operamos y mantenemos nosotros mismos — cada card trae la captura real del sitio.
              Entrá y probalos: son la muestra más honesta de lo que construimos.
            </p>
          </motion.div>
        </div>

        {/* Tira de cifras */}
        <motion.div {...fadeUp(0.1)}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-800 rounded-2xl overflow-hidden border border-slate-800 mb-9 sm:mb-12">
            {WEB_STATS.map((s) => (
              <div key={s.label} className="bg-slate-950 px-4 py-4 sm:py-5 text-center">
                <div className="font-mono text-xl sm:text-2xl font-bold text-white leading-none">{s.value}</div>
                <div className="text-[10px] sm:text-[11px] text-slate-500 uppercase tracking-wider mt-2 leading-tight">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Grid de sitios */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-7 mb-12 sm:mb-16">
          {WEB_PROPERTIES.map((p, idx) => (
            <motion.article
              key={p.id}
              {...fadeUp(0.15 + 0.1 * idx)}
              className="group relative flex flex-col h-full rounded-[2rem] border border-slate-800 bg-slate-900/50 hover:bg-slate-900/80 hover:border-slate-700 transition-colors duration-300 overflow-hidden"
            >
              {/* Resplandor de marca al pasar el cursor */}
              <div
                aria-hidden="true"
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                style={{ background: `radial-gradient(130% 55% at 50% 0%, ${p.accent}1f, transparent 70%)` }}
              />
              {/* Filo superior en el color de la marca */}
              <div
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-px opacity-40 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: `linear-gradient(90deg, transparent, ${p.accent}, transparent)` }}
              />

              {/* Ventana con la captura real */}
              <div className="relative z-10 p-3 sm:p-3.5">
                <SitePreview site={p} autoPan={autoPan} />
              </div>

              {/* Cuerpo */}
              <div className="relative z-10 px-5 sm:px-6 pb-5 sm:pb-6 flex flex-col flex-1">
                <div className="flex items-center gap-2 mb-2.5">
                  <span
                    className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] px-2 py-1 rounded-md border"
                    style={{ color: p.accent, borderColor: `${p.accent}33`, backgroundColor: `${p.accent}14` }}
                  >
                    {p.sector}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">Costa Rica</span>
                </div>

                <h3 className="font-display text-xl sm:text-2xl font-bold text-white leading-tight">{p.name}</h3>
                <p className="font-sans text-sm italic mt-1.5 mb-3.5" style={{ color: p.accent }}>
                  {p.tagline}
                </p>

                <p className="font-sans text-[13px] sm:text-sm text-slate-400 leading-relaxed mb-5">{p.desc}</p>

                <ul className="space-y-2 mb-5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-[13px] text-slate-300 leading-snug">
                      <span
                        className="shrink-0 mt-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${p.accent}24` }}
                      >
                        <Check size={10} strokeWidth={3} style={{ color: p.accent }} />
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="flex flex-wrap gap-1.5 mb-5">
                  {p.stack.map((t) => (
                    <span
                      key={t}
                      className="font-mono text-[10px] font-medium px-2 py-1 rounded-md bg-white/5 border border-white/10 text-slate-400"
                    >
                      {t}
                    </span>
                  ))}
                </div>

                {/* Métrica publicada + CTA */}
                <div className="mt-auto pt-5 border-t border-slate-800">
                  <div className="mb-4">
                    <div className="font-mono text-base sm:text-lg font-bold text-white leading-none">
                      {p.metric.value}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1.5 leading-tight">{p.metric.label}</div>
                  </div>
                  {/* El color de marca entra por --brand: así el hover/focus es
                      CSS puro y no depende de handlers de ratón. */}
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener"
                    aria-label={`Visitar ${p.name} en ${p.domain} — abre en una pestaña nueva`}
                    style={{ '--brand': p.accent }}
                    className="group/cta inline-flex w-full items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm min-h-11 transition-colors duration-300
                      bg-[var(--brand)]/10 border border-[var(--brand)]/25 text-white
                      hover:bg-[var(--brand)] hover:border-[var(--brand)] hover:text-slate-950
                      focus-visible:bg-[var(--brand)] focus-visible:border-[var(--brand)] focus-visible:text-slate-950
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                  >
                    Visitar {p.domain}
                    <ArrowUpRight
                      size={16}
                      className="shrink-0 transition-transform duration-300 group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5"
                      aria-hidden="true"
                    />
                  </a>
                </div>
              </div>
            </motion.article>
          ))}
        </div>

        {/* Cierre: el servicio detrás de los sitios */}
        <motion.div {...fadeUp(0.3)}>
          <div className="max-w-4xl mx-auto bg-slate-900/70 border border-slate-800 rounded-[2rem] p-6 sm:p-9 md:p-11 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-56 h-56 bg-violet-600/15 rounded-full blur-[80px] pointer-events-none" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-violet-500/10 text-violet-300 border border-violet-500/20 mb-4">
                <Globe size={12} /> También es uno de nuestros servicios
              </div>
              <h3 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-white mb-4 text-balance">
                Te construimos el mismo tipo de sitio para tu negocio.
              </h3>
              <p className="font-sans text-sm sm:text-base text-slate-400 mb-7 max-w-2xl mx-auto leading-relaxed">
                Página con tu marca, catálogo de servicios y reservas que se agendan solas — con panel para administrar
                citas y clientes. La misma base técnica que ya corre en estos tres sitios, adaptada a tu operación.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                <a
                  href="#roi"
                  className="btn-sheen inline-flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-6 sm:px-7 py-3.5 rounded-xl font-bold text-sm sm:text-base transition-colors shadow-[0_0_30px_rgba(124,58,237,0.3)] min-h-11"
                >
                  <Calculator size={17} /> Cotizar mi página web
                </a>
                <a
                  href="https://wa.me/50670330596?text=Hola%2C%20quiero%20una%20p%C3%A1gina%20web%20con%20reservas%20como%20las%20de%20sus%20sitios%20propios."
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white px-6 sm:px-7 py-3.5 rounded-xl font-bold text-sm sm:text-base transition-colors min-h-11"
                >
                  Hablar por WhatsApp <ArrowRight size={17} />
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
