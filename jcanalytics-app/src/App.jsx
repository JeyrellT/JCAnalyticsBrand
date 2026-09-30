// ============================================================================
//  src/App.jsx · JC Analytics — rediseño v3 (sep-26)
//  Dirección: estudio de diseño web + sistemas. Editorial, poco texto y una
//  acción al final de cada bloque. Paleta: papel · tinta · lima.
//  Orden: Hero → cinta → cifras → Trabajo → Servicios → Proceso → Cotizador
//         → Contacto → Footer.
// ============================================================================
import { useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import Lenis from 'lenis';
import gsap from 'gsap';
import { MessageCircle } from 'lucide-react';

import Nav from './components/site/Nav';
import Hero from './components/site/Hero';
import Work from './components/site/Work';
import Services from './components/site/Services';
import Process from './components/site/Process';
import Contact from './components/site/Contact';
import Footer from './components/site/Footer';
import QuoteEstimator from './components/ui/QuoteEstimator';
import { Marquee, Reveal } from './components/site/primitives';
import { wa } from './components/site/links';
import { WEB_STATS } from './data/webProperties';

// eslint (sin plugin de react) no reconoce a `motion` usado solo como <motion.x>.
const _MOTION = motion;

const TICKER = ['Diseño web', 'Reservas en línea', 'Pedidos por WhatsApp', 'Dashboards', 'Automatización', 'Software a la medida'];

// Cifras con respaldo: sitios en línea (conteo de data/webProperties.js) y
// comprobantes validados (caso documentado del sitio anterior).
const STATS = [
  { value: WEB_STATS[0].value, label: 'sitios en línea hoy' },
  { value: '5.900+', label: 'comprobantes validados con Hacienda' },
  { value: '72 h', label: 'entre cada avance' },
  { value: '30 días', label: 'de soporte incluido' },
];

const App = () => {
  const reduce = useReducedMotion();

  // Scroll suave (Lenis) solo en desktop con puntero fino: en táctil queda el
  // scroll nativo del sistema. gsap.ticker conduce el rAF en un único loop.
  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!fine || reduce) return undefined;
    const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    const tick = (t) => lenis.raf(t * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, [reduce]);

  return (
    <div className="min-h-screen bg-paper text-ink font-sans antialiased selection:bg-lime selection:text-ink overflow-x-clip">
      <a href="#trabajo" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:bg-ink focus:text-paper focus:px-4 focus:py-2 focus:rounded-full">
        Saltar al contenido
      </a>

      <Nav />

      <main>
        <Hero />

        {/* Cinta: qué hacemos, en grande */}
        <div className="bg-ink text-paper py-5 sm:py-7 -rotate-[1.5deg] scale-[1.03] relative z-10 mt-4 sm:mt-10" aria-label="Servicios">
          <Marquee duration={45}>
            {TICKER.map((t) => (
              <span key={t} className="flex items-center font-display text-3xl sm:text-5xl font-semibold tracking-tight whitespace-nowrap">
                <span className="px-6 sm:px-10">{t}</span>
                <span className="text-lime text-2xl sm:text-4xl" aria-hidden="true">✦</span>
              </span>
            ))}
          </Marquee>
        </div>

        {/* Cifras */}
        <section aria-label="Cifras" className="bg-paper pt-20 sm:pt-28">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-8 grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
            {STATS.map((s, i) => (
              <Reveal key={s.label} delay={i * 0.08} className="border-t border-ink/15 pt-5">
                <div className="font-display text-[clamp(2.6rem,6vw,4.75rem)] font-semibold tracking-[-0.05em] leading-none">
                  {s.value}
                </div>
                <div className="mt-2 text-ink/55 text-[15px] leading-snug max-w-[14rem]">{s.label}</div>
              </Reveal>
            ))}
          </div>
        </section>

        <Work />
        <Services />
        <Process />

        {/* Cotizador en vivo */}
        <section id="cotizar" className="scroll-mt-24 bg-ink text-paper py-20 sm:py-32 rounded-t-[2rem] sm:rounded-t-[3rem] relative z-10">
          <QuoteEstimator />
        </section>

        <Contact />
      </main>

      <Footer />

      {/* WhatsApp flotante — .wa-fab sube cuando la barra del cotizador está visible */}
      <a
        href={wa('Hola, vengo del sitio web de JC Analytics.')}
        target="_blank"
        rel="noreferrer"
        aria-label="Escribir por WhatsApp"
        className="wa-fab tap-press fixed right-4 sm:right-6 z-50 grid place-items-center w-14 h-14 rounded-full bg-ink text-lime shadow-[0_12px_30px_-8px_rgba(10,10,11,0.55)] ring-2 ring-lime/70 hover:scale-105 transition-transform"
      >
        <MessageCircle size={24} strokeWidth={2.2} />
      </a>
    </div>
  );
};

export default App;
