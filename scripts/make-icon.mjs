// Renders the game's ghost mark to build/icon.png at 1024x1024.
// electron-builder derives the Windows .ico and macOS .icns from this one file.
// Run once (or whenever the mark changes):  node scripts/make-icon.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const SIZE = 1024;

// The ghost from index.html's favicon, on the game's dark panel colour.
const html = `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;padding:0;background:transparent}</style>
<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 32 32">
  <rect x="0" y="0" width="32" height="32" rx="7" fill="#0b0e12"/>
  <rect x="0.5" y="0.5" width="31" height="31" rx="6.6" fill="none" stroke="#7ee8a2" stroke-opacity="0.28" stroke-width="0.6"/>
  <g transform="translate(16 16.6) scale(0.86) translate(-16 -16)">
    <path d="M16 3c-6 0-10 5-10 11v13l3-3 3 3 4-3 4 3 3-3 3 3V14c0-6-4-11-10-11z" fill="#7ee8a2"/>
    <circle cx="12" cy="14" r="2.4" fill="#101418"/>
    <circle cx="20" cy="14" r="2.4" fill="#101418"/>
  </g>
</svg>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE } });
await page.setContent(html);
const png = await page.locator('svg').screenshot({ omitBackground: true });
await browser.close();

await mkdir('build', { recursive: true });
await writeFile('build/icon.png', png);
console.log(`build/icon.png written (${SIZE}x${SIZE}, ${png.length} bytes)`);
