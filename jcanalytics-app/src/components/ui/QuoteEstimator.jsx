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
  Clapperboard, Megaphone,
  ArrowRight, Clock, CheckCircle, ShieldCheck, Calculator, MessageSquare, ChevronUp,
} from 'lucide-react';
import {
  SERVICES, SERVICE_ORDER, COMPLEXITY_UI, SIZE_UI, URGENCY_UI, GUARANTEE_BULLETS, estimate,
} from '../../data/cotizador';
import { FX_UPDATED } from '../../data/currencies';
import { useCurrency } from '../../hooks/useCurrency';
import CurrencySelector from './CurrencySelector';
import { t } from '../../i18n/locale';

const ICONS = { BarChart3, Zap, Layers, Cpu, Database, MonitorSmartphone, Settings, Lightbulb, Receipt, Globe, Clapperboard, Megaphone };

const ACCENT = {
  blue:    { card: 'border-blue-500/60 bg-blue-500/10',       icon: 'text-blue-400' },
  emerald: { card: 'border-lime-500/60 bg-lime-500/10', icon: 'text-lime-400' },
  amber:   { card: 'border-amber-500/60 bg-amber-500/10',     icon: 'text-amber-400' },
  purple:  { card: 'border-purple-500/60 bg-purple-500/10',   icon: 'text-purple-400' },
  cyan:    { card: 'border-lime-500/60 bg-lime-500/10',       icon: 'text-lime-400' },
  red:     { card: 'border-red-500/60 bg-red-500/10',         icon: 'text-red-400' },
  orange:  { card: 'border-orange-500/60 bg-orange-500/10',   icon: 'text-orange-400' },
  green:   { card: 'border-green-500/60 bg-green-500/10',     icon: 'text-green-400' },
  violet:  { card: 'border-violet-500/60 bg-violet-500/10',   icon: 'text-violet-400' },
  pink:    { card: 'border-pink-500/60 bg-pink-500/10',       icon: 'text-pink-400' },
};
const DOT = {
  emerald: 'bg-lime-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]',
  amber:   'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]',
  red:     'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.8)]',
  blue:    'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]',
};
const SEG_ACTIVE = {
  emerald: 'bg-lime-500/10 border-lime-500/30 text-lime-300',
  amber:   'bg-amber-500/10 border-amber-500/30 text-amber-300',
  red:     'bg-red-500/10 border-red-500/30 text-red-300',
  blue:    'bg-blue-500/10 border-blue-500/30 text-blue-300',
};

// Toggle segmentado (calca el patrón visual existente)
function SegmentedToggle({ options, value, onChange, label }) {
  return (
    <div className="flex gap-2" role="radiogroup" aria-label={label}>
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id} type="button" role="radio" aria-checked={active}
            onClick={() => onChange(o.id)}
            className={`tap-press flex-1 flex flex-col items-center justify-center py-3 px-2 min-h-12 text-xs font-bold rounded-xl border transition-all duration-300 ${
              active ? SEG_ACTIVE[o.dot] || SEG_ACTIVE.blue
                     : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700/40 active:bg-neutral-700/60'
            }`}
          >
            <span className={`w-2 h-2 rounded-full mb-1.5 transition-colors ${active ? DOT[o.dot] || DOT.blue : 'bg-neutral-600'}`} />
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
  const [service, setService] = useState('software_medida');
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
      // A tall result cannot reliably meet a percentage threshold on a phone.
      { rootMargin: '-80px 0px -100px 0px', threshold: 0 }
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
    const usd = (singlePrice
      ? `$${result.investUSD.high.toLocaleString('en-US')}`
      : `$${result.investUSD.low.toLocaleString('en-US')} – $${result.investUSD.high.toLocaleString('en-US')}`) + result.unitSuffix;
    const localLabel = activeCode === 'USD' ? '' : `  (≈ ${range.label} ${activeCode})`;
    const body = [
      t('--- Contacto ---', '--- Contact ---'),
      `${t('Nombre / Empresa', 'Name / Company')}: ${qName || t('(sin especificar)', '(not specified)')}`,
      `Email: ${qEmail || t('(sin especificar)', '(not specified)')}`,
      `WhatsApp: ${qPhone || t('no indicado', 'not provided')}`,
      '',
      t('--- Proyecto cotizado (preliminar) ---', '--- Project estimate (preliminary) ---'),
      `${t('Tipo de solución', 'Solution type')}: ${svc.label}`,
      `${t('Tamaño', 'Size')}: ${SIZE_UI[sizeIdx]?.label}`,
      `${t('Complejidad', 'Complexity')}: ${COMPLEXITY_UI.find((c) => c.id === complexityId)?.label}`,
      `${t('Urgencia', 'Urgency')}: ${URGENCY_UI.find((u) => u.id === urgency)?.label}`,
      '',
      t('--- Estimado mostrado al cliente ---', '--- Estimate shown to the client ---'),
      `${t('Inversión preliminar (USD)', 'Preliminary investment (USD)')}: ${usd}${localLabel}`,
      `${result.delivery.label}: ${result.delivery.display}`,
      '',
      t('Nota: estimado no vinculante; afinamos el alcance en la sesión sin costo.', 'Note: this estimate is non-binding; we refine the scope during a free consultation.'),
    ].join('\n');
    const subject = t('Solicitud de cotización preliminar — JC Analytics', 'Preliminary quote request — JC Analytics');
    window.location.href = `mailto:gerencia@jcanalytic.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setSent(true);
  }

  const whatsappHref = result
    ? `https://wa.me/50670330596?text=${encodeURIComponent(
        `${t(`Hola, coticé un proyecto (${svc.label}) y quiero afinar el alcance. Estimado:`, `Hi, I estimated a project (${svc.label}) and would like to discuss the scope. Estimate:`)} ${
          singlePrice ? `$${result.investUSD.high}` : `$${result.investUSD.low}–$${result.investUSD.high}`
        }${result.unitSuffix} USD, ${result.delivery.display}.`,
      )}`
    : 'https://wa.me/50670330596';

  const scrollToResult = () =>
    resultRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });

  const block = 'bg-neutral-900/60 p-5 sm:p-6 rounded-[2rem] border border-neutral-800';

  return (
    <div ref={rootRef} className="max-w-7xl mx-auto px-4 relative z-10 pb-6 lg:pb-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10 sm:mb-16">
        <div>
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-paper/65">{t('Planificá tu inversión / Cotizador', 'Plan your investment / Project estimator')}</span>
          <h2 className="mt-4 font-display font-semibold tracking-[-0.04em] leading-[0.92] text-[clamp(2.6rem,7vw,6rem)]">
            {t('Tu proyecto,', 'Your project,')} <span className="font-serif italic font-normal text-lime">{t('con claridad.', 'with clarity.')}</span>
          </h2>
        </div>
        <p className="max-w-xs text-paper/55 text-lg leading-snug">
          {t('Elegí tu solución y explorá un rango preliminar, sin compromiso.', 'Choose your solution and explore an initial price range, with no commitment.')}
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_minmax(360px,400px)] gap-6 lg:gap-8 xl:gap-12 items-start">
        {/* ───────── IZQUIERDA: 3 decisiones ───────── */}
        <div className="space-y-5 sm:space-y-6">
          {/* 1. Tipo de solución */}
          <div className={block}>
            <p className="text-sm font-bold text-neutral-300 mb-1"><span className="text-lime-400 font-mono mr-1.5">1.</span> {t('¿Qué necesitás?', 'What do you need?')}</p>
            <p className="text-xs text-neutral-400 mb-4">{t('Elegí el tipo de solución más parecido a tu necesidad. Para modelos financieros, machine learning o integración de IA,', 'Choose the solution closest to your needs. For financial models, machine learning or AI integration,')} <a href="#contacto" className="text-lime underline underline-offset-4">{t('conversemos sobre el alcance', 'let’s discuss the scope')}</a>.</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5" role="radiogroup" aria-label={t('Tipo de solución', 'Solution type')}>
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
                      active ? a.card : 'border-neutral-800 bg-neutral-900/40 hover:border-neutral-700 active:bg-neutral-800/60'
                    }`}
                  >
                    <Icon size={20} className={active ? a.icon : 'text-neutral-400'} />
                    <span className={`text-xs font-bold leading-tight ${active ? 'text-white' : 'text-neutral-300'}`}>{s.label}</span>
                  </motion.button>
                );
              })}
            </div>
            <p className="text-xs text-neutral-500 mt-3 flex items-center gap-1.5">
              {svc.isMajor && <span className="font-bold text-amber-300">{t('Proyecto mayor ·', 'Larger project ·')}</span>}
              {svc.micro}
            </p>
          </div>

          {/* 2. Tamaño */}
          <div className={block}>
            <div className="flex items-end justify-between mb-2">
              <p className="text-sm font-bold text-neutral-300"><span className="text-lime-400 font-mono mr-1.5">2.</span> {t('¿Qué tan grande es?', 'How big is the project?')}</p>
              <span className="font-mono text-lg font-bold text-white">{SIZE_UI[sizeIdx]?.label}</span>
            </div>
            <input
              type="range" min={0} max={3} step={1} value={sizeIdx}
              onChange={(e) => { setSizeIdx(Number(e.target.value)); touch('size'); }}
              style={{ '--pct': `${(sizeIdx / 3) * 100}%` }}
              className="touch-slider w-full" aria-label={t('Tamaño del proyecto', 'Project size')} aria-valuetext={SIZE_UI[sizeIdx]?.label}
            />
            {/* Las etiquetas también son objetivos táctiles: tocar "Grande" mueve el slider */}
            <div className="flex justify-between mt-1">
              {SIZE_UI.map((v) => (
                <button
                  key={v.idx} type="button"
                  onClick={() => { setSizeIdx(v.idx); touch('size'); }}
                  className={`tap-press text-[10px] font-mono uppercase tracking-wider px-1.5 py-3 -my-1 -mx-1.5 min-h-11 rounded-lg transition-colors ${
                    v.idx === sizeIdx ? 'text-lime-300 font-bold' : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-neutral-500 mt-1">{SIZE_UI[sizeIdx]?.hint}</p>
          </div>

          {/* 3. Complejidad */}
          <div className={block}>
            <p className="text-sm font-bold text-neutral-300 mb-3"><span className="text-lime-400 font-mono mr-1.5">3.</span> {t('¿Qué tan complejo?', 'How complex is it?')}</p>
            <SegmentedToggle label={t('Complejidad del proyecto', 'Project complexity')} options={COMPLEXITY_UI} value={complexityId} onChange={(id) => { setComplexityId(id); touch('complexity'); }} />
            <p className="text-xs text-neutral-500 mt-3">{COMPLEXITY_UI.find((c) => c.id === complexityId)?.sub}</p>
          </div>

          {/* Urgencia (opcional) */}
          <div className={block}>
            <p className="text-sm font-bold text-neutral-300 mb-3">{t('¿Para cuándo?', 'When do you need it?')} <span className="font-normal text-neutral-500">{t('(opcional)', '(optional)')}</span></p>
            <SegmentedToggle label={t('Urgencia del proyecto', 'Project urgency')} options={URGENCY_UI} value={urgency} onChange={(id) => { setUrgency(id); touch('urgency'); }} />
          </div>
        </div>

        {/* ───────── DERECHA: resultado (recibo) ───────── */}
        <div className="quote-result lg:sticky lg:top-24" ref={resultRef}>
          <div className="glass-premium rounded-[2rem] p-6 sm:p-7" aria-live="polite">
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-white/10">
              <span className="text-xs font-mono uppercase tracking-[0.18em] text-neutral-400">JC Analytics · {t('Estimado', 'Estimate')}</span>
              <span className="text-[10px] font-mono px-2 py-1 rounded-full bg-lime-500/10 text-lime-300 border border-lime-500/20">{t('preliminar', 'preliminary')}</span>
            </div>

            {/* Rango / precio */}
            <p className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-2">{t('Inversión estimada', 'Estimated investment')}</p>
            <motion.div
              key={`${result.investUSD.low}-${result.investUSD.high}-${activeCode}`}
              initial={reduce ? false : { opacity: 0.35, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduce ? 0 : 0.3 }}
              className="font-display text-3xl sm:text-[2.5rem] font-black leading-none tracking-tight mb-1 text-transparent bg-clip-text bg-gradient-to-r from-lime-300 to-lime-300"
            >
              {singlePrice ? range.max : (<>{range.min}<span className="text-neutral-600 mx-1.5">–</span>{range.max}</>)}
              {result.unitSuffix && (
                <span className="ml-1.5 font-sans text-base sm:text-lg font-semibold text-neutral-400 tracking-normal">{result.unitSuffix}</span>
              )}
            </motion.div>
            <div className="flex items-center justify-between gap-3 mt-3">
              <span className="text-[11px] text-neutral-500 leading-snug">{t('Preliminar · no vinculante · tasas ref.', 'Preliminary · non-binding · reference rates')} ({FX_UPDATED})</span>
              <CurrencySelector activeCode={activeCode} onChange={setActiveCode} currencies={currencyList} />
            </div>

            {/* Ventana de entrega */}
            <div className="mt-5 bg-neutral-900/70 border-l-4 border-l-lime-500 rounded-xl p-4">
              <div className="flex items-center gap-2 text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">
                <Clock size={13} className="text-lime-400" /> {result.delivery.label}
              </div>
              <div className="font-mono text-xl font-bold text-white">{result.delivery.display}</div>
              <p className="text-[11px] text-neutral-500 mt-1">
                {result.unit === 'mes'
                  ? t('Tiempo para levantar marca, calendario y accesos antes del primer mes.', 'Time to set up your brand, content calendar and access before the first month.')
                  : t('Incluye ~media semana de arranque en cola — equipo enfocado.', 'Includes about half a week of scheduling before work begins.')}
              </p>
            </div>

            {/* Meter de detalle */}
            <div className="mt-5">
              <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1.5">
                <span>{t('Detalle del alcance', 'Scope detail')}</span><span>{Math.round(confidence * 100)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-lime-500 to-lime-400"
                  animate={{ width: `${confidence * 100}%` }}
                  transition={{ duration: reduce ? 0 : 0.4 }}
                />
              </div>
              <p className="text-[11px] text-neutral-500 mt-1.5">{t('Entre más detalle nos das, más afinamos el alcance en la sesión.', 'The more you share, the more precisely we can define your scope during the consultation.')}</p>
            </div>

            {/* Qué incluye */}
            <div className="mt-5">
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2.5">{t('Qué incluye', 'What’s included')}</p>
              <ul className="space-y-2">
                {bullets.map((b, i) => (
                  <li key={`${b}-${i}`} className="flex items-start gap-2 text-sm text-neutral-300">
                    <CheckCircle size={15} className="text-lime-400 shrink-0 mt-0.5" /> <span>{b}</span>
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
                    <CheckCircle size={28} className="text-lime-400" />
                    <p className="text-sm font-bold text-white">{t('Revisá y enviá la solicitud desde tu aplicación de correo.', 'Review and send the request from your email app.')}</p>
                    <p className="text-xs text-neutral-400">{t('Al recibirla, te respondemos en menos de 24 h hábiles.', 'Once received, we’ll reply within 24 business hours.')}</p>
                    <a href={whatsappHref} target="_blank" rel="noreferrer" className="mt-1 text-xs font-bold text-lime-400 hover:text-lime-300">{t('o escribinos por WhatsApp →', 'or message us on WhatsApp →')}</a>
                  </motion.div>
                ) : showForm ? (
                  <motion.form key="form" onSubmit={handleQuoteRequest}
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="space-y-3 overflow-hidden">
                    <p className="text-xs text-neutral-400">{t('Completá tus datos para preparar la solicitud en tu aplicación de correo.', 'Enter your details to prepare the request in your email app.')}</p>
                    {/* text-base (16px): debajo de eso iOS hace zoom automático al enfocar */}
                    <input type="text" required aria-label={t('Nombre y empresa', 'Name and company')} autoComplete="organization" placeholder={t('Nombre y empresa', 'Name and company')} value={qName} onChange={(e) => setQName(e.target.value)}
                      className="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-xl text-white text-base sm:text-sm placeholder:text-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500/60" />
                    <input type="email" required aria-label={t('Correo electrónico', 'Email address')} autoComplete="email" placeholder={t('tu@empresa.com', 'you@company.com')} value={qEmail} onChange={(e) => setQEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-xl text-white text-base sm:text-sm placeholder:text-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500/60" />
                    <input type="tel" aria-label={t('WhatsApp, opcional', 'WhatsApp, optional')} inputMode="tel" autoComplete="tel" placeholder={t('WhatsApp (opcional)', 'WhatsApp (optional)')} value={qPhone} onChange={(e) => setQPhone(e.target.value)}
                      className="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-xl text-white text-base sm:text-sm placeholder:text-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500/60" />
                    <button type="submit" className="btn-sheen glow-hover w-full bg-lime hover:bg-white text-ink font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2">
                      {t('Preparar solicitud por correo', 'Prepare email request')} <ArrowRight size={18} />
                    </button>
                  </motion.form>
                ) : (
                  <motion.div key="cta" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <button type="button" onClick={() => setShowForm(true)}
                      className="tap-press btn-sheen glow-hover w-full bg-lime hover:bg-white active:bg-lime-dark text-ink font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2">
                      <Calculator size={18} /> {t('Solicitar cotización formal', 'Request a formal quote')}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <a href={whatsappHref} target="_blank" rel="noreferrer"
                className="tap-press mt-2 w-full inline-flex items-center justify-center gap-2 min-h-11 rounded-xl text-sm font-bold text-neutral-300 hover:text-white active:bg-white/5 transition-colors">
                <MessageSquare size={16} className="text-lime-400" /> {t('o escribinos por WhatsApp', 'or message us on WhatsApp')}
              </a>

              <p className="mt-4 text-[11px] text-neutral-500 leading-snug flex items-start gap-1.5">
                <ShieldCheck size={13} className="text-neutral-400 shrink-0 mt-0.5" />
                {t('Estimado preliminar y no vinculante. La cifra final puede ajustarse según el alcance real; la definimos juntos sin costo en la primera sesión.', 'This preliminary estimate is non-binding. The final price depends on the agreed scope, which we define together during your free first consultation.')}
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
            className="quote-mobile-summary lg:hidden fixed bottom-0 inset-x-0 z-40 glass-nav border-t border-white/10 px-4 pt-3 pb-safe"
          >
            {/* Filo superior con acento de marca */}
            <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-lime-400/70 to-transparent" />
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-neutral-500 mb-0.5">{t('Estimado en vivo', 'Live estimate')}</div>
                <motion.div
                  key={`${range?.label}-bar`}
                  initial={reduce ? false : { opacity: 0.4, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: reduce ? 0 : 0.25 }}
                  className="font-mono text-sm font-bold text-lime-300 truncate leading-tight"
                >
                  {singlePrice ? range.max : range?.label}{result.unitSuffix}
                  <span className="ml-2 font-sans font-medium text-[10px] text-neutral-400 normal-case">{result.delivery.display}</span>
                </motion.div>
              </div>
              <button type="button" onClick={scrollToResult}
                className="tap-press shrink-0 inline-flex items-center gap-1.5 bg-lime hover:bg-white active:bg-lime-dark text-ink text-sm font-bold px-4 py-2.5 min-h-11 rounded-full transition-colors">
                {t('Ver desglose', 'View breakdown')} <ChevronUp size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
