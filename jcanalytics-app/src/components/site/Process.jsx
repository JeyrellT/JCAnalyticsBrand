import { t, locale } from '../../i18n/locale';
import { ArrowUpRight, CalendarClock, FileSignature, LifeBuoy, MessagesSquare } from 'lucide-react';
import { WORK_PROMISES } from '../../content/service-offers';
import { Label, MaskLines, Reveal } from './primitives';
import { PORTAL_URL } from './links';
import ContactCTA from './ContactCTA';

// ============================================================================
//  Cómo trabajamos: los cuatro compromisos publicados (WORK_PROMISES), textuales,
//  en lugar de los tres pasos genéricos. Revisión de neuromarketing, ventas y
//  marketing del 2 de noviembre de 2026: la certeza va antes del precio y el
//  proceso se cuenta una sola vez en la portada.
// ============================================================================
const ICONS = [MessagesSquare, FileSignature, CalendarClock, LifeBuoy];

const Process = () => (
  <section id="proceso" className="process-section scroll-mt-24" aria-labelledby="process-title">
    <div className="closing-container">
      <div className="closing-heading process-heading">
        <div>
          <Label className="closing-label">{t("Cómo trabajamos / Compromisos", "How we work / Commitments")}</Label>
          <h2 id="process-title" className="closing-title font-display">
            <MaskLines lines={[t("Cuatro compromisos,", "Four commitments,"), <span key="written" className="font-serif italic font-normal">{t("por escrito.", "in writing.")}</span>]} />
          </h2>
        </div>
        <Reveal delay={0.15} className="process-heading__aside">
          <span className="process-heading__index font-display">01 — 04</span>
          <span className="closing-kicker">{t("Lo mismo que firmamos en cada propuesta.", "The same terms we put in every proposal.")}</span>
        </Reveal>
      </div>
      <ol className="process-sequence process-sequence--promises">
        {WORK_PROMISES[locale].map(([title, detail], index) => {
          const Icon = ICONS[index];
          return (
            <li key={title} className="process-step">
              <Reveal delay={index * 0.1} className="process-step__content">
                <div className="process-step__top">
                  <span className="process-step__number font-display">0{index + 1}</span>
                  <span className="process-step__icon" aria-hidden="true"><Icon size={23} strokeWidth={1.5} /></span>
                </div>
                <div className="process-step__line" aria-hidden="true"><span /></div>
                <h3 className="font-display">{title}</h3><p>{detail}</p>
              </Reveal>
            </li>
          );
        })}
      </ol>
      <Reveal delay={0.2} className="process-action">
        <ContactCTA need="Sistema / backend" source={t("Primera conversación de 30 minutos", "First 30-minute conversation")} variant="ink" size="lg">{t("Agendar los 30 minutos", "Book the 30 minutes")}</ContactCTA>
        <a href={`${PORTAL_URL}/cliente`} target="_blank" rel="noreferrer" className="process-action__portal">{t("Así se ve el portal de clientes", "See the client portal")} <ArrowUpRight size={15} aria-hidden="true" /></a>
      </Reveal>
    </div>
  </section>
);
export default Process;
