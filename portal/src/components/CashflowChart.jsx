// Capital acumulado aportado vs. retornado. Una sola escala (dos series de la misma
// magnitud), leyenda + etiqueta directa al final de cada línea y tooltip con cruz.
// Los colores salen de los tokens del tema (var(--brand) / var(--teal)): la pareja
// azul/turquesa pasa la prueba de daltonismo y el contraste del turquesa se compensa
// con las etiquetas visibles y el libro de movimientos.
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, LabelList } from 'recharts';
import { formatMoney, formatDate } from '../lib/format.js';

const SERIES = [
  { key: 'contributed', label: 'Aportado', color: 'var(--brand)' },
  { key: 'returned', label: 'Retornado', color: 'var(--teal)' },
];

function ChartTooltip({ active, payload, label, currency }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="min-w-[180px] rounded-xl border border-line bg-surface px-3 py-2.5 text-xs text-ink shadow-pop">
      <p className="mb-1.5 font-semibold text-ink">{formatDate(label)}</p>
      {SERIES.map((s) => (
        <p key={s.key} className="flex items-center justify-between gap-4 py-0.5 text-muted">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: s.color }} />{s.label}</span>
          <span className="num font-semibold text-ink">{formatMoney(row[s.key], currency)}</span>
        </p>
      ))}
      <p className="mt-1.5 flex justify-between gap-4 border-t border-line pt-1.5 text-muted">Neto <span className={`num font-semibold ${row.net >= 0 ? 'text-teal-ink' : 'text-ink'}`}>{formatMoney(row.net, currency)}</span></p>
    </div>
  );
}

export default function CashflowChart({ series, currency = 'CRC', height = 240 }) {
  if (!series?.length) return <p className="py-10 text-center text-sm text-muted">El gráfico aparece con el primer movimiento confirmado.</p>;
  // Con un solo punto se agrega el origen para que se vea la línea.
  const data = series.length === 1 ? [{ date: series[0].date, contributed: 0, returned: 0, net: 0 }, ...series] : series;
  const last = data.length - 1;
  // Etiqueta al final de cada línea, con halo del color de la superficie para que se lea
  // sobre la grilla y las áreas, en claro y en oscuro.
  const endLabel = (s) => (props) => {
    if (props.index !== last) return null;
    return (
      <text x={props.x - 6} y={props.y - 8} textAnchor="end" fill="var(--ink)" stroke="var(--surface)" strokeWidth={3} strokeLinejoin="round" paintOrder="stroke"
        className="text-[11px] font-semibold">
        {`${s.label}: ${formatMoney(props.value, currency, { compact: true })}`}
      </text>
    );
  };
  return (
    <figure>
      <figcaption className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {SERIES.map((s) => <span key={s.key} className="flex items-center gap-1.5"><span className="h-[3px] w-4 rounded-full" style={{ background: s.color }} />{s.label} acumulado</span>)}
      </figcaption>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 22, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--line)" strokeDasharray="0" vertical={false} />
            <XAxis dataKey="date" tickFormatter={(d) => formatDate(d)} tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} minTickGap={24} />
            <YAxis tickFormatter={(v) => formatMoney(v, currency, { compact: true })} tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} width={72} />
            <Tooltip content={<ChartTooltip currency={currency} />} cursor={{ stroke: 'var(--ink)', strokeOpacity: 0.25, strokeWidth: 1 }} />
            {SERIES.map((s) => (
              <Area key={s.key} type="stepAfter" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2} fill={s.color} fillOpacity={0.1}
                activeDot={{ r: 5, stroke: 'var(--surface)', strokeWidth: 2 }} dot={false} isAnimationActive={false}>
                <LabelList dataKey={s.key} content={endLabel(s)} />
              </Area>
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
