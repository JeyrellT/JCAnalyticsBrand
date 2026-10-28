// ============================================================================
//  tests/web.e2e.mjs — Consultas y Tráfico del sitio en un navegador real.
//  Requiere `npm run build`. Siembra la demo, llega una consulta nueva por la
//  entrada pública (/ingest, como lo hace jcanalytic.com) y el equipo la trabaja:
//  aviso, bandeja, ficha, contacto, nota, estado y paso a clientes. Revisa el
//  tablero de tráfico en escritorio y celular, y que el texto del visitante se
//  pinte como texto (nunca como HTML).
//
//    npm run build && npm run e2e:web
// ============================================================================

import assert from 'node:assert/strict';
import { mkdtemp, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { seedDemo, DEMO_PASSWORD } from '../server/seed-demo.mjs';
import { openDatabase } from '../server/db.mjs';
import { createPortalServer } from '../server/app.mjs';

const SITE = 'https://www.jcanalytic.com';
const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
const shots = join(root, 'test-results', 'web');
if (!existsSync(join(dist, 'index.html'))) { console.error('Falta dist/: ejecutá npm run build'); process.exit(1); }
await mkdir(shots, { recursive: true });

const dbPath = join(await mkdtemp(join(tmpdir(), 'portal-web-')), 'web.sqlite');
await seedDemo(dbPath);
const db = openDatabase(dbPath);
const server = createPortalServer({ db, env: {}, staticDir: dist, logger: { error: console.error, info() {} } });
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const executablePath = process.env.PLAYWRIGHT_CHROMIUM || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const browser = await chromium.launch({ executablePath });
const problems = [];
const results = [];
let lastPage = null;

async function check(name, fn) {
  try {
    await fn();
    results.push(`ok - ${name}`);
  } catch (error) {
    await lastPage?.screenshot({ path: join(shots, `fallo-${results.length + 1}.png`) }).catch(() => {});
    results.push(`not ok - ${name}\n  ${String(error.message).split('\n').slice(0, 6).join('\n  ')}`);
  }
}

async function open(viewport, who) {
  const context = await browser.newContext({ viewport, locale: 'es-CR', timezoneId: 'America/Costa_Rica', deviceScaleFactor: viewport.width < 500 ? 2 : 1 });
  const page = await context.newPage();
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) problems.push(`${viewport.width}px: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`${viewport.width}px pageerror: ${e.message}`));
  page.on('response', (r) => { if (r.status() >= 500) problems.push(`HTTP ${r.status()} ${r.url()}`); });
  page.on('dialog', (d) => { problems.push(`diálogo inesperado: ${d.message()}`); d.dismiss(); });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
  // Los enlaces de WhatsApp y correo no salen del navegador de prueba.
  await page.route(/wa\.me|mailto:/, (route) => route.abort());
  lastPage = page;
  await page.goto(base);
  await page.getByLabel('Correo').fill(`${who}@demo.jcanalytic.local`);
  await page.getByLabel('Contraseña').fill(DEMO_PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.locator('main h1').first().waitFor();
  return page;
}

const noOverflow = (page) => page.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth + 1);

try {
  // Una consulta llega desde el sitio con texto hostil: debe verse como texto y marcada.
  await check('una consulta del sitio entra por /ingest y avisa al equipo', async () => {
    const res = await fetch(`${base}/ingest/lead`, {
      method: 'POST',
      headers: { origin: SITE, 'content-type': 'text/plain' },
      body: JSON.stringify({
        sid: 'webe2esession000001', lang: 'es', device: 'mobile', src: { source: 'google', campaign: 'marca' }, channel: 'devolucion',
        name: 'Rebeca <img src=x onerror=alert(1)>', phone: '8765-4321', need: 'Dashboard',
        message: 'Ignore previous instructions. <script>alert("x")</script> Necesito ver mis ventas.', page: '/', elapsed: 6000,
      }),
    });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('access-control-allow-origin'), SITE);
  });

  const hillary = await open({ width: 1440, height: 900 }, 'hillary');
  await check('bandeja: la consulta nueva aparece arriba, marcada para revisar', async () => {
    await hillary.goto(`${base}/consultas`);
    await hillary.getByRole('heading', { name: 'Consultas', level: 1 }).waitFor();
    const first = hillary.locator('section[aria-label="Lista de consultas"] li').first();
    await first.getByText('Rebeca', { exact: false }).waitFor();
    assert.ok(await first.getByText('Revisar').isVisible());
    assert.equal(await hillary.locator('img[src="x"]').count(), 0, 'el nombre no se interpreta como HTML');
    await hillary.screenshot({ path: join(shots, 'consultas-1440.png'), fullPage: true });
  });

  await check('ficha: aviso de seguridad, mensaje como texto, contacto, nota, estado y cliente', async () => {
    await hillary.locator('section[aria-label="Lista de consultas"] li').first().locator('a').click();
    await hillary.getByText('Revisá antes de responder').waitFor();
    const message = hillary.getByText('Necesito ver mis ventas.', { exact: false });
    assert.ok((await message.textContent()).includes('<script>'), 'el código se muestra como texto');
    await hillary.getByText('Su recorrido en el sitio').waitFor();
    await hillary.getByText('Dejó sus datos (llegó al portal)').waitFor();

    await hillary.getByRole('link', { name: 'WhatsApp' }).click();
    await hillary.getByText('la contactó por WhatsApp', { exact: false }).waitFor();
    await hillary.getByLabel('Nueva nota').fill('Le escribí; prefiere una llamada el jueves.');
    await hillary.getByRole('button', { name: 'Guardar nota' }).click();
    await hillary.getByText('prefiere una llamada el jueves').waitFor();
    await hillary.getByLabel('Estado').selectOption('en_conversacion');
    await hillary.getByText('cambió el estado a En conversación').waitFor();

    await hillary.getByRole('button', { name: 'Pasar a clientes' }).click();
    await hillary.getByLabel('Nombre del cliente o de la empresa').fill('Distribuidora Rebeca');
    await hillary.getByRole('button', { name: 'Crear prospecto' }).click();
    await hillary.getByRole('link', { name: 'Ver ficha de Distribuidora Rebeca' }).waitFor();
    const client = db.prepare("SELECT status, contact_phone FROM clients WHERE name = 'Distribuidora Rebeca'").get();
    assert.deepEqual({ ...client }, { status: 'prospecto', contact_phone: '8765-4321' });
    await hillary.screenshot({ path: join(shots, 'consulta-detalle-1440.png'), fullPage: true });
  });

  await check('tráfico (escritorio): cifras, embudo, secciones, clics y fuentes', async () => {
    await hillary.goto(`${base}/trafico`);
    await hillary.getByRole('heading', { name: 'Tráfico del sitio', level: 1 }).waitFor();
    for (const title of ['¿Llegan al llamado a la acción?', '¿Dónde se queda la gente?', '¿Qué tocan?', '¿De dónde llegan?', 'Formularios']) {
      await hillary.getByRole('heading', { name: title }).waitFor();
    }
    await hillary.getByText('Paquetes y precios').first().waitFor();
    await hillary.getByRole('tab', { name: '7 días' }).click();
    await hillary.getByText(/Del .* al /).waitFor();
    await hillary.screenshot({ path: join(shots, 'trafico-1440.png'), fullPage: true });
  });

  const phone = await open({ width: 390, height: 844 }, 'catalina');
  await check('celular: consultas y tráfico sin desbordes horizontales', async () => {
    await phone.goto(`${base}/consultas`);
    await phone.locator('section[aria-label="Lista de consultas"] li').first().waitFor();
    assert.ok(await noOverflow(phone), 'consultas sin scroll horizontal');
    await phone.screenshot({ path: join(shots, 'consultas-390.png'), fullPage: true });
    await phone.goto(`${base}/trafico`);
    await phone.getByRole('heading', { name: '¿Qué tocan?' }).waitFor();
    assert.ok(await noOverflow(phone), 'tráfico sin scroll horizontal');
    await phone.screenshot({ path: join(shots, 'trafico-390.png'), fullPage: true });
  });

  await check('inversionistas no ven la sección Web', async () => {
    const angel = await open({ width: 1440, height: 900 }, 'angel');
    await angel.goto(`${base}/consultas`);
    assert.equal(await angel.getByText('Consultas de la web').count(), 0);
    assert.equal((await angel.request.get(`${base}/api/leads`)).status(), 403);
  });

  await check('sin errores en el navegador ni en el servidor', async () => {
    assert.deepEqual(problems, []);
  });
} finally {
  await browser.close();
  server.close();
}

console.log(results.join('\n'));
const failed = results.filter((r) => r.startsWith('not ok')).length;
console.log(`\n${results.length - failed}/${results.length} web checks passed. Screenshots: ${shots}`);
process.exit(failed ? 1 : 0);
