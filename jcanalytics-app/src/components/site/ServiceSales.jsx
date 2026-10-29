// ============================================================================
//  src/components/site/ServiceSales.jsx
//  Bloques de venta de una página de servicio. Comparten estado (señales
//  marcadas y calculadora) para que el WhatsApp y la consulta al portal salgan
//  con los números de la persona:
//    · OfferStrip      #oferta            precio real, plazo y botón de WhatsApp
//    · Signals         #senales           "¿es para vos?": marcá lo que te pasa
//    · ImpactCalculator #calculadora      cuánto cuesta hoy el trabajo manual
//    · Includes        #incluye           alcance, con IA, no incluye, agregados
//    · HowWeWork       #como-trabajamos   compromisos + portal de clientes
//    · RealExample     #ejemplo           pantalla real de un proyecto
//    · ServiceFaq      #preguntas-servicio
//    · ServiceLeadForm #contacto-servicio WhatsApp o "que me contacten" (portal)
//    · ServiceBar                         barra fija en celular / tarjeta en el índice
//  Todo precio, plazo y alcance sale de portal/shared/service-pricing.js.
// ============================================================================
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, Check, Clock3, LockKeyhole, MessageCircle, PhoneCall, Plus, ShieldCheck } from 'lucide-react';
import { locale, t } from '../../i18n/locale';
import { SERVICE_PRICING } from '../../../../portal/shared/service-pricing.js';
import { EXTRA_LABELS_EN, SERVICE_OFFERS, WORK_PROMISES } from '../../content/service-offers';
import { PROJECTS, PROJECT_KINDS, screenImage, shotSrcSet } from '../../data/projects';
import { CURRENCIES } from '../../data/currencies';
import { homePath } from '../../seo/routes';
import { PORTAL_URL, wa } from './links';
import { sendLead } from '../../seo/site-tracker';
import '../../styles/service-offer.css';

const numberLocale = locale === 'es' ? 'es-CR' : 'en-US';
const money = (usd) => `$${Math.round(usd).toLocaleString(numberLocale)}`;
const colones = (usd) => `₡${(Math.round((usd * CURRENCIES.CRC.rateFromUSD) / 1000) * 1000).toLocaleString('es-CR')}`;
const integer = (value) => Math.round(value).toLocaleString(numberLocale);
const oneDecimal = (value) => value.toLocaleString(numberLocale, { maximumFractionDigits: value < 10 ? 1 : 0 });
const timeLabel = (p) => (p.days_min
  ? t(`${p.days_min}–${p.days_max} días hábiles`, `${p.days_min}–${p.days_max} business days`)
  : t(`${p.weeks_min}–${p.weeks_max} semanas`, `${p.weeks_min}–${p.weeks_max} weeks`));
const label = (p) => (locale === 'es' ? p.label : p.label_en);
const phoneOk = (v) => /^\+?[\d\s\-()]+$/.test(v.trim()) && v.replace(/\D/g, '').length >= 8 && v.replace(/\D/g, '').length <= 15;
const emailOk = (v) => /^[a-z0-9._+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i.test(v.trim());
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const SalesContext = createContext(null);
const useSales = () => useContext(SalesContext);

export function ServiceSalesProvider({ item, children }) {
  const offer = SERVICE_OFFERS[item.id];
  const copy = offer[locale];
  const main = SERVICE_PRICING[offer.packages[0]];
  const alt = offer.packages[1] ? SERVICE_PRICING[offer.packages[1]] : null;
  const [picked, setPicked] = useState([]);
  const [values, setValues] = useState(() => Object.fromEntries(offer.calculator.fields.map((field) => [field.id, String(field.value)])));
  const [touched, setTouched] = useState(false);

  const calc = useMemo(() => {
    const numbers = Object.fromEntries(offer.calculator.fields.map((field) => {
      const raw = Number(String(values[field.id]).replace(',', '.'));
      return [field.id, clamp(Number.isFinite(raw) ? raw : field.value, field.min, field.max)];
    }));
    const hours = offer.calculator.hoursPerMonth(numbers);
    const monthly = hours * numbers.rate;
    return { numbers, hours, costYear: monthly * 12, paybackMonths: monthly > 0 ? main.base_usd / monthly : Infinity };
  }, [offer, values, main]);

  const summary = useMemo(() => {
    const lines = [];
    if (picked.length) lines.push(t(`Me pasa: ${picked.map((index) => copy.signals[index]).join(' ')}`, `What happens to me: ${picked.map((index) => copy.signals[index]).join(' ')}`));
    if (touched) lines.push(t(`Calculé unas ${integer(calc.hours)} h al mes en esto (≈ US$${integer(calc.costYear)} al año).`, `I estimated about ${integer(calc.hours)} h a month on this (≈ US$${integer(calc.costYear)} a year).`));
    return lines;
  }, [picked, touched, calc, copy]);

  const whatsapp = (extraLines = []) => wa([
    t(`Hola JC Analytics, estoy en «${item[locale].title}» y quiero cotizar el paquete ${label(main)} (US$${main.base_usd}).`, `Hi JC Analytics, I am reading “${item[locale].title}” and I want a quote for the ${label(main)} package (US$${main.base_usd}).`),
    ...summary, ...extraLines,
  ].filter(Boolean).join('\n\n'));

  const value = {
    item, offer, copy, main, alt, picked, values, calc, touched, summary, whatsapp,
    toggleSignal: (index) => setPicked((list) => (list.includes(index) ? list.filter((i) => i !== index) : [...list, index].sort())),
    setValue: (id, raw) => { setTouched(true); setValues((current) => ({ ...current, [id]: raw })); },
  };
  return <SalesContext.Provider value={value}>{children}</SalesContext.Provider>;
}

const WhatsAppLink = ({ href, pkg, children, className = '', trackLabel }) => (
  <a className={`so-wa ${className}`} href={href} target="_blank" rel="noreferrer" data-package={pkg.label} data-value={pkg.base_usd} data-track-label={trackLabel}>
    <MessageCircle size={18} aria-hidden="true" />{children}
  </a>
);

// ── Oferta ──────────────────────────────────────────────────────────────────
export function OfferStrip() {
  const { main, alt, whatsapp } = useSales();
  return (
    <section id="oferta" className="so-offer" aria-labelledby="so-offer-title">
      <div className="so-offer__main">
        <span className="journal-eyebrow">{t('PAQUETE CON PRECIO PUBLICADO', 'PACKAGE WITH A PUBLISHED PRICE')}</span>
        <h2 id="so-offer-title">{label(main)}</h2>
        <p className="so-offer__price"><strong>{money(main.base_usd)}</strong><span>{t('pago único + IVA', 'one-time + tax')} · ≈ {colones(main.base_usd)}</span></p>
        <ul className="so-offer__facts">
          <li><Clock3 size={15} aria-hidden="true" />{t('Entrega:', 'Delivery:')} {timeLabel(main)}</li>
          <li><ShieldCheck size={15} aria-hidden="true" />{t('30 días de soporte incluidos', '30 days of support included')}</li>
          {!main.ai_included && main.with_ai_usd > main.base_usd && <li><Plus size={15} aria-hidden="true" />{t(`Con IA: ${money(main.with_ai_usd)} en total`, `With AI: ${money(main.with_ai_usd)} total`)}</li>}
        </ul>
        <div className="so-offer__actions">
          <WhatsAppLink href={whatsapp()} pkg={main} trackLabel={`Oferta · WhatsApp · ${main.label}`}>{t('Lo quiero · WhatsApp', 'I want it · WhatsApp')}</WhatsAppLink>
          <a className="so-ghost" href="#incluye">{t('Ver qué incluye', 'See what is included')} <ArrowRight size={15} aria-hidden="true" /></a>
        </div>
        <p className="so-offer__note">{t('El mensaje sale listo con el paquete. Si marcás señales o usás la calculadora, también van en el mensaje.', 'The message is ready with the package. If you tick signals or use the calculator, they go in the message too.')}</p>
      </div>
      {alt && (
        <aside className="so-offer__alt">
          <span className="journal-eyebrow">{t('¿NECESITÁS OTRA ESCALA?', 'NEED ANOTHER SCALE?')}</span>
          <h3>{label(alt)}</h3>
          <p><strong>{money(alt.base_usd)}</strong> · {timeLabel(alt)}</p>
          <p className="so-offer__alt-scope">{locale === 'es' ? alt.scope : alt.scope_en}</p>
          <a className="so-text-link" href={`${homePath(locale)}#paquetes`}>{t('Ver todos los paquetes', 'See all packages')} <ArrowUpRight size={15} aria-hidden="true" /></a>
        </aside>
      )}
    </section>
  );
}

// ── Señales ─────────────────────────────────────────────────────────────────
export function Signals() {
  const { copy, picked, toggleSignal } = useSales();
  const count = picked.length;
  const verdict = count === 0
    ? t('Marcá lo que te pase. Con una o dos ya vale la pena conversar.', 'Tick what happens to you. One or two is already worth a conversation.')
    : count <= 2
      ? t(`Marcaste ${count}. Hay señales: una conversación de 30 minutos alcanza para ver si este paquete aplica.`, `You ticked ${count}. There are signals: a 30-minute conversation is enough to see if this package applies.`)
      : t(`Marcaste ${count} de ${copy.signals.length}. Este servicio probablemente aplica a tu caso. Contanos cuál pesa más.`, `You ticked ${count} of ${copy.signals.length}. This service probably applies to your case. Tell us which one weighs most.`);
  return (
    <section id="senales" className="so-block so-signals" aria-labelledby="so-signals-title">
      <h2 id="so-signals-title">{t('¿Es para vos?', 'Is it for you?')}</h2>
      <p className="so-lead">{t('Cinco situaciones que vemos seguido. Marcá las que te pasan.', 'Five situations we see often. Tick the ones that happen to you.')}</p>
      <ul className="so-signals__list">
        {copy.signals.map((signal, index) => (
          <li key={signal}>
            <label className={picked.includes(index) ? 'is-on' : ''}>
              <input type="checkbox" id={`senal-${index}`} checked={picked.includes(index)} onChange={() => toggleSignal(index)} data-track-label={`Señal ${index + 1}`} />
              <span className="so-check" aria-hidden="true"><Check size={14} /></span>
              <span>{signal}</span>
            </label>
          </li>
        ))}
      </ul>
      <p className="so-signals__verdict" role="status" aria-live="polite" data-count={count}>{verdict}</p>
    </section>
  );
}

// ── Calculadora ─────────────────────────────────────────────────────────────
export function ImpactCalculator() {
  const { offer, copy, main, values, calc, setValue, whatsapp } = useSales();
  const payback = calc.paybackMonths < 1
    ? t('menos de un mes', 'less than a month')
    : calc.paybackMonths <= 36 ? t(`unos ${oneDecimal(calc.paybackMonths)} meses`, `about ${oneDecimal(calc.paybackMonths)} months`) : t('más de 3 años', 'more than 3 years');
  return (
    <section id="calculadora" className="so-block so-calc" aria-labelledby="so-calc-title">
      <h2 id="so-calc-title">{copy.calculator.title}</h2>
      <p className="so-lead">{copy.calculator.intro}</p>
      <div className="so-calc__grid">
        <div className="so-calc__fields">
          {offer.calculator.fields.map((field) => (
            <div key={field.id} className="so-field">
              <label htmlFor={`calc-${field.id}`}>{field[locale].label}</label>
              <input id={`calc-${field.id}`} type="number" inputMode="decimal" min={field.min} max={field.max} step={field.step} value={values[field.id]} onChange={(event) => setValue(field.id, event.target.value)} aria-describedby={`calc-${field.id}-hint`} />
              <small id={`calc-${field.id}-hint`}>{field[locale].hint}</small>
            </div>
          ))}
        </div>
        <div className="so-calc__result" role="status" aria-live="polite" aria-atomic="true" data-hours={Math.round(calc.hours)}>
          <span className="journal-eyebrow">{t('CON TUS NÚMEROS', 'WITH YOUR NUMBERS')}</span>
          <dl>
            <div><dt>{t('Horas al mes en esa tarea', 'Hours a month on that task')}</dt><dd>{integer(calc.hours)} h</dd></div>
            <div><dt>{t('Lo que cuesta ese tiempo al año', 'What that time costs a year')}</dt><dd>{money(calc.costYear)}</dd></div>
            <div><dt>{t(`El paquete ${label(main)} (${money(main.base_usd)}) se cubre en`, `The ${label(main)} package (${money(main.base_usd)}) is covered in`)}</dt><dd>{payback}</dd></div>
          </dl>
          <p className="so-calc__note">{copy.calculator.note}</p>
          <WhatsAppLink href={whatsapp()} pkg={main} className="so-wa--sm" trackLabel={`Calculadora · WhatsApp · ${main.label}`}>{t('Cotizar con estos números', 'Get a quote with these numbers')}</WhatsAppLink>
        </div>
      </div>
    </section>
  );
}

// ── Qué incluye ─────────────────────────────────────────────────────────────
export function Includes() {
  const { main, offer } = useSales();
  const key = offer.packages[0];
  const extraLabel = (extra) => (locale === 'es' ? extra.label : EXTRA_LABELS_EN[`${key}.${extra.key}`] ?? extra.label);
  return (
    <section id="incluye" className="so-block so-includes" aria-labelledby="so-includes-title">
      <h2 id="so-includes-title">{t(`Qué incluye ${label(main)}`, `What the ${label(main)} package includes`)}</h2>
      <div className="so-includes__grid">
        <div className="so-card so-card--in">
          <span className="journal-eyebrow">{t('INCLUIDO EN EL PRECIO', 'INCLUDED IN THE PRICE')}</span>
          <p>{locale === 'es' ? main.scope : main.scope_en}</p>
          <p>{t('Configuración, pruebas, capacitación y guía de uso.', 'Configuration, testing, training and a user guide.')}</p>
        </div>
        <div className="so-card so-card--ai">
          <span className="journal-eyebrow">{main.ai_included ? t('IA INCLUIDA', 'AI INCLUDED') : t(`CON IA · ${money(main.with_ai_usd)} EN TOTAL`, `WITH AI · ${money(main.with_ai_usd)} TOTAL`)}</span>
          <p>{locale === 'es' ? main.ai_scope : main.ai_scope_en}</p>
          {!main.ai_included && <p>{t('El total con IA reemplaza al precio base; no se suma.', 'The total with AI replaces the base price; it is not added.')}</p>}
        </div>
        <div className="so-card so-card--out">
          <span className="journal-eyebrow">{t('NO INCLUYE', 'NOT INCLUDED')}</span>
          <p>{locale === 'es' ? main.exclusions : main.exclusions_en}</p>
          <p>{t('Impuestos, licencias, consumos y preparación de información se cotizan aparte.', 'Taxes, licenses, usage and information preparation are quoted separately.')}</p>
          {main.support_monthly_usd > 0 && <p>{t(`Soporte mensual opcional: ${money(main.support_monthly_usd)} (${main.support_hours_per_week} h por semana).`, `Optional monthly support: ${money(main.support_monthly_usd)} (${main.support_hours_per_week} h per week).`)}</p>}
        </div>
      </div>
      {main.extras?.length > 0 && (
        <div className="so-extras">
          <span className="journal-eyebrow">{t('AGREGADOS CON PRECIO PUBLICADO', 'ADD-ONS WITH A PUBLISHED PRICE')}</span>
          <ul>{main.extras.map((extra) => <li key={extra.key}><span>{extraLabel(extra)}</span><strong>+{money(extra.price_usd)}</strong></li>)}</ul>
        </div>
      )}
    </section>
  );
}

// ── Cómo trabajamos ─────────────────────────────────────────────────────────
export function HowWeWork() {
  return (
    <section id="como-trabajamos" className="so-block so-work" aria-labelledby="so-work-title">
      <h2 id="so-work-title">{t('Cómo trabajamos', 'How we work')}</h2>
      <ol className="so-work__steps">
        {WORK_PROMISES[locale].map(([title, detail], index) => (
          <li key={title}><span>0{index + 1}</span><div><strong>{title}</strong><p>{detail}</p></div></li>
        ))}
      </ol>
      <a className="so-portal" href={`${PORTAL_URL}/cliente`} target="_blank" rel="noreferrer" data-track-label="Portal de clientes">
        <LockKeyhole size={18} aria-hidden="true" />
        <span><strong>{t('¿Ya sos cliente? Entrá a tu portal.', 'Already a client? Open your portal.')}</strong><small>{t('Etapas, avances, entregables por aprobar, documentos y reuniones de tu proyecto.', 'Stages, progress, deliverables to approve, documents and meetings for your project.')}</small></span>
        <ArrowUpRight size={18} aria-hidden="true" />
      </a>
    </section>
  );
}

// ── Ejemplo real ────────────────────────────────────────────────────────────
export function RealExample() {
  const { offer } = useSales();
  const project = PROJECTS.find((candidate) => candidate.id === offer.example.project);
  const screen = project?.screens.find((candidate) => candidate.id === offer.example.screen) ?? project?.screens[0];
  if (!project || !screen) return null;
  const image = screenImage(project, screen.id, 'desktop');
  return (
    <section id="ejemplo" className="so-block so-example" aria-labelledby="so-example-title">
      <h2 id="so-example-title">{t('Un ejemplo real', 'A real example')}</h2>
      <p className="so-lead">{t('Pantalla real de un sistema que existe, con datos de demostración.', 'A real screen from a system that exists, with demo data.')}</p>
      <div className="so-example__grid">
        <figure className="so-example__figure" style={{ '--project-color': project.accent }}>
          <img src={image} srcSet={shotSrcSet(image)} sizes="(max-width: 767px) 92vw, 560px" width={1600} height={1000} loading="lazy" decoding="async" alt={t(`Pantalla real de ${project.name}: ${screen.caption}`, `Real screen of ${project.name}: ${screen.caption}`)} />
          <figcaption>{screen.caption}</figcaption>
        </figure>
        <div className="so-example__copy">
          <span className="journal-eyebrow">{PROJECT_KINDS[project.kind]} · {project.sector}</span>
          <h3>{project.name}</h3>
          <p>{project.tagline}</p>
          <ul>{project.features.slice(0, 2).map((feature) => <li key={feature}><Check size={13} aria-hidden="true" />{feature}</li>)}</ul>
          <div className="so-example__links">
            <a className="so-text-link" href={`${homePath(locale)}?proyecto=${project.id}#trabajo`}>{t('Ver pantallas, código y cifras', 'See screens, code and figures')} <ArrowUpRight size={15} aria-hidden="true" /></a>
            {project.url && <a className="so-text-link" href={project.url} target="_blank" rel="noreferrer">{t('Abrir el sitio', 'Open the site')} <ArrowUpRight size={15} aria-hidden="true" /></a>}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Preguntas frecuentes ────────────────────────────────────────────────────
export function ServiceFaq() {
  const { copy } = useSales();
  return (
    <section id="preguntas-servicio" className="so-block so-faq" aria-labelledby="so-faq-title">
      <h2 id="so-faq-title">{t('Preguntas frecuentes', 'Frequently asked questions')}</h2>
      {copy.faq.map(([question, answer], index) => (
        <details key={question}>
          <summary><span>0{index + 1}</span>{question}<Plus size={18} aria-hidden="true" /></summary>
          <p>{answer}</p>
        </details>
      ))}
    </section>
  );
}

// ── Formulario corto ────────────────────────────────────────────────────────
export function ServiceLeadForm() {
  const { item, main, summary, whatsapp } = useSales();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [mail, setMail] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState(''); // trampa para bots: invisible para personas
  const [status, setStatus] = useState('idle'); // idle · sending · sent · error · missing · invalid
  const startedAt = useRef(0);
  useEffect(() => { startedAt.current = performance.now(); }, []);
  const contact = { phone: phoneOk(phone) ? phone.trim() : '', email: emailOk(mail) ? mail.trim() : '' };
  const lead = (channel) => sendLead({
    channel, name: name.trim(), ...contact, need: item.need, packageName: main.label, website, startedAt: startedAt.current,
    message: [message.trim(), ...summary].filter(Boolean).join('\n'), form: 'contacto-servicio', section: 'contacto-servicio',
  });
  const requestCallback = async () => {
    if ((phone.trim() && !contact.phone) || (mail.trim() && !contact.email)) { setStatus('invalid'); return; }
    if (!contact.phone && !contact.email) { setStatus('missing'); return; }
    setStatus('sending');
    setStatus((await lead('devolucion').catch(() => false)) ? 'sent' : 'error');
  };
  const href = whatsapp([
    name.trim() ? t(`Soy ${name.trim()}.`, `I am ${name.trim()}.`) : '',
    message.trim(),
  ]);
  return (
    <section id="contacto-servicio" className="so-block so-form" aria-labelledby="so-form-title">
      <div className="so-form__intro">
        <span className="journal-eyebrow">{t('EL SIGUIENTE PASO', 'THE NEXT STEP')}</span>
        <h2 id="so-form-title">{t('Contanos tu caso.', 'Tell us about your case.')}<br /><em>{t('Te respondemos en menos de 24 h.', 'We reply within 24 hours.')}</em></h2>
        <p>{t('Podés seguir por WhatsApp con el mensaje ya armado, o dejarnos tu contacto y te escribimos nosotros. Las dos opciones llegan al mismo equipo.', 'You can continue on WhatsApp with the message ready, or leave your contact and we write to you. Both options reach the same team.')}</p>
        {summary.length > 0 && <p className="so-form__summary"><Check size={14} aria-hidden="true" />{t('Tu mensaje incluye lo que marcaste y calculaste arriba.', 'Your message includes what you ticked and calculated above.')}</p>}
      </div>
      <form data-track="contacto-servicio" noValidate onSubmit={(event) => { event.preventDefault(); requestCallback(); }}>
        <div className="so-field">
          <label htmlFor="servicio-nombre">{t('Tu nombre', 'Your name')} <small>{t('(opcional)', '(optional)')}</small></label>
          <input id="servicio-nombre" type="text" autoComplete="name" maxLength={100} value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="so-field">
          <label htmlFor="servicio-telefono">{t('WhatsApp o teléfono', 'WhatsApp or phone')}</label>
          <input id="servicio-telefono" type="tel" inputMode="tel" autoComplete="tel" maxLength={30} value={phone} onChange={(event) => { setPhone(event.target.value); if (status !== 'sending') setStatus('idle'); }} aria-invalid={phone.trim() !== '' && !phoneOk(phone)} />
        </div>
        <div className="so-field">
          <label htmlFor="servicio-correo">{t('o tu correo', 'or your email')}</label>
          <input id="servicio-correo" type="email" inputMode="email" autoComplete="email" maxLength={160} value={mail} onChange={(event) => { setMail(event.target.value); if (status !== 'sending') setStatus('idle'); }} aria-invalid={mail.trim() !== '' && !emailOk(mail)} />
        </div>
        <div className="so-field so-field--wide">
          <label htmlFor="servicio-mensaje">{t('¿Qué querés resolver?', 'What would you like to solve?')} <small>{t('(opcional)', '(optional)')}</small></label>
          <textarea id="servicio-mensaje" rows={3} maxLength={600} value={message} onChange={(event) => setMessage(event.target.value)} placeholder={t('Una idea en tus palabras alcanza.', 'An idea in your own words is enough.')} />
        </div>
        <div className="so-trap" aria-hidden="true">
          <label htmlFor="servicio-sitio">Sitio web</label>
          <input id="servicio-sitio" type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
        </div>
        <div className="so-form__actions">
          <WhatsAppLink href={href} pkg={main} trackLabel={`Formulario · WhatsApp · ${main.label}`}>{t('Continuar en WhatsApp', 'Continue on WhatsApp')}</WhatsAppLink>
          <button type="submit" className="so-callback" disabled={status === 'sending' || status === 'sent'} data-track="contact" data-track-label="Formulario · Que me contacten">
            <PhoneCall size={17} aria-hidden="true" />{status === 'sending' ? t('Enviando…', 'Sending…') : t('Prefiero que me contacten', 'I’d rather you contact me')}
          </button>
        </div>
        <p className="so-form__status" role="status">
          {status === 'sent' && t('¡Listo! Tu consulta quedó en nuestro portal. Te escribimos en menos de 24 h.', 'Done! Your inquiry is in our portal. We’ll reach out within 24 hours.')}
          {status === 'missing' && t('Dejanos tu WhatsApp o tu correo para poder contactarte.', 'Leave your WhatsApp or email so we can contact you.')}
          {status === 'invalid' && t('Revisá el número (8 a 15 dígitos) o el correo.', 'Check the number (8 to 15 digits) or the email.')}
          {status === 'error' && t('No pudimos enviarlo. Seguí por WhatsApp con el botón verde.', 'We could not send it. Continue on WhatsApp with the green button.')}
          {status === 'idle' && t('Sin bots: te responde el mismo equipo que va a trabajar con vos.', 'No bots: the same team that will work with you replies.')}
        </p>
      </form>
    </section>
  );
}

// ── Barra fija (celular) y tarjeta del índice (escritorio) ──────────────────
export function ServiceBar() {
  const { main, whatsapp } = useSales();
  const [on, setOn] = useState(false);
  useEffect(() => {
    const targets = ['oferta', 'contacto-servicio'].map((id) => document.getElementById(id)).filter(Boolean);
    if (!targets.length || !('IntersectionObserver' in window)) return undefined;
    const visible = new Set();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) { if (entry.isIntersecting) visible.add(entry.target.id); else visible.delete(entry.target.id); }
      setOn(visible.size === 0 && window.scrollY > 200);
    }, { threshold: 0.05 });
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);
  return (
    <div className={`so-bar ${on ? 'is-on' : ''}`} data-track-section="barra-cta" aria-hidden={!on} inert={!on || undefined}>
      <div className="so-bar__price"><strong>{money(main.base_usd)}</strong><span>{label(main)} · {timeLabel(main)}</span></div>
      <a className="so-bar__callback" href="#contacto-servicio" data-track="contact" data-track-label="Barra · Que me contacten">{t('Que me contacten', 'Contact me')}</a>
      <WhatsAppLink href={whatsapp()} pkg={main} className="so-wa--bar" trackLabel={`Barra · WhatsApp · ${main.label}`}>WhatsApp</WhatsAppLink>
    </div>
  );
}

export function TocOffer() {
  const { main, whatsapp } = useSales();
  return (
    <div className="so-toc-card" data-track-section="indice-cta">
      <span className="journal-eyebrow">{label(main)}</span>
      <strong>{money(main.base_usd)}</strong>
      <small>{t('pago único + IVA', 'one-time + tax')} · {timeLabel(main)}</small>
      <WhatsAppLink href={whatsapp()} pkg={main} className="so-wa--sm" trackLabel={`Índice · WhatsApp · ${main.label}`}>{t('Cotizar por WhatsApp', 'Quote on WhatsApp')}</WhatsAppLink>
      <a className="so-text-link" href="#contacto-servicio" data-track="contact" data-track-label="Índice · Que me contacten">{t('Prefiero que me contacten', 'I’d rather you contact me')} <ArrowRight size={14} aria-hidden="true" /></a>
    </div>
  );
}
