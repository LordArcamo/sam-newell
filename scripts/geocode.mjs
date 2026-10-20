// Geocodes src/data/homes.json with the US Census geocoder (public, no key) and caches
// the results in src/data/homes.geo.json. Unresolved addresses fail loudly and are skipped;
// they are never guessed. Run: node scripts/geocode.mjs
import { readFile, writeFile } from 'node:fs/promises';

const homes = JSON.parse(await readFile('src/data/homes.json', 'utf8')).homes;
const towns = JSON.parse(await readFile('src/data/towns.json', 'utf8'));
const TOWN_NAMES = Object.fromEntries(towns.map((t) => [t.slug, t.name]));
TOWN_NAMES['cedar-hills'] = 'Cedar Hills';

let cache = {};
try { cache = JSON.parse(await readFile('src/data/homes.geo.json', 'utf8')).points; } catch {}

const out = {};
let failed = 0;
for (const h of homes) {
  const q = `${h.address}, ${TOWN_NAMES[h.town] ?? h.town}, UT ${h.zip}`;
  if (cache[h.id]?.query === q) { out[h.id] = cache[h.id]; continue; }
  const url = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodeURIComponent(q)}&benchmark=Public_AR_Current&format=json`;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
    const j = await r.json();
    const m = j?.result?.addressMatches?.[0];
    if (!m) throw new Error('no match');
    out[h.id] = { query: q, lat: +m.coordinates.y.toFixed(6), lon: +m.coordinates.x.toFixed(6), matched: m.matchedAddress };
    console.log(`ok   ${q} -> ${m.matchedAddress}`);
  } catch (e) {
    failed++;
    console.error(`FAIL ${q}: ${e.message} (skipped; this home gets no pin)`);
  }
}
await writeFile('src/data/homes.geo.json', JSON.stringify({ source: 'US Census Geocoder, Public_AR_Current', fetched: new Date().toISOString().slice(0, 10), points: out }, null, 1) + '\n');
console.log(`${Object.keys(out).length} resolved, ${failed} unresolved`);
