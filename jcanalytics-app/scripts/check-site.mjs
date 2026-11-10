// Browser acceptance checks for the actual static production build.
// Run after build/prerender: node scripts/check-site.mjs
// Forms run with window.open stubbed. No external requests or messages are sent.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { gzipSync } from 'node:zlib';
import puppeteer from 'puppeteer';
import { articles } from '../src/content/catalog.js';
import { routes, alternatePath, articlePath, servicePath } from '../src/seo/routes.js';
import { SERVICE_OFFERS } from '../src/content/service-offers.js';
import { SERVICE_PRICING } from '../../portal/shared/service-pricing.js';

const DIST = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const PRODUCTION = 'https://www.jcanalytic.com';
const TIMEOUT = 20_000;
// Envíos al portal del equipo: se responden aquí mismo, nunca salen a internet.
const PORTAL_INGEST = 'https://portal.jcanalytic.com/ingest/';
const COPY = {
  en: {
    path: '/en/', heading: 'Websites and systems delivered on time.', system: 'System / backend', website: 'Website',
    objective: 'What would you like to solve?', name: 'Your name',
    faqQuestion: 'What can JC Analytics build for my business?', faqAnswer: 'Websites with bookings or orders',
    emailPrefix: 'Inquiry:', messagePrefix: 'Hi JC Analytics', estimateLabel: 'Estimated investment',
    title: 'Web Development & AI in Costa Rica | JC Analytics', descriptionStart: 'Custom websites, software, Power BI',
    journalHeading: 'Good technology starts with a better question.',
    journalTitle: 'Business Insights: Data, Websites & AI | JC Analytics',
    journalDescription: 'Practical guides to clearer business decisions, useful websites, reliable data and responsible AI.',
  },
  es: {
    path: '/', heading: 'Webs y sistemas con entrega a tiempo.', system: 'Sistema / backend', website: 'Página web',
    objective: '¿Qué querés resolver?', name: 'Tu nombre',
    faqQuestion: '¿Qué puede desarrollar JC Analytics para mi negocio?', faqAnswer: 'Páginas web con reservas o pedidos',
    emailPrefix: 'Consulta:', messagePrefix: 'Hola JC Analytics', estimateLabel: 'Inversión estimada',
    title: 'Diseño Web, Software e IA Costa Rica | JC Analytics', descriptionStart: 'Diseño web, software a medida, dashboards Power BI',
    journalHeading: 'La tecnología empieza con una buena pregunta.',
    journalTitle: 'Ideas para tu Negocio: Datos, Web e IA | JC Analytics',
    journalDescription: 'Guías prácticas para decidir mejor, crear webs útiles, ordenar datos y aplicar IA con criterio.',
  },
};
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
};
const checkedAssets = new Set();
const homeRoute = (language) => routes.find((route) => route.language === language && route.type === 'home');
const equivalentRoute = (route, language) => routes.find((item) => item.path === alternatePath(route, language));

async function startServer() {
  const server = createServer(async (request, response) => {
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405).end();
      return;
    }
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      const candidate = resolve(DIST, `.${pathname}`);
      const within = relative(DIST, candidate);
      if (within === '..' || within.startsWith(`..${sep}`) || pathname.includes('\0')) {
        response.writeHead(403).end('Forbidden');
        return;
      }
      const info = await stat(candidate);
      const file = info.isDirectory() ? join(candidate, 'index.html') : candidate;
      const bytes = await readFile(file);
      response.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      response.end(request.method === 'HEAD' ? undefined : bytes);
    } catch (error) {
      // Missing language pages and assets must fail; never return the SPA shell.
      response.writeHead(['ENOENT', 'ENOTDIR'].includes(error.code) ? 404 : 500).end('Not found');
    }
  });
  await new Promise((resolveServer, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolveServer);
  });
  return server;
}

// Real project evidence (the data module itself needs Vite, so read the generated JSON directly).
const PROJECTS = Object.keys(JSON.parse(await readFile(new URL('../src/data/projects.evidence.json', import.meta.url), 'utf8')).projects);

const compact = (text) => text.replace(/\s+/g, ' ').trim();

async function openPage(browser, origin, width, javascript = true, options = {}) {
  const page = await browser.newPage();
  const errors = [];
  const badLocalRequests = [];
  const delayedModule = { requests: 0, waiting: false };
  page.setDefaultTimeout(TIMEOUT);
  page.ingest = [];
  await page.setViewport({ width, height: width < 600 ? 844 : 1000, deviceScaleFactor: 1 });
  await page.setJavaScriptEnabled(javascript);
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.setRequestInterception(true);
  page.on('request', async (request) => {
    const url = new URL(request.url());
    // `delayEntryMs`: retiene el JavaScript de entrada para probar la página antes de que React monte.
    if (url.origin === origin && options.delayEntryMs && /\/assets\/index-[^/]+\.js$/.test(url.pathname)) await delay(options.delayEntryMs);
    if (url.origin === origin && options.delayJournalMs && /\/JournalApp-[^/]+\.js$/.test(url.pathname)) {
      delayedModule.requests += 1;
      delayedModule.waiting = true;
      await delay(options.delayJournalMs);
      delayedModule.waiting = false;
    }
    if (url.origin === origin || ['data:', 'blob:', 'about:'].includes(url.protocol)) request.continue();
    else if (request.url().startsWith(PORTAL_INGEST)) {
      if (request.method() === 'POST') page.ingest.push({ path: url.pathname, body: JSON.parse(request.postData() || '{}') });
      request.respond({ status: request.method() === 'OPTIONS' ? 204 : 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': origin }, body: '{"ok":true}' });
    } else request.abort('blockedbyclient');
  });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.url().startsWith(`${origin}/`) && response.status() >= 400) {
      badLocalRequests.push(`${response.status()} ${response.url()}`);
    }
  });
  page.on('requestfailed', (request) => {
    if (request.url().startsWith(`${origin}/`) && request.failure()?.errorText !== 'net::ERR_ABORTED') {
      badLocalRequests.push(`${request.failure()?.errorText} ${request.url()}`);
    }
  });
  return {
    page,
    delayedModule,
    verifyErrors() {
      assert.deepEqual(errors, [], 'Uncaught browser errors');
      assert.deepEqual([...new Set(badLocalRequests)], [], 'Failed local assets or page requests');
    },
  };
}

async function navigate(page, url) {
  const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 30_000 });
  assert.equal(response.status(), 200, `Page should exist: ${url}`);
  await page.waitForSelector('main h1');
}

async function checkMetadata(page, language, route = homeRoute(language)) {
  const metadata = await page.evaluate(() => ({
    language: document.documentElement.lang,
    canonicals: Array.from(document.querySelectorAll('link[rel="canonical"]'), (node) => node.href),
    alternates: Array.from(document.querySelectorAll('link[rel="alternate"][hreflang]'), (node) => [node.hreflang, node.href]),
    headings: Array.from(document.querySelectorAll('h1'), (node) => node.innerText),
    titles: Array.from(document.querySelectorAll('title'), (node) => node.textContent),
    descriptions: Array.from(document.querySelectorAll('meta[name="description"]'), (node) => node.content),
    structured: Array.from(document.querySelectorAll('script[type="application/ld+json"]'), (node) => JSON.parse(node.textContent)),
    robots: document.querySelector('meta[name="robots"]')?.content,
    ogUrl: document.querySelector('meta[property="og:url"]')?.content,
    ogType: document.querySelector('meta[property="og:type"]')?.content,
  }));
  assert.equal(metadata.language, language);
  const url = `${PRODUCTION}${route.path}`;
  assert.deepEqual(metadata.canonicals, [url], 'Exactly one self-canonical');
  assert.deepEqual(metadata.alternates.sort(), [
    ['en', `${PRODUCTION}${alternatePath(route, 'en')}`],
    ['es', `${PRODUCTION}${alternatePath(route, 'es')}`],
    ['x-default', `${PRODUCTION}${alternatePath(route, 'es')}`],
  ].sort(), 'Reciprocal, absolute language alternates');
  assert.equal(metadata.headings.length, 1, 'One primary heading');
  const copy = route.data?.[language];
  const expectedHeading = route.type === 'home' ? COPY[language].heading : route.type === 'journal' ? COPY[language].journalHeading : copy.title;
  assert.equal(compact(metadata.headings[0]), expectedHeading);
  const expectedTitle = route.type === 'home' ? COPY[language].title : route.type === 'journal' ? COPY[language].journalTitle : `${copy.title.replace(/\.$/, '')} | JC Analytics`;
  assert.deepEqual(metadata.titles, [expectedTitle], 'One title in the current language');
  assert.equal(metadata.descriptions.length, 1, 'One meta description');
  if (copy) assert.equal(metadata.descriptions[0], copy.summary, 'Document description matches its language');
  else assert.ok(metadata.descriptions[0].startsWith(route.type === 'home' ? COPY[language].descriptionStart : COPY[language].journalDescription));
  assert.ok(metadata.robots?.includes('index') && !metadata.robots.includes('noindex'), 'Public route permits indexing');
  assert.equal(metadata.ogUrl, url);
  assert.equal(metadata.ogType, route.type === 'article' ? 'article' : 'website');
  const graph = metadata.structured.flatMap((item) => item['@graph'] || [item]);
  const webpage = graph.filter((item) => ['WebPage', 'CollectionPage'].includes(item['@type']));
  assert.equal(webpage.length, 1, 'One WebPage in valid JSON-LD');
  assert.equal(webpage[0].inLanguage, language);
  assert.equal(webpage[0].url, url);
  assert.equal(webpage[0].name, metadata.titles[0]);
  assert.equal(webpage[0].description, metadata.descriptions[0]);
  assert.ok(graph.some((item) => item['@type'] === 'Organization'), 'Organization data is present');
  // A collection may link to Articles in its ItemList; its own entity is not an Article.
  const articleSchema = graph.filter((item) => item['@type'] === 'Article');
  assert.equal(articleSchema.length, route.type === 'article' ? 1 : 0, 'Only article pages declare their own Article entity');
  if (route.type === 'article') {
    const article = articleSchema[0];
    assert.equal(article.url, url);
    assert.equal(article.headline, copy.title);
    assert.equal(article.description, copy.summary);
    assert.equal(article.inLanguage, language);
    assert.equal(article.datePublished, route.data.published);
    assert.equal(article.author?.name, 'JC Analytics');
    assert.equal(article.mainEntityOfPage?.['@id'], webpage[0]['@id']);
    assert.ok(article.publisher && article.wordCount >= 400, 'Article carries authorship and substantive content');
  }
  if (route.type === 'service') {
    const services = graph.filter((item) => item['@type'] === 'Service');
    assert.equal(services.length, 1);
    assert.equal(services[0].name, copy.title);
    assert.equal(services[0].url, url);
    assertOffers(services, language, SERVICE_OFFERS[route.data.id]?.packages ?? []);
  }
  if (route.type === 'home') {
    // Cada servicio de la portada apunta a su página (antes: anclas que la portada ya no tiene).
    const services = graph.filter((item) => item['@type'] === 'Service');
    const servicePages = routes.filter((item) => item.type === 'service' && item.language === language).map((item) => `${PRODUCTION}${item.path}`);
    assert.equal(services.length, servicePages.length, 'The home page declares one Service per category page');
    assert.deepEqual(services.map((item) => item.url).sort(), [...servicePages].sort(), 'Each Service points to its own category page');
    assertOffers(services, language, Object.keys(SERVICE_PRICING));
    // Las preguntas que lee una máquina son las seis que se ven.
    const faq = graph.filter((item) => item['@type'] === 'FAQPage');
    assert.equal(faq.length, 1, 'The home page declares its FAQ once');
    assert.equal(faq[0].mainEntity.length, 6, 'The six visible questions are declared');
    assert.equal(faq[0].mainEntity[0].name, COPY[language].faqQuestion);
    assert.ok(faq[0].mainEntity.every((item) => item['@type'] === 'Question' && item.acceptedAnswer?.text), 'Every declared question carries its answer');
  }
}

// Los paquetes que lee una máquina son los del tarifario: las mismas claves, una vez cada una, con su precio
// sin IVA y su plazo en el idioma de la página. Antes ningún candado miraba el catálogo de ofertas: se podía
// publicar un precio distinto del visible con la suite en verde (revisión de código, nov. 2026).
function assertOffers(services, language, expectedKeys) {
  const offers = services.flatMap((item) => item.hasOfferCatalog?.itemListElement ?? []);
  const keyOf = (offer) => new URL(offer.url).searchParams.get('p');
  assert.deepEqual(offers.map(keyOf).sort(), [...expectedKeys].sort(), 'Every published package is declared exactly once as an Offer');
  for (const offer of offers) {
    const key = keyOf(offer);
    const pricing = SERVICE_PRICING[key];
    assert.equal(offer.name, language === 'es' ? pricing.label : pricing.label_en, `${key}: the Offer carries the price-list name`);
    assert.equal(offer.price, pricing.base_usd, `${key}: the Offer price is the published price`);
    assert.equal(offer.priceCurrency, 'USD');
    assert.equal(offer.priceSpecification?.price, pricing.base_usd, `${key}: the price specification repeats the published price`);
    assert.equal(offer.priceSpecification?.valueAddedTaxIncluded, false, `${key}: the published price is declared before VAT`);
    assert.ok(new URL(offer.url).hash === '#oferta' && offer.url.startsWith(PRODUCTION), `${key}: the Offer opens its package on its category page`);
    const lead = offer.deliveryLeadTime;
    if (pricing.days_min) {
      // Días hábiles: no llevan el código DAY, que es día calendario.
      assert.deepEqual([lead.minValue, lead.maxValue, lead.unitCode, lead.unitText], [pricing.days_min, pricing.days_max, undefined, language === 'es' ? 'días hábiles' : 'business days'], `${key}: delivery in business days`);
    } else {
      assert.deepEqual([lead.minValue, lead.maxValue, lead.unitCode, lead.unitText], [pricing.weeks_min, pricing.weeks_max, 'WEE', language === 'es' ? 'semanas' : 'weeks'], `${key}: delivery in weeks`);
    }
  }
}

async function checkSelector(page, language, scope = 'header', route = homeRoute(language)) {
  for (const code of ['en', 'es']) {
    const result = await page.$eval(`${scope} .language-switcher a[lang="${code}"]`, (node) => {
      const rect = node.getBoundingClientRect();
      const center = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      return {
        path: new URL(node.href).pathname, current: node.getAttribute('aria-current'),
        visible: rect.width > 0 && rect.height > 0 && rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight,
        clickable: center === node || node.contains(center), label: node.getAttribute('aria-label'),
      };
    });
    assert.equal(result.path, alternatePath(route, code));
    assert.equal(result.label, code === 'en' ? 'English' : 'Español');
    assert.equal(result.current, code === language ? 'true' : null);
    assert.ok(result.visible && result.clickable, `Language ${code} is visible and unobstructed in ${scope}`);
  }
}

async function checkWidth(page) {
  const sizes = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    html: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  assert.ok(Math.max(sizes.html, sizes.body) <= sizes.viewport + 1, `Horizontal overflow: ${JSON.stringify(sizes)}`);
}

async function checkAssets(page, origin, javascript = true) {
  // Visit each section so native lazy images and in-view content are exercised.
  for (const section of await page.$$('main section[id], footer')) {
    await section.scrollIntoView();
    // Page callbacks do not run with scripting disabled; keep that check outside the page.
    if (javascript) await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
    else await delay(25);
    await checkWidth(page);
  }
  // Nested lazy images can sit below a very tall section's first viewport.
  for (const image of await page.$$('img')) {
    if (await image.isVisible()) {
      await image.scrollIntoView();
      const deadline = Date.now() + TIMEOUT;
      while (!await image.evaluate((node) => node.complete) && Date.now() < deadline) await delay(50);
      assert.ok(await image.evaluate((node) => node.naturalWidth > 0), `Broken image: ${await image.evaluate((node) => node.currentSrc || node.src)}`);
    }
  }
  const assets = await page.evaluate(() => [
    ...Array.from(document.querySelectorAll('img[src]'), (node) => ({ url: node.currentSrc || node.src, image: true })),
    ...Array.from(document.querySelectorAll('script[src]'), (node) => ({ url: node.src, image: false })),
    ...Array.from(document.querySelectorAll('link[rel="stylesheet"], link[rel="modulepreload"], link[rel="icon"], link[rel="apple-touch-icon"]'), (node) => ({ url: node.href, image: false })),
  ]);
  assert.ok(assets.length > 3, 'The built page should reference its actual assets');
  for (const asset of assets) {
    const url = new URL(asset.url);
    if (['data:', 'blob:'].includes(url.protocol)) continue;
    if (asset.image) assert.equal(url.origin, origin, `Content image must be local for this offline check: ${asset.url}`);
    // Fonts and analytics may reference external hosts; interception blocks those.
    if (url.origin !== origin) continue;
    assert.ok(!url.pathname.startsWith('/sites/'), 'Private project screenshots must not appear as public assets');
    if (checkedAssets.has(asset.url)) continue;
    const response = await fetch(asset.url, { method: 'HEAD' });
    assert.equal(response.status, 200, `Missing asset: ${asset.url}`);
    assert.ok(!response.headers.get('content-type')?.includes('text/html'), `Asset unexpectedly returned HTML: ${asset.url}`);
    checkedAssets.add(asset.url);
  }
}

async function clickButtonText(page, selector, label) {
  for (const button of await page.$$(selector)) {
    if (compact(await button.evaluate((node) => node.textContent)) === label) {
      await button.click();
      return button;
    }
  }
  throw new Error(`Button not found: ${label} (${selector})`);
}

async function checkContact(page, language) {
  const copy = COPY[language];
  await page.evaluate(() => {
    window.__testContactIntent = null;
    window.addEventListener('jca:contact-intent', (event) => { window.__testContactIntent = event.detail; }, { once: true });
  });
  // Use the real CTA («¿Sin WhatsApp? Dejanos tu contacto»): it asks for the form and chooses no need on the
  // visitor's behalf. Before the November 2026 audit every generic entry arrived as «Sistema / backend».
  await page.click('.studio-start');
  await page.waitForFunction(() => window.__testContactIntent !== null);
  assert.deepEqual(await page.evaluate(() => ({ need: window.__testContactIntent.need, form: window.__testContactIntent.form })), { need: null, form: true });
  await page.waitForSelector('#contacto form[data-mode="form"] #contacto-telefono');
  assert.equal(await page.$('.contact-selection strong'), null, 'Nothing is preselected');
  assert.equal(await page.$$eval('.contact-needs button[aria-pressed="true"]', (nodes) => nodes.length), 0);
  // Back to the phone default (WhatsApp with the message ready) to exercise that path first.
  await page.click('.contact-callback__button');
  await page.waitForSelector('#contacto form[data-mode="whatsapp"]');
  assert.equal(await page.$('#contacto-telefono'), null, 'On a phone the contact fields only appear when the visitor asks to be written to');
  const chosen = await clickButtonText(page, '.contact-needs button', copy.website);
  assert.equal(await chosen.evaluate((node) => node.getAttribute('aria-pressed')), 'true');
  assert.equal(compact(await page.$eval('.contact-selection strong', (node) => node.textContent)), copy.website);
  assert.ok(compact(await page.$eval('label[for="contacto-objetivo"]', (node) => node.textContent)).includes(copy.objective));
  assert.ok(compact(await page.$eval('label[for="contacto-nombre"]', (node) => node.textContent)).includes(copy.name));
  await page.type('#contacto-nombre', 'Browser QA');
  await page.type('#contacto-objetivo', 'Test project scope (qa-private@example.invalid)');
  const email = new URL(await page.$eval('.contact-email a', (node) => node.href));
  assert.equal(email.protocol, 'mailto:');
  assert.equal(email.searchParams.get('subject'), `${copy.emailPrefix} ${copy.website}`);
  const body = email.searchParams.get('body');
  assert.ok(body.startsWith(copy.messagePrefix));
  assert.ok(body.includes(copy.website) && body.includes('Browser QA') && body.includes('Test project scope'));
  await checkContactTelemetry(page, language, body);
  await checkCallbackLead(page, language);
}

// Reemplaza gtag, fbq, oaiq y window.open por registros en memoria: nada sale a las plataformas de anuncios
// y la prueba puede leer exactamente qué se les habría enviado.
async function stubAdPixels(page) {
  await page.evaluate(() => {
    window.__ads = { gtag: [], fbq: [], oaiq: [], opens: [] };
    window.gtag = (...args) => window.__ads.gtag.push(args);
    window.fbq = (...args) => window.__ads.fbq.push(args);
    window.oaiq = (...args) => window.__ads.oaiq.push(args);
    window.open = (...args) => { window.__ads.opens.push(args); return null; };
  });
}
const readAdPixels = (page) => page.evaluate(() => window.__ads);
// Ningún clic a WhatsApp sale del navegador de prueba. El listener va en `window`, al final del burbujeo: los de
// la página (en `document`) ya leyeron el clic tal como venía, y recién ahí se anota si llegó detenido
// (`__waClicks`) y se anula la navegación. Se llama antes de navegar.
const holdWhatsApp = (page) => page.evaluateOnNewDocument(() => {
  window.__waClicks = [];
  window.addEventListener('click', (event) => {
    if (!event.target.closest?.('a[href^="https://wa.me/"]')) return;
    window.__waClicks.push(event.defaultPrevented);
    event.preventDefault();
  });
});
const countOf = (list, name) => list.filter((entry) => entry[1] === name).length;
const ADS_ACCOUNT = 'AW-18237462818';
const ADS_WHATSAPP = `${ADS_ACCOUNT}/5C2RCMSwvaIdEKKypvhD`;
// Las conversiones de Google Ads se deduplican 3 s: entre dos acciones distintas de una prueba hay que esperar.
const CONVERSION_GAP_MS = 3200;

// Una consulta aceptada por el portal llega a las tres plataformas como consulta captada, sin datos personales.
function assertLeadCaptured(ads, { form, section, packageId, value, conversions = 1 }) {
  assert.ok(ads.gtag.some(([, name, p]) => name === 'lead_submit' && p.form_id === form && p.section_id === (section ?? form) && (packageId ? p.package_id === packageId : !p.package_id)), `Google tag records lead_submit for ${form}`);
  const sent = ads.gtag.filter(([, name]) => name === 'conversion');
  assert.equal(sent.length, conversions, `One Google Ads conversion per accepted inquiry (${form})`);
  const last = sent.at(-1)[2];
  assert.ok(last.send_to.startsWith(`${ADS_ACCOUNT}/`) && last.value === value && last.currency === 'USD' && last.transport_type === 'beacon', 'The form conversion carries the account, the value and beacon transport');
  assert.ok(ads.fbq.some(([, name, p]) => name === 'Lead' && p.content_name === (packageId ?? form)), 'Meta receives Lead when the person leaves a contact');
  assert.ok(ads.oaiq.some(([, name, , extra]) => name === 'lead_created' && /^form_/.test(extra?.event_id)), 'ChatGPT Ads receives lead_created with a form event id');
  const serialized = JSON.stringify(ads);
  for (const privateValue of ['8888-1234', 'Browser QA', 'qa@example.com']) assert.ok(!serialized.includes(privateValue), 'Ad platforms never receive personal data');
}

// «Prefiero que me contacten»: en celular muestra WhatsApp y correo, exige uno de los dos (el aviso sale junto
// al campo y lleva el foco ahí), deja la consulta en el portal del equipo y, cuando el portal la acepta,
// muestra la confirmación con lo que sigue y cuenta como consulta captada en las plataformas de anuncios.
async function checkCallbackLead(page, language) {
  await page.click('.contact-callback__button');
  await page.waitForSelector('#contacto form[data-mode="form"] #contacto-telefono');
  assert.ok(!(await page.$eval('#contacto-sitio', (node) => node.closest('.contact-trap').getBoundingClientRect().left >= 0)), 'The bot trap is off screen');
  await page.$eval('#contacto form', (form) => form.requestSubmit());
  await page.waitForFunction(() => document.querySelector('#contacto-reach-error').textContent.trim() !== '' && document.activeElement?.id === 'contacto-telefono');
  const problem = await page.$eval('#contacto-reach-error', (node) => ({ text: node.textContent, role: node.getAttribute('role') }));
  assert.ok(problem.text.includes(language === 'es' ? 'WhatsApp o tu correo' : 'WhatsApp or your email') && problem.role === 'alert', 'Without a contact the request is not sent and the error names the missing detail');
  assert.equal(await page.$eval('#contacto-telefono', (node) => node.getAttribute('aria-invalid')), 'true', 'The missing field is marked after trying to send');
  assert.equal(page.ingest.filter((r) => r.path === '/ingest/lead').length, 0);
  await page.type('#contacto-telefono', '8888-1234');
  assert.equal(await page.$eval('#contacto-reach-error', (node) => node.textContent), '', 'The error clears as soon as the visitor corrects the field');
  await stubAdPixels(page);
  await delay(CONVERSION_GAP_MS); // la conversión del clic a WhatsApp (checkContactTelemetry) fue hace instantes
  await page.$eval('#contacto form', (form) => form.requestSubmit());
  await page.waitForSelector('#contacto .contact-sent');
  const sent = await page.$eval('#contacto .contact-sent', (node) => ({ text: node.innerText, steps: node.querySelectorAll('ol li').length, focused: node.contains(document.activeElement), status: Boolean(node.querySelector('[role="status"]')) }));
  assert.ok(sent.text.includes('24') && sent.steps === 3 && sent.status, 'The confirmation says when the team replies and what comes next');
  await page.waitForFunction(() => document.querySelector('#contacto .contact-sent h3') === document.activeElement);
  // El formulario largo se reemplaza por un bloque corto: sin recolocar, «¡Listo!» quedaba fuera de pantalla.
  await delay(300);
  const sentTop = await page.$eval('#contacto .contact-sent h3', (node) => node.getBoundingClientRect().top);
  assert.ok(sentTop >= 56 && sentTop < 700, `The confirmation is on screen after sending (title at ${Math.round(sentTop)} px)`);
  const [lead] = page.ingest.filter((r) => r.path === '/ingest/lead').map((r) => r.body);
  assert.equal(lead.channel, 'devolucion');
  assert.equal(lead.phone, '8888-1234');
  assert.equal(lead.name, 'Browser QA');
  assert.equal(lead.need, 'Página web', 'The portal receives the internal need value in Spanish');
  assert.ok(lead.message.includes('Test project scope'), 'The visitor’s own words reach the portal');
  assert.equal(lead.website, '', 'The bot trap stays empty for people');
  assert.ok(/^[a-z0-9]{16,40}$/.test(lead.sid) && lead.lang === language && lead.elapsed >= 1500);
  assertLeadCaptured(await readAdPixels(page), { form: 'contacto', value: 10 });
}

// Computadora con mouse (sin automatización): los botones de WhatsApp abren el formulario corto, la consulta
// llega al portal y las plataformas de anuncios reciben la conversión al aceptarla, no al hacer clic. WhatsApp
// Web queda como enlace directo (data-wa-direct). Se fuerza navigator.webdriver=false porque el sitio trata a
// los navegadores automatizados como celular para que el HTML estático no cambie.
async function checkDesktopLeadFlow(browser, origin, language) {
  const copy = COPY[language];
  const pricing = SERVICE_PRICING.pagina_web;
  const packageName = language === 'es' ? pricing.label : pricing.label_en;
  const route = routes.find((item) => item.type === 'service' && item.data.id === 'process-automation' && item.language === language);
  const offer = SERVICE_OFFERS[route.data.id];
  const servicePricing = SERVICE_PRICING[offer.packages[0]];
  const servicePackage = language === 'es' ? servicePricing.label : servicePricing.label_en;
  const sendLabel = language === 'es' ? 'Enviar consulta' : 'Send inquiry';
  const { page, verifyErrors } = await openPage(browser, origin, 1440);
  try {
    await page.evaluateOnNewDocument(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); });
    await navigate(page, `${origin}${copy.path}?wa_line=a`);
    await page.waitForFunction((text) => document.querySelector('.studio-wa')?.textContent.includes(text), {}, language === 'es' ? 'Pedir cotización' : 'Request a quote');
    assert.ok(!(await page.$eval('#paquetes .package-card__buy', (node) => node.textContent)).includes('WhatsApp'), 'On a computer the package button no longer promises WhatsApp');
    assert.equal(await page.$eval('#contacto form', (node) => node.dataset.mode), 'form');
    assert.ok(compact(await page.$eval('#contacto .contact-submit', (node) => node.textContent)).includes(sendLabel), 'The contact form sends the inquiry instead of opening WhatsApp Web');
    const alternative = await page.$eval('#contacto .contact-callback__button', (node) => ({ tag: node.tagName, origin: new URL(node.href).origin, direct: node.hasAttribute('data-wa-direct') }));
    assert.deepEqual(alternative, { tag: 'A', origin: 'https://wa.me', direct: true }, 'WhatsApp Web stays available as a direct link');
    await stubAdPixels(page);

    // 1. «Lo quiero» en un paquete abre el formulario corto con el mensaje ya armado.
    assert.equal(await page.$eval('#paquetes .package-card__buy', (node) => node.dataset.package), 'pagina_web');
    await page.click('#paquetes .package-card__buy');
    await page.waitForSelector('dialog.lead-dialog[open] form[data-track="contacto-rapido"]');
    assert.equal(page.url(), `${origin}${copy.path}?wa_line=a`, 'The click stays on the page');
    const message = await page.$eval('#rapido-mensaje', (node) => node.value);
    assert.ok(message.includes(packageName) && message.includes(`$${pricing.base_usd}`), 'The drafted WhatsApp message becomes the inquiry text');
    assert.ok((await page.$eval('.lead-dialog__package', (node) => node.textContent)).includes(packageName), 'The dialog names the package being requested');
    let ads = await readAdPixels(page);
    assert.equal(ads.opens.length, 0, 'No WhatsApp Web window on a computer');
    assert.deepEqual(ads.gtag.filter(([, name]) => name === 'conversion'), [], 'A click that opens the form is not a conversion yet');
    assert.ok(ads.gtag.some(([, name, p]) => name === 'contact_click' && p.contact_channel === 'whatsapp' && p.cta_mode === 'form' && p.package_id === 'pagina_web' && p.section_id === 'paquetes'), 'The click is recorded as intent with cta_mode=form');
    assert.ok(ads.fbq.some(([, name]) => name === 'Contact'), 'Meta still receives the Contact intent');
    await page.click('.lead-dialog__submit');
    await page.waitForFunction(() => document.querySelector('.lead-dialog__status')?.dataset.tone === 'bad');
    assert.equal(page.ingest.filter((r) => r.path === '/ingest/lead').length, 0, 'Without a contact nothing is sent');
    await page.type('#rapido-nombre', 'Browser QA');
    await page.type('#rapido-telefono', '8888-1234');
    await delay(1600); // el portal descarta envíos llenados en menos de 1,5 s (bots)
    await page.click('.lead-dialog__submit');
    await page.waitForSelector('.lead-dialog__panel[data-status="sent"]');
    assert.ok((await page.$eval('#lead-dialog-title', (node) => node.textContent)).includes('24'));
    const [lead] = page.ingest.filter((r) => r.path === '/ingest/lead').map((r) => r.body);
    assert.equal(lead.channel, 'paquete');
    assert.equal(lead.package, pricing.label, 'The portal always receives the Spanish package name, also from the English page');
    assert.equal(lead.need, 'Página web', 'The portal receives the internal need value in Spanish');
    assert.equal(lead.page, copy.path);
    assert.equal(lead.phone, '8888-1234');
    assert.equal(lead.name, 'Browser QA');
    assert.equal(lead.website, '', 'The bot trap stays empty for people');
    assert.ok(lead.message.includes(packageName), 'The inquiry keeps the drafted message');
    assert.ok(/^[a-z0-9]{16,40}$/.test(lead.sid) && lead.lang === language && lead.elapsed >= 1500);
    assertLeadCaptured(await readAdPixels(page), { form: 'contacto-rapido', section: 'paquetes', packageId: 'pagina_web', value: pricing.base_usd });
    const webLink = await page.$eval('.lead-dialog__wa', (node) => ({ origin: new URL(node.href).origin, direct: node.hasAttribute('data-wa-direct'), pkg: node.dataset.package }));
    assert.deepEqual(webLink, { origin: 'https://wa.me', direct: true, pkg: 'pagina_web' }, 'After sending, WhatsApp Web is still one click away');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('dialog.lead-dialog').open);

    // 2. El formulario de contacto envía la consulta al portal en vez de abrir WhatsApp Web.
    await page.type('#contacto-nombre', 'Browser QA');
    await page.type('#contacto-telefono', '8888-1234');
    await delay(CONVERSION_GAP_MS);
    await page.$eval('#contacto form', (form) => form.requestSubmit());
    await page.waitForSelector('#contacto .contact-sent');
    assert.ok((await page.$eval('#contacto .contact-sent', (node) => node.innerText)).includes('24'), 'The confirmation says when the team replies');
    await delay(300);
    const sentTop = await page.$eval('#contacto .contact-sent h3', (node) => node.getBoundingClientRect().top);
    assert.ok(sentTop >= 64 && sentTop < 700, `The confirmation is on screen after sending, not behind the fixed bar (title at ${Math.round(sentTop)} px)`);
    const contactLead = page.ingest.filter((r) => r.path === '/ingest/lead').map((r) => r.body)[1];
    assert.equal(contactLead.channel, 'formulario');
    assert.equal(contactLead.need, 'Otro', 'With nothing chosen the inquiry arrives as «Otro», not as a service nobody picked');
    assert.equal(contactLead.phone, '8888-1234');
    ads = await readAdPixels(page);
    assert.equal(ads.opens.length, 0, 'Submitting the contact form on a computer never opens WhatsApp Web');
    assertLeadCaptured(ads, { form: 'contacto', value: 10, conversions: 2 });

    // 3. Un enlace directo (data-wa-direct) no abre el formulario: sigue a WhatsApp Web. Como esta persona ya
    //    envió su consulta, el clic queda registrado como intención (after_lead) y no suma otra conversión.
    await delay(CONVERSION_GAP_MS);
    await page.evaluate(() => document.addEventListener('click', (event) => { if (event.target.closest?.('[data-wa-direct]')) event.preventDefault(); }));
    await page.click('#contacto .contact-callback__button');
    await delay(300);
    assert.ok(!(await page.$eval('dialog.lead-dialog', (node) => node.open)), 'Direct links do not open the form');
    ads = await readAdPixels(page);
    assert.equal(ads.gtag.filter(([, name]) => name === 'conversion').length, 2, 'A WhatsApp click after an accepted inquiry is the same person: no second conversion');
    assert.ok(ads.gtag.some(([, name, p]) => name === 'contact_click' && p.contact_channel === 'whatsapp' && !p.cta_mode && p.after_lead === true && p.section_id === 'contacto'));

    // 4. Página de servicio: «Lo quiero» abre el formulario con la necesidad, el paquete y lo marcado.
    await navigate(page, `${origin}${route.path}?wa_line=a`);
    await page.waitForFunction(() => { const link = document.querySelector('#oferta .so-wa'); return link && !link.textContent.includes('WhatsApp'); });
    await stubAdPixels(page);
    await page.click('#senales li:first-child label');
    const signal = offer[language].signals[0];
    await page.click('#oferta .so-wa');
    await page.waitForSelector('dialog.lead-dialog[open]');
    const serviceMessage = await page.$eval('#rapido-mensaje', (node) => node.value);
    assert.ok(serviceMessage.includes(signal) && serviceMessage.includes(servicePackage), 'Ticked signals and the package travel into the inquiry');
    await page.type('#rapido-correo', 'qa@example.com');
    await delay(1600);
    await page.click('.lead-dialog__submit');
    await page.waitForSelector('.lead-dialog__panel[data-status="sent"]');
    const serviceLead = page.ingest.filter((r) => r.path === '/ingest/lead').map((r) => r.body).at(-1);
    assert.equal(serviceLead.channel, 'paquete');
    assert.equal(serviceLead.need, route.data.need, 'The portal receives the service need in Spanish');
    assert.equal(serviceLead.package, servicePricing.label, 'The portal receives the Spanish package name');
    assert.equal(serviceLead.page, route.path);
    assert.equal(serviceLead.email, 'qa@example.com');
    assert.ok(serviceLead.message.includes(signal));
    assertLeadCaptured(await readAdPixels(page), { form: 'contacto-rapido', section: 'oferta', packageId: offer.packages[0], value: servicePricing.base_usd });
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('dialog.lead-dialog').open);
    // El formulario de la página: «Enviar consulta» manda y WhatsApp Web es la alternativa directa.
    assert.equal(await page.$eval('.so-form__actions', (node) => node.dataset.mode), 'form');
    assert.ok(compact(await page.$eval('.so-form__actions .so-callback--primary', (node) => node.textContent)).includes(sendLabel));
    assert.ok(await page.$('.so-form__actions .so-wa[data-wa-direct]'), 'The service form keeps WhatsApp Web as a direct link');
    assert.ok(await page.$eval('.so-toc-card .so-wa', (node) => !node.textContent.includes('WhatsApp')), 'The contents card asks for a quote without promising WhatsApp');
    await checkWidth(page);
    verifyErrors();
    console.log(`[check-site] PASS desktop lead flow ${language}: WhatsApp buttons open the short form, inquiries reach the portal, conversions fire on acceptance and WhatsApp Web stays one click away`);
  } finally {
    await page.close();
  }
}

// Medición propia: secciones, scroll y clics llegan agrupados al portal, sin datos personales.
async function checkSiteTracking(browser, origin) {
  const { page, verifyErrors } = await openPage(browser, origin, 1440);
  try {
    // Chromium no expone el cuerpo de un beacon a la interceptación: se lee al enviarlo.
    await page.evaluateOnNewDocument(() => {
      window.__JC_TRACK_TEST = true;
      window.__beacons = [];
      navigator.sendBeacon = (url, data) => {
        data.text().then((text) => window.__beacons.push({ path: new URL(url).pathname, body: JSON.parse(text) }));
        return true;
      };
    });
    await navigate(page, `${origin}/`);
    await page.waitForFunction(() => performance.now() > 3500);
    await page.$eval('#paquetes', (node) => node.scrollIntoView({ block: 'start' }));
    await delay(1200);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight * 0.3));
    await delay(400);
    await page.$eval('#paquetes', (node) => node.scrollIntoView({ block: 'start' }));
    await delay(400);
    // Una elección en una lista también es una señal: llega como clic, con la clave elegida y sin texto de la persona.
    await page.select('#servicios select[data-track-label="Caso · negocio"]', 'restaurante');
    await page.evaluate(() => {
      document.addEventListener('click', (event) => event.preventDefault(), true);
      document.querySelector('#paquetes .package-card__buy').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      document.querySelector('#contacto-nombre').focus();
      document.querySelector('#contacto-nombre').value = 'Persona Privada';
      // «Empezado» = la persona escribió algo (antes bastaba enfocar un campo).
      document.querySelector('#contacto-nombre').dispatchEvent(new Event('input', { bubbles: true }));
      window.dispatchEvent(new Event('pagehide'));
    });
    await page.waitForFunction(() => window.__beacons.length > 0);
    const batches = (await page.evaluate(() => window.__beacons)).filter((r) => r.path === '/ingest/events').map((r) => r.body);
    assert.ok(batches.length >= 1, 'The tracker sends its batch to the portal');
    const events = batches.flatMap((b) => b.events);
    const has = (fn, message) => assert.ok(events.some(fn), message);
    has((e) => e.t === 'view' && e.p === '/', 'Page view');
    has((e) => e.t === 'section' && e.s === 'paquetes' && e.v >= 300, 'Time spent in the pricing section');
    has((e) => e.t === 'click' && e.k === 'package' && e.s === 'paquetes' && e.l, 'Package click with its label and section');
    has((e) => e.t === 'scroll' && e.v >= 25, 'Scroll depth');
    has((e) => e.t === 'form_start' && e.k === 'contacto', 'Form start');
    has((e) => e.t === 'click' && e.k === 'button' && e.l === 'Caso · negocio · restaurante' && e.s === 'servicios', 'A choice in the sentence builder reaches the portal with its key');
    assert.ok(batches.every((b) => /^[a-z0-9]{16,40}$/.test(b.sid) && b.device === 'desktop'));
    assert.ok(!JSON.stringify(batches).includes('Persona Privada'), 'Typed values never leave the browser');
    verifyErrors();
    console.log('[check-site] PASS site tracking: views, section time, scroll, clicks and forms reach the portal without personal data');
  } finally {
    await page.close();
  }
}

async function checkContactTelemetry(page, language, preparedBody) {
  await page.evaluate(() => {
    const state = {
      originalGtag: window.gtag,
      originalOpen: window.open,
      events: [],
      opens: [],
      preventEmailNavigation: (event) => {
        if (event.target.closest?.('#contacto .contact-email a')) event.preventDefault();
      },
    };
    window.__testContactTelemetry = state;
    window.gtag = (...args) => state.events.push(args);
    // Exercise the real submit handler while preventing any popup or external navigation.
    window.open = (...args) => { state.opens.push(args); return null; };
    // Keep propagation intact so document-level analytics receives the real click.
    document.addEventListener('click', state.preventEmailNavigation, true);
  });
  try {
    await page.$eval('#contacto form', (form) => form.requestSubmit());
    await page.waitForFunction(() => window.__testContactTelemetry.events.length > 0);
    const submission = await page.evaluate(() => ({
      events: window.__testContactTelemetry.events,
      opens: window.__testContactTelemetry.opens,
    }));
    assert.equal(submission.opens.length, 1, 'One prepared WhatsApp window attempt');
    const [href, target, options] = submission.opens[0];
    const whatsapp = new URL(href);
    assert.equal(whatsapp.origin, 'https://wa.me');
    assert.equal(whatsapp.pathname, '/50670330596');
    assert.equal(whatsapp.searchParams.get('text'), preparedBody, 'WhatsApp uses the translated, populated message');
    assert.equal(target, '_blank');
    assert.ok(options.includes('noopener') && options.includes('noreferrer'));
    const event = (channel) => ['event', 'contact_click', {
      contact_channel: channel,
      site_language: language,
      section_id: 'contacto',
      traffic_source: 'directo',
      ...(channel === 'email' ? {} : { contact_line: 'a' }),
    }];
    const conversion = ['event', 'conversion', { send_to: 'AW-18237462818/5C2RCMSwvaIdEKKypvhD', value: 10, currency: 'USD', transport_type: 'beacon' }];
    assert.deepEqual(submission.events, [event('whatsapp'), conversion], 'Submit tracks channel, language, section and line, then one Ads conversion');

    const beforeEmail = page.url();
    await page.click('#contacto .contact-email a');
    await page.waitForFunction(() => window.__testContactTelemetry.events.length >= 3);
    const events = await page.evaluate(() => window.__testContactTelemetry.events);
    const emailEvent = event('email');
    emailEvent[2] = { contact_channel: 'email', cta_id: 'Contacto · Correo', site_language: language, section_id: 'contacto', traffic_source: 'directo' };
    assert.deepEqual(events, [event('whatsapp'), conversion, emailEvent], 'Email click records the correct channel and its stable button id exactly once');
    assert.equal(page.url(), beforeEmail, 'Email navigation stays suppressed in the check');
    const serialized = JSON.stringify(events);
    for (const privateValue of ['Browser QA', 'qa-private@example.invalid', 'Test project scope', preparedBody]) {
      assert.ok(!serialized.includes(privateValue), 'Analytics must exclude personal and free-text form values');
    }
  } finally {
    await page.evaluate(() => {
      const state = window.__testContactTelemetry;
      window.gtag = state.originalGtag;
      window.open = state.originalOpen;
      document.removeEventListener('click', state.preventEmailNavigation, true);
      delete window.__testContactTelemetry;
    });
  }
}

async function checkMenu(page, language) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.click('header button[aria-controls="menu-movil"]');
  await page.waitForSelector('#menu-movil', { visible: true });
  assert.equal(await page.$eval('header button[aria-controls="menu-movil"]', (node) => node.getAttribute('aria-expanded')), 'true');
  await checkSelector(page, language, '#menu-movil');
  await checkWidth(page);
  await page.click('#menu-movil .jca-menu-button--close');
  await page.waitForSelector('#menu-movil', { hidden: true });
  assert.equal(await page.$eval('header button[aria-controls="menu-movil"]', (node) => node.getAttribute('aria-expanded')), 'false');
  assert.equal(await page.$eval('main', (node) => node.inert), false, 'Closing menu restores page interaction');
}

// Each line of the hero headline must end inside its mask: the italic line was cut from 1600 px up until 3 November 2026.
async function heroTitleOverflow(page) {
  await page.evaluate(() => document.fonts.ready);
  return page.$$eval('#hero-title > span > span', (blocks) => Math.max(...blocks.map((block) => {
    const range = document.createRange();
    range.selectNodeContents(block);
    return Math.max(...[...range.getClientRects()].map((rect) => rect.right)) - block.getBoundingClientRect().right;
  })));
}

async function checkVisibleText(page, selectors) {
  for (const selector of selectors) {
    assert.ok(await page.$eval(selector, (node) => {
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      let found = false;
      while (walker.nextNode()) {
        if (!walker.currentNode.textContent.trim()) continue;
        found = true;
        for (let current = walker.currentNode.parentElement; current; current = current.parentElement) {
          const style = getComputedStyle(current);
          if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
        }
      }
      return found && node.getBoundingClientRect().height > 0;
    }), `${selector} text must remain visible without JavaScript`);
  }
}

async function checkDiscussion(page, route) {
  const details = await page.$$('#discussion details');
  assert.equal(details.length, 3, 'Three honest discussion prompts');
  for (const [index, detail] of details.entries()) {
    assert.ok(compact(await detail.evaluate((node) => node.querySelector('summary').textContent)).includes(route.data[route.language].discussion[index]));
  }
  await page.click('#discussion details:first-of-type summary');
  assert.equal(await details[0].evaluate((node) => node.open), true, 'Native discussion opens without JavaScript');
  assert.ok(await page.$eval('#discussion details:first-of-type p', (node) => node.getBoundingClientRect().height > 0));
  await page.click('#discussion details:first-of-type summary');
  assert.equal(await details[0].evaluate((node) => node.open), false, 'Native discussion closes without JavaScript');
}

async function checkStaticToolStyles(page, tool, width) {
  const styles = await page.evaluate((kind) => {
    const card = document.getElementById(kind);
    const grid = card.querySelector(kind === 'list-reconciler' ? '.list-reconciler__inputs' : '.retry-lab__scenarios');
    const style = getComputedStyle(card);
    const gridStyle = getComputedStyle(grid);
    const controls = Array.from(card.querySelectorAll('button, textarea'), (node) => ({
      height: node.getBoundingClientRect().height,
      width: node.getBoundingClientRect().width,
    }));
    return {
      background: style.backgroundColor,
      radius: parseFloat(style.borderTopLeftRadius),
      padding: parseFloat(style.paddingLeft),
      display: gridStyle.display,
      columns: gridStyle.gridTemplateColumns.split(/\s+/).filter(Boolean).length,
      controls,
      cardWidth: card.getBoundingClientRect().width,
    };
  }, tool);
  assert.ok(!['rgba(0, 0, 0, 0)', 'transparent'].includes(styles.background), `${tool} keeps its painted card without JavaScript`);
  assert.ok(styles.radius >= 16 && styles.padding >= 14, `${tool} card CSS is applied without its JavaScript module`);
  assert.equal(styles.display, 'grid', `${tool} layout stylesheet is present in the static page`);
  const columns = width < 600 ? 1 : tool === 'list-reconciler' ? 2 : 3;
  assert.equal(styles.columns, columns, `${tool} static controls adapt to ${width}px`);
  assert.ok(styles.controls.length >= 3 && styles.controls.every((control) => control.height >= 44 && control.width > 0 && control.width <= styles.cardWidth), `${tool} controls keep visible, usable dimensions without JavaScript`);
}

async function checkStaticRoute(browser, origin, route, snapshots) {
  const { language } = route;
  const { page, verifyErrors } = await openPage(browser, origin, 1440, false);
  try {
    await navigate(page, `${origin}${route.path}`);
    await checkMetadata(page, language, route);
    await checkSelector(page, language, 'header', route);
    await checkVisibleText(page, ['main h1']);
    if (route.type === 'home') {
      assert.ok((await page.$eval('#contacto', (node) => node.innerText)).includes(COPY[language].name));
      await checkVisibleText(page, ['#contacto h2', '#paquetes h2']);
      assert.equal(await page.$('#cotizar'), null, 'The live estimator left the home page (3 November 2026)');
      for (const width of [1440, 1920, 2560]) {
        await page.setViewport({ width, height: 1000, deviceScaleFactor: 1 });
        const overflow = await heroTitleOverflow(page);
        assert.ok(overflow <= 1, `Hero headline fits its column at ${width}px (${Math.round(overflow)}px past the edge)`);
      }
      await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
      const details = await page.$$('#preguntas details');
      assert.ok(details.length >= 2, 'FAQ content must be present in static HTML');
      assert.ok(compact(await details[0].evaluate((node) => node.querySelector('summary').textContent)).includes(COPY[language].faqQuestion));
      assert.ok((await details[0].evaluate((node) => node.querySelector('p').textContent)).includes(COPY[language].faqAnswer));
      await page.click('#preguntas details:first-child summary');
      assert.equal(await details[0].evaluate((node) => node.open), true, 'Native FAQ works without JavaScript');
      assert.ok(await page.$eval('#preguntas details:first-child p', (node) => node.getBoundingClientRect().height > 0));
      const projects = compact(await page.$eval('#trabajo', (node) => node.innerText));
      assert.ok(projects.includes('La Burrada') && projects.includes('Transporte Luz de Luna'), 'Real projects are named in the static HTML');
      assert.ok(projects.includes(language === 'es' ? 'Quiero algo así · WhatsApp' : 'I want something like this · WhatsApp'), 'WhatsApp call to action is present in the visitor’s language');
      // innerText aplica text-transform: los rótulos van en mayúsculas en pantalla.
      const story = projects.toLowerCase();
      assert.ok(story.includes(language === 'es' ? 'el problema' : 'the problem') && story.includes(language === 'es' ? 'lo que construimos' : 'what we built'), 'Each project tells the business problem and what was built');
      const projectImages = await page.$$eval('#trabajo img[src*="/projects/"]', (nodes) => nodes.length);
      assert.ok(projectImages >= PROJECTS.length, 'Every project ships a real screenshot in the static page');
    } else if (route.type === 'journal') {
      const cards = await page.$$eval('#journal-grid [data-article]', (nodes) => nodes.map((node) => node.dataset.article));
      assert.deepEqual(cards.sort(), articles.map((article) => article.id).sort(), 'Every article is browsable without JavaScript');
      assert.ok(await page.$('#insight-search'));
      assert.ok(await page.$('#guide-result a[href]'), 'Static guide provides a useful starting point');
    } else {
      for (const section of route.data[language].sections) {
        const content = compact(await page.$eval(`#${section.id}`, (node) => node.textContent));
        assert.ok(content.includes(section.heading), `Static heading: ${section.id}`);
        for (const paragraph of [...section.paragraphs, ...(section.bullets || [])]) {
          assert.ok(content.includes(compact(paragraph)), `Complete static content: ${route.path} #${section.id}`);
        }
      }
      await checkDiscussion(page, route);
      if (route.type === 'service' && SERVICE_OFFERS[route.data.id]) await checkStaticServiceSales(page, route);
      if (route.data.tool) {
        assert.ok(await page.$('#practical-tool'), 'Practical resource is included in static article HTML');
        assert.ok(await page.$('.document-toc a[href="#practical-tool"]'), 'Practical resource is linked from the article contents');
        await checkVisibleText(page, ['#practical-tool h2']);
      }
    }
    snapshots.set(route.path, await page.evaluate(() => ({
      ids: Array.from(document.querySelectorAll('[id]'), (node) => node.id),
      links: Array.from(document.querySelectorAll('a[href]'), (node) => node.href),
    })));
    await checkAssets(page, origin, false);
    if (route.data?.tool) await checkStaticToolStyles(page, route.data.tool, 1440);
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await checkSelector(page, language, 'header', route);
    await checkAssets(page, origin, false);
    if (route.data?.tool) await checkStaticToolStyles(page, route.data.tool, 390);
    verifyErrors();
    console.log(`[check-site] PASS static ${route.path}: localized SEO, complete content, native details and 1440/390px`);
  } finally {
    await page.close();
  }
}

// Página de servicio sin JavaScript: precio real, señales, calculadora, alcance, portal de clientes,
// ejemplo real, preguntas y formulario propio quedan en el HTML estático.
async function checkStaticServiceSales(page, route) {
  const { language } = route;
  const offer = SERVICE_OFFERS[route.data.id];
  const pricing = SERVICE_PRICING[offer.packages[0]];
  const label = language === 'es' ? pricing.label : pricing.label_en;
  const offerText = compact(await page.$eval('#oferta', (node) => node.innerText));
  assert.ok(offerText.includes(label) && offerText.includes(`$${pricing.base_usd.toLocaleString(language === 'es' ? 'es-CR' : 'en-US')}`), 'The static offer shows the real package and its published price');
  const buy = await page.$eval('#oferta .so-wa', (node) => ({ href: node.href, pkg: node.dataset.package, value: Number(node.dataset.value) }));
  const whatsapp = new URL(buy.href);
  assert.equal(whatsapp.origin, 'https://wa.me', 'The offer is requested with one WhatsApp tap');
  assert.ok(whatsapp.searchParams.get('text').includes(label), 'The WhatsApp message names the package');
  assert.equal(buy.pkg, offer.packages[0], 'Package clicks carry the package key for the ad pixels, the same one the home page uses');
  assert.equal(buy.value, pricing.base_usd);
  assert.equal((await page.$$('#senales input[type="checkbox"]')).length, offer[language].signals.length, 'Every signal is in the static HTML');
  assert.ok(/\d\s?h/.test(await page.$eval('#calculadora .so-calc__result', (node) => node.innerText)), 'The calculator shows a default result without JavaScript');
  const includes = compact(await page.$eval('#incluye', (node) => node.innerText));
  assert.ok(includes.includes(compact(language === 'es' ? pricing.scope : pricing.scope_en)), 'Scope comes from the shared pricing sheet');
  assert.ok(includes.includes(compact(language === 'es' ? pricing.exclusions : pricing.exclusions_en)), 'Exclusions come from the shared pricing sheet');
  assert.ok((await page.$eval('#como-trabajamos .so-portal', (node) => node.href)).endsWith('/cliente'), 'The client portal entrance is linked');
  assert.ok((await page.$eval('#ejemplo img', (node) => node.getAttribute('src'))).startsWith('/projects/'), 'The example is a real project screenshot');
  const faq = await page.$$('#preguntas-servicio details');
  assert.ok(faq.length >= 3, 'Service FAQ is in the static HTML');
  // Centrar antes de tocar: si el resumen queda bajo la barra fija del encabezado, el clic no le llega.
  await page.$eval('#preguntas-servicio details:first-of-type summary', (node) => node.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.click('#preguntas-servicio details:first-of-type summary');
  assert.equal(await faq[0].evaluate((node) => node.open), true, 'Native service FAQ works without JavaScript');
  assert.ok(await page.$('#contacto-servicio form[data-track="contacto-servicio"]'), 'The service page has its own measured form');
  const toc = await page.$$eval('.document-toc a', (nodes) => nodes.map((node) => new URL(node.href).hash));
  for (const id of ['#oferta', '#senales', '#calculadora', '#incluye', '#como-trabajamos', '#ejemplo', '#preguntas-servicio']) assert.ok(toc.includes(id), `Contents link ${id}`);
}

// Página de servicio con JavaScript: señales y calculadora alimentan el WhatsApp; el formulario corto deja la
// consulta en el portal con la página de origen; la barra fija aparece en pantallas sin índice lateral.
async function checkServiceSales(browser, origin, language, width) {
  const route = routes.find((item) => item.type === 'service' && item.data.id === 'process-automation' && item.language === language);
  const offer = SERVICE_OFFERS[route.data.id];
  const pricing = SERVICE_PRICING[offer.packages[0]];
  const { page, verifyErrors } = await openPage(browser, origin, width);
  try {
    await navigate(page, `${origin}${route.path}`);
    await page.waitForSelector('#senales input[type="checkbox"]');
    assert.equal(await page.$eval('.so-signals__verdict', (node) => node.dataset.count), '0');
    assert.equal(await page.$eval('#senal-0', (node) => node.dataset.trackLabel), `Señal · ${route.data.id} · 1`, 'A ticked signal is measured with its own page: signal 1 is a different sentence on each service');
    await page.click('#senales li:first-child label');
    await page.waitForFunction(() => document.querySelector('.so-signals__verdict').dataset.count === '1');
    const signal = offer[language].signals[0];
    const offerMessage = () => page.$eval('#oferta .so-wa', (node) => decodeURIComponent(new URL(node.href).searchParams.get('text')));
    assert.ok((await offerMessage()).includes(signal), 'Ticked signals travel in the WhatsApp message');
    const hours = () => page.$eval('.so-calc__result', (node) => Number(node.dataset.hours));
    const before = await hours();
    await page.click('#calc-times', { clickCount: 3 });
    await page.type('#calc-times', '60');
    await page.waitForFunction((previous) => Number(document.querySelector('.so-calc__result').dataset.hours) !== previous, {}, before);
    assert.ok((await hours()) > before, 'More repetitions mean more hours a month');
    assert.ok((await offerMessage()).includes(language === 'es' ? 'Calculé' : 'I estimated'), 'The calculation travels in the WhatsApp message');
    // «Prefiero que me contacten» exige WhatsApp o correo y deja la consulta en el portal.
    await page.click('.so-callback');
    await page.waitForFunction(() => /WhatsApp/.test(document.querySelector('.so-form__status').textContent));
    assert.equal(page.ingest.filter((r) => r.path === '/ingest/lead').length, 0, 'Without a contact nothing is sent');
    await page.type('#servicio-nombre', 'Browser QA');
    await page.type('#servicio-telefono', '8888-1234');
    // El portal descarta envíos llenados en menos de 1,5 s (bots); una persona tarda más que esta prueba.
    await page.waitForFunction(() => performance.now() > 3500);
    await stubAdPixels(page);
    await page.click('.so-callback');
    await page.waitForFunction(() => document.querySelector('.so-form__status').textContent.includes('24'));
    const [lead] = page.ingest.filter((r) => r.path === '/ingest/lead').map((r) => r.body);
    assert.equal(lead.channel, 'devolucion');
    assertLeadCaptured(await readAdPixels(page), { form: 'contacto-servicio', packageId: offer.packages[0], value: pricing.base_usd });
    assert.equal(lead.need, route.data.need, 'The portal receives the service need in Spanish');
    assert.equal(lead.package, pricing.label, 'The portal receives the Spanish package name');
    assert.equal(lead.page, route.path, 'The portal knows which service page the inquiry came from');
    assert.equal(lead.phone, '8888-1234');
    assert.equal(lead.name, 'Browser QA');
    assert.equal(lead.website, '', 'The bot trap stays empty for people');
    assert.ok(lead.message.includes(signal), 'The inquiry includes what the person ticked');
    assert.ok(/^[a-z0-9]{16,40}$/.test(lead.sid) && lead.lang === language && lead.elapsed >= 1500);
    if (width < 1024) {
      await page.$eval('#incluye', (node) => node.scrollIntoView({ block: 'start' }));
      await page.waitForFunction(() => document.querySelector('.so-bar').classList.contains('is-on'));
      assert.equal(await page.$eval('.so-bar .so-wa', (node) => new URL(node.href).origin), 'https://wa.me', 'The sticky bar offers WhatsApp');
    } else {
      assert.ok(await page.$('.so-toc-card .so-wa'), 'Desktop keeps the offer card beside the contents');
    }
    await checkWidth(page);
    verifyErrors();
    console.log(`[check-site] PASS service page ${language} ${width}px: signals, calculator, WhatsApp message, callback lead to the portal and sticky CTA`);
  } finally {
    await page.close();
  }
}

async function checkInternalLinks(origin, snapshots) {
  const checked = new Set();
  for (const [source, snapshot] of snapshots) {
    assert.equal(new Set(snapshot.ids).size, snapshot.ids.length, `Duplicate element IDs on ${source}`);
    for (const href of snapshot.links) {
      const url = new URL(href);
      if (![origin, PRODUCTION].includes(url.origin)) continue;
      if (!checked.has(url.pathname)) {
        const response = await fetch(`${origin}${url.pathname}`, { method: 'HEAD' });
        assert.equal(response.status, 200, `Broken internal link from ${source}: ${url.pathname}`);
        checked.add(url.pathname);
      }
      const hash = decodeURIComponent(url.hash.slice(1));
      if (hash && !hash.startsWith(':~:text=')) {
        const destination = snapshots.get(url.pathname);
        assert.ok(destination, `Uninspected internal fragment target from ${source}: ${url.pathname}`);
        assert.ok(destination.ids.includes(hash), `Broken internal fragment from ${source}: ${url.pathname}#${hash}`);
      }
    }
  }
  console.log(`[check-site] PASS ${checked.size} internal destinations and all linked fragments`);
}

async function checkSitemap(browser, origin) {
  // New blog entries must not break the deploy: only guard the floor, not an exact count.
  assert.ok(articles.length >= 10, 'The public catalog keeps at least the ten original bilingual articles');
  assert.deepEqual(articles.filter((article) => article.tool).map((article) => article.tool).sort(), ['list-reconciler', 'retry-simulator'], 'Exactly two articles provide the intended practical tools');
  // 14 non-article routes (home, journal and five services, each in two languages) plus one per language for each article.
  assert.equal(routes.length, 14 + articles.length * 2, 'Every article contributes exactly one route per language');
  assert.equal(new Set(routes.map((route) => route.path)).size, routes.length, 'Public routes are unique');
  const response = await fetch(`${origin}/sitemap.xml`);
  assert.equal(response.status, 200);
  const xml = await response.text();
  const page = await browser.newPage();
  try {
    const sitemap = await page.evaluate((source) => {
      const document = new DOMParser().parseFromString(source, 'application/xml');
      if (document.querySelector('parsererror')) throw new Error('Invalid sitemap XML');
      return Array.from(document.getElementsByTagName('url'), (node) => ({
        url: node.getElementsByTagName('loc')[0]?.textContent,
        alternates: Array.from(node.getElementsByTagNameNS('http://www.w3.org/1999/xhtml', 'link'), (link) => [link.getAttribute('hreflang'), link.getAttribute('href')]),
      }));
    }, xml);
    assert.deepEqual(sitemap.map((entry) => entry.url).sort(), routes.map((route) => `${PRODUCTION}${route.path}`).sort(), 'Sitemap exactly covers every public route');
    for (const route of routes) {
      const entry = sitemap.find((item) => item.url === `${PRODUCTION}${route.path}`);
      assert.deepEqual(entry.alternates.sort(), [
        ['en', `${PRODUCTION}${alternatePath(route, 'en')}`],
        ['es', `${PRODUCTION}${alternatePath(route, 'es')}`],
        ['x-default', `${PRODUCTION}${alternatePath(route, 'es')}`],
      ].sort(), `Sitemap alternates for ${route.path}`);
    }
  } finally {
    await page.close();
  }
  const robots = await (await fetch(`${origin}/robots.txt`)).text();
  assert.ok(robots.includes(`Sitemap: ${PRODUCTION}/sitemap.xml`));
  console.log(`[check-site] PASS sitemap: all ${routes.length} routes with equivalent language alternates`);
}

// Tope de peso de lo que la portada descarga siempre: el JavaScript y la hoja de estilos de entrada. No es una
// meta de rendimiento (la auditoría de noviembre de 2026 recomienda bajarlos partiendo el bundle): es un freno
// para que no sigan creciendo sin que alguien lo decida. Si un cambio justificado lo supera, se sube el tope
// en el mismo commit y se explica.
const WEIGHT_BUDGET_KB = { script: 205, style: 50 }; // gzip · al fijarlo: 193 KB de JS y 45 KB de CSS
async function checkWeightBudget() {
  const html = await readFile(join(DIST, 'index.html'), 'utf8');
  const entry = { script: /src="(\/assets\/index-[^"]+\.js)"/.exec(html)?.[1], style: /href="(\/assets\/index-[^"]+\.css)"/.exec(html)?.[1] };
  const sizes = {};
  for (const [kind, path] of Object.entries(entry)) {
    assert.ok(path, `The home page declares its entry ${kind}`);
    sizes[kind] = gzipSync(await readFile(join(DIST, path))).length / 1024;
    assert.ok(sizes[kind] <= WEIGHT_BUDGET_KB[kind], `Entry ${kind} weighs ${sizes[kind].toFixed(1)} KB gzip, over the ${WEIGHT_BUDGET_KB[kind]} KB budget`);
  }
  console.log(`[check-site] PASS weight budget: entry script ${sizes.script.toFixed(0)} KB and stylesheet ${sizes.style.toFixed(0)} KB gzip, within ${WEIGHT_BUDGET_KB.script} / ${WEIGHT_BUDGET_KB.style} KB`);
}

async function checkPublicPrivacy() {
  const files = [];
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await walk(path);
      else files.push(path);
    }
  }
  await walk(DIST);
  // Regression checks for private review artifacts and the removed screenshot directory.
  const privatePath = /(^|\/)(?:sites|content-review|_scripts)\//i;
  const privateText = /(?:\/sites\/|content-review[\/\\]|(?:reports|curation)-[012]\.json|D:[\/\\]Proyectos codigo)/i;
  for (const file of files) {
    const path = relative(DIST, file).split(sep).join('/');
    assert.ok(!privatePath.test(path), `Private material must not be shipped: ${path}`);
    if (['.html', '.js', '.css', '.json', '.xml', '.txt', '.map'].includes(extname(file))) {
      assert.ok(!privateText.test(await readFile(file, 'utf8')), `Private path or removed screenshot reference in ${path}`);
    }
  }
  console.log('[check-site] PASS public privacy: no project screenshot directory or private review artifacts in dist');
}

async function checkPackages(page, language) {
  const cards = await page.$$('#paquetes .package-card');
  assert.ok(cards.length >= 6, 'Ad visitors see priced packages right after the hero');
  const buy = await page.$eval('#paquetes .package-card__buy', (node) => ({ href: node.href, id: node.dataset.package, value: Number(node.dataset.value), name: node.closest('.package-card').querySelector('h3').textContent, price: node.closest('.package-card').querySelector('.package-card__price strong').textContent }));
  const whatsapp = new URL(buy.href);
  assert.equal(whatsapp.origin, 'https://wa.me', 'Each package is bought with one WhatsApp tap');
  assert.ok(whatsapp.searchParams.get('text').includes(buy.name) && whatsapp.searchParams.get('text').includes(buy.price), 'The WhatsApp message names the package and its price');
  assert.ok(buy.id && buy.value > 0, 'Package clicks carry their id and value for the ad pixels');
  const hero = new URL(await page.$eval('.studio-wa', (node) => node.href));
  assert.equal(hero.origin, 'https://wa.me', 'The hero’s main action opens WhatsApp');
  assert.ok((await page.$eval('#paquetes', (node) => node.innerText)).includes(language === 'es' ? 'Lo quiero' : 'I want it'));
  // Phones get every package in a swipeable rail; wider screens start with the featured ones and a "see all" button.
  if (await page.$('#paquetes .packages-more')) await page.click('#paquetes .packages-more');
  await page.waitForFunction(() => document.querySelectorAll('#paquetes .package-card').length >= 10);
  assert.equal(await page.$$eval('.mobile-dock', (nodes) => nodes.length), 0, 'No bottom bar on phones: WhatsApp and the assistant are two corner buttons');
  await checkWidth(page);
}

async function checkProjects(page, language) {
  const buttons = await page.$$('.works-list button');
  assert.equal(buttons.length, PROJECTS.length, 'Visitors can choose every real project');
  const before = await page.$eval('.works-summary h3', (node) => node.textContent);
  await buttons[1].click();
  await page.waitForFunction((previous) => document.querySelector('.works-summary h3').textContent !== previous, {}, before);
  assert.equal(await buttons[1].evaluate((node) => node.getAttribute('aria-pressed')), 'true');
  const shot = new URL(await page.$eval('.works-browser__viewport img', (node) => node.currentSrc || node.src));
  assert.ok(shot.pathname.startsWith('/projects/'), 'The explorer shows a real screenshot of the chosen project');
  await page.click('.works-stage__tabs button:nth-child(2)');
  await page.waitForSelector('.works-code__pre');
  assert.ok((await page.$eval('.works-code__pre', (node) => node.textContent)).trim().length > 80, 'Real code excerpt is shown');
  await page.click('.works-stage__tabs button:nth-child(3)');
  await page.waitForSelector('.works-anatomy__numbers');
  assert.ok((await page.$$('.works-anatomy__numbers div')).length >= 4, 'Repository anatomy shows computed figures');
  const links = await page.$$eval('.works-link', (nodes) => nodes.map((node) => node.href));
  assert.ok(links.every((href) => /^https:\/\//.test(href)), 'Project links open the real site');
  const whatsapp = new URL(await page.$eval('.works-summary .works-wa', (node) => node.href));
  assert.equal(whatsapp.origin, 'https://wa.me', 'Project summary offers a direct WhatsApp message');
  assert.ok(whatsapp.searchParams.get('text')?.includes(await page.$eval('.works-summary h3', (node) => node.textContent)), 'WhatsApp message names the chosen project');
  await checkWidth(page);
}

// Candados de la auditoría de noviembre de 2026 sobre el camino de compra: cada tarjeta de paquete lleva a su
// propio paquete, el botón del hero entra en la primera pantalla de un celular con barras del navegador, los
// flotantes no tapan los atajos, un anuncio no activa un paquete por parecerse su nombre y todo botón de
// WhatsApp se identifica con una etiqueta estable.
async function checkPurchasePaths(browser, origin) {
  const { page, verifyErrors } = await openPage(browser, origin, 1440);
  try {
    await navigate(page, `${origin}/`);
    const cards = await page.$$eval('#paquetes .package-card', (nodes) => nodes.map((node) => ({
      key: node.id.replace('paquete-', ''),
      name: node.querySelector('h3').textContent.trim(),
      price: node.querySelector('.package-card__price strong').textContent.trim(),
      sheet: node.querySelector('.package-card__sheet').getAttribute('href'),
      buy: node.querySelector('.package-card__buy').dataset.package,
    })));
    assert.deepEqual(cards.map((card) => card.key).sort(), Object.keys(SERVICE_PRICING).sort(), 'Every published package is in the static page');
    for (const card of cards) {
      assert.equal(card.buy, card.key, 'The buy button carries its own package');
      assert.ok(card.sheet.endsWith(`?p=${card.key}#oferta`), `${card.name} links to its own package on its category page`);
      await navigate(page, `${origin}${card.sheet}`);
      await page.waitForFunction((name) => document.querySelector('#so-offer-title')?.textContent.trim() === name, {}, card.name);
      const offer = await page.evaluate(() => ({
        price: document.querySelector('#oferta .so-offer__price strong').textContent.trim(),
        buy: document.querySelector('#oferta .so-wa').dataset.packageLabel,
        includes: document.querySelector('#so-includes-title').textContent,
        others: Array.from(document.querySelectorAll('.so-offer__others a'), (node) => node.getAttribute('href')),
      }));
      assert.equal(offer.price, card.price, `${card.name}: the category page shows the same price as the card`);
      assert.equal(offer.buy, card.name, `${card.name}: «Lo quiero» on the category page asks for that package`);
      assert.ok(offer.includes.includes(card.name), `${card.name}: «Qué incluye» describes that package`);
      assert.ok(offer.others.every((href) => /^\?p=[a-z_]+#oferta$/.test(href)) && !offer.others.includes(`?p=${card.key}#oferta`), 'The other packages of the category are one click away');
    }
    // Un paquete de otra categoría no cambia la oferta de la página.
    const webRoute = routes.find((item) => item.type === 'service' && item.data.id === 'web-development' && item.language === 'es');
    await navigate(page, `${origin}${webRoute.path}?p=dashboard`);
    await delay(400);
    assert.equal(await page.$eval('#so-offer-title', (node) => node.textContent.trim()), SERVICE_PRICING.pagina_web.label);

    // El nombre de un anuncio (utm_content) solo activa un paquete si es exactamente su clave o alias.
    await navigate(page, `${origin}/?utm_content=IA-2`);
    assert.equal(await page.$$eval('.package-card--ad', (nodes) => nodes.length), 0, 'An ad called «IA-2» does not announce a package the visitor never saw');
    assert.equal(await page.$eval('.studio-wa', (node) => node.dataset.package ?? ''), '');
    await navigate(page, `${origin}/?p=crm`);
    const adHero = await page.$eval('.studio-wa', (node) => ({ pkg: node.dataset.package, text: node.textContent, message: new URL(node.href).searchParams.get('text') }));
    const crm = SERVICE_PRICING.crm_inicial;
    assert.equal(adHero.pkg, 'crm_inicial');
    assert.ok(adHero.text.includes(crm.label) && adHero.message.includes(crm.label) && adHero.message.includes(`$${crm.base_usd}`), 'With ?p= the hero button names the package it asks for');
    assert.equal(await page.$eval('#paquetes .package-card', (node) => node.id), 'paquete-crm_inicial', 'The advertised package comes first');

    // Medición: cada enlace a WhatsApp de la portada tiene una etiqueta propia que no depende del texto visible.
    await navigate(page, `${origin}/`);
    const labels = await page.$$eval('a[href^="https://wa.me/"]', (nodes) => nodes.map((node) => node.dataset.trackLabel ?? ''));
    assert.ok(labels.length >= 15 && labels.every(Boolean), `Every WhatsApp link carries data-track-label (${labels.filter((label) => !label).length} missing)`);
    assert.equal(new Set(labels).size, labels.length, 'No two WhatsApp links share a label');
    const html = await readFile(join(DIST, 'index.html'), 'utf8');
    assert.ok(html.includes("fbq('set', 'autoConfig', false") && html.indexOf('autoConfig') < html.indexOf("fbq('init'"), 'The Meta pixel does not read buttons or link destinations on its own');
    verifyErrors();
  } finally {
    await page.close();
  }

  // Primera pantalla en un celular con las barras del navegador a la vista (390×664 y 360×740).
  for (const [width, height] of [[390, 664], [360, 740]]) {
    const { page: phone, verifyErrors: verifyPhone } = await openPage(browser, origin, width);
    try {
      await phone.setViewport({ width, height, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
      await navigate(phone, `${origin}/`);
      await phone.waitForFunction(() => document.body.classList.contains('cta-in-view'));
      const fold = await phone.evaluate(() => {
        const box = (selector) => document.querySelector(selector).getBoundingClientRect();
        const chips = Array.from(document.querySelectorAll('.studio-hero__paths a'));
        return {
          button: box('.studio-wa').bottom, promises: box('.studio-hero__assurances').bottom, viewport: innerHeight,
          floating: ['.mobile-wa', '.assistant-launcher'].map((selector) => getComputedStyle(document.querySelector(selector)).visibility),
          covered: chips.filter((chip) => {
            const rect = chip.getBoundingClientRect();
            if (rect.bottom > innerHeight || rect.top < 0) return false;
            const top = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
            return top !== chip && !chip.contains(top);
          }).length,
          small: chips.filter((chip) => chip.getBoundingClientRect().height < 44).length,
        };
      });
      assert.ok(fold.button <= fold.viewport, `The hero action fits the first screen at ${width}×${height} (bottom at ${Math.round(fold.button)})`);
      assert.ok(fold.promises <= fold.viewport, `What happens after the tap is visible without scrolling at ${width}×${height}`);
      assert.deepEqual(fold.floating, ['hidden', 'hidden'], 'Floating buttons step aside while the hero action is on screen');
      assert.equal(fold.covered, 0, 'No category shortcut is covered by another control');
      assert.equal(fold.small, 0, 'Category shortcuts are at least 44 px tall');
      verifyPhone();
    } finally {
      await phone.close();
    }
  }
  console.log('[check-site] PASS purchase paths: each package lands on its own offer, the hero action fits a phone’s first screen, ads only activate exact packages and every WhatsApp link has a stable label');
}

// Segunda ronda de la auditoría (noviembre de 2026): candados de los flujos que se rompieron o faltaban.
//   · «Tu caso en una frase» responde con precio, marca su paquete y su enlace no deja la tarjeta bajo la barra;
//   · el detalle del paquete escribe su dirección, guarda lo marcado en ella, tiene el botón siempre a la vista,
//     se cierra con «atrás», abre un enlace compartido con el mismo total y se imprime en una página;
//   · el formulario corto se abre encima del detalle, nombra lo marcado y completa «Mi negocio:»;
//   · el clic hecho antes de que cargue React abre el formulario en vez de irse a WhatsApp Web (y un Ctrl+clic
//     o un toque en celular, que sí siguen su curso, se miden al montar sin abrir nada);
//   · en celular hay una sola conversión de WhatsApp por visita, la hoja de retorno deja la consulta sin contarla
//     dos veces y un clic nuevo en un anuncio empieza otra visita;
//   · en la página de servicio, con anuncio y todo marcado, el pedido entra en los 600 caracteres del portal;
//   · en celular la fila que se abre no queda tapada y el detalle conserva cierre y botón al desplazar.
async function checkSecondRound(browser, origin) {
  const pricing = SERVICE_PRICING.dashboard_inicial;
  const extra = pricing.extras[0];
  const pdfPages = (buffer) => (Buffer.from(buffer).toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  const box = (page, selector) => page.$eval(selector, (node) => { const r = node.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right }; });

  // ── Computadora, con el desplazamiento suave activo (sin «reducir movimiento») ──
  let { page, verifyErrors } = await openPage(browser, origin, 1440);
  try {
    await page.evaluateOnNewDocument(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); });
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
    await navigate(page, `${origin}/?wa_line=a`);
    await page.waitForSelector('.case-matcher select');
    const [business, goal] = await page.$$('.case-matcher select');
    await business.select('distribuidora');
    await page.waitForFunction(() => document.querySelector('.case-matcher__hint'));
    await goal.select('numeros');
    await page.waitForSelector('.case-matcher__verdict a');
    const verdict = compact(await page.$eval('.case-matcher__verdict', (node) => node.textContent));
    assert.ok(verdict.includes(`$${pricing.base_usd}`) && verdict.includes(pricing.label), 'The sentence builder answers with the closest package and its published price');
    const quote = new URL(await page.$eval('.case-matcher__wa', (node) => node.href)).searchParams.get('text');
    assert.ok(quote.includes('distribuidora') && quote.includes(pricing.label), 'The quote button carries the sentence and the package');
    assert.ok(new URL(await page.$eval('.studio-wa', (node) => node.href)).searchParams.get('text').includes('distribuidora'), 'Once built, the sentence travels in the main quote button too');
    await page.$eval('.case-matcher__verdict a', (node) => node.click());
    await delay(2600); // desplazamiento suave
    const title = await box(page, '#paquete-dashboard_inicial h3');
    assert.ok(title.top >= 70 && title.top < 500, `The package card lands below the fixed bar (h3 at ${Math.round(title.top)} px)`);
    assert.ok((await page.$eval('#paquete-dashboard_inicial .package-card__badge', (node) => node.textContent)).includes('El más cercano a tu caso'), 'The matched package is marked as the closest one, without promising it is the answer');
    const order = new URL(await page.$eval('#paquete-dashboard_inicial .package-card__buy', (node) => node.href)).searchParams.get('text');
    assert.ok(order.includes('Mi caso: tengo una distribuidora') && !order.includes('Mi negocio:'), 'A package order carries the sentence instead of the open business line');

    // Detalle del paquete: dirección, selección, botón a la vista.
    await page.$eval('#paquete-dashboard_inicial .package-card__sheet', (node) => node.click());
    await page.waitForSelector('dialog.package-sheet[open]');
    assert.equal(new URL(page.url()).hash, '#hoja-dashboard_inicial', 'Opening the package detail writes its address');
    // Lo que llega al portal dice de qué paquete es cada casilla: «whatsapp» o «api» se repiten entre paquetes.
    const boxLabels = await page.$$eval('.package-sheet__options input[type="checkbox"]', (nodes) => nodes.map((node) => node.dataset.trackLabel));
    assert.deepEqual(boxLabels, ['Hoja · dashboard_inicial · Con IA', ...pricing.extras.map((item) => `Hoja · dashboard_inicial · Agregado ${item.key}`)], 'Every option of the detail is measured with its own package');
    await page.$eval('.package-sheet__options label:nth-of-type(2) input', (node) => node.click());
    await page.waitForFunction((key) => window.location.hash === `#hoja-dashboard_inicial.${key}`, {}, extra.key);
    const total = `$${pricing.base_usd + extra.price_usd}`;
    assert.equal(compact(await page.$eval('.package-sheet__bar .package-sheet__total strong', (node) => node.textContent)), total, 'Ticking an add-on updates the total in the pinned bar');
    const [dialogBox, buyBox] = [await box(page, 'dialog.package-sheet'), await box(page, '.package-sheet__buy')];
    assert.ok(buyBox.top >= dialogBox.top && buyBox.bottom <= dialogBox.bottom + 1, 'The order button is always inside the visible part of the detail');
    assert.ok(compact(await page.$eval('.package-sheet__upgrade', (node) => node.textContent)).includes(SERVICE_PRICING.power_bi.label), 'The starter dashboard points to the bigger package when it applies');
    assert.notEqual(await page.$eval('dialog.package-sheet', (node) => getComputedStyle(node).scrollPaddingBottom), 'auto', 'The detail reserves room for its pinned bar when a control receives focus');

    // PDF de una página (antes: la hoja y 18 páginas en blanco).
    await page.evaluate(() => { window.print = () => {}; });
    await page.$eval('.package-sheet__tools button', (node) => node.click());
    assert.ok(await page.$('body > .package-sheet--print'), 'Printing prepares a standalone copy of the detail');
    assert.equal(pdfPages(await page.pdf({ format: 'Letter' })), 1, 'The package detail prints on a single page');
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    assert.equal(await page.$('.package-sheet--print'), null, 'The print copy is removed afterwards');

    // El formulario corto se abre encima del detalle y nombra lo marcado.
    await page.$eval('.package-sheet__buy', (node) => node.click());
    await page.waitForSelector('dialog.lead-dialog[open]');
    assert.ok(await page.$eval('dialog.package-sheet', (node) => node.open), 'The detail stays open under the short form');
    assert.ok((await page.$eval('.lead-dialog__picked', (node) => node.textContent)).includes(extra.label), 'The short form names what was ticked');
    assert.ok((await page.$eval('.lead-dialog__package', (node) => node.textContent)).includes(total), 'The short form shows the same total as the detail');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('dialog.lead-dialog').open);
    assert.ok(await page.$eval('dialog.package-sheet', (node) => node.open), 'Closing the short form returns to the detail with the selection');
    await page.goBack();
    await page.waitForFunction(() => !document.querySelector('dialog.package-sheet').open);
    assert.ok(!new URL(page.url()).hash.startsWith('#hoja-'), 'The browser Back button closes the detail instead of leaving the site');

    // Pasar al paquete mayor empieza por su título (el diálogo conservaba el desplazamiento del anterior).
    await page.$eval('#paquete-dashboard_inicial .package-card__sheet', (node) => node.click());
    await page.waitForSelector('dialog.package-sheet[open]');
    await page.$eval('dialog.package-sheet', (node) => { node.scrollTop = 400; });
    await page.$eval('.package-sheet__upgrade button', (node) => node.click());
    await page.waitForFunction(() => window.location.hash === '#hoja-power_bi');
    const switched = await page.$eval('dialog.package-sheet', (node) => ({ top: node.scrollTop, title: node.querySelector('h2').textContent, focused: document.activeElement === node.querySelector('h2') }));
    assert.deepEqual(switched, { top: 0, title: SERVICE_PRICING.power_bi.label, focused: true }, 'Switching to the bigger package starts at its title, with the focus on it');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('dialog.package-sheet').open);

    // Sin giro conocido («otro tipo de negocio») el pedido conserva «Mi negocio:» y el formulario, su campo.
    await business.select('otro');
    await page.waitForFunction(() => new URL(document.querySelector('#paquete-dashboard_inicial .package-card__buy').href).searchParams.get('text').includes('Mi negocio:'));
    assert.ok(new URL(await page.$eval('.case-matcher__wa', (node) => node.href)).searchParams.get('text').includes('otro tipo de negocio'), 'The quote still carries the sentence when the business is not one of the listed ones');
    await page.$eval('#paquete-dashboard_inicial .package-card__buy', (node) => node.click());
    await page.waitForSelector('dialog.lead-dialog[open]');
    assert.ok(await page.$('#rapido-negocio'), 'Without a known line of business the short form still asks what business it is for');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('dialog.lead-dialog').open);

    // Con el desplazamiento suave activo (la visita normal de computadora) la confirmación del formulario de
    // contacto queda a la vista, aunque la persona envíe desde el final del formulario. Los otros candados de
    // «confirmación a la vista» corren con «reducir movimiento» y no pasan por el desplazamiento suave.
    await page.type('#contacto-telefono', '8888-1234');
    await page.$eval('#contacto form [type="submit"]', (node) => node.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await delay(1700);
    await page.$eval('#contacto form', (form) => form.requestSubmit());
    await page.waitForSelector('#contacto .contact-sent');
    await delay(700);
    const sentTop = await page.$eval('#contacto .contact-sent h3', (node) => node.getBoundingClientRect().top);
    assert.ok(sentTop >= 64 && sentTop < 700, `With smooth scrolling on, the confirmation is on screen after sending (title at ${Math.round(sentTop)} px)`);
    verifyErrors();
  } finally { await page.close(); }

  // ── Enlace compartido con selección, y pedido sin frase: el campo «¿Para qué negocio es?» ──
  ({ page, verifyErrors } = await openPage(browser, origin, 1440));
  try {
    const web = SERVICE_PRICING.pagina_web;
    const reminder = web.extras.find((item) => item.key === 'whatsapp');
    await page.evaluateOnNewDocument(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); });
    await navigate(page, `${origin}/en/?wa_line=a#hoja-pagina_web.ia.whatsapp.unknown`);
    await page.waitForSelector('dialog.package-sheet[open]');
    assert.equal(compact(await page.$eval('.package-sheet__bar .package-sheet__total strong', (node) => node.textContent)), `$${web.with_ai_usd + reminder.price_usd}`, 'A shared link opens the detail with the same total (AI replaces the base price, add-ons are added, unknown keys are ignored)');
    assert.ok(await page.$('.package-sheet__shared'), 'The detail says the link came with options selected');
    // Pedido con IA: la confirmación lo dice sin repetir la preposición («…, con Con IA»).
    await page.$eval('.package-sheet__buy', (node) => node.click());
    await page.waitForSelector('dialog.lead-dialog[open]');
    await page.type('#rapido-correo', 'qa@example.com');
    await delay(1600);
    await page.click('.lead-dialog__submit');
    await page.waitForSelector('.lead-dialog__panel[data-status="sent"]');
    const withAi = compact(await page.$eval('.lead-dialog__intro', (node) => node.textContent));
    assert.ok(withAi.includes('Includes: With AI') && !/with With/i.test(withAi), `The confirmation lists what was ticked in plain words (${withAi})`);
    await page.click('.lead-dialog__close');
    // Pedido enviado y confirmación cerrada: el detalle se cierra con ella.
    await page.waitForFunction(() => !document.querySelector('dialog.lead-dialog').open && !document.querySelector('dialog.package-sheet').open);
    await page.waitForFunction(() => window.location.hash === '#paquetes');
    await page.$eval('#paquete-dashboard_inicial .package-card__buy', (node) => node.click());
    await page.waitForSelector('dialog.lead-dialog[open] #rapido-negocio');
    await page.type('#rapido-telefono', '8888-1234');
    await page.type('#rapido-negocio', 'QA barbershop');
    await delay(1600);
    await page.click('.lead-dialog__submit');
    await page.waitForSelector('.lead-dialog__panel[data-status="sent"]');
    const lead = page.ingest.filter((r) => r.path === '/ingest/lead').map((r) => r.body).at(-1);
    assert.equal(lead.package, pricing.label, 'The portal gets the Spanish package name from the English page');
    assert.ok(lead.message.includes('My business: QA barbershop'), 'The optional business line is filled into the inquiry');
    const sent = compact(await page.$eval('.lead-dialog__panel', (node) => node.innerText));
    assert.ok(sent.includes(`$${pricing.base_usd}`) && await page.$('.lead-dialog__ready'), 'The confirmation repeats the request with its total and says what to gather');
    await page.evaluate(() => { window.__sameDocument = true; });
    await page.$eval('.lead-dialog__actions a.lead-dialog__submit', (node) => node.click());
    await page.waitForSelector('dialog.package-sheet[open]');
    assert.equal(new URL(page.url()).hash, '#hoja-dashboard_inicial', 'The confirmation opens the detail of what was requested');
    assert.ok(new URL(page.url()).search.includes('wa_line=a') && await page.evaluate(() => window.__sameDocument === true), 'That link keeps the query string, so it is an anchor jump and not a reload (ad visits carry ?p= and utm_)');
    verifyErrors();
  } finally { await page.close(); }

  // ── Clic temprano con anuncio (?p=): la etiqueta del botón cambia al montar y el clic no se pierde ──
  ({ page, verifyErrors } = await openPage(browser, origin, 1440, true, { delayEntryMs: 3000 }));
  try {
    await page.evaluateOnNewDocument(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); });
    await holdWhatsApp(page);
    const loading = page.goto(`${origin}/?p=web&wa_line=a`, { waitUntil: 'load' });
    await page.waitForSelector('.studio-wa');
    await page.$eval('.studio-wa', (node) => node.click());
    assert.ok(await page.evaluate(() => Boolean(window.__jcEarly) && !window.__jcMounted && window.__waClicks.join() === 'true'), 'The early click on an ad landing is remembered and held');
    await loading;
    await page.waitForSelector('dialog.lead-dialog[open]');
    assert.ok((await page.$eval('.lead-dialog__package', (node) => node.textContent)).includes(SERVICE_PRICING.pagina_web.label), 'After mounting, the early click orders the advertised package even though the button label changed');
    verifyErrors();
  } finally { await page.close(); }

  // ── Clic antes de que cargue React: en computadora abre el formulario, nunca WhatsApp Web ──
  ({ page, verifyErrors } = await openPage(browser, origin, 1440, true, { delayEntryMs: 3000 }));
  try {
    await page.evaluateOnNewDocument(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); });
    await holdWhatsApp(page);
    // No se espera a la navegación: DOMContentLoaded llega recién cuando el módulo de entrada (retenido) corre.
    const loading = page.goto(`${origin}/?wa_line=a`, { waitUntil: 'load' });
    await page.waitForSelector('.studio-wa');
    assert.ok(await page.evaluate(() => !window.__jcMounted), 'The static first screen is on screen before React mounts');
    assert.equal(await page.$eval('html', (node) => node.dataset.pointer), 'fine', 'The device is known before React loads');
    const staticLabel = await page.$eval('.studio-wa', (node) => node.innerText.trim());
    assert.equal(staticLabel, 'Pedir cotización', 'On a computer the static first screen already shows the computer label');
    assert.equal(await page.$eval('.studio-hero__invitation', (node) => getComputedStyle(node).display), 'none', 'The phone-only line is hidden on a computer before React loads');
    await page.$eval('.studio-wa', (node) => node.click());
    assert.ok(await page.evaluate(() => Boolean(window.__jcEarly?.label) && !window.__jcMounted), 'A click before the page is interactive is remembered, not lost');
    // Sin esto la prueba pasaba aunque el script en línea dejara de detener el clic (y abriera WhatsApp Web).
    assert.deepEqual(await page.evaluate(() => [window.__waClicks, window.__jcEarly.held]), [[true], true], 'On a computer the early click is held: it never leaves for WhatsApp Web');
    await loading;
    await page.waitForSelector('dialog.lead-dialog[open]');
    const clicks = await page.evaluate(() => window.dataLayer.filter((entry) => entry[0] === 'event' && entry[1] === 'contact_click').map((entry) => entry[2]));
    assert.ok(clicks.length === 1 && clicks[0].cta_mode === 'form' && clicks[0].cta_id === 'Hero · Cotizar', 'The early click opens the short form and is measured once');
    assert.equal(await page.$eval('.studio-wa', (node) => node.innerText.trim()), staticLabel, 'The button label does not change when React mounts');
    verifyErrors();
  } finally { await page.close(); }

  // ── Ctrl+clic antes de que cargue React: la persona pidió el enlace tal cual; al montar se mide y no se abre nada ──
  ({ page, verifyErrors } = await openPage(browser, origin, 1440, true, { delayEntryMs: 3000 }));
  try {
    await page.evaluateOnNewDocument(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); });
    await holdWhatsApp(page);
    const loading = page.goto(`${origin}/?wa_line=a`, { waitUntil: 'load' });
    await page.waitForSelector('.studio-wa');
    await page.$eval('.studio-wa', (node) => node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true, button: 0 })));
    assert.deepEqual(await page.evaluate(() => [window.__waClicks, window.__jcEarly?.held]), [[false], false], 'A Ctrl+click made before the page mounts is left alone');
    await loading;
    await page.waitForFunction(() => window.__jcMounted === true && window.dataLayer.some((entry) => entry[0] === 'event' && entry[1] === 'conversion'));
    await delay(300);
    const measured = await page.evaluate(() => window.dataLayer.filter((entry) => entry[0] === 'event' && ['contact_click', 'conversion'].includes(entry[1])).map((entry) => [entry[1], entry[2].cta_mode ?? entry[2].send_to ?? null]));
    assert.deepEqual(measured, [['contact_click', null], ['conversion', ADS_WHATSAPP]], 'It is measured as the direct WhatsApp click it was, not as a form');
    assert.equal(await page.$('dialog.lead-dialog[open]'), null, 'And the short form does not open on its own afterwards');
    verifyErrors();
  } finally { await page.close(); }

  // ── Celular: una conversión de WhatsApp por visita, la hoja de retorno y un anuncio nuevo ──
  // Las visitas «con anuncio» corren en un contexto de navegador aparte: la fuente del anuncio queda 30 días en
  // localStorage (seo/attribution.js) y, en el contexto compartido, la nota «(Vi el anuncio…)» se colaba en los
  // mensajes de las pruebas que corren después.
  let adVisit = await browser.createBrowserContext();
  ({ page, verifyErrors } = await openPage(adVisit, origin, 390));
  try {
    await holdWhatsApp(page);
    await navigate(page, `${origin}/?gclid=qa-click-1&wa_line=a`);
    await stubAdPixels(page);
    const platforms = (ads) => [countOf(ads.gtag, 'conversion'), countOf(ads.fbq, 'Contact'), countOf(ads.oaiq, 'lead_created')];
    await page.$eval('.studio-wa', (node) => node.click());
    let ads = await readAdPixels(page);
    assert.deepEqual(platforms(ads), [1, 1, 1], 'The first tap to WhatsApp counts once on each platform');
    assert.equal(ads.gtag.find((entry) => entry[1] === 'conversion')[2].send_to, ADS_WHATSAPP);
    await delay(CONVERSION_GAP_MS); // fuera de la ventana de 3 s: lo que se prueba es la regla por visita
    await page.$eval('#paquete-pagina_web .package-card__buy', (node) => node.click());
    ads = await readAdPixels(page);
    assert.deepEqual(platforms(ads), [1, 1, 1], 'A second tap in the same visit is the same person: no second conversion, Contact or lead_created');
    const second = ads.gtag.filter((entry) => entry[1] === 'contact_click').at(-1)[2];
    assert.ok(second.repeat === true && second.package_id === 'pagina_web', 'The second tap is still recorded, marked as a repeat, with its package');

    // Volver de WhatsApp sin haber enviado: la hoja deja la consulta en el portal y no la cuenta dos veces.
    const away = (state) => page.evaluate((value) => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => value });
      document.dispatchEvent(new Event('visibilitychange'));
    }, state);
    await away('hidden');
    await delay(3200);
    await away('visible');
    await page.waitForSelector('.wa-return');
    await page.type('#retorno-telefono', '8888-1234');
    await delay(1700);
    await page.$eval('.wa-return__submit', (node) => node.click());
    await page.waitForSelector('.wa-return div[role="status"]');
    const returned = page.ingest.filter((r) => r.path === '/ingest/lead').map((r) => r.body).at(-1);
    assert.deepEqual([returned.channel, returned.package, returned.phone], ['devolucion', SERVICE_PRICING.pagina_web.label, '8888-1234'], 'The return sheet leaves the inquiry in the portal with the price-list package name');
    ads = await readAdPixels(page);
    assert.ok(ads.gtag.some((entry) => entry[1] === 'lead_submit' && entry[2].form_id === 'whatsapp-retorno' && entry[2].package_id === 'pagina_web'), 'The return sheet is recorded as a captured inquiry');
    assert.deepEqual([...platforms(ads), countOf(ads.fbq, 'Lead')], [1, 1, 1, 1], 'The return sheet adds a Meta Lead and nothing else: the tap already counted on Google Ads and ChatGPT');
    assert.ok(!JSON.stringify(ads).includes('8888-1234'), 'Ad platforms never receive the phone number');

    // Otro clic en un anuncio empieza otra visita: la pestaña de un celular vive días.
    await navigate(page, `${origin}/?gclid=qa-click-2&wa_line=a`);
    await stubAdPixels(page);
    await page.$eval('.studio-wa', (node) => node.click());
    ads = await readAdPixels(page);
    const fresh = ads.gtag.find((entry) => entry[1] === 'contact_click')[2];
    assert.ok(countOf(ads.gtag, 'conversion') === 1 && !fresh.repeat && !fresh.after_lead, 'A new ad click starts a new visit: its tap counts for that ad');
    // Recargar o volver a la dirección de un anuncio ya visto no empieza otra.
    await navigate(page, `${origin}/?gclid=qa-click-1&wa_line=a`);
    await stubAdPixels(page);
    await page.$eval('.studio-wa', (node) => node.click());
    ads = await readAdPixels(page);
    assert.ok(countOf(ads.gtag, 'conversion') === 0 && ads.gtag.find((entry) => entry[1] === 'contact_click')[2].repeat === true, 'Going back to the address of an ad already seen does not start another visit');
    verifyErrors();
  } finally { await adVisit.close(); }

  // ── Celular: el toque hecho antes de que cargue React se mide al montar, aunque la pestaña haya quedado congelada ──
  ({ page, verifyErrors } = await openPage(browser, origin, 390, true, { delayEntryMs: 3000 }));
  try {
    await holdWhatsApp(page);
    const loading = page.goto(`${origin}/?wa_line=a`, { waitUntil: 'load' });
    await page.waitForSelector('.studio-wa');
    await page.$eval('.studio-wa', (node) => node.click());
    // Como quien vuelve de WhatsApp más de medio minuto después: el tope de 30 s es solo para el clic retenido.
    assert.deepEqual(await page.evaluate(() => { window.__jcEarly.at -= 31000; return [window.__waClicks, window.__jcEarly.held]; }), [[false], false], 'On a phone the early tap goes on to WhatsApp');
    await loading;
    await page.waitForFunction(() => window.__jcMounted === true && window.dataLayer.some((entry) => entry[0] === 'event' && entry[1] === 'conversion'));
    const measured = await page.evaluate(() => window.dataLayer.filter((entry) => entry[0] === 'event' && ['contact_click', 'conversion'].includes(entry[1])).map((entry) => [entry[1], entry[2].cta_id ?? entry[2].send_to]));
    assert.deepEqual(measured, [['contact_click', 'Hero · Cotizar'], ['conversion', ADS_WHATSAPP]], 'The early tap is measured once when the page mounts, with no time limit');
    assert.equal(await page.$('dialog.lead-dialog[open]'), null, 'On a phone no form opens: WhatsApp already did');
    verifyErrors();
  } finally { await page.close(); }

  // ── Página de servicio con anuncio: todo marcado y calculado, el pedido entra en los 600 caracteres del portal ──
  adVisit = await browser.createBrowserContext();
  ({ page, verifyErrors } = await openPage(adVisit, origin, 1440));
  try {
    await page.evaluateOnNewDocument(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); });
    const webPage = routes.find((item) => item.type === 'service' && item.data.id === 'web-development' && item.language === 'en');
    const webOffer = SERVICE_OFFERS['web-development'];
    await navigate(page, `${origin}${webPage.path}?utm_source=google&utm_campaign=web-bookings-cr&wa_line=a`);
    await page.waitForSelector('#senales input[type="checkbox"]');
    await page.$$eval('#senales input[type="checkbox"]', (nodes) => nodes.forEach((node) => node.click()));
    const field = webOffer.calculator.fields[0];
    await page.click(`#calc-${field.id}`, { clickCount: 3 });
    await page.type(`#calc-${field.id}`, String(field.value + 1));
    const orderText = () => page.$eval('#oferta .so-wa', (node) => new URL(node.href).searchParams.get('text'));
    await page.waitForFunction(() => new URL(document.querySelector('#oferta .so-wa').href).searchParams.get('text').includes('I estimated'));
    const all = await orderText();
    assert.ok(all.length + 121 <= 600, `The order leaves room for the business line (${all.length} characters)`);
    assert.deepEqual(all.split('\n').slice(-2), ['(I saw the ad on Google · web-bookings-cr)', 'My business:'], 'The ad note and the open business line close the order');
    assert.ok(all.includes(`All ${webOffer.en.signals.length} situations on this page happen to me.`) && all.includes('I estimated'), 'With everything ticked the situations are summed up and the calculation stays');
    // El formulario corto recibe el pedido entero y lo que la persona escriba del negocio no se corta.
    await page.$eval('#oferta .so-wa', (node) => node.click());
    await page.waitForSelector('dialog.lead-dialog[open] #rapido-negocio');
    const business = 'QA '.padEnd(120, 'x');
    await page.type('#rapido-correo', 'qa@example.com');
    await page.type('#rapido-negocio', business);
    await delay(1600);
    await page.click('.lead-dialog__submit');
    await page.waitForSelector('.lead-dialog__panel[data-status="sent"]');
    const long = page.ingest.filter((r) => r.path === '/ingest/lead').map((r) => r.body).at(-1);
    assert.ok(long.message.length <= 600 && long.message.endsWith(`My business: ${business}`), `The portal gets the whole order, business line included (${long.message.length} characters)`);
    await page.click('.lead-dialog__close');
    await page.waitForFunction(() => !document.querySelector('dialog.lead-dialog').open);
    // Con una señal menos, o viajan sus textos o viajan sus números: nunca «algunas» sin decir cuáles.
    await page.$eval('#senal-2', (node) => node.click());
    await page.waitForFunction((count) => document.querySelector('.so-signals__verdict').dataset.count === String(count), {}, webOffer.en.signals.length - 1);
    const partial = await orderText();
    const kept = webOffer.en.signals.filter((_, index) => index !== 2);
    assert.ok(partial.length + 121 <= 600 && (partial.includes('Situations 1, 2, 4 and 5 of the 5 on this page happen to me.') || kept.every((signal) => partial.includes(signal))), `A partial selection says which situations apply (${partial.length} characters)`);
    verifyErrors();
  } finally { await adVisit.close(); }

  // ── Celular: fila que se abre a la vista; detalle con cierre y botón siempre visibles; «atrás» lo cierra ──
  ({ page, verifyErrors } = await openPage(browser, origin, 390));
  try {
    await navigate(page, `${origin}/?wa_line=a`);
    assert.equal(await page.$eval('.studio-hero__description', (node) => node.innerText.trim().split('. ').length), 1, 'On a phone the hero shows a single sentence under the headline');
    await page.$eval('#paquetes', (node) => node.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await page.waitForSelector('#paquete-chatbot_atencion .package-card__toggle');
    await page.$eval('#paquete-chatbot_atencion .package-card__toggle', (node) => { node.scrollIntoView({ block: 'center', behavior: 'instant' }); node.click(); });
    await delay(500);
    const row = await box(page, '#paquete-chatbot_atencion h3');
    assert.ok(row.top >= 56 && row.top < 844 * 0.6, `The row that was just opened keeps its name on screen (h3 at ${Math.round(row.top)} px)`);
    await page.$eval('#paquete-chatbot_atencion .package-card__sheet', (node) => node.click());
    await page.waitForSelector('dialog.package-sheet[open]');
    const [buy, bar] = [await box(page, '.package-sheet__buy'), await box(page, '.package-sheet__bar')];
    assert.ok(buy.bottom <= 844 && buy.right <= 390 && bar.bottom <= 845, 'On a phone the total and the order button are pinned to the bottom of the detail');
    const order = await page.$$eval('.package-sheet__body > *', (nodes) => nodes.slice(0, 2).map((node) => (node.querySelector('legend') ? 'options' : 'text')));
    assert.deepEqual(order, ['text', 'options'], 'On a phone the options come right after what is included');
    await page.$eval('dialog.package-sheet', (node) => { node.scrollTop = node.scrollHeight; });
    await delay(150);
    const close = await box(page, '.package-sheet__close');
    assert.ok(close.top >= 0 && close.bottom <= 120, 'The close button follows the scroll inside the detail');
    assert.ok((await box(page, '.package-sheet__buy')).bottom <= 844, 'The order button stays on screen at the end of the detail');
    assert.equal(await page.$eval('dialog.package-sheet', (node) => node.scrollWidth - node.clientWidth), 0, 'The detail has no sideways scroll on a phone');
    await page.goBack();
    await page.waitForFunction(() => !document.querySelector('dialog.package-sheet').open);
    assert.equal(new URL(page.url()).pathname, '/', 'The Back gesture closes the detail and stays on the site');

    // Cerrar un detalle no mueve la página ni cambia la fila abierta, aunque la dirección anterior fuera #paquete-….
    await page.evaluate(() => { window.location.hash = '#paquete-pagina_web'; });
    await page.waitForSelector('#paquete-pagina_web .package-card__toggle[aria-expanded="true"]');
    await delay(500);
    await page.$eval('#paquete-power_bi .package-card__toggle', (node) => { node.scrollIntoView({ block: 'center', behavior: 'instant' }); node.click(); });
    await delay(600);
    const before = await page.evaluate(() => window.scrollY);
    await page.$eval('#paquete-power_bi .package-card__sheet', (node) => node.click());
    await page.waitForSelector('dialog.package-sheet[open]');
    await page.$eval('.package-sheet__close', (node) => node.click());
    await page.waitForFunction(() => !document.querySelector('dialog.package-sheet').open && window.location.hash === '#paquete-pagina_web');
    await delay(900);
    const after = await page.evaluate(() => ({ y: window.scrollY, open: document.querySelector('#paquete-power_bi .package-card__toggle').getAttribute('aria-expanded') }));
    assert.ok(Math.abs(after.y - before) <= 4 && after.open === 'true', `Closing a detail leaves the page and the open row as they were (scroll ${Math.round(before)} → ${Math.round(after.y)}, row open: ${after.open})`);
    await checkWidth(page);
    verifyErrors();
  } finally { await page.close(); }

  // ── Sin JavaScript, en celular: los diez paquetes ya están listados y no hay «Ver los que faltan» ──
  ({ page, verifyErrors } = await openPage(browser, origin, 390, false));
  try {
    await navigate(page, `${origin}/`);
    const more = await page.evaluate(() => ({
      label: getComputedStyle(document.querySelector('.packages-more')).display,
      box: getComputedStyle(document.querySelector('#packages-all')).display,
      cards: [...document.querySelectorAll('#paquetes .package-card')].filter((node) => getComputedStyle(node).display !== 'none').length,
      variants: [...document.querySelectorAll('.studio-wa .only-fine')].filter((node) => getComputedStyle(node).display !== 'none').length,
    }));
    assert.deepEqual(more, { label: 'none', box: 'none', cards: Object.keys(SERVICE_PRICING).length, variants: 0 }, 'Without JavaScript a phone lists every package, hides the unused expander and shows a single button label');
    verifyErrors();
  } finally { await page.close(); }
  console.log('[check-site] PASS second round: sentence builder with price, package detail (address, pinned total, back, shared link, one-page PDF), short form over the detail, early click (held, Ctrl+click, phone), one WhatsApp conversion per visit, return sheet, 600-character orders and phone layout');
}

async function checkJournalInteractions(browser, origin, language, width) {
  const route = routes.find((item) => item.type === 'journal' && item.language === language);
  const { page, verifyErrors } = await openPage(browser, origin, width);
  try {
    await navigate(page, `${origin}${route.path}`);
    await checkMetadata(page, language, route);
    await checkSelector(page, language, 'header', route);
    const cardIds = () => page.$$eval('#journal-grid [data-article]', (nodes) => nodes.map((node) => node.dataset.article));
    assert.equal((await cardIds()).length, articles.length);
    const topic = articles[0].topic;
    await page.click(`button[data-topic="${topic}"]`);
    await page.waitForFunction((count) => document.querySelectorAll('#journal-grid [data-article]').length === count, {}, articles.filter((article) => article.topic === topic).length);
    assert.deepEqual((await cardIds()).sort(), articles.filter((article) => article.topic === topic).map((article) => article.id).sort(), 'Topic filters show the correct articles');
    assert.equal(await page.$eval(`button[data-topic="${topic}"]`, (node) => node.getAttribute('aria-pressed')), 'true');
    await page.click('button[data-topic="all"]');
    await page.type('#insight-search', articles[0][language].title);
    await page.waitForFunction(() => document.querySelectorAll('#journal-grid [data-article]').length === 1);
    assert.deepEqual(await cardIds(), [articles[0].id], 'Search finds the requested localized title');
    await page.click('#insight-search', { clickCount: 3 });
    await page.type('#insight-search', 'zz-no-matching-insight-qa-zz');
    await page.waitForFunction(() => document.querySelectorAll('#journal-grid [data-article]').length === 0);
    await page.click('.journal-empty button');
    await page.waitForFunction((count) => document.querySelectorAll('#journal-grid [data-article]').length === count, {}, articles.length);
    assert.equal(await page.$eval('#insight-search', (node) => node.value), '', 'Reset clears the search');
    const guideCases = [
      { choice: 0, article: 'data-quality', service: 'business-intelligence' },
      { choice: 1, article: 'first-automation', service: 'process-automation' },
      { choice: 2, article: 'useful-websites', service: 'web-development' },
    ];
    for (const selection of guideCases) {
      await page.click(`#decision-guide button[data-choice="${selection.choice}"]`);
      const article = articles.find((item) => item.id === selection.article);
      const service = routes.find((item) => item.type === 'service' && item.data.id === selection.service).data;
      await page.waitForFunction((title) => document.querySelector('#guide-result h3').textContent === title, {}, article[language].title);
      const hrefs = await page.$$eval('#guide-result a', (nodes) => nodes.map((node) => new URL(node.href).pathname));
      assert.deepEqual(hrefs, [articlePath(article, language), servicePath(service, language)], 'Guide gives relevant localized reading and service links');
      assert.equal(await page.$eval(`#decision-guide button[data-choice="${selection.choice}"]`, (node) => node.getAttribute('aria-pressed')), 'true');
      await checkWidth(page);
    }
    await checkAssets(page, origin);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    const other = language === 'en' ? 'es' : 'en';
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30_000 }),
      page.click(`header .language-switcher a[lang="${other}"]`),
    ]);
    assert.equal(new URL(page.url()).pathname, alternatePath(route, other), 'Hub language link preserves the equivalent route');
    await checkMetadata(page, other, equivalentRoute(route, other));
    verifyErrors();
    console.log(`[check-site] PASS hub ${language} ${width}px: search, topic filters, reset, decision guide and language navigation`);
  } finally {
    await page.close();
  }
}

async function checkArticleNavigation(browser, origin, language, width) {
  const route = routes.find((item) => item.type === 'article' && item.data.id === 'human-review' && item.language === language);
  const { page, verifyErrors } = await openPage(browser, origin, width);
  try {
    // A new page with a deep link must land on its section after the route mounts.
    await navigate(page, `${origin}${route.path}#measure`);
    await checkFragmentViewport(page, 'measure');
    await checkMetadata(page, language, route);
    await checkSelector(page, language, 'header', route);
    await checkDiscussion(page, route);
    await checkAssets(page, origin);
    await page.click('.document-toc a[href="#discussion"]');
    await page.waitForFunction(() => location.hash === '#discussion');
    const other = language === 'en' ? 'es' : 'en';
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30_000 }),
      page.click(`header .language-switcher a[lang="${other}"]`),
    ]);
    assert.equal(new URL(page.url()).pathname, alternatePath(route, other), 'Article language link preserves its equivalent article');
    assert.equal(new URL(page.url()).hash, '#discussion', 'Article language change preserves its section');
    await checkMetadata(page, other, equivalentRoute(route, other));
    await checkFragmentViewport(page, 'discussion');
    await checkWidth(page);
    verifyErrors();
    console.log(`[check-site] PASS article ${language} ${width}px: cold deep link, native discussion and visible section after language navigation`);
  } finally {
    await page.close();
  }
}

async function checkFragmentViewport(page, id) {
  try {
    await page.waitForFunction((fragment) => {
      const target = document.getElementById(fragment);
      if (!target) return false;
      const heading = target.querySelector('h2') || target;
      const rect = heading.getBoundingClientRect();
      const header = document.querySelector('.journal-nav')?.getBoundingClientRect();
      return location.hash === `#${fragment}` && rect.top >= (header?.bottom || 0) - 1 && rect.bottom <= innerHeight;
    }, { timeout: 5000 }, id);
  } catch {
    const position = await page.evaluate((fragment) => ({
      hash: location.hash,
      scroll: scrollY,
      targetTop: document.getElementById(fragment)?.getBoundingClientRect().top,
      headerBottom: document.querySelector('.journal-nav')?.getBoundingClientRect().bottom,
      viewport: innerHeight,
    }), id);
    assert.fail(`Fragment #${id} must be visible below the navigation: ${JSON.stringify(position)}`);
  }
}

async function checkDelayedArticleModule(browser, origin) {
  const route = routes.find((item) => item.type === 'article' && item.data.id === 'human-review' && item.language === 'en');
  const { page, verifyErrors, delayedModule } = await openPage(browser, origin, 1440, true, { delayJournalMs: 2500 });
  try {
    await page.setCacheEnabled(false);
    await page.evaluateOnNewDocument(() => {
      const audit = { headingSeen: false, missingHeading: false };
      window.__staticHeadingAudit = audit;
      new MutationObserver(() => {
        const root = document.getElementById('root');
        if (!root) return;
        const count = root.querySelectorAll('h1').length;
        if (count === 1) audit.headingSeen = true;
        else if (audit.headingSeen) audit.missingHeading = true;
      }).observe(document, { childList: true, subtree: true });
    });
    const navigation = page.goto(`${origin}${route.path}#discussion`, { waitUntil: 'networkidle0', timeout: 30_000 });
    await page.waitForSelector('main h1');
    const deadline = Date.now() + TIMEOUT;
    while (!delayedModule.requests && Date.now() < deadline) await delay(25);
    assert.equal(delayedModule.requests, 1, 'The editorial module request was actually delayed');
    let samples = 0;
    while (delayedModule.waiting) {
      assert.equal(await page.$$eval('main h1', (nodes) => nodes.length), 1, 'Static heading remains present while the route module downloads');
      assert.equal(compact(await page.$eval('main h1', (node) => node.innerText)), route.data.en.title);
      await checkVisibleText(page, ['main h1']);
      samples += 1;
      await delay(100);
    }
    assert.ok(samples > 0, 'Heading visibility was observed during the delayed download');
    const response = await navigation;
    assert.equal(response.status(), 200);
    const audit = await page.evaluate(() => window.__staticHeadingAudit);
    assert.equal(audit.headingSeen, true);
    assert.equal(audit.missingHeading, false, 'Mounting the page must never replace its heading with a loading placeholder');
    await checkFragmentViewport(page, 'discussion');
    await checkMetadata(page, 'en', route);
    verifyErrors();
    console.log('[check-site] PASS delayed article module: heading stays visible during a 2.5s download and the deep link is restored');
  } finally {
    await page.close();
  }
}

// Audit attempts as well as completed requests: blocking an upload must not hide a leak.
async function beginToolPrivacyAudit(page) {
  const requests = [];
  const consoleMessages = [];
  const onRequest = (request) => {
    const url = new URL(request.url());
    if (!['blob:', 'data:', 'about:'].includes(url.protocol)) requests.push({ url: request.url(), data: request.postData() || '' });
  };
  const onConsole = (message) => consoleMessages.push(message.text());
  page.on('request', onRequest);
  page.on('console', onConsole);
  const session = await page.createCDPSession();
  await session.send('Page.setDownloadBehavior', { behavior: 'deny' });
  await page.evaluate(() => {
    const state = { events: [], blobs: [], downloads: [] };
    window.__toolPrivacyAudit = state;
    window.gtag = (...args) => state.events.push(args);
    const createObjectURL = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (blob) => {
      const url = createObjectURL(blob);
      state.blobs.push({ url, blob });
      return url;
    };
    const anchorClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      if (this.download) state.downloads.push({ name: this.download, href: this.href });
      return anchorClick.call(this);
    };
  });
  return {
    async downloads() {
      return page.evaluate(async () => {
        const state = window.__toolPrivacyAudit;
        return Promise.all(state.downloads.map(async (download) => {
          const entry = state.blobs.find((item) => item.url === download.href);
          return { name: download.name, type: entry?.blob.type, text: entry ? await entry.blob.text() : null };
        }));
      });
    },
    async verify(privateValues = []) {
      const telemetry = await page.evaluate(() => ({
        events: window.__toolPrivacyAudit.events,
        layer: Array.from(window.dataLayer || [], (entry) => Array.from(entry)),
        location: location.href,
        local: Object.entries(localStorage),
        session: Object.entries(sessionStorage),
      }));
      assert.deepEqual(requests, [], 'Local tool interactions and exports must not start network requests');
      const serialized = JSON.stringify({ ...telemetry, consoleMessages, requests });
      for (const value of privateValues) assert.ok(!serialized.includes(value), 'Tool data must stay out of analytics, URL, browser storage and console logs');
      page.off('request', onRequest);
      page.off('console', onConsole);
      await session.detach();
    },
  };
}

async function fillToolField(page, selector, value) {
  await page.$eval(selector, (node, text) => {
    const prototype = node.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, text);
    node.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}

async function checkListReconciler(browser, origin, language, width) {
  const route = routes.find((item) => item.type === 'article' && item.data.id === 'list-reconciliation' && item.language === language);
  assert.ok(route, 'The list comparison article is registered');
  const { page, verifyErrors } = await openPage(browser, origin, width);
  try {
    await navigate(page, `${origin}${route.path}#practical-tool`);
    await page.waitForSelector('#list-reconciler');
    await checkAssets(page, origin);
    await page.click('.document-toc a[href="#practical-tool"]');
    await checkFragmentViewport(page, 'practical-tool');
    const audit = await beginToolPrivacyAudit(page);
    const canary = `QA-PRIVATE-${language.toUpperCase()}-${width}`;
    const inputA = `reference;amount;currency\n001;10.00;USD\n${canary};12.50;USD\nDUP;3.00;USD\nDUP;3.00;USD\n=2+3;7.00;USD`;
    const inputB = `referencia;importe;moneda\n001;10.00;USD\n${canary};13.00;USD\nDUP;3.00;USD\n1;10.00;USD`;
    await fillToolField(page, '#reconciler-a', inputA);
    await fillToolField(page, '#reconciler-b', inputB);
    await page.click('#list-reconciler [data-action="compare"]');
    await page.waitForSelector('#list-reconciler [data-result="success"]');
    const groups = await page.$$eval('#list-reconciler tbody tr', (nodes) => nodes.map((node) => ({ reference: node.dataset.reference, status: node.dataset.status, text: node.textContent })));
    assert.deepEqual(groups.map(({ reference, status }) => [reference, status]), [
      ['001', 'match'], [canary, 'different'], ['DUP', 'ambiguous'], ['=2+3', 'only-a'], ['1', 'only-b'],
    ], 'Browser comparison preserves exact identifiers and flags every ambiguous key');
    assert.ok(groups.find((group) => group.reference === 'DUP').text.includes('3.00'), 'Ambiguous rows keep their source values available for review');
    await checkWidth(page);
    await page.click('#list-reconciler [data-action="export"]');
    const downloads = await audit.downloads();
    assert.equal(downloads.length, 1, 'Export creates one local download');
    assert.match(downloads[0].name, /\.csv$/);
    assert.match(downloads[0].type, /^text\/csv/);
    const lines = downloads[0].text.replace(/^\uFEFF/, '').trimEnd().split(/\r?\n/);
    assert.equal(lines[0], 'status;reference;source;line;amount;currency');
    assert.equal(lines.length, 10, 'Report includes all nine source rows, not invented pairs');
    assert.equal(lines.filter((line) => line.startsWith('"ambiguous";"DUP";')).length, 3, 'Every ambiguous source row survives export');
    assert.ok(lines.some((line) => line.includes('"\'=2+3"')), 'Formula-like references export as text');
    assert.ok(lines.some((line) => line.includes(`"${canary}"`)), 'The local report includes the requested comparison');
    await fillToolField(page, '#reconciler-a', `reference;amount;currency\n${canary};1,20;USD`);
    assert.equal(await page.$('#list-reconciler [data-result="success"]'), null, 'Editing inputs removes a stale successful result');
    await page.click('#list-reconciler [data-action="compare"]');
    await page.waitForSelector('#list-reconciler [data-result="error"]');
    assert.equal(await page.$('#list-reconciler [data-action="export"]'), null, 'Invalid input cannot export a partial comparison');
    assert.equal(await page.$('#list-reconciler tbody'), null, 'Invalid format blocks comparison results');
    await page.click('#list-reconciler [data-action="reset"]');
    assert.equal(await page.$eval('#reconciler-a', (node) => node.value), '');
    assert.equal(await page.$eval('#reconciler-b', (node) => node.value), '');
    await page.click('#list-reconciler [data-action="example"]');
    assert.ok(await page.$eval('#reconciler-a', (node) => node.value.length > 0));
    assert.ok(await page.$eval('#reconciler-b', (node) => node.value.length > 0));
    await audit.verify([canary]);
    const examples = await page.$$eval('.list-reconciler__downloads a[download]', (nodes) => nodes.map((node) => node.href));
    assert.equal(examples.length, 2, 'Both sample lists are downloadable');
    for (const [index, href] of examples.entries()) {
      const response = await fetch(href);
      assert.equal(response.status, 200, 'Sample download exists');
      const loaded = await page.$eval(`#reconciler-${index ? 'b' : 'a'}`, (node) => node.value);
      const normalize = (value) => value.replace(/^\uFEFF/, '').replaceAll('\r\n', '\n').trim();
      assert.equal(normalize(await response.text()), normalize(loaded), 'Download matches the synthetic example loaded by the UI');
    }
    await checkWidth(page);
    verifyErrors();
    console.log(`[check-site] PASS list comparison ${language} ${width}px: ambiguity, exact keys, blocked invalid input, private local CSV download and reset`);
  } finally {
    await page.close();
  }
}

async function checkRetrySimulator(browser, origin, language, width) {
  const route = routes.find((item) => item.type === 'article' && item.data.id === 'safe-retries' && item.language === language);
  assert.ok(route, 'The retry article is registered');
  const { page, verifyErrors } = await openPage(browser, origin, width);
  try {
    await navigate(page, `${origin}${route.path}#practical-tool`);
    await page.waitForSelector('#retry-simulator');
    await checkAssets(page, origin);
    await page.click('.document-toc a[href="#practical-tool"]');
    await checkFragmentViewport(page, 'practical-tool');
    const audit = await beginToolPrivacyAudit(page);
    const fictionalKeys = await page.$$eval('#retry-simulator .retry-lab__request dd', (nodes) => nodes.slice(0, 2).map((node) => node.textContent));
    const action = (value) => page.click(`#retry-simulator [data-retry-action="${value}"]`);
    const state = async (outcome, attempts, actions, verifications = 0) => {
      await page.waitForSelector(`#retry-result[data-retry-outcome="${outcome}"]`);
      const counters = await page.$$eval('#retry-simulator [data-retry-count]', (nodes) => Object.fromEntries(nodes.map((node) => [node.dataset.retryCount, Number(node.textContent)])));
      assert.deepEqual(counters, { attempts, actions, verifications });
      await checkWidth(page);
    };
    await action('attempt');
    await state('confirmed', 1, 1);
    await action('retry');
    await state('reused', 2, 1);
    await page.click('#retry-simulator [data-retry-scenario="lost-response"]');
    await state('idle', 0, 0);
    await action('attempt');
    await state('unknown', 1, 1);
    await action('retry');
    await state('held', 2, 1);
    await action('verify');
    await state('verified', 2, 1, 1);
    await action('retry');
    await state('reused', 3, 1, 1);
    await page.click('#retry-simulator [data-retry-scenario="changed-payload"]');
    await state('idle', 0, 0);
    await action('attempt');
    await state('confirmed', 1, 1);
    await action('retry');
    await state('conflict', 2, 1);
    await action('reset');
    await state('idle', 0, 0);
    await audit.verify(fictionalKeys);
    const scope = await page.$eval('#retry-simulator .retry-lab__footer', (node) => node.textContent);
    assert.ok(scope.includes(language === 'es' ? 'en memoria' : 'in memory'), 'The lab describes its actual in-memory scope');
    const downloadUrl = await page.$eval('#retry-simulator a[download]', (node) => node.href);
    const response = await fetch(downloadUrl);
    assert.equal(response.status, 200, 'The retry case worksheet is downloadable');
    const worksheet = await response.text();
    assert.ok(worksheet.includes('steps_en,pasos_es,expected_en,esperado_es'), 'Worksheet includes both languages');
    for (const id of ['normal-repeat', 'lost-verify', 'changed-content', 'external-uncertainty']) assert.ok(worksheet.includes(`${id},`), `Worksheet includes ${id}`);
    verifyErrors();
    console.log(`[check-site] PASS retry simulation ${language} ${width}px: repeat, unknown outcome, verification, conflict and reset without network activity`);
  } finally {
    await page.close();
  }
}

// Every WhatsApp and phone link on a page must point to the visitor's single assigned line.
async function contactLines(page) {
  const lines = await page.$$eval('a[href^="https://wa.me/"], a[href^="tel:"]', (links) => [...new Set(links.map((link) => {
    const url = new URL(link.href);
    return url.protocol === 'tel:' ? url.pathname : url.pathname.slice(1);
  }))]);
  return lines.sort();
}

async function checkWhatsAppLines(browser, origin) {
  const LINES = { a: '50670330596', b: '50688646581' };
  for (const [id, phone] of Object.entries(LINES)) {
    const { page, verifyErrors } = await openPage(browser, origin, 1440);
    try {
      await navigate(page, `${origin}${COPY.es.path}?wa_line=${id}`);
      await page.waitForSelector('#contacto form');
      assert.deepEqual(await contactLines(page), [`+${phone}`, phone], `?wa_line=${id} routes every contact link to one line`);
      verifyErrors();
    } finally {
      await page.close();
    }
  }
  // Real visitors (not automated) are assigned at random once and keep that line.
  const { page, verifyErrors } = await openPage(browser, origin, 1440);
  try {
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      const forced = Number(sessionStorage.getItem('__testRandom') ?? '0.9');
      Math.random = () => forced;
    });
    await navigate(page, `${origin}${COPY.es.path}`);
    assert.equal(await page.evaluate(() => localStorage.getItem('jc_wa_line')), 'b', 'A random draw >= 0.5 assigns the second line');
    assert.deepEqual(await contactLines(page), [`+${LINES.b}`, LINES.b]);
    await page.evaluate(() => sessionStorage.setItem('__testRandom', '0.1'));
    await navigate(page, `${origin}${COPY.es.path}`);
    assert.deepEqual(await contactLines(page), [`+${LINES.b}`, LINES.b], 'The assigned line is kept on later visits');
    await page.evaluate(() => { localStorage.removeItem('jc_wa_line'); });
    await navigate(page, `${origin}${COPY.es.path}`);
    assert.equal(await page.evaluate(() => localStorage.getItem('jc_wa_line')), 'a', 'A random draw < 0.5 assigns the first line');
    assert.deepEqual(await contactLines(page), [`+${LINES.a}`, LINES.a]);
    verifyErrors();
    console.log('[check-site] PASS WhatsApp lines: forced a/b, random 50/50 assignment and sticky line per visitor');
  } finally {
    await page.close();
  }
}

async function main() {
  await Promise.all(routes.map((route) => stat(join(DIST, route.path, 'index.html'))));
  await checkPublicPrivacy();
  await checkWeightBudget();
  const server = await startServer();
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    assert.equal((await fetch(`${origin}/__missing_asset__.js`)).status, 404, 'Static server must not use SPA fallback');
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--disable-background-networking',
        // Headless Chromium no declara ningún dispositivo apuntador (`pointer: none`). Se emula un mouse para que
        // la regla «computadora = puntero fino con hover» (useDesktop) sea comprobable; el modo computadora sigue
        // exigiendo navigator.webdriver=false, así que el resto de las pruebas se comporta como celular.
        '--blink-settings=primaryPointerType=4,availablePointerTypes=4,primaryHoverType=2,availableHoverTypes=2',
        ...(process.env.CI ? ['--no-sandbox', '--disable-setuid-sandbox'] : []),
      ],
    });
    // CHECK_ONLY=second-round corre solo los candados de la segunda ronda (para iterar; CI corre todo).
    if (process.env.CHECK_ONLY === 'second-round') { await checkSecondRound(browser, origin); return; }
    await checkSitemap(browser, origin);
    await checkDelayedArticleModule(browser, origin);
    const snapshots = new Map();
    for (const route of routes) await checkStaticRoute(browser, origin, route, snapshots);
    await checkInternalLinks(origin, snapshots);
    await checkWhatsAppLines(browser, origin);
    await checkSiteTracking(browser, origin);
    await checkPurchasePaths(browser, origin);
    await checkSecondRound(browser, origin);
    for (const language of ['es', 'en']) await checkDesktopLeadFlow(browser, origin, language);
    for (const width of [1440, 390]) {
      for (const language of ['en', 'es']) {
        const { page, verifyErrors } = await openPage(browser, origin, width);
        try {
          await navigate(page, `${origin}${COPY[language].path}`);
          await checkMetadata(page, language);
          await checkSelector(page, language);
          await checkWidth(page);
          if (width < 600) await checkMenu(page, language);
          await checkAssets(page, origin);
          await checkPackages(page, language);
          await checkProjects(page, language);
          await checkContact(page, language);
          // Return to contact through a real anchor, then switch using a real click.
          await page.click('.studio-start');
          await page.waitForFunction(() => location.hash === '#contacto');
          const other = language === 'en' ? 'es' : 'en';
          await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30_000 }),
            page.click(`header .language-switcher a[lang="${other}"]`),
          ]);
          assert.equal(new URL(page.url()).pathname, COPY[other].path);
          assert.equal(new URL(page.url()).hash, '#contacto', 'Language change preserves the current section');
          await checkMetadata(page, other);
          verifyErrors();
          console.log(`[check-site] PASS ${language} ${width}px: SEO, visible language links, assets, contact and language navigation`);
        } finally {
          await page.close();
        }
        await checkJournalInteractions(browser, origin, language, width);
        await checkArticleNavigation(browser, origin, language, width);
        await checkServiceSales(browser, origin, language, width);
        await checkListReconciler(browser, origin, language, width);
        await checkRetrySimulator(browser, origin, language, width);
      }
    }
    console.log('[check-site] All browser acceptance checks passed. No external messages or requests were sent.');
  } finally {
    if (browser) await browser.close();
    await new Promise((done) => server.close(done));
  }
}

main().catch((error) => {
  console.error(`[check-site] FAIL: ${error.stack || error}`);
  process.exitCode = 1;
});
