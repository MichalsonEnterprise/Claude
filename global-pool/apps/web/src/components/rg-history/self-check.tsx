'use client';

import Link from 'next/link';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/** Problem Gambling Severity Index (PGSI) — nine questions about the last 12 months. */
const QUESTIONS = [
  'Have you bet more than you could really afford to lose?',
  'Have you needed to gamble with larger amounts of money to get the same feeling of excitement?',
  'When you gambled, did you go back another day to try to win back the money you lost?',
  'Have you borrowed money or sold anything to get money to gamble?',
  'Have you felt that you might have a problem with gambling?',
  'Has gambling caused you any health problems, including stress or anxiety?',
  'Have people criticised your betting or told you that you had a gambling problem, whether or not you thought it was true?',
  'Has your gambling caused any financial problems for you or your household?',
  'Have you felt guilty about the way you gamble or what happens when you gamble?',
];
const ANSWERS = ['Never', 'Sometimes', 'Most of the time', 'Almost always'] as const;

/** Scores 0–27 → result band (PGSI bands). Exported for tests. */
export function selfCheckBand(score: number): 'none' | 'low' | 'moderate' | 'high' {
  if (score <= 0) return 'none';
  if (score <= 2) return 'low';
  if (score <= 7) return 'moderate';
  return 'high';
}

const BAND_COPY = {
  none: 'Your answers show no signs of harm from gambling right now. Limits are still a good habit.',
  low: 'Your answers show a low level of risk. Setting limits now can keep it that way.',
  moderate:
    'Your answers show some risk. Consider lowering your limits or taking a short break, and talking to someone.',
  high: 'Your answers suggest gambling may be causing you harm. Please consider a break or self-exclusion, and reach out to one of the free help organisations.',
} as const;

/** 2-minute self-check. Answers stay in this dialog only — nothing is sent or stored. */
export function SelfCheckDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [answers, setAnswers] = React.useState<(number | null)[]>(() => QUESTIONS.map(() => null));
  const [done, setDone] = React.useState(false);
  React.useEffect(() => {
    if (open) {
      setAnswers(QUESTIONS.map(() => null));
      setDone(false);
    }
  }, [open]);
  const complete = answers.every((a) => a !== null);
  const score = answers.reduce<number>((a, b) => a + (b ?? 0), 0);
  const band = selfCheckBand(score);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="l">
        <DialogHeader>
          <DialogTitle>2-minute self-check</DialogTitle>
          <DialogDescription>
            Nine private questions about the last 12 months, based on a recognised screening tool.
            Answers stay on this device and are never stored with your account or used for
            marketing.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-5 overflow-y-auto">
          {!done ? (
            QUESTIONS.map((q, i) => (
              <fieldset key={q} className="flex flex-col gap-2">
                <legend className="mb-2 text-body-s-strong text-text-primary">
                  {i + 1}. {q}
                </legend>
                <div className="flex flex-wrap gap-2">
                  {ANSWERS.map((label, v) => {
                    const id = `sc-${i}-${v}`;
                    return (
                      <label
                        key={label}
                        htmlFor={id}
                        className={cn(
                          'inline-flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-label-m',
                          answers[i] === v
                            ? 'border-brand bg-brand-tint text-text-brand'
                            : 'border-border-subtle text-text-secondary hover:bg-surface-hover',
                        )}
                      >
                        <input
                          id={id}
                          type="radio"
                          name={`sc-${i}`}
                          className="sr-only"
                          checked={answers[i] === v}
                          onChange={() => setAnswers((a) => a.map((x, j) => (j === i ? v : x)))}
                        />
                        {label}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))
          ) : (
            <div role="status" className="flex flex-col gap-3">
              <p className="text-h5">Your result</p>
              <p className="text-body-m text-text-secondary">{BAND_COPY[band]}</p>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="secondary">
                  <Link href="/responsible-gaming/deposit-limits">Review limits</Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href="/responsible-gaming/cooling-off">Take a break</Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href="/responsible-gaming/self-exclusion">About self-exclusion</Link>
                </Button>
              </div>
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          {!done ? (
            <>
              <Button variant="secondary" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button disabled={!complete} onClick={() => setDone(true)}>
                See my result
              </Button>
            </>
          ) : (
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
