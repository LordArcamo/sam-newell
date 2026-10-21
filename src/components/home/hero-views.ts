import type { ImageMetadata } from 'astro';
import golden from '../../assets/film/hero-golden.jpg';
import goldenPhone from '../../assets/film/hero-golden-phone.jpg';
import night from '../../assets/film/hero-night.jpg';
import nightStill from '../../assets/photos/wasatch-night.jpg';
import blue from '../../assets/photos/wasatch-blue-hour.jpg';
import alpen from '../../assets/photos/wasatch-alpenglow.jpg';

/** The hero's four hours (film-plan §1.4). Posters are frame 0 of their film; `film` is the path without extension. */
export const HERO_VIEWS: Record<string, { src: ImageMetadata; ws: number[]; alt: string; film?: string }> = {
  golden: { src: golden, ws: [720, 1080, 1440, 1920], alt: 'Golden light over the Wasatch from a Utah County field, from Sam’s own photograph', film: '/film/hero-golden' },
  goldenPhone: { src: goldenPhone, ws: [480, 720], alt: 'Golden light over the Wasatch from a Utah County field, from Sam’s own photograph', film: '/film/hero-golden-phone' },
  alpen: { src: alpen, ws: [720, 1080, 1440, 1920], alt: 'Alpenglow on the Wasatch from a Utah County field, from Sam’s own photograph' },
  blue: { src: blue, ws: [720, 1080, 1440, 1920], alt: 'Blue hour over the Wasatch from a Utah County field, from Sam’s own photograph' },
  night: { src: night, ws: [720, 1080, 1440, 1920], alt: 'The Wasatch at night above the lights of Utah County, from Sam’s own photograph', film: '/film/hero-night' },
  nightPhone: { src: nightStill, ws: [720, 1080, 1440], alt: 'The Wasatch at night above the lights of Utah County, from Sam’s own photograph' },
};
