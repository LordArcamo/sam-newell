/**
 * THE 3D BOUNDARY. Everything the page needs from the relief goes through mountRelief().
 * This file stays tiny (it is in the pre-3D bundle); the engine (three + loaders + scene) is a lazy chunk.
 *
 * Contract:
 *   - The poster (hero) / SVG map (map) stays under the canvas; the canvas fades in over it only after its
 *     first frames are rendered with the same crop (no black frame, no double image).
 *   - Returns null in poster mode (T0: no GPU, software GL, ?gl=off, saveData, init failure, watchdog).
 */
import { gpuTier, type Tier } from './gpu';

export const RELIEF_READY = true;

export type Pose = 'hero' | 'overview' | { town: string } | { home: string };

export interface ReliefHandle {
  tier: Tier;
  fly(pose: Pose): Promise<void>;
  project(id: string): { x: number; y: number; visible: boolean } | null;
  onFrame(cb: () => void): void;
  setFree(fn: () => { l: number; t: number; w: number; h: number }): void;
  dispose(): void;
}

export interface MountOptions {
  role: 'hero' | 'map';
  onReady?: (h: ReliefHandle) => void;
}

let controller: Promise<import('./controller').Controller | null> | null = null;

export async function mountRelief(el: HTMLElement, opts: MountOptions): Promise<ReliefHandle | null> {
  if (!RELIEF_READY) return null;
  if (document.documentElement.dataset.gl === 'off') return null;
  if (!controller) {
    controller = (async () => {
      const tier = await gpuTier();
      if (tier === 'T0') {
        document.documentElement.dataset.gl = 'off';
        return null;
      }
      try {
        const { Controller } = await import('./controller');
        const c = new Controller(tier);
        await c.init();
        document.documentElement.dataset.gl = tier;
        if (/[?&](debug|record|capture)/.test(location.search)) (window as unknown as { __relief: unknown }).__relief = c;
        return c;
      } catch (e) {
        console.warn('relief: falling back to posters', e);
        (window as unknown as { __reliefError: string }).__reliefError = String((e as Error)?.stack ?? e);
        document.documentElement.dataset.gl = 'off';
        return null;
      }
    })();
  }
  const c = await controller;
  if (!c) return null;
  const h = c.attach(el, opts.role);
  opts.onReady?.(h);
  return h;
}
