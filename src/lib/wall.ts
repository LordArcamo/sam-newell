/**
 * A real wall section in elevation, laid out the way a framer lays it out: 2×6 lumber (1.5" face), studs at 16" on
 * centre, 8' plate height (bottom plate + 92⅝" precut studs + double top plate), one 36" window rough opening with
 * king and jack studs, a 2×10 header, a rough sill and cripples. Units are inches; SVG y runs down from the top plate.
 * One path per piece, in build order: plates → studs left to right → header → jacks → sill → cripples.
 */
export interface Piece { d: string; k: 'plate' | 'stud' | 'header' | 'jack' | 'sill' | 'cripple' | 'drywall' }

export const L = 144; // a 12' wall
export const T = 1.5; // 2× lumber face
export const H = T + 92.625 + 2 * T; // 97.125"
export const RO = { l: 46, r: 82, top: 82.5, sill: 42 }; // rough opening: 36" wide, header bottom 82.5", sill 42"
const studTop = T + 92.625;
const y = (h: number) => H - h; // inches above the floor → SVG y
const rect = (x: number, h0: number, w: number, hh: number) => `M${x} ${y(h0)}H${x + w}V${y(h0 + hh)}H${x}Z`;

export function wallPieces(withDrywall = false): Piece[] {
  const pieces: Piece[] = [];
  pieces.push({ k: 'plate', d: rect(0, 0, L, T) });
  pieces.push({ k: 'plate', d: rect(0, studTop, L, T) });
  pieces.push({ k: 'plate', d: rect(0, studTop + T, L, T) });
  const centres = [T / 2];
  for (let c = 16; c < L - T; c += 16) centres.push(c);
  centres.push(L - T / 2);
  const kings = [RO.l - 2 * T, RO.r + T];
  const studXs = centres.map((c) => c - T / 2).filter((x) => !(x + T > kings[0] - 0.01 && x < kings[1] + T + 0.01));
  for (const x of [...studXs, ...kings].sort((a, b) => a - b)) pieces.push({ k: 'stud', d: rect(x, T, T, 92.625) });
  pieces.push({ k: 'header', d: rect(RO.l - T, RO.top, RO.r - RO.l + 2 * T, 9.25) });
  pieces.push({ k: 'jack', d: rect(RO.l - T, T, T, RO.top - T) });
  pieces.push({ k: 'jack', d: rect(RO.r, T, T, RO.top - T) });
  pieces.push({ k: 'sill', d: rect(RO.l, RO.sill - T, RO.r - RO.l, T) });
  for (const c of centres) {
    const x = c - T / 2;
    if (x < RO.l || x + T > RO.r) continue;
    pieces.push({ k: 'cripple', d: rect(x, T, T, RO.sill - 2 * T) });
    pieces.push({ k: 'cripple', d: rect(x, RO.top + 9.25, T, studTop - RO.top - 9.25) });
  }
  // the finished face: the drywall line that hides all of it, with the window cut out
  if (withDrywall) {
    // ½" board on the face, drawn 2" proud of the frame so it reads as its own layer; the window stays cut out
    const o = 2;
    pieces.push({ k: 'drywall', d: `M${-o} ${y(-o)}H${L + o}V${y(H + o)}H${-o}Z M${RO.l} ${y(RO.sill)}H${RO.r}V${y(RO.top)}H${RO.l}Z` });
  }
  return pieces;
}
