// Line work, the timed and hover pieces (review/motion-vectors.md): the Wasatch skyline under the hero name (V2)
// and its echo on the swatch nav (V6). No GSAP here: Web Animations on stroke-dashoffset only, so it ships in the
// small first chunk. The scroll-scrubbed pieces (contours, stud wall, step and timeline lines) live in motion.ts.
// Reduced motion: nothing is prepared, so every line is simply drawn.

/**
 * Dash a path for drawing. Non-scaling strokes dash in screen pixels, not viewBox units, so the length is scaled by
 * the SVG's screen scale (the demo's fix). Returns the dash length; the path starts undrawn.
 */
export function prep(p: SVGGeometryElement): number {
  const m = p.getScreenCTM();
  const len = p.getTotalLength();
  let L: number;
  if (!m || Math.abs(Math.abs(m.a) - Math.abs(m.d)) < 0.02 * Math.abs(m.a)) {
    L = len * (m ? Math.hypot(m.a, m.b) : 1) + 2;
  } else {
    // stretched drawings (preserveAspectRatio="none") scale x and y differently: measure on screen
    const n = 400;
    let px = 0, py = 0;
    L = 2;
    for (let i = 0; i <= n; i++) {
      const q = p.getPointAtLength((len * i) / n);
      const x = m.a * q.x + m.c * q.y, y = m.b * q.x + m.d * q.y;
      if (i) L += Math.hypot(x - px, y - py);
      px = x;
      py = y;
    }
    L = L * 1.08 + 4; // a dash longer than the line hides it completely; a shorter one leaves a tick
  }
  p.style.strokeDasharray = `${L} ${L}`;
  p.style.strokeDashoffset = String(L);
  return L;
}
/** Leave a drawn path in its natural state (no dash): it then survives any resize. */
const settle = (p: SVGGeometryElement) => {
  p.style.strokeDasharray = '';
  p.style.strokeDashoffset = '';
};

export function initLines() {
  const html = document.documentElement;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // V2: the skyline draws once under the name. With the opening it starts after the name has risen; on any later
  // visit it draws on load. Skipping the opening finishes it.
  const sky = document.querySelector<SVGSVGElement>('[data-draw="hero"]');
  const skyPath = sky?.querySelector<SVGPathElement>('path');
  // the line is as wide as the name, so it is measured once the display face has loaded
  if (sky && skyPath) document.fonts.ready.then(() => drawSky(sky, skyPath));
  function drawSky(sky: SVGSVGElement, skyPath: SVGPathElement) {
    const L = prep(skyPath);
    sky.classList.add('drawn-ready');
    const op = html.classList.contains('op') && !html.classList.contains('op-skip');
    // timed from navigation start: with the opening it begins as the name finishes rising (~2.1 s)
    const at = op ? 2100 : html.classList.contains('arriving') ? 1300 : 500;
    const a = skyPath.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }], {
      duration: op ? 2400 : 1600,
      delay: Math.max(0, at - performance.now()),
      easing: 'cubic-bezier(0.45, 0, 0.55, 1)',
      fill: 'forwards',
    });
    a.onfinish = () => {
      settle(skyPath);
      a.cancel();
    };
    if (op) {
      const skip = () => a.finish();
      ['keydown', 'pointerdown', 'wheel', 'touchstart'].forEach((ev) => addEventListener(ev, skip, { once: true, passive: true }));
    }
  }

  // V6: hovering a swatch traces the skyline along its foot; leaving retracts it.
  if (matchMedia('(pointer: fine) and (min-width: 1024px)').matches) {
    document.querySelectorAll<SVGSVGElement>('[data-draw="hover"]').forEach((svg) => {
      const p = svg.querySelector<SVGPathElement>('path');
      const host = svg.closest<HTMLElement>('a');
      if (!p || !host) return;
      let L = prep(p);
      svg.classList.add('drawn-ready');
      let anim: Animation | null = null;
      const to = (v: number, ms: number, easing: string) => {
        const from = Number(getComputedStyle(p).strokeDashoffset.replace('px', '')) || 0;
        anim?.cancel();
        p.style.strokeDashoffset = String(v);
        anim = p.animate([{ strokeDashoffset: from }, { strokeDashoffset: v }], { duration: ms, easing });
      };
      host.addEventListener('mouseenter', () => to(0, 1400, 'cubic-bezier(0.45, 0, 0.55, 1)'));
      host.addEventListener('mouseleave', () => to(L, 600, 'cubic-bezier(0.55, 0, 1, 0.45)'));
      host.addEventListener('focus', () => to(0, 600, 'cubic-bezier(0.22, 1, 0.36, 1)'));
      host.addEventListener('blur', () => to(L, 300, 'ease-in'));
      addEventListener('resize', () => {
        const drawn = p.style.strokeDashoffset === '0';
        L = prep(p);
        if (drawn) p.style.strokeDashoffset = '0';
      });
    });
  } else {
    // touch / small screens: the swatch lines are hidden by CSS; mark them measured so nothing waits on them
    document.querySelectorAll('[data-draw="hover"]').forEach((s) => s.classList.add('drawn-ready'));
  }
}
