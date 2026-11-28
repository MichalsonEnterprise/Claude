/**
 * Infrastructure adapters end to end:
 *  - email: notification → queued email job → console transport (anti-phishing code, DEMO notice, preferences) and
 *    the SMTP transport against an in-process fake SMTP server;
 *  - socket.io Redis adapter: an event raised on API replica A reaches a client connected to replica B.
 */
import { getQueueToken } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { randomUUID } from 'node:crypto';
import { createServer, type AddressInfo, type Server, type Socket as NetSocket } from 'node:net';
import { io, type Socket } from 'socket.io-client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { QUEUES } from '../src/infra/queues/queues';
import { EmailService } from '../src/modules/email/email.service';
import { renderNotificationEmail } from '../src/modules/email/email-templates';
import { PoolEventsService } from '../src/modules/pool/pool-events.service';
import { createTestApp, demoDeposit, newPlayer, type TestApp } from './helpers';

const savedEnv = { ...process.env };
function withEnv(vars: Record<string, string>) {
  Object.assign(process.env, vars);
}
function restoreEnv() {
  for (const key of Object.keys(process.env)) if (!(key in savedEnv)) delete process.env[key];
  Object.assign(process.env, savedEnv);
}

/** Minimal SMTP server (no TLS, no auth) that records each message it accepts. */
function fakeSmtp(): Promise<{ server: Server; port: number; messages: string[] }> {
  const messages: string[] = [];
  const server = createServer((socket: NetSocket) => {
    let buffer = '';
    let inData = false;
    let data = '';
    socket.write('220 fake-smtp ESMTP\r\n');
    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      let idx: number;
      while ((idx = buffer.indexOf('\r\n')) >= 0) {
        const line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        if (inData) {
          if (line === '.') {
            inData = false;
            messages.push(data);
            data = '';
            socket.write('250 2.0.0 queued as FAKE1\r\n');
          } else {
            data += `${line}\n`;
          }
          continue;
        }
        const cmd = line.slice(0, 4).toUpperCase();
        if (cmd === 'EHLO' || cmd === 'HELO') socket.write('250-fake-smtp\r\n250 8BITMIME\r\n');
        else if (cmd === 'MAIL' || cmd === 'RCPT' || cmd === 'RSET' || cmd === 'NOOP')
          socket.write('250 OK\r\n');
        else if (cmd === 'DATA') {
          inData = true;
          socket.write('354 End data with <CR><LF>.<CR><LF>\r\n');
        } else if (cmd === 'QUIT') {
          socket.end('221 Bye\r\n');
        } else socket.write('502 Not implemented\r\n');
      }
    });
  });
  return new Promise((resolve) =>
    server.listen(0, '127.0.0.1', () =>
      resolve({ server, port: (server.address() as AddressInfo).port, messages }),
    ),
  );
}

describe('email templates', () => {
  it('always show the DEMO notice and the anti-phishing code, escape HTML and carry no secrets', () => {
    const mail = renderNotificationEmail({
      title: 'Withdrawal completed',
      body: '99.92 USDT sent <script>alert(1)</script>',
      antiPhishingCode: 'BLUE-OTTER-42',
      appUrl: 'http://localhost:3000',
    });
    expect(mail.subject).toBe('[DEMO] Withdrawal completed — GLOBAL POOL');
    expect(mail.text).toContain('DEMO / TESTNET');
    expect(mail.text).toContain('Your anti-phishing code: BLUE-OTTER-42');
    expect(mail.html).toContain('BLUE-OTTER-42');
    expect(mail.html).not.toContain('<script>');
    expect(mail.text).toContain('We never ask for passwords, 2FA codes');
    const noCode = renderNotificationEmail({ ...mailInput(), antiPhishingCode: null });
    expect(noCode.text).toContain('set an anti-phishing code');
  });
});

const mailInput = () => ({
  title: 'Deposit credited',
  body: '10.00 USDT is now available.',
  antiPhishingCode: null,
  appUrl: 'http://localhost:3000',
});

describe('email delivery (console transport)', () => {
  let t: TestApp;
  beforeAll(async () => {
    withEnv({ MAIL_TRANSPORT: 'log' });
    t = await createTestApp();
  });
  afterAll(async () => {
    await t?.close();
    restoreEnv();
  });

  it('queues an email for email-worthy notifications and sends it with the anti-phishing code', async () => {
    const p = await newPlayer(t);
    await t.prisma.userProfile.update({
      where: { userId: p.userId },
      data: { antiPhishingCode: 'MINT-COIN-7' },
    });
    await demoDeposit(t, p, '25.00');
    const notes = await t.prisma.notification.findMany({
      where: { userId: p.userId },
      orderBy: { createdAt: 'asc' },
    });
    const credited = notes.find((n) => n.type === 'deposit.credited')!;
    const detected = notes.find((n) => n.type === 'deposit.detected')!;
    const queue = t.app.get<Queue>(getQueueToken(QUEUES.EMAILS));
    expect(await queue.getJob(`email-${credited.id}`)).toBeTruthy();
    expect(await queue.getJob(`email-${detected.id}`)).toBeFalsy(); // in-app only

    const email = t.app.get(EmailService);
    const out = await email.sendNotification(credited.id);
    expect(out.status).toBe('sent');
    const sent = email.consoleOutbox.at(-1)!;
    expect(sent.to).toBe(
      (await t.prisma.user.findUniqueOrThrow({ where: { id: p.userId } })).email,
    );
    expect(sent.subject).toBe('[DEMO] Deposit credited — GLOBAL POOL');
    expect(sent.text).toContain('Your anti-phishing code: MINT-COIN-7');
    expect(await email.sendNotification(detected.id)).toEqual({
      status: 'skipped',
      reason: 'in-app only type',
    });
  });

  it('honours the player’s email preference, but locked security categories always send', async () => {
    const p = await newPlayer(t);
    await t.prisma.userProfile.update({
      where: { userId: p.userId },
      data: {
        preferences: {
          notifications: {
            categories: { wallet_deposits: { email: false }, security_changes: { email: false } },
          },
        },
      },
    });
    const email = t.app.get(EmailService);
    const deposit = await t.prisma.notification.create({
      data: { userId: p.userId, type: 'deposit.credited', title: 'Deposit credited', body: 'x' },
    });
    expect(await email.sendNotification(deposit.id)).toEqual({
      status: 'skipped',
      reason: 'email off for wallet_deposits',
    });
    const security = await t.prisma.notification.create({
      data: { userId: p.userId, type: 'security.2fa', title: '2FA turned on', body: 'y' },
    });
    expect((await email.sendNotification(security.id)).status).toBe('sent');
  });
});

describe('email delivery (SMTP transport)', () => {
  let t: TestApp;
  let smtp: Awaited<ReturnType<typeof fakeSmtp>>;
  beforeAll(async () => {
    smtp = await fakeSmtp();
    withEnv({
      MAIL_TRANSPORT: 'smtp',
      SMTP_HOST: '127.0.0.1',
      SMTP_PORT: String(smtp.port),
      SMTP_SECURE: 'false',
    });
    t = await createTestApp();
  });
  afterAll(async () => {
    await t?.close();
    smtp?.server.close();
    restoreEnv();
  });

  it('delivers the rendered email over SMTP', async () => {
    const p = await newPlayer(t);
    const n = await t.prisma.notification.create({
      data: {
        userId: p.userId,
        type: 'withdrawal.confirmed',
        title: 'Withdrawal completed',
        body: '99.92 USDT sent.',
      },
    });
    const out = await t.app.get(EmailService).sendNotification(n.id);
    expect(out).toMatchObject({ status: 'sent', email: { transport: 'smtp' } });
    expect(smtp.messages).toHaveLength(1);
    expect(smtp.messages[0]).toContain('Withdrawal completed');
    expect(smtp.messages[0]).toMatch(/DEMO/);
  });
});

describe('socket.io Redis adapter (multi-replica)', () => {
  let a: TestApp;
  let b: TestApp;
  beforeAll(async () => {
    withEnv({ SOCKET_IO_REDIS_ADAPTER: 'true' });
    a = await createTestApp();
    b = await createTestApp();
  });
  afterAll(async () => {
    await a?.close();
    await b?.close();
    restoreEnv();
  });

  it('broadcasts an event raised on replica A to a client connected to replica B', async () => {
    await a.app.listen(0, '127.0.0.1');
    const serverB = await b.app.listen(0, '127.0.0.1');
    const { port } = serverB.address() as AddressInfo;
    const socket: Socket = io(`http://127.0.0.1:${port}/pool`, {
      transports: ['websocket'],
      reconnection: false,
    });
    try {
      await new Promise((resolve, reject) => {
        socket.once('pool:snapshot', resolve);
        socket.once('connect_error', reject);
      });
      const roundId = randomUUID();
      const received = new Promise<Record<string, unknown>>((resolve) => {
        socket.on('round:status', (e: Record<string, unknown>) => {
          if (e.roundId === roundId) resolve(e);
        });
      });
      // Give the Redis subscription a moment, then emit on replica A only.
      await new Promise((r) => setTimeout(r, 300));
      a.app.get(PoolEventsService).emit({
        type: 'round.status',
        roundId,
        roundNumber: 4242,
        status: 'drawing',
        at: new Date().toISOString(),
      });
      expect(await received).toMatchObject({ roundNumber: 4242, status: 'drawing' });
    } finally {
      socket.close();
    }
  });
});
