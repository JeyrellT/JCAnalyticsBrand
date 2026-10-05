import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const dist = resolve(dirname(fileURLToPath(import.meta.url)), '../dist');
const screenshotDir = resolve(dist, '../../_scripts/assistant-review');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp' };
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const filename = resolve(dist, `.${pathname}${pathname.endsWith('/') ? 'index.html' : ''}`);
    if (!filename.startsWith(dist + sep)) { response.writeHead(403).end(); return; }
    const bytes = await readFile(filename);
    response.writeHead(200, { 'Content-Type': mime[extname(filename)] || 'application/octet-stream' }).end(bytes);
  } catch { response.writeHead(404).end(); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`;
await mkdir(screenshotDir, { recursive: true });
let browser;
try {
  browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  for (const [language, width] of [['es', 1440], ['en', 1440], ['es', 390], ['en', 320]]) {
    const page = await browser.newPage();
    const errors = [];
    const calls = [];
    let mode = 'answer';
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({ width, height: 844, isMobile: width < 768, hasTouch: width < 768 });
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (request.url().endsWith('/api/chat')) {
        if (request.method() === 'OPTIONS') {
          request.respond({ status: 204, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
          return;
        }
        calls.push(JSON.parse(request.postData()));
        const answer = mode === 'answer' ? { reply: language === 'es' ? 'Te ayudamos con software, Power BI e IA.' : 'We can help with software, Power BI and AI.', handoff: false }
          : { reply: language === 'es' ? 'El equipo puede confirmar esa información por WhatsApp.' : 'Our team can confirm that information on WhatsApp.', handoff: true };
        setTimeout(() => request.respond({ status: mode === 'error' ? 503 : 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': origin }, body: JSON.stringify(answer) }), 120);
      } else if (request.url().startsWith(origin) || request.url().startsWith('data:')) request.continue();
      else request.abort();
    });
    await page.goto(origin + (language === 'es' ? '/es/' : '/'), { waitUntil: 'networkidle0' });
    await page.waitForSelector('.assistant-launcher');
    assert.equal(await page.$eval('.assistant-launcher', node => !node.inert && node.getBoundingClientRect().bottom <= innerHeight), true);
    if (width < 768) {
      assert.equal(await page.evaluate(() => {
        const fab = document.querySelector('.assistant-launcher').getBoundingClientRect();
        const dock = document.querySelector('.mobile-dock').getBoundingClientRect();
        return fab.bottom < dock.top;
      }), true, 'Launcher must clear the mobile navigation');
    }
    await page.click('.assistant-launcher');
    await page.waitForSelector('.assistant-dialog[open]');
    assert.equal(await page.$eval('.assistant-dialog', node => node.contains(document.activeElement)), true);
    assert.equal(await page.$eval('.assistant-dialog', node => { const box = node.getBoundingClientRect(); return box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight; }), true);
    await page.type('#assistant-question', language === 'es' ? '¿Qué servicios ofrecen?' : 'What services do you offer?');
    await page.click('.assistant-compose button');
    await page.waitForFunction(() => document.querySelectorAll('.assistant-message').length === 3);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].language, language);
    assert.deepEqual(calls[0].messages.map(message => message.role), ['user']);
    assert.match(await page.$eval('.assistant-log', node => node.textContent), /Power BI/);
    assert.equal(await page.$('.assistant-handoff'), null);
    mode = 'handoff';
    const unknown = language === 'es' ? '¿Cuál es el horario del domingo?' : 'What are your Sunday hours?';
    await page.type('#assistant-question', unknown);
    await page.keyboard.press('Enter');
    await page.waitForSelector('.assistant-handoff');
    const link = new URL(await page.$eval('.assistant-handoff', node => node.href));
    assert.equal(link.hostname, 'wa.me');
    assert.equal(link.pathname, '/50670330596');
    assert.match(link.searchParams.get('text'), new RegExp(unknown.replace(/[?¿]/g, '')));
    assert.deepEqual(calls[1].messages.map(message => message.role), ['user', 'assistant', 'user']);
    mode = 'error';
    await page.type('#assistant-question', language === 'es' ? '¿Podés ayudarme con mi proyecto?' : 'Can you help with my project?');
    await page.click('.assistant-compose button');
    await page.waitForFunction(() => document.querySelectorAll('.assistant-handoff').length === 2);
    assert.match(await page.$eval('.assistant-message:last-of-type', node => node.textContent), /7033-0596/);
    await page.screenshot({ path: resolve(screenshotDir, `assistant-${language}-${width}.png`) });
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('.assistant-dialog').open);
    assert.equal(await page.$eval('.assistant-launcher', node => node === document.activeElement && node.getAttribute('aria-expanded') === 'false'), true);
    await page.click('.assistant-launcher');
    assert.equal(await page.$$eval('.assistant-message', nodes => nodes.length), 7);
    await page.click('.assistant-header button');
    assert.deepEqual(errors, []);
    console.log(`[assistant-ui] PASS ${language} ${width}px: answers, unknown question, provider failure, WhatsApp context, focus and preserved chat`);
    await page.close();
  }
  for (const path of ['/es/ideas/', '/services/ai-integration-costa-rica/']) {
    const page = await browser.newPage();
    await page.goto(origin + path, { waitUntil: 'networkidle0' });
    await page.waitForSelector('.assistant-launcher');
    await page.click('.assistant-launcher');
    await page.waitForSelector('.assistant-dialog[open]');
    console.log(`[assistant-ui] PASS assistant available on ${path}`);
    await page.close();
  }
  console.log(`[assistant-ui] Screenshots: ${screenshotDir}`);
} finally {
  await browser?.close();
  await new Promise(done => server.close(done));
}
