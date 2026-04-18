import React, { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

const _MOTION = motion;

/**
 * Premium TiltCard:
 *  - Spring-based smooth tilt
 *  - Pointer-tracked shine reflection (CSS vars --mx/--my via .tilt-shine)
 *  - 3D layered children via translateZ
 *  - Gracefully disabled on touch / reduced-motion
 */
const TiltCard = ({ children, className = "", maxTilt = 8, glare = true }) => {
  const ref = useRef(null);
  const [tiltEnabled, setTiltEnabled] = useState(true);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const xs = useSpring(x, { stiffness: 240, damping: 22, mass: 0.3 });
  const ys = useSpring(y, { stiffness: 240, damping: 22, mass: 0.3 });

  const rotateX = useTransform(ys, [-0.5, 0.5], [`${maxTilt}deg`, `${-maxTilt}deg`]);
  const rotateY = useTransform(xs, [-0.5, 0.5], [`${-maxTilt}deg`, `${maxTilt}deg`]);

  useEffect(() => {
    const hoverQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setTiltEnabled(hoverQuery.matches && !reduced.matches);
    sync();
    hoverQuery.addEventListener("change", sync);
    reduced.addEventListener("change", sync);
    return () => {
      hoverQuery.removeEventListener("change", sync);
      reduced.removeEventListener("change", sync);
    };
  }, []);

  const handlePointerMove = (event) => {
    if (!tiltEnabled || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    x.set(px - 0.5);
    y.set(py - 0.5);
    if (glare) {
      ref.current.style.setProperty('--mx', `${px * 100}%`);
      ref.current.style.setProperty('--my', `${py * 100}%`);
    }
  };

  const handlePointerLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={{
        rotateX: tiltEnabled ? rotateX : "0deg",
        rotateY: tiltEnabled ? rotateY : "0deg",
        transformStyle: "preserve-3d",
        transformPerspective: 1000,
      }}
      className={`perspective-1000 ${glare ? 'tilt-shine' : ''} ${className}`}
    >
      <div style={{ transform: "translateZ(30px)" }} className="w-full h-full">
        {children}
      </div>
    </motion.div>
  );
};

export default TiltCard;
