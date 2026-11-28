import { Injectable } from '@nestjs/common';
import type { KycRecord, Prisma } from '@prisma/client';
import { KYC_LEVEL_LABEL, KYC_LEVEL_RANK, type KycLevel } from '@gp/shared/enums';
import { DAILY_WITHDRAWAL_LIMIT } from '@gp/shared/limits';
import {
  KYC_DOCUMENT_MIN_BYTES,
  KYC_DOCUMENT_REQUIRED_SIDES,
  KYC_LIVENESS_MAX_ATTEMPTS,
  type KycCheck,
  type KycDetails,
  type KycDocumentSide,
  type KycDocumentType,
  type KycDocumentUpload,
  type KycFlowStep,
} from '@gp/shared/schemas';
import { randomUUID } from 'node:crypto';

import { AppError, conflict, notFound } from '../../common/errors';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { GeoService } from '../compliance/geo.service';
import { NotificationsService } from '../notifications/notifications.service';

type FlowLevel = Exclude<KycLevel, 'none'>;
type DocStatus = 'accepted' | 'rejected' | 'in_review' | 'approved' | 'replaced';

export interface FlowDocument {
  id: string;
  documentType: KycDocumentType;
  side: KycDocumentSide;
  issuingCountry: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  status: DocStatus;
  /** Check categories that failed for this file (mock provider). */
  issues: KycCheck[];
  uploadedAt: string;
  reviewedAt: string | null;
  /** DEMO data the (mock) provider read from the document. */
  extracted: {
    fullName: string;
    dateOfBirth: string;
    documentNumber: string;
    expiresOn: string;
  } | null;
}

export interface FlowData {
  version: 1;
  level: FlowLevel;
  personal?: Omit<KycDetails, 'accuracyConfirmed'> & { savedAt: string };
  documentType?: KycDocumentType;
  documents: FlowDocument[];
  liveness?: {
    status: 'passed' | 'failed' | 'manual_review';
    attempts: number;
    lastAttemptAt: string;
    issue: string | null;
  };
  checks?: { check: KycCheck; ok: boolean }[];
  submissions?: number;
}

const OPEN_STATUSES = ['not_started', 'pending', 'in_review', 'resubmission_required'] as const;
const EDITABLE_STATUSES = new Set(['not_started', 'resubmission_required']);
const REVIEW_HOURS = 24;

const CHECK_MESSAGES: Record<KycCheck, { failed: string; passed: string; fix: string }> = {
  image_quality: {
    failed: 'Photo too blurry — the details at the bottom can’t be read',
    passed: 'Image quality — sharp and readable',
    fix: 'Use daylight, no flash, all four corners in frame, and check every letter is sharp before sending.',
  },
  document_type: {
    failed: 'Document type not accepted',
    passed: 'Document type — accepted',
    fix: 'Use a passport, national ID card or driving licence.',
  },
  document_validity: {
    failed: 'Document expired',
    passed: 'Document validity — valid',
    fix: 'Upload a document that is valid today.',
  },
  name_match: {
    failed: 'Name doesn’t match your details',
    passed: 'Name and date of birth match your details',
    fix: 'Enter your legal name exactly as on the document, including middle names.',
  },
  liveness: {
    failed: 'Selfie video couldn’t be matched',
    passed: 'Liveness — selfie video passed',
    fix: 'Record again in good light and keep your face inside the oval.',
  },
  screening: {
    failed: 'Screening needs a manual review',
    passed: 'Sanctions & PEP screening — clear',
    fix: 'No action needed — a specialist reviews it.',
  },
};

function asFlow(record: Pick<KycRecord, 'details' | 'level'>): FlowData {
  const d = record.details as unknown;
  if (d && typeof d === 'object' && !Array.isArray(d) && (d as FlowData).version === 1) {
    return d as FlowData;
  }
  return { version: 1, level: record.level as FlowLevel, documents: [] };
}

/** Mark the open documents approved (called when the mock provider / compliance approves the record). */
export function approveFlowDetails(
  details: Prisma.JsonValue,
  at: Date,
): Prisma.InputJsonValue | undefined {
  const d = details as unknown as FlowData | null;
  if (!d || typeof d !== 'object' || d.version !== 1) return undefined;
  return {
    ...d,
    documents: d.documents.map((doc) =>
      doc.status === 'accepted' || doc.status === 'in_review'
        ? { ...doc, status: 'approved', reviewedAt: at.toISOString() }
        : doc,
    ),
  } as unknown as Prisma.InputJsonValue;
}

/** Sides of the chosen document type that are uploaded and passed the quality check. */
function acceptedSides(flow: FlowData, type: KycDocumentType | undefined): KycDocumentSide[] {
  if (!type) return [];
  return flow.documents
    .filter((d) => d.documentType === type && (d.status === 'accepted' || d.status === 'in_review'))
    .map((d) => d.side);
}

function documentComplete(flow: FlowData, type: KycDocumentType | undefined): boolean {
  if (!type) return false;
  const have = new Set(acceptedSides(flow, type));
  return KYC_DOCUMENT_REQUIRED_SIDES[type].every((s) => have.has(s));
}

/**
 * KYC flow (AUTH-11…17) on top of the KYC provider interface — MOCK provider in dev: personal details → ID
 * document (metadata + mock quality check) → liveness (mock) → submit → review (DEMO approve / reject endpoints).
 * Raises `user_profiles.kyc_level` only on approval; Level 1 is approved instantly (basic details only).
 */
@Injectable()
export class KycFlowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geo: GeoService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  private async currentLevel(userId: string): Promise<KycLevel> {
    return (
      (await this.prisma.userProfile.findUnique({ where: { userId }, select: { kycLevel: true } }))
        ?.kycLevel ?? 'none'
    );
  }

  private openRecord(userId: string) {
    return this.prisma.kycRecord.findFirst({
      where: { userId, status: { in: [...OPEN_STATUSES] } },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async editable(userId: string) {
    const rec = await this.openRecord(userId);
    if (!rec) throw notFound('Verification application', { hint: 'start_first' });
    if (!EDITABLE_STATUSES.has(rec.status)) {
      throw conflict('This application is being reviewed — you can’t change it now', {
        status: rec.status,
      });
    }
    return { rec, flow: asFlow(rec) };
  }

  private save(id: string, flow: FlowData, data: Prisma.KycRecordUpdateInput = {}) {
    return this.prisma.kycRecord.update({
      where: { id },
      data: { ...data, details: flow as unknown as Prisma.InputJsonValue },
    });
  }

  /** The open application (or the latest decided one) with requirements and the next step. */
  async view(userId: string) {
    const [level, open, latest] = await Promise.all([
      this.currentLevel(userId),
      this.openRecord(userId),
      this.prisma.kycRecord.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    ]);
    const rec = open ?? latest;
    return {
      currentLevel: level,
      currentLabel: KYC_LEVEL_LABEL[level],
      dailyLimit: DAILY_WITHDRAWAL_LIMIT[level],
      levels: (['level_1', 'level_2', 'level_3'] as const).map((l) => ({
        level: l,
        label: KYC_LEVEL_LABEL[l],
        dailyLimit: DAILY_WITHDRAWAL_LIMIT[l],
        reached: KYC_LEVEL_RANK[level] >= KYC_LEVEL_RANK[l],
      })),
      application: rec ? this.applicationView(rec, level) : null,
    };
  }

  private applicationView(rec: KycRecord, current: KycLevel) {
    const flow = asFlow(rec);
    const level = rec.level as FlowLevel;
    const needsDocument = level !== 'level_1';
    const needsLiveness = level === 'level_2';
    const docType = level === 'level_3' ? 'proof_of_address' : flow.documentType;
    const req = {
      details: level === 'level_3' ? true : Boolean(flow.personal),
      document: needsDocument ? documentComplete(flow, docType) : true,
      liveness: needsLiveness
        ? flow.liveness?.status === 'passed' || flow.liveness?.status === 'manual_review'
        : true,
    };
    const editable = EDITABLE_STATUSES.has(rec.status);
    const step: KycFlowStep = !editable
      ? 'review'
      : !req.details
        ? 'details'
        : !req.document
          ? 'document'
          : !req.liveness
            ? 'liveness'
            : 'review';
    const failed = (flow.checks ?? []).filter((c) => !c.ok).map((c) => c.check);
    return {
      id: rec.id,
      reference: `KYC-${rec.id.replace(/-/g, '').slice(0, 5).toUpperCase()}`,
      level,
      levelLabel: KYC_LEVEL_LABEL[level],
      status: rec.status,
      editable,
      step,
      requirements: req,
      canSubmit: editable && req.details && req.document && req.liveness,
      personal: flow.personal ?? null,
      documentType: docType ?? null,
      documents: flow.documents.filter((d) => d.status !== 'replaced'),
      liveness: flow.liveness
        ? { ...flow.liveness, maxAttempts: KYC_LIVENESS_MAX_ATTEMPTS }
        : {
            status: null,
            attempts: 0,
            lastAttemptAt: null,
            issue: null,
            maxAttempts: KYC_LIVENESS_MAX_ATTEMPTS,
          },
      checks: (flow.checks ?? []).map((c) => ({
        ...c,
        message: c.ok ? CHECK_MESSAGES[c.check].passed : CHECK_MESSAGES[c.check].failed,
        fix: c.ok ? null : CHECK_MESSAGES[c.check].fix,
      })),
      failedChecks: failed,
      submittedAt: rec.submittedAt?.toISOString() ?? null,
      expectedBy: rec.submittedAt
        ? new Date(rec.submittedAt.getTime() + REVIEW_HOURS * 3_600_000).toISOString()
        : null,
      reviewedAt: rec.reviewedAt?.toISOString() ?? null,
      rejectionReason: rec.rejectionReason,
      dailyLimitAfter: DAILY_WITHDRAWAL_LIMIT[level],
      dailyLimitNow: DAILY_WITHDRAWAL_LIMIT[current],
      provider: rec.provider,
      createdAt: rec.createdAt.toISOString(),
      isDemo: rec.isDemo || rec.provider === 'mock',
    };
  }

  /** Start (or resume) an application for a level above the current one. */
  async start(userId: string, level: FlowLevel) {
    const current = await this.currentLevel(userId);
    if (KYC_LEVEL_RANK[current] >= KYC_LEVEL_RANK[level]) {
      throw conflict(`You are already verified at ${KYC_LEVEL_LABEL[current]}`);
    }
    if (level === 'level_3' && KYC_LEVEL_RANK[current] < KYC_LEVEL_RANK.level_2) {
      throw new AppError('KYC_REQUIRED', 'Complete Level 2 before applying for Level 3', {
        requiredLevel: 'level_2',
      });
    }
    const open = await this.openRecord(userId);
    if (open) {
      if (open.level === level) return this.view(userId);
      if (EDITABLE_STATUSES.has(open.status) && open.status === 'not_started') {
        // switching level before anything was submitted: keep what was entered
        await this.save(open.id, { ...asFlow(open), level }, { level });
        return this.view(userId);
      }
      throw conflict('Another verification is already in progress', { status: open.status });
    }
    await this.prisma.kycRecord.create({
      data: {
        userId,
        level,
        status: 'not_started',
        provider: 'mock',
        providerRef: `mock-kyc-${randomUUID()}`,
        details: { version: 1, level, documents: [] },
      },
    });
    return this.view(userId);
  }

  async saveDetails(userId: string, input: KycDetails) {
    const { rec, flow } = await this.editable(userId);
    const declared = (
      await this.prisma.userProfile.findUnique({ where: { userId }, select: { country: true } })
    )?.country;
    if (declared && declared !== input.country) {
      throw new AppError(
        'VALIDATION_FAILED',
        'Country of residence must match your account — contact support if you have moved',
        { field: 'country' },
      );
    }
    if (!(await this.geo.isPermitted(input.country))) {
      throw new AppError('GEO_RESTRICTED', 'GLOBAL POOL is not available in this country');
    }
    const { accuracyConfirmed: _ok, ...personal } = input;
    void _ok;
    await this.save(rec.id, {
      ...flow,
      personal: { ...personal, savedAt: new Date().toISOString() },
    });
    return this.view(userId);
  }

  /** Document metadata + mock quality check (low-resolution files fail `image_quality`). */
  async addDocument(userId: string, input: KycDocumentUpload) {
    const { rec, flow } = await this.editable(userId);
    const level = rec.level as FlowLevel;
    if (level === 'level_3' && input.documentType !== 'proof_of_address') {
      throw new AppError('VALIDATION_FAILED', 'Level 3 needs a proof of address document');
    }
    if (level !== 'level_3' && input.documentType === 'proof_of_address') {
      throw new AppError('VALIDATION_FAILED', 'Choose a passport, ID card or driving licence');
    }
    const now = new Date().toISOString();
    const issues: KycCheck[] = input.sizeBytes < KYC_DOCUMENT_MIN_BYTES ? ['image_quality'] : [];
    const personal = flow.personal;
    const doc: FlowDocument = {
      id: randomUUID(),
      documentType: input.documentType,
      side: input.side,
      issuingCountry: input.issuingCountry ?? null,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      sha256: input.sha256,
      status: issues.length ? 'rejected' : 'accepted',
      issues,
      uploadedAt: now,
      reviewedAt: null,
      extracted:
        !issues.length && personal && (input.side === 'front' || input.side === 'photo_page')
          ? {
              fullName: `${personal.firstNames} ${personal.lastNames}`,
              dateOfBirth: personal.dateOfBirth,
              documentNumber: `DEMO-${input.sha256.slice(0, 8).toUpperCase()}`,
              expiresOn: `${new Date().getUTCFullYear() + 5}-06-18`,
            }
          : null,
    };
    const documents = flow.documents.map((d) =>
      d.status !== 'replaced' &&
      d.status !== 'approved' &&
      (d.documentType !== input.documentType || d.side === input.side)
        ? { ...d, status: 'replaced' as const }
        : d,
    );
    documents.push(doc);
    await this.save(rec.id, { ...flow, documentType: input.documentType, documents });
    return { document: doc, ...(await this.view(userId)) };
  }

  /** Mock liveness: a capture of at least 3 s passes. After 3 failed attempts a specialist reviews by hand. */
  async liveness(userId: string, input: { captured: true; durationMs: number }) {
    const { rec, flow } = await this.editable(userId);
    if (rec.level !== 'level_2')
      throw new AppError('BAD_REQUEST', 'This level needs no selfie video');
    if (flow.liveness?.status === 'passed') return this.view(userId);
    const attempts = (flow.liveness?.attempts ?? 0) + 1;
    if (attempts > KYC_LIVENESS_MAX_ATTEMPTS) {
      throw conflict('A specialist will review your selfie video by hand', { attempts });
    }
    const passed = input.durationMs >= 3000;
    await this.save(rec.id, {
      ...flow,
      liveness: {
        status: passed
          ? 'passed'
          : attempts >= KYC_LIVENESS_MAX_ATTEMPTS
            ? 'manual_review'
            : 'failed',
        attempts,
        lastAttemptAt: new Date().toISOString(),
        issue: passed ? null : 'Hold still for the whole recording (at least 3 seconds)',
      },
    });
    return this.view(userId);
  }

  async submit(userId: string, handle: string | null) {
    const { rec } = await this.editable(userId);
    const view = await this.view(userId);
    const app = view.application!;
    if (!app.canSubmit) {
      throw new AppError('VALIDATION_FAILED', 'Finish every step before you submit', {
        requirements: app.requirements,
      });
    }
    const flow = asFlow(rec);
    const now = new Date();
    const level = rec.level as FlowLevel;
    const checks: FlowData['checks'] = (
      [
        'image_quality',
        'document_type',
        'document_validity',
        'name_match',
        'liveness',
        'screening',
      ] as const
    )
      .filter(
        (c) =>
          level === 'level_2' || (c !== 'liveness' && (level === 'level_3' || c === 'screening')),
      )
      .map((check) => ({ check, ok: true }));
    const submitted: FlowData = {
      ...flow,
      checks,
      submissions: (flow.submissions ?? 0) + 1,
      documents: flow.documents.map((d) =>
        d.status === 'accepted' ? { ...d, status: 'in_review' } : d,
      ),
    };
    if (level === 'level_1') {
      // Level 1 = basic details only: the mock provider approves instantly.
      await this.prisma.tx(async (tx) => {
        await tx.kycRecord.update({
          where: { id: rec.id },
          data: {
            status: 'verified',
            submittedAt: now,
            reviewedAt: now,
            details: submitted as unknown as Prisma.InputJsonValue,
          },
        });
        await tx.userProfile.update({ where: { userId }, data: { kycLevel: 'level_1' } });
        await this.notifications.notify(tx, {
          userId,
          type: 'kyc.approved',
          title: 'Identity verified — Level 1',
          body: `Withdrawals up to ${DAILY_WITHDRAWAL_LIMIT.level_1} USDT a day are now available.`,
        });
      });
    } else {
      await this.prisma.tx(async (tx) => {
        await tx.kycRecord.update({
          where: { id: rec.id },
          data: {
            status: 'in_review',
            submittedAt: now,
            reviewedAt: null,
            rejectionReason: null,
            details: submitted as unknown as Prisma.InputJsonValue,
          },
        });
        await this.notifications.notify(tx, {
          userId,
          type: 'kyc.submitted',
          title: 'Verification submitted',
          body: 'We’re reviewing your documents — usually under 10 minutes, up to 24 h.',
        });
      });
    }
    await this.audit.record({
      actorType: 'user',
      actorId: userId,
      actorLabel: handle,
      action: 'user.kyc.submitted',
      targetType: 'kyc_record',
      targetId: rec.id,
      metadata: { level },
    });
    return this.view(userId);
  }

  /** DEMO only — mock-provider rejection: the failed checks must be redone, everything else is kept. */
  async devReject(userId: string, level: FlowLevel, reasons: KycCheck[]) {
    const rec = await this.prisma.kycRecord.findFirst({
      where: { userId, level, status: { in: ['pending', 'in_review'] } },
      orderBy: { createdAt: 'desc' },
    });
    if (!rec) throw notFound('Submitted verification');
    const flow = asFlow(rec);
    const now = new Date();
    const failing = new Set(reasons);
    const docIssues = reasons.filter((r) => r !== 'liveness' && r !== 'screening');
    const next: FlowData = {
      ...flow,
      checks: (flow.checks ?? []).map((c) => ({ ...c, ok: !failing.has(c.check) })),
      documents: flow.documents.map((d) => {
        if (d.status !== 'in_review') return d;
        // image quality → only the back / single page needs a retake; other document issues reject every side
        const hit = docIssues.some((r) =>
          r === 'image_quality'
            ? d.side === 'back' || d.side === 'photo_page' || d.side === 'single'
            : true,
        );
        return hit
          ? { ...d, status: 'rejected' as const, issues: docIssues, reviewedAt: now.toISOString() }
          : { ...d, status: 'accepted' as const, reviewedAt: now.toISOString() };
      }),
      ...(failing.has('liveness') && flow.liveness
        ? {
            liveness: {
              ...flow.liveness,
              status: 'failed' as const,
              attempts: 0,
              issue: 'Record a new selfie video',
            },
          }
        : {}),
    };
    await this.prisma.tx(async (tx) => {
      await tx.kycRecord.update({
        where: { id: rec.id },
        data: {
          status: 'resubmission_required',
          reviewedAt: now,
          rejectionReason: reasons.map((r) => CHECK_MESSAGES[r].failed).join('; '),
          details: next as unknown as Prisma.InputJsonValue,
          isDemo: true,
        },
      });
      await this.notifications.notify(tx, {
        userId,
        type: 'kyc.resubmission_required',
        title: 'Verification needs a fix',
        body: 'One or more checks didn’t pass. Redo only those items — everything else is kept.',
        isDemo: true,
      });
    });
    return this.view(userId);
  }

  /** A5 — every document shared for identity checks, newest first (metadata only, never the file). */
  async documents(userId: string) {
    const records = await this.prisma.kycRecord.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    const items = records.flatMap((r) =>
      asFlow(r).documents.map((d) => ({
        ...d,
        level: r.level,
        recordId: r.id,
        recordStatus: r.status,
        isDemo: r.isDemo || r.provider === 'mock',
      })),
    );
    items.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
    // Records verified without the flow (e.g. DEMO seed) still show as an approved verification on file.
    const legacy = records
      .filter((r) => r.status === 'verified' && asFlow(r).documents.length === 0)
      .map((r) => ({
        recordId: r.id,
        level: r.level,
        reviewedAt: r.reviewedAt?.toISOString() ?? null,
        submittedAt: r.submittedAt?.toISOString() ?? null,
        provider: r.provider,
        isDemo: r.isDemo || r.provider === 'mock',
      }));
    return {
      items,
      verifiedRecords: legacy,
      counts: {
        approved: items.filter((d) => d.status === 'approved').length,
        inReview: items.filter((d) => d.status === 'in_review' || d.status === 'accepted').length,
        rejected: items.filter((d) => d.status === 'rejected').length,
      },
    };
  }
}
