// Dev tool: viewport screenshots while scrolling a page step by step (what a visitor sees, incl. sticky/pinned
// chapters and reveals). node scripts/filmstrip.mjs url outPrefix width height stepVh count
import os from 'node:os';
import path from 'node:path';
const { Browser, sleep } = await import(path.join(os.homedir(), '.claude/skills/design-taste-frontend/scripts/lib/cdp.mjs'));
const [url, out, w = '1440', h = '900', step = '0.9', count = '24'] = process.argv.slice(2);
const b = await Browser.launch({ width: +w, height: +h, extraArgs: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ width: +w, height: +h, mobile: +w < 768 });
await p.goto(url, { settleMs: 3500 });
for (let i = 0; i < +count; i++) {
  await p.screenshot({ path: `${out}-${String(i).padStart(2, '0')}.jpg`, quality: 60 });
  const done = await p.eval(`innerHeight + scrollY >= document.documentElement.scrollHeight - 2`);
  if (done) break;
  await p.wheel(Math.round(+h * +step), { step: 120, pauseMs: 30 });
  await sleep(1300);
}
await b.close();
