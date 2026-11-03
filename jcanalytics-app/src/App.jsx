// JC Analytics, portada corta (reunión del 31 de octubre de 2026): qué hacemos por categoría →
// proyectos reales → cómo trabajamos → precios → cotizador → equipo → ideas → preguntas → contacto.
// Las demos de sistemas, finanzas, IA y marketing viven ahora en la página de cada servicio (ServiceDemo).
import { useEffect } from 'react';
import { useReducedMotion } from 'framer-motion';
import Lenis from 'lenis';
import gsap from 'gsap';

import Nav from './components/site/Nav';
import Hero from './components/site/Hero';
import Categories from './components/site/Categories';
import Work from './components/site/Work';
import Packages from './components/site/Packages';
import Team from './components/site/Team';
import Process from './components/site/Process';
import Contact from './components/site/Contact';
import Footer from './components/site/Footer';
import FAQ from './components/site/FAQ';
import QuoteEstimator from './components/ui/QuoteEstimator';
import KnowledgePreview from './components/site/KnowledgePreview';
import './styles/studio.css';
import './styles/art-direction.css';
import './styles/conversion.css';
import './styles/mobile.css';
import './styles/discovery.css';
import { t } from './i18n/locale';
import { trackContactClicks } from './seo/analytics';
import { useInitialFragment } from './components/useInitialFragment';

const App = () => {
  useInitialFragment();
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
    window.addEventListener('jca:assistant-state', menuState);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      window.removeEventListener('jca:menu-state', menuState);
      window.removeEventListener('jca:assistant-state', menuState);
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
        <Categories />
        <Work />
        <Process />
        <Packages />

        {/* Cotizador en vivo */}
        <section id="cotizar" className="quote-premium scroll-mt-24 bg-ink text-paper py-20 sm:py-32 rounded-t-[2rem] sm:rounded-t-[3rem] relative z-10">
          <QuoteEstimator />
        </section>

        <Team />
        <KnowledgePreview />
        <FAQ />
        <Contact />
      </main>

      <Footer />

    </div>
  );
};

export default App;
