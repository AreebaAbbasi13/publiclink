const express = require('express');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const { triggerUserEmailCheck } = require('../services/emailScheduler');

const router = express.Router();
router.use(authMiddleware);

// GET /api/budget
router.get('/', (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);

  try {
    const budgetRecord = db.prepare('SELECT * FROM budgets WHERE user_id = ? AND month_year = ?').get(req.user.id, month);
    const monthlyLimit = budgetRecord ? budgetRecord.monthly_limit : 0;

    const billsPaid = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM bills 
      WHERE user_id = ? AND status = 'Paid' AND (due_date LIKE ? OR payment_date LIKE ?)
    `).get(req.user.id, `${month}%`, `${month}%`).total;

    const dailyExpenses = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM expenses 
      WHERE user_id = ? AND expense_date LIKE ?
    `).get(req.user.id, `${month}%`).total;

    const pantrySpending = db.prepare(`
      SELECT COALESCE(SUM(total_cost), 0) as total 
      FROM pantry_purchases 
      WHERE user_id = ? AND purchase_date LIKE ?
    `).get(req.user.id, `${month}%`).total;

    const totalSpent = billsPaid + dailyExpenses + pantrySpending;
    const remainingMoney = monthlyLimit > 0 ? (monthlyLimit - totalSpent) : 0;
    const spentPercentage = monthlyLimit > 0 ? (totalSpent / monthlyLimit) * 100 : 0;

    const isBudgetRunningLow = monthlyLimit > 0 && spentPercentage >= 80 && spentPercentage < 100;
    const isBudgetExceeded = monthlyLimit > 0 && totalSpent >= monthlyLimit;

    const pieSlices = [
      { label: 'Paid Bills', value: Number(billsPaid.toFixed(2)), color: '#3B82F6' },
      { label: 'Daily Expenses', value: Number(dailyExpenses.toFixed(2)), color: '#10B981' },
      { label: 'Pantry Purchases', value: Number(pantrySpending.toFixed(2)), color: '#F59E0B' }
    ].filter(s => s.value > 0);

    return res.json({
      month,
      monthlyBudget: Number(monthlyLimit.toFixed(2)),
      totalSpent: Number(totalSpent.toFixed(2)),
      remainingMoney: Number(remainingMoney.toFixed(2)),
      spentPercentage: Number(spentPercentage.toFixed(1)),
      breakdown: {
        paidBills: Number(billsPaid.toFixed(2)),
        dailyExpenses: Number(dailyExpenses.toFixed(2)),
        pantrySpending: Number(pantrySpending.toFixed(2))
      },
      isBudgetRunningLow,
      isBudgetExceeded,
      pieSlices
    });
  } catch (err) {
    console.error('Fetch budget error:', err);
    return res.status(500).json({ error: 'Failed to calculate budget.' });
  }
});

// POST /api/budget
router.post('/', (req, res) => {
  const { monthly_limit, month_year = new Date().toISOString().slice(0, 7) } = req.body;

  if (monthly_limit === undefined || Number(monthly_limit) < 0) {
    return res.status(400).json({ error: 'Valid positive monthly budget limit is required.' });
  }

  const limit = Number(monthly_limit);

  try {
    db.prepare(`
      INSERT INTO budgets (user_id, monthly_limit, month_year, updated_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(user_id, month_year) 
      DO UPDATE SET monthly_limit = excluded.monthly_limit, updated_at = datetime('now')
    `).run(req.user.id, limit, month_year);

    triggerUserEmailCheck(req.user.id);
    return res.json({
      message: 'Monthly budget configured successfully.',
      month_year,
      monthly_limit: limit
    });
  } catch (err) {
    console.error('Save budget error:', err);
    return res.status(500).json({ error: 'Failed to set budget.' });
  }
});

module.exports = router;
