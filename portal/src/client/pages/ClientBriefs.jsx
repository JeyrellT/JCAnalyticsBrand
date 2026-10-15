// PLACEHOLDER v5-B: lo reemplaza el agente del brief creativo (bandeja de solicitudes del cliente).
import { ClipboardList } from 'lucide-react';
import { Link } from '../../lib/router.jsx';
import { useResource } from '../../lib/session.jsx';
import { PageHeader, PageLoader, EmptyState } from '../../components/ui.jsx';
import { BriefRow } from '../components.jsx';

export default function ClientBriefs() {
  const { data, error, reload } = useResource('/api/client/briefs');
  if (!data) return <PageLoader error={error} onRetry={reload} />;
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Tus pedidos" title="Solicitudes" icon={ClipboardList} tone="violet"
        actions={<Link to="/cliente/solicitudes/nueva" className="btn btn-primary">Nueva solicitud</Link>} />
      {data.briefs.length === 0 ? <EmptyState icon={ClipboardList} tone="violet" title="Sin solicitudes" /> : (
        <section className="card overflow-hidden"><ul className="divide-y divide-line">{data.briefs.map((b) => <li key={b.id}><BriefRow b={b} /></li>)}</ul></section>
      )}
    </div>
  );
}
