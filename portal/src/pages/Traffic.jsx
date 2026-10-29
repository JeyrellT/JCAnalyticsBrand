// Tráfico del sitio: medición propia de jcanalytic.com (sin cookies ni datos
// personales), pensada para decidir: qué hacer esta semana, qué páginas valen la
// pena, qué CTA convierte, cuándo entra la gente y cómo avanzan las consultas.
import { useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import {
  BarChart3, Users, Timer, MousePointerClick, Inbox, Eye, Filter, LayoutList, Globe2, Smartphone, FileText, ShieldCheck, Megaphone,
  Lightbulb, CalendarClock, Target, Languages, Download, X, ChevronRight, Loader2,
} from 'lucide-react';
import { useResource } from '../lib/session.jsx';
import { Link } from '../lib/router.jsx';
import { PageHeader, PageLoader, EmptyState, Stat, Tabs, SectionHead, Badge, IconTile, cx } from '../components/ui.jsx';
import { sectionName, formName, clickKind, deviceName, formatDuration, percent, pageName, PageVerdictBadge, csvCell } from '../components/leads.jsx';
import { ANALYTICS_PERIODS, LEAD_STATUS, PAGE_VERDICTS } from '../../shared/leads.js';
import { formatDate } from '../lib/format.js';

const SERIES = [
  { key: 'sessions', label: 'Visitas', color: 'var(--brand)' },
  { key: 'cta_sessions', label: 'Tocaron un CTA', color: 'var(--teal)' },
];
const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const WEEKDAYS_LONG = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const LANGUAGES = { es: 'Español', en: 'Inglés' };
const PIPELINE_ORDER = ['nuevo', 'contactado', 'en_conversacion', 'cotizado', 'ganado'];
const STRIPE = { red: 'bg-coral', amber: 'bg-amber', blue: 'bg-brand', teal: 'bg-teal' };
const INSIGHT_TONE = { red: 'red', amber: 'amber', blue: 'blue', teal: 'teal' };

/** Barra horizontal simple: proporción respecto del máximo, con su número. */
function Bar({ label, value, max, right, sub, tone = 'bg-brand' }) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <li className="py-2">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="min-w-0 truncate font-medium text-ink">{label}</span>
        <span className="num shrink-0 font-semibold">{right ?? value}</span>
      </div>
      <div className="track mt-1.5"><div className={cx('h-full rounded-full', tone)} style={{ width: `${pct}%` }} /></div>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </li>
  );
}

function DailyChart({ daily }) {
  return (
    <figure>
      <figcaption className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {SERIES.map((s) => <span key={s.key} className="flex items-center gap-1.5"><span className="h-[3px] w-4 rounded-full" style={{ background: s.color }} />{s.label}</span>)}
      </figcaption>
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={daily} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis dataKey="day" tickFormatter={(d) => formatDate(d)} tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} minTickGap={24} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} width={32} />
            <Tooltip labelFormatter={(d) => formatDate(d)} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, fontSize: 12 }} />
            {SERIES.map((s) => <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2} fill={s.color} fillOpacity={0.1} dot={false} isAnimationActive={false} />)}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

function Table({ head, rows, empty = 'Sin datos en este periodo.', minWidth = 420 }) {
  if (!rows.length) return <p className="px-4 py-4 text-sm text-muted sm:px-5">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" style={{ minWidth }}>
        <thead><tr className="text-left text-[11px] uppercase tracking-[0.1em] text-muted">{head.map((h, i) => <th key={h} className={cx('px-4 py-2 font-bold sm:px-5', i > 0 && 'text-right')}>{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-line">
          {rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={cx('px-4 py-2.5 sm:px-5', j > 0 ? 'num text-right' : 'max-w-[260px] truncate')}>{c}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}

/** Recomendaciones calculadas con reglas y muestras mínimas (shared/leads.js → buildInsights). */
function Insights({ insights }) {
  return (
    <section className="card animate-rise overflow-hidden" aria-labelledby="t-insights">
      <SectionHead flush id="t-insights" icon={Lightbulb} tone="amber" title="Qué hacer esta semana"
        hint="Recomendaciones calculadas con los datos del periodo. Solo aparecen cuando la muestra alcanza." action={insights.length > 0 && <Badge tone="amber">{insights.length}</Badge>} />
      {insights.length === 0 ? (
        <p className="px-4 py-5 text-sm text-muted sm:px-5">Con más visitas aparecen recomendaciones aquí: páginas que no convierten, fuentes sin consultas, horas pico y consultas sin responder.</p>
      ) : (
        <ul className="divide-y divide-line">
          {insights.map((item) => {
            const Tag = item.link ? Link : 'div';
            return (
              <li key={item.key}>
                <Tag {...(item.link ? { to: item.link } : {})} className={cx('relative flex items-start gap-3 px-4 py-3.5 pl-5 sm:px-5 sm:pl-6', item.link && 'group row')}>
                  <span className={cx('absolute inset-y-2 left-0 w-1 rounded-r-full', STRIPE[item.tone] ?? 'bg-brand')} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink">{item.title}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted">{item.detail}</span>
                  </span>
                  {item.link && <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-2 transition group-hover:translate-x-0.5" aria-hidden="true" />}
                </Tag>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function exportPages(pages, days) {
  const header = ['Página', 'Ruta', 'Vistas', 'Visitas', 'Tiempo leyendo (s)', 'Scroll 50 %', 'Visitas con CTA', 'Tasa CTA', 'Consultas', 'Veredicto'];
  const rows = pages.map((p) => [pageName(p.path), p.path, p.views, p.sessions, Math.round(p.avg_engaged_ms / 1000), percent(p.scroll50_rate), p.cta_sessions, percent(p.cta_rate), p.leads, PAGE_VERDICTS[p.verdict]?.label ?? p.verdict]);
  const csv = `\uFEFF${[header, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n')}\r\n`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `paginas-jcanalytic-${days}-dias-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Detalle de una página: secciones, scroll, clics, fuentes y dispositivos de esa ruta. */
function PageDetail({ path, days, onClose }) {
  const { data, error, reload } = useResource(`/api/analytics/page?path=${encodeURIComponent(path)}&days=${days}`);
  return (
    <div className="border-t border-line bg-surface-2/50 px-4 py-4 sm:px-5" aria-live="polite">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-base font-bold text-ink">Detalle de la página: {pageName(path)}</h3>
          <p className="truncate text-xs text-muted">{path} · últimos {days} días</p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm -mr-1" onClick={onClose} aria-label="Cerrar detalle"><X className="h-4 w-4" /></button>
      </div>
      {!data ? (
        error ? <p className="text-sm text-coral-ink">No pudimos cargar el detalle. <button type="button" className="underline" onClick={reload}>Reintentar</button></p>
          : <p className="flex items-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Cargando el detalle…</p>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <div className="rounded-xl bg-surface p-3"><p className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted">Visitas</p><p className="num text-lg font-bold">{data.sessions}</p></div>
            <div className="rounded-xl bg-surface p-3"><p className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted">Vistas</p><p className="num text-lg font-bold">{data.views}</p></div>
            <div className="rounded-xl bg-surface p-3"><p className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted">Tiempo leyendo</p><p className="num text-lg font-bold">{formatDuration(data.avg_engaged_ms)}</p></div>
            <div className="rounded-xl bg-surface p-3"><p className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted">Consultas</p><p className="num text-lg font-bold">{data.leads}</p></div>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.1em] text-muted">Qué se lee en esta página</p>
              {data.sections.length === 0 ? <p className="text-sm text-muted">Sin secciones medidas.</p>
                : <ul>{data.sections.slice(0, 10).map((s) => <Bar key={s.section} label={sectionName(s.section)} value={s.avg_ms} max={data.sections[0] ? Math.max(...data.sections.map((x) => x.avg_ms)) : 0} right={formatDuration(s.avg_ms)} sub={`La vio el ${percent(s.reach)} de las visitas de la página`} tone="bg-amber" />)}</ul>}
            </div>
            <div className="space-y-4">
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-[0.1em] text-muted">Hasta dónde bajan</p>
                <ul>{data.scroll.map((s) => <Bar key={s.pct} label={`${s.pct} %`} value={s.sessions} max={data.sessions || 1} right={`${s.sessions} · ${percent(s.sessions / (data.sessions || 1))}`} tone="bg-violet" />)}</ul>
              </div>
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-[0.1em] text-muted">Fuentes y dispositivos</p>
                <p className="text-sm text-ink-2">{data.sources.map((s) => `${s.name} ${s.sessions}`).join(' · ') || 'Sin fuentes'}</p>
                <p className="text-sm text-ink-2">{data.devices.map((d) => `${deviceName(d.name)} ${d.sessions}`).join(' · ') || 'Sin dispositivos'}</p>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.1em] text-muted">Qué tocan en esta página</p>
            <div className="-mx-4 sm:-mx-5"><Table head={['Qué', 'Tipo', 'Sección', 'Clics', 'Visitas']} rows={data.clicks.map((c) => [c.label || clickKind(c.target), clickKind(c.target), sectionName(c.section), c.clicks, c.sessions])} empty="Nadie tocó un botón en esta página." /></div>
          </div>
        </>
      )}
    </div>
  );
}

/** Páginas con su veredicto; cada fila abre el detalle de la ruta. */
function Pages({ pages, days }) {
  const [open, setOpen] = useState(null);
  return (
    <section className="card animate-rise overflow-hidden xl:col-span-2" aria-labelledby="t-pages">
      <SectionHead flush id="t-pages" icon={FileText} tone="slate" title="Páginas: dónde vale la pena trabajar"
        hint="Cada página con su veredicto. Tocá una para ver qué leen, hasta dónde bajan y qué tocan ahí."
        action={pages.length > 0 && <button type="button" className="btn btn-outline btn-sm" onClick={() => exportPages(pages, days)}><Download className="h-4 w-4" />Excel (CSV)</button>} />
      {pages.length === 0 ? <p className="px-4 py-4 text-sm text-muted sm:px-5">Sin páginas vistas en este periodo.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.1em] text-muted">
                {['Página', 'Visitas', 'Tiempo', 'Scroll 50 %', 'CTA', 'Consultas', 'Veredicto'].map((h, i) => <th key={h} className={cx('px-4 py-2 font-bold sm:px-5', i > 0 && i < 6 && 'text-right')}>{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {pages.map((p) => (
                <tr key={p.path} className={cx(open === p.path && 'bg-brand-soft/40')}>
                  <td className="max-w-[280px] px-4 py-2.5 sm:px-5">
                    <button type="button" className="group flex w-full items-center gap-1.5 text-left font-medium text-ink hover:text-brand-ink" aria-expanded={open === p.path} onClick={() => setOpen(open === p.path ? null : p.path)}>
                      <span className="truncate">{pageName(p.path)}</span>
                      <ChevronRight className={cx('h-4 w-4 shrink-0 text-muted-2 transition', open === p.path && 'rotate-90')} aria-hidden="true" />
                    </button>
                    <span className="block truncate text-[11px] text-muted-2">{p.path}</span>
                  </td>
                  <td className="num px-4 py-2.5 text-right sm:px-5">{p.sessions} <span className="text-xs text-muted">({p.views})</span></td>
                  <td className="num px-4 py-2.5 text-right sm:px-5">{formatDuration(p.avg_engaged_ms)}</td>
                  <td className="num px-4 py-2.5 text-right sm:px-5">{percent(p.scroll50_rate)}</td>
                  <td className="num px-4 py-2.5 text-right sm:px-5">{percent(p.cta_rate)}</td>
                  <td className="num px-4 py-2.5 text-right sm:px-5">{p.leads}</td>
                  <td className="px-4 py-2.5 sm:px-5"><PageVerdictBadge verdict={p.verdict} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {open && <PageDetail key={open} path={open} days={days} onClose={() => setOpen(null)} />}
      <p className="border-t border-line px-4 py-2.5 text-[11px] text-muted sm:px-5">Visitas (vistas) · Tiempo: promedio leyendo por visita · Scroll 50 %: visitas que bajaron a la mitad · CTA: visitas que tocaron WhatsApp, un paquete o contacto.</p>
    </section>
  );
}

/** ¿Cuándo entran? Mapa de calor día × hora (Costa Rica), sin librerías: una celda por hora. */
function Heatmap({ hours }) {
  const max = Math.max(1, ...hours.matrix.flat());
  const { peak } = hours;
  return (
    <section className="card animate-rise p-4 sm:p-5 xl:col-span-2" aria-labelledby="t-hours">
      <SectionHead id="t-hours" icon={CalendarClock} tone="violet" title="¿Cuándo entran?" hint="Visitas por día de la semana y hora de Costa Rica. Útil para saber cuándo responder y cuándo publicar." />
      {hours.total === 0 ? <p className="text-sm text-muted">Sin visitas en este periodo.</p> : (
        <>
          <div className="overflow-x-auto">
            <div className="min-w-[320px]" role="img" aria-label={peak.weekday != null ? `Mapa de visitas por día y hora. Pico: ${WEEKDAYS_LONG[peak.weekday]} a las ${peak.hour} h con ${peak.sessions} visitas.` : 'Mapa de visitas por día y hora.'}>
              <div className="grid gap-[2px]" style={{ gridTemplateColumns: '2.2rem repeat(24, minmax(0, 1fr))' }}>
                {hours.matrix.map((row, wd) => (
                  <div key={wd} className="contents">
                    <span className="pr-1 text-right text-[11px] leading-[1.6] text-muted">{WEEKDAYS[wd]}</span>
                    {row.map((n, hr) => (
                      <span key={hr} title={`${WEEKDAYS_LONG[wd]} ${hr} h · ${n} ${n === 1 ? 'visita' : 'visitas'}`} className="rounded-[3px] bg-brand" style={{ aspectRatio: '1 / 1', opacity: n ? 0.15 + 0.85 * (n / max) : 0.06 }} />
                    ))}
                  </div>
                ))}
                <span />
                {Array.from({ length: 24 }, (_, h) => <span key={h} className="text-center text-[10px] text-muted-2">{h % 3 === 0 ? h : ''}</span>)}
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted">
            {peak.weekday != null && <>Pico: <strong className="text-ink">{WEEKDAYS_LONG[peak.weekday]} {peak.hour} h</strong> · {peak.sessions} {peak.sessions === 1 ? 'visita' : 'visitas'}. </>}
            Día con más visitas: {WEEKDAYS_LONG[hours.by_weekday.indexOf(Math.max(...hours.by_weekday))]}.
          </p>
        </>
      )}
    </section>
  );
}

/** Cifra pequeña del embudo de consultas. */
function KPI({ label, value, tone = 'text-ink' }) {
  return <div className="rounded-xl bg-surface-2/70 p-3"><p className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted">{label}</p><p className={cx('num text-lg font-bold', tone)}>{value}</p></div>;
}

/** Consultas: del clic a la venta. Embudo por estado y cifras del seguimiento. */
function Pipeline({ pipeline }) {
  const stages = PIPELINE_ORDER.map((k) => ({ key: k, label: LEAD_STATUS[k].label, n: pipeline.by_status[k] ?? 0 }));
  // Cada etapa acumula las siguientes: una consulta cotizada ya fue contactada.
  const cumulative = stages.map((s, i) => ({ ...s, n: i === 0 ? pipeline.total : stages.slice(i).reduce((sum, x) => sum + x.n, 0) }));
  const top = Math.max(1, pipeline.total);
  return (
    <section className="card animate-rise p-4 sm:p-5" aria-labelledby="t-pipeline">
      <SectionHead id="t-pipeline" icon={Target} tone="teal" title="Consultas: del clic a la venta" hint="Consultas del periodo por estado y qué tan rápido se responden."
        action={<Link to="/consultas" className="btn btn-outline btn-sm"><Inbox className="h-4 w-4" />Ver consultas</Link>} />
      {pipeline.total === 0 && !pipeline.unattended_over_24h ? <p className="text-sm text-muted">Todavía no llegaron consultas en este periodo.</p> : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <KPI label="Contactadas" value={percent(pipeline.contact_rate)} />
            <KPI label="Primer contacto (mediana)" value={pipeline.median_first_contact_minutes == null ? '—' : formatDuration(pipeline.median_first_contact_minutes * 60_000)} />
            <KPI label="Tasa de cierre" value={pipeline.win_rate == null ? '—' : percent(pipeline.win_rate)} tone={pipeline.win_rate == null ? 'text-ink' : pipeline.win_rate >= 0.3 ? 'text-teal-ink' : 'text-amber-ink'} />
            <Link to="/consultas?status=nuevo" className="rounded-xl bg-surface-2/70 p-3 transition hover:bg-surface-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted">Sin atender &gt; 24 h</p>
              <p className={cx('num text-lg font-bold', pipeline.unattended_over_24h ? 'text-coral-ink' : 'text-teal-ink')}>{pipeline.unattended_over_24h}</p>
            </Link>
          </div>
          <ul>{cumulative.map((s) => <Bar key={s.key} label={s.key === 'nuevo' ? 'Llegaron' : s.label} value={s.n} max={top} right={`${s.n} · ${percent(s.n / top)}`} tone={s.key === 'ganado' ? 'bg-teal' : 'bg-brand'} />)}</ul>
          <p className="mt-1 text-xs text-muted">Perdidas: {pipeline.lost} · Spam: {pipeline.spam}. Cada barra incluye las etapas siguientes.</p>
          {(pipeline.by_need.length > 0 || pipeline.by_source.length > 0) && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-[0.1em] text-muted">Por necesidad</p>
                <ul className="text-sm">{pipeline.by_need.slice(0, 6).map((n) => <li key={n.need} className="flex justify-between gap-3 py-1"><span className="truncate">{n.need}</span><span className="num font-semibold">{n.count}</span></li>)}</ul>
              </div>
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-[0.1em] text-muted">Por fuente (ganadas)</p>
                <ul className="text-sm">{pipeline.by_source.slice(0, 6).map((s) => <li key={s.source} className="flex justify-between gap-3 py-1"><span className="truncate">{s.source}</span><span className="num font-semibold">{s.count} <span className="text-xs font-normal text-muted">({s.won})</span></span></li>)}</ul>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default function Traffic() {
  const [days, setDays] = useState(30);
  const { data, error, reload } = useResource(`/api/analytics?days=${days}`);
  const tabs = ANALYTICS_PERIODS.map((d) => ({ value: String(d), label: `${d} días` }));

  const header = (
    <PageHeader eyebrow="Desde la web" title="Tráfico del sitio" icon={BarChart3} tone="violet"
      subtitle="Qué hacer, qué páginas valen la pena, qué CTA convierte, cuándo entra la gente y cómo avanzan las consultas."
      actions={<Tabs className="whitespace-nowrap" value={String(days)} onChange={(v) => setDays(Number(v))} tabs={tabs} />} />
  );
  if (!data) return <>{header}<PageLoader error={error} onRetry={reload} /></>;
  const { totals: t, delta, funnel, sections, clicks, scroll, sources, devices, languages, campaigns, pages, forms, hours, cta_by_section: ctaBySection, leads_pipeline: pipeline, insights } = data;

  if (!t.sessions && !t.leads) {
    return (
      <>
        {header}
        <EmptyState icon={BarChart3} tone="violet" title="Todavía no hay visitas medidas en este periodo">
          El sitio manda la medición al portal en cuanto se publica con la dirección del portal configurada. Las visitas de prueba y las de quienes
          piden no ser medidos (Do Not Track) no se cuentan.
        </EmptyState>
      </>
    );
  }

  const byStay = [...sections].sort((a, b) => b.avg_ms - a.avg_ms);
  const maxStay = byStay[0]?.avg_ms ?? 0;
  const top = funnel[0]?.sessions || 1;
  const previousLabel = `Comparado con los ${days} días anteriores (desde el ${formatDate(data.previous_from)}).`;

  return (
    <>
      {header}
      <div className="stagger mb-2 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Visitas" value={t.sessions} hint={`${t.views} páginas vistas`} icon={Eye} tone="blue" trend={{ value: delta.sessions }} />
        <Stat label="Personas (aprox.)" value={t.visitors} hint="Únicas por día" icon={Users} tone="violet" trend={{ value: delta.visitors }} />
        <Stat label="Tiempo leyendo" value={formatDuration(t.avg_engaged_ms)} hint="Promedio por visita" icon={Timer} tone="amber" trend={{ value: delta.avg_engaged_ms }} />
        <Stat label="Tocaron un CTA" value={percent(t.cta_rate)} hint={`${t.cta_clicks} clics a WhatsApp, paquetes o contacto`} icon={MousePointerClick} tone="teal" trend={{ value: delta.cta_rate_points, unit: 'pts' }} />
        <Stat label="Consultas" value={t.leads} hint="Dejaron sus datos" icon={Inbox} tone="teal" to="/consultas" className="col-span-2 lg:col-span-1" trend={{ value: delta.leads }} />
      </div>
      <p className="mb-5 text-xs text-muted">{previousLabel}</p>

      <div className="grid items-start gap-5 xl:grid-cols-2">
        <div className="xl:col-span-2"><Insights insights={insights} /></div>

        <section className="card animate-rise p-4 sm:p-5 xl:col-span-2" aria-labelledby="t-daily">
          <SectionHead id="t-daily" icon={BarChart3} tone="blue" title="Visitas por día" hint={`Del ${formatDate(data.from)} al ${formatDate(data.to)}`} />
          <DailyChart daily={data.daily} />
        </section>

        <section className="card animate-rise p-4 sm:p-5" aria-labelledby="t-funnel">
          <SectionHead id="t-funnel" icon={Filter} tone="teal" title="¿Llegan al llamado a la acción?" hint="Visitas que hicieron cada paso." />
          <ul>
            {funnel.map((f) => <Bar key={f.key} label={f.label} value={f.sessions} max={top} right={`${f.sessions} · ${percent(f.sessions / top)}`} tone={f.key === 'lead' || f.key === 'form_submit' ? 'bg-teal' : 'bg-brand'} />)}
          </ul>
        </section>

        <Pipeline pipeline={pipeline} />

        <Pages pages={pages} days={days} />

        <section className="card animate-rise p-4 sm:p-5" aria-labelledby="t-stay">
          <SectionHead id="t-stay" icon={Timer} tone="amber" title="¿Dónde se queda la gente?" hint="Tiempo promedio en cada sección y cuántas visitas la vieron." />
          {byStay.length === 0 ? <p className="text-sm text-muted">Sin datos en este periodo.</p> : (
            <ul>{byStay.slice(0, 12).map((s) => <Bar key={s.section} label={sectionName(s.section)} value={s.avg_ms} max={maxStay} right={formatDuration(s.avg_ms)} sub={`La vio el ${percent(s.reach)} de las visitas`} tone="bg-amber" />)}</ul>
          )}
        </section>

        <section className="card animate-rise overflow-hidden" aria-labelledby="t-cta-section">
          <SectionHead flush id="t-cta-section" icon={Target} tone="teal" title="¿Qué CTA convierte?" hint="Clics a WhatsApp, paquetes o contacto por sección, y cuántas de esas visitas dejaron sus datos." />
          <Table head={['Sección', 'Clics', 'Visitas', 'Consultas', 'Tasa']} rows={ctaBySection.map((c) => [sectionName(c.section), c.clicks, c.sessions, c.lead_sessions, percent(c.lead_rate)])} empty="Nadie tocó un CTA en este periodo." />
        </section>

        <section className="card animate-rise overflow-hidden xl:col-span-2" aria-labelledby="t-clicks">
          <SectionHead flush id="t-clicks" icon={MousePointerClick} tone="violet" title="¿Qué tocan?" hint="Botones y enlaces más usados, con la sección donde estaban." />
          <Table head={['Qué', 'Tipo', 'Sección', 'Clics', 'Visitas']} rows={clicks.map((c) => [c.label || clickKind(c.target), clickKind(c.target), sectionName(c.section), c.clicks, c.sessions])} />
        </section>

        <Heatmap hours={hours} />

        <section className="card animate-rise p-4 sm:p-5" aria-labelledby="t-scroll">
          <SectionHead id="t-scroll" icon={LayoutList} tone="slate" title="¿Hasta dónde bajan?" hint="Visitas que llegaron a cada parte de la página." />
          <ul>{scroll.map((s) => <Bar key={s.pct} label={`${s.pct} % de la página`} value={s.sessions} max={top} right={`${s.sessions} · ${percent(s.sessions / top)}`} tone="bg-violet" />)}</ul>
        </section>

        <section className="card animate-rise p-4 sm:p-5" aria-labelledby="t-forms">
          <SectionHead id="t-forms" icon={FileText} tone="teal" title="Formularios" hint="Cuántas personas empezaron y cuántas enviaron." />
          {forms.length === 0 ? <p className="text-sm text-muted">Nadie abrió un formulario en este periodo.</p> : (
            <ul>{forms.map((f) => <Bar key={f.form} label={formName(f.form)} value={f.submits} max={Math.max(1, f.starts)} right={`${f.submits} de ${f.starts} · ${percent(f.starts ? f.submits / f.starts : 0)}`} tone="bg-teal" />)}</ul>
          )}
        </section>

        <section className="card animate-rise overflow-hidden" aria-labelledby="t-sources">
          <SectionHead flush id="t-sources" icon={Globe2} tone="blue" title="¿De dónde llegan?" hint="Anuncios, buscadores, redes o directo, con su tasa de CTA." />
          <Table head={['Fuente', 'Visitas', 'CTA', 'Tasa', 'Consultas']} rows={sources.map((s) => [s.name, s.sessions, s.cta_sessions, percent(s.cta_rate), s.leads])} />
        </section>

        <section className="card animate-rise overflow-hidden" aria-labelledby="t-devices">
          <SectionHead flush id="t-devices" icon={Smartphone} tone="amber" title="Dispositivo" hint="Para saber dónde cuidar más la experiencia." />
          <Table head={['Dispositivo', 'Visitas', 'CTA', 'Tasa', 'Consultas']} rows={devices.map((d) => [deviceName(d.name), d.sessions, d.cta_sessions, percent(d.cta_rate), d.leads])} />
        </section>

        <section className="card animate-rise overflow-hidden" aria-labelledby="t-languages">
          <SectionHead flush id="t-languages" icon={Languages} tone="slate" title="Idioma" hint="Español (raíz) o inglés (/en/)." />
          <Table head={['Idioma', 'Visitas', 'CTA', 'Tasa', 'Consultas']} rows={languages.map((l) => [LANGUAGES[l.name] ?? l.name, l.sessions, l.cta_sessions, percent(l.cta_rate), l.leads])} />
        </section>

        {campaigns.length > 0 && (
          <section className="card animate-rise overflow-hidden" aria-labelledby="t-campaigns">
            <SectionHead flush id="t-campaigns" icon={Megaphone} tone="violet" title="Campañas" hint="Según utm_campaign de cada anuncio." />
            <Table head={['Campaña', 'Visitas', 'CTA', 'Tasa', 'Consultas']} rows={campaigns.map((c) => [c.name, c.sessions, c.cta_sessions, percent(c.cta_rate), c.leads])} />
          </section>
        )}
      </div>

      <div className="mt-5 flex items-start gap-2 text-xs text-muted">
        <IconTile icon={ShieldCheck} tone="teal" size="sm" className="shrink-0" />
        <p className="pt-1">Medición propia: sin cookies, sin guardar IP ni datos de la persona, y respetando “Do Not Track”. Los eventos se borran solos a los 180 días. Las recomendaciones son reglas sobre estas cifras, no promesas: con pocas visitas no opinan.</p>
      </div>
    </>
  );
}
