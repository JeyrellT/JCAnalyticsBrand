import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const _MOTION = motion;

const SplitText = ({ text, className = "", delay = 0 }) => {
  const [isCompactMotion, setIsCompactMotion] = useState(false);

  useEffect(() => {
    const compactMotionQuery = window.matchMedia('(max-width: 767px), (prefers-reduced-motion: reduce)');
    const updateMotionMode = () => setIsCompactMotion(compactMotionQuery.matches);

    updateMotionMode();
    compactMotionQuery.addEventListener('change', updateMotionMode);

    return () => compactMotionQuery.removeEventListener('change', updateMotionMode);
  }, []);

  if (!text) return null;

  // Split text into words, then characters to allow wrapping
  const words = text.split(" ");

  const container = {
    hidden: { opacity: 0 },
    visible: (i = 1) => ({
      opacity: 1,
      transition: { staggerChildren: isCompactMotion ? 0.02 : 0.05, delayChildren: delay * i },
    }),
  };

  const child = {
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        damping: isCompactMotion ? 16 : 12,
        stiffness: isCompactMotion ? 85 : 100,
      },
    },
    hidden: {
      opacity: 0,
      y: isCompactMotion ? 40 : 120,
    },
  };

  return (
    <motion.div
      style={{ overflow: "hidden", display: "inline-flex", flexWrap: "wrap", gap: "0.25em" }}
      variants={container}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      className={className}
    >
      {words.map((word, index) => (
        <span key={index} style={{ overflow: "hidden", display: "inline-flex" }}>
          {Array.from(word).map((char, charIndex) => (
            <motion.span variants={child} key={charIndex} style={{ display: "inline-block" }}>
              {char}
            </motion.span>
          ))}
        </span>
      ))}
    </motion.div>
  );
};

export default SplitText;
