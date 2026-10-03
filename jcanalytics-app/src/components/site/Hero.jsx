import { Component, lazy, Suspense, useCallback, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowDown, ArrowUpRight, Pause, Play } from 'lucide-react';
import { CLIENT_SITES } from '../../data/webProperties';
import { MaskLines, Reveal } from './primitives';
import { prepareContact } from './links';
import '../../styles/hero.css';

const _MOTION = motion;
const Sculpture = lazy(() => import('./StudioSculpture'));
const PROJECT = CLIENT_SITES.find((site) => site.id === 'soporte2');
const MODES = [
  { label: 'Diseño', description: 'Experiencias que se sienten distintas desde el primer clic.' },
  { label: 'Ingeniería', description: 'Frontend, backend y arquitectura pensados como un solo sistema.' },
  { label: 'Inteligencia', description: 'Finanzas, datos e IA que conectan tu siguiente etapa.' },
];
class SculptureBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFallback(); }
  render() { return this.state.failed ? null : this.props.children; }
}

const Hero = () => {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const [mode, setMode] = useState(0);
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  const onFallback = useCallback(() => setReady(false), []);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const objectY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 100]);
  return (
    <section id="top" ref={ref} className="studio-hero" aria-labelledby="hero-title">
      <div className="studio-hero__grain" aria-hidden="true" />
      <div className="studio-hero__topline"><span><i aria-hidden="true" /> INGENIERÍA + DISEÑO DIGITAL</span><span>INDEPENDIENTES. HECHOS EN COSTA RICA. <ArrowUpRight size={12} aria-hidden="true" /></span></div>
      <div className="studio-hero__main">
        <div className="studio-hero__copy">
          <Reveal><p className="studio-hero__eyebrow">La buena tecnología también se siente.</p></Reveal>
          <h1 id="hero-title"><MaskLines lines={['Sistemas', <em key="character">con carácter.</em>]} delay={0.1} /></h1>
          <Reveal delay={0.25}><p className="studio-hero__description">Creamos lo que tu negocio necesita para ir más lejos. Desde una web excepcional hasta el backend, las finanzas y la inteligencia que la hacen funcionar.</p></Reveal>
          <Reveal delay={0.35} className="studio-hero__actions"><a href="#contacto" className="studio-start" onClick={() => prepareContact({ need: 'Sistema / backend', source: 'Sistemas con carácter' })}>Conversemos sobre tu proyecto <span><ArrowUpRight size={21} aria-hidden="true" /></span></a><a href="#trabajo" className="studio-work-link">Explorar proyectos <ArrowDown size={15} aria-hidden="true" /></a></Reveal>
          <p className="studio-hero__invitation">Primera conversación de 30 min, sin costo.</p>
          <Reveal delay={0.45} className="studio-hero__signature"><span className="studio-signature-mark" aria-hidden="true">↳</span> Diseño intencional. Ingeniería a medida.</Reveal>
        </div>
        <motion.div className={`studio-object ${ready ? 'studio-object--ready' : ''}`} style={{ y: objectY }}>
          <div className="studio-object__halo" aria-hidden="true" />
          <div className="studio-object__fallback" aria-hidden="true"><svg viewBox="0 0 600 600" fill="none"><defs><linearGradient id="object-fallback" x1="50" y1="90" x2="500" y2="510" gradientUnits="userSpaceOnUse"><stop stopColor="#d9ffe8" /><stop offset=".3" stopColor="#426fb0" /><stop offset=".5" stopColor="#d1f9ef" /><stop offset=".72" stopColor="#30526a" /><stop offset="1" stopColor="#8cdecf" /></linearGradient></defs><g stroke="url(#object-fallback)" strokeWidth="58"><ellipse cx="300" cy="300" rx="173" ry="91" transform="rotate(-50 300 300)" /><ellipse cx="300" cy="300" rx="173" ry="91" transform="rotate(50 300 300)" /><ellipse cx="300" cy="300" rx="173" ry="91" transform="rotate(90 300 300)" /></g></svg></div>
          <SculptureBoundary onFallback={onFallback}><Suspense fallback={null}><Sculpture mode={mode} paused={paused || Boolean(reduce)} onReady={onReady} onFallback={onFallback} /></Suspense></SculptureBoundary>
          <span className="studio-object__coordinate" aria-hidden="true">JC—001<br />FORMA / FUNCIÓN</span>
          <div className="studio-object__badge" aria-hidden="true"><span>DISEÑO</span><svg viewBox="0 0 70 70" fill="none"><path d="M35 3V67M3 35H67M12 12L58 58M12 58L58 12" stroke="currentColor" strokeWidth="2" /></svg><span>EN MOVIMIENTO</span></div>
          {!reduce && <button type="button" className="studio-motion-control" onClick={() => setPaused((value) => !value)} aria-pressed={paused} aria-label={paused ? 'Reanudar animación 3D' : 'Pausar animación 3D'}>{paused ? <Play size={13} aria-hidden="true" /> : <Pause size={13} aria-hidden="true" />}<span>{paused ? 'Reanudar' : 'Pausar'}</span></button>}
        </motion.div>
      </div>
      <div className="studio-hero__bottom">
        <div className="studio-materials"><div role="group" aria-label="Explorar diseño, ingeniería e inteligencia">{MODES.map((item, index) => <button key={item.label} type="button" onClick={() => setMode(index)} aria-pressed={mode === index}><span>0{index + 1}</span>{item.label}<i aria-hidden="true" /></button>)}</div><p aria-live="polite">{MODES[mode].description}</p></div>
        <a href={PROJECT.url} target="_blank" rel="noreferrer" className="studio-latest"><img src={PROJECT.shotHero} alt="Sitio de Soporte 2.0" width={1800} height={1013} decoding="async" /><span><small>DEL ESTUDIO AL MUNDO</small><strong>Soporte 2.0 <ArrowUpRight size={15} aria-hidden="true" /></strong></span></a>
      </div>
      <div className="studio-scroll-note"><span>SCROLL PARA EXPLORAR</span><span aria-hidden="true">↓</span><span>DISEÑAMOS LO QUE VIENE.</span></div>
    </section>
  );
};
export default Hero;
