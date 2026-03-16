import React, { useRef, useLayoutEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars, Float, Environment } from '@react-three/drei';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const Scene = () => {
  const groupRef = useRef();
  
  useLayoutEffect(() => {
    let ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: document.body,
          start: "top top",
          end: "bottom bottom",
          scrub: 1,
        }
      });

      tl.to(groupRef.current.rotation, {
        x: Math.PI / 4,
        y: Math.PI / 2,
        ease: "none"
      }, 0);
      
      tl.to(groupRef.current.position, {
        z: 10,
        y: 5,
        ease: "none"
      }, 0);
      
    });
    return () => ctx.revert();
  }, []);

  return (
    <group ref={groupRef}>
      <Stars radius={50} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
      <Float speed={2} rotationIntensity={1} floatIntensity={2}>
        <mesh position={[-5, 2, -10]}>
          <octahedronGeometry args={[2, 0]} />
          <meshStandardMaterial color="#3b82f6" wireframe opacity={0.3} transparent />
        </mesh>
      </Float>
      <Float speed={1.5} rotationIntensity={2} floatIntensity={1}>
        <mesh position={[6, -3, -15]}>
          <icosahedronGeometry args={[3, 1]} />
          <meshStandardMaterial color="#06b6d4" wireframe opacity={0.2} transparent />
        </mesh>
      </Float>
      <Float speed={1} rotationIntensity={1} floatIntensity={3}>
        <mesh position={[0, -5, -20]}>
          <torusGeometry args={[10, 0.5, 16, 100]} />
          <meshStandardMaterial color="#818cf8" wireframe opacity={0.15} transparent />
        </mesh>
      </Float>
    </group>
  );
};

const Background3D = ({ isMobile = false }) => {
  if (isMobile) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-0 pointer-events-none mix-blend-screen opacity-60">
      <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <Scene />
        <Environment preset="city" />
      </Canvas>
    </div>
  );
};

export default Background3D;
