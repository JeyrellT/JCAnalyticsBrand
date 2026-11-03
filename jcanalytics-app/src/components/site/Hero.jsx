import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowDown, ArrowUpRight, MessageCircle, Pause, Play } from 'lucide-react';
import { servicePages } from '../../content/catalog';
import { servicePath } from '../../seo/routes';
import { MaskLines, Reveal } from './primitives';
import { prepareContact, wa } from './links';
import { adPackage } from '../../data/packages';
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

// Selector de categoría del hero: cinco chips, uno por página de servicio (misma lista que el menú).
const PATHS = [
  ['web-development', t('Webs y sistemas', 'Websites & systems')],
  ['process-automation', t('Automatización', 'Automation')],
  ['business-intelligence', t('Finanzas y dashboards', 'Finance & dashboards')],
  ['ai-integration', t('IA y machine learning', 'AI & machine learning')],
  ['digital-marketing', 'Marketing'],
].map(([id, label]) => ({ id, label, href: servicePath(servicePages.find((item) => item.id === id), locale) }));
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
  const [mode] = useState(0);
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
      <div className="studio-hero__main">
        <div className="studio-hero__copy">
          <Reveal className="studio-hero__lead"><p className="studio-hero__eyebrow">{t('Software, datos e IA · Costa Rica', 'Software, data & AI · Costa Rica')}</p></Reveal>
          {/* Titular acordado el 31 de octubre de 2026 (sin precio). Un solo mensaje y una acción principal: el selector
              de categoría, que lleva a la página con ejemplos, alcance y precio (revisión de neuromarketing, ventas y
              marketing del 2 de noviembre de 2026). */}
          <h1 id="hero-title"><MaskLines lines={[t('Webs y sistemas', 'Websites and systems'), <em key="time">{t('con entrega a tiempo.', 'delivered on time.')}</em>]} delay={0.1} /></h1>
          <Reveal delay={0.25} className="studio-hero__intro"><p className="studio-hero__description">{t('Software a medida, Power BI, automatización e IA para empresas en Costa Rica. Nos contás qué proceso o decisión querés mejorar; te damos alcance y precio por escrito, y ves avances cada 72 horas.', 'Custom software, Power BI, automation and AI for companies in Costa Rica. Tell us which process or decision you want to improve; you get scope and price in writing, and progress every 72 hours.')}</p></Reveal>
          <Reveal delay={0.3} className="studio-hero__paths-wrap">
            <nav className="studio-hero__paths" aria-label={t('Elegí tu categoría', 'Pick your category')}>
              <span className="studio-hero__paths-label">{t('¿Qué querés resolver? Elegí y vas directo a ejemplos, alcance y precio.', 'What do you want to solve? Pick one and go straight to examples, scope and price.')}</span>
              {PATHS.map((path) => <a key={path.id} href={path.href} data-track-label={`Hero · ${path.label}`}>{path.label}<ArrowUpRight size={13} aria-hidden="true" /></a>)}
            </nav>
          </Reveal>
          <Reveal delay={0.38} className="studio-hero__actions"><a href={wa(adPackage ? adPackage.message : t('Hola JC Analytics, quiero contarles mi caso y cotizar un proyecto para mi negocio.', 'Hi JC Analytics, I would like to tell you about my case and get a quote for my business.'))} target="_blank" rel="noreferrer" className="studio-wa" {...(adPackage ? { 'data-package': adPackage.key, 'data-value': adPackage.price } : {})}><MessageCircle size={20} aria-hidden="true" />{t('¿No sabés cuál? Contanos tu caso por WhatsApp', 'Not sure? Tell us your case on WhatsApp')}</a></Reveal>
          {adPackage && <a href="#paquetes" className="studio-hero__ad">{t(`Viste ${adPackage.name} en el anuncio · ver el paquete`, `You saw ${adPackage.name} in the ad · see the package`)} <ArrowDown size={13} aria-hidden="true" /></a>}
          <p className="studio-hero__invitation">{t('30 min sin costo · alcance y precio fijo por escrito · avances cada 72 h en tu portal · 30 días de soporte.', 'Free 30-min call · fixed written scope and price · progress every 72 h in your portal · 30 days of support.')} <a href="#contacto" className="studio-start studio-start--link" onClick={() => prepareContact({ need: 'Sistema / backend', source: t('Hero · formulario', 'Hero · form') })}>{t('¿Preferís el formulario?', 'Prefer the form?')}</a></p>
        </div>
        <motion.div className={`studio-object ${ready ? 'studio-object--ready' : ''}`} style={{ y: objectY }}>
          <div className="studio-object__halo" aria-hidden="true" />
          <div className="studio-object__fallback" aria-hidden="true"><svg viewBox="0 0 600 600" fill="none"><defs><linearGradient id="object-fallback" x1="50" y1="90" x2="500" y2="510" gradientUnits="userSpaceOnUse"><stop stopColor="#d9ffe8" /><stop offset=".3" stopColor="#426fb0" /><stop offset=".5" stopColor="#d1f9ef" /><stop offset=".72" stopColor="#30526a" /><stop offset="1" stopColor="#8cdecf" /></linearGradient></defs><g stroke="url(#object-fallback)" strokeWidth="58"><ellipse cx="300" cy="300" rx="173" ry="91" transform="rotate(-50 300 300)" /><ellipse cx="300" cy="300" rx="173" ry="91" transform="rotate(50 300 300)" /><ellipse cx="300" cy="300" rx="173" ry="91" transform="rotate(90 300 300)" /></g></svg></div>
          {renderSculpture && <SculptureBoundary onFallback={onFallback}><Suspense fallback={null}><Sculpture mode={mode} paused={paused || Boolean(reduce)} onReady={onReady} onFallback={onFallback} /></Suspense></SculptureBoundary>}
          <HeroScreens reduce={reduce} paused={paused} />
          {!reduce && ready && <button type="button" className="studio-motion-control" onClick={() => setPaused((value) => !value)} aria-pressed={paused} aria-label={paused ? t('Reanudar animación 3D', 'Resume 3D animation') : t('Pausar animación 3D', 'Pause 3D animation')}>{paused ? <Play size={13} aria-hidden="true" /> : <Pause size={13} aria-hidden="true" />}<span>{paused ? t('Reanudar', 'Resume') : t('Pausar', 'Pause')}</span></button>}
        </motion.div>
      </div>
    </section>
  );
};
export default Hero;
