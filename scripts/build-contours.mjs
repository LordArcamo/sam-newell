// Builds the no-GPU SVG relief map data (build brief §6) from the model's own DEM products:
//   blender/dem/contours.geojson  (100 m contours, USGS 3DEP, public domain; read-only input)
//   scripts/data/lakes.geojson    (shorelines at 1368.5 m / 1281.5 m from the same DEM)
// Output: src/data/map-geo.json (paths in km, x east, y = −north, origin GNIS Lehi).
// Run: npm run contours
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const C = process.env.SN_CLIENT_DIR || path.join(os.homedir(), 'Projects/fazed-3d-sites/clients/sam-newell');
const contours = JSON.parse(await readFile(path.join(C, 'blender/dem/contours.geojson'), 'utf8'));
const lakes = JSON.parse(await readFile('scripts/data/lakes.geojson', 'utf8'));

const TOL = 0.1; // km
const toKm = ([x, y]) => [x / 1000, -y / 1000];

function dp(pts, tol) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1e-9;
    let max = 0, idx = -1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / L;
      if (d > max) { max = d; idx = i; }
    }
    if (max > tol && idx > 0) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
const len = (pts) => pts.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0);
const d = (pts, close) => 'M' + pts.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join('L') + (close ? 'Z' : '');

const lines = { minor: [], index: [] };
let n = 0;
for (const f of contours.features) {
  const elev = f.properties.elev_m;
  const pts = dp(f.geometry.coordinates.map(toKm), TOL);
  if (len(pts) < 1.6) continue;
  (elev % 500 === 0 ? lines.index : lines.minor).push(d(pts));
  n += pts.length;
}

const lakePaths = {};
for (const f of lakes.features) {
  let pts = dp(f.geometry.coordinates.map(toKm), 0.05);
  if (f.properties.name === 'great-salt-lake') pts = [...pts, [-20.97, -56.43]]; // close on the NW corner
  lakePaths[f.properties.name] = d(pts, true);
}

const out = {
  source: 'USGS 3DEP 1/3 arc-second (public domain), 100 m contours; tmerc km around GNIS Lehi',
  bounds: { x0: -20.97, x1: 25.35, y0: -56.43, y1: 41.19 },
  minor: lines.minor.join(''),
  index: lines.index.join(''),
  lakes: lakePaths,
};
await writeFile('src/data/map-geo.json', JSON.stringify(out));
const kb = (Buffer.byteLength(JSON.stringify(out)) / 1024).toFixed(0);
console.log(`map-geo.json: ${lines.minor.length + lines.index.length} contours, ${n} points, ${kb} KB`);
