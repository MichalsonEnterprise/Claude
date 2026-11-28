/**
 * DEMO account data for @nova.k (USR-01/02, USR-A4/A5): KYC flow details on the seeded Level 2 record (documents
 * on file, liveness, check results) and the notification-centre examples from the Figma build notes.
 *
 * Idempotent and additive: it only fills empty KYC details and inserts rows with deterministic DEMO ids
 * (`de0000a1-…`), so it can run on every `db:seed` (fresh or existing DEMO database). Never touches the ledger.
 */
import type { PrismaClient } from '@prisma/client';

const NOVA = 'de000001-0000-4000-8000-000000048213';
const DAY = 86_400_000;

/** Deterministic DEMO notification ids (prefix de0000a1 = account DEMO rows). */
const nid = (n: number) => `de0000a1-0000-4000-8000-${String(n).padStart(12, '0')}`;

export async function seedAccountDemo(
  prisma: PrismaClient,
): Promise<{ kyc: boolean; notifications: number }> {
  const nova = await prisma.user.findUnique({ where: { id: NOVA }, select: { id: true } });
  if (!nova) return { kyc: false, notifications: 0 };

  // The seed shifts DEMO dates by whole days; derive the shift from a known seeded notification.
  const anchor = await prisma.notification.findFirst({
    where: { userId: NOVA, type: 'withdrawal.under_review', isDemo: true },
    select: { createdAt: true },
  });
  const shift = anchor
    ? Math.round((anchor.createdAt.getTime() - Date.parse('2026-11-27T18:44:03Z')) / DAY) * DAY
    : 0;
  const T = (iso: string) => new Date(Date.parse(iso) + shift);

  // ── KYC Level 2 record: documents on file (A5) ─────────────────────────────────────────────────
  let kyc = false;
  const record = await prisma.kycRecord.findFirst({
    where: { userId: NOVA, level: 'level_2', status: 'verified' },
    orderBy: { createdAt: 'asc' },
  });
  const empty =
    record &&
    (!record.details ||
      (typeof record.details === 'object' && Object.keys(record.details).length === 0));
  if (record && empty) {
    const submitted = record.submittedAt ?? record.createdAt;
    const reviewed = record.reviewedAt ?? submitted;
    const earlier = new Date(submitted.getTime() - DAY + 3_600_000);
    const details = {
      version: 1,
      level: 'level_2',
      personal: {
        firstNames: 'Nova',
        lastNames: 'Kade',
        dateOfBirth: '1994-03-14',
        nationality: 'PT',
        country: 'PT',
        addressLine: 'Rua das Flores 12, 2.º',
        city: 'Lisboa',
        postalCode: '1200-195',
        occupation: 'Software developer',
        pep: 'not_pep',
        savedAt: submitted.toISOString(),
      },
      documentType: 'passport',
      documents: [
        {
          id: 'de0000a1-0000-4000-8000-000000010001',
          documentType: 'passport',
          side: 'photo_page',
          issuingCountry: 'PT',
          fileName: 'passport_photo_page_2.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 2_516_582,
          sha256: 'de'.repeat(32),
          status: 'approved',
          issues: [],
          uploadedAt: submitted.toISOString(),
          reviewedAt: reviewed.toISOString(),
          extracted: {
            fullName: 'Nova Kade',
            dateOfBirth: '1994-03-14',
            documentNumber: 'DEMO-P4821370',
            expiresOn: '2031-06-18',
          },
        },
        {
          id: 'de0000a1-0000-4000-8000-000000010002',
          documentType: 'passport',
          side: 'photo_page',
          issuingCountry: 'PT',
          fileName: 'passport_photo_page_1.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 1_992_294,
          sha256: 'ad'.repeat(32),
          status: 'replaced',
          issues: ['image_quality'],
          uploadedAt: earlier.toISOString(),
          reviewedAt: earlier.toISOString(),
          extracted: null,
        },
      ],
      liveness: {
        status: 'passed',
        attempts: 1,
        lastAttemptAt: new Date(submitted.getTime() + 120_000).toISOString(),
        issue: null,
      },
      checks: [
        'image_quality',
        'document_type',
        'document_validity',
        'name_match',
        'liveness',
        'screening',
      ].map((check) => ({ check, ok: true })),
      submissions: 1,
    };
    await prisma.kycRecord.update({
      where: { id: record.id },
      data: { details: details },
    });
    kyc = true;
  }

  // ── Notification centre (USR-02): Security 2 · Transactions 4 · Rounds 4 · Promotions 2 ────────
  const rows: {
    n: number;
    type: string;
    title: string;
    body: string;
    at: string;
    read?: boolean;
  }[] = [
    {
      n: 1,
      type: 'security.new_device',
      title: 'New sign-in — Windows · Edge',
      body: 'Madrid, Spain · first sign-in from this device. Not you? Secure your account from Login history.',
      at: '2026-11-25T22:41:00Z',
      read: true,
    },
    {
      n: 2,
      type: 'security.2fa',
      title: '2FA code used',
      body: 'Your authenticator code confirmed withdrawal WD-20931. Anti-phishing code: AURORA-27.',
      at: '2026-11-27T18:43:00Z',
      read: true,
    },
    {
      n: 3,
      type: 'deposit.credited',
      title: 'Deposit credited',
      body: 'DP-77380: 2,500.00 USDT on BNB Chain is now in Available.',
      at: '2026-11-25T10:05:00Z',
      read: true,
    },
    {
      n: 4,
      type: 'withdrawal.confirmed',
      title: 'Withdrawal completed',
      body: 'WD-20877: 800.00 USDT sent — network fee shown separately in the receipt.',
      at: '2026-11-21T11:20:00Z',
      read: true,
    },
    {
      n: 5,
      type: 'round.cancelled',
      title: 'Round #1,245 cancelled — stake refunded',
      body: 'The round did not reach its thresholds. 300.00 USDT (30 entries) is in Owed; platform fees are not refunded.',
      at: '2026-11-25T20:01:00Z',
      read: true,
    },
    {
      n: 6,
      type: 'round.settled',
      title: 'Round #1,247 drawn',
      body: 'Winners were drawn with Chainlink VRF. None of your entries won this time — verify the draw any time.',
      at: '2026-11-27T20:02:10Z',
      read: true,
    },
    {
      n: 7,
      type: 'round.closing_reminder',
      title: 'Round #1,248 closes at 20:00 UTC',
      body: 'You hold 35 entries. This is the one reminder you asked for — no further nudges.',
      at: '2026-11-27T19:00:00Z',
      read: true,
    },
    {
      n: 8,
      type: 'vip.reward',
      title: 'VIP Gold weekly reward ready',
      body: '115.20 USDT for 16–22 Nov is in Owed. Claim it to Available whenever you like.',
      at: '2026-11-23T09:00:00Z',
      read: true,
    },
    {
      n: 9,
      type: 'promo.tournament',
      title: 'Weekly tournament results',
      body: 'You finished #148. Tournaments are optional and never count towards your limits.',
      at: '2026-11-24T12:00:00Z',
      read: true,
    },
  ];
  const created = await prisma.notification.createMany({
    data: rows.map((r) => ({
      id: nid(r.n),
      userId: NOVA,
      type: r.type,
      title: r.title,
      body: r.body,
      isDemo: true,
      readAt: r.read ? T(r.at) : null,
      createdAt: T(r.at),
    })),
    skipDuplicates: true,
  });
  return { kyc, notifications: created.count };
}
