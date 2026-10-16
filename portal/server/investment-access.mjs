// Permisos explícitos para nuevos aportes de inversionistas externos.
// Socios y administradores conservan su acceso completo; el historial no es un permiso.
import { fail } from './http.mjs';

export function createInvestmentAccess(db) {
  const hasGrant = (investmentId, investorId) => !!db.prepare(
    'SELECT 1 FROM investment_access WHERE investment_id = ? AND investor_id = ?',
  ).get(investmentId, investorId);

  const allowedInvestorIds = (investmentId) => db.prepare(`SELECT a.investor_id FROM investment_access a
    JOIN users u ON u.id = a.investor_id WHERE a.investment_id = ? AND u.role = 'inversionista'
    ORDER BY a.investor_id`).all(investmentId).map((row) => row.investor_id);

  function requireContributionAccess(investment, partner) {
    if (partner.role !== 'inversionista') return;
    if (!hasGrant(investment.id, partner.id)) fail(403, 'investment_not_allowed');
    if (investment.status === 'cerrada' || investment.status === 'perdida') fail(409, 'investment_closed');
  }

  return { hasGrant, allowedInvestorIds, requireContributionAccess };
}
