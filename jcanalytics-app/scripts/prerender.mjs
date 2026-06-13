// scripts/prerender.mjs
// Post-build prerender (snapshot SSG) para JC Analytics.
//
// Qué hace:
//   1. Sirve estáticamente el directorio dist/ con base relativa ("./").
//   2. Abre la home en un Chromium headless (puppeteer).
//   3. Espera a que React 19 monte el árbol (selectores clave: #root con
//      <footer> y la sección #contacto) -> garantiza cuerpo completo.
//   4. Inyecta una marca para neutralizar animaciones de entrada (opacity:0)
//      de framer-motion en el HTML estático, para que el texto sea visible
//      para bots aunque no ejecuten JS.
//   5. Reescribe dist/index.html con el outerHTML renderizado, PRESERVANDO
//      los <script>/<link>/<style> originales (Vite los inyecta en <head>/
//      final de <body>), de modo que la SPA siga hidratando en el cliente.
//
// REQUISITOS DUROS:
//   - NON-FATAL: cualquier fallo => warning + exit 0, dejando dist/index.html
//     intacto (la SPA normal se publica igual).
//   - React 19 (createRoot().render reemplaza #root): el snapshot es para
//     bots + first paint; al cargar, React re-renderiza sobre #root sin romper.
//   - Una sola ruta. Sin backend.

import { createServer } from 'node:http';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize, extname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = join(__dirname, '..', 'dist');
const INDEX_HTML = join(DIST_DIR, 'index.html');
const ROUTE = '/';
const PORT = 0; // puerto efímero asignado por el SO

// Selectores que confirman que el árbol React montó por completo.
// #root > footer = último bloque del árbol; #contacto = sección final con id.
const READY_SELECTORS = ['#root footer', '#contacto'];
const NAV_TIMEOUT_MS = 30_000;
const SELECTOR_TIMEOUT_MS = 20_000;
// Margen extra tras montar para que recharts/framer pinten el primer frame.
const SETTLE_MS = 600;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
};

function warn(msg, err) {
  // Prefijo reconocible en logs de CI; nunca lanza.
  console.warn(`[prerender] SKIP — ${msg}${err ? `: ${err.message || err}` : ''}`);
}

// Servidor estático mínimo para dist/ (SPA fallback a index.html).
function startStaticServer() {
  return new Promise((resolve, reject) => {
    const server = createServer(async (req, res) => {
      try {
        const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
        let filePath = normalize(join(DIST_DIR, urlPath));
        // Evitar path traversal fuera de dist/.
        if (!filePath.startsWith(DIST_DIR)) {
          res.statusCode = 403;
          return res.end('Forbidden');
        }
        if (urlPath === '/' || urlPath.endsWith('/')) {
          filePath = join(filePath, 'index.html');
        }
        if (!existsSync(filePath)) {
          // SPA de una sola ruta: fallback a index.html.
          filePath = INDEX_HTML;
        }
        const body = await readFile(filePath);
        res.statusCode = 200;
        res.setHeader('Content-Type', MIME[extname(filePath)] || 'application/octet-stream');
        res.end(body);
      } catch (e) {
        res.statusCode = 500;
        res.end('Server error');
      }
    });
    server.on('error', reject);
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

async function main() {
  // Guard 0: dist/index.html debe existir (build OK).
  try {
    await stat(INDEX_HTML);
  } catch {
    warn('dist/index.html no existe — build no completado, nada que prerenderizar');
    return 0;
  }

  // Guard 1: puppeteer disponible (import dinámico para que falte != fatal).
  let puppeteer;
  try {
    ({ default: puppeteer } = await import('puppeteer'));
  } catch (e) {
    warn('puppeteer no está instalado o falló al importar', e);
    return 0;
  }

  let server;
  let browser;
  try {
    server = await startStaticServer();
    const { port } = server.address();
    const baseUrl = `http://127.0.0.1:${port}`;

    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
    // Forzar reduced-motion: corta animaciones de entrada y deja el DOM en su
    // estado final visible. CustomCursor / gsap quedan inertes en headless.
    await page.emulateMediaFeatures([
      { name: 'prefers-reduced-motion', value: 'reduce' },
    ]);

    await page.goto(`${baseUrl}${ROUTE}`, {
      waitUntil: 'networkidle2',
      timeout: NAV_TIMEOUT_MS,
    });

    // Esperar a que el árbol React esté montado por completo.
    for (const sel of READY_SELECTORS) {
      await page.waitForSelector(sel, { timeout: SELECTOR_TIMEOUT_MS });
    }
    // Verificación dura: #root debe tener contenido real, no vacío.
    await page.waitForFunction(
      () => {
        const root = document.getElementById('root');
        return root && root.innerText && root.innerText.trim().length > 200;
      },
      { timeout: SELECTOR_TIMEOUT_MS },
    );

    await new Promise((r) => setTimeout(r, SETTLE_MS));

    // Neutralizar estados ocultos de animación EN EL HTML estático:
    //  - framer-motion deja inline style opacity:0 / transform en elementos
    //    aún no "in view". Para el snapshot los forzamos visibles para que el
    //    texto exista y sea legible por bots sin JS.
    //  - Marcamos <html data-prerendered> para diagnóstico.
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-prerendered', 'true');
      document.querySelectorAll('[style]').forEach((el) => {
        const s = el.getAttribute('style') || '';
        if (/opacity\s*:\s*0/.test(s) || /transform/.test(s)) {
          el.style.opacity = '1';
          el.style.transform = 'none';
        }
      });
    });

    // Capturar el HTML final completo (doctype + <html> con head y body).
    const html = await page.evaluate(
      () => '<!doctype html>\n' + document.documentElement.outerHTML,
    );

    if (!html || html.length < 1000) {
      warn('outerHTML capturado sospechosamente pequeño — se conserva el original');
      return 0;
    }

    await writeFile(INDEX_HTML, html, 'utf-8');
    console.log(`[prerender] OK — dist/index.html reescrito (${html.length} bytes).`);
    return 0;
  } catch (e) {
    warn('falló el render headless — se conserva dist/index.html original', e);
    return 0;
  } finally {
    try { if (browser) await browser.close(); } catch { /* noop */ }
    try { if (server) server.close(); } catch { /* noop */ }
  }
}

// NON-FATAL absoluto: nunca propagamos exit code != 0.
main()
  .then((code) => process.exit(typeof code === 'number' ? code : 0))
  .catch((e) => {
    warn('error inesperado en prerender', e);
    process.exit(0);
  });
