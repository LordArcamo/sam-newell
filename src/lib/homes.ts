/** Derived home data for the page: town names, labels, scene coordinates. Server-side only. */
import homesFile from '../data/homes.json';
import geo from '../data/homes.geo.json';
import towns from '../data/towns.json';
import { project } from './geo';
import { usd, monthYear } from './format';

export type Status = 'for-sale' | 'sold' | 'past';
export interface Home {
  id: string; address: string; street: string; town: string; zip: string; status: Status;
  price?: number; side?: 'buyer' | 'seller' | 'both'; date?: string; beds?: number; baths?: number; sqft?: number;
  photo?: string; zillow: string; showAddress: boolean;
}

export const TOWN_NAME: Record<string, string> = Object.fromEntries(towns.map((t) => [t.slug, t.name]));
TOWN_NAME['cedar-hills'] = 'Cedar Hills';

export const TOWNS = towns.map((t) => ({ ...t, ...project(t.lat, t.lon) }));

const points = (geo as { points: Record<string, { lat: number; lon: number }> }).points;

const sideText = { buyer: 'buyer’s side', seller: 'seller’s side', both: 'both sides' } as const;

export const HOMES = (homesFile.homes as Home[]).map((h) => {
  const town = TOWN_NAME[h.town] ?? h.town;
  const shown = h.showAddress ? h.address : h.street;
  const p = points[h.id];
  const xy = p ? project(p.lat, p.lon) : null;
  // Group homes outside the 12 towns with the nearest one (Cedar Hills → American Fork).
  const group = TOWN_NAME[h.town] && towns.some((t) => t.slug === h.town)
    ? h.town
    : xy ? TOWNS.reduce((a, b) => (Math.hypot(a.x - xy.x, a.north - xy.north) < Math.hypot(b.x - xy.x, b.north - xy.north) ? a : b)).slug : h.town;
  const detail =
    h.status === 'for-sale' ? usd(h.price!) :
    h.status === 'sold' ? `Sold ${monthYear(h.date!)}, ${sideText[h.side ?? 'buyer']}` :
    'Past listing';
  const facts = h.beds ? `${h.beds} bd · ${h.baths} ba · ${h.sqft!.toLocaleString('en-US')} sq ft` : '';
  const label = `${shown}, ${town}, ${h.status === 'for-sale' ? `for sale, ${usd(h.price!)}` : h.status === 'sold' ? `sold ${monthYear(h.date!)}` : 'past listing'}`;
  return { ...h, townName: town, shown, detail, facts, label, xy, group };
});

export const FOR_SALE = HOMES.filter((h) => h.status === 'for-sale');
export const SOLD = HOMES.filter((h) => h.status === 'sold').sort((a, b) => (b.date! > a.date! ? 1 : -1));
export const PAST = HOMES.filter((h) => h.status === 'past');
