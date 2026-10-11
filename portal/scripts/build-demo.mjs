// ============================================================================
//  scripts/build-demo.mjs — npm run build:demo
//  Compila la demo (vite.demo.config.js) y la arma como FRAGMENTO HTML para un
//  artefacto de claude.ai: sin <!doctype>/<html>/<head>/<body>, empezando por
//  <title>, con todo el CSS y el JS en línea (sin archivos aparte).
//  Salida: demo-dist/portal-demo.html
// ============================================================================

import { build } from 'vite';
import { readFile, readdir, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const OUT_DIR = here('../demo-dist');
const TMP_DIR = join(OUT_DIR, '.vite');
const OUT_FILE = join(OUT_DIR, 'portal-demo.html');
const MAX_BYTES = 16 * 1024 * 1024;

const TITLE = '<title>Portal JC Analytics</title>';
const FONTS = [
  '<link rel="preconnect" href="https://fonts.googleapis.com">',
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
  '<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&family=Inter:wght@400..700&display=swap" rel="stylesheet">',
];

const fail = (message) => { console.error(`build:demo → ${message}`); process.exit(1); };

await build({ configFile: here('../vite.demo.config.js'), logLevel: 'warn' });

// Todo debe haber quedado en un JS y un CSS (el HTML de Vite se descarta).
const files = (await readdir(TMP_DIR, { recursive: true, withFileTypes: true })).filter((f) => f.isFile());
const extra = files.filter((f) => !/\.(js|css|html)$/.test(f.name));
if (extra.length) fail(`quedaron archivos sin incrustar: ${extra.map((f) => f.name).join(', ')}`);
const js = files.filter((f) => f.name.endsWith('.js'));
const css = files.filter((f) => f.name.endsWith('.css'));
if (js.length !== 1 || css.length !== 1) fail(`se esperaba 1 JS y 1 CSS (hay ${js.length} y ${css.length})`);

let script = await readFile(join(js[0].parentPath ?? js[0].path, js[0].name), 'utf8');
const style = await readFile(join(css[0].parentPath ?? css[0].path, css[0].name), 'utf8');

// Secuencias que cerrarían o alterarían el <script> en línea. Solo aparecen dentro
// de cadenas o expresiones regulares, donde \x3C equivale a "<".
script = script.replace(/<(\/script|!--|script)/gi, '\\x3C$1');
if (/<\/style/i.test(style)) fail('el CSS contiene "</style"');
if (/\b(?:fetch|XMLHttpRequest)\s*\(\s*["'`]\/api\//.test(script)) console.warn('build:demo → aviso: hay llamadas directas a /api/ que no pasan por api()');

const fragment = [
  TITLE,
  ...FONTS,
  `<style>:root{color-scheme:light}\n${style}</style>`,
  '<div id="root"></div>',
  `<script type="module">${script}</script>`,
  '',
].join('\n');

const bytes = Buffer.byteLength(fragment);
if (bytes > MAX_BYTES) fail(`el archivo pesa ${(bytes / 1048576).toFixed(2)} MB (máximo 16 MB)`);
if (!fragment.startsWith(TITLE)) fail('el fragmento debe empezar con <title>');

await writeFile(OUT_FILE, fragment);
await rm(TMP_DIR, { recursive: true, force: true });
console.info(`Demo lista: ${OUT_FILE} (${(bytes / 1048576).toFixed(2)} MB)`);
