import type { ImageMetadata } from 'astro';

const all = import.meta.glob<{ default: ImageMetadata }>('../assets/{photos,listings,posters}/*.{jpg,png}', { eager: true });

/** img('photos/sam-portrait-2026-10.jpg') */
export function img(path: string): ImageMetadata {
  const hit = all[`../assets/${path}`];
  if (!hit) throw new Error(`image not found: ${path}`);
  return hit.default;
}
