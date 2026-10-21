// Captures the hero posters FROM THE LIVE three.js RENDERER (model check: "capture them from the live renderer"),
// per rig × sun state, plus the map overview. Headless Chrome with the GPU, never the visible window.
// Writes src/assets/posters/hero-{state}-{rig}.jpg + overview.jpg and src/data/posters.json (SN tag position,
// title plate flag measured on the pixels). Run with the dev server up: node scripts/capture-posters.mjs [base]
import os from 'node:os';
import path from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';
const lib = process.env.TASTE_CDP || path.join(os.homedir(), '.claude/skills/design-taste-frontend/scripts/lib/cdp.mjs');
const { Browser, sleep } = await import(lib);
const base = process.argv[2] || 'http://localhost:4345';

// One instant per bucket on 2026-10-21 (MDT), matching the model check (golden 17:45: inside the boot script's golden bucket, < 10°).
const STATES = { dawn: '08:20', noon: '13:12', golden: '17:45', blue: '18:50', night: '21:30' };
const RIGS = { desktop: [2560, 1440], tablet: [1536, 2048], phone: [1170, 2532] };
// Title box in reference-frame fractions per rig (bottom-left), for the contrast check.
const TITLE = { desktop: [0.02, 0.55, 0.47, 0.97], tablet: [0.03, 0.62, 0.8, 0.95], phone: [0.04, 0.58, 0.85, 0.82] };

mkdirSync('src/assets/posters', { recursive: true });
const b = await Browser.launch({ width: 1280, height: 800, extraArgs: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const manifest = { captured: new Date().toISOString(), states: STATES, rigs: {} };

async function grab(url, file) {
  const p = await b.newPage({ width: 1280, height: 800 });
  await p.goto(url, { settleMs: 500 });
  let cap = null;
  for (let i = 0; i < 120 && !cap; i++) {
    await sleep(500);
    cap = await p.eval('window.__capture || null');
  }
  await p.close();
  if (!cap) throw new Error('no capture from ' + url);
  const png = Buffer.from(cap.png.split(',')[1], 'base64');
  await sharp(png).jpeg({ quality: 90, mozjpeg: true }).toFile(file);
  return { ...cap, png: undefined, buf: png };
}

const lin = (c) => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
for (const [rig, [w, h]] of Object.entries(RIGS)) {
  manifest.rigs[rig] = {};
  for (const [state, time] of Object.entries(STATES)) {
    const t = encodeURIComponent(`2026-10-21T${time}:00-06:00`);
    const file = `src/assets/posters/hero-${state}-${rig}.jpg`;
    const cap = await grab(`${base}/?gl=force&capture=hero&rig=${rig}&t=${t}`, file);
    const [x0, y0, x1, y1] = TITLE[rig];
    const { data, info } = await sharp(cap.buf).extract({ left: Math.round(x0 * w), top: Math.round(y0 * h), width: Math.round((x1 - x0) * w), height: Math.round((y1 - y0) * h) }).raw().toBuffer({ resolveWithObject: true });
    const lum = [];
    for (let i = 0; i < data.length; i += info.channels * 11) lum.push(0.2126 * lin(data[i]) + 0.7152 * lin(data[i + 1]) + 0.0722 * lin(data[i + 2]));
    lum.sort((a, c) => a - c);
    const l5 = lum[Math.floor(lum.length * 0.05)];
    const contrast = state === 'night' ? (1.05) / (l5 + 0.05) : (l5 + 0.05) / 0.053;
    manifest.rigs[rig][state] = { sn: cap.sn, bearing: cap.bearing, titleContrastP5: +contrast.toFixed(2), plate: contrast < 4.5 };
    console.log(rig, state, cap.bearing, 'contrast p5', contrast.toFixed(2), cap.sn);
  }
}
await grab(`${base}/?gl=force&capture=overview&t=${encodeURIComponent('2026-10-21T17:35:00-06:00')}`, 'src/assets/posters/overview-golden.jpg');
writeFileSync('src/data/posters.json', JSON.stringify(manifest, null, 1) + '\n');
await b.close();
console.log('posters written');
