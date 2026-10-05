import { t } from '../../i18n/locale';
import { useState } from 'react';
import { ArrowUpRight, Check } from 'lucide-react';
import { Label, Reveal } from './primitives';
import ContactCTA from './ContactCTA';

const PATHS = [
  { label: t("Crear un sistema", "Build a system"), need: 'Sistema / backend', detail: t("Una web que se sienta tuya. Un backend que ordene tu operación. Empezamos por lo que tu negocio necesita resolver.", "A website that feels like you. A backend that organizes your operations. We start with what your business needs to solve."), action: t("Hablemos de mi sistema", "Let's talk about my system"), tags: [t("Diseño + desarrollo", "Design + development"), t("Procesos conectados", "Connected processes")] },
  { label: t("Entender mis datos", "Understand my data"), need: 'Dashboard', detail: t("Pasá de archivos dispersos a una vista que te ayude a decidir. Definimos qué medir, de dónde salen los datos y cómo verlos.", "Move from scattered files to a view that helps you decide. We define what to measure, where the data comes from and how to display it."), action: t("Hablemos de mis datos", "Let's talk about my data"), tags: [t("Finanzas + indicadores", "Finance + metrics"), t("Dashboards a medida", "Custom dashboards")] },
  { label: t("Integrar inteligencia", "Integrate intelligence"), need: 'Integración de IA', detail: t("Elegimos un proceso concreto y evaluamos dónde la IA puede aportar: consultar documentos, clasificar información o asistir a tu equipo.", "We choose a specific process and assess where AI can help: searching documents, classifying information or assisting your team."), action: t("Exploremos mi caso de IA", "Let's explore my AI use case"), tags: [t("Un caso de uso claro", "A clear use case"), t("Integración con tus sistemas", "Integration with your systems")] },
  { label: t("Impulsar mi marca", "Grow my brand"), need: 'Marketing digital', detail: t("Contenido, diseño y campañas con una dirección compartida. Conectamos lo que tu marca comunica con la acción que querés que las personas tomen.", "Content, design and campaigns with a shared direction. We connect your brand's message with the action you want people to take."), action: t("Hablemos de mi marketing", "Let's talk about my marketing"), tags: [t("Contenido + campañas", "Content + campaigns"), t("Seguimiento de resultados", "Results tracking")] },
];

export default function ProjectStart() {
  const [selected, setSelected] = useState(0);
  const path = PATHS[selected];
  return (
    <section id="empezar" className="project-start" aria-labelledby="project-start-title">
      <div className="project-start__container">
        <Reveal className="project-start__art">
          <img src={`${import.meta.env.BASE_URL}artwork/project-gateway.webp`} width="1200" height="800" loading="lazy" decoding="async" alt={t("Arcos de metal y vidrio conectados por una cinta de cobre sobre una escalera: una idea que avanza hacia su siguiente etapa.", "Metal and glass arches connected by a copper ribbon above a staircase: an idea moving toward its next stage.")} />
          <span className="project-start__edition">JC / NEXT CHAPTER — 003</span>
          <div className="project-start__art-note"><span>{t("De la posibilidad", "From possibility")}<br /><em>{t("a la realidad.", "to reality.")}</em></span><ArrowUpRight size={32} strokeWidth={1} aria-hidden="true" /></div>
        </Reveal>
        <div className="project-start__copy">
          <Label>{t("El próximo proyecto puede ser el tuyo.", "The next project could be yours.")}</Label>
          <h2 id="project-start-title">{t("Tu siguiente", "Your next")}<br /><em>{t("gran paso.", "big step.")}</em></h2>
          <p className="project-start__prompt">{t("¿Qué querés hacer posible?", "What would you like to make possible?")}</p>
          <div className="project-start__paths" role="group" aria-label={t("Elegir el objetivo de mi proyecto", "Choose my project goal")}>
            {PATHS.map((item, i) => <button type="button" key={item.need} aria-pressed={selected === i} onClick={() => setSelected(i)}><span>0{i + 1}</span>{item.label}<ArrowUpRight size={15} aria-hidden="true" /></button>)}
          </div>
          <div className="project-start__answer" aria-live="polite" aria-atomic="true"><p>{path.detail}</p><ul>{path.tags.map(tag => <li key={tag}><Check size={12} aria-hidden="true" />{tag}</li>)}</ul></div>
          <ContactCTA need={path.need} source={t("Tu siguiente gran paso", "Your next big step")} variant="lime" className="project-start__cta">{path.action}</ContactCTA>
          <p className="project-start__note">{t("Primera conversación de 30 min, sin costo.", "First 30-minute conversation, free of charge.")}<br />{t("No necesitás llegar con todo resuelto.", "You don't need to have it all figured out.")}</p>
        </div>
      </div>
    </section>
  );
}
