import { t, locale } from '../../i18n/locale';
import { ArrowUpRight } from 'lucide-react';
import { homePath, journalPath } from '../../seo/routes';
import { wa, EMAIL, PHONE, PHONE_DISPLAY, CATEGORY_LINKS, PORTAL_URL } from './links';
import { MESSAGES } from './messages';

// Enlaces de la portada que no son categorías. Las cinco categorías van en su propia columna, con el mismo
// nombre que en el menú (antes el pie las listaba dos veces y con nombres distintos).
// Auditoría de noviembre de 2026: la flecha ↗ queda solo en lo que abre otra pestaña; el WhatsApp ya no abre
// un chat vacío; el portal distingue a quien es cliente de quien es del equipo, y la primera línea repite
// los cuatro compromisos, que es lo último que conviene recordar antes de irse.
const HOME_LINKS = [
  ['#trabajo', t('Proyectos reales', 'Real projects')],
  ['#proceso', t('Compromisos', 'Commitments')],
  ['#paquetes', t('Paquetes y precios', 'Packages and pricing')],
  ['#preguntas', t('Preguntas frecuentes', 'Frequently asked questions')],
  ['#equipo', t('El equipo', 'The team')],
];
const PROMISES = t(
  ['30 minutos sin costo', 'Alcance y precio fijo por escrito', 'Avances cada 72 horas', '30 días de soporte'],
  ['Free 30 minutes', 'Scope and fixed price in writing', 'Progress every 72 hours', '30 days of support'],
);
const topHref = `${homePath(locale)}#top`;
const External = () => <span aria-hidden="true">↗</span>;
const Footer = () => (
  <footer className="studio-footer" data-track-section="pie">
    <div className="closing-container">
      <div className="footer-topline">
        <span>{t('Sistemas bien diseñados. Negocios con más posibilidades.', 'Thoughtfully designed systems. More possibilities for your business.')}</span>
        <ul className="footer-promises" aria-label={t('Compromisos de JC Analytics', 'JC Analytics commitments')}>{PROMISES.map((promise) => <li key={promise}>{promise}</li>)}</ul>
      </div>
      <div className="footer-links-grid">
        <nav aria-label={t('Menú del pie de página', 'Footer navigation')}>
          <p className="footer-label">{t('Explorá', 'Explore')}</p>
          <ul>{HOME_LINKS.map(([hash, label]) => <li key={hash}><a href={`${homePath(locale)}${hash}`}>{label}</a></li>)}<li><a href={journalPath(locale)}>{t('Ideas y artículos', 'Insights and articles')}</a></li></ul>
        </nav>
        <nav aria-label={t('Servicios de JC Analytics', 'JC Analytics services')}>
          <p className="footer-label">{t('Servicios', 'Services')}</p>
          <ul>{CATEGORY_LINKS.map((link) => <li key={link.id}><a href={link.href}>{link.label}</a></li>)}</ul>
        </nav>
        <div className="footer-contact">
          <p className="footer-label">{t('Contacto', 'Contact')}</p>
          <ul>
            {/* Dice "WhatsApp" a secas: abre WhatsApp también en computadora (sin formulario corto). */}
            <li><a href={wa(MESSAGES.footer)} target="_blank" rel="noreferrer" data-wa-direct="" data-track-label="Pie · WhatsApp">WhatsApp <External /></a></li>
            <li><a href={`mailto:${EMAIL}`} data-track-label="Pie · Correo">{EMAIL}</a></li>
            <li><a href={`tel:+${PHONE}`} data-track-label="Pie · Teléfono">{PHONE_DISPLAY}</a></li>
          </ul>
        </div>
        <div>
          <p className="footer-label">{t('Estudio', 'Studio')}</p><p className="footer-location">Heredia, Costa Rica</p>
          <ul className="footer-portals">
            <li><a href={`${PORTAL_URL}/cliente`} target="_blank" rel="noreferrer" data-track-label="Pie · Portal de clientes">{t('Portal de clientes', 'Client portal')} <External /></a></li>
            <li><a href={PORTAL_URL} target="_blank" rel="noreferrer" data-track-label="Pie · Ingreso del equipo">{t('Ingreso del equipo', 'Team sign-in')} <External /></a></li>
          </ul>
          <a href={topHref} className="footer-back-top">{t('Volver arriba', 'Back to top')} <ArrowUpRight size={17} aria-hidden="true" /></a>
        </div>
      </div>
      <a href={topHref} aria-label={t('JC Analytics, volver arriba', 'JC Analytics, back to top')} className="footer-brand font-display"><span>JC <span className="footer-brand__light">Analytics</span></span></a>
      <div className="footer-bottomline"><span>© {new Date().getFullYear()} JC Analytics</span><span>{t('Ideas que toman forma.', 'Ideas taking shape.')}</span></div>
    </div>
  </footer>
);
export default Footer;
