// ============================================================================
//  tests/e2e.mjs — prueba de punta a punta en un navegador real.
//  Requiere `npm run build`. Crea una base demo temporal, levanta el servidor
//  y recorre los flujos clave con dos personas (socia y colaboradora), en
//  escritorio (1440 px) y móvil (390 px). Guarda capturas en test-results/.
//
//    npm run build && npm run e2e
//  Chromium: PLAYWRIGHT_CHROMIUM o /opt/pw-browsers/chromium, o el de playwright.
// ============================================================================

import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { seedDemo, DEMO_PASSWORD } from '../server/seed-demo.mjs';
import { openDatabase } from '../server/db.mjs';
import { createPortalServer } from '../server/app.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
const shots = join(root, 'test-results');
if (!existsSync(join(dist, 'index.html'))) { console.error('Falta dist/: ejecutá npm run build'); process.exit(1); }
await mkdir(shots, { recursive: true });

const dir = await mkdtemp(join(tmpdir(), 'portal-e2e-'));
const dbPath = join(dir, 'e2e.sqlite');
await seedDemo(dbPath);
const db = openDatabase(dbPath);
const server = createPortalServer({ db, env: {}, staticDir: dist, logger: { error: console.error, info() {} } });
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const executablePath = process.env.PLAYWRIGHT_CHROMIUM || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const browser = await chromium.launch({ executablePath });
const consoleErrors = [];
let step = 0;
let lastPage = null;
const results = [];

async function check(name, fn) {
  step += 1;
  try {
    await fn();
    results.push(`ok ${step} - ${name}`);
  } catch (error) {
    await lastPage?.screenshot({ path: join(shots, `fallo-${step}.png`) }).catch(() => {});
    results.push(`not ok ${step} - ${name}\n  ${String(error.message).split('\n').slice(0, 6).join('\n  ')}`);
  }
}

async function newPage(viewport) {
  const context = await browser.newContext({ viewport, locale: 'es-CR', timezoneId: 'America/Costa_Rica', deviceScaleFactor: viewport.width < 500 ? 2 : 1 });
  const page = await context.newPage();
  // "Failed to load resource" es ruido de red (fuentes bloqueadas, el 401 esperado antes del login);
  // los errores reales del servidor se vigilan con las respuestas 5xx.
  page.on('console', (msg) => { if (msg.type() === 'error' && !msg.text().startsWith('Failed to load resource')) consoleErrors.push(`${viewport.width}px: ${msg.text()}`); });
  page.on('response', (res) => { if (res.status() >= 500) consoleErrors.push(`${viewport.width}px: HTTP ${res.status()} ${res.url()}`); });
  lastPage = page;
  page.on('pageerror', (err) => consoleErrors.push(`${viewport.width}px pageerror: ${err.message}`));
  // Sin internet en CI: las fuentes de Google se omiten sin romper la página.
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
  return page;
}

async function login(page, who) {
  await page.goto(base);
  await page.getByLabel('Correo').fill(`${who}@demo.jcanalytic.local`);
  await page.getByLabel('Contraseña').fill(DEMO_PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();
  // <main> solo existe dentro del portal (la pantalla de login también tiene un h1).
  await page.locator('main h1').first().waitFor();
}

const shot = (page, name) => page.screenshot({ path: join(shots, `${name}.png`), fullPage: true });

try {
  // ── Escritorio: Catalina (socia) ──────────────────────────────────────────
  const page = await newPage({ width: 1440, height: 900 });

  await check('login rechaza contraseña incorrecta', async () => {
    await page.goto(base);
    await page.getByLabel('Correo').fill('catalina@demo.jcanalytic.local');
    await page.getByLabel('Contraseña').fill('equivocada123');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await page.getByRole('alert').filter({ hasText: 'incorrectos' }).waitFor();
    await shot(page, '01-login');
  });

  await check('centro de operaciones muestra alertas e indicadores', async () => {
    await login(page, 'catalina');
    await page.getByRole('heading', { name: /Catalina/ }).waitFor();
    await page.getByText('Requiere acción').waitFor();
    await page.getByText(/h sin avance/).first().waitFor();
    await page.getByText('Pulso de inversiones').waitFor();
    await shot(page, '02-centro-operaciones');
  });

  await check('portal de proyectos con semáforo de 72 h', async () => {
    await page.getByRole('link', { name: 'Proyectos', exact: true }).first().click();
    await page.getByRole('heading', { name: 'Proyectos', level: 1 }).waitFor();
    await page.getByText(/Sin avance · \d+ h/).first().waitFor();
    await shot(page, '03-proyectos');
    await page.getByRole('link', { name: /Pedidos en línea La Burrada/ }).click();
    await page.getByRole('heading', { name: 'Avance al cliente' }).waitFor();
    await page.getByRole('button', { name: 'Registrar avance' }).click();
    await page.getByLabel('¿Qué avanzamos?').fill('Carrito probado en Android; mañana demo del panel de cocina.');
    await page.getByRole('dialog').getByRole('button', { name: 'Registrar avance' }).click();
    await page.getByText(/Avance al día/).first().waitFor();
    await shot(page, '04-proyecto-detalle');
  });

  await check('tablero: crear y mover una tarea', async () => {
    await page.goto(`${base}/tablero`);
    await page.getByRole('heading', { name: 'Tablero', level: 1 }).waitFor();
    const col = page.getByRole('region', { name: 'Por hacer' });
    await col.getByRole('button', { name: 'Agregar tarea' }).click();
    await col.getByLabel('Título').fill('Cotización dashboard El Roble');
    await col.getByRole('button', { name: 'Agregar', exact: true }).click();
    const card = page.locator('article', { hasText: 'Cotización dashboard El Roble' });
    await card.waitFor();
    // En escritorio, el detalle de la tarea permite cambiar la columna sin arrastrar (teclado).
    await card.getByRole('button').first().click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Columna').selectOption('en_progreso');
    await dialog.getByLabel('Prioridad').selectOption('alta');
    await dialog.getByRole('button', { name: 'Guardar' }).click();
    await page.getByRole('region', { name: 'En progreso' }).locator('article', { hasText: 'Cotización dashboard El Roble' }).waitFor();
    await shot(page, '05-tablero');
  });

  await check('tablero: arrastrar y soltar entre columnas', async () => {
    const card = page.locator('article', { hasText: 'Cotización dashboard El Roble' });
    // Soltar sobre el encabezado de la columna (ya visible): si Playwright desplaza la página
    // entre el clic y el movimiento, el arrastre arrancaría sobre otra tarjeta.
    await card.dragTo(page.getByRole('region', { name: 'Revisión' }), { targetPosition: { x: 60, y: 24 } });
    await page.getByRole('region', { name: 'Revisión' }).locator('article', { hasText: 'Cotización dashboard El Roble' }).waitFor();
    const res = await page.request.get(`${base}/api/tasks`);
    const task = (await res.json()).tasks.find((t) => t.title === 'Cotización dashboard El Roble');
    assert.equal(task.status, 'revision', 'el servidor guardó la nueva columna');
  });

  await check('agenda: semana, choque de horario y nueva cita', async () => {
    await page.goto(`${base}/agenda`);
    await page.getByRole('heading', { name: 'Agenda', level: 1 }).waitFor();
    await shot(page, '06-agenda');
    await page.getByRole('button', { name: 'Nueva cita' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Asunto').fill('Revisión de alcance Taller Ticos');
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Costa_Rica' }).format(new Date());
    await dialog.getByLabel('Inicio (hora CR)').fill(`${today}T15:30`);
    await dialog.getByText('Choque de horario').waitFor(); // Catalina ya tiene la sesión de alcance de 15:00
    await shot(page, '07-agenda-choque');
    await dialog.getByRole('button', { name: 'Guardar igual' }).click();
    await page.getByText('Cita agendada').waitFor();
  });

  await check('inversiones: portafolio, detalle y reparto pro-rata', async () => {
    await page.goto(`${base}/inversiones`);
    await page.getByText('Capital acumulado del portafolio').waitFor();
    await page.getByText('Cuenta de cada socio').waitFor();
    await shot(page, '08-inversiones');
    await page.getByRole('link', { name: /BarberXCR · capital de crecimiento/ }).click();
    await page.getByRole('heading', { name: 'Libro de movimientos' }).waitFor();
    await page.getByRole('button', { name: 'Repartir retorno' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Monto total a repartir').fill('150.000');
    await dialog.getByText('Se registrará: ₡150').waitFor();
    await dialog.getByLabel('Mensaje para los socios').fill('Retorno extra por 2 barberías nuevas en Heredia.');
    await shot(page, '09-reparto');
    await dialog.getByRole('button', { name: 'Repartir y notificar' }).click();
    await page.getByText('Retorno repartido').waitFor();
    await shot(page, '10-inversion-detalle');
  });

  await check('buzón: confirmar un aporte con mensaje de vuelta', async () => {
    await page.goto(`${base}/buzon`);
    await page.getByRole('heading', { name: 'Por confirmar' }).waitFor();
    const card = page.locator('article', { hasText: 'aporte de' }).filter({ hasText: 'Alex Benedict' }).first();
    await card.getByLabel('Mensaje de vuelta').fill('Recibido en la cuenta de pauta, gracias Alex.');
    await shot(page, '11-buzon');
    await card.getByRole('button', { name: 'Confirmar recibido' }).click();
    await page.getByText('Confirmado. Se envió tu mensaje de vuelta.').waitFor();
    const pending = await (await page.request.get(`${base}/api/movements/pending`)).json();
    assert.ok(!pending.to_confirm.some((m) => m.partner_name === 'Alex Benedict' && m.type === 'aporte'));
  });

  await check('bitácora registra las acciones', async () => {
    await page.goto(`${base}/bitacora`);
    await page.getByText(/confirmó el aporte/).first().waitFor();
    await page.getByText(/distribuyó/).first().waitFor();
    await shot(page, '12-bitacora');
  });

  await check('equipo: directorio de personas, ficha y perfil', async () => {
    await page.goto(`${base}/equipo`);
    await page.getByRole('heading', { name: 'Equipo', level: 1 }).waitFor();
    await page.getByRole('link', { name: 'Alex Benedict' }).first().waitFor();
    await shot(page, '13-equipo');
    await page.getByRole('link', { name: 'Alex Benedict' }).first().click();
    await page.getByRole('heading', { name: /Alex Benedict/, level: 1 }).waitFor();
    await page.getByRole('heading', { name: /Proyectos/ }).first().waitFor();
    await shot(page, '14-persona');
    await page.goto(`${base}/equipo?tab=perfil`);
    await page.getByRole('heading', { name: 'Mi perfil' }).waitFor();
  });

  await check('servicios: catálogo con líderes y detalle', async () => {
    await page.goto(`${base}/servicios`);
    await page.getByRole('heading', { name: 'Servicios', level: 1 }).waitFor();
    await page.getByText('Dashboard Power BI').first().waitFor();
    await shot(page, '15-servicios');
    await page.getByRole('link', { name: /Dashboard Power BI/ }).first().click();
    await page.getByRole('heading', { name: 'Dashboard Power BI', level: 1 }).waitFor();
    await page.getByRole('heading', { name: 'Quién lo hace' }).waitFor();
    await page.getByText('Jeyrell').first().waitFor();
  });

  await check('clientes: crear un cliente y abrir su ficha', async () => {
    await page.goto(`${base}/clientes`);
    await page.getByRole('heading', { name: 'Clientes', level: 1 }).waitFor();
    await page.getByText('La Burrada Street Food').first().waitFor();
    await shot(page, '16-clientes');
    await page.getByRole('button', { name: 'Nuevo cliente' }).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Nombre del cliente').fill('Soda La Esquina');
    await dialog.getByLabel('Persona de contacto').fill('Doña Marta');
    await dialog.getByLabel('WhatsApp / teléfono').fill('8811-2233');
    await dialog.getByRole('button', { name: 'Crear cliente' }).click();
    await page.getByRole('heading', { name: 'Soda La Esquina', level: 1 }).waitFor();
    await shot(page, '17-cliente-detalle');
  });

  // ── Colaboradora: sin acceso a inversiones ────────────────────────────────
  await check('colaboradora no ve inversiones y cerrar sesión la deja fuera', async () => {
    const p2 = await newPage({ width: 1440, height: 900 });
    await login(p2, 'hillary');
    assert.equal(await p2.getByRole('link', { name: 'Inversiones' }).count(), 0);
    await p2.goto(`${base}/inversiones`);
    await p2.getByText('Esta sección no existe').waitFor();
    const api = await p2.request.get(`${base}/api/investments`);
    assert.equal(api.status(), 403);
    // Cerrar sesión revoca la cookie en el servidor: al recargar sigue fuera.
    await p2.getByRole('button', { name: 'Cerrar sesión' }).first().click();
    await p2.getByRole('button', { name: 'Entrar' }).waitFor();
    await p2.reload();
    await p2.getByRole('button', { name: 'Entrar' }).waitFor();
    assert.equal((await p2.request.get(`${base}/api/me`)).status(), 401);
    await p2.context().close();
  });

  // ── Móvil (390 px): Jeyrell (admin) ───────────────────────────────────────
  await check('móvil: Mi día, tablero por columnas, acciones rápidas y menú Más', async () => {
    const m = await newPage({ width: 390, height: 844 });
    const nav = () => m.getByRole('navigation', { name: 'Accesos rápidos' });
    const noOverflow = async (where) => {
      const extra = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert.ok(extra <= 1, `${where}: sin scroll horizontal (sobra ${extra}px)`);
    };
    await login(m, 'jeyrell');
    await shot(m, '20-movil-centro');
    await noOverflow('inicio');

    // Tablero: una columna a la vez, se cambia con chips y "Mover a" sigue a la tarjeta.
    await nav().getByRole('link', { name: 'Tablero' }).click();
    await m.getByRole('heading', { name: 'Tablero', level: 1 }).waitFor();
    await shot(m, '21-movil-tablero');
    await noOverflow('tablero');
    await m.getByRole('button', { name: /^Backlog/ }).click();
    const mobileCard = m.locator('article', { hasText: 'Recordatorios automáticos por WhatsApp' });
    await mobileCard.getByLabel(/Mover/).selectOption('por_hacer');
    await m.getByRole('region', { name: 'Por hacer' }).locator('article', { hasText: 'Recordatorios automáticos por WhatsApp' }).waitFor();

    // Botón "+": crear una tarea desde cualquier pantalla.
    await nav().getByRole('button', { name: 'Crear' }).click();
    await m.getByRole('dialog', { name: 'Crear' }).getByRole('link', { name: /Nueva tarea/ }).click();
    await m.getByRole('dialog', { name: 'Nueva tarea' }).waitFor();
    await shot(m, '22-movil-nueva-tarea');
    await m.keyboard.press('Escape');
    await m.getByRole('dialog', { name: 'Nueva tarea' }).waitFor({ state: 'detached' });

    await nav().getByRole('link', { name: 'Agenda' }).click();
    await m.getByRole('heading', { name: 'Agenda', level: 1 }).waitFor();
    await shot(m, '23-movil-agenda');

    // "Más": el resto de secciones en mosaicos grandes.
    await nav().getByRole('button', { name: /^Más/ }).click();
    await shot(m, '24-movil-mas');
    await m.getByRole('dialog', { name: 'Más secciones' }).getByRole('link', { name: 'Inversiones' }).click();
    await m.getByText('Cuenta de cada socio').waitFor();
    await shot(m, '25-movil-inversiones');
    await nav().getByRole('button', { name: /^Más/ }).click();
    await m.getByRole('dialog', { name: 'Más secciones' }).getByRole('link', { name: 'Clientes' }).click();
    await m.getByRole('heading', { name: 'Clientes', level: 1 }).waitFor();
    await noOverflow('clientes');
    await shot(m, '26-movil-clientes');
    await nav().getByRole('button', { name: /^Más/ }).click();
    await m.getByRole('dialog', { name: 'Más secciones' }).getByRole('link', { name: 'Servicios' }).click();
    await m.getByRole('heading', { name: 'Servicios', level: 1 }).waitFor();
    await noOverflow('servicios');
    await shot(m, '27-movil-servicios');

    // Menú lateral → equipo → pestaña Ajustes (solo admin).
    await m.getByRole('button', { name: 'Abrir menú' }).click();
    await m.getByRole('dialog', { name: 'Menú' }).getByRole('link', { name: 'Equipo y ajustes' }).click();
    await m.getByRole('heading', { name: 'Equipo', level: 1 }).waitFor();
    await noOverflow('equipo');
    await shot(m, '28-movil-equipo');
    await m.getByRole('tab', { name: /Ajustes/ }).click();
    await m.getByRole('heading', { name: 'Ajustes operativos' }).waitFor();
    await noOverflow('ajustes');
    await m.context().close();
  });

  await check('sin errores de consola', async () => {
    assert.deepEqual(consoleErrors, []);
  });
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
  db.close();
  await rm(dir, { recursive: true, force: true });
}

console.log(results.join('\n'));
const failed = results.filter((r) => r.startsWith('not ok')).length;
console.log(`\n${results.length - failed}/${results.length} ok · capturas en test-results/`);
process.exit(failed ? 1 : 0);
