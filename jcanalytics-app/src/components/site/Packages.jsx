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
//  Los montos, plazos y alcances salen de portal/shared/service-pricing.js.
// ============================================================================
import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ChevronDown, Check, Clock3, FileText, Info, MessageCircle, ShieldCheck } from 'lucide-react';
import { t } from '../../i18n/locale';
import { PACKAGES, adPackage } from '../../data/packages';
import { Label, MaskLines, Reveal } from './primitives';
import { CATEGORY_LINKS, wa } from './links';
import { MESSAGES } from './messages';
import { useDesktop } from '../../hooks/useDesktop';
import PackageSheet from './PackageSheet';
import '../../styles/packages.css';

// Orden: el del anuncio primero; después los seis destacados (uno o dos por categoría, en el orden del menú)
// y al final el resto. En celular todos se listan, agrupados por categoría.
const order = (list) => (adPackage ? [adPackage, ...list.filter((item) => item !== adPackage)] : list);
const ORDERED = order([...PACKAGES.filter((item) => item.featured), ...PACKAGES.filter((item) => !item.featured)]);
const categoryName = (id) => CATEGORY_LINKS.find((link) => link.id === id)?.label ?? '';
const categoryHref = (item) => `${CATEGORY_LINKS.find((link) => link.id === item.category)?.href ?? ''}?p=${item.key}#oferta`;
const fromHash = () => {
  if (typeof window === 'undefined') return null;
  const match = /^#hoja-([a-z_]+)$/.exec(window.location.hash);
  return match ? PACKAGES.find((item) => item.key === match[1]) ?? null : null;
};

const Packages = () => {
  // Celular: «Lo quiero» abre WhatsApp. Computadora: abre el formulario corto (ui/LeadDialog.jsx); los textos no prometen WhatsApp.
  const desktop = useDesktop();
  // En celular la lista se pliega (un paquete abierto a la vez). Sin JavaScript se ven todos completos.
  const [mobile, setMobile] = useState(false);
  const [open, setOpen] = useState((adPackage ?? ORDERED[0]).key);
  const [sheet, setSheet] = useState(null);
  // «Ver los 10 paquetes» es una casilla nativa: el despliegue lo hace el CSS y funciona sin JavaScript.
  const allRef = useRef(null);
  const showAll = () => { if (allRef.current) allRef.current.checked = true; };
  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)');
    const sync = () => setMobile(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);
  // Un enlace compartido (#hoja-<paquete>) abre esa hoja; #paquete-<clave> muestra una tarjeta que estaba plegada.
  useEffect(() => {
    const read = () => {
      const shared = fromHash();
      if (shared) { document.getElementById('paquetes')?.scrollIntoView({ block: 'start' }); showAll(); setSheet(shared); return; }
      const card = /^#paquete-([a-z_]+)$/.exec(window.location.hash);
      if (card && PACKAGES.some((item) => item.key === card[1])) { showAll(); setOpen(card[1]); }
    };
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);
  const openSheet = (event, item) => {
    // Con teclas modificadoras o sin JavaScript el enlace abre la página de la categoría con ese paquete.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    setSheet(item);
  };
  return (
    <section id="paquetes" className="packages-section" aria-labelledby="packages-title">
      <div className="packages-container">
        <div className="packages-heading">
          <div>
            <Label>{t('¿Cuánto cuesta? / Paquetes con precio publicado', 'What does it cost? / Packages with published pricing')}</Label>
            <h2 id="packages-title"><MaskLines lines={[t('Precio publicado.', 'Published price.'), <em key="scope">{t('Alcance por escrito.', 'Written scope.')}</em>]} /></h2>
          </div>
          <Reveal delay={0.15} className="packages-intro">
            <p>{t('Cada paquete tiene alcance, plazo y precio fijos, y dice qué queda fuera. Así se compra:', 'Every package has a fixed scope, timeline and price, and states what is left out. This is how you buy one:')}</p>
            <ol className="packages-steps">
              <li><span>1</span>{desktop
                ? t('Elegís el paquete y tocás «Lo quiero». Dejás tu WhatsApp o tu correo, con el mensaje ya escrito.', 'Pick the package and click “I want it”. Leave your WhatsApp or email, with the message already written.')
                : t('Elegís el paquete y tocás «Lo quiero». Se abre WhatsApp con el mensaje ya escrito.', 'Pick the package and tap “I want it”. WhatsApp opens with the message already written.')}</li>
              <li><span>2</span>{t('Te respondemos en menos de 24 h y conversamos 30 minutos, sin costo.', 'We reply within 24 hours and talk for 30 minutes, free of charge.')}</li>
              <li><span>3</span>{t('Recibís por escrito qué incluye, qué no y el precio fijo. Recién ahí decidís si empezamos.', 'You get in writing what is included, what is not and the fixed price. Only then do you decide whether we start.')}</li>
            </ol>
          </Reveal>
        </div>

        <input ref={allRef} type="checkbox" id="packages-all" className="sr-only packages-all" aria-label={t(`Ver los ${PACKAGES.length} paquetes`, `See all ${PACKAGES.length} packages`)} />
        <ul className="packages-grid" aria-label={t('Paquetes con precio', 'Packages with pricing')}>
          {ORDERED.map((item) => {
            const fromAd = item === adPackage;
            const expanded = !mobile || open === item.key;
            return (
              <Reveal as="li" key={item.key} id={`paquete-${item.key}`} className={`package-card ${fromAd ? 'package-card--ad' : ''} ${item.featured || fromAd ? '' : 'package-card--more'} ${expanded ? 'is-open' : ''}`}>
                <div className="package-card__head">
                  <span className="package-card__category">{categoryName(item.category)}</span>
                  <div className="package-card__top">
                    <h3>{item.name}</h3>
                    {(fromAd || item.badge) && <span className="package-card__badge">{fromAd ? t('El que viste en el anuncio', 'The one from the ad') : item.badge}</span>}
                  </div>
                  <p className="package-card__pitch">{item.pitch}</p>
                  <p className="package-card__price"><strong>{item.priceLabel}</strong><span>{t('pago único + IVA', 'one-time + tax')} · ≈ {item.colones}</span></p>
                  {/* Solo en celular: la cabecera despliega el detalle. En computadora la tarjeta siempre está abierta. */}
                  {mobile && <button type="button" className="package-card__toggle" aria-expanded={expanded} aria-controls={`detalle-${item.key}`} onClick={() => setOpen(expanded ? '' : item.key)}
                    aria-label={t(`${expanded ? 'Ocultar' : 'Ver'} el detalle de ${item.name}`, `${expanded ? 'Hide' : 'Show'} details for ${item.name}`)} data-track-label={`Paquetes · Desplegar ${item.name}`}><ChevronDown size={20} aria-hidden="true" /></button>}
                </div>
                <div className="package-card__body" id={`detalle-${item.key}`} hidden={!expanded}>
                  <p className="package-card__fact"><Clock3 size={14} aria-hidden="true" /><span>{t('Entrega:', 'Delivery:')} {item.time}</span></p>
                  <p className="package-card__fact"><Check size={14} aria-hidden="true" /><span>{item.scope}</span></p>
                  <p className="package-card__fact package-card__fact--note"><Info size={14} aria-hidden="true" /><span>{t('A tener en cuenta:', 'Keep in mind:')} {item.exclusions}</span></p>
                  <p className="package-card__fact"><ShieldCheck size={14} aria-hidden="true" /><span>{t('30 días de soporte incluidos', '30 days of support included')}</span></p>
                  <a className="package-card__buy" href={wa(item.message)} target="_blank" rel="noreferrer" data-package={item.key} data-value={item.price} data-package-label={item.name} data-need={item.need} data-track-label={`Paquetes · Lo quiero · ${item.name}`}>
                    <MessageCircle size={18} aria-hidden="true" />{desktop ? t('Lo quiero', 'I want it') : t('Lo quiero · WhatsApp', 'I want it · WhatsApp')}
                  </a>
                  <p className="package-card__after">{t('No te cobra ni te compromete: primero va el alcance por escrito.', 'No charge and no commitment: the written scope comes first.')}</p>
                  <a className="package-card__sheet" href={categoryHref(item)} onClick={(event) => openSheet(event, item)} data-track-label={`Paquetes · Hoja · ${item.name}`}>
                    <FileText size={15} aria-hidden="true" />{t('Ver la hoja del paquete: qué incluye, agregados y total', 'See the package sheet: what is included, add-ons and total')}<span className="sr-only"> · {item.name}</span>
                  </a>
                </div>
              </Reveal>
            );
          })}
        </ul>

        <div className="packages-foot">
          {!mobile && <label htmlFor="packages-all" className="packages-more">{t(`Ver los ${PACKAGES.length} paquetes`, `See all ${PACKAGES.length} packages`)}<ArrowDown size={16} aria-hidden="true" /></label>}
          <p>{t('¿No sabés cuál te toca o tu caso no está?', 'Not sure which one fits, or your case is not here?')} <a href={wa(MESSAGES.custom)} target="_blank" rel="noreferrer" data-need="Otro" data-track-label="Paquetes · Otro caso">{desktop ? t('Contanos y te armamos uno por escrito', 'Tell us and we’ll put one together in writing') : t('Contanos por WhatsApp y te armamos uno', 'Tell us on WhatsApp and we’ll put one together')}</a></p>
          <p className="packages-foot__terms">{t('Precios en USD por el trabajo descrito en cada tarjeta. Van aparte el IVA y lo que se paga a terceros (dominio, alojamiento, licencias, consumo de IA): te lo detallamos por escrito antes de empezar. Colones de referencia.', 'Prices in USD for the work described on each card. Tax and third-party costs (domain, hosting, licenses, AI usage) are separate: we detail them in writing before we start. Colones for reference.')}</p>
        </div>
      </div>
      <PackageSheet item={sheet} onClose={() => { setSheet(null); if (/^#hoja-/.test(window.location.hash)) window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#paquetes`); }} />
    </section>
  );
};
export default Packages;
