import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tailwind-merge that knows the GLOBAL POOL token scale (@gp/tokens theme.css). Without this, unknown
 * `text-*` sizes such as `text-h1` / `text-body-s` would be treated as colours and dropped when merged with
 * `text-text-primary`.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [
        'display-xl',
        'display-l',
        'display-m',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'body-l',
        'body-m',
        'body-m-strong',
        'body-s',
        'body-s-strong',
        'label-l',
        'label-m',
        'label-s',
        'caption',
        'overline',
        'mono-m',
        'mono-s',
        'number-xl',
        'number-l',
        'number-m',
        'number-s',
      ],
      shadow: ['elevation-1', 'elevation-2', 'elevation-3', 'elevation-4', 'glow-brand', 'glow-gold', 'inner-hairline', 'focus-ring'],
      radius: ['xs', 'sm', 'md', 'lg', 'xl', '2xl'],
      ease: ['standard', 'emphasized', 'decelerate', 'accelerate', 'spring-out', 'wheel'],
      breakpoint: ['tablet', 'laptop', 'desktop'],
    },
  },
});

/** Merge class names (clsx + token-aware tailwind-merge). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
