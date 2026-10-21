// Muted film loops for [data-film] slots: the poster image is the content; the video is laid over it only when
// the slot nears the screen, plays while visible, pauses off-screen. Never with reduced motion or Save-Data.
export function initFilms() {
  const slots = [...document.querySelectorAll<HTMLElement>('[data-film]')];
  const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
  if (!slots.length || matchMedia('(prefers-reduced-motion: reduce)').matches || nav.connection?.saveData) return;
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const el = e.target as HTMLElement;
        let v = el.querySelector<HTMLVideoElement>('video');
        if (e.isIntersecting && !v) {
          v = document.createElement('video');
          v.muted = true;
          // a short moment (the keys-day confetti) plays once and rests on its last frame instead of visibly looping
          v.loop = el.dataset.filmOnce === undefined;
          v.playsInline = true;
          v.setAttribute('playsinline', '');
          v.setAttribute('aria-hidden', 'true');
          v.preload = 'auto';
          v.className = 'film-v';
          v.src = el.dataset.film!;
          v.addEventListener('playing', () => v!.classList.add('on'), { once: true });
          (el.querySelector('.ph') ?? el).appendChild(v);
        }
        if (!v) continue;
        if (e.isIntersecting && !document.hidden && !v.ended) v.play().catch(() => {});
        else v.pause();
      }
    },
    { rootMargin: '200px 0px' },
  );
  slots.forEach((s) => io.observe(s));
}
