// OG / social cards (1200×630) from the live-render golden poster + the caps lockup on a white plate,
// and the stacked logo PNG for JSON-LD. Run after capture-posters.mjs.
import sharp from 'sharp';
import { mkdir, readFile } from 'node:fs/promises';
await mkdir('public/og', { recursive: true });
await mkdir('public/brand', { recursive: true });
const caps = (await readFile('src/assets/brand/sam-newell-horizontal-caps-black.svg', 'utf8'));
const lockup = await sharp(Buffer.from(caps), { density: 300 }).resize({ width: 520 }).png().toBuffer();
const lm = await sharp(lockup).metadata();
const plate = await sharp({ create: { width: lm.width + 56, height: lm.height + 48, channels: 4, background: '#ffffff' } })
  .composite([{ input: lockup, left: 28, top: 24 }]).png().toBuffer();
const pm = await sharp(plate).metadata();
const cards = [
  ['home', 'src/assets/posters/hero-golden-desktop.jpg', 'centre'],
  ['overview', 'src/assets/posters/overview-golden.jpg', 'centre'],
];
for (const [name, src, pos] of cards) {
  await sharp(src).resize(1200, 630, { fit: 'cover', position: pos })
    .composite([{ input: plate, left: 40, top: 630 - pm.height - 40 }])
    .jpeg({ quality: 84, mozjpeg: true }).toFile(`public/og/${name}.jpg`);
  console.log(`public/og/${name}.jpg`);
}
const stacked = await readFile('src/assets/brand/sam-newell-stacked-black.svg', 'utf8');
await sharp(Buffer.from(stacked), { density: 300 }).resize({ width: 600 }).flatten({ background: '#ffffff' }).extend({ top: 60, bottom: 60, left: 60, right: 60, background: '#ffffff' }).png().toFile('public/brand/sam-newell-stacked-black.png');
console.log('public/brand/sam-newell-stacked-black.png');
