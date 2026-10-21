// Dev tool: poster ↔ live-canvas parity (brief §4.4: edge diff ≤ 2 px). Screenshots the hero with the canvas
// hidden (poster) and shown (live), same instant, and reports the mean absolute difference.
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
const lib = path.join(os.homedir(), '.claude/skills/design-taste-frontend/scripts/lib/cdp.mjs');
const { Browser, sleep } = await import(lib);
const [base = 'http://localhost:4345', w = '1440', h = '900', time = '17:35', out = ''] = process.argv.slice(2);
const b = await Browser.launch({ width: +w, height: +h, extraArgs: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ width: +w, height: +h, mobile: +w < 768, reducedMotion: true });
await p.goto(`${base}/?gl=force&debug&t=${encodeURIComponent('2026-10-21T' + time + ':00-06:00')}`, { settleMs: 500 });
for (let i = 0; i < 60; i++) { if (await p.eval(`!!document.querySelector('.relief-canvas.on')`)) break; await sleep(500); }
await sleep(800);
const rect = await p.eval(`(()=>{const r=document.querySelector('[data-relief-mount=hero]').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}})()`);
await p.eval(`document.querySelectorAll('.hero-foot,.caption,.pin-tag').forEach(e=>e.style.visibility='hidden')`);
const shot = async (op) => { await p.eval(`(()=>{const c=document.querySelector('.relief-canvas');c.style.transition='none';c.style.opacity='${op}'})()`); await sleep(400); return Buffer.from(await p.screenshot({ format: 'png', clip: rect }), 'base64'); };
const A = await shot(0), B = await shot(1);
if (out) { await sharp(A).toFile(out + '-poster.png'); await sharp(B).toFile(out + '-live.png'); }
const a = await sharp(A).greyscale().raw().toBuffer(), c = await sharp(B).greyscale().raw().toBuffer();
let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - c[i]);
console.log(`${w}x${h} @${time}: mean |poster − live| = ${(s / a.length).toFixed(2)} (0–255)`);
await b.close();
