import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

const _MOTION = motion;

/**
 * Premium custom cursor:
 *  - Soft glow trail (slow spring)
 *  - Crisp dot (instant)
 *  - Hover state expands ring on interactive elements + magnetic feel
 *  - Click pulse
 *  - Auto-disabled on touch / coarse pointer / reduced-motion
 */
const CustomCursor = () => {
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);

  // Two-layer spring for elegant lag (ring slower than dot)
  const ringX = useSpring(cursorX, { damping: 22, stiffness: 180, mass: 0.6 });
  const ringY = useSpring(cursorY, { damping: 22, stiffness: 180, mass: 0.6 });
  const glowX = useSpring(cursorX, { damping: 30, stiffness: 90, mass: 1 });
  const glowY = useSpring(cursorY, { damping: 30, stiffness: 90, mass: 1 });

  const [enabled, setEnabled] = useState(false);
  const [hover, setHover] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setEnabled(fine.matches && !reduced.matches);
    sync();
    fine.addEventListener('change', sync);
    reduced.addEventListener('change', sync);
    return () => {
      fine.removeEventListener('change', sync);
      reduced.removeEventListener('change', sync);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const move = (e) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);

      // Detect interactive target for hover state
      const t = e.target;
      const isInteractive =
        !!t?.closest?.('a, button, [role="button"], [data-cursor="hover"], input, textarea, select, summary, label[for]');
      setHover(isInteractive);
    };

    const down = () => setPressed(true);
    const up = () => setPressed(false);
    const leave = () => setHidden(true);
    const enter = () => setHidden(false);

    window.addEventListener('mousemove', move, { passive: true });
    window.addEventListener('mousedown', down);
    window.addEventListener('mouseup', up);
    document.addEventListener('mouseleave', leave);
    document.addEventListener('mouseenter', enter);

    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mousedown', down);
      window.removeEventListener('mouseup', up);
      document.removeEventListener('mouseleave', leave);
      document.removeEventListener('mouseenter', enter);
    };
  }, [enabled, cursorX, cursorY]);

  if (!enabled) return null;

  const ringSize = hover ? 56 : 32;
  const dotSize = hover ? 6 : 8;

  return (
    <>
      {/* Soft glow trail (slowest, biggest) */}
      <motion.div
        aria-hidden
        className="fixed top-0 left-0 pointer-events-none z-[9998] hidden md:block rounded-full"
        style={{
          x: glowX,
          y: glowY,
          width: 120,
          height: 120,
          marginLeft: -60,
          marginTop: -60,
          background:
            'radial-gradient(circle, rgba(96,165,250,0.35) 0%, rgba(16,185,129,0.18) 40%, transparent 70%)',
          filter: 'blur(8px)',
          opacity: hidden ? 0 : (hover ? 0.9 : 0.55),
          transition: 'opacity 250ms cubic-bezier(0.25,1,0.5,1)',
          mixBlendMode: 'screen',
        }}
      />

      {/* Outline ring */}
      <motion.div
        aria-hidden
        className="fixed top-0 left-0 pointer-events-none z-[9999] hidden md:block rounded-full mix-blend-difference"
        style={{
          x: ringX,
          y: ringY,
          width: ringSize,
          height: ringSize,
          marginLeft: -ringSize / 2,
          marginTop: -ringSize / 2,
          border: hover ? '1.5px solid rgba(255,255,255,0.95)' : '1px solid rgba(255,255,255,0.85)',
          background: hover ? 'rgba(255,255,255,0.06)' : 'transparent',
          opacity: hidden ? 0 : 1,
          transition:
            'width 280ms cubic-bezier(0.34,1.56,0.64,1), height 280ms cubic-bezier(0.34,1.56,0.64,1), margin 280ms cubic-bezier(0.34,1.56,0.64,1), background 200ms ease, border 200ms ease, opacity 200ms ease',
          transform: pressed ? 'scale(0.82)' : undefined,
          backdropFilter: hover ? 'blur(2px)' : undefined,
        }}
      />

      {/* Center dot */}
      <motion.div
        aria-hidden
        className="fixed top-0 left-0 bg-white pointer-events-none z-[9999] hidden md:block rounded-full mix-blend-difference"
        style={{
          x: cursorX,
          y: cursorY,
          width: dotSize,
          height: dotSize,
          marginLeft: -dotSize / 2,
          marginTop: -dotSize / 2,
          opacity: hidden ? 0 : 1,
          transition:
            'width 220ms cubic-bezier(0.34,1.56,0.64,1), height 220ms cubic-bezier(0.34,1.56,0.64,1), margin 220ms cubic-bezier(0.34,1.56,0.64,1), opacity 200ms ease',
        }}
      />
    </>
  );
};

export default CustomCursor;
