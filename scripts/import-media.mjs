// Pulls the Higgsfield run (assets-gen/MEDIA-NOTES.md, 2026-10-21) into the site:
//  - hero loops (already seamless, 257 frames @24) → public/film/, with frame-0 posters → src/assets/film/
//  - time-of-day stills (relit from Sam's real sunrise) → src/assets/photos/
//  - 4K upscales → 2560 px JPEGs (Astro makes the AVIF/WebP). ONLY family-river-4k-faithful (the plain one redrew Liam's face).
import sharp from 'sharp';
import path from 'node:path';
import os from 'node:os';
import { copyFileSync } from 'node:fs';
const C = process.env.SN_CLIENT_DIR || path.join(os.homedir(), 'Projects/fazed-3d-sites/clients/sam-newell');
const W = path.join(C, 'assets-gen/film/web'), R = path.join(C, 'assets-gen/film/relight'), U = path.join(C, 'assets-gen/upscales');

for (const [src, dst] of [
  ['hero-golden-1080.mp4', 'hero-golden.mp4'], ['hero-golden-1080.av1.mp4', 'hero-golden.av1.mp4'],
  ['hero-golden-phone.mp4', 'hero-golden-phone.mp4'], ['hero-golden-phone.av1.mp4', 'hero-golden-phone.av1.mp4'],
  ['hero-night-1080.mp4', 'hero-night.mp4'], ['hero-night-1080.av1.mp4', 'hero-night.av1.mp4'],
]) copyFileSync(path.join(W, src), path.join('public/film', dst));

const jpg = (q = 88) => ({ quality: q, mozjpeg: true });
const jobs = [
  [path.join(W, 'hero-golden-1080-poster.jpg'), 'src/assets/film/hero-golden.jpg', null],
  [path.join(W, 'hero-golden-phone-poster.jpg'), 'src/assets/film/hero-golden-phone.jpg', null],
  [path.join(W, 'hero-night-1080-poster.jpg'), 'src/assets/film/hero-night.jpg', null],
  [path.join(R, 'A1-blue-hour.png'), 'src/assets/photos/wasatch-blue-hour.jpg', null],
  [path.join(R, 'A2-night.png'), 'src/assets/photos/wasatch-night.jpg', null],
  [path.join(R, 'A3-alpenglow.png'), 'src/assets/photos/wasatch-alpenglow.jpg', null],
  [path.join(U, '1872-01-4k.png'), 'src/assets/listings/full-1872-front-aerial.jpg', 2560],
  [path.join(U, '1872-71-4k.png'), 'src/assets/listings/full-1872-drone-wasatch.jpg', 2560],
  [path.join(U, 'framed-4k.png'), 'src/assets/photos/framed-house-wasatch.jpg', 2560],
  [path.join(U, 'family-river-4k-faithful.png'), 'src/assets/photos/family-river.jpg', 2560],
];
for (const [src, dst, w] of jobs) {
  let p = sharp(src);
  if (w) p = p.resize({ width: w, withoutEnlargement: true });
  const i = await p.jpeg(jpg()).toFile(dst);
  console.log(dst, i.width, i.height, Math.round(i.size / 1024) + ' KB');
}
