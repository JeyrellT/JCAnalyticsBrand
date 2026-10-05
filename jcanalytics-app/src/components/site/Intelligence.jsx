import { t } from '../../i18n/locale';
import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { ArrowRight, ArrowUpRight, BrainCircuit, Check, Database, FileText, Play, RotateCcw, Workflow } from 'lucide-react';
import { Label, MaskLines, Reveal } from './primitives';
import ContactCTA from './ContactCTA';
import { IntelligenceAtlas } from './StudioIllustrations';
import '../../styles/intelligence.css';

const CASES = [
  { title: t("Predecir demanda", "Forecast demand"), category: 'MACHINE LEARNING', input: t("Histórico de ventas", "Sales history"), file: t("ventas_mensuales.csv", "monthly_sales.csv"), process: t("Modelo predictivo", "Predictive model"), output: t("Planificación de inventario", "Inventory planning"), heading: t("Anticipá el siguiente movimiento.", "Anticipate the next move."), description: t("Desarrollamos modelos con tus datos para estimar demanda, detectar patrones y planificar recursos.", "We develop models using your data to estimate demand, uncover patterns and plan resources."), result: t("Demanda de ejemplo: julio 120 u. · agosto 135 u. · septiembre 128 u.", "Example demand: July 120 units · August 135 units · September 128 units."), note: t("En un proyecto real validamos el modelo y su error con datos que no haya visto.", "In a real project, we validate the model and its error using data it has never seen.") },
  { title: t("Consultar documentos", "Search documents"), category: t("INTEGRACIÓN DE IA", "AI INTEGRATION"), input: t("Documentos del negocio", "Business documents"), file: t("manual_de_servicio.pdf", "service_manual.pdf"), process: t("Búsqueda + asistente IA", "Search + AI assistant"), output: t("Respuesta con referencia", "Answer with a source"), heading: t("Tu conocimiento, más accesible.", "Your knowledge, more accessible."), description: t("Integramos asistentes que consultan tus documentos y ayudan a tu equipo a encontrar respuestas en sus herramientas.", "We integrate assistants that search your documents and help your team find answers within their existing tools."), result: t("Respuesta de ejemplo: el horario de atención es de lunes a viernes, de 8 a. m. a 5 p. m. Fuente: manual, sección 2.", "Example answer: business hours are Monday to Friday, 8 a.m. to 5 p.m. Source: service manual, section 2."), note: t("Definimos fuentes, permisos y cuándo la respuesta necesita revisión humana.", "We define sources, permissions and when an answer needs human review.") },
  { title: t("Clasificar solicitudes", "Classify requests"), category: t("IA + AUTOMATIZACIÓN", "AI + AUTOMATION"), input: t("Solicitud de un cliente", "Customer request"), file: t("«Necesito actualizar mi factura»", "“I need to update my invoice”"), process: t("Clasificación de intención", "Intent classification"), output: t("Solicitud al equipo indicado", "Request routed to the right team"), heading: t("Menos tareas. Más criterio.", "Fewer tasks. More judgment."), description: t("Conectamos IA con tus sistemas para clasificar información, extraer datos y asistir procesos con reglas claras.", "We connect AI with your systems to classify information, extract data and support processes with clear rules."), result: t("Clasificación de ejemplo: facturación → equipo de administración → pendiente de revisión.", "Example classification: billing → administration team → awaiting review."), note: t("Las reglas y aprobaciones se acuerdan antes de conectar el flujo a tu operación.", "Rules and approvals are agreed before connecting the workflow to your operation.") },
];

const Intelligence = () => {
  const [selected, setSelected] = useState(0);
  const [step, setStep] = useState(-1);
  const reduce = useReducedMotion();
  const example = CASES[selected];
  const running = step >= 0 && step < 3;
  useEffect(() => {
    if (!running) return undefined;
    const timer = window.setTimeout(() => setStep((value) => value + 1), reduce ? 0 : 550);
    return () => window.clearTimeout(timer);
  }, [step, running, reduce]);

  return (
    <section id="inteligencia" className="ai-section" aria-labelledby="ai-title">
      <div className="intelligence-container">
        <div className="ai-heading"><Label>{t("03 / Machine learning & integración de IA", "03 / Machine learning & AI integration")}</Label><svg className="ai-heading__symbol" viewBox="0 0 80 80" fill="none" aria-hidden="true"><path d="M40 5V75M5 40H75M15 15L65 65M15 65L65 15" stroke="currentColor" strokeWidth="3" /></svg></div>
        <div className="ai-layout">
          <div className="ai-copy"><h2 id="ai-title"><MaskLines lines={[t("El siguiente paso", "The next step"), t("de tu sistema:", "for your system:"), <span key="intelligence">{t("inteligencia.", "intelligence.")}</span>]} /></h2><Reveal><p>{t("Modelos que encuentran patrones. Asistentes que consultan tu información. IA integrada a las herramientas que tu equipo ya utiliza.", "Models that uncover patterns. Assistants that search your information. AI integrated into the tools your team already uses.")}</p></Reveal><div className="ai-cases" role="group" aria-label={t("Casos de uso de inteligencia artificial", "Artificial intelligence use cases")}>{CASES.map((item, index) => <button key={item.title} type="button" aria-pressed={selected === index} onClick={() => { setSelected(index); setStep(-1); }}><span>0{index + 1}</span>{item.title}<ArrowUpRight size={17} aria-hidden="true" /></button>)}</div></div>
          <Reveal className="ai-lab">
            <div className="ai-lab__top"><span><i aria-hidden="true" />{t("EJEMPLO ILUSTRATIVO", "ILLUSTRATIVE EXAMPLE")}</span><span>DEMO</span></div>
            <div className="ai-lab__body"><span className="ai-lab__category">{example.category}</span><h3>{example.heading}</h3><p className="ai-lab__description">{example.description}</p>
              <IntelligenceAtlas selected={selected} step={step} />
              <div className="ai-pipeline" aria-label={t("Etapas del ejemplo", "Example stages")}>{[Database, BrainCircuit, Workflow].map((Icon, index) => <div key={index} className={`ai-pipeline__step ${step >= index ? 'is-active' : ''}`}><span className="ai-pipeline__icon">{step > index ? <Check size={23} aria-hidden="true" /> : <Icon size={23} strokeWidth={1.5} aria-hidden="true" />}</span><span>{[example.input, example.process, example.output][index]}</span>{index < 2 && <ArrowRight className="ai-pipeline__arrow" size={17} aria-hidden="true" />}</div>)}</div>
              <div className="ai-lab__input"><FileText size={15} aria-hidden="true" /><span>{example.file}</span><small>{t("EJEMPLO", "EXAMPLE")}</small></div>
              <div className="ai-lab__result" role="status" aria-live="polite"><span>{step === 3 ? t("RESULTADO ILUSTRATIVO", "ILLUSTRATIVE RESULT") : running ? t("RECORRIENDO EL EJEMPLO…", "RUNNING THE EXAMPLE…") : t("DE LOS DATOS A UNA ACCIÓN", "FROM DATA TO ACTION")}</span><p>{step === 3 ? example.result : t("Explorá cómo la información atraviesa cada etapa y se convierte en una salida útil.", "Explore how information moves through each stage and becomes a useful output.")}</p></div>
              <button type="button" className="ai-run" onClick={() => setStep(reduce ? 3 : 0)} disabled={running}>{step === 3 ? <RotateCcw size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}{running ? t("Ejecutando ejemplo…", "Running example…") : step === 3 ? t("Repetir ejemplo", "Run again") : t("Ejecutar ejemplo", "Run example")}<ArrowUpRight size={17} aria-hidden="true" /></button>
              <p className="ai-lab__note">{t("Simulación visual con datos ficticios.", "Visual simulation with fictional data.")} {example.note}</p>
            </div>
          </Reveal>
        </div>
        <Reveal className="ai-bottom"><p>{t("Primero, un problema concreto.", "First, a specific problem.")}<br /><strong>{t("Después, la tecnología que lo resuelve.", "Then, the technology to solve it.")}</strong></p><ContactCTA need={selected === 0 ? 'Machine learning' : 'Integración de IA'} source={`${t("IA & ML", "AI & ML")} · ${example.title}`} variant="paper">{t("Exploremos mi caso de uso", "Let's explore my use case")}</ContactCTA></Reveal>
      </div>
    </section>
  );
};
export default Intelligence;
