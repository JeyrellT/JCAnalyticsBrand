import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// A procedural studio object: no remote model, texture, or image request.
// The render loop stops offscreen, in a background tab, or when motion is paused.
const StudioSculpture = ({ paused = false, mode = 0, onReady, onFallback }) => {
  const hostRef = useRef(null);
  const controlRef = useRef({ paused, mode });
  const renderRef = useRef(null);

  useEffect(() => {
    controlRef.current = { paused, mode };
    renderRef.current?.();
  }, [paused, mode]);

  useEffect(() => {
    const host = hostRef.current;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'low-power' });
    } catch {
      onFallback?.();
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.setClearColor(0x080c10, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.45;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
    camera.position.set(0, 0, 9.8);
    const environment = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environmentMap = pmrem.fromScene(environment, 0.04);
    scene.environment = environmentMap.texture;
    environment.dispose();
    pmrem.dispose();

    const sculpture = new THREE.Group();
    sculpture.rotation.set(0.45, -0.35, -0.22);
    scene.add(sculpture);

    const material = new THREE.MeshPhysicalMaterial({
      color: 0x559ca9, metalness: 0.94, roughness: 0.19,
      clearcoat: 1, clearcoatRoughness: 0.13, envMapIntensity: 2.2,
      iridescence: 0.25, iridescenceIOR: 1.25,
    });
    const geometry = new THREE.TorusKnotGeometry(1.47, 0.49, 180, 32, 2, 3);
    const knot = new THREE.Mesh(geometry, material);
    sculpture.add(knot);

    const cageMaterial = new THREE.MeshBasicMaterial({ color: 0xb9f6de, wireframe: true, transparent: true, opacity: 0 });
    const cageGeometry = new THREE.TorusKnotGeometry(1.47, 0.495, 96, 12, 2, 3);
    const cage = new THREE.Mesh(cageGeometry, cageMaterial);
    sculpture.add(cage);

    const haloMaterial = new THREE.MeshBasicMaterial({ color: 0x81a998, transparent: true, opacity: 0.23 });
    const haloGeometry = new THREE.TorusGeometry(2.7, 0.008, 6, 160);
    const halo = new THREE.Mesh(haloGeometry, haloMaterial);
    halo.rotation.set(1.12, -0.5, 0.3);
    scene.add(halo);
    const markerGeometry = new THREE.SphereGeometry(0.055, 12, 12);
    const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xc0ffdc });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.set(2.7, 0, 0);
    halo.add(marker);

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const key = new THREE.DirectionalLight(0xcaffeb, 4);
    key.position.set(3, 4, 3);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x2869ff, 7);
    rim.position.set(-4, -1, 1);
    scene.add(rim);
    const warm = new THREE.DirectionalLight(0xffe6cf, 3);
    warm.position.set(0, -4, 3);
    scene.add(warm);

    let frame = 0;
    let visible = true;
    let menuOpen = false;
    let disposed = false;
    let last = 0;
    let elapsed = 0;
    let notified = false;
    const pointer = { x: 0, y: 0 };
    const palette = [new THREE.Color('#559ca9'), new THREE.Color('#6898fd'), new THREE.Color('#a0cbb1')];

    const draw = (now = 0) => {
      frame = 0;
      if (disposed || !visible || menuOpen || document.hidden) return;
      const state = controlRef.current;
      const delta = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      if (!state.paused) elapsed += delta;
      sculpture.rotation.y = -0.35 + elapsed * 0.15 + (state.paused ? 0 : pointer.x * 0.22);
      sculpture.rotation.x = 0.45 + (state.paused ? 0 : Math.sin(elapsed * 0.23) * 0.12 + pointer.y * 0.12);
      sculpture.position.y = state.paused ? 0 : Math.sin(elapsed * 0.6) * 0.075;
      halo.rotation.z = 0.3 + elapsed * 0.08;
      material.color.copy(palette[state.mode]);
      material.roughness = state.mode === 1 ? 0.3 : 0.19;
      material.wireframe = state.mode === 1;
      cageMaterial.opacity = state.mode === 2 ? 0.2 : 0;
      renderer.render(scene, camera);
      if (!notified) { notified = true; onReady?.(); }
      if (!state.paused) frame = requestAnimationFrame(draw);
    };
    const schedule = () => {
      if (disposed) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(draw);
    };
    renderRef.current = schedule;
    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      camera.position.z = width < 450 ? 11 : 9.8;
      camera.updateProjectionMatrix();
      schedule();
    };
    const move = (event) => {
      if (event.pointerType !== 'mouse') return;
      const bounds = host.getBoundingClientRect();
      pointer.x = (event.clientX - bounds.left) / bounds.width - 0.5;
      pointer.y = (event.clientY - bounds.top) / bounds.height - 0.5;
    };
    const resetPointer = () => { pointer.x = 0; pointer.y = 0; };
    const lost = (event) => { event.preventDefault(); cancelAnimationFrame(frame); onFallback?.(); };
    const onMenuState = (event) => {
      menuOpen = event.detail.open;
      if (menuOpen) cancelAnimationFrame(frame);
      else { last = 0; schedule(); }
    };
    const resizeObserver = new ResizeObserver(resize);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) { last = 0; schedule(); } else cancelAnimationFrame(frame);
    });
    resizeObserver.observe(host);
    intersectionObserver.observe(host);
    host.addEventListener('pointermove', move);
    host.addEventListener('pointerleave', resetPointer);
    renderer.domElement.addEventListener('webglcontextlost', lost);
    document.addEventListener('visibilitychange', schedule);
    window.addEventListener('jca:menu-state', onMenuState);
    resize();

    return () => {
      disposed = true;
      renderRef.current = null;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      host.removeEventListener('pointermove', move);
      host.removeEventListener('pointerleave', resetPointer);
      document.removeEventListener('visibilitychange', schedule);
      window.removeEventListener('jca:menu-state', onMenuState);
      renderer.domElement.removeEventListener('webglcontextlost', lost);
      geometry.dispose(); cageGeometry.dispose(); haloGeometry.dispose(); markerGeometry.dispose();
      material.dispose(); cageMaterial.dispose(); haloMaterial.dispose(); markerMaterial.dispose();
      environmentMap.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [onReady, onFallback]);

  return <div className="studio-object__canvas" ref={hostRef} aria-hidden="true" />;
};
export default StudioSculpture;
