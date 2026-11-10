// ============================================================================
//  src/components/site/CaseMatcher.jsx
//  «Tu caso en una frase» · la salida para quien no sabe qué categoría le toca.
//
//  La persona completa una oración con dos elecciones («Tengo un restaurante y
//  quiero recibir pedidos en línea») y la portada le contesta con tres cosas que
//  ya existen: la categoría que le corresponde, un proyecto real de su mismo giro
//  y el paquete con precio publicado más cercano. El mensaje de contacto sale con
//  su propia frase, así el equipo recibe el giro y la necesidad sin preguntar.
//
//  Nada es inventado: los giros son los de los diez proyectos de data/projects.js
//  y cada meta lleva a una de las cinco categorías. Funciona con dos <select>
//  nativos (teclado, lector de pantalla y selector del teléfono sin código
//  propio); sin JavaScript queda el enlace «Contanos tu caso» de la sección.
//  A las plataformas de anuncios solo les llega el clic de contacto habitual.
// ============================================================================
import { useId, useState } from 'react';
import { ArrowDown, ArrowRight, MessageCircle } from 'lucide-react';
import { t } from '../../i18n/locale';
import { CATEGORY_LINKS, wa } from './links';
import { PACKAGES } from '../../data/packages';
import { PROJECTS, screenImage, shotSrcSet } from '../../data/projects';
import { useDesktop } from '../../hooks/useDesktop';

// Giro → proyecto real de ese giro (pantalla que se muestra como prueba).
const BUSINESSES = [
  { id: 'restaurante', label: t('un restaurante o soda', 'a restaurant or café'), project: 'laburrada', screen: 'home' },
  { id: 'barberia', label: t('una barbería o salón', 'a barbershop or salon'), project: 'barberxcr', screen: 'dashboard' },
  { id: 'taller', label: t('un taller', 'a repair or body shop'), project: 'maison', screen: 'operacion' },
  { id: 'transporte', label: t('una empresa de transporte', 'a transport company'), project: 'transportesluna', screen: 'admin' },
  { id: 'distribuidora', label: t('una distribuidora', 'a distribution business'), project: 'silglobal', screen: 'catalogo' },
  { id: 'tienda', label: t('una tienda o comercio', 'a shop or store'), project: 'multiagencia', screen: 'tienda' },
  { id: 'servicios', label: t('una empresa de servicios', 'a services company'), project: 'crimson', screen: 'inicio' },
  { id: 'otro', label: t('otro tipo de negocio', 'another kind of business'), project: null },
];
// Meta → categoría, necesidad con la que la consulta llega al portal y paquete publicado más cercano.
const GOALS = [
  { id: 'vender', label: t('recibir pedidos o reservas en línea', 'take orders or bookings online'), category: 'web-development', need: 'Página web', pkg: 'pagina_web' },
  { id: 'ordenar', label: t('ordenar mi operación en un sistema', 'run my operation in one system'), category: 'web-development', need: 'Sistema / backend', pkg: 'software_medida' },
  { id: 'automatizar', label: t('dejar de repetir tareas a mano', 'stop repeating tasks by hand'), category: 'process-automation', need: 'Automatización', pkg: 'power_automate' },
  { id: 'numeros', label: t('ver mis números al día', 'see my numbers up to date'), category: 'business-intelligence', need: 'Dashboard', pkg: 'dashboard_inicial' },
  { id: 'ia', label: t('usar IA en una tarea concreta', 'use AI on one specific task'), category: 'ai-integration', need: 'Integración de IA', pkg: 'asistente_ia_documental' },
  { id: 'clientes', label: t('que más gente conozca mi negocio', 'get more people to know my business'), category: 'digital-marketing', need: 'Marketing digital', pkg: null },
];

const showProject = (id, screen) => window.dispatchEvent(new CustomEvent('jca:show-project', { detail: { id, screen } }));

export default function CaseMatcher({ onMatch }) {
  const desktop = useDesktop();
  const id = useId();
  const [business, setBusiness] = useState('');
  const [goal, setGoal] = useState('');
  const chosenBusiness = BUSINESSES.find((item) => item.id === business);
  const chosenGoal = GOALS.find((item) => item.id === goal);
  const category = chosenGoal ? CATEGORY_LINKS.find((item) => item.id === chosenGoal.category) : null;
  const project = chosenBusiness?.project ? PROJECTS.find((item) => item.id === chosenBusiness.project) : null;
  const pack = chosenGoal?.pkg ? PACKAGES.find((item) => item.key === chosenGoal.pkg) : null;
  const choose = (setter, kind) => (event) => {
    setter(event.target.value);
    if (kind === 'goal') onMatch?.(GOALS.find((item) => item.id === event.target.value)?.category ?? null);
  };
  const sentence = chosenGoal
    ? t(`tengo ${chosenBusiness?.label ?? 'un negocio'} y quiero ${chosenGoal.label}`, `I have ${chosenBusiness?.label ?? 'a business'} and I want to ${chosenGoal.label}`)
    : '';
  const message = t(`Hola JC Analytics, ${sentence}. ¿Por dónde empezamos?`, `Hi JC Analytics, ${sentence}. Where do we start?`);
  return (
    <div className="case-matcher">
      <p className="case-matcher__lead">{t('¿No sabés cuál te toca? Armá tu caso en una frase:', 'Not sure which one fits? Put your case in one sentence:')}</p>
      <p className="case-matcher__sentence">
        <label htmlFor={`${id}-negocio`}>{t('Tengo', 'I have')}</label>{' '}
        <select id={`${id}-negocio`} value={business} onChange={choose(setBusiness, 'business')} data-track-label="Caso · negocio">
          <option value="">{t('elegí tu negocio', 'pick your business')}</option>
          {BUSINESSES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>{' '}
        <label htmlFor={`${id}-meta`}>{t('y quiero', 'and I want to')}</label>{' '}
        <select id={`${id}-meta`} value={goal} onChange={choose(setGoal, 'goal')} data-track-label="Caso · meta">
          <option value="">{t('elegí qué resolver', 'pick what to solve')}</option>
          {GOALS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>.
      </p>
      <div className="case-matcher__result" role="status" aria-live="polite">
        {category && (
          <div className="case-matcher__answer">
            <div className="case-matcher__text">
              <p className="case-matcher__verdict">{t('Tu caso es de', 'Your case belongs to')} <strong>{category.label}</strong>.{pack && <> {t('El paquete publicado más cercano es', 'The closest published package is')} <a href={`#paquete-${pack.key}`} data-track-label={`Caso · Paquete ${pack.name}`}>{pack.name}</a>.</>}</p>
              {project && <p className="case-matcher__proof">{t('Un proyecto real de tu giro:', 'A real project in your line of business:')} <strong>{project.name}</strong> <span>({project.sector})</span>.</p>}
              <div className="case-matcher__actions">
                <a className="case-matcher__go" href={category.href} data-track-label={`Caso · Ver ${category.label}`}>{t('Ver ejemplos, alcance y precio', 'See examples, scope and price')} <ArrowRight size={16} aria-hidden="true" /></a>
                <a className="case-matcher__wa" href={wa(message)} target="_blank" rel="noreferrer" data-need={chosenGoal.need} data-track-label="Caso · Cotizar con mi frase"><MessageCircle size={16} aria-hidden="true" />{desktop ? t('Cotizar con mi frase', 'Get a quote with my sentence') : t('Cotizar por WhatsApp', 'Get a quote on WhatsApp')}</a>
                {project && <a className="case-matcher__link" href="#proyecto" onClick={() => showProject(project.id, chosenBusiness.screen)} data-track-label={`Caso · Proyecto ${project.name}`}>{t('Ver sus pantallas', 'See its screens')} <ArrowDown size={15} aria-hidden="true" /></a>}
              </div>
            </div>
            {project && (
              <a className="case-matcher__shot" href="#proyecto" onClick={() => showProject(project.id, chosenBusiness.screen)} style={{ '--project-color': project.accent }} tabIndex={-1} aria-hidden="true">
                <img src={screenImage(project, chosenBusiness.screen, 'desktop')} srcSet={shotSrcSet(screenImage(project, chosenBusiness.screen, 'desktop'))} sizes="280px" width={1600} height={1000} loading="lazy" decoding="async" alt="" />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
