// Dev tool: headless Chrome WITH the GPU (never the visible window) — screenshots of the live relief.
// node scripts/gl-shot.mjs <url> <out.png> [width] [height] [scrollToSelector] [waitMs]
import os from 'node:os';
import path from 'node:path';
const lib = process.env.TASTE_CDP || path.join(os.homedir(), '.claude/skills/design-taste-frontend/scripts/lib/cdp.mjs');
const { Browser, sleep } = await import(lib);
const [url, out, w = '1440', h = '900', sel = '', wait = '6000'] = process.argv.slice(2);
const b = await Browser.launch({ width: +w, height: +h, extraArgs: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl'] });
const p = await b.newPage({ width: +w, height: +h, mobile: +w < 768 });
const logs = [];
b.on(p.sessionId, 'Runtime.consoleAPICalled', (e) => logs.push(e.type + ': ' + e.args.map((a) => a.value ?? a.description).join(' ')));
await p.goto(url, { settleMs: 500 });
if (sel) await p.eval(`document.querySelector(${JSON.stringify(sel)}).scrollIntoView({block:'start'})`);
await sleep(+wait);
const info = await p.eval(`({gl: document.documentElement.dataset.gl, canvas: !!document.querySelector('.relief-canvas.on'), renderer: (()=>{try{const c=document.createElement('canvas').getContext('webgl2');const e=c.getExtension('WEBGL_debug_renderer_info');return c.getParameter(e.UNMASKED_RENDERER_WEBGL)}catch(e){return String(e)}})()})`);
await p.screenshot({ path: out, format: 'png' });
console.log(JSON.stringify(info), '\n' + [...logs, ...p.consoleErrors].join('\n'));
await b.close();
