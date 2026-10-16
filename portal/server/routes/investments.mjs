// ============================================================================
//  server/routes/investments.mjs
//  Inversiones de los socios. Ciclo de cada movimiento de dinero:
//
//    1. Alguien registra un APORTE (socio → inversión) o un RETORNO
//       (inversión → socio) con un mensaje obligatorio y, opcionalmente, la
//       referencia SINPE/transferencia.
//    2. Queda "por confirmar". Doble control:
//         · si quien registra es el mismo socio del movimiento, confirma otro
//           socio (quien recibió la plata);
//         · si lo registra otra persona, confirma el socio del movimiento.
//    3. Quien confirma responde con su "mensaje de vuelta" (Recibido ✓) u
//       objeta con el motivo. Solo lo confirmado cuenta en las métricas.
//    4. Un movimiento confirmado no se edita. Si hubo un error, un
//       administrador lo anula con motivo y queda en la bitácora.
// ============================================================================

import { randomUUID } from 'node:crypto';
import { INVESTMENT_CATEGORIES, INVESTMENT_STATUS, MOVEMENT_TYPE_LABEL, MOVEMENT_STATUS_META } from '../../shared/catalog.js';
import { investmentMetrics, allocateProRata, cumulativeSeries, toCRC, formatMoney, formatPercent, returnParts, returnBreakdown, movementInCRC } from '../../shared/finance.js';
import { isCampaign } from '../../shared/business-finance.js';
import { fail, invalid, has, text, oneOf, dateOnly, id, minorAmount, number } from '../http.mjs';
import { transaction } from '../schema.mjs';
import { pendingForUser } from './core.mjs';
import { createInvestmentAccess } from '../investment-access.mjs';

/**
 * Reglas y lecturas de dinero compartidas por las rutas de socios (abajo) y el
 * portal de inversionistas (routes/investor.mjs): un solo lugar para la doble
 * confirmación, los avisos y las métricas.
 */
export function createMoney(ctx) {
  const { db } = ctx;
  const { requireContributionAccess } = createInvestmentAccess(db);
  const getInvestment = (investmentId) => db.prepare(`SELECT i.*, p.name project_name FROM investments i LEFT JOIN projects p ON p.id = i.project_id WHERE i.id = ?`).get(investmentId)
    ?? fail(404, 'not_found');
  const movementsOf = (investmentId) => db.prepare(`SELECT m.*, p.name partner_name, p.color partner_color, c.name created_by_name, r.name resolved_by_name
    FROM movements m JOIN users p ON p.id = m.partner_id JOIN users c ON c.id = m.created_by LEFT JOIN users r ON r.id = m.resolved_by
    WHERE m.investment_id = ? ORDER BY m.date DESC, m.id DESC`).all(investmentId);
  const allMovements = () => db.prepare('SELECT * FROM movements').all();
  const crcOf = (m) => toCRC(m.amount, m.currency, m.fx_rate);

  /** ¿La persona sigue activa y puede tener capital (socio, admin o inversionista)? */
  const isActiveInvestor = (userId) => !!db.prepare("SELECT 1 FROM users WHERE id = ? AND active = 1 AND role IN ('admin','socio','inversionista')").get(userId);
  /**
   * Confirma "cualquier otro socio" cuando quien registró es el mismo socio, o cuando ese
   * socio ya no tiene acceso (desactivado o colaborador): alguien debe custodiar su parte.
   */
  const anyInvestorConfirms = (m) => m.created_by === m.partner_id || !isActiveInvestor(m.partner_id);

  /** Quién puede confirmar u objetar un movimiento pendiente. */
  function canResolve(m, user) {
    if (m.status !== 'pendiente' || m.created_by === user.id) return false;
    // Un inversionista no custodia plata ajena: solo responde por los movimientos a su nombre.
    if (user.role === 'inversionista') return m.partner_id === user.id;
    return anyInvestorConfirms(m) || m.partner_id === user.id;
  }
  const canAnnul = (m, user) => m.status !== 'anulado' && (user.role === 'admin' || (m.created_by === user.id && m.status !== 'confirmado'));

  function confirmersFor(m) {
    return anyInvestorConfirms(m) ? ctx.investorIds().filter((u) => u !== m.created_by) : [m.partner_id];
  }

  function partnerOrFail(partnerId) {
    const p = db.prepare("SELECT * FROM users WHERE id = ? AND active = 1 AND role IN ('admin','socio','inversionista')").get(partnerId);
    if (!p) invalid('partner_id', 'La persona no existe o no puede tener capital (socio, admin o inversionista).');
    return p;
  }

  function fxFor(investment, body) {
    if (investment.currency === 'CRC') return null;
    const fallback = ctx.numberSetting('fx_usd_crc', 515);
    return has(body, 'fx_rate') && body.fx_rate !== '' && body.fx_rate != null ? number(body.fx_rate, 'fx_rate', { min: 100, max: 2000 }) : fallback;
  }

  function movementDate(value) {
    const d = dateOnly(value, 'date') ?? ctx.today();
    if (d > ctx.today()) invalid('date', 'La fecha no puede ser futura: registrá el movimiento cuando ocurra.');
    return d;
  }

  function summarize(investment, movements) {
    const metrics = investmentMetrics(movements);
    const names = new Map(db.prepare('SELECT id, name, color FROM users').all().map((u) => [u.id, u]));
    metrics.partners = metrics.partners.map((p) => ({ ...p, name: names.get(p.partner_id)?.name, color: names.get(p.partner_id)?.color }));
    const confirmed = movements.filter((m) => m.status === 'confirmado');
    const crc = (type) => confirmed.filter((m) => m.type === type).reduce((a, m) => a + (crcOf(m) ?? 0), 0);
    return {
      ...metrics,
      contributed_crc: crc('aporte'),
      returned_crc: crc('retorno'),
      net_crc: crc('retorno') - crc('aporte'),
      target_progress: investment.target_amount ? metrics.contributed / investment.target_amount : null,
    };
  }

  function insertMovement({ investment, partner, type, amount, fxRate, date, message, reference, batchId, user, returnKind = 'unclassified', financeDistribution = false }) {
    // También cubre el registro del equipo a nombre de un inversionista: no hay alta implícita.
    if (type === 'aporte') requireContributionAccess(investment, partner);
    if (type === 'retorno' && isCampaign(investment) && !financeDistribution) fail(409, 'finance_distribution_required');
    if (type === 'retorno' && returnKind === 'capital') {
      const own = movementsOf(investment.id).filter((m) => m.partner_id === partner.id);
      const contributed = own.filter((m) => m.type === 'aporte' && m.status === 'confirmado').reduce((sum, m) => sum + m.amount, 0);
      const reserved = own.filter((m) => m.type === 'retorno' && m.status !== 'anulado').reduce((sum, m) => sum + returnParts(m).capital, 0);
      if (own.some((m) => m.type === 'retorno' && m.status !== 'anulado' && returnParts(m).unclassified > 0)) fail(409, 'unclassified_returns');
      if (amount > contributed - reserved) fail(409, 'payout_exceeds_available');
    }
    const at = ctx.nowIso();
    const { lastInsertRowid } = db.prepare(`INSERT INTO movements (investment_id, partner_id, type, amount, currency, fx_rate, date, message, reference,
      status, batch_id, created_by, created_at, return_kind, return_capital_amount, return_profit_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', ?, ?, ?, ?, ?, ?)`).run(
      investment.id, partner.id, type, amount, investment.currency, fxRate, date, message, reference, batchId, user.id, at,
      type === 'retorno' ? returnKind : 'unclassified', type === 'retorno' && returnKind === 'capital' ? amount : null, type === 'retorno' && returnKind === 'profit' ? amount : null,
    );
    const movementId = Number(lastInsertRowid);
    db.prepare("INSERT INTO movement_messages (movement_id, user_id, kind, body, created_at) VALUES (?, ?, 'registro', ?, ?)").run(movementId, user.id, message, at);
    return db.prepare('SELECT * FROM movements WHERE id = ?').get(movementId);
  }

  function announce(m, investment, user) {
    const amount = formatMoney(m.amount, m.currency);
    const partnerName = ctx.userName(m.partner_id);
    // Si confirma el propio dueño del movimiento (socio o inversionista), se le habla de vos.
    const toPartner = !anyInvestorConfirms(m);
    const title = toPartner
      ? `Confirmá tu ${m.type === 'aporte' ? 'aporte' : 'retorno'}: ${amount}`
      : m.type === 'aporte'
        ? `Confirmá un aporte de ${partnerName}: ${amount}`
        : `Confirmá un retorno${m.partner_id === user.id ? ` a ${partnerName}` : ''}: ${amount}`;
    ctx.notify(confirmersFor(m), user.id, { kind: 'movement', title, body: `${investment.name} · ${user.name}: ${m.message.slice(0, 140)}`, link: `/inversiones/${investment.id}?mov=${m.id}` });
  }

  const getMovement = (movementId) => db.prepare('SELECT * FROM movements WHERE id = ?').get(movementId) ?? fail(404, 'not_found');
  /** Una vez resuelto, los avisos "Confirmá…" de ese movimiento ya no piden acción a nadie. */
  const settleRequests = (movementId) => db.prepare("UPDATE notifications SET read_at = ? WHERE read_at IS NULL AND kind = 'movement' AND title LIKE 'Confirmá%' AND link LIKE ?")
    .run(ctx.nowIso(), `%?mov=${movementId}`);
  const addMessage = (movementId, userId, kind, bodyText) => db.prepare('INSERT INTO movement_messages (movement_id, user_id, kind, body, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(movementId, userId, kind, bodyText, ctx.nowIso());

  function resolve({ user, body, params }, outcome) {
    const m = getMovement(params.id);
    if (m.status !== 'pendiente') fail(409, 'not_pending');
    if (!canResolve(m, user)) fail(403, 'not_your_confirmation');
    const reply = outcome === 'confirmado'
      ? text(body.message, 'message', { max: 1000 }) ?? 'Recibido ✓'
      : text(body.message, 'message', { max: 1000, min: 3, required: true });
    const investment = getInvestment(m.investment_id);
    transaction(db, () => {
      db.prepare('UPDATE movements SET status = ?, resolved_by = ?, resolved_at = ? WHERE id = ? AND status = ?').run(outcome, user.id, ctx.nowIso(), m.id, 'pendiente');
      addMessage(m.id, user.id, outcome === 'confirmado' ? 'confirmacion' : 'objecion', reply);
      settleRequests(m.id);
    });
    const amount = formatMoney(m.amount, m.currency);
    const verb = outcome === 'confirmado' ? 'confirmó' : 'objetó';
    ctx.log(user.id, 'movement', m.id, outcome, `${user.name} ${verb} ${m.type === 'aporte' ? 'el aporte' : 'el retorno'} de ${amount} en ${investment.name}`, { sensitive: true });
    ctx.notify([m.created_by, m.partner_id], user.id, {
      kind: 'movement',
      title: `${user.name} ${verb} ${m.type === 'aporte' ? 'el aporte' : 'el retorno'} de ${amount}`,
      body: `${investment.name} · “${reply.slice(0, 140)}”`,
      link: `/inversiones/${investment.id}?mov=${m.id}`,
    });
    return { movement: getMovement(m.id) };
  }

  return {
    getInvestment, movementsOf, allMovements, crcOf, isActiveInvestor, anyInvestorConfirms, canResolve, canAnnul, confirmersFor,
    partnerOrFail, fxFor, movementDate, summarize, insertMovement, announce, getMovement, settleRequests, addMessage, resolve,
  };
}

export function investmentRoutes(route, ctx) {
  const { db } = ctx;
  const { allowedInvestorIds, requireContributionAccess } = createInvestmentAccess(db);
  const {
    getInvestment, movementsOf, allMovements, crcOf, anyInvestorConfirms, canResolve, canAnnul,
    partnerOrFail, fxFor, movementDate, summarize, insertMovement, announce, getMovement, addMessage, settleRequests, resolve,
  } = createMoney(ctx);

  function readInvestmentBody(body, current = {}) {
    const pick = (key, fn) => (has(body, key) ? fn(body[key]) : current[key] ?? null);
    const out = {
      name: pick('name', (v) => text(v, 'name', { max: 120, min: 2, required: true })),
      category: pick('category', (v) => oneOf(v, 'category', INVESTMENT_CATEGORIES, { required: true })),
      status: pick('status', (v) => oneOf(v, 'status', INVESTMENT_STATUS, { required: true })),
      currency: current.currency ?? oneOf(body.currency, 'currency', ['CRC', 'USD'], { fallback: 'CRC' }),
      project_id: pick('project_id', (v) => {
        const pid = id(v, 'project_id');
        if (pid && !db.prepare('SELECT 1 FROM projects WHERE id = ?').get(pid)) invalid('project_id', 'Proyecto no encontrado.');
        return pid;
      }),
      target_amount: pick('target_amount', (v) => minorAmount(v, 'target_amount')),
      expected_return_pct: pick('expected_return_pct', (v) => number(v, 'expected_return_pct', { min: -100, max: 10000 })),
      expected_date: pick('expected_date', (v) => dateOnly(v, 'expected_date')),
      description: pick('description', (v) => text(v, 'description', { max: 4000 })),
    };
    if (!out.category) invalid('category', 'Campo requerido.');
    if (!out.status) out.status = 'activa';
    return out;
  }

  // ── Portafolio ────────────────────────────────────────────────────────────
  route('GET', '/api/investments', 'invest', ({ user }) => {
    const investments = db.prepare(`SELECT i.*, p.name project_name FROM investments i LEFT JOIN projects p ON p.id = i.project_id
      ORDER BY CASE i.status WHEN 'activa' THEN 0 WHEN 'propuesta' THEN 1 ELSE 2 END, i.updated_at DESC`).all();
    const movements = allMovements();
    const byInvestment = Map.groupBy(movements, (m) => m.investment_id);
    const rows = investments.map((i) => ({ ...i, metrics: summarize(i, byInvestment.get(i.id) ?? []) }));

    const confirmed = movements.filter((m) => m.status === 'confirmado');
    const contributed = confirmed.filter((m) => m.type === 'aporte').reduce((a, m) => a + (crcOf(m) ?? 0), 0);
    const returned = confirmed.filter((m) => m.type === 'retorno').reduce((a, m) => a + (crcOf(m) ?? 0), 0);
    const breakdown = returnBreakdown(movements.map(movementInCRC));
    const partners = db.prepare("SELECT id, name, color, role, active FROM users WHERE role IN ('admin','socio','inversionista') ORDER BY name").all().map((p) => {
      const mine = confirmed.filter((m) => m.partner_id === p.id);
      const c = mine.filter((m) => m.type === 'aporte').reduce((a, m) => a + (crcOf(m) ?? 0), 0);
      const r = mine.filter((m) => m.type === 'retorno').reduce((a, m) => a + (crcOf(m) ?? 0), 0);
      const pending = movements.filter((m) => m.partner_id === p.id && m.status === 'pendiente');
      return { ...p, active: !!p.active, contributed_crc: c, returned_crc: r, net_crc: r - c, share: contributed ? c / contributed : 0, pending_count: pending.length };
    }).filter((p) => p.active || p.contributed_crc || p.returned_crc);

    return {
      investments: rows,
      portfolio: {
        contributed_crc: contributed,
        returned_crc: returned,
        capital_returned_crc: breakdown.capital_returned,
        profit_returned_crc: breakdown.profit_returned,
        unclassified_returned_crc: breakdown.unclassified_returned,
        outstanding_capital_crc: breakdown.outstanding_capital,
        net_crc: returned - contributed,
        moic: contributed ? returned / contributed : null,
        active_count: investments.filter((i) => i.status === 'activa').length,
        pending_count: movements.filter((m) => m.status === 'pendiente').length,
        objected_count: movements.filter((m) => m.status === 'objetado').length,
        series: cumulativeSeries(movements, crcOf),
      },
      partners,
      my_pending: pendingForUser(ctx, user).map((m) => m.id),
      fx_usd_crc: ctx.numberSetting('fx_usd_crc', 515),
    };
  });

  route('POST', '/api/investments', 'invest', ({ user, body }) => {
    const i = readInvestmentBody(body, {});
    const at = ctx.nowIso();
    const { lastInsertRowid } = db.prepare(`INSERT INTO investments (name, category, status, currency, project_id, target_amount, expected_return_pct,
      expected_date, description, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      i.name, i.category, i.status, i.currency, i.project_id, i.target_amount, i.expected_return_pct, i.expected_date, i.description, user.id, at, at,
    );
    const investmentId = Number(lastInsertRowid);
    ctx.log(user.id, 'investment', investmentId, 'created', `${user.name} abrió la inversión ${i.name}`, { sensitive: true });
    ctx.notify(ctx.investorIds(), user.id, { kind: 'investment', title: `Nueva inversión: ${i.name}`, body: `${user.name} la registró${i.target_amount ? ` con meta de ${formatMoney(i.target_amount, i.currency)}` : ''}.`, link: `/inversiones/${investmentId}` });
    return { investment: getInvestment(investmentId) };
  });

  route('GET', '/api/investments/:id', 'invest', ({ user, params }) => {
    const investment = getInvestment(params.id);
    const movements = movementsOf(investment.id);
    const messages = Map.groupBy(
      db.prepare(`SELECT mm.*, u.name user_name, u.color user_color FROM movement_messages mm JOIN users u ON u.id = mm.user_id
        JOIN movements m ON m.id = mm.movement_id WHERE m.investment_id = ? ORDER BY mm.created_at, mm.id`).all(investment.id),
      (row) => row.movement_id,
    );
    return {
      investment,
      allowed_investor_ids: allowedInvestorIds(investment.id),
      metrics: summarize(investment, movements),
      series: cumulativeSeries(movements),
      movements: movements.map((m) => ({
        ...m,
        amount_crc: crcOf(m),
        messages: messages.get(m.id) ?? [],
        can_resolve: canResolve(m, user),
        can_annul: canAnnul(m, user),
        awaiting: m.status === 'pendiente' ? (anyInvestorConfirms(m) ? 'otro socio' : m.partner_name) : null,
      })),
      notes: db.prepare(`SELECT n.*, u.name user_name, u.color user_color FROM investment_notes n JOIN users u ON u.id = n.user_id
        WHERE n.investment_id = ? ORDER BY n.created_at DESC, n.id DESC`).all(investment.id),
    };
  });

  const accessOf = (investmentId) => ({
    investors: db.prepare("SELECT id, name, color, active FROM users WHERE role = 'inversionista' ORDER BY name COLLATE NOCASE, id")
      .all().map((investor) => ({ ...investor, active: !!investor.active })),
    allowed_investor_ids: allowedInvestorIds(investmentId),
  });

  route('GET', '/api/investments/:id/access', 'admin', ({ params }) => accessOf(getInvestment(params.id).id));

  route('PUT', '/api/investments/:id/access', 'admin', ({ user, body, params }) => {
    const investment = getInvestment(params.id);
    const field = 'allowed_investor_ids';
    if (!Array.isArray(body[field]) || body[field].length > 1000) invalid(field, 'Elegí una lista válida de inversionistas (máximo 1000).');
    const requested = body[field];
    if (requested.some((value) => !Number.isSafeInteger(value) || value <= 0)) invalid(field, 'Cada identificador debe ser un entero positivo.');
    const allowed = [...new Set(requested)].sort((a, b) => a - b);
    transaction(db, () => {
      const investor = db.prepare("SELECT 1 FROM users WHERE id = ? AND role = 'inversionista'");
      for (const investorId of allowed) {
        if (!investor.get(investorId)) invalid(field, 'Solo se pueden habilitar personas con rol inversionista.');
      }
      const current = db.prepare('SELECT investor_id FROM investment_access WHERE investment_id = ?').all(investment.id).map((row) => row.investor_id);
      const nextIds = new Set(allowed);
      const currentIds = new Set(current);
      const removed = current.filter((investorId) => !nextIds.has(investorId));
      const added = allowed.filter((investorId) => !currentIds.has(investorId));
      const remove = db.prepare('DELETE FROM investment_access WHERE investment_id = ? AND investor_id = ?');
      const add = db.prepare('INSERT INTO investment_access (investment_id, investor_id, granted_by, granted_at) VALUES (?, ?, ?, ?)');
      for (const investorId of removed) remove.run(investment.id, investorId);
      for (const investorId of added) add.run(investment.id, investorId, user.id, ctx.nowIso());
      // Bloques cortos conservan todos los IDs sin superar el límite de 300 caracteres de la bitácora.
      for (const [label, ids] of [['habilitados', added], ['retirados', removed]]) {
        for (let index = 0; index < ids.length; index += 8) ctx.log(user.id, 'investment', investment.id, 'access_updated',
          `Permisos ${label} para inversionistas [${ids.slice(index, index + 8).join(', ')}] en la inversión #${investment.id}.`, { sensitive: true });
      }
    });
    return accessOf(investment.id);
  });

  route('PATCH', '/api/investments/:id', 'invest', ({ user, body, params }) => {
    const current = getInvestment(params.id);
    const i = readInvestmentBody(body, current);
    db.prepare(`UPDATE investments SET name = ?, category = ?, status = ?, project_id = ?, target_amount = ?, expected_return_pct = ?,
      expected_date = ?, description = ?, updated_at = ? WHERE id = ?`).run(
      i.name, i.category, i.status, i.project_id, i.target_amount, i.expected_return_pct, i.expected_date, i.description, ctx.nowIso(), current.id,
    );
    const statusNote = i.status !== current.status ? ` (estado → ${INVESTMENT_STATUS[i.status].label})` : '';
    ctx.log(user.id, 'investment', current.id, 'updated', `${user.name} actualizó la inversión ${i.name}${statusNote}`, { sensitive: true });
    if (statusNote) ctx.notify(ctx.investorIds(), user.id, { kind: 'investment', title: `${i.name}: ${INVESTMENT_STATUS[i.status].label}`, body: `${user.name} cambió el estado.`, link: `/inversiones/${current.id}` });
    return { investment: getInvestment(current.id) };
  });

  route('POST', '/api/investments/:id/notes', 'invest', ({ user, body, params }) => {
    const investment = getInvestment(params.id);
    const note = text(body.body, 'body', { max: 2000, min: 2, required: true });
    db.prepare('INSERT INTO investment_notes (investment_id, user_id, body, created_at) VALUES (?, ?, ?, ?)').run(investment.id, user.id, note, ctx.nowIso());
    ctx.notify(ctx.investorIds(), user.id, { kind: 'investment', title: `Novedad en ${investment.name}`, body: `${user.name}: ${note.slice(0, 140)}`, link: `/inversiones/${investment.id}` });
    return { ok: true };
  });

  // ── Movimientos ───────────────────────────────────────────────────────────
  route('POST', '/api/investments/:id/movements', 'invest', ({ user, body, params }) => {
    const investment = getInvestment(params.id);
    const type = oneOf(body.type, 'type', MOVEMENT_TYPE_LABEL, { required: true });
    const returnKind = type === 'retorno' ? oneOf(body.return_kind, 'return_kind', ['capital', 'profit', 'unclassified'], { fallback: 'unclassified' }) : 'unclassified';
    const partner = partnerOrFail(id(body.partner_id, 'partner_id', { required: true }));
    if (type === 'aporte') requireContributionAccess(investment, partner);
    if (investment.status === 'cerrada') fail(409, 'investment_closed');
    const amount = minorAmount(body.amount, 'amount', { required: true });
    const date = movementDate(body.date);
    const message = text(body.message, 'message', { max: 1000, min: 3, required: true });
    const reference = text(body.reference, 'reference', { max: 80 });
    const fxRate = fxFor(investment, body);
    const m = transaction(db, () => {
      const row = insertMovement({ investment, partner, type, returnKind, amount, fxRate, date, message, reference, batchId: null, user });
      db.prepare('UPDATE investments SET updated_at = ? WHERE id = ?').run(ctx.nowIso(), investment.id);
      return row;
    });
    ctx.log(user.id, 'movement', m.id, 'created', `${user.name} registró ${type === 'aporte' ? 'un aporte' : 'un retorno'} de ${formatMoney(amount, investment.currency)} (${partner.name}) en ${investment.name}`, { sensitive: true });
    announce(m, investment, user);
    return { movement: m };
  });

  /** Retorno repartido entre los socios según su capital confirmado. */
  route('POST', '/api/investments/:id/distribute', 'invest', ({ user, body, params }) => {
    const investment = getInvestment(params.id);
    if (investment.status === 'cerrada') fail(409, 'investment_closed');
    const amount = minorAmount(body.amount, 'amount', { required: true });
    const date = movementDate(body.date);
    const message = text(body.message, 'message', { max: 1000, min: 3, required: true });
    const reference = text(body.reference, 'reference', { max: 80 });
    const fxRate = fxFor(investment, body);
    const metrics = investmentMetrics(movementsOf(investment.id));
    const holders = metrics.partners.filter((p) => p.contributed > 0);
    if (!holders.length) invalid('amount', 'No hay aportes confirmados para calcular la participación.');
    const shares = allocateProRata(amount, holders.map((p) => p.contributed));
    const batchId = randomUUID();
    const created = transaction(db, () => holders.map((holder, i) => {
      if (!shares[i]) return null;
      // El capital de un socio que ya no está activo igual le corresponde: su parte se registra y la confirma otro socio.
      const partner = db.prepare('SELECT * FROM users WHERE id = ?').get(holder.partner_id);
      const detail = `${message}\nTu parte: ${formatPercent(holder.share)} de ${formatMoney(amount, investment.currency)}.`;
      return insertMovement({ investment, partner, type: 'retorno', amount: shares[i], fxRate, date, message: detail, reference, batchId, user });
    }).filter(Boolean));
    db.prepare('UPDATE investments SET updated_at = ? WHERE id = ?').run(ctx.nowIso(), investment.id);
    ctx.log(user.id, 'movement', null, 'distributed', `${user.name} distribuyó ${formatMoney(amount, investment.currency)} de ${investment.name} entre ${created.length} socios`, { sensitive: true });
    for (const m of created) announce(m, investment, user);
    return { movements: created, batch_id: batchId };
  });

  /** Bandeja "por confirmar" del usuario, con contexto para responder sin abrir cada inversión. */
  route('GET', '/api/movements/pending', 'invest', ({ user }) => {
    const pending = pendingForUser(ctx, user);
    const mine = db.prepare(`SELECT m.* FROM movements m WHERE m.created_by = ? AND m.status IN ('pendiente','objetado') ORDER BY m.created_at DESC`).all(user.id);
    const detail = (m) => {
      const row = db.prepare(`SELECT m.*, i.name investment_name, p.name partner_name, p.color partner_color, c.name created_by_name
        FROM movements m JOIN investments i ON i.id = m.investment_id JOIN users p ON p.id = m.partner_id JOIN users c ON c.id = m.created_by WHERE m.id = ?`).get(m.id);
      const messages = db.prepare(`SELECT mm.*, u.name user_name, u.color user_color FROM movement_messages mm JOIN users u ON u.id = mm.user_id
        WHERE mm.movement_id = ? ORDER BY mm.created_at, mm.id`).all(m.id);
      return { ...row, amount_crc: crcOf(row), messages, can_resolve: canResolve(row, user), can_annul: canAnnul(row, user) };
    };
    return { to_confirm: pending.map(detail), my_open: mine.map(detail) };
  });

  route('POST', '/api/movements/:id/confirm', 'invest', (args) => resolve(args, 'confirmado'));
  route('POST', '/api/movements/:id/object', 'invest', (args) => resolve(args, 'objetado'));

  route('POST', '/api/movements/:id/classify', 'admin', ({ user, body, params }) => {
    const movement = getMovement(params.id);
    if (movement.type !== 'retorno' || movement.status === 'anulado') fail(409, 'return_required');
    if (movement.return_kind !== 'unclassified' || db.prepare('SELECT 1 FROM finance_distribution_items WHERE movement_id=?').get(movement.id)) fail(409, 'classification_locked');
    const capital = minorAmount(body.capital_amount, 'capital_amount', { required: true, allowZero: true });
    const profit = minorAmount(body.profit_amount, 'profit_amount', { required: true, allowZero: true });
    const reason = text(body.reason, 'reason', { required: true, min: 3, max: 1000 });
    if (capital + profit !== movement.amount) invalid('capital_amount', 'Capital y ganancia deben sumar exactamente el retorno original.');
    const own = movementsOf(movement.investment_id).filter((row) => row.partner_id === movement.partner_id);
    const contributed = own.filter((row) => row.type === 'aporte' && row.status === 'confirmado').reduce((total, row) => total + row.amount, 0);
    const alreadyCapital = own.filter((row) => row.id !== movement.id && row.status !== 'anulado').reduce((total, row) => total + returnParts(row).capital, 0);
    if (capital + alreadyCapital > contributed) invalid('capital_amount', 'La devolución de capital excede el capital confirmado restante.');
    const kind = capital && profit ? 'mixed' : capital ? 'capital' : 'profit';
    transaction(db, () => {
      db.prepare('UPDATE movements SET return_kind=?,return_capital_amount=?,return_profit_amount=? WHERE id=?').run(kind, capital, profit, movement.id);
      addMessage(movement.id, user.id, 'mensaje', `Clasificación del retorno: capital ${formatMoney(capital, movement.currency)}; ganancia ${formatMoney(profit, movement.currency)}. ${reason}`);
      ctx.log(user.id, 'movement', movement.id, 'return_classified', `Retorno #${movement.id}: ${movement.return_kind} → ${kind}; capital ${capital}; ganancia ${profit}. ${reason}`, { sensitive: true });
    });
    return { movement: getMovement(movement.id) };
  });

  route('POST', '/api/movements/:id/annul', 'invest', ({ user, body, params }) => {
    const m = getMovement(params.id);
    if (!canAnnul(m, user)) fail(403, 'cannot_annul');
    const reason = text(body.message, 'message', { max: 1000, min: 3, required: true });
    const investment = getInvestment(m.investment_id);
    const closed = db.prepare(`SELECT 1 FROM finance_policies p WHERE p.investment_id=? AND p.closed_at IS NOT NULL
      AND p.year=COALESCE((SELECT r.year FROM finance_distribution_items d JOIN finance_distributions r ON r.id=d.distribution_id WHERE d.movement_id=?),?)`)
      .get(m.investment_id, m.id, Number(m.date.slice(0, 4)));
    if (closed) fail(409, 'closed_period');
    transaction(db, () => {
      db.prepare("UPDATE movements SET status = 'anulado', resolved_by = ?, resolved_at = ? WHERE id = ?").run(user.id, ctx.nowIso(), m.id);
      addMessage(m.id, user.id, 'anulacion', reason);
      settleRequests(m.id);
    });
    ctx.log(user.id, 'movement', m.id, 'annulled', `${user.name} anuló ${m.type === 'aporte' ? 'un aporte' : 'un retorno'} de ${formatMoney(m.amount, m.currency)} en ${investment.name}${m.status === 'confirmado' ? ' (estaba confirmado)' : ''}`, { sensitive: true });
    ctx.notify([m.created_by, m.partner_id, ...(m.status === 'confirmado' ? ctx.investorIds() : [])], user.id, {
      kind: 'movement', title: `Movimiento anulado: ${formatMoney(m.amount, m.currency)}`, body: `${investment.name} · ${reason.slice(0, 140)}`, link: `/inversiones/${investment.id}?mov=${m.id}`,
    });
    return { movement: getMovement(m.id) };
  });

  route('POST', '/api/movements/:id/messages', 'invest', ({ user, body, params }) => {
    const m = getMovement(params.id);
    const bodyText = text(body.body, 'body', { max: 1000, min: 1, required: true });
    addMessage(m.id, user.id, 'mensaje', bodyText);
    const investment = getInvestment(m.investment_id);
    const participants = db.prepare('SELECT DISTINCT user_id FROM movement_messages WHERE movement_id = ?').all(m.id).map((r) => r.user_id);
    ctx.notify([m.created_by, m.partner_id, ...participants], user.id, { kind: 'message', title: `Mensaje sobre ${formatMoney(m.amount, m.currency)} · ${investment.name}`, body: `${user.name}: ${bodyText.slice(0, 140)}`, link: `/inversiones/${investment.id}?mov=${m.id}` });
    return { ok: true };
  });

  // ── Exportación para Excel (separador ; y BOM UTF-8) ──────────────────────
  route('GET', '/api/investments/export.csv', 'invest', ({ user, res, query }) => {
    const investmentId = id(query.get('investment_id'), 'investment_id');
    const rows = db.prepare(`SELECT m.*, i.name investment_name, p.name partner_name, c.name created_by_name, r.name resolved_by_name
      FROM movements m JOIN investments i ON i.id = m.investment_id JOIN users p ON p.id = m.partner_id JOIN users c ON c.id = m.created_by
      LEFT JOIN users r ON r.id = m.resolved_by ${investmentId ? 'WHERE m.investment_id = ?' : ''} ORDER BY m.date, m.id`).all(...(investmentId ? [investmentId] : []));
    const dec = (minor) => (minor == null ? '' : (minor / 100).toFixed(2).replace('.', ','));
    const cell = (v) => {
      let s = v == null ? '' : String(v);
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // evita inyección de fórmulas en Excel
      return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = ['Fecha', 'Inversión', 'Tipo', 'Socio', 'Monto', 'Moneda', 'Tipo de cambio', 'Equivalente CRC', 'Estado', 'Referencia', 'Mensaje', 'Registrado por', 'Resuelto por', 'Fecha resolución', 'Clasificación retorno', 'Capital devuelto', 'Ganancia devuelta'];
    const lines = rows.map((m) => [
      m.date, m.investment_name, MOVEMENT_TYPE_LABEL[m.type], m.partner_name, dec(m.amount), m.currency, m.fx_rate ? String(m.fx_rate).replace('.', ',') : '',
      dec(crcOf(m)), MOVEMENT_STATUS_META[m.status]?.label ?? m.status, m.reference, m.message, m.created_by_name, m.resolved_by_name, m.resolved_at?.slice(0, 10),
      m.type === 'retorno' ? m.return_kind : '', m.type === 'retorno' ? dec(returnParts(m).capital) : '', m.type === 'retorno' ? dec(returnParts(m).profit) : '',
    ].map(cell).join(';'));
    ctx.log(user.id, 'investment', investmentId, 'exported', `${user.name} exportó ${rows.length} movimientos a Excel`, { sensitive: true });
    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="inversiones-${investmentId ?? 'portafolio'}-${ctx.today()}.csv"`,
      'Cache-Control': 'no-store',
    });
    res.end(`\uFEFF${[header.join(';'), ...lines].join('\r\n')}\r\n`);
  });
}
