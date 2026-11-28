"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KycFlowService = void 0;
exports.approveFlowDetails = approveFlowDetails;
const common_1 = require("@nestjs/common");
const enums_1 = require("@gp/shared/enums");
const limits_1 = require("@gp/shared/limits");
const schemas_1 = require("@gp/shared/schemas");
const node_crypto_1 = require("node:crypto");
const errors_1 = require("../../common/errors");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const geo_service_1 = require("../compliance/geo.service");
const notifications_service_1 = require("../notifications/notifications.service");
const OPEN_STATUSES = ['not_started', 'pending', 'in_review', 'resubmission_required'];
const EDITABLE_STATUSES = new Set(['not_started', 'resubmission_required']);
const REVIEW_HOURS = 24;
const CHECK_MESSAGES = {
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
function asFlow(record) {
    const d = record.details;
    if (d && typeof d === 'object' && !Array.isArray(d) && d.version === 1) {
        return d;
    }
    return { version: 1, level: record.level, documents: [] };
}
/** Mark the open documents approved (called when the mock provider / compliance approves the record). */
function approveFlowDetails(details, at) {
    const d = details;
    if (!d || typeof d !== 'object' || d.version !== 1)
        return undefined;
    return {
        ...d,
        documents: d.documents.map((doc) => doc.status === 'accepted' || doc.status === 'in_review'
            ? { ...doc, status: 'approved', reviewedAt: at.toISOString() }
            : doc),
    };
}
/** Sides of the chosen document type that are uploaded and passed the quality check. */
function acceptedSides(flow, type) {
    if (!type)
        return [];
    return flow.documents
        .filter((d) => d.documentType === type && (d.status === 'accepted' || d.status === 'in_review'))
        .map((d) => d.side);
}
function documentComplete(flow, type) {
    if (!type)
        return false;
    const have = new Set(acceptedSides(flow, type));
    return schemas_1.KYC_DOCUMENT_REQUIRED_SIDES[type].every((s) => have.has(s));
}
/**
 * KYC flow (AUTH-11…17) on top of the KYC provider interface — MOCK provider in dev: personal details → ID
 * document (metadata + mock quality check) → liveness (mock) → submit → review (DEMO approve / reject endpoints).
 * Raises `user_profiles.kyc_level` only on approval; Level 1 is approved instantly (basic details only).
 */
let KycFlowService = class KycFlowService {
    prisma;
    geo;
    audit;
    notifications;
    constructor(prisma, geo, audit, notifications) {
        this.prisma = prisma;
        this.geo = geo;
        this.audit = audit;
        this.notifications = notifications;
    }
    async currentLevel(userId) {
        return ((await this.prisma.userProfile.findUnique({ where: { userId }, select: { kycLevel: true } }))
            ?.kycLevel ?? 'none');
    }
    openRecord(userId) {
        return this.prisma.kycRecord.findFirst({
            where: { userId, status: { in: [...OPEN_STATUSES] } },
            orderBy: { createdAt: 'desc' },
        });
    }
    async editable(userId) {
        const rec = await this.openRecord(userId);
        if (!rec)
            throw (0, errors_1.notFound)('Verification application', { hint: 'start_first' });
        if (!EDITABLE_STATUSES.has(rec.status)) {
            throw (0, errors_1.conflict)('This application is being reviewed — you can’t change it now', {
                status: rec.status,
            });
        }
        return { rec, flow: asFlow(rec) };
    }
    save(id, flow, data = {}) {
        return this.prisma.kycRecord.update({
            where: { id },
            data: { ...data, details: flow },
        });
    }
    /** The open application (or the latest decided one) with requirements and the next step. */
    async view(userId) {
        const [level, open, latest] = await Promise.all([
            this.currentLevel(userId),
            this.openRecord(userId),
            this.prisma.kycRecord.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } }),
        ]);
        const rec = open ?? latest;
        return {
            currentLevel: level,
            currentLabel: enums_1.KYC_LEVEL_LABEL[level],
            dailyLimit: limits_1.DAILY_WITHDRAWAL_LIMIT[level],
            levels: ['level_1', 'level_2', 'level_3'].map((l) => ({
                level: l,
                label: enums_1.KYC_LEVEL_LABEL[l],
                dailyLimit: limits_1.DAILY_WITHDRAWAL_LIMIT[l],
                reached: enums_1.KYC_LEVEL_RANK[level] >= enums_1.KYC_LEVEL_RANK[l],
            })),
            application: rec ? this.applicationView(rec, level) : null,
        };
    }
    applicationView(rec, current) {
        const flow = asFlow(rec);
        const level = rec.level;
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
        const step = !editable
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
            levelLabel: enums_1.KYC_LEVEL_LABEL[level],
            status: rec.status,
            editable,
            step,
            requirements: req,
            canSubmit: editable && req.details && req.document && req.liveness,
            personal: flow.personal ?? null,
            documentType: docType ?? null,
            documents: flow.documents.filter((d) => d.status !== 'replaced'),
            liveness: flow.liveness
                ? { ...flow.liveness, maxAttempts: schemas_1.KYC_LIVENESS_MAX_ATTEMPTS }
                : {
                    status: null,
                    attempts: 0,
                    lastAttemptAt: null,
                    issue: null,
                    maxAttempts: schemas_1.KYC_LIVENESS_MAX_ATTEMPTS,
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
            dailyLimitAfter: limits_1.DAILY_WITHDRAWAL_LIMIT[level],
            dailyLimitNow: limits_1.DAILY_WITHDRAWAL_LIMIT[current],
            provider: rec.provider,
            createdAt: rec.createdAt.toISOString(),
            isDemo: rec.isDemo || rec.provider === 'mock',
        };
    }
    /** Start (or resume) an application for a level above the current one. */
    async start(userId, level) {
        const current = await this.currentLevel(userId);
        if (enums_1.KYC_LEVEL_RANK[current] >= enums_1.KYC_LEVEL_RANK[level]) {
            throw (0, errors_1.conflict)(`You are already verified at ${enums_1.KYC_LEVEL_LABEL[current]}`);
        }
        if (level === 'level_3' && enums_1.KYC_LEVEL_RANK[current] < enums_1.KYC_LEVEL_RANK.level_2) {
            throw new errors_1.AppError('KYC_REQUIRED', 'Complete Level 2 before applying for Level 3', {
                requiredLevel: 'level_2',
            });
        }
        const open = await this.openRecord(userId);
        if (open) {
            if (open.level === level)
                return this.view(userId);
            if (EDITABLE_STATUSES.has(open.status) && open.status === 'not_started') {
                // switching level before anything was submitted: keep what was entered
                await this.save(open.id, { ...asFlow(open), level }, { level });
                return this.view(userId);
            }
            throw (0, errors_1.conflict)('Another verification is already in progress', { status: open.status });
        }
        // Carry the personal details over from the last verified level, so the player confirms instead of retyping.
        const previous = await this.prisma.kycRecord.findFirst({
            where: { userId, status: 'verified' },
            orderBy: { createdAt: 'desc' },
        });
        const personal = previous ? asFlow(previous).personal : undefined;
        const draft = { version: 1, level, documents: [], ...(personal ? { personal } : {}) };
        await this.prisma.kycRecord.create({
            data: {
                userId,
                level,
                status: 'not_started',
                provider: 'mock',
                providerRef: `mock-kyc-${(0, node_crypto_1.randomUUID)()}`,
                details: draft,
            },
        });
        return this.view(userId);
    }
    async saveDetails(userId, input) {
        const { rec, flow } = await this.editable(userId);
        const declared = (await this.prisma.userProfile.findUnique({ where: { userId }, select: { country: true } }))?.country;
        if (declared && declared !== input.country) {
            throw new errors_1.AppError('VALIDATION_FAILED', 'Country of residence must match your account — contact support if you have moved', { field: 'country' });
        }
        if (!(await this.geo.isPermitted(input.country))) {
            throw new errors_1.AppError('GEO_RESTRICTED', 'GLOBAL POOL is not available in this country');
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
    async addDocument(userId, input) {
        const { rec, flow } = await this.editable(userId);
        const level = rec.level;
        if (level === 'level_3' && input.documentType !== 'proof_of_address') {
            throw new errors_1.AppError('VALIDATION_FAILED', 'Level 3 needs a proof of address document');
        }
        if (level !== 'level_3' && input.documentType === 'proof_of_address') {
            throw new errors_1.AppError('VALIDATION_FAILED', 'Choose a passport, ID card or driving licence');
        }
        const now = new Date().toISOString();
        const issues = input.sizeBytes < schemas_1.KYC_DOCUMENT_MIN_BYTES ? ['image_quality'] : [];
        const personal = flow.personal;
        const doc = {
            id: (0, node_crypto_1.randomUUID)(),
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
            extracted: !issues.length && personal && (input.side === 'front' || input.side === 'photo_page')
                ? {
                    fullName: `${personal.firstNames} ${personal.lastNames}`,
                    dateOfBirth: personal.dateOfBirth,
                    documentNumber: `DEMO-${input.sha256.slice(0, 8).toUpperCase()}`,
                    expiresOn: `${new Date().getUTCFullYear() + 5}-06-18`,
                }
                : null,
        };
        const documents = flow.documents.map((d) => d.status !== 'replaced' &&
            d.status !== 'approved' &&
            (d.documentType !== input.documentType || d.side === input.side)
            ? { ...d, status: 'replaced' }
            : d);
        documents.push(doc);
        await this.save(rec.id, { ...flow, documentType: input.documentType, documents });
        return { document: doc, ...(await this.view(userId)) };
    }
    /** Mock liveness: a capture of at least 3 s passes. After 3 failed attempts a specialist reviews by hand. */
    async liveness(userId, input) {
        const { rec, flow } = await this.editable(userId);
        if (rec.level !== 'level_2')
            throw new errors_1.AppError('BAD_REQUEST', 'This level needs no selfie video');
        if (flow.liveness?.status === 'passed')
            return this.view(userId);
        const attempts = (flow.liveness?.attempts ?? 0) + 1;
        if (attempts > schemas_1.KYC_LIVENESS_MAX_ATTEMPTS) {
            throw (0, errors_1.conflict)('A specialist will review your selfie video by hand', { attempts });
        }
        const passed = input.durationMs >= 3000;
        await this.save(rec.id, {
            ...flow,
            liveness: {
                status: passed
                    ? 'passed'
                    : attempts >= schemas_1.KYC_LIVENESS_MAX_ATTEMPTS
                        ? 'manual_review'
                        : 'failed',
                attempts,
                lastAttemptAt: new Date().toISOString(),
                issue: passed ? null : 'Hold still for the whole recording (at least 3 seconds)',
            },
        });
        return this.view(userId);
    }
    async submit(userId, handle) {
        const { rec } = await this.editable(userId);
        const view = await this.view(userId);
        const app = view.application;
        if (!app.canSubmit) {
            throw new errors_1.AppError('VALIDATION_FAILED', 'Finish every step before you submit', {
                requirements: app.requirements,
            });
        }
        const flow = asFlow(rec);
        const now = new Date();
        const level = rec.level;
        const checks = [
            'image_quality',
            'document_type',
            'document_validity',
            'name_match',
            'liveness',
            'screening',
        ]
            .filter((c) => level === 'level_2' || (c !== 'liveness' && (level === 'level_3' || c === 'screening')))
            .map((check) => ({ check, ok: true }));
        const submitted = {
            ...flow,
            checks,
            submissions: (flow.submissions ?? 0) + 1,
            documents: flow.documents.map((d) => d.status === 'accepted' ? { ...d, status: 'in_review' } : d),
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
                        details: submitted,
                    },
                });
                await tx.userProfile.update({ where: { userId }, data: { kycLevel: 'level_1' } });
                await this.notifications.notify(tx, {
                    userId,
                    type: 'kyc.approved',
                    title: 'Identity verified — Level 1',
                    body: `Withdrawals up to ${limits_1.DAILY_WITHDRAWAL_LIMIT.level_1} USDT a day are now available.`,
                });
            });
        }
        else {
            await this.prisma.tx(async (tx) => {
                await tx.kycRecord.update({
                    where: { id: rec.id },
                    data: {
                        status: 'in_review',
                        submittedAt: now,
                        reviewedAt: null,
                        rejectionReason: null,
                        details: submitted,
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
    async devReject(userId, level, reasons) {
        const rec = await this.prisma.kycRecord.findFirst({
            where: { userId, level, status: { in: ['pending', 'in_review'] } },
            orderBy: { createdAt: 'desc' },
        });
        if (!rec)
            throw (0, errors_1.notFound)('Submitted verification');
        const flow = asFlow(rec);
        const now = new Date();
        const failing = new Set(reasons);
        const docIssues = reasons.filter((r) => r !== 'liveness' && r !== 'screening');
        const next = {
            ...flow,
            checks: (flow.checks ?? []).map((c) => ({ ...c, ok: !failing.has(c.check) })),
            documents: flow.documents.map((d) => {
                if (d.status !== 'in_review')
                    return d;
                // image quality → only the back / single page needs a retake; other document issues reject every side
                const hit = docIssues.some((r) => r === 'image_quality'
                    ? d.side === 'back' || d.side === 'photo_page' || d.side === 'single'
                    : true);
                return hit
                    ? { ...d, status: 'rejected', issues: docIssues, reviewedAt: now.toISOString() }
                    : { ...d, status: 'accepted', reviewedAt: now.toISOString() };
            }),
            ...(failing.has('liveness') && flow.liveness
                ? {
                    liveness: {
                        ...flow.liveness,
                        status: 'failed',
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
                    details: next,
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
    async documents(userId) {
        const records = await this.prisma.kycRecord.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });
        const items = records.flatMap((r) => asFlow(r).documents.map((d) => ({
            ...d,
            level: r.level,
            recordId: r.id,
            recordStatus: r.status,
            isDemo: r.isDemo || r.provider === 'mock',
        })));
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
};
exports.KycFlowService = KycFlowService;
exports.KycFlowService = KycFlowService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        geo_service_1.GeoService,
        audit_service_1.AuditService,
        notifications_service_1.NotificationsService])
], KycFlowService);
//# sourceMappingURL=kyc-flow.service.js.map