import React, { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

const _MOTION = motion;

const MagneticButton = ({ children, className = "", onClick, ...props }) => {
  const ref = useRef(null);
  const [isInteractive, setIsInteractive] = useState(true);
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springConfig = { damping: 15, stiffness: 150, mass: 0.1 };
  const xSpring = useSpring(x, springConfig);
  const ySpring = useSpring(y, springConfig);

  useEffect(() => {
    const hoverQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    const updateInteractionMode = () => setIsInteractive(hoverQuery.matches);

    updateInteractionMode();
    hoverQuery.addEventListener("change", updateInteractionMode);

    return () => hoverQuery.removeEventListener("change", updateInteractionMode);
  }, []);

  const handlePointerMove = (e) => {
    if (!isInteractive) return;
    if (!ref.current) return;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    
    // Magnetic pull distance
    const distanceX = e.clientX - centerX;
    const distanceY = e.clientY - centerY;
    
    // Lerp applied by framer-motion springs
    x.set(distanceX * 0.3); // 30% pull strength
    y.set(distanceY * 0.3);
  };

  const handlePointerLeave = () => {
    x.set(0);
    y.set(0);
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
      }}
      whileHover={isInteractive ? { scale: 1.05 } : undefined}
      whileTap={{ scale: 0.95 }}
      className={`relative z-10 ${className}`}
      {...props}
    >
      {/* Ensure inner elements also subtly move or we just move the whole button */}
      {children}
    </motion.button>
  );
};

export default MagneticButton;
