// ============================================================================
//  src/components/site/case.js
//  «TU CASO EN UNA FRASE», guardado para el resto de la visita.
//
//  CaseMatcher arma la frase («tengo un restaurante y quiero recibir pedidos en
//  línea»). Antes esa frase solo servía en su propio botón: si la persona pedía
//  después un paquete o tocaba «Cotizar», el equipo recibía el pedido sin saber
//  para qué negocio era y su primera respuesta era otra pregunta (segunda ronda
//  de la auditoría, noviembre de 2026).
//
//  Ahora la elección queda en sessionStorage y la usan:
//    · los mensajes ya escritos de paquetes y de «Cotizar» (salen con la frase);
//    · la tarjeta del paquete más cercano (insignia «El de tu caso»);
//    · el explorador de proyectos (abre en el proyecto de ese giro);
//    · el detalle del paquete (ofrece el proyecto real de ese giro).
//
//  Solo vive en el navegador de la persona. A las plataformas de anuncios no les
//  llega nada: la frase viaja únicamente dentro del mensaje que ella decide enviar.
//  Nada es inventado: los giros son los de los proyectos de data/projects.js y
//  cada meta lleva a una de las cinco categorías y a un paquete del tarifario.
// ============================================================================
import { useSyncExternalStore } from 'react';
import { t } from '../../i18n/locale';
import { CATEGORY_LINKS } from './links';
import { PACKAGES } from '../../data/packages';
import { PROJECTS } from '../../data/projects';

// Giro → proyecto real de ese giro (pantalla que se muestra como prueba).
export const BUSINESSES = [
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
export const GOALS = [
  { id: 'vender', label: t('recibir pedidos o reservas en línea', 'take orders or bookings online'), category: 'web-development', need: 'Página web', pkg: 'pagina_web' },
  { id: 'ordenar', label: t('ordenar mi operación en un sistema', 'run my operation in one system'), category: 'web-development', need: 'Sistema / backend', pkg: 'software_medida' },
  { id: 'automatizar', label: t('dejar de repetir tareas a mano', 'stop repeating tasks by hand'), category: 'process-automation', need: 'Automatización', pkg: 'power_automate' },
  { id: 'numeros', label: t('ver mis números al día', 'see my numbers up to date'), category: 'business-intelligence', need: 'Dashboard', pkg: 'dashboard_inicial' },
  { id: 'ia', label: t('usar IA en una tarea concreta', 'use AI on one specific task'), category: 'ai-integration', need: 'Integración de IA', pkg: 'asistente_ia_documental' },
  { id: 'clientes', label: t('que más gente conozca mi negocio', 'get more people to know my business'), category: 'digital-marketing', need: 'Marketing digital', pkg: null },
];

const EMPTY = Object.freeze({ business: '', goal: '', chosenBusiness: null, chosenGoal: null, category: null, project: null, pack: null, sentence: '', packSentence: '' });

/** De las dos elecciones a todo lo que la portada puede decir con ellas. Sin meta no hay frase ni paquete. */
function resolve({ business = '', goal = '' } = {}) {
  const chosenBusiness = BUSINESSES.find((item) => item.id === business) ?? null;
  const chosenGoal = GOALS.find((item) => item.id === goal) ?? null;
  if (!chosenBusiness && !chosenGoal) return EMPTY;
  const sentence = chosenGoal
    ? t(`tengo ${chosenBusiness?.label ?? 'un negocio'} y quiero ${chosenGoal.label}`, `I have ${chosenBusiness?.label ?? 'a business'} and I want to ${chosenGoal.label}`)
    : '';
  return {
    business: chosenBusiness?.id ?? '',
    goal: chosenGoal?.id ?? '',
    chosenBusiness,
    chosenGoal,
    category: chosenGoal ? CATEGORY_LINKS.find((item) => item.id === chosenGoal.category) ?? null : null,
    project: chosenBusiness?.project ? PROJECTS.find((item) => item.id === chosenBusiness.project) ?? null : null,
    pack: chosenGoal?.pkg ? PACKAGES.find((item) => item.key === chosenGoal.pkg) ?? null : null,
    // Para «Cotizar»: vale con solo la meta («tengo un negocio y quiero…»).
    sentence,
    // Para los pedidos de paquete: solo cuando dice el giro. Con «otro tipo de negocio» o sin giro elegido el
    // pedido conserva su línea abierta «Mi negocio:» y el formulario corto, su campo: «tengo un negocio» no le
    // dice al equipo para qué negocio es, y la meta ya la dice el paquete pedido.
    packSentence: chosenBusiness?.project ? sentence : '',
  };
}

const KEY = 'jc_case';
const load = () => {
  // El prerender y las pruebas (navegador automatizado) arrancan sin caso: el HTML estático no cambia.
  try { return resolve(JSON.parse(window.sessionStorage.getItem(KEY) || 'null') ?? {}); } catch { return EMPTY; }
};
let current = typeof window === 'undefined' ? EMPTY : load();
const listeners = new Set();
const subscribe = (listener) => { listeners.add(listener); return () => listeners.delete(listener); };

/** El caso de esta visita (objeto estable hasta que cambie). */
export const getCase = () => current;
/** Cambia una o las dos elecciones: `setCase({ business })`, `setCase({ goal })`. */
export function setCase(next) {
  current = resolve({ business: current.business, goal: current.goal, ...next });
  try {
    if (current === EMPTY) window.sessionStorage.removeItem(KEY);
    else window.sessionStorage.setItem(KEY, JSON.stringify({ business: current.business, goal: current.goal }));
  } catch { /* sin almacenamiento: el caso vale mientras dure esta página */ }
  listeners.forEach((listener) => listener());
}
/** El caso, para componentes: vuelve a pintar cuando la persona cambia su frase. */
export const useCase = () => useSyncExternalStore(subscribe, getCase, () => EMPTY);
