// Brief creativo imprimible (v5): documento A4 con el formato "CREATIVIDAD" de JC Analytics.
// Se monta SIN el Layout del portal: /briefs/:id/imprimir (equipo) y
// /cliente/solicitudes/:id/imprimir (cliente, audience="client"). Con ?version=N imprime
// la versión congelada; sin versión, la vigente (congelada si ya se envió, o el borrador).
import { useEffect, useState } from 'react';
import { ArrowLeft, Printer, Fingerprint, ShieldCheck, ShieldAlert, FileText } from 'lucide-react';
import { BRIEF_FIELDS, briefFieldText } from '../../shared/brief.js';
import { useResource } from '../lib/session.jsx';
import { Link, navigate, useLocation } from '../lib/router.jsx';
import { PageLoader, cx } from '../components/ui.jsx';
import { briefApi, briefPath, briefPrintPath, briefStatusMeta, boolText, formatDateLong, formatSendRangeLong, splitLabel } from '../components/brief/brief-ui.js';
import { formatDateTime } from '../lib/format.js';
import logoMark from '../assets/logo-mark.webp';

/**
 * La hoja es "papel": siempre en tema claro, también con el portal en oscuro y al imprimir.
 * Se redefinen los tokens en la hoja; las clases (bg-surface, text-ink…) resuelven con estos valores.
 */
const PAPER = {
  colorScheme: 'light',
  '--surface': '#ffffff', '--surface-2': '#f3f6fa', '--surface-3': '#e4e9f1',
  '--line': '#d9e0ea', '--line-strong': '#b9c4d3',
  '--ink': '#071a36', '--ink-2': '#2c3f5d', '--muted': '#5b6b82', '--muted-2': '#8b99ad',
  '--brand': '#0065df', '--brand-soft': '#e6effc', '--brand-ink': '#0050b4',
  '--teal': '#00a6b2', '--teal-soft': '#dff3f4', '--teal-ink': '#067079',
  '--coral': '#d65a45', '--coral-soft': '#fcebe7', '--coral-ink': '#b2432f',
  '--amber': '#e39a1b', '--amber-soft': '#fdf2db', '--amber-ink': '#8a5a00',
  '--violet': '#7a5af5', '--violet-soft': '#eee9fe', '--violet-ink': '#5a3fd0',
  '--slate': '#94a3b8', '--slate-soft': '#eef1f6', '--slate-ink': '#4b5a70',
  '--contrast': '#071a36', '--contrast-fg': '#ffffff',
};

const F = BRIEF_FIELDS;
const label = (key) => splitLabel(F[key]?.label ?? key)[0];
const empty = (v) => v == null || v === '' || (Array.isArray(v) && v.length === 0);

/** Casilla "Confirmar con una X", como en el formato original. */
function Box({ on }) {
  return (
    <span className={cx('mr-2 inline-flex h-[13px] w-[13px] shrink-0 items-center justify-center border-[1.5px] align-[-2px] text-[10px] font-black leading-none', on ? 'border-ink text-ink' : 'border-muted-2 text-transparent')} aria-hidden="true">X</span>
  );
}

function Check({ value, k }) {
  const [on, off] = boolText(k);
  return <span className="inline-flex items-start"><Box on={!!value} /><span className={value ? 'font-semibold text-ink' : 'text-muted'}>{value ? on : off}</span></span>;
}

const Empty = ({ children = '—' }) => <span className="text-muted-2">{children}</span>;
const Text = ({ value, pre = false }) => (empty(value) ? <Empty /> : <span className={cx('break-words [overflow-wrap:anywhere]', pre && 'whitespace-pre-line')}>{value}</span>);

/**
 * Filas del documento en el orden del formato CREATIVIDAD (material, objetivo, marca,
 * correo de testeo, oferta, URLs, editable, creatividad, envío, mensaje, RRSS, base,
 * fecha, disclaimer, línea gráfica, nota) con los campos complementarios junto a su
 * pariente. Los campos nuevos que no estén acá se agregan al final, así nunca se pierden.
 */
function documentRows(d) {
  const links = Array.isArray(d.links) ? d.links : [];
  const usesEmail = Array.isArray(d.materials) && d.materials.includes('email');
  const rows = [
    { keys: ['materials', 'materials_other'], label: label('materials'), value: empty(d.materials) ? <Empty /> : <span>{briefFieldText('materials', d.materials)}{d.materials_other ? <span className="text-ink-2"> · Otro: {d.materials_other}</span> : null}</span> },
    { keys: ['objective'], label: label('objective'), value: empty(d.objective) ? <Empty /> : <span className="font-semibold">{briefFieldText('objective', d.objective)}</span> },
    { keys: ['kpi_target'], label: label('kpi_target'), value: <Text value={d.kpi_target} /> },
    { keys: ['brand'], label: label('brand'), value: empty(d.brand) ? <Empty /> : <span className="font-semibold">{d.brand}</span> },
    { keys: ['test_email'], label: label('test_email'), value: !usesEmail && empty(d.test_email) ? <Empty>No aplica (sin email marketing)</Empty> : <Text value={d.test_email} /> },
    { keys: ['offer'], label: label('offer'), value: <Text value={d.offer} pre /> },
    ...[0, 1, 2].map((i) => ({
      keys: i === 0 ? ['links'] : [],
      label: `${label('links')} ${i + 1}`,
      value: links[i]
        ? <span className="break-all"><span className="font-semibold">{links[i].label}</span><span className="text-muted"> · </span>{links[i].url}</span>
        : <Empty />,
    })),
    { keys: ['editable_format'], label: label('editable_format'), value: empty(d.editable_format) ? <Empty /> : briefFieldText('editable_format', d.editable_format) },
    { keys: ['includes_creative'], label: label('includes_creative'), hint: 'Confirmar con una X', value: <Check k="includes_creative" value={d.includes_creative} /> },
    { keys: ['send_setup'], label: 'Configuración de envío', value: <Check k="send_setup" value={d.send_setup} /> },
    { keys: ['key_message'], label: label('key_message'), value: <Text value={d.key_message} pre /> },
    { keys: ['cta'], label: label('cta'), value: <Text value={d.cta} /> },
    { keys: ['tone'], label: label('tone'), value: empty(d.tone) ? <Empty /> : briefFieldText('tone', d.tone) },
    { keys: ['social_accounts'], label: label('social_accounts'), value: <Text value={d.social_accounts} pre /> },
    { keys: ['database_segment'], label: label('database_segment'), value: <Text value={d.database_segment} pre /> },
    { keys: ['send_start', 'send_end'], label: 'Fecha de envío', value: d.send_start ? <span className="font-semibold">{formatSendRangeLong(d.send_start, d.send_end)}</span> : <Empty /> },
    { keys: ['disclaimer'], label: label('disclaimer'), value: <Text value={d.disclaimer} pre /> },
    {
      keys: ['is_contest', 'promo_rules_url'],
      label: 'Sorteo, giveaway o concurso',
      value: <span><Check k="is_contest" value={d.is_contest} />{d.is_contest && d.promo_rules_url && <span className="mt-1 block break-all text-ink-2">Reglamento: {d.promo_rules_url}</span>}</span>,
    },
    { keys: ['graphic_line'], label: label('graphic_line'), value: <Text value={d.graphic_line} pre /> },
    { keys: ['brand_guide_url'], label: label('brand_guide_url'), value: empty(d.brand_guide_url) ? <Empty /> : <span className="break-all">{d.brand_guide_url}</span> },
    { keys: ['notes'], label: label('notes'), value: <Text value={d.notes} pre /> },
  ];
  const covered = new Set([...rows.flatMap((r) => r.keys), 'rights_confirmed']);
  for (const f of Object.values(F)) {
    if (covered.has(f.key) || (f.when && !f.when(d))) continue;
    rows.push({ keys: [f.key], label: label(f.key), value: f.type === 'bool' ? <Check k={f.key} value={d[f.key]} /> : <Text value={briefFieldText(f, d[f.key])} pre /> });
  }
  return rows;
}

function Meta({ label: l, children, className }) {
  return (
    <div className={cx('min-w-0 border-b border-r border-line px-3 py-2', className)}>
      <dt className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted">{l}</dt>
      <dd className="mt-0.5 break-words text-[12px] font-semibold leading-snug text-ink [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

function BriefDocument({ brief: b, data, title, versionNumber, version, audience, generatedAt }) {
  const frozen = !!version;
  const status = briefStatusMeta(b.status, audience);
  const rows = documentRows(data);
  return (
    <article className="brief-print mx-auto w-full max-w-[210mm] bg-surface text-ink shadow-pop sm:rounded-[3px] print:max-w-none print:rounded-none print:shadow-none" style={PAPER}>
      <div className="px-5 pb-8 pt-6 sm:px-[14mm] sm:pb-[14mm] sm:pt-[12mm] print:p-0">
        {/* Encabezado: logo a la izquierda, CREATIVIDAD a la derecha (como el formato original). */}
        <header className="flex items-center justify-between gap-4 pb-4">
          <div className="flex min-w-0 items-center gap-3">
            <img src={logoMark} alt="JC Analytics" className="h-11 w-11 shrink-0 object-contain sm:h-14 sm:w-14" />
            <div className="min-w-0">
              <p className="font-display text-lg font-bold leading-none tracking-tight text-ink sm:text-[22px]">JC Analytics</p>
              <p className="mt-1.5 text-[9.5px] font-semibold uppercase tracking-[0.18em] text-teal-ink">www.jcanalytic.com</p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-display text-[19px] font-extrabold leading-none tracking-[0.14em] text-ink sm:text-[26px]">CREATIVIDAD</p>
            <p className="mt-1.5 text-[9.5px] font-bold uppercase tracking-[0.2em] text-muted">Brief creativo</p>
          </div>
        </header>
        <div className="brief-print-rule h-[3px] rounded-full" style={{ backgroundImage: 'linear-gradient(90deg, var(--brand), var(--teal))' }} aria-hidden="true" />

        <section className="mt-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-teal-ink">Requerimiento</p>
            <h1 className="mt-1 break-words font-display text-[20px] font-bold leading-tight text-ink sm:text-[23px]">{title}</h1>
          </div>
          {!frozen && (
            <span className="mt-1 shrink-0 rounded-md border-[1.5px] border-amber px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-amber-ink">Borrador · sin enviar</span>
          )}
        </section>

        <dl className="mt-4 grid grid-cols-2 border-l border-t border-line sm:grid-cols-4">
          <Meta label="Código"><span className="font-mono">{b.code}</span></Meta>
          <Meta label="Versión">{frozen ? `v${versionNumber}${b.approved_version === versionNumber ? ' · aprobada' : ''}` : b.version ? `Cambios sobre v${b.version}` : 'Sin enviar'}</Meta>
          <Meta label="Estado actual">{status.label}</Meta>
          <Meta label={frozen ? 'Enviada' : 'Actualizado'}>{formatDateLong((frozen ? version.created_at : b.updated_at).slice(0, 10))}</Meta>
          <Meta label="Cliente" className="col-span-2 sm:col-span-1">{b.client_name}</Meta>
          <Meta label="Proyecto" className="col-span-2 sm:col-span-1">{b.project_name ?? '—'}</Meta>
          <Meta label="Responsable JC">{b.owner_name ?? '—'}</Meta>
          <Meta label={frozen ? 'Enviada por' : 'Creado por'}>{frozen ? `${version.submitted_by_name ?? '—'}${version.submitted_by_type === 'cliente' ? ' (cliente)' : ''}` : b.created_by?.name ?? '—'}</Meta>
        </dl>

        {/* Tabla etiqueta/valor; en el celular cada fila se apila (etiqueta arriba) para no partir palabras. */}
        <table className="mt-5 w-full table-fixed border-collapse text-[12.5px] leading-relaxed max-sm:block">
          <caption className="sr-only">Contenido del brief</caption>
          <colgroup className="max-sm:hidden"><col className="w-[31%]" /><col /></colgroup>
          <tbody className="max-sm:block">
            {rows.map((r) => (
              <tr key={r.label} className="brief-print-row max-sm:-mt-px max-sm:block">
                <th scope="row" className="border border-line bg-surface-2 px-3 py-2 text-left align-top text-[10.5px] font-bold uppercase leading-snug tracking-[0.06em] text-ink-2 max-sm:block max-sm:border-b-0 max-sm:py-1.5">
                  {r.label}
                  {r.hint && <span className="mt-0.5 block text-[9.5px] font-medium normal-case tracking-normal text-muted max-sm:ml-1.5 max-sm:mt-0 max-sm:inline">({r.hint})</span>}
                </th>
                <td className="border border-line px-3 py-2 align-top text-ink max-sm:block">{r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <section className="brief-print-row mt-4 rounded-md border border-line px-3 py-2.5 text-[11.5px] leading-relaxed text-ink-2">
          <span className="inline-flex items-start"><Box on={data.rights_confirmed === true} /><span>{F.rights_confirmed?.label}</span></span>
        </section>

        <footer className="brief-print-row mt-6 border-t border-line pt-3 text-[10px] leading-relaxed text-muted">
          {frozen ? (
            <div className="flex items-start gap-2.5">
              <Fingerprint className="mt-0.5 h-4 w-4 shrink-0 text-ink-2" aria-hidden="true" />
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-x-2 font-bold uppercase tracking-[0.12em] text-ink-2">
                  Huella SHA-256 · versión {versionNumber}
                  {version.hash_ok
                    ? <span className="inline-flex items-center gap-1 normal-case tracking-normal text-teal-ink"><ShieldCheck className="h-3 w-3" aria-hidden="true" />verificada</span>
                    : <span className="inline-flex items-center gap-1 normal-case tracking-normal text-coral-ink"><ShieldAlert className="h-3 w-3" aria-hidden="true" />no coincide con el contenido</span>}
                </p>
                <p className="mt-0.5 break-all font-mono text-[10px] text-ink-2">{version.hash}</p>
                <p className="mt-0.5">Cualquier cambio en el contenido de esta versión cambiaría la huella.</p>
              </div>
            </div>
          ) : (
            <p className="flex items-start gap-2"><FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />Borrador sin enviar: todavía no tiene huella. Al enviarse se congela una versión con su huella SHA-256.</p>
          )}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-line pt-2">
            <span className="font-semibold text-ink-2">Documento confidencial · JC Analytics</span>
            <span>Generado el {formatDateTime(generatedAt)}</span>
          </div>
        </footer>
      </div>
    </article>
  );
}

/**
 * @param {object} p
 * @param {{ id: string }} p.params
 * @param {'team'|'client'} [p.audience]
 */
export default function BriefPrint({ params, audience = 'team' }) {
  const { query } = useLocation();
  const base = briefApi(audience);
  const requested = Number(query.get('version')) || null;
  const main = useResource(`${base}/${params.id}`);
  const b = main.data?.brief ?? null;
  const versions = main.data?.versions ?? [];
  // Sin ?version: si ya se envió y está congelado, se imprime la versión vigente (con su huella).
  const number = requested ?? (b && !b.editable && b.version > 0 ? b.version : null);
  const ver = useResource(b && number ? `${base}/${params.id}/versions/${number}` : null);
  const version = number ? ver.data?.version ?? null : null;
  const [generatedAt] = useState(() => new Date().toISOString());

  useEffect(() => {
    if (b) document.title = `${b.code}${number ? ` v${number}` : ''} · Brief creativo · JC Analytics`;
  }, [b, number]);

  const back = briefPath(audience, params.id);
  const loading = !b || (number && !version);
  const error = main.error ?? (number ? ver.error : null);

  return (
    <div className="min-h-dvh bg-bg print:min-h-0 print:bg-transparent">
      <div className="glass sticky top-0 z-30 border-b border-line print:hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="mx-auto flex max-w-[210mm] flex-wrap items-center gap-2 px-3 py-2.5 sm:px-4">
          <Link to={back} className="btn btn-ghost -ml-1 px-2.5"><ArrowLeft className="h-4 w-4" />Volver</Link>
          <div className="invisible min-w-0 flex-1 sm:visible">
            <p className="truncate text-sm font-semibold text-ink">{b ? `${b.code} · Vista para imprimir` : 'Vista para imprimir'}</p>
            <p className="hidden truncate text-xs text-muted sm:block">Para un PDF, elegí «Guardar como PDF» como destino.</p>
          </div>
          {b && versions.length > 0 && (
            <label className="min-w-0">
              <span className="sr-only">Versión a imprimir</span>
              <select className="input w-auto max-w-[13rem] py-1.5" value={number ?? ''} onChange={(e) => navigate(briefPrintPath(audience, params.id, Number(e.target.value) || null), { replace: true })}>
                {b.editable && <option value="">{b.version ? 'Borrador con cambios' : 'Borrador actual'}</option>}
                {versions.map((v) => <option key={v.version} value={v.version}>Versión {v.version}{v.version === b.approved_version ? ' · aprobada' : ''}</option>)}
              </select>
            </label>
          )}
          <button type="button" className="btn btn-primary" onClick={() => window.print()} disabled={!!loading}><Printer className="h-4 w-4" />Imprimir</button>
        </div>
      </div>

      <main className="px-3 py-5 sm:px-6 sm:py-8 print:p-0">
        {loading ? (
          <div className="print:hidden">
            <PageLoader error={error} onRetry={() => { main.reload(); ver.reload(); }} />
            {error && <p className="mt-3 text-center"><Link to={back} className="link">Volver al brief</Link></p>}
          </div>
        ) : (
          <BriefDocument brief={b} data={version?.data ?? b.data ?? {}} title={version?.title ?? b.title} versionNumber={number} version={version}
            audience={audience} generatedAt={generatedAt} />
        )}
      </main>
    </div>
  );
}
