import { articles, topics } from '../content/catalog.js';
import { PRICE_SOURCES, SERVICE_PRICING } from '../../../portal/shared/service-pricing.js';
import { alternatePath, homePath, journalPath, articlePath, servicePath, routes, resolveRoute } from './routes.js';
import { categoryById } from '../content/categories.js';
import { SERVICE_OFFERS } from '../content/service-offers.js';

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

// Paquetes con precio publicado de una categoría, para los datos estructurados. Nombre, precio, alcance y
// plazo salen del tarifario; el enlace abre ese paquete en la página de su categoría. Marketing no tiene
// paquetes de pago único: no declara catálogo.
const offerCatalog = (id, language) => {
  const keys = SERVICE_OFFERS[id]?.packages ?? [];
  if (!keys.length) return {};
  const page = SITE_URL + servicePath(categoryById(id).page, language);
  return {
    hasOfferCatalog: {
      '@type': 'OfferCatalog', name: language === 'es' ? 'Paquetes con precio publicado' : 'Packages with published pricing',
      itemListElement: keys.map((key) => {
        const pricing = SERVICE_PRICING[key];
        return {
          '@type': 'Offer', name: language === 'es' ? pricing.label : pricing.label_en,
          description: language === 'es' ? pricing.scope : pricing.scope_en,
          price: pricing.base_usd, priceCurrency: 'USD', url: `${page}?p=${key}#oferta`,
          // El tarifario publica precios sin IVA (la página siempre escribe «+ IVA»): se le dice también a la máquina.
          priceSpecification: {
            '@type': 'UnitPriceSpecification', price: pricing.base_usd, priceCurrency: 'USD',
            valueAddedTaxIncluded: PRICE_SOURCES[pricing.source.key].tax_included,
          },
          // Plazo publicado de entrega, en el idioma de la página. Los días son hábiles: no llevan el código DAY
          // (día calendario); las semanas llevan WEE (UN/CEFACT).
          deliveryLeadTime: pricing.days_min
            ? { '@type': 'QuantitativeValue', minValue: pricing.days_min, maxValue: pricing.days_max, unitText: language === 'es' ? 'días hábiles' : 'business days' }
            : { '@type': 'QuantitativeValue', minValue: pricing.weeks_min, maxValue: pricing.weeks_max, unitCode: 'WEE', unitText: language === 'es' ? 'semanas' : 'weeks' },
        };
      }),
    },
  };
};
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
      ['What can JC Analytics build for my business?', 'Websites with bookings or orders, custom systems to organize your operation, Power BI dashboards, automation of repeated tasks, AI assistants and social media marketing. We also improve or connect the website and systems you already use. Tell us the problem and we will tell you where to start.'],
      ['How much does a custom website cost?', `The website with bookings costs US$${WEB.base_usd}, or US$${WEB.with_ai_usd} with an AI assistant that guides your customers and gives them the booking link. It includes up to 5 sections, 10 services and 1 calendar; you supply text and images. Tax, domain, hosting, usage and monthly support are separate. There are ${PACKAGE_COUNT} published packages, starting at US$${MIN_PRICE}; anything that does not fit a package is quoted in writing.`],
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
      ['¿Qué puede desarrollar JC Analytics para mi negocio?', 'Páginas web con reservas o pedidos, sistemas a medida para ordenar tu operación, dashboards en Power BI, automatización de tareas repetidas, asistentes de IA y marketing en redes. También mejoramos o conectamos la web y los sistemas que ya usás. Contanos el problema y te decimos por dónde empezar.'],
      ['¿Cuánto cuesta una página web a medida?', `La web con reservas cuesta US$${WEB.base_usd}, o US$${WEB.with_ai_usd} con un asistente de IA que orienta a tus clientes y les pasa el enlace de reserva. Incluye hasta 5 secciones, 10 servicios y 1 agenda; vos entregás textos e imágenes. Van aparte el IVA, el dominio, el alojamiento, los consumos y el soporte mensual. Hay ${PACKAGE_COUNT} paquetes publicados, desde US$${MIN_PRICE}; lo que no calza en un paquete se cotiza por escrito.`],
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
    // Cada servicio apunta a su página (antes: anclas #plataformas, #finanzas… que la portada ya no tiene)
    // y declara sus paquetes con precio: el precio publicado es el argumento central de la portada y antes
    // solo se podía encontrar leyendo el texto (segunda ronda de la auditoría, noviembre de 2026).
    graph.push(...content[language].services.map(([name, description, id]) => ({
      '@type': 'Service', '@id': url + '#service-' + id, name, description,
      url: SITE_URL + servicePath(categoryById(id).page, language),
      provider: { '@id': organizationId }, areaServed: { '@type': 'Country', name: 'Costa Rica' },
      ...offerCatalog(id, language),
    })));
    // Las seis preguntas visibles, tal cual. Google muestra poco este resultado enriquecido: sirve sobre todo
    // para que buscadores y asistentes lean precio, plazo y soporte sin interpretar la página.
    graph.push({
      '@type': 'FAQPage', '@id': url + '#faq', inLanguage: language, isPartOf: { '@id': url + '#webpage' },
      mainEntity: content[language].faq.map(([question, answer]) => ({ '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text: answer } })),
    });
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
      ...offerCatalog(page.data.id, language),
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
