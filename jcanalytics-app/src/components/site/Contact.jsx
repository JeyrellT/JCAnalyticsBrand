// ============================================================================
//  ¿Cómo empiezo? · el cierre de la portada.
//
//  Regla por dispositivo (no cambia): en celular el botón principal abre WhatsApp
//  con el mensaje listo; en computadora la consulta va al portal del equipo,
//  porque WhatsApp Web exige sesión iniciada y ahí se pierden consultas.
//
//  Auditoría de noviembre de 2026 (lo que cambió y por qué):
//    · Nada viene marcado. Antes toda consulta salía como «Sistema / backend»
//      aunque la persona no hubiera elegido nada; ahora, si no elige, llega como
//      «Otro». Las opciones son siete, con palabras de negocio; las claves que
//      recibe el portal son las mismas (portal/shared/leads.js → LEAD_NEEDS).
//    · En celular se piden solo los datos del mensaje. WhatsApp y correo aparecen
//      cuando la persona elige «Prefiero que me contacten» (o llega desde
//      «¿Sin WhatsApp?»), y entonces el botón principal envía la consulta.
//    · WhatsApp y correo tienen etiqueta visible; el error sale junto al campo,
//      dice cuál corregir y lleva el foco ahí.
//    · Al enviar aparece una confirmación con lo que sigue. Antes era una línea
//      de 12 px debajo de un botón secundario.
//    · El origen del clic (`source`) llega al portal dentro del mensaje.
// ============================================================================
import { t } from '../../i18n/locale';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, Check, MessageCircle, PhoneCall } from 'lucide-react';
import { Label, MaskLines, Reveal } from './primitives';
import { wa, EMAIL, PHONE_DISPLAY } from './links';
import { MESSAGES, NEXT_STEPS } from './messages';
import { scrollToNode } from './scroll';
import { emailOk, phoneOk } from './contact-rules';
import { TEAM } from '../../data/team';
import { sendLead } from '../../seo/site-tracker';
import { trackContactIntent, trackLeadCaptured } from '../../seo/analytics';
import { useDesktop } from '../../hooks/useDesktop';

// Claves que acepta el portal. Un acceso con una necesidad ya elegida (página de servicio, proyecto) puede
// traer cualquiera de ellas; el formulario ofrece siete y agrupa las dos que casi nadie distinguía.
const NEEDS = ['Sistema / backend', 'Página web', 'Finanzas', 'Dashboard', 'Machine learning', 'Integración de IA', 'Automatización', 'Marketing digital', 'Otro'];
const OPTIONS = [
  { value: 'Página web', label: t('Página web', 'Website') },
  { value: 'Sistema / backend', label: t('Sistema a medida', 'Custom system') },
  { value: 'Automatización', label: t('Automatizar tareas', 'Automate tasks') },
  { value: 'Dashboard', also: ['Finanzas'], label: t('Finanzas y dashboards', 'Finance and dashboards') },
  { value: 'Integración de IA', also: ['Machine learning'], label: t('Inteligencia artificial', 'Artificial intelligence') },
  { value: 'Marketing digital', label: t('Marketing y redes', 'Marketing and social media') },
  { value: 'Otro', label: t('Todavía no sé', 'Not sure yet') },
];
const optionFor = (need) => OPTIONS.find((option) => option.value === need || option.also?.includes(need));
const needLabel = (need) => optionFor(need)?.label ?? '';
const MESSAGE_MAX = 600; // límite del portal (LEAD_LIMITS.message)
const PROBLEMS = {
  missing: t('Falta un dato para poder responderte: escribí tu WhatsApp o tu correo.', 'One detail is missing so we can reply: enter your WhatsApp or your email.'),
  phone: t('Revisá el número: necesita entre 8 y 15 dígitos (ejemplo: 8888 8888).', 'Check the number: it needs 8 to 15 digits (example: 8888 8888).'),
  email: t('Revisá el correo: le falta algo (ejemplo: nombre@empresa.com).', 'Check the email: something is missing (example: name@company.com).'),
};
// Después de enviar: quién escribe y qué sigue, con los compromisos ya publicados.
const AFTER_SENDING = [
  t('Una persona del equipo te escribe al WhatsApp o correo que dejaste.', 'Someone from the team will message you at the WhatsApp or email you left.'),
  ...NEXT_STEPS.slice(1),
];

const Contact = () => {
  const desktop = useDesktop();
  const [need, setNeed] = useState(null);
  const [name, setName] = useState('');
  const [objective, setObjective] = useState('');
  const [source, setSource] = useState('');
  // Celular: la persona pidió que le escriban, así que el botón principal envía la consulta al portal.
  const [asked, setAsked] = useState(false);
  const [phone, setPhone] = useState('');
  const [mail, setMail] = useState('');
  const [website, setWebsite] = useState(''); // trampa para bots: invisible para personas
  const [status, setStatus] = useState('idle'); // idle · sending · sent · error
  const [problem, setProblem] = useState(null); // missing · phone · email: se avisa junto al campo
  const startedAt = useRef(0); // cuándo se mostró el formulario (contra bots que llenan al instante)
  const sentTitle = useRef(null);
  const formMode = desktop || asked;
  useEffect(() => { startedAt.current = performance.now(); }, []);
  useEffect(() => {
    let focusFrame;
    const receiveIntent = (event) => {
      const detail = event.detail ?? {};
      if (NEEDS.includes(detail.need)) setNeed(detail.need);
      setSource(typeof detail.source === 'string' ? detail.source : '');
      if (detail.form) setAsked(true);
      window.cancelAnimationFrame(focusFrame);
      // Quien pidió dejar su contacto llega directo al campo; el resto, al título de la sección.
      focusFrame = window.requestAnimationFrame(() => (detail.form && document.getElementById('contacto-telefono') || document.getElementById('contact-title'))?.focus({ preventScroll: true }));
    };
    window.addEventListener('jca:contact-intent', receiveIntent);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener('jca:contact-intent', receiveIntent);
    };
  }, []);
  // Al enviar, el formulario largo se reemplaza por una confirmación más corta y la página se acorta bajo
  // la persona: sin recolocar, «¡Listo!» quedaba detrás de la barra fija o fuera de pantalla y parecía que
  // no había pasado nada (regresión detectada en la segunda ronda de la auditoría).
  useEffect(() => {
    if (status !== 'sent') return;
    scrollToNode(sentTitle.current?.closest('.contact-sent'), { instant: true });
    sentTitle.current?.focus({ preventScroll: true });
  }, [status]);

  const person = name.trim();
  const goal = objective.trim();
  // Mismo patrón que el catálogo (messages.js): un solo saludo, la intención en primera persona y, si la
  // persona no escribió nada, la invitación abierta a contar su caso. Antes este mensaje tenía otro saludo
  // («Hola JC Analytics.» / «Hello») y cerraba con una frase de relleno que no ayudaba a responder.
  const interest = need && need !== 'Otro'
    ? t(`me interesa: ${needLabel(need)}.`, `I’m interested in: ${needLabel(need)}.`)
    : t('quiero cotizar un proyecto para mi negocio.', 'I would like a quote for a project for my business.');
  const opening = person
    ? t(`Hola JC Analytics, soy ${person}. ${interest.charAt(0).toUpperCase()}${interest.slice(1)}`, `Hi JC Analytics, I’m ${person}. ${interest}`)
    : t(`Hola JC Analytics, ${interest}`, `Hi JC Analytics, ${interest}`);
  const message = goal
    ? [opening, t(`Quiero resolver: ${goal}`, `I’d like to solve: ${goal}`), source ? t(`Llegué desde: ${source}.`, `I came from: ${source}.`) : ''].filter(Boolean).join('\n\n')
    : `${opening} ${t('Les cuento qué necesito:', 'Here is what I need:')}`;
  const href = wa(message);
  const contact = { phone: phoneOk(phone) ? phone.trim() : '', email: emailOk(mail) ? mail.trim() : '' };
  // Lo que recibe el portal: el texto de la persona y, al final, desde qué botón llegó.
  const portalMessage = () => {
    const origin = source ? `\n(${t('Desde', 'From')}: ${source})` : '';
    return `${objective.trim().slice(0, MESSAGE_MAX - origin.length)}${origin}`.trim();
  };
  // Deja la consulta en el portal y, si llega, la cuenta como consulta captada en las plataformas de anuncios.
  const captureLead = async (channel) => {
    const ok = await sendLead({
      channel, name: person, ...contact, need: need || 'Otro', message: portalMessage(), website, startedAt: startedAt.current,
    }).catch(() => false);
    if (ok) trackLeadCaptured({ form: 'contacto', section: 'contacto' });
    return ok;
  };
  const focusField = (id) => window.requestAnimationFrame(() => document.getElementById(id)?.focus());
  const requestCallback = async (channel) => {
    // Un dato escrito pero mal formado se avisa: no se descarta en silencio.
    const next = phone.trim() && !contact.phone ? 'phone' : mail.trim() && !contact.email ? 'email' : !contact.phone && !contact.email ? 'missing' : null;
    if (next) { setProblem(next); focusField(next === 'email' ? 'contacto-correo' : 'contacto-telefono'); return; }
    setProblem(null);
    setStatus('sending');
    setStatus((await captureLead(channel)) ? 'sent' : 'error');
  };
  const submit = (event) => {
    event.preventDefault();
    if (status === 'sending') return;
    // Computadora, o celular cuando la persona pidió que le escriban: la consulta va al portal.
    if (formMode) { requestCallback(desktop ? 'formulario' : 'devolucion'); return; }
    // Celular: abre WhatsApp con el mensaje listo y cuenta como clic a WhatsApp.
    trackContactIntent({ channel: 'whatsapp', section: 'contacto' });
    window.open(href, '_blank', 'noopener,noreferrer');
    // Si vuelve sin haber enviado el mensaje, ui/WhatsAppReturn.jsx le ofrece dejar su número.
    window.dispatchEvent(new CustomEvent('jca:whatsapp-opened', { detail: { href, message: portalMessage(), need: need || 'Otro', section: 'contacto' } }));
  };
  const edit = (setter) => (event) => { setter(event.target.value); if (problem) setProblem(null); if (status === 'error') setStatus('idle'); };

  const reach = (
    <fieldset className="contact-form__name contact-form__reach">
      <legend className="contact-form__label">{t('¿A dónde te respondemos?', 'Where should we reply?')} <small>{t('(WhatsApp o correo: con uno alcanza)', '(WhatsApp or email: one is enough)')}</small></legend>
      <div className="contact-form__pair">
        <div>
          <label htmlFor="contacto-telefono" className="contact-form__sublabel">{t('WhatsApp o teléfono', 'WhatsApp or phone')}</label>
          <input id="contacto-telefono" type="tel" inputMode="tel" autoComplete="tel" maxLength={30} placeholder={t('Ej.: 8888 8888', 'e.g. 8888 8888')}
            value={phone} onChange={edit(setPhone)} aria-invalid={problem === 'phone' || problem === 'missing'} aria-describedby="contacto-reach-error" />
        </div>
        <div>
          <label htmlFor="contacto-correo" className="contact-form__sublabel">{t('Correo', 'Email')}</label>
          <input id="contacto-correo" type="email" inputMode="email" autoComplete="email" maxLength={160} placeholder={t('Ej.: nombre@empresa.com', 'e.g. name@company.com')}
            value={mail} onChange={edit(setMail)} aria-invalid={problem === 'email'} aria-describedby="contacto-reach-error" />
        </div>
      </div>
      <p id="contacto-reach-error" className="contact-field-error" role="alert">{problem ? PROBLEMS[problem] : ''}</p>
      <div className="contact-trap" aria-hidden="true">
        <label htmlFor="contacto-sitio">Sitio web</label>
        <input id="contacto-sitio" type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
      </div>
    </fieldset>
  );

  return (
    <section id="contacto" className="contact-section scroll-mt-24" aria-labelledby="contact-title">
      <div className="contact-atmosphere" aria-hidden="true" />
      <div className="closing-container contact-container">
        <div className="contact-eyebrow">
          <Label>{t('¿Cómo empiezo? / Contacto', 'How do I start? / Contact')}</Label><span className="closing-kicker">{t('Sin costo y sin compromiso.', 'No charge, no commitment.')}</span>
        </div>
        <div className="contact-heading">
          <h2 id="contact-title" className="font-display" tabIndex={-1}><MaskLines lines={[t('¿Hablamos?', 'Let’s talk.')]} /></h2>
        </div>
        <div className="contact-grid">
          <Reveal className="contact-form-wrap">
            {status === 'sent' ? (
              <div className="contact-sent">
                <span className="contact-sent__eyebrow">{t('CONSULTA RECIBIDA', 'INQUIRY RECEIVED')}</span>
                <h3 ref={sentTitle} tabIndex={-1} className="font-display">{t('¡Listo! Te escribimos en menos de 24 h.', 'Done! We’ll reach out within 24 hours.')}</h3>
                <p>{t('Tu consulta ya está con el equipo. Esto es lo que sigue:', 'Your inquiry is with the team. Here is what comes next:')}</p>
                <ol>{AFTER_SENDING.map((step, index) => <li key={step}><span aria-hidden="true">{index + 1}</span>{step}</li>)}</ol>
                <a href={href} target="_blank" rel="noreferrer" className="contact-callback__button tap-press" data-wa-direct="" data-track-label="Contacto · WhatsApp después de enviar">
                  <MessageCircle size={17} aria-hidden="true" />{desktop ? t('¿Es urgente? Abrir WhatsApp Web', 'Is it urgent? Open WhatsApp Web') : t('¿Es urgente? Escribinos por WhatsApp', 'Is it urgent? Message us on WhatsApp')}
                </a>
                <a href="#trabajo" className="contact-sent__more" data-track-label="Contacto · Ver proyectos después de enviar">{t('Mientras tanto, ver proyectos reales', 'Meanwhile, see real projects')} <ArrowRight size={16} aria-hidden="true" /></a>
                <p className="sr-only" role="status">{t('Consulta enviada. Te escribimos en menos de 24 h.', 'Inquiry sent. We’ll reach out within 24 hours.')}</p>
              </div>
            ) : (
              <>
                {/* «Menos de 24 h» se dice una vez por modo: acá en WhatsApp y en la nota bajo el botón en el formulario.
                    Antes aparecía cuatro veces en la misma pantalla y dejaba de leerse (segunda ronda de la auditoría). */}
                <p className="contact-intro">{formMode
                  ? t('Dejá tu WhatsApp o tu correo y, si querés, contanos qué querés resolver. La primera conversación, de 30 minutos, no tiene costo.', 'Leave your WhatsApp or email and, if you like, tell us what you want to solve. The first 30-minute conversation is free.')
                  : t('Contanos qué querés resolver. Te respondemos en menos de 24 h y la primera conversación, de 30 minutos, no tiene costo.', 'Tell us what you want to solve. We reply within 24 hours and the first 30-minute conversation is free.')}</p>
                {/* noValidate: un correo a medio escribir no debe bloquear «Continuar en WhatsApp». */}
                <form data-track="contacto" data-mode={formMode ? 'form' : 'whatsapp'} noValidate onSubmit={submit} className="contact-form">
                  {/* Formulario (computadora, o celular cuando pidió que le escriban): el único dato necesario va primero. */}
                  {formMode && reach}
                  <fieldset>
                    <legend className="contact-form__label">{t('¿Qué necesitás?', 'What do you need?')} <small>{t('(opcional)', '(optional)')}</small></legend>
                    <div className="contact-needs">
                      {OPTIONS.map((option) => {
                        const chosen = optionFor(need) === option;
                        return (
                          <button key={option.value} type="button" onClick={() => { setNeed(chosen ? null : option.value); setSource(''); }} aria-pressed={chosen} data-track-label={`Contacto · Necesidad · ${option.value}`} className={`contact-need tap-press ${chosen ? 'contact-need--selected' : ''}`}>
                            <Check size={14} aria-hidden="true" className={chosen ? '' : 'contact-need__check--hidden'} />{option.label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="contact-selection" role="status">{need
                      ? <>{t('Conversemos sobre:', 'Let’s discuss:')} <strong>{needLabel(need)}</strong></>
                      : t('Si no sabés cuál marcar, seguí sin elegir: te orientamos igual.', 'If you are not sure which one to pick, carry on without choosing: we will guide you anyway.')}</p>
                  </fieldset>
                  <div className="contact-form__objective">
                    <label htmlFor="contacto-objetivo" className="contact-form__label">{t('¿Qué querés resolver?', 'What would you like to solve?')} <small>{t('(opcional)', '(optional)')}</small></label>
                    <textarea id="contacto-objetivo" rows={3} maxLength={MESSAGE_MAX} value={objective} onChange={(event) => setObjective(event.target.value)} placeholder={t('Por ejemplo: hoy llevamos los pedidos en Excel y queremos conectarlos con nuestra web.', 'For example: we currently track orders in Excel and want to connect them to our website.')} aria-describedby="contact-objective-note" />
                    <p id="contact-objective-note">{t('Una idea en tus palabras es suficiente.', 'An idea in your own words is enough.')}</p>
                  </div>
                  <div className="contact-form__name">
                    <label htmlFor="contacto-nombre" className="contact-form__label">{t('Tu nombre', 'Your name')} <small>{t('(opcional)', '(optional)')}</small></label>
                    <input id="contacto-nombre" type="text" autoComplete="name" maxLength={100} placeholder={t('¿Cómo te llamás?', 'What is your name?')} value={name} onChange={(event) => setName(event.target.value)} />
                  </div>
                  <button type="submit" className="contact-submit tap-press" disabled={status === 'sending'} data-track-label="Contacto · Enviar">
                    <span>{formMode
                      ? (status === 'sending' ? t('Enviando…', 'Sending…') : t('Enviar consulta', 'Send inquiry'))
                      : t('Continuar en WhatsApp', 'Continue on WhatsApp')}</span>
                    <span className="contact-submit__arrow" aria-hidden="true"><ArrowUpRight size={24} strokeWidth={1.8} /></span>
                  </button>
                  <p className="contact-send-note">{formMode
                    ? t('Te escribimos en menos de 24 h al WhatsApp o correo que dejés. Tus datos solo se usan para responderte.', 'We’ll reach out within 24 hours to the WhatsApp or email you leave. Your details are only used to reply to you.')
                    : t('Se abre WhatsApp con tu mensaje ya escrito: lo revisás y lo enviás.', 'WhatsApp opens with your message already written: you review it and send it.')}</p>
                  <div className="contact-callback">
                    {desktop ? (
                      <a href={href} target="_blank" rel="noreferrer" className="contact-callback__button tap-press" data-wa-direct="" data-track-label="Contacto · WhatsApp Web">
                        <MessageCircle size={17} aria-hidden="true" />{t('Prefiero seguir en WhatsApp Web', 'I’d rather continue on WhatsApp Web')}
                      </a>
                    ) : (
                      <button type="button" className="contact-callback__button tap-press" onClick={() => { setAsked(!asked); setProblem(null); if (!asked) focusField('contacto-telefono'); }} aria-pressed={asked} data-track="contact" data-track-label="Contacto · Prefiero que me contacten">
                        {asked ? <MessageCircle size={17} aria-hidden="true" /> : <PhoneCall size={17} aria-hidden="true" />}
                        {asked ? t('Mejor sigo por WhatsApp', 'I’d rather use WhatsApp') : t('Prefiero que me contacten', 'I’d rather you contact me')}
                      </button>
                    )}
                    <p className="contact-callback__status" role="status">
                      {status === 'error' && (desktop
                        ? t('No pudimos enviarlo. Probá de nuevo o seguí por WhatsApp Web.', 'We could not send it. Try again or continue on WhatsApp Web.')
                        : t('No pudimos enviarlo. Probá de nuevo o escribinos por WhatsApp.', 'We could not send it. Try again or message us on WhatsApp.'))}
                    </p>
                  </div>
                  <p className="contact-email">{t('¿Preferís correo?', 'Prefer email?')}{' '}<a href={`mailto:${EMAIL}?subject=${encodeURIComponent(need ? t(`Consulta: ${needLabel(need)}`, `Inquiry: ${needLabel(need)}`) : t('Consulta desde la web', 'Inquiry from the website'))}&body=${encodeURIComponent(message)}`} data-track-label="Contacto · Correo">{EMAIL}</a></p>
                </form>
              </>
            )}
          </Reveal>
          <Reveal delay={0.15} className="contact-people">
            <div className="contact-people__heading"><span className="closing-kicker">{t('Del otro lado, personas.', 'Real people on the other side.')}</span><span aria-hidden="true" className="contact-people__line" /></div>
            <div className="contact-avatars">
              {TEAM.map((member) => <img key={member.id} src={member.avatar} alt={member.name} title={`${member.name} · ${member.role}`} width={400} height={400} loading="lazy" decoding="async" />)}
            </div>
            <p className="contact-people__copy font-display">{t('Te responde', 'You’ll hear from')}<br />{t('el', 'the')} <span className="font-serif italic font-normal">{t('equipo.', 'team.')}</span></p>
            <p className="contact-people__note">{t('Este formulario y el WhatsApp los leen las mismas personas que van a trabajar con vos. El asistente de la esquina sí es IA: sirve para dudas rápidas.', 'This form and WhatsApp are read by the same people who will work with you. The assistant in the corner is AI: it is there for quick questions.')}</p>
            <a href="#equipo" className="contact-people__link">{t('Conocelos', 'Meet them')} <ArrowRight size={17} aria-hidden="true" /></a>
            <p className="contact-people__response">
              <a href={wa(MESSAGES.footer)} target="_blank" rel="noreferrer" data-wa-direct="" data-track-label="Contacto · Número de WhatsApp">WhatsApp {PHONE_DISPLAY}</a>
              <span>{t('Lo lee el mismo equipo.', 'Read by the same team.')}</span>
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
};
export default Contact;
