import { articles, topics } from '../content/catalog.js';
import { SERVICE_PRICING } from '../../../portal/shared/service-pricing.js';
import { alternatePath, homePath, journalPath, articlePath, servicePath, routes, resolveRoute } from './routes.js';
import { categoryById } from '../content/categories.js';

// Shared by the Vite HTML transform, the static build and the visible FAQ.
// Keep claims and contact details consistent with the actual services on the site.
// `services`: [name, description, category id]; the id links each service to its own page (content/categories.js).
export const SITE_URL = 'https://www.jcanalytic.com';
export const locales = ['en', 'es'];
export const pageUrl = (language, route) => `${SITE_URL}${alternatePath(route, language)}`;

// Cifras de las preguntas frecuentes: salen del tarifario (portal/shared/service-pricing.js), no se escriben a mano.
const PACKAGES = Object.values(SERVICE_PRICING);
const PACKAGE_COUNT = PACKAGES.length;
const MIN_PRICE = Math.min(...PACKAGES.map((item) => item.base_usd));
const MIN_SUPPORT = Math.min(...PACKAGES.map((item) => item.support_monthly_usd).filter(Boolean));
const { excel_vba: QUICKEST, software_medida: LONGEST, pagina_web: WEB } = SERVICE_PRICING;
export const content = {
  en: {
    title: 'Web Development & AI in Costa Rica | JC Analytics',
    description: 'Custom websites, software, Power BI dashboards and AI integration in Costa Rica. Pick your case, see published prices and request a free 30-minute conversation.',
    imageAlt: 'JC Analytics — custom software, web design and digital engineering in Costa Rica',
    services: [
      ['Custom web development', 'Brand-led websites, interfaces, backend systems and business management tools.', 'web-development'],
      ['Financial analysis and Power BI dashboards', 'Financial models, budgets and dashboards connected to business data.', 'business-intelligence'],
      ['AI integration and machine learning', 'Document assistants, predictive models and AI integrated into existing workflows.', 'ai-integration'],
      ['Business process automation', 'Excel, Python and Power Platform workflows to reduce repetitive manual tasks.', 'process-automation'],
      ['Digital marketing and content', 'Social media management, creative content, video editing and advertising campaigns.', 'digital-marketing'],
    ],
    faq: [
      ['What can JC Analytics build for my business?', 'We design websites and custom software with the backend, dashboards and integrations your business needs. We also work on financial analysis, Power BI, process automation, machine learning and digital marketing, and we can improve or integrate the website and systems you already use. Start with a specific business problem and we will help define the scope.'],
      ['How much does a custom website cost?', `The website with bookings package costs US$${WEB.base_usd}, or US$${WEB.with_ai_usd} with the specified AI advisor. It includes up to 5 sections, 10 services and 1 calendar, with client-supplied content. Taxes, domain, hosting, usage and monthly support are separate. There are ${PACKAGE_COUNT} published packages, starting at US$${MIN_PRICE}; larger projects and extras are quoted for the agreed scope.`],
      ['How long does a project take?', `Every package publishes its timeline: from ${QUICKEST.days_min} to ${QUICKEST.days_max} business days for Excel and automated reports, up to ${LONGEST.weeks_min} to ${LONGEST.weeks_max} weeks for custom software; the website with bookings takes ${WEB.weeks_min} to ${WEB.weeks_max} weeks. Those timelines assume content, data and access are ready. Meanwhile you see progress every 72 hours in your client portal.`],
      ['What if something is not right after delivery?', `Before we start you get in writing what the work includes, what it does not and how much it costs, and during the project you approve each deliverable in your client portal. After delivery you have 30 days of support: we fix defects within the delivered scope at no cost. After that, monthly support is optional, from US$${MIN_SUPPORT} a month on the packages that offer it.`],
      ['Do you work remotely and in English?', 'We are based in Costa Rica and can discuss your project in English or Spanish. We work remotely with businesses across Costa Rica. Tell us where your team is located so we can agree on communication and project logistics.'],
      ['What happens after I contact you?', 'We reply within 24 hours. The first conversation is 30 minutes and free of charge: we discuss your goal, current process and priorities, and you leave with a recommendation even if you do not hire us. Then you receive a proposal with the scope and a fixed price in writing, and only then do you decide whether we start. You can contact the team through WhatsApp or email.'],
    ],
  },
  es: {
    title: 'Diseño Web, Software e IA Costa Rica | JC Analytics',
    description: 'Diseño web, software a medida, dashboards Power BI e integración de IA en Costa Rica. Elegí tu caso, mirá precios publicados y pedí 30 minutos sin costo.',
    imageAlt: 'JC Analytics — software a medida, diseño web e ingeniería digital en Costa Rica',
    services: [
      ['Desarrollo web a medida', 'Sitios con identidad de marca, interfaces, backend y herramientas de gestión del negocio.', 'web-development'],
      ['Análisis financiero y dashboards Power BI', 'Modelos financieros, presupuestos y dashboards conectados a los datos del negocio.', 'business-intelligence'],
      ['Integración de IA y machine learning', 'Asistentes sobre documentos, modelos predictivos e IA integrada a procesos existentes.', 'ai-integration'],
      ['Automatización de procesos', 'Flujos con Excel, Python y Power Platform para reducir tareas manuales repetitivas.', 'process-automation'],
      ['Marketing digital y contenido', 'Gestión de redes sociales, contenido creativo, edición de video y campañas publicitarias.', 'digital-marketing'],
    ],
    faq: [
      ['¿Qué puede desarrollar JC Analytics para mi negocio?', 'Diseñamos páginas web y software a medida con el backend, los dashboards y las integraciones que necesita tu negocio. También trabajamos en análisis financiero, Power BI, automatización, machine learning y marketing digital, y podemos mejorar o integrar la web y los sistemas que ya usás. Partimos de un problema concreto para ayudarte a definir el alcance.'],
      ['¿Cuánto cuesta una página web a medida?', `La web con reservas cuesta US$${WEB.base_usd}, o US$${WEB.with_ai_usd} con el asesor de IA descrito. Incluye hasta 5 secciones, 10 servicios y 1 agenda, con contenidos entregados por el comprador. Impuestos, dominio, hosting, consumos y soporte mensual se cobran aparte. Hay ${PACKAGE_COUNT} paquetes publicados, desde US$${MIN_PRICE}; los proyectos más amplios y adicionales se cotizan según alcance.`],
      ['¿Cuánto tarda un proyecto?', `Cada paquete publica su plazo: de ${QUICKEST.days_min} a ${QUICKEST.days_max} días hábiles para Excel y reportes automatizados, hasta ${LONGEST.weeks_min} a ${LONGEST.weeks_max} semanas para software a medida; la web con reservas toma de ${WEB.weeks_min} a ${WEB.weeks_max} semanas. Esos plazos suponen contenidos, datos y accesos listos. Mientras tanto ves avances cada 72 horas en tu portal de clientes.`],
      ['¿Qué pasa si algo no queda bien después de la entrega?', `Antes de empezar recibís por escrito qué incluye el trabajo, qué no y cuánto cuesta, y durante el proyecto aprobás cada entregable en tu portal de clientes. Después de la entrega tenés 30 días de soporte: corregimos sin costo los defectos del alcance entregado. Luego el soporte mensual es opcional, desde US$${MIN_SUPPORT} al mes en los paquetes que lo ofrecen.`],
      ['¿Trabajan de forma remota y en inglés?', 'Estamos en Costa Rica y podemos conversar sobre tu proyecto en español o inglés. Trabajamos de forma remota con empresas de todo Costa Rica. Contanos dónde está tu equipo para acordar la comunicación y la logística del proyecto.'],
      ['¿Qué pasa después de contactarlos?', 'Te respondemos en menos de 24 horas. La primera conversación dura 30 minutos y es sin costo: conversamos sobre tu objetivo, proceso actual y prioridades, y salís con una recomendación aunque no contratés. Después recibís una propuesta con el alcance y el precio fijo por escrito, y recién ahí decidís si empezamos. Podés contactar al equipo por WhatsApp o correo.'],
    ],
  },
};

const journal = {
  en: { title: 'Business Insights: Data, Websites & AI | JC Analytics', description: 'Practical guides to clearer business decisions, useful websites, reliable data and responsible AI. Original insights from JC Analytics in Costa Rica.' },
  es: { title: 'Ideas para tu Negocio: Datos, Web e IA | JC Analytics', description: 'Guías prácticas para decidir mejor, crear webs útiles, ordenar datos y aplicar IA con criterio. Ideas originales de JC Analytics en Costa Rica.' },
};

function localizedRoute(language, route) {
  if (!locales.includes(language)) throw new Error('Unsupported SEO language');
  const match = resolveRoute(alternatePath(route, language));
  if (!match) throw new Error('The SEO route must belong to the public route catalog');
  return match;
}

export function pageMetadata(language, route) {
  const page = localizedRoute(language, route);
  const copy = page.type === 'home' ? content[language] : page.type === 'journal' ? journal[language] : {
    title: page.data[language].title.replace(/\.$/, '') + ' | JC Analytics',
    description: page.data[language].summary,
    imageAlt: page.data[language].title,
  };
  return {
    ...copy, url: pageUrl(language, page),
    image: page.data?.image ? new URL(page.data.image, SITE_URL).href : SITE_URL + '/og-studio.png',
    imageAlt: copy.imageAlt ?? (language === 'es' ? 'Ideas de JC Analytics para tu negocio' : 'JC Analytics insights for your business'),
    type: page.type === 'article' ? 'article' : 'website',
  };
}

const organizationId = SITE_URL + '/#organization';
const websiteId = SITE_URL + '/#website';

export function structuredData(language, route) {
  const page = localizedRoute(language, route);
  const copy = pageMetadata(language, page);
  const url = copy.url;
  const organization = {
    '@type': 'Organization', '@id': organizationId,
    name: 'JC Analytics', url: SITE_URL + '/', logo: SITE_URL + '/Logo.png',
    email: 'gerencia@jcanalytic.com', telephone: '+50670330596',
    areaServed: { '@type': 'Country', name: 'Costa Rica' },
    // La localidad que ya publica el pie del sitio; sin dirección exacta.
    address: { '@type': 'PostalAddress', addressLocality: 'Heredia', addressCountry: 'CR' },
    contactPoint: { '@type': 'ContactPoint', contactType: 'customer service', telephone: '+50670330596', email: 'gerencia@jcanalytic.com', availableLanguage: ['English', 'Spanish'] },
  };
  const webpage = {
    '@type': page.type === 'journal' ? 'CollectionPage' : 'WebPage',
    '@id': url + '#webpage', url, name: copy.title, description: copy.description,
    inLanguage: language, isPartOf: { '@id': websiteId }, about: { '@id': organizationId },
    primaryImageOfPage: { '@type': 'ImageObject', url: copy.image, caption: copy.imageAlt },
  };
  const graph = [
    organization,
    { '@type': 'WebSite', '@id': websiteId, url: SITE_URL + '/', name: 'JC Analytics', inLanguage: locales, publisher: { '@id': organizationId } },
    webpage,
  ];

  if (page.type === 'home') {
    // Cada servicio apunta a su página (antes: anclas #plataformas, #finanzas… que la portada ya no tiene).
    graph.push(...content[language].services.map(([name, description, id]) => ({
      '@type': 'Service', '@id': url + '#service-' + id, name, description,
      url: SITE_URL + servicePath(categoryById(id).page, language),
      provider: { '@id': organizationId }, areaServed: { '@type': 'Country', name: 'Costa Rica' },
    })));
  } else {
    const crumbs = [{ name: language === 'es' ? 'Inicio' : 'Home', item: SITE_URL + homePath(language) }];
    if (page.type === 'article' || page.type === 'journal') crumbs.push({ name: language === 'es' ? 'Ideas' : 'Insights', item: SITE_URL + journalPath(language) });
    if (page.data) crumbs.push({ name: page.data[language].title, item: url });
    webpage.breadcrumb = { '@id': url + '#breadcrumb' };
    graph.push({ '@type': 'BreadcrumbList', '@id': url + '#breadcrumb', itemListElement: crumbs.map((crumb, index) => ({ '@type': 'ListItem', position: index + 1, ...crumb })) });
  }

  if (page.type === 'journal') {
    webpage.mainEntity = { '@id': url + '#articles' };
    graph.push({
      '@type': 'ItemList', '@id': url + '#articles', numberOfItems: articles.length,
      itemListElement: articles.map((article, index) => ({ '@type': 'ListItem', position: index + 1, url: SITE_URL + articlePath(article, language), name: article[language].title })),
    });
  }

  if (page.type === 'article') {
    const article = page.data[language];
    webpage.mainEntity = { '@id': url + '#article' };
    graph.push({
      '@type': 'Article', '@id': url + '#article', url,
      headline: article.title, description: article.summary, image: [copy.image],
      inLanguage: language, mainEntityOfPage: { '@id': url + '#webpage' },
      author: { '@type': 'Organization', '@id': organizationId, name: 'JC Analytics', url: SITE_URL + '/' },
      publisher: { '@id': organizationId },
      datePublished: page.data.published,
      ...(page.data.modified ? { dateModified: page.data.modified } : {}),
      articleSection: topics[page.data.topic]?.[language],
      wordCount: article.sections.flatMap(section => [...section.paragraphs, ...(section.bullets ?? [])]).join(' ').trim().split(/\s+/).length,
      ...(page.data.minutes ? { timeRequired: 'PT' + page.data.minutes + 'M' } : {}),
      ...(article.sources.length ? { citation: article.sources.map(source => ({ '@type': 'CreativeWork', name: source.title, url: source.url })) } : {}),
    });
  }

  if (page.type === 'service') {
    const service = page.data[language];
    webpage.mainEntity = { '@id': url + '#service' };
    graph.push({
      '@type': 'Service', '@id': url + '#service', url,
      name: service.title, description: service.summary,
      provider: { '@id': organizationId }, areaServed: { '@type': 'Country', name: 'Costa Rica' },
      mainEntityOfPage: { '@id': url + '#webpage' }, image: copy.image,
    });
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}

const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
export function renderSeoHead(language, route) {
  const page = localizedRoute(language, route);
  const copy = pageMetadata(language, page);
  const meta = (key, value, property = false) => '<meta ' + (property ? 'property' : 'name') + '="' + key + '" content="' + escape(value) + '" />';
  return [
    '<title>' + escape(copy.title) + '</title>', meta('description', copy.description),
    '<link rel="canonical" href="' + copy.url + '" />',
    ...locales.map(lang => '<link rel="alternate" hreflang="' + lang + '" href="' + pageUrl(lang, page) + '" />'),
    '<link rel="alternate" hreflang="x-default" href="' + pageUrl('es', page) + '" />',
    meta('robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'),
    meta('og:type', copy.type, true), meta('og:site_name', 'JC Analytics', true),
    meta('og:title', copy.title, true), meta('og:description', copy.description, true), meta('og:url', copy.url, true),
    meta('og:locale', language === 'es' ? 'es_CR' : 'en_US', true), meta('og:locale:alternate', language === 'es' ? 'en_US' : 'es_CR', true),
    meta('og:image', copy.image, true),
    ...(page.data?.image ? [] : [meta('og:image:width', '1200', true), meta('og:image:height', '630', true)]),
    meta('og:image:alt', copy.imageAlt, true),
    ...(page.type === 'article' ? [meta('article:published_time', page.data.published, true), ...(page.data.modified ? [meta('article:modified_time', page.data.modified, true)] : [])] : []),
    meta('twitter:card', 'summary_large_image'), meta('twitter:title', copy.title), meta('twitter:description', copy.description), meta('twitter:image', copy.image), meta('twitter:image:alt', copy.imageAlt),
    '<script type="application/ld+json">' + JSON.stringify(structuredData(language, page)).replaceAll('<', '\u003c') + '</script>',
  ].join('\n    ');
}

export function renderSitemap() {
  const rows = routes.map(route => [
    '  <url>',
    '    <loc>' + escape(SITE_URL + route.path) + '</loc>',
    ...(route.type === 'article' ? ['    <lastmod>' + escape(route.data.modified ?? route.data.published) + '</lastmod>'] : []),
    ...locales.map(language => '    <xhtml:link rel="alternate" hreflang="' + language + '" href="' + escape(pageUrl(language, route)) + '" />'),
    '    <xhtml:link rel="alternate" hreflang="x-default" href="' + escape(pageUrl('es', route)) + '" />',
    '  </url>',
  ].join('\n'));
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' + rows.join('\n') + '\n</urlset>\n';
}
