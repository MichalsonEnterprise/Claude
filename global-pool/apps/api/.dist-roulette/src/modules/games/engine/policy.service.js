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
exports.GamesPolicyService = void 0;
const common_1 = require("@nestjs/common");
const money_1 = require("@gp/shared/money");
const errors_1 = require("../../../common/errors");
const time_1 = require("../../../common/time");
const responsible_gaming_service_1 = require("../../compliance/responsible-gaming.service");
const rg_session_1 = require("../../compliance/rg-session");
const games_common_1 = require("./games-common");
/**
 * Server-side play policy for NEW bets (on top of the route guard GAMING_POLICY: onboarding, permitted region,
 * not self-excluded, no `gaming_blocked` / `account_suspended` restriction):
 * - self-exclusion / cooling-off (403 SELF_EXCLUDED) — re-checked inside the bet transaction;
 * - time rules: daily play time, session length, quiet hours (422 RG_LIMIT_EXCEEDED);
 * - a reality check that is due with "pause game" on blocks the next bet until it is answered (409) — reminders
 *   therefore only ever appear BETWEEN bets;
 * - the player's loss limit also applies to DEMO play, counted separately in DEMO credits (never mixed with USDT).
 */
let GamesPolicyService = class GamesPolicyService {
    rg;
    constructor(rg) {
        this.rg = rg;
    }
    async assertCanPlay(tx, userId, stake, now) {
        await this.rg.assertNotSelfExcluded(userId, tx);
        const limits = await tx.rgLimit.findMany({ where: { userId } });
        await this.rg.assertTimeRules(userId, limits, tx, now);
        await this.assertRealityCheckAnswered(tx, userId, now);
        for (const l of limits) {
            if (l.type !== 'loss' || l.amount === null)
                continue;
            const since = (0, time_1.periodStart)(l.period, now);
            const used = await this.demoLossSince(tx, userId, since);
            if ((0, money_1.money)(used).plus((0, money_1.money)(stake)).gt((0, money_1.money)(l.amount.toFixed()))) {
                throw new errors_1.AppError('RG_LIMIT_EXCEEDED', `This bet could take you past your ${l.period === 'day' ? 'daily' : `${l.period}ly`} loss limit`, {
                    type: 'loss',
                    period: l.period,
                    limit: (0, money_1.toUSDTString)(l.amount.toFixed()),
                    used,
                    currency: games_common_1.DEMO.currency,
                    resetsAt: (0, rg_session_1.nextPeriodStart)(l.period, now).toISOString(),
                });
            }
        }
    }
    async assertRealityCheckAnswered(tx, userId, now) {
        const s = await tx.rgSettings.findUnique({ where: { userId } });
        if (!s || !s.realityCheckPause)
            return;
        const counters = {
            sessionStartedAt: s.sessionStartedAt,
            lastActivityAt: s.lastActivityAt,
            lastRealityCheckAt: s.lastRealityCheckAt,
            playedDay: s.playedDay,
            playedTodaySeconds: s.playedTodaySeconds,
            sessionsToday: s.sessionsToday,
        };
        if (!(0, rg_session_1.isSessionLive)(counters, now))
            return;
        const due = (0, rg_session_1.nextRealityCheckAt)(counters, s.realityCheckMinutes, now);
        if (due && now >= due) {
            throw new errors_1.AppError('CONFLICT', 'Reality check — answer the reminder to keep playing', {
                reason: 'REALITY_CHECK_DUE',
                dueAt: due.toISOString(),
            });
        }
    }
    /** DEMO credits lost since `since` (stakes − returns, never below 0). */
    async demoLossSince(tx, userId, since) {
        const [st, po] = await Promise.all([
            tx.demoCreditEntry.aggregate({
                where: { userId, kind: 'stake', createdAt: { gte: since } },
                _sum: { amount: true },
            }),
            tx.demoCreditEntry.aggregate({
                where: { userId, kind: 'payout', createdAt: { gte: since } },
                _sum: { amount: true },
            }),
        ]);
        const lost = (0, money_1.money)(st._sum.amount?.toFixed() ?? '0')
            .negated()
            .minus((0, money_1.money)(po._sum.amount?.toFixed() ?? '0'));
        return (0, money_1.toUSDTString)(lost.lt(0) ? '0' : lost.toFixed(6));
    }
};
exports.GamesPolicyService = GamesPolicyService;
exports.GamesPolicyService = GamesPolicyService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [responsible_gaming_service_1.ResponsibleGamingService])
], GamesPolicyService);
//# sourceMappingURL=policy.service.js.map