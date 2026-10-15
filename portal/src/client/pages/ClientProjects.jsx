// Proyectos del cliente: cada uno con su estado, etapa actual y responsable.
import { useState } from 'react';
import { FolderKanban, Plus, Archive } from 'lucide-react';
import { useResource } from '../../lib/session.jsx';
import { Link } from '../../lib/router.jsx';
import { PageHeader, PageLoader, EmptyState, Tabs, cx } from '../../components/ui.jsx';
import { ProjectCard } from '../components.jsx';

const isClosed = (p) => p.archived || p.status === 'cerrado';

export default function ClientProjects() {
  const { data, error, reload } = useResource('/api/client/projects');
  const [tab, setTab] = useState(null);
  if (!data) return <PageLoader error={error} onRetry={reload} />;

  const active = data.projects.filter((p) => !isClosed(p));
  const closed = data.projects.filter(isClosed);
  // Sin elección del usuario: los activos, salvo que solo haya finalizados.
  const current = tab ?? (active.length || !closed.length ? 'activos' : 'finalizados');
  const list = current === 'activos' ? active : closed;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Tu servicio con JC Analytics" title="Proyectos" icon={FolderKanban} tone="blue"
        subtitle="Cada proyecto avanza por etapas. Aquí ves en cuál va, qué sigue y quién lo lleva." />

      {closed.length > 0 && (
        <Tabs value={current} onChange={setTab} tabs={[
          { value: 'activos', label: 'En marcha', count: active.length },
          { value: 'finalizados', label: 'Finalizados', count: closed.length },
        ]} />
      )}

      {data.projects.length === 0 ? (
        <EmptyState icon={FolderKanban} title="Todavía no hay proyectos"
          action={<Link to="/cliente/solicitudes/nueva" className="btn btn-primary"><Plus className="h-4 w-4" />Nueva solicitud</Link>}>
          Cuando arranquemos un proyecto juntos, vas a ver aquí sus etapas, avances y entregables.
        </EmptyState>
      ) : list.length === 0 ? (
        <EmptyState icon={current === 'activos' ? FolderKanban : Archive} tone="slate" title={current === 'activos' ? 'Sin proyectos en marcha' : 'Sin proyectos finalizados'}>
          {current === 'activos' ? 'Tus proyectos anteriores siguen disponibles en "Finalizados".' : 'Los proyectos que cerremos quedan aquí como registro.'}
        </EmptyState>
      ) : (
        <div className={cx('stagger grid gap-3 sm:gap-4', list.length > 1 && 'md:grid-cols-2')}>
          {list.map((p) => <ProjectCard key={p.id} project={p} showDescription />)}
        </div>
      )}
    </div>
  );
}
