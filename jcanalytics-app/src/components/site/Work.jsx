import { t, locale } from '../../i18n/locale';
import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Check } from 'lucide-react';
import { SOLUTION_CONCEPTS } from '../../data/webProperties';
import { journalPath } from '../../seo/routes';
import { Label, MaskLines, Reveal } from './primitives';
import ContactCTA from './ContactCTA';
import '../../styles/portfolio.css';

const _MOTION = motion;

const Work = () => {
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();
  const concept = SOLUTION_CONCEPTS[active];
  return (
    <section id="trabajo" className="case-section" aria-labelledby="work-title">
      <div className="case-container">
        <div className="case-heading">
          <div>
            <Label>{t('Explorar posibilidades / Ejemplos', 'Explore possibilities / Examples')}</Label>
            <h2 id="work-title"><MaskLines lines={[t('Imaginá lo', 'Imagine what'), <em key="next">{t('que sigue.', 'comes next.')}</em>]} /></h2>
          </div>
          <Reveal className="case-heading__aside">
            <span className="case-count">{String(SOLUTION_CONCEPTS.length).padStart(2, '0')}<span>{t('IDEAS PARA', 'IDEAS TO')}<br />{t('EXPLORAR', 'EXPLORE')}</span></span>
            <p>{t('Ejemplos conceptuales e ilustraciones para conversar sobre tu próximo proyecto. Cada propuesta se define según tu necesidad.', 'Concept examples and illustrations to start a conversation about your next project. Each proposal is shaped around your needs.')}</p>
          </Reveal>
        </div>
        <Reveal className="case-feature case-feature--concept">
          <div className="case-feature__top"><span>{t('CONTENIDO ILUSTRATIVO / EJEMPLOS CONCEPTUALES', 'ILLUSTRATIVE CONTENT / CONCEPT EXAMPLES')}</span><span>0{active + 1} — 0{SOLUTION_CONCEPTS.length}</span></div>
          <div className="case-feature__layout">
            <div className="case-feature__copy" id="concept-description" aria-live="polite">
              <span className="case-feature__sector">{concept.sector}</span>
              <h3>{concept.name}</h3><p>{concept.description}</p>
              <ul>{concept.features.map((feature) => <li key={feature}><Check size={13} aria-hidden="true" />{feature}</li>)}</ul>
              <a href={concept.href} className="case-feature__link">{t('Conocer el servicio', 'Explore the service')}<span><ArrowUpRight size={20} aria-hidden="true" /></span></a>
              <ContactCTA need={concept.need} source={t(`Ejemplo conceptual: ${concept.label}`, `Concept example: ${concept.label}`)} variant="ghost" className="case-feature__inquiry">{t('Conversemos sobre mi idea', 'Let’s discuss my idea')}</ContactCTA>
            </div>
            <a href={concept.href} className="case-feature__visual" aria-label={t(`Conocer el servicio: ${concept.label}`, `Explore the service: ${concept.label}`)} style={{ '--project-color': concept.accent }}>
              <span className="case-feature__halo" aria-hidden="true" />
              <AnimatePresence mode="wait" initial={false}><motion.img key={concept.id} src={concept.image} width={1536} height={1024} loading="lazy" decoding="async" alt={concept.imageAlt} initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 0.3 }} /></AnimatePresence>
              <span className="case-feature__url">{t('ILUSTRACIÓN CONCEPTUAL', 'CONCEPTUAL ILLUSTRATION')}<ArrowUpRight size={13} aria-hidden="true" /></span>
            </a>
          </div>
          <div className="case-feature__selector" role="group" aria-label={t('Elegir ejemplo conceptual', 'Choose a concept example')}>
            {SOLUTION_CONCEPTS.map((item, index) => <button key={item.id} type="button" aria-pressed={active === index} aria-controls="concept-description" onClick={() => setActive(index)}><span>0{index + 1}</span>{item.label}<ArrowUpRight size={16} aria-hidden="true" /></button>)}
          </div>
        </Reveal>
        <Reveal className="case-demos">
          <div><Label>{t('Ideas para elegir mejor.', 'Ideas for better decisions.')}</Label><p>{t('Aprendé. Preguntá. Definí tu siguiente paso.', 'Learn. Ask. Define your next step.')}</p></div>
          <div><a href={journalPath(locale)}>{t('Explorar artículos y preguntas', 'Explore articles and questions')}<ArrowUpRight size={16} aria-hidden="true" /></a></div>
        </Reveal>
      </div>
    </section>
  );
};
export default Work;
