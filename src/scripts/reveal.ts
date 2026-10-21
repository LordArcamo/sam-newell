// Section-part entrances: heading, then text, then picture (stagger via --i), once, on enter.
// Pre-hide CSS exists only under .js + prefers-reduced-motion:no-preference, and never uses visibility,
// so Tab reaches everything and focus reveals instantly.
const EXPO = 'cubic-bezier(0.19, 1, 0.22, 1)';

/**
 * Section headings speak the hero's language: each word sits in an overflow mask and rises out of it,
 * line by line (0.9 s expo out, 80 ms per line). Styles are inline, so nothing here touches the global sheet;
 * reduced motion never splits. The heading's own text stays intact for screen readers (words keep their spaces).
 */
function splitHeading(h: HTMLElement) {
  if (h.dataset.split === 'done' || [...h.childNodes].some((n) => n.nodeType !== 3)) return null;
  const words = (h.textContent ?? '').trim().split(/\s+/);
  h.textContent = '';
  const inner: HTMLElement[] = [];
  words.forEach((w, i) => {
    const mask = document.createElement('span');
    mask.style.cssText = 'display:inline-block;overflow:hidden;vertical-align:bottom;padding:0.14em 0 0.1em;margin:-0.14em 0 -0.1em';
    const t = document.createElement('span');
    t.style.cssText = 'display:inline-block;transform:translateY(105%)';
    t.textContent = w;
    mask.appendChild(t);
    h.appendChild(mask);
    if (i < words.length - 1) h.appendChild(document.createTextNode(' '));
    inner.push(t);
  });
  h.dataset.split = 'done';
  return inner;
}
function rise(inner: HTMLElement[], base = 0) {
  const tops = [...new Set(inner.map((t) => Math.round((t.parentElement as HTMLElement).offsetTop)))].sort((a, b) => a - b);
  inner.forEach((t) => {
    const line = tops.indexOf(Math.round((t.parentElement as HTMLElement).offsetTop));
    t.style.transition = `transform 0.9s ${EXPO} ${base + line * 80}ms`;
    t.style.transform = 'none';
  });
}

export function initReveals() {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // section headings: masked line rise instead of the fade-up
  // section headings and the big figures (235, 4.9, $450M+, 2,000+: one rise each, 90 ms apart)
  const heads = reduce ? [] : [...document.querySelectorAll<HTMLElement>('h2.h[data-rv], [data-mask]')];
  const split = new Map<HTMLElement, HTMLElement[]>();
  heads.forEach((h) => {
    const r = h.getBoundingClientRect();
    if (r.top < innerHeight * 0.92 && r.bottom > 0) return; // on the first screen: leave it as it is
    const inner = splitHeading(h);
    if (!inner) return;
    h.removeAttribute('data-rv');
    h.dataset.masked = '';
    split.set(h, inner);
  });
  if (split.size) {
    const hio = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target as HTMLElement;
        rise(split.get(el)!, 90 * (Number(el.dataset.mask) || 0));
        hio.unobserve(e.target);
      }),
      { rootMargin: '0px 0px -10% 0px' },
    );
    split.forEach((_, h) => hio.observe(h));
    // fail-open: anything on screen after a pause is shown
    const show = () => split.forEach((inner, h) => { const r = h.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) rise(inner); });
    addEventListener('load', () => setTimeout(show, 1500), { once: true });
    document.addEventListener('focusin', () => show());
  }
  // body parts: one rhythm with the pictures (0.8 s, 28 px, the house expo ease, 90 ms apart)
  const els = [...document.querySelectorAll<HTMLElement>('[data-rv],[data-rv-img],[data-shutter]')];
  if (!reduce) {
    els.forEach((el) => {
      if (!el.hasAttribute('data-rv') || el.classList.contains('in')) return;
      el.style.translate = '0 8px'; // with the sheet's 20px: 28px in all
      el.style.transition = `opacity 0.8s ${EXPO}, transform 0.8s ${EXPO}, translate 0.8s ${EXPO}`;
      el.style.transitionDelay = 'calc(var(--i, 0) * 90ms)';
    });
  }
  if (reduce || !('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          (e.target as HTMLElement).style.translate = '';
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.01 },
  );
  els.forEach((el) => {
    // Anything already above the fold on load shows immediately (never delay the first screen).
    const r = el.getBoundingClientRect();
    if (r.top < innerHeight * 0.92 && r.bottom > 0) {
      el.classList.add('in');
      el.style.translate = '';
    } else io.observe(el);
  });
  // Fail-open (design review #10): whatever is on screen shows, even if the observer never fires
  // (capture tools resizing the viewport, throttled tabs). Checked on resize and 1.2 s after load.
  const sweep = () => {
    for (const el of els) {
      if (el.classList.contains('in')) continue;
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) {
        el.classList.add('in');
        el.style.translate = '';
      }
    }
  };
  addEventListener('resize', sweep, { passive: true });
  addEventListener('load', () => setTimeout(sweep, 1200), { once: true });
  let st = 0;
  addEventListener('scroll', () => { clearTimeout(st); st = window.setTimeout(sweep, 1200); }, { passive: true });
  document.addEventListener('focusin', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-rv],[data-rv-img],[data-shutter]');
    t?.classList.add('in');
    if (t) t.style.translate = '';
    (e.target as HTMLElement).querySelectorAll?.('[data-rv],[data-rv-img]').forEach((x) => x.classList.add('in'));
    let p = (e.target as HTMLElement).parentElement;
    while (p) {
      if (p.hasAttribute('data-rv') || p.hasAttribute('data-rv-img')) p.classList.add('in');
      p = p.parentElement;
    }
  });
}
