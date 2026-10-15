// Documentos compartidos con el cliente, agrupados por categoría (contratos, facturación, reportes…).
import { useState } from 'react';
import { FolderOpen, ShieldCheck } from 'lucide-react';
import { useResource } from '../../lib/session.jsx';
import { PageHeader, PageLoader, EmptyState, SectionHead, cx } from '../../components/ui.jsx';
import { DOCUMENT_CATEGORIES } from '../../../shared/client-portal.js';
import { DocumentRow, DOCUMENT_ICON } from '../components.jsx';

const ORDER = Object.keys(DOCUMENT_CATEGORIES);

export default function ClientDocuments() {
  const { data, error, reload } = useResource('/api/client/documents');
  const [filter, setFilter] = useState('todos');
  if (!data) return <PageLoader error={error} onRetry={reload} />;

  const docs = data.documents;
  const byCategory = ORDER.map((key) => ({ key, ...DOCUMENT_CATEGORIES[key], items: docs.filter((d) => (DOCUMENT_CATEGORIES[d.category] ? d.category : 'otro') === key) }))
    .filter((g) => g.items.length > 0);
  const shown = filter === 'todos' ? byCategory : byCategory.filter((g) => g.key === filter);
  const chip = (on) => cx('tap inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition lg:min-h-9',
    on ? 'border-transparent bg-contrast text-contrast-fg shadow-card' : 'border-line bg-surface text-muted hover:border-line-strong hover:text-ink');

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Archivo compartido" title="Documentos" icon={FolderOpen} tone="violet"
        subtitle="Contratos, facturas, reportes y recursos de marca que JC Analytics compartió con tu empresa. Se abren en otra pestaña." />

      {docs.length === 0 ? (
        <EmptyState icon={FolderOpen} tone="violet" title="Todavía no hay documentos">
          Cuando el equipo comparta un contrato, una factura o un reporte, lo vas a encontrar aquí ordenado por tipo.
        </EmptyState>
      ) : (
        <>
          {byCategory.length > 1 && (
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filtrar por tipo">
              <button type="button" className={chip(filter === 'todos')} aria-pressed={filter === 'todos'} onClick={() => setFilter('todos')}>
                Todos <span className="tabular-nums opacity-70">{docs.length}</span>
              </button>
              {byCategory.map((g) => {
                const Icon = DOCUMENT_ICON[g.key];
                return (
                  <button key={g.key} type="button" className={chip(filter === g.key)} aria-pressed={filter === g.key} onClick={() => setFilter(g.key)}>
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />{g.label} <span className="tabular-nums opacity-70">{g.items.length}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-2">
            {shown.map((g) => (
              <section key={g.key} className="card animate-rise self-start overflow-hidden" aria-labelledby={`docs-${g.key}`}>
                <SectionHead flush id={`docs-${g.key}`} icon={DOCUMENT_ICON[g.key]} tone={g.tone} title={g.label}
                  hint={`${g.items.length} ${g.items.length === 1 ? 'documento' : 'documentos'}`} />
                <ul className="divide-y divide-line">{g.items.map((doc) => <li key={doc.id}><DocumentRow doc={doc} /></li>)}</ul>
              </section>
            ))}
          </div>

          <p className="flex items-start gap-2 text-xs text-muted">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-ink" aria-hidden="true" />
            Solo las personas de tu empresa con acceso al portal ven estos documentos. ¿Te falta alguno? Pedíselo a tu ejecutivo de cuenta.
          </p>
        </>
      )}
    </div>
  );
}
