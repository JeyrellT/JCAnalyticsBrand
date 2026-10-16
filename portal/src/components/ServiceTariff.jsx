import { BookOpen, Sparkles } from 'lucide-react';
import { SERVICE_PRICING } from '../../shared/service-pricing.js';
import { formatMoney } from '../lib/format.js';

const usd = (amount) => `US${formatMoney(amount * 100, 'USD', { decimals: 0 })}`;

/** Source prices remain separate from the administrator's current operational price. */
export default function ServiceTariff({ service, compact = false }) {
  const pricing = SERVICE_PRICING[service.key];
  if (!pricing) return null;
  const changed = service.price_from_usd !== pricing.base_usd || !!service.unit;
  const figures = [
    ['Base', usd(pricing.base_usd)],
    [pricing.ai_included ? 'IA incluida' : 'Total con IA', usd(pricing.with_ai_usd)],
    ['Soporte mensual', pricing.support_monthly_usd ? `${usd(pricing.support_monthly_usd)}/mes` : 'No aplica'],
  ];
  if (compact) return <div className="rounded-xl border border-line bg-surface-2 p-3" data-service-tariff={service.key}>
    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Tarifario de referencia · sin impuestos</p>
    <dl className="mt-2 grid grid-cols-3 gap-2">{figures.map(([label, value]) => <div className="min-w-0" key={label}><dt className="text-[10px] text-muted">{label}</dt><dd className="mt-1 break-words text-xs font-semibold text-ink">{value}</dd></div>)}</dl>
    {changed && <p className="mt-2 text-[10px] leading-relaxed text-muted">El precio del portal tiene un ajuste propio.</p>}
  </div>;

  return <section className="card overflow-hidden" aria-labelledby="service-tariff-title" data-service-tariff={service.key}>
    <div className="flex items-start gap-3 border-b border-line bg-surface-2 p-4 sm:p-5"><BookOpen className="mt-1 shrink-0 text-brand-ink" size={21} /><div><h2 id="service-tariff-title" className="font-display text-lg font-bold">Tarifario de referencia</h2><p className="mt-1 text-xs leading-relaxed text-muted">Implementación por el alcance descrito. USD sin impuestos; los consumos y licencias se cotizan aparte.</p></div></div>
    <div className="space-y-5 p-4 sm:p-5">
      <dl className="grid gap-3 sm:grid-cols-3">{figures.map(([label, value]) => <div className="min-w-0 rounded-xl bg-surface-2 p-4" key={label}><dt className="text-xs text-muted">{label}</dt><dd className="mt-2 break-words font-display text-xl font-bold text-ink">{value}</dd>{label === 'Soporte mensual' && pricing.support_hours_per_week > 0 && <p className="mt-1 text-xs text-muted">{pricing.support_hours_per_week} horas por semana</p>}</div>)}</dl>
      {changed && <p className="rounded-xl bg-amber-soft p-3 text-xs leading-relaxed text-amber-ink">El precio operativo que aparece arriba fue ajustado en el portal. Esta referencia conserva las tarifas del documento y no reemplaza ese ajuste.</p>}
      <div><h3 className="text-sm font-semibold">Alcance base</h3><p className="mt-1.5 text-sm leading-relaxed text-ink-2">{pricing.scope}</p><p className="mt-2 text-xs leading-relaxed text-muted">{pricing.exclusions}</p></div>
      <div className="flex items-start gap-2 rounded-xl bg-brand-soft p-3 text-sm leading-relaxed text-brand-ink"><Sparkles className="mt-0.5 shrink-0" size={17} /><div><strong>{pricing.ai_included ? 'IA incluida' : 'Función de la opción con IA'}</strong><p>{pricing.ai_scope}</p></div></div>
      <p className="text-xs leading-relaxed text-muted">Plazo estimado: {pricing.days_min ? `${pricing.days_min}–${pricing.days_max} días hábiles` : `${pricing.weeks_min}–${pricing.weeks_max} semanas`}, desde que estén completos los datos, contenidos y accesos. Incluye capacitación, guía y 30 días de corrección de defectos del alcance.</p>
      <details className="rounded-xl border border-line p-3"><summary className="cursor-pointer text-sm font-semibold">Adicionales de este servicio</summary><ul className="mt-3 divide-y divide-line">{pricing.extras.map((item) => <li key={item.key} className="flex items-start justify-between gap-4 py-2 text-xs"><span className="text-ink-2">{item.label}</span><strong className="shrink-0">{usd(item.price_usd)}</strong></li>)}</ul><p className="mt-2 text-xs leading-relaxed text-muted">Se aprueban por separado. Una función ya incluida en la opción con IA no se cobra de nuevo como adicional.</p></details>
      <p className="break-words border-t border-line pt-3 text-[11px] leading-relaxed text-muted"><strong>Fuente:</strong> {pricing.source.file} · diapositivas {pricing.source.slides.join(' y ')}. Se usan las tablas y fichas de precios fijos.</p>
    </div>
  </section>;
}
