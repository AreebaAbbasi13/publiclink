const express = require('express');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const { triggerUserEmailCheck } = require('../services/emailScheduler');

const router = express.Router();
router.use(authMiddleware);

const ALLOWED_CATEGORIES = ['Food', 'Transport', 'Utility', 'Other daily expenses'];

// GET /api/expenses (with search & filtering)
router.get('/', (req, res) => {
  const { search, category, startDate, endDate, month } = req.query;

  try {
    let query = 'SELECT * FROM expenses WHERE user_id = ?';
    const params = [req.user.id];

    if (month) {
      query += ' AND expense_date LIKE ?';
      params.push(`${month}%`);
    }

    if (startDate && endDate) {
      query += ' AND expense_date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    } else if (startDate) {
      query += ' AND expense_date >= ?';
      params.push(startDate);
    } else if (endDate) {
      query += ' AND expense_date <= ?';
      params.push(endDate);
    }

    if (category && category !== 'all') {
      query += ' AND category = ?';
      params.push(category);
    }

    if (search && search.trim() !== '') {
      const s = `%${search.trim()}%`;
      query += ' AND (title LIKE ? OR notes LIKE ? OR category LIKE ?)';
      params.push(s, s, s);
    }

    query += ' ORDER BY expense_date DESC, id DESC';
    const expenses = db.prepare(query).all(...params);

    const totalExpense = expenses.reduce((acc, e) => acc + e.amount, 0);

    return res.json({
      count: expenses.length,
      totalExpense: Number(totalExpense.toFixed(2)),
      expenses
    });
  } catch (err) {
    console.error('Fetch expenses error:', err);
    return res.status(500).json({ error: 'Failed to fetch expenses.' });
  }
});

// POST /api/expenses
router.post('/', (req, res) => {
  const { title, category, amount, expense_date = new Date().toISOString().slice(0, 10), notes = '' } = req.body;

  if (!title || !category || amount === undefined) {
    return res.status(400).json({ error: 'Title, category, and amount are required.' });
  }

  if (Number(amount) <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than 0.' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO expenses (user_id, title, category, amount, expense_date, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.user.id, title.trim(), category, Number(amount), expense_date, notes);

    const created = db.prepare('SELECT * FROM expenses WHERE id = ?').get(result.lastInsertRowid);
    triggerUserEmailCheck(req.user.id);
    return res.status(201).json({ message: 'Expense added successfully.', expense: created });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to add expense.' });
  }
});

// PUT /api/expenses/:id
router.put('/:id', (req, res) => {
  const expenseId = req.params.id;
  const { title, category, amount, expense_date, notes } = req.body;

  try {
    const current = db.prepare('SELECT * FROM expenses WHERE id = ? AND user_id = ?').get(expenseId, req.user.id);
    if (!current) {
      return res.status(404).json({ error: 'Expense not found.' });
    }

    db.prepare(`
      UPDATE expenses 
      SET title = ?, category = ?, amount = ?, expense_date = ?, notes = ?
      WHERE id = ?
    `).run(
      title !== undefined ? title.trim() : current.title,
      category || current.category,
      amount !== undefined ? Number(amount) : current.amount,
      expense_date || current.expense_date,
      notes !== undefined ? notes : current.notes,
      expenseId
    );

    const updated = db.prepare('SELECT * FROM expenses WHERE id = ?').get(expenseId);
    triggerUserEmailCheck(req.user.id);
    return res.json({ message: 'Expense updated successfully.', expense: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update expense.' });
  }
});

// DELETE /api/expenses/:id
router.delete('/:id', (req, res) => {
  const expenseId = req.params.id;
  try {
    const result = db.prepare('DELETE FROM expenses WHERE id = ? AND user_id = ?').run(expenseId, req.user.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Expense not found.' });
    }
    triggerUserEmailCheck(req.user.id);
    return res.json({ message: 'Expense deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete expense.' });
  }
});

module.exports = router;
