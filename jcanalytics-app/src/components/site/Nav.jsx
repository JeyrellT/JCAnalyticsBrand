import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion, useScroll } from 'framer-motion';
import { Menu, X, ArrowUpRight } from 'lucide-react';
import { wa, EASE, PHONE, EMAIL, NAV_LINKS } from './links';
import '../../styles/navigation.css';

const _MOTION = motion;

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
  const btnRef = useRef(null);
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
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(entry.target.id === 'top' ? '' : `#${entry.target.id}`);
      });
    }, { rootMargin: '-15% 0px -65% 0px' });
    NAV_LINKS.forEach(({ href }) => {
      const section = document.querySelector(href);
      if (section) observer.observe(section);
    });
    const top = document.getElementById('top');
    if (top) observer.observe(top);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const opener = btnRef.current;
    const dialog = menuRef.current;
    if (dialog) dialog.inert = false;
    const previousOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    const backgrounds = Array.from(document.querySelectorAll('main, footer, .wa-fab'));
    const previousInert = backgrounds.map((node) => node.inert);
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
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
      backgrounds.forEach((node, index) => { node.inert = previousInert[index]; });
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      window.dispatchEvent(new CustomEvent('jca:menu-state', { detail: { open: false } }));
      opener?.focus({ preventScroll: true });
    };
  }, [open]);

  return (
    <>
      <motion.header initial={reduce ? false : { y: -24, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: EASE, delay: 0.12 }}
        className={`jca-navigation ${scrolled ? 'jca-navigation--scrolled' : ''}`} aria-hidden={open || undefined} inert={open || undefined}>
        <div className="jca-navigation__bar">
          <Brand />
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
            <button ref={btnRef} type="button" onClick={() => setOpen(true)} aria-label="Abrir menú" aria-expanded={open} aria-controls="menu-movil" className="jca-menu-button">
              <Menu size={21} strokeWidth={1.6} />
            </button>
          </div>
          <motion.span className="jca-navigation__progress" style={{ scaleX: scrollYProgress }} aria-hidden="true" />
        </div>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div key="menu-movil" ref={menuRef} id="menu-movil" role="dialog" aria-modal="true" aria-label="Menú principal" data-lenis-prevent
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? { opacity: 0 } : { opacity: 0, y: -16 }}
            transition={{ duration: reduce ? 0.12 : 0.4, ease: EASE }} className="jca-menu">
            <div className="jca-menu__top">
              <Brand onClick={() => setOpen(false)} />
              <button ref={closeRef} type="button" onClick={() => setOpen(false)} aria-label="Cerrar menú" className="jca-menu-button jca-menu-button--close"><X size={23} strokeWidth={1.6} /></button>
            </div>
            <div className="jca-menu__eyebrow"><span aria-hidden="true" />Ideas claras. Posibilidades nuevas.</div>
            <nav className="jca-menu__links" aria-label="Navegación móvil">
              {NAV_LINKS.map((link, index) => (
                <motion.a key={link.href} href={link.href} onClick={() => setOpen(false)} initial={reduce ? false : { y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.12 + index * 0.045, duration: 0.45, ease: EASE }} aria-current={active === link.href ? 'location' : undefined}>
                  <span className="jca-menu__number">0{index + 1}</span><span>{link.label}</span><ArrowUpRight size={24} strokeWidth={1.3} aria-hidden="true" />
                </motion.a>
              ))}
            </nav>
            <div className="jca-menu__bottom">
              <a href={wa('Hola, quiero cotizar un proyecto con JC Analytics.')} target="_blank" rel="noreferrer" onClick={() => setOpen(false)} className="jca-menu__contact">
                Conversemos sobre tu idea<span aria-hidden="true"><ArrowUpRight size={21} /></span>
              </a>
              <div className="jca-menu__details"><a href={`mailto:${EMAIL}`}>{EMAIL}</a><a href={`tel:+${PHONE}`}>+506 7033 0596</a></div>
              <span className="jca-menu__location">Costa Rica · Ideas sin fronteras</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Nav;
