"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderNotificationEmail = renderNotificationEmail;
const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function renderNotificationEmail(input) {
    const link = `${input.appUrl.replace(/\/$/, '')}${input.path ?? '/account/notifications'}`;
    const phishing = input.antiPhishingCode
        ? `Your anti-phishing code: ${input.antiPhishingCode}. Genuine GLOBAL POOL emails always show it.`
        : 'Tip: set an anti-phishing code in Account → Security so you can recognise genuine GLOBAL POOL emails.';
    const subject = `[DEMO] ${input.title} — GLOBAL POOL`;
    const text = [
        'GLOBAL POOL — DEMO / TESTNET. No real money is involved.',
        '',
        input.title,
        '',
        input.body,
        '',
        `Open GLOBAL POOL: ${link}`,
        '',
        phishing,
        'We never ask for passwords, 2FA codes, recovery phrases or private keys by email.',
        'Manage email notifications in Account → Notifications. Responsible gaming tools: Account → Responsible gaming.',
    ].join('\n');
    const html = `<!doctype html><html><body style="margin:0;background:#232626;color:#F5F6F6;font-family:Inter,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 16px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#2B2F30;border:1px solid #3A4142;border-radius:12px">
<tr><td style="padding:12px 24px;background:#1E2121;border-radius:12px 12px 0 0;font-size:12px;color:#F4C96C;font-weight:700">DEMO / TESTNET — no real money</td></tr>
<tr><td style="padding:24px"><div style="font-size:20px;font-weight:800;margin-bottom:12px">${escapeHtml(input.title)}</div>
<div style="font-size:15px;line-height:22px;color:#B3BEC1">${escapeHtml(input.body)}</div>
<div style="margin-top:24px"><a href="${escapeHtml(link)}" style="display:inline-block;background:#2CD97D;color:#1E2121;font-weight:700;text-decoration:none;padding:12px 20px;border-radius:8px">Open GLOBAL POOL</a></div></td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid #3A4142;font-size:13px;line-height:20px;color:#98A1A3">${escapeHtml(phishing)}<br>We never ask for passwords, 2FA codes, recovery phrases or private keys by email.<br>Manage email notifications in Account → Notifications.</td></tr>
</table></td></tr></table></body></html>`;
    return { subject, text, html };
}
//# sourceMappingURL=email-templates.js.map