// ============================================================================
//  ¿Qué arriesgo? · los cuatro compromisos publicados (WORK_PROMISES), textuales.
//
//  Auditoría de noviembre de 2026 (lo que cambió y por qué):
//    · Cada compromiso va debajo de la duda de quien compra que responde. Antes
//      el encabezado de cada uno era un numeral decorativo de «01» a «04».
//    · El titular de la portada promete entrega a tiempo y ninguna sección decía
//      cómo: ahora lo explica el encabezado, con hechos ya publicados (plazo de
//      cada paquete, alcance por escrito y avances cada 72 horas).
//    · El botón decía «Agendar los 30 minutos» y no agendaba nada: llevaba al
//      formulario. Ahora pide la conversación con el mensaje ya escrito (WhatsApp
//      en celular, formulario corto en computadora) y lo dice.
//    · «Así se ve el portal de clientes» abría una pantalla de ingreso. El acceso
//      queda para quien ya es cliente, junto al compromiso que nombra el portal.
// ============================================================================
import { t, locale } from '../../i18n/locale';
import { ArrowDown, ArrowUpRight, CalendarClock, FileSignature, LifeBuoy, MessagesSquare } from 'lucide-react';
import { WORK_PROMISES } from '../../content/service-offers';
import { Label, MaskLines, Reveal } from './primitives';
import { PORTAL_URL, wa } from './links';
import { MESSAGES } from './messages';
import ContactIcon from './ContactIcon';
import { useDesktop } from '../../hooks/useDesktop';

const ICONS = [MessagesSquare, FileSignature, CalendarClock, LifeBuoy];
// La duda que cada compromiso responde, en el mismo orden que WORK_PROMISES.
const QUESTIONS = [
  t('¿Cuánto cuesta preguntar?', 'What does it cost to ask?'),
  t('¿Cuánto voy a pagar?', 'How much will I pay?'),
  t('¿Cómo sé que avanza?', 'How do I know it is moving?'),
  t('¿Y si algo falla después?', 'What if something fails later?'),
];
const PORTAL_PROMISE = 2;

const Process = () => {
  // Celular: abre WhatsApp. Computadora: abre el formulario corto (ui/LeadDialog.jsx); el texto no promete WhatsApp.
  const desktop = useDesktop();
  return (
    <section id="proceso" className="process-section scroll-mt-24" aria-labelledby="process-title">
      <div className="closing-container">
        <div className="closing-heading process-heading">
          <div>
            <Label className="closing-label">{t('¿Qué arriesgo? / Compromisos', 'What do I risk? / Commitments')}</Label>
            <h2 id="process-title" className="closing-title font-display">
              <MaskLines lines={[t('Cuatro compromisos,', 'Four commitments,'), <span key="written" className="font-serif italic font-normal">{t('por escrito.', 'in writing.')}</span>]} />
            </h2>
          </div>
          <Reveal delay={0.15} className="process-heading__aside">
            <p className="process-heading__how">{t(
              'Así cumplimos lo de «a tiempo»: el plazo de cada paquete está publicado, el alcance queda por escrito antes de empezar y cada 72 horas ves el avance.',
              'This is how we keep “on time”: every package publishes its timeline, the scope is in writing before we start and you see progress every 72 hours.',
            )}</p>
            <span className="closing-kicker">{t('Lo mismo que firmamos en cada propuesta.', 'The same terms we put in every proposal.')}</span>
          </Reveal>
        </div>
        <ol className="process-sequence process-sequence--promises">
          {WORK_PROMISES[locale].map(([title, detail], index) => {
            const Icon = ICONS[index];
            return (
              <li key={title} className="process-step">
                <Reveal delay={index * 0.1} className="process-step__content">
                  <div className="process-step__top">
                    <span className="process-step__question font-serif">{QUESTIONS[index]}</span>
                    <span className="process-step__icon" aria-hidden="true"><Icon size={23} strokeWidth={1.5} /></span>
                  </div>
                  <div className="process-step__line" aria-hidden="true"><span /></div>
                  <h3 className="font-display">{title}</h3><p>{detail}</p>
                  {index === PORTAL_PROMISE && (
                    <a href={`${PORTAL_URL}/cliente`} target="_blank" rel="noreferrer" className="process-step__portal" data-track-label="Compromisos · Portal de clientes">
                      {t('¿Ya sos cliente? Entrar a tu portal', 'Already a client? Open your portal')}<ArrowUpRight size={15} aria-hidden="true" /><span className="sr-only"> {t('(se abre en otra pestaña)', '(opens in a new tab)')}</span>
                    </a>
                  )}
                </Reveal>
              </li>
            );
          })}
        </ol>
        <Reveal delay={0.2} className="process-action">
          <a className="jca-wa" href={wa(MESSAGES.firstCall)} target="_blank" rel="noreferrer" data-need="Otro" data-track-label="Compromisos · 30 minutos">
            <ContactIcon size={19} />{desktop ? t('Pedir mis 30 minutos sin costo', 'Request my free 30 minutes') : t('Pedir mis 30 minutos · WhatsApp', 'Request my 30 minutes · WhatsApp')}
          </a>
          <p className="process-action__people">
            {t('Hablás con quien hace el trabajo: cinco personas, sin intermediarios.', 'You talk to the people doing the work: five people, no middlemen.')}{' '}
            <a href="#equipo" data-track-label="Compromisos · Equipo">{t('Conocé al equipo', 'Meet the team')}<ArrowDown size={15} aria-hidden="true" /></a>
          </p>
        </Reveal>
      </div>
    </section>
  );
};
export default Process;
