// Capture only local JC Analytics previews. Outputs are private and never built.
import puppeteer from 'puppeteer';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = dirname(fileURLToPath(import.meta.url));
const output = join(directory, '..', '..', '_scripts', 'archive-public-assets', 'site-previews');
const origin = new URL(process.env.PREVIEW_URL || 'http://127.0.0.1:5173/');
if (!['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname) || !['http:', 'https:'].includes(origin.protocol)) {
  throw new Error('PREVIEW_URL must point to the local JC Analytics preview server.');
}
const browser = await puppeteer.launch({ headless: true });
try {
  await mkdir(output, { recursive: true });
  for (const language of ['en', 'es']) {
    for (const [device, viewport] of Object.entries({ desktop: { width: 1440, height: 1000 }, mobile: { width: 390, height: 844 } })) {
      const page = await browser.newPage();
      try {
        await page.setViewport(viewport);
        await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
        await page.setRequestInterception(true);
        page.on('request', request => /google-analytics\.com|googletagmanager\.com/.test(request.url()) ? request.abort() : request.continue());
        await page.goto(new URL(language === 'es' ? '/es/' : '/', origin).href, { waitUntil: 'networkidle2' });
        await page.waitForSelector('#contacto');
        await page.screenshot({ path: join(output, `${language}-${device}.webp`), type: 'webp', quality: 80 });
        console.log(`Saved local ${language} ${device} preview.`);
      } finally {
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
}
