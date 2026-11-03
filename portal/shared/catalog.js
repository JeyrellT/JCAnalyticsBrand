// ============================================================================
//  shared/catalog.js
//  Vocabulario del portal: estados, tipos y servicios. El servidor valida
//  contra estas listas y la interfaz las usa para etiquetas y colores, así no
//  hay estados "huérfanos" entre ambos lados.
//  Los servicios replican el catálogo público (jcanalytics-app/src/data/cotizador.js).
// ============================================================================

import { SERVICE_PRICING } from './service-pricing.js';

export const ROLES = {
  admin: { label: 'Administrador', hint: 'Gestiona usuarios, accesos a inversiones, configuración y respaldos.' },
  socio: { label: 'Socio', hint: 'Proyectos, agenda y acceso a todas las inversiones.' },
  colaborador: { label: 'Colaborador', hint: 'Proyectos, tablero y agenda. Sin acceso a inversiones.' },
  inversionista: { label: 'Inversionista', hint: 'Su portal, su historial y las inversiones que le habilite el administrador. Sin acceso a la operación.' },
};

/** Socios y admin: ven y administran TODAS las inversiones del equipo. */
export const canInvest = (user) => !!user && (user.role === 'admin' || user.role === 'socio');
/** Inversionista (v6): entra solo a su portal (/inversionista) y ve solo lo suyo. */
export const isInvestorRole = (user) => !!user && user.role === 'inversionista';
/** Quién puede tener capital en una inversión (ser el "socio" de un movimiento). */
export const MONEY_HOLDER_ROLES = ['admin', 'socio', 'inversionista'];
/** Roles que trabajan en la operación (tareas, proyectos, agenda): todos menos el inversionista. */
export const TEAM_ROLES = ['admin', 'socio', 'colaborador'];

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
  ...Object.fromEntries(Object.entries(SERVICE_PRICING).map(([key, pricing]) => [key, pricing.label])),
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
  ...Object.fromEntries(Object.entries(SERVICE_PRICING).map(([key, pricing]) => [key, { group: pricing.group, price_from_usd: pricing.base_usd, unit: null }])),
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
  meta_ads: 'Meta Ads',
  google_ads: 'Google Ads',
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

export const RETURN_KIND_LABEL = { capital: 'Devolución de capital', profit: 'Ganancia', mixed: 'Capital y ganancia', unclassified: 'Retorno sin clasificar' };

export const MOVEMENT_STATUS_META = {
  pendiente: { label: 'Por aprobar', tone: 'amber' },
  confirmado: { label: 'Aprobado', tone: 'teal' },
  objetado: { label: 'Rechazado', tone: 'red' },
  anulado: { label: 'Anulado', tone: 'slate' },
};

export const MEMBER_COLORS = ['#0065df', '#00a6b2', '#8b5cf6', '#ff5a00', '#c0764f', '#39b51c', '#e8b32c', '#e694ae'];

// ── v3: avisos push y automatizaciones (docs/v3-contrato.md) ────────────────

/**
 * Categorías de aviso que cada persona puede silenciar en el push. Cada una
 * agrupa uno o más `notifications.kind`; el buzón recibe todo igual.
 * `invest: true` = solo socios/admin (la categoría no aplica a colaboradores).
 */
export const NOTIFICATION_CATEGORIES = {
  tareas: { label: 'Tareas y comentarios', hint: 'Tareas nuevas, asignaciones, vencimientos y comentarios.', kinds: ['task', 'comment'] },
  agenda: { label: 'Citas y recordatorios', hint: 'Citas nuevas o movidas, recordatorios y citas sin confirmar.', kinds: ['appointment'] },
  proyectos: { label: 'Proyectos, clientes y servicios', hint: 'Cuando te asignan o te suman a un proyecto o servicio.', kinds: ['project', 'service'] },
  dinero: { label: 'Dinero de socios', hint: 'Aportes, retornos, aprobaciones y mensajes. Solo socios y admin.', kinds: ['movement', 'investment', 'message'], invest: true },
  clientes: { label: 'Portal de clientes', hint: 'Briefs enviados, comentarios y decisiones de clientes sobre entregables.', kinds: ['brief', 'deliverable'] },
  consultas: { label: 'Consultas de la web', hint: 'Cuando alguien deja sus datos en jcanalytic.com o te asignan una consulta.', kinds: ['lead'] },
  registros: { label: 'Registros con enlace', hint: 'Cuando alguien se da de alta con un enlace de registro que creaste.', kinds: ['registro'] },
  resumen: { label: 'Resumen "Mi día"', hint: 'Un aviso por la mañana con tus citas, tareas y confirmaciones; los lunes, el resumen semanal de tráfico (administración y socios).', kinds: ['digest'] },
  automatizaciones: { label: 'Alertas automáticas', hint: 'Avance de 72 h, fin de soporte y tipo de cambio.', kinds: ['automation'] },
};

/** Categoría de un `notifications.kind` (los tipos desconocidos caen en "proyectos"). */
export function notificationCategory(kind) {
  for (const [cat, meta] of Object.entries(NOTIFICATION_CATEGORIES)) if (meta.kinds.includes(kind)) return cat;
  return 'proyectos';
}

/** Las 10 automatizaciones incluidas (etiquetas compartidas con la interfaz). */
export const AUTOMATIONS = {
  resumen_diario: { name: 'Resumen "Mi día"', description: 'Cada mañana, a la hora de cada persona, un aviso con sus citas, tareas y (a la administración) la plata por aprobar. No se envía si todo está en cero.', category: 'resumen' },
  resumen_semanal_trafico: { name: 'Resumen semanal de tráfico', description: 'Cada lunes, a la administración y a los socios: visitas de la semana contra la anterior, consultas nuevas y sin atender, la mejor y la peor página y qué hacer primero. No se envía si no hubo visitas ni consultas.', category: 'resumen' },
  recordatorio_citas: { name: 'Recordatorio de citas', description: 'Avisa a los participantes un rato antes de cada cita no cancelada.', category: 'agenda' },
  cita_sin_confirmar: { name: 'Cita sin confirmar', description: 'Citas con clientes aún "programadas" que empiezan en menos de 24 h: recuerda confirmar con el cliente.', category: 'agenda' },
  avance_72h: { name: 'Avance de 72 h', description: 'Proyectos de cliente: avisa al responsable a los 2/3 del plazo y, si vence, también a los admin.', category: 'automatizaciones' },
  tareas_vencen: { name: 'Tareas que vencen hoy', description: 'Cada mañana avisa a cada persona de sus tareas abiertas que vencen hoy.', category: 'tareas' },
  dinero_pendiente: { name: 'Dinero sin aprobar', description: 'Movimientos pendientes por más de 24 h: recuerda a la administración que los apruebe.', category: 'dinero' },
  fin_soporte: { name: 'Fin del soporte de 30 días', description: 'Una semana antes de que termine el soporte de un proyecto entregado, avisa al responsable.', category: 'automatizaciones' },
  tareas_recurrentes: { name: 'Tareas recurrentes', description: 'Crea en el tablero las tareas de las reglas activas que tocan hoy y avisa a la persona asignada.', category: 'tareas' },
  tipo_cambio: { name: 'Tipo de cambio', description: 'Consulta el dólar (venta) en Hacienda y actualiza el tipo de cambio del portal si cambió.', category: 'automatizaciones' },
};

export const RECURRING_FREQUENCIES = { diaria: 'Diaria', semanal: 'Semanal', mensual: 'Mensual' };
/** 1 = lunes … 7 = domingo (igual que recurring_tasks.weekday). */
export const WEEKDAYS = { 1: 'lunes', 2: 'martes', 3: 'miércoles', 4: 'jueves', 5: 'viernes', 6: 'sábado', 7: 'domingo' };
