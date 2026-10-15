// ============================================================================
//  components/brief/BriefVersions.jsx
//  Versiones congeladas del brief (cada envío) con su huella SHA-256, el
//  detalle de una versión con la verificación de integridad, y los
//  entregables ligados al brief. Sirve al equipo y al cliente (audience).
// ============================================================================
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, ShieldAlert, Eye, Printer, Fingerprint, PackageCheck, ExternalLink, Copy } from 'lucide-react';
import { DELIVERABLE_STATUS } from '../../../shared/client-portal.js';
import { Badge, Modal, PageLoader, RowArrow, useToast, cx } from '../ui.jsx';
import { StatusBadge } from '../common.jsx';
import { Link } from '../../lib/router.jsx';
import { useResource } from '../../lib/session.jsx';
import { formatDateTime, timeAgo } from '../../lib/format.js';
import { BriefView } from './BriefView.jsx';
import { briefApi, briefPrintPath, shortHash } from './brief-ui.js';

/** Sello de integridad: la huella guardada coincide (o no) con la recalculada por el servidor. */
export function HashSeal({ ok, className }) {
  return ok
    ? <Badge tone="teal" className={className}><ShieldCheck className="h-3 w-3" aria-hidden="true" />Huella verificada</Badge>
    : <Badge tone="red" className={className}><ShieldAlert className="h-3 w-3" aria-hidden="true" />Alterada: la huella no coincide</Badge>;
}

/** Huella completa con botón para copiarla. */
export function HashLine({ hash, className }) {
  const toast = useToast();
  async function copy() {
    try {
      await navigator.clipboard.writeText(hash);
      toast('Huella copiada');
    } catch {
      toast('No se pudo copiar. Seleccioná el texto.', 'error');
    }
  }
  return (
    <div className={cx('flex items-start gap-2 rounded-xl bg-surface-2 px-3 py-2', className)}>
      <Fingerprint className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
      <code className="min-w-0 flex-1 select-all break-all font-mono text-[11.5px] leading-relaxed text-ink-2">{hash}</code>
      <button type="button" className="btn btn-ghost btn-sm -my-1 -mr-1 shrink-0" onClick={copy} aria-label="Copiar huella" title="Copiar huella"><Copy className="h-3.5 w-3.5" /></button>
    </div>
  );
}

function VersionModal({ briefId, number, audience, onClose }) {
  const { data, error, reload } = useResource(`${briefApi(audience)}/${briefId}/versions/${number}`);
  const v = data?.version;
  return (
    <Modal open onClose={onClose} title={`Versión ${number}${v ? ` · ${v.code}` : ''}`} size="lg"
      footer={<>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cerrar</button>
        <Link to={briefPrintPath(audience, briefId, number)} className="btn btn-outline"><Printer className="h-4 w-4" />Imprimir esta versión</Link>
      </>}>
      {!v ? <PageLoader error={error} onRetry={reload} /> : (
        <div className="space-y-4">
          <div className={cx('rounded-2xl border p-3.5', v.hash_ok ? 'border-teal/30 bg-teal-soft/60' : 'border-coral/40 bg-coral-soft')}>
            <div className="flex flex-wrap items-center gap-2">
              <HashSeal ok={v.hash_ok} />
              <span className="text-xs text-muted">Enviada por <span className="font-semibold text-ink">{v.submitted_by_name ?? '—'}</span>{v.submitted_by_type === 'cliente' ? ' (cliente)' : ' (JC Analytics)'} · {formatDateTime(v.created_at)}</span>
            </div>
            <p className="mt-2 text-xs text-ink-2">
              {v.hash_ok
                ? 'El contenido es exactamente el que se envió: la huella SHA-256 guardada coincide con la recalculada.'
                : 'El contenido guardado no coincide con su huella original. Avisá al administrador del portal.'}
            </p>
            <HashLine hash={v.hash} className="mt-2.5 bg-surface/80" />
          </div>
          <BriefView data={v.data} title={v.title} compact />
        </div>
      )}
    </Modal>
  );
}

/**
 * Lista de versiones enviadas.
 * @param {object} p
 * @param {number} p.briefId
 * @param {object[]} p.versions   [{ version, title, hash, created_at, submitted_by_type, submitted_by_name }] (más nueva primero)
 * @param {'team'|'client'} [p.audience]
 * @param {number|null} [p.approvedVersion]
 */
export function BriefVersions({ briefId, versions = [], audience = 'team', approvedVersion = null, emptyText }) {
  const [open, setOpen] = useState(null);
  if (!versions.length) {
    return <p className="px-4 py-4 text-sm text-muted sm:px-5">{emptyText ?? 'Todavía no hay versiones: se congela una cada vez que se envía.'}</p>;
  }
  return (
    <>
      <ul className="divide-y divide-line">
        {versions.map((v) => (
          <li key={v.version} className="flex items-center gap-3 px-4 py-3 sm:px-5">
            <span className="num flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-3 text-sm font-bold text-ink-2">v{v.version}</span>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-ink">
                Versión {v.version}
                {approvedVersion === v.version && <Badge tone="teal">Aprobada</Badge>}
              </p>
              <p className="truncate text-xs text-muted" title={formatDateTime(v.created_at)}>
                {v.submitted_by_name ?? '—'}{v.submitted_by_type === 'cliente' ? ' (cliente)' : ''} · {timeAgo(v.created_at)}
              </p>
              <p className="mt-0.5 flex items-center gap-1 font-mono text-[11px] text-muted-2" title={`SHA-256 ${v.hash}`}>
                <Fingerprint className="h-3 w-3" aria-hidden="true" /><span className="sr-only">Huella </span>{shortHash(v.hash)}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <button type="button" className="btn btn-outline btn-sm min-h-9" onClick={() => setOpen(v.version)} aria-label={`Ver versión ${v.version}`}><Eye className="h-3.5 w-3.5" />Ver</button>
              <Link to={briefPrintPath(audience, briefId, v.version)} className="btn btn-ghost btn-sm min-h-9 px-2" aria-label={`Imprimir versión ${v.version}`} title="Imprimir / PDF"><Printer className="h-3.5 w-3.5" /></Link>
            </div>
          </li>
        ))}
      </ul>
      {/* Al body: dentro de una tarjeta animada (transform), un modal fijo quedaría recortado. */}
      {open != null && createPortal(<VersionModal briefId={briefId} number={open} audience={audience} onClose={() => setOpen(null)} />, document.body)}
    </>
  );
}

/**
 * Entregables ligados al brief. El equipo va al proyecto (o al cliente);
 * el cliente, a la ficha del entregable en su portal.
 */
export function BriefDeliverables({ deliverables = [], audience = 'team', emptyText }) {
  if (!deliverables.length) {
    return <p className="px-4 py-4 text-sm text-muted sm:px-5">{emptyText ?? (audience === 'client' ? 'Cuando compartamos piezas de esta solicitud, aparecen aquí para que las revisés.' : 'Todavía no hay entregables ligados a este brief. Se comparten desde la ficha del proyecto.')}</p>;
  }
  return (
    <ul className="divide-y divide-line">
      {deliverables.map((d) => {
        const to = audience === 'client' ? `/cliente/entregables/${d.id}` : d.project_id ? `/proyectos/${d.project_id}` : `/clientes/${d.client_id}`;
        return (
          <li key={d.id} className="group relative flex items-center gap-3 px-4 py-3 transition hover:bg-surface-2 sm:px-5">
            <span className={cx('icon-tile icon-tile-sm', `tile-${DELIVERABLE_STATUS[d.status]?.tone ?? 'slate'}`)} aria-hidden="true"><PackageCheck className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1">
              <Link to={to} className="block truncate text-sm font-semibold text-ink after:absolute after:inset-0 group-hover:text-brand-ink">{d.title}</Link>
              <p className="truncate text-xs text-muted">v{d.version} · {d.shared_by_name ? `${d.shared_by_name} · ` : ''}{timeAgo(d.shared_at)}</p>
            </div>
            <StatusBadge map={DELIVERABLE_STATUS} value={d.status} />
            {d.url && (
              <a href={d.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm relative z-10 min-h-9 px-2" aria-label={`Abrir ${d.title}`} title="Abrir enlace">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            <RowArrow className="hidden sm:block" />
          </li>
        );
      })}
    </ul>
  );
}
