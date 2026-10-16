# Club de inversionistas

El portal exclusivo de inversionistas tiene una identidad propia: crema, berenjena, coral y lavanda, ilustraciones SVG originales y exploración por proyectos. Conserva las rutas y los permisos de `/inversionista`.

## Recorridos

- **Mapa de ideas:** cada mundo representa una inversión con movimientos a nombre de la persona. Seleccionar uno muestra sus aportes, retornos y participación confirmados en la moneda de esa inversión. Las flechas, Inicio y Fin permiten recorrer los mundos con teclado; la paginación admite carteras grandes.
- **Rincón curioso:** tres mini retos opcionales explican confirmaciones, neto y participación. Al descubrir los tres aparece el sello «Capital en claro». Se guardan únicamente los identificadores de conceptos aprendidos en este navegador, separados por persona. «Volver a jugar» reinicia ese progreso. No se modifica ningún movimiento ni monto.
- **Historia personal:** los movimientos recientes pueden seleccionarse y abrirse en su inversión. El gráfico conserva las fechas y los montos confirmados.
- **Detalle:** «Tu parte / El proyecto» alterna entre la posición personal y los agregados permitidos de la inversión. Los filtros del libro y los saltos a historia permiten consultar los registros con menos desplazamiento.
- **Movimiento visual:** el control de pausa se recuerda en este navegador. Las animaciones y los saltos también respetan la preferencia de movimiento reducido del dispositivo.

Los totales personales del inicio están en colones con el tipo de cambio guardado en cada movimiento; el detalle utiliza la moneda original de la inversión. Los pendientes no forman parte del capital confirmado. El mapa puede incluir una inversión con movimientos pendientes o anulados y participación confirmada de cero. Los nombres y montos de otros participantes permanecen privados.

## Acceso por inversionista

Desde **Inversiones → abrir inversión → Acceso de inversionistas → Administrar acceso**, el administrador selecciona las personas habilitadas y guarda los cambios. Los socios tienen acceso a todas las inversiones, pero no administran estos permisos.

- **Disponibles para vos** muestra las inversiones habilitadas que aún no tienen movimientos propios. Conceder acceso no registra capital ni modifica cifras.
- El mapa conserva las inversiones con historial. Retirar el permiso bloquea nuevos aportes, incluidos los que un socio intenta registrar a nombre de ese inversionista. Los retornos, confirmaciones, objeciones, mensajes y exportaciones del historial siguen disponibles.
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

Las pruebas de permisos comprueban aislamiento, validación de personas, migración, habilitación y revocación, aportes del equipo, historial y retornos. La suite de navegador utiliza una base temporal y la API real: recorre el editor del administrador, el catálogo habilitado y un formulario abierto antes de revocar, además de cifras, monedas, teclado, confirmaciones, mini retos, persistencia, cuenta vacía y apariencia. Las capturas se guardan en `test-results/investor-experience/`.

`npm run dev:demo` abre datos ficticios. `/demo/?acceso=inversionista` abre directamente el selector de inversionistas; elegir una persona inicia la demostración. Los datos de la demo se reinician al recargar; los ajustes visuales y los conceptos aprendidos permanecen en el navegador.
