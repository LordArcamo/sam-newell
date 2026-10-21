// Map controller (no-GPU SVG mode today; forwards to the GL handle once the model ships).
// Town toolbar with roving tabindex (arrows, Home, End), Enter/Space select, Esc → overview,
// pins as buttons, card swap with a polite announcement, deep link /?town=slug#map, calculator sheet.
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
  const panel = root.querySelector<HTMLElement>('[data-towns]')!;
  const cardWrap = root.querySelector<HTMLElement>('[data-cards]')!;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const townPt = Object.fromEntries(data.towns.map((t) => [t.slug, t]));
  const pinPt = Object.fromEntries(data.pins.map((p) => [p.id, p]));

  let gl: ReliefHandle | null = null;
  let current: string | null = null;
  let vb = { x: 0, y: 0, s: 1 }; // viewBox origin (km) + px per km
  let anim = 0;

  // The free area of the stage that the panel and card do not cover (desktop overlays them).
  function free() {
    const W = stage.clientWidth, H = stage.clientHeight;
    const overlay = getComputedStyle(cardWrap).position === 'absolute';
    if (!overlay) return { W, H, l: 16, t: 16, w: W - 32, h: H - 32 };
    const right = cardWrap.getBoundingClientRect().right - stage.getBoundingClientRect().left + 24;
    return { W, H, l: right, t: 24, w: Math.max(200, W - right - 32), h: H - 48 };
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
    if (placed.some((q) => Math.hypot(q.x - x, q.y - y) < 32)) return true;
    placed.push({ x, y });
    return false;
  };

  function apply(v: typeof vb) {
    vb = v;
    const W = stage.clientWidth, H = stage.clientHeight;
    const minX = free().l - 12; // anything left of this sits under the panel and card on desktop
    svg.setAttribute('viewBox', `${v.x.toFixed(3)} ${v.y.toFixed(3)} ${(W / v.s).toFixed(3)} ${(H / v.s).toFixed(3)}`);
    const place = (el: HTMLElement, p: Pt) => {
      const px = (p.x - v.x) * v.s, py = (p.y - v.y) * v.s;
      el.style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px)`;
      const off = px < Math.max(-40, minX) || py < -40 || px > W + 40 || py > H + 40;
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
      el.style.visibility = px < minX || py < 0 || px > W - 40 || py > H ? 'hidden' : '';
    });
    const spx = (data.sn.x - v.x) * v.s, spy = (data.sn.y - v.y) * v.s;
    sn.style.transform = `translate(${(spx - 15).toFixed(1)}px, ${(spy - 34).toFixed(1)}px)`;
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
    buttons.forEach((b) => {
      const on = b.dataset.town === slug;
      b.setAttribute('aria-pressed', String(on));
      if (slug) b.tabIndex = on ? 0 : -1;
    });
    if (!slug) buttons.forEach((b, i) => (b.tabIndex = i === 0 ? 0 : -1));
    labels.forEach((l) => l.classList.toggle('on', l.dataset.label === slug));
    const show = slug ?? 'lehi';
    cards.forEach((c) => c.classList.toggle('on', c.dataset.card === show));
    pins.forEach((p) => p.classList.toggle('on', !!opts.home && p.dataset.pin === opts.home));
    root.querySelectorAll('[data-home]').forEach((li) => li.classList.toggle('on', (li as HTMLElement).dataset.home === opts.home));
    const card = cards.find((c) => c.dataset.card === show);
    if (slug && card && !opts.overview) {
      const name = card.querySelector('h3')?.textContent ?? '';
      const count = card.querySelector('.tc-body > p')?.textContent ?? '';
      announce.textContent = `${name}: ${count}`;
    }
    const overview = !slug || opts.overview;
    if (opts.overview) current = null;
    if (gl) gl.fly(overview ? 'overview' : opts.home ? { home: opts.home } : { town: slug! });
    else go(overview ? OVERVIEW : boxFor(slug!), opts.instant);
    if (opts.focus) buttons.find((b) => b.dataset.town === slug)?.focus();
  }

  // Toolbar: click / Enter / Space select; arrows, Home and End move the roving focus.
  toolbar.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-town]');
    if (b) select(b.dataset.town!);
  });
  toolbar.addEventListener('keydown', (e) => {
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    const horizontal = getComputedStyle(toolbar).display === 'flex' && innerWidth >= 1024;
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
      select(p.dataset.town!, { home: p.dataset.pin });
    }),
  );

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
  new ResizeObserver(() => layout()).observe(stage);
  select(startTown ?? 'lehi', { instant: true, overview: !startTown });
  void panel;

  // The 3D: mount when the section nears the viewport. In GL mode the town labels and the SN mark are part of
  // the model, and the pin buttons follow the projected pin heads every rendered frame.
  const glFrame = () => {
    if (!gl) return;
    const minX = free().l - 12;
    const W = stage.clientWidth, H = stage.clientHeight;
    placed = [];
    pins.forEach((el) => {
      const p = gl!.project(el.dataset.pin!);
      if (!p) return;
      el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`;
      el.style.visibility = !p.visible || p.x < Math.max(0, minX) || p.y < 0 || p.x > W || p.y > H || collides(p.x, p.y) ? 'hidden' : '';
    });
  };
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
