import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion, useScroll } from 'framer-motion';
import { Menu, X, ArrowUpRight, ArrowRight, Grid2X2, Layers3, ChartNoAxesCombined, BrainCircuit, PanelsTopLeft, Sparkles, MessageCircle } from 'lucide-react';
import { wa, EASE, PHONE, EMAIL, NAV_LINKS, prepareContact } from './links';
import '../../styles/navigation.css';

const _MOTION = motion;
const CHAPTERS = [
  { icon: Layers3, detail: 'Web + backend', need: 'Sistema / backend' },
  { icon: ChartNoAxesCombined, detail: 'Datos que orientan', need: 'Dashboard' },
  { icon: BrainCircuit, detail: 'Ideas con inteligencia', need: 'Integración de IA' },
  { icon: PanelsTopLeft, detail: 'Del estudio al mundo', need: 'Sistema / backend' },
  { icon: Sparkles, detail: 'Marcas que conectan', need: 'Marketing digital' },
  { icon: MessageCircle, detail: 'Tu siguiente paso', need: 'Sistema / backend' },
];
const SECTION_NAMES = { top: 'El estudio', empezar: 'Tu proyecto', servicios: 'Servicios', automatizacion: 'Automatización', equipo: 'El equipo', proceso: 'El proceso', cotizar: 'Cotizador' };

const Brand = ({ onClick, className = '' }) => (
  <a href="#top" onClick={onClick} className={`jca-brand ${className}`} aria-label="JC Analytics — inicio">
    <span className="jca-brand__mark">
      <img src={`${import.meta.env.BASE_URL}LogoMark.webp`} alt="" width={162} height={200} decoding="async" />
    </span>
    <span className="jca-brand__name">JC Analytics<span className="jca-brand__caption">Software · datos · inteligencia</span></span>
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
    const backgrounds = Array.from(document.querySelectorAll('main, footer, .wa-fab'));
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
  const visit = (event, href) => { event.preventDefault(); destinationRef.current = href; setOpen(false); };
  const currentIndex = NAV_LINKS.findIndex(link => link.href === active);
  const currentName = NAV_LINKS[currentIndex]?.label ?? SECTION_NAMES[active.slice(1)] ?? 'El estudio';

  return (
    <>
      <motion.header initial={reduce ? false : { y: -24, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: EASE, delay: 0.12 }}
        className={`jca-navigation ${scrolled ? 'jca-navigation--scrolled' : ''}`} aria-hidden={open || undefined} inert={open || undefined}>
        <div className="jca-navigation__bar">
          <Brand />
          <span className="jca-navigation__chapter" aria-hidden="true">{currentName}</span>
          <nav className="jca-navigation__links" aria-label="Navegación principal">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="jca-navigation__link" aria-current={active === link.href ? 'location' : undefined}>
                {link.label}<span aria-hidden="true" />
              </a>
            ))}
          </nav>
          <div className="jca-navigation__actions">
            <a href={wa('Hola, quiero cotizar un proyecto con JC Analytics.')} target="_blank" rel="noreferrer" className="jca-nav-contact">
              Hablemos<span aria-hidden="true"><ArrowUpRight size={17} strokeWidth={2.1} /></span>
            </a>
            <button type="button" onClick={openMenu} aria-label="Abrir menú" aria-expanded={open} aria-controls="menu-movil" className="jca-menu-button">
              <Menu size={21} strokeWidth={1.6} />
            </button>
          </div>
          <motion.span className="jca-navigation__progress" style={{ scaleX: scrollYProgress }} aria-hidden="true" />
        </div>
      </motion.header>

      <nav className={`mobile-dock ${editing ? 'mobile-dock--editing' : ''}`} aria-label="Accesos rápidos" aria-hidden={open || editing || undefined} inert={open || editing || undefined}>
        <button type="button" onClick={openMenu} aria-label="Explorar secciones" aria-expanded={open} aria-controls="menu-movil"><Grid2X2 size={19} aria-hidden="true" /><span>Explorar</span></button>
        <a href="#trabajo" aria-current={active === '#trabajo' ? 'location' : undefined}><PanelsTopLeft size={19} aria-hidden="true" /><span>Proyectos</span></a>
        <a className="mobile-dock__contact" href="#contacto" onClick={() => prepareContact({ need: CHAPTERS[currentIndex]?.need ?? 'Sistema / backend', source: `Navegación móvil · ${currentName}` })}><span>Tu proyecto</span><ArrowUpRight size={19} aria-hidden="true" /></a>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div className="jca-menu-layer" key="menu-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : .2 }}>
          <div className="jca-menu-backdrop" aria-hidden="true" onClick={() => setOpen(false)} />
          <motion.div key="menu-movil" ref={menuRef} id="menu-movil" role="dialog" aria-modal="true" aria-label="Menú principal" data-lenis-prevent
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? { opacity: 0 } : { opacity: 0, y: -16 }}
            transition={{ duration: reduce ? 0.12 : 0.4, ease: EASE }} className="jca-menu">
            <div className="jca-menu__top">
              <Brand onClick={(event) => visit(event, '#top')} />
              <button ref={closeRef} type="button" onClick={() => setOpen(false)} aria-label="Cerrar menú" className="jca-menu-button jca-menu-button--close"><X size={23} strokeWidth={1.6} /></button>
            </div>
            <div className="jca-menu__eyebrow"><span aria-hidden="true" />ESTÁS EN: {currentName}</div>
            <p className="jca-menu__title">Elegí tu <em>próximo paso.</em></p>
            <nav className="jca-menu__links" aria-label="Navegación móvil">
              {NAV_LINKS.map((link, index) => (
                <motion.a key={link.href} href={link.href} onClick={(event) => visit(event, link.href)} initial={reduce ? false : { y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.12 + index * 0.045, duration: 0.45, ease: EASE }} aria-current={active === link.href ? 'location' : undefined}>
                  <span className="jca-menu__number">0{index + 1}</span><span className="jca-menu__icon" aria-hidden="true">{(() => { const Icon = CHAPTERS[index].icon; return <Icon size={22} strokeWidth={1.3} />; })()}</span><span>{link.label}<small>{CHAPTERS[index].detail}</small></span><ArrowUpRight size={24} strokeWidth={1.3} aria-hidden="true" />
                </motion.a>
              ))}
            </nav>
            <div className="jca-menu__shortcuts"><a href="#cotizar" onClick={(event) => visit(event, '#cotizar')}>Estimar mi proyecto <ArrowRight size={15} aria-hidden="true" /></a><a href="#equipo" onClick={(event) => visit(event, '#equipo')}>El equipo <ArrowRight size={15} aria-hidden="true" /></a></div>
            <div className="jca-menu__bottom">
              <a href={wa('Hola, quiero cotizar un proyecto con JC Analytics.')} target="_blank" rel="noreferrer" onClick={() => setOpen(false)} className="jca-menu__contact">
                Conversemos sobre tu idea<span aria-hidden="true"><ArrowUpRight size={21} /></span>
              </a>
              <div className="jca-menu__details"><a href={`mailto:${EMAIL}`}>{EMAIL}</a><a href={`tel:+${PHONE}`}>+506 7033 0596</a></div>
              <span className="jca-menu__location">Costa Rica · Ideas sin fronteras</span>
            </div>
          </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Nav;
