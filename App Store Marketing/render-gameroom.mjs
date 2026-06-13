import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const DIR = path.resolve('.'); // run from "App Store Marketing"

const JOBS = [
  { html: 'screenshots-game-room.html',        out: 'Apple App Store', w: 1320, h: 2868, prefix: 'game-room' },
  { html: 'screenshots-game-room-google.html', out: 'Google Play',     w: 1080, h: 1920, prefix: 'game-room' },
];
const NAMES = ['1-magazine-cover', '2-moment-page', '3-features'];

const browser = await chromium.launch();
for (const job of JOBS) {
  const page = await browser.newPage({ deviceScaleFactor: 1, viewport: { width: job.w + 120, height: 1200 } });
  await page.goto(pathToFileURL(path.join(DIR, job.html)).href, { waitUntil: 'networkidle' });
  // Neutralize the preview zoom + margins so each slide renders at its true CSS size
  await page.evaluate(() => {
    // Hide any fixed-position chrome (zoom buttons) that would overlap a node screenshot
    document.querySelectorAll('.zoom-controls').forEach((e) => { e.style.display = 'none'; });
    document.querySelectorAll('.screenshot-slide').forEach((el) => {
      el.style.transform = 'none';
      el.style.margin = '0';
    });
  });
  await page.evaluate(async () => { await document.fonts.ready; });
  // Wait for the screenshot images to decode
  await page.evaluate(async () => {
    await Promise.all([...document.images].map((img) => img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; })));
  });
  await page.waitForTimeout(400);

  const slides = await page.$$('.screenshot-slide');
  const outDir = path.join(DIR, job.out);
  fs.mkdirSync(outDir, { recursive: true });
  for (let i = 0; i < slides.length; i++) {
    const file = path.join(outDir, `${job.prefix}-${NAMES[i] ?? i + 1}.jpg`);
    await slides[i].screenshot({ path: file, type: 'jpeg', quality: 95 });
    console.log(`wrote ${job.out}/${path.basename(file)}`);
  }
  await page.close();
}
await browser.close();
console.log('done');
