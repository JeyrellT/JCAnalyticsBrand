// Paquetes y precios: elegí, escribí por WhatsApp y arrancamos. Pensado para la
// visita que llega de un anuncio: precio a la vista y un solo botón por tarjeta.
import { useState } from 'react';
import { ArrowDown, ArrowUpRight, Check, Clock3, MessageCircle } from 'lucide-react';
import { t } from '../../i18n/locale';
import { FEATURED_COUNT, PACKAGES, adPackage } from '../../data/packages';
import { PROJECTS } from '../../data/projects';
import { Label, MaskLines, Reveal } from './primitives';
import { wa } from './links';
import '../../styles/packages.css';

const ORDERED = adPackage ? [adPackage, ...PACKAGES.filter((item) => item !== adPackage)] : PACKAGES;
const STEPS = [
  t('Elegís el paquete', 'Pick a package'),
  t('Nos escribís por WhatsApp (el mensaje ya va listo)', 'Message us on WhatsApp (the text is ready)'),
  t('Confirmamos alcance y fecha de inicio', 'We confirm scope and start date'),
];
const showProject = (id) => window.dispatchEvent(new CustomEvent('jca:show-project', { detail: { id } }));

const Packages = () => {
  const [all, setAll] = useState(false);
  const visible = all ? ORDERED : ORDERED.slice(0, FEATURED_COUNT);
  return (
    <section id="paquetes" className="packages-section" aria-labelledby="packages-title">
      <div className="packages-container">
        <div className="packages-heading">
          <div>
            <Label>{t('Paquetes y precios / Pago único', 'Packages and pricing / One-time payment')}</Label>
            <h2 id="packages-title"><MaskLines lines={[t('Elegí. Escribinos.', 'Choose. Message us.'), <em key="start">{t('Arrancamos.', 'We start.')}</em>]} /></h2>
          </div>
          <ol className="packages-steps">{STEPS.map((step, index) => <li key={step}><span>{index + 1}</span>{step}</li>)}</ol>
        </div>

        <ul className="packages-grid" aria-label={t('Paquetes con precio', 'Packages with pricing')}>
          {visible.map((item) => {
            const fromAd = item === adPackage;
            const example = item.example && PROJECTS.find((project) => project.id === item.example);
            return (
              <Reveal as="li" key={item.key} className={`package-card ${fromAd ? 'package-card--ad' : ''}`}>
                <div className="package-card__top">
                  <h3>{item.name}</h3>
                  {(fromAd || item.badge) && <span className="package-card__badge">{fromAd ? t('El que viste en el anuncio', 'The one from the ad') : item.badge}</span>}
                </div>
                <p className="package-card__pitch">{item.pitch}</p>
                <p className="package-card__price"><strong>{item.priceLabel}</strong><span>{t('pago único + IVA', 'one-time + tax')} · ≈ {item.colones}</span></p>
                <p className="package-card__time"><Clock3 size={14} aria-hidden="true" />{t('Entrega:', 'Delivery:')} {item.time}</p>
                <p className="package-card__scope"><Check size={14} aria-hidden="true" />{item.scope}</p>
                {(item.withAi || item.support) && <p className="package-card__extras">{[item.withAi, item.support].filter(Boolean).join(' · ')}</p>}
                <a className="package-card__buy" href={wa(item.message)} target="_blank" rel="noreferrer" data-package={item.key} data-value={item.price}>
                  <MessageCircle size={18} aria-hidden="true" />{t('Lo quiero · WhatsApp', 'I want it · WhatsApp')}
                </a>
                {example && <a className="package-card__example" href="#trabajo" onClick={() => showProject(example.id)}>{t('Ver ejemplo real:', 'See a real example:')} {example.name}<ArrowUpRight size={14} aria-hidden="true" /></a>}
              </Reveal>
            );
          })}
        </ul>

        <div className="packages-foot">
          {!all && <button type="button" className="packages-more" onClick={() => setAll(true)}>{t(`Ver los ${PACKAGES.length} paquetes`, `See all ${PACKAGES.length} packages`)}<ArrowDown size={16} aria-hidden="true" /></button>}
          <p>{t('¿No ves tu caso?', 'Don’t see your case?')} <a href={wa(t('Hola JC Analytics, mi caso no está en los paquetes. Les cuento:', 'Hi JC Analytics, my case is not in the packages. Here it is:'))} target="_blank" rel="noreferrer">{t('Contanos por WhatsApp y te armamos uno', 'Tell us on WhatsApp and we’ll put one together')}</a>{t(' · Precios en USD, IVA aparte, colones de referencia.', ' · Prices in USD, tax excluded, colones for reference.')}</p>
        </div>
      </div>
    </section>
  );
};
export default Packages;
