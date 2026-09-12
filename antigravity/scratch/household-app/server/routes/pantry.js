const express = require('express');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const { triggerUserEmailCheck } = require('../services/emailScheduler');

const router = express.Router();
router.use(authMiddleware);

// GET /api/pantry
router.get('/', (req, res) => {
  try {
    const items = db.prepare('SELECT * FROM pantry_items WHERE user_id = ? ORDER BY name ASC').all(req.user.id);
    const lowStockItems = items.filter(i => i.quantity <= i.min_threshold);
    
    return res.json({
      totalCount: items.length,
      lowStockCount: lowStockItems.length,
      items,
      lowStockItems
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch pantry items.' });
  }
});

// POST /api/pantry
router.post('/', (req, res) => {
  const { name, category = 'General', quantity = 0, unit = 'pcs', min_threshold = 1, unit_cost = 0 } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Item name is required.' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO pantry_items (user_id, name, category, quantity, unit, min_threshold, unit_cost)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(req.user.id, name.trim(), category.trim(), Number(quantity), unit.trim(), Number(min_threshold), Number(unit_cost));

    const created = db.prepare('SELECT * FROM pantry_items WHERE id = ?').get(result.lastInsertRowid);
    triggerUserEmailCheck(req.user.id);
    return res.status(201).json({ message: 'Pantry item added successfully.', item: created });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to add pantry item.' });
  }
});

// PUT /api/pantry/:id/quantity
router.put('/:id/quantity', (req, res) => {
  const itemId = req.params.id;
  const { delta, exact } = req.body;

  try {
    const item = db.prepare('SELECT * FROM pantry_items WHERE id = ? AND user_id = ?').get(itemId, req.user.id);
    if (!item) {
      return res.status(404).json({ error: 'Pantry item not found.' });
    }

    let newQty = item.quantity;
    if (exact !== undefined) {
      newQty = Math.max(0, Number(exact));
    } else if (delta !== undefined) {
      newQty = Math.max(0, item.quantity + Number(delta));
    }

    db.prepare(`
      UPDATE pantry_items 
      SET quantity = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(newQty, itemId);

    const updated = db.prepare('SELECT * FROM pantry_items WHERE id = ?').get(itemId);
    triggerUserEmailCheck(req.user.id);
    return res.json({ message: 'Quantity updated.', item: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update quantity.' });
  }
});

// POST /api/pantry/purchase (Market purchase flow)
router.post('/purchase', (req, res) => {
  const { pantry_item_id, item_name, quantity_bought, unit, total_cost, purchase_date = new Date().toISOString().slice(0, 10), notes = '' } = req.body;

  if ((!pantry_item_id && !item_name) || !quantity_bought || total_cost === undefined) {
    return res.status(400).json({ error: 'Item, quantity bought, and total cost are required.' });
  }

  const qty = Number(quantity_bought);
  const cost = Number(total_cost);

  if (qty <= 0 || cost < 0) {
    return res.status(400).json({ error: 'Quantity must be positive and cost non-negative.' });
  }

  try {
    let targetItemId = pantry_item_id;
    let finalItemName = item_name;
    let finalUnit = unit || 'pcs';

    if (targetItemId) {
      const existing = db.prepare('SELECT * FROM pantry_items WHERE id = ? AND user_id = ?').get(targetItemId, req.user.id);
      if (existing) {
        finalItemName = existing.name;
        finalUnit = existing.unit;
        const newTotalQty = existing.quantity + qty;
        const newUnitCost = qty > 0 ? (cost / qty) : existing.unit_cost;
        db.prepare(`
          UPDATE pantry_items 
          SET quantity = ?, unit_cost = ?, updated_at = datetime('now')
          WHERE id = ?
        `).run(newTotalQty, Number(newUnitCost.toFixed(2)), targetItemId);
      }
    } else {
      const newItem = db.prepare(`
        INSERT INTO pantry_items (user_id, name, category, quantity, unit, min_threshold, unit_cost)
        VALUES (?, ?, 'Market Purchase', ?, ?, 1, ?)
      `).run(req.user.id, finalItemName.trim(), qty, finalUnit, Number((cost / qty).toFixed(2)));
      targetItemId = newItem.lastInsertRowid;
    }

    const purchaseResult = db.prepare(`
      INSERT INTO pantry_purchases (user_id, pantry_item_id, item_name, quantity_bought, unit, total_cost, purchase_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.user.id, targetItemId, finalItemName, qty, finalUnit, cost, purchase_date, notes);

    const purchase = db.prepare('SELECT * FROM pantry_purchases WHERE id = ?').get(purchaseResult.lastInsertRowid);
    const updatedItem = targetItemId ? db.prepare('SELECT * FROM pantry_items WHERE id = ?').get(targetItemId) : null;

    triggerUserEmailCheck(req.user.id);
    return res.status(201).json({
      message: 'Market purchase recorded and pantry stock updated.',
      purchase,
      item: updatedItem
    });
  } catch (err) {
    console.error('Market purchase error:', err);
    return res.status(500).json({ error: 'Failed to record market purchase.' });
  }
});

// GET /api/pantry/suggested
router.get('/suggested', (req, res) => {
  try {
    const lowItems = db.prepare(`
      SELECT id, name, category, quantity, unit, min_threshold, unit_cost
      FROM pantry_items 
      WHERE user_id = ? AND quantity <= min_threshold
      ORDER BY quantity ASC
    `).all(req.user.id);

    const suggestions = lowItems.map(item => {
      const neededQty = Math.max(1, (item.min_threshold * 2) - item.quantity);
      const estCost = item.unit_cost > 0 ? (neededQty * item.unit_cost) : 0;
      return {
        ...item,
        suggestedReplenishQuantity: neededQty,
        estimatedCost: Number(estCost.toFixed(2)),
        isDepleted: item.quantity === 0
      };
    });

    const totalEstimatedSpend = suggestions.reduce((acc, s) => acc + s.estimatedCost, 0);

    return res.json({
      count: suggestions.length,
      totalEstimatedSpend: Number(totalEstimatedSpend.toFixed(2)),
      suggestions
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to compile suggested shopping list.' });
  }
});

// GET /api/pantry/spending
router.get('/spending', (req, res) => {
  const { month } = req.query;

  try {
    let query = 'SELECT * FROM pantry_purchases WHERE user_id = ?';
    const params = [req.user.id];

    if (month) {
      query += ' AND purchase_date LIKE ?';
      params.push(`${month}%`);
    }

    query += ' ORDER BY purchase_date DESC';
    const purchases = db.prepare(query).all(...params);
    const totalSpent = purchases.reduce((acc, p) => acc + p.total_cost, 0);

    return res.json({
      count: purchases.length,
      totalPantrySpending: Number(totalSpent.toFixed(2)),
      purchases
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch pantry spending.' });
  }
});

// DELETE /api/pantry/:id
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM pantry_items WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Item not found.' });
    }
    triggerUserEmailCheck(req.user.id);
    return res.json({ message: 'Pantry item removed.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete item.' });
  }
});

module.exports = router;
