import { t, locale } from '../../i18n/locale';
import { ArrowUpRight } from 'lucide-react';
import { servicePages } from '../../content/services';
import { homePath, journalPath, servicePath } from '../../seo/routes';
import { wa, EMAIL, PHONE, NAV_LINKS } from './links';

const SERVICE_LABELS = {
  'web-development': t('Desarrollo web', 'Web development'),
  'business-intelligence': t('Dashboards y datos', 'Dashboards and data'),
  'process-automation': t('Automatización', 'Automation'),
  'ai-integration': t('Integración de IA', 'AI integration'),
};
const topHref = `${homePath(locale)}#top`;
const Footer = () => (
  <footer className="studio-footer">
    <div className="closing-container">
      <div className="footer-topline"><span>{t('Sistemas bien diseñados. Negocios con más posibilidades.', 'Thoughtfully designed systems. More possibilities for your business.')}</span><span>Heredia, Costa Rica <span aria-hidden="true">↗</span></span></div>
      <div className="footer-links-grid">
        <nav aria-label={t('Menú del pie de página', 'Footer navigation')}>
          <p className="footer-label">{t('Explorá', 'Explore')}</p>
          <ul>{NAV_LINKS.map((link) => <li key={link.href}><a href={link.href.startsWith('#') ? `${homePath(locale)}${link.href}` : link.href}>{link.label}</a></li>)}<li><a href={journalPath(locale)}>{t('Ideas y artículos', 'Insights and articles')}</a></li></ul>
        </nav>
        <nav aria-label={t('Servicios de JC Analytics', 'JC Analytics services')}>
          <p className="footer-label">{t('Servicios', 'Services')}</p>
          <ul>{servicePages.map((service) => <li key={service.id}><a href={servicePath(service, locale)}>{SERVICE_LABELS[service.id]} <span aria-hidden="true">↗</span></a></li>)}</ul>
        </nav>
        <div className="footer-contact">
          <p className="footer-label">{t('Contacto', 'Contact')}</p>
          <ul>
            <li><a href={wa()} target="_blank" rel="noreferrer">WhatsApp <span aria-hidden="true">↗</span></a></li>
            <li><a href={`mailto:${EMAIL}`}>{EMAIL}</a></li>
            <li><a href={`tel:+${PHONE}`}>+506 7033 0596</a></li>
          </ul>
        </div>
        <div>
          <p className="footer-label">{t('Estudio', 'Studio')}</p><p className="footer-location">Heredia, Costa Rica</p>
          <a href={topHref} className="footer-back-top">{t('Volver arriba', 'Back to top')} <ArrowUpRight size={17} aria-hidden="true" /></a>
        </div>
      </div>
      <a href={topHref} aria-label={t('JC Analytics, volver arriba', 'JC Analytics, back to top')} className="footer-brand font-display"><span>JC <span className="footer-brand__light">Analytics</span></span></a>
      <div className="footer-bottomline"><span>© {new Date().getFullYear()} JC Analytics</span><span>{t('Ideas que toman forma.', 'Ideas taking shape.')}</span></div>
    </div>
  </footer>
);
export default Footer;
