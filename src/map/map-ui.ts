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

  // Pins closer than 26 px on screen would overlap as touch targets: show the first, hide the rest (every home
  // stays reachable through the town card's list).
  let placed: { x: number; y: number }[] = [];
  const collides = (x: number, y: number) => {
    if (placed.some((q) => Math.hypot(q.x - x, q.y - y) < 36)) return true; // 44 px targets, 24 px cores never overlap
    placed.push({ x, y });
    return false;
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
    pins.forEach((el) => {
      const p = pinPt[el.dataset.pin!];
      if (p) place(el, p);
    });
    labels.forEach((el) => {
      const t = townPt[el.dataset.label!];
      const px = (t.x - v.x) * v.s, py = (t.y - v.y) * v.s;
      el.style.transform = `translate(${(px + 10).toFixed(1)}px, ${(py - 10).toFixed(1)}px)`;
      el.style.visibility = px < minX || py < 0 || px > Math.min(W - 40, maxX) || py > Math.min(H, maxY) ? 'hidden' : '';
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
    if (gl) drawRoute(overview ? null : slug);
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
  // V5: a line from Lehi, home base, to the picked town draws with the camera flight (0.9 s); the last one retracts.
  // Straight, as the crow flies: it marks the distance from home base, it is not a road.
  const NS = 'http://www.w3.org/2000/svg';
  const route = document.createElementNS(NS, 'svg');
  route.setAttribute('class', 'route');
  route.setAttribute('aria-hidden', 'true');
  route.dataset.ui = '';
  const rl = document.createElementNS(NS, 'line');
  rl.setAttribute('pathLength', '1');
  route.appendChild(rl);
  stage.appendChild(route);
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let routeTo: string | null = null;
  let routeAnim: Animation | null = null;
  const drawRoute = (slug: string | null) => {
    const next = slug && slug !== 'lehi' ? slug : null;
    if (next === routeTo) return;
    routeAnim?.cancel();
    if (!next) {
      if (routeTo && !still) routeAnim = rl.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: 1 }], { duration: 300, easing: 'ease-in', fill: 'forwards' });
      else rl.style.strokeDashoffset = '1';
      routeTo = null;
      return;
    }
    routeTo = next;
    rl.style.strokeDashoffset = '0';
    if (!still) routeAnim = rl.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 900, delay: 120, easing: 'cubic-bezier(0.45, 0, 0.55, 1)', fill: 'backwards' });
  };
  const placeRoute = () => {
    if (!gl || !routeTo) return;
    const a = gl.project('sn'), b = gl.project(`town:${routeTo}`);
    if (!a || !b) return;
    rl.setAttribute('x1', a.x.toFixed(1));
    rl.setAttribute('y1', a.y.toFixed(1));
    rl.setAttribute('x2', b.x.toFixed(1));
    rl.setAttribute('y2', b.y.toFixed(1));
  };

  const glFrame = () => {
    if (!gl) return;
    placeRoute();
    const fr = free();
    const minX = fr.l - 12;
    const W = Math.min(stage.clientWidth, fr.l + fr.w + 12), H = Math.min(stage.clientHeight, fr.t + fr.h + 12);
    placed = [];
    pins.forEach((el) => {
      const p = gl!.project(el.dataset.pin!);
      if (!p) return;
      el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`;
      el.classList.toggle('flip', p.x > W - 140);
      el.classList.toggle('flop', p.x < 140);
      el.style.visibility = !p.visible || p.x < Math.max(0, minX) || p.y < 0 || p.x > W || p.y > H || collides(p.x, p.y) ? 'hidden' : '';
    });
    keepStop();
  };
  // Reduced motion: the contour poster, still (no model, no flights), like the hero keeps its still instead of the film.
  if (reduce.matches) return;
  const io = new IntersectionObserver(
    async (es) => {
      if (!es.some((e) => e.isIntersecting)) return;
      io.disconnect();
      const h = await mountRelief(stage, { role: 'map' });
      if (!h) return;
      gl = h;
      root.classList.add('is-gl');
      h.setFree(free);
      h.onFrame(glFrame);
      if (current) h.fly({ town: current });
    },
    { rootMargin: '200px' },
  );
  io.observe(root);
  addEventListener('relief:fallback', () => {
    gl = null;
    root.classList.remove('is-gl');
    layout();
  });
}
