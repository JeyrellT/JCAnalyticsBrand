import { homePath } from '../../seo/routes';
import { locale, t } from '../../i18n/locale';
import { ContactTarget } from './contact-target';
import { hasServiceOffer } from './service-outline';
import { wa } from './links';
import Systems from './Systems';
import Finance from './Finance';
import Intelligence from './Intelligence';
import Social from './Social';
import '../../styles/studio.css';
import '../../styles/art-direction.css';
import '../../styles/conversion.css';
import '../../styles/mobile.css';
import '../../styles/service-demo.css';

// Demos interactivas de la portada, ahora dentro de la página de su servicio. El envoltorio
// `studio-v4` les da la misma dirección de arte que tenían en la portada.
const DEMOS = { 'web-development': Systems, 'business-intelligence': Finance, 'ai-integration': Intelligence, 'digital-marketing': Social };

export default function ServiceDemo({ item }) {
  const Demo = DEMOS[item.id];
  if (!Demo) return null;
  // Marketing se atiende por WhatsApp; los servicios con oferta llevan al formulario corto de su página.
  const contact = item.id === 'digital-marketing'
    ? wa(t('Hola JC Analytics, quiero armar mi plan de marketing (redes, contenido o Meta Ads).', 'Hi JC Analytics, I would like to put together my marketing plan (social media, content or Meta Ads).'))
    : hasServiceOffer(item) ? '#contacto-servicio' : `${homePath(locale)}#contacto`;
  return <ContactTarget.Provider value={contact}><div className="site-premium studio-v4 service-demo"><Demo /></div></ContactTarget.Provider>;
}
