/**
 * The lazy GL chunk's controller: one engine, one canvas, two mounts (hero, map), render loop, poster hand-off,
 * flights, watchdog, ?record and ?capture modes.
 */
import { gsap } from 'gsap';
import { Vector3, Vector2, PerspectiveCamera, Raycaster, Plane } from 'three';
import { Engine, RIGS, rigFor, camFromPose, MODEL_BOX, pinScaleFor, type Pose as CamPose, type PinData, type TownData, type Rig } from './relief';
import type { Tier } from './gpu';
import type { Pose, ReliefHandle } from './mount';
import posters from '../data/posters.json';

type Role = 'hero' | 'map';
interface View {
  el: HTMLElement;
  role: Role;
  visible: boolean;
  ratio: number;
  shown: boolean;
  cbs: (() => void)[];
  free?: () => { l: number; t: number; w: number; h: number };
}

const q = new URLSearchParams(location.search);
const RECORD = q.has('record');
const CAPTURE = q.get('capture'); // 'hero' | 'overview' (poster capture, dev only)
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
/** The map's light is fixed (dark at every hour), so its bearing is too: nearly north-up, so the frame lines up with
 *  the model's footprint and the overview can fill the stage without showing an edge. */
const MAP_BEARING = 188;
/** Resolve in an idle slot (or after 200 ms at the latest), so boot work never lands inside a scroll frame. */
const idle = () => new Promise<void>((r) => ('requestIdleCallback' in window ? requestIdleCallback(() => r(), { timeout: 200 }) : setTimeout(r, 16)));

export class Controller {
  tier: Tier;
  engine!: Engine;
  views = new Map<Role, View>();
  active: View | null = null;
  running = false;
  dead = false;
  mapPose!: CamPose;
  mapDirty = true;
  /** What the map is showing (re-fitted to the stage on resize). */
  mapGoal: Pose = 'overview';
  refit = true;
  flying = false;
  shadowKey = '';
  lastRig: Rig | null = null;
  t0 = performance.now();
  readyAt = 0;
  // watchdog
  wdStart = 0;
  wdFrames: number[] = [];
  wdBad = 0;
  wdFired = false;
  lastFrame = 0;

  constructor(tier: Tier) {
    this.tier = tier;
  }

  async init() {
    const json = document.querySelector('[data-map-json]')?.textContent;
    const data: { pins: PinData[]; towns: TownData[] } = json ? JSON.parse(json) : { pins: [], towns: [] };
    const tParam = q.get('t');
    const parsed = tParam ? Date.parse(tParam) : NaN;
    const timeOverride = Number.isFinite(parsed) ? parsed : RECORD || CAPTURE ? Date.parse('2026-10-21T17:45:00-06:00') : null; // = Base.astro boot default and the golden poster
    this.engine = new Engine({ tier: this.tier, pins: data.pins, towns: data.towns, record: RECORD || !!CAPTURE, timeOverride, onFallback: () => this.fallback() });
    await this.engine.load();
    const e = this.engine;
    this.mapPose = this.overviewPose();
    // pre-compile every shader before the intro
    e.setView(e.heroPose('desktop'), 1280, 720, RIGS.desktop);
    await e.renderer.compileAsync(e.scene, e.camera);
    // warm the map exactly as it will first draw (jury r3 P1-5: a 133 ms first frame at the hand-off): night state,
    // a route (its line program), textures uploaded, the depth pass and one real render, each in its own idle slot
    await idle();
    e.setReading(true);
    const warm = this.overviewPose();
    e.setView(warm, 640, 400, null);
    e.setRoute('provo', 640, 400);
    e.drawRoute(1);
    await idle();
    await e.prewarm();
    await idle();
    e.fitShadow(new Vector3(warm.tx, 0.5, warm.tz), 45);
    e.render();
    e.setRoute(null, 640, 400);
    e.setReading(false);
    if (!RECORD && !CAPTURE) setInterval(() => this.relight(), 60_000);
    document.addEventListener('visibilitychange', () => this.kick());
    addEventListener('resize', () => { this.mapDirty = true; this.refit = true; this.kick(); });
    addEventListener('scroll', () => this.kick(), { passive: true });
    if (CAPTURE) this.capture();
  }

  relight() {
    this.engine.relight(this.engine.now());
    this.engine.setReading(this.active?.role === 'map');
    this.shadowKey = '';
    this.mapDirty = true;
    this.kick();
  }

  overviewPose(): CamPose {
    // design review #4: an oblique close-up, plinth edges outside the frame, on the hero's bearing
    return { tx: 1.0, ty: 0.4, tz: -6.0, dist: 92, bearing: MAP_BEARING, elev: 38, vfov: 19.5 };
  }

  townPose(target: Vector3): CamPose {
    return { tx: target.x, ty: target.y, tz: target.z, dist: 26, bearing: MAP_BEARING, elev: 30, vfov: 16 };
  }

  /**
   * The map's camera for a goal, fitted to the stage as it is now (any aspect, 0.7 to 2.4): the distance is the
   * smallest at which every pin head (at its on-screen scale), the town and, where it belongs, the SN home pin sit
   * inside the free area. Nothing clips the top, nothing looms in the foreground (user test, 1000×540).
   */
  poseFor(goal: Pose): CamPose {
    const e = this.engine;
    if (goal === 'overview' || goal === 'hero') {
      // the overview looks at the middle of Sam's homes (Utah County) and never past the model's edge: the stage's
      // corners must land on terrain, so no cut edge and no void shows (jury r2: the wedge, the pin in the black)
      const pts = this.framePoints(null);
      const xs = pts.map((q) => q.p.x), zs = pts.map((q) => q.p.z);
      const c = { x: (Math.min(...xs) + Math.max(...xs)) / 2, z: (Math.min(...zs) + Math.max(...zs)) / 2 };
      const base = { ...this.overviewPose(), tx: c.x, tz: c.z, elev: 66 };
      return this.fit(base, null, 40, 170, true);
    }
    const slug = 'town' in goal ? goal.town : e.opts.pins.find((x) => x.id === goal.home)?.town;
    const f = slug ? e.townFrame(slug) : null;
    return this.fit(this.townPose(f?.center ?? new Vector3()), slug ?? null, 18, 110, 'nudge');
  }

  /** Ground points + how tall the marker standing there is (pins scale with distance, see tick). */
  framePoints(slug: string | null) {
    const e = this.engine;
    const pts: { p: Vector3; h: number; pin: boolean }[] = [];
    // the overview frames the Utah County end of the valley (North Salt Lake is a town flight of its own)
    const pins = e.opts.pins.filter((x) => (slug ? x.town === slug : x.y > -30));
    for (const x of pins) {
      const g = e.pinRoots.get(x.id);
      if (g) pts.push({ p: g.position.clone(), h: 1.05, pin: true });
    }
    if (slug) {
      const t = e.townTarget(slug);
      if (t) pts.push({ p: t, h: 0.3, pin: false });
    }
    // the SN home pin: always in the overview; in a town only when it stands among that town's pins
    const sn = e.snPin?.position.clone();
    if (sn) {
      const near = pts.length && pts.some((q) => Math.hypot(q.p.x - sn.x, q.p.z - sn.z) < 4);
      if (!slug || slug === 'lehi' || near) pts.push({ p: sn, h: 2.7, pin: false });
    }
    return pts;
  }

  /**
   * onMesh: the stage's corners must land on terrain. true (overview): shorten the distance and slide the aim east or
   * west until they do. 'nudge' (towns): keep the distance that frames the pins and slide the aim (up to 6 km) inward
   * from a model edge, if a slide exists that still keeps every pin in frame (North Salt Lake sits near the edge).
   */
  fit(base: CamPose, slug: string | null, minD: number, maxD: number, onMesh: boolean | 'nudge' = false): CamPose {
    const v = this.views.get('map');
    const W = v?.el.clientWidth || innerWidth, H = v?.el.clientHeight || innerHeight;
    const fr = v?.free?.() ?? { l: 0, t: 0, w: W, h: H };
    const pts = this.framePoints(slug);
    if (!pts.length || !W || !H) return base;
    const cam = new PerspectiveCamera(base.vfov, W / H, 0.5, 900);
    const tmp = new Vector3();
    const ok = (d: number) => {
      const pose = { ...base, dist: d };
      camFromPose(cam, pose);
      cam.aspect = W / H;
      cam.setViewOffset(W, H, W / 2 - (fr.l + fr.w / 2), H / 2 - (fr.t + fr.h / 2), W, H);
      cam.updateMatrixWorld();
      const tn = Math.tan((base.vfov * Math.PI) / 360);
      return pts.every(({ p, h, pin }) => {
        // the same screen-space pin size as the render (Engine.sizePins)
        const k = pin ? pinScaleFor(H / (2 * Math.max(1, cam.position.distanceTo(p)) * tn)) : 1;
        for (const y of [0, k * h]) {
          tmp.set(p.x, p.y + y, p.z).project(cam);
          const x = ((tmp.x + 1) / 2) * W, yy = ((1 - tmp.y) / 2) * H;
          // 18 px inside the free area: a pin head is ~12–20 px across, its centre must not sit on the edge
          if (tmp.z >= 1 || x < fr.l + 18 || x > fr.l + fr.w - 18 || yy < fr.t || yy > fr.t + fr.h) return false;
        }
        return true;
      });
    };
    let d = maxD;
    if (ok(minD)) d = minD;
    else if (ok(maxD)) {
      let lo = minD, hi = maxD;
      for (let i = 0; i < 18; i++) {
        const mid = (lo + hi) / 2;
        if (ok(mid)) hi = mid; else lo = mid;
      }
      d = hi;
    }
    if (onMesh) {
      // the farthest distance at which all four stage corners still hit the ground 3 km inside the footprint
      const B = MODEL_BOX, m = 0.5;
      const ray = new Raycaster();
      const ground = new Plane(new Vector3(0, 1, 0), 0);
      const hit = new Vector3();
      const inside = (dd: number, dx = 0) => {
        camFromPose(cam, { ...base, tx: base.tx + dx, dist: dd });
        cam.aspect = W / H;
        cam.setViewOffset(W, H, W / 2 - (fr.l + fr.w / 2), H / 2 - (fr.t + fr.h / 2), W, H);
        cam.updateMatrixWorld();
        return [[-1, -1], [1, -1], [-1, 1], [1, 1]].every(([x, y]) => {
          ray.setFromCamera(new Vector2(x, y), cam);
          if (!ray.ray.intersectPlane(ground, hit)) return false;
          return hit.x > B.min.x + m && hit.x < B.max.x - m && hit.z > B.min.z + m && hit.z < B.max.z - m;
        });
      };
      if (onMesh === 'nudge') {
        if (inside(d)) return { ...base, dist: d };
        const fits = (dx: number, dz: number) => {
          const sv = { tx: base.tx, tz: base.tz };
          base.tx += dx; base.tz += dz;
          const good = ok(d) && inside(d);
          base.tx = sv.tx; base.tz = sv.tz;
          return good;
        };
        let best: { dx: number; dz: number } | null = null;
        for (let dx = -6; dx <= 6; dx += 1.5) for (let dz = -6; dz <= 6; dz += 1.5) {
          if ((!best || Math.hypot(dx, dz) < Math.hypot(best.dx, best.dz)) && fits(dx, dz)) best = { dx, dz };
        }
        return best ? { ...base, tx: base.tx + best.dx, tz: base.tz + best.dz, dist: d } : { ...base, dist: d };
      }
      if (!inside(d)) {
        // slide the aim east or west (up to 6 km) to wherever the footprint leaves the most room, then back off
        const most = (dx: number) => {
          let lo = 20, hi = d;
          for (let i = 0; i < 14; i++) {
            const mid = (lo + hi) / 2;
            if (inside(mid, dx)) lo = mid; else hi = mid;
          }
          return lo;
        };
        let best = { dx: 0, d: most(0) };
        for (let dx = -6; dx <= 6; dx += 1) {
          const dd = most(dx);
          if (dd > best.d + 0.01) best = { dx, d: dd };
        }
        return { ...base, tx: base.tx + best.dx, dist: best.d };
      }
    }
    return { ...base, dist: d };
  }

  attach(el: HTMLElement, role: Role): ReliefHandle {
    const v: View = { el, role, visible: false, ratio: 0, shown: false, cbs: [] };
    this.views.set(role, v);
    if (role === 'map') idle().then(() => idle()).then(() => this.warmView(v));
    const io = new IntersectionObserver(
      (es) => {
        for (const x of es) { v.visible = x.isIntersecting; v.ratio = x.intersectionRatio; }
        this.pick();
      },
      { threshold: [0, 0.05, 0.25, 0.5, 0.75, 1] },
    );
    io.observe(el);
    const self = this;
    return {
      tier: this.tier,
      fly: (p: Pose) => self.fly(p),
      project: (id: string) => {
        if (self.active !== v || self.dead) return null;
        return self.engine.project(id, el.clientWidth, el.clientHeight);
      },
      onFrame: (cb) => v.cbs.push(cb),
      setFree: (fn) => { v.free = fn; self.mapDirty = true; self.refit = true; self.kick(); },
      dispose: () => self.fallback(),
    };
  }

  /**
   * Before the map is on screen: put the canvas in its stage at its real size and draw one full frame there (opacity
   * 0), so the drawing buffer, the sun depth pass and the first composite are paid in idle time, not in the scroll frame
   * that brings the map in (jury r3 P1-5).
   */
  warmView(v: View) {
    if (this.dead || this.active || !v.free) return;
    const e = this.engine;
    const W = v.el.clientWidth, H = v.el.clientHeight;
    if (!W || !H) return;
    v.el.appendChild(e.canvas);
    e.renderer.setSize(W, H, false);
    e.setReading(true);
    (e.scene.background as import('three').Color).setHex(0x0a0a0a);
    this.mapPose = this.poseFor(this.mapGoal);
    this.refit = false;
    const f = v.free();
    e.setView(this.mapPose, W, H, null, { cx: f.l + f.w / 2, cy: f.t + f.h / 2 });
    e.sizePins(H);
    e.routeMat?.resolution.set(W, H);
    e.fitShadow(new Vector3(this.mapPose.tx, 0.5, this.mapPose.tz), this.mapPose.dist > 60 ? 45 : 14);
    e.render();
    this.mapDirty = true;
  }

  pick() {
    let best: View | null = null;
    for (const v of this.views.values()) if (v.visible && (!best || v.ratio > best.ratio)) best = v;
    if (best && best !== this.active) {
      this.active = best;
      this.engine.setReading(best.role === 'map');
      if (best.role === 'hero') this.engine.pinScale(1);
      const c = this.engine.canvas;
      c.classList.remove('on');
      best.el.appendChild(c);
      best.shown = false;
      this.mapDirty = true;
      this.shadowKey = '';
    }
    this.kick();
  }

  kick() {
    if (CAPTURE || this.running || this.dead || !this.active || !this.active.visible || document.hidden) return;
    this.running = true;
    this.lastFrame = performance.now();
    requestAnimationFrame(this.tick);
  }

  tick = (now: number) => {
    if (this.dead) return;
    const v = this.active;
    if (!v || !v.visible || document.hidden) {
      this.running = false;
      return;
    }
    const W = v.el.clientWidth, H = v.el.clientHeight;
    const e = this.engine;
    const cv = e.renderer.domElement;
    if (cv.width !== Math.round(W * e.renderer.getPixelRatio()) || cv.height !== Math.round(H * e.renderer.getPixelRatio())) {
      e.renderer.setSize(W, H, false);
      this.mapDirty = true;
    }
    let drew = false;
    // the map sits on the tone ground (like the SVG plinth); the hero on the void of the sky state
    const bg = v.role === 'map' ? 0x0a0a0a : e.look.voidc; // Lehi Light: the relief always sits on black
    if ((e.scene.background as import('three').Color | null)?.getHex() !== bg) (e.scene.background as import('three').Color).setHex(bg);
    if (v.role === 'hero') {
      const rig = rigFor(innerWidth / innerHeight);
      // start on the poster's bearing (identical geometry for the hand-off), then ease over ~6 s to the bearing the
      // live sun asks for (camera-follows-sun rule), so the light never goes flat when the bucket and the sun differ
      const pb = this.posterBearing(rig);
      const since = this.readyAt ? (now - this.readyAt) / 1000 : 0;
      const k = pb === undefined ? 1 : Math.min(1, Math.max(0, (since - 1.4) / 6));
      const ease = k * k * (3 - 2 * k);
      const pose = e.heroPose(rig, pb === undefined ? e.bearing : pb + (e.bearing - pb) * ease);
      const r = v.el.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height)));
      // drift ±0.6° on a 20 s sine, starting only after the hand-off so the crossfade frame matches the poster
      const t = RECORD ? e.frame / 60 : this.readyAt ? (now - this.readyAt) / 1000 : 0;
      if (!reduce && innerWidth >= 1024 && t > 1.5) pose.bearing += 0.6 * Math.sin(((t - 1.5) / 20) * Math.PI * 2);
      // scroll dolly, applied after the composition so it really moves in
      const dolly = (q: CamPose): CamPose => (reduce ? q : { ...q, dist: q.dist * (1 - (innerWidth < 768 ? 0.1 : 0.14) * p), elev: q.elev + 3 * p });
      const key = `hero:${rig}:${e.state}`;
      if (key !== this.shadowKey) {
        e.fitShadow(new Vector3(pose.tx, 0.5, pose.tz), 38);
        this.shadowKey = key;
      }
      e.setView(pose, W, H, RIGS[rig], undefined, dolly);
      e.occlude(this.titleBox(v), reduce || !v.shown ? 1 : Math.min(1, (now - this.lastFrame) / 200));
      e.render();
      drew = true;
    } else if (this.mapDirty || this.flying || this.refit) {
      if (this.refit && !this.flying) {
        this.mapPose = this.poseFor(this.mapGoal);
        this.refit = false;
      }
      const f = v.free?.();
      const shift = f ? { cx: f.l + f.w / 2, cy: f.t + f.h / 2 } : undefined;
      const pose = { ...this.mapPose };
      // pins never shrink below a ~10 px head on screen (design review #4)
      const key = `map:${pose.tx.toFixed(1)}:${pose.tz.toFixed(1)}:${e.state}:${e.reading}`;
      if (key !== this.shadowKey && (!this.flying || e.frame % 6 === 0)) {
        e.fitShadow(new Vector3(pose.tx, 0.5, pose.tz), pose.dist > 60 ? 45 : 14);
        this.shadowKey = key;
      }
      e.setView(pose, W, H, null, shift);
      e.sizePins(H);
      e.routeMat?.resolution.set(W, H);
      e.occlude(null, 1);
      e.render();
      drew = true;
      this.mapDirty = false;
    }
    if (drew) {
      v.cbs.forEach((cb) => cb());
      if (!v.shown) {
        v.shown = true;
        // two warm frames, then the canvas crossfades over the poster with the identical crop
        requestAnimationFrame(() => requestAnimationFrame(() => {
          if (this.dead) return;
          e.canvas.classList.add('on');
          if (!this.readyAt) this.readyAt = performance.now();
          if (v.role === 'hero') setTimeout(() => this.checkTitle(v), 1300);
        }));
      }
    }
    this.watchdog(now, v.role === 'hero' || this.flying);
    this.lastFrame = now;
    requestAnimationFrame(this.tick);
  };

  /** The hero title's box in fractions of the canvas, padded 16 px. */
  titleBox(v: View): [number, number, number, number] | null {
    const title = v.el.closest('[data-hero]')?.querySelector<HTMLElement>('.title');
    if (!title) return null;
    const c = v.el.getBoundingClientRect();
    const r = title.getBoundingClientRect();
    if (!c.width || !c.height) return null;
    return [(r.left - 16 - c.left) / c.width, (r.top - 16 - c.top) / c.height, (r.right + 16 - c.left) / c.width, (r.bottom + 16 - c.top) / c.height];
  }

  /** The hero keeps its poster's bearing (identical geometry for the hand-off); only the light is live. */
  posterBearing(rig: Rig): number | undefined {
    if (CAPTURE) return undefined; // ?record uses the bucket bearing exactly like a visit: no double image
    const st = document.documentElement.dataset.sun as keyof (typeof posters.rigs)['desktop'] | undefined;
    return st ? posters.rigs[rig]?.[st]?.bearing : undefined;
  }

  /** I-1 safety: if the title's 5th-percentile contrast over the live frame drops below 3:1, show its plate. */
  checkTitle(v: View) {
    const title = v.el.closest('[data-hero]')?.querySelector<HTMLElement>('.title');
    if (!title || this.dead || this.active !== v) return;
    const e = this.engine;
    const cr = e.canvas.getBoundingClientRect();
    const tr = title.getBoundingClientRect();
    const dpr = e.renderer.getPixelRatio();
    const x = Math.max(0, Math.round((tr.left - cr.left) * dpr));
    const w = Math.max(1, Math.min(Math.round(tr.width * dpr), e.canvas.width - x));
    const yTop = Math.max(0, Math.round((tr.top - cr.top) * dpr));
    const h = Math.max(1, Math.min(Math.round(tr.height * dpr), e.canvas.height - yTop));
    const gl = e.renderer.getContext();
    e.render();
    const px = new Uint8Array(w * h * 4);
    gl.readPixels(x, e.canvas.height - yTop - h, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const lum: number[] = [];
    const lin = (c: number) => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
    for (let i = 0; i < px.length; i += 4 * 7) lum.push(0.2126 * lin(px[i]) + 0.7152 * lin(px[i + 1]) + 0.0722 * lin(px[i + 2]));
    lum.sort((a, b) => a - b);
    const l5 = lum[Math.floor(lum.length * 0.05)] ?? 1;
    const contrast = (l5 + 0.05) / (0.003 + 0.05);
    // display type at ~219 px: WCAG large-text 3:1 applies (design review #1)
    title.closest('[data-hero]')!.classList.toggle('plate', contrast < 3 && e.state !== 'night');
  }

  watchdog(now: number, measuring: boolean) {
    if (this.wdFired || RECORD || CAPTURE || !this.readyAt || now - this.readyAt < 3000 || !measuring || document.hidden) {
      this.wdStart = 0;
      this.wdFrames = [];
      return;
    }
    const dt = now - this.lastFrame;
    if (!this.wdStart) this.wdStart = now;
    this.wdFrames.push(dt);
    if (now - this.wdStart < 4000) return;
    const f = this.wdFrames.slice().sort((a, b) => a - b);
    const avgFps = 1000 / (f.reduce((s, x) => s + x, 0) / f.length);
    const med = f[Math.floor(f.length / 2)];
    const spread = f[Math.floor(f.length * 0.9)] - f[Math.floor(f.length * 0.1)];
    const capped30 = Math.abs(med - 33.3) < 2 && spread < 6;
    this.wdBad = avgFps < 24 && !capped30 ? this.wdBad + 1 : 0;
    this.wdStart = now;
    this.wdFrames = [];
    if (this.wdBad >= 2) {
      this.wdFired = true;
      this.fallback();
    }
  }

  /** Once only: stop the loop, drop GL, keep the scroll position, back to posters + SVG map. */
  fallback() {
    if (this.dead) return;
    this.dead = true;
    const y = scrollY;
    const lenis = (window as unknown as { __lenis?: { destroy(): void } }).__lenis;
    lenis?.destroy();
    (window as unknown as { __lenis?: unknown }).__lenis = undefined;
    document.documentElement.classList.remove('lenis', 'lenis-smooth');
    this.engine.dispose();
    document.documentElement.dataset.gl = 'off';
    dispatchEvent(new CustomEvent('relief:fallback'));
    scrollTo(0, y);
  }

  fly(p: Pose): Promise<void> {
    if (this.dead) return Promise.resolve();
    // a picked home flies to its town's frame (the pin and its row light up); every goal is fitted to the stage
    this.mapGoal = p;
    const dest = this.poseFor(p);
    // V5: the route draws on with the flight (0.12 s in, 0.9 s), draped on the terrain; overview takes it away
    const e = this.engine;
    const to = p === 'overview' || p === 'hero' ? null : 'town' in p ? p.town : e.opts.pins.find((x) => x.id === p.home)?.town ?? null;
    if (to !== e.routeTo) {
      const v = this.views.get('map');
      e.setRoute(to, v?.el.clientWidth || innerWidth, v?.el.clientHeight || innerHeight);
      const r = { k: 0 };
      if (reduce) e.drawRoute(1);
      else gsap.to(r, { k: 1, duration: 0.9, delay: 0.12, ease: 'power1.inOut', onUpdate: () => { e.drawRoute(r.k); this.mapDirty = true; this.kick(); } });
    }
    const from = { ...this.mapPose };
    let db = ((dest.bearing - from.bearing + 540) % 360) - 180;
    db = Math.max(-45, Math.min(45, db));
    const travel = Math.hypot(dest.tx - from.tx, dest.tz - from.tz);
    if (reduce) {
      this.mapPose = dest;
      this.mapDirty = true;
      this.kick();
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const k = { t: 0 };
      this.flying = true;
      this.kick();
      gsap.to(k, {
        t: 1,
        duration: 1.1,
        ease: 'power2.inOut',
        onUpdate: () => {
          const t = k.t;
          const lead = Math.min(1, t * 1.12); // the target arrives first, the position settles ~120 ms later
          const lerp = (a: number, b: number, x: number) => a + (b - a) * x;
          this.mapPose = {
            tx: lerp(from.tx, dest.tx, lead), ty: lerp(from.ty, dest.ty, lead), tz: lerp(from.tz, dest.tz, lead),
            dist: lerp(from.dist, dest.dist, t) * (1 + (travel > 4 ? 0.15 : 0.05) * Math.sin(Math.PI * t)),
            bearing: from.bearing + db * t, elev: lerp(from.elev, dest.elev, t), vfov: lerp(from.vfov, dest.vfov, t),
          };
        },
        onComplete: () => {
          this.flying = false;
          this.mapPose = { ...dest, bearing: from.bearing + db };
          this.mapDirty = true;
          this.shadowKey = '';
          this.kick();
          resolve();
        },
      });
    });
  }

  /** ?capture=hero&rig=desktop&t=ISO → window.__capture = { png, sn }  (dev tool for posters). */
  capture() {
    const e = this.engine;
    const rig = (q.get('rig') as Rig) || 'desktop';
    const ref = RIGS[rig];
    const size = CAPTURE === 'overview' ? { w: 2560, h: 1440 } : { w: ref.w, h: ref.h };
    e.renderer.setPixelRatio(1);
    e.renderer.setSize(size.w, size.h, false);
    let pose: CamPose;
    if (CAPTURE === 'overview') {
      pose = { ...this.overviewPose(), dist: 190, bearing: 200, elev: 50 };
      e.fitShadow(new Vector3(pose.tx, 0.5, pose.tz), 60);
      e.setView(pose, size.w, size.h, null);
      e.occlude(null, 1);
    } else {
      pose = e.heroPose(rig);
      e.fitShadow(new Vector3(pose.tx, 0.5, pose.tz), 38);
      e.setView(pose, ref.w, ref.h, ref);
      const t = ref.title;
      e.occlude([t[0] - 0.01, t[1] - 0.02, t[2] + 0.01, t[3] + 0.02], 1);
    }
    e.render();
    e.render();
    const sn = e.project('sn', size.w, size.h);
    (window as unknown as { __capture: unknown }).__capture = {
      png: e.canvas.toDataURL('image/png'),
      sn: sn ? { fx: sn.x / size.w, fy: sn.y / size.h } : null,
      state: e.state,
      bearing: e.bearing,
    };
  }
}
