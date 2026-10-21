/**
 * The lazy GL chunk's controller: one engine, one canvas, two mounts (hero, map), render loop, poster hand-off,
 * flights, watchdog, ?record and ?capture modes.
 */
import { gsap } from 'gsap';
import { Vector3 } from 'three';
import { Engine, RIGS, rigFor, type Pose as CamPose, type PinData, type TownData, type Rig } from './relief';
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

export class Controller {
  tier: Tier;
  engine!: Engine;
  views = new Map<Role, View>();
  active: View | null = null;
  running = false;
  dead = false;
  mapPose!: CamPose;
  mapDirty = true;
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
    const timeOverride = Number.isFinite(parsed) ? parsed : RECORD || CAPTURE ? Date.parse('2026-10-21T17:35:00-06:00') : null;
    this.engine = new Engine({ tier: this.tier, pins: data.pins, towns: data.towns, record: RECORD || !!CAPTURE, timeOverride, onFallback: () => this.fallback() });
    await this.engine.load();
    const e = this.engine;
    this.mapPose = this.overviewPose();
    // pre-compile every shader before the intro
    e.setView(e.heroPose('desktop'), 1280, 720, RIGS.desktop);
    await e.renderer.compileAsync(e.scene, e.camera);
    if (!RECORD && !CAPTURE) setInterval(() => this.relight(), 60_000);
    document.addEventListener('visibilitychange', () => this.kick());
    addEventListener('resize', () => { this.mapDirty = true; this.kick(); });
    addEventListener('scroll', () => this.kick(), { passive: true });
    if (CAPTURE) this.capture();
  }

  relight() {
    this.engine.relight(this.engine.now());
    this.shadowKey = '';
    this.mapDirty = true;
    this.kick();
  }

  overviewPose(): CamPose {
    return { tx: 0.5, ty: 0.4, tz: -16.5, dist: 175, bearing: 180, elev: 58, vfov: 19.5 };
  }

  townPose(target: Vector3): CamPose {
    return { tx: target.x, ty: target.y, tz: target.z, dist: 46, bearing: this.engine.bearing, elev: 40, vfov: 16 };
  }

  attach(el: HTMLElement, role: Role): ReliefHandle {
    const v: View = { el, role, visible: false, ratio: 0, shown: false, cbs: [] };
    this.views.set(role, v);
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
      setFree: (fn) => { v.free = fn; self.mapDirty = true; self.kick(); },
      dispose: () => self.fallback(),
    };
  }

  pick() {
    let best: View | null = null;
    for (const v of this.views.values()) if (v.visible && (!best || v.ratio > best.ratio)) best = v;
    if (best && best !== this.active) {
      this.active = best;
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
    const bg = v.role === 'map' && !e.look.night ? 0xd9d9d9 : e.look.voidc;
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
      if (!reduce) {
        pose.dist *= 1 - (innerWidth < 768 ? 0.1 : 0.14) * p;
        pose.elev += 3 * p;
      }
      // drift ±0.6° on a 20 s sine, starting only after the hand-off so the crossfade frame matches the poster
      const t = RECORD ? e.frame / 60 : this.readyAt ? (now - this.readyAt) / 1000 : 0;
      if (!reduce && innerWidth >= 1024 && t > 1.5) pose.bearing += 0.6 * Math.sin(((t - 1.5) / 20) * Math.PI * 2);
      const key = `hero:${rig}:${e.state}`;
      if (key !== this.shadowKey) {
        e.fitShadow(new Vector3(pose.tx, 0.5, pose.tz), 38);
        this.shadowKey = key;
      }
      e.setView(pose, W, H, RIGS[rig]);
      e.render();
      drew = true;
    } else if (this.mapDirty || this.flying) {
      const f = v.free?.();
      const shift = f ? { cx: f.l + f.w / 2, cy: f.t + f.h / 2 } : undefined;
      const pose = { ...this.mapPose };
      if (f && pose.dist > 120) pose.dist *= H / Math.max(200, f.h);
      const key = `map:${pose.tx.toFixed(1)}:${pose.tz.toFixed(1)}:${e.state}`;
      if (key !== this.shadowKey && (!this.flying || e.frame % 6 === 0)) {
        e.fitShadow(new Vector3(pose.tx, 0.5, pose.tz), pose.dist > 120 ? 60 : 18);
        this.shadowKey = key;
      }
      e.setView(pose, W, H, null, shift);
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

  /** The hero keeps its poster's bearing (identical geometry for the hand-off); only the light is live. */
  posterBearing(rig: Rig): number | undefined {
    if (RECORD || CAPTURE) return undefined;
    const st = document.documentElement.dataset.sun as keyof (typeof posters.rigs)['desktop'] | undefined;
    return st ? posters.rigs[rig]?.[st]?.bearing : undefined;
  }

  /** I-1 safety: if the title's 5th-percentile contrast over the live frame drops below 4.5:1, show its plate. */
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
    title.closest('[data-hero]')!.classList.toggle('plate', contrast < 4.5 && e.state !== 'night');
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
    const e = this.engine;
    let dest: CamPose;
    if (p === 'overview' || p === 'hero') dest = this.overviewPose();
    else if ('town' in p) dest = this.townPose(e.townTarget(p.town) ?? new Vector3());
    else {
      const g = e.pinRoots.get(p.home);
      dest = g ? { ...this.townPose(g.position.clone()), dist: 34 } : this.overviewPose();
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
    const ref = CAPTURE === 'overview' ? { w: 2560, h: 1440 } : RIGS[rig];
    e.renderer.setPixelRatio(1);
    e.renderer.setSize(ref.w, ref.h, false);
    let pose: CamPose;
    if (CAPTURE === 'overview') {
      pose = { ...this.overviewPose(), dist: 190, bearing: 200, elev: 50 };
      e.fitShadow(new Vector3(pose.tx, 0.5, pose.tz), 60);
      e.setView(pose, ref.w, ref.h, null);
    } else {
      pose = e.heroPose(rig);
      e.fitShadow(new Vector3(pose.tx, 0.5, pose.tz), 38);
      e.setView(pose, ref.w, ref.h, ref);
    }
    e.render();
    e.render();
    const sn = e.project('sn', ref.w, ref.h);
    (window as unknown as { __capture: unknown }).__capture = {
      png: e.canvas.toDataURL('image/png'),
      sn: sn ? { fx: sn.x / ref.w, fy: sn.y / ref.h } : null,
      state: e.state,
      bearing: e.bearing,
    };
  }
}
