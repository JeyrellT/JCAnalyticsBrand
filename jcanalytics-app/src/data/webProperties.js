// ============================================================================
//  src/data/webProperties.js
//  SITIOS PROPIOS · productos digitales que JC Analytics construye y opera.
//  Se usan en tres lugares: la sección #sitios, la card de servicio "Páginas
//  Web" del carrusel y los casos reales del modal (data/caseStudies.js).
//
//  IMÁGENES: capturas reales en public/sites/, generadas con
//  `node scripts/capture-sites.mjs` (requiere puppeteer). Tres variantes:
//    shot       → captura larga (1200x2400): la card la desplaza en hover
//    shotMobile → captura de teléfono, para el marco móvil de la card
//    shotHero   → recorte 16/9 del hero, para contenedores apaisados
//  Re-generar cuando alguno de los sitios cambie de diseño.
//
//  NOTA de contenido: las descripciones reflejan lo que el sitio hace hoy.
//  No se afirman métricas de negocio que no estén publicadas en cada sitio.
// ============================================================================

const asset = (file) => import.meta.env.BASE_URL + 'sites/' + file;

export const WEB_PROPERTIES = [
  {
    id: 'barberxcr',
    name: 'BarberXCR',
    domain: 'barberxcr.com',
    url: 'https://barberxcr.com/',
    sector: 'Barberías',
    tagline: 'Programá. Cortá. Cobrá.',
    desc: 'Plataforma de reservas para barberías. Cada barbería recibe su propia página con su marca y una agenda que se llena sola: el cliente elige servicio y hora desde el navegador, sin apps ni descargas.',
    features: [
      'Página propia con la marca del negocio',
      'Reservas automáticas 24/7, sin descargas',
      'Agenda independiente por barbero (hasta 5)',
    ],
    stack: ['React', 'Reservas 24/7', 'WhatsApp Business'],
    metric: { value: 'Desde ₡10.000', label: 'por mes · 10 días gratis' },
    accent: '#e8b32c',
    shot: asset('barberxcr.webp'),
    shotMobile: asset('barberxcr-mobile.webp'),
    shotHero: asset('barberxcr-hero.webp'),
  },
  {
    id: 'tallerticos',
    name: 'Taller Ticos',
    domain: 'tallerticos.com',
    url: 'https://www.tallerticos.com/',
    sector: 'Talleres y vehículos',
    tagline: 'Tu vehículo vale más cuando podés probarlo.',
    desc: 'Historial de mantenimiento vehicular certificado. El taller registra cada servicio con fotos y repuestos; el dueño comparte un enlace verificable —sin exponer datos personales— a la hora de vender el carro.',
    features: [
      'Lo certifica el taller, no el dueño',
      'Enlace revocable y sin datos personales',
      'Recordatorios por kilometraje y control de RTV',
    ],
    stack: ['Web app', 'Órdenes digitales', 'Odómetro con IA'],
    metric: { value: 'Gratis para dueños', label: '₡20.000/mes para talleres' },
    accent: '#fb7024',
    shot: asset('tallerticos.webp'),
    shotMobile: asset('tallerticos-mobile.webp'),
    shotHero: asset('tallerticos-hero.webp'),
  },
  {
    id: 'glowstudiocr',
    name: 'Glow Studio CR',
    domain: 'glowstudiocr.com',
    url: 'https://glowstudiocr.com/',
    sector: 'Salones de belleza',
    tagline: 'Donde cada detalle te hace brillar.',
    desc: 'Sitio de salón de belleza con reserva en línea. Seis especialidades con precio de entrada visible, portafolio de antes/después con comparador y confirmación inmediata sin llamadas ni esperas.',
    features: [
      'Reserva en 3 pasos: servicio, día y hora',
      'Catálogo de 6 especialidades con precio desde',
      'Portafolio antes/después con comparador',
    ],
    stack: ['React', 'Reservas 24/7', 'Galería comparativa'],
    metric: { value: '30 segundos', label: 'para reservar en línea' },
    accent: '#c0764f',
    shot: asset('glowstudiocr.webp'),
    shotMobile: asset('glowstudiocr-mobile.webp'),
    shotHero: asset('glowstudiocr-hero.webp'),
  },
];

// Cifras de la tira de resumen de la sección #sitios.
export const WEB_STATS = [
  { value: '3', label: 'sitios propios en producción' },
  { value: '3', label: 'verticales distintas' },
  { value: '24/7', label: 'reservas sin llamadas' },
  { value: '100%', label: 'hechos en Costa Rica' },
];

// Imagen de la card "Páginas Web y Reservas" del carrusel de servicios.
export const WEB_SERVICE_SHOT = asset('glowstudiocr-hero.webp');
