'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  KYC_DOCUMENT_MAX_BYTES,
  KYC_DOCUMENT_REQUIRED_SIDES,
  POSTAL_CODE_FORMATS,
  kycDetailsSchema,
  type KycDetailsInput,
  type KycDocumentSide,
  type KycDocumentType,
} from '@gp/shared/schemas';
import {
  Camera,
  CircleAlert,
  CircleCheck,
  FileImage,
  IdCard,
  Loader2,
  RotateCcw,
  ScanFace,
  ShieldCheck,
  Upload,
  VideoOff,
} from 'lucide-react';
import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';

import { countryName, countryOptions } from '@/components/auth/countries';
import { Button } from '@/components/ui/button';
import { CheckboxField } from '@/components/ui/checkbox';
import { Field, Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ApiRequestError } from '@/lib/api/client';
import type { KycApplicationView, KycDocumentView } from '@/lib/api/account';
import { cn } from '@/lib/utils';

import { CheckLine, Demo, NoteBox } from '../primitives';
import { DOC_LABEL } from '../kyc-status';

// ── AUTH-12 Personal details ───────────────────────────────────────────────────────────────────

const FIELD_LABEL: Record<string, string> = {
  firstNames: 'First name(s)',
  lastNames: 'Last name(s)',
  dateOfBirth: 'Date of birth',
  nationality: 'Nationality',
  country: 'Country of residence',
  addressLine: 'Residential address',
  city: 'City',
  postalCode: 'Postal code',
  occupation: 'Occupation',
  pep: 'PEP declaration',
  accuracyConfirmed: 'Accuracy declaration',
};

export function DetailsStep({
  app,
  accountCountry,
  onSubmit,
  busy,
  serverError,
  formId,
}: {
  app: KycApplicationView;
  accountCountry: string | null;
  onSubmit: (v: KycDetailsInput) => void;
  busy: boolean;
  serverError: unknown;
  formId: string;
}) {
  const p = app.personal;
  const form = useForm<KycDetailsInput>({
    resolver: zodResolver(kycDetailsSchema),
    shouldFocusError: false,
    defaultValues: {
      firstNames: p?.firstNames ?? '',
      lastNames: p?.lastNames ?? '',
      dateOfBirth: p?.dateOfBirth ?? '',
      nationality: p?.nationality ?? accountCountry ?? '',
      country: p?.country ?? accountCountry ?? '',
      addressLine: p?.addressLine ?? '',
      city: p?.city ?? '',
      postalCode: p?.postalCode ?? '',
      occupation: p?.occupation ?? '',
      pep: p?.pep,
      // never pre-checked
      accuracyConfirmed: false as unknown as true,
    },
  });
  const errors = form.formState.errors;
  const errorKeys = Object.keys(errors) as (keyof KycDetailsInput)[];
  const summaryRef = React.useRef<HTMLDivElement>(null);
  const submitted = form.formState.submitCount > 0;
  React.useEffect(() => {
    if (submitted && errorKeys.length) summaryRef.current?.focus();
  }, [submitted, errorKeys.length]);
  const fmt = POSTAL_CODE_FORMATS[form.watch('country') ?? ''];
  const countries = React.useMemo(() => countryOptions(), []);
  const apiMessage = serverError instanceof ApiRequestError ? serverError.message : null;

  return (
    <form
      id={formId}
      noValidate
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-5"
      aria-busy={busy}
    >
      {(errorKeys.length > 0 && submitted) || apiMessage ? (
        <div
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
          className="rounded-md border border-border-danger bg-status-danger-tint p-4 outline-none"
        >
          <p className="flex items-center gap-2 text-body-s-strong text-text-primary">
            <CircleAlert aria-hidden className="size-4 text-text-danger" />
            {apiMessage ??
              `Please fix ${errorKeys.length} ${errorKeys.length === 1 ? 'field' : 'fields'} to continue`}
          </p>
          {!apiMessage && (
            <ul className="mt-2 flex list-disc flex-col gap-1 pl-10 text-body-s text-text-secondary">
              {errorKeys.map((k) => (
                <li key={k}>
                  <a href={`#kyc-${k}`} className="hover:underline">
                    {errors[k]?.message ?? FIELD_LABEL[k]}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      <div className="grid gap-4 tablet:grid-cols-2">
        <Field
          label="First name(s)"
          helper="As on your ID, including middle names"
          error={errors.firstNames?.message}
          id="kyc-firstNames"
        >
          <Input size="l" autoComplete="given-name" {...form.register('firstNames')} />
        </Field>
        <Field
          label="Last name(s)"
          helper="As on your ID"
          error={errors.lastNames?.message}
          id="kyc-lastNames"
        >
          <Input size="l" autoComplete="family-name" {...form.register('lastNames')} />
        </Field>
        <Field
          label="Date of birth"
          helper="You must be 18 or older"
          error={errors.dateOfBirth?.message}
          id="kyc-dateOfBirth"
        >
          <Input size="l" type="date" autoComplete="bday" {...form.register('dateOfBirth')} />
        </Field>
        <Field
          label="Nationality"
          helper="As shown on your ID document"
          error={errors.nationality?.message}
        >
          <Controller
            control={form.control}
            name="nationality"
            render={({ field }) => (
              <Select value={field.value || undefined} onValueChange={field.onChange}>
                <SelectTrigger size="l" id="kyc-nationality" aria-label="Nationality">
                  <SelectValue placeholder="Choose a country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <Field
          label="Residential address"
          helper="Street, number and floor — no PO boxes"
          error={errors.addressLine?.message}
          id="kyc-addressLine"
          className="tablet:col-span-2"
        >
          <Input size="l" autoComplete="street-address" {...form.register('addressLine')} />
        </Field>
        <Field label="City" error={errors.city?.message} id="kyc-city">
          <Input size="l" autoComplete="address-level2" {...form.register('city')} />
        </Field>
        <Field
          label="Postal code"
          helper={fmt ? `Format ${fmt.example.replace(/\d/g, '0')}` : undefined}
          error={errors.postalCode?.message}
          id="kyc-postalCode"
        >
          <Input size="l" autoComplete="postal-code" {...form.register('postalCode')} />
        </Field>
        <Field
          label="Country of residence"
          helper="Permitted region · matches your account. Moved? Contact support."
          error={errors.country?.message}
          id="kyc-country"
          disabled={Boolean(accountCountry)}
        >
          <Input
            size="l"
            value={countryName(form.watch('country') || '')}
            readOnly
            disabled={Boolean(accountCountry)}
          />
        </Field>
        <Field
          label="Occupation"
          helper="Required by anti-money-laundering rules"
          error={errors.occupation?.message}
          id="kyc-occupation"
        >
          <Input size="l" autoComplete="organization-title" {...form.register('occupation')} />
        </Field>
      </div>

      <fieldset
        className="flex flex-col gap-3 rounded-lg border border-border-subtle p-4"
        id="kyc-pep"
      >
        <legend className="px-1 text-label-l">Are you a politically exposed person (PEP)?</legend>
        <p className="text-caption text-text-tertiary">
          A PEP holds, or held in the last 12 months, a prominent public role — or is a close family
          member or associate of someone who does. Answering yes does not stop you verifying.
        </p>
        <Controller
          control={form.control}
          name="pep"
          render={({ field }) => (
            <div
              role="radiogroup"
              aria-label="PEP declaration"
              className="grid gap-2 tablet:grid-cols-2"
            >
              {(
                [
                  ['not_pep', 'I am not a PEP'],
                  ['pep', 'I am a PEP or closely related to one'],
                ] as const
              ).map(([v, label]) => (
                <label
                  key={v}
                  className={cn(
                    'flex min-h-12 cursor-pointer items-center gap-3 rounded-md border px-4 text-body-s',
                    field.value === v
                      ? 'border-border-brand bg-brand-tint'
                      : 'border-border-default hover:bg-surface-hover',
                  )}
                >
                  <input
                    type="radio"
                    name="pep"
                    value={v}
                    checked={field.value === v}
                    onChange={() => field.onChange(v)}
                    className="size-4 accent-[var(--color-brand)]"
                  />
                  {label}
                </label>
              ))}
            </div>
          )}
        />
        {errors.pep && <p className="text-caption text-text-danger">{errors.pep.message}</p>}
      </fieldset>

      <div id="kyc-accuracyConfirmed">
        <Controller
          control={form.control}
          name="accuracyConfirmed"
          render={({ field }) => (
            <CheckboxField
              checked={field.value === true}
              onCheckedChange={(v) => field.onChange(v === true)}
              label="I confirm these details are accurate and belong to me"
              description="Giving false information can lead to your verification being refused and your account being closed."
              aria-invalid={Boolean(errors.accuracyConfirmed) || undefined}
            />
          )}
        />
        {errors.accuracyConfirmed && (
          <p className="mt-1 pl-8 text-caption text-text-danger">
            {errors.accuracyConfirmed.message}
          </p>
        )}
      </div>
      {app.personal?.savedAt && (
        <p className="text-caption text-text-tertiary">
          Saved automatically · {new Date(app.personal.savedAt).toUTCString().slice(5, 22)} UTC
        </p>
      )}
    </form>
  );
}

// ── AUTH-13 Document upload ────────────────────────────────────────────────────────────────────

const SIDE_LABEL: Record<KycDocumentSide, string> = {
  photo_page: 'Photo page',
  front: 'Front',
  back: 'Back',
  single: 'Document',
};
const SIDE_HINT: Record<KycDocumentSide, string> = {
  photo_page: 'The page with your photo and the two machine-readable lines',
  front: 'The side with your photo',
  back: 'The side with the barcode and machine-readable lines',
  single: 'Utility bill, bank statement or tax letter from the last 3 months',
};

async function sha256Hex(file: File): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

export interface UploadInput {
  documentType: KycDocumentType;
  side: KycDocumentSide;
  issuingCountry?: string;
  file: File;
  sha256: string;
}

export function DocumentStep({
  app,
  onUpload,
  uploading,
  accountCountry,
}: {
  app: KycApplicationView;
  onUpload: (u: UploadInput) => Promise<void>;
  uploading: KycDocumentSide | null;
  accountCountry: string | null;
}) {
  const level3 = app.level === 'level_3';
  const [docType, setDocType] = React.useState<KycDocumentType | null>(
    app.documentType ?? (level3 ? 'proof_of_address' : null),
  );
  const [issuing, setIssuing] = React.useState<string>(accountCountry ?? 'PT');
  const [previews, setPreviews] = React.useState<Partial<Record<KycDocumentSide, string>>>({});
  const [localError, setLocalError] = React.useState<string | null>(null);
  React.useEffect(
    () => () => {
      Object.values(previews).forEach((u) => u && URL.revokeObjectURL(u));
    },
    [previews],
  );
  const docs = app.documents.filter((d) => d.documentType === docType);
  const docFor = (side: KycDocumentSide): KycDocumentView | undefined =>
    [...docs].reverse().find((d) => d.side === side);
  const sides = docType ? KYC_DOCUMENT_REQUIRED_SIDES[docType] : [];
  const types: KycDocumentType[] = level3
    ? ['proof_of_address']
    : ['passport', 'id_card', 'driving_licence'];
  const allOk =
    sides.length > 0 &&
    sides.every((s) => ['accepted', 'in_review', 'approved'].includes(docFor(s)?.status ?? ''));
  const extracted = sides.map((s) => docFor(s)?.extracted).find(Boolean);

  const pick = async (side: KycDocumentSide, file: File | undefined) => {
    setLocalError(null);
    if (!file || !docType) return;
    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)) {
      setLocalError('Use a JPG, PNG or PDF file.');
      return;
    }
    if (file.size > KYC_DOCUMENT_MAX_BYTES) {
      setLocalError('Files can be up to 10 MB.');
      return;
    }
    if (file.type.startsWith('image/'))
      setPreviews((p) => ({ ...p, [side]: URL.createObjectURL(file) }));
    await onUpload({
      documentType: docType,
      side,
      issuingCountry: issuing,
      file,
      sha256: await sha256Hex(file),
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-label-l">Document type</legend>
        <div role="radiogroup" aria-label="Document type" className="grid gap-2 tablet:grid-cols-3">
          {types.map((t) => {
            const on = docType === t;
            return (
              <label
                key={t}
                aria-label={DOC_LABEL[t]}
                className={cn(
                  'flex min-h-[72px] cursor-pointer items-start gap-3 rounded-md border p-3',
                  on
                    ? 'border-border-brand bg-brand-tint'
                    : 'border-border-default hover:bg-surface-hover',
                )}
              >
                <input
                  type="radio"
                  name="docType"
                  checked={on}
                  onChange={() => setDocType(t)}
                  className="mt-1 size-4 accent-[var(--color-brand)]"
                />
                <span>
                  <span className="block text-body-s-strong">{DOC_LABEL[t]}</span>
                  <span className="text-caption text-text-tertiary">
                    {KYC_DOCUMENT_REQUIRED_SIDES[t].length === 2
                      ? 'Front and back · 2 photos'
                      : t === 'passport'
                        ? 'Photo page only · 1 photo'
                        : '1 file'}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
        {!level3 && (
          <Field label="Issuing country" className="max-w-[320px]">
            <Select value={issuing} onValueChange={setIssuing}>
              <SelectTrigger size="m" aria-label="Issuing country">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {countryOptions().map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
      </fieldset>

      <div className="grid gap-3 tablet:grid-cols-2">
        <div className="flex flex-col gap-2 rounded-lg bg-surface-raised p-4">
          <p className="text-label-l">Requirements</p>
          {(level3
            ? [
                'Issued in the last 3 months',
                'Shows your name and residential address',
                'Utility bill, bank statement or tax letter',
                'The original file — no screenshots or edits',
              ]
            : [
                'Valid on the day you submit — not expired',
                'JPG, PNG or PDF, up to 10 MB per side',
                'All four corners, sharp, no glare',
                'No screenshots, photocopies or photos of a screen',
              ]
          ).map((t) => (
            <CheckLine key={t} ok tone="info">
              {t}
            </CheckLine>
          ))}
        </div>
        <div className="flex flex-col gap-2 rounded-lg bg-surface-raised p-4">
          <p className="text-label-l">What a good photo looks like</p>
          <div className="grid grid-cols-4 gap-2" aria-hidden>
            {[
              ['ok', 'Sharp'],
              ['crop', 'Cropped'],
              ['glare', 'Glare'],
              ['blur', 'Blurry'],
            ].map(([k, l]) => (
              <div key={k} className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    'relative h-12 w-full overflow-hidden rounded-sm border-2 bg-ink-100',
                    k === 'ok' ? 'border-brand' : 'border-status-danger',
                    k === 'blur' && 'blur-[2px]',
                  )}
                >
                  <div
                    className={cn(
                      'absolute top-2 h-6 w-4 rounded-xs bg-ink-400',
                      k === 'crop' ? '-left-2' : 'left-2',
                    )}
                  />
                  <div className="absolute top-3 left-8 h-1.5 w-10 rounded-full bg-ink-500" />
                  <div className="absolute top-6 left-8 h-1.5 w-8 rounded-full bg-ink-400" />
                  {k === 'glare' && (
                    <div className="absolute -top-2 right-0 size-10 rounded-full bg-white/90" />
                  )}
                </div>
                <span
                  className={cn(
                    'text-[11px]',
                    k === 'ok' ? 'text-text-success' : 'text-text-danger',
                  )}
                >
                  {l}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {docType && (
        <div className={cn('grid gap-3', sides.length > 1 && 'tablet:grid-cols-2')}>
          {sides.map((side) => {
            const d = docFor(side);
            const bad = d?.status === 'rejected';
            const ok = d && !bad;
            const busy = uploading === side;
            const inputId = `kyc-file-${side}`;
            return (
              <div
                key={side}
                className={cn(
                  'flex flex-col gap-3 rounded-lg border-2 border-dashed p-4',
                  bad
                    ? 'border-status-danger bg-status-danger-tint'
                    : ok
                      ? 'border-border-success'
                      : 'border-border-default',
                )}
              >
                <div className="flex items-center gap-2">
                  <p className="flex-1 text-label-l">
                    {DOC_LABEL[docType]} — {SIDE_LABEL[side]}
                  </p>
                  {ok && (
                    <span className="inline-flex items-center gap-1 text-label-s text-text-success">
                      <CircleCheck aria-hidden className="size-4" /> Passed quality check
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-md bg-bg-secondary">
                    {previews[side] ? (
                      // eslint-disable-next-line @next/next/no-img-element -- local object URL preview, never uploaded to our servers
                      <img
                        src={previews[side]}
                        alt={`${SIDE_LABEL[side]} preview`}
                        className={cn('size-full object-cover', bad && 'blur-[1px]')}
                        onError={() =>
                          setPreviews((p) => {
                            const next = { ...p };
                            delete next[side];
                            return next;
                          })
                        }
                      />
                    ) : (
                      <FileImage aria-hidden className="size-7 text-icon-muted" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 text-caption text-text-tertiary">
                    {d ? (
                      <>
                        <p className="truncate font-mono text-text-secondary">{d.fileName}</p>
                        <p>{(d.sizeBytes / 1024 / 1024).toFixed(1)} MB</p>
                      </>
                    ) : (
                      <p>{SIDE_HINT[side]}</p>
                    )}
                  </div>
                </div>
                {bad && (
                  <NoteBox tone="danger" title="This photo is too blurry to read">
                    Use daylight, no flash; lay the document flat with all four corners in frame;
                    zoom in before sending — every letter should be sharp.
                    {sides.length > 1 ? ' Your other side is fine and stays uploaded.' : ''}
                  </NoteBox>
                )}
                <input
                  id={inputId}
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  capture="environment"
                  className="sr-only"
                  onChange={(e) => {
                    void pick(side, e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
                <Button
                  variant={ok ? 'ghost' : 'secondary'}
                  size="m"
                  loading={busy}
                  leadingIcon={ok || bad ? <RotateCcw aria-hidden /> : <Upload aria-hidden />}
                  onClick={() => document.getElementById(inputId)?.click()}
                >
                  {bad ? 'Retake photo' : ok ? 'Replace' : 'Choose file or take photo'}
                </Button>
              </div>
            );
          })}
        </div>
      )}
      {localError && (
        <p role="alert" className="text-body-s text-text-danger">
          {localError}
        </p>
      )}
      {allOk && extracted && (
        <div className="rounded-lg border border-border-subtle bg-bg-secondary p-4">
          <p className="mb-2 flex items-center gap-2 text-label-l">
            <ShieldCheck aria-hidden className="size-4 text-icon-brand" /> We read these details
            from your document <Demo size="xs" />
          </p>
          <dl className="grid gap-4 text-body-s tablet:grid-cols-4">
            {[
              ['Full name', extracted.fullName.toUpperCase(), 'Matches your details'],
              ['Date of birth', extracted.dateOfBirth, 'Matches your details'],
              [
                'Document number',
                `•••• ${extracted.documentNumber.slice(-4)}`,
                'Partly hidden for your privacy',
              ],
              ['Expiry date', extracted.expiresOn, 'Valid'],
            ].map(([k, v, note]) => (
              <div key={k} className="flex flex-col gap-0.5">
                <dt className="text-caption text-text-tertiary">{k}</dt>
                <dd className="text-body-m-strong">{v}</dd>
                <dd className="flex items-center gap-1 text-caption text-text-success">
                  <CircleCheck aria-hidden className="size-3.5" /> {note}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-caption text-text-tertiary">
            Something wrong? Go back and correct your details before you continue.
          </p>
        </div>
      )}
      <p className="text-caption text-text-tertiary">
        Files go to our verification partner (mock provider in this DEMO build — files never leave
        your browser; only the file name, size and checksum are sent).
      </p>
    </div>
  );
}

// ── AUTH-14 Liveness (mock) ───────────────────────────────────────────────────────────────────

type Cam = 'idle' | 'starting' | 'ready' | 'recording' | 'denied' | 'sending';

export function LivenessStep({
  app,
  onCapture,
}: {
  app: KycApplicationView;
  onCapture: (durationMs: number) => Promise<void>;
}) {
  const [cam, setCam] = React.useState<Cam>('idle');
  const [progress, setProgress] = React.useState(0);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };
  React.useEffect(() => stop, []);

  const start = async () => {
    setCam('starting');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('no camera');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setCam('ready');
    } catch {
      setCam('denied');
    }
  };

  const record = async (seconds = 5) => {
    setCam('recording');
    const t0 = Date.now();
    await new Promise<void>((resolve) => {
      const id = window.setInterval(() => {
        const p = Math.min(1, (Date.now() - t0) / (seconds * 1000));
        setProgress(p);
        if (p >= 1) {
          window.clearInterval(id);
          resolve();
        }
      }, 100);
    });
    stop();
    setCam('sending');
    await onCapture(Date.now() - t0);
    setCam('idle');
    setProgress(0);
  };

  const live = app.liveness;
  const failed = live.status === 'failed';
  return (
    <div className="flex flex-col gap-5">
      {failed && (
        <NoteBox
          tone="warning"
          title={`Let’s try that again — attempt ${live.attempts} of ${live.maxAttempts}`}
        >
          {live.issue ?? 'We couldn’t match the video.'} After {live.maxAttempts} attempts a
          specialist reviews it by hand, so you’re never locked out.
        </NoteBox>
      )}
      {live.status === 'manual_review' && (
        <NoteBox tone="info" title="A specialist will review your video">
          You’ve used all {live.maxAttempts} attempts. Continue — a person checks it during the
          review.
        </NoteBox>
      )}
      <div className="grid gap-5 tablet:grid-cols-[minmax(0,260px)_1fr]">
        <div className="relative mx-auto aspect-[3/4] w-full max-w-[260px] overflow-hidden rounded-xl bg-ink-950">
          <video
            ref={videoRef}
            muted
            playsInline
            className={cn(
              'size-full object-cover',
              cam === 'ready' || cam === 'recording' ? 'opacity-100' : 'opacity-0',
            )}
          />
          <div className="pointer-events-none absolute inset-6 rounded-[50%] border-[3px] border-dashed border-brand/80" />
          {cam !== 'ready' && cam !== 'recording' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-caption text-text-tertiary">
              {cam === 'denied' ? (
                <VideoOff aria-hidden className="size-8 text-text-warning" />
              ) : (
                <ScanFace aria-hidden className="size-8" />
              )}
              {cam === 'denied' ? 'Camera not available' : 'Camera preview'}
            </div>
          )}
          {cam === 'recording' && (
            <div className="absolute inset-x-4 bottom-4">
              <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
                <div className="h-full bg-brand" style={{ width: `${progress * 100}%` }} />
              </div>
              <p className="mt-1 text-center text-caption text-white">
                Recording — turn your head slowly
              </p>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-3">
          <p className="text-label-l">Before you start</p>
          {[
            'Good light on your face, no hat or sunglasses',
            'Keep your face inside the oval',
            'Turn your head slowly left and right when asked',
          ].map((t) => (
            <CheckLine key={t} ok tone="info">
              {t}
            </CheckLine>
          ))}
          {cam === 'denied' && (
            <NoteBox tone="warning" title="Camera permission is off">
              Allow the camera in your browser’s address bar (camera icon) or in your device
              settings, then try again. DEMO build: you can also use the mock capture — no video is
              recorded.
            </NoteBox>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            {cam === 'idle' || cam === 'denied' || cam === 'starting' ? (
              <Button
                size="m"
                leadingIcon={<Camera aria-hidden />}
                loading={cam === 'starting'}
                onClick={() => void start()}
              >
                {failed ? 'Retake video' : 'Start camera'}
              </Button>
            ) : cam === 'ready' ? (
              <Button
                size="m"
                leadingIcon={<ScanFace aria-hidden />}
                onClick={() => void record(5)}
              >
                Record 5-second video
              </Button>
            ) : (
              <Button
                size="m"
                disabled
                leadingIcon={<Loader2 aria-hidden className="animate-spin" />}
              >
                {cam === 'sending' ? 'Checking…' : 'Recording…'}
              </Button>
            )}
            {(cam === 'idle' || cam === 'denied') && (
              <Button variant="ghost" size="m" onClick={() => void record(4)}>
                Use DEMO capture (no camera)
              </Button>
            )}
          </div>
          <p className="text-caption text-text-tertiary">
            Mock liveness provider: frames never leave your browser in this DEMO build. A real
            provider deletes face data within 30 days of a decision.
          </p>
        </div>
      </div>
    </div>
  );
}

export { IdCard };
