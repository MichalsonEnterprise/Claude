import { describe, it, expect } from 'vitest';
import { normalizeText, keywordSet, keywordOverlap, noveltyFromOverlap, semanticKeyFor } from '../src/content/duplicateDetection.js';

describe('normalizeText', () => {
  it('lowercases, strips punctuation, and collapses whitespace', () => {
    expect(normalizeText('  VAT,  JPK!!  i   KSeF.  ')).toBe('vat jpk i ksef');
  });
});

describe('keywordOverlap', () => {
  it('returns 1 for identical sets', () => {
    const a = keywordSet('Zmiany w JPK dla przedsiębiorców');
    const b = keywordSet('zmiany w jpk dla przedsiębiorców');
    expect(keywordOverlap(a, b)).toBe(1);
  });

  it('returns 0 for disjoint sets', () => {
    const a = keywordSet('VAT rozliczenie faktury');
    const b = keywordSet('festyn gminny wakacje');
    expect(keywordOverlap(a, b)).toBe(0);
  });

  it('returns 0 when either set is empty', () => {
    expect(keywordOverlap(new Set(), new Set(['a']))).toBe(0);
  });

  it('detects high overlap between near-duplicate titles', () => {
    const a = keywordSet('Nowe zasady KSeF dla przedsiębiorców od przyszłego roku');
    const b = keywordSet('Nowe zasady KSeF dla przedsiębiorców wchodzą w życie');
    expect(keywordOverlap(a, b)).toBeGreaterThan(0.4);
  });
});

describe('noveltyFromOverlap', () => {
  it('is inverse of overlap, scaled 0-100', () => {
    expect(noveltyFromOverlap(0)).toBe(100);
    expect(noveltyFromOverlap(1)).toBe(0);
    expect(noveltyFromOverlap(0.5)).toBe(50);
  });
});

describe('semanticKeyFor', () => {
  it('is stable for reordered/case-different titles', () => {
    expect(semanticKeyFor('VAT i JPK')).toBe(semanticKeyFor('jpk i vat'));
  });
});
