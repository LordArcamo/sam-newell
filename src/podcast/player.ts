// One <audio preload="none">; nothing loads until the visitor presses play (lesson 9).
// Rows are <button aria-pressed>; the on-air bar (role=region "Now playing") has title, time and pause.
import { dur } from '../lib/format';

export function initPlayer() {
  const bar = document.querySelector<HTMLElement>('[data-onair]');
  const rows = [...document.querySelectorAll<HTMLButtonElement>('[data-ep]')];
  if (!bar || !rows.length) return;
  const audio = new Audio();
  audio.preload = 'none';
  const title = bar.querySelector<HTMLElement>('[data-onair-title]')!;
  const time = bar.querySelector<HTMLElement>('[data-onair-time]')!;
  const toggle = bar.querySelector<HTMLButtonElement>('[data-onair-toggle]')!;
  let active: HTMLButtonElement | null = null;

  const sync = () => {
    const playing = !audio.paused;
    rows.forEach((r) => {
      const on = r === active && playing;
      r.setAttribute('aria-pressed', String(on));
      const s = r.querySelector('[data-state]');
      if (s) s.textContent = on ? 'Pause' : 'Play';
    });
    toggle.textContent = playing ? 'Pause' : 'Play';
    toggle.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} ${title.textContent}`);
    bar.classList.toggle('is-playing', playing);
  };
  const tick = () => {
    const total = audio.duration || Number(active?.dataset.duration) || 0;
    time.textContent = `${dur(Math.floor(audio.currentTime || 0))} / ${dur(Math.floor(total))}`;
  };

  rows.forEach((r) =>
    r.addEventListener('click', () => {
      if (active === r) {
        audio.paused ? audio.play() : audio.pause();
        return;
      }
      active = r;
      audio.src = r.dataset.ep!;
      title.textContent = r.dataset.title!;
      bar.hidden = false;
      tick();
      audio.play().catch(() => sync());
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: r.dataset.title!,
          artist: 'Sam Newell',
          album: 'Get Leveraged',
          artwork: r.dataset.image ? [{ src: r.dataset.image, sizes: '512x512', type: 'image/jpeg' }] : [],
        });
      }
    }),
  );
  toggle.addEventListener('click', () => (audio.paused ? audio.play() : audio.pause()));
  bar.addEventListener('keydown', (e) => {
    if (e.key === ' ' && e.target === bar) {
      e.preventDefault();
      audio.paused ? audio.play() : audio.pause();
    }
  });
  audio.addEventListener('play', sync);
  audio.addEventListener('pause', sync);
  audio.addEventListener('ended', sync);
  audio.addEventListener('timeupdate', tick);
  audio.addEventListener('loadedmetadata', tick);
}
