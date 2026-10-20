/**
 * Sun position over Lehi (build brief §4.3). Port of SunCalc 1.9 getPosition
 * (c) 2011-2015 Vladimir Agafonkin, BSD-2-Clause. https://github.com/mourner/suncalc
 * Moon position/illumination arrive with the GL scene (TODO when the model lands).
 */
export const LEHI = { lat: 40.3916, lng: -111.8508 };

const rad = Math.PI / 180;
const dayMs = 86_400_000;
const J1970 = 2_440_588;
const J2000 = 2_451_545;
const e = rad * 23.4397;

const toDays = (ms: number) => ms / dayMs - 0.5 + J1970 - J2000;

function sunCoords(d: number) {
  const M = rad * (357.5291 + 0.98560028 * d);
  const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  const L = M + C + rad * 102.9372 + Math.PI;
  return {
    dec: Math.asin(Math.sin(e) * Math.sin(L)),
    ra: Math.atan2(Math.sin(L) * Math.cos(e), Math.cos(L)),
  };
}

/** altitude (rad, above horizon) and azimuth (rad, from south, positive toward west). */
export function sunPosition(ms: number, lat = LEHI.lat, lng = LEHI.lng) {
  const lw = rad * -lng;
  const phi = rad * lat;
  const d = toDays(ms);
  const c = sunCoords(d);
  const H = rad * (280.16 + 360.9856235 * d) - lw - c.ra;
  return {
    altitude: Math.asin(Math.sin(phi) * Math.sin(c.dec) + Math.cos(phi) * Math.cos(c.dec) * Math.cos(H)),
    azimuth: Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(c.dec) * Math.cos(phi)),
  };
}

export type SkyState = 'dawn' | 'noon' | 'golden' | 'blue' | 'night';

/** Poster bucket by altitude (deg) and azimuth sign (morning = east = negative azimuth). */
export function skyState(altDeg: number, azimuth: number): SkyState {
  if (altDeg < -6) return 'night';
  if (altDeg < 0) return 'blue';
  if (altDeg <= 10) return azimuth < 0 ? 'dawn' : 'golden';
  return 'noon';
}

/** Scene light direction (+x east, +y up, +z south). */
export function sunDirection(altitude: number, azimuth: number): [number, number, number] {
  const ch = Math.cos(altitude);
  return [-Math.sin(azimuth) * ch, Math.sin(altitude), Math.cos(azimuth) * ch];
}

/** "6:24 p.m." in Lehi time, whatever the visitor's time zone. */
export function lehiTime(ms: number) {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'America/Denver', hour: 'numeric', minute: '2-digit' })
    .format(ms)
    .replace(/\s?AM$/i, ' a.m.')
    .replace(/\s?PM$/i, ' p.m.');
}
