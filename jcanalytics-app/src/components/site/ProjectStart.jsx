import { useState } from 'react';
import { ArrowUpRight, Check } from 'lucide-react';
import { Label, Reveal } from './primitives';
import ContactCTA from './ContactCTA';

const PATHS = [
  { label: 'Crear un sistema', need: 'Sistema / backend', detail: 'Una web que se sienta tuya. Un backend que ordene tu operación. Empezamos por lo que tu negocio necesita resolver.', action: 'Hablemos de mi sistema', tags: ['Diseño + desarrollo', 'Procesos conectados'] },
  { label: 'Entender mis datos', need: 'Dashboard', detail: 'Pasá de archivos dispersos a una vista que te ayude a decidir. Definimos qué medir, de dónde salen los datos y cómo verlos.', action: 'Hablemos de mis datos', tags: ['Finanzas + indicadores', 'Dashboards a medida'] },
  { label: 'Integrar inteligencia', need: 'Integración de IA', detail: 'Elegimos un proceso concreto y evaluamos dónde la IA puede aportar: consultar documentos, clasificar información o asistir a tu equipo.', action: 'Exploremos mi caso de IA', tags: ['Un caso de uso claro', 'Integración con tus sistemas'] },
  { label: 'Impulsar mi marca', need: 'Marketing digital', detail: 'Contenido, diseño y campañas con una dirección compartida. Conectamos lo que tu marca comunica con la acción que querés que las personas tomen.', action: 'Hablemos de mi marketing', tags: ['Contenido + campañas', 'Seguimiento de resultados'] },
];

export default function ProjectStart() {
  const [selected, setSelected] = useState(0);
  const path = PATHS[selected];
  return (
    <section id="empezar" className="project-start" aria-labelledby="project-start-title">
      <div className="project-start__container">
        <Reveal className="project-start__art">
          <img src={`${import.meta.env.BASE_URL}artwork/project-gateway.webp`} width="1200" height="800" loading="lazy" decoding="async" alt="Arcos de metal y vidrio conectados por una cinta de cobre sobre una escalera: una idea que avanza hacia su siguiente etapa." />
          <span className="project-start__edition">JC / NEXT CHAPTER — 003</span>
          <div className="project-start__art-note"><span>De la posibilidad<br /><em>a la realidad.</em></span><ArrowUpRight size={32} strokeWidth={1} aria-hidden="true" /></div>
        </Reveal>
        <div className="project-start__copy">
          <Label>El próximo proyecto puede ser el tuyo.</Label>
          <h2 id="project-start-title">Tu siguiente<br /><em>gran paso.</em></h2>
          <p className="project-start__prompt">¿Qué querés hacer posible?</p>
          <div className="project-start__paths" role="group" aria-label="Elegir el objetivo de mi proyecto">
            {PATHS.map((item, i) => <button type="button" key={item.need} aria-pressed={selected === i} onClick={() => setSelected(i)}><span>0{i + 1}</span>{item.label}<ArrowUpRight size={15} aria-hidden="true" /></button>)}
          </div>
          <div className="project-start__answer" aria-live="polite" aria-atomic="true"><p>{path.detail}</p><ul>{path.tags.map(tag => <li key={tag}><Check size={12} aria-hidden="true" />{tag}</li>)}</ul></div>
          <ContactCTA need={path.need} source="Tu siguiente gran paso" variant="lime" className="project-start__cta">{path.action}</ContactCTA>
          <p className="project-start__note">Primera conversación de 30 min, sin costo.<br />No necesitás llegar con todo resuelto.</p>
        </div>
      </div>
    </section>
  );
}
