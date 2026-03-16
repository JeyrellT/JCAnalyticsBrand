import React, { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';

const _MOTION = motion;

const TiltCard = ({ children, className = "" }) => {
  const ref = useRef(null);
  const [tiltEnabled, setTiltEnabled] = useState(true);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useTransform(y, [-0.5, 0.5], ["7deg", "-7deg"]);
  const rotateY = useTransform(x, [-0.5, 0.5], ["-7deg", "7deg"]);

  useEffect(() => {
    const hoverQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    const updateTiltMode = () => setTiltEnabled(hoverQuery.matches);

    updateTiltMode();
    hoverQuery.addEventListener("change", updateTiltMode);

    return () => hoverQuery.removeEventListener("change", updateTiltMode);
  }, []);

  const handlePointerMove = (event) => {
    if (!tiltEnabled) return;
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    x.set(pointerX / width - 0.5);
    y.set(pointerY / height - 0.5);
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
      style={{ rotateX: tiltEnabled ? rotateX : "0deg", rotateY: tiltEnabled ? rotateY : "0deg", transformStyle: "preserve-3d" }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`perspective-1000 ${className}`}
    >
      <div style={{ transform: "translateZ(30px)" }} className="w-full h-full">
        {children}
      </div>
    </motion.div>
  );
};

export default TiltCard;
