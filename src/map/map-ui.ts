// Map controller: the SVG map without a GPU, the live relief with one (relief/mount.ts).
// Town toolbar first (roving tabindex: arrows, Home, End; Enter/Space select; Esc → overview), then the pins as one
// roving group, card swap with a polite announcement, deep link /?town=slug#map, calculator sheet.
import { mountRelief, type ReliefHandle } from '../relief/mount';
import { initCalcs, setPrice } from '../calc/calc';

interface Pt { x: number; y: number }
interface Data { towns: (Pt & { slug: string })[]; pins: (Pt & { id: string; town: string })[]; sn: Pt }
type Box = { cx: number; cy: number; w: number; h: number };

const OVERVIEW: Box = { cx: -1.5, cy: -16.5, w: 34, h: 74 }; // North Salt Lake → Provo, Herriman → Provo (km)
const TOWN_SPAN = 13; // km shown around a selected town

export function initMap() {
  const found = document.querySelector<HTMLElement>('[data-map]');
  if (!found) return;
  const root: HTMLElement = found;
  // The contour poster (150 KB) is not part of the first paint: it loads about a screen before the chapter arrives.
  const uses = [...root.querySelectorAll<SVGUseElement>('use[data-href]')];
  const lazy = new IntersectionObserver((es) => {
    if (!es.some((e) => e.isIntersecting)) return;
    lazy.disconnect();
    uses.forEach((u) => u.setAttribute('href', u.dataset.href!));
  }, { rootMargin: '100% 0px' });
  lazy.observe(root);

  // V3, lazily: the contour paths (26 KB) are no longer in the home HTML. They arrive with the relief poster, about a
  // screen early, and draw outward from Lehi as the chapter scrolls in (same timing as motion-vectors.md V3); then
  // the model (or the flat relief) crossfades in. Reduced motion never sees the drawing: the poster is shown as is.
  const topo = root.querySelector<SVGSVGElement>('[data-topo]');
  if (topo && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const io2 = new IntersectionObserver(async (es) => {
      if (!es.some((e) => e.isIntersecting)) return;
      io2.disconnect();
      try {
        const [{ default: lines }, { gsap }, { ScrollTrigger }, { prep }] = await Promise.all([
          import('../data/lines/contours.json'),
          import('gsap'),
          import('gsap/ScrollTrigger'),
          import('../scripts/lines'),
        ]);
        gsap.registerPlugin(ScrollTrigger);
        const NS = 'http://www.w3.org/2000/svg';
        const home = topo.querySelector('.home');
        const paths = (lines as { d: string; major: boolean }[]).map((c) => {
          const el = document.createElementNS(NS, 'path');
          el.setAttribute('d', c.d);
          if (!c.major) el.setAttribute('class', 'minor');
          topo.insertBefore(el, home);
          return el;
        });
        let done = false;
        const land = () => {
          if (done) return;
          done = true;
          root.classList.remove('hold');
          root.classList.add('drawn');
          root.querySelectorAll<HTMLElement>('.pin i').forEach((i, k) =>
            i.animate([{ transform: 'translateY(-22px) scaleY(2.4)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 700, delay: 120 + k * 70, easing: 'cubic-bezier(0.19, 1, 0.22, 1)', fill: 'backwards' }),
          );
        };
        // already past the chapter's opening (deep link, reload mid-page): no drawing, just the map
        if (root.getBoundingClientRect().top < innerHeight * 0.1) return;
        // a keyboard user who tabs in mid-draw gets the finished map at once (the pins are focusable only after)
        root.addEventListener('focusin', land, { once: true });
        root.classList.add('hold');
        topo.classList.add('drawn-ready');
        const tl = gsap.timeline({ scrollTrigger: { trigger: root, start: 'top 80%', end: 'top 10%', scrub: 0.6, invalidateOnRefresh: true } });
        if (home) tl.fromTo(home, { opacity: 0 }, { opacity: 1, duration: 0.05 }, 0);
        paths.forEach((p, k) => tl.fromTo(p, { strokeDashoffset: () => prep(p) }, { strokeDashoffset: 0, duration: 0.35, ease: 'none' }, 0.04 + k * (0.5 / paths.length)));
        tl.eventCallback('onUpdate', () => tl.progress() > 0.9 && land());
        ScrollTrigger.create({ trigger: root, start: 'top 10%', once: true, onEnter: land });
        setTimeout(() => root.getBoundingClientRect().top < innerHeight * 0.1 && land(), 0);
      } catch {
        root.classList.remove('hold'); // fail open: the map, without the drawing
      }
    }, { rootMargin: '100% 0px' });
    io2.observe(root);
  }
  const data: Data = JSON.parse(root.querySelector('[data-map-json]')!.textContent!);
  const stage = root.querySelector<HTMLElement>('[data-stage]')!;
  const svg = root.querySelector<SVGSVGElement>('[data-map-svg]')!;
  const toolbar = root.querySelector<HTMLElement>('[data-toolbar]')!;
  const buttons = [...toolbar.querySelectorAll<HTMLButtonElement>('[data-town]')];
  const cards = [...root.querySelectorAll<HTMLElement>('[data-card]')];
  const pins = [...root.querySelectorAll<HTMLButtonElement>('[data-pin]')];
  const labels = [...root.querySelectorAll<HTMLElement>('[data-label]')];
  const sn = root.querySelector<HTMLElement>('[data-sn]')!;
  const announce = root.querySelector<HTMLElement>('[data-announce]')!;
  const cardBox = root.querySelector<HTMLElement>('[data-cards]')!;
  const fullBtn = root.querySelector<HTMLButtonElement>('[data-full]')!;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const townPt = Object.fromEntries(data.towns.map((t) => [t.slug, t]));
  const pinPt = Object.fromEntries(data.pins.map((p) => [p.id, p]));

  let gl: ReliefHandle | null = null;
  let current: string | null = null;
  let vb = { x: 0, y: 0, s: 1 }; // viewBox origin (km) + px per km
  let anim = 0;

  // Nothing covers the stage any more (split view): the free area is the stage, less room for the pin tags above the
  // heads, the "Full map" button top-right and a margin at the foot.
  function free() {
    const W = stage.clientWidth, H = stage.clientHeight;
    const m = W < 600 ? 24 : 28;
    const t = W < 600 ? 44 : 64;
    return { W, H, l: m, t, w: Math.max(160, W - 2 * m), h: Math.max(160, H - t - m) };
  }

  function fit(b: Box) {
    const f = free();
    const s = Math.min(f.w / b.w, f.h / b.h);
    return { x: b.cx - (f.l + f.w / 2) / s, y: b.cy - (f.t + f.h / 2) / s, s };
  }

  // Pins closer than 36 px on screen would overlap as touch targets: show the first, hide the rest (every home
  // stays reachable through the town card's list). Order of precedence: the picked or focused pin, the picked town's
  // pins (for sale first), then the rest; so the pin someone is on is never the one that disappears.
  let placed: { x: number; y: number }[] = [];
  const collides = (x: number, y: number) => {
    if (placed.some((q) => Math.hypot(q.x - x, q.y - y) < 36)) return true; // 44 px targets, 24 px cores never overlap
    placed.push({ x, y });
    return false;
  };
  const RANK = { 'for-sale': 0, sold: 1, past: 2 } as Record<string, number>;
  const status = (el: HTMLElement) => (el.classList.contains('for-sale') ? 'for-sale' : el.classList.contains('sold') ? 'sold' : 'past');
  const ordered = () =>
    pins
      .map((el, i) => ({ el, i, k: (el.classList.contains('on') || el === document.activeElement ? 0 : el.dataset.town === current ? 10 : 20) + RANK[status(el)] }))
      .sort((a, b) => a.k - b.k || a.i - b.i)
      .map((x) => x.el);

  // Tag spacing (jury r2, the Provo flight): with a town picked every pin shows its address; a tag that would overlap
  // one already placed (same precedence as above) stays quiet until hover or focus.
  const tagW = new Map<HTMLElement, number>();
  // tag widths are read once, all together (one layout), never between the writes of a frame
  const measureTags = () => pins.forEach((el) => { if (!tagW.has(el)) tagW.set(el, el.querySelector<HTMLElement>('.tag')!.offsetWidth || 160); });
  const declutter = (pos: Map<HTMLElement, { x: number; y: number }>) => {
    if (tagW.size < pins.length) measureTags();
    const boxes: [number, number, number, number][] = [];
    const town = root.classList.contains('is-town');
    for (const el of ordered()) {
      const q = pos.get(el);
      if (!q || el.style.visibility === 'hidden' || !town) { el.classList.remove('mute'); continue; }
      const w = tagW.get(el) ?? 160;
      const x0 = el.classList.contains('flip') ? q.x + 12 - w : el.classList.contains('flop') ? q.x - 12 : q.x - w / 2;
      const b: [number, number, number, number] = [x0 - 4, q.y - 48, x0 + w + 4, q.y - 16];
      const hit = boxes.some((o) => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]);
      el.classList.toggle('mute', hit);
      if (!hit) boxes.push(b);
    }
  };

  function apply(v: typeof vb) {
    vb = v;
    const W = stage.clientWidth, H = stage.clientHeight;
    const fr = free();
    const minX = fr.l - 12; // labels and pins outside the free area sit under the card or the slips
    const maxX = fr.l + fr.w + 12, maxY = fr.t + fr.h + 12;
    svg.setAttribute('viewBox', `${v.x.toFixed(3)} ${v.y.toFixed(3)} ${(W / v.s).toFixed(3)} ${(H / v.s).toFixed(3)}`);
    const place = (el: HTMLElement, p: Pt) => {
      const px = (p.x - v.x) * v.s, py = (p.y - v.y) * v.s;
      el.style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px)`;
      const off = px < Math.max(-40, minX) || py < -40 || px > Math.min(W + 40, maxX) || py > Math.min(H + 40, maxY);
      if (el.classList.contains('pin')) { el.classList.toggle('flip', px > W - 140); el.classList.toggle('flop', px < 140); }
      el.style.visibility = off || (el.classList.contains('pin') && collides(px, py)) ? 'hidden' : '';
    };
    if (gl) return; // the live relief positions pins itself (glFrame)
    placed = [];
    const pos = new Map<HTMLElement, { x: number; y: number }>();
    ordered().forEach((el) => {
      const p = pinPt[el.dataset.pin!];
      if (!p) return;
      place(el, p);
      pos.set(el, { x: (p.x - v.x) * v.s, y: (p.y - v.y) * v.s });
    });
    declutter(pos);
    // town names on the flat map: the picked town and Lehi first; a name that would overlap one already placed waits
    const boxes: [number, number, number, number][] = [];
    [...labels].sort((a, b) => (b.dataset.label === current ? 1 : 0) - (a.dataset.label === current ? 1 : 0) || (b.dataset.label === 'lehi' ? 1 : 0) - (a.dataset.label === 'lehi' ? 1 : 0)).forEach((el) => {
      const t = townPt[el.dataset.label!];
      const px = (t.x - v.x) * v.s, py = (t.y - v.y) * v.s;
      el.style.transform = `translate(${(px + 10).toFixed(1)}px, ${(py - 10).toFixed(1)}px)`;
      let w = tagW.get(el);
      if (!w) { w = el.offsetWidth || 90; tagW.set(el, w); }
      const b: [number, number, number, number] = [px + 10, py - 22, px + 10 + w, py + 2];
      const off = px < minX || py < 0 || px > Math.min(W - 40, maxX) || py > Math.min(H, maxY);
      const hit = boxes.some((o) => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]);
      el.style.visibility = off || hit ? 'hidden' : '';
      if (!off && !hit) boxes.push(b);
    });
    const spx = (data.sn.x - v.x) * v.s, spy = (data.sn.y - v.y) * v.s;
    sn.style.transform = `translate(${(spx - 15).toFixed(1)}px, ${(spy - 34).toFixed(1)}px)`;
    keepStop();
  }

  function go(b: Box, instant = false) {
    const to = fit(b);
    cancelAnimationFrame(anim);
    if (instant || reduce.matches) return apply(to);
    const from = { ...vb };
    const t0 = performance.now(), D = 420;
    const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / D), e = ease(k);
      // interpolate scale in log space so zooms feel even
      const s = Math.exp(Math.log(from.s) + (Math.log(to.s) - Math.log(from.s)) * e);
      const W = stage.clientWidth, H = stage.clientHeight;
      const cx = from.x + W / from.s / 2 + (to.x + W / to.s / 2 - (from.x + W / from.s / 2)) * e;
      const cy = from.y + H / from.s / 2 + (to.y + H / to.s / 2 - (from.y + H / from.s / 2)) * e;
      apply({ x: cx - W / s / 2, y: cy - H / s / 2, s });
      if (k < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
  }

  function boxFor(slug: string): Box {
    const t = townPt[slug];
    const own = data.pins.filter((p) => p.town === slug);
    const xs = [t.x, ...own.map((p) => p.x)], ys = [t.y, ...own.map((p) => p.y)];
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const w = Math.max(TOWN_SPAN, Math.max(...xs) - Math.min(...xs) + 4);
    return { cx, cy, w, h: Math.max(TOWN_SPAN * 0.8, Math.max(...ys) - Math.min(...ys) + 4) };
  }

  function select(slug: string | null, opts: { home?: string; instant?: boolean; focus?: boolean; overview?: boolean } = {}) {
    current = slug;
    // the town whose card is showing is always the pressed one (first load, deep link, overview, Esc)
    const shown = slug ?? 'lehi';
    buttons.forEach((b) => {
      const on = b.dataset.town === shown;
      b.setAttribute('aria-pressed', String(on));
      b.tabIndex = on ? 0 : -1;
    });
    labels.forEach((l) => l.classList.toggle('on', l.dataset.label === slug && !opts.overview));
    root.classList.toggle('is-town', !!slug && !opts.overview);
    const show = slug ?? 'lehi';
    cards.forEach((c) => c.classList.toggle('on', c.dataset.card === show));
    pins.forEach((p) => p.classList.toggle('on', !!opts.home && p.dataset.pin === opts.home));
    root.querySelectorAll('[data-home]').forEach((li) => li.classList.toggle('on', (li as HTMLElement).dataset.home === opts.home));
    const card = cards.find((c) => c.dataset.card === show);
    if (slug && card && !opts.overview) {
      const name = card.querySelector('h3')?.textContent ?? '';
      const count = card.querySelector('.tc-head > p')?.textContent ?? '';
      announce.textContent = `${name}: ${count}`;
    }
    const overview = !slug || opts.overview;
    if (opts.overview) current = null;
    if (gl) gl.fly(overview ? 'overview' : opts.home ? { home: opts.home } : { town: slug! });
    else go(overview ? OVERVIEW : boxFor(slug!), opts.instant);
    if (opts.focus) buttons.find((b) => b.dataset.town === slug)?.focus();
    fullBtn.hidden = !!overview;
    requestAnimationFrame(fadeCard);
  }

  // Desktop: the card scrolls on its own and its actions stick to its foot; while more of it is below, they sit on a
  // grey plate (no lines, no fades).
  const fadeCard = () => {
    const scrolls = getComputedStyle(cardBox).overflowY === 'auto';
    cardBox.classList.toggle('is-cut', scrolls && cardBox.scrollHeight - cardBox.scrollTop - cardBox.clientHeight > 2);
  };
  cardBox.addEventListener('scroll', fadeCard, { passive: true });
  // The page's smooth scroll (Lenis) skips any element marked data-lenis-prevent. The card is marked only for the
  // wheel events it can really use (it overflows and has room in that direction); every other wheel over the rail
  // or the card scrolls the page (jury r2: 3,000 px of wheel moved the page 400 px).
  cardBox.addEventListener('wheel', (e) => {
    const room = getComputedStyle(cardBox).overflowY === 'auto' && cardBox.scrollHeight - cardBox.clientHeight > 2;
    const can = room && (e.deltaY > 0 ? cardBox.scrollHeight - cardBox.scrollTop - cardBox.clientHeight > 1 : e.deltaY < 0 ? cardBox.scrollTop > 0 : false);
    cardBox.toggleAttribute('data-lenis-prevent', can);
  }, { passive: true });

  // "Full map": back out to the whole valley; focus returns to the picked town in the list.
  fullBtn.addEventListener('click', () => {
    const back = buttons.find((b) => b.dataset.town === current);
    select(null);
    back?.focus();
  });

  // Toolbar: click / Enter / Space select; arrows, Home and End move the roving focus.
  toolbar.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-town]');
    if (b) select(b.dataset.town!);
  });
  toolbar.addEventListener('keydown', (e) => {
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    const horizontal = toolbar.getAttribute('aria-orientation') !== 'vertical';
    const next = horizontal ? ['ArrowRight', 'ArrowDown'] : ['ArrowDown', 'ArrowRight'];
    const prev = horizontal ? ['ArrowLeft', 'ArrowUp'] : ['ArrowUp', 'ArrowLeft'];
    let j = -1;
    if (next.includes(e.key)) j = (i + 1) % buttons.length;
    else if (prev.includes(e.key)) j = (i - 1 + buttons.length) % buttons.length;
    else if (e.key === 'Home') j = 0;
    else if (e.key === 'End') j = buttons.length - 1;
    if (j >= 0) {
      e.preventDefault();
      buttons.forEach((b, k) => (b.tabIndex = k === j ? 0 : -1));
      buttons[j].focus();
      buttons[j].scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  });
  root.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && current && !sheet.open) {
      const back = buttons.find((b) => b.dataset.town === current);
      select(null);
      back?.focus();
    }
  });

  pins.forEach((p) =>
    p.addEventListener('click', () => {
      rove(p);
      select(p.dataset.town!, { home: p.dataset.pin });
    }),
  );

  // Pins: one tab stop (after the toolbar), arrows move between the pins on screen, Enter/Space opens (native button).
  const shown = (p: HTMLButtonElement) => p.style.visibility !== 'hidden';
  const rove = (to: HTMLButtonElement) => pins.forEach((p) => (p.tabIndex = p === to ? 0 : -1));
  root.querySelector<HTMLElement>('[data-pins]')!.addEventListener('keydown', (e) => {
    const list = pins.filter(shown);
    const i = list.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0 || !list.length) return;
    let j = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % list.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + list.length) % list.length;
    else if (e.key === 'Home') j = 0;
    else if (e.key === 'End') j = list.length - 1;
    if (j < 0) return;
    e.preventDefault();
    rove(list[j]);
    list[j].focus();
  });
  // pins hide when they leave the frame or overlap: the group's tab stop always lands on one that is showing
  const keepStop = () => {
    const stop = pins.find((p) => p.tabIndex === 0);
    if (stop && shown(stop)) return;
    if (stop && document.activeElement === stop) return; // never yank focus mid-flight
    const next = pins.find(shown);
    if (next) rove(next);
  };

  // Calculator sheet (native <dialog>: focus trap + Esc for free).
  const sheet = root.querySelector<HTMLDialogElement>('[data-sheet]')!;
  const note = root.querySelector<HTMLElement>('[data-sheet-note]')!;
  let opener: HTMLElement | null = null;
  initCalcs(sheet);
  root.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-run]');
    if (!b) return;
    opener = b;
    const price = Number(b.dataset.run);
    const form = sheet.querySelector<HTMLFormElement>('form[data-calc]')!;
    if (price) {
      setPrice(form, price);
      note.textContent = `Priced at the asking price, $${price.toLocaleString('en-US')}. Rent and costs are examples; change any of them.`;
    } else {
      note.textContent = 'Example numbers. Change any of them.';
    }
    (window as any).__lenis?.stop();
    sheet.showModal();
  });
  sheet.querySelector('[data-sheet-close]')!.addEventListener('click', () => sheet.close());
  sheet.addEventListener('click', (e) => {
    if (e.target === sheet) sheet.close();
  });
  sheet.addEventListener('close', () => {
    (window as any).__lenis?.start();
    opener?.focus();
  });

  // Layout + deep link
  const deep = new URLSearchParams(location.search).get('town');
  const startTown = deep && townPt[deep] ? deep : null;
  const layout = () => (current ? go(boxFor(current), true) : go(OVERVIEW, true));
  new ResizeObserver(() => { layout(); fadeCard(); }).observe(stage);
  select(startTown ?? 'lehi', { instant: true, overview: !startTown });

  // The 3D: mount when the section nears the viewport. In GL mode the town labels and the SN mark are part of
  // the model, and the pin buttons follow the projected pin heads every rendered frame.
  // V5 (the route from Lehi) is drawn in the model itself, draped on the terrain (relief.ts setRoute).
  const glFrame = () => {
    if (!gl) return;
    const fr = free();
    const minX = fr.l - 12;
    const W = Math.min(stage.clientWidth, fr.l + fr.w + 12), H = Math.min(stage.clientHeight, fr.t + fr.h + 12);
    placed = [];
    const pos = new Map<HTMLElement, { x: number; y: number }>();
    ordered().forEach((el) => {
      const p = gl!.project(el.dataset.pin!);
      if (!p) return;
      el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`;
      el.classList.toggle('flip', p.x > W - 140);
      el.classList.toggle('flop', p.x < 140);
      el.style.visibility = !p.visible || p.x < Math.max(0, minX) || p.y < 0 || p.x > W || p.y > H || collides(p.x, p.y) ? 'hidden' : '';
      pos.set(el, p);
    });
    declutter(pos);
    keepStop();
  };
  // Reduced motion: the contour poster, still (no model, no flights), like the hero keeps its still instead of the film.
  if (reduce.matches) return;
  // Boot early, in idle time, so nothing of it lands in a scroll frame at the hand-off (jury r3 P1-5): on desktops
  // right after load; on phones and tablets (data and battery) when the chapter is about three screens away.
  let booted = false;
  const boot = async () => {
    if (booted) return;
    booted = true;
    io.disconnect();
    const h = await mountRelief(stage, { role: 'map' });
    if (!h) return;
    measureTags();
    gl = h;
    root.classList.add('is-gl');
    h.setFree(free);
    h.onFrame(glFrame);
    if (current) h.fly({ town: current });
  };
  const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && boot(), { rootMargin: '300% 0px' });
  io.observe(root);
  if (matchMedia('(min-width: 900px) and (pointer: fine)').matches) {
    const later = () => ('requestIdleCallback' in window ? requestIdleCallback(() => boot(), { timeout: 4000 }) : setTimeout(boot, 1500));
    if (document.readyState === 'complete') later();
    else addEventListener('load', later, { once: true });
  }
  addEventListener('relief:fallback', () => {
    gl = null;
    root.classList.remove('is-gl');
    layout();
  });
}
