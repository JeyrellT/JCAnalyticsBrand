// Real API + temporary SQLite coverage for the projects, board and investment studios.
// Build first, then run npm run e2e:frontend. No production data is used.
/* global document, getComputedStyle, innerWidth */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { seedDemo, DEMO_PASSWORD } from '../server/seed-demo.mjs';
import { openDatabase } from '../server/db.mjs';
import { createPortalServer } from '../server/app.mjs';
import { formatMoney, formatPercent } from '../shared/finance.js';
import { PROJECT_STATUS, SERVICES, TASK_STATUS } from '../shared/catalog.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
assert.ok(existsSync(join(dist, 'index.html')), 'Run npm run build first.');
const shots = join(root, 'test-results', 'frontend');
await mkdir(shots, { recursive: true });
const temporary = await mkdtemp(join(tmpdir(), 'portal-frontend-'));
const databasePath = join(temporary, 'frontend.sqlite');
await seedDemo(databasePath);
const db = openDatabase(databasePath);
const server = createPortalServer({ db, env: {}, staticDir: dist, logger: { error: console.error, info() {} } });
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const base = `http://127.0.0.1:${server.address().port}`;
const executablePath = [process.env.PLAYWRIGHT_CHROMIUM, '/opt/pw-browsers/chromium', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'].find((path) => path && existsSync(path));
const results = [];
const errors = [];
let browser;
let currentPage;

async function json(page, path) {
  const response = await page.request.get(`${base}${path}`);
  assert.equal(response.status(), 200, path);
  return response.json();
}
async function waitUntil(fn, message) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (await fn()) return;
    await new Promise((done) => setTimeout(done, 100));
  }
  assert.fail(message);
}
async function check(name, fn) {
  try { await fn(); results.push(`ok - ${name}`); }
  catch (error) {
    await currentPage?.screenshot({ path: join(shots, `failure-${results.length + 1}.png`), fullPage: true }).catch(() => {});
    results.push(`not ok - ${name}\n${error.stack}`);
  }
  console.log(results.at(-1));
}
async function login(who) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'es-CR', timezoneId: 'America/Costa_Rica', colorScheme: 'light' });
  const page = await context.newPage();
  page.setDefaultTimeout(12_000);
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error' && !message.text().startsWith('Failed to load resource')) errors.push(message.text()); });
  page.on('response', (response) => { if (response.status() >= 500) errors.push(`HTTP ${response.status()} ${response.url()}`); });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
  await page.goto(base);
  await page.getByLabel('Correo').fill(`${who}@demo.jcanalytic.local`);
  await page.getByLabel('Contraseña').fill(DEMO_PASSWORD);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.locator('.pulse-dashboard h1').waitFor();
  return page;
}
const projectIds = (page) => page.locator('.ps-card').evaluateAll((cards) => cards.map((card) => Number(card.dataset.projectId)));
const taskIds = (page) => page.locator('.board-task').evaluateAll((cards) => cards.map((card) => Number(card.dataset.task)));
const numericSort = (values) => [...values].sort((a, b) => a - b);
const money = (value) => formatMoney(value, 'CRC', { decimals: 0 });
async function projectsPage(page) {
  await page.goto(`${base}/proyectos`);
  await page.getByRole('heading', { name: 'Proyectos', level: 1, exact: true }).waitFor();
  await page.locator('.ps-card').first().waitFor();
}
async function noOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
  assert.ok(dimensions.scroll <= dimensions.width + 1, `${label}: document width ${dimensions.scroll} > ${dimensions.width}`);
}

try {
  browser = await chromium.launch({ executablePath });
  const partner = await login('catalina');
  currentPage = partner;

  await check('project gallery and list preserve records, preference and detail navigation', async () => {
    await projectsPage(partner);
    const { projects } = await json(partner, '/api/projects');
    assert.deepEqual(numericSort(await projectIds(partner)), numericSort(projects.map((project) => project.id)));
    assert.equal(await partner.locator('.ps-portfolio-total > strong').textContent(), String(projects.length).padStart(2, '0'));
    await partner.getByRole('button', { name: 'Vista de lista', exact: true }).click();
    assert.equal(await partner.locator('.ps-list .ps-card-list').count(), projects.length);
    await partner.reload();
    await partner.locator('.ps-list .ps-card').first().waitFor();
    assert.equal(await partner.getByRole('button', { name: 'Vista de lista' }).getAttribute('aria-pressed'), 'true');
    const firstId = (await projectIds(partner))[0];
    await partner.locator(`.ps-card[data-project-id="${firstId}"]`).click();
    await partner.waitForURL(`**/proyectos/${firstId}`);
    await partner.getByRole('heading', { name: projects.find((project) => project.id === firstId).name, exact: true }).waitFor();
    await projectsPage(partner);
    await partner.getByRole('button', { name: 'Vista de galería' }).click();
    assert.equal(await partner.locator('.ps-card-list').count(), 0);
  });

  await check('project sorting uses real names, task progress, dates and modification times', async () => {
    await projectsPage(partner);
    const { projects } = await json(partner, '/api/projects');
    const byId = new Map(projects.map((project) => [project.id, project]));
    for (const sort of ['name', 'progress', 'due', 'updated']) {
      await partner.getByLabel('Ordenar proyectos').selectOption(sort);
      const ordered = (await projectIds(partner)).map((id) => byId.get(id));
      for (let index = 1; index < ordered.length; index += 1) {
        const a = ordered[index - 1];
        const b = ordered[index];
        if (sort === 'name') assert.ok(a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }) <= 0);
        if (sort === 'progress') assert.ok(a.progress >= b.progress);
        if (sort === 'due') assert.ok((a.due_date || '9999') <= (b.due_date || '9999'));
        if (sort === 'updated') assert.ok((a.updated_at || '') >= (b.updated_at || ''));
      }
    }
    await partner.getByLabel('Ordenar proyectos').selectOption('attention');
    const late = projects.filter((project) => project.sla_state === 'late');
    assert.ok(late.length > 0, 'fixture includes projects needing an update');
    assert.equal(byId.get((await projectIds(partner))[0]).sla_state, 'late');
  });

  await check('project search ignores accents, filters compose, chips clear and empty states recover', async () => {
    await projectsPage(partner);
    const { projects } = await json(partner, '/api/projects');
    const target = projects.find((project) => project.name.includes('Pedidos en línea'));
    assert.ok(target, 'accented project fixture exists');
    await partner.getByLabel('Buscar', { exact: true }).fill('pedidos en linea');
    assert.deepEqual(await projectIds(partner), [target.id]);
    await partner.getByRole('button', { name: 'Quitar filtro “pedidos en linea”', exact: true }).click();
    assert.equal((await projectIds(partner)).length, projects.length);
    await partner.getByLabel('Estado', { exact: true }).selectOption(target.status);
    await partner.getByLabel('Servicio', { exact: true }).selectOption(target.service);
    await partner.getByLabel('Persona', { exact: true }).selectOption(String(target.owner_id));
    const expected = projects.filter((project) => project.status === target.status && project.service === target.service && (project.owner_id === target.owner_id || project.members?.some((member) => member.id === target.owner_id)));
    assert.deepEqual(numericSort(await projectIds(partner)), numericSort(expected.map((project) => project.id)));
    await partner.getByRole('button', { name: `Quitar filtro ${PROJECT_STATUS[target.status].label}`, exact: true }).click();
    assert.equal(await partner.getByLabel('Estado', { exact: true }).inputValue(), '');
    await partner.getByRole('button', { name: `Quitar filtro ${SERVICES[target.service]}`, exact: true }).click();
    await partner.getByRole('button', { name: 'Limpiar filtros', exact: true }).click();
    assert.equal((await projectIds(partner)).length, projects.length);
    await partner.getByRole('group', { name: 'Tipo de proyecto' }).getByRole('button', { name: /^Productos propios/ }).click();
    assert.deepEqual(numericSort(await projectIds(partner)), numericSort(projects.filter((project) => project.kind === 'producto').map((project) => project.id)));
    await partner.getByRole('button', { name: 'Limpiar filtros', exact: true }).click();
    await partner.getByLabel('Buscar', { exact: true }).fill('nothing-matches-this-project-fixture');
    await partner.getByText('No hay proyectos con estos filtros', { exact: true }).waitFor();
    assert.equal(await partner.locator('.ps-card').count(), 0);
    await partner.getByRole('button', { name: 'Limpiar filtros', exact: true }).first().click();
    assert.equal((await projectIds(partner)).length, projects.length);
    await partner.getByRole('button', { name: /con avance pendiente/ }).click();
    assert.deepEqual(numericSort(await projectIds(partner)), numericSort(projects.filter((project) => project.sla_state === 'late').map((project) => project.id)));
    await partner.getByRole('button', { name: 'Limpiar filtros', exact: true }).click();
  });

  await check('project archive view reads archived data and clearing its chip returns to the studio', async () => {
    const fixture = (await json(partner, '/api/projects')).projects[0];
    db.prepare('UPDATE projects SET archived = 1 WHERE id = ?').run(fixture.id);
    try {
      await projectsPage(partner);
      await partner.getByRole('button', { name: 'Archivados', exact: true }).click();
      await waitUntil(async () => (await projectIds(partner)).includes(fixture.id), 'archived fixture appears');
      const archived = (await json(partner, '/api/projects?archived=1')).projects;
      assert.deepEqual(numericSort(await projectIds(partner)), numericSort(archived.map((project) => project.id)));
      await partner.getByRole('button', { name: 'Quitar filtro Archivados', exact: true }).click();
      await waitUntil(async () => !(await projectIds(partner)).includes(fixture.id), 'archive chip returns to active records');
    } finally { db.prepare('UPDATE projects SET archived = 0 WHERE id = ?').run(fixture.id); }
  });

  await check('board scope and density change presentation, while moving tasks persists on desktop and mobile', async () => {
    await partner.goto(`${base}/tablero`);
    await partner.locator('.board-task').first().waitFor();
    const { user } = await json(partner, '/api/me');
    const { tasks } = await json(partner, '/api/tasks');
    await partner.getByRole('group', { name: 'Alcance del tablero' }).getByRole('button', { name: 'Mi trabajo', exact: true }).click();
    assert.deepEqual(numericSort(await taskIds(partner)), numericSort(tasks.filter((task) => task.assignee_id === user.id).map((task) => task.id)));
    await partner.getByRole('button', { name: 'Densidad compacta', exact: true }).click();
    assert.equal(await partner.locator('.board-density-compact').count(), 1);
    await partner.getByRole('button', { name: 'Densidad cómoda', exact: true }).click();
    assert.equal(await partner.locator('.board-density-compact').count(), 0);
    await partner.getByRole('group', { name: 'Alcance del tablero' }).getByRole('button', { name: 'Todo el equipo', exact: true }).click();
    assert.deepEqual(numericSort(await taskIds(partner)), numericSort(tasks.map((task) => task.id)));
    const target = tasks.find((task) => task.assignee_id === user.id && ['por_hacer', 'backlog'].includes(task.status));
    assert.ok(target, 'fixture includes an actionable task');
    const moveLabel = `Mover "${target.title}" a otra columna`;
    try {
      await partner.getByLabel(moveLabel, { exact: true }).selectOption('en_progreso');
      await waitUntil(async () => (await json(partner, '/api/tasks')).tasks.find((task) => task.id === target.id)?.status === 'en_progreso', 'desktop task move persists');
      assert.equal(await partner.getByRole('region', { name: TASK_STATUS.en_progreso.label, exact: true }).locator(`[data-task="${target.id}"]`).count(), 1);
      await partner.setViewportSize({ width: 390, height: 844 });
      await partner.getByRole('group', { name: 'Columnas del tablero' }).getByRole('button', { name: /^En progreso/ }).click();
      await partner.getByLabel(moveLabel, { exact: true }).selectOption('revision');
      await waitUntil(async () => (await json(partner, '/api/tasks')).tasks.find((task) => task.id === target.id)?.status === 'revision', 'mobile task move persists');
      assert.equal(await partner.getByRole('group', { name: 'Columnas del tablero' }).getByRole('button', { name: /^Revisión/ }).getAttribute('aria-pressed'), 'true');
      assert.equal(await partner.getByRole('region', { name: 'Revisión', exact: true }).locator(`[data-task="${target.id}"]`).isVisible(), true);
      await noOverflow(partner, 'mobile board after moving task');
    } finally {
      const restore = await partner.request.patch(`${base}/api/tasks/${target.id}`, { headers: { 'x-portal-request': '1' }, data: { status: target.status } });
      assert.equal(restore.status(), 200);
      await partner.setViewportSize({ width: 1440, height: 1000 });
    }
  });

  await check('partner selection and investment categories use confirmed API financial data', async () => {
    await partner.goto(`${base}/inversiones`);
    await partner.locator('.investment-partner').first().waitFor();
    const { portfolio, partners, investments } = await json(partner, '/api/investments');
    assert.equal(await partner.locator('.investment-hero-value').textContent(), money(portfolio.contributed_crc));
    assert.equal(await partner.locator('.investment-return-panel > p').textContent(), money(portfolio.returned_crc));
    assert.equal(await partner.locator('.investment-net-panel > p').textContent(), money(portfolio.net_crc));
    for (const person of partners.slice(0, 2)) {
      await partner.locator('.investment-partner').filter({ has: partner.locator('.investment-partner-name', { hasText: person.name }) }).click();
      const detail = partner.locator('#investment-account-detail');
      assert.equal(await detail.locator('.investment-selection-title > strong').textContent(), person.name);
      assert.deepEqual(await detail.locator('dd').allTextContents(), [money(person.contributed_crc), money(person.returned_crc), money(person.net_crc)]);
      assert.equal(await partner.locator('.investment-ring-center > strong').textContent(), formatPercent(person.share, 1));
      assert.equal(await partner.locator('.investment-partner[aria-pressed="true"]').count(), 1);
    }
    await partner.getByRole('button', { name: 'Ver total', exact: true }).click();
    assert.equal(await partner.locator('.investment-partner[aria-pressed="true"]').count(), 0);
    assert.deepEqual(await partner.locator('#investment-account-detail dd').allTextContents(), [money(portfolio.contributed_crc), money(portfolio.returned_crc), money(portfolio.net_crc)]);
    await partner.getByRole('tab', { name: /^Todas/ }).click();
    assert.equal(await partner.locator('.investment-portfolio-card').count(), investments.length);
    await partner.getByRole('tab', { name: /^Cerradas/ }).click();
    assert.equal(await partner.locator('.investment-portfolio-card').count(), investments.filter((investment) => !['activa', 'propuesta'].includes(investment.status)).length);
  });

  const collaborator = await login('hillary');
  await check('collaborator keeps project and board access without investment access', async () => {
    currentPage = collaborator;
    await projectsPage(collaborator);
    await collaborator.goto(`${base}/tablero`);
    await collaborator.locator('.board-task').first().waitFor();
    assert.equal(await collaborator.getByRole('link', { name: 'Inversiones', exact: true }).count(), 0);
    assert.equal((await collaborator.request.get(`${base}/api/investments`)).status(), 403);
    await collaborator.goto(`${base}/inversiones`);
    await collaborator.getByText('Esta sección no existe', { exact: true }).waitFor();
    assert.equal(await collaborator.locator('.investments-studio').count(), 0);
  });

  await check('all three studios fit 360, 390, 768 and 1440 pixels in light and dark themes', async () => {
    currentPage = partner;
    const screens = [
      { path: '/proyectos', name: 'projects', ready: '.ps-card' },
      { path: '/tablero', name: 'board', ready: '.board-task:visible' },
      { path: '/inversiones', name: 'investments', ready: '.investment-partner' },
    ];
    for (const theme of ['light', 'dark']) {
      await partner.evaluate((next) => { localStorage.setItem('jcp:theme', next); localStorage.setItem('jcp:projects:view', 'gallery'); }, theme);
      for (const width of [1440, 360, 390, 768]) {
        await partner.setViewportSize({ width, height: width < 500 ? 844 : 1000 });
        for (const screen of screens) {
          await partner.goto(`${base}${screen.path}`);
          await partner.locator(screen.ready).first().waitFor();
          assert.equal(await partner.locator('html').getAttribute('data-theme'), theme);
          await noOverflow(partner, `${screen.name} ${width} ${theme}`);
          await partner.screenshot({ path: join(shots, `${screen.name}-${width}-${theme}.png`), fullPage: true, animations: 'disabled' });
          if (width === 1440 && theme === 'light') {
            const preview = join(shots, `${screen.name}-preview.png`);
            await partner.screenshot({ path: preview, animations: 'disabled' });
            console.log(`PREVIEW_READY ${preview}`);
          }
        }
        await partner.goto(`${base}/proyectos`);
        await partner.locator('.ps-card').first().waitFor();
        await partner.getByRole('button', { name: 'Vista de lista', exact: true }).click();
        await noOverflow(partner, `project list ${width} ${theme}`);
        if (width === 390) await partner.screenshot({ path: join(shots, `projects-list-${width}-${theme}.png`), fullPage: true, animations: 'disabled' });
        await partner.getByRole('button', { name: 'Vista de galería', exact: true }).click();
      }
    }
    await partner.emulateMedia({ reducedMotion: 'reduce' });
    await projectsPage(partner);
    await partner.locator('.ps-card').first().hover();
    const transition = await partner.locator('.ps-art-sculpture').first().evaluate((node) => getComputedStyle(node).transitionDuration);
    assert.ok(transition.split(',').every((duration) => parseFloat(duration) <= 0.01), 'reduced motion stops cover transitions');
  });
  await check('browser runtime, console and server remain free of errors', async () => assert.deepEqual(errors, []));
} finally {
  await browser?.close();
  server.closeAllConnections();
  await new Promise((done) => server.close(done));
  db.close();
  const cleanupPath = resolve(temporary);
  assert.ok(cleanupPath.startsWith(resolve(tmpdir()) + sep) && basename(cleanupPath).startsWith('portal-frontend-'), 'cleanup stays inside the resolved temporary fixture directory');
  await rm(cleanupPath, { recursive: true, force: true });
}
console.log(`\n${results.filter((result) => result.startsWith('ok')).length}/${results.length} frontend checks passed. Screenshots: ${shots}`);
if (results.some((result) => result.startsWith('not ok'))) process.exitCode = 1;
