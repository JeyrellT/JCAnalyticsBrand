// ============================================================================
//  shared/catalog.js
//  Vocabulario del portal: estados, tipos y servicios. El servidor valida
//  contra estas listas y la interfaz las usa para etiquetas y colores, así no
//  hay estados "huérfanos" entre ambos lados.
//  Los servicios replican el catálogo público (jcanalytics-app/src/data/cotizador.js).
// ============================================================================

export const ROLES = {
  admin: { label: 'Administrador', hint: 'Gestiona usuarios, configuración y respaldos.' },
  socio: { label: 'Socio', hint: 'Proyectos, agenda e inversiones.' },
  colaborador: { label: 'Colaborador', hint: 'Proyectos, tablero y agenda. Sin acceso a inversiones.' },
};

export const canInvest = (user) => user && (user.role === 'admin' || user.role === 'socio');

export const SERVICES = {
  software_medida: 'Software a la medida',
  pagina_web: 'Web y plataforma a medida',
  fiscal_planilla: 'Fiscal y planilla CR',
  power_bi: 'Dashboard Power BI',
  python_pipeline: 'Pipeline Python',
  alteryx_knime: 'Alteryx / KNIME',
  power_automate: 'Power Platform',
  excel_vba: 'Excel / VBA',
  doc_generation: 'Generación de documentos',
  analisis_tfg: 'Tesis y proyectos',
  community_manager: 'Community manager',
  video_edicion: 'Edición de video',
  producto_saas: 'Producto propio (SaaS)',
  otro: 'Otro',
};

/** Áreas de negocio para agrupar el catálogo de servicios. */
export const SERVICE_GROUPS = {
  sistemas: { label: 'Sistemas y web', tone: 'blue' },
  datos: { label: 'Datos y BI', tone: 'violet' },
  automatizacion: { label: 'Automatización', tone: 'teal' },
  finanzas: { label: 'Fiscal y finanzas', tone: 'amber' },
  marketing: { label: 'Marketing y contenido', tone: 'red' },
  academico: { label: 'Formación y tesis', tone: 'slate' },
  productos: { label: 'Productos propios', tone: 'ink' },
};

/**
 * Valores iniciales de cada línea de servicio (precios "desde" en US$ del
 * cotizador público, jcanalytics-app/src/data/cotizador.js). El admin puede
 * ajustarlos en el portal; estos solo siembran la tabla service_lines.
 */
export const SERVICE_DEFAULTS = {
  software_medida: { group: 'sistemas', price_from_usd: 2000, unit: null },
  pagina_web: { group: 'sistemas', price_from_usd: 900, unit: null },
  fiscal_planilla: { group: 'finanzas', price_from_usd: 150, unit: null },
  power_bi: { group: 'datos', price_from_usd: 125, unit: null },
  python_pipeline: { group: 'datos', price_from_usd: 1200, unit: null },
  alteryx_knime: { group: 'datos', price_from_usd: 65, unit: null },
  power_automate: { group: 'automatizacion', price_from_usd: 85, unit: null },
  excel_vba: { group: 'automatizacion', price_from_usd: 30, unit: null },
  doc_generation: { group: 'automatizacion', price_from_usd: 40, unit: null },
  analisis_tfg: { group: 'academico', price_from_usd: 50, unit: null },
  community_manager: { group: 'marketing', price_from_usd: 150, unit: 'mes' },
  video_edicion: { group: 'marketing', price_from_usd: 45, unit: 'pieza' },
  producto_saas: { group: 'productos', price_from_usd: null, unit: null },
  otro: { group: 'sistemas', price_from_usd: null, unit: null },
};

/** Rol de cada persona dentro de un proyecto. */
export const PROJECT_ROLES = {
  responsable: 'Responsable',
  desarrollo: 'Desarrollo',
  diseno: 'Diseño',
  datos: 'Datos y BI',
  contenido: 'Contenido y redes',
  comercial: 'Comercial',
  soporte: 'Soporte',
  equipo: 'Equipo',
};

export const CLIENT_STATUS = {
  prospecto: { label: 'Prospecto', tone: 'amber' },
  activo: { label: 'Activo', tone: 'teal' },
  inactivo: { label: 'Inactivo', tone: 'slate' },
};

export const PROJECT_KINDS = {
  cliente: { label: 'Cliente', hint: 'Lo construimos para un cliente.' },
  producto: { label: 'Producto propio', hint: 'BarberXCR, Taller Ticos, Glow Studio…' },
  interno: { label: 'Interno', hint: 'Marca, procesos y herramientas del equipo.' },
};

export const PROJECT_STATUS = {
  prospecto: { label: 'Prospecto', tone: 'slate' },
  en_curso: { label: 'En curso', tone: 'blue' },
  en_revision: { label: 'En revisión', tone: 'violet' },
  entregado: { label: 'Entregado', tone: 'teal' },
  soporte: { label: 'Soporte 30 días', tone: 'amber' },
  pausado: { label: 'Pausado', tone: 'slate' },
  cerrado: { label: 'Cerrado', tone: 'ink' },
};

/** Estados en los que corre el compromiso de "avance cada 72 h". */
export const SLA_STATUSES = ['en_curso', 'en_revision'];

export const UPDATE_CHANNELS = {
  whatsapp: 'WhatsApp',
  correo: 'Correo',
  reunion: 'Reunión',
  llamada: 'Llamada',
  otro: 'Otro',
};

export const TASK_STATUS = {
  backlog: { label: 'Backlog', tone: 'slate' },
  por_hacer: { label: 'Por hacer', tone: 'blue' },
  en_progreso: { label: 'En progreso', tone: 'amber' },
  revision: { label: 'Revisión', tone: 'violet' },
  hecho: { label: 'Hecho', tone: 'teal' },
};
export const TASK_STATUS_ORDER = ['backlog', 'por_hacer', 'en_progreso', 'revision', 'hecho'];

export const TASK_PRIORITY = {
  baja: { label: 'Baja', tone: 'slate', weight: 0 },
  media: { label: 'Media', tone: 'blue', weight: 1 },
  alta: { label: 'Alta', tone: 'amber', weight: 2 },
  urgente: { label: 'Urgente', tone: 'red', weight: 3 },
};

export const APPOINTMENT_KINDS = {
  alcance: { label: 'Sesión de alcance', tone: 'blue', hint: 'Primera sesión sin costo.' },
  demo: { label: 'Demo', tone: 'violet' },
  entrega: { label: 'Entrega', tone: 'teal' },
  seguimiento: { label: 'Seguimiento', tone: 'amber' },
  interna: { label: 'Reunión interna', tone: 'slate' },
  otro: { label: 'Otro', tone: 'slate' },
};

export const APPOINTMENT_STATUS = {
  programada: { label: 'Programada', tone: 'blue' },
  confirmada: { label: 'Confirmada', tone: 'teal' },
  realizada: { label: 'Realizada', tone: 'ink' },
  cancelada: { label: 'Cancelada', tone: 'red' },
  no_asistio: { label: 'No asistió', tone: 'amber' },
};

export const INVESTMENT_CATEGORIES = {
  producto_propio: 'Producto propio',
  proyecto_cliente: 'Proyecto de cliente',
  marketing: 'Marketing y pauta',
  equipo: 'Equipo y herramientas',
  operacion: 'Capital de trabajo',
  otro: 'Otro',
};

export const INVESTMENT_STATUS = {
  propuesta: { label: 'Propuesta', tone: 'slate' },
  activa: { label: 'Activa', tone: 'blue' },
  recuperada: { label: 'Recuperada', tone: 'teal' },
  cerrada: { label: 'Cerrada', tone: 'ink' },
  perdida: { label: 'Pérdida', tone: 'red' },
};

export const MOVEMENT_TYPE_LABEL = { aporte: 'Aporte', retorno: 'Retorno' };

export const MOVEMENT_STATUS_META = {
  pendiente: { label: 'Por confirmar', tone: 'amber' },
  confirmado: { label: 'Confirmado', tone: 'teal' },
  objetado: { label: 'Objetado', tone: 'red' },
  anulado: { label: 'Anulado', tone: 'slate' },
};

export const MEMBER_COLORS = ['#0065df', '#00a6b2', '#8b5cf6', '#ff5a00', '#c0764f', '#39b51c', '#e8b32c', '#e694ae'];
