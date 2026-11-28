import { describe, expect, it } from 'vitest';

import { isValidAddress } from '@/components/domain/address-input';
import { sanitizeAmount } from '@/components/domain/amount-input';
import { resolveActiveHref } from '@/components/shell/sidebar';
import { isActive } from '@/components/shell/nav-config';
import { passwordStrength } from '@/components/ui/password-input';
import { initialsFrom } from '@/lib/auth/types';
import { cn } from '@/lib/utils';

describe('sanitizeAmount', () => {
  it('keeps digits and one decimal point', () => {
    expect(sanitizeAmount('1,234.5', 2)).toBe('1.23');
    expect(sanitizeAmount('12a3.456', 2)).toBe('123.45');
    expect(sanitizeAmount('0005', 2)).toBe('5');
    expect(sanitizeAmount('.5', 2)).toBe('0.5');
    expect(sanitizeAmount('1.2.3', 6)).toBe('1.23');
    expect(sanitizeAmount('', 2)).toBe('');
  });
});

describe('isValidAddress', () => {
  it('validates EVM addresses (checksum-tolerant)', () => {
    expect(isValidAddress('arbitrum', '0x7c4e00000000000000000000000000000000a21d')).toBe(true);
    expect(isValidAddress('arbitrum', '0x12ab…9f3C')).toBe(false);
    expect(isValidAddress('bnb', '0x123')).toBe(false);
    expect(isValidAddress('ethereum', '')).toBe(false);
  });
  it('validates Solana base58 addresses', () => {
    expect(isValidAddress('solana', '7Hq3ZtkPq5xQ8vGm4UoJcYr2NwBsLd9EaFhXk9P')).toBe(true);
    expect(isValidAddress('solana', '0x7c4e00000000000000000000000000000000a21d')).toBe(false);
  });
});

describe('passwordStrength', () => {
  it('grades passwords', () => {
    expect(passwordStrength('')).toBe('empty');
    expect(passwordStrength('abc')).toBe('weak');
    expect(passwordStrength('abcdefghijkl1')).toBe('fair');
    expect(passwordStrength('Aurora-27!pool')).toBe('strong');
  });
});

describe('navigation', () => {
  it('picks the most specific active href', () => {
    expect(resolveActiveHref('/')).toBe('/');
    expect(resolveActiveHref('/pool')).toBe('/pool');
    expect(resolveActiveHref('/pool/entries')).toBe('/pool/entries');
    expect(resolveActiveHref('/games/orbit-rush')).toBe('/games/orbit-rush');
    expect(resolveActiveHref('/unknown')).toBeNull();
  });
  it('isActive treats "/" as exact', () => {
    expect(isActive('/', '/wallet')).toBe(false);
    expect(isActive('/wallet', '/wallet/deposit')).toBe(true);
  });
});

describe('utils', () => {
  it('cn keeps token text sizes alongside text colours', () => {
    expect(cn('text-h1', 'text-text-primary')).toBe('text-h1 text-text-primary');
    expect(cn('text-body-s', 'text-label-m')).toBe('text-label-m');
    expect(cn('bg-brand', 'bg-brand-hover')).toBe('bg-brand-hover');
  });
  it('initialsFrom', () => {
    expect(initialsFrom('@nova.k')).toBe('NK');
    expect(initialsFrom('Nova K.')).toBe('NK');
    expect(initialsFrom('orbit')).toBe('OR');
  });
});
