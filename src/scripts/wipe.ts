// Page transitions (research §4.3): a black curtain wipes up (500 ms), the next page opens on a title card
// (its name in General Sans Light) and the curtain lifts. Plain MPA navigation underneath: if any of this
// fails the link still works, and the arriving curtain lifts on a CSS animation (no script needed).
const NAMES: Record<string, string> = {
  '/': 'Sam Newell', '/buy/': 'Buy', '/sell/': 'Sell', '/invest/': 'Invest', '/podcast/': 'Get Leveraged',
  '/about/': 'About Sam', '/contact/': 'Talk to Sam', '/blog/': 'Notes from Sam', '/reviews/': 'Reviews', '/privacy/': 'Privacy', '/terms/': 'Terms',
};

export function initWipe() {
  const html = document.documentElement;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  addEventListener('pageshow', (e) => {
    if ((e as PageTransitionEvent).persisted) html.classList.remove('leaving', 'arriving');
  });
  // Arriving: lift the curtain once the page's first picture has decoded (so it never lifts onto a black panel),
  // at most 900 ms after navigation started; then drop the class so the curtain never intercepts anything.
  if (html.classList.contains('arriving')) {
    const img = document.querySelector<HTMLImageElement>('[data-ih] img, [data-hero-img]');
    const cap = new Promise((r) => setTimeout(r, Math.max(0, 900 - performance.now())));
    const ready = img ? (img.complete && img.naturalWidth ? img.decode() : new Promise((r) => img.addEventListener('load', () => img.decode().then(r, r), { once: true }))) : Promise.resolve();
    Promise.race([ready.catch(() => {}), cap]).then(() => {
      html.classList.add('lift');
      setTimeout(() => html.classList.remove('arriving'), 800);
    });
    setTimeout(() => html.classList.remove('arriving'), 2200); // fail-safe
  }

  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href]');
    if (!a || a.target || a.hasAttribute('download') || a.dataset.noWipe !== undefined) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || /^(mailto|tel|sms):/.test(a.href)) return;
    if (url.pathname === location.pathname && url.search === location.search) return; // same page, hash links
    if (url.pathname.startsWith('/api/') || /\.(xml|txt|jpg|png|pdf)$/.test(url.pathname)) return;
    e.preventDefault();
    const name = NAMES[url.pathname] ?? (a.textContent || '').trim().slice(0, 28);
    try { sessionStorage.setItem('sn-wipe', name); } catch {}
    const t = document.querySelector<HTMLElement>('[data-curtain-t]');
    if (t) t.textContent = name;
    html.classList.add('leaving');
    setTimeout(() => (location.href = url.href), 700); // curtain 0.5 s, then the SN mark finishes drawing
  });
}
