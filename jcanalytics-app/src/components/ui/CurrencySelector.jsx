// ============================================================================
//  src/components/ui/CurrencySelector.jsx
//  Dropdown pill (bandera + código). Reexpresa el rango al cambiar de moneda.
// ============================================================================
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';

// eslint (sin plugin de react) no reconoce a `motion` usado solo como <motion.x>.
const _MOTION = motion;

export default function CurrencySelector({ activeCode, onChange, currencies }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const active = currencies.find((c) => c.code === activeCode) || currencies[0];

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Moneda: ${active.name}. Cambiar moneda`}
        className="tap-press inline-flex items-center gap-1.5 px-3 py-2 min-h-10 rounded-full bg-slate-800/80 hover:bg-slate-700 active:bg-slate-600 border border-slate-700 text-sm font-bold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
      >
        <span aria-hidden="true">{active.flag}</span>
        <span>{active.code}</span>
        <ChevronDown size={15} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            aria-label="Monedas disponibles"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 z-30 mt-2 w-60 max-h-72 overflow-y-auto custom-scrollbar rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-1.5"
          >
            {currencies.map((c) => {
              const selected = c.code === activeCode;
              return (
                <li key={c.code} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    onClick={() => { onChange(c.code); setOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                      selected ? 'bg-emerald-500/15 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span className="text-lg shrink-0" aria-hidden="true">{c.flag}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-bold leading-tight">{c.code}</span>
                      <span className="block text-xs text-slate-500 truncate">{c.name}</span>
                    </span>
                    {selected && <Check size={16} className="text-emerald-400 shrink-0" aria-hidden="true" />}
                  </button>
                </li>
              );
            })}
            <li className="px-3 pt-2 pb-1 text-[10px] text-slate-600 leading-snug">
              Tasas referenciales. Tu cotización formal se cierra en USD.
            </li>
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
