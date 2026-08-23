// ============================================================================
//  src/components/ui/QuoteEstimator.jsx
//  Cotizador simple: 3 decisiones (tipo · tamaño · complejidad) + urgencia.
//  Proyectos desde $30 (Excel puntual) hasta $6.000 (software a la medida),
//  convertible a LatAm. El cliente ve SOLO rango + ventana de entrega.
// ============================================================================
import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

// eslint (sin plugin de react) no reconoce a `motion` usado solo como <motion.x>.
const _MOTION = motion;
import {
  BarChart3, Zap, Layers, Cpu, Database, MonitorSmartphone, Settings, Lightbulb, Receipt, Globe,
  ArrowRight, Clock, CheckCircle, ShieldCheck, Calculator, MessageSquare, ChevronUp,
} from 'lucide-react';
import {
  SERVICES, SERVICE_ORDER, COMPLEXITY_UI, SIZE_UI, URGENCY_UI, GUARANTEE_BULLETS, estimate,
} from '../../data/cotizador';
import { FX_UPDATED } from '../../data/currencies';
import { useCurrency } from '../../hooks/useCurrency';
import CurrencySelector from './CurrencySelector';

const ICONS = { BarChart3, Zap, Layers, Cpu, Database, MonitorSmartphone, Settings, Lightbulb, Receipt, Globe };

const ACCENT = {
  blue:    { card: 'border-blue-500/60 bg-blue-500/10',       icon: 'text-blue-400' },
  emerald: { card: 'border-emerald-500/60 bg-emerald-500/10', icon: 'text-emerald-400' },
  amber:   { card: 'border-amber-500/60 bg-amber-500/10',     icon: 'text-amber-400' },
  purple:  { card: 'border-purple-500/60 bg-purple-500/10',   icon: 'text-purple-400' },
  cyan:    { card: 'border-cyan-500/60 bg-cyan-500/10',       icon: 'text-cyan-400' },
  red:     { card: 'border-red-500/60 bg-red-500/10',         icon: 'text-red-400' },
  orange:  { card: 'border-orange-500/60 bg-orange-500/10',   icon: 'text-orange-400' },
  green:   { card: 'border-green-500/60 bg-green-500/10',     icon: 'text-green-400' },
  violet:  { card: 'border-violet-500/60 bg-violet-500/10',   icon: 'text-violet-400' },
};
const DOT = {
  emerald: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]',
  amber:   'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]',
  red:     'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.8)]',
  blue:    'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]',
};
const SEG_ACTIVE = {
  emerald: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
  amber:   'bg-amber-500/10 border-amber-500/30 text-amber-300',
  red:     'bg-red-500/10 border-red-500/30 text-red-300',
  blue:    'bg-blue-500/10 border-blue-500/30 text-blue-300',
};

// Toggle segmentado (calca el patrón visual existente)
function SegmentedToggle({ options, value, onChange }) {
  return (
    <div className="flex gap-2" role="radiogroup">
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id} type="button" role="radio" aria-checked={active}
            onClick={() => onChange(o.id)}
            className={`tap-press flex-1 flex flex-col items-center justify-center py-3 px-2 min-h-12 text-xs font-bold rounded-xl border transition-all duration-300 ${
              active ? SEG_ACTIVE[o.dot] || SEG_ACTIVE.blue
                     : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-700/40 active:bg-slate-700/60'
            }`}
          >
            <span className={`w-2 h-2 rounded-full mb-1.5 transition-colors ${active ? DOT[o.dot] || DOT.blue : 'bg-slate-600'}`} />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export default function QuoteEstimator() {
  const reduce = useReducedMotion();
  const { activeCode, setActiveCode, convert, currencyList } = useCurrency('USD');

  // ── Inputs (solo 3 decisiones + urgencia) ──────────────────────────────
  const [service, setService] = useState('power_bi');
  const [sizeIdx, setSizeIdx] = useState(1);            // 0..3 (Estándar por defecto)
  const [complexityId, setComplexityId] = useState('estandar');
  const [urgency, setUrgency] = useState('normal');

  const [touched, setTouched] = useState(() => new Set());
  const touch = (f) => setTouched((prev) => (prev.has(f) ? prev : new Set(prev).add(f)));

  // ── Envío (mailto) ───────────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [qName, setQName] = useState('');
  const [qEmail, setQEmail] = useState('');
  const [qPhone, setQPhone] = useState('');
  const [sent, setSent] = useState(false);

  const resultRef = useRef(null);
  const rootRef = useRef(null);
  const svc = SERVICES[service];

  // ── Barra resumen móvil ──────────────────────────────────────────────────
  // Solo tiene sentido mientras el usuario está DENTRO del cotizador y el
  // desglose no está a la vista (en móvil el resultado queda debajo de los
  // controles). Fuera de la sección desaparece — antes tapaba el footer y el
  // botón de WhatsApp en toda la página.
  const [inSection, setInSection] = useState(false);
  const [resultVisible, setResultVisible] = useState(false);
  const showBar = inSection && !resultVisible;

  useEffect(() => {
    const rootEl = rootRef.current;
    const resultEl = resultRef.current;
    if (!rootEl || !resultEl) return undefined;

    const sectionObs = new IntersectionObserver(
      ([entry]) => setInSection(entry.isIntersecting),
      { rootMargin: '-15% 0px -10% 0px', threshold: 0 }
    );
    const resultObs = new IntersectionObserver(
      ([entry]) => setResultVisible(entry.isIntersecting),
      { threshold: 0.35 }
    );
    sectionObs.observe(rootEl);
    resultObs.observe(resultEl);
    return () => {
      sectionObs.disconnect();
      resultObs.disconnect();
    };
  }, []);

  // El FAB de WhatsApp lee esta clase para subir y no tapar el CTA de la barra.
  useEffect(() => {
    document.body.classList.toggle('quote-bar-visible', showBar);
    return () => document.body.classList.remove('quote-bar-visible');
  }, [showBar]);

  const complexityScore = useMemo(
    () => COMPLEXITY_UI.find((c) => c.id === complexityId)?.score ?? 0,
    [complexityId],
  );
  const size = SIZE_UI[sizeIdx]?.val ?? 0;

  const result = useMemo(
    () => estimate({ service, size, complexityScore, urgency }),
    [service, size, complexityScore, urgency],
  );
  const range = useMemo(
    () => (result ? convert(result.investUSD.low, result.investUSD.high) : null),
    [result, convert],
  );
  const singlePrice = result && result.investUSD.low === result.investUSD.high;
  const bullets = useMemo(() => [...svc.bullets, ...GUARANTEE_BULLETS], [svc]);
  const confidence = Math.min(1, 0.45 + 0.16 * touched.size);

  function handleQuoteRequest(e) {
    if (e) e.preventDefault();
    const usd = singlePrice
      ? `$${result.investUSD.high.toLocaleString('en-US')}`
      : `$${result.investUSD.low.toLocaleString('en-US')} – $${result.investUSD.high.toLocaleString('en-US')}`;
    const localLabel = activeCode === 'USD' ? '' : `  (≈ ${range.label} ${activeCode})`;
    const body = [
      '--- Contacto ---',
      `Nombre / Empresa: ${qName || '(sin especificar)'}`,
      `Email: ${qEmail || '(sin especificar)'}`,
      `WhatsApp: ${qPhone || 'no indicado'}`,
      '',
      '--- Proyecto cotizado (preliminar) ---',
      `Tipo de solución: ${svc.label}`,
      `Tamaño: ${SIZE_UI[sizeIdx]?.label}`,
      `Complejidad: ${COMPLEXITY_UI.find((c) => c.id === complexityId)?.label}`,
      `Urgencia: ${URGENCY_UI.find((u) => u.id === urgency)?.label}`,
      '',
      '--- Estimado mostrado al cliente ---',
      `Inversión preliminar (USD): ${usd}${localLabel}`,
      `Ventana de entrega: ${result.delivery.display}`,
      '',
      'Nota: estimado no vinculante; afinamos el alcance en la sesión sin costo.',
    ].join('\n');
    const subject = 'Solicitud de cotización preliminar — JC Analytics';
    window.location.href = `mailto:gerencia@jcanalytic.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setSent(true);
  }

  const whatsappHref = result
    ? `https://wa.me/50670330596?text=${encodeURIComponent(
        `Hola, coticé un proyecto (${svc.label}) y quiero afinar el alcance. Estimado: ${
          singlePrice ? `$${result.investUSD.high}` : `$${result.investUSD.low}–$${result.investUSD.high}`
        } USD, ${result.delivery.display}.`,
      )}`
    : 'https://wa.me/50670330596';

  const scrollToResult = () =>
    resultRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });

  const block = 'bg-slate-900/60 p-5 sm:p-6 rounded-[2rem] border border-slate-800';

  return (
    <div ref={rootRef} className="max-w-7xl mx-auto px-4 relative z-10 pb-6 lg:pb-0">
      {/* Header */}
      <div className="text-center mb-10 sm:mb-14">
        <div className="inline-flex items-center gap-2 px-5 py-2 bg-white/5 border border-white/10 rounded-full text-sm font-bold mb-5 backdrop-blur-md text-emerald-300">
          <Calculator size={16} /> Cotizador preliminar · proyectos desde $30
        </div>
        <h2 className="font-display text-[1.75rem] sm:text-4xl md:text-5xl font-black mb-4 tracking-tight max-w-3xl mx-auto">
          3 clics y mirá tu inversión{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">en vivo.</span>
        </h2>
        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto">
          Elegí qué necesitás, qué tan grande es y qué tan complejo. El estimado se ajusta solo — rango preliminar y sin compromiso. La cifra final la cerramos juntos en una sesión sin costo.
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_minmax(360px,400px)] gap-6 lg:gap-8 xl:gap-12 items-start">
        {/* ───────── IZQUIERDA: 3 decisiones ───────── */}
        <div className="space-y-5 sm:space-y-6">
          {/* 1. Tipo de solución */}
          <div className={block}>
            <p className="text-sm font-bold text-slate-300 mb-1"><span className="text-emerald-400 font-mono mr-1.5">1.</span> ¿Qué necesitás?</p>
            <p className="text-xs text-slate-500 mb-4">Elegí el tipo de solución más parecido a tu necesidad.</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5" role="radiogroup" aria-label="Tipo de solución">
              {SERVICE_ORDER.map((key) => {
                const s = SERVICES[key];
                const Icon = ICONS[s.icon];
                const active = key === service;
                const a = ACCENT[s.accent] || ACCENT.blue;
                return (
                  <motion.button
                    key={key} type="button" role="radio" aria-checked={active}
                    onClick={() => { setService(key); touch('service'); }}
                    whileHover={reduce ? undefined : { scale: 1.02 }}
                    whileTap={reduce ? undefined : { scale: 0.97 }}
                    className={`text-left p-3 min-h-[4.5rem] rounded-2xl border transition-colors h-full flex flex-col gap-2 ${
                      active ? a.card : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 active:bg-slate-800/60'
                    }`}
                  >
                    <Icon size={20} className={active ? a.icon : 'text-slate-400'} />
                    <span className={`text-xs font-bold leading-tight ${active ? 'text-white' : 'text-slate-300'}`}>{s.label}</span>
                  </motion.button>
                );
              })}
            </div>
            <p className="text-xs text-slate-500 mt-3 flex items-center gap-1.5">
              {svc.isMajor && <span className="font-bold text-amber-300">Proyecto mayor ·</span>}
              {svc.micro}
            </p>
          </div>

          {/* 2. Tamaño */}
          <div className={block}>
            <div className="flex items-end justify-between mb-2">
              <p className="text-sm font-bold text-slate-300"><span className="text-emerald-400 font-mono mr-1.5">2.</span> ¿Qué tan grande es?</p>
              <span className="font-mono text-lg font-bold text-white">{SIZE_UI[sizeIdx]?.label}</span>
            </div>
            <input
              type="range" min={0} max={3} step={1} value={sizeIdx}
              onChange={(e) => { setSizeIdx(Number(e.target.value)); touch('size'); }}
              style={{ '--pct': `${(sizeIdx / 3) * 100}%` }}
              className="touch-slider w-full" aria-label="Tamaño del proyecto"
            />
            {/* Las etiquetas también son objetivos táctiles: tocar "Grande" mueve el slider */}
            <div className="flex justify-between mt-1">
              {SIZE_UI.map((v) => (
                <button
                  key={v.idx} type="button"
                  onClick={() => { setSizeIdx(v.idx); touch('size'); }}
                  className={`tap-press text-[10px] font-mono uppercase tracking-wider px-1.5 py-3 -my-1 -mx-1.5 min-h-11 rounded-lg transition-colors ${
                    v.idx === sizeIdx ? 'text-emerald-300 font-bold' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-1">{SIZE_UI[sizeIdx]?.hint}</p>
          </div>

          {/* 3. Complejidad */}
          <div className={block}>
            <p className="text-sm font-bold text-slate-300 mb-3"><span className="text-emerald-400 font-mono mr-1.5">3.</span> ¿Qué tan complejo?</p>
            <SegmentedToggle options={COMPLEXITY_UI} value={complexityId} onChange={(id) => { setComplexityId(id); touch('complexity'); }} />
            <p className="text-xs text-slate-500 mt-3">{COMPLEXITY_UI.find((c) => c.id === complexityId)?.sub}</p>
          </div>

          {/* Urgencia (opcional) */}
          <div className={block}>
            <p className="text-sm font-bold text-slate-300 mb-3">¿Para cuándo? <span className="font-normal text-slate-500">(opcional)</span></p>
            <SegmentedToggle options={URGENCY_UI} value={urgency} onChange={(id) => { setUrgency(id); touch('urgency'); }} />
          </div>
        </div>

        {/* ───────── DERECHA: resultado (recibo) ───────── */}
        <div className="lg:sticky lg:top-24" ref={resultRef}>
          <div className="glass-premium rounded-[2rem] p-6 sm:p-7" aria-live="polite">
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-white/10">
              <span className="text-xs font-mono uppercase tracking-[0.18em] text-slate-400">JC Analytics · Estimado</span>
              <span className="text-[10px] font-mono px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">preliminar</span>
            </div>

            {/* Rango / precio */}
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Inversión estimada</p>
            <motion.div
              key={`${result.investUSD.low}-${result.investUSD.high}-${activeCode}`}
              initial={reduce ? false : { opacity: 0.35, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduce ? 0 : 0.3 }}
              className="font-display text-3xl sm:text-[2.5rem] font-black leading-none tracking-tight mb-1 text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-cyan-300"
            >
              {singlePrice ? range.max : (<>{range.min}<span className="text-slate-600 mx-1.5">–</span>{range.max}</>)}
            </motion.div>
            <div className="flex items-center justify-between gap-3 mt-3">
              <span className="text-[11px] text-slate-500 leading-snug">Preliminar · no vinculante · tasas ref. ({FX_UPDATED})</span>
              <CurrencySelector activeCode={activeCode} onChange={setActiveCode} currencies={currencyList} />
            </div>

            {/* Ventana de entrega */}
            <div className="mt-5 bg-slate-900/70 border-l-4 border-l-cyan-500 rounded-xl p-4">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                <Clock size={13} className="text-cyan-400" /> Ventana de entrega
              </div>
              <div className="font-mono text-xl font-bold text-white">{result.delivery.display}</div>
              <p className="text-[11px] text-slate-500 mt-1">Incluye ~media semana de arranque en cola — equipo enfocado.</p>
            </div>

            {/* Meter de detalle */}
            <div className="mt-5">
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                <span>Detalle del alcance</span><span>{Math.round(confidence * 100)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400"
                  animate={{ width: `${confidence * 100}%` }}
                  transition={{ duration: reduce ? 0 : 0.4 }}
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">Entre más detalle nos das, más afinamos el alcance en la sesión.</p>
            </div>

            {/* Qué incluye */}
            <div className="mt-5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Qué incluye</p>
              <ul className="space-y-2">
                {bullets.map((b, i) => (
                  <li key={`${b}-${i}`} className="flex items-start gap-2 text-sm text-slate-300">
                    <CheckCircle size={15} className="text-emerald-400 shrink-0 mt-0.5" /> <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA / mini-form */}
            <div className="mt-6">
              <AnimatePresence mode="wait" initial={false}>
                {sent ? (
                  <motion.div key="sent" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex flex-col items-center text-center gap-2 py-4">
                    <CheckCircle size={28} className="text-emerald-400" />
                    <p className="text-sm font-bold text-white">¡Listo! Te enviamos el resumen a tu correo.</p>
                    <p className="text-xs text-slate-400">Te respondemos en menos de 24 h hábiles.</p>
                    <a href={whatsappHref} target="_blank" rel="noreferrer" className="mt-1 text-xs font-bold text-emerald-400 hover:text-emerald-300">o escribinos por WhatsApp →</a>
                  </motion.div>
                ) : showForm ? (
                  <motion.form key="form" onSubmit={handleQuoteRequest}
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="space-y-3 overflow-hidden">
                    <p className="text-xs text-slate-400">Dejanos tus datos y te enviamos el resumen de esta cotización.</p>
                    {/* text-base (16px): debajo de eso iOS hace zoom automático al enfocar */}
                    <input type="text" required autoComplete="organization" placeholder="Nombre y empresa" value={qName} onChange={(e) => setQName(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-base sm:text-sm placeholder:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60" />
                    <input type="email" required autoComplete="email" placeholder="tu@empresa.com" value={qEmail} onChange={(e) => setQEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-base sm:text-sm placeholder:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60" />
                    <input type="tel" inputMode="tel" autoComplete="tel" placeholder="WhatsApp (opcional)" value={qPhone} onChange={(e) => setQPhone(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-base sm:text-sm placeholder:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60" />
                    <button type="submit" className="btn-sheen glow-hover w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2">
                      Enviar cotización <ArrowRight size={18} />
                    </button>
                  </motion.form>
                ) : (
                  <motion.div key="cta" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <button type="button" onClick={() => setShowForm(true)}
                      className="tap-press btn-sheen glow-hover w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2">
                      <Calculator size={18} /> Solicitar cotización formal
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <a href={whatsappHref} target="_blank" rel="noreferrer"
                className="tap-press mt-2 w-full inline-flex items-center justify-center gap-2 min-h-11 rounded-xl text-sm font-bold text-slate-300 hover:text-white active:bg-white/5 transition-colors">
                <MessageSquare size={16} className="text-emerald-400" /> o escribinos por WhatsApp
              </a>

              <p className="mt-4 text-[11px] text-slate-500 leading-snug flex items-start gap-1.5">
                <ShieldCheck size={13} className="text-slate-400 shrink-0 mt-0.5" />
                Estimado preliminar y no vinculante. La cifra final puede ajustarse según el alcance real; la definimos juntos sin costo en la primera sesión.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Barra resumen fija (mobile) — visible solo dentro del cotizador y
          mientras el desglose no está en pantalla */}
      <AnimatePresence>
        {showBar && (
          <motion.div
            initial={reduce ? { opacity: 0 } : { y: '110%' }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: '110%' }}
            transition={reduce ? { duration: 0.15 } : { type: 'spring', stiffness: 380, damping: 34 }}
            className="lg:hidden fixed bottom-0 inset-x-0 z-40 glass-nav border-t border-white/10 px-4 pt-3 pb-safe"
          >
            {/* Filo superior con acento de marca */}
            <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent" />
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-slate-500 mb-0.5">Estimado en vivo</div>
                <motion.div
                  key={`${range?.label}-bar`}
                  initial={reduce ? false : { opacity: 0.4, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: reduce ? 0 : 0.25 }}
                  className="font-mono text-sm font-bold text-emerald-300 truncate leading-tight"
                >
                  {singlePrice ? range.max : range?.label}
                  <span className="ml-2 font-sans font-medium text-[10px] text-slate-400 normal-case">{result.delivery.display}</span>
                </motion.div>
              </div>
              <button type="button" onClick={scrollToResult}
                className="tap-press shrink-0 inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-sm font-bold px-4 py-2.5 min-h-11 rounded-full transition-colors">
                Ver desglose <ChevronUp size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
