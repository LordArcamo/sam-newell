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
await sleep(5200); // the opening: mark → letterbox → name → swatches, then the film settles
await p.wheel(H * 2.2, { step: 60, pauseMs: 26 }); // into the intro (the sentence holds, the films pass)
await sleep(1200);
await p.wheel(H * 2.4, { step: 60, pauseMs: 26 }); // the listings
await sleep(1200);
await p.eval(`(document.querySelector('.bar .links a[href="/buy/"]') || document.querySelector('a[href="/buy/"]')).click()`);
await sleep(3400); // curtain up, title card, the Buy page arrives
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
