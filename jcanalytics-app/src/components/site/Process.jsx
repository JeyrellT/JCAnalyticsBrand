import { ArrowUpRight, Check, MessageCircle, Layers } from 'lucide-react';
import { Label, MaskLines, Reveal } from './primitives';
import ContactCTA from './ContactCTA';

const STEPS = [
  { n: '01', title: 'Hablamos', line: '30 minutos. Sin costo.', detail: 'El punto de partida', icon: MessageCircle },
  { n: '02', title: 'Construimos', line: 'Ves avances cada 72 h.', detail: 'La idea toma forma', icon: Layers },
  { n: '03', title: 'Lanzamos', line: 'Con 30 días de soporte.', detail: 'Tu próximo capítulo', icon: Check },
];
const Process = () => (
  <section id="proceso" className="process-section scroll-mt-24" aria-labelledby="process-title">
    <div className="closing-container">
      <div className="closing-heading process-heading">
        <div>
          <Label className="closing-label">Cómo lo hacemos / Proceso</Label>
          <h2 id="process-title" className="closing-title font-display">
            <MaskLines lines={['Así de', <span key="simple" className="font-serif italic font-normal">simple.</span>]} />
          </h2>
        </div>
        <Reveal delay={0.15} className="process-heading__aside">
          <span className="process-heading__index font-display">01 — 03</span>
          <span className="closing-kicker">Una conversación. El siguiente paso.</span>
        </Reveal>
      </div>
      <ol className="process-sequence">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          return (
            <li key={step.n} className="process-step">
              <Reveal delay={index * 0.12} className="process-step__content">
                <div className="process-step__top">
                  <span className="process-step__number font-display">{step.n}</span>
                  <span className="process-step__icon" aria-hidden="true"><Icon size={23} strokeWidth={1.5} /></span>
                </div>
                <div className="process-step__line" aria-hidden="true"><span /></div>
                <span className="closing-kicker process-step__detail">{step.detail}</span>
                <h3 className="font-display">{step.title}</h3><p>{step.line}</p>
                <ArrowUpRight className="process-step__arrow" size={23} strokeWidth={1.4} aria-hidden="true" />
              </Reveal>
            </li>
          );
        })}
      </ol>
      <Reveal delay={0.2} className="process-action">
        <ContactCTA need="Sistema / backend" source="Primera conversación de 30 minutos" variant="ink" size="lg">Coordinar primera llamada</ContactCTA>
        <span>Respondemos en menos de 24 h.</span>
      </Reveal>
    </div>
  </section>
);
export default Process;
