// JC Analytics: sistemas → finanzas y BI → ML e IA → portafolio → marketing.
import { useEffect } from 'react';
import { useReducedMotion } from 'framer-motion';
import Lenis from 'lenis';
import gsap from 'gsap';
import { MessageCircle } from 'lucide-react';

import Nav from './components/site/Nav';
import Hero from './components/site/Hero';
import Work from './components/site/Work';
import ProjectStart from './components/site/ProjectStart';
import Systems from './components/site/Systems';
import Finance from './components/site/Finance';
import Intelligence from './components/site/Intelligence';
import Services from './components/site/Services';
import Automation from './components/site/Automation';
import Social from './components/site/Social';
import Team from './components/site/Team';
import Process from './components/site/Process';
import Contact from './components/site/Contact';
import Footer from './components/site/Footer';
import FAQ from './components/site/FAQ';
import QuoteEstimator from './components/ui/QuoteEstimator';
import { Marquee, Reveal } from './components/site/primitives';
import { wa } from './components/site/links';
import KnowledgePreview from './components/site/KnowledgePreview';
import './styles/studio.css';
import './styles/art-direction.css';
import './styles/conversion.css';
import './styles/mobile.css';
import './styles/discovery.css';
import { t } from './i18n/locale';
import { trackContactClicks } from './seo/analytics';

const TICKER = t(['Desarrollo de sistemas', 'Diseño de interfaces', 'Backend a medida', 'Finanzas', 'Dashboards', 'Machine learning', 'Integración de IA'], ['Software development', 'Interface design', 'Custom backend', 'Finance', 'Dashboards', 'Machine learning', 'AI integration']);

const STATS = [
  { value: '6', label: t('guías para tomar mejores decisiones', 'guides for better decisions') },
  { value: '4', label: t('especialidades conectadas a tu negocio', 'specialties connected to your business') },
  { value: 'EN / ES', label: t('conversemos en tu idioma', 'let’s speak your language') },
  { value: '4', label: t('personas reales, sin intermediarios', 'real people, no middlemen') },
];

const App = () => {
  const reduce = useReducedMotion();
  useEffect(trackContactClicks, []);

  // Scroll suave (Lenis) solo en desktop con puntero fino: en táctil queda el
  // scroll nativo del sistema. gsap.ticker conduce el rAF en un único loop.
  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!fine || reduce) return undefined;
    const lenis = new Lenis({ lerp: 0.09, smoothWheel: true, anchors: true });
    const tick = (t) => lenis.raf(t * 1000);
    const menuState = (event) => event.detail.open ? lenis.stop() : lenis.start();
    window.addEventListener('jca:menu-state', menuState);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      window.removeEventListener('jca:menu-state', menuState);
      lenis.destroy();
    };
  }, [reduce]);

  return (
    <div className="site-premium studio-v4 min-h-screen bg-paper text-ink font-sans antialiased selection:bg-lime selection:text-ink overflow-x-clip">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:bg-ink focus:text-paper focus:px-4 focus:py-2 focus:rounded-full">
        {t('Saltar al contenido', 'Skip to content')}
      </a>

      <Nav />

      <main id="main-content" tabIndex={-1}>
        <Hero />

        {/* Cinta: qué hacemos, en grande */}
        <div className="capabilities-ribbon" aria-label={t('Servicios del estudio', 'Studio services')}>
          <Marquee duration={55}>
            {TICKER.map((t) => (
              <span key={t} className="flex items-center font-display text-xl sm:text-2xl font-medium tracking-tight whitespace-nowrap">
                <span className="px-6 sm:px-10">{t}</span>
                <span className="text-lime text-sm" aria-hidden="true">✦</span>
              </span>
            ))}
          </Marquee>
        </div>

        <Systems />
        <Finance />
        <Intelligence />

        {/* Cifras y proyectos: evidencia después de presentar las especialidades. */}
        <section aria-label={t('El estudio en cifras', 'The studio in numbers')} className="studio-proof bg-paper pt-16 sm:pt-24">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-8">
            <Reveal className="studio-proof__intro"><span>{t('DE LA IDEA A LA IMPLEMENTACIÓN.', 'FROM IDEA TO IMPLEMENTATION.')}</span><p>{t('Un estudio para pensar y construir.', 'A studio for thinking and building.')}</p></Reveal>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
            {STATS.map((s, i) => (
              <Reveal key={s.label} delay={i * 0.08} className="border-t border-ink/15 pt-5">
                <div className="font-display text-[clamp(2.6rem,6vw,4.75rem)] font-semibold tracking-[-0.05em] leading-none">
                  {s.value}
                </div>
                <div className="mt-2 text-ink/55 text-[15px] leading-snug max-w-[14rem]">{s.label}</div>
              </Reveal>
            ))}
          </div>
          </div>
        </section>

        <Work />
        <ProjectStart />
        <Services />
        <Automation />
        <Social />
        <Team />
        <Process />
        <KnowledgePreview />

        {/* Cotizador en vivo */}
        <section id="cotizar" className="quote-premium scroll-mt-24 bg-ink text-paper py-20 sm:py-32 rounded-t-[2rem] sm:rounded-t-[3rem] relative z-10">
          <QuoteEstimator />
        </section>

        <FAQ />
        <Contact />
      </main>

      <Footer />

      {/* WhatsApp flotante — .wa-fab sube cuando la barra del cotizador está visible */}
      <a
        href={wa(t('Hola, vengo del sitio web de JC Analytics.', 'Hi, I found you on the JC Analytics website.'))}
        target="_blank"
        rel="noreferrer"
        aria-label={t('Escribir por WhatsApp', 'Message us on WhatsApp')}
        className="wa-fab tap-press fixed right-4 sm:right-6 z-50 grid place-items-center w-13 h-13 rounded-full bg-ink text-lime shadow-[0_12px_30px_-8px_rgba(7,26,54,0.4)] ring-1 ring-lime/40 hover:scale-105 transition-transform"
      >
        <MessageCircle size={24} strokeWidth={2.2} />
      </a>
    </div>
  );
};

export default App;
