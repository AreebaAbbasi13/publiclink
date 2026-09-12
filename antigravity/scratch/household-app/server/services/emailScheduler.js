/**
 * Email Scheduler — background job that evaluates all users and dispatches
 * real emails for bill reminders, pantry low-stock alerts, and budget warnings.
 *
 * Called:
 *  - At server startup
 *  - Every REMINDER_INTERVAL_MINUTES (default 60 minutes)
 *  - On-demand after ledger mutations via triggerUserEmailCheck(userId)
 *
 * Uses email_notifications table with UNIQUE(user_id, reminder_key) to
 * ensure each reminder is sent exactly once per threshold window.
 * Keys reset naturally when:
 *  - Bill reminder keys change per day (bill-{id}-{daysLeft}d-{date})
 *  - Budget keys reset monthly (budget-{userId}-{month}-{type})
 *  - Pantry keys reset when item is restocked (pantry-{id}-low-{date})
 */
const db = require('../db/database');
const { evaluateUserReminders } = require('./reminderEngine');
const {
  sendEmail,
  composeBillReminderEmail,
  composePantryAlertEmail,
  composeBudgetAlertEmail,
} = require('./emailService');

const INTERVAL_MINUTES = parseInt(process.env.REMINDER_INTERVAL_MINUTES || '60', 10);

async function processUserEmails(userId) {
  try {
    const user = db.prepare('SELECT id, name, email, currency FROM users WHERE id = ?').get(userId);
    if (!user || !user.email) return;

    const reminders = evaluateUserReminders(userId);
    const rawCurrency = user.currency || 'PKR';
    const currency = (rawCurrency === 'PKR' || rawCurrency === 'Rs.' || rawCurrency === '₨') ? 'Rs.' : rawCurrency;
    const today = new Date().toISOString().slice(0, 10);
    const month = new Date().toISOString().slice(0, 7);

    // --- 1. Bill Reminders ---
    const billReminders = reminders.filter(r => r.type === 'bill_reminder');
    for (const reminder of billReminders) {
      const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(reminder.billId);
      if (!bill) continue;

      const today2 = new Date();
      const dueDateObj = new Date(bill.due_date + 'T23:59:59');
      const diffMs = dueDateObj.getTime() - today2.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      const diffDays = Math.ceil(diffHours / 24);
      const isOverdue = diffMs < 0;

      // Unique key includes date so reminders fire once per day per threshold
      const reminderKey = `bill-${bill.id}-${reminder.level}-${today}`;

      const alreadySent = db.prepare(
        'SELECT id FROM email_notifications WHERE user_id = ? AND reminder_key = ?'
      ).get(userId, reminderKey);
      if (alreadySent) continue;

      const { subject, html } = composeBillReminderEmail({
        userName: user.name,
        bill,
        daysLeft: diffDays,
        hoursLeft: !isOverdue ? diffHours : null,
        isOverdue,
        currency,
      });

      const result = await sendEmail({ to: user.email, subject, html });
      if (result.success) {
        db.prepare(
          'INSERT OR IGNORE INTO email_notifications (user_id, reminder_key, email_to, subject) VALUES (?, ?, ?, ?)'
        ).run(userId, reminderKey, user.email, subject);
        console.log(`[Scheduler] Bill reminder sent to ${user.email}: ${subject}`);
      }
    }

    // --- 2. Pantry Low-Stock Alerts (grouped into one email per run) ---
    const pantryReminders = reminders.filter(r => r.type === 'pantry_low');
    if (pantryReminders.length > 0) {
      const reminderKey = `pantry-low-batch-${userId}-${today}`;
      const alreadySent = db.prepare(
        'SELECT id FROM email_notifications WHERE user_id = ? AND reminder_key = ?'
      ).get(userId, reminderKey);

      if (!alreadySent) {
        const lowItems = pantryReminders.map(r => {
          const item = db.prepare('SELECT * FROM pantry_items WHERE id = ?').get(r.itemId);
          return item;
        }).filter(Boolean);

        if (lowItems.length > 0) {
          const { subject, html } = composePantryAlertEmail({ userName: user.name, items: lowItems, currency });
          const result = await sendEmail({ to: user.email, subject, html });
          if (result.success) {
            db.prepare(
              'INSERT OR IGNORE INTO email_notifications (user_id, reminder_key, email_to, subject) VALUES (?, ?, ?, ?)'
            ).run(userId, reminderKey, user.email, subject);
            console.log(`[Scheduler] Pantry alert sent to ${user.email}: ${pantryReminders.length} items`);
          }
        }
      }
    }

    // --- 3. Budget Alerts ---
    const budgetReminder = reminders.find(r => r.type === 'saving_alert' || r.type === 'budget_alert');
    if (budgetReminder) {
      const budgetType = budgetReminder.type === 'saving_alert' ? 'exceeded' : 'low';
      const reminderKey = `budget-${userId}-${month}-${budgetType}`;
      const alreadySent = db.prepare(
        'SELECT id FROM email_notifications WHERE user_id = ? AND reminder_key = ?'
      ).get(userId, reminderKey);

      if (!alreadySent) {
        const budgetRecord = db.prepare(
          'SELECT monthly_limit FROM budgets WHERE user_id = ? AND month_year = ?'
        ).get(userId, month);

        if (budgetRecord) {
          // Calculate actuals
          const billsPaid = db.prepare(
            `SELECT COALESCE(SUM(amount), 0) as total FROM bills
             WHERE user_id = ? AND status = 'Paid' AND (due_date LIKE ? OR payment_date LIKE ?)`
          ).get(userId, `${month}%`, `${month}%`).total;

          const expTotal = db.prepare(
            `SELECT COALESCE(SUM(amount), 0) as total FROM expenses
             WHERE user_id = ? AND expense_date LIKE ?`
          ).get(userId, `${month}%`).total;

          const pantryTotal = db.prepare(
            `SELECT COALESCE(SUM(total_cost), 0) as total FROM pantry_purchases
             WHERE user_id = ? AND purchase_date LIKE ?`
          ).get(userId, `${month}%`).total;

          const totalSpent = billsPaid + expTotal + pantryTotal;
          const monthlyLimit = budgetRecord.monthly_limit;
          const spentPct = (totalSpent / monthlyLimit) * 100;

          const { subject, html } = composeBudgetAlertEmail({
            userName: user.name,
            totalSpent,
            monthlyLimit,
            spentPct,
            currency,
            month,
          });

          const result = await sendEmail({ to: user.email, subject, html });
          if (result.success) {
            db.prepare(
              'INSERT OR IGNORE INTO email_notifications (user_id, reminder_key, email_to, subject) VALUES (?, ?, ?, ?)'
            ).run(userId, reminderKey, user.email, subject);
            console.log(`[Scheduler] Budget alert sent to ${user.email}: ${subject}`);
          }
        }
      }
    }
  } catch (err) {
    console.error(`[Scheduler] Error processing emails for user ${userId}:`, err.message);
  }
}

async function runEmailCheckForAllUsers() {
  try {
    const users = db.prepare('SELECT id FROM users').all();
    console.log(`[Scheduler] Running email check for ${users.length} user(s)...`);
    for (const u of users) {
      await processUserEmails(u.id);
    }
  } catch (err) {
    console.error('[Scheduler] Error in email batch run:', err.message);
  }
}

// Trigger email check for a specific user (called after ledger mutations)
async function triggerUserEmailCheck(userId) {
  setImmediate(() => processUserEmails(userId));
}

// Start background scheduler
function startEmailScheduler() {
  console.log(`[Scheduler] Email reminder scheduler started (interval: ${INTERVAL_MINUTES} min)`);
  // Run once at startup after a short delay
  setTimeout(runEmailCheckForAllUsers, 10000);
  // Then repeat on interval
  setInterval(runEmailCheckForAllUsers, INTERVAL_MINUTES * 60 * 1000);
}

module.exports = { startEmailScheduler, triggerUserEmailCheck, runEmailCheckForAllUsers };
