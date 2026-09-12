const express = require('express');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const { evaluateUserReminders } = require('../services/reminderEngine');
const { triggerUserEmailCheck } = require('../services/emailScheduler');

const router = express.Router();
router.use(authMiddleware);

// GET /api/notifications — real-time in-app reminder evaluation
router.get('/', (req, res) => {
  try {
    const reminders = evaluateUserReminders(req.user.id);
    return res.json({ count: reminders.length, notifications: reminders });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to evaluate notifications.' });
  }
});

// POST /api/notifications/test-email — send a test email to the authenticated user
router.post('/test-email', async (req, res) => {
  try {
    const { sendEmail } = require('../services/emailService');
    const { buildEmailHtml } = require('../services/emailService');
    const user = req.user;
    const currency = user.currency || 'Rs.';

    const result = await sendEmail({
      to: user.email,
      subject: `HomeSphere Test Notification — ${new Date().toLocaleString()}`,
      html: `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:32px;background:#f8fafc;font-family:-apple-system,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;padding:36px;box-shadow:0 4px 24px rgba(0,0,0,0.07);">
    <div style="display:inline-block;background:linear-gradient(135deg,#0ea5e9,#6366f1);border-radius:10px;padding:8px 14px;font-size:20px;font-weight:900;color:#fff;margin-bottom:24px;">HS</div>
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:800;color:#0f172a;">Email Notifications are Working!</h1>
    <p style="font-size:14px;color:#334155;line-height:1.7;margin:0 0 16px;">
      Hello <strong>${user.name}</strong>, this is a test notification from <strong>HomeSphere</strong>.
      Your email notification system is configured and delivering real emails to <strong>${user.email}</strong>.
    </p>
    <p style="font-size:13px;color:#64748b;line-height:1.6;margin:0;">
      Bill reminders, pantry alerts, and budget warnings will be sent to this address automatically.
    </p>
  </div>
</body></html>`
    });

    if (!result.success) {
      return res.status(500).json({ error: `Email delivery failed: ${result.error}` });
    }

    return res.json({
      message: `Test email sent successfully to ${user.email}.`,
      messageId: result.messageId,
      previewUrl: result.previewUrl || null,
    });
  } catch (err) {
    return res.status(500).json({ error: `Failed to send test email: ${err.message}` });
  }
});

// GET /api/notifications/email-logs — view sent email history for this user
router.get('/email-logs', (req, res) => {
  try {
    const logs = db.prepare(
      'SELECT id, reminder_key, email_to, subject, sent_at FROM email_notifications WHERE user_id = ? ORDER BY sent_at DESC LIMIT 100'
    ).all(req.user.id);
    return res.json({ count: logs.length, logs });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve email logs.' });
  }
});

// POST /api/notifications/trigger-email-check — manually trigger email evaluation
router.post('/trigger-email-check', (req, res) => {
  try {
    triggerUserEmailCheck(req.user.id);
    return res.json({ message: 'Email check triggered. Reminders will be evaluated and sent shortly.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to trigger email check.' });
  }
});

module.exports = router;
