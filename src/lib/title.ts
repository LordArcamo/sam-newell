// Lists and post heads show a title's head as the headline and fold the rest into the line under it.
// The full title stays in <title>, JSON-LD and the breadcrumb.
export function splitTitle(t: string): { head: string; tail: string } {
  const m = t.match(/^(.+?[:?])\s+(.+)$/);
  if (!m) return { head: t, tail: '' };
  const head = m[1].replace(/:$/, '');
  const tail = m[2].charAt(0).toUpperCase() + m[2].slice(1);
  return { head, tail: /[.?!]$/.test(tail) ? tail : tail + '.' };
}
