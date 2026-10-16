// Build de la DEMO del portal: un solo archivo HTML que corre el backend real en
// el navegador (sql.js en memoria) con datos ficticios. Ver demo/README.md.
//   npm run dev:demo     → servidor de desarrollo en /demo/
//   npm run build:demo   → demo-dist/portal-demo.html (fragmento para un artefacto)
import { defineConfig, normalizePath } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Vite usa separadores POSIX en sus IDs incluso en Windows. Todas las
// comparaciones deben usar el mismo formato para no redirigir el shim a sí mismo.
const here = (p) => normalizePath(fileURLToPath(new URL(p, import.meta.url)));

const AUTH_REAL = here('./server/auth.mjs');
const AUTH_SHIM = here('./demo/shims/auth.js');
const NODE_SHIMS = {
  'node:crypto': here('./demo/shims/crypto.js'),
  'node:os': here('./demo/shims/node-misc.js'),
  'node:path': here('./demo/shims/node-misc.js'),
  'node:util': here('./demo/shims/node-misc.js'),
  'node:fs/promises': here('./demo/shims/node-misc.js'),
};
const STUB_PREFIX = '\0portal-demo-node:';

/**
 * Hace que server/** cargue en el navegador:
 *  · node:crypto/os/path/util/fs/promises → shims de demo/shims/
 *  · server/auth.mjs (scrypt) → demo/shims/auth.js (salvo el import que hace el propio shim)
 *  · cualquier otro node:* → módulo vacío que falla solo si se llama (con aviso en el build)
 */
function portalDemoShims() {
  return {
    name: 'portal-demo-shims',
    enforce: 'pre',
    resolveId(source, importer) {
      if (NODE_SHIMS[source]) return NODE_SHIMS[source];
      const from = importer && normalizePath(importer.split('?')[0]);
      if (from && source.endsWith('auth.mjs') && from !== AUTH_SHIM && !from.startsWith('\0')
        && normalizePath(resolve(dirname(from), source)) === AUTH_REAL) return AUTH_SHIM;
      if (source.startsWith('node:') && from && !from.includes('/node_modules/')) {
        this.warn(`${source} (importado por ${from}) no existe en el navegador: la demo usa un módulo vacío.`);
        return STUB_PREFIX + source.slice(5);
      }
      return null;
    },
    load(id) {
      if (!id.startsWith(STUB_PREFIX)) return null;
      const name = id.slice(STUB_PREFIX.length);
      return {
        code: `const fail = (key) => () => { throw new Error('node:${name}.' + String(key) + ' no está disponible en la demo'); };
export const __stub = new Proxy({}, { get: (_, key) => (key === '__esModule' ? false : fail(key)) });
export default __stub;`,
        syntheticNamedExports: '__stub',
      };
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [portalDemoShims(), react(), tailwindcss()],
  build: {
    outDir: here('./demo-dist/.vite'),
    emptyOutDir: true,
    target: ['es2020', 'safari15', 'chrome90'],
    assetsInlineLimit: 50 * 1024 * 1024, // el logo viaja como data: URI
    cssCodeSplit: false,
    modulePreload: false,
    copyPublicDir: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 8000,
    // sql.js solo pide módulos de Node dentro de su rama para Node (nunca corre aquí).
    commonjsOptions: { ignore: ['node:fs', 'node:crypto', 'fs', 'crypto', 'path'] },
    rollupOptions: {
      input: here('./demo/index.html'),
      output: {
        inlineDynamicImports: true,
        entryFileNames: 'portal-demo.js',
        assetFileNames: 'portal-demo[extname]',
      },
    },
  },
});
