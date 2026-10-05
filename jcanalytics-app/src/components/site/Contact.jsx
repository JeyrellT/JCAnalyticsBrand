import { t } from '../../i18n/locale';
import { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowRight, Check } from 'lucide-react';
import { Label, MaskLines, Reveal } from './primitives';
import { wa, EMAIL } from './links';
import { TEAM } from '../../data/team';

const NEEDS = ['Sistema / backend', 'Página web', 'Finanzas', 'Dashboard', 'Machine learning', 'Integración de IA', 'Automatización', 'Marketing digital', 'Otro'];
const NEED_LABELS = t(NEEDS, ['System / backend', 'Website', 'Finance', 'Dashboard', 'Machine learning', 'AI integration', 'Automation', 'Digital marketing', 'Other']);
const needLabel = (value) => NEED_LABELS[NEEDS.indexOf(value)] || value;
const Contact = () => {
  const [need, setNeed] = useState('Sistema / backend');
  const [name, setName] = useState('');
  const [objective, setObjective] = useState('');
  const [source, setSource] = useState('');
  useEffect(() => {
    let focusFrame;
    const receiveIntent = (event) => {
      if (!NEEDS.includes(event.detail?.need)) return;
      setNeed(event.detail.need);
      setSource(typeof event.detail.source === 'string' ? event.detail.source : '');
      window.cancelAnimationFrame(focusFrame);
      focusFrame = window.requestAnimationFrame(() => document.getElementById('contact-title')?.focus({ preventScroll: true }));
    };
    window.addEventListener('jca:contact-intent', receiveIntent);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener('jca:contact-intent', receiveIntent);
    };
  }, []);
  const message = [
    t(`Hola${name.trim() ? `, soy ${name.trim()}` : ''}. Me interesa: ${needLabel(need)}.`, `Hello${name.trim() ? `, I'm ${name.trim()}` : ''}. I'm interested in: ${needLabel(need)}.`),
    objective.trim() ? t(`Quiero resolver: ${objective.trim()}`, `I'd like to solve: ${objective.trim()}`) : '',
    source ? t(`Llegué desde: ${source}.`, `I came from: ${source}.`) : '',
    t('Me gustaría conversar sobre el alcance y el siguiente paso.', 'I would like to discuss the scope and next steps.'),
  ].filter(Boolean).join('\n\n');
  const href = wa(message);
  return (
    <section id="contacto" className="contact-section scroll-mt-24" aria-labelledby="contact-title">
      <div className="contact-atmosphere" aria-hidden="true" />
      <div className="closing-container contact-container">
        <div className="contact-eyebrow">
          <Label>{t("Tu próximo proyecto / Contacto", "Your next project / Contact")}</Label><span className="closing-kicker">{t("El comienzo de algo bueno.", "The start of something good.")}</span>
        </div>
        <div className="contact-heading">
          <h2 id="contact-title" className="font-display" tabIndex={-1}><MaskLines lines={[t("¿Hablamos?", "Let’s talk.")]} /></h2>
          <span className="contact-heading__arrow" aria-hidden="true"><ArrowUpRight strokeWidth={1} /></span>
        </div>
        <div className="contact-grid">
          <Reveal className="contact-form-wrap">
            <p className="contact-intro">{t("Contanos la idea. En una primera conversación de 30 minutos, sin costo, podemos entender tu objetivo y definir por dónde empezar.", "Tell us your idea. In a free 30-minute conversation, we can understand your goal and work out where to start.")}</p>
            <form onSubmit={(event) => {
              event.preventDefault();
              window.open(href, '_blank', 'noopener,noreferrer');
            }} className="contact-form">
              <fieldset>
                <legend className="contact-form__label"><span>01</span> {t('¿Qué tenés en mente?', 'What do you have in mind?')}</legend>
                <div className="contact-needs">
                  {NEEDS.map((option) => (
                    <button key={option} type="button" onClick={() => { setNeed(option); setSource(''); }} aria-pressed={need === option} className={`contact-need tap-press ${need === option ? 'contact-need--selected' : ''}`}>
                      <Check size={14} aria-hidden="true" className={need === option ? '' : 'contact-need__check--hidden'} />{needLabel(option)}
                    </button>
                  ))}
                </div>
                <p className="contact-selection" role="status">{t('Conversemos sobre:', 'Let’s discuss:')} <strong>{needLabel(need)}</strong></p>
              </fieldset>
              <div className="contact-form__objective">
                <label htmlFor="contacto-objetivo" className="contact-form__label"><span>02</span> {t('¿Qué querés resolver?', 'What would you like to solve?')} <small>{t('(opcional)', '(optional)')}</small></label>
                <textarea id="contacto-objetivo" rows={3} maxLength={600} value={objective} onChange={(event) => setObjective(event.target.value)} placeholder={t("Por ejemplo: hoy llevamos los pedidos en Excel y queremos conectarlos con nuestra web.", "For example: we currently track orders in Excel and want to connect them to our website.")} aria-describedby="contact-objective-note" />
                <p id="contact-objective-note">{t("Una idea en tus palabras es suficiente.", "An idea in your own words is enough.")}</p>
              </div>
              <div className="contact-form__name">
                <label htmlFor="contacto-nombre" className="contact-form__label"><span>03</span> {t('Tu nombre', 'Your name')} <small>{t('(opcional)', '(optional)')}</small></label>
                <input id="contacto-nombre" type="text" autoComplete="name" maxLength={100} placeholder={t("¿Cómo te llamás?", "What is your name?")} value={name} onChange={(event) => setName(event.target.value)} />
              </div>
              <button type="submit" className="contact-submit tap-press">
                <span>{t("Continuar en WhatsApp", "Continue on WhatsApp")}</span>
                <span className="contact-submit__arrow" aria-hidden="true"><ArrowUpRight size={24} strokeWidth={1.8} /></span>
              </button>
              <p className="contact-send-note">{t("Se abrirá WhatsApp con tu mensaje listo para revisar.", "WhatsApp will open with your message ready to review.")}</p>
              <p className="contact-email">{t('¿Preferís correo?', 'Prefer email?')}{' '}<a href={`mailto:${EMAIL}?subject=${encodeURIComponent(t(`Consulta: ${needLabel(need)}`, `Inquiry: ${needLabel(need)}`))}&body=${encodeURIComponent(message)}`}>{EMAIL}</a></p>
            </form>
          </Reveal>
          <Reveal delay={0.15} className="contact-people">
            <div className="contact-people__heading"><span className="closing-kicker">{t("Del otro lado, personas.", "Real people on the other side.")}</span><span aria-hidden="true" className="contact-people__line" /></div>
            <div className="contact-avatars">
              {TEAM.map((person) => <img key={person.id} src={person.avatar} alt={person.name} title={`${person.name} · ${person.role}`} width={400} height={400} loading="lazy" decoding="async" />)}
            </div>
            <p className="contact-people__copy font-display">{t('Te responde', 'You’ll hear from')}<br />{t('el', 'the')} <span className="font-serif italic font-normal">{t('equipo.', 'team.')}</span></p>
            <p className="contact-people__note">{t("No un bot. Las mismas personas que van a trabajar con vos.", "The people replying are the same people who will work with you.")}</p>
            <a href="#equipo" className="contact-people__link">{t('Conocelos', 'Meet them')} <ArrowRight size={17} aria-hidden="true" /></a>
            <p className="contact-people__response">{t("Respondemos en menos de 24 h.", "We reply within 24 hours.")}</p>
            <ol className="contact-next-steps" aria-label={t("Qué sigue después de escribirnos", "What happens after you contact us")}>
              <li><span>01</span><div><strong>{t("Entendemos tu objetivo.", "We understand your goal.")}</strong><p>{t("Qué querés mejorar y cómo trabajás hoy.", "What you want to improve and how you work today.")}</p></div></li>
              <li><span>02</span><div><strong>{t("Definimos el alcance.", "We define the scope.")}</strong><p>{t("Prioridades, funcionalidades e integraciones.", "Priorities, features and integrations.")}</p></div></li>
              <li><span>03</span><div><strong>{t("Acordamos el siguiente paso.", "We agree on the next step.")}</strong><p>{t("Una propuesta para tu caso, con tiempos y costos claros.", "A proposal for your needs, with clear timing and costs.")}</p></div></li>
            </ol>
            <div className="contact-faq">
              <details><summary>{t("¿Todavía no tengo la idea definida?", "What if my idea is not fully defined yet?")}<span aria-hidden="true">+</span></summary><p>{t("Podés contarnos el problema o lo que te gustaría mejorar. La primera conversación sirve para darle forma.", "Tell us about the problem or what you would like to improve. The first conversation helps give it shape.")}</p></details>
              <details><summary>{t("¿Ya tengo una web o un sistema?", "What if I already have a website or system?")}<span aria-hidden="true">+</span></summary><p>{t("Revisamos lo que existe y definimos qué conviene mejorar, integrar o desarrollar según el alcance.", "We review what you have and decide what to improve, integrate or build based on the scope.")}</p></details>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
};
export default Contact;
