// ============================================================================
//  src/components/site/links.js
//  Constantes de contacto y navegación del sitio (separadas de los componentes
//  para que Fast Refresh funcione).
// ============================================================================

import { t } from '../../i18n/locale';

export const PHONE = '50670330596';
export const EMAIL = 'gerencia@jcanalytic.com';

// Entrada al portal privado del equipo (proyectos, agenda, inversiones de socios).
// Se puede cambiar al compilar con VITE_PORTAL_URL sin tocar el código.
export const PORTAL_URL = (import.meta.env.VITE_PORTAL_URL || 'https://portal.jcanalytic.com').replace(/\/+$/, '');

// Tres accesos del portal, cada uno con su ingreso: el portal preselecciona el tipo de
// acceso según la ruta (/cliente → Clientes, /inversionista → Inversionistas, / → Equipo).
export const PORTAL_ACCESSES = [
  {
    key: 'cliente',
    href: `${PORTAL_URL}/cliente`,
    label: t('Clientes', 'Clients'),
    detail: t('Avances, entregables y solicitudes de tu proyecto.', 'Progress, deliverables and requests for your project.'),
  },
  {
    key: 'inversionista',
    href: `${PORTAL_URL}/inversionista`,
    label: t('Inversionistas', 'Investors'),
    detail: t('Tu capital, retornos y movimientos confirmados.', 'Your capital, returns and confirmed movements.'),
  },
  {
    key: 'equipo',
    href: `${PORTAL_URL}/`,
    label: t('Equipo JC', 'JC team'),
    detail: t('Proyectos, tablero, agenda y operación.', 'Projects, board, calendar and operations.'),
  },
];

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
