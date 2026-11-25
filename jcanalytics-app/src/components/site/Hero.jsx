import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowDown, ArrowRight, Check, Pause, Play } from 'lucide-react';
import { MaskLines, Reveal } from './primitives';
import { CATEGORY_LINKS, prepareContact, wa } from './links';
import { MESSAGES } from './messages';
import { useCase } from './case';
import ContactIcon from './ContactIcon';
import { ByPointer } from './pointer';
import { adPackage, packageMessage } from '../../data/packages';
import { PROJECTS, screenImage } from '../../data/projects';
import { useDesktop } from '../../hooks/useDesktop';
import { shotSrcSet } from '../../data/shots';
import { COARSE_ONLY, STATIC_BOOT } from '../../boot';
import '../../styles/packages.css';
import '../../styles/hero.css';
import { t } from '../../i18n/locale';

const _MOTION = motion;

// ============================================================================
//  Una pantalla real por categoría (auditoría de noviembre de 2026).
//
//  Antes el dispositivo rotaba seis pantallas por reloj, cada 3,6 s, al lado de
//  los cinco chips: dos cosas que competían. Ahora son una sola: cada chip tiene
//  su pantalla y el dispositivo es la vista previa de la elección. Al pasar el
//  cursor o enfocar un chip se muestra la pantalla real de esa categoría; sin
//  interacción da una sola vuelta lenta y se detiene.
//
//  En computadora es una laptop con la captura de escritorio (1440 px) y en
//  celular un teléfono con la captura móvil (390 px); el navegador elige una u
//  otra con <picture>, así el HTML estático es el mismo en ambos. Nombre,
//  dirección pública y color salen de data/projects.js. La pieza de marketing es
//  una publicación real en las redes de un cliente y se muestra completa.
// ============================================================================
const SHOTS = {
  'web-development': { project: 'laburrada', screen: 'home', caption: t('Menú público con pedidos en línea y pago por SINPE', 'Public menu with online orders and SINPE payment') },
  'process-automation': { project: 'multiagencia', screen: 'venta', caption: t('La venta descuenta el inventario y genera la factura en un paso', 'A sale deducts inventory and generates the invoice in one step') },
  'business-intelligence': { project: 'transportesluna', screen: 'admin', caption: t('Unidades, facturación del día y pendientes en un solo panel', 'Vehicles, today’s billing and pending items in one panel') },
  'ai-integration': { project: 'transportesluna', screen: 'rutas', mobile: 'usuario', caption: t('Rutas de personal armadas por un optimizador y revisadas con IA', 'Staff routes built by an optimizer and reviewed with AI') },
  'digital-marketing': { project: 'transportesluna', image: `${import.meta.env.BASE_URL}marketing/luna-post-029.webp`, caption: t('Pieza publicada en las redes de un cliente', 'A piece published on a client’s social media') },
};
const SCREENS = CATEGORY_LINKS.map((category) => {
  const shot = SHOTS[category.id];
  const project = PROJECTS.find((item) => item.id === shot.project);
  return {
    key: category.id,
    category: category.label,
    href: category.href,
    id: shot.image ? null : project.id,
    screen: shot.screen,
    name: project.name,
    accent: project.accent,
    url: !shot.image && project.url ? project.url.replace(/^https?:\/\//, '').replace(/\/$/, '') : null,
    caption: shot.caption,
    whole: Boolean(shot.image),
    desktop: shot.image ?? screenImage(project, shot.screen, 'desktop'),
    mobile: shot.image ?? screenImage(project, shot.mobile ?? shot.screen, 'mobile'),
  };
});
const SCREEN_MS = 7000;
const COUNT = SCREENS.length;

// El dispositivo es también la puerta a la prueba: al tocarlo, el explorador de proyectos abre ese mismo
// proyecto en esa misma pantalla (Work.jsx escucha `jca:show-project`). Sin JavaScript baja a #proyecto.
const showProject = (item) => window.dispatchEvent(new CustomEvent('jca:show-project', { detail: { id: item.id, screen: item.screen } }));

const HeroDevice = ({ index, setIndex, paused, setPaused, reduce, finished, warm }) => {
  const current = SCREENS[index];
  // Al cargar existe solo la pantalla actual: las vecinas (la anterior para el fundido y la siguiente) se montan
  // cuando la rotación está por empezar o la persona interactúa. Antes se descargaban tres desde el inicio.
  const mounted = (k) => k === index || (warm && (k === (index + 1) % COUNT || k === (index + COUNT - 1) % COUNT));
  const frame = (
    <>
      <div className="hero-device__screen">
        <div className="hero-device__display">
          <div className="hero-device__chrome" aria-hidden="true"><span /><span /><span /><em>{current.url ?? t('entorno de demostración', 'demo environment')}</em></div>
          <div className="hero-device__shots">
            {SCREENS.map((item, k) => mounted(k) && (
              <picture key={item.key} className={`${k === index ? 'is-on' : ''} ${item.whole ? 'is-whole' : ''}`}>
                <source media="(max-width: 767px)" srcSet={shotSrcSet(item.mobile)} sizes="45vw" width={640} height={1385} />
                <img src={item.desktop} srcSet={shotSrcSet(item.desktop)} sizes="(max-width: 767px) 45vw, (max-width: 1100px) 50vw, 640px" width={item.whole ? 720 : 1600} height={item.whole ? 900 : 1000}
                  loading={k === 0 ? 'eager' : 'lazy'} decoding="async" alt="" />
              </picture>
            ))}
          </div>
        </div>
      </div>
      <div className="hero-device__base" aria-hidden="true" />
    </>
  );
  return (
    <div className="hero-device" role="group" aria-label={t('Pantallas reales de proyectos, una por categoría', 'Real project screens, one per category')}>
      {current.id ? (
        <a className="hero-device__frame" href="#proyecto" style={{ '--project-color': current.accent }} onClick={() => showProject(current)}
          aria-label={t(`Ver el proyecto ${current.name} con sus pantallas`, `See the ${current.name} project and its screens`)} data-track-label={`Hero · Proyecto ${current.name}`}>{frame}</a>
      ) : (
        <a className="hero-device__frame" href={current.href} style={{ '--project-color': current.accent }}
          aria-label={t(`Ver ${current.category} con piezas reales`, `See ${current.category} with real pieces`)} data-track-label={`Hero · Pieza ${current.category}`}>{frame}</a>
      )}
      <div className="hero-device__caption">
        <small>{current.category} · {t('proyecto real', 'real project')} {index + 1} {t('de', 'of')} {COUNT}</small>
        <strong>{current.name}</strong>
        <span>{current.caption}</span>
        <div className="hero-device__dots" aria-hidden="true">{SCREENS.map((item, k) => <i key={item.key} className={k === index ? 'is-on' : ''} />)}</div>
        <div className="hero-device__controls">
          <button type="button" onClick={() => setIndex((value) => (value + 1) % COUNT)} aria-label={t('Siguiente pantalla', 'Next screen')}>{t('Siguiente', 'Next')} <ArrowRight size={13} aria-hidden="true" /></button>
          {!reduce && !finished && <button type="button" onClick={() => setPaused((value) => !value)} aria-label={paused ? t('Reanudar el cambio de pantallas', 'Resume the screen rotation') : t('Pausar el cambio de pantallas', 'Pause the screen rotation')}>{paused ? <Play size={12} aria-hidden="true" /> : <Pause size={12} aria-hidden="true" />}{paused ? t('Reanudar', 'Resume') : t('Pausar', 'Pause')}</button>}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
//  Primera pantalla (auditoría de noviembre de 2026). Tres cosas, en este orden:
//    1. Para quién es y qué hace el estudio (eyebrow, titular acordado, una frase).
//    2. Una acción para cualquiera: pedir cotización. El botón ya no se presenta
//       como la salida del indeciso («¿No sabés cuál?») y debajo dice qué pasa
//       después del clic.
//    3. El atajo por categoría para quien ya sabe su caso, con su pantalla real.
//  Con ?p=<paquete> (visita de un anuncio) la pantalla refleja el anuncio: nombra
//  el paquete, el botón lo pide y la pantalla de su categoría va primero. Antes el
//  botón decía «¿No sabés cuál?» y enviaba el pedido del paquete.
// ============================================================================
const Hero = () => {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  // En computadora el botón abre el formulario corto (ui/LeadDialog.jsx), no WhatsApp Web: el texto lo dice.
  const desktop = useDesktop();
  // Si la persona ya armó «Tu caso en una frase», el botón principal sale con esa frase (case.js).
  const visit = useCase();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const objectY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 90]);
  const still = STATIC_BOOT;

  const first = adPackage ? Math.max(0, SCREENS.findIndex((item) => item.key === adPackage.category)) : 0;
  const [index, setIndex] = useState(first);
  const [paused, setPaused] = useState(false);
  const [engaged, setEngaged] = useState(false); // el puntero o el foco están en el hero: nada cambia solo
  const [finished, setFinished] = useState(false); // ya dio su vuelta
  const [onScreen, setOnScreen] = useState(true);
  const [warm, setWarm] = useState(false); // las pantallas vecinas se montan recién cuando van a hacer falta
  // Solo rota mientras el hero se ve: fuera de pantalla no hay temporizador ni renders.
  useEffect(() => {
    const node = ref.current;
    if (!node || !('IntersectionObserver' in window)) return undefined;
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (reduce || paused || engaged || finished || !onScreen) return undefined;
    const id = window.setInterval(() => setIndex((value) => {
      const next = (value + 1) % COUNT;
      if (next === first) setFinished(true); // una vuelta completa y se queda en la primera
      return next;
    }), SCREEN_MS);
    return () => window.clearInterval(id);
  }, [reduce, paused, engaged, finished, onScreen, first]);
  useEffect(() => {
    if (warm || reduce || !onScreen) return undefined;
    const id = window.setTimeout(() => setWarm(true), SCREEN_MS - 1500);
    return () => window.clearTimeout(id);
  }, [warm, reduce, onScreen]);
  // Elegir con el cursor o el teclado muestra la pantalla de esa categoría y apaga la rotación.
  const preview = (k) => { setIndex(k); setFinished(true); };

  const paths = adPackage ? [...CATEGORY_LINKS].sort((a, b) => Number(b.id === adPackage.category) - Number(a.id === adPackage.category)) : CATEGORY_LINKS;
  return (
    <section id="top" ref={ref} className="studio-hero" aria-labelledby="hero-title">
      <div className="studio-hero__grain" aria-hidden="true" />
      <div className="studio-hero__main" onPointerEnter={() => { setEngaged(true); setWarm(true); }} onPointerLeave={() => setEngaged(false)} onFocus={() => { setEngaged(true); setWarm(true); }} onBlur={() => setEngaged(false)}>
        <div className="studio-hero__copy">
          <Reveal still={still} className="studio-hero__lead"><p className="studio-hero__eyebrow">{adPackage
            ? <>{t('Viste en el anuncio:', 'From the ad:')} <strong>{adPackage.name}</strong></>
            : t('Para comercios, PYMES y equipos de finanzas · Costa Rica', 'For shops, small businesses and finance teams · Costa Rica')}</p></Reveal>
          {/* Titular acordado el 31 de octubre de 2026 (sin precio). */}
          <h1 id="hero-title"><MaskLines still={still} lines={[t('Webs y sistemas', 'Websites and systems'), <em key="time">{t('con entrega a tiempo.', 'delivered on time.')}</em>]} delay={0.1} /></h1>
          <Reveal still={still} delay={0.25} className="studio-hero__intro">
            {adPackage ? (
              <p className="studio-hero__description">{adPackage.pitch} {t(`Entrega en ${adPackage.time}, con alcance y precio fijo por escrito antes de empezar.`, `Delivered in ${adPackage.time}, with fixed scope and price in writing before we start.`)}</p>
            ) : (
              // La primera frase dice qué resuelve, con palabras de quien compra, y es la única en celular. La lista
              // de servicios queda para computadora: en celular la repiten los atajos de abajo y, sola, se leía
              // como un inventario del estudio (segunda ronda de la auditoría, noviembre de 2026).
              <p className="studio-hero__description">{t('Para recibir pedidos y reservas en línea, dejar de repetir tareas a mano y ver tus números al día.', 'To take orders and bookings online, stop repeating tasks by hand and see up-to-date numbers.')}<span className="studio-hero__description-more"> {t('Páginas web, sistemas a medida, dashboards Power BI, automatización, IA y marketing, con el precio por escrito antes de empezar.', 'Websites, custom systems, Power BI dashboards, automation, AI and marketing, with the price in writing before we start.')}</span></p>
            )}
          </Reveal>

          <Reveal still={still} delay={0.3} className="studio-hero__actions">
            {adPackage ? (
              <a href={wa(visit.packSentence ? packageMessage(adPackage, { sentence: visit.packSentence }) : adPackage.message)} target="_blank" rel="noreferrer" className="studio-wa" data-need={adPackage.need} data-package={adPackage.key} data-value={adPackage.price} data-package-label={adPackage.name} data-track-label={`Hero · Lo quiero · ${adPackage.key}`}>
                <ContactIcon size={20} /><span>{t('Lo quiero:', 'I want it:')} {adPackage.name}</span>
              </a>
            ) : (
              <a href={wa(visit.sentence ? MESSAGES.caseQuote(visit.sentence, visit.pack) : MESSAGES.quote)} target="_blank" rel="noreferrer" className="studio-wa" data-need={visit.chosenGoal?.need ?? 'Otro'} data-track-label="Hero · Cotizar">
                <ContactIcon size={20} /><span><ByPointer fine={t('Pedir cotización', 'Request a quote')} coarse={t('Cotizar por WhatsApp', 'Get a quote on WhatsApp')} /></span>
              </a>
            )}
            {adPackage && <a href={`#paquete-${adPackage.key}`} className="studio-hero__more" data-track-label="Hero · Ver el paquete del anuncio">{t('Ver qué incluye y el precio', 'See what is included and the price')} <ArrowDown size={14} aria-hidden="true" /></a>}
          </Reveal>
          {/* Qué pasa después del clic, con hechos ya publicados. */}
          <ul className="studio-hero__assurances">
            <li><Check size={14} aria-hidden="true" />{t('Respondemos en menos de 24 h', 'We reply within 24 hours')}</li>
            <li><Check size={14} aria-hidden="true" />{t('Primera conversación de 30 min sin costo', 'Free 30-minute first conversation')}</li>
            <li><Check size={14} aria-hidden="true" />{t('Alcance y precio fijo por escrito', 'Fixed scope and price in writing')}</li>
          </ul>
          {/* Sin anuncio esta línea solo existe en celular: en el HTML estático queda oculta en computadora. */}
          {(adPackage || !desktop) && (
            <p className={`studio-hero__invitation ${adPackage ? '' : COARSE_ONLY}`}>
              {adPackage && <a href={wa(MESSAGES.quote)} target="_blank" rel="noreferrer" className="studio-hero__alt" data-need="Otro" data-track-label="Hero · Otro caso">{t('¿Tu caso es otro? Contanos y lo cotizamos', 'Different case? Tell us and we’ll quote it')}</a>}
              {adPackage && !desktop && ' · '}
              {/* En computadora el botón de arriba ya abre un formulario; esta alternativa solo existe en celular. */}
              {!desktop && <a href="#contacto" className="studio-start studio-start--link" onClick={() => prepareContact({ source: t('Hero · formulario', 'Hero · form'), form: true })} data-track-label="Hero · Formulario">{t('¿Sin WhatsApp? Dejanos tu contacto', 'No WhatsApp? Leave us your details')}</a>}
            </p>
          )}

          <Reveal still={still} delay={0.38} className="studio-hero__paths-wrap">
            <nav className="studio-hero__paths" aria-label={t('Elegí tu categoría', 'Pick your category')}>
              <span className="studio-hero__paths-label">{adPackage ? t('¿Buscabas otra cosa? Elegí tu categoría:', 'Looking for something else? Pick your category:') : t('O elegí tu caso y mirá ejemplos, alcance y precio:', 'Or pick your case to see examples, scope and price:')}</span>
              {paths.map((path) => {
                const k = SCREENS.findIndex((item) => item.key === path.id);
                return <a key={path.id} href={path.href} className={k === index ? 'is-shown' : ''} onPointerEnter={() => preview(k)} onFocus={() => preview(k)} data-track-label={`Hero · ${path.label}`}>{path.label}<ArrowRight size={14} aria-hidden="true" /></a>;
              })}
            </nav>
          </Reveal>
        </div>
        <motion.div className="studio-object" style={{ y: objectY }}>
          <div className="studio-object__halo" aria-hidden="true" />
          <HeroDevice index={index} setIndex={(value) => { setFinished(true); setIndex(value); }} paused={paused} setPaused={setPaused} reduce={reduce} finished={finished} warm={warm} />
        </motion.div>
      </div>
    </section>
  );
};
export default Hero;
