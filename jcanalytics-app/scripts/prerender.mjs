// Generate complete, crawlable documents for every public localized route.
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import { renderSeoHead, renderSitemap } from '../src/seo/site.js';
import { routes } from '../src/seo/routes.js';

const dist = resolve(dirname(fileURLToPath(import.meta.url)), '../dist');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };
const template = await readFile(join(dist, 'index.html'), 'utf8');
if (!template.includes('<div id="root"></div>')) throw new Error('Run vite build before prerendering; the root template must be empty.');
if (new Set(routes.map(route => route.path)).size !== routes.length) throw new Error('Public route paths must be unique.');

const documents = new Map(routes.map(route => [route.path, template
  .replace(/<html lang="[^"]+">/, `<html lang="${route.language}">`)
  .replace(/<!--seo:start-->[\s\S]*?<!--seo:end-->/, () => `<!--seo:start-->${renderSeoHead(route.language, route)}<!--seo:end-->`)]));

function documentPath(route) {
  if (!/^\/[a-z0-9/-]*$/.test(route.path) || !route.path.endsWith('/')) throw new Error(`Invalid public route: ${route.path}`);
  const filename = resolve(dist, `.${route.path}index.html`);
  if (!filename.startsWith(dist + sep)) throw new Error('Public document escaped the build directory.');
  return filename;
}

// Every route must exist before opening a browser so direct navigation works.
for (const route of routes) {
  const filename = documentPath(route);
  await mkdir(dirname(filename), { recursive: true });
  await writeFile(filename, documents.get(route.path), 'utf8');
}

const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const filename = resolve(dist, `.${pathname}${pathname.endsWith('/') ? 'index.html' : ''}`);
    if (!filename.startsWith(dist + sep)) { response.writeHead(403); response.end(); return; }
    const body = await readFile(filename);
    response.writeHead(200, { 'Content-Type': mime[extname(filename)] ?? 'application/octet-stream' });
    response.end(body);
  } catch { response.writeHead(404); response.end('Not found'); }
});
await new Promise((done, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', done); });
let browser;
try {
  browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] });
  const origin = `http://127.0.0.1:${server.address().port}`;
  for (const route of routes) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await page.setViewport({ width: 1440, height: 1000 });
      await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
      // Static generation has no analytics or external network dependency.
      await page.setRequestInterception(true);
      page.on('request', request => request.url().startsWith(origin + '/') || request.url().startsWith('data:') ? request.continue() : request.abort());
      const response = await page.goto(origin + route.path, { waitUntil: 'networkidle0' });
      if (!response?.ok()) throw new Error(`Could not load ${route.path}`);
      await page.waitForSelector(route.type === 'home' ? '#contacto' : '#main-content h1');
      const snapshot = await page.evaluate(() => {
        const root = document.getElementById('root');
        root.querySelectorAll('[style]').forEach(element => {
          if (element.style.opacity === '0') { element.style.opacity = '1'; element.style.transform = 'none'; }
        });
        return {
          html: root.innerHTML,
          text: root.innerText,
          mainText: root.querySelector('#main-content')?.innerText ?? '',
          headings: root.querySelectorAll('h1').length,
          faqCount: root.querySelectorAll('#preguntas details').length,
          language: document.documentElement.lang,
          stylesheets: [...document.querySelectorAll('link[rel="stylesheet"]')]
            .map(link => new URL(link.href))
            .filter(url => url.origin === window.location.origin && /^\/assets\/[a-zA-Z0-9_-]+\.css$/.test(url.pathname))
            .map(url => url.pathname),
        };
      });
      const complete = route.type === 'home'
        ? snapshot.text.length >= 3000 && snapshot.faqCount === 6
        : snapshot.mainText.trim().length > 800;
      if (errors.length || !complete || snapshot.headings !== 1 || snapshot.language !== route.language) {
        throw new Error(`Incomplete ${route.path}: ${errors.join('; ')} (h1=${snapshot.headings}, FAQ=${snapshot.faqCount}, main=${snapshot.mainText.length}, lang=${snapshot.language})`);
      }
      // Preserve metadata from the clean template, plus the local CSS loaded by
      // this route's module. Otherwise a no-JS reader would lose tool styling.
      const document = documents.get(route.path);
      const routeStyles = [...new Set(snapshot.stylesheets)]
        .filter(path => !document.includes(`"${path}"`))
        .map(path => `<link rel="stylesheet" href="${path}" />`).join('\n');
      const html = document
        .replace('</head>', () => `${routeStyles}\n</head>`)
        .replace('<html lang=', '<html data-prerendered="true" lang=')
        .replace('<div id="root"></div>', () => `<div id="root">${snapshot.html}</div>`);
      await writeFile(documentPath(route), html, 'utf8');
      console.log(`[prerender] ${route.path}: ${snapshot.text.length} characters of crawlable content`);
    } finally {
      await page.close();
    }
  }
  await writeFile(join(dist, 'sitemap.xml'), renderSitemap(), 'utf8');
  console.log(`[prerender] ${routes.length} pages and sitemap generated.`);
} finally {
  await browser?.close();
  await new Promise(done => server.close(done));
}
