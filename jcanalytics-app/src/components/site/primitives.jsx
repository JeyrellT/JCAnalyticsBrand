import { useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Pause, Play } from 'lucide-react';
import { EASE } from './links';
import '../../styles/navigation.css';

const _MOTION = motion;

export const Reveal = ({ children, delay = 0, y = 24, className = '', as = 'div' }) => {
  const reduce = useReducedMotion();
  const Tag = motion[as] ?? motion.div;
  return (
    <Tag initial={reduce ? false : { opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-32px' }}
      transition={reduce ? { duration: 0 } : { duration: 0.8, delay, ease: EASE }} className={className}>
      {children}
    </Tag>
  );
};

export const MaskLines = ({ lines, className = '', delay = 0, lineClassName = '' }) => {
  const reduce = useReducedMotion();
  return (
    <span className={className}>
      {lines.map((line, index) => (
        <span key={index} className="block overflow-hidden pb-[0.1em] -mb-[0.1em]">
          <motion.span className={`block ${lineClassName}`} initial={reduce ? false : { y: '108%', opacity: 0.25 }}
            whileInView={{ y: '0%', opacity: 1 }} viewport={{ once: true, margin: '-24px' }}
            transition={reduce ? { duration: 0 } : { duration: 0.9, delay: delay + index * 0.085, ease: EASE }}>
            {line}
          </motion.span>
        </span>
      ))}
    </span>
  );
};

// Preserve existing variant names while giving actions the logo's palette.
const VARIANTS = { ink: 'jca-cta--blue', lime: 'jca-cta--aqua', ghost: 'jca-cta--ghost', paper: 'jca-cta--paper', blue: 'jca-cta--blue', aqua: 'jca-cta--aqua' };

export const CTA = ({ href, children, variant = 'ink', external, icon = true, size = 'md', className = '', ...rest }) => {
  const isExternal = external ?? /^https?:/.test(href ?? '');
  return (
    <a href={href} {...(isExternal ? { target: '_blank', rel: 'noreferrer' } : {})}
      className={`cta jca-cta jca-cta--${size} ${VARIANTS[variant] ?? VARIANTS.ink} ${!icon ? 'jca-cta--no-icon' : ''} ${className}`} {...rest}>
      <span className="jca-cta__label">{children}</span>
      {icon && <span aria-hidden="true" className="cta-dot jca-cta__dot"><ArrowUpRight size={size === 'lg' ? 21 : 18} strokeWidth={2} /></span>}
    </a>
  );
};

export const Label = ({ children, className = '' }) => (
  <span className={`font-mono text-[11px] uppercase tracking-[0.2em] ${className}`}>{children}</span>
);

export const Marquee = ({ children, className = '', duration = 40, reverse = false }) => {
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const visible = useInView(ref, { margin: '120px' });
  return (
    <div ref={ref} className={`marquee-v3 jca-marquee ${className}`} data-reduced={reduce ? 'true' : undefined}>
      <div className="marquee-v3__track jca-marquee__track flex w-max"
        style={{ animationDuration: `${duration}s`, animationDirection: reverse ? 'reverse' : 'normal', animationPlayState: paused || !visible || reduce ? 'paused' : 'running' }}>
        <div className="jca-marquee__original flex shrink-0 items-center">{children}</div>
        <div className="jca-marquee__duplicate flex shrink-0 items-center" aria-hidden="true" inert>{children}</div>
      </div>
      {!reduce && <button type="button" className="jca-marquee__control" onClick={() => setPaused((value) => !value)}
        aria-label={paused ? 'Reanudar cinta de servicios' : 'Pausar cinta de servicios'} aria-pressed={paused}>
        {paused ? <Play size={12} fill="currentColor" aria-hidden="true" /> : <Pause size={12} fill="currentColor" aria-hidden="true" />}
      </button>}
    </div>
  );
};
