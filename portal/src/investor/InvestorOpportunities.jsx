import { ArrowUpRight, Compass, KeyRound, Layers } from 'lucide-react';
import { Link } from '../lib/router.jsx';
import { formatMoney } from '../lib/format.js';
import { InvestmentStatusBadge, plural } from './components.jsx';
import '../styles/investor-opportunities.css';

/** Invitations are separate from the portfolio: access alone never creates capital. */
export default function InvestorOpportunities({ investments }) {
  return <section className="io-catalog" aria-labelledby="available-title">
    <div className="ih-section-head">
      <div><span className="ih-section-number"><KeyRound size={12} aria-hidden="true" /> TU ACCESO PERSONAL</span><h2 id="available-title">Disponibles para vos</h2><p>Ideas habilitadas por administración que todavía no tienen movimientos a tu nombre.</p></div>
      <span className="ih-section-tag"><Layers size={14} aria-hidden="true" />{plural(investments.length, 'idea', 'ideas')}</span>
    </div>
    {investments.length ? <ul className="io-grid">{investments.map((investment, index) => <li key={investment.id} className={`io-card io-tone-${index % 3}`} data-available-investment-id={investment.id}>
      <div className="io-card-top"><span className="io-symbol" aria-hidden="true"><Compass size={28} strokeWidth={1.2} /></span><span>{investment.currency === 'USD' ? 'USD · Dólares' : 'CRC · Colones'}</span></div>
      <span className="io-category">{investment.category_label}</span>
      <h3>{investment.name}</h3>
      <div className="io-badges"><InvestmentStatusBadge status={investment.status} label={investment.status_label} /><span>{investment.can_contribute ? 'Aportes habilitados' : 'Solo consulta'}</span></div>
      <p className="io-description">{investment.description || 'Conocé los detalles del proyecto y su información antes de participar.'}</p>
      <p className="io-target">{investment.target_amount ? <>Meta del proyecto <strong>{formatMoney(investment.target_amount, investment.currency)}</strong></> : 'Todavía sin una meta de capital definida.'}</p>
      <Link to={`/inversionista/inversiones/${investment.id}`} className="io-link" aria-label={`Ver inversión ${investment.name}`}>Conocer la idea<ArrowUpRight size={18} aria-hidden="true" /></Link>
    </li>)}</ul> : <div className="io-empty"><span><KeyRound size={23} strokeWidth={1.3} aria-hidden="true" /></span><div><h3>No hay nuevas ideas habilitadas por ahora.</h3><p>Cuando administración te dé acceso a otra inversión, aparecerá aquí. Las que ya tienen movimientos siguen en tu mapa.</p></div></div>}
    <p className="io-footnote">Tener acceso no registra ningún aporte ni cambia tu capital.</p>
  </section>;
}
