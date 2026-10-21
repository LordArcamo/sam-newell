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
const HI = path.join(C, 'assets-gen/instagram/hires'); // IG originals up to 4096 px (The Hunter, 2026-10-21)

// [source, destination (relative to src/assets), kind]
const JOBS = [
  // Sam's Instagram (only the frames the visual bible clears; consent rules in the brief §8)
  [`${HI}/01-sam-portrait-polo-staged-room-2026-10.jpg`, 'photos/sam-portrait-2026-10.jpg', 'photo'],
  [`${IG}/03-sam-office-market-update-2026-02.jpg`, 'photos/sam-office-2026-02.jpg', 'photo'],
  [`${IG}/08-listing-kitchen-interior-lehi-saratoga-2026-05.jpg`, 'photos/listing-kitchen-2026-05.jpg', 'photo'],
  [`${IG}/11-wasatch-estate-lots-jordan-river-2026-07.jpg`, 'photos/estate-lots-jordan-river.jpg', 'photo'],
  [`${IG}/12-wasatch-valley-view-road-2026-08.jpg`, 'photos/valley-view-utah-county.jpg', 'photo'],
  [`${HI}/15-framing-house-exterior-blue-sky-2026-06-s1.jpg`, 'photos/framing-custom-home.jpg', 'photo'],
  [`${IG}/16-framing-park-city-sam-mountains-2026-02.jpg`, 'photos/framing-park-city-sam.jpg', 'photo'],
  [`${IG}/17-framing-provo-riverbottoms-sam-2026-08.jpg`, 'photos/framing-provo-sam.jpg', 'photo'],
  [`${HI}/18-podcast-interview-room-sam-2023-01.jpg`, 'photos/podcast-studio.jpg', 'photo'],
  [`${IG}/20-family-brighton-fall-sam-kids-2026-10.jpg`, 'photos/family-brighton-2026-10.jpg', 'photo'],
  [`${HI}/22-family-kenai-river-alaska-2026-07.jpg`, 'photos/family-kenai-sockeye.jpg', 'photo'],
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
  // PREMIUM (Lehi Light): Sam's own Wasatch sunset (IG 13, approved as the hero still) and the full-size
  // listing galleries The Hunter fetched (assets-gen/listings, 1536 px).
  [`${HI}/13-wasatch-sunset-good-morning-utah-2026-06.jpg`, 'photos/wasatch-dusk.jpg', 'film'],
  [`${C}/assets-gen/listings/1872-s-country-ln-w-lehi/01.jpg`, 'listings/full-1872-twilight.jpg', 'full'],
  [`${C}/assets-gen/listings/1872-s-country-ln-w-lehi/11.jpg`, 'listings/full-1872-twilight-2.jpg', 'full'],
  [`${C}/assets-gen/listings/1872-s-country-ln-w-lehi/03.jpg`, 'listings/full-1872-aerial-dusk.jpg', 'full'],
  [`${C}/assets-gen/listings/1872-s-country-ln-w-lehi/09.jpg`, 'listings/full-1872-deck.jpg', 'full'],
  [`${C}/assets-gen/listings/1872-s-country-ln-w-lehi/70.jpg`, 'listings/full-1872-twilight-front.jpg', 'full'],
  [`${C}/assets-gen/listings/1872-s-country-ln-w-lehi/71.jpg`, 'listings/full-1872-drone-wasatch.jpg', 'full'],
  [`${C}/assets-gen/listings/1872-s-country-ln-w-lehi/69.jpg`, 'listings/full-1872-twilight-rear.jpg', 'full'],
  [`${C}/assets-gen/listings/1056-w-stonehaven-dr-north-salt-lake/30.jpg`, 'listings/full-1056-exterior.jpg', 'full'],
  [`${C}/assets-gen/listings/1056-w-stonehaven-dr-north-salt-lake/34.jpg`, 'listings/full-1056-aerial.jpg', 'full'],
  [`${C}/assets-gen/listings/1714-n-3870-w-lehi/04.jpg`, 'listings/full-1714-kitchen.jpg', 'full'],
  [`${C}/assets-gen/listings/1714-n-3870-w-lehi/29.jpg`, 'listings/full-1714-exterior.jpg', 'full'],
  [`${C}/assets-gen/listings/sold-3627-w-2330-n-lehi/01.jpg`, 'listings/full-2330-exterior.jpg', 'full'],
  // Hero/overview posters are NOT made here: scripts/capture-posters.mjs captures them from the live renderer.
];

for (const [src, dest, kind] of JOBS) {
  if (process.argv[2] && !dest.includes(process.argv[2])) continue;
  if (!existsSync(src)) {
    console.warn(`skip (missing): ${src}`);
    continue;
  }
  const out = path.join(OUT, dest);
  await mkdir(path.dirname(out), { recursive: true });
  let img = sharp(src).rotate().resize({ width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true });
  if (kind === 'poster') {
    // Neutral greyscale: no warm cast. Gallery-white plaster, mid-grey lake.
    img = img.resize({ width: 2560, withoutEnlargement: true }).grayscale().linear(1.05, 6);
  } else if (kind === 'film') {
    // a light film grade for the dark hero: deeper blacks, a touch less saturation, soft highlight roll-off
    img = img.modulate({ saturation: 0.94 }).linear(1.06, -8);
  } else if (kind === 'full') {
    // full listing originals: exposure only, nothing that changes facts
    img = img.linear(1.0, 0);
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

// Square crop of the Brighton photo for the /about/ hero (a light LCP image on phones).
await sharp(path.join(OUT, 'photos/family-brighton-2026-10.jpg')).extract({ left: 0, top: 330, width: 1080, height: 1080 })
  .jpeg({ quality: 88, mozjpeg: true }).toFile(path.join(OUT, 'photos/family-brighton-2026-10-square.jpg'));
