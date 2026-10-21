// The bar hides while scrolling down and returns on the way up (never while focus is inside it).
export function initBar() {
  const bar = document.querySelector<HTMLElement>('[data-bar]');
  if (!bar) return;
  let last = scrollY;
  let ticking = false;
  addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = scrollY;
        const down = y > last + 4 && y > 240;
        const up = y < last - 4;
        if (down && !bar.contains(document.activeElement)) bar.classList.add('is-hidden');
        else if (up || y < 240) bar.classList.remove('is-hidden');
        last = y;
        ticking = false;
      });
    },
    { passive: true },
  );
  bar.addEventListener('focusin', () => bar.classList.remove('is-hidden'));

  // home: show the bar once the hero has left the screen
  const hero = document.querySelector('[data-hero]');
  if (bar.classList.contains('home') && hero) {
    new IntersectionObserver(([e]) => bar.classList.toggle('show', !e.isIntersecting), { threshold: 0 }).observe(hero);
  } else bar.classList.add('show');
  bar.addEventListener('focusin', () => bar.classList.add('show'));

  // colour by chapter: white chapters ([data-light]) flip the bar while they sit under it
  const lights = [...document.querySelectorAll<HTMLElement>('[data-light], section.dark, footer.dark')];
  const check = () => {
    const y = bar.getBoundingClientRect().bottom - 8;
    bar.classList.toggle('on-light', lights.some((el) => { const r = el.getBoundingClientRect(); return r.top <= y && r.bottom > y; }));
  };
  addEventListener('scroll', () => requestAnimationFrame(check), { passive: true });
  check();
}
