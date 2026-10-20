import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REVIEWS } from '../data/reviews.ts';
import towns from '../data/towns.json' with { type: 'json' };
import { project } from './geo.ts';

test('every excerpt is a contiguous span of the verbatim review', () => {
  for (const r of REVIEWS) for (const [k, ex] of Object.entries(r.excerpts)) assert.ok(r.text.includes(ex), `#${r.n} ${k}`);
});

test('banned reviews never enter the set', () => {
  for (const n of [4, 14, 23]) assert.ok(!REVIEWS.some((r) => r.n === n), `#${n}`);
  for (const r of REVIEWS) assert.ok(!r.text.includes('??'), `#${r.n} has trailing ??`);
});

test('town reviews resolve', () => {
  for (const t of towns) if (t.review !== null) assert.ok(REVIEWS.some((r) => r.n === t.review), t.slug);
});

test('projection matches blender towns.json within 50 m', () => {
  // blender/data/towns.json (proj4 ellipsoidal tmerc)
  const ref = { 'north-salt-lake': [-4.7308, 50.7498], herriman: [-15.4415, 13.6188], 'american-fork': [4.6707, -1.6309] } as const;
  for (const t of towns) {
    const r = ref[t.slug as keyof typeof ref];
    if (!r) continue;
    const p = project(t.lat, t.lon);
    assert.ok(Math.hypot(p.x - r[0], p.north - r[1]) < 0.05, `${t.slug} ${p.x},${p.north}`);
  }
});
