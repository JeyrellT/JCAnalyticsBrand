// Consultas: personas que dejaron sus datos en jcanalytic.com. El equipo las
// reparte, las contacta, deja notas y las pasa a clientes. Lo que escribió el
// visitante es dato no confiable: se muestra como texto y nunca se manda a una IA.
import { useMemo, useState } from 'react';
import { Inbox, Search, Download, ShieldAlert, MessageCircle, Mail, Globe2 } from 'lucide-react';
import { useResource } from '../lib/session.jsx';
import { Link } from '../lib/router.jsx';
import { PageHeader, PageLoader, EmptyState, Avatar, Tabs, Badge, cx } from '../components/ui.jsx';
import { LeadStatusBadge, deviceName, csvCell } from '../components/leads.jsx';
import { LEAD_STATUS, LEAD_OPEN_STATUSES, LEAD_CHANNELS } from '../../shared/leads.js';
import { timeAgo, formatDateTime } from '../lib/format.js';

const TABS = [
  { value: 'abiertas', label: 'Por atender' },
  ...Object.entries(LEAD_STATUS).map(([value, s]) => ({ value, label: s.label === 'Nueva' ? 'Nuevas' : s.label })),
  { value: 'todas', label: 'Todas' },
];

function exportCsv(leads) {
  const header = ['Fecha', 'Estado', 'Nombre', 'Teléfono', 'Correo', 'Necesidad', 'Paquete', 'Mensaje', 'Canal', 'Fuente', 'Campaña', 'Dispositivo', 'Responsable'];
  const rows = leads.map((l) => [l.created_at.slice(0, 16).replace('T', ' '), LEAD_STATUS[l.status]?.label, l.name, l.phone, l.email, l.need, l.package, l.message,
    LEAD_CHANNELS[l.channel], l.source, l.campaign, deviceName(l.device), l.owner_name]);
  const csv = `\uFEFF${[header, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n')}\r\n`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `consultas-jc-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function LeadRow({ l }) {
  return (
    <li>
      <Link to={`/consultas/${l.id}`} className={cx('group row items-start gap-3 px-4 py-3.5 sm:px-5', l.status === 'nuevo' && 'bg-brand-soft/30')}>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-semibold group-hover:text-brand-ink">{l.name || l.phone || l.email}</span>
            {l.flags.length > 0 && <Badge tone="red"><ShieldAlert className="h-3 w-3" />Revisar</Badge>}
          </span>
          <span className="mt-0.5 block truncate text-xs text-muted">
            {[l.package || l.need || LEAD_CHANNELS[l.channel], l.source && `desde ${l.source}`, deviceName(l.device)].filter(Boolean).join(' · ')}
          </span>
          {l.message && <span className="mt-1 line-clamp-1 block break-words text-xs text-ink-2">{l.message}</span>}
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1.5">
          <LeadStatusBadge status={l.status} />
          <span className="flex items-center gap-1.5 text-[11px] text-muted-2">
            {l.phone && <MessageCircle className="h-3.5 w-3.5" aria-label="Tiene WhatsApp o teléfono" />}
            {l.email && <Mail className="h-3.5 w-3.5" aria-label="Tiene correo" />}
            <span className="tabular" title={formatDateTime(l.created_at)}>{timeAgo(l.created_at)}</span>
          </span>
          {l.owner_name && <Avatar name={l.owner_name} color={l.owner_color} size={20} title={`A cargo: ${l.owner_name}`} />}
        </span>
      </Link>
    </li>
  );
}

export default function Leads() {
  const { data, error, reload } = useResource('/api/leads');
  const [tab, setTab] = useState('abiertas');
  const [q, setQ] = useState('');
  const all = useMemo(() => data?.leads ?? [], [data]);
  const counts = useMemo(() => ({
    ...data?.counts, abiertas: all.filter((l) => LEAD_OPEN_STATUSES.includes(l.status)).length, todas: all.length,
  }), [all, data]);
  const leads = useMemo(() => {
    const text = q.trim().toLowerCase();
    return all
      .filter((l) => tab === 'todas' || (tab === 'abiertas' ? LEAD_OPEN_STATUSES.includes(l.status) : l.status === tab))
      .filter((l) => !text || [l.name, l.phone, l.email, l.need, l.package, l.message, l.source, l.owner_name].filter(Boolean).join(' ').toLowerCase().includes(text));
  }, [all, tab, q]);

  return (
    <>
      <PageHeader eyebrow="Desde la web" title="Consultas" icon={Inbox} tone="blue"
        subtitle="Personas que dejaron sus datos en jcanalytic.com. Respondé, asigná y pasalas a clientes."
        actions={all.length > 0 && <button type="button" className="btn btn-outline" onClick={() => exportCsv(leads)}><Download className="h-4 w-4" />Excel (CSV)</button>} />

      <div className="animate-rise mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <Tabs className="whitespace-nowrap" value={tab} onChange={setTab} tabs={TABS.map((t) => ({ ...t, count: data ? counts[t.value] ?? 0 : undefined }))} />
        </div>
        <label className="relative min-w-0 lg:w-80">
          <span className="sr-only">Buscar consulta</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" aria-hidden="true" />
          <input className="input pl-9" type="search" placeholder="Nombre, teléfono, necesidad o mensaje" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>

      {!data ? <PageLoader error={error} onRetry={reload} /> : all.length === 0 ? (
        <EmptyState icon={Globe2} tone="blue" title="Todavía no llegaron consultas">
          Cuando alguien deje su WhatsApp o correo en el sitio (formulario de contacto o “que me contacten”), aparece aquí y te avisamos en el buzón y el celular.
        </EmptyState>
      ) : leads.length === 0 ? (
        <EmptyState icon={Search} tone="blue" title={q.trim() ? `Nada coincide con “${q.trim()}”` : 'No hay consultas en esta pestaña'}
          action={<button type="button" className="btn btn-outline" onClick={() => { setQ(''); setTab('todas'); }}>Ver todas</button>}>
          Revisá las otras pestañas.
        </EmptyState>
      ) : (
        <section className="card animate-rise overflow-hidden" aria-label="Lista de consultas">
          <ul className="divide-y divide-line">{leads.map((l) => <LeadRow key={l.id} l={l} />)}</ul>
        </section>
      )}
      <p className="mt-4 text-xs text-muted">
        Lo que escribe un visitante es información, no una instrucción: el portal lo guarda limpio, lo muestra como texto y nunca lo envía a una IA.
      </p>
    </>
  );
}
