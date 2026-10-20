// Vanilla ports of the old React forms, same payloads to /api/contact and /api/newsletter.
const FALLBACK = 'Could not send right now. Call <a href="tel:+18019952220">(801) 995-2220</a> instead.';

function linkPhone(msg: string) {
  const esc = msg.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
  return esc.replace('(801) 995-2220', '<a href="tel:+18019952220">(801) 995-2220</a>');
}

async function post(url: string, body: Record<string, string>) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  let j: { ok?: boolean; error?: string } = {};
  try { j = await r.json(); } catch {}
  return { ok: r.ok && j.ok !== false, error: j.error };
}

export function initNewsletter() {
  document.querySelectorAll<HTMLFormElement>('[data-news]').forEach((f) => {
    const msg = f.querySelector<HTMLElement>('[data-news-msg]')!;
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = (f.elements.namedItem('email') as HTMLInputElement).value.trim();
      const company = (f.elements.namedItem('company') as HTMLInputElement).value;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        msg.textContent = 'Please enter a valid email address.';
        msg.setAttribute('role', 'alert');
        msg.focus();
        return;
      }
      const btn = f.querySelector('button')!;
      btn.disabled = true;
      try {
        const r = await post('/api/newsletter', { email, company });
        if (r.ok) { msg.textContent = 'You’re on the list. Thank you.'; f.reset(); msg.setAttribute('role', 'status'); }
        else { msg.innerHTML = linkPhone(r.error || 'Could not sign you up right now. Try again later.'); msg.setAttribute('role', 'alert'); }
      } catch {
        msg.textContent = 'Could not sign you up right now. Try again later.';
        msg.setAttribute('role', 'alert');
      }
      btn.disabled = false;
      msg.focus();
    });
  });
}

export function initContact() {
  const f = document.querySelector<HTMLFormElement>('[data-contact]');
  if (!f) return;
  const msg = f.querySelector<HTMLElement>('[data-contact-msg]')!;
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!f.checkValidity()) {
      f.reportValidity();
      return;
    }
    const data = Object.fromEntries(new FormData(f).entries()) as Record<string, string>;
    const btn = f.querySelector<HTMLButtonElement>('button[type=submit]')!;
    btn.disabled = true;
    btn.textContent = 'Sending…';
    try {
      const r = await post('/api/contact', data);
      if (r.ok) {
        msg.textContent = 'Thanks. Sam will get back to you today.';
        msg.setAttribute('role', 'status');
        f.reset();
      } else {
        msg.innerHTML = r.error ? linkPhone(r.error) : FALLBACK;
        msg.setAttribute('role', 'alert');
      }
    } catch {
      msg.innerHTML = FALLBACK;
      msg.setAttribute('role', 'alert');
    }
    btn.disabled = false;
    btn.textContent = 'Send to Sam';
    msg.focus();
  });
}
