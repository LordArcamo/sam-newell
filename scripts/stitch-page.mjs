// Full-page picture from viewport screenshots (headless Chrome's fullPage mode skips painting big composited layers
// far below the fold, which shows up as dark boxes). Reduced motion, header hidden after the first screen.
// node scripts/stitch-page.mjs url out.jpg [width] [height]
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
const sharp = createRequire(import.meta.url)('sharp');
const { Browser, sleep } = await import(path.join(os.homedir(), '.claude/skills/design-taste-frontend/scripts/lib/cdp.mjs'));
const [url, out, w = '1440', h = '900'] = process.argv.slice(2);
const W = +w, H = +h, mobile = W < 768;
const b = await Browser.launch({ width: W, height: H });
const p = await b.newPage({ width: W, height: H, mobile, reducedMotion: true });
await p.goto(url, { settleMs: 1500 });
await p.eval(`document.querySelectorAll('img[loading=lazy]').forEach((i) => (i.loading = 'eager'))`);
await p.eval(`Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; setTimeout(r, 15000); })))`);
const total = await p.eval('document.documentElement.scrollHeight');
const shots = [];
for (let y = 0, i = 0; y < total; y += H, i++) {
  const top = Math.min(y, total - H);
  await p.eval(`scrollTo(0, ${top})`);
  if (i === 1) await p.eval(`(() => { const s = document.createElement('style'); s.textContent = 'header, .bar { visibility: hidden !important }'; document.head.append(s); })()`);
  await sleep(700);
  const f = path.join(os.tmpdir(), `stitch-${process.pid}-${i}.jpg`);
  await p.screenshot({ path: f, quality: 80 });
  shots.push({ input: f, top, left: 0 });
}
await b.close();
await sharp({ create: { width: W, height: total, channels: 3, background: '#0a0a0a' }, limitInputPixels: false }).composite(shots).jpeg({ quality: 72 }).toFile(out);
console.log(out, total);
