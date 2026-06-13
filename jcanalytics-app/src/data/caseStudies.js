import { Target, Database, ShieldCheck, Receipt } from 'lucide-react';

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
        sector: "Corporación Consumo Masivo",
        title: "Sistema de Notificaciones con Escalado (Transfer Pricing)",
        problem: "El equipo manejaba tareas de cumplimiento con entidades fiscales de múltiples países. Las fechas límite se perdían porque no había un sistema de alertas. Los recordatorios eran manuales, dependían de que alguien revisara el Excel correcto el día correcto.",
        methodology: {
          "Define": "Mapeo de todos los tipos de tarea (documentación, filing, revisión, aprobación) y sus respectivos SLAs. Identificación de los 3 actores (responsable, supervisor, director regional).",
          "Develop": "Flow en Power Automate con trigger recurrente diario. Lógica condicional: si días restantes > 14 → notificación informativa al responsable. Si 7–14 → advertencia al responsable + copia al supervisor. Si < 7 → alerta crítica a todos los niveles + Teams adaptative card con botón de acción directa.",
          "Debug": "Problema resuelto: timeout de red en llamadas a SharePoint List dentro del flow. Solución: chunking de la consulta en lotes de 100 registros con retry logic.",
          "Deploy": "Flow en producción. SharePoint Task Hub como fuente única de verdad para todas las tareas."
        },
        solution: "Sistema de notificaciones automáticas con 3 niveles de urgencia según días restantes para el deadline. Integrado con SharePoint como fuente de datos y Power Automate como motor de despacho. Las alertas llegaban directamente a Teams con formato diferenciado por urgencia.",
        tech: ["Power Automate", "SharePoint Lists", "MS Teams Adaptive Cards", "Power Apps"],
        result: "Cero deadlines perdidos desde implementación. El tiempo de seguimiento manual pasó de 45 minutos diarios a cero.",
        image: "https://images.unsplash.com/photo-1596526131083-e8c633c948d2?auto=format&fit=crop&q=80&w=800"
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
      },
      {
        sector: "Corporación Consumo Masivo",
        title: "Documentación Técnica y SOPs de Automatización",
        problem: "El sistema automatizado de gestión de tareas que se construyó en Power Apps / SharePoint no tenía documentación. Si la persona que lo operaba salía de la empresa, el conocimiento se iba con ella.",
        solution: "Manual técnico completo: arquitectura del sistema, estructura de datos en SharePoint, lógica de los flows en Power Automate, guía de troubleshooting para los 8 errores más comunes, y manual estándar de operaciones (SOP) de onboarding para nuevos usuarios.",
        tech: ["SharePoint", "Power Apps", "Power Automate", "Markdown"],
        result: "Onboarding de nuevos usuarios reducido drásticamente: de 3 días de explicaciones manuales a tan solo 4 horas de lectura estructurada del manual.",
        image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=800"
      }
    ]
  }
};
