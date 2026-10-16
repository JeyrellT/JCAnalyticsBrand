// Behavioral and responsive coverage for the connected workspace experience.
// Build first, then: node --disable-warning=ExperimentalWarning tests/experience.e2e.mjs
/* global document, getComputedStyle, innerWidth */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { seedDemo, DEMO_PASSWORD } from '../server/seed-demo.mjs';
import { openDatabase } from '../server/db.mjs';
import { createPortalServer } from '../server/app.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
assert.ok(existsSync(join(dist, 'index.html')), 'Run npm run build before this suite.');
const shots = join(root, 'test-results', 'experience');
await mkdir(shots, { recursive: true });
const temporary = await mkdtemp(join(tmpdir(), 'portal-experience-'));
const databasePath = join(temporary, 'experience.sqlite');
await seedDemo(databasePath);
const db = openDatabase(databasePath);
const server = createPortalServer({ db, env: {}, staticDir: dist, logger: { error: console.error, info() {} } });
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const candidates = [process.env.PLAYWRIGHT_CHROMIUM, '/opt/pw-browsers/chromium', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'];
const executablePath = candidates.find((candidate) => candidate && existsSync(candidate));
let browser;
const errors = [];
const results = [];
let currentPage;

const json = async (page, path) => {
  const response = await page.request.get(`${base}${path}`);
  assert.equal(response.status(), 200, path);
  return response.json();
};
async function check(name, fn) {
  try { await fn(); results.push(`ok - ${name}`); }
  catch (error) {
    await currentPage?.screenshot({ path: join(shots, `failure-${results.length + 1}.png`), fullPage: true }).catch(() => {});
    results.push(`not ok - ${name}\n${error.stack}`);
  }
  console.log(results.at(-1));
}
async function waitUntil(fn, message) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (await fn()) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.fail(message);
}
async function login(who, width = 1440) {
  const context = await browser.newContext({ viewport: { width, height: width < 500 ? 844 : 1000 }, locale: 'es-CR', timezoneId: 'America/Costa_Rica', colorScheme: 'light' });
  const page = await context.newPage();
  page.setDefaultTimeout(12_000);
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error' && !message.text().startsWith('Failed to load resource')) errors.push(message.text()); });
  page.on('response', (response) => { if (response.status() >= 500) errors.push(`HTTP ${response.status()} ${response.url()}`); });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
  await page.goto(base);
  await page.getByLabel('Correo').fill(`${who}@demo.jcanalytic.local`);
  await page.getByLabel('Contraseña').fill(DEMO_PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.locator('.pulse-dashboard h1').waitFor();
  await page.locator('.pulse-project').first().waitFor();
  currentPage = page;
  return page;
}
async function noOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
  assert.ok(dimensions.scroll <= dimensions.width + 1, `${label}: document width ${dimensions.scroll} exceeds ${dimensions.width}`);
}
async function palette(page) {
  await page.keyboard.press('Control+k');
  const dialog = page.getByRole('dialog', { name: /Tu próximo movimiento/ });
  await dialog.waitFor();
  assert.equal(await page.getByRole('dialog').count(), 1, 'one palette mounts in the workspace');
  return dialog;
}

try {
  browser = await chromium.launch({ executablePath });
  const partner = await login('catalina');
  await check('dashboard uses current data, personal scope and real alert filters', async () => {
    currentPage = partner;
    const data = await json(partner, '/api/dashboard');
    assert.equal(await partner.locator('.pulse-metric').filter({ hasText: 'Proyectos activos' }).locator('strong').textContent(), String(data.kpis.active_projects));
    await partner.getByRole('button', { name: 'Mi espacio', exact: true }).click();
    const { user } = await json(partner, '/api/me');
    const { projects } = await json(partner, '/api/projects');
    const mine = projects.filter((project) => ['en_curso', 'en_revision', 'soporte'].includes(project.status) && (project.owner_id === user.id || project.members?.some((member) => member.id === user.id)));
    const visible = await partner.locator('.pulse-project').evaluateAll((links) => links.map((link) => Number(link.getAttribute('href').split('/').at(-1))));
    assert.ok(visible.every((id) => mine.some((project) => project.id === id)));
    assert.equal(await partner.getByRole('button', { name: 'Mi espacio', exact: true }).getAttribute('aria-pressed'), 'true');
    const dayStart = Date.parse(`${data.today}T00:00:00-06:00`);
    const range = new URLSearchParams({ from: new Date(dayStart).toISOString(), to: new Date(dayStart + 8 * 86_400_000).toISOString() });
    const { appointments } = await json(partner, `/api/appointments?${range}`);
    const now = Date.now();
    const expectedAgenda = appointments.filter((appointment) => appointment.status !== 'cancelada' && Date.parse(appointment.ends_at) >= now && Date.parse(appointment.starts_at) <= now + 7 * 86_400_000 && appointment.attendees?.some((person) => person.id === user.id)).slice(0, 4).map((appointment) => appointment.id);
    await waitUntil(async () => {
      const ids = await partner.locator('.pulse-agenda li a').evaluateAll((links) => links.map((link) => Number(new URL(link.href).searchParams.get('cita'))));
      return JSON.stringify(ids) === JSON.stringify(expectedAgenda);
    }, 'personal agenda matches all appointments in the period, including those beyond the shared preview');
    await partner.getByRole('button', { name: 'Todo el equipo', exact: true }).click();
    await partner.getByRole('button', { name: 'Dinero', exact: true }).click();
    const expected = data.alerts.filter((alert) => alert.kind === 'movement').length;
    assert.equal(await partner.locator('.pulse-alert-list li').count(), Math.min(3, expected));
    await partner.getByRole('group', { name: 'Filtrar pendientes' }).getByRole('button', { name: /^Todo/ }).click();
    await partner.getByRole('button', { name: 'Pausar movimiento visual' }).click();
    assert.equal(await partner.getByRole('button', { name: 'Activar movimiento visual' }).getAttribute('aria-pressed'), 'true');
  });

  await check('personal agenda includes a meeting beyond eight shared upcoming appointments', async () => {
    currentPage = partner;
    const { user } = await json(partner, '/api/me');
    const other = db.prepare('SELECT id FROM users WHERE id <> ? AND role = ? LIMIT 1').get(user.id, 'admin');
    const now = Date.now();
    const inserted = [];
    try {
      for (let index = 0; index < 10; index += 1) {
        const starts = new Date(now + (index + 1) * 60_000).toISOString();
        const ends = new Date(now + (index + 2) * 60_000).toISOString();
        const { lastInsertRowid } = db.prepare('INSERT INTO appointments (title, kind, status, starts_at, ends_at, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(`Agenda regression fixture ${index}`, 'interna', 'confirmada', starts, ends, user.id, starts, starts);
        const id = Number(lastInsertRowid);
        inserted.push(id);
        db.prepare('INSERT INTO appointment_attendees (appointment_id, user_id) VALUES (?, ?)').run(id, index === 9 ? user.id : other.id);
      }
      const ownId = inserted.at(-1);
      assert.ok(!(await json(partner, '/api/dashboard')).agenda.some((appointment) => appointment.id === ownId), 'personal fixture is outside shared top eight');
      await partner.reload();
      await partner.getByRole('button', { name: 'Mi espacio', exact: true }).click();
      await partner.locator(`.pulse-agenda a[href="/agenda?cita=${ownId}"]`).waitFor();
    } finally {
      for (const id of inserted) db.prepare('DELETE FROM appointments WHERE id = ?').run(id);
      await partner.reload();
      await partner.locator('.pulse-dashboard h1').waitFor();
    }
  });

  await check('focus selection persists and completing a task updates the server and dashboard', async () => {
    currentPage = partner;
    const before = await json(partner, '/api/dashboard');
    assert.ok(before.my_tasks.length > 1, 'demo has multiple assigned tasks');
    const task = before.my_tasks.find((item) => ['por_hacer', 'backlog'].includes(item.status)) ?? before.my_tasks[1];
    await partner.getByLabel('Elegir tarea de foco').selectOption(String(task.id));
    await partner.reload();
    await partner.locator('.pulse-focus').getByRole('heading', { name: task.title, exact: true }).waitFor();
    if (['por_hacer', 'backlog'].includes(task.status)) {
      await partner.locator('.pulse-focus').getByRole('button', { name: 'Empezar', exact: true }).click();
      await waitUntil(async () => (await json(partner, '/api/tasks')).tasks.find((item) => item.id === task.id)?.status === 'en_progreso', 'focus task starts on the server');
    }
    await partner.locator('.pulse-focus').getByRole('button', { name: 'Completar tarea' }).click();
    await waitUntil(async () => (await json(partner, '/api/tasks')).tasks.find((item) => item.id === task.id)?.status === 'hecho', 'focus task completes on the server');
    await waitUntil(async () => (await partner.locator('.pulse-metric').filter({ hasText: 'Mis tareas abiertas' }).locator('strong').textContent()) === String(before.kpis.my_open_tasks - 1), 'open task counter refreshes');
    assert.notEqual(await partner.locator('.pulse-focus h3').textContent(), task.title);
  });

  await check('command palette searches real data, navigates with keyboard and contains focus', async () => {
    currentPage = partner;
    const trigger = partner.getByRole('button', { name: /Buscar o hacer algo/ });
    await trigger.focus();
    let dialog = await palette(partner);
    const input = dialog.getByRole('combobox');
    assert.equal(await input.evaluate((node) => document.activeElement === node), true);
    await input.fill('automatizacion');
    await dialog.getByRole('option', { name: /Automatizaciones/ }).waitFor();
    for (let i = 0; i < 12; i += 1) {
      await partner.keyboard.press('Tab');
      assert.equal(await dialog.evaluate((node) => node.contains(document.activeElement)), true, 'Tab stays inside dialog');
    }
    await partner.keyboard.press('Escape');
    await dialog.waitFor({ state: 'detached' });
    assert.equal(await trigger.evaluate((node) => document.activeElement === node), true, 'Escape restores trigger focus');
    dialog = await palette(partner);
    await dialog.getByRole('button', { name: 'Proyectos', exact: true }).click();
    await waitUntil(async () => (await dialog.getByRole('option').count()) > 0, 'projects load');
    const { projects } = await json(partner, '/api/projects');
    const firstTitle = await dialog.getByRole('option').first().locator('strong').textContent();
    const realProject = projects.find((project) => project.name === firstTitle);
    assert.ok(realProject, 'palette project exists in the API');
    await dialog.getByRole('option').first().click();
    await partner.waitForURL(`**/proyectos/${realProject.id}`);
    dialog = await palette(partner);
    await dialog.getByRole('button', { name: 'Tareas', exact: true }).click();
    await waitUntil(async () => (await dialog.getByRole('option').count()) > 0, 'tasks load');
    const taskTitle = await dialog.getByRole('option').first().locator('strong').textContent();
    assert.ok((await json(partner, '/api/tasks')).tasks.some((task) => task.title === taskTitle));
    await dialog.getByRole('button', { name: 'Acciones', exact: true }).click();
    await dialog.getByRole('combobox').press('ArrowDown');
    assert.ok((await dialog.getByRole('option', { selected: true }).textContent()).includes('Agendar una cita'));
    await dialog.getByRole('combobox').press('Enter');
    await partner.getByRole('dialog', { name: 'Nueva cita' }).waitFor();
    await partner.keyboard.press('Escape');
  });

  const collaborator = await login('hillary');
  await check('collaborator dashboard and shortcuts preserve money and administration permissions', async () => {
    currentPage = collaborator;
    assert.equal(await collaborator.getByRole('heading', { name: 'Pulso de inversiones' }).count(), 0);
    assert.equal(await collaborator.getByRole('button', { name: 'Dinero', exact: true }).count(), 0);
    const dialog = await palette(collaborator);
    for (const query of ['Inversiones', 'Gestionar invitaciones', 'Ajustes de la operación']) {
      await dialog.getByRole('combobox').fill(query);
      assert.equal(await dialog.getByRole('option').count(), 0, query);
    }
    await collaborator.keyboard.press('Escape');
    await collaborator.goto(`${base}/automatizaciones`);
    await collaborator.getByRole('heading', { name: 'Estudio de flujos' }).waitFor();
    assert.equal(await collaborator.locator('.studio-enable').getByRole('switch').count(), 0);
    assert.equal(await collaborator.getByRole('button', { name: /Probar ahora:/ }).count(), 0);
    assert.equal((await collaborator.request.post(`${base}/api/automations/tareas_recurrentes/run`, { headers: { 'x-portal-request': '1' } })).status(), 403);
  });

  const admin = await login('jeyrell');
  await check('compact navigation persists, leaves mobile navigation intact and supports skipping to content', async () => {
    currentPage = admin;
    const initial = await admin.locator('.workspace-main').boundingBox();
    await admin.getByRole('button', { name: 'Contraer navegación' }).click();
    await waitUntil(async () => (await admin.locator('#workspace-sidebar').boundingBox()).width <= 81, 'sidebar contracts');
    assert.ok((await admin.locator('.workspace-main').boundingBox()).width > initial.width + 100);
    await admin.getByRole('navigation', { name: 'Secciones', exact: true }).getByRole('link', { name: 'Proyectos', exact: true }).click();
    await admin.getByRole('heading', { name: 'Proyectos', exact: true }).waitFor();
    await admin.reload();
    await admin.getByRole('button', { name: 'Expandir navegación' }).waitFor();
    assert.equal(await admin.getByRole('button', { name: 'Cambiar a tema oscuro' }).filter({ visible: true }).count(), 1);
    await admin.setViewportSize({ width: 390, height: 844 });
    assert.equal(await admin.getByRole('button', { name: 'Expandir navegación' }).isVisible(), false);
    await admin.getByRole('navigation', { name: 'Accesos rápidos' }).getByRole('button', { name: 'Más', exact: true }).click();
    await admin.getByRole('dialog', { name: 'Más secciones' }).getByRole('link', { name: 'Tablero', exact: true }).click();
    await admin.getByRole('heading', { name: 'Tablero', exact: true }).waitFor();
    await noOverflow(admin, 'mobile while sidebar preference is compact');
    await admin.setViewportSize({ width: 1440, height: 1000 });
    await admin.getByRole('button', { name: 'Expandir navegación' }).click();
    await waitUntil(async () => (await admin.locator('#workspace-sidebar').boundingBox()).width >= 237, 'sidebar expands');
    await admin.getByRole('link', { name: 'Saltar al contenido' }).focus();
    await admin.keyboard.press('Enter');
    assert.equal(await admin.locator('#workspace-main').evaluate((element) => element === document.activeElement), true);
  });

  await check('forms preserve typing focus, trap keyboard navigation and close only the top nested dialog', async () => {
    currentPage = admin;
    await admin.goto(`${base}/proyectos`);
    await admin.getByRole('button', { name: 'Nuevo proyecto', exact: true }).click();
    const project = admin.getByRole('dialog', { name: 'Nuevo proyecto', exact: true });
    const description = project.getByLabel('Descripción y alcance');
    await description.fill('Una experiencia de trabajo compartida');
    assert.equal(await description.evaluate((element) => element === document.activeElement), true, 'parent rerenders do not reset focus to name');
    await description.pressSequentially(' y memorable');
    assert.equal(await description.inputValue(), 'Una experiencia de trabajo compartida y memorable');
    await project.getByLabel('Cliente', { exact: true }).focus();
    await project.getByLabel('Cliente', { exact: true }).selectOption('__new');
    const client = admin.getByRole('dialog', { name: 'Nuevo cliente', exact: true });
    await client.waitFor();
    assert.equal(await admin.getByRole('dialog').count(), 2);
    const controls = client.locator('.portal-modal-panel').locator('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]').filter({ visible: true });
    await controls.last().focus();
    await admin.keyboard.press('Tab');
    assert.equal(await controls.first().evaluate((element) => element === document.activeElement), true);
    await admin.keyboard.press('Shift+Tab');
    assert.equal(await controls.last().evaluate((element) => element === document.activeElement), true);
    await admin.keyboard.press('Escape');
    await client.waitFor({ state: 'hidden' });
    assert.equal(await project.isVisible(), true);
    assert.equal(await project.getByLabel('Cliente', { exact: true }).evaluate((element) => element === document.activeElement), true);
    assert.equal(await admin.evaluate(() => document.body.style.overflow), 'hidden');
    assert.equal(await description.inputValue(), 'Una experiencia de trabajo compartida y memorable');
    await admin.keyboard.press('Escape');
    await project.waitFor({ state: 'hidden' });
    assert.equal(await admin.evaluate(() => document.body.style.overflow), '');
    assert.equal(await admin.getByRole('button', { name: 'Nuevo proyecto', exact: true }).evaluate((element) => element === document.activeElement), true);
  });

  await check('automation studio selects steps and applies admin controls to the selected flow', async () => {
    currentPage = admin;
    await admin.goto(`${base}/automatizaciones`);
    const library = admin.getByRole('complementary', { name: 'Biblioteca de flujos' });
    await library.getByRole('button', { name: /^Tareas recurrentes/ }).click();
    const steps = admin.getByRole('group', { name: 'Pasos de Tareas recurrentes' });
    await steps.getByRole('button', { name: /Si se cumple/ }).click();
    assert.equal(await steps.getByRole('button', { name: /Si se cumple/ }).getAttribute('aria-pressed'), 'true');
    assert.equal(await steps.getByRole('button', { pressed: true }).count(), 1);
    const toggle = admin.getByRole('switch', { name: 'Tareas recurrentes' });
    await toggle.click();
    await waitUntil(async () => !(await json(admin, '/api/automations')).automations.find((item) => item.key === 'tareas_recurrentes').enabled, 'pause persists');
    assert.equal(await admin.getByRole('button', { name: 'Probar ahora: Tareas recurrentes' }).isDisabled(), true);
    await admin.getByRole('group', { name: 'Filtrar automatizaciones' }).getByRole('button', { name: 'En pausa', exact: true }).click();
    await library.getByRole('button', { name: /^Tareas recurrentes/ }).waitFor();
    await admin.getByRole('group', { name: 'Filtrar automatizaciones' }).getByRole('button', { name: 'Todos', exact: true }).click();
    await toggle.click();
    await waitUntil(async () => (await json(admin, '/api/automations')).automations.find((item) => item.key === 'tareas_recurrentes').enabled, 'resume persists');
    const responsePromise = admin.waitForResponse((response) => response.url().endsWith('/api/automations/tareas_recurrentes/run') && response.request().method() === 'POST');
    await admin.getByRole('button', { name: 'Probar ahora: Tareas recurrentes' }).click();
    assert.equal((await responsePromise).status(), 200);
  });

  await check('dashboard, automation canvas and palette fit 360, 390, 768 and 1440 pixels in both themes', async () => {
    currentPage = admin;
    for (const theme of ['light', 'dark']) {
      await admin.evaluate((next) => localStorage.setItem('jcp:theme', next), theme);
      for (const width of [360, 390, 768, 1440]) {
        await admin.setViewportSize({ width, height: width < 500 ? 844 : 1000 });
        await admin.goto(base);
        await admin.locator('.pulse-project').first().waitFor();
        assert.equal(await admin.locator('html').getAttribute('data-theme'), theme, 'requested theme is applied');
        await noOverflow(admin, `dashboard ${width} ${theme}`);
        await admin.screenshot({ path: join(shots, `dashboard-${width}-${theme}.png`), fullPage: true, animations: 'disabled' });
        if (width === 1440 && theme === 'light') await admin.screenshot({ path: join(shots, 'dashboard-preview.png'), animations: 'disabled' });
        const dialog = await palette(admin);
        await dialog.getByRole('combobox').fill('tarea');
        await noOverflow(admin, `palette ${width} ${theme}`);
        const bounds = await dialog.boundingBox();
        assert.ok(bounds.x >= -1 && bounds.x + bounds.width <= width + 1, `palette bounds at ${width}`);
        if (width === 390 || width === 1440) await admin.screenshot({ path: join(shots, `palette-${width}-${theme}.png`), animations: 'disabled' });
        await admin.keyboard.press('Escape');
        await admin.goto(`${base}/automatizaciones`);
        await admin.getByRole('heading', { name: 'Estudio de flujos' }).waitFor();
        await noOverflow(admin, `automations ${width} ${theme}`);
        if (width === 390 || width === 1440) await admin.screenshot({ path: join(shots, `automations-${width}-${theme}.png`), fullPage: true, animations: 'disabled' });
        if (width === 1440 && theme === 'light') await admin.screenshot({ path: join(shots, 'automations-preview.png'), animations: 'disabled' });
      }
    }
    await admin.emulateMedia({ reducedMotion: 'reduce' });
    await admin.goto(base);
    await admin.locator('.orbit-sculpture').waitFor();
    const motion = await admin.locator('.orbit-sculpture').evaluate((node) => getComputedStyle(node).animationDuration);
    assert.ok(motion.split(',').every((duration) => parseFloat(duration) <= 0.01), 'reduced motion stops decorative animation');
  });
  await check('no browser runtime, console or server errors', async () => assert.deepEqual(errors, []));
} finally {
  await browser?.close();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  db.close();
  assert.ok(temporary.startsWith(join(tmpdir(), 'portal-experience-')), 'cleanup stays inside the temporary fixture directory');
  await rm(temporary, { recursive: true, force: true });
}
console.log(`\n${results.filter((item) => item.startsWith('ok')).length}/${results.length} experience checks passed. Screenshots: ${shots}`);
if (results.some((item) => item.startsWith('not ok'))) process.exitCode = 1;
