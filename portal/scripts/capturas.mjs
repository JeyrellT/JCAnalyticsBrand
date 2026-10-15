// ============================================================================
//  scripts/capturas.mjs — capturas de pantalla del portal para revisión visual.
//  Levanta el servidor con una base demo temporal, entra como una persona y
//  fotografía las secciones en escritorio (1440 px) y celular (390 px),
//  en tema claro u oscuro. Requiere `npm run build` (o PORTAL_DIST).
//
//    node scripts/capturas.mjs <carpetaSalida> [--tema=light|dark] [--solo=inicio,tablero] [--quien=catalina] [--sufijo=-v4]
//    PORTAL_DIST=/ruta/a/otro/dist node scripts/capturas.mjs capturas --tema=dark
//
//  Chromium: PLAYWRIGHT_CHROMIUM o /opt/pw-browsers/chromium, o el de playwright.
// ============================================================================
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { seedDemo, DEMO_PASSWORD } from '../server/seed-demo.mjs';
import { openDatabase } from '../server/db.mjs';
import { createPortalServer } from '../server/app.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
const out = resolve(args.find((a) => !a.startsWith('--')) ?? 'capturas');
const opt = (name, fallback) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const theme = opt('tema', '');
const only = opt('solo', '').split(',').filter(Boolean);
const who = opt('quien', 'catalina');
const suffix = opt('sufijo', theme === 'dark' ? '-oscuro' : '');
const dist = process.env.PORTAL_DIST ? resolve(process.env.PORTAL_DIST) : join(root, 'dist');
if (!existsSync(join(dist, 'index.html'))) { console.error(`Falta ${dist}/index.html: ejecutá npm run build`); process.exit(1); }

await mkdir(out, { recursive: true });
const dir = await mkdtemp(join(tmpdir(), 'portal-capturas-'));
await seedDemo(join(dir, 'capturas.sqlite'));
const db = openDatabase(join(dir, 'capturas.sqlite'));
const server = createPortalServer({ db, env: {}, staticDir: dist, logger: { error: console.error, info() {} } });
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const executablePath = process.env.PLAYWRIGHT_CHROMIUM || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const browser = await chromium.launch({ executablePath });

const DESKTOP = [
  ['inicio', '/'], ['tablero', '/tablero', false], ['agenda', '/agenda', false], ['proyectos', '/proyectos'], ['proyecto', '/proyectos/1'],
  ['clientes', '/clientes'], ['cliente', '/clientes/1'], ['servicios', '/servicios'], ['servicio', '/servicios/software_medida'], ['equipo', '/equipo'], ['persona', '/equipo/1'],
  ['inversiones', '/inversiones'], ['inversion', '/inversiones/1'], ['buzon', '/buzon'], ['automatizaciones', '/automatizaciones'], ['avisos', '/notificaciones'], ['bitacora', '/bitacora'],
  // v5: brief creativo
  ['briefs', '/briefs'], ['brief', '/briefs/1'], ['brief-nuevo', '/briefs/nuevo?cliente=1'],
];
const MOBILE = [
  ['inicio', '/'], ['tablero', '/tablero', false], ['agenda', '/agenda', false], ['proyectos', '/proyectos'], ['proyecto', '/proyectos/1'], ['inversiones', '/inversiones'],
  ['inversion', '/inversiones/1'], ['clientes', '/clientes'], ['servicios', '/servicios'], ['equipo', '/equipo'], ['buzon', '/buzon'], ['automatizaciones', '/automatizaciones'], ['avisos', '/notificaciones'],
  ['briefs', '/briefs'], ['brief', '/briefs/1'],
];

async function run(viewport, pages, prefix) {
  const context = await browser.newContext({ viewport, locale: 'es-CR', timezoneId: 'America/Costa_Rica', deviceScaleFactor: viewport.width < 500 ? 2 : 1, colorScheme: theme === 'dark' ? 'dark' : 'light' });
  if (theme) await context.addInitScript((t) => { try { localStorage.setItem('jcp:theme', t); } catch { /* sin almacenamiento */ } }, theme);
  const page = await context.newPage();
  await page.goto(base);
  await page.waitForTimeout(400);
  if (!only.length || only.includes('login')) await page.screenshot({ path: join(out, `${prefix}-login${suffix}.png`), fullPage: true });
  await page.getByLabel('Correo').fill(`${who}@demo.jcanalytic.local`);
  await page.getByLabel('Contraseña', { exact: true }).fill(DEMO_PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.locator('main h1').first().waitFor();
  for (const [name, path, full] of pages) {
    if (only.length && !only.includes(name)) continue;
    await page.goto(base + path);
    await page.locator('main h1').first().waitFor();
    await page.waitForTimeout(900); // animaciones de entrada
    await page.screenshot({ path: join(out, `${prefix}-${name}${suffix}.png`), fullPage: full !== false });
  }
  await context.close();
}

try {
  await run({ width: 1440, height: 900 }, DESKTOP, 'escritorio');
  await run({ width: 390, height: 844 }, MOBILE, 'celular');
  console.info(`Capturas en ${out}`);
} finally {
  await browser.close();
  server.close();
  await rm(dir, { recursive: true, force: true });
}
