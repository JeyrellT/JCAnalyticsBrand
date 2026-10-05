import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowDown, ArrowUpRight, Pause, Play } from 'lucide-react';
import { experienceArticles } from '../../content/articles-experience';
import { articlePath } from '../../seo/routes';
import { MaskLines, Reveal } from './primitives';
import { prepareContact } from './links';
import '../../styles/hero.css';
import { t, locale } from '../../i18n/locale';

const _MOTION = motion;
const Sculpture = lazy(() => import('./StudioSculpture'));
const EDITORIAL_ARTICLE = experienceArticles.find((article) => article.id === 'useful-websites');
const MODES = [
  { label: t('Diseño', 'Design'), description: t('Experiencias que se sienten distintas desde el primer clic.', 'Experiences that feel different from the very first click.') },
  { label: t('Ingeniería', 'Engineering'), description: t('Frontend, backend y arquitectura pensados como un solo sistema.', 'Frontend, backend and architecture designed as one system.') },
  { label: t('Inteligencia', 'Intelligence'), description: t('Finanzas, datos e IA que conectan tu siguiente etapa.', 'Finance, data and AI connecting your next chapter.') },
];
class SculptureBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFallback(); }
  render() { return this.state.failed ? null : this.props.children; }
}

const Hero = () => {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const [mode, setMode] = useState(0);
  const [ready, setReady] = useState(false);
  const [renderSculpture, setRenderSculpture] = useState(false);
  useEffect(() => {
    if (reduce || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    // Keep the decorative WebGL bundle out of mobile and initial rendering.
    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(() => setRenderSculpture(true), { timeout: 2500 })
      : window.setTimeout(() => setRenderSculpture(true), 1500);
    return () => window.cancelIdleCallback ? window.cancelIdleCallback(idle) : window.clearTimeout(idle);
  }, [reduce]);
  const onReady = useCallback(() => setReady(true), []);
  const onFallback = useCallback(() => setReady(false), []);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const objectY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 100]);
  return (
    <section id="top" ref={ref} className="studio-hero" aria-labelledby="hero-title">
      <div className="studio-hero__grain" aria-hidden="true" />
      <div className="studio-hero__topline"><span><i aria-hidden="true" /> {t('INGENIERÍA + DISEÑO DIGITAL', 'ENGINEERING + DIGITAL DESIGN')}</span><span>{t('INDEPENDIENTES. HECHOS EN COSTA RICA.', 'INDEPENDENT. MADE IN COSTA RICA.')} <ArrowUpRight size={12} aria-hidden="true" /></span></div>
      <div className="studio-hero__main">
        <div className="studio-hero__copy">
          <Reveal className="studio-hero__lead"><p className="studio-hero__eyebrow">{t('Desarrollo web, software e IA en Costa Rica.', 'Web development, software & AI in Costa Rica.')}</p></Reveal>
          <h1 id="hero-title"><MaskLines lines={[t('Sistemas', 'Software'), <em key="character">{t('con carácter.', 'with character.')}</em>]} delay={0.1} /></h1>
          <Reveal delay={0.25} className="studio-hero__intro"><p className="studio-hero__description">{t('Diseño web y desarrollo de software a medida en Costa Rica. Conectamos tu web, backend, dashboards Power BI e inteligencia artificial para que tu negocio dé el siguiente paso.', 'Custom web design and software development in Costa Rica. We connect your website, backend, Power BI dashboards and AI to help your business take its next step.')}</p></Reveal>
          <Reveal delay={0.35} className="studio-hero__actions"><a href="#contacto" className="studio-start" onClick={() => prepareContact({ need: 'Sistema / backend', source: t('Sistemas con carácter', 'Software with character') })}>{t('Conversemos sobre tu proyecto', "Let's talk about your project")} <span><ArrowUpRight size={21} aria-hidden="true" /></span></a><a href="#trabajo" className="studio-work-link">{t('Explorar ejemplos', 'Explore examples')} <ArrowDown size={15} aria-hidden="true" /></a></Reveal>
          <p className="studio-hero__invitation">{t('Primera conversación de 30 min, sin costo.', 'Your first 30-minute conversation is on us.')}</p>
          <Reveal delay={0.45} className="studio-hero__signature"><span className="studio-signature-mark" aria-hidden="true">↳</span> {t('Diseño intencional. Ingeniería a medida.', 'Intentional design. Custom engineering.')}</Reveal>
        </div>
        <motion.div className={`studio-object ${ready ? 'studio-object--ready' : ''}`} style={{ y: objectY }}>
          <div className="studio-object__halo" aria-hidden="true" />
          <div className="studio-object__fallback" aria-hidden="true"><svg viewBox="0 0 600 600" fill="none"><defs><linearGradient id="object-fallback" x1="50" y1="90" x2="500" y2="510" gradientUnits="userSpaceOnUse"><stop stopColor="#d9ffe8" /><stop offset=".3" stopColor="#426fb0" /><stop offset=".5" stopColor="#d1f9ef" /><stop offset=".72" stopColor="#30526a" /><stop offset="1" stopColor="#8cdecf" /></linearGradient></defs><g stroke="url(#object-fallback)" strokeWidth="58"><ellipse cx="300" cy="300" rx="173" ry="91" transform="rotate(-50 300 300)" /><ellipse cx="300" cy="300" rx="173" ry="91" transform="rotate(50 300 300)" /><ellipse cx="300" cy="300" rx="173" ry="91" transform="rotate(90 300 300)" /></g></svg></div>
          {renderSculpture && <SculptureBoundary onFallback={onFallback}><Suspense fallback={null}><Sculpture mode={mode} paused={paused || Boolean(reduce)} onReady={onReady} onFallback={onFallback} /></Suspense></SculptureBoundary>}
          <span className="studio-object__coordinate" aria-hidden="true">JC—001<br />{t('FORMA / FUNCIÓN', 'FORM / FUNCTION')}</span>
          <div className="studio-object__badge" aria-hidden="true"><span>{t('DISEÑO', 'DESIGN')}</span><svg viewBox="0 0 70 70" fill="none"><path d="M35 3V67M3 35H67M12 12L58 58M12 58L58 12" stroke="currentColor" strokeWidth="2" /></svg><span>{t('EN MOVIMIENTO', 'IN MOTION')}</span></div>
          {!reduce && ready && <button type="button" className="studio-motion-control" onClick={() => setPaused((value) => !value)} aria-pressed={paused} aria-label={paused ? t('Reanudar animación 3D', 'Resume 3D animation') : t('Pausar animación 3D', 'Pause 3D animation')}>{paused ? <Play size={13} aria-hidden="true" /> : <Pause size={13} aria-hidden="true" />}<span>{paused ? t('Reanudar', 'Resume') : t('Pausar', 'Pause')}</span></button>}
        </motion.div>
      </div>
      <div className="studio-hero__bottom">
        <div className="studio-materials"><div role="group" aria-label={t('Explorar diseño, ingeniería e inteligencia', 'Explore design, engineering and intelligence')}>{MODES.map((item, index) => <button key={item.label} type="button" onClick={() => setMode(index)} aria-pressed={mode === index}><span>0{index + 1}</span>{item.label}<i aria-hidden="true" /></button>)}</div><p aria-live="polite">{MODES[mode].description}</p></div>
        <a href={articlePath(EDITORIAL_ARTICLE, locale)} className="studio-latest"><img src="/images/journal/systems.webp" alt={t('Ilustración conceptual de una experiencia digital conectada.', 'Conceptual illustration of a connected digital experience.')} width={1536} height={1024} decoding="async" loading="lazy" /><span><small>{t('IDEAS PARA TU PRÓXIMO PASO', 'IDEAS FOR YOUR NEXT STEP')}</small><strong>{t('Una web que orienta', 'A website that guides')} <ArrowUpRight size={15} aria-hidden="true" /></strong></span></a>
      </div>
      <div className="studio-scroll-note"><span>{t('SCROLL PARA EXPLORAR', 'SCROLL TO EXPLORE')}</span><span aria-hidden="true">↓</span><span>{t('DISEÑAMOS LO QUE VIENE.', 'DESIGNING WHAT COMES NEXT.')}</span></div>
    </section>
  );
};
export default Hero;
