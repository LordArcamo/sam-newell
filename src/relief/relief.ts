/**
 * The Wasatch relief, live (build brief §4–§6, model check re-check I-1…I-6).
 * One WebGLRenderer, one canvas, moved between the hero and the map mounts (they are never on screen together).
 * Lit by the real sun over Lehi now (src/lib/sky.ts). Gallery-white neutral light.
 */
import {
  WebGLRenderer, Scene, PerspectiveCamera, DirectionalLight, HemisphereLight, Color, Vector3, Vector2, Vector4, Mesh, Object3D,
  MeshStandardMaterial, MeshBasicMaterial, PlaneGeometry, CanvasTexture, NeutralToneMapping, SRGBColorSpace,
  PCFShadowMap, NoColorSpace, RepeatWrapping, LinearFilter, LinearMipmapLinearFilter, Texture, Raycaster, Box3,
  type WebGLProgramParametersWithUniforms, type Material,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import i15 from '../map/i15.json';
import { sunPosition, skyState, sunDirection, type SkyState } from '../lib/sky';
import type { Tier } from './gpu';

// ——— look (model check v2 values; Blender sun/world units map 1:1 to three's physical lights, hemi × π) ———
interface Look { key: number; sky: number; exposure: number; ao: number; voidc: number; skyTint: number; night: boolean }
const LOOKS: Record<SkyState, Look> = {
  dawn: { key: 3.8, sky: 0.36, exposure: 1.25, ao: 0.8, voidc: 0xffffff, skyTint: 0xffffff, night: false },
  noon: { key: 2.6, sky: 0.36, exposure: 1.0, ao: 0.8, voidc: 0xffffff, skyTint: 0xffffff, night: false },
  golden: { key: 5.6, sky: 0.31, exposure: 1.22, ao: 0.88, voidc: 0xffffff, skyTint: 0xffffff, night: false },
  blue: { key: 0, sky: 0.65, exposure: 1.25, ao: 0.9, voidc: 0xd9d9d9, skyTint: 0xe8ecf1, night: false },
  night: { key: 0, sky: 0.09, exposure: 1.9, ao: 0.9, voidc: 0x0a0a0a, skyTint: 0xe4e6e9, night: true },
};

/** The look interpolated continuously by sun altitude (brief §4.3): night → blue → golden/dawn → noon. */
export function lookFor(altDeg: number, az: number): Look {
  const warm = az < 0 ? LOOKS.dawn : LOOKS.golden;
  const mix = (a: Look, b: Look, t: number): Look => {
    const k = Math.min(1, Math.max(0, t));
    const lerp = (x: number, y: number) => x + (y - x) * k;
    const c = (x: number, y: number) => new Color(x).lerp(new Color(y), k).getHex();
    return { key: lerp(a.key, b.key), sky: lerp(a.sky, b.sky), exposure: lerp(a.exposure, b.exposure), ao: lerp(a.ao, b.ao), voidc: c(a.voidc, b.voidc), skyTint: c(a.skyTint, b.skyTint), night: k < 0.5 ? a.night : b.night };
  };
  if (altDeg <= -8) return LOOKS.night;
  if (altDeg <= -4) return mix(LOOKS.night, LOOKS.blue, (altDeg + 8) / 4);
  if (altDeg <= 1) return mix(LOOKS.blue, { ...warm, key: 0 }, (altDeg + 4) / 5);
  if (altDeg <= 14) return { ...warm, key: warm.key * Math.min(1, (altDeg - 1) / 2 + 0.5) };
  if (altDeg <= 30) return mix(warm, LOOKS.noon, (altDeg - 14) / 16);
  return LOOKS.noon;
}

// ——— rigs (reference frames for poster parity) and poses ———
export type Rig = 'desktop' | 'tablet' | 'phone';
export interface RigSpec { w: number; h: number; dist: number; elev: number; vfov: number; beyond: number; lake: [number, number]; snMaxY: number; title: [number, number, number, number] }
/**
 * lake = where the Utah Lake north-half centroid sits in the reference frame (the calm band under the title);
 * snMaxY = the SN pin must stay above this (upper frame); title = the title's box in reference-frame fractions
 * (x0, y0, x1, y1), used to fade pins/labels that would sit under the name (design review #2).
 */
export const RIGS: Record<Rig, RigSpec> = {
  desktop: { w: 2560, h: 1440, dist: 54, elev: 14, vfov: 17, beyond: 4, lake: [0.3, 0.84], snMaxY: 0.42, title: [0.0, 0.5, 0.5, 1.0] },
  tablet: { w: 1536, h: 2048, dist: 64, elev: 18, vfov: 27, beyond: 4, lake: [0.3, 0.82], snMaxY: 0.45, title: [0.0, 0.62, 0.86, 0.98] },
  phone: { w: 1170, h: 2532, dist: 44, elev: 18, vfov: 24, beyond: 3, lake: [0.36, 0.74], snMaxY: 0.5, title: [0.0, 0.6, 0.9, 0.86] },
};
/** Same thresholds as the <picture> media queries in Hero.astro (viewport aspect). */
export const rigFor = (aspect: number): Rig => (aspect >= 1.2 ? 'desktop' : aspect >= 0.75 ? 'tablet' : 'phone');

/** Linear albedo of the night map's plaster (day 0.86): flats land near #262626 under the map's raking light. */
const NIGHT_ALBEDO = 0.11;

// Utah Lake north-half centroid, ≈ 40.30 N 111.80 W (scene km: 4.3 E, 10.2 S), on the inlay surface.
const LAKE = new Vector3(4.3, 0.16, 10.2);
const deg = Math.PI / 180;

/** Compass bearing (from north, clockwise) in [195, 235] that puts the sun ~100° off the camera axis (I-1). */
export function followBearing(sunAzFromSouth: number) {
  const sunCompass = ((sunAzFromSouth / deg + 180) % 360 + 360) % 360;
  let best = 215, err = Infinity;
  for (let b = 195; b <= 235; b += 0.5) {
    const d = Math.abs(((sunCompass - b + 540) % 360) - 180);
    const e = Math.abs(d - 100);
    if (e < err) { err = e; best = b; }
  }
  return best;
}

export interface Pose { tx: number; ty: number; tz: number; dist: number; bearing: number; elev: number; vfov: number }

export function camFromPose(cam: PerspectiveCamera, p: Pose) {
  const b = p.bearing * deg, e = p.elev * deg;
  cam.position.set(p.tx + p.dist * Math.cos(e) * Math.sin(b), p.ty + p.dist * Math.sin(e), p.tz - p.dist * Math.cos(e) * Math.cos(b));
  cam.up.set(0, 1, 0);
  cam.lookAt(p.tx, p.ty, p.tz);
  if (cam.fov !== p.vfov) cam.fov = p.vfov;
}

export interface PinData { id: string; town: string; x: number; y: number; s: 'for-sale' | 'sold' | 'past' }
export interface TownData { slug: string; x: number; y: number }

export interface EngineOpts {
  tier: Tier;
  pins: PinData[];
  towns: TownData[];
  record: boolean;
  timeOverride: number | null;
  onFallback: () => void;
}

const PLASTER_VERT_PARS = /* glsl */ `
varying vec3 vRWorld;
varying vec3 vRNormal;
varying vec2 vRUv;
`;
const PLASTER_VERT = /* glsl */ `
vRWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
vRNormal = normalize(transpose(inverse(mat3(modelMatrix))) * objectNormal);
vRUv = uv;
`;
const PLASTER_FRAG_PARS = /* glsl */ `
varying vec3 vRWorld;
varying vec3 vRNormal;
varying vec2 vRUv;
uniform sampler2D uGrad;
uniform sampler2D uGrain;
uniform float uGrainFadeNear;
uniform float uGrainFadeFar;
uniform float uGrainStrength;
uniform vec2 uGroove;
uniform float uNight;
uniform vec4 uEdgeBox;
uniform float uEdgeW;
vec3 gReliefN;
float gInk;
float gGrainS;
float gFade;
float decodeG(float c) { float t = 2.0 * c - 1.0; return sign(t) * pow(abs(t), 1.5) * 5.0; }
float contourLine(float h, float interval, float fw) {
  float d = abs(fract(h / interval + 0.5) - 0.5) * interval;
  float line = 1.0 - smoothstep(0.4 * fw, 1.2 * fw, d);
  // fade lines whose on-screen spacing gets too tight (< ~5–12 px)
  return line * (1.0 - smoothstep(0.08, 0.2, fw / interval));
}
`;
// Runs before color_fragment uses diffuseColor: computes the relief normal, contours, groove and speckle.
const PLASTER_FRAG_COLOR = /* glsl */ `
{
  vec4 gt = texture2D(uGrad, vRUv);
  vec3 vn = normalize(vRNormal);
  vec3 nObj = normalize(vec3(-decodeG(gt.r), 1.0, -decodeG(gt.g)));
  float vslope = length(vn.xz) / max(vn.y, 1e-3);
  vec3 n = normalize(mix(vn, nObj, smoothstep(0.035, 0.10, vslope)));
  gFade = 1.0 - smoothstep(uGrainFadeNear, uGrainFadeFar, distance(cameraPosition, vRWorld));
  vec4 gr = texture2D(uGrain, vRWorld.xz / 0.2);
  gGrainS = gr.a;
  vec2 tn = gr.rg * 2.0 - 1.0;
  n = normalize(n + uGrainStrength * gFade * vec3(tn.x, 0.0, tn.y));
  gReliefN = n;
  // analytic contours from world height (EXAG 2.0: h = yc*500 + 1270)
  float yc = vRWorld.y + (gt.b - 0.5) * 0.16;
  float h = yc * 500.0 + 1270.0;
  float fw = max(fwidth(h), 1e-4);
  float slopeDeg = degrees(acos(clamp(n.y, -1.0, 1.0)));
  // the night map draws its lines on the valley floor too (the flats would otherwise read as a void)
  float mask = max(step(1375.0, h), uNight * step(1250.0, h));
  float major = contourLine(h, 100.0, fw) * 0.20 * mix(1.0, 0.5, smoothstep(40.0, 50.0, slopeDeg));
  float index = contourLine(h, 500.0, fw) * 0.30;
  float minor = contourLine(h, 20.0, fw) * 0.08 * (1.0 - step(1600.0, h)) * (1.0 - smoothstep(25.0, 35.0, slopeDeg));
  float ink = mask * max(max(major, index), minor);
  // night: light lines on dark ground read as terraces on steep faces at close range, so they fade out with slope
  ink *= mix(1.0, 1.0 - smoothstep(22.0, 38.0, slopeDeg), uNight);
  // I-15 groove from the distance field in alpha
  float dm = (gt.a - 0.2) / 0.8 * 250.0;
  float groove = 1.0 - smoothstep(uGroove.x, uGroove.y, dm);
  vec3 base = diffuseColor.rgb * (1.0 + 0.05 * (gGrainS - 0.5));
  // by day the lines are ink on plaster; on the night map they are light on deep grey, like the SVG poster
  diffuseColor.rgb = mix(base * (1.0 - ink) * (1.0 - 0.18 * groove), base * (1.0 + 1.8 * ink + 0.6 * groove), uNight);
  gInk = ink + 0.25 * groove;
}
`;
// The night map's contours carry a faint light of their own, so they still read on the unlit side of the ridges.
const PLASTER_FRAG_EMISSIVE = /* glsl */ `
totalEmissiveRadiance += uNight * vec3(0.045 * gInk);
`;
// The model's cut edge never shows: the ground dissolves into the void over the last uEdgeW km of the footprint.
const PLASTER_FRAG_EDGE = /* glsl */ `
{
  vec2 dLo = vRWorld.xz - uEdgeBox.xy;
  vec2 dHi = uEdgeBox.zw - vRWorld.xz;
  float dEdge = min(min(dLo.x, dLo.y), min(dHi.x, dHi.y));
  float keep = smoothstep(0.0, uEdgeW, dEdge);
  gl_FragColor.rgb = mix(vec3(0.0392), gl_FragColor.rgb, mix(1.0, keep * keep, uNight));
}
`;
const PLASTER_FRAG_ROUGH = /* glsl */ `
roughnessFactor = clamp(0.90 + 0.08 * (gGrainS - 0.5), 0.0, 1.0);
`;
const PLASTER_FRAG_NORMAL = /* glsl */ `
normal = normalize((viewMatrix * vec4(gReliefN, 0.0)).xyz);
`;

function blobTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 256;
  const g = c.getContext('2d')!;
  // a soft streak: dark at the pin's foot, fading to nothing along the shadow (I-2) // taste-skill-ignore: WebGL sun shadow, not a CSS shadow
  const lin = g.createLinearGradient(0, 256, 0, 0);
  lin.addColorStop(0, 'rgba(0,0,0,0.55)');
  lin.addColorStop(0.15, 'rgba(0,0,0,0.35)');
  lin.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = lin;
  g.beginPath();
  g.ellipse(32, 128, 10, 128, 0, 0, Math.PI * 2);
  g.fill();
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

async function loadBitmap(url: string, colour = false): Promise<Texture> {
  const res = await fetch(url);
  const blob = await res.blob();
  const bmp = await createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
  const t = new Texture(bmp as unknown as HTMLImageElement);
  t.flipY = false;
  t.colorSpace = colour ? SRGBColorSpace : NoColorSpace;
  t.generateMipmaps = true;
  t.minFilter = LinearMipmapLinearFilter;
  t.magFilter = LinearFilter;
  t.needsUpdate = true;
  return t;
}

export class Engine {
  renderer: WebGLRenderer;
  scene = new Scene();
  camera = new PerspectiveCamera(17, 1, 0.5, 900);
  sun = new DirectionalLight(0xffffff, 3);
  hemi = new HemisphereLight(0xffffff, 0xd9d9d9, 1);
  canvas: HTMLCanvasElement;
  opts: EngineOpts;
  relief!: Mesh;
  plaster!: MeshStandardMaterial;
  labels: Mesh[] = [];
  lakes: { mesh: Mesh; day: number }[] = [];
  plinth: Mesh | null = null;
  /** 1 on the map mount: dark plaster, light contours, the cut edge dissolved (shared shader uniform). */
  night = { value: 0 };
  pinRoots = new Map<string, Object3D>();
  pinStreaks: Mesh[] = [];
  pinMats: Material[] = [];
  snPin!: Object3D;
  look!: Look;
  state!: SkyState;
  sunAlt = 0;
  sunAz = 0;
  bearing = 215;
  raycaster = new Raycaster();
  frame = 0;

  constructor(opts: EngineOpts, canvas?: HTMLCanvasElement) {
    this.opts = opts;
    this.canvas = canvas ?? document.createElement('canvas');
    this.canvas.setAttribute('aria-hidden', 'true');
    this.canvas.className = 'relief-canvas';
    this.renderer = new WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    const dpr = Math.min(devicePixelRatio || 1, opts.tier === 'T1' ? 1.75 : opts.tier === 'T2' ? 1.5 : 1.25);
    this.renderer.setPixelRatio(opts.record ? 1 : dpr);
    this.renderer.toneMapping = NeutralToneMapping;
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFShadowMap; // r186: PCFSoft is gone (it warned); PCF + radius is the soft one
    this.renderer.shadowMap.autoUpdate = false;
    this.sun.castShadow = true;
    const size = opts.tier === 'T1' ? 2048 : 1024;
    this.sun.shadow.mapSize.set(size, size);
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.04;
    this.sun.shadow.radius = 2;
    this.scene.add(this.sun, this.sun.target, this.hemi);
  }

  async load() {
    // tablets (>= 768 px, DPR <= 2) get the hi mesh too: the tight tablet crop shows the lo mesh's facets
    const lod = this.opts.tier === 'T1' || (this.opts.tier === 'T2' && innerWidth >= 768 && devicePixelRatio <= 2) ? 'hi' : 'lo';
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    const [gl, pins, home, grad, cavity, grain] = await Promise.all([
      loader.loadAsync(`/relief/relief-${lod}.glb`),
      loader.loadAsync('/relief/pins.glb'),
      loader.loadAsync('/relief/home-pin.glb'),
      loadBitmap(lod === 'hi' ? '/relief/relief-grad-2048x4096.webp' : '/relief/relief-grad-1024x2048.webp'),
      loadBitmap(lod === 'hi' ? '/relief/relief-cavity-1024x2048.webp' : '/relief/relief-cavity-512x1024.webp'),
      loadBitmap('/relief/detail-grain-256.webp'),
    ]);
    grain.wrapS = grain.wrapT = RepeatWrapping;

    const root = gl.scene;
    root.traverse((o) => {
      const m = o as Mesh;
      if (!m.isMesh) return;
      if (o.name === 'relief') {
        this.relief = m;
        const mat = new MeshStandardMaterial({ color: new Color(0.86, 0.86, 0.86), roughness: 0.9, metalness: 0, aoMap: cavity, aoMapIntensity: 0.85 });
        mat.onBeforeCompile = (sh: WebGLProgramParametersWithUniforms) => {
          sh.uniforms.uGrad = { value: grad };
          sh.uniforms.uGrain = { value: grain };
          sh.uniforms.uGrainFadeNear = { value: 60 };
          sh.uniforms.uGrainFadeFar = { value: 95 };
          sh.uniforms.uGrainStrength = { value: 0.3 };
          sh.uniforms.uGroove = { value: lod === 'hi' ? new Vector2(12, 18) : new Vector2(18, 26) };
          sh.uniforms.uNight = this.night;
          sh.uniforms.uEdgeBox = { value: new Vector4(MODEL_BOX.min.x, MODEL_BOX.min.z, MODEL_BOX.max.x, MODEL_BOX.max.z) };
          sh.uniforms.uEdgeW = { value: 4.5 };
          sh.vertexShader = sh.vertexShader
            .replace('#include <common>', '#include <common>\n' + PLASTER_VERT_PARS)
            .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n' + PLASTER_VERT);
          sh.fragmentShader = sh.fragmentShader
            .replace('#include <common>', '#include <common>\n' + PLASTER_FRAG_PARS)
            .replace('#include <color_fragment>', '#include <color_fragment>\n' + PLASTER_FRAG_COLOR)
            .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n' + PLASTER_FRAG_ROUGH)
            .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n' + PLASTER_FRAG_NORMAL)
            .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' + PLASTER_FRAG_EMISSIVE)
            .replace('#include <fog_fragment>', '#include <fog_fragment>\n' + PLASTER_FRAG_EDGE);
        };
        m.material = mat;
        this.plaster = mat;
        m.castShadow = true;
        m.receiveShadow = true;
      } else if (o.name.startsWith('label_')) {
        const mat = (m.material as MeshStandardMaterial).clone();
        mat.polygonOffset = true;
        mat.polygonOffsetFactor = -2;
        mat.polygonOffsetUnits = -2;
        mat.transparent = true;
        m.material = mat;
        m.receiveShadow = true;
        this.labels.push(m);
      } else if (o.name === 'plinth') {
        m.receiveShadow = true;
        m.castShadow = true;
        this.plinth = m;
      } else if (o.name.startsWith('lake')) {
        m.receiveShadow = true;
        const mat = m.material as MeshStandardMaterial;
        mat.roughness = 0.6;
        this.lakes.push({ mesh: m, day: mat.color.getHex() });
      }
    });
    this.scene.add(root);
    root.updateMatrixWorld(true);
    // three short tasks instead of one long one (jury r4: no task over 50 ms near the opening)
    await yieldTask();
    this.buildHeightGrid();
    await yieldTask();
    this.textures = [grad, cavity, grain];

    // pins: disc = for sale, sphere = sold / past; needles cast no long shadow (I-2), a fading streak instead // taste-skill-ignore: WebGL sun shadow, not a CSS shadow
    const proto = { live: pins.scene.getObjectByName('pin_live_head')!, past: pins.scene.getObjectByName('pin_past_head')!, needle: pins.scene.getObjectByName('pin_needle')! };
    const streakTex = blobTexture();
    const streakMat = new MeshBasicMaterial({ map: streakTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, toneMapped: false });
    for (const p of this.opts.pins) {
      const g = new Object3D();
      g.name = `pin:${p.id}`;
      const head = (p.s === 'for-sale' ? proto.live : proto.past).clone();
      const needle = proto.needle.clone();
      // own materials per pin, so each can fade on its own (title occlusion)
      head.traverse((o) => { const m = o as Mesh; if (m.isMesh) { m.castShadow = false; m.material = (m.material as Material).clone(); this.pinMats.push(m.material as Material); } });
      needle.traverse((o) => { const m = o as Mesh; if (m.isMesh) { m.castShadow = false; m.material = (m.material as Material).clone(); } });
      g.add(head, needle);
      // map data y = SVG y = −north = scene z (+z south)
      const y = this.heightAt(p.x, p.y);
      g.position.set(p.x, y, p.y);
      const streak = new Mesh(new PlaneGeometry(0.09, 1), streakMat.clone());
      g.userData.streak = streak;
      streak.rotation.x = -Math.PI / 2;
      streak.position.set(p.x, y + 0.006, p.y);
      this.pinStreaks.push(streak);
      this.scene.add(g, streak);
      this.pinRoots.set(p.id, g);
    }
    this.snPin = home.scene.getObjectByName('sn_home_pin') ?? home.scene;
    this.snPin.traverse((o) => {
      const m = o as Mesh;
      if (!m.isMesh) return;
      m.castShadow = o.name.includes('mark'); // the SN plate's shadow on Lehi stays; the needle's ruled line does not // taste-skill-ignore: WebGL sun shadow, not a CSS shadow
      if (o.name.includes('mark')) this.pinMats.push(m.material as Material); // night: the plate's face glows white // taste-skill-ignore: WebGL sun shadow, not a CSS shadow
    });
    this.snPin.position.set(0, this.heightAt(0, 0), 0);
    this.scene.add(this.snPin);
    this.relight(this.now());
  }

  pinScale(k: number) {
    for (const [, g] of this.pinRoots) g.scale.setScalar(k);
  }

  /** Pins in screen space (jury r3 P2): every head ~PIN_PX across whatever its distance, within a sane range. */
  sizePins(H: number) {
    const cam = this.camera;
    const t = Math.tan((cam.fov * Math.PI) / 360);
    for (const [, g] of this.pinRoots) {
      const d = Math.max(1, cam.position.distanceTo(g.position));
      g.scale.setScalar(pinScaleFor(H / (2 * d * t)));
    }
  }

  textures: Texture[] = [];
  /** Upload the textures and compile every program now (idle time), not on the first map frame. */
  async prewarm() {
    for (const t of this.textures) this.renderer.initTexture(t);
    await this.renderer.compileAsync(this.scene, this.camera);
  }

  // ——— V5: the route from Lehi, draped on the terrain (along I-15 where the town sits on it) ———
  route: LineSegments2 | null = null;
  routeMat: LineMaterial | null = null;
  routeTo: string | null = null;
  routeN = 0;
  /** Build the route to a town's main pin; returns the number of drawable segments. */
  setRoute(slug: string | null, W: number, H: number) {
    if (this.route) { this.scene.remove(this.route); this.route.geometry.dispose(); this.route = null; }
    for (const l of this.labels) l.userData.routeA = 1;
    this.routeTo = slug;
    this.routeN = 0;
    if (!slug || slug === 'lehi') return 0;
    const t = this.opts.towns.find((x) => x.slug === slug);
    if (!t) return 0;
    const mine = this.opts.pins.filter((p) => p.town === slug);
    const end = mine.length ? mine.reduce((a, b) => (Math.hypot(a.x - t.x, a.y - t.y) <= Math.hypot(b.x - t.x, b.y - t.y) ? a : b)) : { x: t.x, y: t.y };
    const path = routePath({ x: 0, y: 0 }, end);
    const endY = 'id' in end ? this.pinRoots.get((end as PinData).id)?.position.y : undefined;
    // resample every ~120 m; the line rides 30 m (x2 exaggeration) above the ground and eases down to ground level
    // over its first and last 350 m, so it leaves the SN pin's foot and lands exactly on the pin base, with no kink
    const flat: { x: number; z: number }[] = [];
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i + 1];
      const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 0.12));
      for (let k = 0; k < n; k++) flat.push({ x: a.x + ((b.x - a.x) * k) / n, z: a.y + ((b.y - a.y) * k) / n });
    }
    const last = path[path.length - 1];
    flat.push({ x: last.x, z: last.y });
    const along = [0];
    for (let i = 1; i < flat.length; i++) along.push(along[i - 1] + Math.hypot(flat[i].x - flat[i - 1].x, flat[i].z - flat[i - 1].z));
    const total = along[along.length - 1];
    const ease = (d: number) => { const k = Math.min(1, Math.max(0, d / 0.35)); return k * k * (3 - 2 * k); };
    const P = flat.map((q, i) => new Vector3(q.x, this.heightAt(q.x, q.z) + 0.06 * Math.min(ease(along[i]), ease(total - along[i])), q.z));
    if (endY !== undefined) P[P.length - 1].y = endY;
    // an engraved town name the route runs across steps aside while the route is up (jury r4 P2-6)
    for (const l of this.labels) {
      l.geometry.computeBoundingBox();
      const bx = l.geometry.boundingBox!.clone().applyMatrix4(l.matrixWorld).expandByScalar(0.25);
      l.userData.routeA = P.some((q) => q.x > bx.min.x && q.x < bx.max.x && q.z > bx.min.z && q.z < bx.max.z) ? 0 : 1;
    }
    const seg: number[] = [];
    const idx: number[] = [];
    for (let i = 0; i < P.length - 1; i++) {
      seg.push(P[i].x, P[i].y, P[i].z, P[i + 1].x, P[i + 1].y, P[i + 1].z);
      idx.push(i);
    }
    const geo = new LineSegmentsGeometry();
    geo.setPositions(seg);
    if (!this.routeMat) this.routeMat = new LineMaterial({ color: 0xffffff, linewidth: 2, worldUnits: false, transparent: true, opacity: 0.92, depthTest: true, toneMapped: false });
    this.routeMat.resolution.set(W, H);
    const line = new LineSegments2(geo, this.routeMat);
    line.renderOrder = 2;
    this.route = line;
    this.routeN = P.length - 1;
    this.routeIdx = idx;
    geo.instanceCount = 0;
    this.scene.add(line);
    return this.routeN;
  }
  routeIdx: number[] = [];
  /** Draw-on: k in 0…1 of the route is shown (whole ~120 m segments, which reads as one continuous stroke). */
  drawRoute(k: number) {
    if (!this.route) return;
    const upto = Math.max(0, Math.min(1, k)) * this.routeN;
    let n = 0;
    while (n < this.routeIdx.length && this.routeIdx[n] < upto) n++;
    (this.route.geometry as LineSegmentsGeometry).instanceCount = n;
  }

  /**
   * Terrain height at (x, z) without a raycast (a ray against 144k triangles cost ~10 ms each: 18 of them were the
   * 220 ms stall at the scene→map hand-off, jury r3 P1-5). A 0.5 km bucket grid of the relief's triangles, built
   * once; a lookup tests the handful of triangles in one bucket.
   */
  private hgrid: { x0: number; z0: number; c: number; nx: number; nz: number; cells: Int32Array; start: Int32Array; v: Float32Array } | null = null;
  private buildHeightGrid() {
    const g = this.relief.geometry;
    const pos = g.attributes.position;
    const m = this.relief.matrixWorld;
    const n = pos.count;
    const v = new Float32Array(n * 3);
    const t = new Vector3();
    for (let i = 0; i < n; i++) {
      t.fromBufferAttribute(pos, i).applyMatrix4(m);
      v[i * 3] = t.x; v[i * 3 + 1] = t.y; v[i * 3 + 2] = t.z;
    }
    const ia = g.index ? g.index.array : null;
    const tris = ia ? ia.length / 3 : n / 3;
    const corners = new Int32Array(tris * 3);
    for (let i = 0; i < tris * 3; i++) corners[i] = ia ? ia[i] : i;
    const B = MODEL_BOX, c = 0.5, inv = 1 / c;
    const nx = Math.ceil((B.max.x - B.min.x) * inv) + 1, nz = Math.ceil((B.max.z - B.min.z) * inv) + 1;
    // one pass for each triangle's cell span, one to count, one to fill (typed arrays only)
    const span = new Int16Array(tris * 4);
    const count = new Int32Array(nx * nz + 1);
    for (let k = 0; k < tris; k++) {
      const a = corners[k * 3] * 3, b = corners[k * 3 + 1] * 3, d = corners[k * 3 + 2] * 3;
      const x0 = Math.max(0, Math.floor((Math.min(v[a], v[b], v[d]) - B.min.x) * inv));
      const x1 = Math.min(nx - 1, Math.floor((Math.max(v[a], v[b], v[d]) - B.min.x) * inv));
      const z0 = Math.max(0, Math.floor((Math.min(v[a + 2], v[b + 2], v[d + 2]) - B.min.z) * inv));
      const z1 = Math.min(nz - 1, Math.floor((Math.max(v[a + 2], v[b + 2], v[d + 2]) - B.min.z) * inv));
      span[k * 4] = x0; span[k * 4 + 1] = x1; span[k * 4 + 2] = z0; span[k * 4 + 3] = z1;
      for (let zz = z0; zz <= z1; zz++) for (let xx = x0; xx <= x1; xx++) count[zz * nx + xx + 1]++;
    }
    const start = new Int32Array(nx * nz + 1);
    for (let i = 1; i <= nx * nz; i++) start[i] = start[i - 1] + count[i];
    const fill = start.slice();
    const cells = new Int32Array(start[nx * nz]);
    for (let k = 0; k < tris; k++) {
      for (let zz = span[k * 4 + 2]; zz <= span[k * 4 + 3]; zz++) for (let xx = span[k * 4]; xx <= span[k * 4 + 1]; xx++) cells[fill[zz * nx + xx]++] = k;
    }
    this.hcorners = corners;
    this.hgrid = { x0: B.min.x, z0: B.min.z, c, nx, nz, cells, start, v };
  }
  private hcorners: Int32Array | null = null;
  heightAt(x: number, z: number) {
    const G = this.hgrid, C = this.hcorners;
    if (!G || !C) return 0.2;
    const cx = Math.floor((x - G.x0) / G.c), cz = Math.floor((z - G.z0) / G.c);
    if (cx < 0 || cz < 0 || cx >= G.nx || cz >= G.nz) return 0.2;
    const cell = cz * G.nx + cx, v = G.v;
    let best = -Infinity;
    for (let i = G.start[cell]; i < G.start[cell + 1]; i++) {
      const k = G.cells[i];
      const a = C[k * 3] * 3, b = C[k * 3 + 1] * 3, c = C[k * 3 + 2] * 3;
      const d = (v[b + 2] - v[c + 2]) * (v[a] - v[c]) + (v[c] - v[b]) * (v[a + 2] - v[c + 2]);
      if (Math.abs(d) < 1e-12) continue;
      const l1 = ((v[b + 2] - v[c + 2]) * (x - v[c]) + (v[c] - v[b]) * (z - v[c + 2])) / d;
      const l2 = ((v[c + 2] - v[a + 2]) * (x - v[c]) + (v[a] - v[c]) * (z - v[c + 2])) / d;
      const l3 = 1 - l1 - l2;
      if (l1 < -1e-6 || l2 < -1e-6 || l3 < -1e-6) continue;
      best = Math.max(best, l1 * v[a + 1] + l2 * v[b + 1] + l3 * v[c + 1]);
    }
    return best === -Infinity ? 0.2 : best;
  }

  now() {
    return this.opts.timeOverride ?? Date.now();
  }

  reading = false;
  relight(ms: number, forced?: SkyState) {
    const { altitude, azimuth } = sunPosition(ms);
    this.sunAlt = altitude;
    this.sunAz = azimuth;
    this.state = forced ?? skyState(altitude / deg, azimuth);
    this.bearing = followBearing(azimuth);
    this.reading = false;
    this.applyLight(altitude, azimuth, forced ? LOOKS[forced] : lookFor(altitude / deg, azimuth));
    if (this.mapRole) this.setReading(true);
  }
  mapRole = false;

  /**
   * Lehi Light: the map is a gallery object on black, in its night state (deep greys) at every hour, so the white
   * copy, pins and town labels always read (jury P0, 2026-10-21). Pins and town labels are always white.
   */
  setReading(on: boolean) {
    this.mapRole = on;
    const want = on;
    this.reading = want;
    // the map is dark at every hour: a low raking light from the west-north-west (screen upper-left on the map's
    // bearing) lights the Wasatch front that faces the camera; flats stay near #262626, the lakes deep grey, and the
    // plinth walls are not drawn (the cut edge dissolves into the void instead)
    if (want) this.applyLight(24 * deg, 1.92, { ...LOOKS.night, key: 1.6, sky: 0.08, exposure: 1.35, voidc: 0x0a0a0a });
    else this.applyLight(this.sunAlt, this.sunAz, lookFor(this.sunAlt / deg, this.sunAz));
    this.night.value = on ? 1 : 0;
    this.plaster?.color.setScalar(on ? NIGHT_ALBEDO : 0.86);
    for (const l of this.lakes) {
      (l.mesh.material as MeshStandardMaterial).color.setHex(on ? 0x474747 : l.day);
      if (l.mesh.name === 'lake_gsl') l.mesh.visible = !on; // it sits in the dissolved corner
    }
    if (this.plinth) this.plinth.visible = !on;
    if (on) {
      for (const m of this.pinMats) {
        const st = m as MeshStandardMaterial;
        st.emissive?.setHex(0xffffff);
        if (st.emissive) st.emissiveIntensity = 0.85;
      }
      for (const l of this.labels) (l.material as MeshStandardMaterial).color.setHex(0xffffff);
    }
  }

  applyLight(altitude: number, azimuth: number, L: Look) {
    this.look = L;
    const [dx, dy, dz] = sunDirection(altitude, azimuth);
    const key = altitude > 0 ? L.key : 0;
    this.sun.intensity = key;
    this.sun.visible = key > 0;
    this.sun.userData.dir = new Vector3(dx, dy, dz);
    this.hemi.intensity = Math.PI * L.sky;
    this.hemi.color.setHex(L.skyTint);
    this.renderer.toneMappingExposure = L.exposure;
    this.scene.background = new Color(L.voidc);
    if (this.plaster) this.plaster.aoMapIntensity = L.ao;
    for (const m of this.pinMats) {
      const s = m as MeshStandardMaterial;
      s.emissive?.setHex(L.night ? 0xffffff : 0x000000);
      if (s.emissive) s.emissiveIntensity = L.night ? 0.8 : 0;
    }
    for (const l of this.labels) (l.material as MeshStandardMaterial).color.setHex(L.night ? 0xffffff : 0x0a0a0a);
    // pin streaks point away from the sun, length = needle shadow capped at ~3 units, gone when the sun is down // taste-skill-ignore: WebGL sun shadow, not a CSS shadow
    const len = altitude > 0.02 ? Math.min(3, 1.0 / Math.tan(altitude)) : 0;
    const ang = Math.atan2(-dx, -dz);
    for (const s of this.pinStreaks) {
      s.visible = len > 0.05;
      s.scale.set(1, len, 1);
      s.rotation.set(-Math.PI / 2, 0, ang + Math.PI);
      s.position.setX(s.position.x); // placement updated below
    }
    this.pinStreaks.forEach((s, i) => {
      const root = [...this.pinRoots.values()][i];
      s.position.set(root.position.x - (dx / Math.hypot(dx, dz)) * len * 0.5, root.position.y + 0.006, root.position.z - (dz / Math.hypot(dx, dz)) * len * 0.5);
    });
    this.renderer.shadowMap.needsUpdate = true;
  }

  /** Fit the ortho shadow camera to the footprint the camera sees (brief §4.3). */ // taste-skill-ignore: WebGL sun shadow, not a CSS shadow
  fitShadow(target: Vector3, radius: number) {
    const dir: Vector3 = this.sun.userData.dir ?? new Vector3(0, 1, 0);
    this.sun.position.copy(target).addScaledVector(dir, 120);
    this.sun.target.position.copy(target);
    this.sun.target.updateMatrixWorld();
    const c = this.sun.shadow.camera;
    c.left = -radius; c.right = radius; c.top = radius; c.bottom = -radius;
    c.near = 40; c.far = 220;
    c.updateProjectionMatrix();
    this.renderer.shadowMap.needsUpdate = true;
  }

  /** Hero pose for a rig at the current sun bearing. */
  heroPose(rig: Rig, bearing = this.bearing): Pose {
    const r = RIGS[rig];
    const b = bearing * deg;
    // target sits `beyond` units past Lehi along the view so the crest breaks the top edge
    return { tx: -Math.sin(b) * r.beyond, ty: 0.5, tz: Math.cos(b) * r.beyond, dist: r.dist, bearing, elev: r.elev, vfov: r.vfov };
  }

  /**
   * Render a view: the reference frame (refW×refH) gets the I-1 lens shift, then the element shows a cover crop of it
   * (object-position 50% 50%) — identical to the poster <img> with object-fit: cover.
   */
  private composeCache = new Map<string, Pose>();
  /** Solve target (x, z) and distance so LAKE → rig.lake and SN head → y = rig.snMaxY, for this bearing/elev. */
  composeHero(pose: Pose, ref: RigSpec): Pose {
    const key = `${ref.w}:${pose.bearing.toFixed(2)}:${pose.elev.toFixed(2)}:${pose.dist.toFixed(2)}`;
    const hit = this.composeCache.get(key);
    if (hit) return hit;
    const cam = new PerspectiveCamera(pose.vfov, ref.w / ref.h, 0.5, 900);
    const sn = (this.snPin?.position.clone() ?? new Vector3()).add(new Vector3(0, 2, 0));
    const proj = (q: Pose) => {
      camFromPose(cam, q);
      cam.updateProjectionMatrix();
      cam.updateMatrixWorld();
      const a = LAKE.clone().project(cam), b = sn.clone().project(cam);
      // lx carries the SN pin's x (kept in frame, left third, over the lake's north shore); the lake's own x follows
      return { lx: (b.x + 1) / 2, ly: (1 - a.y) / 2, sy: (1 - b.y) / 2 };
    };
    const want = { lx: ref.lake[0], ly: ref.lake[1], sy: ref.snMaxY - 0.02 };
    let q = { ...pose };
    const b = pose.bearing * deg;
    const fwd = new Vector3(-Math.sin(b), 0, Math.cos(b)); // ground direction away from the camera
    const right = new Vector3(Math.cos(b), 0, Math.sin(b));
    for (let i = 0; i < 40; i++) {
      const r = proj(q);
      const e = [r.lx - want.lx, r.ly - want.ly, r.sy - want.sy];
      if (Math.hypot(...e) < 0.002) break;
      // numeric Jacobian over (pan right, pan forward, log distance)
      const h = [0.05, 0.05, 0.01];
      const vars = (d: number[]) => ({ ...q, tx: q.tx + right.x * d[0] + fwd.x * d[1], tz: q.tz + right.z * d[0] + fwd.z * d[1], dist: q.dist * Math.exp(d[2]) });
      const J = [0, 1, 2].map((k) => {
        const d = [0, 0, 0]; d[k] = h[k];
        const rr = proj(vars(d));
        return [(rr.lx - r.lx) / h[k], (rr.ly - r.ly) / h[k], (rr.sy - r.sy) / h[k]];
      });
      // solve J^T columns: A x = -e, A[i][k] = J[k][i]
      const A = [0, 1, 2].map((i) => [J[0][i], J[1][i], J[2][i]]);
      const x = solve3(A, e.map((v) => -v));
      if (!x) break;
      const step = x.map((v, k) => Math.max(-[2, 2, 0.15][k], Math.min([2, 2, 0.15][k], v)));
      q = vars(step);
      q.dist = Math.max(46, Math.min(110, q.dist)); // never closer than the model check's lens
    }
    if (this.composeCache.size > 64) this.composeCache.clear();
    this.composeCache.set(key, q);
    return q;
  }

  /** Lens shift (fractions of the reference frame) that puts the lake centroid on the rig's calm-band spot. */
  lensShift(rig: RigSpec) {
    const cam = this.camera;
    const p = LAKE.clone().project(cam);
    const cx = (p.x + 1) / 2, cy = (1 - p.y) / 2;
    return { sx: Math.max(-0.12, Math.min(0.12, cx - rig.lake[0])), sy: Math.max(-0.12, Math.min(0.12, cy - rig.lake[1])) };
  }

  setView(pose: Pose, W: number, H: number, ref: RigSpec | null, shiftToFree?: { cx: number; cy: number }, after?: (p: Pose) => Pose) {
    const cam = this.camera;
    cam.clearViewOffset();
    if (ref) {
      // Compose like the concept (design review #2): solve the aim (target pan + distance) so the Utah Lake
      // north-half centroid lands on the calm band under the title and the SN pin stands in the upper frame.
      let p = this.composeHero(pose, ref);
      if (after) p = after(p);
      camFromPose(cam, p);
      cam.aspect = ref.w / ref.h;
      cam.updateProjectionMatrix();
      const s = Math.max(W / ref.w, H / ref.h);
      const fw = ref.w * s, fh = ref.h * s;
      cam.setViewOffset(fw, fh, (fw - W) / 2, (fh - H) / 2, W, H);
    } else {
      camFromPose(cam, pose);
      cam.aspect = W / H;
      if (shiftToFree) cam.setViewOffset(W, H, W / 2 - shiftToFree.cx, H / 2 - shiftToFree.cy, W, H);
      else cam.updateProjectionMatrix();
    }
    cam.updateMatrixWorld();
    // billboard the SN plate to the camera (vertical axis only)
    if (this.snPin) this.snPin.rotation.y = Math.atan2(cam.position.x - this.snPin.position.x, cam.position.z - this.snPin.position.z);
    // labels: printed type, faded with distance (60–75 units)
    for (const l of this.labels) {
      const d = cam.position.distanceTo(l.getWorldPosition(new Vector3()));
      l.userData.distA = 1 - Math.min(1, Math.max(0, (d - 60) / 15));
    }
  }

  /**
   * Fade listing pins and town labels whose projected anchor falls inside `box` (fractions of the current view,
   * already padded) — nothing pokes through "Sam Newell". k = 1 jumps straight to the target (posters, reduced motion).
   */
  occlude(box: [number, number, number, number] | null, k: number) {
    const cam = this.camera;
    const inside = (v: Vector3) => {
      if (!box) return false;
      const p = v.project(cam);
      const x = (p.x + 1) / 2, y = (1 - p.y) / 2;
      return x >= box[0] && x <= box[2] && y >= box[1] && y <= box[3];
    };
    for (const [, g] of this.pinRoots) {
      const head = g.position.clone().add(new Vector3(0, 1.05, 0));
      const base = g.position.clone();
      const target = inside(head) || inside(base) ? 0 : 1;
      const a = (g.userData.a ?? 1) + (target - (g.userData.a ?? 1)) * k;
      g.userData.a = a;
      g.visible = a > 0.01;
      g.traverse((o) => {
        const m = (o as Mesh).material as MeshStandardMaterial | undefined;
        if (m) { m.transparent = a < 0.999; m.opacity = a; }
      });
      const st = g.userData.streak as Mesh | undefined;
      if (st) (st.material as MeshBasicMaterial).opacity = a;
    }
    for (const l of this.labels) {
      const target = box && inside(l.getWorldPosition(new Vector3())) ? 0 : 1;
      const a = (l.userData.occA ?? 1) + (target - (l.userData.occA ?? 1)) * k;
      l.userData.occA = a;
      const total = a * (l.userData.distA ?? 1) * (l.userData.routeA ?? 1);
      (l.material as MeshStandardMaterial).opacity = total;
      l.visible = total > 0.01;
    }
  }


  render() {
    this.frame++;
    this.renderer.render(this.scene, this.camera);
  }

  project(id: string, W: number, H: number) {
    // 'town:<slug>' projects the town's ground point (route lines, V5)
    if (id.startsWith('town:')) {
      const t = this.townTarget(id.slice(5));
      if (!t) return null;
      const p = t.project(this.camera);
      return { x: ((p.x + 1) / 2) * W, y: ((1 - p.y) / 2) * H, visible: p.z < 1 };
    }
    const g = id === 'sn' ? this.snPin : this.pinRoots.get(id);
    if (!g) return null;
    const head = g.position.clone().add(new Vector3(0, id === 'sn' ? 2 : 1.05 * g.scale.y, 0));
    const p = head.project(this.camera);
    return { x: ((p.x + 1) / 2) * W, y: ((1 - p.y) / 2) * H, visible: p.z < 1 && p.x > -1.1 && p.x < 1.1 && p.y > -1.1 && p.y < 1.1 };
  }

  /** The town and its pins as one frame: the centre of their box (on the ground) and its larger side (km). */
  townFrame(slug: string) {
    const t = this.opts.towns.find((x) => x.slug === slug);
    if (!t) return null;
    const pts = [{ x: t.x, y: t.y }, ...this.opts.pins.filter((p) => p.town === slug)];
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cz = (Math.min(...ys) + Math.max(...ys)) / 2;
    return { center: new Vector3(cx, this.heightAt(cx, cz), cz), spanX: Math.max(...xs) - Math.min(...xs), spanZ: Math.max(...ys) - Math.min(...ys) };
  }

  private townY = new Map<string, number>();
  townTarget(slug: string) {
    const t = this.opts.towns.find((x) => x.slug === slug);
    if (!t) return null;
    if (!this.townY.has(slug)) this.townY.set(slug, this.heightAt(t.x, t.y));
    return new Vector3(t.x, this.townY.get(slug)!, t.y);
  }

  dispose() {
    this.scene.traverse((o) => {
      const m = o as Mesh;
      if (m.isMesh) {
        m.geometry.dispose();
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        mats.forEach((x) => x.dispose());
      }
    });
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.canvas.remove();
  }
}

function solve3(A: number[][], b: number[]): number[] | null {
  const m = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < 3; c++) {
    let p = c;
    for (let r = c + 1; r < 3; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
    if (Math.abs(m[p][c]) < 1e-9) return null;
    [m[c], m[p]] = [m[p], m[c]];
    for (let r = 0; r < 3; r++) {
      if (r === c) continue;
      const f = m[r][c] / m[c][c];
      for (let k = c; k < 4; k++) m[r][k] -= f * m[c][k];
    }
  }
  return [m[0][3] / m[0][0], m[1][3] / m[1][1], m[2][3] / m[2][2]];
}

const yieldTask = () => new Promise<void>((r) => setTimeout(r, 0));

/** Pin head size on screen: ~13 px whatever the distance (scale 0.45–4 of the modelled pin, head 0.26 km). */
export const PIN_PX = 13;
export const pinScaleFor = (pxPerUnit: number) => Math.min(4, Math.max(0.45, PIN_PX / (0.26 * pxPerUnit)));

/**
 * Lehi → a town: along I-15 when both ends sit within 3 km of it (most of Sam's towns do), else straight across the
 * terrain. Points are map data frame (x east, y = −north = scene z).
 */
function routePath(a: { x: number; y: number }, b: { x: number; y: number }) {
  const P = (i15 as unknown as { pts: [number, number][] }).pts;
  // the cheapest way: off-road legs cost 1.4× a kilometre of interstate, so the line joins I-15 where that saves
  // distance and leaves it where the town is closest, with no doubling back; if the road saves nothing, straight
  const W = 1.4;
  const S = [0];
  for (let i = 1; i < P.length; i++) S.push(S[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const da = P.map((q) => Math.hypot(q[0] - a.x, q[1] - a.y));
  const db = P.map((q) => Math.hypot(q[0] - b.x, q[1] - b.y));
  let best = { c: W * Math.hypot(b.x - a.x, b.y - a.y), i: -1, j: -1 };
  for (let i = 0; i < P.length; i++) {
    if (da[i] > 4) continue;
    for (let j = 0; j < P.length; j++) {
      if (db[j] > 4 || i === j) continue;
      const c = W * da[i] + Math.abs(S[j] - S[i]) + W * db[j];
      if (c < best.c) best = { c, i, j };
    }
  }
  if (best.i < 0) return [a, b];
  const out = [a];
  const step = best.j > best.i ? 1 : -1;
  for (let i = best.i; i !== best.j + step; i += step) out.push({ x: P[i][0], y: P[i][1] });
  out.push(b);
  return out;
}

export const MODEL_BOX = new Box3(new Vector3(-20.97, -1.8, -56.43), new Vector3(25.32, 4.6, 41.19));
