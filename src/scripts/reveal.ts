// Section-part entrances: heading, then text, then picture (stagger via --i), once, on enter.
// Pre-hide CSS exists only under .js + prefers-reduced-motion:no-preference, and never uses visibility,
// so Tab reaches everything and focus reveals instantly.
export function initReveals() {
  const els = [...document.querySelectorAll<HTMLElement>('[data-rv],[data-rv-img],[data-shutter]')];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.01 },
  );
  els.forEach((el) => {
    // Anything already above the fold on load shows immediately (never delay the first screen).
    const r = el.getBoundingClientRect();
    if (r.top < innerHeight * 0.92 && r.bottom > 0) el.classList.add('in');
    else io.observe(el);
  });
  // Fail-open (design review #10): whatever is on screen shows, even if the observer never fires
  // (capture tools resizing the viewport, throttled tabs). Checked on resize and 1.2 s after load.
  const sweep = () => {
    for (const el of els) {
      if (el.classList.contains('in')) continue;
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) el.classList.add('in');
    }
  };
  addEventListener('resize', sweep, { passive: true });
  addEventListener('load', () => setTimeout(sweep, 1200), { once: true });
  let st = 0;
  addEventListener('scroll', () => { clearTimeout(st); st = window.setTimeout(sweep, 1200); }, { passive: true });
  document.addEventListener('focusin', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-rv],[data-rv-img],[data-shutter]');
    t?.classList.add('in');
    (e.target as HTMLElement).querySelectorAll?.('[data-rv],[data-rv-img]').forEach((x) => x.classList.add('in'));
    let p = (e.target as HTMLElement).parentElement;
    while (p) {
      if (p.hasAttribute('data-rv') || p.hasAttribute('data-rv-img')) p.classList.add('in');
      p = p.parentElement;
    }
  });
}
