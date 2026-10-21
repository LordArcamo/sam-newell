/**
 * Underwrite it like Sam — pure functions, no DOM (build brief §9). Unit-tested in underwrite.test.ts.
 * Every default is an EXAMPLE [SAM TO CONFIRM every default].
 */
export interface UnderwriteInput {
  price: number;        // P, dollars
  down: number;         // d, fraction (0.25 = 25%)
  apr: number;          // i, fraction (0.065 = 6.5%)
  termYears: number;    // T
  rent: number;         // R, monthly
  vacancy: number;      // v, fraction
  taxYear: number;      // Tx, dollars/yr
  insuranceYear: number;// In, dollars/yr
  hoaMonth: number;     // H, dollars/mo
  maintenance: number;  // m, fraction of gross rent
  management: number;   // g, fraction of collected rent
  closing: number;      // c, fraction of price
  pmi: number;          // p, fraction of the loan per year (only when down < 20%)
}

export interface UnderwriteResult {
  loan: number;
  payment: number;        // monthly P&I
  gsr: number;            // gross scheduled rent / yr
  egi: number;            // effective gross income / yr
  opex: number;           // operating expenses / yr
  noi: number;            // net operating income / yr
  capRate: number;        // NOI / P
  debtService: number;    // ADS / yr
  cashFlowYear: number;
  cashFlowMonth: number;
  dscr: number;
  cashIn: number;
  cashOnCash: number;
  principalPaid5y: number;
  piti: number;           // monthly, payment mode
}

export const EXAMPLE_INVEST: UnderwriteInput = {
  price: 450_000, down: 0.25, apr: 0.065, termYears: 30, rent: 2_400, vacancy: 0.05,
  taxYear: 450_000 * 0.006, insuranceYear: 1_500, hoaMonth: 0, maintenance: 0.05, management: 0.08,
  closing: 0.03, pmi: 0.005,
};

export const EXAMPLE_PAYMENT: UnderwriteInput = { ...EXAMPLE_INVEST, down: 0.1 };

/**
 * The example the rental calculator opens on (design review #9): a Lehi-area townhome, self-managed, that roughly
 * carries itself, labelled on the page as an example. [SAM TO CONFIRM every number]
 */
export const EXAMPLE_RENTAL: UnderwriteInput = {
  price: 380_000, down: 0.3, apr: 0.0625, termYears: 30, rent: 2_500, vacancy: 0.05,
  taxYear: 380_000 * 0.006, insuranceYear: 1_200, hoaMonth: 150, maintenance: 0.05, management: 0,
  closing: 0.03, pmi: 0.005,
};

/** Monthly principal + interest. */
export function monthlyPayment(loan: number, apr: number, termYears: number): number {
  const n = Math.round(termYears * 12);
  if (n <= 0 || loan <= 0) return 0;
  const r = apr / 12;
  if (r === 0) return loan / n;
  const f = Math.pow(1 + r, n);
  return (loan * r * f) / (f - 1);
}

/** Remaining balance after k payments. */
export function balanceAfter(loan: number, apr: number, payment: number, k: number): number {
  const r = apr / 12;
  if (r === 0) return Math.max(0, loan - payment * k);
  const f = Math.pow(1 + r, k);
  return loan * f - (payment * (f - 1)) / r;
}

export function underwrite(x: UnderwriteInput): UnderwriteResult {
  const P = Math.max(0, x.price);
  const d = clamp(x.down, 0, 1);
  const loan = P * (1 - d);
  const payment = monthlyPayment(loan, x.apr, x.termYears);
  const gsr = 12 * x.rent;
  const egi = gsr * (1 - clamp(x.vacancy, 0, 1));
  const opex = x.taxYear + x.insuranceYear + 12 * x.hoaMonth + x.maintenance * gsr + x.management * egi;
  const noi = egi - opex;
  const debtService = 12 * payment;
  const cashFlowYear = noi - debtService;
  const cashIn = d * P + x.closing * P;
  const n60 = Math.min(60, Math.round(x.termYears * 12));
  const principalPaid5y = loan - balanceAfter(loan, x.apr, payment, n60);
  const pmiMonth = d < 0.2 ? (x.pmi * loan) / 12 : 0;
  return {
    loan, payment, gsr, egi, opex, noi,
    capRate: P > 0 ? noi / P : 0,
    debtService, cashFlowYear, cashFlowMonth: cashFlowYear / 12,
    dscr: debtService > 0 ? noi / debtService : Infinity,
    cashIn,
    cashOnCash: cashIn > 0 ? cashFlowYear / cashIn : 0,
    principalPaid5y,
    piti: payment + x.taxYear / 12 + x.insuranceYear / 12 + x.hoaMonth + pmiMonth,
  };
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));
}
