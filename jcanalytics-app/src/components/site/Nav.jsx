// ============================================================================
//  src/components/site/Nav.jsx
//  Barra flotante tipo "píldora" + menú móvil a pantalla completa.
//  Pocos enlaces (4) y un CTA siempre visible.
// ============================================================================
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Menu, X, ArrowUpRight } from 'lucide-react';
import { wa, EASE, PHONE, EMAIL, NAV_LINKS } from './links';

// eslint (sin plugin de react) no reconoce a `motion` usado solo como <motion.x>.
const _MOTION = motion;

const Nav = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const btnRef = useRef(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Menú abierto: bloquea el scroll del fondo y cierra con Escape.
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      <motion.header
        initial={reduce ? false : { y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.9, ease: EASE, delay: 0.1 }}
        className="fixed top-0 inset-x-0 z-[60] px-3 sm:px-5 pt-3 sm:pt-4"
      >
        <div
          className={`mx-auto max-w-[1400px] flex items-center justify-between gap-3 rounded-full pl-3 sm:pl-4 pr-2 h-14 sm:h-16 transition-all duration-500 ${
            scrolled || open
              ? 'bg-paper/90 backdrop-blur-xl border border-ink/10 shadow-[0_8px_30px_-12px_rgba(10,10,11,0.18)]'
              : 'bg-transparent border border-transparent'
          }`}
        >
          <a href="#top" className="flex items-center gap-2.5 shrink-0 min-h-11" aria-label="JC Analytics — inicio">
            <img
              src={import.meta.env.BASE_URL + 'LogoMark.webp'}
              alt=""
              width={162}
              height={200}
              decoding="async"
              className="h-8 sm:h-9 w-auto"
            />
            <span className="font-display text-[17px] sm:text-lg font-bold tracking-tight text-ink leading-none">
              JC Analytics
            </span>
          </a>

          <nav className="hidden md:flex items-center gap-1" aria-label="Navegación principal">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="px-4 py-2 rounded-full text-[15px] font-medium text-ink/70 hover:text-ink hover:bg-ink/5 transition-colors"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <a
              href={wa('Hola, quiero cotizar un proyecto con JC Analytics.')}
              target="_blank"
              rel="noreferrer"
              className="tap-press hidden sm:inline-flex items-center gap-2 bg-ink text-paper hover:bg-neutral-800 rounded-full pl-5 pr-1.5 h-11 text-[15px] font-semibold transition-colors"
            >
              Hablemos
              <span className="grid place-items-center w-8 h-8 rounded-full bg-lime text-ink" aria-hidden="true">
                <ArrowUpRight size={16} strokeWidth={2.4} />
              </span>
            </a>
            <button
              ref={btnRef}
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={open}
              aria-controls="menu-movil"
              className="tap-press md:hidden grid place-items-center w-11 h-11 rounded-full bg-ink text-paper"
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            key="menu-movil"
            id="menu-movil"
            initial={reduce ? { opacity: 0 } : { clipPath: 'inset(0 0 100% 0)' }}
            animate={reduce ? { opacity: 1 } : { clipPath: 'inset(0 0 0% 0)' }}
            exit={reduce ? { opacity: 0 } : { clipPath: 'inset(0 0 100% 0)' }}
            transition={{ duration: 0.6, ease: EASE }}
            className="md:hidden fixed inset-0 z-[55] bg-ink text-paper flex flex-col pt-24 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
          >
            <nav className="flex flex-col" aria-label="Navegación móvil">
              {NAV_LINKS.map((l, i) => (
                <motion.a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  initial={reduce ? false : { y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.15 + i * 0.06, duration: 0.6, ease: EASE }}
                  className="flex items-baseline justify-between border-b border-paper/10 py-4 font-display text-[2.6rem] leading-none font-semibold tracking-tight"
                >
                  {l.label}
                  <span className="font-mono text-xs text-paper/40">0{i + 1}</span>
                </motion.a>
              ))}
            </nav>
            <div className="mt-auto space-y-3">
              <a
                href={wa('Hola, quiero cotizar un proyecto con JC Analytics.')}
                target="_blank"
                rel="noreferrer"
                onClick={() => setOpen(false)}
                className="tap-press flex items-center justify-between bg-lime text-ink rounded-full pl-6 pr-2 h-16 text-lg font-semibold"
              >
                Escribir por WhatsApp
                <span className="grid place-items-center w-12 h-12 rounded-full bg-ink text-lime" aria-hidden="true">
                  <ArrowUpRight size={20} />
                </span>
              </a>
              <div className="flex justify-between font-mono text-[11px] uppercase tracking-[0.16em] text-paper/50">
                <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
                <a href={`tel:+${PHONE}`}>+506 7033 0596</a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Nav;
