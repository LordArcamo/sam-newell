import feed from '../data/podcast.json';

export interface Episode {
  guid: string; number: number | null; title: string; guest: string | null; rawTitle: string; date: string;
  duration: number; enclosure: string | null; image: string | null; episodeType: string;
}
export const EPISODES = (feed.episodes as Episode[]).filter((e) => e.episodeType === 'full' && e.enclosure);
export const COVER = feed.cover;
export const ep = (n: number) => {
  const e = EPISODES.find((x) => x.number === n);
  if (!e) throw new Error(`episode ${n} missing from podcast.json`);
  return e;
};

/** Curated real-estate / investing groups [SAM TO CONFIRM names]. Ep. 077 is never on home. */
export const GROUPS = [
  { name: 'Buying and flipping', eps: [98, 99, 83, 80] },
  { name: 'Building a portfolio', eps: [100, 87, 79, 77] },
  { name: 'Money and family', eps: [89, 88, 97] },
];
export const HOME_GROUPS = [
  { name: 'Buying and flipping', eps: [98, 99] },
  { name: 'Building a portfolio', eps: [100, 87] },
  { name: 'Money and family', eps: [89, 88, 97] },
];
