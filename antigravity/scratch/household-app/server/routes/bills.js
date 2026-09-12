const express = require('express');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const { triggerUserEmailCheck } = require('../services/emailScheduler');

const router = express.Router();
router.use(authMiddleware);


const ALLOWED_CATEGORIES = [
  'Rent',
  'Water bill',
  'Electricity bill',
  'Gas bill',
  'Internet bill',
  'School fees',
  'College fees',
  'University fees',
  'Household help fees',
  'Education fees',
  'Household fees',
  'Online shopping payments',
  'Package amounts'
];

function computeStatus(dueDate, currentStatus, paymentDate) {
  if (currentStatus === 'Paid' || paymentDate) return 'Paid';
  const due = new Date(dueDate + 'T23:59:59');
  const now = new Date();
  return due < now ? 'Overdue' : 'Pending';
}

// GET /api/bills
router.get('/', (req, res) => {
  try {
    const { month, category, status } = req.query;
    let query = 'SELECT * FROM bills WHERE user_id = ?';
    const params = [req.user.id];

    if (month) {
      query += ' AND (due_date LIKE ? OR payment_date LIKE ?)';
      params.push(`${month}%`, `${month}%`);
    }
    if (category && category !== 'all') {
      query += ' AND category = ?';
      params.push(category);
    }

    query += ' ORDER BY due_date ASC';
    const rows = db.prepare(query).all(...params);

    const updatedRows = rows.map(bill => {
      const realStatus = computeStatus(bill.due_date, bill.status, bill.payment_date);
      if (realStatus !== bill.status) {
        db.prepare('UPDATE bills SET status = ? WHERE id = ?').run(realStatus, bill.id);
        bill.status = realStatus;
      }
      return bill;
    });

    if (status && status !== 'all') {
      return res.json(updatedRows.filter(b => b.status.toLowerCase() === status.toLowerCase()));
    }

    return res.json(updatedRows);
  } catch (err) {
    console.error('Fetch bills error:', err);
    return res.status(500).json({ error: 'Failed to fetch bills.' });
  }
});

// POST /api/bills
router.post('/', (req, res) => {
  const { name, category, amount, due_date, notes = '' } = req.body;

  if (!name || !category || amount === undefined || !due_date) {
    return res.status(400).json({ error: 'Name, category, amount, and due date are required.' });
  }

  if (Number(amount) <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than 0.' });
  }

  const initialStatus = computeStatus(due_date, 'Pending', null);

  try {
    const result = db.prepare(`
      INSERT INTO bills (user_id, name, category, amount, due_date, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(req.user.id, name.trim(), category, Number(amount), due_date, initialStatus, notes);

    const created = db.prepare('SELECT * FROM bills WHERE id = ?').get(result.lastInsertRowid);
    triggerUserEmailCheck(req.user.id);
    return res.status(201).json({ message: 'Bill added successfully.', bill: created });
  } catch (err) {
    console.error('Create bill error:', err);
    return res.status(500).json({ error: 'Failed to add bill.' });
  }
});

// PUT /api/bills/:id/pay
router.put('/:id/pay', (req, res) => {
  const billId = req.params.id;
  const { payment_date = new Date().toISOString().slice(0, 10), notes } = req.body;

  try {
    const bill = db.prepare('SELECT * FROM bills WHERE id = ? AND user_id = ?').get(billId, req.user.id);
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found.' });
    }

    db.prepare(`
      UPDATE bills 
      SET status = 'Paid', payment_date = ?, notes = COALESCE(?, notes)
      WHERE id = ?
    `).run(payment_date, notes || null, billId);

    const updated = db.prepare('SELECT * FROM bills WHERE id = ?').get(billId);
    triggerUserEmailCheck(req.user.id);
    return res.json({ message: 'Bill marked as Paid.', bill: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update bill payment.' });
  }
});

// PUT /api/bills/:id
router.put('/:id', (req, res) => {
  const billId = req.params.id;
  const { name, category, amount, due_date, status, notes } = req.body;

  try {
    const bill = db.prepare('SELECT * FROM bills WHERE id = ? AND user_id = ?').get(billId, req.user.id);
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found.' });
    }

    const nextStatus = status === 'Paid' ? 'Paid' : computeStatus(due_date || bill.due_date, status || bill.status, status === 'Paid' ? new Date().toISOString().slice(0, 10) : null);

    db.prepare(`
      UPDATE bills 
      SET name = ?, category = ?, amount = ?, due_date = ?, status = ?, notes = ?
      WHERE id = ?
    `).run(
      name !== undefined ? name.trim() : bill.name,
      category || bill.category,
      amount !== undefined ? Number(amount) : bill.amount,
      due_date || bill.due_date,
      nextStatus,
      notes !== undefined ? notes : bill.notes,
      billId
    );

    const updated = db.prepare('SELECT * FROM bills WHERE id = ?').get(billId);
    triggerUserEmailCheck(req.user.id);
    return res.json({ message: 'Bill updated successfully.', bill: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update bill.' });
  }
});

// DELETE /api/bills/:id
router.delete('/:id', (req, res) => {
  const billId = req.params.id;
  try {
    const result = db.prepare('DELETE FROM bills WHERE id = ? AND user_id = ?').run(billId, req.user.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Bill not found.' });
    }
    triggerUserEmailCheck(req.user.id);
    return res.json({ message: 'Bill deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete bill.' });
  }
});

// GET /api/bills/summary/monthly
router.get('/summary/monthly', (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);

  try {
    const bills = db.prepare(`
      SELECT * FROM bills 
      WHERE user_id = ? AND (due_date LIKE ? OR payment_date LIKE ?)
    `).all(req.user.id, `${month}%`, `${month}%`);

    let totalBilled = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let totalOverdue = 0;
    const categoryBreakdown = {};

    for (const b of bills) {
      totalBilled += b.amount;
      if (b.status === 'Paid') {
        totalPaid += b.amount;
      } else if (b.status === 'Overdue') {
        totalOverdue += b.amount;
      } else {
        totalPending += b.amount;
      }

      categoryBreakdown[b.category] = (categoryBreakdown[b.category] || 0) + b.amount;
    }

    const pieSlices = Object.entries(categoryBreakdown).map(([cat, val]) => ({
      label: cat,
      value: Number(val.toFixed(2)),
      percentage: totalBilled > 0 ? Number(((val / totalBilled) * 100).toFixed(1)) : 0
    }));

    return res.json({
      month,
      totalCount: bills.length,
      totalBilled: Number(totalBilled.toFixed(2)),
      totalPaid: Number(totalPaid.toFixed(2)),
      totalPending: Number(totalPending.toFixed(2)),
      totalOverdue: Number(totalOverdue.toFixed(2)),
      categoryBreakdown,
      pieSlices
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to compute monthly bill summary.' });
  }
});

module.exports = router;
