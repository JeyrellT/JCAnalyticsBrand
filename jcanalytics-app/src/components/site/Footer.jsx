import { ArrowUpRight } from 'lucide-react';
import { WEB_PROPERTIES } from '../../data/webProperties';
import { wa, EMAIL, PHONE, NAV_LINKS } from './links';

const Footer = () => (
  <footer className="studio-footer">
    <div className="closing-container">
      <div className="footer-topline"><span>Sistemas bien diseñados. Negocios con más posibilidades.</span><span>Heredia, Costa Rica <span aria-hidden="true">↗</span></span></div>
      <div className="footer-links-grid">
        <nav aria-label="Menú del pie de página">
          <p className="footer-label">Explorá</p>
          <ul>{NAV_LINKS.map((link) => <li key={link.href}><a href={link.href}>{link.label}</a></li>)}</ul>
        </nav>
        <div>
          <p className="footer-label">Productos</p>
          <ul>{WEB_PROPERTIES.map((property) => <li key={property.id}><a href={property.url} target="_blank" rel="noopener noreferrer">{property.name} <span aria-hidden="true">↗</span></a></li>)}</ul>
        </div>
        <div className="footer-contact">
          <p className="footer-label">Contacto</p>
          <ul>
            <li><a href={wa()} target="_blank" rel="noreferrer">WhatsApp <span aria-hidden="true">↗</span></a></li>
            <li><a href={`mailto:${EMAIL}`}>{EMAIL}</a></li>
            <li><a href={`tel:+${PHONE}`}>+506 7033 0596</a></li>
          </ul>
        </div>
        <div>
          <p className="footer-label">Estudio</p><p className="footer-location">Heredia, Costa Rica</p>
          <a href="#top" className="footer-back-top">Volver arriba <ArrowUpRight size={17} aria-hidden="true" /></a>
        </div>
      </div>
      <a href="#top" aria-label="JC Analytics, volver arriba" className="footer-brand font-display"><span>JC <span className="footer-brand__light">Analytics</span></span></a>
      <div className="footer-bottomline"><span>© {new Date().getFullYear()} JC Analytics</span><span>Ideas que toman forma.</span></div>
    </div>
  </footer>
);
export default Footer;
