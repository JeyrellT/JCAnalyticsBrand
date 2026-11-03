import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowDown, ArrowUpRight, MessageCircle, Pause, Play } from 'lucide-react';
import { servicePages } from '../../content/catalog';
import { servicePath } from '../../seo/routes';
import { MaskLines, Reveal } from './primitives';
import { prepareContact, wa } from './links';
import { adPackage } from '../../data/packages';
import { PROJECTS, screenImage } from '../../data/projects';
import { useDesktop } from '../../hooks/useDesktop';
import { shotSrcSet } from '../../data/shots';
import '../../styles/packages.css';
import '../../styles/hero.css';
import { t, locale } from '../../i18n/locale';

const _MOTION = motion;

// Pantallas reales de proyectos del estudio (3 de noviembre de 2026): el objeto 3D de la portada se
// cambió por un dispositivo que muestra sistemas que existen. En computadora es una laptop con la
// captura de escritorio (1440 px) y en celular un teléfono con la captura móvil (390 px) de la misma
// pantalla; el navegador elige una u otra con <picture>, así el HTML estático es el mismo en ambos.
// Nombre, dirección pública y color salen de data/projects.js; acá solo va el texto corto.
const SCREENS = [
  ['laburrada', 'home', t('Menú público con pedidos en línea y pago por SINPE', 'Public menu with online orders and SINPE payment')],
  ['multiagencia', 'tienda', t('Tienda en línea de repuestos con precios en colones', 'Online parts store with prices in colones')],
  ['barberxcr', 'landing', t('Reservas 24/7 con agenda por barbero', '24/7 bookings with a per-barber agenda')],
  ['transportesluna', 'admin', t('Resumen del transportista: unidades y facturación del día', 'Operator overview: vehicles and today’s billing')],
  ['silglobal', 'hero', t('Catálogo mayorista con cotización por WhatsApp', 'Wholesale catalogue with WhatsApp quotes')],
  ['crimson', 'facturas', t('Factura electrónica v4.4 firmada en tiempo real', 'Signed e-invoicing v4.4 in real time')],
].map(([id, screen, caption]) => {
  const project = PROJECTS.find((item) => item.id === id);
  return {
    key: `${id}/${screen}`,
    name: project.name,
    accent: project.accent,
    url: project.url ? project.url.replace(/^https?:\/\//, '').replace(/\/$/, '') : null,
    caption,
    desktop: screenImage(project, screen, 'desktop'),
    mobile: screenImage(project, screen, 'mobile'),
  };
});
const SCREEN_MS = 3600;
const COUNT = SCREENS.length;
const pad = (value) => String(value).padStart(2, '0');

// Selector de categoría del hero: cinco chips, uno por página de servicio (misma lista que el menú).
const PATHS = [
  ['web-development', t('Webs y sistemas', 'Websites & systems')],
  ['process-automation', t('Automatización', 'Automation')],
  ['business-intelligence', t('Finanzas y dashboards', 'Finance & dashboards')],
  ['ai-integration', t('IA y machine learning', 'AI & machine learning')],
  ['digital-marketing', 'Marketing'],
].map(([id, label]) => ({ id, label, href: servicePath(servicePages.find((item) => item.id === id), locale) }));

const HeroDevice = ({ reduce }) => {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
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
    const id = window.setInterval(() => setIndex((value) => (value + 1) % COUNT), SCREEN_MS);
    return () => window.clearInterval(id);
  }, [reduce, paused, onScreen]);
  const current = SCREENS[index];
  // Solo la pantalla anterior (para el fundido), la actual y la siguiente existen en el DOM.
  const mounted = (k) => k === index || k === (index + 1) % COUNT || k === (index + COUNT - 1) % COUNT;
  return (
    <div ref={ref} className="hero-device" role="group" aria-label={t('Pantallas reales de proyectos', 'Real project screens')}>
      <div className="hero-device__frame" style={{ '--project-color': current.accent }}>
        <div className="hero-device__screen">
          <div className="hero-device__display">
            <div className="hero-device__chrome" aria-hidden="true"><span /><span /><span /><em>{current.url ?? t('entorno de demostración', 'demo environment')}</em></div>
            <div className="hero-device__shots">
              {SCREENS.map((item, k) => mounted(k) && (
                <picture key={item.key} className={k === index ? 'is-on' : ''}>
                  <source media="(max-width: 767px)" srcSet={shotSrcSet(item.mobile)} sizes="45vw" width={640} height={1385} />
                  <img src={item.desktop} srcSet={shotSrcSet(item.desktop)} sizes="(max-width: 767px) 45vw, (max-width: 1100px) 50vw, 640px" width={1600} height={1000}
                    loading={k === 0 ? 'eager' : 'lazy'} fetchPriority={k === 0 ? 'high' : undefined} decoding="async" alt="" />
                </picture>
              ))}
            </div>
            <div className="hero-device__bars" aria-hidden="true">{SCREENS.map((item, k) => <i key={item.key} className={k === index ? 'is-on' : k < index ? 'is-done' : ''} style={{ '--ms': `${SCREEN_MS}ms` }} />)}</div>
          </div>
        </div>
        <div className="hero-device__base" aria-hidden="true" />
      </div>
      <div className="hero-device__caption">
        <small>{t('PANTALLA REAL', 'REAL SCREEN')} · {pad(index + 1)}/{pad(COUNT)}</small>
        <strong>{current.name}</strong>
        <span>{current.caption}</span>
        <div className="hero-device__controls">
          <button type="button" onClick={() => setIndex((value) => (value + 1) % COUNT)} aria-label={t('Siguiente pantalla', 'Next screen')}>{t('Siguiente', 'Next')} <ArrowUpRight size={13} aria-hidden="true" /></button>
          {!reduce && <button type="button" onClick={() => setPaused((value) => !value)} aria-pressed={paused} aria-label={paused ? t('Reanudar el cambio de pantallas', 'Resume the screen rotation') : t('Pausar el cambio de pantallas', 'Pause the screen rotation')}>{paused ? <Play size={12} aria-hidden="true" /> : <Pause size={12} aria-hidden="true" />}{paused ? t('Reanudar', 'Resume') : t('Pausar', 'Pause')}</button>}
        </div>
      </div>
    </div>
  );
};

const Hero = () => {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  // En computadora el botón abre el formulario corto (ui/LeadDialog.jsx), no WhatsApp Web: el texto lo dice.
  const desktop = useDesktop();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const objectY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 90]);
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
          <Reveal delay={0.38} className="studio-hero__actions"><a href={wa(adPackage ? adPackage.message : t('Hola JC Analytics, quiero contarles mi caso y cotizar un proyecto para mi negocio.', 'Hi JC Analytics, I would like to tell you about my case and get a quote for my business.'))} target="_blank" rel="noreferrer" className="studio-wa" data-need={adPackage ? adPackage.need : 'Otro'} {...(adPackage ? { 'data-package': adPackage.key, 'data-value': adPackage.price, 'data-package-label': adPackage.name } : {})}><MessageCircle size={20} aria-hidden="true" />{desktop ? t('¿No sabés cuál? Pedir cotización', 'Not sure? Request a quote') : t('¿No sabés cuál? Contanos tu caso por WhatsApp', 'Not sure? Tell us your case on WhatsApp')}</a></Reveal>
          {adPackage && <a href="#paquetes" className="studio-hero__ad">{t(`Viste ${adPackage.name} en el anuncio · ver el paquete`, `You saw ${adPackage.name} in the ad · see the package`)} <ArrowDown size={13} aria-hidden="true" /></a>}
          <p className="studio-hero__invitation">{t('30 min sin costo · alcance y precio fijo por escrito · avances cada 72 h en tu portal · 30 días de soporte.', 'Free 30-min call · fixed written scope and price · progress every 72 h in your portal · 30 days of support.')} <a href="#contacto" className="studio-start studio-start--link" onClick={() => prepareContact({ need: 'Sistema / backend', source: t('Hero · formulario', 'Hero · form') })}>{t('¿Preferís el formulario?', 'Prefer the form?')}</a></p>
        </div>
        <motion.div className="studio-object" style={{ y: objectY }}>
          <div className="studio-object__halo" aria-hidden="true" />
          <HeroDevice reduce={reduce} />
        </motion.div>
      </div>
    </section>
  );
};
export default Hero;
