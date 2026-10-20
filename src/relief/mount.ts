/**
 * THE 3D BOUNDARY. Everything the page needs from the relief scene goes through mountRelief().
 *
 * Today (site shell, model not shipped): RELIEF_READY = false, so this resolves to null and the page stays
 * in poster mode (hero poster + SVG map), which is complete and fully usable.
 *
 * When blender/ passes the model check:
 *   1. copy relief-{hi,lo}.glb, home-pin.glb, the normal/cavity WebPs and relief-meta.json to public/relief/
 *   2. implement src/relief/relief.ts (three@0.186.1 WebGLRenderer + GLTFLoader + meshopt) exporting
 *      `createRelief(opts): Promise<ReliefHandle>` — the brief §4–§5 scene (sun from src/lib/sky.ts,
 *      poses, pins, flights, watchdog)
 *   3. flip RELIEF_READY to true
 * The DOM contract below does not change: the map store, town buttons, pin buttons and card already drive
 * the SVG map and will drive the GL flights through the same events.
 */
import { gpuTier, type Tier } from './gpu';

export const RELIEF_READY = false;

export type Pose = 'hero' | 'overview' | { town: string } | { home: string };

export interface ReliefHandle {
  tier: Tier;
  /** Fly the camera (map) — resolves when the flight lands. */
  fly(pose: Pose): Promise<void>;
  /** Project a home's pin to CSS px inside the mount element (for the DOM pin buttons). */
  project(homeId: string): { x: number; y: number; visible: boolean } | null;
  /** Re-light from the real sun (called every 60 s). */
  relight(ms: number): void;
  dispose(): void;
}

export interface MountOptions {
  /** 'hero' = cover-cropped poster parity; 'map' = interactive overview. */
  role: 'hero' | 'map';
  /** Called once the canvas has rendered its first frame and crossfaded over the poster. */
  onReady?: (h: ReliefHandle) => void;
}

export async function mountRelief(el: HTMLElement, opts: MountOptions): Promise<ReliefHandle | null> {
  if (!RELIEF_READY) return null;
  const tier = await gpuTier();
  document.documentElement.dataset.gl = tier === 'T0' ? 'off' : tier;
  if (tier === 'T0') return null;
  // TODO(model): const { createRelief } = await import('./relief'); return createRelief({ el, tier, ...opts });
  void el;
  void opts;
  return null;
}
