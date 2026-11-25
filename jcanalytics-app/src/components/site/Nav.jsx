import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion, useScroll } from 'framer-motion';
import { Menu, X, ArrowUpRight, ArrowRight, Layers3, ChartNoAxesCombined, BrainCircuit, PanelsTopLeft, Sparkles, MessageCircle, LockKeyhole, Tag, Workflow } from 'lucide-react';
import { wa, EASE, PHONE, PHONE_DISPLAY, EMAIL, NAV_LINKS, PORTAL_URL } from './links';
import { MESSAGES } from './messages';
import { useCase } from './case';
import { adPackage, packageMessage } from '../../data/packages';
import { useDesktop } from '../../hooks/useDesktop';
import { STATIC_BOOT } from '../../boot';
import '../../styles/navigation.css';
import { t, locale } from '../../i18n/locale';
import { journalPath } from '../../seo/routes';
import LanguageSwitcher from '../ui/LanguageSwitcher';

const _MOTION = motion;
// Icono y detalle de cada destino del menú de celular, por la `key` del enlace (links.js).
const CHAPTERS = {
  projects: { icon: PanelsTopLeft, detail: t('Sistemas reales, con sus pantallas', 'Real systems, with their screens') },
  systems: { icon: Layers3, detail: t('Webs, reservas y software a medida', 'Websites, bookings and custom software') },
  automation: { icon: Workflow, detail: t('Tareas repetidas que se hacen solas', 'Repeated tasks, done automatically') },
  finance: { icon: ChartNoAxesCombined, detail: t('Power BI y análisis financiero', 'Power BI and financial analysis') },
  intelligence: { icon: BrainCircuit, detail: t('Asistentes y modelos predictivos', 'Assistants and predictive models') },
  marketing: { icon: Sparkles, detail: t('Redes, contenido y Meta Ads', 'Social media, content and Meta Ads') },
  pricing: { icon: Tag, detail: t('Paquetes con precio publicado', 'Packages with published pricing') },
};
const SECTION_NAMES = { top: t('El estudio', 'The studio'), servicios: t('Servicios', 'Services'), equipo: t('El equipo', 'The team'), proceso: t('Compromisos', 'Commitments'), paquetes: t('Precios', 'Pricing'), ideas: t('Ideas', 'Insights'), preguntas: t('Preguntas', 'Questions'), contacto: t('Contacto', 'Contact') };

// Mensaje del botón flotante de celular según lo que la persona está mirando. Antes se armaba con el nombre
// interno de la sección («estoy viendo El estudio y quiero cotizar»): nadie escribe así.
const FLOATING_MESSAGES = { '#trabajo': MESSAGES.projects, '#paquetes': MESSAGES.packages, '#proceso': MESSAGES.firstCall };
// Botones de acción principal: mientras uno está en pantalla, los flotantes de celular se retiran para no
// taparlo ni duplicarlo (antes cubrían los chips del hero y el enlace de cada paquete).
// También ante los enlaces secundarios que abren WhatsApp con otro mensaje («contanos tu caso», «te armamos
// uno»): los flotantes los tapaban un tercio y un toque ahí mandaba el mensaje genérico.
const PRIMARY_ACTIONS = '.studio-wa, .package-card__buy, .works-wa, .jca-wa, .case-matcher__wa, .contact-submit, .categories-foot__wa, .packages-foot a[href^="https://wa.me/"]';

const Brand = ({ onClick, className = '' }) => (
  <a href="#top" onClick={onClick} className={`jca-brand ${className}`} aria-label={t('JC Analytics — inicio', 'JC Analytics — home')}>
    <span className="jca-brand__mark">
      <img src={`${import.meta.env.BASE_URL}LogoMark.webp`} alt="" width={162} height={200} decoding="async" />
    </span>
    <span className="jca-brand__name">JC Analytics<span className="jca-brand__caption">{t('Software · datos · inteligencia', 'Software · data · intelligence')}</span></span>
  </a>
);

const Nav = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState('');
  const [editing, setEditing] = useState(false);
  const btnRef = useRef(null);
  const destinationRef = useRef(null);
  const menuRef = useRef(null);
  const closeRef = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 36);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll('main section[id]'));
    let frame = 0;
    const update = () => {
      frame = 0;
      const current = sections.filter(section => section.getBoundingClientRect().top <= window.innerHeight * .28).at(-1);
      setActive(current ? `#${current.id}` : '#top');
    };
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); };
  }, []);

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return undefined;
    const visible = new Set();
    const sync = () => document.body.classList.toggle('cta-in-view', visible.size > 0);
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) { if (entry.isIntersecting) visible.add(entry.target); else visible.delete(entry.target); }
      sync();
    }, { threshold: 0.6 });
    const watch = () => {
      // Un botón que salió del documento estando a la vista (el formulario al confirmarse) deja de contar.
      for (const node of visible) if (!node.isConnected) visible.delete(node);
      sync();
      document.querySelectorAll(PRIMARY_ACTIONS).forEach((node) => observer.observe(node));
    };
    watch();
    // Los paquetes que se despliegan después («Ver los 10») y las tarjetas que cambian también cuentan.
    const late = window.setInterval(watch, 2500);
    // Elegir en «Tu caso en una frase» hace aparecer su botón verde: se revisa enseguida, sin esperar el ciclo.
    let soon = 0;
    const onChange = () => { window.clearTimeout(soon); soon = window.setTimeout(watch, 150); };
    document.addEventListener('change', onChange);
    return () => { window.clearInterval(late); window.clearTimeout(soon); document.removeEventListener('change', onChange); observer.disconnect(); document.body.classList.remove('cta-in-view'); };
  }, []);

  useEffect(() => {
    let frame;
    const update = () => {
      const isEditing = Boolean(document.activeElement?.matches('input, textarea, select, [contenteditable="true"]'));
      setEditing(isEditing);
      document.body.classList.toggle('mobile-input-active', isEditing);
    };
    const onBlur = () => { frame = window.requestAnimationFrame(update); };
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', onBlur);
    return () => { window.cancelAnimationFrame(frame); document.removeEventListener('focusin', update); document.removeEventListener('focusout', onBlur); document.body.classList.remove('mobile-input-active'); };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const opener = btnRef.current;
    const dialog = menuRef.current;
    if (dialog) dialog.inert = false;
    const previousOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    const scrollPosition = window.scrollY;
    const previousPosition = document.body.style.position;
    const previousTop = document.body.style.top;
    const previousWidth = document.body.style.width;
    const backgrounds = Array.from(document.querySelectorAll('main, footer, .assistant-launcher'));
    const previousInert = backgrounds.map((node) => node.inert);
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollPosition}px`;
    document.body.style.width = '100%';
    backgrounds.forEach((node) => { node.inert = true; });
    window.dispatchEvent(new CustomEvent('jca:menu-state', { detail: { open: true } }));
    const frame = window.requestAnimationFrame(() => closeRef.current?.focus());

    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
      }
      if (event.key !== 'Tab') return;
      const items = Array.from(dialog?.querySelectorAll('a[href], button:not([disabled]), [tabindex="0"]') ?? [])
        .filter((node) => node.getClientRects().length > 0);
      const first = items[0];
      const last = items[items.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || !dialog?.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog?.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    const onResize = () => { if (window.innerWidth >= 1024) setOpen(false); };
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      window.cancelAnimationFrame(frame);
      if (dialog) dialog.inert = true;
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
      document.body.style.position = previousPosition;
      document.body.style.top = previousTop;
      document.body.style.width = previousWidth;
      backgrounds.forEach((node, index) => { node.inert = previousInert[index]; });
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      window.dispatchEvent(new CustomEvent('jca:menu-state', { detail: { open: false } }));
      window.scrollTo({ top: scrollPosition, behavior: 'instant' });
      const destination = destinationRef.current;
      destinationRef.current = null;
      if (destination) {
        window.requestAnimationFrame(() => {
          const section = document.querySelector(destination);
          const heading = section?.querySelector('h1, h2') ?? section;
          heading?.setAttribute('tabindex', '-1');
          heading?.focus({ preventScroll: true });
          section?.scrollIntoView({ behavior: reduce ? 'instant' : 'smooth', block: 'start' });
          window.history.pushState(null, '', destination);
        });
      } else opener?.focus({ preventScroll: true });
    };
  }, [open, reduce]);

  const openMenu = (event) => { btnRef.current = event.currentTarget; setOpen(true); };
  // Un ancla de la portada se visita al cerrar el menú (con foco y desplazamiento); otra página navega normal.
  const visit = (event, href) => { if (!href.startsWith('#')) { setOpen(false); return; } event.preventDefault(); destinationRef.current = href; setOpen(false); };
  const currentIndex = NAV_LINKS.findIndex(link => link.href === active);
  const currentName = NAV_LINKS[currentIndex]?.label ?? SECTION_NAMES[active.slice(1)] ?? t('El estudio', 'The studio');
  // En computadora el botón abre el formulario corto: el rótulo no promete WhatsApp.
  const desktop = useDesktop();
  // «Cotizar» sale con la frase de «Tu caso en una frase» si la persona ya la armó (case.js).
  const ownCase = useCase();
  const quote = ownCase.sentence ? MESSAGES.caseQuote(ownCase.sentence, ownCase.pack) : MESSAGES.quote;
  const quoteNeed = ownCase.chosenGoal?.need ?? 'Otro';
  // Quien llegó por el anuncio de un paquete conserva ese pedido en el flotante; el resto, según la sección.
  const floating = adPackage
    ? { href: wa(ownCase.packSentence ? packageMessage(adPackage, { sentence: ownCase.packSentence }) : adPackage.message), 'data-need': adPackage.need, 'data-package': adPackage.key, 'data-value': adPackage.price, 'data-package-label': adPackage.name }
    : { href: wa(FLOATING_MESSAGES[active] ?? quote), 'data-need': FLOATING_MESSAGES[active] ? 'Otro' : quoteNeed };

  return (
    <>
      <motion.header initial={reduce || STATIC_BOOT ? false : { y: -24, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: EASE, delay: 0.12 }}
        className={`jca-navigation ${scrolled ? 'jca-navigation--scrolled' : ''}`} aria-hidden={open || undefined} inert={open || undefined} data-track-section="menu">
        <div className="jca-navigation__bar">
          <Brand />
          <span className="jca-navigation__chapter" aria-hidden="true">{currentName}</span>
          <nav className="jca-navigation__links" aria-label={t('Navegación principal', 'Main navigation')}>
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="jca-navigation__link" aria-current={active === link.href ? 'location' : undefined}>
                {link.short}<span aria-hidden="true" />
              </a>
            ))}
          </nav>
          {/* La barra es de quien viene a comprar: categorías, proyectos, precios, idioma y una acción. El ingreso
              del equipo y las ideas viven en el pie y en el menú de celular (auditoría, nov. 2026). */}
          <div className="jca-navigation__actions">
            <LanguageSwitcher />
            <a href={wa(quote)} target="_blank" rel="noreferrer" className="jca-nav-contact" data-need={quoteNeed} data-track-label="Menú · Cotizar">
              {desktop ? t('Pedir cotización', 'Request a quote') : t('Cotizar', 'Get a quote')}<span aria-hidden="true"><ArrowUpRight size={17} strokeWidth={2.1} /></span>
            </a>
            <button type="button" onClick={openMenu} aria-label={t('Abrir menú', 'Open menu')} aria-expanded={open} aria-controls="menu-movil" className="jca-menu-button">
              <Menu size={21} strokeWidth={1.6} />
            </button>
          </div>
          <motion.span className="jca-navigation__progress" style={{ scaleX: scrollYProgress }} aria-hidden="true" />
        </div>
      </motion.header>

      {/* En celular no hay barra inferior: un botón de WhatsApp con nombre, pegado a la esquina. Se retira
          mientras hay un botón principal en pantalla (body.cta-in-view) y dentro del formulario de contacto. */}
      <a className="mobile-wa" {...floating} target="_blank" rel="noreferrer" data-track-section="flotante" data-track-label={`Flotante · WhatsApp · ${active.slice(1) || 'top'}`} aria-label={t('Cotizar por WhatsApp', 'Get a quote on WhatsApp')} aria-hidden={open || editing || active === '#contacto' || undefined} inert={open || editing || active === '#contacto' || undefined}><MessageCircle size={22} aria-hidden="true" /><span>{t('Cotizar', 'Quote')}</span></a>

      <AnimatePresence>
        {open && (
          <motion.div className="jca-menu-layer" key="menu-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : .2 }}>
          <div className="jca-menu-backdrop" aria-hidden="true" onClick={() => setOpen(false)} />
          <motion.div key="menu-movil" ref={menuRef} id="menu-movil" data-track-section="menu-celular" role="dialog" aria-modal="true" aria-label={t('Menú principal', 'Main menu')} data-lenis-prevent
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? { opacity: 0 } : { opacity: 0, y: -16 }}
            transition={{ duration: reduce ? 0.12 : 0.4, ease: EASE }} className="jca-menu">
            <div className="jca-menu__top">
              <Brand onClick={(event) => visit(event, '#top')} />
              <button ref={closeRef} type="button" onClick={() => setOpen(false)} aria-label={t('Cerrar menú', 'Close menu')} className="jca-menu-button jca-menu-button--close"><X size={23} strokeWidth={1.6} /></button>
            </div>
            <div className="jca-menu__access">
              <LanguageSwitcher />
              {/* Para quien ya es cliente. El ingreso del equipo quedó en el pie. */}
              <a className="jca-menu__portal" href={`${PORTAL_URL}/cliente`} target="_blank" rel="noreferrer" onClick={() => setOpen(false)} data-track-label="Menú de celular · Portal de clientes">
                <LockKeyhole size={16} strokeWidth={2} aria-hidden="true" />{t('Portal de clientes', 'Client portal')}<ArrowUpRight size={16} aria-hidden="true" />
              </a>
            </div>
            <div className="jca-menu__eyebrow"><span aria-hidden="true" />{t('ESTÁS EN:', 'YOU ARE HERE:')} {currentName}</div>
            <p className="jca-menu__title">{t('Elegí tu', 'Choose your')} <em>{t('próximo paso.', 'next step.')}</em></p>
            <nav className="jca-menu__links" aria-label={t('Navegación móvil', 'Mobile navigation')}>
              {NAV_LINKS.map((link, index) => (
                <motion.a key={link.href} href={link.href} onClick={(event) => visit(event, link.href)} initial={reduce ? false : { y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.12 + index * 0.045, duration: 0.45, ease: EASE }} aria-current={active === link.href ? 'location' : undefined}>
                  <span className="jca-menu__number">0{index + 1}</span><span className="jca-menu__icon" aria-hidden="true">{(() => { const Icon = CHAPTERS[link.key].icon; return <Icon size={22} strokeWidth={1.3} />; })()}</span><span>{link.label}<small>{CHAPTERS[link.key].detail}</small></span><ArrowUpRight size={24} strokeWidth={1.3} aria-hidden="true" />
                </motion.a>
              ))}
            </nav>
            <div className="jca-menu__shortcuts"><a href="#proceso" onClick={(event) => visit(event, '#proceso')}>{t('Cómo trabajamos', 'How we work')} <ArrowRight size={15} aria-hidden="true" /></a><a href="#contacto" onClick={(event) => visit(event, '#contacto')}>{t('Contacto', 'Contact')} <ArrowRight size={15} aria-hidden="true" /></a><a href="#equipo" onClick={(event) => visit(event, '#equipo')}>{t('El equipo', 'The team')} <ArrowRight size={15} aria-hidden="true" /></a><a href={journalPath(locale)} onClick={() => setOpen(false)}>{t('Ideas', 'Insights')} <ArrowRight size={15} aria-hidden="true" /></a></div>
            <div className="jca-menu__bottom">
              <a href={wa(quote)} target="_blank" rel="noreferrer" onClick={() => setOpen(false)} className="jca-menu__contact" data-need={quoteNeed} data-track-label="Menú de celular · Cotizar">
                {desktop ? t('Pedir cotización', 'Request a quote') : t('Cotizar por WhatsApp', 'Get a quote on WhatsApp')}<span aria-hidden="true"><ArrowUpRight size={21} /></span>
              </a>
              <div className="jca-menu__details"><a href={`mailto:${EMAIL}`}>{EMAIL}</a><a href={`tel:+${PHONE}`}>{PHONE_DISPLAY}</a></div>
              <span className="jca-menu__location">{t('Costa Rica · Ideas sin fronteras', 'Costa Rica · Ideas without borders')}</span>
            </div>
          </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Nav;
