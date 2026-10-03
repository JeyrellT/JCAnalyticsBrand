import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { ArrowRight, ArrowUpRight, BrainCircuit, Check, Database, FileText, Play, RotateCcw, Workflow } from 'lucide-react';
import { Label, MaskLines, Reveal } from './primitives';
import ContactCTA from './ContactCTA';
import { IntelligenceAtlas } from './StudioIllustrations';
import '../../styles/intelligence.css';

const CASES = [
  { title: 'Predecir demanda', category: 'MACHINE LEARNING', input: 'Histórico de ventas', file: 'ventas_mensuales.csv', process: 'Modelo predictivo', output: 'Planificación de inventario', heading: 'Anticipá el siguiente movimiento.', description: 'Desarrollamos modelos con tus datos para estimar demanda, detectar patrones y planificar recursos.', result: 'Demanda de ejemplo: julio 120 u. · agosto 135 u. · septiembre 128 u.', note: 'En un proyecto real validamos el modelo y su error con datos que no haya visto.' },
  { title: 'Consultar documentos', category: 'INTEGRACIÓN DE IA', input: 'Documentos del negocio', file: 'manual_de_servicio.pdf', process: 'Búsqueda + asistente IA', output: 'Respuesta con referencia', heading: 'Tu conocimiento, más accesible.', description: 'Integramos asistentes que consultan tus documentos y ayudan a tu equipo a encontrar respuestas en sus herramientas.', result: 'Respuesta de ejemplo: el horario de atención es de lunes a viernes, de 8 a. m. a 5 p. m. Fuente: manual, sección 2.', note: 'Definimos fuentes, permisos y cuándo la respuesta necesita revisión humana.' },
  { title: 'Clasificar solicitudes', category: 'IA + AUTOMATIZACIÓN', input: 'Solicitud de un cliente', file: '«Necesito actualizar mi factura»', process: 'Clasificación de intención', output: 'Solicitud al equipo indicado', heading: 'Menos tareas. Más criterio.', description: 'Conectamos IA con tus sistemas para clasificar información, extraer datos y asistir procesos con reglas claras.', result: 'Clasificación de ejemplo: facturación → equipo de administración → pendiente de revisión.', note: 'Las reglas y aprobaciones se acuerdan antes de conectar el flujo a tu operación.' },
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
        <div className="ai-heading"><Label>03 / Machine learning & integración de IA</Label><svg className="ai-heading__symbol" viewBox="0 0 80 80" fill="none" aria-hidden="true"><path d="M40 5V75M5 40H75M15 15L65 65M15 65L65 15" stroke="currentColor" strokeWidth="3" /></svg></div>
        <div className="ai-layout">
          <div className="ai-copy"><h2 id="ai-title"><MaskLines lines={['El siguiente paso', 'de tu sistema:', <span key="intelligence">inteligencia.</span>]} /></h2><Reveal><p>Modelos que encuentran patrones. Asistentes que consultan tu información. IA integrada a las herramientas que tu equipo ya utiliza.</p></Reveal><div className="ai-cases" role="group" aria-label="Casos de uso de inteligencia artificial">{CASES.map((item, index) => <button key={item.title} type="button" aria-pressed={selected === index} onClick={() => { setSelected(index); setStep(-1); }}><span>0{index + 1}</span>{item.title}<ArrowUpRight size={17} aria-hidden="true" /></button>)}</div></div>
          <Reveal className="ai-lab">
            <div className="ai-lab__top"><span><i aria-hidden="true" />LAB / EXPLORACIÓN INTERACTIVA</span><span>DEMO</span></div>
            <div className="ai-lab__body"><span className="ai-lab__category">{example.category}</span><h3>{example.heading}</h3><p className="ai-lab__description">{example.description}</p>
              <IntelligenceAtlas selected={selected} step={step} />
              <div className="ai-pipeline" aria-label="Etapas del ejemplo">{[Database, BrainCircuit, Workflow].map((Icon, index) => <div key={index} className={`ai-pipeline__step ${step >= index ? 'is-active' : ''}`}><span className="ai-pipeline__icon">{step > index ? <Check size={23} aria-hidden="true" /> : <Icon size={23} strokeWidth={1.5} aria-hidden="true" />}</span><span>{[example.input, example.process, example.output][index]}</span>{index < 2 && <ArrowRight className="ai-pipeline__arrow" size={17} aria-hidden="true" />}</div>)}</div>
              <div className="ai-lab__input"><FileText size={15} aria-hidden="true" /><span>{example.file}</span><small>EJEMPLO</small></div>
              <div className="ai-lab__result" role="status" aria-live="polite"><span>{step === 3 ? 'RESULTADO ILUSTRATIVO' : running ? 'RECORRIENDO EL EJEMPLO…' : 'DE LOS DATOS A UNA ACCIÓN'}</span><p>{step === 3 ? example.result : 'Explorá cómo la información atraviesa cada etapa y se convierte en una salida útil.'}</p></div>
              <button type="button" className="ai-run" onClick={() => setStep(reduce ? 3 : 0)} disabled={running}>{step === 3 ? <RotateCcw size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}{running ? 'Ejecutando ejemplo…' : step === 3 ? 'Repetir ejemplo' : 'Ejecutar ejemplo'}<ArrowUpRight size={17} aria-hidden="true" /></button>
              <p className="ai-lab__note">Simulación visual con datos ficticios. {example.note}</p>
            </div>
          </Reveal>
        </div>
        <Reveal className="ai-bottom"><p>Primero, un problema concreto.<br /><strong>Después, la tecnología que lo resuelve.</strong></p><ContactCTA need={selected === 0 ? 'Machine learning' : 'Integración de IA'} source={`IA & ML · ${example.title}`} variant="paper">Exploremos mi caso de uso</ContactCTA></Reveal>
      </div>
    </section>
  );
};
export default Intelligence;
