# Punto de encuentro · experiencia del equipo

El inicio del portal reúne decisiones, proyectos y personas bajo una identidad visual verde profundo, papel cálido y acentos lima. El dibujo orbital es geometría SVG original; su movimiento se puede pausar y respeta la preferencia de movimiento reducido. Los datos del inicio proceden de la API existente.

## Uso cotidiano

- **Radar:** muestra los asuntos pendientes y abre la prioridad más urgente. El listado permite filtrar por prioridad o dinero; este último solo está disponible para socios y administradores.
- **Todo el equipo / Mi espacio:** cambia el alcance de los proyectos y de la agenda. Los indicadores superiores siguen identificados como cifras del equipo o personales según corresponda.
- **Tu siguiente avance:** permite escoger una tarea propia, iniciarla o completarla. La selección se recuerda en este navegador, por persona. Los cambios de estado se guardan en la API y actualizan los indicadores, proyectos y actividad.
- **Buscar o hacer algo:** abre una búsqueda de secciones, acciones, proyectos y tareas reales. También responde a Ctrl/⌘ K, flechas, Enter y Escape. El diálogo conserva el foco; al cerrarlo se devuelve al control anterior. Los accesos administrativos y financieros respetan el rol.
- **Estudio de flujos:** presenta las automatizaciones existentes como «Cuándo → Si se cumple → Entonces». Seleccionar un paso explica qué hace la regla. El administrador conserva los controles de pausa, ajustes y ejecución manual. Las pruebas ejecutan la regla real y pueden generar avisos: la interfaz lo indica antes de ejecutarlas.
- **Rituales recurrentes:** las plantillas abren el formulario con una propuesta editable. No crean reglas hasta guardar. Las recurrencias conservan sus permisos y su historial.
- **Proyectos:** galería con geometrías originales según el tipo de proyecto y vista de lista. Permite ordenar por atención, actividad, entrega, avance o nombre; buscar sin acentos; combinar filtros y quitarlos individualmente. La vista elegida se recuerda en este navegador.
- **Tablero:** alcance «Mi trabajo / Todo el equipo», densidad cómoda o compacta y acciones de movimiento con teclado. El resumen corresponde a las tareas visibles; los límites WIP consideran la carga completa del equipo. En móvil se recorre una columna a la vez.
- **Inversiones:** seleccionar una persona muestra sus aportes, retornos y neto confirmados; «Ver total» restaura el conjunto. El anillo representa las participaciones de la API. Los movimientos pendientes conservan su confirmación desde el buzón.
- **Espacio de trabajo:** la navegación lateral se puede contraer en escritorio y recuerda su estado. Los formularios conservan el foco al escribir, lo mantienen dentro del diálogo y lo devuelven al cerrar; las cargas muestran una estructura de espera que respeta el movimiento reducido.

El dashboard actualiza sus datos cada minuto mientras está visible y al volver a la pestaña. No representa presencia en línea, ganancias futuras, horas ahorradas ni actividad simulada. La actividad reciente y las listas del inicio son resúmenes; los enlaces abren sus secciones completas.

## Verificación

```powershell
npm run lint
npm test
npm run build
$env:PLAYWRIGHT_CHROMIUM='C:\Program Files\Google\Chrome\Application\chrome.exe'
npm run e2e
npm run e2e:experience
npm run e2e:frontend
```

La suite de experiencia cubre navegación, filtros, cambios de tarea, selección persistente, accesibilidad por teclado, permisos de colaborador y controles de automatización. Comprueba ausencia de desbordes a 360, 390, 768 y 1440 px en ambos temas y guarda capturas en `test-results/experience/`.

La suite frontend verifica los filtros y vistas de proyectos, el alcance y las acciones del tablero, y la selección de cuentas de inversiones contra datos reales de la base de prueba. Guarda sus capturas de ambas apariencias y cuatro tamaños en `test-results/frontend/`.

Para explorar con datos ficticios: `npm run dev:demo`. La demostración tiene selector de personas y datos en memoria; sus cambios desaparecen al recargar. `npm run build:demo` prepara el fragmento HTML autocontenido.

La implementación modifica el portal del equipo. Los accesos separados de clientes e inversionistas conservan sus propias interfaces. No se requiere migración de base de datos.
