// Dev tool: load a page with the GPU, run JS steps, screenshot. node scripts/gl-eval.mjs url out.png w h "js;js" wait
import os from 'node:os';
import path from 'node:path';
const lib = process.env.TASTE_CDP || path.join(os.homedir(), '.claude/skills/design-taste-frontend/scripts/lib/cdp.mjs');
const { Browser, sleep } = await import(lib);
const [url, out, w = '1440', h = '900', js = '', wait = '8000'] = process.argv.slice(2);
const b = await Browser.launch({ width: +w, height: +h, extraArgs: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ width: +w, height: +h, mobile: +w < 768 });
await p.goto(url, { settleMs: +wait });
for (const step of js.split(';;').filter(Boolean)) {
  const r = await p.eval(step).catch((e) => 'ERR ' + e.message);
  console.log('>', step.slice(0, 80), '=>', JSON.stringify(r)?.slice(0, 300));
  await sleep(700);
}
await p.screenshot({ path: out, format: 'png' });
console.log(p.consoleErrors.join('\n'));
await b.close();
