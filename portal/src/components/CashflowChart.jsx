// Capital acumulado aportado vs. retornado. Una sola escala (dos series de la misma
// magnitud), leyenda + etiqueta directa al final de cada línea y tooltip con cruz.
// Paleta validada (dataviz/validate_palette): #0065df / #00a6b2 pasan CVD; el contraste
// del turquesa se compensa con etiquetas visibles y la tabla del libro de movimientos.
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, LabelList } from 'recharts';
import { formatMoney, formatDate } from '../lib/format.js';

const SERIES = [
  { key: 'contributed', label: 'Aportado', color: '#0065df' },
  { key: 'returned', label: 'Retornado', color: '#00a6b2' },
];

function ChartTooltip({ active, payload, label, currency }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-xl border border-line bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-ink">{formatDate(label)}</p>
      {SERIES.map((s) => (
        <p key={s.key} className="flex items-center justify-between gap-4 text-muted">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: s.color }} />{s.label}</span>
          <span className="font-semibold tabular text-ink">{formatMoney(row[s.key], currency)}</span>
        </p>
      ))}
      <p className="mt-1 flex justify-between gap-4 border-t border-line pt-1 text-muted">Neto <span className="font-semibold tabular text-ink">{formatMoney(row.net, currency)}</span></p>
    </div>
  );
}

export default function CashflowChart({ series, currency = 'CRC', height = 240 }) {
  if (!series?.length) return <p className="py-10 text-center text-sm text-muted">El gráfico aparece con el primer movimiento confirmado.</p>;
  // Con un solo punto se agrega el origen para que se vea la línea.
  const data = series.length === 1 ? [{ date: series[0].date, contributed: 0, returned: 0, net: 0 }, ...series] : series;
  const last = data.length - 1;
  const endLabel = (s) => (props) => {
    if (props.index !== last) return null;
    return <text x={props.x - 6} y={props.y - 8} textAnchor="end" className="fill-ink text-[11px] font-semibold">{`${s.label}: ${formatMoney(props.value, currency, { compact: true })}`}</text>;
  };
  return (
    <figure>
      <figcaption className="mb-2 flex flex-wrap gap-4 text-xs text-muted">
        {SERIES.map((s) => <span key={s.key} className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded" style={{ background: s.color }} />{s.label} acumulado</span>)}
      </figcaption>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 22, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="0" vertical={false} />
            <XAxis dataKey="date" tickFormatter={(d) => formatDate(d)} tick={{ fontSize: 11, fill: '#5b6b82' }} axisLine={false} tickLine={false} minTickGap={24} />
            <YAxis tickFormatter={(v) => formatMoney(v, currency, { compact: true })} tick={{ fontSize: 11, fill: '#5b6b82' }} axisLine={false} tickLine={false} width={72} />
            <Tooltip content={<ChartTooltip currency={currency} />} cursor={{ stroke: '#071a36', strokeOpacity: 0.25, strokeWidth: 1 }} />
            {SERIES.map((s) => (
              <Area key={s.key} type="stepAfter" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2} fill={s.color} fillOpacity={0.08}
                activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} dot={false} isAnimationActive={false}>
                <LabelList dataKey={s.key} content={endLabel(s)} />
              </Area>
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
