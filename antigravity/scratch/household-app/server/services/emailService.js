const nodemailer = require('nodemailer');

// Transporter Factory
// Supported modes (set SMTP_HOST or MAIL_PROVIDER env var):
//   1. Generic SMTP  – SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE
//   2. Gmail         – MAIL_PROVIDER=gmail, GMAIL_USER, GMAIL_APP_PASSWORD
//   3. Resend        – MAIL_PROVIDER=resend, RESEND_API_KEY
//   4. Auto test     – no credentials → Ethereal test account (preview URL logged)

async function createTransporter() {
  const provider = (process.env.MAIL_PROVIDER || '').toLowerCase();

  if (provider === 'gmail') {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      throw new Error('Gmail requires GMAIL_USER and GMAIL_APP_PASSWORD env vars.');
    }
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });
  }

  if (provider === 'resend') {
    if (!process.env.RESEND_API_KEY) throw new Error('Resend requires RESEND_API_KEY env var.');
    return nodemailer.createTransport({
      host: 'smtp.resend.com', port: 465, secure: true,
      auth: { user: 'resend', pass: process.env.RESEND_API_KEY },
    });
  }

  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }

  // Fallback: Ethereal test account
  const testAccount = await nodemailer.createTestAccount();
  console.log('[EmailService] No SMTP credentials - using Ethereal test account.');
  console.log(`[EmailService] Ethereal user: ${testAccount.user}`);
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email', port: 587, secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
}

const FROM_ADDRESS = process.env.SMTP_FROM || process.env.GMAIL_USER || '"HomeSphere" <notifications@homesphere.app>';

function buildEmailHtml({ userName, title, bodyHtml, ctaText = null, urgencyColor = '#0ea5e9' }) {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">
        <tr>
          <td style="background:linear-gradient(135deg,${urgencyColor} 0%,#6366f1 100%);padding:28px 36px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td><span style="display:inline-block;background:rgba(255,255,255,0.2);border-radius:10px;padding:8px 14px;font-size:20px;font-weight:900;color:#ffffff;">HS</span></td>
                <td align="right"><span style="color:rgba(255,255,255,0.85);font-size:12px;font-weight:600;">HomeSphere Household Manager</span></td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 36px 28px;">
            <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;">Hello, ${userName}</p>
            <h1 style="margin:0 0 20px;font-size:22px;font-weight:800;color:#0f172a;line-height:1.3;">${title}</h1>
            ${bodyHtml}
            ${ctaText ? `<div style="margin-top:28px;"><a href="#" style="display:inline-block;padding:12px 24px;background:${urgencyColor};color:#ffffff;font-weight:700;font-size:14px;border-radius:10px;text-decoration:none;">${ctaText}</a></div>` : ''}
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:20px 36px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
              This notification was sent by <strong>HomeSphere</strong> based on your household ledger data.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function composeBillReminderEmail({ userName, bill, daysLeft, hoursLeft, isOverdue, currency }) {
  let urgencyColor = '#0ea5e9';
  let badge = '';
  let headline = '';
  let detailLine = '';

  if (isOverdue) {
    urgencyColor = '#ef4444';
    const daysOverdue = Math.abs(daysLeft);
    badge = `<span style="display:inline-block;padding:4px 12px;background:#fef2f2;color:#ef4444;font-size:11px;font-weight:700;border-radius:99px;margin-bottom:16px;border:1px solid #fecaca;">OVERDUE</span>`;
    headline = `${bill.name} is overdue!`;
    detailLine = `This bill was due on <strong>${bill.due_date}</strong> — ${daysOverdue} day(s) ago.`;
  } else if (hoursLeft !== null && hoursLeft <= 24) {
    urgencyColor = '#ef4444';
    badge = `<span style="display:inline-block;padding:4px 12px;background:#fef2f2;color:#ef4444;font-size:11px;font-weight:700;border-radius:99px;margin-bottom:16px;border:1px solid #fecaca;">DUE TODAY - ${Math.round(hoursLeft)} hours left</span>`;
    headline = `Bill due today — act now!`;
    detailLine = `<strong>${bill.name}</strong> is due today (${bill.due_date}). ${Math.round(hoursLeft)} hours remaining.`;
  } else if (daysLeft <= 3) {
    urgencyColor = '#f97316';
    badge = `<span style="display:inline-block;padding:4px 12px;background:#fff7ed;color:#ea580c;font-size:11px;font-weight:700;border-radius:99px;margin-bottom:16px;border:1px solid #fed7aa;">${daysLeft} DAY(S) LEFT</span>`;
    headline = `${bill.name} is due in ${daysLeft} day(s)`;
    detailLine = `Payment deadline is <strong>${bill.due_date}</strong>.`;
  } else {
    urgencyColor = '#0ea5e9';
    badge = `<span style="display:inline-block;padding:4px 12px;background:#eff6ff;color:#2563eb;font-size:11px;font-weight:700;border-radius:99px;margin-bottom:16px;border:1px solid #bfdbfe;">${daysLeft} DAYS LEFT</span>`;
    headline = `Upcoming: ${bill.name}`;
    detailLine = `Schedule your payment before <strong>${bill.due_date}</strong>.`;
  }

  const bodyHtml = `
    ${badge}
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:16px;">
      <tr><td style="font-size:28px;font-weight:900;color:#0f172a;">${currency}${bill.amount.toFixed(2)}</td></tr>
      <tr><td style="font-size:14px;font-weight:700;color:#1e293b;padding-top:6px;">${bill.name}</td></tr>
      <tr><td style="font-size:12px;color:#64748b;padding-top:4px;">Category: ${bill.category}</td></tr>
    </table>
    <p style="margin:0;font-size:14px;color:#334155;line-height:1.7;">${detailLine}</p>
    ${bill.notes ? `<p style="margin:12px 0 0;font-size:13px;color:#94a3b8;font-style:italic;">Note: ${bill.notes}</p>` : ''}
  `;

  const subject = isOverdue
    ? `Overdue: ${bill.name} — ${currency}${bill.amount.toFixed(2)}`
    : hoursLeft !== null && hoursLeft <= 24
    ? `Due Today: ${bill.name} — ${currency}${bill.amount.toFixed(2)}`
    : `${daysLeft}d Left: ${bill.name} — ${currency}${bill.amount.toFixed(2)}`;

  return { subject, html: buildEmailHtml({ userName, title: headline, bodyHtml, ctaText: 'Open HomeSphere Dashboard', urgencyColor }) };
}

function composePantryAlertEmail({ userName, items, currency }) {
  const itemRows = items.map(item =>
    `<tr style="border-bottom:1px solid #e2e8f0;">
      <td style="padding:10px 0;font-size:13px;font-weight:700;color:#1e293b;">${item.name}</td>
      <td style="padding:10px 0;font-size:13px;color:${item.quantity === 0 ? '#ef4444' : '#f97316'};font-weight:600;text-align:right;">${item.quantity === 0 ? 'Out of Stock' : `${item.quantity} ${item.unit} left`}</td>
    </tr>`
  ).join('');

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:14px;color:#334155;line-height:1.7;">Your pantry inventory needs attention. ${items.length} item(s) are low or out of stock.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;padding:16px 20px;">
      <thead><tr>
        <th style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;text-align:left;padding-bottom:8px;">Item</th>
        <th style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;text-align:right;padding-bottom:8px;">Status</th>
      </tr></thead>
      <tbody>${itemRows}</tbody>
    </table>
  `;

  return {
    subject: `Pantry Alert: ${items.length} item(s) need restocking`,
    html: buildEmailHtml({ userName, title: `${items.length} Pantry Item(s) Need Restocking`, bodyHtml, ctaText: 'View Pantry & Shopping List', urgencyColor: '#f97316' }),
  };
}

function composeBudgetAlertEmail({ userName, totalSpent, monthlyLimit, spentPct, currency, month }) {
  const isExceeded = totalSpent >= monthlyLimit;
  const remaining = monthlyLimit - totalSpent;
  const urgencyColor = isExceeded ? '#ef4444' : '#f97316';

  const bodyHtml = `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:20px;">
      <tr><td style="font-size:13px;color:#64748b;font-weight:600;">Budget for ${month}</td></tr>
      <tr><td>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
          <tr>
            <td style="font-size:12px;color:#64748b;">Monthly Target</td>
            <td style="font-size:14px;font-weight:800;color:#0f172a;text-align:right;">${currency}${monthlyLimit.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="font-size:12px;color:#64748b;padding-top:6px;">Total Spent</td>
            <td style="font-size:14px;font-weight:800;color:${urgencyColor};text-align:right;padding-top:6px;">${currency}${totalSpent.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="font-size:12px;color:#64748b;padding-top:6px;">${isExceeded ? 'Overspend' : 'Remaining'}</td>
            <td style="font-size:14px;font-weight:800;color:${isExceeded ? '#ef4444' : '#16a34a'};text-align:right;padding-top:6px;">${currency}${Math.abs(remaining).toFixed(2)}</td>
          </tr>
        </table>
      </td></tr>
      <tr><td style="padding-top:16px;">
        <div style="background:#e2e8f0;border-radius:99px;height:8px;overflow:hidden;">
          <div style="background:${urgencyColor};width:${Math.min(100, spentPct).toFixed(0)}%;height:8px;border-radius:99px;"></div>
        </div>
        <p style="margin:6px 0 0;font-size:12px;color:${urgencyColor};font-weight:700;">${spentPct.toFixed(0)}% of budget used</p>
      </td></tr>
    </table>
    <p style="margin:0;font-size:14px;color:#334155;line-height:1.7;">
      ${isExceeded
        ? `You have exceeded your monthly budget by <strong>${currency}${Math.abs(remaining).toFixed(2)}</strong>. Review discretionary expenses to get back on track.`
        : `You have used ${spentPct.toFixed(0)}% of your budget. Only <strong>${currency}${remaining.toFixed(2)}</strong> remains for ${month}.`
      }
    </p>
  `;

  return {
    subject: isExceeded
      ? `Budget Exceeded: ${currency}${totalSpent.toFixed(2)} of ${currency}${monthlyLimit.toFixed(2)} spent`
      : `Budget Alert: ${spentPct.toFixed(0)}% of your ${month} budget used`,
    html: buildEmailHtml({ userName, title: isExceeded ? 'Monthly Budget Exceeded' : `Budget Running Low (${spentPct.toFixed(0)}%)`, bodyHtml, ctaText: 'View Budget Dashboard', urgencyColor }),
  };
}

let _transporter = null;
async function getTransporter() {
  if (!_transporter) _transporter = await createTransporter();
  return _transporter;
}

async function sendEmail({ to, subject, html }) {
  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({ from: FROM_ADDRESS, to, subject, html });
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[EmailService] Email preview (Ethereal): ${previewUrl}`);
    } else {
      console.log(`[EmailService] Email sent to ${to}: ${info.messageId}`);
    }
    return { success: true, messageId: info.messageId, previewUrl };
  } catch (err) {
    console.error(`[EmailService] Failed to send to ${to}:`, err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { sendEmail, composeBillReminderEmail, composePantryAlertEmail, composeBudgetAlertEmail };
