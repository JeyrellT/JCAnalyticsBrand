// PLACEHOLDER v5-B: lo reemplaza el agente del brief creativo (formulario y detalle de una solicitud).
import { ClipboardList } from 'lucide-react';
import { Link } from '../../lib/router.jsx';
import { useResource } from '../../lib/session.jsx';
import { PageHeader, PageLoader, EmptyState } from '../../components/ui.jsx';

export default function ClientBriefDetail({ params }) {
  const { data, error, reload } = useResource(params.id ? `/api/client/briefs/${params.id}` : null);
  if (!params.id) return <EmptyState icon={ClipboardList} tone="violet" title="Nueva solicitud (en construcción)" />;
  if (!data) return <PageLoader error={error} onRetry={reload} />;
  return (
    <div className="space-y-6">
      <PageHeader eyebrow={data.brief.code} title={data.brief.title} icon={ClipboardList} tone="violet"
        actions={<Link to={`/cliente/solicitudes/${data.brief.id}/imprimir`} className="btn btn-outline">Imprimir</Link>} />
    </div>
  );
}
