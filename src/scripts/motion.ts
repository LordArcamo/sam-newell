// Motion chunk (GSAP + ScrollTrigger + Lenis), loaded after first paint on idle. Desktop smooth scroll only;
// nothing under reduced motion. One clock: gsap.ticker drives Lenis (added last, lesson #05).
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

export function initMotion() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  gsap.registerPlugin(ScrollTrigger);

  // The hero poster never moves: the live relief (src/relief) owns the hero's motion (drift + scroll dolly),
  // and the poster under it must keep the identical crop for a clean hand-off.

  // Parallax drift on marked pictures (the moving-picture layer).
  document.querySelectorAll<HTMLElement>('[data-drift]').forEach((el) => {
    const amt = Number(el.dataset.drift || 8);
    gsap.fromTo(el, { yPercent: amt }, { yPercent: -amt, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  // The 235 figure counts its line in (no count-up of the number itself; it is a fact, shown whole).
  document.querySelectorAll<HTMLElement>('[data-rise]').forEach((el) => {
    gsap.fromTo(el, { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
  });

  const desktop = matchMedia('(min-width: 1024px) and (pointer: fine)').matches;
  if (desktop) {
    const lenis = new Lenis({ lerp: 0.12, syncTouch: false, anchors: true }); // offsets come from CSS scroll-padding / scroll-margin
    (window as any).__lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.lagSmoothing(0);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
  }
}
