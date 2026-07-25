// scripts/capture-sites.mjs
// Captura screenshots reales de los sitios propios (public/sites/*.webp).
//
// Uso:  npm i puppeteer@^24 --no-save && node scripts/capture-sites.mjs
//
// Genera por sitio:
//   <id>.webp         → captura larga de desktop (1200px de ancho, hasta 2400px
//                       de alto). La sección #sitios la desplaza en hover, así
//                       que conviene que sea alta.
//   <id>-mobile.webp  → captura de teléfono (390x844 @2x) para el marco móvil.
//   <id>-hero.webp    → recorte 16/9 del hero, para contenedores apaisados
//                       (card del carrusel de servicios y modal de casos).
//
// Se corre a mano, NO en el build: las imágenes quedan versionadas en public/.
// Re-ejecutar cuando alguno de los sitios cambie de diseño.

import puppeteer from 'puppeteer';
import { mkdir, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'public', 'sites');

const SITES = [
  { id: 'barberxcr', url: 'https://barberxcr.com/' },
  { id: 'tallerticos', url: 'https://www.tallerticos.com/' },
  { id: 'glowstudiocr', url: 'https://glowstudiocr.com/' },
];

const DESKTOP = { width: 1200, height: 800 };
const MOBILE = { width: 390, height: 844 };
const MAX_H_DESKTOP = 2400;
const MAX_H_MOBILE = 1900;

// Recorre la página para disparar imágenes lazy y vuelve arriba.
async function autoScroll(page) {
  await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const max = document.body.scrollHeight;
    for (let y = 0; y < max; y += 600) {
      window.scrollTo(0, y);
      await sleep(120);
    }
    window.scrollTo(0, 0);
    await sleep(400);
  });
}

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars'],
});

await mkdir(OUT, { recursive: true });

const VARIANTS = [
  { suffix: '', vp: DESKTOP, scale: 1, quality: 74, maxH: MAX_H_DESKTOP },
  { suffix: '-mobile', vp: MOBILE, scale: 2, quality: 72, maxH: MAX_H_MOBILE },
  // Recorte apaisado del hero (16/9 exacto sobre 1200 de ancho).
  { suffix: '-hero', vp: { width: 1200, height: 675 }, scale: 1.5, quality: 80, maxH: 675 },
];

for (const site of SITES) {
  for (const v of VARIANTS) {
    const page = await browser.newPage();
    try {
      await page.setViewport({ ...v.vp, deviceScaleFactor: v.scale });
      // reduced-motion: evita capturar animaciones de entrada a medio camino
      await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
      await page.goto(site.url, { waitUntil: 'networkidle2', timeout: 45_000 });
      await new Promise((r) => setTimeout(r, 1800));
      await autoScroll(page);
      await new Promise((r) => setTimeout(r, 900));

      const full = await page.evaluate(() => document.body.scrollHeight);
      const height = Math.min(full, v.maxH);
      const file = join(OUT, `${site.id}${v.suffix}.webp`);
      await page.screenshot({
        path: file,
        type: 'webp',
        quality: v.quality,
        clip: { x: 0, y: 0, width: v.vp.width, height },
      });
      const { size } = await stat(file);
      console.log(`OK ${site.id}${v.suffix || '-desktop'} → ${v.vp.width}x${height} · ${(size / 1024).toFixed(0)} kB`);
    } catch (e) {
      console.error(`FALLÓ ${site.id}${v.suffix}: ${e.message}`);
    } finally {
      await page.close();
    }
  }
}

await browser.close();
console.log('listo');
