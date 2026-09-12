const express = require('express');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/summary/complete
router.get('/complete', (req, res) => {
  const currentMonth = req.query.month || new Date().toISOString().slice(0, 7);
  const prevMonthDate = new Date();
  prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
  const previousMonth = prevMonthDate.toISOString().slice(0, 7);

  try {
    const billsCurrent = db.prepare(`
      SELECT * FROM bills 
      WHERE user_id = ? AND (due_date LIKE ? OR payment_date LIKE ?)
    `).all(req.user.id, `${currentMonth}%`, `${currentMonth}%`);

    const expensesCurrent = db.prepare(`
      SELECT * FROM expenses 
      WHERE user_id = ? AND expense_date LIKE ?
    `).all(req.user.id, `${currentMonth}%`);

    const pantryPurchasesCurrent = db.prepare(`
      SELECT * FROM pantry_purchases 
      WHERE user_id = ? AND purchase_date LIKE ?
    `).all(req.user.id, `${currentMonth}%`);

    const billsPrev = db.prepare(`
      SELECT * FROM bills 
      WHERE user_id = ? AND (due_date LIKE ? OR payment_date LIKE ?)
    `).all(req.user.id, `${previousMonth}%`, `${previousMonth}%`);

    const expensesPrev = db.prepare(`
      SELECT * FROM expenses 
      WHERE user_id = ? AND expense_date LIKE ?
    `).all(req.user.id, `${previousMonth}%`);

    const pantryPurchasesPrev = db.prepare(`
      SELECT * FROM pantry_purchases 
      WHERE user_id = ? AND purchase_date LIKE ?
    `).all(req.user.id, `${previousMonth}%`);

    const paidBillsCur = billsCurrent.filter(b => b.status === 'Paid').reduce((a, b) => a + b.amount, 0);
    const dailyExpensesCur = expensesCurrent.reduce((a, e) => a + e.amount, 0);
    const pantryCur = pantryPurchasesCurrent.reduce((a, p) => a + p.total_cost, 0);
    const totalSpentCur = paidBillsCur + dailyExpensesCur + pantryCur;

    const paidBillsPrev = billsPrev.filter(b => b.status === 'Paid').reduce((a, b) => a + b.amount, 0);
    const dailyExpensesPrev = expensesPrev.reduce((a, e) => a + e.amount, 0);
    const pantryPrev = pantryPurchasesPrev.reduce((a, p) => a + p.total_cost, 0);
    const totalSpentPrev = paidBillsPrev + dailyExpensesPrev + pantryPrev;

    const categoryTotals = {};
    for (const e of expensesCurrent) {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    }
    for (const b of billsCurrent.filter(b => b.status === 'Paid')) {
      categoryTotals[b.category] = (categoryTotals[b.category] || 0) + b.amount;
    }
    if (pantryCur > 0) {
      categoryTotals['Pantry Supplies'] = pantryCur;
    }

    const categoryPie = Object.entries(categoryTotals).map(([cat, val]) => ({
      label: cat,
      value: Number(val.toFixed(2)),
      percentage: totalSpentCur > 0 ? Number(((val / totalSpentCur) * 100).toFixed(1)) : 0
    }));

    const currentStreamsPie = [
      { label: 'Paid Bills', value: Number(paidBillsCur.toFixed(2)), color: '#3B82F6' },
      { label: 'Daily Expenses', value: Number(dailyExpensesCur.toFixed(2)), color: '#10B981' },
      { label: 'Pantry Purchases', value: Number(pantryCur.toFixed(2)), color: '#F59E0B' }
    ].filter(s => s.value > 0);

    const prevStreamsPie = [
      { label: 'Paid Bills', value: Number(paidBillsPrev.toFixed(2)), color: '#3B82F6' },
      { label: 'Daily Expenses', value: Number(dailyExpensesPrev.toFixed(2)), color: '#10B981' },
      { label: 'Pantry Purchases', value: Number(pantryPrev.toFixed(2)), color: '#F59E0B' }
    ].filter(s => s.value > 0);

    return res.json({
      currentMonth,
      previousMonth,
      current: {
        totalSpent: Number(totalSpentCur.toFixed(2)),
        paidBills: Number(paidBillsCur.toFixed(2)),
        dailyExpenses: Number(dailyExpensesCur.toFixed(2)),
        pantrySpending: Number(pantryCur.toFixed(2)),
        billsCount: billsCurrent.length,
        expensesCount: expensesCurrent.length,
        pantryPurchasesCount: pantryPurchasesCurrent.length,
        pie: currentStreamsPie
      },
      previous: {
        totalSpent: Number(totalSpentPrev.toFixed(2)),
        paidBills: Number(paidBillsPrev.toFixed(2)),
        dailyExpenses: Number(dailyExpensesPrev.toFixed(2)),
        pantrySpending: Number(pantryPrev.toFixed(2)),
        pie: prevStreamsPie
      },
      categoryBreakdown: categoryPie,
      hasComparisonData: totalSpentCur > 0 && totalSpentPrev > 0
    });
  } catch (err) {
    console.error('Complete summary error:', err);
    return res.status(500).json({ error: 'Failed to generate complete summary.' });
  }
});

module.exports = router;
