# Portal de inversionistas

`/inversionista` es una herramienta de control, no una vitrina. Usa el mismo sistema visual del portal ("precisión tranquila", `docs/v4-diseno.md`), sin ilustraciones, animaciones decorativas ni juegos. Cada pantalla responde primero qué espera tu confirmación, luego cuánto tenés confirmado y por último el detalle. Conserva las rutas y los permisos de la v6 (`docs/v6-contrato.md`).

## Qué ve el inversionista

- **Doble control** (inicio y detalle): una línea dice si hay movimientos que esperan tu confirmación, avisos tuyos que esperan a JC Analytics o si no queda nada pendiente. Si te toca, el botón **Revisar y confirmar** lleva a la lista.
- **Totales** (inicio y movimientos), en colones con el tipo de cambio guardado en cada movimiento:
  - capital aportado, retornos recibidos, neto y pendientes;
  - debajo, capital devuelto, ganancias recibidas, capital por devolver, múltiplo (MOIC) y TIR anual;
  - si hay retornos históricos sin clasificar, el capital por devolver queda "Por conciliar" y una nota lo explica.
- **Por confirmar**: cada movimiento muestra el monto, la inversión, la fecha, la referencia y el mensaje de quien lo registró, con **Confirmar** y **Objetar** a la vista. El diálogo repite esos datos antes de decidir. Confirmar admite un mensaje de vuelta opcional; objetar y retirar un aviso propio piden el motivo.
- **Tus inversiones**: una fila por inversión con estado, pendientes, aportado, recibido, neto y participación, en la moneda de cada una.
- **Disponibles para vos**: inversiones habilitadas sin movimientos propios. Tener acceso no registra capital.
- **Detalle de una inversión**: tu posición (con lo pendiente aparte), el libro de movimientos con filtros (todos, pendientes, confirmados, retornos), los totales del proyecto (capital, retornos, participantes y meta, nunca nombres ni montos ajenos), la evolución y **Avisar un aporte**.
- **Movimientos**: el estado de cuenta por mes, con filtros y la descarga para Excel (separador `;` y BOM UTF-8).

Los pendientes, objetados y anulados nunca suman en los totales. Los nombres y montos de otros participantes permanecen privados.

## Reglas de diseño

- Lo primero en pantalla es el estado del doble control; en escritorio, también los totales.
- Ningún texto visible mide menos de 11 px. Los montos no se recortan: si no caben, bajan de línea.
- Un solo botón principal por pantalla. Los colores tienen significado: ámbar = pendiente, turquesa = confirmado o recibido, coral = objetado.
- Sin ilustraciones ni animaciones decorativas; solo la entrada suave entre secciones (y ninguna con movimiento reducido).

## Acceso por inversionista

Desde **Inversiones → abrir inversión → Acceso de inversionistas → Administrar acceso**, el administrador selecciona las personas habilitadas y guarda los cambios. Los socios tienen acceso a todas las inversiones, pero no administran estos permisos.

- **Disponibles para vos** muestra las inversiones habilitadas que aún no tienen movimientos propios. Conceder acceso no registra capital ni modifica cifras.
- **Tus inversiones** conserva las inversiones con historial. Retirar el permiso bloquea nuevos aportes, incluidos los que un socio intenta registrar a nombre de ese inversionista. Los retornos, confirmaciones, objeciones, mensajes y exportaciones del historial siguen disponibles.
- Una inversión cerrada o en pérdida no recibe nuevos aportes del inversionista aunque conserve permiso.
- La API verifica el permiso en cada aporte. Un formulario abierto antes de una revocación no puede eludirla.
- Las nuevas inversiones comienzan sin permisos de inversionistas. La migración conserva una sola vez los accesos de inversionistas con movimientos existentes; no restablece permisos revocados en reinicios posteriores.

`GET` y `PUT /api/investments/:id/access` son exclusivos del administrador. `PUT` recibe `allowed_investor_ids` y reemplaza la selección en una transacción con registro de auditoría. El detalle del equipo entrega estos identificadores para filtrar el selector de aportes; el portal del inversionista solo recibe su propio estado de acceso.

## Validación y demo

```powershell
npm run lint
npm test
npm run build
npm run e2e:investor
npm run build:demo
```

Las pruebas de permisos comprueban aislamiento, validación de personas, migración, habilitación y revocación, aportes del equipo, historial y retornos. La suite de navegador usa una base temporal y la API real. Recorre:

- el estado del doble control y los totales, visibles sin desplazarse;
- cada fila de inversión contra la API, en su moneda;
- los filtros del libro, los diálogos de confirmar y objetar (sin cambiar montos hasta enviar) y el foco del teclado;
- el editor de acceso del administrador, el catálogo habilitado y un formulario abierto antes de revocar;
- la cuenta vacía, el tema claro y oscuro, y que no haya texto de menos de 11 px en 360, 390, 768 y 1440 px.

Las capturas se guardan en `test-results/investor-experience/`.

`npm run dev:demo` abre datos ficticios. `/demo/?acceso=inversionista` abre directamente el selector de inversionistas; elegir una persona inicia la demostración. Los datos de la demo se reinician al recargar; la preferencia de tema permanece en el navegador.
