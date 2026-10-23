// ============================================================================
//  server/routes/investor.mjs
//  PORTAL DE INVERSIONISTAS (v6, /api/investor/*, acceso 'investor').
//  El inversionista es una persona de users con rol 'inversionista'. Solo ve:
//    · las inversiones habilitadas por un admin y aquellas donde tiene historial propio;
//    · SUS movimientos (aportes y retornos) con su conversación;
//    · los totales de cada inversión (capital, retornos, cuántos participan),
//      nunca los nombres ni los montos de los otros socios, ni las notas internas.
//  Puede avisar un aporte suyo y escribir en el hilo de sus movimientos. No
//  aprueba nada: toda la plata la aprueba la administración (rol admin).
// ============================================================================

import { INVESTMENT_CATEGORIES, INVESTMENT_STATUS, MOVEMENT_TYPE_LABEL, MOVEMENT_STATUS_META } from '../../shared/catalog.js';
import { investmentMetrics, cumulativeSeries, xirr, formatMoney, returnBreakdown, returnParts, movementInCRC } from '../../shared/finance.js';
import { fail, invalid, has, text, minorAmount } from '../http.mjs';
import { transaction } from '../schema.mjs';
import { publicUser } from '../context.mjs';
import { createMoney } from './investments.mjs';
import { createInvestmentAccess } from '../investment-access.mjs';
import { createBusinessFinance } from '../finance.mjs';

export function investorRoutes(route, ctx) {
  const { db } = ctx;
  const money = createMoney(ctx);
  const { crcOf } = money;
  const { hasGrant, requireContributionAccess } = createInvestmentAccess(db);
  const businessFinance = createBusinessFinance(ctx);

  const MOVEMENT_SELECT = `SELECT m.*, i.name investment_name, c.name created_by_name, r.name resolved_by_name FROM movements m
    JOIN investments i ON i.id = m.investment_id JOIN users c ON c.id = m.created_by LEFT JOIN users r ON r.id = m.resolved_by`;
  const messagesOf = (movementId) => db.prepare(`SELECT mm.id, mm.kind, mm.body, mm.created_at, u.name user_name, u.color user_color,
      CASE WHEN mm.user_id = (SELECT partner_id FROM movements WHERE id = mm.movement_id) THEN 1 ELSE 0 END mine
    FROM movement_messages mm JOIN users u ON u.id = mm.user_id WHERE mm.movement_id = ? ORDER BY mm.created_at, mm.id`).all(movementId);

  /** Movimiento con lo que la pantalla necesita para responder sin abrir otra vista. */
  const decorate = (m, user) => ({
    ...m,
    amount_crc: crcOf(m),
    messages: messagesOf(m.id),
    can_annul: m.status === 'pendiente' && m.created_by === user.id,
    awaiting: m.status === 'pendiente' ? 'JC Analytics' : null,
  });

  const myMovements = (user, investmentId = null) => db.prepare(`${MOVEMENT_SELECT} WHERE m.partner_id = ?
    ${investmentId ? 'AND m.investment_id = ?' : ''} ORDER BY m.date DESC, m.id DESC`).all(...(investmentId ? [user.id, investmentId] : [user.id]));

  const myInvestmentIds = (user) => db.prepare('SELECT DISTINCT investment_id FROM movements WHERE partner_id = ?').all(user.id).map((r) => r.investment_id);

  /** Inversión del inversionista o 404 (una ajena no revela que existe). */
  function myInvestment(user, investmentId) {
    if (!hasGrant(investmentId, user.id) && !db.prepare('SELECT 1 FROM movements WHERE partner_id = ? AND investment_id = ?').get(user.id, investmentId)) fail(404, 'not_found');
    return money.getInvestment(investmentId);
  }

  /** Movimiento a nombre del inversionista o 404. */
  function myMovement(user, movementId) {
    const m = money.getMovement(movementId);
    if (m.partner_id !== user.id) fail(404, 'not_found');
    return m;
  }

  /** Posición del inversionista en una inversión: lo suyo completo y del total solo agregados. */
  function position(investment, user) {
    const all = money.movementsOf(investment.id);
    const total = investmentMetrics(all);
    const mine = investmentMetrics(all.filter((m) => m.partner_id === user.id));
    const share = total.partners.find((p) => p.partner_id === user.id)?.share ?? 0;
    const accessGranted = hasGrant(investment.id, user.id);
    return {
      id: investment.id,
      name: investment.name,
      category: investment.category,
      category_label: INVESTMENT_CATEGORIES[investment.category] ?? investment.category,
      status: investment.status,
      status_label: INVESTMENT_STATUS[investment.status]?.label ?? investment.status,
      currency: investment.currency,
      description: investment.description,
      project_name: investment.project_name,
      target_amount: investment.target_amount,
      expected_return_pct: investment.expected_return_pct,
      expected_date: investment.expected_date,
      updated_at: investment.updated_at,
      access_granted: accessGranted,
      can_contribute: accessGranted && investment.status !== 'cerrada' && investment.status !== 'perdida',
      annual_profit_share: businessFinance.ownAnnual(investment.id, user.id),
      totals: {
        contributed: total.contributed,
        returned: total.returned,
        holders: total.partners.filter((p) => p.contributed > 0).length,
        target_progress: investment.target_amount ? total.contributed / investment.target_amount : null,
      },
      mine: {
        contributed: mine.contributed,
        returned: mine.returned,
        capital_returned: mine.capital_returned,
        profit_returned: mine.profit_returned,
        unclassified_returned: mine.unclassified_returned,
        outstanding_capital: mine.outstanding_capital,
        net: mine.net,
        moic: mine.moic,
        irr: mine.irr,
        share,
        pending_contributions: mine.pendingContributions,
        pending_returns: mine.pendingReturns,
        pending_count: mine.pendingCount,
      },
    };
  }

  /** Totales del inversionista en colones (cada movimiento en dólares usa SU tipo de cambio). */
  function portfolio(user, movements) {
    const confirmed = movements.filter((m) => m.status === 'confirmado');
    const sum = (list, type) => list.filter((m) => m.type === type).reduce((a, m) => a + (crcOf(m) ?? 0), 0);
    const contributed = sum(confirmed, 'aporte');
    const returned = sum(confirmed, 'retorno');
    const pending = movements.filter((m) => m.status === 'pendiente');
    const parts = returnBreakdown(movements.map(movementInCRC));
    return {
      contributed_crc: contributed,
      returned_crc: returned,
      net_crc: returned - contributed,
      capital_returned_crc: parts.capital_returned,
      profit_returned_crc: parts.profit_returned,
      unclassified_returned_crc: parts.unclassified_returned,
      outstanding_capital_crc: parts.outstanding_capital,
      moic: contributed ? returned / contributed : null,
      irr: xirr(confirmed.map((m) => ({ date: m.date, amount: (m.type === 'aporte' ? -1 : 1) * (crcOf(m) ?? 0) }))),
      in_transit_crc: pending.reduce((a, m) => a + (m.type === 'aporte' ? -1 : 1) * (crcOf(m) ?? 0), 0),
      pending_count: pending.length,
    };
  }

  /** A quién escribirle: los administradores activos (dueños de la relación con inversionistas). */
  const contacts = () => db.prepare("SELECT name, phone, email FROM users WHERE active = 1 AND role = 'admin' ORDER BY id LIMIT 2").all();

  // ── Lectura ───────────────────────────────────────────────────────────────
  route('GET', '/api/investor/overview', 'investor', ({ user }) => {
    const movements = myMovements(user);
    const investments = myInvestmentIds(user).map((investmentId) => position(money.getInvestment(investmentId), user))
      .sort((a, b) => (a.status === 'activa' ? 0 : 1) - (b.status === 'activa' ? 0 : 1) || b.mine.contributed - a.mine.contributed);
    const availableInvestments = db.prepare(`SELECT a.investment_id FROM investment_access a
      WHERE a.investor_id = ? AND NOT EXISTS (
        SELECT 1 FROM movements m WHERE m.investment_id = a.investment_id AND m.partner_id = ?
      ) ORDER BY a.investment_id`).all(user.id, user.id)
      .map(({ investment_id: investmentId }) => position(money.getInvestment(investmentId), user));
    return {
      me: publicUser(user),
      portfolio: portfolio(user, movements),
      investments,
      available_investments: availableInvestments,
      recent: movements.slice(0, 8).map((m) => decorate(m, user)),
      series: cumulativeSeries(movements, crcOf),
      contacts: contacts(),
      fx_usd_crc: ctx.numberSetting('fx_usd_crc', 515),
    };
  });

  route('GET', '/api/investor/investments/:id', 'investor', ({ user, params }) => {
    const investment = myInvestment(user, params.id);
    const movements = myMovements(user, investment.id);
    return {
      investment: position(investment, user),
      movements: movements.map((m) => decorate(m, user)),
      series: cumulativeSeries(movements),
    };
  });

  route('GET', '/api/investor/movements', 'investor', ({ user }) => {
    const movements = myMovements(user);
    return { movements: movements.map((m) => decorate(m, user)), portfolio: portfolio(user, movements) };
  });

  // ── Acciones sobre SUS movimientos ────────────────────────────────────────
  route('POST', '/api/investor/movements/:id/messages', 'investor', ({ user, body, params }) => {
    const m = myMovement(user, params.id);
    const bodyText = text(body.body, 'body', { max: 1000, min: 1, required: true });
    money.addMessage(m.id, user.id, 'mensaje', bodyText);
    const investment = money.getInvestment(m.investment_id);
    const participants = db.prepare('SELECT DISTINCT user_id FROM movement_messages WHERE movement_id = ?').all(m.id).map((r) => r.user_id);
    ctx.notify([m.created_by, m.resolved_by, ...participants], user.id, {
      kind: 'message', title: `Mensaje de ${user.name} sobre ${formatMoney(m.amount, m.currency)}`, body: `${investment.name}: ${bodyText.slice(0, 140)}`,
      link: `/inversiones/${investment.id}?mov=${m.id}`,
    });
    return { messages: messagesOf(m.id) };
  });

  /** Aviso de un aporte propio ("envié ₡…"): queda por aprobar por la administración. */
  route('POST', '/api/investor/investments/:id/movements', 'investor', ({ user, body, params }) => {
    const investment = myInvestment(user, params.id);
    requireContributionAccess(investment, user);
    if (has(body, 'type') && body.type !== 'aporte') invalid('type', 'Desde el portal solo se avisan aportes. Los retornos los registra JC Analytics.');
    const amount = minorAmount(body.amount, 'amount', { required: true });
    const date = money.movementDate(body.date);
    const message = text(body.message, 'message', { max: 1000, min: 3, required: true });
    const reference = text(body.reference, 'reference', { max: 80 });
    const fxRate = money.fxFor(investment, {});
    const m = transaction(db, () => {
      const row = money.insertMovement({ investment, partner: user, type: 'aporte', amount, fxRate, date, message, reference, batchId: null, user });
      db.prepare('UPDATE investments SET updated_at = ? WHERE id = ?').run(ctx.nowIso(), investment.id);
      return row;
    });
    ctx.log(user.id, 'movement', m.id, 'created', `${user.name} (inversionista) avisó un aporte de ${formatMoney(amount, investment.currency)} en ${investment.name}`, { sensitive: true });
    money.announce(m, investment, user);
    return { movement: decorate(db.prepare(`${MOVEMENT_SELECT} WHERE m.id = ?`).get(m.id), user) };
  });

  /** Retira un aviso propio que nadie confirmó todavía (p. ej., monto mal escrito). */
  route('POST', '/api/investor/movements/:id/annul', 'investor', ({ user, body, params }) => {
    const m = myMovement(user, params.id);
    if (m.status !== 'pendiente' || m.created_by !== user.id) fail(403, 'cannot_annul');
    const reason = text(body.message, 'message', { max: 1000, min: 3, required: true });
    transaction(db, () => {
      db.prepare("UPDATE movements SET status = 'anulado', resolved_by = ?, resolved_at = ? WHERE id = ? AND status = 'pendiente'").run(user.id, ctx.nowIso(), m.id);
      money.addMessage(m.id, user.id, 'anulacion', reason);
      money.settleRequests(m.id);
    });
    ctx.log(user.id, 'movement', m.id, 'annulled', `${user.name} (inversionista) retiró su aviso de aporte de ${formatMoney(m.amount, m.currency)}`, { sensitive: true });
    return { movement: decorate(db.prepare(`${MOVEMENT_SELECT} WHERE m.id = ?`).get(m.id), user) };
  });

  // ── Estado de cuenta para Excel (separador ; y BOM UTF-8) ─────────────────
  route('GET', '/api/investor/statement.csv', 'investor', ({ user, res }) => {
    const rows = myMovements(user).reverse();
    const dec = (minor) => (minor == null ? '' : (minor / 100).toFixed(2).replace('.', ','));
    const cell = (v) => {
      let s = v == null ? '' : String(v);
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
      return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = ['Fecha', 'Inversión', 'Tipo', 'Monto', 'Moneda', 'Tipo de cambio', 'Equivalente CRC', 'Estado', 'Referencia', 'Mensaje', 'Clasificación retorno', 'Capital devuelto', 'Ganancia devuelta'];
    const lines = rows.map((m) => [m.date, m.investment_name, MOVEMENT_TYPE_LABEL[m.type], dec(m.amount), m.currency,
      m.fx_rate ? String(m.fx_rate).replace('.', ',') : '', dec(crcOf(m)), MOVEMENT_STATUS_META[m.status]?.label ?? m.status, m.reference, m.message,
      m.type === 'retorno' ? m.return_kind : '', m.type === 'retorno' ? dec(returnParts(m).capital) : '', m.type === 'retorno' ? dec(returnParts(m).profit) : ''].map(cell).join(';'));
    ctx.log(user.id, 'investment', null, 'exported', `${user.name} descargó su estado de cuenta (${rows.length} movimientos)`, { sensitive: true });
    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="estado-de-cuenta-${ctx.today()}.csv"`,
      'Cache-Control': 'no-store',
    });
    res.end(`\uFEFF${[header.join(';'), ...lines].join('\r\n')}\r\n`);
  });

  // ── Perfil y avisos ───────────────────────────────────────────────────────
  route('PATCH', '/api/investor/me', 'investor', ({ user, body }) => {
    const name = has(body, 'name') ? text(body.name, 'name', { max: 80, min: 2, required: true }) : user.name;
    const phone = has(body, 'phone') ? text(body.phone, 'phone', { max: 30 }) : user.phone;
    db.prepare('UPDATE users SET name = ?, phone = ? WHERE id = ?').run(name, phone, user.id);
    return { user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(user.id)) };
  });

  const unread = (user) => db.prepare('SELECT COUNT(*) n FROM notifications WHERE user_id = ? AND read_at IS NULL').get(user.id).n;
  route('GET', '/api/investor/notifications', 'investor', ({ user }) => ({
    notifications: db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 80').all(user.id),
    unread: unread(user),
  }));

  route('POST', '/api/investor/notifications/read', 'investor', ({ user, body }) => {
    const at = ctx.nowIso();
    if (body.all === true) {
      db.prepare('UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL').run(at, user.id);
    } else {
      if (!Array.isArray(body.ids) || body.ids.length > 200) invalid('ids', 'Lista inválida.');
      const stmt = db.prepare('UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ? AND read_at IS NULL');
      for (const raw of body.ids) {
        const n = Number(raw);
        if (!Number.isSafeInteger(n) || n <= 0) invalid('ids', 'Identificador inválido.');
        stmt.run(at, n, user.id);
      }
    }
    return { unread: unread(user) };
  });
}
