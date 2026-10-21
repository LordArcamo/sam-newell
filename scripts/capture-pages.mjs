// Dev tool: full-page captures of every page at 1440 / 820 / 390 (lazy images and reveals triggered by
// scrolling first). Uses the taste skill's zero-dependency CDP client.
// node scripts/capture-pages.mjs [baseUrl] [outDir] [page,page]
import os from 'node:os';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
const lib = process.env.TASTE_CDP || path.join(os.homedir(), '.claude/skills/design-taste-frontend/scripts/lib/cdp.mjs');
const { Browser, sleep } = await import(lib);

const base = process.argv[2] || 'http://localhost:4345';
const out = process.argv[3] || path.join(os.homedir(), 'Projects/fazed-3d-sites/clients/sam-newell/media/build');
const only = process.argv[4]?.split(',');
const pages = (only ?? ['/', '/buy/', '/sell/', '/invest/', '/podcast/', '/about/', '/contact/', '/reviews/', '/blog/', '/blog/first-home-wasatch-front/', '/privacy/', '/terms/', '/nope/']);
const sizes = [
  { w: 1440, h: 900, mobile: false },
  { w: 820, h: 1180, mobile: true },
  { w: 390, h: 844, mobile: true },
];
mkdirSync(out, { recursive: true });
const b = await Browser.launch({});
const errors = [];
for (const s of sizes) {
  // reduced motion: every reveal, shutter and parallax at rest, so a full-page shot shows the real layout (motion is checked by filmstrip.mjs)
  const p = await b.newPage({ width: s.w, height: s.h, dsf: 1, mobile: s.mobile, reducedMotion: true });
  for (const pg of pages) {
    const name = pg === '/' ? 'home' : pg.replace(/^\/|\/$/g, '').replace(/\//g, '__') || 'home';
    p.consoleErrors = [];
    await p.goto(base + pg, { settleMs: 800 });
    await p.screenshot({ path: path.join(out, `${name}-${s.w}-fold.jpg`), quality: 70 });
    const H = await p.eval('document.documentElement.scrollHeight');
    for (let y = 0; y < H; y += Math.round(s.h * 0.7)) {
      await p.eval(`window.scrollTo(0, ${y})`);
      await sleep(120);
    }
    await p.eval('window.scrollTo(0, 0)');
    // a full-page shot never scrolls, so lazy pictures below the fold would stay unrequested: load them all
    await p.eval(`document.querySelectorAll('img[loading=lazy]').forEach((i) => (i.loading = 'eager'))`);
    await p.eval(`Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; setTimeout(r, 15000); })))`);
    await sleep(900);
    await p.screenshot({ path: path.join(out, `${name}-${s.w}.jpg`), fullPage: true, quality: 62 });
    const overflow = await p.eval('document.documentElement.scrollWidth - innerWidth');
    if (p.consoleErrors.length || overflow > 0) errors.push(`${name}@${s.w}: overflow ${overflow}px; ${p.consoleErrors.join(' | ')}`);
    console.log(`${name}-${s.w}  ${H}px`);
  }
  await p.close();
}
await b.close();
console.log(errors.length ? 'ISSUES:\n' + errors.join('\n') : 'no console errors, no overflow');
