// ============================================================================
//  src/components/site/Hero.jsx
//  Titular gigante + collage de sitios reales que hicimos (capturas de
//  public/sites/). El diseño se demuestra, no se describe.
// ============================================================================
import { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion, useMotionValue, useSpring } from 'framer-motion';
import { WEB_PROPERTIES, CLIENT_SITES } from '../../data/webProperties';
import { CTA, MaskLines, Reveal } from './primitives';
import { wa, EASE } from './links';

// eslint (sin plugin de react) no reconoce a `motion` usado solo como <motion.x>.
const _MOTION = motion;

const byId = (id) => [...WEB_PROPERTIES, ...CLIENT_SITES].find((s) => s.id === id);

// Ventana de navegador con una captura real adentro.
const BrowserShot = ({ site, className = '', eager = false }) => (
  <div className={`rounded-xl sm:rounded-2xl overflow-hidden bg-white shadow-[0_30px_80px_-20px_rgba(10,10,11,0.45)] ring-1 ring-ink/10 ${className}`}>
    <div className="flex items-center gap-1.5 px-3 h-6 sm:h-7 bg-neutral-100 border-b border-ink/5">
      <span className="w-2 h-2 rounded-full bg-ink/15" />
      <span className="w-2 h-2 rounded-full bg-ink/15" />
      <span className="w-2 h-2 rounded-full bg-ink/15" />
      <span className="ml-2 flex-1 truncate font-mono text-[9px] sm:text-[10px] text-ink/40">{site.domain}</span>
    </div>
    <img
      src={site.shotHero}
      alt={`Sitio ${site.name}`}
      width={1800}
      height={1013}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      className="block w-full aspect-[16/9] object-cover object-top"
    />
  </div>
);

const Hero = () => {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });

  // Parallax por scroll: cada capa del collage se mueve a distinta velocidad.
  const yBack = useTransform(scrollYProgress, [0, 1], ['0%', reduce ? '0%' : '-18%']);
  const yFront = useTransform(scrollYProgress, [0, 1], ['0%', reduce ? '0%' : '-38%']);
  const yPhone = useTransform(scrollYProgress, [0, 1], ['0%', reduce ? '0%' : '-60%']);

  // Parallax por puntero (solo desktop): inclina el collage hacia el cursor.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 80, damping: 20 });
  const sy = useSpring(my, { stiffness: 80, damping: 20 });
  const rotY = useTransform(sx, [-0.5, 0.5], [-6, 6]);
  const rotX = useTransform(sy, [-0.5, 0.5], [5, -5]);

  const onMove = (e) => {
    if (reduce || e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };

  const barber = byId('barberxcr');
  const glow = byId('glowstudiocr');
  const taller = byId('tallerticos');
  const burrada = byId('laburradacr');

  return (
    <section
      id="top"
      ref={ref}
      onPointerMove={onMove}
      className="relative bg-paper text-ink pt-28 sm:pt-36 lg:pt-40 overflow-hidden"
    >
      {/* Retícula de fondo muy tenue: el "papel" de diseño */}
      <div aria-hidden="true" className="absolute inset-0 grid-paper pointer-events-none" />

      <div className="relative mx-auto max-w-[1400px] px-4 sm:px-8">
        <Reveal>
          <div className="inline-flex items-center gap-2.5 rounded-full border border-ink/10 bg-white/60 backdrop-blur px-3.5 py-1.5 mb-7 sm:mb-10">
            <span className="relative flex w-2 h-2">
              <span className="absolute inset-0 rounded-full bg-lime-dark animate-ping motion-reduce:animate-none opacity-60" />
              <span className="relative w-2 h-2 rounded-full bg-lime-dark" />
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink/70">
              Estudio digital · <span className="hidden sm:inline">Heredia, </span>Costa Rica
            </span>
          </div>
        </Reveal>

        <h1 className="font-display font-semibold tracking-[-0.035em] leading-[0.92] text-[clamp(2.9rem,10.4vw,8.4rem)]">
          <MaskLines
            lines={[
              'Webs que venden.',
              'Sistemas que',
              <>
                <span className="font-serif italic font-normal tracking-[-0.02em]">trabajan solos</span>
                <span className="inline-block align-middle ml-[0.18em] w-[0.5em] h-[0.5em] rounded-full bg-lime border-[0.05em] border-ink" aria-hidden="true" />
              </>,
            ]}
            delay={0.25}
          />
        </h1>

        <div className="mt-8 sm:mt-12 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-7">
          <Reveal delay={0.55} className="max-w-md">
            <p className="text-lg sm:text-xl text-ink/65 leading-snug">
              Diseño web, software y automatización para negocios que quieren crecer.
            </p>
          </Reveal>
          <Reveal delay={0.7} className="flex flex-col sm:flex-row gap-3">
            <CTA href={wa('Hola, quiero una página web para mi negocio.')} variant="ink" size="lg">
              Quiero mi web
            </CTA>
            <CTA href="#trabajo" variant="ghost" size="lg">
              Ver trabajos
            </CTA>
          </Reveal>
        </div>
      </div>

      {/* Collage de sitios reales */}
      <div className="relative mt-14 sm:mt-20 mx-auto max-w-[1400px] px-4 sm:px-8" style={{ perspective: 1600 }}>
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.3, delay: 0.5, ease: EASE }}
          style={{ rotateX: rotX, rotateY: rotY, transformStyle: 'preserve-3d' }}
          className="relative h-[62vw] sm:h-[52vw] lg:h-[560px] xl:h-[620px]"
        >
          <motion.div style={{ y: yBack }} className="absolute left-0 top-[8%] w-[46%] -rotate-[5deg]">
            <BrowserShot site={glow} />
          </motion.div>
          <motion.div style={{ y: yBack }} className="absolute right-0 top-[4%] w-[46%] rotate-[4deg]">
            <BrowserShot site={taller} />
          </motion.div>
          <motion.div style={{ y: yFront }} className="absolute left-1/2 -translate-x-1/2 top-[18%] w-[68%] z-10">
            <BrowserShot site={barber} eager />
          </motion.div>
          <motion.div
            style={{ y: yPhone }}
            className="absolute right-[6%] sm:right-[10%] top-[34%] w-[20%] sm:w-[15%] z-20 rotate-[6deg]"
          >
            <div className="rounded-[1.4rem] sm:rounded-[2rem] bg-ink p-1 sm:p-1.5 shadow-[0_30px_60px_-15px_rgba(10,10,11,0.6)]">
              <img
                src={burrada.shotMobile}
                alt={`Versión móvil de ${burrada.name}`}
                width={390}
                height={844}
                decoding="async"
                className="block w-full aspect-[9/19] object-cover object-top rounded-[1.15rem] sm:rounded-[1.6rem]"
              />
            </div>
          </motion.div>

          {/* Sticker giratorio: el guiño de "estudio de diseño" */}
          <a
            href="#cotizar"
            aria-label="Cotizar mi proyecto"
            className="absolute left-[4%] sm:left-[8%] bottom-[2%] sm:bottom-[6%] z-30 w-24 h-24 sm:w-36 sm:h-36 grid place-items-center rounded-full bg-lime text-ink shadow-xl hover:scale-105 transition-transform"
          >
            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full spin-slow" aria-hidden="true">
              <defs>
                <path id="sticker-circle" d="M50,50 m-37,0 a37,37 0 1,1 74,0 a37,37 0 1,1 -74,0" />
              </defs>
              <text className="font-mono" fontSize="9.2" letterSpacing="2.4" fill="currentColor">
                <textPath href="#sticker-circle">COTIZÁ EN 3 CLICS · COTIZÁ EN 3 CLICS ·</textPath>
              </text>
            </svg>
            <span className="font-display text-2xl sm:text-4xl font-bold">↓</span>
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
