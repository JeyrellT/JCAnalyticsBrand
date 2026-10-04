import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowDown, ArrowUpRight, Check } from 'lucide-react';
import { WEB_PROPERTIES, CLIENT_SITES, DEMO_SITES } from '../../data/webProperties';
import { Label, MaskLines, Reveal } from './primitives';
import ContactCTA from './ContactCTA';
import MobileRail from './MobileRail';
import '../../styles/portfolio.css';

const _MOTION = motion;
const ALL = [...WEB_PROPERTIES, ...CLIENT_SITES];
const PRODUCTS = ['barberxcr', 'tallerticos', 'cotizadorvip'].map((id) => ALL.find((site) => site.id === id));
const GALLERY = ['soporte2', 'rafael-inclusive', 'silglobalcr', 'uniquexcr', 'laburradacr', 'glowstudiocr'].map((id) => ALL.find((site) => site.id === id));
const CLIENT_IDS = new Set(CLIENT_SITES.map((site) => site.id));

const Work = () => {
  const [active, setActive] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const reduce = useReducedMotion();
  const project = PRODUCTS[active];
  return (
    <section id="trabajo" className="case-section" aria-labelledby="work-title">
      <div className="case-container">
        <div className="case-heading"><div><Label>El trabajo habla / Selección del estudio</Label><h2 id="work-title"><MaskLines lines={['Ideas atrevidas.', <em key="real">Sistemas reales.</em>]} /></h2></div><Reveal className="case-heading__aside"><span className="case-count">{String(PRODUCTS.length + GALLERY.length).padStart(2, '0')}<span>PROYECTOS<br />PARA EXPLORAR</span></span><p>Productos que operamos. Marcas que acompañamos. Cada proyecto, una forma distinta de resolver algo importante.</p></Reveal></div>
        <Reveal className="case-feature">
          <div className="case-feature__top"><span>SISTEMAS DESARROLLADOS / EN PRODUCCIÓN</span><span>0{active + 1} — 03</span></div>
          <div className="case-feature__layout">
            <div className="case-feature__copy"><span className="case-feature__sector">{project.sector}</span><h3>{project.name}</h3><p>{project.tagline}</p><ul>{project.features.slice(0, 2).map((feature) => <li key={feature}><Check size={13} aria-hidden="true" />{feature}</li>)}</ul><a href={project.url} target="_blank" rel="noreferrer" className="case-feature__link">Explorar {project.name}<span><ArrowUpRight size={20} aria-hidden="true" /></span></a><ContactCTA need="Sistema / backend" source={`Proyecto de referencia: ${project.name}`} variant="ghost" className="case-feature__inquiry">Quiero una solución para mi negocio</ContactCTA></div>
            <a href={project.url} target="_blank" rel="noreferrer" className="case-feature__visual" aria-label={`Visitar ${project.name}, abre en otra pestaña`} style={{ '--project-color': project.accent }}>
              <span className="case-feature__halo" aria-hidden="true" />
              <AnimatePresence mode="wait" initial={false}><motion.img key={project.id} src={project.shotHero} width={1800} height={1013} loading="lazy" alt={`Interfaz de ${project.name}`} initial={reduce ? false : { opacity: 0, y: 15, rotate: -1 }} animate={{ opacity: 1, y: 0, rotate: -3 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: reduce ? 0 : 0.35 }} /></AnimatePresence>
              <span className="case-feature__url">{project.domain}<ArrowUpRight size={13} aria-hidden="true" /></span>
            </a>
          </div>
          <div className="case-feature__selector" role="group" aria-label="Elegir producto destacado">{PRODUCTS.map((item, index) => <button key={item.id} type="button" aria-pressed={active === index} onClick={() => setActive(index)}><span>0{index + 1}</span>{item.name}<ArrowUpRight size={16} aria-hidden="true" /></button>)}</div>
        </Reveal>
        <div className="case-gallery-label"><span>OTRAS FORMAS DE HACERLO DIFERENTE</span><span>WEB / DISEÑO / EXPERIENCIA</span></div>
        <MobileRail className="case-gallery" label="Proyectos del estudio">{GALLERY.slice(0, expanded ? GALLERY.length : 3).map((site, index) => <Reveal key={site.id} className="case-card" delay={index % 2 * 0.1}><a href={site.url} target="_blank" rel="noreferrer" aria-label={`Explorar ${site.name}: ${site.tagline}`}>
          <div className={`case-preview case-preview--${site.id}`} style={{ '--project-color': site.accent }}><span className="case-preview__serial">JC / 0{index + 4}</span><img src={site.shotHero} width={1800} height={1013} loading="lazy" alt={`Diseño de ${site.name} para escritorio`} className="case-preview__desktop" /><img src={site.shotMobile} width={390} height={844} loading="lazy" alt={`Versión móvil de ${site.name}`} className="case-preview__phone" /><span className="case-preview__open"><ArrowUpRight size={23} aria-hidden="true" /></span></div>
          <div className="case-caption"><div><span>{CLIENT_IDS.has(site.id) ? 'CLIENTE' : 'PRODUCTO PROPIO'} / {site.sector}</span><h3>{site.name}</h3></div><ArrowUpRight size={25} strokeWidth={1.2} aria-hidden="true" /></div><p className="case-card__tagline">{site.tagline}</p><ul className="case-card__stack">{site.stack.slice(0, 3).map((tag) => <li key={tag}>{tag}</li>)}</ul>
        </a></Reveal>)}</MobileRail>
        <button type="button" className="case-expand" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>{expanded ? 'Volver a la selección' : 'Explorar 3 proyectos más'}<ArrowDown size={18} aria-hidden="true" style={{ transform: expanded ? 'rotate(180deg)' : undefined }} /></button>
        <Reveal className="case-demos"><div><Label>El laboratorio está abierto.</Label><p>Explorá. Probá. Imaginá lo siguiente.</p></div><div>{DEMO_SITES.map((site) => <a key={site.id} href={site.url} target="_blank" rel="noreferrer">{site.name}<ArrowUpRight size={16} aria-hidden="true" /></a>)}</div></Reveal>
      </div>
    </section>
  );
};
export default Work;
