// Motion chunk (GSAP + ScrollTrigger + Lenis), loaded after first paint on idle. Transform / opacity only.
// Nothing here hides content: reveals are CSS classes that fail open (reveal.ts). Reduced motion: nothing runs.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { prep } from './lines';

const EXPO = 'expo.out';
/** Scroll-scrubbed line drawing: each path from undrawn to drawn, re-measured on every refresh (resize). */
function drawTl(svg: SVGSVGElement, trigger: Element, start: string, end: string, scrub: number) {
  svg.classList.add('drawn-ready');
  return gsap.timeline({ scrollTrigger: { trigger, start, end, scrub, invalidateOnRefresh: true } });
}
const undrawn = (p: SVGGeometryElement) => ({ strokeDashoffset: () => prep(p) });

export function initMotion() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  gsap.registerPlugin(ScrollTrigger);
  const desktop = matchMedia('(min-width: 901px)').matches;

  // Intro: the sentence holds (CSS sticky) while his pictures pass at their own speeds.
  if (desktop) {
    document.querySelectorAll<HTMLElement>('[data-par]').forEach((el) => {
      const amt = Number(el.dataset.par || 0);
      gsap.fromTo(el, { yPercent: -amt }, { yPercent: amt, ease: 'none', scrollTrigger: { trigger: el.closest('section') ?? el, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  }

  // Listing panels: each picture travels through its window more slowly than the page and settles 1.06 → 1.
  document.querySelectorAll<HTMLElement>('[data-panel-img]').forEach((el) => {
    const win = el.closest('li') ?? el;
    gsap.fromTo(el, { yPercent: -6, scale: 1.06 }, { yPercent: 6, scale: 1, ease: 'none', scrollTrigger: { trigger: win, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  // One scene: the pinned screen hands the light from one statement to the next and cuts to its picture
  // (clip from the bottom edge, CSS). Phones and reduced motion get the stacked version (CSS), so nothing runs there.
  if (desktop) {
    document.querySelectorAll<HTMLElement>('[data-scene]').forEach((scene) => {
      const items = [...scene.querySelectorAll<HTMLElement>('[data-step]')];
      const slides = [...scene.querySelectorAll<HTMLElement>('[data-slide]')];
      const idx = scene.querySelector<HTMLElement>('[data-scene-i]');
      scene.classList.add('live');
      // the next pictures are clipped away until their cut, so the browser would wait to load them: ask now,
      // and decode them ahead so the cut never waits
      slides.forEach((f) => f.querySelectorAll('img').forEach((i) => {
        i.loading = 'eager';
        i.decode?.().catch(() => {});
      }));
      let last = -1;
      const show = (i: number) => {
        if (i === last) return;
        last = i;
        items.forEach((li, k) => li.classList.toggle('on', k === i));
        slides.forEach((f, k) => f.classList.toggle('in', k <= i));
        if (idx) idx.textContent = String(i + 1);
      };
      const st = ScrollTrigger.create({
        trigger: scene,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (t) => show(Math.min(items.length - 1, Math.floor(t.progress * items.length * 0.999))),
      });
      // every step stays in the accessibility tree and the tab order (the inactive ones are only transparent);
      // focusing one scrolls the scene to it, so what has focus is always the step on screen
      items.forEach((li, k) => {
        li.addEventListener('focusin', () => {
          const y = st.start + (st.end - st.start) * ((k + 0.5) / items.length);
          const lenis = (window as any).__lenis;
          if (lenis) lenis.scrollTo(y, { immediate: true });
          else scrollTo({ top: y, behavior: 'instant' as ScrollBehavior });
          show(k);
        });
      });
    });
  }

  // ——— Line work, scroll-scrubbed (review/motion-vectors.md) ———
  // V3: the real USGS contours draw outward from Lehi as the map chapter arrives; then the model (or the flat
  // relief) crossfades in and the contours give way. The pins drop in after.
  document.querySelectorAll<SVGSVGElement>('[data-draw="topo"]').forEach((svg) => {
    const map = svg.closest<HTMLElement>('[data-map]');
    if (!map) return;
    const paths = [...svg.querySelectorAll<SVGPathElement>('path')];
    const home = svg.querySelector('.home');
    map.classList.add('hold');
    let done = false;
    const land = () => {
      if (done) return;
      done = true;
      map.classList.remove('hold');
      map.classList.add('drawn');
      map.querySelectorAll<HTMLElement>('.pin i').forEach((i, k) =>
        i.animate([{ transform: 'translateY(-22px) scaleY(2.4)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 700, delay: 120 + k * 70, easing: 'cubic-bezier(0.19, 1, 0.22, 1)', fill: 'backwards' }),
      );
    };
    const tl = drawTl(svg, map, 'top 80%', 'top 10%', 0.6);
    if (home) tl.fromTo(home, { opacity: 0 }, { opacity: 1, duration: 0.05 }, 0);
    paths.forEach((p, k) => tl.fromTo(p, undrawn(p), { strokeDashoffset: 0, duration: 0.35, ease: 'none' }, 0.04 + k * (0.5 / paths.length)));
    tl.eventCallback('onUpdate', () => tl.progress() > 0.9 && land());
    // fail-open: anyone who lands mid-page (deep link, reload) gets the map
    ScrollTrigger.create({ trigger: map, start: 'top 10%', once: true, onEnter: land });
    if (map.getBoundingClientRect().top < innerHeight * 0.1) land();
  });

  // V4: the stud wall, laid out the way a framer builds it: plates, studs left to right, header, jacks, sill, cripples.
  document.querySelectorAll<SVGSVGElement>('[data-draw="wall"]').forEach((svg) => {
    const tl = drawTl(svg, svg, 'top 85%', 'center 45%', 0.5);
    let at = 0;
    svg.querySelectorAll<SVGPathElement>('path').forEach((p) => {
      const k = p.dataset.k;
      const d = k === 'plate' ? 0.6 : k === 'stud' ? 0.35 : 0.45;
      tl.fromTo(p, undrawn(p), { strokeDashoffset: 0, duration: d, ease: 'none' }, at);
      at += k === 'stud' || k === 'cripple' ? 0.05 : d * 0.8;
    });
  });

  // Rules that draw with the reader: the /about/ years, the Steps progress line on /buy/ and /sell/.
  document.querySelectorAll<SVGSVGElement>('[data-draw="rule"]').forEach((svg) => {
    const host = svg.closest<HTMLElement>('[data-rule-host]') ?? svg;
    const tl = drawTl(svg, host, svg.dataset.start || 'top 70%', svg.dataset.end || 'bottom 60%', 0.4);
    svg.querySelectorAll<SVGGeometryElement>('path, line').forEach((p) => tl.fromTo(p, undrawn(p), { strokeDashoffset: 0, duration: 1, ease: 'none' }, 0));
    // nodes fill as the line passes them: along a horizontal rule by progress, down a vertical one by position
    const nodes = [...host.querySelectorAll<HTMLElement>('[data-node]')];
    if (svg.dataset.axis === 'x') {
      // each node's place along the rule, measured on refresh (never during scroll)
      let at: number[] = [];
      const measure = () => {
        const r = svg.getBoundingClientRect();
        at = nodes.map((n) => (n.getBoundingClientRect().left - r.left) / Math.max(1, r.width));
      };
      measure();
      ScrollTrigger.addEventListener('refresh', measure);
      tl.eventCallback('onUpdate', () => {
        const p = tl.progress();
        nodes.forEach((n, k) => n.classList.toggle('lit', at[k] <= p + 0.002));
      });
    } else {
      nodes.forEach((n) => {
        ScrollTrigger.create({ trigger: n, start: 'top 55%', onEnter: () => n.classList.add('lit'), onLeaveBack: () => n.classList.remove('lit') });
      });
    }
  });

  // Figures roll into place like an odometer, once: each digit is a 0–9 column (drawn by CSS, not text) that
  // settles on its value; the real figure stays in the element for screen readers.
  document.querySelectorAll<HTMLElement>('[data-odo]').forEach((el) => {
    const text = el.textContent ?? '';
    if (!/\d/.test(text)) return;
    const cols: HTMLElement[] = [];
    el.textContent = '';
    el.classList.add('odo-on');
    if (!el.closest('[aria-hidden="true"]')) {
      const sr = document.createElement('span');
      sr.className = 'sr-only';
      sr.textContent = text;
      el.appendChild(sr);
    }
    for (const ch of text) {
      const s = document.createElement('span');
      s.setAttribute('aria-hidden', 'true');
      if (/\d/.test(ch)) {
        s.className = 'odo';
        s.dataset.v = ch;
        cols.push(s);
      } else s.dataset.c = ch;
      el.appendChild(s);
    }
    ScrollTrigger.create({
      trigger: el,
      start: 'top 92%',
      once: true,
      onEnter: () => cols.forEach((c, k) => gsap.to(c, { '--y': `${-10 * Number(c.dataset.v)}%`, duration: 1.2 + k * 0.06, delay: k * 0.06, ease: EXPO })),
    });
  });

  // The 235 figure rises out of the shade as its chapter arrives.
  document.querySelectorAll<HTMLElement>('[data-rise]').forEach((el) => {
    gsap.fromTo(el, { yPercent: 35, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 95%', once: true } });
  });

  // Big stills drift slowly while on screen (the film feeling, transform only).
  document.querySelectorAll<HTMLElement>('[data-drift]').forEach((el) => {
    const amt = Number(el.dataset.drift || 6);
    gsap.fromTo(el, { yPercent: -amt }, { yPercent: amt, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  if (matchMedia('(min-width: 1024px) and (pointer: fine)').matches) {
    const lenis = new Lenis({ lerp: 0.1, syncTouch: false, anchors: true }); // offsets come from CSS scroll-padding / scroll-margin
    (window as any).__lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.lagSmoothing(0);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
  }
}
