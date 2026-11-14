import { Fragment, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { EASE } from './links';
import { bootScrolled } from '../../boot';
import '../../styles/navigation.css';

const _MOTION = motion;

// `still`: sin animación de entrada. Lo usa la primera pantalla cuando la página ya venía pintada (boot.js).
// Si en ese primer montaje la visita ya había bajado, tampoco se anima lo que tiene a la vista.
export const Reveal = ({ children, delay = 0, y = 24, className = '', as = 'div', still = false, ...rest }) => {
  const reduce = useReducedMotion();
  const [instant] = useState(() => still || bootScrolled());
  const Tag = motion[as] ?? motion.div;
  return (
    <Tag {...rest} initial={reduce || instant ? false : { opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-32px' }}
      transition={reduce ? { duration: 0 } : { duration: 0.8, delay, ease: EASE }} className={className}>
      {children}
    </Tag>
  );
};

// Each line slides up from behind its own clip. The in-view trigger lives on
// the clipping wrapper, not on the moving line: a line that wraps to two rows
// starts fully outside its clip, and an observer placed on it would never fire,
// leaving the line hidden for good.
// Entre renglones va un espacio de texto: no se dibuja (cada renglón es un bloque), pero quien lee el HTML
// sin estilos (buscadores, asistentes de IA, vistas previas) ya no encuentra «sistemascon» ni «Hecho,no».
export const MaskLines = ({ lines, className = '', delay = 0, lineClassName = '', still = false }) => {
  const reduce = useReducedMotion();
  const [instant] = useState(() => still || bootScrolled());
  return (
    <span className={className}>
      {lines.map((line, index) => (
        <Fragment key={index}>
          {index > 0 && ' '}
          <motion.span className="block overflow-hidden pb-[0.1em] -mb-[0.1em]"
            initial={reduce || instant ? 'shown' : 'hidden'} whileInView="shown" viewport={{ once: true, margin: '-24px' }}>
            <motion.span className={`block ${lineClassName}`}
              variants={{ hidden: { y: '108%', opacity: 0.25 }, shown: { y: '0%', opacity: 1 } }}
              transition={reduce ? { duration: 0 } : { duration: 0.9, delay: delay + index * 0.085, ease: EASE }}>
              {line}
            </motion.span>
          </motion.span>
        </Fragment>
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
