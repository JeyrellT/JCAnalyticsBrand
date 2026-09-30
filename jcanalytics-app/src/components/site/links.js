// ============================================================================
//  src/components/site/links.js
//  Constantes de contacto y navegación del sitio (separadas de los componentes
//  para que Fast Refresh funcione).
// ============================================================================

export const PHONE = '50670330596';
export const EMAIL = 'gerencia@jcanalytic.com';

// Link de WhatsApp con mensaje precargado: el visitante solo toca "enviar".
export const wa = (text) =>
  `https://wa.me/${PHONE}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

// Curva de easing de toda la v3 (salida exponencial).
export const EASE = [0.19, 1, 0.22, 1];

export const NAV_LINKS = [
  { label: 'Trabajo', href: '#trabajo' },
  { label: 'Servicios', href: '#servicios' },
  { label: 'Proceso', href: '#proceso' },
  { label: 'Cotizar', href: '#cotizar' },
];
