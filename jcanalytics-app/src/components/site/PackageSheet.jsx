// ============================================================================
//  src/components/site/PackageSheet.jsx
//  HOJA DEL PAQUETE · el «alcance y precio por escrito», antes de escribir.
//
//  Cinco revisiones independientes de la portada (ventas, oferta, economía
//  conductual, confianza y un comprador corporativo simulado) llegaron a la misma
//  idea: quien está frente a «Lo quiero» no sabe qué pasa después, qué queda
//  fuera del precio ni tiene algo que reenviar a quien aprueba el gasto. Esta
//  hoja lo pone en una pantalla, armada solo con el tarifario
//  (portal/shared/service-pricing.js) y los compromisos publicados:
//
//    · qué incluye, qué hay que tener en cuenta y qué hace falta para empezar;
//    · la opción con IA y los agregados con precio publicado, como casillas que
//      suman a un total a la vista (el total con IA reemplaza al base, no se suma);
//    · qué pasa después de pedirlo, en tres pasos;
//    · pedirlo (WhatsApp en celular, formulario corto en computadora: la regla por
//      dispositivo no cambia y el mensaje sale con lo marcado), preguntar antes,
//      imprimirla o guardarla en PDF, y compartir su enlace.
//
//  No es el cotizador que salió de la portada el 3 de noviembre: no estima
//  proyectos, solo suma precios fijos ya publicados de un paquete. Tampoco
//  resuelve el pago: los medios y condiciones no están publicados y no se inventan.
//  Sin JavaScript, el enlace de la tarjeta lleva a la página de la categoría.
// ============================================================================
import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, Check, Clock3, Info, Link2, MessageCircle, Printer, ShieldCheck, X } from 'lucide-react';
import { locale, t } from '../../i18n/locale';
import { colones, money, packageMessage, packageTotal } from '../../data/packages';
import { PROJECTS } from '../../data/projects';
import { CATEGORY_LINKS, wa } from './links';
import { NEXT_STEPS } from './messages';
import { useDesktop } from '../../hooks/useDesktop';
import { lockScroll } from '../ui/scroll-lock';
import '../../styles/package-sheet.css';

const sheetState = (open) => window.dispatchEvent(new CustomEvent('jca:lead-dialog-state', { detail: { open } }));
const showProject = (id) => window.dispatchEvent(new CustomEvent('jca:show-project', { detail: { id } }));

export default function PackageSheet({ item, onClose }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!item || !dialog || dialog.open) return undefined;
    dialog.showModal();
    sheetState(true);
    // El documento no se desplaza detrás de la hoja.
    const release = lockScroll();
    dialog.querySelector('h2')?.focus({ preventScroll: true });
    return release;
  }, [item]);
  const close = () => dialogRef.current?.close();
  const closed = () => { sheetState(false); onClose(); };
  return (
    <dialog ref={dialogRef} className="package-sheet" aria-labelledby="package-sheet-title" data-lenis-prevent onClose={closed}
      onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
      {/* La clave reinicia lo marcado (IA y agregados) cada vez que se abre otro paquete. */}
      {item && <Sheet key={item.key} item={item} close={close} />}
    </dialog>
  );
}

function Sheet({ item, close }) {
  const desktop = useDesktop();
  const [withAi, setWithAi] = useState(false);
  const [picked, setPicked] = useState([]);
  const [copied, setCopied] = useState(false);

  const extras = item.extras.filter((extra) => picked.includes(extra.key));
  const total = packageTotal(item, { withAi, extras });
  const message = packageMessage(item, { withAi, extras });
  const question = t(
    `Hola JC Analytics, estoy viendo el paquete ${item.name} (${item.priceLabel}) y tengo una duda antes de decidir:`,
    `Hi JC Analytics, I am looking at the ${item.name} package (${item.priceLabel}) and have a question before deciding:`,
  );
  const category = CATEGORY_LINKS.find((link) => link.id === item.category);
  const related = item.related ? PROJECTS.find((project) => project.id === item.related) : null;
  const shareUrl = `${window.location.origin}${window.location.pathname}#hoja-${item.key}`;
  const toggle = (key) => setPicked((list) => (list.includes(key) ? list.filter((value) => value !== key) : [...list, key]));
  const print = () => {
    document.documentElement.classList.add('print-package-sheet');
    const done = () => { document.documentElement.classList.remove('print-package-sheet'); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    window.print();
  };
  const share = async () => {
    const text = t(`${item.name} de JC Analytics: ${money(total)} + IVA, entrega en ${item.time}.`, `${item.name} by JC Analytics: ${money(total)} + tax, delivered in ${item.time}.`);
    try {
      if (navigator.share && !desktop) { await navigator.share({ title: item.name, text, url: shareUrl }); return; }
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch { /* la persona canceló o el navegador no deja copiar: el enlace sigue visible en la barra */ }
  };

  return (
      <article className="package-sheet__panel" data-track-section="hoja-paquete">
        <button type="button" className="package-sheet__close" onClick={close} aria-label={t('Cerrar la hoja', 'Close the sheet')}><X size={20} aria-hidden="true" /></button>
        <header className="package-sheet__head">
          <span className="package-sheet__eyebrow">{t('HOJA DEL PAQUETE · PRELIMINAR', 'PACKAGE SHEET · PRELIMINARY')}{category ? ` · ${category.label.toUpperCase()}` : ''}</span>
          <h2 id="package-sheet-title" tabIndex={-1}>{item.name}</h2>
          <p className="package-sheet__pitch">{item.pitch}</p>
          <ul className="package-sheet__facts">
            <li><Clock3 size={15} aria-hidden="true" />{t('Entrega:', 'Delivery:')} {item.time}</li>
            <li><ShieldCheck size={15} aria-hidden="true" />{t('30 días de soporte incluidos', '30 days of support included')}</li>
          </ul>
        </header>

        <div className="package-sheet__body">
          <div className="package-sheet__scope">
            <section>
              <h3>{t('Incluido en el precio', 'Included in the price')}</h3>
              <p><Check size={14} aria-hidden="true" />{item.scope}</p>
              <p><Check size={14} aria-hidden="true" />{t('Configuración, pruebas, capacitación y guía de uso.', 'Configuration, testing, training and a user guide.')}</p>
              {item.aiIncluded && <p><Check size={14} aria-hidden="true" />{item.aiScope}</p>}
            </section>
            <section>
              <h3>{t('A tener en cuenta', 'Keep in mind')}</h3>
              <p><Info size={14} aria-hidden="true" />{item.exclusions}</p>
              <p><Info size={14} aria-hidden="true" />{t('IVA, licencias, consumos y preparación de información se cotizan aparte: te lo detallamos por escrito antes de empezar.', 'Tax, licenses, usage and information preparation are quoted separately: we detail them in writing before we start.')}</p>
              {item.supportMonthly && <p><Info size={14} aria-hidden="true" />{t(`Después de los 30 días, soporte mensual opcional: ${money(item.supportMonthly.price)} (${item.supportMonthly.hours} h por semana).`, `After the 30 days, optional monthly support: ${money(item.supportMonthly.price)} (${item.supportMonthly.hours} h per week).`)}</p>}
            </section>
            <section>
              <h3>{t('Para empezar necesitamos', 'To start we need')}</h3>
              <p><ArrowRight size={14} aria-hidden="true" />{item.ready}</p>
            </section>
          </div>

          <div className="package-sheet__order">
            {(item.ai || item.extras.length > 0) && (
              <fieldset className="package-sheet__options">
                <legend>{t('Opcional, con precio publicado', 'Optional, at a published price')}</legend>
                {item.ai && (
                  <label className={withAi ? 'is-on' : ''}>
                    <input type="checkbox" checked={withAi} onChange={() => setWithAi((value) => !value)} data-track-label="Hoja · Con IA" />
                    <span><strong>{t('Con IA', 'With AI')}</strong>{item.ai.scope}<small>{t('El total con IA reemplaza al precio base; no se suma.', 'The total with AI replaces the base price; it is not added.')}</small></span>
                    <em>{money(item.ai.total)}</em>
                  </label>
                )}
                {item.extras.map((extra) => (
                  <label key={extra.key} className={picked.includes(extra.key) ? 'is-on' : ''}>
                    <input type="checkbox" checked={picked.includes(extra.key)} onChange={() => toggle(extra.key)} data-track-label={`Hoja · Agregado ${extra.key}`} />
                    <span>{extra.label}</span>
                    <em>+{money(extra.price)}</em>
                  </label>
                ))}
              </fieldset>
            )}
            <p className="package-sheet__total" role="status" aria-live="polite">
              <span>{t('Total preliminar', 'Preliminary total')}</span>
              <strong>{money(total)}</strong>
              <small>{t('pago único + IVA', 'one-time + tax')} · ≈ {colones(total)}</small>
            </p>
            <ol className="package-sheet__next" aria-label={t('Qué pasa después de pedirlo', 'What happens after you request it')}>
              {NEXT_STEPS.map((step, index) => <li key={step}><span>{index + 1}</span>{step}</li>)}
            </ol>
            <div className="package-sheet__actions">
              <a className="package-sheet__buy" href={wa(message)} target="_blank" rel="noreferrer" onClick={close}
                data-package={item.key} data-value={total} data-package-label={item.name} data-need={item.need} data-track-label={`Hoja · Pedir · ${item.name}`}>
                <MessageCircle size={18} aria-hidden="true" />{desktop ? t('Pedir este paquete', 'Request this package') : t('Pedirlo por WhatsApp', 'Request it on WhatsApp')}
              </a>
              <a className="package-sheet__ask" href={wa(question)} target="_blank" rel="noreferrer" onClick={close} data-need={item.need} data-track-label={`Hoja · Duda · ${item.name}`}>{desktop ? t('Tengo una duda antes', 'I have a question first') : t('Tengo una duda antes · WhatsApp', 'I have a question first · WhatsApp')}</a>
            </div>
            <p className="package-sheet__note">{t('Pedirlo no te cobra ni te compromete. El alcance final se confirma por escrito antes de empezar.', 'Requesting it involves no charge and no commitment. The final scope is confirmed in writing before we start.')}</p>
          </div>
        </div>

        <footer className="package-sheet__foot">
          <div className="package-sheet__tools">
            <button type="button" onClick={print} data-track-label={`Hoja · Imprimir · ${item.name}`}><Printer size={15} aria-hidden="true" />{t('Imprimir o guardar en PDF', 'Print or save as PDF')}</button>
            <button type="button" onClick={share} data-track-label={`Hoja · Compartir · ${item.name}`}><Link2 size={15} aria-hidden="true" />{copied ? t('Enlace copiado', 'Link copied') : t('Compartir con quien aprueba', 'Share with whoever approves')}</button>
          </div>
          <div className="package-sheet__links">
            {category && <a href={`${category.href}?p=${item.key}#oferta`} data-track-label={`Hoja · Ver ${category.label}`}>{t(`Ver señales, calculadora y preguntas de ${category.label}`, `See signals, calculator and questions for ${category.label}`)} <ArrowRight size={14} aria-hidden="true" /></a>}
            {related && <a href="#proyecto" onClick={() => { showProject(related.id); close(); }} data-track-label={`Hoja · Proyecto ${related.name}`}>{t(`Ver un proyecto real relacionado: ${related.name}`, `See a related real project: ${related.name}`)} <ArrowDown size={14} aria-hidden="true" /><small>{t('Es un sistema más amplio que este paquete.', 'It is a broader system than this package.')}</small></a>}
          </div>
          <p className="package-sheet__origin">JC Analytics · www.jcanalytic.com · {new Intl.DateTimeFormat(locale === 'es' ? 'es-CR' : 'en-US', { dateStyle: 'long' }).format(new Date())} · {t('Precios en USD; colones de referencia.', 'Prices in USD; colones for reference.')}</p>
        </footer>
      </article>
  );
}
