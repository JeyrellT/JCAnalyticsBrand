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
import { afterLayout, registerSmoothScroll, scrollToNode } from './components/site/scroll';
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
    let unregister = () => {};
    const onAnchor = (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target.closest?.('a[href*="#"]');
      if (!anchor || anchor.origin !== window.location.origin || anchor.pathname !== window.location.pathname || anchor.hash.length < 2) return;
      let node = null;
      try { node = document.getElementById(decodeURIComponent(anchor.hash.slice(1))); } catch { /* ancla mal formada */ }
      if (node && node.tagName !== 'SECTION') afterLayout(() => scrollToNode(node));
    };
    const menuState = (event) => { if (lenis) { if (event.detail.open) lenis.stop(); else lenis.start(); } };
    window.addEventListener('jca:menu-state', menuState);
    window.addEventListener('jca:assistant-state', menuState);
    window.addEventListener('jca:lead-dialog-state', menuState);
    import('lenis').then(({ default: Lenis }) => {
      if (cancelled) return;
      lenis = new Lenis({ lerp: 0.09, smoothWheel: true, anchors: true });
      // Quien necesita llegar a un elemento respetando la barra fija usa scroll.js, que pasa por acá.
      unregister = registerSmoothScroll((top, { instant }) => lenis.scrollTo(top, { immediate: instant, force: true }));
      // Lenis lleva cada ancla a y=0. A las secciones no les afecta (traen su propio aire arriba), pero una
      // tarjeta de paquete o el explorador de proyectos quedaban debajo de la barra fija: esos destinos se
      // recolocan respetando su `scroll-margin-top`.
      document.addEventListener('click', onAnchor);
      const loop = (time) => { lenis.raf(time); frame = window.requestAnimationFrame(loop); };
      frame = window.requestAnimationFrame(loop);
    }).catch(() => { /* sin scroll suave: queda el nativo */ });
    return () => {
      cancelled = true;
      unregister();
      document.removeEventListener('click', onAnchor);
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
