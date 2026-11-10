// JC Analytics, portada corta (reunión del 31 de octubre de 2026). Cada sección responde una pregunta de
// quien compra, en el orden en que se la hace (auditoría de noviembre de 2026): ¿cuál es mi caso? → ¿ya lo
// hicieron? → ¿qué arriesgo? → ¿cuánto cuesta? → ¿qué más debería saber? → ¿quién me atiende? → contacto.
// El cuaderno de ideas va al final: es lectura para quien todavía no va a escribir.
// Las demos de sistemas, finanzas, IA y marketing viven ahora en la página de cada servicio (ServiceDemo).
// El cotizador en vivo salió de la portada el 3 de noviembre de 2026: los precios publicados viven en
// Paquetes y en la página de cada categoría (con su calculadora); lo demás se cotiza conversando.
import { useEffect } from 'react';
import { useReducedMotion } from 'framer-motion';

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
import KnowledgePreview from './components/site/KnowledgePreview';
import './styles/studio.css';
import './styles/art-direction.css';
import './styles/conversion.css';
import './styles/mobile.css';
import './styles/discovery.css';
import { t } from './i18n/locale';
import { trackContactClicks } from './seo/analytics';
import { useInitialFragment } from './components/useInitialFragment';
import { endBoot } from './boot';

const App = () => {
  useInitialFragment();
  const reduce = useReducedMotion();
  useEffect(trackContactClicks, []);
  useEffect(endBoot, []);

  // Scroll suave (Lenis) solo en computadora con puntero fino: en táctil queda el scroll nativo del sistema
  // y la librería ni se descarga. Antes Lenis y GSAP completo (usado solo como reloj) bajaban para todos.
  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!fine || reduce) return undefined;
    let lenis = null;
    let frame = 0;
    let cancelled = false;
    const menuState = (event) => { if (lenis) { if (event.detail.open) lenis.stop(); else lenis.start(); } };
    window.addEventListener('jca:menu-state', menuState);
    window.addEventListener('jca:assistant-state', menuState);
    window.addEventListener('jca:lead-dialog-state', menuState);
    import('lenis').then(({ default: Lenis }) => {
      if (cancelled) return;
      lenis = new Lenis({ lerp: 0.09, smoothWheel: true, anchors: true });
      const loop = (time) => { lenis.raf(time); frame = window.requestAnimationFrame(loop); };
      frame = window.requestAnimationFrame(loop);
    }).catch(() => { /* sin scroll suave: queda el nativo */ });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      window.removeEventListener('jca:menu-state', menuState);
      window.removeEventListener('jca:assistant-state', menuState);
      window.removeEventListener('jca:lead-dialog-state', menuState);
      lenis?.destroy();
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
        <FAQ />
        <Team />
        <Contact />
        <KnowledgePreview />
      </main>

      <Footer />

    </div>
  );
};

export default App;
