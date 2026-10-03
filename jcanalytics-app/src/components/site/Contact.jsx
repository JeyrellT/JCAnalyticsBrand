import { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowRight, Check } from 'lucide-react';
import { Label, MaskLines, Reveal } from './primitives';
import { wa, EMAIL } from './links';
import { TEAM } from '../../data/team';

const NEEDS = ['Sistema / backend', 'Página web', 'Finanzas', 'Dashboard', 'Machine learning', 'Integración de IA', 'Automatización', 'Marketing digital', 'Otro'];
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
  const message = [`Hola${name.trim() ? `, soy ${name.trim()}` : ''}. Me interesa: ${need}.`, objective.trim() ? `Quiero resolver: ${objective.trim()}` : '', source ? `Llegué desde: ${source}.` : '', 'Me gustaría conversar sobre el alcance y el siguiente paso.'].filter(Boolean).join('\n\n');
  const href = wa(message);
  return (
    <section id="contacto" className="contact-section scroll-mt-24" aria-labelledby="contact-title">
      <div className="contact-atmosphere" aria-hidden="true" />
      <div className="closing-container contact-container">
        <div className="contact-eyebrow">
          <Label>Tu próximo proyecto / Contacto</Label><span className="closing-kicker">El comienzo de algo bueno.</span>
        </div>
        <div className="contact-heading">
          <h2 id="contact-title" className="font-display" tabIndex={-1}><MaskLines lines={['¿Hablamos?']} /></h2>
          <span className="contact-heading__arrow" aria-hidden="true"><ArrowUpRight strokeWidth={1} /></span>
        </div>
        <div className="contact-grid">
          <Reveal className="contact-form-wrap">
            <p className="contact-intro">Contanos la idea. En una primera conversación de 30 minutos, sin costo, podemos entender tu objetivo y definir por dónde empezar.</p>
            <form onSubmit={(event) => {
              event.preventDefault();
              window.open(href, '_blank', 'noopener,noreferrer');
            }} className="contact-form">
              <fieldset>
                <legend className="contact-form__label"><span>01</span> ¿Qué tenés en mente?</legend>
                <div className="contact-needs">
                  {NEEDS.map((option) => (
                    <button key={option} type="button" onClick={() => { setNeed(option); setSource(''); }} aria-pressed={need === option} className={`contact-need tap-press ${need === option ? 'contact-need--selected' : ''}`}>
                      <Check size={14} aria-hidden="true" className={need === option ? '' : 'contact-need__check--hidden'} />{option}
                    </button>
                  ))}
                </div>
                <p className="contact-selection" role="status">Conversemos sobre: <strong>{need}</strong></p>
              </fieldset>
              <div className="contact-form__objective">
                <label htmlFor="contacto-objetivo" className="contact-form__label"><span>02</span> ¿Qué querés resolver? <small>(opcional)</small></label>
                <textarea id="contacto-objetivo" rows={3} maxLength={600} value={objective} onChange={(event) => setObjective(event.target.value)} placeholder="Por ejemplo: hoy llevamos los pedidos en Excel y queremos conectarlos con nuestra web." aria-describedby="contact-objective-note" />
                <p id="contact-objective-note">Una idea en tus palabras es suficiente.</p>
              </div>
              <div className="contact-form__name">
                <label htmlFor="contacto-nombre" className="contact-form__label"><span>03</span> Tu nombre <small>(opcional)</small></label>
                <input id="contacto-nombre" type="text" autoComplete="name" maxLength={100} placeholder="¿Cómo te llamás?" value={name} onChange={(event) => setName(event.target.value)} />
              </div>
              <button type="submit" className="contact-submit tap-press">
                <span>Continuar en WhatsApp</span>
                <span className="contact-submit__arrow" aria-hidden="true"><ArrowUpRight size={24} strokeWidth={1.8} /></span>
              </button>
              <p className="contact-send-note">Se abrirá WhatsApp con tu mensaje listo para revisar.</p>
              <p className="contact-email">¿Preferís correo?{' '}<a href={`mailto:${EMAIL}?subject=${encodeURIComponent(`Consulta: ${need}`)}&body=${encodeURIComponent(message)}`}>{EMAIL}</a></p>
            </form>
          </Reveal>
          <Reveal delay={0.15} className="contact-people">
            <div className="contact-people__heading"><span className="closing-kicker">Del otro lado, personas.</span><span aria-hidden="true" className="contact-people__line" /></div>
            <div className="contact-avatars">
              {TEAM.map((person) => <img key={person.id} src={person.avatar} alt={person.name} title={`${person.name} · ${person.role}`} width={400} height={400} loading="lazy" decoding="async" />)}
            </div>
            <p className="contact-people__copy font-display">Te responde<br />el <span className="font-serif italic font-normal">equipo.</span></p>
            <p className="contact-people__note">No un bot. Las mismas personas que van a trabajar con vos.</p>
            <a href="#equipo" className="contact-people__link">Conocelos <ArrowRight size={17} aria-hidden="true" /></a>
            <p className="contact-people__response">Respondemos en menos de 24 h.</p>
            <ol className="contact-next-steps" aria-label="Qué sigue después de escribirnos">
              <li><span>01</span><div><strong>Entendemos tu objetivo.</strong><p>Qué querés mejorar y cómo trabajás hoy.</p></div></li>
              <li><span>02</span><div><strong>Definimos el alcance.</strong><p>Prioridades, funcionalidades e integraciones.</p></div></li>
              <li><span>03</span><div><strong>Acordamos el siguiente paso.</strong><p>Una propuesta para tu caso, con tiempos y costos claros.</p></div></li>
            </ol>
            <div className="contact-faq">
              <details><summary>¿Todavía no tengo la idea definida?<span aria-hidden="true">+</span></summary><p>Podés contarnos el problema o lo que te gustaría mejorar. La primera conversación sirve para darle forma.</p></details>
              <details><summary>¿Ya tengo una web o un sistema?<span aria-hidden="true">+</span></summary><p>Revisamos lo que existe y definimos qué conviene mejorar, integrar o desarrollar según el alcance.</p></details>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
};
export default Contact;
