// ============================================================================
//  src/components/site/primitives.jsx
//  Piezas compartidas del rediseño v3: contacto, botones, revelados y marquee.
//  Regla de la v3: poco texto, cada bloque termina en una acción.
// ============================================================================
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { EASE } from './links';

// eslint (sin plugin de react) no reconoce a `motion` usado solo como <motion.x>.
const _MOTION = motion;

// Revelado al entrar en viewport. Con reduced-motion queda estático.
export const Reveal = ({ children, delay = 0, y = 32, className = '', as = 'div' }) => {
  const reduce = useReducedMotion();
  const Tag = motion[as] ?? motion.div;
  return (
    <Tag
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={reduce ? { duration: 0 } : { duration: 0.9, delay, ease: EASE }}
      className={className}
    >
      {children}
    </Tag>
  );
};

// Titular con revelado por línea (máscara): cada línea sube desde abajo.
export const MaskLines = ({ lines, className = '', delay = 0, lineClassName = '' }) => {
  const reduce = useReducedMotion();
  return (
    <span className={className}>
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
          <motion.span
            className={`block ${lineClassName}`}
            initial={reduce ? false : { y: '105%' }}
            whileInView={{ y: '0%' }}
            viewport={{ once: true, margin: '-40px' }}
            transition={reduce ? { duration: 0 } : { duration: 1.05, delay: delay + i * 0.09, ease: EASE }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </span>
  );
};

// Botón / enlace de acción. Variantes:
//  ink   → negro sobre claro (CTA principal en secciones claras)
//  lime  → lima sobre oscuro (CTA principal en secciones oscuras)
//  ghost → contorno (CTA secundario)
const VARIANTS = {
  ink: 'bg-ink text-paper hover:bg-neutral-800',
  lime: 'bg-lime text-ink hover:bg-white',
  ghost: 'border border-current/20 hover:border-current/60 text-current',
  paper: 'bg-paper text-ink hover:bg-white',
};

export const CTA = ({
  href,
  children,
  variant = 'ink',
  external,
  icon = true,
  size = 'md',
  className = '',
  ...rest
}) => {
  const isExternal = external ?? /^https?:/.test(href ?? '');
  const sizes = {
    md: 'min-h-12 pl-6 pr-2 py-2 text-[15px]',
    lg: 'min-h-14 sm:min-h-16 pl-7 pr-2.5 py-2.5 text-base sm:text-lg',
  };
  const dot = {
    ink: 'bg-lime text-ink',
    lime: 'bg-ink text-lime',
    ghost: 'bg-current/10',
    paper: 'bg-ink text-lime',
  };
  return (
    <a
      href={href}
      {...(isExternal ? { target: '_blank', rel: 'noreferrer' } : {})}
      className={`cta group tap-press inline-flex items-center justify-between gap-4 rounded-full font-semibold tracking-tight transition-colors duration-300 ${sizes[size]} ${VARIANTS[variant]} ${icon ? '' : 'pr-6'} ${className}`}
      {...rest}
    >
      <span>{children}</span>
      {icon && (
        <span
          aria-hidden="true"
          className={`cta-dot grid place-items-center rounded-full shrink-0 ${size === 'lg' ? 'w-11 h-11 sm:w-12 sm:h-12' : 'w-9 h-9'} ${dot[variant]}`}
        >
          <ArrowUpRight size={size === 'lg' ? 20 : 17} strokeWidth={2.4} />
        </span>
      )}
    </a>
  );
};

// Etiqueta pequeña en mono, para numerar y rotular secciones.
export const Label = ({ children, className = '' }) => (
  <span className={`font-mono text-[11px] uppercase tracking-[0.2em] ${className}`}>{children}</span>
);

// Cinta infinita. El contenido se duplica para que el loop no tenga salto.
export const Marquee = ({ children, className = '', duration = 40, reverse = false }) => (
  <div className={`marquee-v3 overflow-hidden ${className}`}>
    <div
      className="marquee-v3__track flex w-max"
      style={{ animationDuration: `${duration}s`, animationDirection: reverse ? 'reverse' : 'normal' }}
    >
      <div className="flex shrink-0 items-center">{children}</div>
      <div className="flex shrink-0 items-center" aria-hidden="true">{children}</div>
    </div>
  </div>
);
