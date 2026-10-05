// Browser acceptance checks for the actual static production build.
// Run after build/prerender: node scripts/check-site.mjs
// Forms run with window.open stubbed. No external requests or messages are sent.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import puppeteer from 'puppeteer';
import { articles } from '../src/content/catalog.js';
import { routes, alternatePath, articlePath, servicePath } from '../src/seo/routes.js';

const DIST = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const PRODUCTION = 'https://www.jcanalytic.com';
const TIMEOUT = 20_000;
const COPY = {
  en: {
    path: '/', heading: 'Software with character.', system: 'System / backend', website: 'Website',
    objective: 'What would you like to solve?', name: 'Your name', estimator: 'Your project, with clarity.',
    faqQuestion: 'What can JC Analytics build for my business?', faqAnswer: 'We design websites and custom software',
    emailPrefix: 'Inquiry:', messagePrefix: 'Hello', estimateLabel: 'Estimated investment',
    title: 'Web Development & AI in Costa Rica | JC Analytics', descriptionStart: 'Custom websites, software, Power BI',
    journalHeading: 'Good technology starts with a better question.',
    journalTitle: 'Business Insights: Data, Websites & AI | JC Analytics',
    journalDescription: 'Practical guides to clearer business decisions, useful websites, reliable data and responsible AI.',
  },
  es: {
    path: '/es/', heading: 'Sistemas con carácter.', system: 'Sistema / backend', website: 'Página web',
    objective: '¿Qué querés resolver?', name: 'Tu nombre', estimator: 'Tu proyecto, con claridad.',
    faqQuestion: '¿Qué puede desarrollar JC Analytics para mi negocio?', faqAnswer: 'Diseñamos páginas web y software a medida',
    emailPrefix: 'Consulta:', messagePrefix: 'Hola', estimateLabel: 'Inversión estimada',
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

const compact = (text) => text.replace(/\s+/g, ' ').trim();

async function openPage(browser, origin, width, javascript = true, options = {}) {
  const page = await browser.newPage();
  const errors = [];
  const badLocalRequests = [];
  const delayedModule = { requests: 0, waiting: false };
  page.setDefaultTimeout(TIMEOUT);
  await page.setViewport({ width, height: width < 600 ? 844 : 1000, deviceScaleFactor: 1 });
  await page.setJavaScriptEnabled(javascript);
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.setRequestInterception(true);
  page.on('request', async (request) => {
    const url = new URL(request.url());
    if (url.origin === origin && options.delayJournalMs && /\/JournalApp-[^/]+\.js$/.test(url.pathname)) {
      delayedModule.requests += 1;
      delayedModule.waiting = true;
      await delay(options.delayJournalMs);
      delayedModule.waiting = false;
    }
    if (url.origin === origin || ['data:', 'blob:', 'about:'].includes(url.protocol)) request.continue();
    else request.abort('blockedbyclient');
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
    ['x-default', `${PRODUCTION}${alternatePath(route, 'en')}`],
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
  // Use the real CTA: it must preserve the Spanish internal need value.
  await page.click('.studio-start');
  await page.waitForFunction(() => window.__testContactIntent !== null);
  assert.equal(await page.evaluate(() => window.__testContactIntent.need), 'Sistema / backend');
  assert.equal(compact(await page.$eval('.contact-selection strong', (node) => node.textContent)), copy.system);
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
    }];
    assert.deepEqual(submission.events, [event('whatsapp')], 'Submit tracks only channel, language and section');

    const beforeEmail = page.url();
    await page.click('#contacto .contact-email a');
    await page.waitForFunction(() => window.__testContactTelemetry.events.length >= 2);
    const events = await page.evaluate(() => window.__testContactTelemetry.events);
    assert.deepEqual(events, [event('whatsapp'), event('email')], 'Email click records the correct channel exactly once');
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

async function checkEstimator(page, language) {
  const before = await page.$eval('#cotizar .quote-result', (node) => node.innerText);
  const button = await clickButtonText(page, '#cotizar button[role="radio"]', 'Excel / VBA');
  await page.waitForFunction((node) => node.getAttribute('aria-checked') === 'true', {}, button);
  const after = await page.$eval('#cotizar .quote-result', (node) => node.innerText);
  assert.notEqual(after, before, 'Changing service must update the estimate');
  assert.ok(after.toLocaleLowerCase().includes(COPY[language].estimateLabel.toLocaleLowerCase()));
  assert.match(after, language === 'en' ? /weeks?/ : /semanas?/);
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

async function checkStaticRoute(browser, origin, route, snapshots) {
  const { language } = route;
  const { page, verifyErrors } = await openPage(browser, origin, 1440, false);
  try {
    await navigate(page, `${origin}${route.path}`);
    await checkMetadata(page, language, route);
    await checkSelector(page, language, 'header', route);
    await checkVisibleText(page, ['main h1']);
    if (route.type === 'home') {
      assert.ok(compact(await page.$eval('#cotizar h2', (node) => node.innerText)).includes(COPY[language].estimator));
      assert.ok((await page.$eval('#contacto', (node) => node.innerText)).includes(COPY[language].name));
      await checkVisibleText(page, ['#contacto h2', '#cotizar h2']);
      const details = await page.$$('#preguntas details');
      assert.ok(details.length >= 2, 'FAQ content must be present in static HTML');
      assert.ok(compact(await details[0].evaluate((node) => node.querySelector('summary').textContent)).includes(COPY[language].faqQuestion));
      assert.ok((await details[0].evaluate((node) => node.querySelector('p').textContent)).includes(COPY[language].faqAnswer));
      await page.click('#preguntas details:first-child summary');
      assert.equal(await details[0].evaluate((node) => node.open), true, 'Native FAQ works without JavaScript');
      assert.ok(await page.$eval('#preguntas details:first-child p', (node) => node.getBoundingClientRect().height > 0));
      const examples = compact(await page.$eval('#trabajo', (node) => node.innerText));
      assert.ok(examples.includes(language === 'es' ? 'Ejemplos conceptuales' : 'Concept examples'), 'Examples are explicitly conceptual');
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
    }
    snapshots.set(route.path, await page.evaluate(() => ({
      ids: Array.from(document.querySelectorAll('[id]'), (node) => node.id),
      links: Array.from(document.querySelectorAll('a[href]'), (node) => node.href),
    })));
    await checkAssets(page, origin, false);
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await checkSelector(page, language, 'header', route);
    await checkAssets(page, origin, false);
    verifyErrors();
    console.log(`[check-site] PASS static ${route.path}: localized SEO, complete content, native details and 1440/390px`);
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
  assert.equal(routes.length, 24, 'The public catalog contains 24 intended language routes');
  assert.equal(new Set(routes.map((route) => route.path)).size, 24, 'Public routes are unique');
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
        ['x-default', `${PRODUCTION}${alternatePath(route, 'en')}`],
      ].sort(), `Sitemap alternates for ${route.path}`);
    }
  } finally {
    await page.close();
  }
  const robots = await (await fetch(`${origin}/robots.txt`)).text();
  assert.ok(robots.includes(`Sitemap: ${PRODUCTION}/sitemap.xml`));
  console.log('[check-site] PASS sitemap: all 24 routes with equivalent language alternates');
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

async function checkConcepts(page, language) {
  const buttons = await page.$$('.case-feature__selector button');
  assert.ok(buttons.length >= 2, 'Visitors can explore multiple clearly labeled concepts');
  const before = await page.$eval('#concept-description h3', (node) => node.textContent);
  await buttons[1].click();
  await page.waitForFunction((previous) => document.querySelector('#concept-description h3').textContent !== previous, {}, before);
  assert.equal(await buttons[1].evaluate((node) => node.getAttribute('aria-pressed')), 'true');
  const conceptUrl = new URL(await page.$eval('.case-feature__link', (node) => node.href));
  assert.ok(routes.some((route) => route.type === 'service' && route.language === language && route.path === conceptUrl.pathname), 'Concept leads to a service in the visitor’s language');
  await checkWidth(page);
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

async function main() {
  await Promise.all(routes.map((route) => stat(join(DIST, route.path, 'index.html'))));
  await checkPublicPrivacy();
  const server = await startServer();
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    assert.equal((await fetch(`${origin}/__missing_asset__.js`)).status, 404, 'Static server must not use SPA fallback');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--disable-background-networking', ...(process.env.CI ? ['--no-sandbox', '--disable-setuid-sandbox'] : [])],
    });
    await checkSitemap(browser, origin);
    await checkDelayedArticleModule(browser, origin);
    const snapshots = new Map();
    for (const route of routes) await checkStaticRoute(browser, origin, route, snapshots);
    await checkInternalLinks(origin, snapshots);
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
          await checkConcepts(page, language);
          await checkContact(page, language);
          await checkEstimator(page, language);
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
          console.log(`[check-site] PASS ${language} ${width}px: SEO, visible language links, assets, contact, estimator and language navigation`);
        } finally {
          await page.close();
        }
        await checkJournalInteractions(browser, origin, language, width);
        await checkArticleNavigation(browser, origin, language, width);
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
