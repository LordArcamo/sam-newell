// The "View" / "Play" disc over listing panels and other picture links (desktop, fine pointer only). It only
// appears over something that goes somewhere or plays when clicked (a link or a button host), never over a
// still or an autoplaying loop. Purely decorative: the real controls keep their own focus styles and labels.
export function initCursor() {
  if (!matchMedia('(pointer: fine) and (min-width: 1024px)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cur = document.querySelector<HTMLElement>('[data-cur]');
  if (!cur) return;
  let x = -200, y = -200, tx = -200, ty = -200, on = false, raf = 0;
  const loop = () => {
    x += (tx - x) * 0.22;
    y += (ty - y) * 0.22;
    cur.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${on ? 1 : 0})`;
    raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.3 || on ? requestAnimationFrame(loop) : 0;
  };
  addEventListener('pointermove', (e) => {
    tx = e.clientX; ty = e.clientY;
    const host = (e.target as HTMLElement).closest<HTMLElement>('[data-cursor]');
    const live = !!host && (host.matches('a[href], button') || !!host.closest('a[href], button'));
    const want = live && !(e.target as HTMLElement).closest('.btn, input, select, textarea, [data-no-cursor]');
    if (want) cur.textContent = host!.dataset.cursor || 'View';
    if (want !== on) { on = want; cur.classList.toggle('on', on); }
    if (!raf) raf = requestAnimationFrame(loop);
  }, { passive: true });
  document.addEventListener('pointerleave', () => { on = false; if (!raf) raf = requestAnimationFrame(loop); });
}
