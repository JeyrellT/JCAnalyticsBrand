// Paquetes y precios: elegí, escribí por WhatsApp y arrancamos. Pensado para la
// visita que llega de un anuncio: precio a la vista y un solo botón por tarjeta.
import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUpRight, Check, Clock3, MessageCircle } from 'lucide-react';
import { locale, t } from '../../i18n/locale';
import { FEATURED_COUNT, PACKAGES, adPackage } from '../../data/packages';
import { servicePages } from '../../content/catalog';
import { servicePath } from '../../seo/routes';
import { Label, MaskLines, Reveal } from './primitives';
import { wa } from './links';
import { useDesktop } from '../../hooks/useDesktop';
import MobileRail from './MobileRail';
import '../../styles/packages.css';

const ORDERED = adPackage ? [adPackage, ...PACKAGES.filter((item) => item !== adPackage)] : PACKAGES;
// Cada paquete enlaza a la página de su categoría: ahí están qué incluye, las señales y el ejemplo real.
const categoryHref = (id) => servicePath(servicePages.find((service) => service.id === id), locale);

const Packages = () => {
  // Celular: «Lo quiero» abre WhatsApp. Computadora: abre el formulario corto (ui/LeadDialog.jsx); los textos no prometen WhatsApp.
  const desktop = useDesktop();
  const [all, setAll] = useState(false);
  // En celular el listado es un carrusel: se muestran todos y se deslizan, sin botón de "ver más".
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)');
    const sync = () => setMobile(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);
  const visible = all || mobile ? ORDERED : ORDERED.slice(0, FEATURED_COUNT);
  return (
    <section id="paquetes" className="packages-section" aria-labelledby="packages-title">
      <div className="packages-container">
        <div className="packages-heading">
          <div>
            <Label>{t('Paquetes con precio publicado / Pago único', 'Packages with published pricing / One-time payment')}</Label>
            <h2 id="packages-title"><MaskLines lines={[t('Precio publicado.', 'Published price.'), <em key="scope">{t('Alcance por escrito.', 'Written scope.')}</em>]} /></h2>
          </div>
          <Reveal delay={0.15} className="packages-intro"><p>{desktop
            ? t('Lo que ves es lo que cuesta: cada paquete tiene alcance, plazo y precio fijos. Elegís uno, nos dejás tu contacto con el mensaje listo y arrancamos; si tu caso es distinto, contanos y te armamos uno por escrito.', 'What you see is what it costs: every package has a fixed scope, timeline and price. Pick one, leave your contact with the text ready and we start; if your case is different, tell us and we will put one together in writing.')
            : t('Lo que ves es lo que cuesta: cada paquete tiene alcance, plazo y precio fijos. Elegís uno y escribís por WhatsApp con el mensaje listo; si tu caso es distinto, contanos y te armamos uno por escrito.', 'What you see is what it costs: every package has a fixed scope, timeline and price. Pick one and message us on WhatsApp with the text ready; if your case is different, tell us and we will put one together in writing.')}</p></Reveal>
        </div>

        <MobileRail className="packages-grid" label={t('Paquetes con precio', 'Packages with pricing')}>
          {visible.map((item) => {
            const fromAd = item === adPackage;
            return (
              <Reveal key={item.key} className={`package-card ${fromAd ? 'package-card--ad' : ''}`}>
                <div className="package-card__top">
                  <h3>{item.name}</h3>
                  {(fromAd || item.badge) && <span className="package-card__badge">{fromAd ? t('El que viste en el anuncio', 'The one from the ad') : item.badge}</span>}
                </div>
                <p className="package-card__pitch">{item.pitch}</p>
                <p className="package-card__price"><strong>{item.priceLabel}</strong><span>{t('pago único + IVA', 'one-time + tax')} · ≈ {item.colones}</span></p>
                <p className="package-card__time"><Clock3 size={14} aria-hidden="true" />{t('Entrega:', 'Delivery:')} {item.time}</p>
                <p className="package-card__scope"><Check size={14} aria-hidden="true" />{item.scope}</p>
                {(item.withAi || item.support) && <p className="package-card__extras">{[item.withAi, item.support].filter(Boolean).join(' · ')}</p>}
                <a className="package-card__buy" href={wa(item.message)} target="_blank" rel="noreferrer" data-package={item.key} data-value={item.price} data-package-label={item.name} data-need={item.need}>
                  <MessageCircle size={18} aria-hidden="true" />{desktop ? t('Lo quiero', 'I want it') : t('Lo quiero · WhatsApp', 'I want it · WhatsApp')}
                </a>
                <a className="package-card__example" href={categoryHref(item.category)}>{t('¿Es para vos? Ver qué incluye y un ejemplo real', 'Is it for you? See what is included and a real example')}<ArrowUpRight size={14} aria-hidden="true" /></a>
              </Reveal>
            );
          })}
        </MobileRail>

        <div className="packages-foot">
          {!all && !mobile && <button type="button" className="packages-more" onClick={() => setAll(true)}>{t(`Ver los ${PACKAGES.length} paquetes`, `See all ${PACKAGES.length} packages`)}<ArrowDown size={16} aria-hidden="true" /></button>}
          <p>{t('¿No ves tu caso?', 'Don’t see your case?')} <a href={wa(t('Hola JC Analytics, mi caso no está en los paquetes. Les cuento:', 'Hi JC Analytics, my case is not in the packages. Here it is:'))} target="_blank" rel="noreferrer" data-need="Otro">{desktop ? t('Contanos y te armamos uno', 'Tell us and we’ll put one together') : t('Contanos por WhatsApp y te armamos uno', 'Tell us on WhatsApp and we’ll put one together')}</a>{t(' · Precios en USD, IVA aparte, colones de referencia.', ' · Prices in USD, tax excluded, colones for reference.')}</p>
        </div>
      </div>
    </section>
  );
};
export default Packages;
