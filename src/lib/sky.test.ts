import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sunPosition, skyState, lehiTime, sunDirection } from './sky.ts';

const deg = (r: number) => (r * 180) / Math.PI;

test('2026-10-21 18:20 MDT: low western sun (bible: h≈4°, A≈75° from south toward west)', () => {
  const p = sunPosition(Date.parse('2026-10-21T18:20:00-06:00'));
  assert.ok(Math.abs(deg(p.altitude) - 4) < 2.5, `alt ${deg(p.altitude)}`);
  assert.ok(Math.abs(deg(p.azimuth) - 75) < 4, `az ${deg(p.azimuth)}`);
  assert.equal(skyState(deg(p.altitude), p.azimuth), 'golden');
});

test('solar noon ≈ 13:12 MDT: azimuth ≈ 0, altitude ≈ 39° (NOAA: 38.9°)', () => {
  const p = sunPosition(Date.parse('2026-10-21T13:12:00-06:00'));
  assert.ok(Math.abs(deg(p.azimuth)) < 2, `az ${deg(p.azimuth)}`);
  assert.ok(Math.abs(deg(p.altitude) - 38.9) < 1, `alt ${deg(p.altitude)}`);
});

test('states', () => {
  assert.equal(skyState(-12, 0), 'night');
  assert.equal(skyState(-3, 1), 'blue');
  assert.equal(skyState(5, -1), 'dawn');
  assert.equal(skyState(40, 0), 'noon');
});

test('caption uses Lehi time with lower-case a.m./p.m.', () => {
  assert.equal(lehiTime(Date.parse('2026-10-21T18:24:00-06:00')), '6:24 p.m.');
  assert.equal(lehiTime(Date.parse('2026-10-21T07:02:00-06:00')), '7:02 a.m.');
});

test('direction is a unit vector pointing up at noon', () => {
  const p = sunPosition(Date.parse('2026-10-21T13:12:00-06:00'));
  const v = sunDirection(p.altitude, p.azimuth);
  assert.ok(Math.abs(Math.hypot(...v) - 1) < 1e-9);
  assert.ok(v[1] > 0.6 && v[2] > 0.7, 'south and up');
});
