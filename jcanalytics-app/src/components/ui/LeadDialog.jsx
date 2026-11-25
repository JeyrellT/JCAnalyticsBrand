// ============================================================================
//  src/components/ui/LeadDialog.jsx
//  Formulario corto para computadora.
//
//  En celular los botones de WhatsApp abren WhatsApp y listo. En computadora
//  abrirían WhatsApp Web, que exige tener la sesión iniciada: ahí se pierden
//  consultas y nunca se miden. Por eso, con mouse, cualquier enlace a wa.me
//  abre este diálogo: la persona deja su WhatsApp o correo (el mensaje ya viene
//  armado con el paquete, lo marcado y lo calculado) y la consulta llega al
//  portal del equipo, que la responde en menos de 24 h. Quien prefiera
//  WhatsApp Web tiene el enlace directo a la vista.
//
//  Se monta una vez para todo el sitio (main.jsx). Los enlaces con
//  data-wa-direct no se interceptan: pie de página, asistente y el enlace a
//  WhatsApp Web de este mismo diálogo. En táctil y en navegadores automatizados
//  (prerender, pruebas) no hace nada: los enlaces siguen abriendo WhatsApp.
//
//  Auditoría de noviembre de 2026 (lo que cambió y por qué):
//    · El encabezado dice qué se está pidiendo y qué recibe la persona, en vez de
//      explicar por qué no se abrió WhatsApp Web.
//    · En un pedido de paquete el mensaje ya armado queda plegado: se ven dos
//      campos y un botón. En una cotización general queda a la vista, porque
//      ahí la persona tiene que contar su caso.
//    · El error dice qué campo corregir y lleva el foco ahí; el campo se marca
//      al intentar enviar, no mientras se escribe.
//    · Al enviar, el foco va al título de la confirmación (antes quedaba en el
//      fondo y un lector de pantalla no anunciaba nada) y se ven los tres pasos
//      que siguen.
//    · El reloj contra bots arranca la primera vez que se abre. Antes se
//      reiniciaba en cada apertura y una segunda consulta enviada rápido (datos
//      ya escritos) se descartaba en el portal sin avisar.
//    · El fondo no se desplaza y arrastrar una selección fuera del panel no lo
//      cierra.
//  Segunda ronda (noviembre de 2026):
//    · En un pedido de paquete se ve lo que la persona marcó en el detalle y hay
//      un campo opcional de una línea, «¿Para qué negocio es?»: sin ese dato la
//      primera respuesta del equipo era siempre otra pregunta.
//    · La confirmación repite lo pedido con su total, dice qué ir juntando (el
//      «Para empezar necesitamos» del paquete) y deja volver al detalle para
//      guardarlo o reenviarlo. En una consulta general ofrece ver los proyectos.
//    · El paquete llega al portal siempre con el nombre del tarifario en español
//      y a la medición con su clave, desde la portada y desde las páginas de
//      servicio, en los dos idiomas.
// ============================================================================
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, ChevronDown, MessageCircle, Send, X } from 'lucide-react';
import { locale, t } from '../../i18n/locale';
import { isDesktopPointer } from '../../hooks/useDesktop';
import { emailOk, phoneOk } from '../site/contact-rules';
import { NEXT_STEPS } from '../site/messages';
import { BUSINESS_PROMPT, PACKAGES, money, parseSheetHash, selectionLabel } from '../../data/packages';
import { sendLead } from '../../seo/site-tracker';
import { trackLeadCaptured } from '../../seo/analytics';
import { homePath, resolveRoute } from '../../seo/routes';
import { lockScroll } from './scroll-lock';
import { replayEarlyClick, takeEarlyClick } from './early-click';
import '../../styles/lead-dialog.css';

export const LEAD_DIALOG_FORM = 'contacto-rapido';
const MESSAGE_MAX = 600;
const PROBLEMS = {
  missing: t('Falta un dato para poder responderte: escribí tu WhatsApp o tu correo.', 'One detail is missing so we can reply: enter your WhatsApp or your email.'),
  phone: t('Revisá el número: necesita entre 8 y 15 dígitos (ejemplo: 8888 8888).', 'Check the number: it needs 8 to 15 digits (example: 8888 8888).'),
  email: t('Revisá el correo: le falta algo (ejemplo: nombre@empresa.com).', 'Check the email: something is missing (example: name@company.com).'),
};
const AFTER_SENDING = [
  t('Una persona del equipo te escribe al WhatsApp o correo que dejaste.', 'Someone from the team will message you at the WhatsApp or email you left.'),
  ...NEXT_STEPS.slice(1),
];

/** Contexto del enlace interceptado: mensaje armado, paquete, lo marcado, necesidad y sección donde estaba. */
function contextFrom(link) {
  const url = new URL(link.href);
  const routeNeed = resolveRoute(window.location.pathname)?.data?.need ?? null;
  // El paquete se busca por su clave: de ahí salen el nombre que lee el equipo y lo que hace falta para empezar.
  const pack = PACKAGES.find((item) => item.key === link.dataset.package) ?? null;
  const pick = pack ? parseSheetHash(link.dataset.packagePick) : null;
  return {
    href: link.href,
    message: (url.searchParams.get('text') ?? '').trim().slice(0, MESSAGE_MAX),
    packageId: link.dataset.package || '',
    packageLabel: link.dataset.packageLabel || pack?.name || link.dataset.package || '',
    packageName: pack?.portalName || link.dataset.packageLabel || link.dataset.package || '',
    packageValue: Number(link.dataset.value) || 0,
    pack,
    picked: pick?.item === pack ? selectionLabel(pack, pick) : '',
    sheet: pack ? link.dataset.packagePick || `#hoja-${pack.key}` : '',
    need: link.dataset.need || routeNeed,
    section: link.closest('[data-track-section]')?.dataset.trackSection ?? link.closest('section[id]')?.id ?? 'navigation',
  };
}

/** El mensaje que llega al portal: la línea abierta «Mi negocio:» se completa con lo escrito o se quita. */
function withBusiness(text, business) {
  const lines = text.split('\n');
  const index = lines.findIndex((line) => line.trim() === BUSINESS_PROMPT);
  const filled = business.trim() ? `${BUSINESS_PROMPT} ${business.trim()}` : '';
  if (index >= 0) lines.splice(index, 1, ...(filled ? [filled] : []));
  else if (filled) lines.push(filled);
  return lines.join('\n').trim().slice(0, MESSAGE_MAX);
}

const dialogState = (open) => window.dispatchEvent(new CustomEvent('jca:lead-dialog-state', { detail: { open } }));

export default function LeadDialog() {
  const dialogRef = useRef(null);
  const phoneRef = useRef(null);
  const mailRef = useRef(null);
  const titleRef = useRef(null);
  const release = useRef(null); // libera el bloqueo de desplazamiento del fondo
  const pressedBackdrop = useRef(false);
  const keepSheet = useRef(false); // la persona eligió volver al detalle de su pedido: no se cierra con el formulario
  const startedAt = useRef(0); // primera apertura (el portal descarta envíos llenados en menos de 1,5 s)
  const [context, setContext] = useState(null);
  const [name, setName] = useState('');
  const [business, setBusiness] = useState(''); // pedido de paquete: para qué negocio es (opcional)
  const [phone, setPhone] = useState('');
  const [mail, setMail] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState(''); // trampa para bots: invisible para personas
  const [status, setStatus] = useState('idle'); // idle · sending · sent · error
  const [problem, setProblem] = useState(null); // missing · phone · email

  useEffect(() => {
    const intercept = (event) => {
      // Clic con modificadores o botón secundario: la persona quiere el enlace tal cual.
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target.closest?.('a[href^="https://wa.me/"]');
      if (!link || link.hasAttribute('data-wa-direct') || !isDesktopPointer()) return;
      event.preventDefault();
      const next = contextFrom(link);
      if (!startedAt.current) startedAt.current = performance.now();
      setMessage(next.message);
      setStatus('idle');
      setProblem(null);
      setContext(next);
    };
    document.addEventListener('click', intercept, true);
    // Con la página ya interactiva, se atiende el clic a WhatsApp hecho antes de tiempo (ver early-click.js).
    // Se toma acá mismo, junto con el listener (ningún clic queda atendido por los dos), y se repite cuando los
    // demás componentes ya montaron y el botón tiene su etiqueta y su mensaje definitivos.
    takeEarlyClick();
    const replay = window.setTimeout(replayEarlyClick, 0);
    return () => { window.clearTimeout(replay); document.removeEventListener('click', intercept, true); };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!context || !dialog || dialog.open) return;
    dialog.showModal();
    dialogState(true);
    release.current = lockScroll();
    phoneRef.current?.focus();
  }, [context]);
  // Al enviar, el foco va al título de la confirmación: un lector de pantalla la anuncia.
  useEffect(() => { if (status === 'sent') titleRef.current?.focus(); }, [status]);
  useEffect(() => () => release.current?.(), []);

  const close = () => dialogRef.current?.close();
  const onClose = () => {
    // Aviso de un cierre anterior que llega cuando el formulario ya se volvió a abrir: no es de esta apertura.
    if (dialogRef.current?.open) return;
    dialogState(false);
    // El detalle del paquete (site/PackageSheet.jsx) queda abierto debajo: se cierra con este formulario solo
    // si el pedido ya salió y la persona no pidió volver a verlo.
    window.dispatchEvent(new CustomEvent('jca:lead-dialog-closed', { detail: { sent: status === 'sent', keepSheet: keepSheet.current } }));
    keepSheet.current = false;
    release.current?.();
    release.current = null;
    setContext(null);
  };

  const contact = { phone: phoneOk(phone) ? phone.trim() : '', email: emailOk(mail) ? mail.trim() : '' };
  const submit = async (event) => {
    event.preventDefault();
    if (status === 'sending') return;
    // Un dato escrito pero mal formado se avisa: no se descarta en silencio.
    const next = phone.trim() && !contact.phone ? 'phone' : mail.trim() && !contact.email ? 'email' : !contact.phone && !contact.email ? 'missing' : null;
    if (next) { setProblem(next); (next === 'email' ? mailRef : phoneRef).current?.focus(); return; }
    setProblem(null);
    setStatus('sending');
    const ok = await sendLead({
      channel: context.packageLabel ? 'paquete' : 'formulario',
      name: name.trim(), ...contact, need: context.need, message: context.packageLabel ? withBusiness(message, business) : message.trim(),
      packageName: context.packageName || undefined, website, startedAt: startedAt.current,
      form: LEAD_DIALOG_FORM, section: context.section,
    }).catch(() => false);
    if (ok) trackLeadCaptured({ form: LEAD_DIALOG_FORM, section: context.section, packageId: context.packageId || undefined, packageValue: context.packageValue || undefined });
    setStatus(ok ? 'sent' : 'error');
  };
  const edit = (setter) => (event) => { setter(event.target.value); if (problem) setProblem(null); if (status === 'error') setStatus('idle'); };

  const whatsappLink = (label) => (
    <a className="lead-dialog__wa" href={context.href} target="_blank" rel="noreferrer" data-wa-direct=""
      {...(context.packageId ? { 'data-package': context.packageId, 'data-value': context.packageValue || undefined } : {})}
      data-track-label="Formulario rápido · WhatsApp Web" onClick={close}>
      <MessageCircle size={17} aria-hidden="true" />{label}
    </a>
  );
  const messageField = (
    <textarea id="rapido-mensaje" rows={4} maxLength={MESSAGE_MAX} value={message} onChange={(event) => setMessage(event.target.value)} />
  );
  const isPackage = Boolean(context?.packageLabel);
  const bad = Boolean(problem) || status === 'error';
  // El campo del negocio aparece mientras el mensaje conserve su línea abierta («Mi negocio:»): si la persona
  // ya armó «Tu caso en una frase», el mensaje trae esa frase y no hace falta preguntarlo otra vez.
  const asksBusiness = isPackage && message.split('\n').some((line) => line.trim() === BUSINESS_PROMPT);
  const home = homePath(locale);
  // En la portada el enlace conserva la query (?p=, utm_, gclid): así es un salto de ancla y no una recarga
  // (con tráfico de anuncios se recargaba la página y se repetían los eventos de visita).
  const homeHref = (hash) => `${home}${window.location.pathname === home ? window.location.search : ''}${hash}`;
  // Volver al detalle del pedido: en la portada, si ya está abierto debajo, alcanza con cerrar este formulario.
  const viewSheet = (event) => {
    keepSheet.current = true;
    if (window.location.pathname === home && window.location.hash === context.sheet) event.preventDefault();
    close();
  };

  return (
    <dialog ref={dialogRef} className="lead-dialog" aria-labelledby="lead-dialog-title" onClose={onClose} data-lenis-prevent
      onMouseDown={(event) => { pressedBackdrop.current = event.target === event.currentTarget; }}
      onClick={(event) => { if (event.target === event.currentTarget && pressedBackdrop.current) close(); }}>
      {context && (
        <form className="lead-dialog__panel" data-track={LEAD_DIALOG_FORM} data-track-section={context.section} data-status={status} noValidate onSubmit={submit}>
          <button type="button" className="lead-dialog__close" onClick={close} aria-label={t('Cerrar', 'Close')} data-track-label="Formulario rápido · Cerrar"><X size={20} aria-hidden="true" /></button>
          {status === 'sent' ? (
            <>
              <span className="lead-dialog__eyebrow">{isPackage ? t('PEDIDO RECIBIDO', 'REQUEST RECEIVED') : t('CONSULTA RECIBIDA', 'INQUIRY RECEIVED')}</span>
              <h2 id="lead-dialog-title" ref={titleRef} tabIndex={-1}>{t('¡Listo! Te escribimos en menos de 24 h.', 'Done! We’ll reach out within 24 hours.')}</h2>
              {isPackage ? (
                <p className="lead-dialog__intro">
                  {t('Pediste:', 'You requested:')} <strong>{context.packageLabel}</strong>{context.packageValue > 0 && <> · {money(context.packageValue)} {t('+ IVA (total preliminar)', '+ tax (preliminary total)')}</>}{context.picked ? t(`. Incluye: ${context.picked}`, `. Includes: ${context.picked}`) : ''}. {t('Ya está con el equipo. Esto es lo que sigue:', 'It is with the team. Here is what comes next:')}
                </p>
              ) : (
                <p className="lead-dialog__intro">{t('Tu consulta ya está con el equipo. Esto es lo que sigue:', 'Your inquiry is with the team. Here is what comes next:')}</p>
              )}
              <ol className="lead-dialog__next">{AFTER_SENDING.map((step, index) => <li key={step}><span aria-hidden="true">{index + 1}</span>{step}</li>)}</ol>
              {/* Algo útil para hacer mientras tanto, con un dato que ya está publicado en el detalle del paquete. */}
              {context.pack?.ready && <p className="lead-dialog__ready">{t('Para ganar tiempo, andá preparando lo que necesitamos para empezar.', 'To save time, start preparing what we need to begin.')} {context.pack.ready}</p>}
              <div className="lead-dialog__actions">
                {context.pack
                  ? <a className="lead-dialog__submit" href={homeHref(context.sheet)} onClick={viewSheet} data-track-label="Formulario rápido · Ver mi pedido">{t('Ver o guardar el detalle de mi pedido', 'View or save my request details')}<ArrowRight size={17} aria-hidden="true" /></a>
                  : isPackage
                    ? <button type="button" className="lead-dialog__submit" onClick={close}>{t('Seguir navegando', 'Keep browsing')}</button>
                    : <a className="lead-dialog__submit" href={homeHref('#trabajo')} onClick={close} data-track-label="Formulario rápido · Ver proyectos">{t('Mientras tanto, ver proyectos reales', 'Meanwhile, see real projects')}<ArrowRight size={17} aria-hidden="true" /></a>}
                {whatsappLink(t('¿Es urgente? Abrir WhatsApp Web', 'Is it urgent? Open WhatsApp Web'))}
              </div>
            </>
          ) : (
            <>
              <span className="lead-dialog__eyebrow">{isPackage ? t('TU PEDIDO', 'YOUR REQUEST') : t('COTIZACIÓN', 'QUOTE')}</span>
              <h2 id="lead-dialog-title">{t('¿A dónde te escribimos?', 'Where should we write to you?')}</h2>
              {isPackage && (
                <p className="lead-dialog__package"><Check size={14} aria-hidden="true" />{t('Estás pidiendo:', 'You are asking for:')} <strong>{context.packageLabel}</strong>{context.packageValue > 0 && <> · {money(context.packageValue)} {t('+ IVA', '+ tax')}</>}</p>
              )}
              {/* Si el total difiere del de la tarjeta, acá se ve por qué. */}
              {context.picked && <p className="lead-dialog__picked">{t('Incluye lo que marcaste:', 'Includes what you ticked:')} {context.picked}</p>}
              <p className="lead-dialog__intro">{isPackage
                ? t('Dejá tu WhatsApp o tu correo. En menos de 24 h una persona del equipo te confirma si el paquete calza con tu caso. No te cobra ni te compromete.', 'Leave your WhatsApp or your email. Within 24 hours a person from the team confirms whether the package fits your case. No charge and no commitment.')
                : t('Dejá tu WhatsApp o tu correo. Te respondemos en menos de 24 h y la primera conversación, de 30 minutos, no tiene costo.', 'Leave your WhatsApp or your email. We reply within 24 hours and the first 30-minute conversation is free.')}</p>
              <div className="lead-dialog__grid">
                <div className="lead-field">
                  <label htmlFor="rapido-telefono">{t('WhatsApp o teléfono', 'WhatsApp or phone')}</label>
                  <input ref={phoneRef} id="rapido-telefono" type="tel" inputMode="tel" autoComplete="tel" maxLength={30} placeholder={t('Ej.: 8888 8888', 'e.g. 8888 8888')} value={phone}
                    onChange={edit(setPhone)} aria-invalid={problem === 'phone' || problem === 'missing'} aria-describedby="rapido-estado" />
                </div>
                <div className="lead-field">
                  <label htmlFor="rapido-correo">{t('o tu correo', 'or your email')}</label>
                  <input ref={mailRef} id="rapido-correo" type="email" inputMode="email" autoComplete="email" maxLength={160} placeholder={t('Ej.: nombre@empresa.com', 'e.g. name@company.com')} value={mail}
                    onChange={edit(setMail)} aria-invalid={problem === 'email'} aria-describedby="rapido-estado" />
                </div>
                <div className={`lead-field ${asksBusiness ? '' : 'lead-field--wide'}`}>
                  <label htmlFor="rapido-nombre">{t('Tu nombre', 'Your name')} <small>{t('(opcional)', '(optional)')}</small></label>
                  <input id="rapido-nombre" type="text" autoComplete="name" maxLength={100} value={name} onChange={(event) => setName(event.target.value)} />
                </div>
                {asksBusiness && (
                  <div className="lead-field">
                    <label htmlFor="rapido-negocio">{t('¿Para qué negocio es?', 'What business is it for?')} <small>{t('(opcional)', '(optional)')}</small></label>
                    <input id="rapido-negocio" type="text" autoComplete="organization" maxLength={120} placeholder={t('Ej.: barbería con 3 sillas en Heredia', 'e.g. a three-chair barbershop in Heredia')} value={business} onChange={(event) => setBusiness(event.target.value)} aria-describedby="rapido-negocio-ayuda" />
                    <span id="rapido-negocio-ayuda" className="sr-only">{t('Con una línea alcanza para confirmarte si el paquete calza.', 'One line is enough for us to confirm whether the package fits.')}</span>
                  </div>
                )}
                {isPackage ? (
                  // Pedido de paquete: el mensaje ya dice todo y queda plegado; quien quiera lo abre y lo cambia.
                  <details className="lead-dialog__message lead-field--wide">
                    <summary><ChevronDown size={16} aria-hidden="true" />{t('Ver o cambiar el mensaje que nos llega', 'See or edit the message we receive')}</summary>
                    <div className="lead-field">
                      <label htmlFor="rapido-mensaje" className="sr-only">{t('Tu mensaje', 'Your message')}</label>
                      {messageField}
                    </div>
                  </details>
                ) : (
                  <div className="lead-field lead-field--wide">
                    <label htmlFor="rapido-mensaje">{t('Contanos qué necesitás', 'Tell us what you need')} <small>{t('(ya empezamos el mensaje: completalo si querés)', '(we started the message: complete it if you like)')}</small></label>
                    {messageField}
                  </div>
                )}
                <div className="lead-dialog__trap" aria-hidden="true">
                  <label htmlFor="rapido-sitio">Sitio web</label>
                  <input id="rapido-sitio" type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
                </div>
              </div>
              <div className="lead-dialog__actions">
                <button type="submit" className="lead-dialog__submit" disabled={status === 'sending'} data-track="contact" data-track-label="Formulario rápido · Enviar">
                  <Send size={17} aria-hidden="true" />{status === 'sending' ? t('Enviando…', 'Sending…') : isPackage ? t('Enviar mi pedido', 'Send my request') : t('Enviar consulta', 'Send inquiry')}
                </button>
                {whatsappLink(t('Prefiero WhatsApp Web', 'I’d rather use WhatsApp Web'))}
              </div>
            </>
          )}
          {/* Siempre presente: un lector de pantalla anuncia tanto el error como la confirmación. */}
          <p id="rapido-estado" className={`lead-dialog__status ${status === 'sent' ? 'sr-only' : ''}`} role="status" data-tone={bad ? 'bad' : undefined}>
            {status === 'sent' && (isPackage ? t('Pedido enviado. Te escribimos en menos de 24 h.', 'Request sent. We’ll reach out within 24 hours.') : t('Consulta enviada. Te escribimos en menos de 24 h.', 'Inquiry sent. We’ll reach out within 24 hours.'))}
            {problem && PROBLEMS[problem]}
            {status === 'error' && t('No pudimos enviarlo. Probá de nuevo o seguí por WhatsApp Web.', 'We could not send it. Try again or continue on WhatsApp Web.')}
            {!problem && (status === 'idle' || status === 'sending') && t('Responde una persona del equipo, no un bot. Tus datos solo se usan para responderte.', 'A person from the team replies, not a bot. Your details are only used to reply to you.')}
          </p>
        </form>
      )}
    </dialog>
  );
}
