import { t, locale } from '../../i18n/locale';
// ============================================================================
//  src/components/site/Automation.jsx
//  "Predicar con el ejemplo": una automatización corriendo en la página.
//  Tres recorridos ilustrativos (fiscal · ventas · redes). Un pulso recorre los nodos,
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
    tab: t("Fiscal", "Tax"),
    title: t("Un recorrido para revisar comprobantes", "A workflow for reviewing invoices"),
    sub: t("Este ejemplo conecta la recepción, la revisión y el registro. Las reglas y las excepciones se definen con el equipo responsable.", "This example connects receipt, review and recording. Rules and exceptions are defined with the responsible team."),
    unit: t("recorridos simulados", "simulated runs"),
    manual: { label: t("Entrada", "Input"), value: t("Documento", "Document"), per: t("pendiente de revisión", "awaiting review") },
    auto: { label: t("Salida posible", "Possible output"), value: t("Registro", "Record"), per: t("con excepciones por revisar", "with exceptions to review") },
    nodes: [
      { icon: Mail, title: t("Llega el XML", "XML received"), sub: t("correo o carpeta", "email or folder") },
      { icon: ShieldCheck, title: t("Revisión", "Review"), sub: t("campos y montos", "fields and amounts") },
      { icon: Landmark, title: t("Respuesta", "Response"), sub: t("estado del documento", "document status") },
      { icon: Database, title: 'ERP', sub: t("registro propuesto", "proposed record") },
      { icon: MessageCircle, title: t("Alerta", "Alert"), sub: t("excepción por revisar", "exception to review") },
      { icon: BarChart3, title: 'Dashboard', sub: t("estado visible", "visible status") },
    ],
    logs: [
      () => t("Documento ficticio recibido en el ejemplo", "Fictional document received in the example"),
      () => t("Simulación de revisión de campos y totales", "Simulated review of fields and totals"),
      (n) => (n % 7 === 3 ? t("Alerta simulada: un campo requiere revisión", "Simulated alert: a field needs review") : t("Estado de ejemplo: revisión completada", "Example status: review complete")),
      () => t("Registro de ejemplo preparado para el ERP", "Example record prepared for the ERP"),
      () => t("Notificación simulada para el equipo responsable", "Simulated notification for the responsible team"),
      () => t("Estado del recorrido actualizado en la demo", "Workflow status updated in the demo"),
    ],
  },
  {
    id: 'ventas',
    tab: t("Ventas", "Sales"),
    title: t("Un seguimiento más claro", "A clearer follow-up workflow"),
    sub: t("Una solicitud ficticia recorre el registro, la propuesta y un recordatorio. Cada etapa conserva un responsable.", "A fictional request moves through registration, a proposal and a reminder. Each stage keeps a responsible owner."),
    unit: t("recorridos simulados", "simulated runs"),
    manual: { label: t("Entrada", "Input"), value: t("Consulta", "Inquiry"), per: t("con una necesidad por entender", "with a need to understand") },
    auto: { label: t("Salida posible", "Possible output"), value: t("Próximo paso", "Next step"), per: t("asignado a una persona", "assigned to a person") },
    nodes: [
      { icon: MessageCircle, title: 'WhatsApp', sub: t("mensaje nuevo", "new message") },
      { icon: UserPlus, title: t("Cliente registrado", "Customer registered"), sub: t("nombre y necesidad", "name and need") },
      { icon: FileText, title: t("Cotización", "Quote"), sub: t("PDF con tu marca", "branded PDF") },
      { icon: Clock, title: t("Seguimiento", "Follow-up"), sub: t("plazo acordado", "agreed timing") },
      { icon: Trophy, title: t("Cierre", "Closing"), sub: t("al tablero de ventas", "to the sales dashboard") },
    ],
    logs: [
      () => t("Consulta ficticia: «Necesito una propuesta»", "Fictional inquiry: “I need a proposal”"),
      () => t("Solicitud de ejemplo clasificada en el CRM", "Example request classified in the CRM"),
      () => t("Propuesta de ejemplo preparada para revisión", "Example proposal prepared for review"),
      () => t("Recordatorio ilustrativo asignado al equipo", "Illustrative reminder assigned to the team"),
      () => t("Estado simulado: pendiente de respuesta", "Simulated status: awaiting a response"),
    ],
  },
  {
    id: 'redes',
    tab: t("Redes", "Social media"),
    title: t("Hillary crea. El sistema publica y mide.", "Hillary creates. The system publishes and measures."),
    sub: t("Este recorrido ilustra cómo conectar aprobación, programación y revisión. El calendario y las respuestas se acuerdan con el equipo.", "This workflow illustrates how approval, scheduling and review can connect. The calendar and replies are agreed with the team."),
    unit: t("recorridos simulados", "simulated runs"),
    manual: { label: t("Entrada", "Input"), value: t("Contenido", "Content"), per: t("pendiente de aprobación", "awaiting approval") },
    auto: { label: t("Salida posible", "Possible output"), value: t("Calendario", "Calendar"), per: t("con revisión y seguimiento", "with review and follow-up") },
    nodes: [
      { icon: PenTool, title: t("Diseño", "Design"), sub: t("Hillary, con tu marca", "Hillary, with your brand") },
      { icon: CalendarClock, title: t("Programado", "Scheduled"), sub: t("hora acordada", "agreed time") },
      { icon: Send, title: t("Publicado", "Published"), sub: 'Instagram · Facebook · TikTok' },
      { icon: MessagesSquare, title: t("Comentarios", "Comments"), sub: t("asignados al equipo", "assigned to the team") },
      { icon: ClipboardList, title: t("Reporte", "Report"), sub: t("frecuencia acordada", "agreed frequency") },
    ],
    logs: [
      () => t("Contenido ficticio aprobado para el ejemplo", "Fictional content approved for the example"),
      () => t("Espacio de ejemplo reservado en el calendario", "Example slot reserved in the calendar"),
      () => t("Publicación simulada en los canales seleccionados", "Simulated publication on selected channels"),
      () => t("Consulta ficticia asignada al equipo", "Fictional inquiry assigned to the team"),
      () => t("Reporte ilustrativo preparado para revisión", "Illustrative report prepared for review"),
    ],
  },
];

const STEP_MS = 1500;

const fmtTime = (d) => d.toLocaleTimeString(locale === "es" ? "es-CR" : "en-US", { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

// Estado del recorrido en un solo objeto: el intervalo produce el siguiente
// estado completo (paso, ciclo y bitácora) y no hay setState dentro de effects.
const makeLine = (recipe, step, cycle) => {
  const text = recipe.logs[step]?.(cycle) ?? '';
  return { id: `${cycle}-${step}-${Date.now()}`, t: fmtTime(new Date()), text, warn: /RECHAZADO|Alerta|REJECTED|Alert/.test(text) };
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
            <Label className="text-ink/65">{t("Sistemas en acción / Automatización", "Systems in action / Automation")}</Label>
            <h2 className="mt-4 font-display font-semibold tracking-[-0.04em] leading-[0.92] text-[clamp(2.6rem,7vw,6rem)]">
              <MaskLines lines={[t("Mirá cómo", "See how it"), <span key="b" className="font-serif italic font-normal">{t("trabaja solo.", "runs on its own.")}</span>]} />
            </h2>
          </div>
          <Reveal delay={0.2}>
            <p className="max-w-xs text-ink/55 text-lg leading-snug">
             {t("Explorá un flujo interactivo de ejemplo. Así conectamos las tareas que hoy te quitan tiempo.", "Explore an interactive example workflow. This is how we connect the tasks taking up your time today.")}
            </p>
          </Reveal>
        </div>

        {/* Tabs de receta */}
        <Reveal className="flex flex-wrap gap-2 mb-8 sm:mb-10" aria-label={t("Ejemplos de automatización", "Automation examples")}>
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
          {!reduce && <button type="button" onClick={() => setPaused((value) => !value)} aria-pressed={paused} className="demo-pause">{paused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}{paused ? t("Reanudar demo", "Resume demo") : t("Pausar demo", "Pause demo")}</button>}
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
                <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.1em] text-ink/55">{t("Ejemplo ilustrativo · sin datos de clientes", "Illustrative example · no customer data")}</p>
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

            {/* Entradas y posibles salidas del recorrido ilustrativo. */}
            <div className="mt-8 sm:mt-10 pt-6 border-t border-ink/10 grid grid-cols-2 gap-4 sm:gap-8">
              {[recipe.manual, recipe.auto].map((m, i) => (
                <div key={m.label}>
                  <Label className={i ? 'text-lime-dark' : 'text-ink/45'}>{m.label}</Label>
                  <div className="mt-1 font-display text-xl sm:text-2xl font-semibold tracking-tight">{m.value}</div>
                  <div className="text-[13px] text-ink/50 mt-1">{m.per}</div>
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
               {t("Ejemplo ilustrativo", "Illustrative example")}
              </span>
              <span className="font-mono text-[11px] text-paper/40">{t("bitácora ·", "activity log ·")} {recipe.tab.toLowerCase()}</span>
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
              <span className="text-paper/55 text-[15px] leading-snug">{recipe.unit}<br />{t("en este ejemplo", "in this example")}</span>
            </div>

            <ul className="mt-6 space-y-2 font-mono text-[12.5px] leading-snug flex-1" aria-label={t("Bitácora del ejemplo", "Example activity log")}>
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
              <ContactCTA need="Automatización" source={`${t("Automatización", "Automation")} · ${recipe.tab}`} variant="lime">
               {t("Definir mi automatización", "Define my automation")}
              </ContactCTA>
              <span className="text-paper/45 text-[13px]">{t("Diagnóstico sin costo. Avances cada 72 h.", "Free assessment. Progress updates every 72 hours.")}</span>
            </div>
          </Reveal>
        </div>
  );
};

export default Automation;
