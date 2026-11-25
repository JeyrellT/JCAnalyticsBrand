// ¿Qué más debería saber? · seis respuestas a las dudas que frenan una consulta (precio, plazo, riesgo y
// qué pasa después de escribir). El contenido vive en seo/site.js porque también alimenta el JSON-LD y el
// asistente. Auditoría de noviembre de 2026: el botón pide la respuesta con el mensaje ya escrito
// (WhatsApp en celular, formulario corto en computadora) en vez de bajar a otro formulario.
import { Plus } from 'lucide-react';
import { content } from '../../seo/site';
import { locale, t } from '../../i18n/locale';
import { Label, Reveal } from './primitives';
import { wa } from './links';
import { MESSAGES } from './messages';
import ContactIcon from './ContactIcon';
import { useDesktop } from '../../hooks/useDesktop';
import '../../styles/discovery.css';

export default function FAQ() {
  const desktop = useDesktop();
  return (
    <section className="discovery-faq" id="preguntas" aria-labelledby="faq-title">
      <div className="discovery-faq__layout">
        <Reveal className="discovery-faq__intro">
          <Label>{t('¿Qué más debería saber? / Preguntas', 'What else should I know? / Questions')}</Label>
          <h2 id="faq-title">{t('Antes de escribirnos,', 'Before you write to us,')}{' '}<br /><em>{t('lo que más preguntan.', 'what people ask most.')}</em></h2>
          <p>{t('Seis respuestas cortas sobre precio, plazo y qué pasa después. Si la tuya no está, preguntanos: responde una persona del equipo.', 'Six short answers about price, timing and what happens next. If yours is not here, ask us: a person from the team replies.')}</p>
          <a className="jca-wa" href={wa(MESSAGES.question)} target="_blank" rel="noreferrer" data-need="Otro" data-track-label="Preguntas · Hacer mi pregunta">
            <ContactIcon size={18} />{desktop ? t('Hacer mi pregunta', 'Ask my question') : t('Hacer mi pregunta · WhatsApp', 'Ask my question · WhatsApp')}
          </a>
        </Reveal>
        <div className="discovery-faq__questions">
          {content[locale].faq.map(([question, answer], index) => (
            <details key={question}>
              <summary data-track-label={`Preguntas · Abrir · 0${index + 1}`}><span className="discovery-faq__number" aria-hidden="true">0{index + 1}</span><span>{question}</span><Plus size={18} aria-hidden="true" /></summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
