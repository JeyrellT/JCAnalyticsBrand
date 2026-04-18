import React, { useState, useRef, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from 'framer-motion';
import Lenis from 'lenis';
import CustomCursor from './components/ui/CustomCursor';
import MagneticButton from './components/ui/MagneticButton';
import SplitText from './components/ui/SplitText';
import HorizontalScrollSection from './components/ui/HorizontalScrollSection';
import TiltCard from './components/ui/TiltCard';
import Background3D from './components/3d/Background3D';
import {
  TrendingUp, Target, CheckCircle, Database, Cpu, BarChart3,
  ArrowRight, ShieldCheck, Zap, Users, Calculator, MessageSquare, ChevronRight,
  Layers, Settings, MonitorSmartphone, Clock, X, AlertTriangle, TrendingDown, Lightbulb
} from 'lucide-react';

const _MOTION = motion;

// Fade In Up Reusable Component
const FadeInUp = ({ children, delay = 0, className = "" }) => (
  <motion.div
    initial={{ opacity: 0, y: 40 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-50px" }}
    transition={{ duration: 0.8, delay: delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    className={className}
  >
    {children}
  </motion.div>
);



// Scroll Parallax Image
const ParallaxImage = ({ src, alt, className = "" }) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });
  
  const y = useTransform(scrollYProgress, [0, 1], ["-15%", "15%"]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);

  return (
    <div ref={ref} className={`overflow-hidden relative ${className}`}>
      <motion.img 
        src={src}
        alt={alt}
        loading="lazy"
        style={{ y, scale }}
        className="w-full h-full object-cover origin-center"
      />
    </div>
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

// Modal de Problema
const ProblemModal = ({ modalKey, onClose }) => {
  const data = PROBLEM_MODAL_CONTENT[modalKey];
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
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />

      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 24 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="relative bg-white rounded-[2rem] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`${c.bg} ${c.border} border-b px-6 pt-6 pb-5 rounded-t-[2rem]`}>
          <div className="flex items-start justify-between gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${c.icon}`}>
              {data.icon}
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/80 hover:bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors shrink-0"
            >
              <X size={16} />
            </button>
          </div>
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mt-3 mb-2 ${c.tag}`}>
            <AlertTriangle size={11} /> {data.tag}
          </div>
          <h3 className="font-display text-lg sm:text-xl font-bold text-slate-900 leading-snug">{data.title}</h3>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-6">
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

        {/* Footer CTA */}
        <div className="px-6 pb-6">
          <a
            href="#contacto"
            onClick={onClose}
            className={`flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-white font-bold text-sm transition-colors ${c.btn}`}
          >
            Quiero resolver esto en mi empresa <ArrowRight size={16} />
          </a>
        </div>
      </motion.div>
    </motion.div>
  );
};

const App = () => {
  const [activePhase, setActivePhase] = useState(0);
  const [activeModal, setActiveModal] = useState(null);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // States for ROI Calculator
  const [calcPeople, setCalcPeople] = useState(2);
  const [calcHours, setCalcHours] = useState(10);
  const [calcSalary, setCalcSalary] = useState(800000);
  const [calcFreq, setCalcFreq] = useState(4); // 1 = Mensual, 4 = Semanal, 20 = Diario
  const [calcErrors, setCalcErrors] = useState(1.2); // 1 = Nunca, 1.2 = A veces, 1.4 = Frecuente

  const vfxImgRef = useRef(null);

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
  
  // Custom cursor is enabled, hide default
  useEffect(() => {
    if (!isMobileViewport && !isTouchDevice) {
      document.body.classList.add('hide-cursor');
    }
    
    // Initialize Lenis
    const lenis = new Lenis({
      lerp: 0.08,
      smoothWheel: true,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => {
      document.body.classList.remove('hide-cursor');
      lenis.destroy();
    };
  }, [isMobileViewport, isTouchDevice]);

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

  // Datos para los gráficos
  const forecastData = [
    { name: 'Lun', real: 2100, forecast: 2200 },
    { name: 'Mar', real: 2300, forecast: 2250 },
    { name: 'Mie', real: 2450, forecast: 2400 },
    { name: 'Jue', real: 2200, forecast: 2350 },
    { name: 'Vie', real: 2600, forecast: 2550 },
    { name: 'Sab', real: 1800, forecast: 1900 },
    { name: 'Dom', real: 1500, forecast: 1600 },
  ];

  const handleAssessmentClick = () => {
    const email = "gerencia@jcanalytic.com";
    const subject = "Solicitud de Assessment Fase 0 - JC Analytics";
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}`;
  };

  const formatCRC = (value) => new Intl.NumberFormat('es-CR').format(Math.round(value));
  const hourlyCost = calcSalary / 160;
  const monthlyProcessHours = calcPeople * calcHours * calcFreq;
  const monthlyTotalHours = monthlyProcessHours * calcErrors;
  const recoverableHours = Math.round(monthlyTotalHours * 0.9);
  const recoverableCostEquivalent = Math.round(recoverableHours * hourlyCost);
  const fullTimeHoursPerMonth = 160;
  const fullTimePeopleEquivalent = (recoverableHours / fullTimeHoursPerMonth).toFixed(1);
  const currentMonthlyCost = Math.round(monthlyTotalHours * hourlyCost);
  const currentYearlyCost = currentMonthlyCost * 12;
  const netflixMonthlyReference = 12000;
  const netflixMonthsEquivalent = Math.max(1, Math.round(currentMonthlyCost / netflixMonthlyReference));
  const netflixEquivalentLabel = netflixMonthsEquivalent >= 12
    ? `${(netflixMonthsEquivalent / 12).toFixed(1)} años`
    : `${netflixMonthsEquivalent} meses`;
  const chartMargins = isMobileViewport ? { top: 8, right: 0, left: -24, bottom: 0 } : { top: 10, right: 10, left: -20, bottom: 0 };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-blue-500 selection:text-white overflow-x-hidden">
      {!isTouchDevice && !isMobileViewport && <CustomCursor />}

      {/* Modal Problema Oculto */}
      <AnimatePresence>
        {activeModal && (
          <ProblemModal modalKey={activeModal} onClose={() => setActiveModal(null)} />
        )}
      </AnimatePresence>

      {/* Scroll Progress Bar */}
      <motion.div
        className="scroll-progress-bar"
        style={{ scaleX: scaleProgress }}
      />

      <div className="fixed inset-0 noise-overlay pointer-events-none z-50 mix-blend-overlay" />
      <Background3D isMobile={isMobileViewport || isTouchDevice || prefersReducedMotion} />
      
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
        <div className="max-w-7xl mx-auto px-3 sm:px-4 h-20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 group cursor-pointer">
            <motion.img
              whileHover={{ scale: 1.05 }}
              src={import.meta.env.BASE_URL + "Logo.png"}
              alt="JC Analytics Logo"
              className="h-12 w-auto object-contain"
            />
          </div>
          <div className="hidden md:flex items-center gap-5">
            <a href="mailto:gerencia@jcanalytic.com" className="text-sm font-semibold text-slate-300 hover:text-white transition-colors">
              gerencia@jcanalytic.com
            </a>
            <a 
              href="https://wa.me/50670330596" 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 px-6 py-2.5 rounded-full font-bold transition-all shadow-lg backdrop-blur-md"
            >
              Contactar por WhatsApp
              <ArrowRight size={18} />
            </a>
          </div>
          <a
            href="https://wa.me/50670330596"
            target="_blank"
            rel="noreferrer"
            className="md:hidden inline-flex items-center justify-center gap-2 bg-emerald-500/25 hover:bg-emerald-500/35 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-full font-bold text-sm transition-all backdrop-blur-md min-h-11"
          >
            WhatsApp
            <ArrowRight size={16} />
          </a>
        </div>
      </motion.nav>

      {/* Hero Section - Animated Gradient Blobs + Parallax */}
      <header ref={heroRef} className="relative pt-28 pb-16 sm:pt-32 sm:pb-24 lg:pt-40 lg:pb-32 overflow-hidden bg-slate-950 text-white animate-gradient-mesh" style={{ backgroundImage: "linear-gradient(-45deg, #0a0e27, #0d1b4b, #1a1066, #0f0628)" }}>
        
        {/* Animated Gradient Background CSS Blobs */}
        <div className="absolute top-0 right-0 w-full h-full overflow-hidden pointer-events-none opacity-40">
           <div className="absolute top-[-10%] right-[-15%] w-[280px] h-[280px] sm:w-[420px] sm:h-[420px] lg:w-[600px] lg:h-[600px] bg-gradient-to-tr from-blue-600 to-cyan-400 blur-[60px] sm:blur-[80px] animate-blob mix-blend-screen" />
           <div className="absolute bottom-[-10%] left-[-20%] w-[240px] h-[240px] sm:w-[340px] sm:h-[340px] lg:w-[500px] lg:h-[500px] bg-gradient-to-br from-indigo-600 to-purple-600 blur-[70px] sm:blur-[100px] animate-blob mix-blend-screen" style={{ animationDelay: '2s' }} />
        </div>

        <div className="max-w-7xl mx-auto px-3 sm:px-4 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-8 sm:gap-12 lg:gap-16">
            <motion.div 
              style={{ opacity: heroOpacity }}
              className="lg:w-1/2"
            >
              <FadeInUp delay={0.1}>
                <div className="inline-flex items-center gap-2 px-5 py-2 glass-card-dark rounded-full text-sm font-bold mb-8 text-emerald-300 border-emerald-500/30">
                  <Zap size={16} className="text-emerald-400" /> Analítica para tu PYME
                </div>
              </FadeInUp>
              <FadeInUp delay={0.2}>
                <h1 className="font-display text-[1.75rem] sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.15] sm:leading-[1.1] mb-5 sm:mb-6 tracking-normal">
                  <SplitText text="¿Cuánto tiempo pierde tu equipo " delay={0.1} />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 inline-block overflow-hidden">
                    <SplitText text="generando reportes?" delay={0.6} />
                  </span>
                </h1>
              </FadeInUp>
              <FadeInUp delay={0.3}>
                <p className="text-base sm:text-lg md:text-xl text-slate-300 mb-5 sm:mb-6 leading-relaxed max-w-xl font-sans">
                  El tiempo que tu equipo dedica hoy a llenar Excels, podrías estar invirtiéndolo en analizar dashboards <strong>en tiempo real</strong>.
                </p>
                <div className="text-sm sm:text-base md:text-lg text-emerald-300 mb-7 sm:mb-10 font-medium max-w-xl font-sans border-l-2 border-emerald-400 pl-4 py-1">
                  Firma de analítica enfocada en PYMEs de la Gran Área Metropolitana. Resultados visibles en 14 días o no cobramos.
                </div>
              </FadeInUp>
              <FadeInUp delay={0.4}>
                <div className="flex flex-col sm:flex-row gap-5">
                  <motion.a 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    href="#roi"
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl font-bold text-base sm:text-lg flex items-center justify-center gap-3 transition-all shadow-[0_0_40px_rgba(37,99,235,0.4)] min-h-11"
                  >
                    <Calculator size={20} />
                    Ver mi ROI estimado
                  </motion.a>
                  <motion.a 
                    whileHover={{ scale: 1.05, backgroundColor: "rgba(34,197,94,0.1)" }}
                    href="https://wa.me/50670330596"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 text-emerald-400 font-bold hover:text-emerald-300 rounded-xl transition-all border border-emerald-500/30 glass-card-dark min-h-11"
                  >
                    <MessageSquare size={20} />
                    Agendar 30 min gratis
                  </motion.a>
                </div>
              </FadeInUp>
            </motion.div>

            {/* Hero Parallax Image */}
            <motion.div 
              style={{ y: heroImageY, opacity: heroOpacity }}
              className="lg:w-1/2 relative w-full perspective-1000 mt-8 sm:mt-12 lg:mt-0"
            >
              <FadeInUp delay={0.5}>
                <TiltCard className="relative rounded-2xl overflow-hidden shadow-[0_20px_60px_-15px_rgba(37,99,235,0.5)] border border-slate-700/50">
                  <img 
                       ref={vfxImgRef}
                       src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1200"
                       alt="Data Analytics Dashboard"
                         className="w-full h-[260px] sm:h-[360px] md:h-[500px] lg:h-[600px] object-cover opacity-90 transition-opacity duration-700" 
                  />
                </TiltCard>
              </FadeInUp>
            </motion.div>
          </div>
        </div>
      </header>

      {/* Strip de Credibilidad y El Problema */}
      <section className="relative z-20 py-12 sm:py-16 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-wrap justify-between items-center gap-4 sm:gap-8 mb-12 sm:mb-20 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
             <div className="font-display font-black text-base sm:text-2xl text-slate-800 tracking-wider">Retail & Consumo</div>
             <div className="font-display font-black text-lg sm:text-3xl text-slate-800 tracking-tighter">Sector Energético</div>
             <div className="font-display font-bold text-base sm:text-2xl text-slate-800 tracking-widest italic">Logística & Distribución</div>
             <div className="font-display text-base sm:text-2xl font-bold text-slate-800 tracking-tight">Servicios Financieros</div>
          </div>

          <div className="text-center mb-10 sm:mb-16">
            <FadeInUp>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-full text-xs sm:text-sm font-bold mb-4 border border-red-100">
                <ShieldCheck size={14} /> Lo que descubrimos en cada PYME que auditamos
              </div>
              <h2 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-4 sm:mb-6 tracking-tight">El Problema Oculto en tu PYME</h2>
              <div className="flex items-center justify-center gap-2 text-slate-500 font-medium font-sans">
                <Users size={18} className="text-blue-500" />
                <span>Identificado en <strong className="text-slate-700">+8 empresas</strong> de Heredia y Alajuela</span>
              </div>
            </FadeInUp>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-8 mb-12 sm:mb-16">
            <FadeInUp delay={0.1}>
              <div className="bg-slate-50 p-5 sm:p-8 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all h-full flex flex-col">
                <div className="flex items-start justify-between mb-5 sm:mb-6">
                  <div className="w-11 h-11 sm:w-14 sm:h-14 bg-red-100/50 rounded-2xl flex items-center justify-center text-red-500 font-black text-2xl border border-red-200">
                    <Clock size={22} />
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Impacto Oculto</div>
                    <div className="text-xl font-black text-red-500">₡1.2M+</div>
                    <div className="text-xs text-red-400 font-medium">perdidos en ineficiencia</div>
                  </div>
                </div>
                <h3 className="font-bold text-base sm:text-xl text-slate-900 mb-3 sm:mb-4 tracking-tight">"Tus reportes llegan 3 días después de que ya no sirven"</h3>
                <p className="text-slate-600 mb-6 sm:mb-8 font-medium text-sm flex-grow">El equipo invierte horas en exportar, limpiar y consolidar datos mientras las decisiones críticas se toman a ciegas o basadas en intuición, perdiendo ventas diarias.</p>
                
                <div className="space-y-3 pt-6 border-t border-slate-200/60 mt-auto">
                  <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                      <Target size={14} className="text-slate-500" />
                    </div>
                    <span><strong>Caso real:</strong> Mayorista en Alajuela</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <Zap size={14} className="text-blue-600" />
                    </div>
                    <span><strong>Solución en:</strong> 14 días</span>
                  </div>
                  <button
                    onClick={() => setActiveModal('reportes')}
                    className="w-full mt-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 text-sm font-semibold transition-colors"
                  >
                    Entender este problema <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            </FadeInUp>
            
            <FadeInUp delay={0.2}>
              <div className="bg-slate-50 p-5 sm:p-8 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-[0_20px_40px_-15px_rgba(249,115,22,0.15)] transition-all h-full flex flex-col">
                <div className="flex items-start justify-between mb-5 sm:mb-6">
                  <div className="w-11 h-11 sm:w-14 sm:h-14 bg-orange-100/50 rounded-2xl flex items-center justify-center text-orange-500 font-black text-2xl border border-orange-200">
                    <Database size={22} />
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Fuga de Capital</div>
                    <div className="text-xl font-black text-orange-500">₡2.4M</div>
                    <div className="text-xs text-orange-400 font-medium">en horas-hombre al año</div>
                  </div>
                </div>
                <h3 className="font-bold text-base sm:text-xl text-slate-900 mb-3 sm:mb-4 tracking-tight">"Tu equipo dedica 40+ horas al mes a Excel"</h3>
                <p className="text-slate-600 mb-6 sm:mb-8 font-medium text-sm flex-grow">Tu talento humano más caro está siendo desaprovechado en tareas robóticas de copiar y pegar, ahogando la innovación y exponiendo a la empresa a errores manuales costosos.</p>
                
                <div className="space-y-3 pt-6 border-t border-slate-200/60 mt-auto">
                  <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                      <Target size={14} className="text-slate-500" />
                    </div>
                    <span><strong>Caso real:</strong> Ferretería en Heredia</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <Zap size={14} className="text-blue-600" />
                    </div>
                    <span><strong>Automatizado en:</strong> 3 semanas</span>
                  </div>
                  <button
                    onClick={() => setActiveModal('excel')}
                    className="w-full mt-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-orange-200 text-orange-600 bg-orange-50 hover:bg-orange-100 text-sm font-semibold transition-colors"
                  >
                    Entender este problema <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            </FadeInUp>

            <FadeInUp delay={0.3}>
              <div className="bg-slate-50 p-5 sm:p-8 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-[0_20px_40px_-15px_rgba(59,130,246,0.15)] transition-all h-full flex flex-col">
                <div className="flex items-start justify-between mb-5 sm:mb-6">
                  <div className="w-11 h-11 sm:w-14 sm:h-14 bg-blue-100/50 rounded-2xl flex items-center justify-center text-blue-500 font-black text-2xl border border-blue-200">
                    <BarChart3 size={22} />
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Riesgo Financiero</div>
                    <div className="text-xl font-black text-blue-500">30%</div>
                    <div className="text-xs text-blue-400 font-medium">capital estancado</div>
                  </div>
                </div>
                <h3 className="font-bold text-base sm:text-xl text-slate-900 mb-3 sm:mb-4 tracking-tight">"No sabes quién genera el 80% del margen"</h3>
                <p className="text-slate-600 mb-6 sm:mb-8 font-medium text-sm flex-grow">Al no tener visibilidad de rentabilidad en tiempo real, tienes mercancía crítica estancada en bodegas y dejas que tus mayores riesgos de cartera pasen desapercibidos bajo el radar.</p>
                
                <div className="space-y-3 pt-6 border-t border-slate-200/60 mt-auto">
                  <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                      <Target size={14} className="text-slate-500" />
                    </div>
                    <span><strong>Caso real:</strong> Distribuidora en el GAM</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <Zap size={14} className="text-blue-600" />
                    </div>
                    <span><strong>Dashboard en:</strong> 2 semanas</span>
                  </div>
                  <button
                    onClick={() => setActiveModal('rentabilidad')}
                    className="w-full mt-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100 text-sm font-semibold transition-colors"
                  >
                    Entender este problema <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            </FadeInUp>
          </div>

          {/* Cierre Unificador y CTA */}
          <FadeInUp delay={0.4}>
            <div className="max-w-4xl mx-auto text-center bg-white rounded-[2rem] border border-slate-200 p-5 sm:p-8 md:p-12 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-[40px] pointer-events-none"></div>
               <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/5 rounded-full blur-[40px] pointer-events-none"></div>

               <h3 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 mb-4 relative z-10">
                 Si te identificaste con al menos uno, <span className="text-red-500">tu empresa está dejando dinero sobre la mesa.</span>
               </h3>
               <p className="font-sans text-slate-600 text-lg mb-8 max-w-2xl mx-auto relative z-10">
                 Hacer lo mismo todos los meses esperando que la rentabilidad mejore sola no es una estrategia. Cortá la pérdida de recursos hoy.
               </p>
               
               <div className="flex flex-col sm:flex-row items-center justify-center gap-6 relative z-10">
                 <motion.a 
                   whileHover={{ scale: 1.05 }}
                   whileTap={{ scale: 0.95 }}
                   href="https://wa.me/50670330596?text=Quiero%20agendar%20un%20diagn%C3%B3stico%20gratis"
                   target="_blank"
                   rel="noreferrer"
                   className="bg-slate-900 text-white hover:bg-slate-800 px-8 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-xl"
                 >
                   Quiero un diagnóstico gratis <ArrowRight size={20} />
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
        <div className="mt-12 sm:mt-20 w-full bg-slate-900 py-4 sm:py-6 overflow-hidden flex border-y border-slate-800">
          <motion.div
            animate={{ x: ["0%", "-50%"] }}
            transition={{ ease: "linear", duration: 30, repeat: Infinity }}
            className="flex whitespace-nowrap min-w-max"
          >
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex gap-8 sm:gap-16 items-center px-4 sm:px-8">
                <div className="flex items-center gap-2 sm:gap-3 text-white font-bold text-sm sm:text-base md:text-lg ticker-item"><span className="text-emerald-400">99.4%</span> reducción en tiempo de auditoría</div>
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-slate-700 shrink-0"></div>
                <div className="flex items-center gap-2 sm:gap-3 text-white font-bold text-sm sm:text-base md:text-lg ticker-item"><span className="text-blue-400">174 SKUs</span> en 24 tiendas — visibilidad total</div>
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-slate-700 shrink-0"></div>
                <div className="flex items-center gap-2 sm:gap-3 text-white font-bold text-sm sm:text-base md:text-lg ticker-item"><span className="text-cyan-400">28 reportes manuales</span> eliminados por semana</div>
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-slate-700 shrink-0"></div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Main Pillars - GSAP Pinned Horizontal Scroll */}
      <HorizontalScrollSection />

      {/* ROI & Calculator */}
      <section id="roi" className="py-14 sm:py-20 md:py-24 bg-slate-950 text-white relative overflow-hidden z-20">
        {/* Decorative background grids */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.05] mix-blend-overlay"></div>
        <div className="absolute top-0 right-0 w-[340px] h-[340px] sm:w-[520px] sm:h-[520px] lg:w-[800px] lg:h-[800px] bg-emerald-500/10 rounded-full blur-[100px] sm:blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <FadeInUp>
              <div className="inline-flex items-center gap-2 px-6 py-2 bg-white/5 border border-white/10 rounded-full text-sm font-bold mb-6 backdrop-blur-md text-emerald-300">
                <Calculator size={16} /> Evaluación Transparete
              </div>
              <h2 className="font-display text-[1.75rem] sm:text-4xl md:text-5xl lg:text-6xl font-black mb-5 sm:mb-6 tracking-tight">
                Antes de contratarnos, <br className="hidden sm:block"/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">calculá si te conviene.</span>
              </h2>
              <p className="font-sans text-base sm:text-lg md:text-xl text-slate-300 max-w-3xl mx-auto font-light leading-relaxed">
                La mayoría de empresas en Costa Rica pierde entre ₡400,000 y ₡2,000,000 al mes en procesos que se podrían automatizar. En 2 minutos sabés si ese es tu caso.
              </p>
            </FadeInUp>
          </div>

          <div className="flex flex-col lg:flex-row gap-12 items-center">
            {/* Sliders Form */}
            <div className="lg:w-1/2 w-full space-y-8 glass-card-dark p-5 sm:p-8 md:p-10 rounded-[2rem] border border-slate-800">
              <FadeInUp delay={0.1}>
                <div>
                  <div className="flex justify-between mb-3">
                    <label className="text-sm font-bold text-slate-300">¿Cuántas personas generan reportes?</label>
                    <span className="text-emerald-400 font-black">{calcPeople}</span>
                  </div>
                  <input type="range" min="1" max="20" value={calcPeople} onChange={(e) => setCalcPeople(parseInt(e.target.value))} className="w-full touch-slider h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer" />
                </div>
              </FadeInUp>
              <FadeInUp delay={0.2}>
                <div>
                  <div className="flex justify-between mb-3">
                    <label className="text-sm font-bold text-slate-300">Horas dedicadas por proceso (por persona)</label>
                    <span className="text-emerald-400 font-black">{calcHours} h</span>
                  </div>
                  <input type="range" min="1" max="40" value={calcHours} onChange={(e) => setCalcHours(parseInt(e.target.value))} className="w-full touch-slider h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer" />
                </div>
              </FadeInUp>
              <FadeInUp delay={0.3}>
                <div>
                  <div className="flex justify-between mb-3">
                    <label className="text-sm font-bold text-slate-300">Salario promedio mensual (₡)</label>
                    <span className="text-emerald-400 font-black">₡{(calcSalary / 1000).toFixed(0)}K</span>
                  </div>
                  <input type="range" min="300000" max="2000000" step="50000" value={calcSalary} onChange={(e) => setCalcSalary(parseInt(e.target.value))} className="w-full touch-slider h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer" />
                </div>
              </FadeInUp>
              <FadeInUp delay={0.4}>
                <div>
                  <div className="flex justify-between mb-3">
                    <label className="text-sm font-bold text-slate-300">Frecuencia del proceso</label>
                  </div>
                  <div className="flex bg-slate-800 rounded-lg w-full p-1 space-x-1">
                    <button 
                      onClick={() => setCalcFreq(20)}
                      className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${calcFreq === 20 ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-300'}`}
                    >
                      Diaria
                    </button>
                    <button 
                      onClick={() => setCalcFreq(4)}
                      className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${calcFreq === 4 ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-300'}`}
                    >
                      Semanal
                    </button>
                    <button 
                      onClick={() => setCalcFreq(1)}
                      className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${calcFreq === 1 ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-300'}`}
                    >
                      Mensual
                    </button>
                  </div>
                </div>
              </FadeInUp>
              <FadeInUp delay={0.5}>
                <div>
                  <div className="flex justify-between mb-3">
                    <label className="text-sm font-bold text-slate-300">Frecuencia de errores por corregir</label>
                  </div>
                  <div className="flex bg-slate-800/80 rounded-xl w-full p-1.5 space-x-1.5 border border-slate-700/50">
                    <button 
                      onClick={() => setCalcErrors(1.0)}
                      className={`flex-1 flex flex-col items-center justify-center py-3 text-xs font-bold rounded-lg transition-all duration-300 ${calcErrors === 1.0 ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'border border-transparent text-slate-400 hover:text-slate-300 hover:bg-slate-700/40'}`}
                    >
                      <span className={`w-2 h-2 rounded-full mb-1.5 transition-colors ${calcErrors === 1.0 ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-slate-600'}`}></span>
                      Cero
                    </button>
                    <button 
                      onClick={() => setCalcErrors(1.2)}
                      className={`flex-1 flex flex-col items-center justify-center py-3 text-xs font-bold rounded-lg transition-all duration-300 ${calcErrors === 1.2 ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]' : 'border border-transparent text-slate-400 hover:text-slate-300 hover:bg-slate-700/40'}`}
                    >
                      <span className={`w-2 h-2 rounded-full mb-1.5 transition-colors ${calcErrors === 1.2 ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]' : 'bg-slate-600'}`}></span>
                      A veces
                    </button>
                    <button 
                      onClick={() => setCalcErrors(1.4)}
                      className={`flex-1 flex flex-col items-center justify-center py-3 text-xs font-bold rounded-lg transition-all duration-300 ${calcErrors === 1.4 ? 'bg-red-500/10 border border-red-500/30 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.15)]' : 'border border-transparent text-slate-400 hover:text-slate-300 hover:bg-slate-700/40'}`}
                    >
                      <span className={`w-2 h-2 rounded-full mb-1.5 transition-colors ${calcErrors === 1.4 ? 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.8)]' : 'bg-slate-600'}`}></span>
                      Frecuente
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-3 text-center uppercase tracking-widest font-semibold">Tener que revisar eleva hasta un +40% el costo final</p>
                </div>
              </FadeInUp>
            </div>

            {/* Results Output */}
            <div className="lg:w-1/2 w-full">
              <FadeInUp delay={0.3}>
                <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
                  <div className="glass-card-dark border-l-4 border-l-red-500 p-3 sm:p-5 md:p-6 rounded-xl border border-slate-800/50">
                    <div className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 sm:mb-2">Costo Mensual Actual</div>
                    <div className="font-display text-base sm:text-xl md:text-2xl lg:text-3xl font-black text-white leading-tight">₡{new Intl.NumberFormat('es-CR').format(currentMonthlyCost)}</div>
                  </div>
                  <div className="glass-card-dark border-l-4 border-l-emerald-500 p-3 sm:p-5 md:p-6 rounded-xl border border-slate-800/50">
                    <div className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 sm:mb-2">Horas Recuperables</div>
                    <div className="font-display text-base sm:text-xl md:text-2xl lg:text-3xl font-black text-white leading-tight">{recoverableHours}<span className="text-xs sm:text-sm text-slate-400 font-normal ml-1">h/mes</span></div>
                  </div>
                  <div className="glass-card-dark border-l-4 border-l-cyan-500 p-3 sm:p-5 md:p-6 rounded-xl border border-slate-800/50">
                    <div className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 sm:mb-2">Payback Estimado</div>
                    <div className="font-display text-base sm:text-xl md:text-2xl lg:text-3xl font-black text-white leading-tight">{((1500000) / (currentMonthlyCost * 0.9 || 1)).toFixed(1)} <span className="text-xs sm:text-sm text-slate-400 font-normal">meses</span></div>
                  </div>
                  <div className="glass-card-dark border-l-4 border-l-emerald-400 p-3 sm:p-5 md:p-6 rounded-xl border border-slate-800/50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/20 rounded-full blur-xl"></div>
                    <div className="text-[10px] sm:text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1.5 sm:mb-2">Ahorro Año 1</div>
                    <div className="font-display text-base sm:text-xl md:text-2xl lg:text-3xl font-black text-emerald-400 leading-tight">₡{new Intl.NumberFormat('es-CR').format(Math.round(currentYearlyCost * 0.9))}</div>
                  </div>
                </div>
              </FadeInUp>
            </div>
          </div>

          {/* DYNAMIC CONCRETE COMPARISONS */}
          <div className="mt-20 pt-16 border-t border-slate-800">
            <div className="text-center mb-12">
              <FadeInUp>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                  ₡{new Intl.NumberFormat('es-CR').format(currentMonthlyCost)} al mes en reportes manuales es lo mismo que...
                </h3>
              </FadeInUp>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <FadeInUp delay={0.1}>
                 <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-2xl text-center h-full flex flex-col items-center justify-center">
                   <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-6 shadow-inner border border-blue-500/20">
                     <Users size={28} className="text-blue-400" />
                   </div>
                   <p className="text-lg font-medium text-slate-300">Cubrir {recoverableHours} horas/mes recuperables de trabajo manual</p>
                   <p className="text-sm text-slate-500 mt-2">Equivale a {fullTimePeopleEquivalent} personas de tiempo completo (~₡{formatCRC(recoverableCostEquivalent)}/mes).</p>
                 </div>
               </FadeInUp>
               <FadeInUp delay={0.2}>
                 <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-2xl text-center h-full flex flex-col items-center justify-center">
                   <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mb-6 shadow-inner border border-orange-500/20">
                     <MonitorSmartphone size={28} className="text-orange-400" />
                   </div>
                   <p className="text-lg font-medium text-slate-300">Pagar <strong className="text-orange-300">{netflixEquivalentLabel}</strong> de Netflix empresarial sin ver nada util</p>
                   <p className="text-sm text-slate-500 mt-2">{netflixMonthsEquivalent} meses al valor de referencia de ₡{formatCRC(netflixMonthlyReference)}/mes.</p>
                 </div>
               </FadeInUp>
               <FadeInUp delay={0.3}>
                 <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-2xl text-center h-full flex flex-col items-center justify-center">
                   <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6 shadow-inner border border-red-500/20">
                     <TrendingUp size={28} className="text-red-400" />
                   </div>
                   <p className="text-lg font-medium text-slate-300">Dejar <strong className="text-red-400">₡{(currentYearlyCost / 1000000).toFixed(1)}M</strong> sobre la mesa cada año</p>
                 </div>
               </FadeInUp>
            </div>
          </div>
        </div>
      </section>

      {/* Casos de Uso Reales / Portfolio */}
      <section id="portfolio" className="py-14 sm:py-20 md:py-24 bg-slate-50 relative overflow-hidden border-t border-slate-200 z-10">
        <div className="absolute top-0 left-0 w-full h-[320px] sm:h-[420px] lg:h-[500px] bg-gradient-to-b from-slate-100 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <FadeInUp>
              <h2 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-5 sm:mb-6 tracking-tight">
                Los números de arriba son reales. <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-500">Ya lo hemos hecho.</span>
              </h2>
            </FadeInUp>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-8 mb-12 sm:mb-16">
            <FadeInUp delay={0.1}>
              <motion.div whileHover={{ y: -5 }} className="bg-white p-5 sm:p-8 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-2xl transition-all h-full flex flex-col relative group">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Empresa de distribución (Heredia)</div>
                <h3 className="font-display text-xl font-medium text-slate-900 mb-6 leading-relaxed italic text-balance">
                  "Tenían 2 personas dedicando 12 horas semanales a consolidar datos de ventas desde 3 sistemas distintos."
                </h3>
                <div className="mt-auto pt-6 border-t border-slate-100">
                  <div className="text-xs font-bold text-emerald-600 uppercase mb-2">Resultado</div>
                  <div className="flex items-start gap-3 text-slate-700 font-medium">
                    <CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={18} /> 
                    <p>Proceso automatizado en 3 semanas. Esas 12 horas se convirtieron en <strong>20 minutos</strong>.</p>
                  </div>
                </div>
              </motion.div>
            </FadeInUp>

            <FadeInUp delay={0.2}>
              <motion.div whileHover={{ y: -5 }} className="bg-white p-5 sm:p-8 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-2xl transition-all h-full flex flex-col relative group">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Empresa de Servicios Financieros</div>
                <h3 className="font-display text-xl font-medium text-slate-900 mb-6 leading-relaxed italic text-balance">
                  "El cierre mensual de reconciliación tomaba 3 horas y generaba errores frecuentes."
                </h3>
                <div className="mt-auto pt-6 border-t border-slate-100">
                  <div className="text-xs font-bold text-emerald-600 uppercase mb-2">Resultado</div>
                  <div className="flex items-start gap-3 text-slate-700 font-medium">
                    <CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={18} /> 
                    <p>Pipeline automatizado. Hoy tarda <strong>30 segundos</strong>. Cero errores de digitación desde la implementación.</p>
                  </div>
                </div>
              </motion.div>
            </FadeInUp>

            <FadeInUp delay={0.3}>
              <motion.div whileHover={{ y: -5 }} className="bg-white p-5 sm:p-8 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-2xl transition-all h-full flex flex-col relative group">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Retail Multilocal</div>
                <h3 className="font-display text-xl font-medium text-slate-900 mb-6 leading-relaxed italic text-balance">
                  "El equipo no sabía cuáles SKUs generaban pérdida hasta que ya era demasiado tarde."
                </h3>
                <div className="mt-auto pt-6 border-t border-slate-100">
                  <div className="text-xs font-bold text-emerald-600 uppercase mb-2">Resultado</div>
                  <div className="flex items-start gap-3 text-slate-700 font-medium">
                    <CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={18} /> 
                    <p>Dashboard unificado con visibilidad de <strong>174 productos</strong> en tiempo real.</p>
                  </div>
                </div>
              </motion.div>
            </FadeInUp>
          </div>

          <FadeInUp delay={0.4}>
            <div className="max-w-4xl mx-auto bg-slate-900 rounded-3xl p-5 sm:p-8 md:p-12 text-center shadow-xl border border-slate-800/80 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px]"></div>
              <p className="font-sans text-xl md:text-2xl text-white font-medium mb-10 leading-relaxed italic relative z-10 text-balance">
                "Si tu calculadora mostró más de ₡500,000 al mes, tiene sentido que hablemos 30 minutos. Sin compromiso, sin presentación de ventas — solo revisamos si los números son reales con tus datos."
              </p>
              <a 
                href="https://wa.me/50670330596?text=Hola,%20quisiera%20validar%20mi%20c%C3%A1lculo%20de%20ROI%20sin%20compromiso." 
                target="_blank" 
                rel="noreferrer"
                className="relative z-10 inline-flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-500 text-white px-8 md:px-10 py-5 md:py-6 rounded-full font-bold text-lg md:text-xl transition-all hover:scale-105 shadow-[0_10px_40px_rgba(5,150,105,0.4)]"
              >
                Validar mi resultado gratis <ArrowRight size={24} />
              </a>
            </div>
          </FadeInUp>
        </div>
      </section>

      {/* Methodology Visualizer - Recharts AreaChart */}
      <section className="py-16 sm:py-24 md:py-32 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            <div className="lg:w-1/2">
              <FadeInUp>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-bold mb-6 border border-blue-100">
                  <BarChart3 size={16} /> Inteligencia de Negocio
                </div>
                <h2 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-5 sm:mb-6 text-slate-900 leading-tight tracking-normal">Analítica Predictiva en <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">Tiempo Real</span></h2>
                <p className="font-sans text-lg text-slate-600 mb-10 leading-relaxed font-medium">
                  Visualiza el futuro de tu demanda hoy. Nuestro forecast con 93.2% de precisión te permite planificar turnos, optimizar el occupancy y reducir horas extra drásticamente.
                </p>
              </FadeInUp>

              {/* Dashboard Mockup */}
              <FadeInUp delay={0.2}>
                <motion.div 
                  whileHover={{ scale: 1.02, y: -5 }}
                  className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] relative"
                >
                  <div className="absolute top-0 right-10 w-24 h-1.5 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-b-lg"></div>
                  <div className="h-80 w-full mt-4" style={{ position: 'relative', width: '100%', height: 320 }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={220}>
                      <AreaChart data={forecastData} margin={chartMargins}>
                        <defs>
                          <linearGradient id="colorRealLight" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} fontWeight="600" />
                        <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} fontWeight="600" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                            border: '1px solid rgba(255,255,255,0.1)', 
                            borderRadius: '16px', 
                            color: '#fff',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
                            backdropFilter: 'blur(8px)'
                          }} 
                        />
                        <Area type="monotone" dataKey="real" stroke="#3b82f6" strokeWidth={5} fillOpacity={1} fill="url(#colorRealLight)" animationDuration={2000} />
                        <Line type="monotone" dataKey="forecast" stroke="#94a3b8" strokeWidth={3} strokeDasharray="5 5" animationDuration={2000} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center items-center mt-8 gap-8 px-4 bg-slate-50 border border-slate-100 py-4 rounded-xl">
                    <span className="text-sm text-slate-800 font-bold flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-blue-500 shadow-md shadow-blue-400/50" /> Volumen Real
                    </span>
                    <span className="text-sm text-slate-500 font-bold flex items-center gap-3">
                      <div className="w-4 h-4 border-[3px] border-slate-400 border-dashed rounded-full" /> Forecast Predictivo
                    </span>
                  </div>
                </motion.div>
              </FadeInUp>
            </div>

            <div className="lg:w-1/2 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pt-8 lg:pt-0">
              {[
                { title: "Dashboard Ejecutivo", desc: "Visibilidad total en 30 días garantizada y en tu móvil.", icon: <BarChart3 className="text-blue-500" size={28} /> },
                { title: "Alertas SLA", desc: "Notificaciones proactivas directas en tus canales de Teams.", icon: <Zap className="text-yellow-500" size={28} /> },
                { title: "Staffing Óptimo", desc: "Simulación de escenarios What-If para ajustar turnos.", icon: <Users className="text-purple-500" size={28} /> },
                { title: "Transferencia COE", desc: "Tu equipo aprende a dominar el modelo de datos sin nosotros.", icon: <Cpu className="text-emerald-500" size={28} /> }
              ].map((item, idx) => (
                <FadeInUp key={idx} delay={0.2 + (idx * 0.1)}>
                  <motion.div
                    whileHover={{ scale: 1.03, y: -5 }}
                    className="bg-slate-50 p-5 sm:p-7 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] transition-all h-full"
                  >
                    <div className="mb-4 sm:mb-5 w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-2xl border border-slate-200 flex items-center justify-center shadow-sm">
                      {item.icon}
                    </div>
                    <h4 className="font-display font-bold text-base sm:text-lg md:text-xl text-slate-900 mb-2 sm:mb-3">{item.title}</h4>
                    <p className="font-sans text-slate-600 font-medium leading-relaxed text-sm sm:text-base">{item.desc}</p>
                  </motion.div>
                </FadeInUp>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Metodología 4D */}
      <section className="py-14 sm:py-20 md:py-24 bg-white relative border-t border-slate-200 z-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <FadeInUp>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-bold mb-6 border border-blue-100">
                <Layers size={16} /> Metodología 4D
              </div>
              <h2 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 text-slate-900 tracking-normal">Nuestro Framework Propietario.</h2>
              <p className="font-sans text-base sm:text-lg md:text-xl text-slate-600 max-w-3xl mx-auto mb-5 sm:mb-6">
                No improvisamos. Aplicamos 4 fases estrictas con entregables medibles en cada etapa — porque el cliente no debería pagar por experimentos.
              </p>
              <p className="text-base text-slate-400 max-w-2xl mx-auto font-medium italic">
                &ldquo;La mayoría de consultores llegan con una propuesta. Nosotros llegamos con preguntas. Esa es la diferencia entre un proyecto que funciona y uno que se entrega pero nadie usa.&rdquo;
              </p>
            </FadeInUp>
          </div>

          <FadeInUp delay={0.2}>
            <div className="bg-slate-50 rounded-[2rem] p-2 md:p-6 shadow-sm border border-slate-200 mb-8">
              {/* Tab Selector */}
              <div className="flex overflow-x-auto snap-x snap-mandatory flex-nowrap md:flex-row justify-between mb-8 gap-3 relative pb-4 md:pb-0 no-scrollbar">
                <div className="hidden md:block absolute top-1/2 left-0 w-full h-1 bg-slate-200 -translate-y-1/2 z-0"></div>
                {[
                  { id: "D1", title: "DEFINE", tagline: "Primero entendemos.", icon: <Target className="w-6 h-6" /> },
                  { id: "D2", title: "DEVELOP", tagline: "Construimos con tus datos.", icon: <MonitorSmartphone className="w-6 h-6" /> },
                  { id: "D3", title: "DEBUG", tagline: "Hasta que funcione.", icon: <Settings className="w-6 h-6" /> },
                  { id: "D4", title: "DEPLOY", tagline: "Tu equipo autónomo.", icon: <Cpu className="w-6 h-6" /> }
                ].map((phase, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActivePhase(idx)}
                    className={`relative z-10 w-[75vw] sm:w-[45vw] md:w-auto shrink-0 snap-center md:flex-1 flex flex-row md:flex-col items-center gap-4 p-4 rounded-2xl transition-all duration-300 ${
                      activePhase === idx
                        ? 'bg-blue-600 text-white shadow-lg md:scale-105 scale-[1.02]'
                        : 'bg-white text-slate-500 hover:bg-blue-50 hover:text-blue-600 border border-slate-200'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      activePhase === idx ? 'bg-white/20' : 'bg-slate-100'
                    }`}>
                      {phase.icon}
                    </div>
                    <div className="text-left md:text-center block">
                      <div className={`text-xs font-bold uppercase tracking-widest ${
                        activePhase === idx ? 'text-blue-200' : 'text-slate-400'
                      }`}>{phase.id}</div>
                      <div className="font-display font-bold text-base sm:text-lg">{phase.title}</div>
                      <div className={`text-xs hidden md:block ${
                        activePhase === idx ? 'text-blue-200' : 'text-slate-400'
                      }`}>{phase.tagline}</div>
                    </div>
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
                    image: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=800"
                  },
                  {
                    summary: "Diseño y construcción del modelo. Avances cada 72 horas, no al final del proyecto.",
                    detail: "Aquí es donde la mayoría de consultores desaparecen 3 semanas. Nosotros trabajamos diferente: cada 72 horas hay una actualización visible, un avance funcional que podés tocar, no una presentación de PowerPoint explicando lo que vamos a hacer. Toda la construcción se hace con tus datos reales — no con datasets de demo. Eso significa que cuando llegue el D4, el sistema ya fue probado con la realidad de tu operación. La arquitectura se diseña para que tu equipo la pueda mantener. No queremos que dependás de nosotros para siempre.",
                    deliverables: ["Arquitectura del modelo documentada", "Primera versión funcional con datos reales", "Avances parciales cada 72 horas", "Revisión de alcance antes de continuar"],
                    duration: "1–3 semanas según complejidad",
                    image: "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?auto=format&fit=crop&q=80&w=800"
                  },
                  {
                    summary: "Pruebas con tus datos reales, casos edge incluidos. Iteramos hasta que el resultado sea confiable, no solo correcto en condiciones ideales.",
                    detail: "Un sistema que funciona el 90% del tiempo no sirve en producción. En esta fase sometemos el modelo a los escenarios más incómodos: archivos con encoding diferente, fechas en formato texto, registros duplicados, columnas vacías, datos de meses anteriores que llegan tarde. Cada error que encontramos en el D3 es un error que no te va a despertar a las 11 de la noche en producción. También es la fase donde tu equipo empieza a conocer el sistema — los involucramos en las pruebas para que al momento del Deploy no sea algo nuevo y extraño.",
                    deliverables: ["Log de casos edge encontrados y resueltos", "Validación con datos históricos reales", "Sesión de prueba con el equipo del cliente", "Aprobación formal antes de Deploy"],
                    duration: "3–7 días de iteración",
                    image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=800"
                  },
                  {
                    summary: "Entrega final en producción con capacitación incluida. Sin sorpresas, sin costos ocultos, sin dependencia permanente de nosotros.",
                    detail: "El Deploy no es solo subir el archivo y mandar un email. Es una sesión de entrega donde tu equipo entiende cómo funciona el sistema, cómo actualizarlo, qué hacer si algo falla, y cuándo tiene sentido contactarnos. Cada proyecto entregado incluye: documentación técnica en lenguaje no técnico, SOP de actualización y mantenimiento, checklist de validación mensual, y una sesión de soporte post-Deploy de 30 días sin costo adicional. El objetivo es que en 30 días tu equipo opere el sistema de forma completamente autónoma. Si eso no pasa, seguimos hasta que pase.",
                    deliverables: ["Sistema en producción documentado", "Capacitación del equipo (presencial o remota)", "SOP de mantenimiento y actualización", "30 días de soporte post-entrega incluido"],
                    duration: "1 sesión de entrega + 30 días soporte",
                    image: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&q=80&w=800"
                  }
                ].map((content, idx) => (
                  activePhase === idx && (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                      className="grid grid-cols-1 md:grid-cols-2"
                    >
                      {/* Image column */}
                      <div className="h-64 md:h-auto min-h-[300px] overflow-hidden relative">
                        <img src={content.image} alt="" className="w-full h-full object-cover" />
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
            <div className="table-scroll-wrap shadow-xl border border-slate-200 mb-10 sm:mb-12">
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
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-lg hover:scale-105"
                  >
                    Agendar mi D1 gratuito <ArrowRight size={20} />
                  </a>
                  <a
                    href="#servicios"
                    className="inline-flex items-center gap-2 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 px-8 py-4 rounded-xl font-bold transition-all"
                  >
                    Ver casos donde aplicamos esto
                  </a>
                </div>
                <p className="text-xs text-slate-500 max-w-2xl mx-auto">
                  Metodología aplicada en proyectos para corporaciones de consumo masivo, sector energético y empresas de la Gran Área Metropolitana. Más de 50 proyectos documentados bajo este mismo framework.
                </p>
              </div>
            </div>
          </FadeInUp>

        </div>
      </section>

      {/* Equipo / Sobre Nosotros */}
      <section className="py-16 sm:py-24 md:py-32 bg-slate-950 relative z-20 overflow-hidden">
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
                image: import.meta.env.BASE_URL + "Kathalina Gonzales.png"
              },
              {
                fullName: "Jeyrell Tardencilla",
                role: "Data & Automation Lead",
                description: "Senior Engineer con 8+ años de experiencia corporativa en corporaciones de consumo masivo. Lean Six Sigma Green Belt. Especializado en arquitecturas de datos, Python y Power BI, transformando equipos ahogados en reportes en áreas de alto rendimiento.",
                image: import.meta.env.BASE_URL + "Jeyrell Tardencilla.png"
              },
              {
                fullName: "Alex Benedict",
                role: "Implementación Técnica",
                description: "Desarrollador enfocado en estructuración de datos y pipelines analíticos. Garantiza el soporte técnico riguroso de cada solución entregada, aportando solidez en la automatización confiable de procesos manuales.",
                image: import.meta.env.BASE_URL + "Alex Benect.png"
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
                        <img 
                          src={member.image} 
                          alt={member.fullName} 
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 object-top" 
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
                    <div className="mt-4 font-bold text-white group-hover:text-emerald-300">Expansión CR</div>
                  </div>
                </div>
              </div>
            </div>
          </FadeInUp>
        </div>
      </section>

      {/* CTA Final y Contacto */}
      <section className="relative py-14 sm:py-20 md:py-24 text-center overflow-hidden bg-slate-950 border-t-4 border-blue-600">
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            
            <div className="lg:w-1/2 text-left">
              <FadeInUp>
                <div className="inline-flex items-center gap-2 px-6 py-2 bg-slate-800 border border-slate-700 rounded-full text-sm font-bold mb-6 shadow-sm text-cyan-400">
                  <Target size={16} /> El Próximo Paso
                </div>
                <h2 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6">
                  Validamos tu caso de forma <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">gratuita</span>.
                </h2>
                <p className="font-sans text-base sm:text-lg md:text-xl text-slate-400 mb-6 sm:mb-8 max-w-xl">
                  En la sesión de Discovery de 30 min, evaluaremos si podemos ayudarte. Si no hay ROI claro, te lo decimos sin compromisos.
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
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-5 sm:mb-6 font-display">Solicitar Assessment (Fase 0)</h3>
                  <form className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                       <label className="text-sm font-bold text-slate-400">Nombre & Empresa</label>
                       <input type="text" placeholder="Tu nombre" className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500" />
                    </div>
                    <div className="flex flex-col gap-2">
                       <label className="text-sm font-bold text-slate-400">Principal dolor</label>
                       <select className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500">
                         <option>Selecciona un área</option>
                         <option>Reportes excesivos</option>
                         <option>Descontrol de Inventario</option>
                         <option>Cuentas por Cobrar</option>
                         <option>Automatización general</option>
                         <option>Otro</option>
                       </select>
                    </div>
                    <button type="button" onClick={handleAssessmentClick} className="mt-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl transition-colors w-full flex items-center justify-center gap-2">
                      <Target size={20} /> Agendar
                    </button>
                    <p className="text-xs text-center text-slate-500 mt-2 flex items-center justify-center gap-2"><ShieldCheck size={14}/> 100% libre de spam</p>
                  </form>
                </div>
              </FadeInUp>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Minimalista Premium */}
      <footer className="py-8 sm:py-12 border-t border-slate-800 text-slate-400" style={{ backgroundColor: '#020617' }}>
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-3">
            <img src={import.meta.env.BASE_URL + "Logo.png"} alt="JC Analytics Logo" className="h-8 sm:h-10 w-auto object-contain" />
          </div>
          <div className="text-xs sm:text-sm font-medium font-sans text-center">
            © 2026 JC Analytics. Propuesta Privada.
          </div>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-8 font-sans items-center">
            <a href="mailto:gerencia@jcanalytic.com" className="hover:text-cyan-400 transition-colors text-xs sm:text-sm font-bold">gerencia@jcanalytic.com</a>
            <a href="https://wa.me/50670330596" target="_blank" rel="noreferrer" className="hover:text-emerald-400 transition-colors text-xs sm:text-sm font-bold text-emerald-500">Contacto WhatsApp</a>
            <button className="hover:text-cyan-400 transition-colors text-xs sm:text-sm font-bold">LinkedIn</button>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Button with Pulse */}
      <motion.a
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        href="https://wa.me/50670330596"
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 bg-emerald-500 hover:bg-emerald-400 text-white p-3 sm:p-4 rounded-full shadow-2xl flex items-center justify-center pulse-ring"
        aria-label="Contactar por WhatsApp"
      >
        <MessageSquare size={26} className="sm:hidden" />
        <MessageSquare size={30} className="hidden sm:block" />
      </motion.a>
    </div>
  );
};

export default App;