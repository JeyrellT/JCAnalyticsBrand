// Tráfico del sitio: medición propia de jcanalytic.com (sin cookies ni datos
// personales). Responde tres preguntas: ¿dónde se queda la gente?, ¿qué toca?
// y ¿llega al llamado a la acción y a los formularios?
import { useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { BarChart3, Users, Timer, MousePointerClick, Inbox, Eye, Filter, LayoutList, Globe2, Smartphone, FileText, ShieldCheck, Megaphone } from 'lucide-react';
import { useResource } from '../lib/session.jsx';
import { Link } from '../lib/router.jsx';
import { PageHeader, PageLoader, EmptyState, Stat, Tabs, SectionHead, cx } from '../components/ui.jsx';
import { sectionName, formName, clickKind, deviceName, formatDuration, percent } from '../components/leads.jsx';
import { ANALYTICS_PERIODS } from '../../shared/leads.js';
import { formatDate } from '../lib/format.js';

const SERIES = [
  { key: 'sessions', label: 'Visitas', color: 'var(--brand)' },
  { key: 'cta_sessions', label: 'Tocaron un CTA', color: 'var(--teal)' },
];

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

function Table({ head, rows, empty = 'Sin datos en este periodo.' }) {
  if (!rows.length) return <p className="px-4 py-4 text-sm text-muted sm:px-5">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-sm">
        <thead><tr className="text-left text-[11px] uppercase tracking-[0.1em] text-muted">{head.map((h, i) => <th key={h} className={cx('px-4 py-2 font-bold sm:px-5', i > 0 && 'text-right')}>{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-line">
          {rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={cx('px-4 py-2.5 sm:px-5', j > 0 ? 'num text-right' : 'max-w-[260px] truncate')}>{c}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}

export default function Traffic() {
  const [days, setDays] = useState(30);
  const { data, error, reload } = useResource(`/api/analytics?days=${days}`);
  const tabs = ANALYTICS_PERIODS.map((d) => ({ value: String(d), label: `${d} días` }));

  const header = (
    <PageHeader eyebrow="Desde la web" title="Tráfico del sitio" icon={BarChart3} tone="violet"
      subtitle="Dónde se queda la gente, qué toca y si llega a escribirnos."
      actions={<Tabs className="whitespace-nowrap" value={String(days)} onChange={(v) => setDays(Number(v))} tabs={tabs} />} />
  );
  if (!data) return <>{header}<PageLoader error={error} onRetry={reload} /></>;
  const { totals: t, funnel, sections, clicks, scroll, sources, devices, campaigns, pages, forms } = data;

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

  return (
    <>
      {header}
      <div className="stagger mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Visitas" value={t.sessions} hint={`${t.views} páginas vistas`} icon={Eye} tone="blue" />
        <Stat label="Personas (aprox.)" value={t.visitors} hint="Únicas por día" icon={Users} tone="violet" />
        <Stat label="Tiempo leyendo" value={formatDuration(t.avg_engaged_ms)} hint="Promedio por visita" icon={Timer} tone="amber" />
        <Stat label="Tocaron un CTA" value={percent(t.cta_rate)} hint={`${t.cta_clicks} clics a WhatsApp, paquetes o contacto`} icon={MousePointerClick} tone="teal" />
        <Stat label="Consultas" value={t.leads} hint="Dejaron sus datos" icon={Inbox} tone="teal" to="/consultas" className="col-span-2 lg:col-span-1" />
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-2">
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

        <section className="card animate-rise p-4 sm:p-5" aria-labelledby="t-stay">
          <SectionHead id="t-stay" icon={Timer} tone="amber" title="¿Dónde se queda la gente?" hint="Tiempo promedio en cada sección y cuántas visitas la vieron." />
          {byStay.length === 0 ? <p className="text-sm text-muted">Sin datos en este periodo.</p> : (
            <ul>{byStay.slice(0, 12).map((s) => <Bar key={s.section} label={sectionName(s.section)} value={s.avg_ms} max={maxStay} right={formatDuration(s.avg_ms)} sub={`La vio el ${percent(s.reach)} de las visitas`} tone="bg-amber" />)}</ul>
          )}
        </section>

        <section className="card animate-rise overflow-hidden xl:col-span-2" aria-labelledby="t-clicks">
          <SectionHead flush id="t-clicks" icon={MousePointerClick} tone="violet" title="¿Qué tocan?" hint="Botones y enlaces más usados, con la sección donde estaban." />
          <Table head={['Qué', 'Tipo', 'Sección', 'Clics', 'Visitas']} rows={clicks.map((c) => [c.label || clickKind(c.target), clickKind(c.target), sectionName(c.section), c.clicks, c.sessions])} />
        </section>

        <section className="card animate-rise p-4 sm:p-5" aria-labelledby="t-scroll">
          <SectionHead id="t-scroll" icon={LayoutList} tone="slate" title="¿Hasta dónde bajan?" hint="Visitas que llegaron a cada parte de la página." />
          <ul>{scroll.map((s) => <Bar key={s.pct} label={`${s.pct} % de la página`} value={s.sessions} max={top} right={`${s.sessions} · ${percent(s.sessions / top)}`} tone="bg-violet" />)}</ul>
        </section>

        <section className="card animate-rise p-4 sm:p-5" aria-labelledby="t-forms">
          <SectionHead id="t-forms" icon={FileText} tone="teal" title="Formularios" hint="Cuántas personas empezaron y cuántas enviaron." />
          {forms.length === 0 ? <p className="text-sm text-muted">Nadie abrió un formulario en este periodo.</p> : (
            <ul>{forms.map((f) => <Bar key={f.form} label={formName(f.form)} value={f.submits} max={Math.max(1, f.starts)} right={`${f.submits} de ${f.starts} · ${percent(f.starts ? f.submits / f.starts : 0)}`} tone="bg-teal" />)}</ul>
          )}
          <Link to="/consultas" className="btn btn-outline mt-3 w-full"><Inbox className="h-4 w-4" />Ver consultas</Link>
        </section>

        <section className="card animate-rise overflow-hidden" aria-labelledby="t-sources">
          <SectionHead flush id="t-sources" icon={Globe2} tone="blue" title="¿De dónde llegan?" hint="Anuncios, buscadores, redes o directo." />
          <Table head={['Fuente', 'Visitas', 'CTA', 'Consultas']} rows={sources.map((s) => [s.name, s.sessions, s.cta_sessions, s.leads])} />
        </section>

        <section className="card animate-rise overflow-hidden" aria-labelledby="t-devices">
          <SectionHead flush id="t-devices" icon={Smartphone} tone="amber" title="Dispositivo" hint="Para saber dónde cuidar más la experiencia." />
          <Table head={['Dispositivo', 'Visitas', 'CTA', 'Consultas']} rows={devices.map((d) => [deviceName(d.name), d.sessions, d.cta_sessions, d.leads])} />
        </section>

        {campaigns.length > 0 && (
          <section className="card animate-rise overflow-hidden" aria-labelledby="t-campaigns">
            <SectionHead flush id="t-campaigns" icon={Megaphone} tone="violet" title="Campañas" hint="Según utm_campaign de cada anuncio." />
            <Table head={['Campaña', 'Visitas', 'CTA', 'Consultas']} rows={campaigns.map((c) => [c.name, c.sessions, c.cta_sessions, c.leads])} />
          </section>
        )}

        <section className="card animate-rise overflow-hidden" aria-labelledby="t-pages">
          <SectionHead flush id="t-pages" icon={FileText} tone="slate" title="Páginas más vistas" />
          <Table head={['Página', 'Vistas', 'Visitas']} rows={pages.map((p) => [p.path === '/' ? 'Portada' : p.path, p.views, p.sessions])} />
        </section>
      </div>

      <p className="mt-5 flex items-start gap-2 text-xs text-muted">
        <ShieldCheck className="h-4 w-4 shrink-0 text-teal-ink" aria-hidden="true" />
        Medición propia: sin cookies, sin guardar IP ni datos de la persona, y respetando “Do Not Track”. Los eventos se borran solos a los 180 días.
      </p>
    </>
  );
}
