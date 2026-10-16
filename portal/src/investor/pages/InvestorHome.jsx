// A private space to explore the investor's own confirmed position and movements.
import { useId, useRef, useState } from 'react';
import {
  ArrowDown, ArrowRight, ArrowUpRight, ChartLine, Check, ChevronLeft, ChevronRight,
  Compass, Download, HandCoins, History, Hourglass, Layers, ReceiptText, ShieldCheck, Sparkles,
} from 'lucide-react';
import { useSession, useResource } from '../../lib/session.jsx';
import { Link } from '../../lib/router.jsx';
import { PageLoader, EmptyState, Badge, cx } from '../../components/ui.jsx';
import CashflowChart from '../../components/CashflowChart.jsx';
import { formatMoney, formatPercent, formatMultiple, formatDayLong, formatDate, todayKey } from '../../lib/format.js';
import {
  MovementItem, MovementRow, ContactCard, TrustNote, InvestmentStatusBadge,
  greeting, firstName, plural, chartSeries, netReading, movementLabel,
} from '../components.jsx';
import InvestorPlaybook from '../InvestorPlaybook.jsx';
import InvestorOpportunities from '../InvestorOpportunities.jsx';
import { ReturnBreakdown } from '../InvestorReturns.jsx';
import '../../styles/investor-home.css';

const WORLD_POSITIONS = {
  1: [[50, 45]],
  2: [[29, 40], [71, 61]],
  3: [[25, 33], [73, 37], [48, 74]],
  4: [[26, 29], [74, 35], [28, 73], [73, 77]],
  5: [[24, 25], [73, 27], [47, 50], [24, 79], [74, 78]],
};
const PAGE_SIZE = 5;

function jumpTo(id) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.querySelector('.investor-club[data-motion="paused"]');
  document.getElementById(id)?.scrollIntoView({ behavior: reduceMotion ? 'instant' : 'smooth', block: 'start' });
}

function ClubSculpture() {
  return <svg className="ih-hero-sculpture" viewBox="0 0 340 340" fill="none" aria-hidden="true">
    <g transform="translate(170 170) rotate(-22)">
      {Array.from({ length: 21 }, (_, index) => <ellipse key={index} rx={39 + index * 3.4} ry={112 - index * 1.9} transform={`rotate(${index * 8.6})`} stroke="currentColor" strokeWidth=".9" opacity={.25 + index * .027} />)}
      <circle r="25" fill="currentColor" fillOpacity=".12" stroke="currentColor" strokeOpacity=".6" />
      <path d="M-8 0H8M0-8V8" stroke="currentColor" strokeWidth="1.1" />
    </g>
    <circle cx="170" cy="170" r="148" stroke="currentColor" strokeOpacity=".12" strokeDasharray="2 9" />
  </svg>;
}

function WorldSymbol({ index }) {
  return <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
    {index % 3 === 0 ? <g transform="translate(32 32)">
      {[0, 30, 60, 90, 120, 150].map((angle) => <ellipse key={angle} rx="12" ry="24" transform={`rotate(${angle})`} stroke="currentColor" strokeWidth="1.1" />)}
      <circle r="4" fill="currentColor" />
    </g> : index % 3 === 1 ? <g transform="translate(32 32) rotate(-30)">
      {[0, 1, 2, 3, 4].map((step) => <rect key={step} x={-20 + step * 3} y={-22 + step * 4} width="30" height="30" rx="7" stroke="currentColor" strokeWidth="1.2" opacity={.35 + step * .15} />)}
    </g> : <g transform="translate(32 32) rotate(-20)">
      {[0, 1, 2, 3, 4].map((step) => <ellipse key={step} rx={24 - step * 3} ry={9 + step * 3} stroke="currentColor" strokeWidth="1.2" />)}
      <circle r="4" fill="currentColor" />
    </g>}
  </svg>;
}

function InvestmentMap({ investments }) {
  const [selectedId, setSelectedId] = useState(null);
  const [page, setPage] = useState(0);
  const nodeRefs = useRef([]);
  const uid = useId();
  const pageCount = Math.max(1, Math.ceil(investments.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = investments.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const selected = investments.find((position) => position.id === selectedId) ?? visible[0];
  const coordinates = WORLD_POSITIONS[visible.length] ?? [];
  const selectPage = (next) => {
    setPage(next);
    setSelectedId(investments[next * PAGE_SIZE]?.id ?? null);
  };
  function navigateWorlds(event, index) {
    const change = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (change == null && !['Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? visible.length - 1 : (index + change + visible.length) % visible.length;
    setSelectedId(visible[next].id);
    nodeRefs.current[next]?.focus({ preventScroll: true });
  }

  return <section className="ih-investments" aria-labelledby="investments-title">
    <div className="ih-section-head"><div><span className="ih-section-number">01 / EXPLORAR</span><h2 id="investments-title">Tus inversiones</h2><p>Cada idea tiene su propio mundo. Elegí uno y mirá tu parte.</p></div><span className="ih-section-tag"><Layers size={14} />{plural(investments.length, 'inversión', 'inversiones')}</span></div>
    {!investments.length ? <EmptyState icon={Compass} title="Tu mapa todavía está por dibujarse">Cuando haya movimientos a tu nombre, sus inversiones van a aparecer acá. Por ahora podés conocer tu espacio.</EmptyState> : <>
      <div className="ih-explorer">
        <div className="ih-map-panel">
          <div className="ih-map-top"><span><Compass size={14} />TU MAPA DE IDEAS</span><span>Elegí un mundo<ArrowDown size={12} /></span></div>
          <div className="ih-map" role="group" aria-label="Mapa de tus inversiones">
            <svg className="ih-map-lines" viewBox="0 0 100 100" preserveAspectRatio="none" fill="none" aria-hidden="true">
              <ellipse cx="50" cy="50" rx="43" ry="36" stroke="currentColor" strokeWidth=".15" strokeDasharray=".5 1.8" />
              <ellipse cx="50" cy="50" rx="27" ry="23" stroke="currentColor" strokeWidth=".1" />
              <path d="M50 3V97M5 50H95" stroke="currentColor" strokeWidth=".1" strokeDasharray=".5 1.8" />
              {coordinates.slice(1).map(([x, y], index) => <path key={index} d={`M${coordinates[index][0]} ${coordinates[index][1]} Q50 50 ${x} ${y}`} stroke="currentColor" strokeWidth=".2" />)}
              {[[14, 19], [87, 68], [44, 13], [13, 85], [60, 88], [89, 13]].map(([x, y]) => <path key={`${x}-${y}`} d={`M${x - 1} ${y}h2M${x} ${y - 1}v2`} stroke="currentColor" strokeWidth=".25" />)}
            </svg>
            {visible.map((position, index) => <button key={position.id} type="button" ref={(node) => { nodeRefs.current[index] = node; }}
              className={cx('ih-world', `ih-world-tone-${index % 3}`, selected.id === position.id && 'ih-world-selected')}
              style={{ left: `${coordinates[index][0]}%`, top: `${coordinates[index][1]}%` }}
              aria-label={`Explorar ${position.name}`} aria-pressed={selected.id === position.id} aria-controls={`${uid}-position`}
              onClick={() => setSelectedId(position.id)} onKeyDown={(event) => navigateWorlds(event, index)}>
              <span className="ih-world-orb"><WorldSymbol index={index} />{selected.id === position.id && <span className="ih-world-check"><Check size={11} /></span>}</span>
              <span className="ih-world-name">{position.name}</span>
            </button>)}
          </div>
          <div className="ih-map-bottom">
            <span>Un mapa para explorar, a tu ritmo.</span>
            {pageCount > 1 && <div>
              <button type="button" disabled={currentPage === 0} onClick={() => selectPage(currentPage - 1)} aria-label="Ver inversiones anteriores"><ChevronLeft size={15} /></button>
              <span aria-live="polite">{currentPage + 1} / {pageCount}</span>
              <button type="button" disabled={currentPage === pageCount - 1} onClick={() => selectPage(currentPage + 1)} aria-label="Ver inversiones siguientes"><ChevronRight size={15} /></button>
            </div>}
          </div>
        </div>
        <div className="ih-position" id={`${uid}-position`} aria-live="polite" aria-atomic="true" data-investment-id={selected.id}>
          <div className="ih-position-kicker"><span>ACERCATE A ESTA IDEA</span><ArrowUpRight size={19} /></div>
          <span className="ih-position-category">{selected.category_label}</span>
          <h3>{selected.name}</h3>
          <div className="ih-position-badges"><InvestmentStatusBadge status={selected.status} label={selected.status_label} />{selected.mine.pending_count > 0 && <Badge tone="amber"><Hourglass size={12} />{selected.mine.pending_count} por confirmar</Badge>}</div>
          <p className="ih-position-currency">Tu posición · {selected.currency === 'USD' ? 'dólares (USD)' : 'colones (CRC)'} · solo lo confirmado</p>
          <dl className="ih-position-figures"><div><dt>Aportaste</dt><dd>{formatMoney(selected.mine.contributed, selected.currency)}</dd></div><div><dt>Recibiste</dt><dd>{formatMoney(selected.mine.returned, selected.currency)}</dd></div><div><dt>Neto</dt><dd>{formatMoney(selected.mine.net, selected.currency)}</dd></div></dl>
          <div className="ih-share"><div><span>Tu participación en el capital</span><strong>{formatPercent(selected.mine.share, 1)}</strong></div><div className="ih-share-track" role="progressbar" aria-label="Tu participación en esta inversión" aria-valuenow={Math.round(Math.max(0, Math.min(1, selected.mine.share)) * 100)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${Math.max(0, Math.min(1, selected.mine.share)) * 100}%` }} /></div><p>{formatMoney(selected.totals.contributed, selected.currency, { compact: true })} de capital total · {plural(selected.totals.holders, 'participante', 'participantes')}</p></div>
          <p className="ih-access-note"><ShieldCheck size={13} aria-hidden="true" />{selected.can_contribute ? 'Tenés acceso para registrar nuevos aportes.' : selected.access_granted ? 'Esta inversión ya no recibe aportes. Tu historial sigue disponible.' : 'Tu historial sigue disponible. Los nuevos aportes requieren acceso de administración.'}</p>
          <Link to={`/inversionista/inversiones/${selected.id}`} className="ih-position-link">Conocer esta inversión<ArrowUpRight size={17} /></Link>
        </div>
      </div>
      <p className="ih-map-note">Las formas y ubicaciones son ilustrativas. Los montos corresponden a tus movimientos confirmados.</p>
    </>}
  </section>;
}

function RecentJourney({ movements }) {
  const [selectedId, setSelectedId] = useState(null);
  const selected = movements.find((movement) => movement.id === selectedId) ?? movements[0];
  return <section className="ih-journey" aria-labelledby="recent-title">
    <div className="ih-section-head"><div><span className="ih-section-number">03 / TU HISTORIA</span><h2 id="recent-title">Movimientos recientes</h2><p>Cada registro cuenta algo. Volvé a cualquiera.</p></div><History size={20} /></div>
    {!selected ? <p className="ih-empty-note">Tu historia aparece con el primer movimiento registrado a tu nombre.</p> : <>
      <div className="ih-journey-timeline" role="group" aria-label="Explorar movimientos recientes">
        {movements.map((movement) => <button type="button" key={movement.id} aria-pressed={movement.id === selected.id} aria-label={`Ver movimiento ${movement.id}: ${movementLabel(movement)} del ${formatDate(movement.date)}`} onClick={() => setSelectedId(movement.id)}>
          <span className={cx('ih-journey-dot', movement.type === 'retorno' && 'ih-journey-return')}>{movement.type === 'aporte' ? <ArrowUpRight size={15} /> : <ArrowDown size={15} />}</span><span>{formatDate(movement.date)}</span><span>{movementLabel(movement)}</span>
        </button>)}
      </div>
      <div className="ih-journey-detail" aria-live="polite" aria-atomic="true" data-movement-id={selected.id}><MovementRow m={selected} /></div>
      <Link className="ih-text-link" to="/inversionista/movimientos">Abrir mi historial completo<ArrowRight size={15} /></Link>
    </>}
  </section>;
}

export default function InvestorHome() {
  const { refresh } = useSession();
  const { data, error, reload } = useResource('/api/investor/overview');
  if (!data) return <PageLoader error={error} onRetry={reload} />;
  const { me, portfolio: pf, investments, available_investments: availableInvestments = [], to_confirm: toConfirm, recent, series, contacts } = data;
  const changed = () => { reload(); refresh(); };
  const payback = pf.contributed_crc ? pf.returned_crc / pf.contributed_crc : 0;
  const net = netReading(pf.net_crc, pf.contributed_crc);
  const hasUsd = investments.some((investment) => investment.currency === 'USD');

  return <div className="investor-home">
    <header className="ih-welcome"><div><p className="ih-eyebrow"><span /> TU CLUB DE IDEAS</p><h1 id="home-title">{greeting()}, {firstName(me.name)}<span className="ih-greeting-dot">.</span></h1><p className="ih-welcome-date">{formatDayLong(todayKey())} <span>·</span> Este espacio es tuyo.</p></div><a href="/api/investor/statement.csv" download className="ih-download"><Download size={16} />Mi estado de cuenta</a></header>
    {error && <div className="ih-load-error" role="alert">No pudimos actualizar tu espacio. Mostramos la última información disponible.<button type="button" onClick={reload}>Reintentar</button></div>}
    <section className="ih-hero" aria-label="Tu espacio para explorar">
      <div className="ih-hero-copy"><span className="ih-hero-label">BIENVENIDO A TU RINCÓN</span><h2>Las buenas ideas<br />también se <em>comparten.</em></h2><p>Acá podés acercarte a tus inversiones, entender cada movimiento y seguir tu historia con JC Analytics. Sin prisa. A tu manera.</p><button type="button" className="ih-primary" onClick={() => jumpTo('investments-title')}>Explorar mis inversiones<Compass size={17} /></button><span className="ih-hero-foot"><ShieldCheck size={13} />Tu cuenta es privada. Tu curiosidad, bienvenida.</span></div>
      <div className="ih-capital-card"><ClubSculpture /><div className="ih-capital-top"><span><Sparkles size={13} />A TU NOMBRE</span><span>JC / CLUB</span></div><div className="ih-capital-value"><span>Tu capital aportado</span><strong data-portfolio-capital>{formatMoney(pf.contributed_crc, 'CRC')}</strong><span>Confirmado por las dos partes.</span></div><div className="ih-capital-recovery"><div><span>Recibido / aportado</span><strong>{pf.contributed_crc ? formatPercent(payback, 0) : 'Sin aportes confirmados'}</strong></div><div className="ih-recovery-track" role="progressbar" aria-label="Dinero recibido respecto a lo aportado" aria-valuenow={Math.round(Math.max(0, Math.min(1, payback)) * 100)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${Math.max(0, Math.min(1, payback)) * 100}%` }} /></div></div></div>
    </section>
    <dl className="ih-metrics">
      <div><dt>Retornos recibidos</dt><dd data-portfolio-returned>{formatMoney(pf.returned_crc, 'CRC')}</dd><span>{pf.returned_crc ? 'Lo que ya volvió a vos.' : 'Todavía sin retornos recibidos.'}</span></div>
      <div><dt>Neto</dt><dd data-portfolio-net>{formatMoney(pf.net_crc, 'CRC')}</dd><span>{net.hint}.</span></div>
      <div><dt>Múltiplo (MOIC)</dt><dd>{formatMultiple(pf.moic)}</dd><span>Retornado ÷ aportado.</span></div>
      <div><dt>TIR de flujos anual</dt><dd>{pf.irr == null ? '—' : formatPercent(pf.irr, 1)}</dd><span>{pf.irr == null ? 'Todavía no se puede calcular.' : 'No incluye el capital pendiente.'}</span></div>
    </dl>
    <ReturnBreakdown metrics={pf} portfolio />
    {hasUsd && <p className="ih-currency-note">Resumen en colones. Los dólares se convierten con el tipo de cambio guardado en cada movimiento.</p>}
    {toConfirm.length > 0 ? <section id="por-confirmar" className="ih-confirm" aria-labelledby="confirm-title"><div className="ih-confirm-head"><span className="ih-confirm-icon"><HandCoins size={20} /></span><div><h2 id="confirm-title">Por confirmar</h2><p>Estos movimientos están a tu nombre. Revisalos y contanos si todo coincide.</p></div><span className="ih-confirm-count">{toConfirm.length}</span></div><ul className="divide-y divide-line">{toConfirm.map((movement, index) => <li key={movement.id}><MovementItem m={movement} showInvestment defaultOpen={index < 2} onChanged={changed} investmentLink /></li>)}</ul></section> : <div className="ih-account-status"><span className="ih-status-icon">{pf.pending_count ? <Hourglass size={18} /> : <Check size={18} />}</span><p>{pf.pending_count ? `${plural(pf.pending_count, 'movimiento espera', 'movimientos esperan')} la verificación de JC Analytics.` : investments.length ? 'No tenés movimientos pendientes por confirmar.' : 'Cuando se registre tu primer movimiento, te avisamos para que lo revisés.'}</p><Link to="/inversionista/movimientos">Ver movimientos<ArrowRight size={14} /></Link></div>}

    {availableInvestments.length > 0 && <button className="ih-discover-link" type="button" onClick={() => jumpTo('available-title')}><Compass size={16} aria-hidden="true" />{plural(availableInvestments.length, 'nueva idea disponible', 'nuevas ideas disponibles')} para vos<ArrowDown size={15} aria-hidden="true" /></button>}
    <InvestorOpportunities investments={availableInvestments} />
    <InvestmentMap investments={investments} />
    <InvestorPlaybook portfolio={pf} userId={me.id} />

    <div className="ih-history-grid">
      <section className="ih-evolution" aria-labelledby="chart-title"><div className="ih-section-head"><div><span className="ih-section-number">02 / MIRAR EN PERSPECTIVA</span><h2 id="chart-title">Evolución de tu capital</h2><p>Lo aportado y lo retornado, a lo largo de tu historia.</p></div><ChartLine size={21} /></div><div className="ih-chart"><CashflowChart series={chartSeries(series)} currency="CRC" height={255} /></div><p className="ih-chart-note">Acumulado en colones · solo movimientos confirmados.</p></section>
      <RecentJourney movements={recent} />
    </div>
    <div className="ih-support-grid"><ContactCard contacts={contacts} className="ih-contact" /><section className="ih-statement" aria-labelledby="statement-title"><span className="ih-statement-icon"><ReceiptText size={25} strokeWidth={1.3} /></span><div><span className="ih-section-number">TU HISTORIA, A MANO</span><h2 id="statement-title">Estado de cuenta</h2><p>Todos tus movimientos en un archivo, cuando lo necesités.</p></div><a href="/api/investor/statement.csv" download className="ih-statement-download"><Download size={15} />Descargar (Excel)<ArrowUpRight size={15} /></a></section></div>
    <TrustNote className="ih-trust" />
    <footer className="ih-footer"><Sparkles size={14} /><span>Curioseá, preguntá, volvé cuando querás.</span><span>JC ANALYTICS / CLUB DE IDEAS</span></footer>
  </div>;
}
