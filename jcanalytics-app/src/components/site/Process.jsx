import { t } from '../../i18n/locale';
import { ArrowUpRight, Check, MessageCircle, Layers } from 'lucide-react';
import { Label, MaskLines, Reveal } from './primitives';
import ContactCTA from './ContactCTA';

const STEPS = [
  { n: '01', title: t("Hablamos", "We talk"), line: t("30 minutos. Sin costo.", "30 minutes. No cost."), detail: t("El punto de partida", "The starting point"), icon: MessageCircle },
  { n: '02', title: t("Construimos", "We build"), line: t("Ves avances cada 72 h.", "You see progress every 72 hours."), detail: t("La idea toma forma", "The idea takes shape"), icon: Layers },
  { n: '03', title: t("Lanzamos", "We launch"), line: t("Con 30 días de soporte.", "With 30 days of support."), detail: t("Tu próximo capítulo", "Your next chapter"), icon: Check },
];
const Process = () => (
  <section id="proceso" className="process-section scroll-mt-24" aria-labelledby="process-title">
    <div className="closing-container">
      <div className="closing-heading process-heading">
        <div>
          <Label className="closing-label">{t("Cómo lo hacemos / Proceso", "How we work / Process")}</Label>
          <h2 id="process-title" className="closing-title font-display">
            <MaskLines lines={[t("Así de", "Keep it"), <span key="simple" className="font-serif italic font-normal">{t("simple.", "simple.")}</span>]} />
          </h2>
        </div>
        <Reveal delay={0.15} className="process-heading__aside">
          <span className="process-heading__index font-display">01 — 03</span>
          <span className="closing-kicker">{t("Una conversación. El siguiente paso.", "One conversation. The next step.")}</span>
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
        <ContactCTA need="Sistema / backend" source={t("Primera conversación de 30 minutos", "First 30-minute conversation")} variant="ink" size="lg">{t("Coordinar primera llamada", "Schedule a first call")}</ContactCTA>
        <span>{t("Respondemos en menos de 24 h.", "We reply within 24 hours.")}</span>
      </Reveal>
    </div>
  </section>
);
export default Process;
