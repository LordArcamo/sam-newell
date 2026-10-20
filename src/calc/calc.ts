// Calculator UI: same pure functions as the SSR worked example. Debounced 50 ms, 150 ms fade, no count-ups.
import { underwrite, type UnderwriteInput } from '../lib/underwrite';
import { usd, usdSigned, pct } from '../lib/format';

const PCT = new Set(['down', 'apr', 'vacancy', 'maintenance', 'management', 'closing', 'pmi']);

function read(form: HTMLFormElement): UnderwriteInput {
  const v = (n: string) => {
    const el = form.elements.namedItem(n) as HTMLInputElement | null;
    const x = el ? parseFloat(el.value) : 0;
    return Number.isFinite(x) ? (PCT.has(n) ? x / 100 : x) : 0;
  };
  return {
    price: v('price'), down: v('down'), apr: v('apr'), termYears: v('termYears'), rent: v('rent'), vacancy: v('vacancy'),
    taxYear: v('taxYear'), insuranceYear: v('insuranceYear'), hoaMonth: v('hoaMonth'), maintenance: v('maintenance'),
    management: v('management'), closing: v('closing'), pmi: v('pmi'),
  };
}

function render(form: HTMLFormElement) {
  const x = read(form);
  const r = underwrite(x);
  const fmt: Record<string, string> = {
    cashFlowMonth: usdSigned(r.cashFlowMonth), capRate: pct(r.capRate, 2), cashOnCash: pct(r.cashOnCash, 2),
    dscr: Number.isFinite(r.dscr) ? r.dscr.toFixed(2) : '—', noi: usdSigned(r.noi), payment: usd(r.payment), cashIn: usd(r.cashIn),
    principalPaid5y: usd(r.principalPaid5y), piti: usd(r.piti), loan: usd(r.loan),
  };
  form.querySelectorAll<HTMLElement>('[data-out]').forEach((el) => {
    const k = el.dataset.out!;
    if (fmt[k] !== undefined) el.textContent = fmt[k];
  });
  const s = form.querySelector<HTMLElement>('[data-summary]');
  if (s) s.textContent = form.dataset.calc === 'invest' ? `Cash flow ${fmt.cashFlowMonth} a month, cap rate ${fmt.capRate}` : `About ${fmt.piti} a month`;
}

export function setPrice(form: HTMLFormElement, price: number) {
  const p = form.elements.namedItem('price') as HTMLInputElement;
  p.value = String(Math.round(price));
  p.dispatchEvent(new Event('input', { bubbles: true }));
}

export function initCalcs(root: ParentNode = document) {
  root.querySelectorAll<HTMLFormElement>('form[data-calc]').forEach((form) => {
    if (form.dataset.ready) return;
    form.dataset.ready = '1';
    let t = 0;
    form.addEventListener('input', (e) => {
      const el = e.target as HTMLInputElement;
      if (el.name !== 'price' && el.dataset.auto) delete el.dataset.auto; // user took over the auto tax
      if (el.name === 'price') {
        form.querySelectorAll<HTMLInputElement>('input[data-auto]').forEach((a) => {
          a.value = String(Math.round(parseFloat(el.value || '0') * parseFloat(a.dataset.auto!)));
        });
      }
      form.classList.add('is-busy');
      clearTimeout(t);
      t = window.setTimeout(() => {
        render(form);
        requestAnimationFrame(() => form.classList.remove('is-busy'));
      }, 50);
    });
    render(form);
  });
}
