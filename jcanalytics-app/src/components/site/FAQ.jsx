import { ArrowUpRight, Plus } from 'lucide-react';
import { content } from '../../seo/site';
import { locale, t } from '../../i18n/locale';
import { Label, Reveal } from './primitives';
import '../../styles/discovery.css';

export default function FAQ() {
  return (
    <section className="discovery-faq" id="preguntas" aria-labelledby="faq-title">
      <div className="discovery-faq__layout">
        <Reveal className="discovery-faq__intro">
          <Label>{t('Antes del primer paso', 'Before your first step')}</Label>
          <h2 id="faq-title">{t('Antes de escribirnos,', 'Before you write to us,')}<br /><em>{t('lo que más preguntan.', 'what people ask most.')}</em></h2>
          <p>{t('Seis respuestas cortas. Si la tuya no está, contanos tu caso y la respondemos en la primera conversación.', 'Six short answers. If yours is not here, tell us your case and we answer it in the first conversation.')}</p>
          <a href="#contacto">{t('Contanos tu caso', 'Tell us your case')} <ArrowUpRight size={18} aria-hidden="true" /></a>
        </Reveal>
        <div className="discovery-faq__questions">
          {content[locale].faq.map(([question, answer], index) => (
            <details key={question}>
              <summary><span className="discovery-faq__number">0{index + 1}</span><span>{question}</span><Plus size={18} aria-hidden="true" /></summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
