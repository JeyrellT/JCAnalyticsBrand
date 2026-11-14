// ============================================================================
//  src/components/site/messages.js
//  CATÁLOGO ÚNICO DE MENSAJES YA ESCRITOS · lo que la persona envía por WhatsApp
//  (o lo que llega al portal desde el formulario corto de computadora).
//
//  Una sola regla para todos: saludo «Hola JC Analytics,» + intención en primera
//  persona + algo que le sirva al equipo para responder a la primera. Las
//  aperturas generales terminan en dos puntos para invitar a contar el caso; las
//  de paquete y proyecto ya traen el dato (nombre, precio, proyecto visto).
//
//  Antes había doce plantillas repartidas por los componentes, con tres saludos
//  distintos y una que escribía «estoy viendo El estudio y quiero cotizar»
//  (auditoría de la portada, noviembre de 2026).
// ============================================================================
import { t } from '../../i18n/locale';

export const MESSAGES = {
  /** Pedir cotización: hero, menú, flotante de celular y cualquier acceso general. */
  quote: t(
    'Hola JC Analytics, quiero cotizar un proyecto para mi negocio. Les cuento qué necesito:',
    'Hi JC Analytics, I would like a quote for a project for my business. Here is what I need:',
  ),
  /** La misma cotización cuando la persona ya armó «Tu caso en una frase» (ver case.js): el equipo recibe el
   *  giro y la necesidad sin preguntar. `pack`: el paquete publicado más cercano, como referencia. */
  caseQuote: (sentence, pack = null) => t(
    `Hola JC Analytics, ${sentence}.${pack ? ` Vi el paquete ${pack.name} (${pack.priceLabel} + IVA).` : ''} ¿Por dónde empezamos?`,
    `Hi JC Analytics, ${sentence}.${pack ? ` I saw the ${pack.name} package (${pack.priceLabel} + tax).` : ''} Where do we start?`,
  ),
  /** «No sé cuál me toca», en «Qué hacemos». */
  undecided: t(
    'Hola JC Analytics, no sé bien qué categoría me toca. Les cuento mi caso:',
    'Hi JC Analytics, I am not sure which category fits my case. Here it is:',
  ),
  /** Cierre de proyectos y flotante mientras se miran los proyectos. */
  projects: t(
    'Hola JC Analytics, vi sus proyectos y quiero algo parecido para mi negocio. Mi negocio es:',
    'Hi JC Analytics, I saw your projects and want something similar for my business. My business is:',
  ),
  /** «Quiero algo así» sobre un proyecto concreto. */
  project: (project) => t(
    `Hola JC Analytics, vi el proyecto ${project.name} (${project.sector}) y quiero algo así para mi negocio.`,
    `Hi JC Analytics, I saw the ${project.name} project (${project.sector}) and I want something like it for my business.`,
  ),
  /** Flotante mientras se miran los paquetes. */
  packages: t(
    'Hola JC Analytics, estoy viendo los paquetes con precio y tengo una consulta:',
    'Hi JC Analytics, I am looking at the priced packages and have a question:',
  ),
  /** «¿No ves tu caso?», al pie de los paquetes. */
  custom: t(
    'Hola JC Analytics, mi caso no está en los paquetes o no sé cuál me toca. Les cuento:',
    'Hi JC Analytics, my case is not in the packages or I am not sure which one fits. Here it is:',
  ),
  /** La primera conversación de 30 minutos, en «Compromisos». */
  firstCall: t(
    'Hola JC Analytics, quiero la primera conversación de 30 minutos sin costo. Me queda mejor (día y hora):',
    'Hi JC Analytics, I would like the free first 30-minute conversation. The best time for me (day and time):',
  ),
  /** «Hacer mi pregunta», en Preguntas frecuentes. */
  question: t(
    'Hola JC Analytics, tengo una pregunta antes de decidir:',
    'Hi JC Analytics, I have a question before deciding:',
  ),
  /** Enlace «WhatsApp» del pie: antes abría el chat vacío. */
  footer: t(
    'Hola JC Analytics, vengo de su página web y quiero hacer una consulta:',
    'Hi JC Analytics, I am coming from your website and have a question:',
  ),
};

/** Qué pasa después de escribir, en tres pasos con hechos ya publicados: los usan la hoja del paquete y las
 *  confirmaciones del formulario de contacto y del formulario corto. */
export const NEXT_STEPS = t(
  ['Te respondemos en menos de 24 h.', 'Conversamos 30 minutos, sin costo.', 'Recibís qué incluye y el precio fijo por escrito. Ahí decidís si empezamos.'],
  ['We reply within 24 hours.', 'We talk for 30 minutes, free of charge.', 'You get what is included and the fixed price in writing. Then you decide whether we start.'],
);
