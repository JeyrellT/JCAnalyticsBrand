// Piezas de los servicios (líneas de negocio): precio, chip con enlace, ícono por área y selector agrupado.
import { Crown, Layers, MonitorSmartphone, BarChart3, Workflow, Calculator, Megaphone, GraduationCap, Package } from 'lucide-react';
import { Link } from '../lib/router.jsx';
import { cx } from './ui.jsx';
import { formatMoney } from '../lib/format.js';
import { SERVICES, SERVICE_GROUPS, SERVICE_DEFAULTS } from '../../shared/catalog.js';

/** Cómo se cobra: proyecto único (null), por mes o por pieza. */
export const SERVICE_UNITS = [
  { value: '', label: 'Proyecto único' },
  { value: 'mes', label: 'Por mes' },
  { value: 'pieza', label: 'Por pieza' },
];
const UNIT_SUFFIX = { mes: ' / mes', pieza: ' por pieza' };

/** Ícono de cada área de negocio (para mosaicos y encabezados). */
const GROUP_ICON = {
  sistemas: MonitorSmartphone,
  datos: BarChart3,
  automatizacion: Workflow,
  finanzas: Calculator,
  marketing: Megaphone,
  academico: GraduationCap,
  productos: Package,
};

export const serviceName = (key) => SERVICES[key] ?? key;
export const serviceGroup = (key) => SERVICE_DEFAULTS[key]?.group ?? 'sistemas';
export const groupTone = (group) => SERVICE_GROUPS[group]?.tone ?? 'slate';
export const groupIcon = (group) => GROUP_ICON[group] ?? Layers;

/**
 * Precio "desde" de un servicio en dos partes:
 * text = "Desde US$2 000 / mes" (o "A convenir"), approx = "≈ ₡1 020 000" si hay tipo de cambio.
 */
export function priceParts(service, fx) {
  const usd = service?.price_from_usd;
  if (usd == null) return { text: 'A convenir', approx: null };
  const suffix = UNIT_SUFFIX[service.unit] ?? '';
  const rate = Number(fx);
  return {
    text: `Desde US${formatMoney(usd * 100, 'USD', { decimals: 0 })}${suffix}`,
    approx: rate > 0 && usd > 0 ? `≈ ${formatMoney(Math.round(usd * rate) * 100, 'CRC', { decimals: 0 })}` : null,
  };
}

/** "Desde US$2 000 / mes · ≈ ₡1 020 000" en una sola línea. */
export function priceLabel(service, fx) {
  const { text, approx } = priceParts(service, fx);
  return approx ? `${text} · ${approx}` : text;
}

/** Chip con enlace al servicio; con `lead` marca que la persona lo lidera. */
export function ServiceChip({ serviceKey, name, lead = false, className }) {
  const tone = groupTone(serviceGroup(serviceKey));
  return (
    <Link to={`/servicios/${serviceKey}`} title={lead ? 'Lidera este servicio' : undefined}
      className={cx('chip relative z-10 max-w-full px-2.5 py-1 text-xs transition hover:brightness-95 active:scale-[0.98]', `tone-${tone}`, className)}>
      {lead && <Crown className="h-3 w-3 shrink-0" aria-label="Líder" />}
      <span className="truncate">{name ?? serviceName(serviceKey)}</span>
    </Link>
  );
}

/** Selector de servicio agrupado por área de negocio. Devuelve la clave o null. */
export function ServiceSelect({ value, onChange, id, placeholder = 'Elegí un servicio', className, ...props }) {
  const groups = Object.entries(SERVICE_GROUPS).map(([group, meta]) => ({
    group, label: meta.label, keys: Object.keys(SERVICES).filter((k) => serviceGroup(k) === group),
  })).filter((g) => g.keys.length);
  return (
    <select id={id} className={cx('input', className)} value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} {...props}>
      {placeholder !== null && <option value="">{placeholder}</option>}
      {groups.map((g) => (
        <optgroup key={g.group} label={g.label}>
          {g.keys.map((k) => <option key={k} value={k}>{SERVICES[k]}</option>)}
        </optgroup>
      ))}
    </select>
  );
}
