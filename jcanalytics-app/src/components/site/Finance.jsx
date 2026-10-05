import { t, locale } from '../../i18n/locale';
import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, ChartNoAxesCombined, CircleDollarSign, SlidersHorizontal } from 'lucide-react';
import { Label, MaskLines, Reveal } from './primitives';
import ContactCTA from './ContactCTA';
import '../../styles/intelligence.css';

const _MOTION = motion;
const MONTHS = [t("Ene", "Jan"), 'Feb', 'Mar', t("Abr", "Apr"), 'May', 'Jun'];
const VIEWS = [
  { id: 'caja', label: t("Flujo de caja", "Cash flow"), title: t("Tus números, en perspectiva.", "Your numbers, in perspective."), series: [t("Ingresos", "Income"), t("Egresos", "Expenses")], unit: t("Miles de USD", "Thousands of USD"), values: [[24, 29, 27, 38, 35, 46], [19, 22, 23, 26, 27, 30]], insight: t("Compará entradas y salidas para planificar la liquidez de tu negocio.", "Compare money in and money out to plan your business liquidity.") },
  { id: 'margen', label: t("Rentabilidad", "Profitability"), title: t("Entendé dónde está el margen.", "Understand where your margin comes from."), series: [t("Ventas", "Sales"), t("Costos", "Costs")], unit: t("Miles de USD", "Thousands of USD"), values: [[30, 33, 37, 35, 44, 48], [21, 25, 26, 24, 29, 31]], insight: t("Relacioná ventas y costos para identificar qué impulsa tu rentabilidad.", "Connect sales and costs to understand what drives your profitability.") },
  { id: 'operacion', label: t("Operación", "Operations"), title: t("Del movimiento al resultado.", "From activity to outcomes."), series: [t("Pedidos", "Orders"), t("Entregados", "Delivered")], unit: t("Pedidos", "Orders"), values: [[26, 30, 36, 32, 45, 48], [23, 28, 30, 31, 40, 44]], insight: t("Conectá tus indicadores de operación con las decisiones del día a día.", "Connect operational metrics with everyday decisions.") },
];

const Finance = () => {
  const [selected, setSelected] = useState(0);
  const [month, setMonth] = useState(5);
  const reduce = useReducedMotion();
  const view = VIEWS[selected];
  const first = view.values[0][month];
  const second = view.values[1][month];
  const format = (value) => selected === 2 ? String(value) : '$' + (value * 1000).toLocaleString(locale === 'es' ? 'es-CR' : 'en-US');
  const metrics = [
    { label: view.series[0], value: format(first) },
    { label: view.series[1], value: format(second) },
    { label: selected === 2 ? t("Pendientes", "Pending") : selected === 1 ? t("Margen bruto", "Gross margin") : t("Flujo neto", "Net cash flow"), value: selected === 1 ? `${Math.round((first - second) / first * 100)} %` : format(first - second) },
  ];
  return (
    <section id="finanzas" className="finance-section" aria-labelledby="finance-title">
      <div className="intelligence-container">
        <div className="finance-heading">
          <div><Label className="text-blue">{t("02 / Finanzas & dashboards", "02 / Finance & dashboards")}</Label><h2 id="finance-title"><MaskLines lines={[t("El poder de", "The power of"), <em key="claridad">{t("verlo claro.", "seeing clearly.")}</em>]} /></h2></div>
          <Reveal className="finance-intro"><p>{t("La parte financiera también se diseña. Construimos herramientas para entender tu flujo de caja, analizar costos y convertir datos dispersos en decisiones.", "Financial clarity takes design, too. We build tools to understand cash flow, analyze costs and turn scattered data into decisions.")}</p><div className="intelligence-tags"><span>{t("Modelos financieros", "Financial models")}</span><span>Power BI</span><span>{t("Dashboards a medida", "Custom dashboards")}</span></div></Reveal>
        </div>
        <Reveal className="finance-workspace">
          <aside className="finance-sidebar"><div className="finance-sidebar__brand"><ChartNoAxesCombined size={20} /><span>{t("Una vista.", "One view.")}<br /><strong>{t("Todo el contexto.", "All the context.")}</strong></span></div><span className="finance-sidebar__label">{t("EXPLORÁ EL EJEMPLO", "EXPLORE THE EXAMPLE")}</span><div role="group" aria-label={t("Vista del dashboard", "Dashboard view")}>{VIEWS.map((item, index) => <button key={item.id} type="button" aria-pressed={selected === index} onClick={() => setSelected(index)}><span>0{index + 1}</span>{item.label}<ArrowUpRight size={14} aria-hidden="true" /></button>)}</div><p>{t("Un dashboard empieza con una buena pregunta.", "A dashboard starts with a good question.")}</p><span className="finance-example-label">{t("DEMO / DATOS ILUSTRATIVOS", "DEMO / ILLUSTRATIVE DATA")}</span></aside>
          <div className="finance-dashboard">
            <div className="finance-dashboard__heading"><div><span className="finance-kicker">{t("EJEMPLO ILUSTRATIVO /", "ILLUSTRATIVE EXAMPLE /")} {MONTHS[month].toUpperCase()}</span><h3>{view.title}</h3></div><SlidersHorizontal size={18} aria-hidden="true" /></div>
            <div className="finance-metrics" aria-live="polite" aria-atomic="true">{metrics.map((metric) => <div key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong></div>)}</div>
            <div className="finance-chart__legend"><span><i />{view.series[0]}</span><span><i />{view.series[1]}</span><small>{view.unit}</small></div>
            <svg className="finance-chart" viewBox="0 0 600 195" role="img" aria-label={`${t("Ejemplo ilustrativo con datos ficticios", "Illustrative example with fictional data")}. ${view.label}: ${MONTHS.map((label, index) => `${label}, ${view.series[0]} ${view.values[0][index]}, ${view.series[1]} ${view.values[1][index]}`).join('; ')}. ${t("Valores en", "Values in")} ${view.unit}.`}>
              {[0, 10, 20, 30, 40, 50].map((value) => <g key={value}><line x1="32" x2="583" y1={170 - value * 3} y2={170 - value * 3} stroke="#e5ecf4" strokeDasharray="3 5" /><text x="0" y={174 - value * 3} fill="#6a7b90" fontSize="9">{value}</text></g>)}
              <line x1={40 + month * 107} x2={40 + month * 107} y1="16" y2="170" stroke="#0065df" opacity=".2" />
              {view.values.map((values, series) => <g key={`${view.id}-${series}`}><motion.path d={values.map((value, index) => `${index ? 'L' : 'M'}${40 + index * 107},${170 - value * 3}`).join(' ')} fill="none" stroke={series ? '#079eaa' : '#0065df'} strokeWidth={series ? 2 : 3} strokeDasharray={series ? '5 5' : undefined} initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.7 }} />{values.map((value, index) => <circle key={index} cx={40 + index * 107} cy={170 - value * 3} r={month === index ? 5 : 3} fill={series ? '#079eaa' : '#0065df'} stroke="white" strokeWidth="2" />)}</g>)}
            </svg>
            <div className="finance-months" role="group" aria-label={t("Mes del dashboard", "Dashboard month")}>{MONTHS.map((label, index) => <button key={label} type="button" aria-pressed={month === index} onClick={() => setMonth(index)}>{label}</button>)}</div>
            <div className="finance-insight"><CircleDollarSign size={18} aria-hidden="true" /><p>{view.insight}</p></div>
          </div>
        </Reveal>
        <Reveal className="intelligence-section-foot"><p>{t("Presupuestos, conciliaciones e indicadores conectados a la realidad de tu negocio.", "Budgets, reconciliations and metrics connected to your business reality.")}</p><ContactCTA need="Dashboard" source={`${t("Finanzas & dashboards", "Finance & dashboards")} · ${view.label}`} variant="ink">{t("Exploremos mi dashboard", "Let's explore my dashboard")}</ContactCTA></Reveal>
      </div>
    </section>
  );
};
export default Finance;
