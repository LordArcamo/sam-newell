// prebuild: Get Leveraged RSS → src/data/podcast.json (build brief §10).
// If the fetch fails, the committed snapshot is used and the build warns.
import { XMLParser } from 'fast-xml-parser';
import { readFile, writeFile } from 'node:fs/promises';

const FEED = 'https://feeds.captivate.fm/recession-proof/';
const OUT = 'src/data/podcast.json';

const toSec = (d) => {
  if (d == null) return 0;
  const s = String(d);
  if (!s.includes(':')) return Math.round(Number(s) || 0);
  return s.split(':').map(Number).reduce((a, b) => a * 60 + b, 0);
};

function split(title) {
  const m = /^(\d{1,3})\s*[:.]\s*(.*)$/.exec(title.trim());
  const number = m ? Number(m[1]) : null;
  const rest = (m ? m[2] : title).trim();
  const parts = rest.split(/\s+\|\s+/);
  if (parts.length < 2) return { number, title: rest, guest: null };
  const words = (s) => s.split(/\s+/).length;
  // The guest is the shorter segment (a name, sometimes with a role after a comma).
  const [a, b] = parts;
  const guestFirst = words(a.split(',')[0]) <= words(b.split(',')[0]);
  const guest = (guestFirst ? a : b).trim().replace(/^ft\.?\s*/i, '');
  const t = (guestFirst ? parts.slice(1).join(' | ') : a).trim();
  return { number, title: t, guest };
}

try {
  const res = await fetch(FEED, { signal: AbortSignal.timeout(20000), headers: { 'user-agent': 'samnewellrealestate.com build' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();
  const p = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@' });
  const ch = p.parse(xml).rss.channel;
  const items = [].concat(ch.item ?? []);
  const cover = ch['itunes:image']?.['@href'] ?? ch.image?.url ?? null;
  const episodes = items.map((it) => {
    const s = split(String(it.title ?? ''));
    return {
      guid: String(it.guid?.['#text'] ?? it.guid ?? ''),
      number: s.number ?? (it['itunes:episode'] ? Number(it['itunes:episode']) : null),
      title: s.title,
      guest: s.guest,
      rawTitle: String(it.title ?? ''),
      date: new Date(it.pubDate).toISOString().slice(0, 10),
      duration: toSec(it['itunes:duration']),
      enclosure: it.enclosure?.['@url'] ?? null,
      image: it['itunes:image']?.['@href'] ?? null,
      episodeType: it['itunes:episodeType'] ?? 'full',
    };
  });
  await writeFile(OUT, JSON.stringify({ fetched: new Date().toISOString().slice(0, 10), feed: FEED, cover, episodes }, null, 1) + '\n');
  console.log(`podcast.json: ${episodes.length} items (${episodes.filter((e) => e.episodeType === 'full').length} full)`);
} catch (e) {
  try {
    await readFile(OUT);
    console.warn(`WARN podcast feed unavailable (${e.message}); using the committed snapshot ${OUT}`);
  } catch {
    console.error(`podcast feed unavailable (${e.message}) and no snapshot at ${OUT}`);
    process.exit(1);
  }
}
