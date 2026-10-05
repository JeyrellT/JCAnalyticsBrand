// ============================================================================
//  src/components/site/links.js
//  Constantes de contacto y navegación del sitio (separadas de los componentes
//  para que Fast Refresh funcione).
// ============================================================================

import { t } from '../../i18n/locale';

export const PHONE = '50670330596';
export const EMAIL = 'gerencia@jcanalytic.com';

export const prepareContact = ({ need, source = '' }) => {
  window.dispatchEvent(new CustomEvent('jca:contact-intent', { detail: { need, source } }));
};

// Link de WhatsApp con mensaje precargado: el visitante solo toca "enviar".
export const wa = (text) =>
  `https://wa.me/${PHONE}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

// Curva de easing de toda la v3 (salida exponencial).
export const EASE = [0.19, 1, 0.22, 1];

export const NAV_LINKS = [
  { label: t('Sistemas', 'Software'), href: '#plataformas' },
  { label: t('Finanzas & BI', 'Finance & BI'), href: '#finanzas' },
  { label: t('IA & ML', 'AI & ML'), href: '#inteligencia' },
  { label: t('Ejemplos', 'Examples'), href: '#trabajo' },
  { label: 'Marketing', href: '#redes' },
  { label: t('Contacto', 'Contact'), href: '#contacto' },
];
