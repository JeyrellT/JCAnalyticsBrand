// Real browser/API/SQLite flow. Build first; no external payments or services.
/* global document, innerWidth */
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
import { formatMoney } from '../shared/finance.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const shots = join(root, 'test-results', 'finance-experience');
assert.ok(existsSync(join(root, 'dist', 'index.html')), 'Build the portal first.');
await mkdir(shots, { recursive: true });
const temporary = await mkdtemp(join(tmpdir(), 'portal-finance-experience-'));
const databasePath = join(temporary, 'finance.sqlite');
await seedDemo(databasePath);
const db = openDatabase(databasePath);
const now = new Date('2026-10-15T18:00:00Z');
const stamp = now.toISOString();
const owner = db.prepare("SELECT * FROM users WHERE email = 'angel@demo.jcanalytic.local'").get();
const admin = db.prepare("SELECT * FROM users WHERE role = 'admin' ORDER BY id LIMIT 1").get();
const partner = db.prepare("SELECT * FROM users WHERE role = 'socio' ORDER BY id LIMIT 1").get();
const campaignName = 'Meta · prueba del acuerdo anual';
const investmentId = Number(db.prepare('INSERT INTO investments (name,category,status,currency,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?)').run(campaignName, 'meta_ads', 'activa', 'CRC', admin.id, stamp, stamp).lastInsertRowid);
db.prepare('INSERT INTO movements (investment_id,partner_id,type,amount,currency,date,message,status,created_by,created_at,resolved_by,resolved_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(investmentId, owner.id, 'aporte', 100_000_00, 'CRC', '2026-09-01', 'Capital confirmado de la prueba', 'confirmado', admin.id, stamp, owner.id, stamp);
const server = createPortalServer({ db, now: () => now.getTime(), env: {}, staticDir: join(root, 'dist'), logger: { error: console.error, info() {} } });
await new Promise(done => server.listen(0, '127.0.0.1', done));
const base = `http://127.0.0.1:${server.address().port}`;
const executablePath = [process.env.PLAYWRIGHT_CHROMIUM, '/opt/pw-browsers/chromium', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'].find(path => path && existsSync(path));
const headers = { 'x-portal-request': '1' };
const errors = [];
const results = [];
let browser;
let current;
let expenseId;
const json = async (page, path) => {
  const response = await page.request.get(base + path);
  assert.equal(response.status(), 200, path);
  return response.json();
};
async function check(name, fn) {
  try { await fn(); results.push(`ok - ${name}`); }
  catch (error) { await current?.screenshot({ path: join(shots, `failure-${results.length + 1}.png`), fullPage: true }).catch(() => {}); results.push(`not ok - ${name}\n${error.stack}`); }
  console.log(results.at(-1));
}
async function open(page, path) {
  await page.goto(base + path);
  await page.locator('main h1').first().waitFor();
  await page.locator('.portal-loading-shell').waitFor({ state: 'hidden' });
  current = page;
}
async function login(person) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'es-CR', timezoneId: 'America/Costa_Rica', colorScheme: 'light', reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.clock.setFixedTime(now);
  page.setDefaultTimeout(12_000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && !message.text().startsWith('Failed to load resource')) errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 500) errors.push(`HTTP ${response.status()} ${response.url()}`); });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, route => route.abort());
  await page.goto(base + '/finanzas');
  await page.getByLabel('Correo').fill(person.email);
  await page.getByLabel('Contraseña').fill(DEMO_PASSWORD);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.locator('main h1').first().waitFor();
  current = page;
  return page;
}
async function submit(page, path, button) {
  const response = page.waitForResponse(response => new URL(response.url()).pathname === path && ['POST', 'PUT', 'PATCH'].includes(response.request().method()));
  await button.click();
  const result = await response;
  assert.equal(result.status(), 200, `${path}: ${await result.text()}`);
  return result.json();
}
async function noOverflow(page, label) {
  const size = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
  assert.ok(size.scroll <= size.width + 1, `${label}: ${size.scroll}px > ${size.width}px`);
}
const moneyText = async (locator, amount) => assert.equal((await locator.innerText()).replace(/\s/g, ''), formatMoney(amount, 'CRC').replace(/\s/g, ''));

try {
  browser = await chromium.launch({ executablePath });
  const staff = await login(admin);
  await open(staff, '/finanzas');
  await check('admin records collected revenue and incurred campaign costs through real forms', async () => {
    for (const [kind, amount, date, description] of [['revenue', '400000', '2026-09-15', 'Venta cobrada de la campaña de prueba'], ['expense', '100000', '2026-09-20', 'Pauta incurrida de la campaña de prueba']]) {
      const expense = kind === 'expense';
      await staff.getByRole('tab', { name: expense ? /Gastos/ : /Ventas cobradas/ }).click();
      await staff.getByRole('button', { name: expense ? 'Registrar gasto' : 'Registrar venta cobrada', exact: true }).first().click();
      const dialog = staff.getByRole('dialog');
      await dialog.getByLabel('Descripción', { exact: true }).fill(description);
      await dialog.getByLabel('Fecha del registro').fill(date);
      await dialog.getByLabel('Monto del registro').fill(amount);
      await dialog.getByLabel('Categoría contable').selectOption(expense ? 'ads' : 'sale');
      await dialog.getByLabel('Servicio', { exact: true }).selectOption('pagina_web');
      await dialog.getByLabel('Inversión o campaña').selectOption(String(investmentId));
      const { entry } = await submit(staff, '/api/finance/entries', dialog.getByRole('button', { name: 'Guardar registro', exact: true }));
      assert.equal(entry.amount, Number(amount) * 100);
      assert.equal(entry.investment_id, investmentId);
      if (expense) { expenseId = entry.id; assert.equal(Boolean(entry.paid), false); }
      await dialog.waitFor({ state: 'hidden' });
      await staff.locator(`[data-entry-id="${entry.id}"]`).waitFor();
    }
    const overview = await json(staff, '/api/finance/overview?year=2026');
    const campaign = overview.investments.find(item => item.id === investmentId);
    assert.equal(campaign.revenue_collected_crc, 400_000_00);
    assert.equal(campaign.expenses_incurred_crc, 100_000_00);
    assert.equal(campaign.net_profit_crc, 300_000_00);
  });

  await check('cost planning computes real labor, target margin and reference prices without changing the ledger', async () => {
    const before = (await json(staff, '/api/finance/overview?year=2026')).totals;
    await staff.getByRole('tab', { name: /Costear servicio/ }).click();
    await staff.getByLabel('Nombre del costeo').fill('Web de prueba · costo real');
    await staff.getByLabel('Servicio a costear').selectOption('pagina_web');
    await staff.getByLabel('Horas de trabajo').fill('10');
    await staff.getByLabel('Costo real por hora').fill('5000');
    for (const label of ['Software y licencias', 'Hosting e infraestructura', 'IA y consumo de API', 'Terceros y proveedores', 'Gasto general asignado', 'Impuestos del trabajo']) await staff.getByLabel(label).fill('0');
    await staff.getByLabel('Otros costos').fill('10000');
    await staff.getByLabel('Precio de venta por unidad').fill('100000');
    await staff.getByLabel('Margen objetivo (%)').fill('40');
    const { plan } = await submit(staff, '/api/finance/costing', staff.getByRole('button', { name: 'Calcular y guardar costeo', exact: true }));
    assert.equal(plan.total_cost, 60_000_00);
    assert.equal(plan.suggested_unit_price, 100_000_00);
    assert.equal(plan.projected_profit, 40_000_00);
    assert.equal(plan.actual_margin_bps, 4000);
    await moneyText(staff.locator('.fn-cost-lines > div').filter({ hasText: 'Costo total del trabajo' }).locator('dd'), 60_000_00);
    assert.match(await staff.locator('.fn-workbench-result .fn-source').innerText(), /570/);
    assert.deepEqual((await json(staff, '/api/finance/overview?year=2026')).totals, before);
  });

  await check('explicit campaign policy prepares and records separate pending profit and capital receipts', async () => {
    await staff.getByRole('tab', { name: /Anticipos y capital/ }).click();
    await staff.getByRole('group', { name: 'Campañas de inversión' }).getByRole('button', { name: campaignName }).click();
    await staff.getByLabel('Mes del anticipo').fill('2026-09');
    await staff.getByRole('button', { name: 'Configurar acuerdo y costos', exact: true }).click();
    let dialog = staff.getByRole('dialog');
    await dialog.getByLabel('Participación sobre utilidad anual (%)').fill('20');
    await dialog.getByLabel('Reserva antes del reparto').fill('0');
    await dialog.getByLabel('Costos revisados hasta').fill('2026-09-30');
    await dialog.getByRole('checkbox', { name: owner.name, exact: true }).check();
    await dialog.getByRole('checkbox', { name: /^Confirmo el acuerdo/ }).check();
    await submit(staff, `/api/finance/policies/${investmentId}`, dialog.getByRole('button', { name: 'Guardar acuerdo', exact: true }));
    await dialog.waitFor({ state: 'hidden' });
    const profitInput = staff.getByLabel('Utilidad a anticipar');
    const originalInput = await profitInput.elementHandle();
    await profitInput.pressSequentially('60000', { delay: 60 });
    assert.equal(await profitInput.inputValue(), '60000');
    assert.equal(await originalInput.evaluate(node => node.isConnected && node === document.activeElement), true, 'preview refresh preserves the typing field and focus');
    await staff.getByLabel('Capital a devolver').fill('20000');
    await staff.getByRole('button', { name: 'Registrar envío realizado', exact: true }).click();
    dialog = staff.getByRole('dialog');
    const record = dialog.getByRole('button', { name: 'Registrar y pedir confirmación', exact: true });
    await dialog.getByLabel('Mensaje para quienes reciben').fill('Anticipo de septiembre y capital devuelto de prueba');
    assert.equal(await record.isDisabled(), true, 'real sending acknowledgment is mandatory');
    await dialog.getByRole('checkbox', { name: /^Confirmo que envié/ }).check();
    const result = await submit(staff, '/api/finance/distributions', record);
    await dialog.waitFor({ state: 'hidden' });
    assert.equal(result.movements.length, 2);
    const rows = db.prepare("SELECT * FROM movements WHERE investment_id=? AND type='retorno' ORDER BY amount").all(investmentId);
    assert.deepEqual(rows.map(row => [row.return_kind, row.amount, row.status, row.partner_id]), [['capital', 20_000_00, 'pendiente', owner.id], ['profit', 60_000_00, 'pendiente', owner.id]]);
    const preview = await json(staff, `/api/finance/distributions/preview?investment_id=${investmentId}&month=2026-09`);
    assert.equal(preview.totals.profit_reserved, 60_000_00);
    assert.equal(preview.totals.profit_available, 0);
  });

  await check('admin pays an incurred cost after distribution without rewriting its protected amount or profit', async () => {
    const before = await json(staff, '/api/finance/overview?year=2026');
    await staff.getByRole('tab', { name: /Gastos/ }).click();
    const row = staff.locator(`[data-entry-id="${expenseId}"]`);
    await row.getByRole('button', { name: 'Registrar pago de Pauta incurrida de la campaña de prueba', exact: true }).click();
    const dialog = staff.getByRole('dialog', { name: 'Registrar pago del gasto', exact: true });
    await dialog.getByLabel('Fecha del pago del gasto').fill('2026-10-15');
    await dialog.getByLabel('Comprobante del pago').fill('Pago de factura pendiente después del anticipo');
    const { entry } = await submit(staff, `/api/finance/entries/${expenseId}`, dialog.getByRole('button', { name: 'Confirmar gasto pagado', exact: true }));
    await dialog.waitFor({ state: 'hidden' });
    assert.equal(Boolean(entry.paid), true);
    assert.equal(entry.paid_date, '2026-10-15');
    assert.equal(entry.date, '2026-09-20');
    assert.equal(entry.amount, 100_000_00);
    const after = await json(staff, '/api/finance/overview?year=2026');
    assert.equal(after.totals.net_profit_crc, before.totals.net_profit_crc);
    assert.equal(after.totals.expenses_paid_crc - before.totals.expenses_paid_crc, 100_000_00);
    assert.equal(before.totals.unpaid_expenses_crc - after.totals.unpaid_expenses_crc, 100_000_00);
  });

  const investor = await login(owner);
  await check('investor confirms each receipt and sees profit, principal returned and principal outstanding separately', async () => {
    await open(investor, `/inversionista/inversiones/${investmentId}`);
    const pending = (await json(investor, `/api/investor/investments/${investmentId}`)).movements.filter(row => row.status === 'pendiente');
    assert.equal(pending.length, 2);
    for (const movement of pending) {
      await investor.locator(`#mov-${movement.id}`).getByRole('button', { name: 'Confirmar', exact: true }).click();
      await submit(investor, `/api/investor/movements/${movement.id}/confirm`, investor.getByRole('dialog').getByRole('button', { name: 'Sí, confirmar', exact: true }));
      await investor.getByRole('dialog').waitFor({ state: 'hidden' });
    }
    await open(investor, `/inversionista/inversiones/${investmentId}`);
    const { investment, movements } = await json(investor, `/api/investor/investments/${investmentId}`);
    assert.equal(investment.mine.profit_returned, 60_000_00);
    assert.equal(investment.mine.capital_returned, 20_000_00);
    assert.equal(investment.mine.outstanding_capital, 80_000_00);
    assert.ok(movements.every(row => row.partner_id === owner.id && row.status === 'confirmado'));
    await moneyText(investor.locator('[data-return-profit]'), 60_000_00);
    await moneyText(investor.locator('[data-return-capital]'), 20_000_00);
    await moneyText(investor.locator('[data-return-outstanding]'), 80_000_00);
    assert.equal(investment.annual_profit_share.own_profit_confirmed, 60_000_00);
    assert.ok(!JSON.stringify(investment).includes('Pauta incurrida de la campaña de prueba'));
    for (const path of ['/api/finance/overview', '/api/finance/entries', '/api/finance/costing', `/api/finance/distributions/preview?investment_id=${investmentId}&month=2026-09`]) assert.equal((await investor.request.get(base + path)).status(), 403, path);
  });

  await check('socios can read finance but cannot write through the UI or API', async () => {
    const socio = await login(partner);
    await open(socio, '/finanzas');
    await socio.getByText('Consulta de socios', { exact: true }).waitFor();
    assert.equal(await socio.getByRole('button', { name: 'Registrar venta cobrada', exact: true }).count(), 0);
    await json(socio, '/api/finance/overview?year=2026');
    assert.equal((await socio.request.post(base + '/api/finance/entries', { headers, data: { kind: 'revenue', amount: 100, currency: 'CRC', date: '2026-09-15', description: 'Forbidden write' } })).status(), 403);
    await socio.getByRole('tab', { name: /Costear servicio/ }).click();
    assert.equal(await socio.getByLabel('Nombre del costeo').isDisabled(), true);
    await socio.context().close();
  });

  await check('finance, source tariff and investor results fit desktop and mobile in both themes', async () => {
    for (const theme of ['light', 'dark']) {
      for (const page of [staff, investor]) await page.evaluate(value => localStorage.setItem('jcp:theme', value), theme);
      for (const width of [1440, 390]) {
        await staff.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
        await investor.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
        for (const tab of ['ventas', 'costeo', 'repartos']) {
          await open(staff, `/finanzas?tab=${tab}&investment_id=${investmentId}`);
          await staff.locator('.fn-tabs').waitFor();
          if (tab === 'repartos') await staff.locator('.fn-repartition').waitFor();
          await noOverflow(staff, `finance ${tab} ${width} ${theme}`);
          await staff.screenshot({ path: join(shots, `finance-${tab}-${width}-${theme}.png`), fullPage: true, animations: 'disabled' });
        }
        await open(staff, '/servicios/pagina_web');
        await staff.locator('[data-service-tariff="pagina_web"]').waitFor();
        await noOverflow(staff, `service tariff ${width} ${theme}`);
        await staff.screenshot({ path: join(shots, `tariff-${width}-${theme}.png`), fullPage: true, animations: 'disabled' });
        await open(investor, `/inversionista/inversiones/${investmentId}`);
        await investor.locator('[data-return-profit]').waitFor();
        await noOverflow(investor, `investor returns ${width} ${theme}`);
        await investor.screenshot({ path: join(shots, `returns-${width}-${theme}.png`), fullPage: true, animations: 'disabled' });
      }
    }
  });
  await check('browser runtime and server stay free of errors', async () => assert.deepEqual(errors, []));
} finally {
  await browser?.close();
  server.closeAllConnections();
  await new Promise(done => server.close(done));
  db.close();
  const cleanupPath = resolve(temporary);
  assert.ok(cleanupPath.startsWith(resolve(tmpdir()) + sep) && basename(cleanupPath).startsWith('portal-finance-experience-'));
  await rm(cleanupPath, { recursive: true, force: true });
}
console.log(`\n${results.filter(result => result.startsWith('ok')).length}/${results.length} finance experience checks passed. Screenshots: ${shots}`);
if (results.some(result => result.startsWith('not ok'))) process.exitCode = 1;
