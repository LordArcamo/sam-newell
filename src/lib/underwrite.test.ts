import { test } from 'node:test';
import assert from 'node:assert/strict';
import { monthlyPayment, balanceAfter, underwrite, EXAMPLE_INVEST, EXAMPLE_PAYMENT, EXAMPLE_RENTAL } from './underwrite.ts';

const near = (a: number, b: number, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);

test('P&I matches the standard amortisation formula', () => {
  // $337,500 at 6.5% for 30 years = $2,133.23 (bank calculators agree)
  near(monthlyPayment(337_500, 0.065, 30), 2133.23, 0.01);
  near(monthlyPayment(100_000, 0.06, 30), 599.55, 0.01);
});

test('zero interest divides the loan evenly', () => {
  near(monthlyPayment(120_000, 0, 10), 1000, 1e-9);
});

test('balance after the last payment is zero', () => {
  const m = monthlyPayment(200_000, 0.07, 15);
  near(balanceAfter(200_000, 0.07, m, 180), 0, 0.01);
});

test('example rental: NOI, cap rate, cash flow, DSCR, cash-on-cash', () => {
  const r = underwrite(EXAMPLE_INVEST);
  near(r.loan, 337_500);
  near(r.gsr, 28_800);
  near(r.egi, 27_360);
  // opex = 2700 tax + 1500 ins + 0 HOA + 1440 maint + 2188.80 mgmt
  near(r.opex, 7_828.8);
  near(r.noi, 19_531.2);
  near(r.capRate, 19_531.2 / 450_000, 1e-9);
  near(r.debtService, 12 * 2133.23, 0.1);
  near(r.cashFlowYear, 19_531.2 - 25_598.76, 0.1);
  assert.ok(r.cashFlowMonth < 0, 'the example is honest: it runs negative');
  near(r.dscr, 19_531.2 / 25_598.76, 1e-4);
  near(r.cashIn, 112_500 + 13_500);
  near(r.cashOnCash, r.cashFlowYear / 126_000, 1e-9);
});

test('5-year principal paydown is positive and below the loan', () => {
  const r = underwrite(EXAMPLE_INVEST);
  assert.ok(r.principalPaid5y > 15_000 && r.principalPaid5y < 30_000, String(r.principalPaid5y));
});

test('PITI adds PMI only under 20% down', () => {
  const lo = underwrite(EXAMPLE_PAYMENT);
  const pmi = (0.005 * 405_000) / 12;
  near(lo.piti, lo.payment + 2700 / 12 + 1500 / 12 + pmi, 0.01);
  const hi = underwrite({ ...EXAMPLE_PAYMENT, down: 0.2 });
  near(hi.piti, hi.payment + 2700 / 12 + 1500 / 12, 0.01);
});

test('bad input never throws', () => {
  const r = underwrite({ ...EXAMPLE_INVEST, price: 0, down: Number.NaN, termYears: 0 });
  assert.equal(r.capRate, 0);
  assert.equal(r.payment, 0);
});

test('the opening rental example carries itself (about +$172 a month, DSCR above 1)', () => {
  const r = underwrite(EXAMPLE_RENTAL);
  near(r.payment, 1637.8, 0.5);
  near(r.noi, 30_000 * 0.95 - (2_280 + 1_200 + 1_800 + 1_500), 0.01);
  assert.ok(r.cashFlowMonth > 150 && r.cashFlowMonth < 200, String(r.cashFlowMonth));
  assert.ok(r.dscr > 1.05, String(r.dscr));
});
