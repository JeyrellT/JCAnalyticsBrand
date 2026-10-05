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
          <h2 id="faq-title">{t('Buenas preguntas.', 'Good questions.')}<br /><em>{t('Respuestas claras.', 'Clear answers.')}</em></h2>
          <p>{t('Software, datos y diseño con un punto de partida claro: lo que tu negocio necesita.', 'Software, data and design with a clear starting point: what your business needs.')}</p>
          <a href="#cotizar">{t('Explorá el costo de tu proyecto', 'Explore your project budget')} <ArrowUpRight size={18} aria-hidden="true" /></a>
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
