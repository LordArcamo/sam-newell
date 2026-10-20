export const usd = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
export const usdSigned = (n: number) => (n < 0 ? '−' : '') + usd(Math.abs(n));
export const pct = (n: number, d = 1) => (n * 100).toFixed(d).replace(/\.0+$/, '') + '%';
export const monthYear = (iso: string) =>
  new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
export const dur = (s: number) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  return (h ? `${h}:${String(m).padStart(2, '0')}` : `${m}`) + ':' + String(ss).padStart(2, '0');
};
