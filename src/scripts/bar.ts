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
}
