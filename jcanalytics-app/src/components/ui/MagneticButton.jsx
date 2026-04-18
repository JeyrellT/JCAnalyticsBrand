import React, { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

const _MOTION = motion;

/**
 * Premium magnetic button:
 *  - Spring-based magnetic pull
 *  - Inner radial highlight tracks the pointer (CSS vars --mx/--my)
 *  - Subtle 3D tilt for depth (rotateX/rotateY)
 *  - Active press bounce
 *  - Respects no-hover / reduced-motion
 */
const MagneticButton = ({ children, className = "", onClick, strength = 0.28, ...props }) => {
  const ref = useRef(null);
  const [isInteractive, setIsInteractive] = useState(true);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  // Normalised pointer (-0.5..0.5) for tilt
  const nx = useMotionValue(0);
  const ny = useMotionValue(0);

  const springConfig = { damping: 18, stiffness: 220, mass: 0.18 };
  const xSpring = useSpring(x, springConfig);
  const ySpring = useSpring(y, springConfig);
  const rotateY = useSpring(useTransform(nx, [-0.5, 0.5], [-6, 6]), springConfig);
  const rotateX = useSpring(useTransform(ny, [-0.5, 0.5], [6, -6]), springConfig);

  useEffect(() => {
    const hoverQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setIsInteractive(hoverQuery.matches && !reduced.matches);
    sync();
    hoverQuery.addEventListener("change", sync);
    reduced.addEventListener("change", sync);
    return () => {
      hoverQuery.removeEventListener("change", sync);
      reduced.removeEventListener("change", sync);
    };
  }, []);

  const handlePointerMove = (e) => {
    if (!isInteractive || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;

    x.set(dx * strength);
    y.set(dy * strength);

    // Normalised position for tilt + spotlight CSS vars
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    nx.set(px - 0.5);
    ny.set(py - 0.5);
    ref.current.style.setProperty('--mx', `${px * 100}%`);
    ref.current.style.setProperty('--my', `${py * 100}%`);
  };

  const handlePointerLeave = () => {
    x.set(0);
    y.set(0);
    nx.set(0);
    ny.set(0);
  };

  return (
    <motion.button
      ref={ref}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={onClick}
      style={{
        x: xSpring,
        y: ySpring,
        rotateX: isInteractive ? rotateX : 0,
        rotateY: isInteractive ? rotateY : 0,
        transformPerspective: 700,
        transformStyle: 'preserve-3d',
      }}
      whileHover={isInteractive ? { scale: 1.04 } : undefined}
      whileTap={{ scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 380, damping: 24 }}
      className={`relative z-10 spotlight btn-sheen ${className}`}
      {...props}
    >
      <span style={{ transform: 'translateZ(20px)', display: 'inline-flex', alignItems: 'center', gap: 'inherit' }}>
        {children}
      </span>
    </motion.button>
  );
};

export default MagneticButton;
