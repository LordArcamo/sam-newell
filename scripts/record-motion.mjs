// Records the motion for the user: the opening sequence, a scroll through the first chapters and one page
// transition (black curtain + title card), via the Chrome DevTools screencast (headless, GPU) → ffmpeg.
// node scripts/record-motion.mjs [base] [out.mp4]
import os from 'node:os';
import path from 'node:path';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const { Browser, sleep } = await import(path.join(os.homedir(), '.claude/skills/design-taste-frontend/scripts/lib/cdp.mjs'));
const base = process.argv[2] || 'http://localhost:4345';
const out = process.argv[3] || path.join(os.homedir(), 'Projects/fazed-3d-sites/clients/sam-newell/media/build/motion-preview.mp4');
const dir = path.join(os.tmpdir(), 'sn-rec-' + Date.now());
mkdirSync(dir, { recursive: true });

const W = 1440, H = 900;
const b = await Browser.launch({ width: W, height: H, extraArgs: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ width: W, height: H });
const frames = [];
b.on(p.sessionId, 'Page.screencastFrame', (f) => {
  frames.push({ t: f.metadata.timestamp, data: f.data });
  p.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
});
await p.send('Page.navigate', { url: 'about:blank' });
await sleep(300);
await p.send('Page.startScreencast', { format: 'jpeg', quality: 82, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
await p.send('Page.navigate', { url: base + '/' });
await sleep(5600); // the opening: mark → letterbox → name → swatches, then the skyline draws under the name
// V6: the swatch trace on hover
await p.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: W - 140, y: 250 });
await sleep(1400);
await p.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: W / 2, y: H / 2 });
const at = async (sel) => p.eval(`document.querySelector('${sel}').getBoundingClientRect().top + scrollY`);
const scrollTo = async (y) => { const now = await p.eval('scrollY'); await p.wheel(Math.max(0, y - now), { step: 70, pauseMs: 24 }); };
await scrollTo(H * 2.4); await sleep(900); // the intro
const scene = await at('[data-scene]');
await scrollTo(scene - H * 0.2); await sleep(600); // the listings pass
const sceneH = await p.eval(`document.querySelector('[data-scene]').offsetHeight`);
await p.wheel(sceneH - H * 0.6, { step: 50, pauseMs: 30 }); await sleep(800); // one scene: four statements, four cuts
const map = await at('#map');
await scrollTo(map - H * 0.85); await sleep(300);
await p.wheel(H * 0.8, { step: 30, pauseMs: 40 }); // V3: the contours draw outward from Lehi
await sleep(2600); // the model crossfades in, the pins drop
await p.eval(`document.querySelector('.slip[data-town="provo"]')?.click()`); // V5: the line to the picked town
await sleep(2200);
await p.eval(`(document.querySelector('.bar .links a[href="/buy/"]') || document.querySelector('a[href="/buy/"]')).click()`);
await sleep(3600); // V1: curtain, the SN mark draws, the Buy page arrives on its picture
// /buy/'s moment: the walkthrough wall builds itself while the screen holds
const walk = await p.eval(`(() => { const s = document.querySelector('[data-walk]'); return s ? [s.getBoundingClientRect().top + scrollY, s.offsetHeight - innerHeight] : null; })()`);
if (walk) {
  const now = await p.eval('scrollY');
  await p.wheel(walk[0] - now, { step: 70, pauseMs: 24 });
  await sleep(400);
  await p.wheel(walk[1], { step: 40, pauseMs: 34 });
  await sleep(1600);
}
await p.send('Page.stopScreencast');
await b.close();

// constant 30 fps from the screencast timestamps
frames.sort((a, c) => a.t - c.t);
const list = [];
frames.forEach((f, i) => {
  const file = path.join(dir, `f${String(i).padStart(5, '0')}.jpg`);
  writeFileSync(file, Buffer.from(f.data, 'base64'));
  const d = i < frames.length - 1 ? Math.max(1 / 60, frames[i + 1].t - f.t) : 0.5;
  list.push(`file '${file}'`, `duration ${d.toFixed(4)}`);
});
list.push(`file '${path.join(dir, `f${String(frames.length - 1).padStart(5, '0')}.jpg`)}'`);
writeFileSync(path.join(dir, 'list.txt'), list.join('\n'));
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', path.join(dir, 'list.txt'), '-vf', 'fps=30,scale=1440:-2,format=yuv420p', '-c:v', 'libx264', '-crf', '20', '-preset', 'slow', '-movflags', '+faststart', out], { stdio: 'inherit' });
rmSync(dir, { recursive: true, force: true });
console.log(`${frames.length} frames → ${out}`);
