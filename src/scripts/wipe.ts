// Page transitions (research §4.3): a black curtain wipes up (500 ms) while the SN mark draws, the next page opens
// on a title card (its name in General Sans Light) and the curtain lifts onto that page's picture, already painted.
// Plain MPA navigation underneath: if any of this fails the link still works, and the arriving curtain lifts on a
// CSS fail-safe (global.css) with no script at all.
const NAMES: Record<string, string> = {
  '/': 'Sam Newell', '/buy/': 'Buy', '/sell/': 'Sell', '/invest/': 'Invest', '/podcast/': 'Get Leveraged',
  '/about/': 'About Sam', '/contact/': 'Talk to Sam', '/blog/': 'Notes from Sam', '/reviews/': 'Reviews', '/privacy/': 'Privacy', '/terms/': 'Terms',
};
/** the curtain's own beat: 0.5 s up, then the mark finishes drawing and fills */
const WIPE_MS = 700;
/** never hold a black screen longer than this for a picture, on either side of the navigation */
const HOLD_MS = 900;
/** global.css starts its fail-safe lift at 1.25 s; past this, script leaves the curtain to CSS (no restart) */
const LATE_MS = 1200;

const HERO = '[data-ih] img, [data-hero-img]';
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, Math.max(0, ms)));

/** Resolves once the image has loaded and decoded (or failed: a broken picture must not hold the curtain). */
function decoded(img: HTMLImageElement): Promise<void> {
  const loaded = img.complete && img.naturalWidth > 0
    ? Promise.resolve()
    : new Promise<void>((r) => {
      img.addEventListener('load', () => r(), { once: true });
      img.addEventListener('error', () => r(), { once: true });
    });
  // decode() can reject if the responsive candidate changes mid-flight; the loaded picture is good enough then
  return loaded.then(() => img.decode().catch(() => {}));
}

/**
 * Warm the next page's hero: read its HTML, clone its <picture> into this document (detached, so `sizes` resolves
 * against this viewport and the browser picks the same AVIF/WebP candidate it will pick on arrival), then load and
 * decode it. The arriving page finds it in the HTTP cache. One request per page per visit.
 */
const warmed = new Map<string, Promise<void>>();
function warm(url: URL): Promise<void> {
  const key = url.pathname + url.search;
  let p = warmed.get(key);
  if (p) return p;
  p = fetch(url.href, { credentials: 'same-origin', headers: { Accept: 'text/html' } })
    .then((r) => (r.ok && /html/.test(r.headers.get('content-type') || '') ? r.text() : ''))
    .then((text) => {
      if (!text) return;
      const doc = new DOMParser().parseFromString(text, 'text/html');
      const src = doc.querySelector<HTMLImageElement>(HERO);
      if (!src) return;
      const node = document.importNode(src.closest('picture') ?? src, true) as HTMLElement;
      const img = node instanceof HTMLImageElement ? node : node.querySelector('img');
      if (!img) return;
      img.loading = 'eager';
      img.decoding = 'async';
      return decoded(img);
    })
    .catch(() => {});
  warmed.set(key, p);
  return p;
}

/** A same-origin page link this curtain should handle (not a download, hash, mail/tel, API or file link). */
function target(a: HTMLAnchorElement | null): URL | null {
  if (!a || a.target || a.hasAttribute('download') || a.dataset.noWipe !== undefined) return null;
  if (/^(mailto|tel|sms):/.test(a.getAttribute('href') || '')) return null;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin) return null;
  if (url.pathname === location.pathname && url.search === location.search) return null; // same page, hash links
  if (url.pathname.startsWith('/api/') || /\.(xml|txt|jpe?g|png|webp|avif|pdf)$/.test(url.pathname)) return null;
  return url;
}

export function initWipe() {
  const html = document.documentElement;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let leaving = false;

  // back/forward from the bfcache: the page comes back as it was left, covered; open it at once
  addEventListener('pageshow', (e) => {
    if ((e as PageTransitionEvent).persisted) {
      html.classList.remove('leaving', 'arriving', 'lift');
      leaving = false;
    }
  });

  // Arriving: the curtain stays closed until this page's hero picture has decoded (normally already in the cache,
  // warmed while the previous page wiped out), at most HOLD_MS after navigation; then it lifts onto the picture.
  if (html.classList.contains('arriving')) {
    // keyboard and screen-reader users land on the page's title, not back at the top of the document
    const h1 = document.querySelector<HTMLElement>('main h1');
    if (h1) {
      if (!h1.hasAttribute('tabindex')) h1.setAttribute('tabindex', '-1');
      h1.style.outline = 'none'; // a heading is not a control: no ring on a programmatic focus
      h1.focus({ preventScroll: true });
    }
    const img = document.querySelector<HTMLImageElement>(HERO);
    Promise.race([img ? decoded(img) : Promise.resolve(), sleep(HOLD_MS - performance.now())]).then(() => {
      // past the CSS fail-safe the curtain is already lifting: switching animations now would restart it
      if (performance.now() > LATE_MS) return;
      // one frame so the decoded picture is painted under the curtain before it moves
      requestAnimationFrame(() => html.classList.add('lift'));
    });
    // the curtain is off-screen by ~2 s at the latest: drop the class so it never intercepts anything
    html.querySelector('.curtain')?.addEventListener('animationend', (e) => {
      if (/^curtain-(up|lift)$/.test((e as AnimationEvent).animationName)) html.classList.remove('arriving');
    });
    setTimeout(() => html.classList.remove('arriving'), 2200);
  }

  // Warm on intent (hover for a beat, keyboard focus, touch), so the picture is usually ready before the click.
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  if (!saveData) {
    let t = 0;
    const intent = (e: Event, delay: number) => {
      const a = (e.target as Element | null)?.closest?.<HTMLAnchorElement>('a[href]') ?? null;
      const url = target(a);
      clearTimeout(t);
      if (url) t = window.setTimeout(() => warm(url), delay);
    };
    document.addEventListener('pointerover', (e) => intent(e, 90), { passive: true });
    document.addEventListener('pointerout', () => clearTimeout(t), { passive: true });
    document.addEventListener('focusin', (e) => intent(e, 0));
    document.addEventListener('touchstart', (e) => intent(e, 0), { passive: true });
  }

  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href]');
    const url = target(a);
    if (!a || !url) return;
    e.preventDefault();
    if (leaving) return;
    leaving = true;
    const name = NAMES[url.pathname] ?? (a.textContent || '').trim().slice(0, 28);
    try { sessionStorage.setItem('sn-wipe', name); } catch {}
    const t = document.querySelector<HTMLElement>('[data-curtain-t]');
    if (t) t.textContent = name;
    html.classList.add('leaving');
    // Go once the curtain has closed and the mark has drawn (WIPE_MS) and the next picture is decoded, but never
    // later than HOLD_MS after the click: a slow picture then finishes loading under the arriving curtain instead.
    const ready = warm(url);
    Promise.all([sleep(WIPE_MS), Promise.race([ready, sleep(HOLD_MS)])]).then(() => {
      location.href = url.href;
    });
  });
}
