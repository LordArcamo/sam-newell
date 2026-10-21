// Screenshot of the footer at 1440 and 390: node scripts/shot-footer.mjs [url] [outDir]
import os from 'node:os';
import path from 'node:path';
const { Browser, sleep } = await import(path.join(os.homedir(), '.claude/skills/design-taste-frontend/scripts/lib/cdp.mjs'));
const url = process.argv[2] || 'http://localhost:4345/contact/';
const out = process.argv[3] || path.join(os.homedir(), 'Projects/fazed-3d-sites/clients/sam-newell/media/build/reviews');
const b = await Browser.launch({ width: 1440, height: 900 });
for (const [w, h, mobile] of [[1440, 900, false], [390, 844, true]]) {
  const p = await b.newPage({ width: w, height: h, dsf: mobile ? 2 : 1, mobile });
  await p.goto(url, { settleMs: 1200 });
  // the footer is taller than a phone screen: one viewport shot per screen of it, bottom first
  await p.eval(`(() => { const s = document.createElement('style'); s.textContent = '.bar{visibility:hidden!important}'; document.head.append(s); window.__lenis?.destroy?.(); })()`);
  const fh = await p.eval(`document.querySelector('footer').offsetHeight`);
  const n = Math.ceil(fh / h);
  for (let i = 0; i < n; i++) {
    await p.eval(`scrollTo(0, document.documentElement.scrollHeight - innerHeight - ${i * h})`);
    await sleep(700);
    await p.screenshot({ path: path.join(out, `footer-${w}${n > 1 ? '-' + (n - i) : ''}.jpg`), quality: 85 });
  }
}
await b.close();
console.log('ok');
