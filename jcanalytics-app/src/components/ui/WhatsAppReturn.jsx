// ============================================================================
//  src/components/ui/WhatsAppReturn.jsx
//  Red de seguridad del camino de WhatsApp en celular.
//
//  En celular todo botón de contacto abre WhatsApp con el mensaje ya escrito. El
//  sitio cuenta ese toque, pero no sabe si el mensaje se envió: quien duda frente
//  al chat, o no tiene WhatsApp en ese teléfono, vuelve a la página y la consulta
//  se pierde sin dejar rastro (hallazgo de la auditoría de noviembre de 2026).
//
//  Cuando la persona vuelve a la pestaña después de tocar un botón de WhatsApp,
//  esta hoja le pregunta, una sola vez por visita, si pudo enviar el mensaje. Si
//  no, deja su número y la consulta llega al portal como «Pidió que lo
//  contacten», con el mismo mensaje y el mismo paquete que iba a enviar.
//
//  · No es un modal: no bloquea la página y se cierra con un toque o con Escape.
//  · No aparece en computadora (ahí los botones abren el formulario corto), ni si
//    la persona ya dejó una consulta en esta visita, ni más de una vez.
//  · La consulta no vuelve a contar como conversión de anuncios: el toque a
//    WhatsApp ya contó (`ads: false`).
//  · Al aparecer, el foco va a su título (sin abrir el teclado ni mover la
//    página) para que un lector de pantalla la anuncie; Escape la cierra. El
//    portal registra que se mostró: así se sabe cuántos de los que la ven dejan
//    su número.
// ============================================================================
import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { t } from '../../i18n/locale';
import { isDesktopPointer } from '../../hooks/useDesktop';
import { phoneOk } from '../site/contact-rules';
import { sendLead, trackEvent } from '../../seo/site-tracker';
import { trackLeadCaptured } from '../../seo/analytics';
import { resolveRoute } from '../../seo/routes';
import { PACKAGES } from '../../data/packages';
import '../../styles/whatsapp-return.css';

const FORM = 'whatsapp-retorno';
const SHOWN_KEY = 'jc_wa_return'; // analytics.js la borra cuando la visita llega por un clic nuevo en un anuncio
const LEAD_KEY = 'jc_lead'; // lo escribe analytics.js cuando el portal acepta una consulta
const AWAY_MIN_MS = 3000; // menos que esto no fue ir a WhatsApp: fue un cambio de pestaña o un toque fallido
const AWAY_MAX_MS = 30 * 60 * 1000;
const MESSAGE_MAX = 600;
const stored = (key) => { try { return window.sessionStorage.getItem(key) === '1'; } catch { return false; } };
const remember = (key) => { try { window.sessionStorage.setItem(key, '1'); } catch { /* vale solo para esta página */ } };

/** Lo que la persona iba a enviar: mensaje, paquete, necesidad y sección del botón. */
function pendingFrom(link) {
  const url = new URL(link.href);
  return {
    href: link.href,
    message: (url.searchParams.get('text') ?? '').trim().slice(0, MESSAGE_MAX),
    packageId: link.dataset.package || '',
    packageLabel: link.dataset.packageLabel || link.dataset.package || '',
    // Lo que lee el equipo en el portal: siempre el nombre del tarifario en español (igual que ui/LeadDialog.jsx).
    packageName: PACKAGES.find((item) => item.key === link.dataset.package)?.portalName || link.dataset.packageLabel || link.dataset.package || '',
    packageValue: Number(link.dataset.value) || 0,
    need: link.dataset.need || resolveRoute(window.location.pathname)?.data?.need || 'Otro',
    section: link.closest('[data-track-section]')?.dataset.trackSection ?? link.closest('section[id]')?.id ?? 'navigation',
  };
}

export default function WhatsAppReturn() {
  const pending = useRef(null); // { ...contexto, leftAt }
  const startedAt = useRef(0);
  const titleRef = useRef(null);
  const opener = useRef(null); // dónde estaba el foco cuando apareció la hoja (se le devuelve al cerrarla)
  const [context, setContext] = useState(null);
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('idle'); // idle · invalid · sending · sent · error

  useEffect(() => {
    const onClick = (event) => {
      const link = event.target.closest?.('a[href^="https://wa.me/"]');
      // En computadora el clic abre el formulario corto (o WhatsApp Web a pedido): no hace falta esta red.
      if (!link || event.defaultPrevented || isDesktopPointer()) return;
      // `link`: a dónde vuelve el foco al cerrar la hoja si el navegador no enfocó el enlace al tocarlo (Safari).
      pending.current = { ...pendingFrom(link), link, leftAt: 0 };
    };
    // El formulario de contacto abre WhatsApp con window.open y avisa con este evento.
    const onOpened = (event) => {
      if (isDesktopPointer()) return;
      pending.current = { href: event.detail?.href ?? '', message: String(event.detail?.message ?? '').slice(0, MESSAGE_MAX), packageId: '', packageLabel: '', packageName: '', packageValue: 0, need: event.detail?.need || 'Otro', section: event.detail?.section ?? 'contacto', leftAt: 0 };
    };
    const onVisibility = () => {
      const waiting = pending.current;
      if (!waiting) return;
      if (document.visibilityState === 'hidden') { waiting.leftAt = Date.now(); return; }
      const away = waiting.leftAt ? Date.now() - waiting.leftAt : 0;
      pending.current = null;
      if (away < AWAY_MIN_MS || away > AWAY_MAX_MS || stored(SHOWN_KEY) || stored(LEAD_KEY)) return;
      remember(SHOWN_KEY);
      trackEvent('click', { k: 'button', l: 'Retorno · Se mostró', s: waiting.section });
      startedAt.current = performance.now();
      setStatus('idle');
      setContext(waiting);
    };
    document.addEventListener('click', onClick);
    window.addEventListener('jca:whatsapp-opened', onOpened);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('click', onClick);
      window.removeEventListener('jca:whatsapp-opened', onOpened);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // Mientras la hoja está abierta los botones flotantes se retiran: ocupan la misma franja. Escape la cierra.
  useEffect(() => {
    document.body.classList.toggle('wa-return-open', Boolean(context));
    if (!context) return undefined;
    // En Safari tocar un enlace no lo enfoca: ahí el foco estaría en <body> y se devuelve al botón tocado.
    const focused = document.activeElement;
    opener.current = focused && focused !== document.body ? focused : context.link ?? null;
    const onKey = (event) => { if (event.key === 'Escape') setContext(null); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('wa-return-open');
      // La hoja se cierra desmontándose: si el foco se perdió con ella, vuelve al botón desde donde la persona
      // salió a WhatsApp. A quien ya siguió navegando no se le quita.
      const back = opener.current;
      opener.current = null;
      window.requestAnimationFrame(() => { if (back?.isConnected && (!document.activeElement || document.activeElement === document.body)) back.focus({ preventScroll: true }); });
    };
  }, [context]);
  // Al aparecer y al confirmar el envío, el foco va al título: se anuncia y no se pierde en el documento.
  const sent = status === 'sent';
  useEffect(() => { if (context) titleRef.current?.focus({ preventScroll: true }); }, [context, sent]);

  if (!context) return null;
  const close = () => setContext(null);
  const submit = async (event) => {
    event.preventDefault();
    if (status === 'sending') return;
    if (!phoneOk(phone)) { setStatus('invalid'); return; }
    setStatus('sending');
    const ok = await sendLead({
      channel: 'devolucion', phone: phone.trim(), need: context.need, message: context.message,
      packageName: context.packageName || undefined, website: '', startedAt: startedAt.current, form: FORM, section: context.section,
    }).catch(() => false);
    if (ok) trackLeadCaptured({ form: FORM, section: context.section, packageId: context.packageId || undefined, packageValue: context.packageValue || undefined, ads: false });
    setStatus(ok ? 'sent' : 'error');
  };

  return (
    <aside className="wa-return" role="dialog" aria-modal="false" aria-labelledby="wa-return-title" data-track-section="retorno-whatsapp">
      <button type="button" className="wa-return__close" onClick={close} aria-label={t('Cerrar', 'Close')} data-track-label="Retorno · Cerrar"><X size={18} aria-hidden="true" /></button>
      {status === 'sent' ? (
        <div role="status">
          <p id="wa-return-title" ref={titleRef} tabIndex={-1} className="wa-return__title">{t('¡Listo! Te escribimos en menos de 24 h.', 'Done! We’ll reach out within 24 hours.')}</p>
          <p className="wa-return__text">{t('Tu consulta ya está con el equipo, con el mensaje que ibas a enviar.', 'Your inquiry is with the team, with the message you were about to send.')}</p>
          <button type="button" className="wa-return__secondary" onClick={close}>{t('Seguir viendo la página', 'Keep browsing')}</button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate data-track={FORM}>
          <p id="wa-return-title" ref={titleRef} tabIndex={-1} className="wa-return__title">{t('¿Pudiste enviar tu mensaje?', 'Did your message go through?')}</p>
          <p className="wa-return__text">{context.packageLabel
            ? t(`Si no, dejá tu número y te escribimos nosotros sobre ${context.packageLabel}.`, `If not, leave your number and we will write to you about ${context.packageLabel}.`)
            : t('Si no, dejá tu número y te escribimos nosotros en menos de 24 h.', 'If not, leave your number and we will write to you within 24 hours.')}</p>
          <div className="wa-return__row">
            <label htmlFor="retorno-telefono" className="sr-only">{t('WhatsApp o teléfono', 'WhatsApp or phone')}</label>
            <input id="retorno-telefono" type="tel" inputMode="tel" autoComplete="tel" maxLength={30} placeholder={t('Tu WhatsApp', 'Your WhatsApp')} value={phone}
              onChange={(event) => { setPhone(event.target.value); if (status !== 'sending') setStatus('idle'); }} aria-invalid={status === 'invalid'} aria-describedby="retorno-estado" />
            <button type="submit" className="wa-return__submit" disabled={status === 'sending'} data-track="contact" data-track-label="Retorno · Que me contacten">
              {status === 'sending' ? t('Enviando…', 'Sending…') : t('Escríbanme ustedes', 'Message me instead')}
            </button>
          </div>
          <p id="retorno-estado" className="wa-return__status" role="status">
            {status === 'invalid' && t('Revisá el número: necesita entre 8 y 15 dígitos.', 'Check the number: it needs 8 to 15 digits.')}
            {status === 'error' && t('No pudimos enviarlo. Probá de nuevo o volvé a WhatsApp.', 'We could not send it. Try again or go back to WhatsApp.')}
          </p>
          <div className="wa-return__foot">
            <button type="button" className="wa-return__secondary" onClick={close} data-track-label="Retorno · Ya lo envié">{t('Sí, ya lo envié', 'Yes, I sent it')}</button>
            {context.href && <a href={context.href} target="_blank" rel="noreferrer" className="wa-return__secondary" onClick={close} data-track-label="Retorno · Volver a WhatsApp"><MessageCircle size={15} aria-hidden="true" />{t('Volver a WhatsApp', 'Back to WhatsApp')}</a>}
          </div>
        </form>
      )}
    </aside>
  );
}
