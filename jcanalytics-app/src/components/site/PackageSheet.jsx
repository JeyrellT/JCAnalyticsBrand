// ============================================================================
//  src/components/site/PackageSheet.jsx
//  DETALLE DEL PAQUETE · el «alcance y precio por escrito», antes de escribir.
//  (En el código y en los enlaces se llama «hoja»: #hoja-<clave>.)
//
//  Cinco revisiones independientes de la portada (ventas, oferta, economía
//  conductual, confianza y un comprador corporativo simulado) llegaron a la misma
//  idea: quien está frente a «Lo quiero» no sabe qué pasa después, qué queda
//  fuera del precio ni tiene algo que reenviar a quien aprueba el gasto. Este
//  detalle lo pone en una pantalla, armado solo con el tarifario
//  (portal/shared/service-pricing.js) y los compromisos publicados:
//
//    · qué incluye, qué hay que tener en cuenta y qué hace falta para empezar;
//    · la opción con IA y los agregados con precio publicado, como casillas que
//      suman a un total (el total con IA reemplaza al base, no se suma);
//    · qué pasa después de pedirlo, en tres pasos;
//    · pedirlo (WhatsApp en celular, formulario corto en computadora: la regla por
//      dispositivo no cambia y el mensaje sale con lo marcado), preguntar antes,
//      imprimirlo o guardarlo en PDF, y compartir su enlace.
//
//  Segunda ronda de la auditoría (noviembre de 2026):
//    · El total y el botón de pedir van en una barra pegada al borde inferior:
//      antes quedaban a dos pantallas en celular y cortados en un portátil.
//    · En pantallas angostas las casillas van justo después de «Incluido».
//    · Lo marcado viaja en el enlace (#hoja-<clave>.ia.<agregado>): quien recibe
//      «Compartir con quien aprueba» ve el mismo total y volver atrás no lo borra.
//    · El PDF sale en una página: se imprime una copia del detalle fuera del
//      resto del sitio (antes salían 18 páginas en blanco detrás).
//    · En computadora el detalle queda abierto debajo del formulario corto: si la
//      persona lo cierra, vuelve a lo que marcó.
//
//  No es el cotizador que salió de la portada el 3 de noviembre: no estima
//  proyectos, solo suma precios fijos ya publicados de un paquete. Tampoco
//  resuelve el pago: los medios y condiciones no están publicados y no se inventan.
//  Sin JavaScript, el enlace de la tarjeta lleva a la página de la categoría.
// ============================================================================
import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, Check, ChevronDown, Clock3, Info, Link2, Printer, ShieldCheck, X } from 'lucide-react';
import { locale, t } from '../../i18n/locale';
import { PACKAGES, colones, money, packageMessage, packageTotal, selectionLabel, sheetHash } from '../../data/packages';
import { WORK_PROMISES } from '../../content/service-offers';
import { PROJECTS } from '../../data/projects';
import { CATEGORY_LINKS, wa } from './links';
import { NEXT_STEPS } from './messages';
import { useCase } from './case';
import { afterLayout, scrollToNode } from './scroll';
import ContactIcon from './ContactIcon';
import { useDesktop } from '../../hooks/useDesktop';
import { lockScroll } from '../ui/scroll-lock';
import '../../styles/package-sheet.css';

const sheetState = (open) => window.dispatchEvent(new CustomEvent('jca:lead-dialog-state', { detail: { open } }));
const showProject = (id, screen) => window.dispatchEvent(new CustomEvent('jca:show-project', { detail: { id, screen } }));
const here = () => `${window.location.pathname}${window.location.search}`;

// Mismo corte que el CSS: por debajo, una sola columna con las casillas arriba.
const NARROW = '(max-width: 860px)';
function useNarrow() {
  const [narrow, setNarrow] = useState(() => window.matchMedia(NARROW).matches);
  useEffect(() => {
    const query = window.matchMedia(NARROW);
    const sync = () => setNarrow(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);
  return narrow;
}

/** `sheet`: { item, withAi, picked, shared } o null. `onSwitch(clave)` cambia a otro paquete sin cerrar. */
export default function PackageSheet({ sheet, onClose, onSwitch }) {
  const dialogRef = useRef(null);
  const open = Boolean(sheet);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    // El historial volvió atrás (botón o gesto del navegador): el detalle se cierra con él.
    if (!open) { if (dialog.open) dialog.close(); return undefined; }
    if (!dialog.open) dialog.showModal();
    sheetState(true);
    // El documento no se desplaza detrás del detalle.
    return lockScroll();
  }, [open]);
  const item = sheet?.item ?? null;
  // El foco va al título cada vez que se muestra un paquete (también al pasar al paquete mayor).
  useEffect(() => { if (item) dialogRef.current?.querySelector('h2')?.focus({ preventScroll: true }); }, [item]);
  // Pedido enviado desde el formulario corto y confirmación cerrada: el detalle ya cumplió.
  useEffect(() => {
    const leadClosed = (event) => { if (event.detail?.sent && !event.detail.keepSheet) dialogRef.current?.close(); };
    window.addEventListener('jca:lead-dialog-closed', leadClosed);
    return () => window.removeEventListener('jca:lead-dialog-closed', leadClosed);
  }, []);
  const close = () => dialogRef.current?.close();
  const closed = () => { sheetState(false); onClose(); };
  return (
    <dialog ref={dialogRef} className="package-sheet" aria-labelledby="package-sheet-title" data-lenis-prevent onClose={closed}
      onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
      {/* La clave reinicia lo marcado (IA y agregados) cada vez que se abre otro paquete. */}
      {sheet && <Sheet key={sheet.item.key} item={sheet.item} initial={sheet} close={close} onSwitch={onSwitch} />}
    </dialog>
  );
}

function Sheet({ item, initial, close, onSwitch }) {
  const desktop = useDesktop();
  const narrow = useNarrow();
  const visit = useCase();
  const [withAi, setWithAi] = useState(Boolean(initial.withAi) && Boolean(item.ai));
  const [picked, setPicked] = useState(initial.picked ?? []);
  const [copied, setCopied] = useState(false);
  const [touched, setTouched] = useState(false);

  const extras = item.extras.filter((extra) => picked.includes(extra.key));
  const total = packageTotal(item, { withAi, extras });
  const message = packageMessage(item, { withAi, extras, sentence: visit.sentence });
  const marks = selectionLabel(item, { withAi, picked });
  const question = t(
    `Hola JC Analytics, estoy viendo el paquete ${item.name} (${item.priceLabel}) y tengo una duda antes de decidir:`,
    `Hi JC Analytics, I am looking at the ${item.name} package (${item.priceLabel}) and have a question before deciding:`,
  );
  const category = CATEGORY_LINKS.find((link) => link.id === item.category);
  const upgrade = item.upgrade ? PACKAGES.find((candidate) => candidate.key === item.upgrade) : null;
  // Proyecto real: el del giro que la persona eligió en «Tu caso en una frase» o, si no, el del paquete.
  const ownProject = item.related ? PROJECTS.find((project) => project.id === item.related) : null;
  const related = visit.project ?? ownProject;
  const relatedScreen = visit.project ? visit.chosenBusiness?.screen : item.relatedScreen;

  // Lo marcado queda en la dirección: sirve para compartir, para volver atrás y para recargar.
  useEffect(() => {
    if (!/^#hoja-/.test(window.location.hash)) return;
    const next = sheetHash(item, { withAi, picked });
    if (next !== window.location.hash) window.history.replaceState(window.history.state, '', `${here()}${next}`);
  }, [item, withAi, picked]);

  const toggleAi = () => { setTouched(true); setWithAi((value) => !value); };
  const toggle = (key) => { setTouched(true); setPicked((list) => (list.includes(key) ? list.filter((value) => value !== key) : [...list, key])); };

  // Imprimir o guardar en PDF: se imprime una copia del detalle, sola en el documento. Antes se ocultaba el
  // resto del sitio con visibility y el PDF salía con todas sus páginas en blanco detrás.
  const print = (event) => {
    document.querySelector('.package-sheet--print')?.remove();
    const copy = document.createElement('div');
    copy.className = 'package-sheet package-sheet--print';
    copy.setAttribute('aria-hidden', 'true');
    copy.append(event.currentTarget.closest('.package-sheet__frame').cloneNode(true));
    copy.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
    document.body.append(copy);
    document.documentElement.classList.add('print-package-sheet');
    const done = () => { copy.remove(); document.documentElement.classList.remove('print-package-sheet'); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    window.print();
  };
  const share = async () => {
    const text = t(
      `${item.name} de JC Analytics: ${money(total)} + IVA${marks ? ` (${marks})` : ''}, entrega en ${item.time}.`,
      `${item.name} by JC Analytics: ${money(total)} + tax${marks ? ` (${marks})` : ''}, delivered in ${item.time}.`,
    );
    const url = `${window.location.origin}${window.location.pathname}${sheetHash(item, { withAi, picked })}`;
    try {
      if (navigator.share && !desktop) { await navigator.share({ title: item.name, text, url }); return; }
      await navigator.clipboard.writeText(`${text} ${t('Detalle:', 'Details:')} ${url}`);
      setCopied(true);
    } catch { /* la persona canceló o el navegador no deja copiar: el enlace sigue visible en la barra */ }
  };
  // Ir al proyecto cierra el detalle y deja la dirección en #proyecto (sin volver atrás en el historial,
  // que competiría con la navegación al ancla).
  const goToProject = (event) => {
    event.preventDefault();
    window.history.replaceState(null, '', `${here()}#proyecto`);
    close();
    showProject(related.id, relatedScreen);
    afterLayout(() => scrollToNode(document.getElementById('proyecto')));
  };

  const included = (
    <section>
      <h3>{t('Incluido en el precio', 'Included in the price')}</h3>
      <p><Check size={14} aria-hidden="true" />{item.scope}</p>
      <p><Check size={14} aria-hidden="true" />{t('Configuración, pruebas, capacitación y guía de uso.', 'Configuration, testing, training and a user guide.')}</p>
      {item.aiIncluded && <p><Check size={14} aria-hidden="true" />{item.aiScope}</p>}
    </section>
  );
  const mind = (
    <section>
      <h3>{t('A tener en cuenta', 'Keep in mind')}</h3>
      <p><Info size={14} aria-hidden="true" />{item.exclusions}</p>
      <p><Info size={14} aria-hidden="true" />{t('IVA, licencias, consumos y preparación de información se cotizan aparte: te lo detallamos por escrito antes de empezar.', 'Tax, licenses, usage and information preparation are quoted separately: we detail them in writing before we start.')}</p>
      {item.supportMonthly && <p><Info size={14} aria-hidden="true" />{t(`Después de los 30 días, soporte mensual opcional: ${money(item.supportMonthly.price)} (${item.supportMonthly.hours} h por semana).`, `After the 30 days, optional monthly support: ${money(item.supportMonthly.price)} (${item.supportMonthly.hours} h per week).`)}</p>}
      {/* Paquete mayor de la misma familia, con datos del tarifario: evita pedir el chico y que el precio cambie al conversar. */}
      {upgrade && (
        <p className="package-sheet__upgrade"><ArrowRight size={14} aria-hidden="true" /><span>{item.upgradeWhen}{' '}
          <button type="button" onClick={() => onSwitch(upgrade.key)} data-track-label={`Hoja · Ver ${upgrade.key}`}>{t(`Mirá ${upgrade.name}`, `See ${upgrade.name}`)}</button>
          {': '}{upgrade.scope} {upgrade.priceLabel} {t('+ IVA', '+ tax')}, {upgrade.time}.</span></p>
      )}
    </section>
  );
  const ready = (
    <section>
      <h3>{t('Para empezar necesitamos', 'To start we need')}</h3>
      <p><ArrowRight size={14} aria-hidden="true" />{item.ready}</p>
    </section>
  );
  const options = (item.ai || item.extras.length > 0) && (
    <fieldset className="package-sheet__options">
      <legend>{t('Opcional, con precio publicado', 'Optional, at a published price')}</legend>
      {item.ai && (
        <label className={withAi ? 'is-on' : ''}>
          <input type="checkbox" checked={withAi} onChange={toggleAi} data-track-label="Hoja · Con IA" />
          <span><strong>{t('Con IA', 'With AI')}</strong>{item.ai.scope}<small>{t(`Total con IA: ${money(item.ai.total)} en vez de ${item.priceLabel} (reemplaza al precio base; no se suma).`, `Total with AI: ${money(item.ai.total)} instead of ${item.priceLabel} (it replaces the base price; it is not added).`)}</small></span>
          <em>+{money(item.ai.total - item.price)}</em>
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
  );
  const after = (
    <>
      {/* En pantalla el total vive en la barra de abajo; esta línea es la del PDF. */}
      <p className="package-sheet__total package-sheet__print-only">
        <span>{t('Total preliminar', 'Preliminary total')}{marks ? ` · ${marks}` : ''}</span>
        <strong>{money(total)}</strong>
        <em>{t('+ IVA', '+ tax')}</em>
        <small>{t('pago único', 'one-time')} · ≈ {colones(total)}</small>
      </p>
      {initial.shared && <p className="package-sheet__shared">{t('Este enlace ya traía opciones marcadas. Podés cambiarlas: el total se actualiza solo.', 'This link came with options already selected. You can change them: the total updates automatically.')}</p>}
      <ol className="package-sheet__next" aria-label={t('Qué pasa después de pedirlo', 'What happens after you request it')}>
        {NEXT_STEPS.map((step, index) => <li key={step}><span>{index + 1}</span>{step}</li>)}
      </ol>
      <a className="package-sheet__ask" href={wa(question)} target="_blank" rel="noreferrer" onClick={desktop ? undefined : close} data-need={item.need} data-track-label={`Hoja · Duda · ${item.key}`}>{desktop ? t('Tengo una duda antes', 'I have a question first') : t('Tengo una duda antes · WhatsApp', 'I have a question first · WhatsApp')}</a>
      <p className="package-sheet__note">{t('Pedirlo no te cobra ni te compromete. El alcance final se confirma por escrito antes de empezar.', 'Requesting it involves no charge and no commitment. The final scope is confirmed in writing before we start.')}</p>
      {/* Celular: el mensaje exacto que se abre en WhatsApp, a la vista antes de salir de la página. */}
      {!desktop && (
        <details className="package-sheet__preview">
          <summary data-track-label="Hoja · Ver el mensaje"><ChevronDown size={16} aria-hidden="true" />{t('Ver el mensaje que se abre en WhatsApp', 'See the message that opens in WhatsApp')}</summary>
          <p className="package-sheet__bubble">{message}</p>
          <p className="package-sheet__preview-note">{t('Lo podés cambiar antes de enviarlo.', 'You can edit it before sending.')}</p>
        </details>
      )}
    </>
  );

  return (
    <div className="package-sheet__frame" data-track-section="hoja-paquete">
      {/* El cierre queda pegado arriba mientras se desplaza: en celular el detalle ocupa toda la pantalla y,
          al bajar, no quedaba ninguna salida a la vista. */}
      <div className="package-sheet__top">
        <button type="button" className="package-sheet__close" onClick={close} aria-label={t('Cerrar el detalle', 'Close the details')}><X size={20} aria-hidden="true" /></button>
      </div>
      <article className="package-sheet__panel">
        <header className="package-sheet__head">
          <span className="package-sheet__eyebrow">{t('DETALLE DEL PAQUETE · PRELIMINAR', 'PACKAGE DETAILS · PRELIMINARY')}{category ? ` · ${category.label.toUpperCase()}` : ''}</span>
          <h2 id="package-sheet-title" tabIndex={-1}>{item.name}</h2>
          <p className="package-sheet__pitch">{item.pitch}</p>
          <ul className="package-sheet__facts">
            <li><Clock3 size={15} aria-hidden="true" />{t('Entrega:', 'Delivery:')} {item.time}</li>
            <li><ShieldCheck size={15} aria-hidden="true" />{t('30 días de soporte incluidos', '30 days of support included')}</li>
          </ul>
        </header>

        {/* Angosto: las casillas van justo después de lo incluido. Ancho: alcance a la izquierda y pedido a la derecha. */}
        {narrow ? (
          <div className="package-sheet__body package-sheet__body--stack">
            {included}
            {options && <div className="package-sheet__order">{options}</div>}
            {mind}
            {ready}
            <div className="package-sheet__order">{after}</div>
          </div>
        ) : (
          <div className="package-sheet__body">
            <div className="package-sheet__scope">{included}{mind}{ready}</div>
            <div className="package-sheet__order">{options}{after}</div>
          </div>
        )}

        <footer className="package-sheet__foot">
          <div className="package-sheet__tools">
            <button type="button" onClick={print} data-track-label={`Hoja · Imprimir · ${item.key}`}><Printer size={15} aria-hidden="true" />{t('Imprimir o guardar en PDF', 'Print or save as PDF')}</button>
            <button type="button" onClick={share} data-track-label={`Hoja · Compartir · ${item.key}`}><Link2 size={15} aria-hidden="true" />{copied ? t('Copiado: pegalo en un mensaje', 'Copied: paste it in a message') : t('Compartir con quien aprueba', 'Share with whoever approves')}</button>
            <button type="button" className="package-sheet__done" onClick={close} data-track-label="Hoja · Cerrar">{t('Cerrar el detalle', 'Close the details')}</button>
          </div>
          <div className="package-sheet__links">
            {category && <a href={`${category.href}?p=${item.key}#oferta`} data-track-label={`Hoja · Ver ${category.label}`}>{t(`Ver ejemplos, calculadora y preguntas de ${category.label}`, `See examples, calculator and questions for ${category.label}`)} <ArrowRight size={14} aria-hidden="true" /></a>}
            {related && (
              <a href="#proyecto" onClick={goToProject} data-track-label={`Hoja · Proyecto ${related.id}`}>
                {visit.project ? t(`Ver un proyecto real de tu giro: ${related.name}`, `See a real project in your line of business: ${related.name}`) : t(`Ver un proyecto real relacionado: ${related.name}`, `See a related real project: ${related.name}`)} <ArrowDown size={14} aria-hidden="true" />
                <small>{(!visit.project && item.relatedNote) || t('Es un sistema más amplio que este paquete.', 'It is a broader system than this package.')}</small>
              </a>
            )}
          </div>
          {/* Solo en el PDF: los cuatro compromisos publicados, para quien aprueba el gasto. */}
          <div className="package-sheet__promises package-sheet__print-only">
            <h3>{t('Compromisos de JC Analytics', 'JC Analytics commitments')}</h3>
            <ul>{WORK_PROMISES[locale].map(([title, detail]) => <li key={title}><strong>{title}.</strong> {detail}</li>)}</ul>
          </div>
          <p className="package-sheet__origin">JC Analytics · www.jcanalytic.com · {new Intl.DateTimeFormat(locale === 'es' ? 'es-CR' : 'en-US', { dateStyle: 'long' }).format(new Date())} · {t('Precios en USD; colones de referencia.', 'Prices in USD; colones for reference.')}</p>
        </footer>
      </article>

      {/* Siempre a la vista: el total cambia al marcar una casilla y el botón no hay que buscarlo. */}
      <div className="package-sheet__bar">
        <p className="package-sheet__total" role="status" aria-live="polite">
          <span>{t('Total preliminar', 'Preliminary total')}</span>
          <strong key={total} className={touched ? 'is-bumped' : undefined}>{money(total)}</strong>
          <em>{t('+ IVA', '+ tax')}</em>
          <small>{t('pago único', 'one-time')} · ≈ {colones(total)}</small>
        </p>
        <a className="package-sheet__buy" href={wa(message)} target="_blank" rel="noreferrer" onClick={desktop ? undefined : close}
          data-package={item.key} data-value={total} data-package-label={item.name} data-package-pick={sheetHash(item, { withAi, picked })} data-need={item.need} data-track-label={`Hoja · Pedir · ${item.key}`}>
          <ContactIcon size={18} />{desktop ? t('Pedir este paquete', 'Request this package') : t('Pedirlo por WhatsApp', 'Request it on WhatsApp')}
        </a>
      </div>
    </div>
  );
}
