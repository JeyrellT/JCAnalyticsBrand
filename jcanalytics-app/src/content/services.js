import { SERVICE_PRICING } from '../../../portal/shared/service-pricing.js';
import { SERVICES } from '../data/cotizador.js';
export const servicePages = [
  {
    id: 'web-development', topic: 'experience', image: '/projects/laburrada/home-desktop.webp', need: 'Sistema / backend',
    en: {
      slug: 'web-development-costa-rica', title: 'Web development in Costa Rica, built around your business.',
      summary: 'Custom websites and business software that connect a clear customer experience with the work behind it.',
      takeaway: 'Start with the action your customer needs to complete. Define the system around that action.',
      sections: [
        { id: 'fit', heading: 'When a custom website makes sense', paragraphs: ['A website can explain your offer, help someone choose a service and create a clear path to contact. When bookings, orders or internal follow-up are part of that experience, the public page and the business process should be considered together.', 'We help teams in Costa Rica scope websites, interfaces and custom software. The starting point is your current workflow, the people using it and the decisions the system needs to support.'] },
        { id: 'scope', heading: 'What we can define together', paragraphs: ['Every proposal starts with an agreed scope. A project may include some of the following, depending on its needs:'], bullets: ['Content structure, mobile experience and accessible forms.', 'A custom visual direction and bilingual content when needed.', 'A backend, roles and management screens for your workflow.', 'Connections to existing systems and a clear handover.'] },
        { id: 'prepare', heading: 'What to bring to the first conversation', paragraphs: ['Bring your main business goal, the action a visitor should take and the tools your team already uses. A rough sketch or a description of a repetitive problem is enough to start.', `The website with bookings package costs US$${SERVICE_PRICING.pagina_web.base_usd} for up to 5 sections, 10 services and 1 calendar. The defined AI advisor option totals US$${SERVICE_PRICING.pagina_web.with_ai_usd}. Client supplies content. Taxes, domain, hosting, usage, support and scope extensions are separate.`] },
      ],
      discussion: ['Which customer action is hardest on your current website?', 'What happens inside your business after that action?', 'What would a useful first release include?'], sources: [],
    },
    es: {
      slug: 'desarrollo-web-costa-rica', title: 'Desarrollo web en Costa Rica, pensado para tu negocio.',
      summary: 'Páginas web y software a medida que conectan una experiencia clara para tus clientes con el trabajo que ocurre detrás.',
      takeaway: 'Empezá por la acción que tu cliente necesita completar. Definí el sistema alrededor de esa acción.',
      sections: [
        { id: 'fit', heading: 'Cuándo tiene sentido una web a medida', paragraphs: ['Una web puede explicar tu oferta, ayudar a elegir un servicio y ofrecer un camino claro para contactar. Cuando esa experiencia incluye reservas, pedidos o seguimiento interno, conviene pensar juntos la página pública y el proceso del negocio.', 'Ayudamos a equipos en Costa Rica a definir páginas web, interfaces y software a medida. El punto de partida es tu operación actual, las personas que la usan y las decisiones que el sistema necesita apoyar.'] },
        { id: 'scope', heading: 'Qué podemos definir juntos', paragraphs: ['Cada propuesta parte de un alcance acordado. Según la necesidad, un proyecto puede incluir:'], bullets: ['Estructura del contenido, experiencia móvil y formularios accesibles.', 'Dirección visual propia y contenido bilingüe cuando se necesita.', 'Backend, roles y pantallas de gestión para tu operación.', 'Conexiones a sistemas existentes y una entrega documentada.'] },
        { id: 'prepare', heading: 'Qué traer a la primera conversación', paragraphs: ['Traé tu objetivo principal, la acción que debería completar una visita y las herramientas que usa tu equipo. Un esquema o la descripción de un problema repetitivo alcanza para empezar.', `La web con reservas cuesta US$${SERVICE_PRICING.pagina_web.base_usd} para hasta 5 secciones, 10 servicios y 1 agenda. La opción con el asesor IA descrito cuesta US$${SERVICE_PRICING.pagina_web.with_ai_usd} en total. El comprador entrega el contenido. Impuestos, dominio, hosting, consumos, soporte y ampliaciones se cotizan aparte.`] },
      ],
      discussion: ['¿Qué acción resulta más difícil en tu web actual?', '¿Qué pasa dentro del negocio después de esa acción?', '¿Qué debería incluir una primera versión útil?'], sources: [],
    },
  },
  {
    id: 'business-intelligence', topic: 'data', image: '/projects/laburrada/analitica-desktop.webp', need: 'Dashboard',
    en: {
      slug: 'power-bi-dashboards-costa-rica', title: 'Power BI dashboards for decisions that cannot wait.',
      summary: 'Turn scattered business information into a shared view of performance, with clear definitions and ownership.',
      takeaway: 'A useful dashboard starts with a decision, a reliable source and someone responsible for acting.',
      sections: [
        { id: 'fit', heading: 'From recurring reports to a shared view', paragraphs: ['When every meeting begins with reconciling spreadsheets, a dashboard can help create a consistent view. The first job is understanding where the data comes from, what each measure means and what people do with the result.', 'We work on Power BI dashboards, financial analysis and business reporting. Together, we define the audience, business questions and available sources before selecting charts.'] },
        { id: 'scope', heading: 'What a dashboard project can include', paragraphs: ['The final scope depends on access to data and the way your team works. Common areas are:'], bullets: ['Review of data sources, definitions and refresh needs.', 'A model and measures built around agreed business questions.', 'Clear views for the people who need to make decisions.', 'Permissions, validation and documentation within the agreed scope.'] },
        { id: 'prepare', heading: 'Start with one recurring decision', paragraphs: ['Choose a meeting or decision that repeatedly requires manual preparation. Bring sample field names, an explanation of your sources and the questions you cannot answer easily. Avoid sharing personal or confidential data in the initial inquiry.', 'A small, well-defined first version helps the team evaluate usefulness before adding more views. Cost and delivery depend on the sources, complexity and agreed scope; the package published on this page is the starting point.'] },
      ],
      discussion: ['What decision should this dashboard improve?', 'Which number does your team interpret differently today?', 'Who acts when an indicator changes?'], sources: [],
    },
    es: {
      slug: 'dashboards-power-bi-costa-rica', title: 'Dashboards Power BI para decisiones que no pueden esperar.',
      summary: 'Convertí información dispersa en una visión compartida del negocio, con definiciones claras y responsables.',
      takeaway: 'Un dashboard útil empieza por una decisión, una fuente confiable y alguien responsable de actuar.',
      sections: [
        { id: 'fit', heading: 'Del reporte repetitivo a una visión compartida', paragraphs: ['Cuando cada reunión empieza conciliando hojas de cálculo, un dashboard puede ayudar a construir una visión consistente. Primero hay que entender de dónde vienen los datos, qué significa cada medida y qué hacen las personas con el resultado.', 'Trabajamos en dashboards Power BI, análisis financiero y reportes de negocio. Juntos definimos audiencia, preguntas y fuentes disponibles antes de elegir gráficos.'] },
        { id: 'scope', heading: 'Qué puede incluir un proyecto de dashboards', paragraphs: ['El alcance depende del acceso a los datos y de la forma de trabajo del equipo. Algunas áreas habituales son:'], bullets: ['Revisión de fuentes, definiciones y necesidades de actualización.', 'Modelo y medidas alrededor de preguntas de negocio acordadas.', 'Vistas claras para quienes necesitan tomar decisiones.', 'Permisos, validación y documentación dentro del alcance definido.'] },
        { id: 'prepare', heading: 'Empezá con una decisión recurrente', paragraphs: ['Elegí una reunión o decisión que requiera preparación manual cada vez. Traé nombres de campos de ejemplo, una explicación de tus fuentes y las preguntas que cuesta responder. Evitá compartir datos personales o confidenciales en la consulta inicial.', 'Una primera versión pequeña y bien definida permite evaluar su utilidad antes de sumar vistas. Costo y entrega dependen de fuentes, complejidad y alcance; el paquete publicado en esta página es el punto de partida.'] },
      ],
      discussion: ['¿Qué decisión debería mejorar este dashboard?', '¿Qué número interpreta distinto cada persona hoy?', '¿Quién actúa cuando cambia un indicador?'], sources: [],
    },
  },
  {
    id: 'process-automation', topic: 'operations', image: '/projects/multiagencia/venta-desktop.webp', need: 'Automatización',
    en: {
      slug: 'business-process-automation', title: 'Automation that gives repetitive work a clear path.',
      summary: 'Connect routine tasks, handoffs and business tools with automation scoped to the way your team operates.',
      takeaway: 'Automate a process you understand, and agree on what happens when an exception appears.',
      sections: [
        { id: 'fit', heading: 'Find the repetition worth addressing', paragraphs: ['Copying the same information, preparing the same report or chasing the same approval can consume attention every week. Automation starts by observing the task and separating predictable steps from situations that need judgment.', 'We help define and implement workflows using tools such as Excel, Python and Power Platform. The choice of tool follows the process, access requirements and agreed scope.'] },
        { id: 'scope', heading: 'What we consider before implementation', paragraphs: ['A useful conversation covers the whole workflow, including the people involved:'], bullets: ['The event that starts the task and the expected result.', 'Inputs, permissions and tools already in use.', 'Exceptions that should return to a person for review.', 'A way to check the outcome and maintain the workflow.'] },
        { id: 'prepare', heading: 'Choose a contained first step', paragraphs: ['Bring one recurring task and describe what happens from beginning to end. An example using invented data is enough for the initial discussion. Include the unusual cases that currently cause delays.', 'The first deliverable should have clear boundaries. We agree on scope, validation and responsibilities before extending it to more processes. The package published on this page is the starting point; integrations and complexity determine the proposal.'] },
      ],
      discussion: ['What repeats often enough to be worth changing?', 'Which exceptions require human judgment?', 'Who will own the workflow after launch?'], sources: [],
    },
    es: {
      slug: 'automatizacion-de-procesos', title: 'Automatización que le da un camino claro al trabajo repetitivo.',
      summary: 'Conectá tareas rutinarias, entregas y herramientas con automatizaciones definidas alrededor de tu operación.',
      takeaway: 'Automatizá un proceso que entendés y acordá qué sucede cuando aparece una excepción.',
      sections: [
        { id: 'fit', heading: 'Encontrá la repetición que vale la pena resolver', paragraphs: ['Copiar la misma información, preparar el mismo reporte o perseguir la misma aprobación puede consumir atención cada semana. Automatizar empieza por observar la tarea y separar pasos predecibles de situaciones que requieren criterio.', 'Ayudamos a definir e implementar flujos con herramientas como Excel, Python y Power Platform. La herramienta se elige según el proceso, los accesos y el alcance acordado.'] },
        { id: 'scope', heading: 'Qué consideramos antes de implementar', paragraphs: ['Una conversación útil recorre todo el flujo e incluye a las personas involucradas:'], bullets: ['El evento que inicia la tarea y el resultado esperado.', 'Entradas, permisos y herramientas que ya se utilizan.', 'Excepciones que deben volver a una persona para revisión.', 'Una forma de comprobar el resultado y mantener el flujo.'] },
        { id: 'prepare', heading: 'Elegí un primer paso acotado', paragraphs: ['Traé una tarea recurrente y contanos qué sucede de principio a fin. Un ejemplo con datos inventados alcanza para la conversación inicial. Incluí los casos inusuales que hoy generan atrasos.', 'La primera entrega debe tener límites claros. Acordamos alcance, validación y responsabilidades antes de extenderla a más procesos. El paquete publicado en esta página es el punto de partida; las integraciones y la complejidad determinan la propuesta.'] },
      ],
      discussion: ['¿Qué se repite lo suficiente como para cambiarlo?', '¿Qué excepciones requieren criterio humano?', '¿Quién se hará cargo del flujo después del lanzamiento?'], sources: [],
    },
  },
  {
    id: 'ai-integration', topic: 'intelligence', image: '/projects/crimson/inicio-desktop.webp', need: 'Integración de IA',
    en: {
      slug: 'ai-integration-costa-rica', title: 'AI integration with a practical purpose.',
      summary: 'Explore document assistants, information classification and decision support with clear boundaries and human review.',
      takeaway: 'A strong AI project starts with a useful task and an explicit definition of an acceptable result.',
      sections: [
        { id: 'fit', heading: 'Start with the task, not the model', paragraphs: ['Your team may need to find information in documents, organize incoming material or prepare a first draft for review. These are different tasks, with different data needs and consequences when an answer is wrong.', 'We assess AI integrations and machine learning use cases around a specific business need. Feasibility depends on the information available, permissions, existing tools and validation requirements.'] },
        { id: 'scope', heading: 'Questions that shape the scope', paragraphs: ['Before deciding what to build, we clarify:'], bullets: ['What the assistant may read and what it must not access.', 'Which outputs are suggestions and who reviews them.', 'How useful and incorrect answers will be evaluated.', 'What happens when information is missing or ambiguous.'] },
        { id: 'prepare', heading: 'Bring a question your team asks often', paragraphs: ['Describe the task, where the information lives and who uses the result. Use a fictional example for the first conversation instead of uploading private documents. We can then agree on how to assess the case safely.', 'An initial evaluation may reveal that a simpler workflow is enough. If AI is appropriate, the proposal defines scope, integration, review and delivery; we do not promise accuracy or savings before evaluating the use case.'] },
      ],
      discussion: ['What useful task would AI support?', 'What would count as an unacceptable answer?', 'Who can stop, correct or review the result?'], sources: [],
    },
    es: {
      slug: 'integracion-ia-costa-rica', title: 'Integración de IA con un propósito concreto.',
      summary: 'Explorá asistentes sobre documentos, clasificación de información y apoyo a decisiones con límites claros y revisión humana.',
      takeaway: 'Un buen proyecto de IA empieza por una tarea útil y una definición explícita de un resultado aceptable.',
      sections: [
        { id: 'fit', heading: 'Empezá por la tarea, antes de elegir el modelo', paragraphs: ['Tu equipo puede necesitar encontrar información en documentos, organizar material entrante o preparar un borrador para revisión. Son tareas distintas, con necesidades de datos y consecuencias diferentes cuando una respuesta es incorrecta.', 'Evaluamos integraciones de IA y casos de machine learning alrededor de una necesidad concreta. La viabilidad depende de la información, los permisos, las herramientas existentes y los requisitos de validación.'] },
        { id: 'scope', heading: 'Preguntas que definen el alcance', paragraphs: ['Antes de decidir qué construir, aclaramos:'], bullets: ['Qué puede leer el asistente y a qué no debe acceder.', 'Qué resultados son sugerencias y quién los revisa.', 'Cómo se evaluarán las respuestas útiles y las incorrectas.', 'Qué ocurre cuando falta información o hay ambigüedad.'] },
        { id: 'prepare', heading: 'Traé una pregunta frecuente de tu equipo', paragraphs: ['Describí la tarea, dónde vive la información y quién usa el resultado. Utilizá un ejemplo ficticio en la primera conversación en lugar de cargar documentos privados. Después acordamos cómo evaluar el caso.', 'La evaluación inicial puede mostrar que alcanza con un flujo más simple. Cuando la IA resulta adecuada, la propuesta define alcance, integración, revisión y entrega; no prometemos precisión ni ahorros antes de evaluar el caso.'] },
      ],
      discussion: ['¿Qué tarea útil apoyaría la IA?', '¿Qué sería una respuesta inaceptable?', '¿Quién puede detener, corregir o revisar el resultado?'], sources: [],
    },
  },
  // Marketing digital: landing propio acordado en la reunión del 31 de octubre de 2026. Habla a comercios y
  // emprendimientos con lenguaje simple; el sitio principal conserva el tono para clientes corporativos.
  // Sin oferta en SERVICE_OFFERS: la página muestra el contenido editorial y la demo con piezas reales.
  {
    id: 'digital-marketing', topic: 'marketing', image: '/marketing/luna-post-029.webp', need: 'Marketing digital',
    en: {
      slug: 'digital-marketing-costa-rica', title: 'Digital marketing for businesses that are growing.',
      summary: 'Social media, content, short videos and Meta Ads, handled by a real person who learns your brand’s voice.',
      takeaway: 'Start with what your business already does well. Then make sure people see it, consistently.',
      sections: [
        { id: 'fit', heading: 'When it makes sense to hire marketing', paragraphs: ['If you already take good care of your customers but nobody is telling that story, or you post only when you find time and without a plan, this service is for you. It is designed for shops, restaurants, transport companies, workshops and people starting a business.', 'We publish for you, reply to messages in your brand’s voice and run campaigns on Meta (Facebook and Instagram) with weekly monitoring.'] },
        { id: 'scope', heading: 'What we can do together', paragraphs: ['Each monthly plan is defined with you. It can include:'], bullets: ['A monthly content calendar with designs that use your brand.', 'Photos and short videos recorded at your business, without stock images.', 'Publishing and replies to messages and comments.', 'Meta Ads campaigns with weekly monitoring.', 'A monthly report that shows what worked and what did not.'] },
        { id: 'prepare', heading: 'What to bring to the first conversation', paragraphs: ['Bring the name of your social accounts, what you sell and to whom, a few recent photos and the budget you can put into ads. If you have never run a campaign, we talk it through in that first call.', `The community manager plan starts at US$${SERVICES.community_manager.priceMin} per month and video editing at US$${SERVICES.video_edicion.priceMin} per video. The Meta Ads budget is agreed separately.`] },
      ],
      discussion: ['Which of your products or services do customers praise most?', 'Who answers messages today, and how long does it take?', 'What would you like a new customer to see first on your profile?'], sources: [],
    },
    es: {
      slug: 'marketing-digital-costa-rica', title: 'Marketing digital para negocios que están creciendo.',
      summary: 'Redes sociales, contenido, videos cortos y Meta Ads, llevados por una persona real que aprende la voz de tu marca.',
      takeaway: 'Empezá por lo que tu negocio ya hace bien. Después, hacé que la gente lo vea, con constancia.',
      sections: [
        { id: 'fit', heading: 'Cuándo tiene sentido contratar marketing', paragraphs: ['Si ya atendés bien a tus clientes pero nadie lo está contando, o publicás cuando podés y sin un plan, este servicio es para vos. Está pensado para comercios, restaurantes, transportistas, talleres y personas que están arrancando un negocio.', 'Publicamos por vos, respondemos mensajes con el tono de tu marca y llevamos campañas en Meta (Facebook e Instagram) con seguimiento semanal.'] },
        { id: 'scope', heading: 'Qué podemos hacer juntos', paragraphs: ['Cada plan mensual se define con vos. Puede incluir:'], bullets: ['Calendario mensual de contenido con diseños que usan tu marca.', 'Fotos y videos cortos grabados en tu negocio, sin banco de imágenes.', 'Publicación y respuesta a mensajes y comentarios.', 'Campañas en Meta Ads con seguimiento semanal.', 'Un reporte mensual con lo que funcionó y lo que no.'] },
        { id: 'prepare', heading: 'Qué traer a la primera conversación', paragraphs: ['Traé el nombre de tus redes, qué vendés y a quién, un par de fotos recientes y cuánto podés invertir en pauta. Si nunca hiciste una campaña, lo conversamos en esa primera llamada.', `El plan de community manager arranca en US$${SERVICES.community_manager.priceMin} al mes y la edición de video en US$${SERVICES.video_edicion.priceMin} por pieza. La inversión en pauta de Meta Ads se acuerda aparte.`] },
      ],
      discussion: ['¿Qué producto o servicio tuyo es el que más elogian tus clientes?', '¿Quién responde los mensajes hoy y cuánto tarda?', '¿Qué te gustaría que viera primero un cliente nuevo en tu perfil?'], sources: [],
    },
  },
];
