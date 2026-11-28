'use client';

import QRCode from 'qrcode';
import * as React from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * Deposit address QR, rendered client-side from the address string (qrcode → SVG). Dark modules on a white quiet
 * zone so every wallet camera can read it. The QR encodes only the address — never an amount or a token contract.
 */
export function AddressQr({
  value,
  size = 176,
  label,
  className,
  masked = false,
}: {
  value: string | null;
  size?: number;
  label: string;
  className?: string;
  /** Blur the code (expired address session). */
  masked?: boolean;
}) {
  const [svg, setSvg] = React.useState<string | null>(null);
  React.useEffect(() => {
    let alive = true;
    if (!value) {
      setSvg(null);
      return;
    }
    QRCode.toString(value, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 1,
      color: { dark: '#111414', light: '#ffffff' },
    })
      .then((s) => alive && setSvg(s))
      .catch(() => alive && setSvg(null));
    return () => {
      alive = false;
    };
  }, [value]);

  if (!svg)
    return (
      <Skeleton className={cn('rounded-lg', className)} style={{ width: size, height: size }} />
    );
  return (
    <div
      role="img"
      aria-label={label}
      className={cn(
        'overflow-hidden rounded-lg bg-white p-2 [&_svg]:h-full [&_svg]:w-full',
        masked && 'blur-sm',
        className,
      )}
      style={{ width: size, height: size }}
      // The SVG is generated locally by the qrcode library from the address string (no user HTML).
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
