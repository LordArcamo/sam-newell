// Copies the approved source photos into src/assets with the "SN Neutral" grade
// (visual bible §7: saturation −8, highlights pulled, black point lifted to ~13).
// Originals stay where they are (assets-gen/instagram, inspo/concept-mockup, public/images).
// Run: npm run images   (idempotent; re-run when Sam supplies camera originals)
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const C = process.env.SN_CLIENT_DIR || path.join(os.homedir(), 'Projects/fazed-3d-sites/clients/sam-newell');
const IG = path.join(C, 'assets-gen/instagram');
const CONCEPT = path.join(C, 'inspo/concept-mockup');
const OLD = path.resolve('public/images');
const OUT = path.resolve('src/assets');

// [source, destination (relative to src/assets), kind]
const JOBS = [
  // Sam's Instagram (only the frames the visual bible clears; consent rules in the brief §8)
  [`${IG}/01-sam-portrait-polo-staged-room-2026-10.jpg`, 'photos/sam-portrait-2026-10.jpg', 'photo'],
  [`${IG}/03-sam-office-market-update-2026-02.jpg`, 'photos/sam-office-2026-02.jpg', 'photo'],
  [`${IG}/08-listing-kitchen-interior-lehi-saratoga-2026-05.jpg`, 'photos/listing-kitchen-2026-05.jpg', 'photo'],
  [`${IG}/11-wasatch-estate-lots-jordan-river-2026-07.jpg`, 'photos/estate-lots-jordan-river.jpg', 'photo'],
  [`${IG}/12-wasatch-valley-view-road-2026-08.jpg`, 'photos/valley-view-utah-county.jpg', 'photo'],
  [`${IG}/15-framing-house-exterior-blue-sky-2026-06.jpg`, 'photos/framing-custom-home.jpg', 'photo'],
  [`${IG}/16-framing-park-city-sam-mountains-2026-02.jpg`, 'photos/framing-park-city-sam.jpg', 'photo'],
  [`${IG}/17-framing-provo-riverbottoms-sam-2026-08.jpg`, 'photos/framing-provo-sam.jpg', 'photo'],
  [`${IG}/18-podcast-interview-room-sam-2023-01.jpg`, 'photos/podcast-studio.jpg', 'photo'],
  [`${IG}/20-family-brighton-fall-sam-kids-2026-10.jpg`, 'photos/family-brighton-2026-10.jpg', 'photo'],
  [`${IG}/22-family-kenai-river-alaska-2026-07.jpg`, 'photos/family-kenai-sockeye.jpg', 'photo'],
  // Photos already on the current site (Sam's own)
  [`${OLD}/framing-hero.jpg`, 'photos/framed-house-wasatch.jpg', 'photo'],
  [`${OLD}/sam-hero.jpg`, 'photos/sam-heidi-liam.jpg', 'photo'],
  [`${OLD}/parenting-1.jpg`, 'photos/family-easter.jpg', 'photo'],
  [`${OLD}/parenting-2.jpg`, 'photos/family-river.jpg', 'photo'],
  // Live listings (Zillow p_h files, small slots only until Sam sends MLS originals)
  [`${CONCEPT}/lehi-1714.jpg`, 'listings/1714-n-3870-w-lehi.jpg', 'listing'],
  [`${CONCEPT}/lehi-country.jpg`, 'listings/1872-s-country-ln-w-lehi.jpg', 'listing'],
  [`${CONCEPT}/stonehaven.jpg`, 'listings/1056-w-stonehaven-dr-nsl.jpg', 'listing'],
  // Past listings (from the current site)
  ...['cedar-hills', 'cedar-view', 'cosmos', 'lehi-1310', 'marrcrest', 'orem-1600', 'orem-900s', 'provo-1430', 'provo-1450', 'provo-300e', 'skyline'].map(
    (n) => [`${OLD}/listings/${n}.webp`, `listings/past-${n}.jpg`, 'listing'],
  ),
  // TEMP hero/map posters: the concept renders, neutral greyscale, until blender/ ships the real posters.
  [`${CONCEPT}/hero-golden.png`, 'posters/TEMP-concept-hero-golden-grey.jpg', 'poster'],
  [`${CONCEPT}/hero-blue.png`, 'posters/TEMP-concept-hero-blue-grey.jpg', 'poster'],
];

for (const [src, dest, kind] of JOBS) {
  if (!existsSync(src)) {
    console.warn(`skip (missing): ${src}`);
    continue;
  }
  const out = path.join(OUT, dest);
  await mkdir(path.dirname(out), { recursive: true });
  let img = sharp(src).rotate();
  if (kind === 'poster') {
    // Neutral greyscale: no warm cast. Gallery-white plaster, mid-grey lake.
    img = img.resize({ width: 2560, withoutEnlargement: true }).grayscale().linear(1.05, 6);
  } else if (kind === 'photo') {
    // SN Neutral: saturation −8, highlights −~6%, black point lifted to ~13.
    img = img.modulate({ saturation: 0.92 }).linear(0.95, 13);
  } else {
    // Listings: exposure/white balance only. Nothing that changes facts.
    // The old site's files carry black letterbox bars; trim them.
    img = sharp(await sharp(src).trim({ background: '#000000', threshold: 24 }).toBuffer()).linear(0.98, 4);
  }
  await img.jpeg({ quality: kind === 'poster' ? 88 : 90, mozjpeg: true }).toFile(out);
  const m = await sharp(out).metadata();
  console.log(`${dest}  ${m.width}×${m.height}`);
}
