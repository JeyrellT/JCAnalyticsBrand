import { t, locale } from '../i18n/locale';
import { servicePages } from '../content/services';
import { servicePath } from '../seo/routes';

const serviceHref = (id) => servicePath(servicePages.find((service) => service.id === id), locale);

// Original conceptual examples: no customer cases, screenshots or outcome claims.
export const SOLUTION_CONCEPTS = [
  {
    id: 'clear-experience',
    label: t('Experiencia web', 'Web experience'),
    name: t('Una web que orienta.', 'A website that guides.'),
    sector: t('Ejemplo conceptual / Experiencia', 'Concept example / Experience'),
    description: t('Imaginá una página que explique tu oferta, ayude a comparar opciones y muestre cómo dar el siguiente paso.', 'Imagine a page that explains your offer, helps people compare options and shows them how to take the next step.'),
    features: t(['Información organizada alrededor de una decisión', 'Una acción clara y una confirmación comprensible'], ['Information organized around a decision', 'A clear action and an understandable confirmation']),
    image: '/images/journal/systems.webp',
    imageAlt: t('Ilustración conceptual de elementos conectados para una experiencia digital.', 'Conceptual illustration of connected elements for a digital experience.'),
    href: serviceHref('web-development'),
    need: 'Sistema / backend',
    accent: '#9bd4b1',
  },
  {
    id: 'shared-view',
    label: t('Datos y decisiones', 'Data and decisions'),
    name: t('Una vista compartida.', 'One shared view.'),
    sector: t('Ejemplo conceptual / Datos', 'Concept example / Data'),
    description: t('Imaginá un dashboard donde cada indicador tenga contexto: qué significa, qué período muestra y qué pregunta ayuda a responder.', 'Imagine a dashboard where every indicator has context: what it means, which period it covers and which question it helps answer.'),
    features: t(['Definiciones visibles para interpretar los indicadores', 'Una vista enfocada en las preguntas del equipo'], ['Visible definitions for interpreting indicators', 'A view focused on the team’s questions']),
    image: '/images/journal/data.webp',
    imageAlt: t('Ilustración conceptual sobre organización y lectura de datos.', 'Conceptual illustration of organizing and interpreting data.'),
    href: serviceHref('business-intelligence'),
    need: 'Dashboard',
    accent: '#90c4dc',
  },
  {
    id: 'useful-assistance',
    label: t('IA con propósito', 'AI with purpose'),
    name: t('Una ayuda concreta.', 'Practical assistance.'),
    sector: t('Ejemplo conceptual / Inteligencia', 'Concept example / Intelligence'),
    description: t('Imaginá una herramienta que ayude a consultar información autorizada y preparar una respuesta que una persona pueda revisar.', 'Imagine a tool that helps find authorized information and prepare an answer for a person to review.'),
    features: t(['Un caso de uso y límites de acceso definidos', 'Resultados revisables y una salida cuando falta información'], ['A defined use case and access boundaries', 'Reviewable outputs and a clear response to missing information']),
    image: '/images/journal/intelligence.webp',
    imageAlt: t('Ilustración conceptual sobre información y asistencia con inteligencia artificial.', 'Conceptual illustration of information and AI assistance.'),
    href: serviceHref('ai-integration'),
    need: 'Integración de IA',
    accent: '#b9acd6',
  },
];
