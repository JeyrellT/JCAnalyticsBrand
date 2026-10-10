// Piezas de dominio reutilizadas entre secciones.
import { useState } from 'react';
import { CircleAlert, Clock3, CheckCircle2 } from 'lucide-react';
import { Badge, Avatar, cx } from './ui.jsx';
import { useSession } from '../lib/session.jsx';
import { formatMoney, toMinor } from '../lib/format.js';

export function StatusBadge({ map, value, dot = true }) {
  const meta = map[value];
  if (!meta) return null;
  return <Badge tone={meta.tone} dot={dot}>{meta.label}</Badge>;
}

/** Semáforo del compromiso de avance al cliente. */
export function SlaBadge({ state, hours }) {
  if (!state) return null;
  const meta = {
    ok: { tone: 'teal', icon: CheckCircle2, text: `Avance al día · ${hours} h` },
    warn: { tone: 'amber', icon: Clock3, text: `Avance pronto · ${hours} h` },
    late: { tone: 'red', icon: CircleAlert, text: `Sin avance · ${hours} h` },
  }[state];
  return <Badge tone={meta.tone}><meta.icon className="h-3 w-3" />{meta.text}</Badge>;
}

export function PersonSelect({ value, onChange, id, placeholder = 'Sin asignar', people, className }) {
  const { activeTeam } = useSession();
  const list = people ?? activeTeam;
  return (
    <select id={id} className={cx('input', className)} value={value ?? ''} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}>
      {placeholder !== null && <option value="">{placeholder}</option>}
      {list.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
    </select>
  );
}

export function PeoplePicker({ value = [], onChange }) {
  const { activeTeam } = useSession();
  const toggle = (uid) => onChange(value.includes(uid) ? value.filter((x) => x !== uid) : [...value, uid]);
  return (
    <div className="flex flex-wrap gap-2">
      {activeTeam.map((u) => {
        const on = value.includes(u.id);
        return (
          <button key={u.id} type="button" onClick={() => toggle(u.id)} aria-pressed={on}
            className={cx('flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm transition', on ? 'border-brand bg-brand-soft font-semibold text-brand' : 'border-line bg-white text-muted hover:border-slate-300')}>
            <Avatar name={u.name} color={u.color} size={24} />
            {u.name.split(' ')[0]}
          </button>
        );
      })}
    </div>
  );
}

export function PersonChip({ name, color, size = 22 }) {
  if (!name) return <span className="text-xs text-muted">Sin asignar</span>;
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-medium text-ink">
      <Avatar name={name} color={color} size={size} />
      <span className="truncate">{name.split(' ')[0]}</span>
    </span>
  );
}

/**
 * Entrada de dinero: acepta "1.250.000", "1250000,50", etc., y muestra cómo
 * se interpretó. Devuelve unidades menores (entero) o null.
 */
export function MoneyInput({ id, value, onChange, currency = 'CRC', placeholder }) {
  const [raw, setRaw] = useState(value != null ? String(value / 100).replace('.', ',') : '');
  const parsed = toMinor(raw);
  return (
    <div>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-semibold text-muted">{currency === 'USD' ? '$' : '₡'}</span>
        <input id={id} className="input pl-7 tabular" inputMode="decimal" autoComplete="off" placeholder={placeholder ?? (currency === 'USD' ? '0,00' : '0')} value={raw}
          onChange={(e) => { setRaw(e.target.value); onChange(toMinor(e.target.value)); }} />
      </div>
      {raw && <p className={cx('mt-1 text-xs', parsed == null || parsed <= 0 ? 'text-coral' : 'text-muted')}>{parsed == null ? 'Monto no válido' : `Se registrará: ${formatMoney(parsed, currency)}`}</p>}
    </div>
  );
}
