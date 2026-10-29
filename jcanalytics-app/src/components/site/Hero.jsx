import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowDown, ArrowUpRight, MessageCircle, Pause, Play } from 'lucide-react';
import { experienceArticles } from '../../content/articles-experience';
import { articlePath } from '../../seo/routes';
import { MaskLines, Reveal } from './primitives';
import { prepareContact, wa } from './links';
import { adPackage } from '../../data/packages';
import { useDesktop } from '../../hooks/useDesktop';
import { shotSrcSet } from '../../data/shots';
import '../../styles/packages.css';
import '../../styles/hero.css';
import { t, locale } from '../../i18n/locale';

const _MOTION = motion;
const Sculpture = lazy(() => import('./StudioSculpture'));

// En celular no hay WebGL: el objeto 3D se cambia por pantallas reales de sistemas
// que existen, rotando como historias. Todas son capturas a 390 px de proyectos del estudio.
const SCREENS = [
  { src: 'laburrada/home', name: 'La Burrada Street Food', caption: t('Menú y pedidos en línea', 'Online menu and orders') },
  { src: 'transportesluna/admin', name: 'Transporte Luz de Luna', caption: t('Resumen del transportista: unidades y facturación', 'Carrier summary: units and billing') },
  { src: 'barberxcr/reserva', name: 'BarberXCR', caption: t('Reservas con la marca de cada barbería', 'Bookings under each barbershop’s brand') },
  { src: 'multiagencia/tienda', name: 'Multiagencia Gutiérrez', caption: t('Tienda en línea con precios en colones', 'Online store with prices in colones') },
  { src: 'crimson/facturas', name: 'Crimson Consulting', caption: t('Factura electrónica v4.4 en tiempo real', 'Real-time e-invoicing v4.4') },
];
const SCREEN_MS = 2800;
const HeroScreens = ({ reduce, paused }) => {
  const [index, setIndex] = useState(0);
  const [onScreen, setOnScreen] = useState(true);
  const ref = useRef(null);
  // Solo rota mientras el hero se ve: fuera de pantalla no hay temporizador ni renders.
  useEffect(() => {
    const node = ref.current;
    if (!node || !('IntersectionObserver' in window)) return undefined;
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (reduce || paused || !onScreen) return undefined;
    const id = window.setInterval(() => setIndex((value) => (value + 1) % SCREENS.length), SCREEN_MS);
    return () => window.clearInterval(id);
  }, [reduce, paused, onScreen]);
  const current = SCREENS[index];
  return (
    <div ref={ref} className="hero-screens" role="group" aria-label={t('Pantallas reales de proyectos', 'Real project screens')}>
      <div className="hero-screens__phone" aria-hidden="true">
        <div className="hero-screens__bars">{SCREENS.map((item, k) => <i key={item.src} className={k === index ? 'is-on' : k < index ? 'is-done' : ''} style={{ '--ms': `${SCREEN_MS}ms` }} />)}</div>
        {/* Solo la pantalla anterior (para el fundido), la actual y la siguiente existen en el DOM: el resto no ocupa memoria decodificada. */}
        {SCREENS.map((item, k) => (k === index || k === (index + 1) % SCREENS.length || k === (index + SCREENS.length - 1) % SCREENS.length) && (
          <img key={item.src} src={`/projects/${item.src}-mobile.webp`} srcSet={shotSrcSet(`/projects/${item.src}-mobile.webp`)} sizes="45vw" width={640} height={1385}
            loading={k === 0 ? 'eager' : 'lazy'} decoding="async" alt="" className={k === index ? 'is-on' : ''} />
        ))}
      </div>
      <div className="hero-screens__caption" aria-live="polite">
        <small>{t('PANTALLA REAL', 'REAL SCREEN')} · {String(index + 1).padStart(2, '0')}/{String(SCREENS.length).padStart(2, '0')}</small>
        <strong>{current.name}</strong>
        <span>{current.caption}</span>
        <button type="button" onClick={() => setIndex((value) => (value + 1) % SCREENS.length)} aria-label={t('Siguiente pantalla', 'Next screen')}>{t('Siguiente', 'Next')} <ArrowUpRight size={13} aria-hidden="true" /></button>
      </div>
    </div>
  );
};
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
  // En computadora el botón principal abre el formulario corto (ui/LeadDialog.jsx), no WhatsApp Web.
  const desktop = useDesktop();
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
          <Reveal className="studio-hero__lead"><p className="studio-hero__eyebrow">{t('Webs, software, Power BI e IA · Costa Rica', 'Websites, software, Power BI & AI · Costa Rica')}</p></Reveal>
          <h1 id="hero-title"><MaskLines lines={[t('Webs y sistemas', 'Websites and systems'), <em key="price">{t('con precio claro.', 'with clear pricing.')}</em>]} delay={0.1} /></h1>
          <Reveal delay={0.25} className="studio-hero__intro"><p className="studio-hero__description">{desktop
            ? t('Páginas web, sistemas a medida, dashboards Power BI y automatización para negocios en Costa Rica. Elegís un paquete, nos dejás tu contacto y arrancamos.', 'Websites, custom systems, Power BI dashboards and automation for businesses in Costa Rica. Pick a package, leave your contact and we start.')
            : t('Páginas web, sistemas a medida, dashboards Power BI y automatización para negocios en Costa Rica. Elegís un paquete, nos escribís por WhatsApp y arrancamos.', 'Websites, custom systems, Power BI dashboards and automation for businesses in Costa Rica. Pick a package, message us on WhatsApp and we start.')}</p></Reveal>
          <Reveal delay={0.35} className="studio-hero__actions"><a href={wa(adPackage ? adPackage.message : t('Hola JC Analytics, quiero cotizar un proyecto para mi negocio.', 'Hi JC Analytics, I would like a quote for my business.'))} target="_blank" rel="noreferrer" className="studio-wa" {...(adPackage ? { 'data-package': adPackage.key, 'data-value': adPackage.price, 'data-package-label': adPackage.name, 'data-need': adPackage.need } : {})}><MessageCircle size={20} aria-hidden="true" />{desktop ? t('Pedir cotización', 'Request a quote') : t('Cotizar por WhatsApp', 'Get a quote on WhatsApp')}</a><a href="#paquetes" className="studio-work-link">{t('Ver paquetes y precios', 'See packages and pricing')} <ArrowDown size={15} aria-hidden="true" /></a></Reveal>
          {adPackage && <a href="#paquetes" className="studio-hero__ad">{t(`Viste ${adPackage.name}: ${adPackage.priceLabel} · ver detalle`, `You saw ${adPackage.name}: ${adPackage.priceLabel} · see details`)} <ArrowDown size={13} aria-hidden="true" /></a>}
          <p className="studio-hero__invitation">{t('Desde $60 · pago único · primera conversación de 30 min sin costo.', 'From $60 · one-time payment · first 30-minute call is free.')} <a href="#contacto" className="studio-start studio-start--link" onClick={() => prepareContact({ need: 'Sistema / backend', source: t('Hero · formulario', 'Hero · form') })}>{t('¿Preferís el formulario?', 'Prefer the form?')}</a></p>
          <Reveal delay={0.45} className="studio-hero__signature"><span className="studio-signature-mark" aria-hidden="true">↳</span> {t('Diseño intencional. Ingeniería a medida.', 'Intentional design. Custom engineering.')}</Reveal>
        </div>
        <motion.div className={`studio-object ${ready ? 'studio-object--ready' : ''}`} style={{ y: objectY }}>
          <div className="studio-object__halo" aria-hidden="true" />
          <div className="studio-object__fallback" aria-hidden="true"><svg viewBox="0 0 600 600" fill="none"><defs><linearGradient id="object-fallback" x1="50" y1="90" x2="500" y2="510" gradientUnits="userSpaceOnUse"><stop stopColor="#d9ffe8" /><stop offset=".3" stopColor="#426fb0" /><stop offset=".5" stopColor="#d1f9ef" /><stop offset=".72" stopColor="#30526a" /><stop offset="1" stopColor="#8cdecf" /></linearGradient></defs><g stroke="url(#object-fallback)" strokeWidth="58"><ellipse cx="300" cy="300" rx="173" ry="91" transform="rotate(-50 300 300)" /><ellipse cx="300" cy="300" rx="173" ry="91" transform="rotate(50 300 300)" /><ellipse cx="300" cy="300" rx="173" ry="91" transform="rotate(90 300 300)" /></g></svg></div>
          {renderSculpture && <SculptureBoundary onFallback={onFallback}><Suspense fallback={null}><Sculpture mode={mode} paused={paused || Boolean(reduce)} onReady={onReady} onFallback={onFallback} /></Suspense></SculptureBoundary>}
          <HeroScreens reduce={reduce} paused={paused} />
          <span className="studio-object__coordinate" aria-hidden="true">JC—001<br />{t('FORMA / FUNCIÓN', 'FORM / FUNCTION')}</span>
          <div className="studio-object__badge" aria-hidden="true"><span>{t('DISEÑO', 'DESIGN')}</span><svg viewBox="0 0 70 70" fill="none"><path d="M35 3V67M3 35H67M12 12L58 58M12 58L58 12" stroke="currentColor" strokeWidth="2" /></svg><span>{t('EN MOVIMIENTO', 'IN MOTION')}</span></div>
          {!reduce && ready && <button type="button" className="studio-motion-control" onClick={() => setPaused((value) => !value)} aria-pressed={paused} aria-label={paused ? t('Reanudar animación 3D', 'Resume 3D animation') : t('Pausar animación 3D', 'Pause 3D animation')}>{paused ? <Play size={13} aria-hidden="true" /> : <Pause size={13} aria-hidden="true" />}<span>{paused ? t('Reanudar', 'Resume') : t('Pausar', 'Pause')}</span></button>}
        </motion.div>
      </div>
      <div className="studio-hero__bottom">
        <div className="studio-materials"><div role="group" aria-label={t('Explorar diseño, ingeniería e inteligencia', 'Explore design, engineering and intelligence')}>{MODES.map((item, index) => <button key={item.label} type="button" onClick={() => setMode(index)} aria-pressed={mode === index}><span>0{index + 1}</span>{item.label}<i aria-hidden="true" /></button>)}</div><p aria-live="polite">{MODES[mode].description}</p></div>
        <a href={articlePath(EDITORIAL_ARTICLE, locale)} className="studio-latest"><img src="/projects/laburrada/home-desktop.webp" srcSet={shotSrcSet('/projects/laburrada/home-desktop.webp')} sizes="100px" alt={t('Menú en línea de La Burrada, una web construida por JC Analytics.', 'La Burrada’s online menu, a website built by JC Analytics.')} width={1600} height={1000} decoding="async" loading="lazy" /><span><small>{t('IDEAS PARA TU PRÓXIMO PASO', 'IDEAS FOR YOUR NEXT STEP')}</small><strong>{t('Una web que orienta', 'A website that guides')} <ArrowUpRight size={15} aria-hidden="true" /></strong></span></a>
      </div>
      <div className="studio-scroll-note"><span>{t('SCROLL PARA EXPLORAR', 'SCROLL TO EXPLORE')}</span><span aria-hidden="true">↓</span><span>{t('DISEÑAMOS LO QUE VIENE.', 'DESIGNING WHAT COMES NEXT.')}</span></div>
    </section>
  );
};
export default Hero;
