// ============================================================================
//  ¿Cuánto cuesta? · paquetes con precio publicado y cómo se compran.
//
//  Auditoría de noviembre de 2026 (lo que cambió y por qué):
//    · «Así se compra»: tres pasos con hechos ya publicados. Antes el texto decía
//      «elegís uno… y arrancamos» y «lo que ves es lo que cuesta», y ninguna de
//      las dos era cierta (hay conversación y alcance por escrito antes de
//      empezar; IVA, dominio, licencias y consumos van aparte).
//    · Cada tarjeta dice a qué categoría pertenece, qué hay que tener en cuenta
//      (las exclusiones del tarifario) y qué pasa al tocar «Lo quiero».
//    · El enlace secundario abre la hoja del paquete (PackageSheet): alcance,
//      agregados con precio y total. Antes llevaba a la página de la categoría,
//      que en seis de diez casos explicaba otro paquete.
//    · Los diez paquetes están siempre en el HTML (antes cuatro solo existían con
//      JavaScript). En celular son una lista que se despliega: los diez nombres
//      y precios se ven de un vistazo en vez de una tarjeta por pantalla.
//  Segunda ronda (noviembre de 2026):
//    · La introducción dice cuántos paquetes hay y entre qué precios, y el botón
//      que despliega el resto dice cuántos faltan y desde cuánto (calculado).
//    · El detalle del paquete tiene su propia entrada en el historial: «atrás»
//      lo cierra en vez de sacar a la persona del sitio, y lo marcado viaja en
//      el enlace (#hoja-<clave>.ia.<agregado>).
//    · Llegar a #paquete-<clave> deja la tarjeta debajo de la barra fija, no
//      detrás (scroll.js), y la tarjeta del paquete más cercano a «Tu caso en
//      una frase» lleva la insignia «El de tu caso».
//  Los montos, plazos y alcances salen de portal/shared/service-pricing.js.
// ============================================================================
import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, ChevronDown, Check, Clock3, Info, ShieldCheck } from 'lucide-react';
import { t } from '../../i18n/locale';
import { PACKAGES, adPackage, money, packageMessage, parseSheetHash } from '../../data/packages';
import { Label, MaskLines, Reveal } from './primitives';
import { CATEGORY_LINKS, wa } from './links';
import { MESSAGES } from './messages';
import { useCase } from './case';
import { afterLayout, scrollToNode } from './scroll';
import ContactIcon from './ContactIcon';
import { useDesktop } from '../../hooks/useDesktop';
import PackageSheet from './PackageSheet';
import '../../styles/packages.css';

// Orden: el del anuncio primero; después los seis destacados (uno o dos por categoría, en el orden del menú)
// y al final el resto. En celular todos se listan, agrupados por categoría.
const order = (list) => (adPackage ? [adPackage, ...list.filter((item) => item !== adPackage)] : list);
const ORDERED = order([...PACKAGES.filter((item) => item.featured), ...PACKAGES.filter((item) => !item.featured)]);
const categoryName = (id) => CATEGORY_LINKS.find((link) => link.id === id)?.label ?? '';
const categoryHref = (item) => `${CATEGORY_LINKS.find((link) => link.id === item.category)?.href ?? ''}?p=${item.key}#oferta`;
// Lo que se ve sin desplegar en computadora y lo que queda detrás de «Ver los que faltan».
const HIDDEN = ORDERED.filter((item) => !(item.featured || item === adPackage));
const PRICES = PACKAGES.map((item) => item.price);
const here = () => `${window.location.pathname}${window.location.search}`;

const Packages = () => {
  // Celular: «Lo quiero» abre WhatsApp. Computadora: abre el formulario corto (ui/LeadDialog.jsx); los textos no prometen WhatsApp.
  const desktop = useDesktop();
  // En celular la lista se pliega (un paquete abierto a la vez). Sin JavaScript se ven todos completos.
  const [mobile, setMobile] = useState(false);
  const [open, setOpen] = useState((adPackage ?? ORDERED[0]).key);
  // Detalle abierto: { item, withAi, picked, shared }. La dirección (#hoja-…) es la fuente de verdad.
  const [sheet, setSheet] = useState(null);
  // «Tu caso en una frase»: su paquete más cercano se marca y los pedidos salen con la frase.
  const visit = useCase();
  // «Ver los que faltan» es una casilla nativa: el despliegue lo hace el CSS y funciona sin JavaScript.
  const allRef = useRef(null);
  const showAll = () => { if (allRef.current) allRef.current.checked = true; };
  // ¿La dirección anterior era un detalle? Al volver de un detalle a una dirección #paquete-… la página no se
  // mueve: la persona sigue donde estaba (si no, cerrar un detalle abierto desde otra sección la llevaba de
  // un salto a la tarjeta de un enlace anterior).
  const fromSheet = useRef(false);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)');
    const sync = () => setMobile(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);
  // La dirección manda: #hoja-<clave>[.ia.<agregado>…] abre ese detalle con lo marcado y #paquete-<clave>
  // muestra una tarjeta que estaba plegada. Se lee al cargar, al seguir un enlace y al ir atrás o adelante.
  useEffect(() => {
    const read = (initial) => {
      const linked = parseSheetHash(window.location.hash);
      const leavingSheet = fromSheet.current;
      fromSheet.current = Boolean(linked);
      if (linked) {
        if (initial) { document.getElementById('paquetes')?.scrollIntoView({ block: 'start' }); showAll(); }
        // Un enlace dentro de la página (por ejemplo desde «Tu caso en una frase») crea una entrada propia
        // del historial: se marca para que cerrar el detalle vuelva atrás en vez de dejarla huérfana.
        else if (!window.history.state?.jcaSheet) window.history.replaceState({ jcaSheet: true }, '', window.location.href);
        setSheet((now) => (now?.item === linked.item ? now : { ...linked, shared: initial && (linked.withAi || linked.picked.length > 0) }));
        return;
      }
      setSheet(null);
      const card = /^#paquete-([a-z_]+)$/.exec(window.location.hash);
      if (card && PACKAGES.some((item) => item.key === card[1])) {
        showAll();
        setOpen(card[1]);
        // Con el diseño ya final: la fila abierta antes se cierra y, en computadora, el desplazamiento suave
        // no descuenta la barra fija.
        if (!leavingSheet) afterLayout(() => scrollToNode(document.getElementById(`paquete-${card[1]}`), { instant: initial }));
      }
    };
    read(true);
    const onChange = () => read(false);
    window.addEventListener('hashchange', onChange);
    window.addEventListener('popstate', onChange);
    return () => { window.removeEventListener('hashchange', onChange); window.removeEventListener('popstate', onChange); };
  }, []);
  // Lista de celular: al abrir una fila se cierra la que estaba abierta, y todo lo de abajo sube. Sin
  // recolocar, el nombre y el precio del paquete recién tocado quedaban fuera de pantalla (Safari de iOS no
  // compensa ese salto). Se recoloca solo si la fila quedó tapada por la barra o demasiado abajo.
  const toggle = (key, expanded) => {
    setOpen(expanded ? '' : key);
    if (expanded) return;
    afterLayout(() => {
      const card = document.getElementById(`paquete-${key}`);
      const top = card?.getBoundingClientRect().top;
      if (top !== undefined && (top < 76 || top > window.innerHeight * 0.5)) scrollToNode(card, { instant: true });
    });
  };
  const openSheet = (event, item) => {
    // Con teclas modificadoras o sin JavaScript el enlace abre la página de la categoría con ese paquete.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    // Entrada propia en el historial: el botón o el gesto de «atrás» cierra el detalle en vez de salir del sitio.
    window.history.pushState({ jcaSheet: true }, '', `${here()}#hoja-${item.key}`);
    fromSheet.current = true;
    setSheet({ item, withAi: false, picked: [], shared: false });
  };
  const closeSheet = () => {
    setSheet(null);
    if (!/^#hoja-/.test(window.location.hash)) return; // ya lo cerró el historial
    if (window.history.state?.jcaSheet) window.history.back();
    else { fromSheet.current = false; window.history.replaceState(null, '', `${here()}#paquetes`); } // llegó por un enlace compartido: no hay «atrás» dentro del sitio
  };
  // Del detalle de un paquete al de su paquete mayor, sin sumar entradas al historial.
  const switchSheet = (key) => {
    const item = PACKAGES.find((candidate) => candidate.key === key);
    if (!item) return;
    window.history.replaceState(window.history.state, '', `${here()}#hoja-${item.key}`);
    setSheet({ item, withAi: false, picked: [], shared: false });
  };
  const moreLabel = HIDDEN.length
    ? t(`Ver los ${HIDDEN.length} que faltan, desde ${money(Math.min(...HIDDEN.map((item) => item.price)))}`, `See the other ${HIDDEN.length}, from ${money(Math.min(...HIDDEN.map((item) => item.price)))}`)
    : t(`Ver los ${PACKAGES.length} paquetes`, `See all ${PACKAGES.length} packages`);
  return (
    <section id="paquetes" className="packages-section" aria-labelledby="packages-title">
      <div className="packages-container">
        <div className="packages-heading">
          <div>
            <Label>{t('¿Cuánto cuesta? / Paquetes con precio publicado', 'What does it cost? / Packages with published pricing')}</Label>
            <h2 id="packages-title"><MaskLines lines={[t('Precio publicado.', 'Published price.'), <em key="scope">{t('Alcance por escrito.', 'Written scope.')}</em>]} /></h2>
          </div>
          <Reveal delay={0.15} className="packages-intro">
            <p>{t(`${PACKAGES.length} paquetes, de ${money(Math.min(...PRICES))} a ${money(Math.max(...PRICES))}. Cada uno tiene alcance, plazo y precio fijos, y dice qué queda fuera. Así se compra:`, `${PACKAGES.length} packages, from ${money(Math.min(...PRICES))} to ${money(Math.max(...PRICES))}. Each has a fixed scope, timeline and price, and states what is left out. This is how you buy one:`)}</p>
            <ol className="packages-steps">
              <li><span>1</span>{desktop
                ? t('Elegís el paquete y tocás «Lo quiero». Dejás tu WhatsApp o tu correo: el pedido ya va escrito.', 'Pick the package and click “I want it”. Leave your WhatsApp or email: the request is already written.')
                : t('Elegís el paquete y tocás «Lo quiero». Se abre WhatsApp con el mensaje ya escrito.', 'Pick the package and tap “I want it”. WhatsApp opens with the message already written.')}</li>
              <li><span>2</span>{t('Te respondemos en menos de 24 h y conversamos 30 minutos, sin costo.', 'We reply within 24 hours and talk for 30 minutes, free of charge.')}</li>
              <li><span>3</span>{t('Recibís por escrito qué incluye, qué no y el precio fijo. Recién ahí decidís si empezamos.', 'You get in writing what is included, what is not and the fixed price. Only then do you decide whether we start.')}</li>
            </ol>
          </Reveal>
        </div>

        {/* En celular los diez ya están listados: la casilla no hace nada y no debe quedar en el orden de foco. */}
        <input ref={allRef} type="checkbox" id="packages-all" className="sr-only packages-all" aria-label={moreLabel} hidden={mobile} />
        <ul className="packages-grid" aria-label={t('Paquetes con precio', 'Packages with pricing')}>
          {ORDERED.map((item) => {
            const fromAd = item === adPackage;
            const fromCase = item === visit.pack;
            const expanded = !mobile || open === item.key;
            return (
              <Reveal as="li" key={item.key} id={`paquete-${item.key}`} className={`package-card ${fromAd ? 'package-card--ad' : ''} ${fromCase ? 'package-card--case' : ''} ${item.featured || fromAd ? '' : 'package-card--more'} ${expanded ? 'is-open' : ''}`}>
                <div className="package-card__head">
                  <span className="package-card__category">{categoryName(item.category)}</span>
                  <div className="package-card__top">
                    <h3>{item.name}</h3>
                    {(fromCase || fromAd || item.badge) && <span className="package-card__badge">{fromCase ? t('El de tu caso', 'The one for your case') : fromAd ? t('El que viste en el anuncio', 'The one from the ad') : item.badge}</span>}
                  </div>
                  <p className="package-card__pitch">{item.pitch}</p>
                  <p className="package-card__price"><strong>{item.priceLabel}</strong><span>{t('pago único + IVA', 'one-time + tax')} · ≈ {item.colones}</span></p>
                  {/* Solo en celular: la cabecera despliega el detalle. En computadora la tarjeta siempre está abierta. */}
                  {mobile && <button type="button" className="package-card__toggle" aria-expanded={expanded} aria-controls={`detalle-${item.key}`} onClick={() => toggle(item.key, expanded)}
                    aria-label={t(`${expanded ? 'Ocultar' : 'Ver'} el detalle de ${item.name}`, `${expanded ? 'Hide' : 'Show'} details for ${item.name}`)} data-track-label={`Paquetes · Desplegar ${item.key}`}><ChevronDown size={20} aria-hidden="true" /></button>}
                </div>
                <div className="package-card__body" id={`detalle-${item.key}`} hidden={!expanded}>
                  <p className="package-card__fact"><Clock3 size={14} aria-hidden="true" /><span>{t('Entrega:', 'Delivery:')} {item.time}</span></p>
                  <p className="package-card__fact"><Check size={14} aria-hidden="true" /><span>{item.scope}</span></p>
                  <p className="package-card__fact package-card__fact--note"><Info size={14} aria-hidden="true" /><span>{t('A tener en cuenta:', 'Keep in mind:')} {item.exclusions}</span></p>
                  <p className="package-card__fact"><ShieldCheck size={14} aria-hidden="true" /><span>{t('30 días de soporte incluidos', '30 days of support included')}</span></p>
                  <a className="package-card__buy" href={wa(visit.sentence ? packageMessage(item, { sentence: visit.sentence }) : item.message)} target="_blank" rel="noreferrer" data-package={item.key} data-value={item.price} data-package-label={item.name} data-need={item.need} data-track-label={`Paquetes · Lo quiero · ${item.key}`}>
                    <ContactIcon size={18} />{desktop ? t('Lo quiero', 'I want it') : t('Lo quiero · WhatsApp', 'I want it · WhatsApp')}<span className="sr-only"> · {item.name}</span>
                  </a>
                  <p className="package-card__after">{t('Sin cobro ni compromiso: primero recibís el alcance por escrito.', 'No charge, no commitment: you get the scope in writing first.')}</p>
                  <a className="package-card__sheet" href={categoryHref(item)} onClick={(event) => openSheet(event, item)} data-track-label={`Paquetes · Hoja · ${item.key}`}>
                    {t('Ver todo lo que incluye y los agregados', 'See everything included and the add-ons')}<span className="sr-only"> · {item.name}</span><ArrowRight size={14} aria-hidden="true" />
                  </a>
                </div>
              </Reveal>
            );
          })}
        </ul>

        <div className="packages-foot">
          {!mobile && HIDDEN.length > 0 && <label htmlFor="packages-all" className="packages-more">{moreLabel}<ArrowDown size={16} aria-hidden="true" /></label>}
          <p>{t('¿No sabés cuál te toca o tu caso no está?', 'Not sure which one fits, or your case is not here?')} <a href={wa(MESSAGES.custom)} target="_blank" rel="noreferrer" data-need="Otro" data-track-label="Paquetes · Otro caso">{desktop ? t('Contanos y te armamos uno por escrito', 'Tell us and we’ll put one together in writing') : t('Contanos por WhatsApp y te armamos uno', 'Tell us on WhatsApp and we’ll put one together')}</a></p>
          <p className="packages-foot__terms">{t('Precios en USD por el trabajo descrito en cada tarjeta. Van aparte el IVA y lo que se paga a terceros: el dominio (la dirección de tu web), el alojamiento (donde queda guardada), licencias y consumo de IA. Te detallamos cada monto por escrito antes de empezar. Colones de referencia.', 'Prices in USD for the work described on each card. Tax and third-party costs are separate: the domain (your site’s address), hosting (where it is stored), licenses and AI usage. We detail each amount in writing before we start. Colones for reference.')}</p>
        </div>
      </div>
      <PackageSheet sheet={sheet} onClose={closeSheet} onSwitch={switchSheet} />
    </section>
  );
};
export default Packages;
