/**
 * Lat/lon → scene kilometres around GNIS Lehi (transverse Mercator, lon0 −111.8508, lat0 40.3916),
 * the same frame as blender/relief.py: +x east, north positive (scene z = −north).
 * Spherical tmerc with local WGS84 radii is within ~20 m of proj4's ellipsoidal one over this 100 km strip, which is
 * far below what the SVG map or a pin head can show.
 */
export const ORIGIN = { lat: 40.3916, lon: -111.8508 };
const rad = Math.PI / 180;
// WGS84 radii of curvature at lat0: meridional (M) for northings, prime vertical (N) for eastings.
const A = 6_378.137, E2 = 0.00669438;
const S2 = Math.sin(ORIGIN.lat * rad) ** 2;
const RN = A / Math.sqrt(1 - E2 * S2);
const RM = (A * (1 - E2)) / Math.pow(1 - E2 * S2, 1.5);

export function project(lat: number, lon: number) {
  const phi = lat * rad;
  const lam = (lon - ORIGIN.lon) * rad;
  const B = Math.cos(phi) * Math.sin(lam);
  const x = 0.5 * RN * Math.log((1 + B) / (1 - B));
  const y = RM * (Math.atan2(Math.tan(phi), Math.cos(lam)) - ORIGIN.lat * rad);
  return { x: +x.toFixed(3), north: +y.toFixed(3) };
}
