// ============================================================================
//  src/components/site/Automation.jsx
//  "Predicar con el ejemplo": una automatización corriendo en la página.
//  Tres recetas reales (fiscal · ventas · redes). Un pulso recorre los nodos,
//  cada paso deja una línea en la bitácora y el contador sube. Todo es CSS +
//  framer-motion; se pausa fuera del viewport y con reduced-motion queda
//  estático (todos los nodos activos y la bitácora completa).
// ============================================================================
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import {
  Mail, ShieldCheck, Landmark, Database, MessageCircle, BarChart3,
  UserPlus, FileText, Clock, Trophy, PenTool, CalendarClock, Send, MessagesSquare, ClipboardList, Pause, Play,
} from 'lucide-react';
import { Label, MaskLines, Reveal } from './primitives';
import { EASE } from './links';
import ContactCTA from './ContactCTA';

// eslint (sin plugin de react) no reconoce a `motion` usado solo como <motion.x>.
const _MOTION = motion;

const RECIPES = [
  {
    id: 'fiscal',
    tab: 'Fiscal',
    title: 'Factura electrónica sin revisarla a mano',
    sub: 'Cada comprobante que entra se valida, se registra y se reporta. Vos solo ves las excepciones.',
    unit: 'comprobantes',
    manual: { label: 'A mano', value: '6 h', per: 'por semana' },
    auto: { label: 'Automatizado', value: '0 min', per: 'y alerta si algo falla' },
    nodes: [
      { icon: Mail, title: 'Llega el XML', sub: 'correo o carpeta' },
      { icon: ShieldCheck, title: 'Validación v4.4', sub: 'esquema y montos' },
      { icon: Landmark, title: 'Hacienda', sub: 'respuesta conciliada' },
      { icon: Database, title: 'ERP', sub: 'asiento creado' },
      { icon: MessageCircle, title: 'Alerta', sub: 'solo si hay rechazo' },
      { icon: BarChart3, title: 'Dashboard', sub: 'al día, no a fin de mes' },
    ],
    logs: [
      (n) => `Comprobante …${String(4120 + n).padStart(5, '0')} recibido · Distribuidora Norte S.A.`,
      () => 'XML válido contra esquema v4.4 · IVA 13 % cuadra',
      (n) => (n % 7 === 3 ? 'Hacienda: RECHAZADO · cédula del receptor inválida' : 'Hacienda: aceptado · clave conciliada'),
      () => 'Asiento contable creado en el ERP',
      (n) => (n % 7 === 3 ? 'Alerta enviada a contabilidad por WhatsApp' : 'Sin excepciones · no se molesta a nadie'),
      () => 'Dashboard fiscal actualizado',
    ],
  },
  {
    id: 'ventas',
    tab: 'Ventas',
    title: 'Ningún cliente se queda sin respuesta',
    sub: 'Del mensaje en WhatsApp a la cotización y al seguimiento, sin que nadie lo tenga que recordar.',
    unit: 'clientes atendidos',
    manual: { label: 'A mano', value: '40 %', per: 'de mensajes sin seguimiento' },
    auto: { label: 'Automatizado', value: '100 %', per: 'con seguimiento a las 48 h' },
    nodes: [
      { icon: MessageCircle, title: 'WhatsApp', sub: 'mensaje nuevo' },
      { icon: UserPlus, title: 'Cliente registrado', sub: 'nombre y necesidad' },
      { icon: FileText, title: 'Cotización', sub: 'PDF con tu marca' },
      { icon: Clock, title: 'Seguimiento', sub: 'a las 48 h' },
      { icon: Trophy, title: 'Cierre', sub: 'al tablero de ventas' },
    ],
    logs: [
      (n) => `Nuevo mensaje · +506 8••• ${String(1000 + (n * 37) % 9000)} · "¿Cuánto cuesta…?"`,
      () => 'Cliente creado en el CRM · etiqueta: cotización',
      () => 'Cotización PDF generada y enviada · 3 opciones',
      () => 'Recordatorio programado · viernes 9:00',
      (n) => (n % 3 === 0 ? 'Cierre registrado · ₡185.000' : 'Seguimiento enviado · esperando respuesta'),
    ],
  },
  {
    id: 'redes',
    tab: 'Redes',
    title: 'Hillary crea. El sistema publica y mide.',
    sub: 'El contenido sale a la hora que rinde, los comentarios se atienden y el reporte llega solo cada lunes.',
    unit: 'publicaciones',
    manual: { label: 'A mano', value: '3 h', per: 'por publicación' },
    auto: { label: 'Con el sistema', value: '20 min', per: 'y el reporte llega solo' },
    nodes: [
      { icon: PenTool, title: 'Diseño', sub: 'Hillary, con tu marca' },
      { icon: CalendarClock, title: 'Programado', sub: 'hora de mayor alcance' },
      { icon: Send, title: 'Publicado', sub: 'Instagram · Facebook · TikTok' },
      { icon: MessagesSquare, title: 'Comentarios', sub: 'respondidos en minutos' },
      { icon: ClipboardList, title: 'Reporte', sub: 'lunes 7:00, en tu correo' },
    ],
    logs: [
      (n) => `Reel aprobado · "${['3 señales de que tu Excel ya no da más', 'Antes / después: agenda de una barbería', 'Cómo cotizamos en 3 clics'][n % 3]}"`,
      () => 'Programado · martes 6:00 p. m. (mejor hora de la cuenta)',
      () => 'Publicado en Instagram, Facebook y TikTok',
      (n) => `${4 + (n * 5) % 9} comentarios · ${2 + (n * 3) % 6} mensajes respondidos`,
      () => 'Reporte semanal generado · alcance, clics y conversaciones',
    ],
  },
];

const STEP_MS = 1500;

const fmtTime = (d) => d.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

// Estado del recorrido en un solo objeto: el intervalo produce el siguiente
// estado completo (paso, ciclo y bitácora) y no hay setState dentro de effects.
const makeLine = (recipe, step, cycle) => {
  const text = recipe.logs[step]?.(cycle) ?? '';
  return { id: `${cycle}-${step}-${Date.now()}`, t: fmtTime(new Date()), text, warn: /RECHAZADO|Alerta/.test(text) };
};
const initialRun = (recipe) => ({ step: 0, cycle: 0, log: [makeLine(recipe, 0, 0)] });
const advance = (recipe, run) => {
  const wrapped = run.step + 1 >= recipe.nodes.length;
  const step = wrapped ? 0 : run.step + 1;
  const cycle = wrapped ? run.cycle + 1 : run.cycle;
  return { step, cycle, wrapped, log: [makeLine(recipe, step, cycle), ...run.log].slice(0, 6) };
};

const Automation = () => {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const inView = useInView(ref, { margin: '-15% 0px -15% 0px' });

  const [recipeId, setRecipeId] = useState('fiscal');
  const recipe = useMemo(() => RECIPES.find((r) => r.id === recipeId), [recipeId]);

  // Each recipe is an illustrative run. Pause preserves its current step.
  const [paused, setPaused] = useState(false);

  return (
    <section id="automatizacion" ref={ref} className="automation-premium scroll-mt-24 bg-paper text-ink py-20 sm:py-32 rounded-t-[2rem] sm:rounded-t-[3rem] -mt-8 relative z-20">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10 sm:mb-16">
          <div>
            <Label className="text-ink/65">Sistemas en acción / Automatización</Label>
            <h2 className="mt-4 font-display font-semibold tracking-[-0.04em] leading-[0.92] text-[clamp(2.6rem,7vw,6rem)]">
              <MaskLines lines={['Mirá cómo', <span key="b" className="font-serif italic font-normal">trabaja solo.</span>]} />
            </h2>
          </div>
          <Reveal delay={0.2}>
            <p className="max-w-xs text-ink/55 text-lg leading-snug">
              Explorá un flujo interactivo de ejemplo. Así conectamos las tareas que hoy te quitan tiempo.
            </p>
          </Reveal>
        </div>

        {/* Tabs de receta */}
        <Reveal className="flex flex-wrap gap-2 mb-8 sm:mb-10" aria-label="Ejemplos de automatización">
          {RECIPES.map((r) => (
            <button
              key={r.id}
              type="button"
              aria-pressed={recipeId === r.id}
              onClick={() => setRecipeId(r.id)}
              className={`tap-press h-11 px-5 rounded-full text-[15px] font-medium border transition-colors ${
                recipeId === r.id ? 'bg-ink text-lime border-ink' : 'border-ink/20 hover:border-ink'
              }`}
            >
              {r.tab}
            </button>
          ))}
          {!reduce && <button type="button" onClick={() => setPaused((value) => !value)} aria-pressed={paused} className="demo-pause">{paused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}{paused ? 'Reanudar demo' : 'Pausar demo'}</button>}
        </Reveal>

        <Runner key={recipe.id} recipe={recipe} reduce={reduce} playing={inView && !paused} />
      </div>
    </section>
  );
};

const Runner = ({ recipe, reduce, playing }) => {
  const [run, setRun] = useState(() => initialRun(recipe));
  const { step, log } = run;

  // Motor: avanza un nodo cada STEP_MS mientras la sección está en pantalla.
  useEffect(() => {
    if (reduce || !playing) return undefined;
    const id = setInterval(() => {
      setRun((r) => {
        const next = advance(recipe, r);
        return next;
      });
    }, STEP_MS);
    return () => clearInterval(id);
  }, [reduce, playing, recipe]);

  const activeStep = reduce ? recipe.nodes.length - 1 : step;
  const staticLog = reduce ? recipe.logs.map((f, i) => ({ id: `s-${i}`, t: '—', text: f(0), warn: false })) : log;

  return (
        <div className="grid grid-cols-1 lg:grid-cols-[1.45fr_1fr] gap-6 lg:gap-8 items-stretch">
          {/* Flujo */}
          <Reveal className="rounded-[1.5rem] sm:rounded-[2rem] bg-white ring-1 ring-ink/10 p-5 sm:p-8 flex flex-col">
            <AnimatePresence mode="wait">
              <motion.div
                key={recipe.id}
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -10 }}
                transition={{ duration: 0.45, ease: EASE }}
              >
                <h3 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight leading-tight">{recipe.title}</h3>
                <p className="mt-2 text-ink/55 text-[15px] sm:text-base max-w-xl">{recipe.sub}</p>
              </motion.div>
            </AnimatePresence>

            <ol className="auto-flow mt-8 sm:mt-10 grid gap-3 sm:gap-2 grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(0,1fr))] relative">
              {recipe.nodes.map((n, i) => {
                const Icon = n.icon;
                const active = i === activeStep;
                const done = i < activeStep || reduce;
                return (
                  <li key={`${recipe.id}-${n.title}`} className="relative flex sm:flex-col items-center sm:items-start gap-4 sm:gap-3">
                    {/* Conector */}
                    {i < recipe.nodes.length - 1 && (
                      <span aria-hidden="true" className="auto-flow__link absolute left-6 top-12 h-[calc(100%+0.75rem)] w-px sm:left-12 sm:top-6 sm:h-px sm:w-[calc(100%-2.5rem)] bg-ink/10 overflow-hidden">
                        <motion.span
                          className="block bg-lime-dark w-full h-full origin-top sm:origin-left"
                          initial={false}
                          animate={{ scaleY: done ? 1 : 0, scaleX: done ? 1 : 0 }}
                          transition={{ duration: reduce ? 0 : 0.6, ease: EASE }}
                        />
                      </span>
                    )}
                    <motion.span
                      animate={active && !reduce ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                      transition={{ duration: 0.6, ease: EASE }}
                      className={`relative z-10 grid place-items-center w-12 h-12 rounded-full shrink-0 transition-colors duration-500 ${
                        active ? 'bg-lime text-ink ring-4 ring-lime/40' : done ? 'bg-ink text-lime' : 'bg-paper text-ink/40 ring-1 ring-ink/10'
                      }`}
                    >
                      <Icon size={20} strokeWidth={2.2} />
                    </motion.span>
                    <div className="min-w-0">
                      <div className={`font-semibold text-[15px] leading-tight transition-colors ${active || done ? 'text-ink' : 'text-ink/45'}`}>{n.title}</div>
                      <div className="text-[12px] text-ink/45 leading-snug mt-0.5">{n.sub}</div>
                    </div>
                  </li>
                );
              })}
            </ol>

            {/* Antes / después */}
            <div className="mt-8 sm:mt-10 pt-6 border-t border-ink/10 grid grid-cols-2 gap-4 sm:gap-8">
              {[recipe.manual, recipe.auto].map((m, i) => (
                <div key={m.label}>
                  <Label className={i ? 'text-lime-dark' : 'text-ink/45'}>{m.label}</Label>
                  <div className={`mt-1 font-display text-3xl sm:text-4xl font-semibold tracking-tight ${i ? '' : 'text-ink/40 line-through decoration-2'}`}>{m.value}</div>
                  <div className="text-[13px] text-ink/50 mt-1">{m.per}</div>
                  <div className="mt-3 h-1.5 rounded-full bg-ink/10 overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${i ? 'bg-lime-dark' : 'bg-ink/30'}`}
                      initial={{ width: 0 }}
                      whileInView={{ width: i ? '12%' : '100%' }}
                      viewport={{ once: true }}
                      transition={{ duration: reduce ? 0 : 1.2, ease: EASE, delay: 0.2 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Reveal>

          {/* Bitácora */}
          <Reveal delay={0.1} className="rounded-[1.5rem] sm:rounded-[2rem] bg-ink text-paper p-5 sm:p-7 flex flex-col min-h-[22rem]">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-paper/50">
                <span className="relative flex w-2 h-2">
                  {!reduce && playing && <span className="absolute inset-0 rounded-full bg-lime animate-ping opacity-60" />}
                  <span className="relative w-2 h-2 rounded-full bg-lime" />
                </span>
                Demo interactiva
              </span>
              <span className="font-mono text-[11px] text-paper/40">bitácora · {recipe.tab.toLowerCase()}</span>
            </div>

            <div className="mt-5 flex items-baseline gap-3">
              <motion.span
                key={run.cycle}
                initial={reduce ? false : { y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4, ease: EASE }}
                className="font-display text-5xl sm:text-6xl font-semibold tracking-[-0.05em] leading-none text-lime tabular-nums"
              >
                {reduce ? 1 : run.cycle}
              </motion.span>
              <span className="text-paper/55 text-[15px] leading-snug">{recipe.unit}<br />en este ejemplo</span>
            </div>

            <ul className="mt-6 space-y-2 font-mono text-[12.5px] leading-snug flex-1" aria-label="Bitácora del ejemplo">
              <AnimatePresence initial={false}>
                {staticLog.map((l) => (
                  <motion.li
                    key={l.id}
                    layout={!reduce}
                    initial={reduce ? false : { opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35, ease: EASE }}
                    className={`flex gap-3 border-l-2 pl-3 py-0.5 ${l.warn ? 'border-orange-400 text-orange-200' : 'border-lime/40 text-paper/80'}`}
                  >
                    <span className="text-paper/35 shrink-0 tabular-nums">{l.t}</span>
                    <span className="min-w-0">{l.text}</span>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>

            <div className="mt-6 pt-5 border-t border-paper/10 flex flex-col sm:flex-row sm:items-center gap-3">
              <ContactCTA need="Automatización" source={`Automatización · ${recipe.tab}`} variant="lime">
                Definir mi automatización
              </ContactCTA>
              <span className="text-paper/45 text-[13px]">Diagnóstico sin costo. Avances cada 72 h.</span>
            </div>
          </Reveal>
        </div>
  );
};

export default Automation;
