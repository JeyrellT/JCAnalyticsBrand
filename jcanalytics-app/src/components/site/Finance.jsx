import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, ChartNoAxesCombined, CircleDollarSign, SlidersHorizontal } from 'lucide-react';
import { Label, MaskLines, Reveal } from './primitives';
import ContactCTA from './ContactCTA';
import '../../styles/intelligence.css';

const _MOTION = motion;
const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
const VIEWS = [
  { id: 'caja', label: 'Flujo de caja', title: 'Tus números, en perspectiva.', series: ['Ingresos', 'Egresos'], unit: 'Miles de USD', values: [[24, 29, 27, 38, 35, 46], [19, 22, 23, 26, 27, 30]], insight: 'Compará entradas y salidas para planificar la liquidez de tu negocio.' },
  { id: 'margen', label: 'Rentabilidad', title: 'Entendé dónde está el margen.', series: ['Ventas', 'Costos'], unit: 'Miles de USD', values: [[30, 33, 37, 35, 44, 48], [21, 25, 26, 24, 29, 31]], insight: 'Relacioná ventas y costos para identificar qué impulsa tu rentabilidad.' },
  { id: 'operacion', label: 'Operación', title: 'Del movimiento al resultado.', series: ['Pedidos', 'Entregados'], unit: 'Pedidos', values: [[26, 30, 36, 32, 45, 48], [23, 28, 30, 31, 40, 44]], insight: 'Conectá tus indicadores de operación con las decisiones del día a día.' },
];

const Finance = () => {
  const [selected, setSelected] = useState(0);
  const [month, setMonth] = useState(5);
  const reduce = useReducedMotion();
  const view = VIEWS[selected];
  const first = view.values[0][month];
  const second = view.values[1][month];
  const format = (value) => selected === 2 ? String(value) : `$${value}.000`;
  const metrics = [
    { label: view.series[0], value: format(first) },
    { label: view.series[1], value: format(second) },
    { label: selected === 2 ? 'Pendientes' : selected === 1 ? 'Margen bruto' : 'Flujo neto', value: selected === 1 ? `${Math.round((first - second) / first * 100)} %` : format(first - second) },
  ];
  return (
    <section id="finanzas" className="finance-section" aria-labelledby="finance-title">
      <div className="intelligence-container">
        <div className="finance-heading">
          <div><Label className="text-blue">02 / Finanzas & dashboards</Label><h2 id="finance-title"><MaskLines lines={['El poder de', <em key="claridad">verlo claro.</em>]} /></h2></div>
          <Reveal className="finance-intro"><p>La parte financiera también se diseña. Construimos herramientas para entender tu flujo de caja, analizar costos y convertir datos dispersos en decisiones.</p><div className="intelligence-tags"><span>Modelos financieros</span><span>Power BI</span><span>Dashboards a medida</span></div></Reveal>
        </div>
        <Reveal className="finance-workspace">
          <aside className="finance-sidebar"><div className="finance-sidebar__brand"><ChartNoAxesCombined size={20} /><span>Una vista.<br /><strong>Todo el contexto.</strong></span></div><span className="finance-sidebar__label">EXPLORÁ EL EJEMPLO</span><div role="group" aria-label="Vista del dashboard">{VIEWS.map((item, index) => <button key={item.id} type="button" aria-pressed={selected === index} onClick={() => setSelected(index)}><span>0{index + 1}</span>{item.label}<ArrowUpRight size={14} aria-hidden="true" /></button>)}</div><p>Un dashboard empieza con una buena pregunta.</p><span className="finance-example-label">DEMO / DATOS ILUSTRATIVOS</span></aside>
          <div className="finance-dashboard">
            <div className="finance-dashboard__heading"><div><span className="finance-kicker">VISTA GENERAL / {MONTHS[month].toUpperCase()}</span><h3>{view.title}</h3></div><SlidersHorizontal size={18} aria-hidden="true" /></div>
            <div className="finance-metrics" aria-live="polite" aria-atomic="true">{metrics.map((metric) => <div key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong></div>)}</div>
            <div className="finance-chart__legend"><span><i />{view.series[0]}</span><span><i />{view.series[1]}</span><small>{view.unit}</small></div>
            <svg className="finance-chart" viewBox="0 0 600 195" role="img" aria-label={`${view.label}: ${MONTHS.map((label, index) => `${label}, ${view.series[0]} ${view.values[0][index]}, ${view.series[1]} ${view.values[1][index]}`).join('; ')}. Valores en ${view.unit}.`}>
              {[0, 10, 20, 30, 40, 50].map((value) => <g key={value}><line x1="32" x2="583" y1={170 - value * 3} y2={170 - value * 3} stroke="#e5ecf4" strokeDasharray="3 5" /><text x="0" y={174 - value * 3} fill="#6a7b90" fontSize="9">{value}</text></g>)}
              <line x1={40 + month * 107} x2={40 + month * 107} y1="16" y2="170" stroke="#0065df" opacity=".2" />
              {view.values.map((values, series) => <g key={`${view.id}-${series}`}><motion.path d={values.map((value, index) => `${index ? 'L' : 'M'}${40 + index * 107},${170 - value * 3}`).join(' ')} fill="none" stroke={series ? '#079eaa' : '#0065df'} strokeWidth={series ? 2 : 3} strokeDasharray={series ? '5 5' : undefined} initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.7 }} />{values.map((value, index) => <circle key={index} cx={40 + index * 107} cy={170 - value * 3} r={month === index ? 5 : 3} fill={series ? '#079eaa' : '#0065df'} stroke="white" strokeWidth="2" />)}</g>)}
            </svg>
            <div className="finance-months" role="group" aria-label="Mes del dashboard">{MONTHS.map((label, index) => <button key={label} type="button" aria-pressed={month === index} onClick={() => setMonth(index)}>{label}</button>)}</div>
            <div className="finance-insight"><CircleDollarSign size={18} aria-hidden="true" /><p>{view.insight}</p></div>
          </div>
        </Reveal>
        <Reveal className="intelligence-section-foot"><p>Presupuestos, conciliaciones e indicadores conectados a la realidad de tu negocio.</p><ContactCTA need="Dashboard" source={`Finanzas & dashboards · ${view.label}`} variant="ink">Exploremos mi dashboard</ContactCTA></Reveal>
      </div>
    </section>
  );
};
export default Finance;
