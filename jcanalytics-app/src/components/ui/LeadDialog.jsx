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
// ============================================================================
import { useEffect, useRef, useState } from 'react';
import { Check, MessageCircle, Send, X } from 'lucide-react';
import { t } from '../../i18n/locale';
import { isDesktopPointer } from '../../hooks/useDesktop';
import { emailOk, phoneOk } from '../site/contact-rules';
import { sendLead } from '../../seo/site-tracker';
import { trackLeadCaptured } from '../../seo/analytics';
import { resolveRoute } from '../../seo/routes';
import '../../styles/lead-dialog.css';

export const LEAD_DIALOG_FORM = 'contacto-rapido';
const MESSAGE_MAX = 600;

/** Contexto del enlace interceptado: mensaje armado, paquete, necesidad y sección donde estaba. */
function contextFrom(link) {
  const url = new URL(link.href);
  const routeNeed = resolveRoute(window.location.pathname)?.data?.need ?? null;
  return {
    href: link.href,
    message: (url.searchParams.get('text') ?? '').trim().slice(0, MESSAGE_MAX),
    packageId: link.dataset.package || '',
    packageLabel: link.dataset.packageLabel || link.dataset.package || '',
    packageValue: Number(link.dataset.value) || 0,
    need: link.dataset.need || routeNeed,
    section: link.closest('[data-track-section]')?.dataset.trackSection ?? link.closest('section[id]')?.id ?? 'navigation',
  };
}

const dialogState = (open) => window.dispatchEvent(new CustomEvent('jca:lead-dialog-state', { detail: { open } }));

export default function LeadDialog() {
  const dialogRef = useRef(null);
  const phoneRef = useRef(null);
  const startedAt = useRef(0); // cuándo se abrió (el portal descarta envíos llenados en menos de 1,5 s)
  const [context, setContext] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [mail, setMail] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState(''); // trampa para bots: invisible para personas
  const [status, setStatus] = useState('idle'); // idle · sending · sent · error · missing · invalid

  useEffect(() => {
    const intercept = (event) => {
      // Clic con modificadores o botón secundario: la persona quiere el enlace tal cual.
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target.closest?.('a[href^="https://wa.me/"]');
      if (!link || link.hasAttribute('data-wa-direct') || !isDesktopPointer()) return;
      event.preventDefault();
      const next = contextFrom(link);
      startedAt.current = performance.now();
      setMessage(next.message);
      setStatus('idle');
      setContext(next);
    };
    document.addEventListener('click', intercept, true);
    return () => document.removeEventListener('click', intercept, true);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!context || !dialog || dialog.open) return;
    dialog.showModal();
    dialogState(true);
    phoneRef.current?.focus();
  }, [context]);

  const close = () => dialogRef.current?.close();
  const onClose = () => {
    dialogState(false);
    setContext(null);
  };

  const contact = { phone: phoneOk(phone) ? phone.trim() : '', email: emailOk(mail) ? mail.trim() : '' };
  const submit = async (event) => {
    event.preventDefault();
    // Un dato escrito pero mal formado se avisa: no se descarta en silencio.
    if ((phone.trim() && !contact.phone) || (mail.trim() && !contact.email)) { setStatus('invalid'); return; }
    if (!contact.phone && !contact.email) { setStatus('missing'); phoneRef.current?.focus(); return; }
    setStatus('sending');
    const ok = await sendLead({
      channel: context.packageLabel ? 'paquete' : 'formulario',
      name: name.trim(), ...contact, need: context.need, message: message.trim(),
      packageName: context.packageLabel || undefined, website, startedAt: startedAt.current,
      form: LEAD_DIALOG_FORM, section: context.section,
    }).catch(() => false);
    if (ok) trackLeadCaptured({ form: LEAD_DIALOG_FORM, section: context.section, packageId: context.packageId || undefined, packageValue: context.packageValue || undefined });
    setStatus(ok ? 'sent' : 'error');
  };

  const whatsappLink = (label) => (
    <a className="lead-dialog__wa" href={context.href} target="_blank" rel="noreferrer" data-wa-direct=""
      {...(context.packageId ? { 'data-package': context.packageId, 'data-value': context.packageValue || undefined } : {})}
      data-track-label="Formulario rápido · WhatsApp Web" onClick={close}>
      <MessageCircle size={17} aria-hidden="true" />{label}
    </a>
  );

  return (
    <dialog ref={dialogRef} className="lead-dialog" aria-labelledby="lead-dialog-title" onClose={onClose} data-lenis-prevent
      onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
      {context && (
        <form className="lead-dialog__panel" data-track={LEAD_DIALOG_FORM} data-status={status} noValidate onSubmit={submit}>
          <button type="button" className="lead-dialog__close" onClick={close} aria-label={t('Cerrar', 'Close')}><X size={20} aria-hidden="true" /></button>
          {status === 'sent' ? (
            <>
              <span className="lead-dialog__eyebrow">{t('CONSULTA RECIBIDA', 'INQUIRY RECEIVED')}</span>
              <h2 id="lead-dialog-title">{t('¡Listo! Te escribimos en menos de 24 h.', 'Done! We’ll reach out within 24 hours.')}</h2>
              <p className="lead-dialog__intro">{t('Tu consulta quedó con el equipo, con el mensaje que viste. Te contactamos al WhatsApp o correo que dejaste.', 'Your inquiry is with the team, including the message you saw. We’ll contact you at the WhatsApp or email you left.')}</p>
              <div className="lead-dialog__actions">
                <button type="button" className="lead-dialog__submit" onClick={close}>{t('Seguir navegando', 'Keep browsing')}</button>
                {whatsappLink(t('¿Preferís WhatsApp Web? Abrirlo igual', 'Prefer WhatsApp Web? Open it anyway'))}
              </div>
            </>
          ) : (
            <>
              <span className="lead-dialog__eyebrow">{t('CONSULTA RÁPIDA', 'QUICK INQUIRY')}</span>
              <h2 id="lead-dialog-title">{t('Dejanos tu contacto y te escribimos.', 'Leave your contact and we’ll write to you.')}</h2>
              <p className="lead-dialog__intro">{t('Desde la computadora es más fácil así: en vez de abrir WhatsApp Web, contanos cómo ubicarte y el equipo te escribe en menos de 24 h.', 'From a computer this is easier: instead of opening WhatsApp Web, tell us how to reach you and the team writes to you within 24 hours.')}</p>
              {context.packageLabel && (
                <p className="lead-dialog__package"><Check size={14} aria-hidden="true" />{t('Estás pidiendo:', 'You are asking for:')} <strong>{context.packageLabel}</strong>{context.packageValue > 0 && <> · ${context.packageValue.toLocaleString('en-US')}</>}</p>
              )}
              <div className="lead-dialog__grid">
                <div className="lead-field">
                  <label htmlFor="rapido-telefono">{t('WhatsApp o teléfono', 'WhatsApp or phone')}</label>
                  <input ref={phoneRef} id="rapido-telefono" type="tel" inputMode="tel" autoComplete="tel" maxLength={30} value={phone}
                    onChange={(event) => { setPhone(event.target.value); if (status !== 'sending') setStatus('idle'); }} aria-invalid={phone.trim() !== '' && !phoneOk(phone)} />
                </div>
                <div className="lead-field">
                  <label htmlFor="rapido-correo">{t('o tu correo', 'or your email')}</label>
                  <input id="rapido-correo" type="email" inputMode="email" autoComplete="email" maxLength={160} value={mail}
                    onChange={(event) => { setMail(event.target.value); if (status !== 'sending') setStatus('idle'); }} aria-invalid={mail.trim() !== '' && !emailOk(mail)} />
                </div>
                <div className="lead-field lead-field--wide">
                  <label htmlFor="rapido-nombre">{t('Tu nombre', 'Your name')} <small>{t('(opcional)', '(optional)')}</small></label>
                  <input id="rapido-nombre" type="text" autoComplete="name" maxLength={100} value={name} onChange={(event) => setName(event.target.value)} />
                </div>
                <div className="lead-field lead-field--wide">
                  <label htmlFor="rapido-mensaje">{t('Tu mensaje', 'Your message')} <small>{t('(ya viene armado; cambialo si querés)', '(already drafted; edit it if you like)')}</small></label>
                  <textarea id="rapido-mensaje" rows={4} maxLength={MESSAGE_MAX} value={message} onChange={(event) => setMessage(event.target.value)} />
                </div>
                <div className="lead-dialog__trap" aria-hidden="true">
                  <label htmlFor="rapido-sitio">Sitio web</label>
                  <input id="rapido-sitio" type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
                </div>
              </div>
              <div className="lead-dialog__actions">
                <button type="submit" className="lead-dialog__submit" disabled={status === 'sending'} data-track="contact" data-track-label="Formulario rápido · Enviar">
                  <Send size={17} aria-hidden="true" />{status === 'sending' ? t('Enviando…', 'Sending…') : t('Enviar consulta', 'Send inquiry')}
                </button>
                {whatsappLink(t('Prefiero WhatsApp Web', 'I’d rather use WhatsApp Web'))}
              </div>
              <p className="lead-dialog__status" role="status" data-tone={['missing', 'invalid', 'error'].includes(status) ? 'bad' : undefined}>
                {status === 'missing' && t('Dejanos tu WhatsApp o tu correo para poder contactarte.', 'Leave your WhatsApp or email so we can contact you.')}
                {status === 'invalid' && t('Revisá el número (8 a 15 dígitos) o el correo.', 'Check the number (8 to 15 digits) or the email.')}
                {status === 'error' && t('No pudimos enviarlo. Probá de nuevo o seguí por WhatsApp Web.', 'We could not send it. Try again or continue on WhatsApp Web.')}
                {(status === 'idle' || status === 'sending') && t('Sin bots: te responde el mismo equipo que va a trabajar con vos. Tus datos solo se usan para contactarte.', 'No bots: the same team that will work with you replies. Your details are only used to contact you.')}
              </p>
            </>
          )}
        </form>
      )}
    </dialog>
  );
}
