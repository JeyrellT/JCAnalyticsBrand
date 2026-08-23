// ============================================================================
//  src/data/webProperties.js
//  SITIOS · todo lo que está en línea y se puede abrir hoy. Tres grupos:
//    WEB_PROPERTIES → productos propios que construimos, operamos y cobramos.
//    CLIENT_SITES   → sitios que hicimos para un cliente y él opera.
//    DEMO_SITES     → apps y dashboards nuestros, abiertos para probar.
//  WEB_PROPERTIES se usa además fuera de la sección #sitios (cross-link del
//  footer en App.jsx y casos reales del modal en data/caseStudies.js), así que
//  los otros dos grupos van aparte y no se mezclan en ese array.
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

// ---------------------------------------------------------------------------
//  SITIOS DE CLIENTES · los construimos nosotros, los opera el cliente.
// ---------------------------------------------------------------------------
export const CLIENT_SITES = [
  {
    id: 'uniquexcr',
    name: 'Uniquex Costa Rica',
    domain: 'uniquexcr.com',
    url: 'https://uniquexcr.com/landing',
    sector: 'Automatización de casas',
    tagline: 'Tu casa va un paso adelante.',
    desc: 'Landing narrativa para una empresa de domótica. En vez de listar funciones, recorre un día completo en la casa —luces, portones, persianas, aire y cámaras— y en cada escena el visitante toca los controles y ve cómo responden.',
    features: [
      'Un día en la casa contado escena por escena',
      'Controles que se tocan dentro de la misma página',
      'Cierra agendando la visita técnica',
    ],
    stack: ['Escenas 3D', 'Landing narrativa', 'Scroll con estados'],
    metric: { value: '418 aparatos', label: 'conectados en la casa que muestra el sitio' },
    accent: '#d3ac57',
    shot: asset('uniquexcr.webp'),
    shotMobile: asset('uniquexcr-mobile.webp'),
    shotHero: asset('uniquexcr-hero.webp'),
  },
  {
    id: 'cotizadorvip',
    name: 'Cotizador Comercial VIP',
    domain: 'client-production-a96b.up.railway.app',
    url: 'https://client-production-a96b.up.railway.app/branding',
    sector: 'Freight forwarding',
    tagline: 'Cotizá el flete y mirá la ganancia en el mismo tiro.',
    desc: 'Sistema comercial para carga internacional. Cotiza fletes marítimos, aéreos y terrestres, calcula el precio de venta y la ganancia neta de cada embarque al instante, y sigue el routing order hito por hito hasta la factura.',
    features: [
      'Simulador de flete en 3 pasos con el margen a la vista',
      'Routing order con los 5 hitos del embarque',
      'Scorecard gerencial con los 6 KPIs del equipo',
    ],
    stack: ['Web app', 'Cotizador', 'Panel gerencial'],
    metric: { value: '4 modalidades', label: 'FCL, LCL, aéreo y terrestre en un solo cotizador' },
    accent: '#e694ae',
    shot: asset('cotizadorvip.webp'),
    shotMobile: asset('cotizadorvip-mobile.webp'),
    shotHero: asset('cotizadorvip-hero.webp'),
  },
];

// ---------------------------------------------------------------------------
//  DEMOS · apps y dashboards nuestros, en línea y abiertos para probar.
// ---------------------------------------------------------------------------
export const DEMO_SITES = [
  {
    id: 'leansixsigma',
    name: 'Lean Six Sigma App',
    domain: 'jeyrellt.github.io/JCAPP',
    url: 'https://jeyrellt.github.io/JCAPP/#/projects/project-4',
    sector: 'Mejora de procesos',
    tagline: 'El proyecto DMAIC con las herramientas adentro.',
    desc: 'App para llevar proyectos Lean Six Sigma de punta a punta. El enlace abre un proyecto de logística en fase Analizar: avance de cada fase DMAIC, herramientas aplicadas, cronograma, equipo y bitácora de actividad en una sola vista.',
    features: [
      'Avance por fase: definir, medir, analizar, mejorar, controlar',
      '14 herramientas de mejora dentro del proyecto',
      'Cronograma, equipo y actividad reciente juntos',
    ],
    stack: ['React', 'SPA con rutas hash', 'GitHub Pages'],
    metric: { value: '5 fases DMAIC', label: 'con 14 herramientas registradas' },
    accent: '#8b5cf6',
    shot: asset('leansixsigma.webp'),
    shotMobile: asset('leansixsigma-mobile.webp'),
    shotHero: asset('leansixsigma-hero.webp'),
  },
  {
    id: 'dashboardbi',
    name: 'Dashboard de Curso Power BI',
    domain: 'jeyrellt.github.io/DashboardBI',
    url: 'https://jeyrellt.github.io/DashboardBI',
    sector: 'Analítica de formación',
    tagline: 'Antes de enseñar, medir a quién.',
    desc: 'Dashboard que perfila a un grupo antes de armarle el curso: agrupa a los participantes por análisis factorial, califica la dificultad de las preguntas con IRT y propone la secuencia de aprendizaje que le sirve a ese grupo y no a otro.',
    features: [
      'Perfiles de participantes por análisis factorial',
      'Dificultad de las preguntas calibrada con IRT',
      'Secuencia de aprendizaje sugerida en 5 fases',
    ],
    stack: ['Dashboard web', 'Análisis factorial', 'IRT'],
    metric: { value: '7 habilidades', label: 'evaluadas y agrupadas en 3 factores' },
    accent: '#3b82f6',
    shot: asset('dashboardbi.webp'),
    shotMobile: asset('dashboardbi-mobile.webp'),
    shotHero: asset('dashboardbi-hero.webp'),
  },
  {
    id: 'powerbiquest',
    name: 'PowerBI Quest',
    domain: 'jcanalyticscr.github.io/PowerBIQuest',
    url: 'https://jcanalyticscr.github.io/PowerBIQuest/',
    sector: 'Formación en datos',
    tagline: 'Tu progreso, guardado en la nube.',
    desc: 'App de aprendizaje de Power BI que corre en el navegador. Cada persona entra con su cuenta y el avance queda guardado en la nube, así el curso se retoma donde se dejó y no en la libreta de nadie. Se entra creando una cuenta gratis.',
    features: [
      'Cuenta propia: el avance se guarda en la nube',
      'Se retoma en cualquier dispositivo, sin instalar nada',
      'Registro gratis desde el navegador',
    ],
    stack: ['Web app', 'Cuentas y nube', 'GitHub Pages'],
    metric: { value: 'Cuenta gratis', label: 'el acceso se crea en el mismo sitio' },
    accent: '#22d3ee',
    shot: asset('powerbiquest.webp'),
    shotMobile: asset('powerbiquest-mobile.webp'),
    shotHero: asset('powerbiquest-hero.webp'),
  },
];

// Grupos que renderiza la sección #sitios, en orden de aparición.
export const SITE_GROUPS = [
  {
    id: 'propios',
    eyebrow: 'Productos propios',
    title: 'Los que son nuestros.',
    desc: 'Los diseñamos, los operamos y los cobramos nosotros. Son la muestra más honesta de lo que construimos, porque si algo falla nos toca a nosotros.',
    sites: WEB_PROPERTIES,
  },
  {
    id: 'clientes',
    eyebrow: 'Sitios de clientes',
    title: 'Los que hicimos para alguien más.',
    desc: 'Los construimos nosotros y los opera el cliente. Distinto rubro, distinta marca, la misma base técnica.',
    sites: CLIENT_SITES,
  },
  {
    id: 'demos',
    eyebrow: 'Demos abiertos',
    title: 'Los que podés abrir y trastear.',
    desc: 'Apps y dashboards nuestros publicados para que los pruebes sin pedir permiso ni agendar una llamada.',
    sites: DEMO_SITES,
  },
];

const TOTAL_SITES = SITE_GROUPS.reduce((n, g) => n + g.sites.length, 0);

// Cifras de la tira de resumen de la sección #sitios. Los conteos salen de los
// arrays de arriba a propósito: agregar un sitio no debe dejar la cifra vieja.
export const WEB_STATS = [
  { value: String(TOTAL_SITES), label: 'sitios en línea que podés abrir hoy' },
  { value: String(WEB_PROPERTIES.length), label: 'productos propios en producción' },
  { value: String(CLIENT_SITES.length), label: 'sitios de clientes operando' },
  { value: String(DEMO_SITES.length), label: 'demos abiertos de apps y dashboards' },
];

// Imagen de la card "Páginas Web y Reservas" del carrusel de servicios.
export const WEB_SERVICE_SHOT = asset('glowstudiocr-hero.webp');
