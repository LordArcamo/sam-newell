// Motion chunk (GSAP + ScrollTrigger + Lenis), loaded after first paint on idle. Transform / opacity only.
// Nothing here hides content: reveals are CSS classes that fail open (reveal.ts). Reduced motion: nothing runs.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

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

  // One scene, stepping statements: the pinned scene (CSS sticky) hands the light from one line to the next.
  document.querySelectorAll<HTMLElement>('[data-scene]').forEach((scene) => {
    const items = [...scene.querySelectorAll<HTMLElement>('[data-step]')];
    const bg = scene.querySelector<HTMLElement>('.scene-bg');
    ScrollTrigger.create({
      trigger: scene,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (st) => {
        const i = Math.min(items.length - 1, Math.floor(st.progress * items.length));
        items.forEach((li, k) => li.classList.toggle('on', k === i));
      },
    });
    if (bg) gsap.fromTo(bg, { scale: 1.1 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: scene, start: 'top top', end: 'bottom bottom', scrub: true } });
    scene.querySelectorAll<HTMLElement>('.pair').forEach((p, k) => {
      gsap.fromTo(p, { yPercent: k ? 30 : 50 }, { yPercent: k ? -30 : -40, ease: 'none', scrollTrigger: { trigger: scene, start: 'top top', end: 'bottom bottom', scrub: true } });
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
