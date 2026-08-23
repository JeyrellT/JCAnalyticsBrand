import React, { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useSpring, useReducedMotion, useInView, animate, useDragControls } from 'framer-motion';
import Lenis from 'lenis';

// eslint (sin plugin de react) no reconoce a `motion` usado solo como <motion.x>.
const _MOTION = motion;
import gsap from 'gsap';
import CustomCursor from './components/ui/CustomCursor';
import TiltCard from './components/ui/TiltCard';
import QuoteEstimator from './components/ui/QuoteEstimator';
import WebProperties from './components/ui/WebProperties';
import SplitText from './components/ui/SplitText';

// Componentes pesados / debajo del fold cargados de forma diferida.
// - ServicesGrid arrastra CaseStudyModal y su data.
// (ForecastChart/recharts se retiró en ago-26 junto con la sección de
//  "analítica predictiva": su cifra de precisión no tenía caso documentado
//  detrás y contradecía el principio "probamos antes de afirmar".)
const ServicesGrid = lazy(() => import('./components/ui/ServicesGrid'));
import {
  Target, CheckCircle, Database, Cpu, BarChart3,
  ArrowRight, ShieldCheck, Users, Calculator, MessageSquare, ChevronRight, ChevronDown,
  Layers, Settings, MonitorSmartphone, Clock, X, AlertTriangle, TrendingDown, Lightbulb, Menu,
  ExternalLink, Compass, Eye, MapPin, Check
} from 'lucide-react';
import { WEB_PROPERTIES } from './data/webProperties';

// gsap se usa solo por su ticker, para conducir el rAF de Lenis en un único
// loop. ScrollTrigger se retiró (jul-26) al reemplazar el carrusel horizontal
// por la grilla de servicios: ya no queda ningún trigger en la app y el plugin
// pesaba ~40 kB en el chunk de vendor.

// Fade In Up Reusable Component
const FadeInUp = ({ children, delay = 0, className = "" }) => {
  const prefersReducedMotion = useReducedMotion();
  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.8, delay: delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// ── CountUp ───────────────────────────────────────────────────────────────────
// Contador animado: arranca mostrando el valor FINAL (así el HTML prerenderizado
// y los bots nunca ven "0"), y al entrar en viewport anima 0 → valor.
// Con reduced-motion queda el valor final estático.
const CountUp = ({ to, suffix = '', className = '' }) => {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [val, setVal] = useState(to);

  useEffect(() => {
    if (!inView || reduce) return undefined;
    const controls = animate(0, to, {
      duration: 1.6,
      ease: [0.19, 1, 0.22, 1],
      onUpdate: (v) => setVal(v),
    });
    return () => controls.stop();
  }, [inView, to, reduce]);

  return (
    <span ref={ref} className={className}>
      {Math.round(val).toLocaleString('es-CR')}
      {suffix}
    </span>
  );
};

// ── Spotlight helper ──────────────────────────────────────────────────────────
// Alimenta las clases .spotlight / .spotlight-dark del CSS: setea --mx/--my
// directo en el DOM en cada movimiento del puntero — cero re-renders.
// Uso: <div className="spotlight ..." onPointerMove={setSpotVars}>
const setSpotVars = (e) => {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
  el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
};

// ── HeaderRule ────────────────────────────────────────────────────────────────
// Línea de acento que se dibuja bajo los títulos de sección al entrar en vista.
const HeaderRule = ({ className = '' }) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      aria-hidden="true"
      initial={reduce ? false : { scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={reduce ? { duration: 0 } : { duration: 0.9, ease: [0.19, 1, 0.22, 1] }}
      className={`h-1 w-24 rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 origin-left ${className}`}
    />
  );
};



// ── Contenido de los modales de "El Problema Oculto" ──────────────────────────
const PROBLEM_MODAL_CONTENT = {
  reportes: {
    icon: <Clock size={28} />,
    color: 'red',
    tag: 'Impacto Oculto · ₡1.2M+ perdidos',
    title: '"Tus reportes llegan 3 días después de que ya no sirven"',
    caseName: 'Mayorista en Alajuela',
    intro: 'Este es el ciclo más común que vemos en PYMEs del GAM:',
    steps: [
      { label: 'Lunes', text: 'El equipo exporta datos del sistema a CSV.' },
      { label: 'Martes', text: 'Se limpia y consolida en Excel (4–6 horas).' },
      { label: 'Miércoles', text: 'Se envía el reporte por correo a gerencia.' },
      { label: 'Jueves', text: 'Gerencia toma decisiones... sobre datos de la semana pasada.' },
    ],
    symptoms: [
      '¿Tus reuniones de lunes empiezan con "esperen que actualizo el Excel"?',
      '¿Detectas problemas de inventario o cartera cuando ya es tarde?',
      '¿Tienes más de 3 versiones del mismo archivo con distintas fechas?',
    ],
    solution: 'Con un dashboard conectado a tu sistema, la información fluye en tiempo real. La decisión que antes tardaba 3 días, la tomas en 3 minutos.',
    result: 'El mayorista en Alajuela redujo su ciclo de reporte de 4 días a 0 — los datos aparecen solos cada mañana.',
  },
  excel: {
    icon: <Database size={28} />,
    color: 'orange',
    tag: 'Fuga de Capital · ₡2.4M al año',
    title: '"Tu equipo dedica 40+ horas al mes a Excel"',
    caseName: 'Ferretería en Heredia',
    intro: 'Hagamos el cálculo que nadie se atreve a hacer en voz alta:',
    steps: [
      { label: 'Personas', text: '2 empleados dedicando ~20 horas mensuales a reportes manuales.' },
      { label: 'Costo hora', text: 'Con un salario de ₡600K/mes, cada hora vale ~₡3,500.' },
      { label: 'Costo mensual', text: '2 × 20h × ₡3,500 = ₡140,000 solo en tiempo.' },
      { label: 'Costo anual', text: '₡1.68M + errores corregidos + decisiones tardías = ₡2.4M reales.' },
    ],
    symptoms: [
      '¿Tienes archivos "Reporte_FINAL_v3_BUENO_este_si.xlsx"?',
      '¿Un error de fórmula ha afectado alguna vez una decisión de compra?',
      '¿Tus colaboradores dicen que "no da tiempo" para analizar, solo para reportar?',
    ],
    solution: 'La automatización libera ese tiempo para que tu equipo haga lo que realmente importa: analizar, proponer y crecer.',
    result: 'La ferretería en Heredia eliminó 38 horas mensuales de trabajo manual en 3 semanas. Ese tiempo ahora va a gestión de proveedores.',
  },
  rentabilidad: {
    icon: <BarChart3 size={28} />,
    color: 'blue',
    tag: 'Riesgo Financiero · 30% capital estancado',
    title: '"No sabes quién genera el 80% del margen"',
    caseName: 'Distribuidora en el GAM',
    intro: 'El Principio de Pareto es brutal en ventas PYME:',
    steps: [
      { label: 'Clientes', text: 'El 20% de tus clientes genera el 80% de tu margen bruto.' },
      { label: 'Productos', text: 'El 20% de tu catálogo mueve el 80% de tu capital de trabajo.' },
      { label: 'Riesgo', text: 'El 20% de tu cartera puede representar el 80% de tu riesgo de incobrables.' },
      { label: 'El problema', text: 'Sin visibilidad, tratas igual a todos — y financias inventario muerto.' },
    ],
    symptoms: [
      '¿Tienes productos con más de 90 días sin movimiento en bodega?',
      '¿Sabes exactamente cuál cliente tiene el mayor riesgo de atraso en este momento?',
      '¿Tu margen neto real varía más de un 5% según quién haga el cálculo?',
    ],
    solution: 'Un dashboard de rentabilidad por cliente, producto y canal te muestra exactamente dónde enfocar esfuerzo de ventas y dónde liberar capital.',
    result: 'La distribuidora en el GAM identificó ₡8M en inventario estancado y ₡3.2M en cuentas de alto riesgo — en su primera semana con el dashboard.',
  },
};

// Modal de Problema — en móvil se comporta como bottom sheet nativo:
// entra desde abajo, tiene asa de arrastre y se cierra deslizando hacia abajo.
const ProblemModal = ({ modalKey, onClose, sheet = false }) => {
  const data = PROBLEM_MODAL_CONTENT[modalKey];
  const closeBtnRef = useRef(null);
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const dragControls = useDragControls();
  const reduce = useReducedMotion();

  // Efecto de "una sola vez": evita re-runs por render (onClose cambia de identidad
  // en cada render de App) que, durante la animación de salida de AnimatePresence,
  // re-enfocaban el modal saliente e impedían que el exit completara el unmount.
  useEffect(() => {
    const prevFocused = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeBtnRef.current?.focus();

    const handleKey = (e) => {
      if (e.key === 'Escape') { onCloseRef.current?.(); return; }
      if (e.key === 'Tab') {
        const focusables = dialogRef.current?.querySelectorAll(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables || focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', handleKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', handleKey);
      if (prevFocused && typeof prevFocused.focus === 'function') prevFocused.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!data) return null;

  const colorMap = {
    red:    { bg: 'bg-red-50',    border: 'border-red-200',    icon: 'bg-red-100 text-red-500',    tag: 'bg-red-100 text-red-700',    btn: 'bg-red-500 hover:bg-red-600' },
    orange: { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'bg-orange-100 text-orange-500', tag: 'bg-orange-100 text-orange-700', btn: 'bg-orange-500 hover:bg-orange-600' },
    blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   icon: 'bg-blue-100 text-blue-500',   tag: 'bg-blue-100 text-blue-700',   btn: 'bg-blue-500 hover:bg-blue-600' },
  };
  const c = colorMap[data.color];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
      data-lenis-prevent
    >
      {/* backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />

      <motion.div
        ref={dialogRef}
        initial={reduce ? { opacity: 0 } : sheet ? { y: '100%' } : { opacity: 0, scale: 0.92, y: 24 }}
        animate={reduce ? { opacity: 1 } : sheet ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
        exit={reduce ? { opacity: 0 } : sheet ? { y: '100%' } : { opacity: 0, scale: 0.95, y: 16 }}
        transition={reduce ? { duration: 0.15 } : { type: 'spring', stiffness: 300, damping: sheet ? 32 : 28 }}
        drag={sheet && !reduce ? 'y' : false}
        dragListener={false}
        dragControls={dragControls}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.7 }}
        onDragEnd={(e, info) => {
          if (info.offset.y > 90 || info.velocity.y > 600) onCloseRef.current?.();
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="problem-modal-title"
        className="relative bg-white rounded-t-[1.75rem] rounded-b-none sm:rounded-[2rem] shadow-2xl max-w-2xl w-full max-h-[92dvh] sm:max-h-[90dvh] overflow-y-auto overscroll-contain"
        onClick={e => e.stopPropagation()}
      >
        {/* Asa de arrastre (solo móvil): deslizar hacia abajo cierra */}
        {sheet && (
          <div
            onPointerDown={(e) => dragControls.start(e)}
            className="sm:hidden sticky top-0 z-20 flex justify-center pt-2.5 pb-1 touch-none cursor-grab active:cursor-grabbing"
            style={{ backgroundColor: 'transparent' }}
            aria-hidden="true"
          >
            <span className="w-11 h-1.5 rounded-full bg-slate-900/15" />
          </div>
        )}

        {/* Header */}
        <div className={`${c.bg} ${c.border} border-b px-5 sm:px-6 pt-4 sm:pt-6 pb-5 ${sheet ? '-mt-[1.4rem]' : ''} rounded-t-[1.75rem] sm:rounded-t-[2rem]`}>
          <div className="flex items-start justify-between gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${c.icon}`}>
              {data.icon}
            </div>
            <button
              ref={closeBtnRef}
              onClick={onClose}
              aria-label="Cerrar"
              className="tap-press w-10 h-10 sm:w-9 sm:h-9 rounded-full bg-white/80 hover:bg-white active:bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors shrink-0"
            >
              <X size={17} aria-hidden="true" />
            </button>
          </div>
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mt-3 mb-2 ${c.tag}`}>
            <AlertTriangle size={11} /> {data.tag}
          </div>
          <h3 id="problem-modal-title" className="font-display text-lg sm:text-xl font-bold text-slate-900 leading-snug">{data.title}</h3>
        </div>

        {/* Body */}
        <div className="px-5 sm:px-6 py-5 sm:py-6 space-y-5 sm:space-y-6">
          {/* Pasos / ciclo */}
          <div>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">{data.intro}</p>
            <div className="space-y-2">
              {data.steps.map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`mt-0.5 shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${c.icon}`}>
                    {i + 1}
                  </div>
                  <p className="text-sm text-slate-700"><strong>{step.label}:</strong> {step.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Síntomas */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <TrendingDown size={13} /> ¿Lo reconoces en tu empresa?
            </p>
            <ul className="space-y-2">
              {data.symptoms.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                  <span className="text-red-400 mt-0.5 shrink-0">▸</span> {s}
                </li>
              ))}
            </ul>
          </div>

          {/* Solución */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Lightbulb size={13} /> Cómo lo resolvemos
            </p>
            <p className="text-sm text-slate-700">{data.solution}</p>
          </div>

          {/* Caso real */}
          <div className="flex items-start gap-3 p-4 bg-slate-900 rounded-2xl">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
              <Target size={14} className="text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Caso real · {data.caseName}</p>
              <p className="text-sm text-slate-200">{data.result}</p>
            </div>
          </div>
        </div>

        {/* Footer CTA — pegajoso en móvil para que siempre haya salida a la acción */}
        <div className="sticky bottom-0 sm:static bg-gradient-to-t from-white via-white/95 to-transparent sm:bg-none px-5 sm:px-6 pt-3 sm:pt-0 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-6">
          <a
            href="#contacto"
            onClick={onClose}
            className={`tap-press flex items-center justify-center gap-2 w-full py-3.5 min-h-12 rounded-xl text-white font-bold text-sm transition-colors shadow-lg sm:shadow-none ${c.btn}`}
          >
            Quiero resolver esto en mi empresa <ArrowRight size={16} />
          </a>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ── Consola de verificación del hero ─────────────────────────────────────────
// Reemplaza la foto stock de Unsplash: cada fila sale de un caso documentado en
// data/caseStudies.js (no inventar filas sin caso detrás — regla de la marca).
const SYSTEM_ROWS = [
  { proc: 'conciliacion_financiera', before: '3 h a mano', after: '30 s' },
  { proc: 'factura_electronica_4.4', before: 'revisión a fin de mes', after: 'mismo día' },
  { proc: 'cartera_de_clientes', before: '943 filas en Excel', after: '24 prioridades' },
  { proc: 'planilla_y_ccss', before: 'quincena manual', after: 'minutos' },
];

// ── Manifiesto ────────────────────────────────────────────────────────────────
const PRINCIPLES = [
  { n: '01', title: 'Resolvemos la causa', body: 'No automatizamos un proceso defectuoso solo porque lo pidieron. Primero entendemos por qué existe.' },
  { n: '02', title: 'Probamos antes de afirmar', body: 'Un sistema no está terminado porque "parece funcionar". Está terminado cuando podemos demostrarlo con datos reales.' },
  { n: '03', title: 'Diseñamos para el siguiente problema', body: 'Cada proyecto deja una pieza reutilizable. Por eso el segundo sistema siempre llega más rápido que el primero.' },
  { n: '04', title: 'La realidad manda', body: 'La herramienta se adapta a tu proceso, tu regulación y tu país — nunca al revés.' },
  { n: '05', title: 'Terminado significa usable', body: 'Si técnicamente funciona pero tu equipo no puede operarlo, todavía no está terminado.' },
  { n: '06', title: 'La evidencia puede cambiarnos de opinión', body: 'Defender una decisión equivocada por ego cuesta más que corregirla. Lo aplicamos también a nuestras propias ideas.' },
];

// ── Capa Costa Rica ───────────────────────────────────────────────────────────
// El diferenciador que ningún software traducido puede copiar: los sistemas
// nacen entendiendo la regulación y la forma de operar local.
const CR_LAYERS = [
  { code: 'FE_4.4', label: 'Factura electrónica v4.4', desc: 'Validación contra el esquema y rechazos de Hacienda detectados el mismo día.' },
  { code: 'CCSS', label: 'Planilla, CCSS y SICERE', desc: 'Deducciones, incapacidades y archivos listos para carga — sin fórmulas frágiles.' },
  { code: 'LABORAL', label: 'Cesantía, aguinaldo y vacaciones', desc: 'Las reglas del Código de Trabajo convertidas en cálculo reproducible.' },
  { code: 'PAGOS', label: 'SINPE y pagos locales', desc: 'Nuestros productos cobran como cobra Costa Rica, no como cobra otro mercado.' },
  { code: 'L-8968', label: 'Protección de datos (Ley 8968)', desc: 'Privacidad diseñada desde el inicio, no parchada al final.' },
  { code: 'WA', label: 'WhatsApp como canal real', desc: 'Donde el negocio tico realmente conversa: reservas, avisos y confirmaciones.' },
];

const NAV_LINKS = [
  { label: 'Sistemas', href: '#soluciones' },
  { label: 'Cotizador', href: '#roi' },
  { label: 'Evidencia', href: '#portfolio' },
  { label: 'Sitios', href: '#sitios' },
  { label: 'Manifiesto', href: '#manifiesto' },
  { label: 'Metodología', href: '#metodologia' },
  { label: 'Contacto', href: '#contacto' },
];

// Ids que el scrollspy vigila para marcar el enlace activo (los mismos anchors
// de NAV_LINKS, sin el "#").
const NAV_SECTION_IDS = NAV_LINKS.map((l) => l.href.slice(1));

// Placeholder slate sólido para imágenes remotas que fallan (evita el ícono de imagen rota)
const PLACEHOLDER_IMG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='10'%3E%3Crect width='100%25' height='100%25' fill='%231e293b'/%3E%3C/svg%3E";
const onImgError = (e) => {
  const img = e.currentTarget;
  if (img.dataset.fallback) return;
  img.dataset.fallback = '1';
  img.src = PLACEHOLDER_IMG;
};

// ── SystemConsole ─────────────────────────────────────────────────────────────
// Visual del hero: un panel de verificación de sistema con procesos reales
// pasando de "dependiente de una persona" a "verificado". Sustituye la foto
// stock: nada comunica mejor la marca que ver un proceso volverse sistema.
const SystemConsole = ({ prefersReducedMotion }) => {
  const rowAnim = (i) => (prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, x: -12 },
        animate: { opacity: 1, x: 0 },
        transition: { delay: 0.9 + i * 0.35, duration: 0.45, ease: 'easeOut' },
      });

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-950 shadow-[0_20px_60px_-15px_rgba(37,99,235,0.5)] font-mono text-xs sm:text-[13px]">
      {/* Barra de título estilo terminal */}
      <div className="flex items-center gap-2 px-4 h-10 bg-slate-900 border-b border-white/10">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
        </span>
        <span className="flex-1 text-center text-slate-500 truncate">jc://sistema_en_produccion</span>
        <span className="flex items-center gap-1.5 shrink-0" aria-hidden="true">
          <span className="relative flex w-1.5 h-1.5">
            <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-70 animate-ping motion-reduce:animate-none" />
            <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-emerald-400" />
          </span>
          <span className="text-[9px] uppercase tracking-widest text-slate-500">live</span>
        </span>
      </div>

      {/* Barra de progreso: se llena mientras las filas van verificándose */}
      <motion.div
        aria-hidden="true"
        initial={prefersReducedMotion ? false : { scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.7, duration: 2.2, ease: 'easeInOut' }}
        style={{ transformOrigin: '0% 50%' }}
        className="h-0.5 bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400"
      />

      {/* Cuerpo */}
      <div className="p-4 sm:p-6 space-y-1">
        <motion.p
          {...(prefersReducedMotion ? {} : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay: 0.6 } })}
          className="text-slate-500 mb-3"
        >
          <span className="text-blue-400">▸</span> verificando dependencias del proceso…
        </motion.p>

        {SYSTEM_ROWS.map((row, i) => (
          <motion.div
            key={row.proc}
            {...rowAnim(i)}
            className="py-2 sm:py-2.5 border-b border-white/5 last:border-0 min-w-0"
          >
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Check size={13} strokeWidth={3} className="text-emerald-400 shrink-0" aria-hidden="true" />
              <span className="text-slate-200 truncate">{row.proc}</span>
              <span className="flex-1 border-b border-dotted border-slate-800 mx-1 hidden sm:block" aria-hidden="true" />
              <span className="text-red-300/60 line-through decoration-red-400/40 whitespace-nowrap hidden sm:inline">{row.before}</span>
              <span className="text-slate-600 shrink-0 hidden sm:inline" aria-hidden="true">→</span>
              <span className="text-emerald-300 font-bold whitespace-nowrap hidden sm:inline">{row.after}</span>
            </div>
            {/* Móvil: el antes → después no se pierde — baja a su propia línea */}
            <div className="flex sm:hidden items-center gap-1.5 pl-[21px] mt-1 text-[11px] min-w-0">
              <span className="text-red-300/60 line-through decoration-red-400/40 truncate">{row.before}</span>
              <span className="text-slate-600 shrink-0" aria-hidden="true">→</span>
              <span className="text-emerald-300 font-bold whitespace-nowrap">{row.after}</span>
            </div>
          </motion.div>
        ))}

        {/* Cierre: la tesis de la empresa en una línea de log */}
        <motion.div
          {...(prefersReducedMotion ? {} : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay: 2.5, duration: 0.5 } })}
          className="pt-4 space-y-1.5"
        >
          <p className="text-slate-500">
            depende_de: <span className="text-red-300/70 line-through decoration-red-400/40">persona</span>{' '}
            <span className="text-slate-600">→</span> <span className="text-emerald-300 font-bold">sistema</span>
          </p>
          <p className="text-slate-300">
            <span className="text-blue-400">▸</span> estado: <span className="text-emerald-300 font-bold">verificado con datos reales</span>
            <span className="inline-block w-2 h-3.5 ml-1.5 bg-emerald-400/80 align-middle animate-pulse motion-reduce:animate-none" aria-hidden="true" />
          </p>
        </motion.div>
      </div>
    </div>
  );
};

const App = () => {
  const [activePhase, setActivePhase] = useState(0);
  const [activeModal, setActiveModal] = useState(null);
  const [navOpen, setNavOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Estado del formulario de Assessment (Fase 0)
  const [assessmentName, setAssessmentName] = useState('');
  const [assessmentEmail, setAssessmentEmail] = useState('');
  const [assessmentPhone, setAssessmentPhone] = useState('');
  const [assessmentPain, setAssessmentPain] = useState('');
  const [assessmentSent, setAssessmentSent] = useState(false);

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 767px)");
    const touchQuery = window.matchMedia("(hover: none), (pointer: coarse)");
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const syncDeviceState = () => {
      setIsMobileViewport(mobileQuery.matches);
      setIsTouchDevice(touchQuery.matches);
      setPrefersReducedMotion(reducedMotionQuery.matches);
    };

    syncDeviceState();

    mobileQuery.addEventListener("change", syncDeviceState);
    touchQuery.addEventListener("change", syncDeviceState);
    reducedMotionQuery.addEventListener("change", syncDeviceState);

    return () => {
      mobileQuery.removeEventListener("change", syncDeviceState);
      touchQuery.removeEventListener("change", syncDeviceState);
      reducedMotionQuery.removeEventListener("change", syncDeviceState);
    };
  }, []);
  
  // Smooth scroll (Lenis) + cursor custom — solo en desktop/no-touch.
  // En táctil dejamos el scroll nativo del SO (Lenis lo degrada en móvil).
  useEffect(() => {
    if (isMobileViewport || isTouchDevice) {
      return undefined;
    }

    document.body.classList.add('hide-cursor');

    const lenis = new Lenis({
      lerp: 0.08,
      smoothWheel: true,
    });

    // Conduce el rAF de Lenis desde el ticker de GSAP (un solo loop, sin leak).
    const tickerCallback = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(tickerCallback);
    gsap.ticker.lagSmoothing(0);

    return () => {
      document.body.classList.remove('hide-cursor');
      gsap.ticker.remove(tickerCallback);
      lenis.destroy();
    };
  }, [isMobileViewport, isTouchDevice]);

  // Bloqueo de scroll + Escape + retorno de foco para el panel de navegación móvil
  const navBtnRef = useRef(null);
  useEffect(() => {
    if (!navOpen) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        setNavOpen(false);
        navBtnRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', handleKey);
    };
  }, [navOpen]);

  // Scrollspy: marca en el nav la sección visible. La banda de detección va del
  // 35% al 45% del viewport — la sección que la cruza es la "actual".
  const [activeSection, setActiveSection] = useState('');
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: '-35% 0px -55% 0px', threshold: 0 }
    );
    NAV_SECTION_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  // Scroll progress bar
  const { scrollYProgress: pageScrollProgress } = useScroll();
  const scaleProgress = useSpring(pageScrollProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  // Navbar & Hero Scroll logic
  const { scrollY } = useScroll();
  const heroRef = useRef(null);
  const { scrollYProgress: heroScrollY } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroImageY = useTransform(heroScrollY, [0, 1], ["0%", "50%"]);
  const heroOpacity = useTransform(heroScrollY, [0, 1], [1, 0]);

  const navBackground = useTransform(
    scrollY,
    [0, 100],
    ["rgba(15, 23, 42, 0)", "rgba(15, 23, 42, 0.75)"]
  );
  
  const navBackdropBlur = useTransform(
    scrollY,
    [0, 100],
    ["blur(0px)", "blur(16px)"]
  );

  const navBorder = useTransform(
    scrollY,
    [0, 100],
    ["transparent", "rgba(255, 255, 255, 0.05)"]
  );

  const handleAssessmentClick = (e) => {
    if (e) e.preventDefault();
    const email = "gerencia@jcanalytic.com";
    const subject = "Solicitud de Assessment Fase 0 - JC Analytics";
    const body =
      `Nombre / Empresa: ${assessmentName || '(sin especificar)'}\n` +
      `Email de contacto: ${assessmentEmail || '(sin especificar)'}\n` +
      `Teléfono: ${assessmentPhone || '(no indicado)'}\n` +
      `Principal dolor: ${assessmentPain || '(sin especificar)'}`;
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setAssessmentSent(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-blue-500 selection:text-white overflow-x-hidden">
      {!isTouchDevice && !isMobileViewport && <CustomCursor />}

      {/* Modal Problema Oculto */}
      <AnimatePresence>
        {activeModal && (
          <ProblemModal modalKey={activeModal} onClose={() => setActiveModal(null)} sheet={isMobileViewport} />
        )}
      </AnimatePresence>

      {/* Scroll Progress Bar */}
      <motion.div
        className="scroll-progress-bar"
        style={{ scaleX: scaleProgress }}
      />

      {/* Textura de ruido — solo desktop: en móvil es imperceptible y el blend
          de pantalla completa cuesta una capa de composición extra por frame. */}
      <div className="hidden md:block fixed inset-0 noise-overlay pointer-events-none z-50 mix-blend-overlay" />
      {/* Background3D retirado del hero (abr-26) — reducir capas visuales simultáneas. Se mantiene el import para futura reutilización en otra sección. */}
      
      {/* Navigation - Dynamic Glassmorphism */}
      <motion.nav
        style={{
          backgroundColor: navBackground,
          backdropFilter: navBackdropBlur,
          borderBottomColor: navBorder,
          borderBottomWidth: "1px"
        }}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="fixed w-full z-50 transition-colors duration-300"
      >
        {/* Capa sólida bajo la barra cuando el menú está abierto (el estilo del
            nav mantiene siempre los MotionValues: alternar tipos por render
            rompe la contabilidad de AnimatePresence en el exit del panel) */}
        <div
          aria-hidden="true"
          className={`absolute inset-0 bg-slate-950 transition-opacity duration-300 pointer-events-none ${navOpen ? 'opacity-100' : 'opacity-0'}`}
        />
        <div className="relative max-w-7xl mx-auto px-3 sm:px-4 h-16 sm:h-20 flex items-center justify-between gap-3">
          <a href="#top" className="flex items-center gap-2.5 group cursor-pointer shrink-0 min-h-11">
            <motion.img
              whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
              src={import.meta.env.BASE_URL + "LogoMark.webp"}
              alt=""
              width={162}
              height={200}
              decoding="async"
              className="h-9 sm:h-11 w-auto object-contain"
            />
            <span className="font-display text-lg sm:text-xl font-extrabold tracking-tight text-white leading-none">
              JC Analytics
            </span>
          </a>

          {/* Nav desktop — gap reducido en lg para que los 7 enlaces no desborden */}
          <nav className="hidden lg:flex items-center gap-5 xl:gap-7" aria-label="Navegación principal">
            {NAV_LINKS.map((l) => {
              const isActive = activeSection === l.href.slice(1);
              return (
                <a
                  key={l.href}
                  href={l.href}
                  aria-current={isActive ? 'location' : undefined}
                  className={`link-underline text-sm font-semibold transition-colors ${
                    isActive ? 'text-white' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {l.label}
                  {isActive && (
                    <motion.span
                      layoutId="nav-active-dot"
                      className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400"
                      aria-hidden="true"
                    />
                  )}
                </a>
              );
            })}
          </nav>

          {/* CTA desktop */}
          <a
            href="https://wa.me/50670330596"
            target="_blank"
            rel="noreferrer"
            className="btn-sheen hidden lg:inline-flex items-center gap-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 px-5 py-2.5 rounded-full font-bold transition-all shadow-lg backdrop-blur-md shrink-0"
          >
            WhatsApp
            <ArrowRight size={18} />
          </a>

          {/* Hamburguesa móvil */}
          <button
            ref={navBtnRef}
            onClick={() => setNavOpen((v) => !v)}
            aria-label={navOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={navOpen}
            aria-controls="mobile-nav-panel"
            className="tap-press lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-full bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 text-white transition-colors shrink-0"
          >
            <motion.span
              key={navOpen ? 'close' : 'open'}
              initial={prefersReducedMotion ? false : { rotate: navOpen ? -90 : 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="flex items-center justify-center"
            >
              {navOpen ? <X size={22} /> : <Menu size={22} />}
            </motion.span>
          </button>
        </div>

        {/* Panel móvil — sheet premium con backdrop, stagger y sección activa.
            Backdrop y panel van como hermanos directos de AnimatePresence (con
            key propio): envueltos en un Fragment, el exit nunca completa. */}
        <AnimatePresence>
          {navOpen && (
              <motion.div
                key="mobile-nav-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                onClick={() => setNavOpen(false)}
                aria-hidden="true"
                className="lg:hidden fixed inset-0 top-16 sm:top-20 bg-slate-950/70 backdrop-blur-sm"
              />
          )}
          {navOpen && (
              <motion.div
                key="mobile-nav-panel"
                id="mobile-nav-panel"
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
                transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="lg:hidden absolute top-full inset-x-0 bg-slate-950/98 border-b border-white/10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] rounded-b-[1.75rem] overflow-hidden"
              >
                <nav
                  className="max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain px-4 pt-2 pb-5 flex flex-col"
                  aria-label="Navegación móvil"
                >
                  {NAV_LINKS.map((l, i) => {
                    const isActive = activeSection === l.href.slice(1);
                    return (
                      <motion.a
                        key={l.href}
                        href={l.href}
                        onClick={() => setNavOpen(false)}
                        initial={prefersReducedMotion ? false : { opacity: 0, x: -14 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.05 + i * 0.045, duration: 0.3, ease: 'easeOut' }}
                        className={`tap-press group flex items-center gap-3.5 py-3 px-3.5 min-h-12 rounded-xl transition-colors ${
                          isActive
                            ? 'bg-blue-500/10 text-white'
                            : 'text-slate-200 hover:text-white hover:bg-white/5 active:bg-white/10'
                        }`}
                        aria-current={isActive ? 'location' : undefined}
                      >
                        <span
                          className={`font-mono text-[10px] font-bold tracking-widest ${
                            isActive ? 'text-cyan-400' : 'text-slate-600'
                          }`}
                        >
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className="flex-1 text-base font-semibold">{l.label}</span>
                        {isActive ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.9)]" aria-hidden="true" />
                        ) : (
                          <ChevronRight size={15} className="text-slate-600 group-hover:text-slate-400 transition-colors" aria-hidden="true" />
                        )}
                      </motion.a>
                    );
                  })}

                  <motion.div
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.05 + NAV_LINKS.length * 0.045, duration: 0.3 }}
                    className="mt-4 pt-4 border-t border-white/10"
                  >
                    <a
                      href="https://wa.me/50670330596"
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => setNavOpen(false)}
                      className="tap-press btn-sheen flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white px-5 py-3.5 min-h-12 rounded-2xl font-bold transition-colors shadow-[0_10px_30px_-10px_rgba(16,185,129,0.6)]"
                    >
                      <MessageSquare size={18} /> Contactar por WhatsApp
                    </a>
                    <div className="mt-4 flex items-center justify-center gap-2 text-[11px] font-mono uppercase tracking-[0.14em] text-slate-500 pb-safe">
                      <MapPin size={11} aria-hidden="true" /> Heredia, Costa Rica · respuesta en &lt;24 h
                    </div>
                  </motion.div>
                </nav>
              </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Hero Section — refinado: 1 acento (azul brand), claim declarativo, prueba arriba del fold */}
      <header id="top" ref={heroRef} className="relative pt-24 pb-14 sm:pt-32 sm:pb-24 lg:pt-40 lg:pb-32 overflow-hidden bg-slate-950 text-white">
        
        {/* Gradient blobs sutiles — única animación protagonista del hero */}
        <div className="absolute top-0 right-0 w-full h-full overflow-hidden pointer-events-none opacity-30">
           <div className="absolute top-[-10%] right-[-15%] w-[280px] h-[280px] sm:w-[420px] sm:h-[420px] lg:w-[600px] lg:h-[600px] bg-blue-600 blur-[60px] sm:blur-[80px] animate-blob mix-blend-screen" />
           <div className="absolute bottom-[-10%] left-[-20%] w-[240px] h-[240px] sm:w-[340px] sm:h-[340px] lg:w-[500px] lg:h-[500px] bg-indigo-700 blur-[70px] sm:blur-[100px] animate-blob mix-blend-screen" style={{ animationDelay: '2s' }} />
        </div>

        <div className="max-w-7xl mx-auto px-3 sm:px-4 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-8 sm:gap-12 lg:gap-16">
            <motion.div 
              style={{ opacity: heroOpacity }}
              className="lg:w-1/2"
            >
              <FadeInUp delay={0.1}>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-mono font-medium mb-7 text-slate-200 border border-white/15 bg-white/5 backdrop-blur-sm uppercase tracking-[0.18em]">
                  <span className="pulse-soft w-1.5 h-1.5 rounded-full bg-blue-400" />
                  Ingeniería de sistemas de negocio · Costa Rica
                </div>
              </FadeInUp>
              {/* H1 con revelado carácter por carácter (SplitText renderiza spans: HTML válido) */}
              <h1 className="font-display text-[clamp(1.9rem,8.4vw,2.5rem)] sm:text-5xl md:text-6xl lg:text-[4rem] font-extrabold text-white leading-[1.08] sm:leading-[1.05] mb-5 sm:mb-6 tracking-[-0.02em] break-words">
                <SplitText text="Procesos que hoy dependen de personas." delay={0.15} />
                <br />
                <SplitText
                  text="Sistemas que mañana funcionan solos."
                  delay={0.75}
                  className="italic font-semibold text-slate-300"
                />
              </h1>
              <FadeInUp delay={0.3}>
                <p className="text-base sm:text-lg text-slate-400 mb-7 sm:mb-9 leading-relaxed max-w-xl font-sans">
                  Diseñamos software, automatización y sistemas de decisión para operaciones donde el Excel, las tareas manuales y el conocimiento disperso se convirtieron en el límite para crecer. <span className="text-white font-medium">Y no afirmamos nada que no podamos demostrar con tus datos.</span>
                </p>
              </FadeInUp>
              <FadeInUp delay={0.4}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 mb-8">
                  <motion.a
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    href="https://wa.me/50670330596?text=Hola%2C%20tengo%20un%20proceso%20que%20depende%20de%20una%20persona%20y%20quiero%20convertirlo%20en%20sistema."
                    target="_blank"
                    rel="noreferrer"
                    className="btn-sheen glow-hover bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white px-6 sm:px-7 py-4 sm:py-3.5 rounded-xl font-semibold text-base flex items-center justify-center gap-2.5 transition-colors shadow-[0_0_30px_rgba(37,99,235,0.35)] min-h-12"
                  >
                    Diagnosticar mi proceso — sin costo
                    <ArrowRight size={18} />
                  </motion.a>
                  <a
                    href="#roi"
                    className="tap-press inline-flex items-center justify-center gap-2 text-slate-300 hover:text-white font-medium text-sm transition-colors group min-h-12 sm:min-h-11 rounded-xl border border-white/10 sm:border-transparent bg-white/5 sm:bg-transparent px-5 sm:px-0"
                  >
                    <Calculator size={16} />
                    Estimar mi proyecto
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </a>
                </div>
              </FadeInUp>
              <FadeInUp delay={0.5}>
                {/* Prueba arriba del fold — solo cifras con caso documentado detrás */}
                <div className="grid grid-cols-3 gap-2.5 sm:gap-6 pt-5 sm:pt-6 border-t border-white/10 max-w-xl">
                  <div className="min-w-0">
                    <div className="font-mono text-[clamp(1rem,5vw,1.25rem)] sm:text-2xl font-bold text-emerald-300 leading-none whitespace-nowrap">3h → 30s</div>
                    <div className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider mt-1.5 leading-tight">conciliación financiera</div>
                  </div>
                  <div className="min-w-0">
                    <div className="font-mono text-[clamp(1rem,5vw,1.25rem)] sm:text-2xl font-bold text-emerald-300 leading-none whitespace-nowrap">
                      <CountUp to={5900} suffix="+" />
                    </div>
                    <div className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider mt-1.5 leading-tight">comprobantes validados con Hacienda</div>
                  </div>
                  <div className="min-w-0">
                    <div className="font-mono text-[clamp(1rem,5vw,1.25rem)] sm:text-2xl font-bold text-emerald-300 leading-none whitespace-nowrap">
                      <CountUp to={3} />
                    </div>
                    <div className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider mt-1.5 leading-tight">productos propios en producción</div>
                  </div>
                </div>
              </FadeInUp>
            </motion.div>

            {/* Hero: consola de verificación — un proceso volviéndose sistema */}
            <motion.div
              style={{ y: prefersReducedMotion ? '0%' : heroImageY, opacity: heroOpacity }}
              className="lg:w-1/2 relative w-full perspective-1000 mt-8 sm:mt-12 lg:mt-0"
            >
              <FadeInUp delay={0.5}>
                <div className="float-idle">
                  <TiltCard className="relative">
                    <SystemConsole prefersReducedMotion={prefersReducedMotion} />
                  </TiltCard>
                </div>
              </FadeInUp>
            </motion.div>
          </div>

          {/* Indicador de scroll */}
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.2, duration: 0.8 }}
            className="hidden lg:flex justify-center mt-14"
          >
            <a
              href="#soluciones"
              aria-label="Bajar a la sección de sistemas"
              className="group flex flex-col items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.22em]">Ver cómo</span>
              <motion.span
                animate={prefersReducedMotion ? {} : { y: [0, 7, 0] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                className="w-8 h-8 rounded-full border border-white/15 bg-white/5 flex items-center justify-center group-hover:border-white/30 transition-colors"
              >
                <ChevronDown size={15} />
              </motion.span>
            </a>
          </motion.div>
        </div>
      </header>

      {/* Puente de transición oscuro → claro */}
      <div aria-hidden="true" className="h-16 sm:h-24 bg-gradient-to-b from-slate-950 to-white" />
      {/* Strip de Credibilidad y El Problema */}
      <section className="relative z-20 py-12 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-center text-[11px] font-mono uppercase tracking-[0.2em] text-slate-400 mb-4 sm:mb-6">Sectores que atendemos</p>
          {/* Móvil: grilla 2×2 de chips alineados. Desktop: fila tipográfica original. */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:justify-between sm:items-center gap-2.5 sm:gap-8 mb-12 sm:mb-20 sm:opacity-60 sm:grayscale hover:grayscale-0 transition-all duration-500" aria-label="Sectores atendidos">
             <div className="font-display font-black text-[13px] sm:text-2xl text-slate-600 sm:text-slate-800 sm:tracking-wider text-center sm:text-left border border-slate-200 sm:border-0 rounded-xl sm:rounded-none py-3 sm:py-0 px-2 sm:px-0 bg-slate-50/60 sm:bg-transparent leading-tight">Retail & Consumo</div>
             <div className="font-display font-black text-[13px] sm:text-3xl text-slate-600 sm:text-slate-800 sm:tracking-tighter text-center sm:text-left border border-slate-200 sm:border-0 rounded-xl sm:rounded-none py-3 sm:py-0 px-2 sm:px-0 bg-slate-50/60 sm:bg-transparent leading-tight">Sector Energético</div>
             <div className="font-display font-bold text-[13px] sm:text-2xl text-slate-600 sm:text-slate-800 sm:tracking-widest sm:italic text-center sm:text-left border border-slate-200 sm:border-0 rounded-xl sm:rounded-none py-3 sm:py-0 px-2 sm:px-0 bg-slate-50/60 sm:bg-transparent leading-tight">Logística & Distribución</div>
             <div className="font-display font-bold text-[13px] sm:text-2xl text-slate-600 sm:text-slate-800 sm:tracking-tight text-center sm:text-left border border-slate-200 sm:border-0 rounded-xl sm:rounded-none py-3 sm:py-0 px-2 sm:px-0 bg-slate-50/60 sm:bg-transparent leading-tight">Servicios Financieros</div>
          </div>

          <div className="text-center mb-10 sm:mb-16">
            <FadeInUp>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-full text-xs sm:text-sm font-bold mb-4 border border-red-100">
                <ShieldCheck size={14} /> El patrón que encontramos en cada empresa que auditamos
              </div>
              <h2 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-4 sm:mb-6 tracking-tight text-balance">
                Tu operación funciona porque <span className="text-red-500">alguien se acuerda</span> de hacerla funcionar.
              </h2>
              <p className="font-sans text-base sm:text-lg text-slate-500 max-w-2xl mx-auto mb-4">
                Reportes armados a mano, conocimiento que vive en la cabeza de una persona, decisiones que esperan al Excel.
                Son tres síntomas del mismo problema: <strong className="text-slate-700">dependencia operativa</strong>.
              </p>
              <div className="flex items-center justify-center gap-2 text-slate-500 font-medium font-sans">
                <Users size={18} className="text-blue-500" />
                <span>Identificado en <strong className="text-slate-700">+8 empresas</strong> de Heredia y Alajuela</span>
              </div>
            </FadeInUp>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 mb-12 sm:mb-16">
            {/* Card 1 — Reportes tardíos */}
            <FadeInUp delay={0.1}>
              <button
                onClick={() => setActiveModal('reportes')}
                onPointerMove={setSpotVars}
                className="spotlight text-left w-full bg-white p-6 sm:p-8 rounded-[1.5rem] border border-slate-200 hover:border-slate-300 hover:shadow-[0_20px_40px_-20px_rgba(15,23,42,0.15)] transition-all h-full flex flex-col group"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    <Clock size={14} className="text-[var(--brand-bad)]" />
                    <span>CASE_01 / REPORTS</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500">Mayorista · Alajuela</div>
                </div>
                <h3 className="font-display text-base sm:text-lg font-semibold text-slate-900 mb-3 leading-snug">
                  "Tus reportes llegan 3 días después de que ya no sirven"
                </h3>
                <p className="text-slate-500 mb-8 text-sm leading-relaxed flex-grow">
                  El equipo invierte horas exportando y consolidando datos. Las decisiones críticas se toman a ciegas o por intuición.
                </p>
                <div className="pt-6 border-t border-slate-100">
                  <div className="font-display text-[3rem] sm:text-[3.5rem] font-extrabold text-[var(--brand-bad)] leading-none tracking-tight">
                    −₡1.2M
                  </div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 mt-2">
                    Pérdida anual estimada · ineficiencia operativa
                  </div>
                  <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 border-b border-slate-300 group-hover:border-[var(--brand-bad)] group-hover:text-[var(--brand-bad)] pb-0.5 transition-colors">
                    Entender este problema <ChevronRight size={14} />
                  </div>
                </div>
              </button>
            </FadeInUp>

            {/* Card 2 — Excel manual */}
            <FadeInUp delay={0.2}>
              <button
                onClick={() => setActiveModal('excel')}
                onPointerMove={setSpotVars}
                className="spotlight text-left w-full bg-white p-6 sm:p-8 rounded-[1.5rem] border border-slate-200 hover:border-slate-300 hover:shadow-[0_20px_40px_-20px_rgba(15,23,42,0.15)] transition-all h-full flex flex-col group"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    <Database size={14} className="text-[var(--brand-bad)]" />
                    <span>CASE_02 / EXCEL</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500">Ferretería · Heredia</div>
                </div>
                <h3 className="font-display text-base sm:text-lg font-semibold text-slate-900 mb-3 leading-snug">
                  "Tu equipo dedica 40+ horas al mes a Excel"
                </h3>
                <p className="text-slate-500 mb-8 text-sm leading-relaxed flex-grow">
                  Talento caro haciendo tareas robóticas de copiar y pegar. Sin tiempo para analizar, expuesto a errores manuales costosos.
                </p>
                <div className="pt-6 border-t border-slate-100">
                  <div className="font-display text-[3rem] sm:text-[3.5rem] font-extrabold text-[var(--brand-bad)] leading-none tracking-tight">
                    −₡2.4M
                  </div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 mt-2">
                    Fuga anual · horas-persona en reportes manuales
                  </div>
                  <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 border-b border-slate-300 group-hover:border-[var(--brand-bad)] group-hover:text-[var(--brand-bad)] pb-0.5 transition-colors">
                    Entender este problema <ChevronRight size={14} />
                  </div>
                </div>
              </button>
            </FadeInUp>

            {/* Card 3 — Rentabilidad invisible */}
            <FadeInUp delay={0.3}>
              <button
                onClick={() => setActiveModal('rentabilidad')}
                onPointerMove={setSpotVars}
                className="spotlight text-left w-full bg-white p-6 sm:p-8 rounded-[1.5rem] border border-slate-200 hover:border-slate-300 hover:shadow-[0_20px_40px_-20px_rgba(15,23,42,0.15)] transition-all h-full flex flex-col group"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    <BarChart3 size={14} className="text-[var(--brand-bad)]" />
                    <span>CASE_03 / MARGIN</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500">Distribuidora · GAM</div>
                </div>
                <h3 className="font-display text-base sm:text-lg font-semibold text-slate-900 mb-3 leading-snug">
                  "No sabes quién genera el 80% del margen"
                </h3>
                <p className="text-slate-500 mb-8 text-sm leading-relaxed flex-grow">
                  Sin visibilidad de rentabilidad en tiempo real, financias inventario muerto y dejas pasar tus mayores riesgos de cartera.
                </p>
                <div className="pt-6 border-t border-slate-100">
                  <div className="font-display text-[3rem] sm:text-[3.5rem] font-extrabold text-[var(--brand-bad)] leading-none tracking-tight">
                    30%
                  </div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 mt-2">
                    Capital inmovilizado · sin visibilidad analítica
                  </div>
                  <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 border-b border-slate-300 group-hover:border-[var(--brand-bad)] group-hover:text-[var(--brand-bad)] pb-0.5 transition-colors">
                    Entender este problema <ChevronRight size={14} />
                  </div>
                </div>
              </button>
            </FadeInUp>
          </div>

          {/* Cierre Unificador y CTA */}
          <FadeInUp delay={0.4}>
            <div className="max-w-4xl mx-auto text-center bg-white rounded-[2rem] border border-slate-200 p-5 sm:p-8 md:p-12 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-[40px] pointer-events-none"></div>
               <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/5 rounded-full blur-[40px] pointer-events-none"></div>

               <h3 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 mb-4 relative z-10">
                 Si te identificaste con al menos uno, <span className="text-red-500">tu operación depende de personas donde debería depender de sistemas.</span>
               </h3>
               <p className="font-sans text-slate-600 text-lg mb-8 max-w-2xl mx-auto relative z-10">
                 Y las dependencias no se arreglan solas: se acumulan hasta que la persona clave se enferma, renuncia o se equivoca. Convertirlas en sistema es exactamente lo que hacemos.
               </p>
               
               <div className="flex flex-col sm:flex-row items-center justify-center gap-6 relative z-10">
                 <motion.a 
                   whileHover={{ scale: 1.05 }}
                   whileTap={{ scale: 0.95 }}
                   href="https://wa.me/50670330596?text=Quiero%20agendar%20un%20diagn%C3%B3stico%20gratis"
                   target="_blank"
                   rel="noreferrer"
                   className="tap-press btn-sheen glow-hover bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950 px-8 py-4 min-h-12 w-full sm:w-auto rounded-xl font-bold text-base sm:text-lg flex items-center justify-center gap-3 transition-all shadow-xl"
                 >
                   Agendar diagnóstico gratis <ArrowRight size={20} />
                 </motion.a>
                 <div className="flex flex-col items-start text-left">
                   <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
                     <CheckCircle size={16} className="text-emerald-500" /> Sin compromiso
                   </div>
                   <div className="flex items-center gap-2 text-slate-500 font-medium text-sm mt-1">
                     <span className="font-black text-slate-800 tracking-tighter">JC</span> Analytics · Cero costo inicial
                   </div>
                 </div>
               </div>
            </div>
          </FadeInUp>
        </div>

        {/* Social Proof Animated Ticker */}
        <div className="marquee mt-12 sm:mt-20 w-full bg-slate-900 py-4 sm:py-6 overflow-hidden flex border-y border-slate-800" aria-hidden="true">
          <motion.div
            animate={prefersReducedMotion ? { x: "0%" } : { x: ["0%", "-50%"] }}
            transition={prefersReducedMotion ? { duration: 0 } : { ease: "linear", duration: 30, repeat: Infinity }}
            className="flex whitespace-nowrap min-w-max"
          >
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex gap-8 sm:gap-16 items-center px-4 sm:px-8">
                <div className="flex items-center gap-2 sm:gap-3 text-white font-bold text-sm sm:text-base md:text-lg ticker-item"><span className="text-emerald-400">Probado, no prometido</span> — evidencia en cada entrega</div>
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-slate-700 shrink-0"></div>
                <div className="flex items-center gap-2 sm:gap-3 text-white font-bold text-sm sm:text-base md:text-lg ticker-item"><span className="text-blue-400">De procesos dependientes</span> a sistemas que funcionan</div>
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-slate-700 shrink-0"></div>
                <div className="flex items-center gap-2 sm:gap-3 text-white font-bold text-sm sm:text-base md:text-lg ticker-item"><span className="text-cyan-400">3 productos propios</span> operando en producción</div>
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-slate-700 shrink-0"></div>
                <div className="flex items-center gap-2 sm:gap-3 text-white font-bold text-sm sm:text-base md:text-lg ticker-item"><span className="text-emerald-400">Avances cada 72 h</span>, no al final</div>
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-slate-700 shrink-0"></div>
                <div className="flex items-center gap-2 sm:gap-3 text-white font-bold text-sm sm:text-base md:text-lg ticker-item"><span className="text-blue-400">Cero dependencia</span> — tu equipo lo opera solo</div>
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-slate-700 shrink-0"></div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Servicios — grilla plana (antes: carrusel horizontal con pinning GSAP) */}
      <div id="soluciones" className="scroll-mt-20">
        <Suspense fallback={<div className="min-h-[60vh]" aria-hidden="true" />}>
          <ServicesGrid />
        </Suspense>
      </div>

      {/* ROI & Calculator */}
      {/* Puente de transición claro → oscuro */}
      <div aria-hidden="true" className="h-16 sm:h-24 bg-gradient-to-b from-slate-50 to-slate-950" />
      <section id="roi" className="scroll-mt-20 py-14 sm:py-20 md:py-24 bg-slate-950 text-white relative overflow-hidden z-20">
        {/* Decorative background grids */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.05] mix-blend-overlay"></div>
        <div className="absolute top-0 right-0 w-[340px] h-[340px] sm:w-[520px] sm:h-[520px] lg:w-[800px] lg:h-[800px] bg-emerald-500/10 rounded-full blur-[100px] sm:blur-[120px] pointer-events-none" />

        <QuoteEstimator />
      </section>

      {/* Casos de Uso Reales / Portfolio */}
      {/* Puente de transición oscuro → claro */}
      <div aria-hidden="true" className="h-16 sm:h-24 bg-gradient-to-b from-slate-950 to-slate-50" />
      <section id="portfolio" className="scroll-mt-20 py-14 sm:py-20 md:py-24 bg-slate-50 relative overflow-hidden z-10">
        <div className="absolute top-0 left-0 w-full h-[320px] sm:h-[420px] lg:h-[500px] bg-gradient-to-b from-slate-100 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <FadeInUp>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-xs sm:text-sm font-bold mb-5 border border-emerald-100">
                <CheckCircle size={14} /> Evidencia, no promesas
              </div>
              <h2 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-5 sm:mb-6 tracking-tight">
                Probado, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-500">no prometido.</span>
              </h2>
              <p className="font-sans text-base sm:text-lg text-slate-500 max-w-2xl mx-auto">
                Cada cifra de este sitio tiene un caso medido detrás. Estos son tres, con el antes, el después y la dependencia que se eliminó.
              </p>
              <HeaderRule className="mx-auto mt-6" />
            </FadeInUp>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-8 mb-12 sm:mb-16">
            {[
              {
                sector: 'Empresa de distribución · Heredia',
                before: '2 personas y 12 h semanales consolidando ventas de 3 sistemas distintos.',
                after: '20 minutos automatizados, implementados en 3 semanas.',
                freed: 'Dos personas dejaron de ser el proceso.',
              },
              {
                sector: 'Empresa de servicios financieros',
                before: 'Cierre de conciliación de 3 horas, con errores de digitación frecuentes.',
                after: '30 segundos por cierre. Cero errores desde la implementación.',
                freed: 'El cierre ya no depende de que nadie se concentre.',
              },
              {
                sector: 'Retail multilocal · 24 tiendas',
                before: 'SKUs perdiendo margen que nadie veía hasta semanas después.',
                after: '174 productos visibles en tiempo real, operado por el equipo desde el día 1.',
                freed: 'La visibilidad ya no espera a que alguien consolide.',
              },
            ].map((c, idx) => (
              <FadeInUp key={c.sector} delay={0.1 * (idx + 1)} className="h-full">
                <motion.div
                  whileHover={{ y: -5 }}
                  onPointerMove={setSpotVars}
                  className="spotlight bg-white p-5 sm:p-8 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-2xl hover:border-slate-300 transition-all h-full flex flex-col relative group"
                >
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">{c.sector}</div>
                  <div className="space-y-5 flex-grow">
                    <motion.div
                      initial={{ opacity: 0, x: -14 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, margin: '-40px' }}
                      transition={{ delay: 0.25 + 0.1 * idx, duration: 0.5, ease: [0.19, 1, 0.22, 1] }}
                    >
                      <div className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-red-400 mb-1.5">Antes</div>
                      <p className="text-slate-600 leading-relaxed text-sm sm:text-base">{c.before}</p>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, x: -14 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, margin: '-40px' }}
                      transition={{ delay: 0.45 + 0.1 * idx, duration: 0.5, ease: [0.19, 1, 0.22, 1] }}
                    >
                      <div className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-600 mb-1.5">Ahora</div>
                      <p className="text-slate-900 font-semibold leading-relaxed text-sm sm:text-base">{c.after}</p>
                    </motion.div>
                  </div>
                  <div className="mt-auto pt-6 border-t border-slate-100">
                    <div className="flex items-start gap-2.5 text-sm text-slate-500 font-medium">
                      <CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={16} />
                      <p><span className="text-slate-700 font-bold">Dependencia eliminada:</span> {c.freed}</p>
                    </div>
                  </div>
                </motion.div>
              </FadeInUp>
            ))}
          </div>

          <FadeInUp delay={0.4}>
            <div className="max-w-4xl mx-auto bg-slate-900 rounded-3xl p-5 sm:p-8 md:p-12 text-center shadow-xl border border-slate-800/80 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px]"></div>
              <p className="font-sans text-xl md:text-2xl text-white font-medium mb-10 leading-relaxed italic relative z-10 text-balance">
                "Si un proceso de tu empresa depende de una sola persona, hablemos 30 minutos. Sin presentación de ventas — revisamos con tus datos si convertirlo en sistema tiene ROI, y si no lo tiene, te lo decimos."
              </p>
              <a
                href="#contacto"
                className="tap-press btn-sheen glow-hover relative z-10 inline-flex w-full sm:w-auto items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white px-6 md:px-10 py-4 md:py-6 rounded-full font-bold text-base sm:text-lg md:text-xl transition-all hover:scale-105 shadow-[0_10px_40px_rgba(5,150,105,0.4)]"
              >
                Validar mi resultado gratis <ArrowRight size={22} />
              </a>
            </div>
          </FadeInUp>
        </div>
      </section>

      {/* Sitios propios — productos web que construimos y operamos */}
      {/* Puente de transición claro → oscuro */}
      <div aria-hidden="true" className="h-16 sm:h-24 bg-gradient-to-b from-slate-50 to-slate-950" />
      <WebProperties />

      {/* Hecho para Costa Rica — la capa local como ventaja, no como parche */}
      <section id="costarica" className="scroll-mt-20 py-14 sm:py-20 md:py-24 bg-slate-950 text-white relative overflow-hidden z-20 border-t border-slate-800/60">
        <div className="absolute top-0 right-1/4 w-[240px] h-[240px] sm:w-[380px] sm:h-[380px] bg-blue-600/10 rounded-full blur-[110px] pointer-events-none mix-blend-screen" />
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="max-w-3xl mb-10 sm:mb-14">
            <FadeInUp>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-xs sm:text-sm font-bold mb-5 backdrop-blur-md text-emerald-300">
                <MapPin size={14} /> Hecho para Costa Rica
              </div>
              <h2 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-5 tracking-tight text-balance">
                No traducimos software extranjero.{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-cyan-300">
                  Modelamos cómo se opera acá.
                </span>
              </h2>
              <p className="font-sans text-base sm:text-lg text-slate-400 leading-relaxed">
                La mayoría del software que llega al país trata a Costa Rica como una configuración regional. Nuestros
                sistemas nacen entendiendo la regulación fiscal, laboral y la forma real de hacer negocios — y esa capa
                es la parte más difícil de copiar.
              </p>
              <HeaderRule className="mt-6" />
            </FadeInUp>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {CR_LAYERS.map((item, idx) => (
              <FadeInUp key={item.code} delay={0.08 * idx} className="h-full">
                <motion.div
                  whileHover={{ y: -4 }}
                  onPointerMove={setSpotVars}
                  className="spotlight spotlight-dark h-full bg-slate-900/60 border border-slate-800 hover:border-slate-600 rounded-2xl p-5 sm:p-6 transition-colors duration-300 group"
                >
                  <div className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400/80 mb-3 group-hover:text-emerald-300 transition-colors">
                    {item.code}
                  </div>
                  <h3 className="font-display text-base sm:text-lg font-bold text-white mb-2 leading-snug">{item.label}</h3>
                  <p className="font-sans text-[13px] sm:text-sm text-slate-400 leading-relaxed">{item.desc}</p>
                </motion.div>
              </FadeInUp>
            ))}
          </div>
        </div>
      </section>

      {/* Puente de transición oscuro → claro */}
      <div aria-hidden="true" className="h-16 sm:h-24 bg-gradient-to-b from-slate-950 to-white" />

      {/* Manifiesto — propósito, misión, visión y reglas de ingeniería */}
      <section id="manifiesto" className="scroll-mt-20 py-16 sm:py-24 md:py-32 bg-white relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 relative z-10">
          <div className="text-center mb-12 sm:mb-16">
            <FadeInUp>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-bold mb-6 border border-blue-100">
                <Compass size={16} /> Manifiesto
              </div>
              <h2 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-4 tracking-tight text-balance">
                En qué creemos y hacia dónde vamos.
              </h2>
              <HeaderRule className="mx-auto" />
            </FadeInUp>
          </div>

          {/* Propósito — la afirmación grande */}
          <FadeInUp delay={0.1}>
            <div className="text-center max-w-4xl mx-auto mb-12 sm:mb-16">
              <div className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-blue-600 mb-4">Propósito</div>
              <p className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 leading-snug text-balance">
                Que las empresas puedan crecer{' '}
                <span className="animate-gradient-mesh text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600">
                  sin que su complejidad crezca con ellas.
                </span>
              </p>
            </div>
          </FadeInUp>

          {/* Misión y Visión */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 mb-12 sm:mb-16">
            <FadeInUp delay={0.15} className="h-full">
              <div onPointerMove={setSpotVars} className="spotlight h-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-[2rem] p-6 sm:p-9 relative overflow-hidden transition-colors duration-300">
                <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/5 rounded-full blur-[50px] pointer-events-none" />
                <div className="flex items-center gap-2.5 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                    <Target size={20} />
                  </div>
                  <span className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Misión</span>
                </div>
                <p className="font-display text-xl sm:text-2xl font-bold text-slate-900 leading-snug mb-4">
                  Convertir procesos que dependen de personas y trabajo manual en sistemas confiables, medibles y escalables.
                </p>
                <p className="font-sans text-sm sm:text-base text-slate-500 leading-relaxed">
                  Con datos, automatización, software a la medida y el conocimiento regulatorio de operar en Costa Rica —
                  entregado con evidencia de que funciona, no con promesas.
                </p>
              </div>
            </FadeInUp>

            <FadeInUp delay={0.25} className="h-full">
              <div onPointerMove={setSpotVars} className="spotlight spotlight-dark h-full bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-[2rem] p-6 sm:p-9 relative overflow-hidden text-white transition-colors duration-300">
                <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/10 rounded-full blur-[50px] pointer-events-none" />
                <div className="flex items-center gap-2.5 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-300 flex items-center justify-center">
                    <Eye size={20} />
                  </div>
                  <span className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">Visión 2031</span>
                </div>
                <p className="font-display text-xl sm:text-2xl font-bold leading-snug mb-4">
                  Una compañía tecnológica costarricense que crece sin depender de las horas de sus fundadores.
                </p>
                <p className="font-sans text-sm sm:text-base text-slate-400 leading-relaxed">
                  Combinando soluciones empresariales de alto valor con al menos tres productos autosostenibles operando
                  en Centroamérica. Es una visión medible: en 2031 se cumplió o no se cumplió.
                </p>
              </div>
            </FadeInUp>
          </div>

          {/* Principios — reglas de ingeniería, no valores de pared */}
          <FadeInUp delay={0.2}>
            <div className="text-center mb-8 sm:mb-10">
              <h3 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 mb-3">
                Reglas de ingeniería, no valores de pared.
              </h3>
              <p className="font-sans text-sm sm:text-base text-slate-500 max-w-2xl mx-auto">
                Cualquier empresa puede firmar "innovación y compromiso". Estas seis reglas se pueden verificar viendo cómo trabajamos.
              </p>
            </div>
          </FadeInUp>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {PRINCIPLES.map((p, idx) => (
              <FadeInUp key={p.n} delay={0.08 * idx} className="h-full">
                <motion.div
                  whileHover={{ y: -4 }}
                  onPointerMove={setSpotVars}
                  className="spotlight h-full bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-5 sm:p-6 transition-all duration-300 hover:shadow-[0_12px_30px_-18px_rgba(15,23,42,0.25)] group"
                >
                  <div className="font-mono text-2xl sm:text-3xl font-bold text-slate-200 group-hover:text-blue-500 transition-colors mb-3 leading-none">
                    {p.n}
                  </div>
                  <h4 className="font-display text-base sm:text-lg font-bold text-slate-900 mb-2 leading-snug">{p.title}</h4>
                  <p className="font-sans text-[13px] sm:text-sm text-slate-500 leading-relaxed">{p.body}</p>
                </motion.div>
              </FadeInUp>
            ))}
          </div>

          {/* Promesa de marca */}
          <FadeInUp delay={0.3}>
            <div className="mt-12 sm:mt-16 text-center">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400 mb-3">Nuestra promesa</p>
              <p className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 text-balance">
                De procesos dependientes{' '}
                <span className="animate-gradient-mesh text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-emerald-500 to-blue-600">
                  a sistemas que funcionan.
                </span>
              </p>
            </div>
          </FadeInUp>
        </div>
      </section>

      {/* Metodología 4D */}
      <section id="metodologia" className="scroll-mt-20 py-14 sm:py-20 md:py-24 bg-white relative border-t border-slate-200 z-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <FadeInUp>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-bold mb-6 border border-blue-100">
                <Layers size={16} /> Metodología 4D
              </div>
              <h2 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 text-slate-900 tracking-normal">Cómo un proceso se convierte en sistema.</h2>
              <p className="font-sans text-base sm:text-lg md:text-xl text-slate-600 max-w-3xl mx-auto mb-5 sm:mb-6">
                Cuatro fases con entregables verificables. Un sistema no está terminado cuando funciona — está terminado cuando podemos demostrarlo con tus datos y tu equipo lo opera sin nosotros.
              </p>
              <p className="text-base text-slate-400 max-w-2xl mx-auto font-medium italic">
                &ldquo;La mayoría de consultores llegan con una propuesta. Nosotros llegamos con preguntas. Esa es la diferencia entre un proyecto que funciona y uno que se entrega pero nadie usa.&rdquo;
              </p>
            </FadeInUp>
          </div>

          <FadeInUp delay={0.2}>
            <div className="bg-slate-50 rounded-[2rem] p-2 md:p-6 shadow-sm border border-slate-200 mb-8">
              {/* Tab Selector — en móvil: carrusel con snap, fade de borde y auto-centrado */}
              <div className="scroll-fade-x flex overflow-x-auto snap-x snap-mandatory flex-nowrap md:flex-row justify-between mb-3 md:mb-8 gap-3 relative pb-2 md:pb-0 no-scrollbar overscroll-x-contain" data-lenis-prevent style={{ touchAction: 'pan-x pan-y' }}>
                <div className="hidden md:block absolute top-1/2 left-0 w-full h-1 bg-slate-200 -translate-y-1/2 z-0"></div>
                {[
                  { id: "D1", title: "DEFINE", tagline: "Primero entendemos.", icon: <Target className="w-6 h-6" /> },
                  { id: "D2", title: "DEVELOP", tagline: "Construimos con tus datos.", icon: <MonitorSmartphone className="w-6 h-6" /> },
                  { id: "D3", title: "DEBUG", tagline: "Hasta que funcione.", icon: <Settings className="w-6 h-6" /> },
                  { id: "D4", title: "DEPLOY", tagline: "Tu equipo autónomo.", icon: <Cpu className="w-6 h-6" /> }
                ].map((phase, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => {
                      setActivePhase(idx);
                      e.currentTarget.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
                    }}
                    aria-pressed={activePhase === idx}
                    className={`tap-press relative z-10 w-[72vw] sm:w-[45vw] md:w-auto shrink-0 snap-center md:flex-1 flex flex-row md:flex-col items-center gap-4 p-4 min-h-[4.75rem] rounded-2xl transition-all duration-300 ${
                      activePhase === idx
                        ? 'bg-blue-600 text-white shadow-lg md:scale-105 scale-[1.02]'
                        : 'bg-white text-slate-500 hover:bg-blue-50 hover:text-blue-600 active:bg-blue-50 border border-slate-200'
                    }`}
                  >
                    <div className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center ${
                      activePhase === idx ? 'bg-white/20' : 'bg-slate-100'
                    }`}>
                      {phase.icon}
                    </div>
                    <div className="text-left md:text-center block min-w-0">
                      <div className={`text-xs font-bold uppercase tracking-widest ${
                        activePhase === idx ? 'text-blue-200' : 'text-slate-400'
                      }`}>{phase.id}</div>
                      <div className="font-display font-bold text-base sm:text-lg">{phase.title}</div>
                      <div className={`text-xs md:block ${
                        activePhase === idx ? 'text-blue-200' : 'text-slate-400'
                      }`}>{phase.tagline}</div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Indicador de fase (solo móvil): dónde estoy de las 4 */}
              <div className="flex md:hidden items-center justify-center gap-2 mb-5" role="tablist" aria-label="Fase de la metodología">
                {[0, 1, 2, 3].map((idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActivePhase(idx)}
                    aria-label={`Ir a la fase D${idx + 1}`}
                    aria-current={activePhase === idx}
                    className="tap-press flex items-center justify-center min-w-11 min-h-11 -mx-1.5"
                  >
                    <span
                      className={`block h-1.5 rounded-full transition-all duration-300 ${
                        activePhase === idx ? 'w-6 bg-blue-600' : 'w-1.5 bg-slate-300'
                      }`}
                    />
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] overflow-hidden">
                {[
                  {
                    summary: "Primera sesión sin costo. Mapeamos tus datos, tus procesos y tus dolores reales antes de escribir una sola línea de código.",
                    detail: "En esta fase no hay presentaciones ni demos. Hacemos preguntas incómodas: ¿Cuánto tiempo real tarda este proceso? ¿Quién lo hace y cuánto le pagás? ¿Qué pasa cuando hay un error? ¿Alguien toma decisiones basadas en este reporte o solo lo archivan? Al terminar el D1 tenés un diagnóstico escrito con el costo real de tu problema actual, los 3 procesos con mayor potencial de automatización ordenados por impacto, y una estimación honesta de si tiene sentido invertir o no. Si no tiene sentido, te lo decimos en esta fase — no después de que pagaste.",
                    deliverables: ["Diagnóstico del proceso AS-IS documentado", "Mapa de fuentes de datos disponibles", "Estimación de costo real del problema (en colones)", "Definición del alcance Go/No-Go"],
                    duration: "1–2 sesiones · Primera sin costo",
                    image: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=800",
                    imageAlt: "Sesión de diagnóstico de procesos junto al cliente"
                  },
                  {
                    summary: "Diseño y construcción del modelo. Avances cada 72 horas, no al final del proyecto.",
                    detail: "Aquí es donde la mayoría de consultores desaparecen 3 semanas. Nosotros trabajamos diferente: cada 72 horas hay una actualización visible, un avance funcional que podés tocar, no una presentación de PowerPoint explicando lo que vamos a hacer. Toda la construcción se hace con tus datos reales — no con datasets de demo. Eso significa que cuando llegue el D4, el sistema ya fue probado con la realidad de tu operación. La arquitectura se diseña para que tu equipo la pueda mantener. No queremos que dependás de nosotros para siempre.",
                    deliverables: ["Arquitectura del modelo documentada", "Primera versión funcional con datos reales", "Avances parciales cada 72 horas", "Revisión de alcance antes de continuar"],
                    duration: "1–3 semanas según complejidad",
                    image: "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?auto=format&fit=crop&q=80&w=800",
                    imageAlt: "Construcción del modelo de datos con datos reales del cliente"
                  },
                  {
                    summary: "Pruebas con tus datos reales, casos edge incluidos. Iteramos hasta que el resultado sea confiable, no solo correcto en condiciones ideales.",
                    detail: "Un sistema que funciona el 90% del tiempo no sirve en producción. En esta fase sometemos el modelo a los escenarios más incómodos: archivos con encoding diferente, fechas en formato texto, registros duplicados, columnas vacías, datos de meses anteriores que llegan tarde. Cada error que encontramos en el D3 es un error que no te va a despertar a las 11 de la noche en producción. También es la fase donde tu equipo empieza a conocer el sistema — los involucramos en las pruebas para que al momento del Deploy no sea algo nuevo y extraño.",
                    deliverables: ["Log de casos edge encontrados y resueltos", "Validación con datos históricos reales", "Sesión de prueba con el equipo del cliente", "Aprobación formal antes de Deploy"],
                    duration: "3–7 días de iteración",
                    image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=800",
                    imageAlt: "Pruebas y validación del sistema con casos edge"
                  },
                  {
                    summary: "Entrega final en producción con capacitación incluida. Sin sorpresas, sin costos ocultos, sin dependencia permanente de nosotros.",
                    detail: "El Deploy no es solo subir el archivo y mandar un email. Es una sesión de entrega donde tu equipo entiende cómo funciona el sistema, cómo actualizarlo, qué hacer si algo falla, y cuándo tiene sentido contactarnos. Cada proyecto entregado incluye: documentación técnica en lenguaje no técnico, SOP de actualización y mantenimiento, checklist de validación mensual, y una sesión de soporte post-Deploy de 30 días sin costo adicional. El objetivo es que en 30 días tu equipo opere el sistema de forma completamente autónoma. Si eso no pasa, seguimos hasta que pase.",
                    deliverables: ["Sistema en producción documentado", "Capacitación del equipo (presencial o remota)", "SOP de mantenimiento y actualización", "30 días de soporte post-entrega incluido"],
                    duration: "1 sesión de entrega + 30 días soporte",
                    image: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&q=80&w=800",
                    imageAlt: "Entrega en producción y capacitación del equipo del cliente"
                  }
                ].map((content, idx) => (
                  activePhase === idx && (
                    <motion.div
                      key={idx}
                      initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.4 }}
                      className="grid grid-cols-1 md:grid-cols-2"
                    >
                      {/* Image column — más compacta en móvil para priorizar el texto */}
                      <div className="img-hover-premium h-44 sm:h-56 md:h-auto min-h-0 md:min-h-[300px] overflow-hidden relative bg-slate-800">
                        <img
                          src={content.image}
                          srcSet={`${content.image.replace('w=800', 'w=480')} 480w, ${content.image} 800w`}
                          sizes="(max-width: 767px) 100vw, 50vw"
                          alt={content.imageAlt} loading="lazy" decoding="async" width={800} height={533} onError={onImgError} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/10"></div>
                      </div>

                      {/* Text column */}
                      <div className="p-5 sm:p-7 md:p-10">
                        <p className="text-base sm:text-lg text-slate-700 leading-relaxed font-medium mb-4 sm:mb-6">{content.summary}</p>
                        <p className="text-sm text-slate-500 leading-relaxed mb-6 sm:mb-8">{content.detail}</p>

                        <div className="mb-6">
                          <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Entregables de esta fase</div>
                          <ul className="space-y-2">
                            {content.deliverables.map((d, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm font-medium text-slate-700">
                                <CheckCircle size={16} className="text-blue-500 shrink-0 mt-0.5" /> {d}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg text-xs font-bold text-slate-600">
                          <Clock size={14} /> {content.duration}
                        </div>
                      </div>
                    </motion.div>
                  )
                ))}
              </div>
            </div>
          </FadeInUp>

          {/* Comparativa Visual */}
          <FadeInUp delay={0.3}>
            <p className="md:hidden flex items-center justify-end gap-1.5 text-[10px] font-mono uppercase tracking-[0.16em] text-slate-400 mb-2 pr-1" aria-hidden="true">
              Deslizá para comparar <ArrowRight size={11} />
            </p>
            <div className="table-scroll-wrap scroll-fade-x shadow-xl border border-slate-200 mb-10 sm:mb-12">
              <div className="min-w-[520px]">
                <div className="grid grid-cols-3 bg-slate-900 text-white px-4 py-4 sm:p-6 font-bold text-xs sm:text-sm md:text-base rounded-t-3xl">
                  <div className="text-slate-400">Característica</div>
                  <div className="text-center text-slate-400">Consultor genérico</div>
                  <div className="text-center text-emerald-400 font-black text-sm sm:text-base md:text-lg">JC Analytics 4D</div>
                </div>
                {[
                  { label: "Primer contacto", generic: "Propuesta comercial", jc: "Diagnóstico gratuito" },
                  { label: "Datos de trabajo", generic: "Datasets de demo", jc: "Tus datos reales" },
                  { label: "Visibilidad", generic: "Entrega al final", jc: "Avances cada 72h" },
                  { label: "Forma de pago", generic: "Proyecto completo por adelantado", jc: "Por fase aprobada" },
                  { label: "Al terminar", generic: "Dependés de ellos para cambios", jc: "Tu equipo lo opera solo" },
                  { label: "Si no funciona", generic: "\"Estaba fuera del alcance\"", jc: "Lo arreglamos — está en el contrato" }
                ].map((row, idx, arr) => (
                  <div key={idx} className={`grid grid-cols-3 px-4 py-3 sm:p-5 items-center text-xs sm:text-sm md:text-base bg-white ${idx !== arr.length - 1 ? 'border-b border-slate-100' : 'rounded-b-3xl'}`}>
                    <div className="font-bold text-slate-800">{row.label}</div>
                    <div className="text-center text-slate-500 px-1 sm:px-2">{row.generic}</div>
                    <div className="text-center font-bold text-emerald-600 bg-emerald-50 py-1.5 sm:py-2 rounded-lg px-1 sm:px-2">{row.jc}</div>
                  </div>
                ))}
              </div>
            </div>
          </FadeInUp>

          {/* CTA al final de la sección */}
          <FadeInUp delay={0.4}>
            <div className="bg-slate-950 rounded-[2rem] p-6 sm:p-10 text-center text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-[80px] pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none"></div>
              <div className="relative z-10">
                <p className="text-base sm:text-xl md:text-2xl font-medium text-slate-300 mb-5 sm:mb-6 max-w-2xl mx-auto">
                  El D1 no cuesta nada. Si después de esa sesión no ves valor claro, no hay compromiso de continuar.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                  <a
                    href="https://wa.me/50670330596?text=Hola%2C%20quisiera%20agendar%20mi%20sesi%C3%B3n%20D1%20gratuita."
                    target="_blank" rel="noreferrer"
                    className="tap-press btn-sheen glow-hover inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white px-8 py-4 min-h-12 rounded-xl font-bold transition-all shadow-lg hover:scale-105"
                  >
                    Agendar diagnóstico gratis <ArrowRight size={20} />
                  </a>
                  <a
                    href="#portfolio"
                    className="tap-press inline-flex items-center justify-center gap-2 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 active:bg-white/5 px-8 py-4 min-h-12 rounded-xl font-bold transition-all"
                  >
                    Ver casos donde aplicamos esto
                  </a>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto">
                  Framework destilado de más de 8 años de experiencia del equipo en entornos corporativos, y aplicado hoy en los proyectos y productos propios de JC Analytics en Costa Rica.
                </p>
              </div>
            </div>
          </FadeInUp>

        </div>
      </section>

      {/* Equipo / Sobre Nosotros */}
      {/* Puente de transición claro → oscuro */}
      <div aria-hidden="true" className="h-16 sm:h-24 bg-gradient-to-b from-white to-slate-950" />
      <section id="equipo" className="scroll-mt-20 py-16 sm:py-24 md:py-32 bg-slate-950 relative z-20 overflow-hidden">
        {/* Ambient Glow Effects */}
        <div className="absolute top-0 right-1/4 w-[220px] h-[220px] sm:w-[300px] sm:h-[300px] lg:w-[400px] lg:h-[400px] bg-blue-600/10 rounded-full blur-[90px] sm:blur-[120px] pointer-events-none mix-blend-screen" />
        <div className="absolute bottom-0 left-1/4 w-[260px] h-[260px] sm:w-[360px] sm:h-[360px] lg:w-[500px] lg:h-[500px] bg-cyan-500/10 rounded-full blur-[100px] sm:blur-[150px] pointer-events-none mix-blend-screen" />
        
        <div className="max-w-7xl mx-auto px-4 relative z-10 border-t border-slate-800/50 pt-20">
          <div className="text-center mb-20 relative">
            <FadeInUp>
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="inline-flex items-center gap-2 px-6 py-2 bg-slate-900/80 backdrop-blur-md text-blue-400 border border-slate-700/50 rounded-full text-sm font-bold mb-6 shadow-[0_0_20px_rgba(59,130,246,0.15)] cursor-default"
              >
                <Users size={16} className="text-cyan-400" /> Liderazgo
              </motion.div>
              <h2 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white mb-6 tracking-tight">
                Nuestro <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Equipo</span>
              </h2>
            </FadeInUp>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-8 lg:gap-12 mb-12 sm:mb-20">
            {[
              {
                fullName: "Catalina González Araya",
                role: "Operaciones & CX",
                description: "Especialista en operaciones y mejora continua de procesos financieros. Experiencia en optimización de KPIs en multinacionales del sector BPO y retail. Dirige el área de implementación asegurando adopción total.",
                image: import.meta.env.BASE_URL + "kathalina-gonzales.webp"
              },
              {
                fullName: "Jeyrell Tardencilla",
                role: "Data & Automation Lead",
                description: "Senior Engineer con 8+ años de experiencia corporativa en corporaciones de consumo masivo. Lean Six Sigma Green Belt. Especializado en arquitecturas de datos, Python y Power BI, transformando equipos ahogados en reportes en áreas de alto rendimiento.",
                image: import.meta.env.BASE_URL + "jeyrell-tardencilla.webp"
              },
              {
                fullName: "Alex Benedict",
                role: "Implementación Técnica",
                description: "Desarrollador enfocado en estructuración de datos y pipelines analíticos. Garantiza el soporte técnico riguroso de cada solución entregada, aportando solidez en la automatización confiable de procesos manuales.",
                image: import.meta.env.BASE_URL + "alex-benedict.webp"
              }
            ].map((member, idx) => (
              <FadeInUp key={idx} delay={0.15 * idx} className="h-full">
                <TiltCard className="h-full block">
                  <motion.div
                    className="glass-card-dark p-5 sm:p-7 lg:p-10 rounded-[2.5rem] border border-slate-700/50 flex flex-col h-full items-center text-center shadow-2xl bg-slate-800/40 relative overflow-hidden group transition-all duration-500 hover:bg-slate-800/60 hover:shadow-[0_20px_60px_-15px_rgba(59,130,246,0.2)] hover:border-blue-500/30"
                  >
                    {/* Hover Glow Background */}
                    <div className="absolute -inset-24 bg-gradient-to-br from-blue-500/10 via-cyan-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-700 pointer-events-none blur-2xl transform group-hover:translate-y-8"></div>
                    
                    {/* Interactive Avatar Container */}
                    <div className="relative mb-6 sm:mb-8 lg:mb-10 group/avatar">
                      <div className="absolute inset-[-10px] bg-gradient-to-tr from-blue-500 to-cyan-400 rounded-full blur-xl opacity-20 group-hover:opacity-70 transition-opacity duration-700"></div>
                      <div className="absolute inset-[-3px] bg-gradient-to-b from-slate-700 to-slate-800 rounded-full z-10 transition-transform duration-500 group-hover:scale-105"></div>
                      <div className="w-32 h-32 sm:w-40 sm:h-40 lg:w-44 lg:h-44 rounded-full overflow-hidden relative z-20 bg-slate-900 border-2 border-slate-600/50 group-hover:border-blue-400/50 transition-all duration-500 transform group-hover:scale-105 shadow-inner">
                        {/* Fallback de iniciales si la imagen no carga */}
                        <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center font-display font-bold text-3xl text-slate-500 select-none">
                          {member.fullName.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                        </span>
                        <img
                          src={member.image}
                          alt={member.fullName}
                          loading="lazy"
                          decoding="async"
                          width={400}
                          height={400}
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 object-top relative z-10"
                        />
                      </div>
                    </div>

                    <h3 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2 sm:mb-3 relative z-10 transition-colors duration-300 group-hover:text-blue-100">{member.fullName}</h3>

                    <div className="inline-flex items-center justify-center px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-900/60 rounded-full border border-slate-700/50 mb-5 sm:mb-7 lg:mb-8 relative z-10 transition-colors duration-300 group-hover:border-blue-500/30">
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 font-sans text-xs sm:text-sm font-bold uppercase tracking-widest text-center leading-tight drop-shadow-md">{member.role}</span>
                    </div>
                    
                    <p className="text-slate-400 font-sans text-base leading-relaxed relative z-10 transition-colors duration-300 group-hover:text-slate-300 flex-grow font-light">{member.description}</p>
                    
                    {/* Bottom Indicator line */}
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-0 group-hover:w-2/3 group-hover:opacity-100 transition-all duration-700 blur-[1px]"></div>
                  </motion.div>
                </TiltCard>
              </FadeInUp>
            ))}
          </div>

          <FadeInUp delay={0.4}>
            <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-8 relative overflow-hidden flex items-center justify-center">
              {/* Timeline graphic visually replacing standard text */}
              <div className="relative w-full max-w-4xl py-12">
                <div className="absolute top-1/2 left-0 w-full h-px bg-slate-800 -translate-y-1/2"></div>
                <div className="flex justify-between items-center relative z-10">
                  <div className="text-center group cursor-default">
                    <div className="w-16 h-16 mx-auto bg-slate-950 border-2 border-blue-500/50 rounded-full flex items-center justify-center text-blue-400 font-bold group-hover:border-blue-400 group-hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all">2024</div>
                    <div className="mt-4 font-bold text-white group-hover:text-blue-300">Servicios Pro.</div>
                  </div>
                  <div className="text-center group cursor-default hidden md:block">
                    <div className="w-12 h-12 mx-auto bg-slate-950 border-2 border-slate-700 rounded-full flex items-center justify-center text-slate-500 group-hover:border-cyan-400 transition-all">...</div>
                  </div>
                  <div className="text-center group cursor-default">
                    <div className="w-16 h-16 mx-auto bg-slate-950 border-2 border-cyan-500/50 rounded-full flex items-center justify-center text-cyan-400 font-bold group-hover:border-cyan-400 group-hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all">2025</div>
                    <div className="mt-4 font-bold text-white group-hover:text-cyan-300">Consolidación</div>
                  </div>
                  <div className="text-center group cursor-default hidden md:block">
                    <div className="w-12 h-12 mx-auto bg-slate-950 border-2 border-slate-700 rounded-full flex items-center justify-center text-slate-500 group-hover:border-emerald-400 transition-all">...</div>
                  </div>
                  <div className="text-center group cursor-default">
                    <div className="w-16 h-16 mx-auto bg-slate-950 border-2 border-emerald-500/50 rounded-full flex items-center justify-center text-emerald-400 font-bold group-hover:border-emerald-400 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all">2026</div>
                    <div className="mt-4 font-bold text-white group-hover:text-emerald-300">Productos propios</div>
                  </div>
                </div>
              </div>
            </div>
          </FadeInUp>
        </div>
      </section>

      {/* CTA Final y Contacto */}
      <section id="contacto" className="aurora-bg scroll-mt-20 relative py-14 sm:py-20 md:py-24 text-center overflow-hidden bg-slate-950 border-t-4 border-blue-600">
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            
            <div className="lg:w-1/2 text-left">
              <FadeInUp>
                <div className="inline-flex items-center gap-2 px-6 py-2 bg-slate-800 border border-slate-700 rounded-full text-sm font-bold mb-6 shadow-sm text-cyan-400">
                  <Target size={16} /> El Próximo Paso
                </div>
                <h2 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6 text-balance">
                  Contanos qué proceso depende hoy de <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">una persona</span>.
                </h2>
                <p className="font-sans text-base sm:text-lg md:text-xl text-slate-400 mb-6 sm:mb-8 max-w-xl">
                  En 30 minutos evaluamos si convertirlo en sistema tiene ROI claro. Si no lo tiene, te lo decimos en esa misma sesión — sin costo y sin compromiso.
                </p>
                <div className="space-y-4 mb-8">
                  <a href="mailto:gerencia@jcanalytic.com" className="flex items-center gap-3 text-slate-300 hover:text-white transition-colors text-lg">
                    <MessageSquare size={20} className="text-blue-500"/> gerencia@jcanalytic.com
                  </a>
                  <div className="flex items-center gap-3 text-slate-300 text-lg">
                    <Target size={20} className="text-emerald-500"/> Heredia, Costa Rica
                  </div>
                </div>
              </FadeInUp>
            </div>

            {/* Assessment Embed/Form Box container */}
            <div className="lg:w-1/2 w-full">
              <FadeInUp delay={0.2}>
                <div className="glass-card-dark rounded-3xl p-5 sm:p-8 border border-slate-700 shadow-2xl text-left">
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 font-display">Solicitar Assessment (Fase 0)</h3>
                  <p className="text-sm text-slate-400 mb-5 sm:mb-6">Si usaste la calculadora, adjuntamos tu cálculo de ROI automáticamente.</p>
                  {assessmentSent ? (
                    <div role="status" aria-live="polite" className="flex flex-col items-center text-center gap-4 py-6">
                      <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                        <CheckCircle size={28} className="text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-white">¡Listo! Abrimos tu correo.</p>
                        <p className="text-sm text-slate-400 mt-1">Si tu cliente de correo no se abrió, escribinos directo por WhatsApp y te respondemos hoy.</p>
                      </div>
                      <a
                        href="https://wa.me/50670330596"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-6 py-3 rounded-xl transition-colors"
                      >
                        <MessageSquare size={18} /> Escribir por WhatsApp
                      </a>
                      <button
                        type="button"
                        onClick={() => setAssessmentSent(false)}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        Enviar otra solicitud
                      </button>
                    </div>
                  ) : (
                  <form className="flex flex-col gap-4" onSubmit={handleAssessmentClick}>
                    <div className="flex flex-col gap-2">
                       <label htmlFor="assessment-name" className="text-sm font-bold text-slate-400">Nombre &amp; Empresa</label>
                       <input id="assessment-name" name="name" type="text" required autoComplete="name" placeholder="Tu nombre y empresa" value={assessmentName} onChange={(e) => setAssessmentName(e.target.value)} className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder:text-slate-600 focus-visible:outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/60" />
                    </div>
                    <div className="flex flex-col gap-2">
                       <label htmlFor="assessment-email" className="text-sm font-bold text-slate-400">Email</label>
                       <input id="assessment-email" name="email" type="email" required autoComplete="email" placeholder="tu@empresa.com" value={assessmentEmail} onChange={(e) => setAssessmentEmail(e.target.value)} className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder:text-slate-600 focus-visible:outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/60" />
                    </div>
                    <div className="flex flex-col gap-2">
                       <label htmlFor="assessment-phone" className="text-sm font-bold text-slate-400">Teléfono <span className="font-normal text-slate-500">(opcional)</span></label>
                       <input id="assessment-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" pattern="[\d\s+().\-]{7,20}" title="Ingresá un número de teléfono válido (7 a 20 dígitos)" placeholder="+506 8888 8888" value={assessmentPhone} onChange={(e) => setAssessmentPhone(e.target.value)} className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder:text-slate-600 focus-visible:outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/60" />
                    </div>
                    <div className="flex flex-col gap-2">
                       <label htmlFor="assessment-pain" className="text-sm font-bold text-slate-400">Principal dolor</label>
                       <select id="assessment-pain" name="pain" required value={assessmentPain} onChange={(e) => setAssessmentPain(e.target.value)} className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus-visible:outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/60 [&>option]:bg-slate-900 [&>option]:text-white">
                         <option value="">Selecciona un área</option>
                         <option>Reportes excesivos</option>
                         <option>Descontrol de Inventario</option>
                         <option>Cuentas por Cobrar</option>
                         <option>Automatización general</option>
                         <option>Otro</option>
                       </select>
                    </div>
                    <button type="submit" className="tap-press btn-sheen glow-hover mt-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold py-4 min-h-12 rounded-xl transition-colors w-full flex items-center justify-center gap-2">
                      <Target size={20} /> Agendar diagnóstico gratis
                    </button>
                    <p className="text-xs text-center text-slate-500 mt-2 flex items-center justify-center gap-2"><ShieldCheck size={14}/> 100% libre de spam</p>
                  </form>
                  )}
                </div>
              </FadeInUp>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Minimalista Premium */}
      <footer className="py-8 sm:py-12 border-t border-slate-800 text-slate-400 bg-slate-950">
        {/* Sitios propios — cross-link a nuestras otras marcas */}
        <div className="max-w-7xl mx-auto px-4 mb-7 sm:mb-9 pb-7 sm:pb-9 border-b border-slate-800/70">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500 shrink-0">
              Sitios propios
            </span>
            <div className="flex flex-wrap justify-center gap-x-2 gap-y-1.5">
              {WEB_PROPERTIES.map((p) => (
                <a
                  key={p.id}
                  href={p.url}
                  target="_blank"
                  rel="noopener"
                  className="tap-press inline-flex items-center gap-1.5 min-h-11 px-2.5 rounded-lg text-xs sm:text-sm font-bold text-slate-300 hover:text-white active:bg-white/5 transition-colors"
                >
                  {p.name}
                  <ExternalLink size={12} className="text-slate-500" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-6">
          <div className="flex flex-col items-center md:items-start gap-2">
            <div className="flex items-center gap-2.5">
              <img src={import.meta.env.BASE_URL + "LogoMark.webp"} alt="" width={162} height={200} decoding="async" className="h-9 sm:h-10 w-auto object-contain" />
              <span className="font-display text-base sm:text-lg font-extrabold tracking-tight text-white leading-none">JC Analytics</span>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
              De procesos dependientes a sistemas que funcionan
            </span>
          </div>
          <div className="text-xs sm:text-sm font-medium font-sans text-center">
            © 2026 JC Analytics. Todos los derechos reservados.
          </div>
          <div className="flex flex-wrap justify-center gap-x-2 gap-y-1 sm:gap-8 font-sans items-center pb-safe md:pb-0">
            <a href="mailto:gerencia@jcanalytic.com" className="tap-press inline-flex items-center min-h-11 px-2.5 rounded-lg hover:text-cyan-400 active:bg-white/5 transition-colors text-xs sm:text-sm font-bold">gerencia@jcanalytic.com</a>
            <a href="https://wa.me/50670330596" target="_blank" rel="noreferrer" className="tap-press inline-flex items-center min-h-11 px-2.5 rounded-lg hover:text-emerald-400 active:bg-white/5 transition-colors text-xs sm:text-sm font-bold text-emerald-500">Contacto WhatsApp</a>
            <span className="inline-flex items-center min-h-11 px-2.5 text-xs sm:text-sm font-bold text-slate-600 cursor-default select-none">LinkedIn</span>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Button with Pulse — .wa-fab gestiona bottom con
          safe-area y sube cuando la barra del cotizador está visible */}
      <motion.a
        whileHover={prefersReducedMotion ? {} : { scale: 1.1 }}
        whileTap={prefersReducedMotion ? {} : { scale: 0.9 }}
        href="https://wa.me/50670330596"
        target="_blank"
        rel="noreferrer"
        className="wa-fab fixed right-5 sm:right-8 z-50 bg-emerald-500 hover:bg-emerald-400 text-white p-3.5 sm:p-4 min-w-13 min-h-13 rounded-full shadow-2xl flex items-center justify-center pulse-ring"
        aria-label="Contactar por WhatsApp"
      >
        <MessageSquare className="w-[26px] h-[26px] sm:w-[30px] sm:h-[30px]" />
      </motion.a>
    </div>
  );
};

export default App;