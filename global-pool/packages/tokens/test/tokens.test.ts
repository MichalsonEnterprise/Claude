import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { compile } from 'tailwindcss';
import { describe, expect, it } from 'vitest';

import {
  SHADCN_ALIASES,
  buildModel,
  generateAll,
  letterSpacingToEm,
  parseColor,
  resolveColor,
  tailwindColorNames,
} from '../scripts/generate.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const tokens = JSON.parse(readFileSync(join(here, '..', 'tokens.json'), 'utf8')) as {
  primitive: Record<string, Record<string, string>>;
  semantic: Record<string, string>;
  textStyles: Record<string, { size: number; lh: number; weight: number; ls?: string }>;
};
const files = generateAll(tokens);

describe('semantic colour tokens', () => {
  const entries = Object.entries(tokens.semantic);

  it('has semantic tokens to check', () => {
    expect(entries.length).toBeGreaterThan(60);
  });

  it.each(entries)('%s → resolves to a valid colour', (_path, ref) => {
    const value = resolveColor(tokens, ref);
    const parsed = parseColor(value);
    expect(parsed, `${ref} → ${value}`).not.toBeNull();
    expect(parsed!.a).toBeGreaterThanOrEqual(0);
    expect(parsed!.a).toBeLessThanOrEqual(1);
  });

  it('every primitive is a valid colour', () => {
    for (const [group, shades] of Object.entries(tokens.primitive)) {
      for (const [shade, value] of Object.entries(shades)) {
        expect(parseColor(value), `${group}.${shade}`).not.toBeNull();
      }
    }
  });

  it('matches the Figma anchors from DEV_CONVENTIONS', () => {
    const r = (path: string) => resolveColor(tokens, tokens.semantic[path]!).toUpperCase();
    expect(r('bg/base')).toBe('#232626');
    expect(r('bg/secondary')).toBe('#1E2121');
    expect(r('surface/default')).toBe('#2B2F30');
    expect(r('surface/raised')).toBe('#323738');
    expect(r('border/default')).toBe('#3A4142');
    expect(r('brand/primary')).toBe('#2CD97D');
    expect(r('accent/gold')).toBe('#F4C96C');
    expect(r('text/primary')).toBe('#F5F6F6');
    expect(r('text/secondary')).toBe('#B3BEC1');
    expect(r('text/tertiary')).toBe('#98A1A3');
    // Brand mint carries DARK text.
    expect(r('text/on-primary')).toBe('#151717');
  });

  it('rejects invalid colours and unresolvable references', () => {
    expect(parseColor('#12')).toBeNull();
    expect(parseColor('rgba(300,0,0,1)')).toBeNull();
    expect(parseColor('rgba(0,0,0,1.5)')).toBeNull();
    expect(parseColor('mint')).toBeNull();
    expect(() => resolveColor(tokens, 'mint.999')).toThrow(/unresolvable/);
    expect(() => resolveColor(tokens, 'not a colour')).toThrow(/not a valid colour/);
  });

  it('produces unique Tailwind colour names', () => {
    const names = [
      ...buildModel(tokens).primitiveColors.map((c) => c.name),
      ...Object.keys(tokens.semantic).flatMap(tailwindColorNames),
      ...Object.keys(SHADCN_ALIASES),
    ];
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('generated CSS', () => {
  it('tokens.css declares every primitive and semantic variable', () => {
    const css = files['tokens.css'];
    expect(css).toContain('--gp-ink-800: #232626;');
    expect(css).toContain('--gp-bg-base: var(--gp-ink-800);');
    expect(css).toContain('--gp-text-primary: var(--gp-ink-50);');
    expect(css).toContain('--gp-brand-primary: var(--gp-mint-500);');
    expect(css).toContain('--gp-surface-hover: rgba(245, 246, 246, 0.04);');
    expect(css).toContain('--gp-radius-md: 10px;');
    expect(css).toContain('--gp-space-4: 16px;');
    expect(css).toContain('--gp-space-0-5: 2px;');
    expect(css).toContain('--gp-layout-sidebar-collapsed: 72px;');
    expect(css).toContain('--gp-shadow-elevation-2: 0 8px 24px');
    expect(css).toContain('--gp-gradient-gold-jackpot: linear-gradient(');
    expect(css).toContain('--gp-duration-fast: 150ms;');
    expect(css).toContain('--gp-ease-standard: cubic-bezier(0.2, 0, 0, 1);');
    for (const path of Object.keys(tokens.semantic)) {
      expect(css).toContain(`--gp-${path.replace('/', '-')}:`);
    }
    expect(css).not.toContain('_note');
  });

  it('text-styles.css has exact Figma values and tabular numbers', () => {
    const css = files['text-styles.css'];
    expect(css).toMatch(
      /\.text-display-xl \{[^}]*font-size: 88px;[^}]*line-height: 92px;[^}]*font-weight: 600;[^}]*letter-spacing: -0\.03em;/,
    );
    expect(css).toMatch(
      /\.text-overline \{[^}]*font-size: 11px;[^}]*letter-spacing: 0\.08em;[^}]*text-transform: uppercase;/,
    );
    expect(css).toMatch(
      /\.text-number-s \{[^}]*font-weight: 500;[^}]*font-variant-numeric: tabular-nums;/,
    );
    expect(css).toMatch(/\.text-mono-m \{[^}]*font-family: var\(--gp-font-mono/);
    for (const name of Object.keys(tokens.textStyles)) expect(css).toContain(`.text-${name} {`);
  });

  it('converts Figma letter-spacing percentages to em without float noise', () => {
    expect(letterSpacingToEm('-3%')).toBe('-0.03em');
    expect(letterSpacingToEm('-0.3%')).toBe('-0.003em');
    expect(letterSpacingToEm('-1.2%')).toBe('-0.012em');
    expect(letterSpacingToEm('8%')).toBe('0.08em');
    expect(letterSpacingToEm('0')).toBe('0');
    expect(letterSpacingToEm(undefined)).toBe('0');
  });

  it('index.js / index.d.ts export the token object', () => {
    expect(files['index.js']).toContain('export { tokens, colors');
    expect(files['index.cjs']).toContain('module.exports');
    expect(files['index.d.ts']).toContain('export declare const tokens:');
    expect(files['index.d.ts']).toContain('readonly "bg-base": "#232626";');
  });
});

describe('Tailwind CSS v4 integration (real compiler)', () => {
  const require = createRequire(import.meta.url);
  const virtualBase = resolve(here, '..', 'dist-virtual');
  const generated: Record<string, string> = files;

  async function build(candidates: string[]) {
    const input = [
      '@import "tailwindcss";',
      '@import "./tokens.css";',
      '@import "./theme.css";',
      '@import "./text-styles.css";',
    ].join('\n');
    const compiler = await compile(input, {
      base: virtualBase,
      loadStylesheet: (id: string, base: string) => {
        if (id.startsWith('./') && generated[id.slice(2)] !== undefined) {
          return Promise.resolve({
            path: join(virtualBase, id.slice(2)),
            base: virtualBase,
            content: generated[id.slice(2)]!,
          });
        }
        const file = require.resolve(id === 'tailwindcss' ? 'tailwindcss/index.css' : id, {
          paths: [base],
        });
        return Promise.resolve({
          path: file,
          base: dirname(file),
          content: readFileSync(file, 'utf8'),
        });
      },
    });
    return compiler.build(candidates);
  }

  it('generates the documented utility classes from the theme', async () => {
    const css = await build([
      'bg-surface-default',
      'text-text-secondary',
      'rounded-lg',
      'bg-bg-base',
      'bg-brand',
      'text-text-on-primary',
      'text-gold',
      'bg-status-danger-tint',
      'text-balance-available',
      'border-border-default',
      'bg-background',
      'p-4',
      'w-sidebar',
      'h-topbar',
      'max-w-desktop',
      'shadow-elevation-2',
      'text-h1',
      'font-mono',
      'ease-standard',
      'bg-gradient-gold-jackpot',
      'tablet:p-2',
      'bg-brand/50',
      'text-number-m',
    ]);
    expect(css).toContain('--color-surface-default: #2B2F30;');
    expect(css).toMatch(
      /\.bg-surface-default \{\s*background-color: var\(--color-surface-default\);/,
    );
    expect(css).toMatch(/\.text-text-secondary \{\s*color: var\(--color-text-secondary\);/);
    expect(css).toContain('--radius-lg: 14px;');
    expect(css).toMatch(/\.rounded-lg \{\s*border-radius: var\(--radius-lg\);/);
    expect(css).toContain('--color-brand: #2CD97D;');
    expect(css).toContain('--color-gold: #F4C96C;');
    expect(css).toContain('--color-status-danger-tint: rgba(239, 68, 68, 0.12);');
    expect(css).toContain('--spacing: 4px;');
    expect(css).toMatch(/\.p-4 \{\s*padding: calc\(var\(--spacing\) \* 4\);/);
    expect(css).toMatch(/\.w-sidebar \{\s*width: var\(--spacing-sidebar\);/);
    expect(css).toContain('--spacing-topbar: 64px;');
    expect(css).toContain('--container-desktop: 1240px;');
    expect(css).toMatch(/\.text-h1 \{\s*font-size: var\(--text-h1\);/);
    expect(css).toContain('--text-h1--line-height: 48px;');
    expect(css).toContain('--text-h1--font-weight: 600;');
    // Tailwind inlines shadow values so shadow-color modifiers work.
    expect(css).toMatch(
      /\.shadow-elevation-2 \{\s*--tw-shadow: 0 8px 24px var\(--tw-shadow-color, rgba\(5,5,10,0\.45\)\)/,
    );
    expect(css).toContain('--ease-standard: cubic-bezier(0.2, 0, 0, 1);');
    expect(css).toContain(
      'background-image: linear-gradient(180deg, #FBE9C2 0%, #F4C96C 45%, #E9A044 100%);',
    );
    expect(css).toContain('@media (width >= 48rem)');
    expect(css).toContain('--color-background: #232626;');
    expect(css).toContain('color-mix(in oklab, var(--color-brand) 50%, transparent)');
    // Text-style classes and :root token variables survive the Tailwind pipeline.
    expect(css).toMatch(
      /@layer components \{[^]*\.text-number-m \{[^}]*font-variant-numeric: tabular-nums;/,
    );
    expect(css).toContain('--gp-bg-base: var(--gp-ink-800);');
  });

  it('removes Tailwind’s default palette so no off-brand colours exist', async () => {
    const css = await build(['bg-slate-500', 'text-white', 'bg-blue-600']);
    expect(css).not.toMatch(/\.bg-slate-500|\.text-white|\.bg-blue-600/);
  });
});
