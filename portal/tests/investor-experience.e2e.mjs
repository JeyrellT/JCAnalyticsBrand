// Investor experience: real isolated SQLite/API, keyboard behavior and private data.
// Build first, then npm run e2e:investor. PLAYWRIGHT_CHROMIUM overrides Chrome discovery.
/* global document, innerWidth, getComputedStyle */
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
import { formatMoney, formatPercent } from '../shared/finance.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
assert.ok(existsSync(join(dist, 'index.html')), 'Run npm run build first.');
const shots = join(root, 'test-results', 'investor-experience');
await mkdir(shots, { recursive: true });
const temporary = await mkdtemp(join(tmpdir(), 'portal-investor-experience-'));
const databasePath = join(temporary, 'investor.sqlite');
await seedDemo(databasePath);
const db = openDatabase(databasePath);
const owner = db.prepare("SELECT * FROM users WHERE email = 'angel@demo.jcanalytic.local'").get();
const admin = db.prepare("SELECT id, email FROM users WHERE role = 'admin' ORDER BY id LIMIT 1").get();
const otherPartner = db.prepare("SELECT id FROM users WHERE role = 'socio' ORDER BY id LIMIT 1").get();
const stamp = new Date().toISOString();
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Costa_Rica' }).format(new Date());
const createInvestment = (name, currency, target, description = '') => Number(db.prepare('INSERT INTO investments (name, category, status, currency, target_amount, description, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(name, 'producto_propio', 'activa', currency, target, description, admin.id, stamp, stamp).lastInsertRowid);
const movement = (investment, partner, type, amount, currency, fx, status, message) => Number(db.prepare('INSERT INTO movements (investment_id, partner_id, type, amount, currency, fx_rate, date, message, status, created_by, created_at, resolved_by, resolved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(investment, partner, type, amount, currency, fx, today, message, status, admin.id, stamp, status === 'confirmado' ? partner : null, status === 'confirmado' ? stamp : null).lastInsertRowid);
const usdId = createInvestment('Atlas · infraestructura compartida', 'USD', 300_000, 'Infraestructura para productos del equipo.');
movement(usdId, owner.id, 'aporte', 120_000, 'USD', 510, 'confirmado', 'Aporte propio en dólares, confirmado.');
movement(usdId, owner.id, 'retorno', 18_000, 'USD', 525, 'confirmado', 'Retorno propio en dólares, confirmado.');
movement(usdId, owner.id, 'aporte', 2_000, 'USD', 515, 'pendiente', 'Aporte pendiente en dólares, separado del capital.');
movement(usdId, owner.id, 'retorno', 1_000, 'USD', 515, 'pendiente', 'Retorno pendiente en dólares, separado de lo recibido.');
movement(usdId, owner.id, 'aporte', 500, 'USD', 515, 'anulado', 'Registro anulado, excluido de los totales.');
const secretMarker = 'PRIVATE_OTHER_PARTNER_78193';
const foreignMovement = movement(usdId, otherPartner.id, 'aporte', 80_000, 'USD', 510, 'confirmado', secretMarker);
const pendingId = createInvestment('Órbita · piloto en preparación', 'CRC', 100_000_00);
movement(pendingId, owner.id, 'aporte', 50_000_00, 'CRC', null, 'pendiente', 'Aporte propio pendiente: no se suma al capital.');
const hiddenId = createInvestment('PRIVATE_INVESTMENT_92871', 'CRC', 100_000_00);
movement(hiddenId, otherPartner.id, 'aporte', 70_000_00, 'CRC', null, 'confirmado', secretMarker);
for (const [name, capital] of [['Junto · comunidad de creadores', 25_000_00], ['Ladera · experiencias de barrio', 50_000_00], ['Horizonte · automatización de servicios', 75_000_00]]) {
  const investment = createInvestment(name, 'CRC', capital * 2);
  movement(investment, owner.id, 'aporte', capital, 'CRC', null, 'confirmado', 'Aporte propio confirmado para explorar el mapa.');
}
const emptyEmail = 'sin-capital@demo.jcanalytic.local';
db.prepare('INSERT INTO users (email, name, role, color, password_hash, must_change_password, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(emptyEmail, 'Marina Solís', 'inversionista', '#476c5c', owner.password_hash, 0, stamp);

const server = createPortalServer({ db, env: {}, staticDir: dist, logger: { error: console.error, info() {} } });
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const executablePath = [process.env.PLAYWRIGHT_CHROMIUM, '/opt/pw-browsers/chromium', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'].find((path) => path && existsSync(path));
let browser;
let currentPage;
const errors = [];
const results = [];
const financialSnapshot = () => JSON.stringify(db.prepare('SELECT id, investment_id, partner_id, type, amount, currency, fx_rate, status, resolved_by FROM movements ORDER BY id').all());
const json = async (page, path) => {
  const response = await page.request.get(`${base}${path}`);
  assert.equal(response.status(), 200, path);
  return response.json();
};
async function check(name, fn) {
  try { await fn(); results.push(`ok - ${name}`); }
  catch (error) {
    await currentPage?.screenshot({ path: join(shots, `failure-${results.length + 1}.png`), fullPage: true, animations: 'disabled' }).catch(() => {});
    results.push(`not ok - ${name}\n${error.stack}`);
  }
  console.log(results.at(-1));
}
async function waitUntil(fn, message) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (await fn()) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.fail(message);
}
async function open(page, path = '/inversionista') {
  await page.goto(`${base}${path}`);
  await page.locator('main h1').first().waitFor();
  await page.locator('.portal-loading-shell').waitFor({ state: 'hidden' });
}
async function login(email = owner.email) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'es-CR', timezoneId: 'America/Costa_Rica', colorScheme: 'light' });
  const page = await context.newPage();
  page.setDefaultTimeout(12_000);
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error' && !message.text().startsWith('Failed to load resource')) errors.push(message.text()); });
  page.on('response', (response) => { if (response.status() >= 500) errors.push(`HTTP ${response.status()} ${response.url()}`); });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
  await page.goto(`${base}/inversionista`);
  await page.getByLabel('Correo').fill(email);
  await page.getByLabel('Contraseña').fill(DEMO_PASSWORD);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.locator('main h1').first().waitFor();
  await page.locator('.portal-loading-shell').waitFor({ state: 'hidden' });
  currentPage = page;
  return page;
}
async function noOverflow(page, label) {
  const size = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
  assert.ok(size.scroll <= size.width + 1, `${label}: document ${size.scroll}px exceeds viewport ${size.width}px`);
}
/** Visible text below 11px (sr-only text and hidden elements excluded). */
const tinyText = (page) => page.evaluate(() => [...document.querySelectorAll('header *, main *')].filter((element) => {
  if (![...element.childNodes].some((node) => node.nodeType === 3 && node.textContent.trim())) return false;
  const rect = element.getBoundingClientRect();
  const style = getComputedStyle(element);
  return rect.width > 1 && rect.height > 1 && style.visibility !== 'hidden' && parseFloat(style.fontSize) < 11;
}).map((element) => `${element.tagName.toLowerCase()} ${getComputedStyle(element).fontSize} «${element.textContent.trim().slice(0, 40)}»`));
const control = (page) => page.getByRole('region', { name: 'Doble control', exact: true });
const movementIds = (locator) => locator.evaluateAll((nodes) => nodes.map((node) => Number(node.id.slice(4))));

try {
  browser = await chromium.launch({ executablePath });
  const staff = await login(admin.email);
  for (const { investment_id: id } of db.prepare('SELECT DISTINCT investment_id FROM movements WHERE partner_id = ?').all(owner.id)) {
    const response = await staff.request.put(`${base}/api/investments/${id}/access`, { headers: { 'x-portal-request': '1' }, data: { allowed_investor_ids: [owner.id] } });
    assert.equal(response.status(), 200, 'historical fixtures explicitly allow further contributions');
  }
  const page = await login();
  await check('investor data stays private and currency conversions use confirmed historical amounts', async () => {
    currentPage = page;
    const overview = await json(page, '/api/investor/overview');
    const ownRows = db.prepare("SELECT * FROM movements WHERE partner_id = ? AND status = 'confirmado'").all(owner.id);
    const amount = (row) => row.currency === 'USD' ? Math.round(row.amount * row.fx_rate) : row.amount;
    const contributed = ownRows.filter((row) => row.type === 'aporte').reduce((sum, row) => sum + amount(row), 0);
    const returned = ownRows.filter((row) => row.type === 'retorno').reduce((sum, row) => sum + amount(row), 0);
    assert.equal(overview.portfolio.contributed_crc, contributed);
    assert.equal(overview.portfolio.returned_crc, returned);
    assert.equal(overview.portfolio.net_crc, returned - contributed);
    assert.ok(overview.recent.every((row) => row.partner_id === owner.id));
    assert.ok(!JSON.stringify(overview).includes(secretMarker));
    assert.ok(!overview.investments.some((investment) => investment.id === hiddenId));
    assert.equal(overview.investments.find((investment) => investment.id === pendingId).mine.contributed, 0);
    const detail = await json(page, `/api/investor/investments/${usdId}`);
    assert.equal(detail.investment.mine.contributed, 120_000);
    assert.equal(detail.investment.mine.returned, 18_000);
    assert.equal(detail.investment.mine.share, 0.6);
    assert.equal(detail.investment.totals.contributed, 200_000);
    assert.ok(detail.movements.every((row) => row.partner_id === owner.id));
    assert.ok(!('partners' in detail.investment.totals));
    for (const route of ['/api/projects', '/api/investments', '/api/users', '/api/dashboard']) assert.equal((await page.request.get(`${base}${route}`)).status(), 403, route);
    assert.equal((await page.request.get(`${base}/api/investor/investments/${hiddenId}`)).status(), 404);
    assert.equal((await page.request.post(`${base}/api/investor/movements/${foreignMovement}/confirm`, { headers: { 'x-portal-request': '1' } })).status(), 404);
    const csv = await page.request.get(`${base}/api/investor/statement.csv`);
    assert.equal(csv.status(), 200);
    assert.ok(!(await csv.text()).includes(secretMarker));
    await open(page, '/proyectos');
    assert.equal(new URL(page.url()).pathname, '/inversionista');
  });

  await check('home leads with the double control, confirmed totals and every position without touching money', async () => {
    currentPage = page;
    await open(page);
    const before = financialSnapshot();
    const overview = await json(page, '/api/investor/overview');
    const pf = overview.portfolio;
    for (const [selector, value] of [['capital', pf.contributed_crc], ['returned', pf.returned_crc], ['net', pf.net_crc]]) {
      assert.equal(await page.locator(`[data-portfolio-${selector}]`).textContent(), formatMoney(value, 'CRC'));
    }
    assert.equal(await page.locator('[data-portfolio-pending]').textContent(), String(pf.pending_count));
    const waiting = overview.to_confirm.length;
    assert.ok(waiting > 1, 'fixture has several movements awaiting the investor');
    assert.ok((await control(page).textContent()).includes(`${waiting} movimientos esperan tu confirmación.`));
    for (const section of [control(page), page.locator('section[aria-labelledby="totals-title"]')]) {
      const box = await section.boundingBox();
      assert.ok(box.y + box.height <= 1000, 'control status and totals are visible without scrolling');
    }
    assert.deepEqual(await movementIds(page.locator('#por-confirmar article[id^="mov-"]')), overview.to_confirm.map((row) => row.id));
    await control(page).getByRole('button', { name: 'Revisar y confirmar', exact: true }).click();
    await waitUntil(() => page.locator('#por-confirmar').evaluate((node) => node === document.activeElement), 'review button focuses the confirmation list');
    assert.equal(await page.locator('[data-investment-id]').count(), overview.investments.length);
    for (const position of overview.investments) {
      const row = page.locator(`[data-investment-id="${position.id}"]`);
      assert.equal(await row.getAttribute('href'), `/inversionista/inversiones/${position.id}`);
      assert.deepEqual(await row.locator('[data-position-contributed], [data-position-returned], [data-position-net]').allTextContents(),
        [position.mine.contributed, position.mine.returned, position.mine.net].map((amount) => formatMoney(amount, position.currency)));
      assert.equal(await row.locator('[data-position-share]').textContent(), formatPercent(position.mine.share, 1));
    }
    const recentLinks = page.locator('section[aria-labelledby="recent-title"] a[href*="?mov="]');
    assert.deepEqual(await recentLinks.evaluateAll((links) => links.map((link) => link.getAttribute('href'))),
      overview.recent.slice(0, 5).map((row) => `/inversionista/inversiones/${row.investment_id}?mov=${row.id}`));
    assert.equal(financialSnapshot(), before);
  });

  await check('detail shows the own position next to project aggregates, filters actual movements, and keeps notice focus', async () => {
    currentPage = page;
    await open(page, `/inversionista/inversiones/${usdId}`);
    const before = financialSnapshot();
    const { investment, movements } = await json(page, `/api/investor/investments/${usdId}`);
    assert.deepEqual(await page.locator('[data-position-contributed], [data-position-returned], [data-position-net]').allTextContents(),
      [investment.mine.contributed, investment.mine.returned, investment.mine.net].map((value) => formatMoney(value, 'USD')));
    assert.equal(await page.locator('[data-position-share]').textContent(), formatPercent(investment.mine.share, 1));
    assert.deepEqual(await page.locator('[data-project-contributed], [data-project-returned], [data-project-holders]').allTextContents(),
      [formatMoney(investment.totals.contributed, 'USD'), formatMoney(investment.totals.returned, 'USD'), String(investment.totals.holders)]);
    assert.ok(!(await page.locator('main').textContent()).includes(secretMarker));
    const ledger = page.locator('#ii-ledger');
    for (const [label, predicate] of [['Pendientes', (row) => row.status === 'pendiente'], ['Confirmados', (row) => row.status === 'confirmado'], ['Retornos', (row) => row.type === 'retorno'], ['Todos', () => true]]) {
      const tab = ledger.getByRole('tab', { name: new RegExp(`^${label}`) });
      await tab.click();
      assert.equal(await tab.getAttribute('aria-selected'), 'true');
      assert.deepEqual(await movementIds(ledger.locator('article[id^="mov-"]')), movements.filter(predicate).map((row) => row.id));
    }
    await control(page).getByRole('button', { name: 'Ver pendientes', exact: true }).click();
    assert.equal(await ledger.getByRole('tab', { name: /^Pendientes/ }).getAttribute('aria-selected'), 'true');
    await waitUntil(() => ledger.evaluate((node) => node === document.activeElement), 'Ver pendientes focuses the ledger');
    const noticeButton = page.getByRole('button', { name: 'Avisar un aporte', exact: true });
    await noticeButton.click();
    const notice = page.getByRole('dialog', { name: 'Avisar un aporte', exact: true });
    await notice.getByLabel('Monto en dólares').fill('12,50');
    const message = notice.getByLabel('Mensaje para JC Analytics');
    await message.fill('Comprobación local del formulario, sin enviar.');
    assert.equal(await message.evaluate((node) => node === document.activeElement), true);
    await page.keyboard.press('Escape');
    await notice.waitFor({ state: 'hidden' });
    assert.equal(await noticeButton.evaluate((node) => node === document.activeElement), true);
    assert.equal(financialSnapshot(), before);
  });

  await check('confirm and object dialogs repeat the movement and change nothing until submitted', async () => {
    currentPage = page;
    await open(page);
    const before = financialSnapshot();
    const pending = (await json(page, '/api/investor/overview')).to_confirm[0];
    const item = page.locator(`#mov-${pending.id}`);
    const mutations = [];
    const watch = (request) => { if (request.url().includes('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(request.method())) mutations.push(`${request.method()} ${request.url()}`); };
    page.on('request', watch);
    try {
      await item.getByRole('button', { name: 'Objetar', exact: true }).click();
      const object = page.getByRole('dialog', { name: 'Objetar movimiento', exact: true });
      assert.ok((await object.textContent()).includes(formatMoney(pending.amount, pending.currency)));
      const send = object.getByRole('button', { name: 'Enviar objeción', exact: true });
      const reason = object.getByLabel('Motivo de la objeción');
      assert.equal(await reason.evaluate((node) => node === document.activeElement), true, 'the reason takes focus');
      assert.equal(await send.isDisabled(), true, 'an objection needs a reason');
      await reason.fill('No');
      assert.equal(await send.isDisabled(), true);
      await reason.fill('El monto no coincide con mi transferencia.');
      assert.equal(await send.isDisabled(), false);
      await object.getByRole('button', { name: 'Cancelar', exact: true }).click();
      await object.waitFor({ state: 'hidden' });
      const confirmButton = item.getByRole('button', { name: 'Confirmar', exact: true });
      await confirmButton.click();
      const confirm = page.getByRole('dialog', { name: /Confirmás/ });
      const summary = await confirm.textContent();
      for (const text of [formatMoney(pending.amount, pending.currency), pending.investment_name]) assert.ok(summary.includes(text), text);
      assert.equal(await confirm.getByLabel('Mensaje de vuelta (opcional)').evaluate((node) => node === document.activeElement), false, 'the optional message does not open the keyboard');
      await page.keyboard.press('Escape');
      await confirm.waitFor({ state: 'hidden' });
      assert.equal(await confirmButton.evaluate((node) => node === document.activeElement), true, 'focus returns to the action');
      assert.deepEqual(mutations, []);
      assert.equal(financialSnapshot(), before);
    } finally { page.off('request', watch); }
  });

  await check('theme and keyboard skip work, and empty accounts show no invented capital', async () => {
    currentPage = page;
    await open(page);
    await page.getByRole('button', { name: 'Cambiar a tema oscuro', exact: true }).click();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    await open(page, '/inversionista/cuenta');
    assert.equal(await page.getByRole('radio', { name: 'Oscuro', exact: true }).getAttribute('aria-checked'), 'true');
    await page.getByRole('radio', { name: 'Claro', exact: true }).click();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
    const skip = page.getByRole('link', { name: 'Saltar al contenido', exact: true });
    await skip.focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#contenido').evaluate((node) => node === document.activeElement), true);
    const empty = await login(emptyEmail);
    try {
      const overview = await json(empty, '/api/investor/overview');
      assert.equal(overview.investments.length, 0);
      assert.equal(overview.portfolio.contributed_crc, 0);
      for (const selector of ['capital', 'returned', 'net']) assert.equal(await empty.locator(`[data-portfolio-${selector}]`).textContent(), formatMoney(0, 'CRC'));
      assert.equal(await empty.locator('[data-portfolio-pending]').textContent(), '0');
      assert.ok((await control(empty).textContent()).includes('Todavía no hay movimientos a tu nombre.'));
      await empty.getByText('Cuando haya movimientos a tu nombre, sus inversiones aparecen aquí.', { exact: true }).waitFor();
      assert.equal(await empty.locator('[data-investment-id]').count(), 0);
      assert.equal(await empty.locator('#por-confirmar').count(), 0);
      assert.ok(!(await empty.locator('main').textContent()).includes('Atlas · infraestructura compartida'));
      await empty.setViewportSize({ width: 360, height: 844 });
      await noOverflow(empty, 'empty investor home 360 light');
      await empty.screenshot({ path: join(shots, 'investor-empty-360-light.png'), fullPage: true, animations: 'disabled' });
    } finally { await empty.context().close(); currentPage = page; }
  });

  await check('confirming an owned movement updates only the expected confirmed total', async () => {
    currentPage = page;
    await open(page);
    const before = await json(page, '/api/investor/overview');
    const pending = before.to_confirm.find((row) => row.type === 'aporte');
    assert.ok(pending, 'fixture has an own contribution awaiting confirmation');
    await open(page, `/inversionista/inversiones/${pending.investment_id}?mov=${pending.id}`);
    await page.locator(`#mov-${pending.id}`).getByRole('button', { name: 'Confirmar', exact: true }).click();
    const confirm = page.getByRole('dialog', { name: /Confirmás/ });
    await confirm.getByRole('button', { name: 'Sí, confirmar', exact: true }).click();
    await waitUntil(async () => !(await json(page, '/api/investor/overview')).to_confirm.some((row) => row.id === pending.id), 'confirmation removes only the resolved request');
    const after = await json(page, '/api/investor/overview');
    assert.equal(after.portfolio.contributed_crc, before.portfolio.contributed_crc + pending.amount_crc);
    assert.equal(after.portfolio.returned_crc, before.portfolio.returned_crc);
    assert.equal(after.to_confirm.length, before.to_confirm.length - 1);
    assert.equal(db.prepare('SELECT status FROM movements WHERE id = ?').get(foreignMovement).status, 'confirmado');
  });

  await check('admin controls the investor catalog and revocation blocks stale forms while preserving history', async () => {
    currentPage = staff;
    const created = await staff.request.post(`${base}/api/investments`, { headers: { 'x-portal-request': '1' }, data: { name: 'Umbral · acceso por invitación', category: 'producto_propio', currency: 'CRC', status: 'activa' } });
    assert.equal(created.status(), 200);
    const investment = (await created.json()).investment;
    const route = `/inversionista/inversiones/${investment.id}`;
    assert.equal((await page.request.get(`${base}/api/investor/investments/${investment.id}`)).status(), 404);
    async function configure(allowed) {
      currentPage = staff;
      await open(staff, `/inversiones/${investment.id}`);
      await staff.getByRole('button', { name: 'Administrar acceso', exact: true }).click();
      const dialog = staff.getByRole('dialog', { name: 'Acceso de inversionistas', exact: true });
      const checkbox = dialog.getByRole('checkbox', { name: `Habilitar a ${owner.name}`, exact: true });
      await checkbox.waitFor();
      await dialog.getByLabel('Buscar inversionista').fill(owner.name);
      await checkbox.setChecked(allowed);
      await staff.setViewportSize({ width: 390, height: 844 });
      await noOverflow(staff, 'admin access editor 390');
      await staff.screenshot({ path: join(shots, `investment-access-${allowed ? 'grant' : 'revoke'}-390.png`), animations: 'disabled' });
      const [saved] = await Promise.all([
        staff.waitForResponse((response) => response.url().endsWith(`/api/investments/${investment.id}/access`) && response.request().method() === 'PUT'),
        dialog.getByRole('button', { name: 'Guardar acceso', exact: true }).click(),
      ]);
      assert.equal(saved.status(), 200);
      await dialog.waitFor({ state: 'hidden' });
      await staff.setViewportSize({ width: 1440, height: 1000 });
      const access = await json(staff, `/api/investments/${investment.id}/access`);
      assert.deepEqual(access.allowed_investor_ids, allowed ? [owner.id] : []);
    }
    await configure(true);
    currentPage = page;
    await open(page);
    const available = page.locator(`[data-available-investment-id="${investment.id}"]`);
    assert.ok((await available.textContent()).includes(investment.name));
    await available.click();
    await page.getByRole('heading', { name: investment.name, exact: true, level: 1 }).waitFor();
    const before = await json(page, `/api/investor/investments/${investment.id}`);
    assert.equal(before.investment.mine.contributed, 0);
    assert.equal(before.investment.can_contribute, true);
    await page.getByRole('button', { name: 'Avisar un aporte', exact: true }).click();
    const notice = page.getByRole('dialog', { name: 'Avisar un aporte', exact: true });
    await notice.getByLabel('Monto en colones').fill('4.500');
    await notice.getByLabel('Mensaje para JC Analytics').fill('Aviso desde el catálogo habilitado.');
    await notice.getByRole('button', { name: 'Enviar aviso', exact: true }).click();
    await notice.waitFor({ state: 'hidden' });
    let detail = await json(page, `/api/investor/investments/${investment.id}`);
    assert.equal(detail.movements.length, 1);
    assert.equal(detail.movements[0].amount, 450_000);
    assert.equal(detail.movements[0].status, 'pendiente');
    assert.equal(detail.investment.mine.contributed, 0, 'a notice does not invent confirmed capital');
    const historyId = detail.movements[0].id;
    // A modal opened before an administrator revokes access must still be denied by the API.
    await page.getByRole('button', { name: 'Avisar un aporte', exact: true }).click();
    await notice.getByLabel('Monto en colones').fill('1.000');
    await notice.getByLabel('Mensaje para JC Analytics').fill('Formulario abierto antes de la revocación.');
    await configure(false);
    currentPage = page;
    const [blocked] = await Promise.all([
      page.waitForResponse((response) => response.url().endsWith(`/api/investor/investments/${investment.id}/movements`) && response.request().method() === 'POST'),
      notice.getByRole('button', { name: 'Enviar aviso', exact: true }).click(),
    ]);
    assert.equal(blocked.status(), 403);
    await notice.waitFor({ state: 'hidden' });
    assert.equal(await page.getByRole('button', { name: 'Avisar un aporte', exact: true }).isDisabled(), true, 'the denied stale modal refreshes access immediately');
    await open(page, route);
    assert.equal(await page.getByRole('button', { name: 'Avisar un aporte', exact: true }).isDisabled(), true);
    await page.locator('#contribution-access-note').waitFor();
    detail = await json(page, `/api/investor/investments/${investment.id}`);
    assert.deepEqual(detail.movements.map((movement) => movement.id), [historyId]);
    assert.equal(detail.investment.access_granted, false);
    assert.equal(detail.investment.can_contribute, false);
    const overview = await json(page, '/api/investor/overview');
    assert.ok(overview.investments.some((position) => position.id === investment.id));
    assert.ok(!overview.available_investments.some((position) => position.id === investment.id));
    const csv = await page.request.get(`${base}/api/investor/statement.csv`);
    assert.ok((await csv.text()).includes(investment.name));
    const socioEmail = db.prepare('SELECT email FROM users WHERE id = ?').get(otherPartner.id).email;
    const socio = await login(socioEmail);
    try {
      await open(socio, `/inversiones/${investment.id}`);
      assert.equal(await socio.getByRole('button', { name: 'Administrar acceso', exact: true }).count(), 0);
      assert.equal((await socio.request.get(`${base}/api/investments/${investment.id}`)).status(), 200);
      assert.equal((await socio.request.get(`${base}/api/investments/${investment.id}/access`)).status(), 403);
    } finally { await socio.context().close(); currentPage = page; }
  });

  await check('investor pages fit mobile, tablet and desktop in both themes with readable text', async () => {
    currentPage = page;
    const pages = [
      ['home', '/inversionista'],
      ['detail', `/inversionista/inversiones/${usdId}`],
      ['movements', '/inversionista/movimientos'],
      ['notices', '/inversionista/avisos'],
      ['account', '/inversionista/cuenta'],
    ];
    for (const theme of ['light', 'dark']) {
      await page.evaluate((value) => localStorage.setItem('jcp:theme', value), theme);
      for (const width of [360, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: width < 500 ? 844 : 1000 });
        for (const [name, route] of pages) {
          await open(page, route);
          assert.equal(await page.locator('html').getAttribute('data-theme'), theme);
          await noOverflow(page, `${name} ${width} ${theme}`);
          assert.ok(!(await page.locator('main').textContent()).includes(secretMarker));
          assert.deepEqual(await tinyText(page), [], `${name} ${width} ${theme}: text under 11px`);
          if (name === 'home') {
            const box = await control(page).boundingBox();
            assert.ok(box.y + box.height <= (width < 500 ? 844 : 1000), `home ${width} ${theme}: the double control is visible without scrolling`);
          }
          await page.screenshot({ path: join(shots, `investor-${name}-${width}-${theme}.png`), fullPage: true, animations: 'disabled' });
          if (width === 390 && theme === 'dark' && name === 'home') await page.locator('section[aria-labelledby="totals-title"]').screenshot({ path: join(shots, 'totals-390-dark.png'), animations: 'disabled' });
          if (width === 390 && theme === 'dark' && name === 'detail') await page.locator('section[aria-labelledby="position-title"]').screenshot({ path: join(shots, 'position-390-dark.png'), animations: 'disabled' });
          if (width === 1440 && theme === 'light' && ['home', 'detail'].includes(name)) await page.screenshot({ path: join(shots, `investor-${name}-preview.png`), animations: 'disabled' });
        }
      }
    }
  });
  await check('no runtime, console or server errors', async () => assert.deepEqual(errors, []));
} finally {
  await browser?.close();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  db.close();
  assert.ok(temporary.startsWith(join(tmpdir(), 'portal-investor-experience-')), 'cleanup remains inside the temporary fixture');
  await rm(temporary, { recursive: true, force: true });
}
console.log(`\n${results.filter((item) => item.startsWith('ok')).length}/${results.length} investor checks passed. Screenshots: ${shots}`);
if (results.some((item) => item.startsWith('not ok'))) process.exitCode = 1;
