import { Target, Database, ShieldCheck, Receipt, Globe } from 'lucide-react';
import { WEB_PROPERTIES } from './webProperties';

// Capturas 16/9 del hero de cada sitio propio, indexadas por id (el contenedor
// de imagen del modal de casos es apaisado).
const sitePreview = Object.fromEntries(WEB_PROPERTIES.map((p) => [p.id, p.shotHero]));

export const casesData = {
  inteligencia: {
    title: "Inteligencia de Datos",
    icon: Target,
    bgClass: "bg-blue-600",
    glowClass: "bg-blue-400",
    accentClass: "bg-blue-500",
    resultBgClass: "bg-blue-50/50",
    resultBorderClass: "border-blue-200",
    resultTextClass: "text-blue-600",
    cases: [
      {
        sector: "Retail",
        title: "Dashboard de Categoría Agua (174 SKUs, 24 tiendas)",
        problem: "El equipo de categoría recibía datos de scanner de 24 puntos de venta en archivos separados. Consolidarlos tomaba entre 2 y 3 días. Para cuando el reporte estaba listo, las decisiones de compra ya estaban atrasadas. Nadie sabía qué SKU estaba perdiendo participación en cuál tienda hasta semanas después.",
        methodology: {
          "Define": "Mapeo de las 174 referencias activas, identificación de los 3 cortes de análisis que usaba el equipo (por tienda, por semana, por subcategoría).",
          "Develop": "Modelo estrella en Power BI con tabla de hechos de ventas y dimensiones de producto, tienda y calendario. Named ranges para que cada tabla se actualizara con un refresh, no con edición manual.",
          "Debug": "Pruebas con datos reales de 4 semanas. Se detectó que 11 SKUs tenían códigos duplicados entre regiones — se normalizó en Power Query antes de cargar.",
          "Deploy": "Dashboard entregado con documentación de actualización. El equipo lo operó sin soporte desde el día 1."
        },
        solution: "Un dashboard completamente fórmula-driven en Power BI con arquitectura de named ranges y cross-sheet SUMIFS. Sin macros, sin código oculto — cualquier persona del equipo podía mantenerlo. La fuente de datos era el archivo de scanner directo, sin transformación manual intermedia.",
        tech: ["Power BI Desktop", "Power Query M", "DAX", "Excel (Staging)"],
        result: "Visibilidad de 174 productos en 24 tiendas en tiempo real. Eliminación de 28 consolidaciones manuales semanales.",
        image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800"
      },
      {
        sector: "Empresa de Servicios",
        title: "Modelo de Cartera y Aging",
        problem: "El equipo de cobranza trabajaba con un Excel plano de 943 facturas. No había forma de saber cuáles clientes concentraban el riesgo real hasta hacer una tabla dinámica manual cada semana. Las decisiones de cuándo escalar una cuenta se hacían por intuición.",
        methodology: {
          "Define": "Entrevista con el equipo de cobranza para entender qué preguntas necesitaban responder cada lunes. Resultado: 4 preguntas clave (¿quién paga?, ¿quién no va a pagar?, ¿cuánto está en riesgo real?, ¿a quién llamar primero?).",
          "Develop": "Modelo DAX con medidas de aging dinámico, score de riesgo ponderado (días mora × monto × historial) y clasificación ABC automática. Pareto calculado como medida acumulada.",
          "Debug": "Se descubrió que el 2.5% de clientes generaba el 50% de la morosidad. Ese hallazgo no era visible antes — validado contra registros históricos de 3 años.",
          "Deploy": "Dashboard con vista de supervisor (resumen ejecutivo) y vista operativa (lista de gestión diaria priorizada)."
        },
        solution: "Modelo de análisis de cartera con clasificación automática por riesgo, aging por tramos (0–30, 31–60, 61–90, 91–120, +120 días) y análisis Pareto integrado. El modelo identificaba automáticamente el top de clientes críticos y calculaba el capital inmovilizado y el costo de oportunidad mensual.",
        tech: ["Power BI", "DAX Avanzado", "Power Query", "Excel (Fuente ERP)"],
        result: "El equipo pasó de revisar 943 registros manualmente a gestionar una lista priorizada de 24 cuentas críticas cada semana.",
        image: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=800"
      },
      {
        sector: "Sector Retail / Torrefactora",
        title: "Análisis de Ventas con Clasificación ABC",
        problem: "Modelo semántico existente en Power BI sin documentación ni estructura de mantenimiento. 15 medidas DAX sin nombre descriptivo, sin relaciones documentadas, sin proceso de actualización definido.",
        solution: "Auditoría completa del modelo, redocumentación en TMDL (Tabular Model Definition Language), reestructuración de las 15 medidas con nomenclatura estándar, implementación de clasificación ABC dinámica (70%/20%/10%) como medida calculada — no como columna estática.",
        tech: ["Power BI", "TMDL", "DAX (RANKX, CALCULATE)", "Esquema Estrella"],
        result: "Modelo auditable, depurado y escalable, con clasificación ABC automatizada que reduce dependencias técnicas futuras.",
        image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800"
      }
    ]
  },
  fiscal: {
    title: "Cumplimiento Fiscal y Planilla CR",
    icon: Receipt,
    bgClass: "bg-cyan-600",
    glowClass: "bg-cyan-400",
    accentClass: "bg-cyan-500",
    resultBgClass: "bg-cyan-50/50",
    resultBorderClass: "border-cyan-200",
    resultTextClass: "text-cyan-600",
    cases: [
      {
        sector: "PYME / Facturación electrónica",
        title: "Conciliación de Factura Electrónica v4.4 y rechazos de Hacienda",
        problem: "La empresa emitía cientos de comprobantes electrónicos al mes, pero los rechazos de Hacienda se detectaban tarde — a veces a fin de mes, cuando ya había desorden contable. Revisar comprobante por comprobante en el portal del Ministerio era manual y se saltaban casos.",
        methodology: {
          "Define": "Mapeo del flujo de emisión, recepción de respuestas de Hacienda y los motivos de rechazo más frecuentes (clave, cédula del receptor, código de actividad).",
          "Develop": "Validación automática del XML contra el esquema v4.4 antes de emitir, y conciliación de los mensajes de aceptación/rechazo de Hacienda contra el registro interno.",
          "Debug": "Pruebas con comprobantes reales de varios meses; se normalizaron formatos de fecha y montos inconsistentes entre el sistema emisor y el archivo de respuesta.",
          "Deploy": "Proceso entregado con tablero de estado (aceptados / rechazados / pendientes) y documentación de operación."
        },
        solution: "Pipeline que valida cada comprobante contra el esquema v4.4, concilia las respuestas de Hacienda con el registro interno y marca al instante los rechazos con su motivo — sin abrir el portal manualmente.",
        tech: ["Python", "XML / Esquema v4.4", "openpyxl", "Power Automate"],
        result: "Más de 5.900 comprobantes consolidados y validados. Los rechazos se detectan el mismo día, no a fin de mes.",
        image: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=800"
      },
      {
        sector: "PYME / Planilla y CCSS",
        title: "Automatización del cierre de planilla y cálculo de CCSS",
        problem: "El cierre de planilla se armaba a mano en Excel cada quincena: deducciones de CCSS, rebajos, horas extra y aguinaldo se calculaban con fórmulas frágiles que se rompían al agregar o quitar colaboradores. Un error de cálculo significaba reprocesar todo.",
        solution: "Automatización del cálculo de planilla y deducciones de CCSS a partir de los datos de marcaje y el maestro de colaboradores, con validaciones que detectan inconsistencias antes del cierre y generan el archivo listo para pago y para el SICERE.",
        tech: ["Python / Excel", "openpyxl", "Reglas CCSS", "VBA"],
        result: "El cierre quincenal pasó de horas de armado manual a minutos, con cero errores de cálculo de CCSS desde la implementación.",
        image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&q=80&w=800"
      }
    ]
  },
  web: {
    title: "Páginas Web y Reservas en Línea",
    icon: Globe,
    bgClass: "bg-violet-600",
    glowClass: "bg-violet-400",
    accentClass: "bg-violet-500",
    resultBgClass: "bg-violet-50/50",
    resultBorderClass: "border-violet-200",
    resultTextClass: "text-violet-600",
    cases: [
      {
        sector: "Producto propio · Barberías CR",
        title: "BarberXCR — página propia y reservas automáticas para barberías",
        problem: "La barbería tica promedio agenda por WhatsApp: el barbero corta, deja la máquina, contesta, apunta la cita en un cuaderno y vuelve. Se pierden citas, se duplican horarios y no queda historial del cliente. Las alternativas eran apps que el cliente tiene que descargar — fricción que la mayoría no pasa.",
        methodology: {
          "Define": "Decisión de producto tomada de entrada: cero descargas. Si el cliente necesita instalar algo para reservar, no reserva. Todo tenía que funcionar desde el navegador, en el celular, en menos de 30 segundos.",
          "Develop": "Cada barbería recibe su propia página con su marca, sus fotos y su catálogo. Detrás, agenda con panel administrativo e historial de clientes con foto del último corte para no repetir la conversación de qué le hicimos la vez pasada.",
          "Debug": "Los planes se estructuraron según cómo opera realmente el negocio: barbero solo, barbero con asistente de IA, y local con hasta 5 barberos donde cada uno necesita su propia agenda y calendario independiente.",
          "Deploy": "En producción con prueba de 10 días sin tarjeta, sin contratos, y un plan Business con dominio propio, WhatsApp Business y mensajería automática al cliente."
        },
        solution: "Plataforma de reservas vertical para barberías. El dueño arma su página, publica su horario y el cliente elige servicio y hora desde el link — la cita queda agendada sin intervención. El panel muestra la agenda del día, el historial por cliente y, en los planes con IA, responde consultas automáticamente.",
        tech: ["Web app (SPA)", "Reservas en línea", "Panel administrativo", "Agenda multi-barbero", "Asistente con IA", "WhatsApp Business"],
        result: "En producción en barberxcr.com. Planes desde ₡10.000/mes con 10 días gratis; reservas ilimitadas 24/7 y agenda independiente por barbero hasta 5 sillas.",
        image: sitePreview.barberxcr
      },
      {
        sector: "Producto propio · Talleres y vehículos CR",
        title: "Taller Ticos — historial de mantenimiento certificado por el taller",
        problem: "Vender un carro usado en Costa Rica es un ejercicio de fe: el vendedor dice que le hizo todos los servicios, pero no lo puede probar. Las facturas se pierden, el cuaderno del taller no se comparte y el comprador termina pagando una revisión aparte. El vehículo bien mantenido vale lo mismo que el descuidado.",
        methodology: {
          "Define": "El registro no lo puede hacer el dueño — sería un documento sin valor probatorio. Quien registra es el taller, con fotos, lista de repuestos y firma. Eso convierte el historial en evidencia y no en declaración.",
          "Develop": "Dos productos en una plataforma: para el dueño, historial gratuito con dashboard de salud del vehículo, recordatorios preventivos por kilometraje y control de RTV/DEKRA; para el taller, órdenes de trabajo digitales, agenda y notificación al cliente por WhatsApp.",
          "Debug": "El punto delicado era la privacidad: al compartir el historial para vender, no puede filtrarse cédula, teléfono ni dirección. Se resolvió con enlaces que excluyen datos personales, con expiración configurable de 7 a 90 días y revocables por el dueño en cualquier momento.",
          "Deploy": "En producción, gratis para dueños de vehículo y con plan mensual para talleres, incluyendo lectura del odómetro por IA para evitar digitación y errores de kilometraje."
        },
        solution: "Historial de mantenimiento vehicular certificado — el equivalente tico de un reporte de historial de vehículo. El taller documenta cada servicio con evidencia; el dueño acumula un expediente verificable y comparte un enlace limpio cuando va a vender. El taller, a cambio, digitaliza su operación y deja de perder el registro en papel.",
        tech: ["Web app", "Órdenes de trabajo digitales", "Enlaces con expiración y revocación", "Notificaciones WhatsApp", "Lectura de odómetro con IA"],
        result: "En producción en tallerticos.com. Gratis para dueños de vehículo; gestión digital para talleres desde ₡20.000/mes, con evidencia fotográfica y recordatorios automáticos por kilometraje.",
        image: sitePreview.tallerticos
      },
      {
        sector: "Producto propio · Salones de belleza CR",
        title: "Glow Studio CR — sitio de salón con reserva en línea en 3 pasos",
        problem: "Un salón de belleza vive de la agenda y del portafolio, y casi siempre tiene los dos en el lugar equivocado: las citas en mensajes directos y los trabajos en historias que desaparecen en 24 horas. La clienta que quiere ver antes/después y reservar a las 10 de la noche no puede hacer ninguna de las dos cosas.",
        methodology: {
          "Define": "La reserva tenía que caber en tres decisiones: servicio, día y hora. Cualquier paso extra es una clienta que abandona. Y el precio de entrada de cada servicio tenía que estar visible — esconderlo genera consultas que nadie contesta a tiempo.",
          "Develop": "Sitio con seis especialidades (cabello, color, uñas, maquillaje, cejas y pestañas, faciales), cada una con precio desde y reserva directa. Portafolio con comparador deslizable de antes/después para que el trabajo se vea sin depender de redes sociales.",
          "Debug": "Ajuste de la ficha de servicio y del flujo móvil hasta que reservar tomara menos de 30 segundos en celular, con confirmación inmediata y sin llamada de vuelta.",
          "Deploy": "En producción con horarios publicados, testimonios, reserva y reprogramación en línea 24/7."
        },
        solution: "Sitio de salón orientado a convertir: catálogo de servicios con precio de entrada, portafolio comparativo antes/después y reserva en línea de tres pasos con confirmación inmediata. La clienta resuelve sola, a cualquier hora, y el salón deja de administrar la agenda por mensajes.",
        tech: ["Web app (SPA)", "Reservas en línea", "Comparador antes/después", "Diseño responsive", "Catálogo de servicios"],
        result: "En producción en glowstudiocr.com. Reserva en línea en unos 30 segundos desde el celular, disponible 24/7, con catálogo de 6 especialidades y portafolio comparativo.",
        image: sitePreview.glowstudiocr
      }
    ]
  },
  automatizacion: {
    title: "Automatización de Procesos",
    icon: Database,
    bgClass: "bg-orange-600",
    glowClass: "bg-orange-400",
    accentClass: "bg-orange-500",
    resultBgClass: "bg-orange-50/50",
    resultBorderClass: "border-orange-200",
    resultTextClass: "text-orange-600",
    cases: [
      {
        sector: "Logística / Freight Forwarding",
        title: "FILES Auditor",
        problem: "El proceso de reconciliación financiera de carga internacional requería abrir 6 sistemas distintos, cruzar 4 tipos de archivos, comparar números manualmente y generar un reporte de diferencias. Tiempo real medido: 3 horas por cierre. Se hacía dos veces por semana. 24 horas al mes en un solo proceso.",
        methodology: {
          "Define": "VSM (Value Stream Mapping) del proceso manual. Se identificaron 11 pasos, de los cuales 9 eran puramente mecánicos (abrir archivo, copiar columna, pegar en otro lado, aplicar filtro...).",
          "Develop": "Pipeline pandas con validación de esquema en entrada, lógica de matching por clave compuesta (número de expediente + fecha + monto), generación de reporte Excel con formato condicional automático vía openpyxl.",
          "Debug": "3 iteraciones con datos reales. Caso edge: archivos con encoding latin-1 vs UTF-8 según el sistema de origen. Resuelto con detección automática de encoding.",
          "Deploy": "Empaquetado como ejecutable con PyInstaller. El usuario final no necesita Python instalado. Manual de uso de 1 página."
        },
        solution: "Pipeline Python completamente automatizado. El operador abre un ejecutable, selecciona los archivos de entrada y presiona un botón. El sistema cruza, valida, detecta discrepancias y genera el reporte de auditoría formateado.",
        tech: ["Python 3", "pandas", "openpyxl", "PyInstaller", "CustomTkinter"],
        result: "3 horas → 30 segundos. Reducción del 99.4% en tiempo de proceso. Cero errores de digitación desde la implementación.",
        image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=800"
      },
      {
        sector: "Empresa Contable",
        title: "Pipeline de Limpieza QuickBooks",
        problem: "Los exports de QuickBooks llegaban con formato inconsistente: nombres de cuentas con variaciones tipográficas, transacciones duplicadas por doble sincronización, montos en formato texto con símbolos de moneda mixtos (₡, $, USD). Limpiar el archivo antes de cualquier análisis tomaba 1.5 horas por export.",
        solution: "Pipeline de validación y limpieza en Python. Detecta y corrige automáticamente: encoding, separadores de miles, símbolos de moneda, nombres de cuenta con fuzzy matching (distancia de Levenshtein), duplicados por clave compuesta, y genera un log de todas las correcciones aplicadas para auditoría.",
        tech: ["Python", "pandas", "fuzzywuzzy", "openpyxl", "logging"],
        result: "Export limpio y listo para análisis en menos de 40 segundos. Log de auditoría incluido automáticamente.",
        image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800"
      }
    ]
  },
  transferencia: {
    title: "Transferencia de Conocimiento",
    icon: ShieldCheck,
    bgClass: "bg-emerald-600",
    glowClass: "bg-emerald-400",
    accentClass: "bg-emerald-500",
    resultBgClass: "bg-emerald-50/50",
    resultBorderClass: "border-emerald-200",
    resultTextClass: "text-emerald-600",
    cases: [
      {
        sector: "Distribución y Retail",
        title: "Programa de Capacitación Power BI Empresas",
        problem: "La empresa quería implementar Power BI pero el equipo tenía miedo de depender eternamente de un consultor externo. El reto no era solo instalar dashboards — era que el equipo los pudiera mantener, modificar y expandir solos.",
        methodology: {
          "Fase 1 (Preparación Estratégica)": "Diagnóstico de nivel base del equipo. Identificación de los 3 reportes más críticos del negocio como casos de práctica.",
          "Fase 2 (Ejecución)": "Semana 1: Power Query y modelado de datos. Semana 2: DAX básico con medidas del negocio real. Semana 3: Visualizaciones y mejores prácticas. Semana 4: El equipo construye su propio dashboard desde cero — entrega final supervisada.",
          "Entregable Final": "Documentación técnica de cada modelo construido durante el programa, SOP de actualización mensual, checklist de validación de datos."
        },
        solution: "Programa de capacitación en 2 fases con metodología inversa: primero los analistas aprendieron a leer e interpretar los dashboards (2 semanas), luego aprendieron a construirlos desde datos reales de la empresa (4 semanas). Cada sesión usaba datos internos, no datasets genéricos.",
        tech: ["Power BI Desktop", "Power Query M", "DAX", "SharePoint"],
        result: "Al finalizar el programa, el equipo mantenía y actualizaba los dashboards sin intervención externa. La empresa cerró exitosamente su fase de consultoría — objetivo logrado.",
        image: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=800"
      },
      {
        sector: "Educación & Perfilamiento Profesional",
        title: "Plan de Estudios Analítica de Datos para Universitarios",
        problem: "Dos estudiantes universitarios querían entrar al mercado laboral con un perfil diferenciado en datos. No querían solo teoría — querían un portafolio de proyectos reales al terminar.",
        solution: "Plan de estudios estructurado de 3 meses con entregables semanales. Mes 1: fundamentos de Excel avanzado y SQL. Mes 2: Power BI con proyecto real de análisis de ventas. Mes 3: Python para automatización básica + proyecto integrador.\n\nCada módulo incluía un proyecto aplicado: el análisis de ventas de una cafetería ficticia con datos reales (productos, tiendas, satisfacción), el modelo de cartera con aging, y un pipeline de limpieza de datos básico en Python.",
        tech: ["Excel", "SQL Básico", "Power BI", "Python (pandas)", "Jupyter Notebooks"],
        result: "Meses de entrenamiento resultaron en 3 proyectos documentados per cápita, con datos reales y dashboards 100% operativos en el portafolio final.",
        image: "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&q=80&w=800"
      }
    ]
  }
};
