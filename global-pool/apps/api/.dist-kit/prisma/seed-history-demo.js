"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * GLOBAL POOL — DEMO game history for @nova.k (USR-G1 / G6 / G7). Runs only with DEMO_MODE=true.
 *
 *   pnpm --filter @gp/api exec tsx prisma/seed-history-demo.ts
 *
 * Idempotent and additive: inserts SIMULATION game sessions (commit–reveal seeds, verifiable with the Pool Dice
 * algorithm used by the web verifier) and a few favourites. It never touches the ledger, balances or rounds —
 * games are non-monetary simulations until real-money play is separately approved; stakes/payouts here are
 * simulation units, shown as DEMO.
 */
const client_1 = require("@prisma/client");
const node_crypto_1 = require("node:crypto");
const load_env_1 = require("../src/config/load-env");
(0, load_env_1.loadEnvFiles)();
const prisma = new client_1.PrismaClient();
const MARKER = 'demo-history-v1';
const DID = 'did:privy:demo-nova-k';
const sha256 = (s) => (0, node_crypto_1.createHash)('sha256').update(s).digest('hex');
/** Same scheme as apps/web/src/lib/fairness/dice.ts (roll 0.00–99.99, integer math). */
function diceRoll(serverSeed, clientSeed, nonce) {
    const d = (0, node_crypto_1.createHmac)('sha256', serverSeed).update(`${clientSeed}:${nonce}`).digest();
    const u32 = d.readUInt32BE(0);
    const hundredths = Math.floor((u32 * 10_000) / 2 ** 32);
    return `${Math.floor(hundredths / 100)}.${String(hundredths % 100).padStart(2, '0')}`;
}
/** Decimal string arithmetic in hundredths (no floats). */
const cents = (v) => {
    const [i, f = ''] = v.split('.');
    return Number(i) * 100 + Number((f + '00').slice(0, 2));
};
const fromCents = (c) => `${Math.floor(c / 100)}.${String(c % 100).padStart(2, '0')}`;
const PLANS = [
    {
        slug: 'pool-dice',
        startedAt: '2026-11-27T15:10:00Z',
        bets: 12,
        stake: '5.00',
        target: '50.50',
        multiplier: '1.98',
        ended: true,
    },
    {
        slug: 'orbit-rush',
        startedAt: '2026-11-26T21:05:00Z',
        bets: 8,
        stake: '10.00',
        target: '50.50',
        multiplier: '1.98',
        ended: true,
    },
    {
        slug: 'double-side',
        startedAt: '2026-11-25T19:40:00Z',
        bets: 6,
        stake: '2.50',
        target: '49.00',
        multiplier: '1.96',
        ended: true,
    },
    {
        slug: 'pool-dice',
        startedAt: '2026-11-28T16:00:00Z',
        bets: 5,
        stake: '5.00',
        target: '50.50',
        multiplier: '1.98',
        ended: false,
    },
];
const FAVOURITES = [
    'global-pool',
    'orbit-rush',
    'pool-dice',
    'double-side',
    'pool-roulette',
    'twenty-one',
];
async function main() {
    if (process.env.DEMO_MODE !== 'true') {
        console.info('DEMO_MODE is not "true" — skipping.');
        return;
    }
    const user = await prisma.user.findUnique({ where: { privyUserId: DID } });
    if (!user)
        throw new Error(`DEMO user ${DID} not found — run the main DEMO seed first`);
    const already = await prisma.gameSession.count({
        where: { userId: user.id, clientSeed: { startsWith: MARKER } },
    });
    if (already === 0) {
        for (const [i, plan] of PLANS.entries()) {
            const game = await prisma.game.findUnique({ where: { slug: plan.slug } });
            if (!game)
                continue;
            const serverSeed = sha256(`${MARKER}:server:${i}`);
            const clientSeed = `${MARKER}-${i}-nova`;
            const start = new Date(plan.startedAt);
            const results = Array.from({ length: plan.bets }, (_, n) => {
                const nonce = n + 1;
                const roll = diceRoll(serverSeed, clientSeed, nonce);
                const won = cents(roll) > cents(plan.target);
                const payout = won
                    ? fromCents(Math.floor((cents(plan.stake) * cents(plan.multiplier)) / 100))
                    : '0.00';
                return {
                    nonce,
                    outcome: {
                        roll,
                        target: plan.target,
                        condition: 'over',
                        won,
                        multiplier: plan.multiplier,
                    },
                    stake: plan.stake,
                    payout,
                    createdAt: new Date(start.getTime() + nonce * 75_000),
                };
            });
            await prisma.gameSession.create({
                data: {
                    userId: user.id,
                    gameId: game.id,
                    status: plan.ended ? 'finished' : 'active',
                    serverSeedHash: sha256(serverSeed),
                    serverSeed,
                    clientSeed,
                    nonce: plan.bets,
                    isSimulation: true,
                    startedAt: start,
                    endedAt: plan.ended ? new Date(start.getTime() + (plan.bets + 1) * 75_000) : null,
                    results: { create: results },
                },
            });
        }
        console.info(`Inserted ${PLANS.length} DEMO simulation sessions for @nova.k`);
    }
    else {
        console.info('DEMO game history already present — nothing to do.');
    }
    for (const slug of FAVOURITES) {
        const game = await prisma.game.findUnique({ where: { slug } });
        if (!game)
            continue;
        await prisma.userFavouriteGame.upsert({
            where: { userId_gameId: { userId: user.id, gameId: game.id } },
            create: { userId: user.id, gameId: game.id },
            update: {},
        });
    }
    console.info(`Favourites ensured: ${FAVOURITES.join(', ')}`);
}
main()
    .catch((err) => {
    console.error(err);
    process.exitCode = 1;
})
    .finally(() => void prisma.$disconnect());
//# sourceMappingURL=seed-history-demo.js.map