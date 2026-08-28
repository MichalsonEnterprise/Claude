import { describe, it, expect } from 'vitest';
import { checkBlocklist } from '../src/safety/blocklist.js';

describe('checkBlocklist', () => {
  it('flags individual tax-avoidance advice', () => {
    expect(checkBlocklist('Zrób tak, żeby uniknąć podatku VAT.').length).toBeGreaterThan(0);
  });

  it('flags guaranteed savings language', () => {
    expect(checkBlocklist('Gwarantujemy oszczędności podatkowe naszym klientom.').length).toBeGreaterThan(0);
  });

  it('flags guaranteed compliance language', () => {
    expect(checkBlocklist('Nasz system gwarantuje zgodność z prawem podatkowym.').length).toBeGreaterThan(0);
  });

  it('flags claims that the product replaces an accountant', () => {
    expect(checkBlocklist('Accounting AI w pełni zastępuje księgowego.').length).toBeGreaterThan(0);
  });

  it('flags invented accuracy statistics', () => {
    expect(checkBlocklist('Nasz system osiąga 99% dokładności.').length).toBeGreaterThan(0);
  });

  it('flags leaked-looking secrets', () => {
    expect(checkBlocklist('api_key: sk-1234567890abcdef').length).toBeGreaterThan(0);
  });

  it('does not flag clean, hedged product content', () => {
    expect(checkBlocklist('System wykrywa niespójności w dokumentach i oznacza je do przeglądu przez księgowego.').length).toBe(0);
  });
});
