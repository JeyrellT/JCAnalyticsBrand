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

  await check('tema oscuro: se aplica, se guarda y vuelve a claro', async () => {
    const theme = () => page.evaluate(() => ({ attr: document.documentElement.getAttribute('data-theme'), saved: localStorage.getItem('jcp:theme'), bg: getComputedStyle(document.body).backgroundColor, meta: document.querySelector('meta[name="theme-color"]')?.content }));
    const light = await theme();
    await page.getByRole('button', { name: 'Cambiar a tema oscuro' }).first().click();
    const dark = await theme();
    assert.equal(dark.attr, 'dark');
    assert.equal(dark.saved, 'dark', 'la preferencia queda guardada en el navegador');
    assert.notEqual(dark.bg, light.bg, 'el fondo cambia con el tema');
    assert.equal(dark.meta, '#070e1b', 'la barra del sistema acompaña al tema');
    await shot(page, '02b-centro-operaciones-oscuro');
    // Sobrevive a la recarga (se aplica antes de pintar) y se puede volver a claro.
    await page.reload();
    await page.getByRole('heading', { name: /Catalina/ }).waitFor();
    assert.equal((await theme()).attr, 'dark');
    await page.getByRole('button', { name: 'Cambiar a tema claro' }).first().click();
    assert.equal((await theme()).attr, 'light');
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

  await check('avisos y app: manifiesto, app instalable y preferencias', async () => {
    const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
    const manifest = await (await page.request.get(`${base}${manifestHref}`)).json();
    assert.equal(manifest.display, 'standalone');
    assert.ok(manifest.icons.some((i) => i.purpose?.includes('maskable')), 'ícono maskable para Android');
    assert.ok(manifest.shortcuts?.length >= 3, 'atajos al mantener presionado el ícono');
    const swReady = await page.evaluate(() => Promise.race([
      navigator.serviceWorker.ready.then((r) => !!r.active),
      new Promise((resolve) => setTimeout(() => resolve(false), 8000)),
    ]));
    assert.ok(swReady, 'el service worker queda activo (app instalable y sin conexión)');
    await page.goto(`${base}/notificaciones`);
    await page.getByRole('heading', { name: 'Avisos y app', level: 1 }).waitFor();
    const tareas = page.getByRole('switch', { name: /Tareas y comentarios/ }).first();
    await tareas.waitFor();
    assert.equal(await tareas.getAttribute('aria-checked'), 'true');
    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/me/notification-prefs') && r.request().method() === 'PATCH'),
      tareas.click(),
    ]);
    const prefs = (await (await page.request.get(`${base}/api/me/notification-prefs`)).json()).prefs;
    assert.equal(prefs.categories.tareas, false, 'la preferencia quedó guardada en el servidor');
    await page.getByText('El servidor todavía no tiene avisos activos', { exact: false }).waitFor();
    await shot(page, '18-avisos-y-app');
  });

  await check('automatizaciones: el admin prueba una y crea una tarea recurrente', async () => {
    const adminPage = await newPage({ width: 1440, height: 900 });
    await login(adminPage, 'jeyrell');
    await adminPage.goto(`${base}/automatizaciones`);
    await adminPage.getByRole('heading', { name: 'Automatizaciones', level: 1 }).waitFor();
    await adminPage.getByRole('switch', { name: 'Recordatorio de citas' }).waitFor();
    await shot(adminPage, '19-automatizaciones');
    await adminPage.getByRole('button', { name: /Probar ahora: Tareas recurrentes/ }).click();
    await adminPage.locator('[aria-live="polite"]').getByText(/./).first().waitFor();
    await adminPage.getByRole('button', { name: 'Nueva tarea recurrente' }).first().click();
    const dialog = adminPage.getByRole('dialog');
    await dialog.getByLabel('Título').fill('Revisar pauta de BarberXCR');
    await dialog.getByRole('radio', { name: 'Semanal' }).check({ force: true });
    await dialog.getByRole('radio', { name: 'Lunes' }).check({ force: true });
    await dialog.getByRole('button', { name: /Guardar|Crear/ }).last().click();
    await adminPage.getByText('Revisar pauta de BarberXCR').first().waitFor();
    const list = await (await adminPage.request.get(`${base}/api/recurring-tasks`)).json();
    assert.ok(list.recurring.some((r) => r.title === 'Revisar pauta de BarberXCR' && r.frequency === 'semanal' && r.weekday === 1));
    await adminPage.context().close();
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

  // ── v5: portal de clientes y brief creativo ───────────────────────────────
  const CLIENT_EMAIL = 'laburrada@clientes.demo.jcanalytic.local';
  const noHorizontalScroll = async (p, where) => {
    const { scroll, width } = await p.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: window.innerWidth }));
    assert.ok(scroll <= width + 1, `${where}: desborde horizontal (${scroll} > ${width})`);
  };

  await check('portal de clientes: ingreso con el selector, aislamiento y pedido de cambios', async () => {
    const c = await newPage({ width: 1440, height: 900 });
    await c.goto(`${base}/cliente`);
    // Desde /cliente el login arranca en "Clientes".
    assert.equal(await c.getByRole('radio', { name: 'Clientes' }).getAttribute('aria-checked'), 'true');
    await c.getByLabel('Correo').fill(CLIENT_EMAIL);
    await c.getByLabel('Contraseña').fill(DEMO_PASSWORD);
    await c.getByRole('button', { name: 'Entrar' }).click();
    await c.getByRole('heading', { name: 'Requiere tu atención' }).waitFor();
    await c.getByText('La Burrada Street Food').first().waitFor();
    await shot(c, '30-cliente-inicio');

    // Una sesión de cliente no abre nada del equipo: ni la API ni las pantallas.
    assert.equal((await c.request.get(`${base}/api/me`)).status(), 401);
    assert.equal((await c.request.get(`${base}/api/projects`)).status(), 401);
    await c.goto(`${base}/inversiones`);
    await c.waitForURL(/\/cliente$/);

    // Entregable por revisar → pedir cambios con nota.
    await c.goto(`${base}/cliente/entregables`);
    await c.getByRole('link', { name: /Historias semana 1/ }).first().click();
    await c.getByLabel('Comentario para el equipo').fill('Más grande el logo y el precio, por favor.');
    await c.getByRole('button', { name: /Pedir cambios/ }).click();
    await c.getByText(/Cambios (solicitados|pedidos)/).first().waitFor();
    await shot(c, '31-cliente-entregable-cambios');

    // Solicitud enviada (brief CREATIVIDAD) y su versión imprimible.
    await c.goto(`${base}/cliente/solicitudes`);
    await c.getByRole('link', { name: /Giveaway Tacos/ }).first().click();
    await c.getByText('BRF-2026-0001').first().waitFor();
    await shot(c, '32-cliente-solicitud');
    await c.getByRole('link', { name: /Imprimir/ }).first().click();
    await c.getByText(/CREATIVIDAD/i).first().waitFor();
    await c.getByText('La Burrada · GIVEAWAY TACOS').first().waitFor();
    await shot(c, '33-brief-imprimible');
    await c.context().close();
  });

  await check('equipo: el brief del cliente llega a la bandeja y se aprueba con versión congelada', async () => {
    const t = await newPage({ width: 1440, height: 900 });
    await login(t, 'catalina');
    await t.goto(`${base}/briefs?estado=enviado`);
    await t.getByRole('heading', { name: 'Briefs', level: 1 }).waitFor();
    await shot(t, '34-briefs-bandeja');
    await t.getByRole('link', { name: /Giveaway Tacos/ }).first().click();
    await t.getByText('BRF-2026-0001').first().waitFor();
    await t.getByRole('button', { name: 'Aprobar brief' }).first().click();
    const dialog = t.getByRole('dialog', { name: 'Aprobar brief' });
    await dialog.getByRole('button', { name: 'Aprobar brief' }).click();
    await dialog.waitFor({ state: 'detached' });
    await t.getByText('Aprobado').first().waitFor();
    // La versión 1 sigue verificable por su huella.
    const api = await t.request.get(`${base}/api/briefs/1/versions/1`);
    assert.equal((await api.json()).version.hash_ok, true);
    await shot(t, '35-brief-aprobado');
    // Ficha del cliente con su portal.
    await t.goto(`${base}/clientes/1`);
    await t.getByRole('heading', { name: 'Portal del cliente' }).waitFor();
    await shot(t, '36-cliente-portal-equipo');
    await t.context().close();
  });

  await check('móvil: portal de clientes sin desborde y con barra inferior', async () => {
    const m2 = await newPage({ width: 390, height: 844 });
    await m2.goto(`${base}/cliente`);
    await m2.getByLabel('Correo').fill(CLIENT_EMAIL);
    await m2.getByLabel('Contraseña').fill(DEMO_PASSWORD);
    await m2.getByRole('button', { name: 'Entrar' }).click();
    await m2.getByRole('heading', { name: 'Requiere tu atención' }).waitFor();
    await noHorizontalScroll(m2, 'cliente inicio');
    await shot(m2, '37-movil-cliente-inicio');
    for (const path of ['/cliente/proyectos', '/cliente/solicitudes', '/cliente/entregables', '/cliente/documentos', '/cliente/solicitudes/nueva']) {
      await m2.goto(base + path);
      await m2.locator('main h1').first().waitFor();
      await m2.waitForTimeout(300);
      await noHorizontalScroll(m2, path);
    }
    await shot(m2, '38-movil-cliente-nueva-solicitud');
    await m2.context().close();
  });

  // ── v6: tres accesos, inversionistas desde el equipo y configuración inicial ─
  await check('ingreso: /inversionista preselecciona Inversionistas y cada rol abre su portal', async () => {
    const v = await newPage({ width: 390, height: 844 });
    await v.goto(`${base}/inversionista`);
    assert.equal(await v.getByRole('radio', { name: 'Inversionistas' }).getAttribute('aria-checked'), 'true');
    // Las flechas recorren las tres opciones en ciclo.
    await v.getByRole('radio', { name: 'Inversionistas' }).focus();
    await v.keyboard.press('ArrowRight');
    assert.equal(await v.getByRole('radio', { name: 'Clientes' }).getAttribute('aria-checked'), 'true');
    await v.keyboard.press('ArrowRight');
    assert.equal(await v.getByRole('radio', { name: 'Equipo' }).getAttribute('aria-checked'), 'true');
    await v.keyboard.press('ArrowLeft');
    await v.keyboard.press('ArrowRight');
    await v.keyboard.press('ArrowRight');
    assert.equal(await v.getByRole('radio', { name: 'Inversionistas' }).getAttribute('aria-checked'), 'true');
    assert.ok((await v.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 1, 'ingreso sin desborde en 390 px');
    await shot(v, '40-movil-ingreso-inversionistas');
    // Un inversionista entra por el mismo ingreso y nunca ve el portal del equipo.
    await v.getByLabel('Correo').fill('angel@demo.jcanalytic.local');
    await v.getByLabel('Contraseña').fill(DEMO_PASSWORD);
    const loginRes = v.waitForResponse((r) => r.url().endsWith('/api/auth/login'));
    await v.getByRole('button', { name: 'Entrar' }).click();
    assert.equal((await loginRes).status(), 200);
    await v.getByRole('button', { name: 'Entrar' }).waitFor({ state: 'detached' });
    assert.equal((await (await v.request.get(`${base}/api/me`)).json()).user.role, 'inversionista');
    assert.equal(await v.getByRole('navigation', { name: 'Accesos rápidos' }).count(), 0);
    await v.context().close();
    // Alguien del equipo que entra por un enlace de inversionistas arranca en su inicio.
    const u = await newPage({ width: 1440, height: 900 });
    await u.goto(`${base}/inversionista`);
    await u.getByRole('radio', { name: 'Equipo' }).click();
    await u.getByLabel('Correo').fill('catalina@demo.jcanalytic.local');
    await u.getByLabel('Contraseña').fill(DEMO_PASSWORD);
    await u.getByRole('button', { name: 'Entrar' }).click();
    await u.getByRole('heading', { name: /Catalina/ }).waitFor();
    assert.equal(new URL(u.url()).pathname, '/');
    await u.context().close();
  });

  await check('equipo: el admin agrega un inversionista y recibe su acceso a /inversionista', async () => {
    const a = await newPage({ width: 1440, height: 900 });
    await login(a, 'jeyrell');
    await a.goto(`${base}/equipo`);
    await a.getByRole('heading', { name: 'Inversionistas' }).waitFor();
    await a.getByText('angel@demo.jcanalytic.local').waitFor();
    await a.getByRole('button', { name: 'Agregar inversionista' }).click();
    const dialog = a.getByRole('dialog', { name: 'Agregar persona' });
    assert.equal(await dialog.getByRole('radio', { name: 'Inversionista' }).isChecked(), true);
    await dialog.getByRole('radio', { name: /Con su correo/ }).click();
    await dialog.getByLabel('Nombre completo').fill('Marta Solís');
    await dialog.getByLabel('Correo').fill('marta.solis@correo.cr');
    await dialog.getByLabel('WhatsApp').fill('8811-2233');
    await dialog.getByRole('button', { name: 'Guardar' }).click();
    const temp = a.getByRole('dialog', { name: 'Contraseña temporal' });
    await temp.getByText(`${base}/inversionista`).waitFor();
    const wa = decodeURIComponent(await temp.getByRole('link', { name: /WhatsApp/ }).getAttribute('href'));
    assert.ok(wa.includes('portal de inversionistas') && wa.includes(`${base}/inversionista`), 'el mensaje lleva el enlace del portal de inversionistas');
    await shot(a, '41-equipo-acceso-inversionista');
    await temp.getByRole('button', { name: 'Listo' }).click();
    const users = (await (await a.request.get(`${base}/api/users`)).json()).users;
    assert.ok(users.some((u) => u.email === 'marta.solis@correo.cr' && u.role === 'inversionista' && u.must_change_password));
    // La cartera de inversiones la marca como inversionista.
    await a.goto(`${base}/inversiones`);
    await a.locator('li', { hasText: 'Ángel Mora' }).getByText('Inversionista', { exact: true }).first().waitFor();
    await a.context().close();
  });

  await check('enlaces: "solo el nombre" genera un enlace personal y la persona se registra sola', async () => {
    const a = await newPage({ width: 1440, height: 900 });
    await login(a, 'jeyrell');
    await a.goto(`${base}/equipo`);
    await a.getByRole('button', { name: 'Agregar persona' }).first().click();
    const dialog = a.getByRole('dialog', { name: 'Agregar persona' });
    await dialog.getByLabel('Nombre completo').fill('Lucía Brenes');
    await dialog.getByRole('button', { name: 'Crear enlace' }).click();
    const share = a.getByRole('dialog', { name: 'Enlace listo para compartir' });
    await share.getByRole('button', { name: 'Código QR' }).click();
    await share.getByRole('img', { name: 'Código QR del enlace' }).waitFor();
    const link = (await share.locator('.font-mono.select-all').innerText()).trim();
    assert.ok(link.startsWith(`${base}/registro/`), link);
    await shot(a, '42-enlace-personal-qr');
    await a.context().close();

    const p = await newPage({ width: 390, height: 844 });
    await p.goto(link);
    await p.getByRole('heading', { name: '¡Hola, Lucía!' }).waitFor();
    assert.equal(await p.getByLabel('Nombre completo').inputValue(), 'Lucía Brenes');
    await p.getByLabel('Correo').fill('lucia.brenes@correo.cr');
    await p.getByLabel('Contraseña', { exact: true }).fill('LuciaSegura2026');
    await p.getByLabel('Confirmar contraseña').fill('LuciaSegura2026');
    await p.getByRole('button', { name: /Crear mi acceso/ }).click();
    await p.getByText('Lucía', { exact: false }).first().waitFor();
    await p.waitForURL(`${base}/`);
    await shot(p, '43-registro-con-enlace');
    // El enlace personal ya no sirve.
    const again = await newPage({ width: 390, height: 844 });
    await again.goto(link);
    await again.getByRole('heading', { name: 'Este enlace ya se completó' }).waitFor();
    await p.context().close();
    await again.context().close();
  });

  await check('configuración inicial: con la base vacía el dueño crea su cuenta una sola vez', async () => {
    const setupDb = openDatabase(join(dir, 'setup.sqlite'));
    const setupServer = createPortalServer({ db: setupDb, env: {}, staticDir: dist, setupCode: 'PRUEBA-2026-ABCD', logger: { error: console.error, info() {} } });
    await new Promise((r) => setupServer.listen(0, '127.0.0.1', r));
    const fresh = `http://127.0.0.1:${setupServer.address().port}`;
    try {
      const s = await newPage({ width: 390, height: 844 });
      await s.goto(fresh);
      await s.getByRole('heading', { name: 'Configurá tu portal' }).waitFor();
      assert.ok((await s.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 1, 'configuración sin desborde en 390 px');
      await s.getByLabel('Código de configuración').fill('prueba-2026-abcd');
      await s.getByLabel('Nombre completo').fill('Dueña Portal');
      await s.getByLabel('Correo').fill('duena@jc.test');
      await s.getByLabel('Contraseña', { exact: true }).fill('Montaña2026segura');
      await s.getByLabel('Confirmar contraseña').fill('Montaña2026segura');
      await shot(s, '42-movil-configuracion-inicial');
      await s.getByRole('button', { name: /Crear mi cuenta/ }).click();
      await s.getByRole('dialog', { name: 'Tu portal está listo' }).waitFor();
      const me = await (await s.request.get(`${fresh}/api/me`)).json();
      assert.equal(me.user.role, 'admin');
      assert.equal((await (await s.request.get(`${fresh}/api/setup`)).json()).needed, false);
      await s.getByRole('button', { name: 'Ir al centro de operaciones' }).click();
      await s.locator('main h1').first().waitFor();
      // Después ya no aparece: sin sesión solo hay ingreso.
      await s.context().clearCookies();
      await s.reload();
      await s.getByRole('button', { name: 'Entrar' }).waitFor();
      assert.equal(await s.getByRole('heading', { name: 'Configurá tu portal' }).count(), 0);
      await s.context().close();
    } finally {
      await new Promise((r) => setupServer.close(r));
      setupDb.close();
    }
  });

  await check('inversionista: su portal, confirma su aporte y no ve la operación', async () => {
    const i = await newPage({ width: 1440, height: 900 });
    await i.goto(`${base}/inversionista`);
    await i.getByLabel('Correo').fill('angel@demo.jcanalytic.local');
    await i.getByLabel('Contraseña').fill(DEMO_PASSWORD);
    await i.getByRole('button', { name: 'Entrar' }).click();
    await i.getByRole('heading', { name: 'Por confirmar' }).waitFor();
    await i.getByText('BarberXCR · capital de crecimiento').first().waitFor();
    await shot(i, '45-inversionista-inicio');
    // Rutas del equipo: la API responde 403 y la pantalla vuelve a su portal.
    assert.equal((await i.request.get(`${base}/api/projects`)).status(), 403);
    assert.equal((await i.request.get(`${base}/api/investments`)).status(), 403);
    await i.goto(`${base}/proyectos`);
    await i.waitForURL(/\/inversionista$/);
    // Confirma el aporte que JC registró a su nombre.
    await i.getByRole('heading', { name: 'Por confirmar' }).waitFor();
    await i.getByRole('button', { name: 'Confirmar', exact: true }).first().click();
    // Doble verificación: el diálogo muestra el monto antes de confirmar.
    await i.getByRole('dialog', { name: /Confirmás/ }).getByRole('button', { name: 'Sí, confirmar' }).click();
    await i.waitForFunction(async () => {
      const r = await fetch('/api/investor/overview');
      return (await r.json()).to_confirm.length === 0;
    });
    const overview = await (await i.request.get(`${base}/api/investor/overview`)).json();
    assert.equal(overview.portfolio.contributed_crc, 750_000_00);
    await shot(i, '46-inversionista-confirmado');
    await i.goto(`${base}/inversionista/movimientos`);
    await i.locator('main h1').first().waitFor();
    await shot(i, '47-inversionista-movimientos');
    await i.context().close();

    const im = await newPage({ width: 390, height: 844 });
    await im.goto(`${base}/inversionista`);
    await im.getByLabel('Correo').fill('angel@demo.jcanalytic.local');
    await im.getByLabel('Contraseña').fill(DEMO_PASSWORD);
    await im.getByRole('button', { name: 'Entrar' }).click();
    await im.locator('main h1').first().waitFor();
    for (const path of ['/inversionista', '/inversionista/movimientos', '/inversionista/avisos', '/inversionista/cuenta']) {
      await im.goto(base + path);
      await im.locator('main h1').first().waitFor();
      await im.waitForTimeout(300);
      assert.ok((await im.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 1, `${path}: desborde horizontal`);
    }
    await shot(im, '48-movil-inversionista-cuenta');
    await im.context().close();
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
