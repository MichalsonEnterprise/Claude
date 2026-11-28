import * as React from 'react';

import { cn } from '@/lib/utils';

/** Concrete-object illustration for the KYC context panel: an ID card and a passport on angled mint blocks. */
export function KycArt({
  variant = 'documents',
  className,
}: {
  variant?: 'documents' | 'selfie' | 'review' | 'approved' | 'resubmit';
  className?: string;
}) {
  return (
    <div aria-hidden className={cn('relative h-[230px] w-full overflow-hidden', className)}>
      <div className="absolute -left-10 top-[120px] h-[150px] w-[130%] -rotate-[8deg] bg-mint-700" />
      <div className="absolute -left-10 top-[104px] h-3.5 w-[130%] -rotate-[8deg] bg-brand" />
      {variant === 'selfie' ? (
        <div className="absolute left-1/2 top-4 h-[200px] w-[120px] -translate-x-1/2 rotate-[-4deg] rounded-[22px] border-4 border-ink-900 bg-ink-800 shadow-elevation-3">
          <div className="absolute inset-x-5 top-8 bottom-10 rounded-[50%] border-2 border-dashed border-brand" />
          <div className="absolute left-1/2 top-[64px] size-10 -translate-x-1/2 rounded-full bg-ink-400" />
          <div className="absolute left-1/2 top-[108px] h-10 w-[60px] -translate-x-1/2 rounded-t-full bg-ink-400" />
        </div>
      ) : (
        <>
          <div className="absolute right-4 top-6 h-[150px] w-[118px] rotate-[-10deg] rounded-md bg-mint-800 shadow-elevation-3">
            <p className="mt-6 text-center text-[10px] font-semibold tracking-[0.18em] text-mint-300">
              PASSPORT
            </p>
            <div className="mx-auto mt-4 size-12 rounded-full border-2 border-mint-300" />
          </div>
          <div className="absolute left-4 top-[84px] h-[110px] w-[200px] rotate-[8deg] overflow-hidden rounded-md bg-ink-50 shadow-elevation-3">
            <div className="h-6 bg-brand px-3 text-[9px] font-bold leading-6 tracking-[0.14em] text-ink-950">
              IDENTITY CARD
            </div>
            <div className="flex gap-3 p-3">
              <div className="h-14 w-11 rounded-sm bg-ink-300" />
              <div className="flex flex-1 flex-col gap-1.5 pt-1">
                <div className="h-2 w-20 rounded-full bg-ink-500" />
                <div className="h-2 w-14 rounded-full bg-ink-400" />
                <div className="h-1.5 w-24 rounded-full bg-ink-300" />
                <div className="h-1.5 w-16 rounded-full bg-ink-300" />
              </div>
            </div>
          </div>
        </>
      )}
      {(variant === 'review' || variant === 'approved' || variant === 'resubmit') && (
        <div
          className={cn(
            'absolute right-6 bottom-6 rotate-[-12deg] rounded-md border-2 px-3 py-1 text-label-m font-bold tracking-[0.16em]',
            variant === 'review' && 'border-status-pending text-status-pending',
            variant === 'approved' && 'border-brand text-text-brand',
            variant === 'resubmit' && 'border-status-danger text-text-danger',
          )}
        >
          {variant === 'review' ? 'IN REVIEW' : variant === 'approved' ? 'APPROVED' : 'RESUBMIT'}
        </div>
      )}
    </div>
  );
}
