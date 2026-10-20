// Mobile menu: role=dialog, focus moves in, Tab is trapped, Esc closes and returns focus, <main> inert.
export function initMenu() {
  const menu = document.querySelector<HTMLElement>('[data-menu]');
  const open = document.querySelector<HTMLButtonElement>('[data-menu-open]');
  if (!menu || !open) return;
  const close = menu.querySelector<HTMLButtonElement>('[data-menu-close]');
  const outside = () => [document.querySelector('main'), document.querySelector('[data-foot]'), document.querySelector('[data-bar]')].filter(Boolean) as HTMLElement[];
  const focusables = () => [...menu.querySelectorAll<HTMLElement>('a[href],button:not([disabled])')];

  const show = () => {
    menu.hidden = false;
    requestAnimationFrame(() => menu.classList.add('is-open'));
    open.setAttribute('aria-expanded', 'true');
    outside().forEach((el) => el.setAttribute('inert', ''));
    document.documentElement.style.overflow = 'hidden';
    (window as any).__lenis?.stop();
    close?.focus();
    document.addEventListener('keydown', onKey);
  };
  const hide = (restore = true) => {
    menu.classList.remove('is-open');
    menu.hidden = true;
    open.setAttribute('aria-expanded', 'false');
    outside().forEach((el) => el.removeAttribute('inert'));
    document.documentElement.style.overflow = '';
    (window as any).__lenis?.start();
    document.removeEventListener('keydown', onKey);
    if (restore) open.focus();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      hide();
    } else if (e.key === 'Tab') {
      const f = focusables();
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };
  open.addEventListener('click', show);
  close?.addEventListener('click', () => hide());
  menu.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('a[href]')) hide(false);
  });
  matchMedia('(min-width: 901px)').addEventListener('change', (m) => m.matches && !menu.hidden && hide(false));
}
