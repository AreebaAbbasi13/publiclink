const db = require('../db/database');

/**
 * Calculates accurate bill reminder statuses based on due date:
 * - 15 days left
 * - 10 days left
 * - 7 days left
 * - 4 days left
 * - 3 days left
 * - 1 day left
 * - Some hours left (today)
 * - Overdue
 */
function evaluateUserReminders(userId) {
  const today = new Date();
  const user = db.prepare('SELECT currency FROM users WHERE id = ?').get(userId);
  const rawCurrency = user ? user.currency : 'PKR';
  const currency = (rawCurrency === 'PKR' || rawCurrency === 'Rs.' || rawCurrency === '₨') ? 'Rs.' : rawCurrency;

  // 1. Fetch pending & overdue bills
  const bills = db.prepare('SELECT * FROM bills WHERE user_id = ?').all(userId);
  const reminders = [];

  for (const bill of bills) {
    if (bill.status === 'Paid') continue;

    const dueDateObj = new Date(bill.due_date + 'T23:59:59');
    const diffMs = dueDateObj.getTime() - today.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = Math.ceil(diffHours / 24);

    let reminderLevel = null;
    let reminderTitle = '';
    let reminderMessage = '';
    let urgency = 'info'; // 'info' | 'warning' | 'danger'

    if (diffMs < 0) {
      // Overdue
      if (bill.status !== 'Overdue') {
        db.prepare("UPDATE bills SET status = 'Overdue' WHERE id = ?").run(bill.id);
        bill.status = 'Overdue';
      }
      const daysOverdue = Math.abs(diffDays);
      reminderLevel = 'overdue';
      urgency = 'danger';
      reminderTitle = `Overdue Bill: ${bill.name}`;
      reminderMessage = `${bill.name} (${currency}${bill.amount.toFixed(2)}) is overdue by ${daysOverdue === 0 ? '1 day' : daysOverdue + ' days'} (Due: ${bill.due_date}).`;
    } else if (diffHours <= 24) {
      // Some hours left / Due Today
      reminderLevel = 'hours';
      urgency = 'danger';
      const hoursRemaining = Math.max(1, Math.round(diffHours));
      reminderTitle = `Due Today (${hoursRemaining}h left): ${bill.name}`;
      reminderMessage = `${bill.name} (${currency}${bill.amount.toFixed(2)}) is due today! ${hoursRemaining} hours remaining.`;
    } else if (diffDays === 1) {
      // 1 day left
      reminderLevel = '1_day';
      urgency = 'danger';
      reminderTitle = `1 Day Left: ${bill.name}`;
      reminderMessage = `${bill.name} (${currency}${bill.amount.toFixed(2)}) is due tomorrow (${bill.due_date}).`;
    } else if (diffDays === 3) {
      // 3 days left
      reminderLevel = '3_days';
      urgency = 'warning';
      reminderTitle = `3 Days Left: ${bill.name}`;
      reminderMessage = `${bill.name} (${currency}${bill.amount.toFixed(2)}) is due in 3 days (${bill.due_date}).`;
    } else if (diffDays === 4) {
      // 4 days left
      reminderLevel = '4_days';
      urgency = 'warning';
      reminderTitle = `4 Days Left: ${bill.name}`;
      reminderMessage = `${bill.name} (${currency}${bill.amount.toFixed(2)}) is due in 4 days (${bill.due_date}).`;
    } else if (diffDays >= 6 && diffDays <= 7) {
      // 7 days left
      reminderLevel = '7_days';
      urgency = 'warning';
      reminderTitle = `7 Days Left: ${bill.name}`;
      reminderMessage = `${bill.name} (${currency}${bill.amount.toFixed(2)}) is due in ${diffDays} days (${bill.due_date}).`;
    } else if (diffDays >= 9 && diffDays <= 10) {
      // 10 days left
      reminderLevel = '10_days';
      urgency = 'info';
      reminderTitle = `10 Days Left: ${bill.name}`;
      reminderMessage = `${bill.name} (${currency}${bill.amount.toFixed(2)}) is due in ${diffDays} days (${bill.due_date}).`;
    } else if (diffDays >= 14 && diffDays <= 15) {
      // 15 days left
      reminderLevel = '15_days';
      urgency = 'info';
      reminderTitle = `15 Days Left: ${bill.name}`;
      reminderMessage = `${bill.name} (${currency}${bill.amount.toFixed(2)}) is due in ${diffDays} days (${bill.due_date}).`;
    }

    if (reminderLevel) {
      reminders.push({
        id: `bill-${bill.id}-${reminderLevel}`,
        type: 'bill_reminder',
        category: bill.category,
        billId: bill.id,
        level: reminderLevel,
        urgency,
        title: reminderTitle,
        message: reminderMessage,
        amount: bill.amount,
        dueDate: bill.due_date,
        createdAt: bill.created_at
      });
    }
  }

  // 2. Evaluate Pantry Low Stock
  const pantryItems = db.prepare('SELECT * FROM pantry_items WHERE user_id = ?').all(userId);
  for (const item of pantryItems) {
    if (item.quantity <= item.min_threshold) {
      reminders.push({
        id: `pantry-${item.id}-low`,
        type: 'pantry_low',
        category: 'Pantry',
        itemId: item.id,
        urgency: item.quantity === 0 ? 'danger' : 'warning',
        title: item.quantity === 0 ? `Out of Stock: ${item.name}` : `Running Low: ${item.name}`,
        message: `${item.name} has ${item.quantity} ${item.unit} left (Threshold: ${item.min_threshold} ${item.unit}). Added to Suggested Shopping List.`,
        createdAt: item.updated_at
      });
    }
  }

  // 3. Evaluate Budget Status
  const currentMonthYear = today.toISOString().slice(0, 7);
  const budgetRecord = db.prepare('SELECT monthly_limit FROM budgets WHERE user_id = ? AND month_year = ?').get(userId, currentMonthYear);
  
  if (budgetRecord && budgetRecord.monthly_limit > 0) {
    const monthlyLimit = budgetRecord.monthly_limit;
    
    const billsPaid = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM bills 
      WHERE user_id = ? AND status = 'Paid' AND (due_date LIKE ? OR payment_date LIKE ?)
    `).get(userId, `${currentMonthYear}%`, `${currentMonthYear}%`).total;

    const expensesTotal = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM expenses 
      WHERE user_id = ? AND expense_date LIKE ?
    `).get(userId, `${currentMonthYear}%`).total;

    const pantryTotal = db.prepare(`
      SELECT COALESCE(SUM(total_cost), 0) as total 
      FROM pantry_purchases 
      WHERE user_id = ? AND purchase_date LIKE ?
    `).get(userId, `${currentMonthYear}%`).total;

    const totalSpent = billsPaid + expensesTotal + pantryTotal;
    const spentPercentage = (totalSpent / monthlyLimit) * 100;

    if (totalSpent >= monthlyLimit) {
      reminders.push({
        id: `budget-${currentMonthYear}-exceeded`,
        type: 'saving_alert',
        urgency: 'danger',
        title: 'Saving Alert: Monthly Budget Exceeded',
        message: `You have spent ${currency}${totalSpent.toFixed(2)}, exceeding your ${currency}${monthlyLimit.toFixed(2)} monthly budget by ${currency}${(totalSpent - monthlyLimit).toFixed(2)}. Consider reviewing discretionary expenses.`,
        createdAt: new Date().toISOString()
      });
    } else if (spentPercentage >= 80) {
      reminders.push({
        id: `budget-${currentMonthYear}-low`,
        type: 'budget_alert',
        urgency: 'warning',
        title: `Budget Running Low (${spentPercentage.toFixed(0)}% Used)`,
        message: `You have spent ${currency}${totalSpent.toFixed(2)} of your ${currency}${monthlyLimit.toFixed(2)} budget. Only ${currency}${(monthlyLimit - totalSpent).toFixed(2)} remaining for ${currentMonthYear}.`,
        createdAt: new Date().toISOString()
      });
    }
  }

  return reminders;
}

module.exports = { evaluateUserReminders };
