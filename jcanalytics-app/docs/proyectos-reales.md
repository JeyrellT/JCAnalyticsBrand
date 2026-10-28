# Proyectos reales: capturas, código y cifras

La sección `#trabajo` de la portada ya no usa ilustraciones conceptuales: muestra los diez repositorios de JC Analytics con capturas reales, fragmentos de código y cifras calculadas. Este documento explica cómo mantenerla.

## 1. Cifras (`scripts/project-evidence.mjs`)

```powershell
# Los repositorios deben estar clonados uno al lado del otro, p. ej. D:\Proyectos\Laburrada, D:\Proyectos\TransportesLuna…
$env:JCA_PROJECTS_ROOT = "D:\Proyectos"
node scripts/project-evidence.mjs
```

El script cuenta líneas y archivos de código (sin `node_modules`, carpetas generadas, builds ni lockfiles), commits y fechas con `git`, y las cifras propias de cada proyecto (páginas, endpoints, modelos, migraciones, pruebas) con patrones declarados en `PROJECTS` dentro del script. Escribe `src/data/projects.evidence.json`, que se versiona: el build y `check:site` no necesitan los repositorios.

Para agregar un proyecto: añadir su entrada en el script (patrones), en `src/data/projects.js` (textos, pantallas, stack) y en `src/data/projectCode.js` (fragmento), y exportar sus capturas.

## 2. Capturas (`public/projects/<id>/`)

Cada captura se toma de la aplicación corriendo desde su repositorio, con datos de demostración o de semilla, nunca con datos de clientes reales:

- Escritorio: ventana de 1440 × 900 (escala 1,5), guardada a 1600 px de ancho en WebP calidad 80 → `<pantalla>-desktop.webp`.
- Móvil: ventana de 390 × 844 (escala 2, táctil), guardada a 640 px de ancho → `<pantalla>-mobile.webp`.
- Movimiento reducido activado para que las animaciones no cambien la captura.

Los nombres de pantalla (`cocina`, `rutas`, `facturas`…) son los `id` de `screens` en `src/data/projects.js`. Cada pantalla puede señalar con `mobile` qué captura móvil la acompaña.

Las apps se levantan según el README de cada repositorio (Postgres local para las de Prisma, SQLite para Soporte 2.0 y CAVIQ, `python -m http.server` para los sitios estáticos). Las sesiones de demostración se crean con los seeds de cada proyecto; los secretos usados en local no se reutilizan en producción.

## 3. Fragmentos de código (`src/data/projectCode.js`)

Se copian tal cual del repositorio, con la ruta del archivo. Al elegirlos: que expliquen una decisión de ingeniería en pocas líneas, que no incluyan secretos, datos personales ni algoritmos que el cliente considere reservados, y que sigan existiendo (si el archivo cambia, actualizar el fragmento).

## 4. Verificación

`npm run check:site` comprueba que la portada nombra los proyectos en HTML estático, que cada proyecto trae su captura, que el explorador cambia de proyecto, de vista (pantalla, código, anatomía) y que los enlaces abren sitios reales por HTTPS.
