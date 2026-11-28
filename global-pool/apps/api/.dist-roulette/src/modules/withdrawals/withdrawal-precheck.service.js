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
exports.WithdrawalPrecheckService = void 0;
const common_1 = require("@nestjs/common");
const chains_1 = require("@gp/shared/chains");
const fees_1 = require("@gp/shared/fees");
const limits_1 = require("@gp/shared/limits");
const money_1 = require("@gp/shared/money");
const schemas_1 = require("@gp/shared/schemas");
const errors_1 = require("../../common/errors");
const time_1 = require("../../common/time");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
const aml_service_1 = require("../aml/aml.service");
const ledger_service_1 = require("../ledger/ledger.service");
const withdrawals_service_1 = require("./withdrawals.service");
const VALID_FOR_MS = 15 * 60_000;
const COUNTS_TOWARDS_LIMIT = [
    'requested',
    'risk_check',
    'under_review',
    'queued',
    'broadcast',
    'confirmed',
];
const KYC_LABEL = {
    none: 'Not verified',
    level_1: 'Level 1',
    level_2: 'Level 2',
    level_3: 'Level 3',
};
const fmt = (v) => (0, money_1.formatUSDT)(v);
/**
 * Read-only withdrawal pre-check (WAL-15 "Risk validation", shown before step-up 2FA). It runs the same policy checks
 * as POST /withdrawals (KYC, limits, balance, cool-down) plus a side-effect-free AML preview, so the player sees the
 * outcome before a 2FA code is spent. POST /withdrawals re-runs every check authoritatively.
 */
let WithdrawalPrecheckService = class WithdrawalPrecheckService {
    prisma;
    ledger;
    aml;
    withdrawals;
    constructor(prisma, ledger, aml, withdrawals) {
        this.prisma = prisma;
        this.ledger = ledger;
        this.aml = aml;
        this.withdrawals = withdrawals;
    }
    async precheck(user, q) {
        const now = new Date();
        const chain = chains_1.CHAINS[q.network];
        const quote = (0, fees_1.withdrawalQuote)(q.amount, q.network);
        const validAddress = (0, schemas_1.isValidAddressForChain)(q.network, q.address);
        const addressKey = validAddress
            ? chain.family === 'evm'
                ? (0, schemas_1.normalizeAddress)(q.network, q.address).toLowerCase()
                : q.address.trim()
            : null;
        const [profile, account, today, balances, wallet, totp, priorConfirmed, last24h] = await Promise.all([
            this.prisma.userProfile.findUnique({
                where: { userId: user.id },
                select: { kycLevel: true },
            }),
            this.prisma.user.findUniqueOrThrow({
                where: { id: user.id },
                select: { createdAt: true },
            }),
            this.prisma.withdrawal.aggregate({
                where: {
                    userId: user.id,
                    createdAt: { gte: (0, time_1.periodStart)('day', now) },
                    status: { in: [...COUNTS_TOWARDS_LIMIT] },
                },
                _sum: { amount: true },
            }),
            this.ledger.userBalances(user.id),
            addressKey
                ? this.prisma.userWallet.findUnique({
                    where: {
                        userId_network_address: {
                            userId: user.id,
                            network: q.network,
                            address: addressKey,
                        },
                    },
                })
                : Promise.resolve(null),
            this.prisma.totpSecret.findUnique({
                where: { userId: user.id },
                select: { status: true },
            }),
            addressKey
                ? this.prisma.withdrawal.count({
                    where: { userId: user.id, toAddress: addressKey, status: 'confirmed' },
                })
                : Promise.resolve(0),
            this.prisma.withdrawal.count({
                where: { userId: user.id, createdAt: { gte: new Date(now.getTime() - 86_400_000) } },
            }),
        ]);
        const kycLevel = profile?.kycLevel ?? 'none';
        const limit = limits_1.DAILY_WITHDRAWAL_LIMIT[kycLevel];
        const usedToday = (0, money_1.money)(today._sum.amount?.toFixed() ?? '0');
        const twoFactorEnabled = totp?.status === 'active';
        const whitelisted = Boolean(wallet?.whitelistedAt && !wallet.removedAt);
        const usableFrom = whitelisted ? (wallet?.whitelistAvailableAt ?? null) : null;
        const inCooldown = Boolean(usableFrom && usableFrom > now);
        const checks = [];
        let blockedCode = null;
        let blockedReason = null;
        const block = (code, reason) => {
            if (!blockedCode) {
                blockedCode = code;
                blockedReason = reason;
            }
        };
        // 1 · KYC
        const kycOk = (0, money_1.money)(limit).gt(0);
        checks.push({
            key: 'kyc',
            label: 'Identity verification (KYC)',
            status: kycOk ? 'pass' : 'fail',
            detail: kycOk
                ? `${KYC_LABEL[kycLevel]} — verified · daily withdrawal limit ${fmt(limit)}`
                : `${KYC_LABEL[kycLevel]} — verify your identity (KYC Level 1) to withdraw`,
        });
        if (!kycOk) {
            const skipped = (key, label) => ({
                key,
                label,
                status: 'skipped',
                detail: 'Not run yet — runs after identity verification',
            });
            checks.push(skipped('limits', 'Withdrawal limits'), skipped('account_security', 'Account security'), skipped('aml', 'AML transaction screening'), skipped('address_risk', 'Destination address risk'), skipped('network', 'Network status'));
            return this.result('kyc_required', null, 'KYC_REQUIRED', checks, now, quote, {
                valid: validAddress,
                whitelisted,
                inCooldown,
                usableFrom,
                label: wallet?.label ?? null,
                twoFactorEnabled,
            });
        }
        // 2 · limits + balance
        const afterToday = usedToday.plus((0, money_1.money)(quote.amount));
        const overLimit = afterToday.gt((0, money_1.money)(limit));
        const overBalance = (0, money_1.gt)(quote.amount, balances.available);
        const belowMin = !quote.meetsMinimum;
        const limitsDetail = `${fmt((0, money_1.toUSDTString)(afterToday))} of ${fmt(limit)} daily limit · minimum ${fmt(quote.minWithdrawal)}`;
        checks.push({
            key: 'limits',
            label: 'Withdrawal limits',
            status: overLimit || overBalance || belowMin ? 'fail' : 'pass',
            detail: belowMin
                ? `Below the ${fmt(quote.minWithdrawal)} minimum (after the network fee)`
                : overBalance
                    ? `More than your Available balance (${fmt(balances.available)})`
                    : overLimit
                        ? `Exceeds today's limit — ${fmt((0, money_1.toUSDTString)((0, money_1.max)((0, money_1.money)(limit).minus(usedToday), 0)))} left today`
                        : limitsDetail,
        });
        if (belowMin)
            block('BELOW_MINIMUM', `Minimum withdrawal is ${fmt(quote.minWithdrawal)}`);
        if (overBalance)
            block('INSUFFICIENT_FUNDS', `Only your Available balance (${fmt(balances.available)}) can be withdrawn`);
        if (overLimit)
            block('LIMIT_EXCEEDED', `This exceeds your daily withdrawal limit of ${fmt(limit)}`);
        // 3 · account security
        checks.push({
            key: 'account_security',
            label: 'Account security',
            status: twoFactorEnabled ? 'pass' : 'fail',
            detail: twoFactorEnabled
                ? '2FA on — your authenticator code confirms this withdrawal'
                : 'Turn on two-factor authentication to withdraw',
        });
        if (!twoFactorEnabled)
            block('TWO_FACTOR_REQUIRED', 'Set up two-factor authentication before withdrawing');
        // 4 + 5 · AML preview + destination risk (same deterministic screening POST /withdrawals runs)
        let amlDecision = 'approve';
        let amlReason = null;
        if (addressKey) {
            const screening = await this.aml.previewWithdrawal({
                userId: user.id,
                network: q.network,
                address: addressKey,
                amount: quote.amount,
                newDestination: !whitelisted || priorConfirmed === 0,
                whitelisted,
                withdrawalsLast24h: last24h,
                accountAgeDays: (now.getTime() - account.createdAt.getTime()) / 86_400_000,
            });
            amlDecision = screening.decision;
            amlReason = screening.reason;
            const sanctioned = screening.flags.includes('sanctions_screening');
            const patternFlags = screening.flags.filter((f) => f === 'velocity' || f === 'amount_threshold');
            checks.push({
                key: 'aml',
                label: 'AML transaction screening',
                status: sanctioned ? 'fail' : amlDecision === 'review' ? 'review' : 'pass',
                detail: sanctioned
                    ? 'Destination flagged by sanctions screening'
                    : amlDecision === 'review'
                        ? patternFlags.length > 0
                            ? 'Large amount or unusual frequency — routed to a compliance analyst'
                            : 'First withdrawal to this destination — routed to a compliance analyst'
                        : 'Amount and pattern match your usual activity',
            });
            checks.push({
                key: 'address_risk',
                label: 'Destination address risk',
                status: sanctioned
                    ? 'fail'
                    : inCooldown
                        ? 'fail'
                        : !whitelisted || priorConfirmed === 0
                            ? 'review'
                            : 'pass',
                detail: inCooldown
                    ? `New address — usable from ${usableFrom.toISOString().slice(0, 16).replace('T', ' ')} UTC (24 h cool-down)`
                    : whitelisted
                        ? `Whitelisted${wallet?.label ? ` (${wallet.label})` : ''} · ${priorConfirmed > 0 ? 'used before' : 'first withdrawal to this address'}`
                        : 'Not on your whitelist — first withdrawal to this address',
            });
            if (sanctioned)
                block('SANCTIONED_DESTINATION', screening.reason ?? 'Destination flagged by sanctions screening');
            if (inCooldown)
                block('ADDRESS_COOLDOWN', 'This address is in its 24 h new-address cool-down');
        }
        else {
            checks.push({
                key: 'aml',
                label: 'AML transaction screening',
                status: 'skipped',
                detail: 'Not run — the address is not valid for this network',
            }, {
                key: 'address_risk',
                label: 'Destination address risk',
                status: 'fail',
                detail: `Not a valid ${chain.name} address`,
            });
            block('INVALID_ADDRESS', `This address is not valid for ${chain.name}`);
        }
        // 6 · network
        checks.push({
            key: 'network',
            label: 'Network status',
            status: chain.enabled ? 'pass' : 'fail',
            detail: chain.enabled
                ? `${chain.testnet.name} is ${chain.healthLabel.toLowerCase()} · network fee ${fmt(quote.networkFee)}`
                : `${chain.name} withdrawals are coming soon`,
        });
        const outcome = blockedCode
            ? 'blocked'
            : checks.some((c) => c.status === 'review')
                ? 'review'
                : 'pass';
        const reason = outcome === 'blocked'
            ? blockedReason
            : outcome === 'review'
                ? (amlReason ?? 'Manual review required')
                : null;
        return this.result(outcome, reason, blockedCode, checks, now, quote, {
            valid: validAddress,
            whitelisted,
            inCooldown,
            usableFrom,
            label: wallet?.label ?? null,
            twoFactorEnabled,
        });
    }
    /** Withdrawal by its public reference (WD-20931) + the stored screening checks, for the status tracker. */
    async byReference(userId, reference) {
        const match = /^WD-(\d{1,12})$/i.exec(reference.trim());
        if (!match)
            throw (0, errors_1.notFound)('Withdrawal');
        const row = await this.prisma.withdrawal.findFirst({
            where: { userId, number: Number(match[1]) },
            select: { id: true },
        });
        if (!row)
            throw (0, errors_1.notFound)('Withdrawal');
        const [view, alert] = await Promise.all([
            this.withdrawals.get(userId, row.id),
            this.prisma.amlAlert.findFirst({
                where: { withdrawalId: row.id },
                orderBy: { createdAt: 'desc' },
                select: { details: true, riskLevel: true, status: true },
            }),
        ]);
        const details = (alert?.details ?? null);
        return {
            ...view,
            screening: alert
                ? {
                    riskLevel: alert.riskLevel,
                    decision: details?.decision ?? null,
                    reason: details?.reason ?? null,
                    alertStatus: alert.status,
                    // DEMO seed rows store only a count; real screenings store the check list.
                    checks: Array.isArray(details?.checks) ? details.checks : [],
                }
                : null,
        };
    }
    result(outcome, reason, code, checks, now, quote, address) {
        const { twoFactorEnabled, ...addr } = address;
        return {
            outcome,
            reason,
            code,
            checks,
            checkedAt: now.toISOString(),
            validUntil: new Date(now.getTime() + VALID_FOR_MS).toISOString(),
            quote: {
                amount: quote.amount,
                networkFee: quote.networkFee,
                platformFee: quote.platformFee,
                youReceive: quote.youReceive,
            },
            address: {
                ...addr,
                usableFrom: addr.usableFrom ? addr.usableFrom.toISOString() : null,
            },
            twoFactorEnabled,
        };
    }
};
exports.WithdrawalPrecheckService = WithdrawalPrecheckService;
exports.WithdrawalPrecheckService = WithdrawalPrecheckService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ledger_service_1.LedgerService,
        aml_service_1.AmlService,
        withdrawals_service_1.WithdrawalsService])
], WithdrawalPrecheckService);
//# sourceMappingURL=withdrawal-precheck.service.js.map