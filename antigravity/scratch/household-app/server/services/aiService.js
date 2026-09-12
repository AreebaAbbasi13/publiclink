const db = require('../db/database');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
let genAI = null;
if (apiKey) {
  genAI = new GoogleGenerativeAI(apiKey);
}

/**
 * Gathers complete, real live context of the user's household data.
 */
function getUserHouseholdContext(userId) {
  const today = new Date();
  const currentMonth = today.toISOString().slice(0, 7);
  const user = db.prepare('SELECT name, email, currency FROM users WHERE id = ?').get(userId);
  const rawCurrency = user ? user.currency : 'PKR';
  const currency = (rawCurrency === 'PKR' || rawCurrency === 'Rs.' || rawCurrency === '₨') ? 'Rs.' : rawCurrency;

  // Budget
  const budget = db.prepare('SELECT monthly_limit FROM budgets WHERE user_id = ? AND month_year = ?').get(userId, currentMonth);
  const monthlyBudget = budget ? budget.monthly_limit : 0;

  // Bills
  const bills = db.prepare('SELECT * FROM bills WHERE user_id = ? ORDER BY due_date ASC').all(userId);
  const pendingBills = bills.filter(b => b.status === 'Pending');
  const overdueBills = bills.filter(b => b.status === 'Overdue');
  const paidBillsThisMonth = bills.filter(b => b.status === 'Paid' && (b.due_date.startsWith(currentMonth) || (b.payment_date && b.payment_date.startsWith(currentMonth))));
  
  const totalPaidBills = paidBillsThisMonth.reduce((acc, b) => acc + b.amount, 0);
  const totalPendingBills = pendingBills.reduce((acc, b) => acc + b.amount, 0);
  const totalOverdueBills = overdueBills.reduce((acc, b) => acc + b.amount, 0);

  // Daily Expenses
  const expenses = db.prepare('SELECT * FROM expenses WHERE user_id = ? ORDER BY expense_date DESC').all(userId);
  const expensesThisMonth = expenses.filter(e => e.expense_date.startsWith(currentMonth));
  const totalDailyExpenses = expensesThisMonth.reduce((acc, e) => acc + e.amount, 0);

  // Expense categories breakdown
  const categoryTotals = {};
  for (const exp of expensesThisMonth) {
    categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
  }

  // Pantry
  const pantryItems = db.prepare('SELECT * FROM pantry_items WHERE user_id = ?').all(userId);
  const lowStockPantry = pantryItems.filter(p => p.quantity <= p.min_threshold);
  
  // Pantry spending
  const pantryPurchases = db.prepare('SELECT * FROM pantry_purchases WHERE user_id = ? ORDER BY purchase_date DESC').all(userId);
  const pantryPurchasesThisMonth = pantryPurchases.filter(p => p.purchase_date.startsWith(currentMonth));
  const totalPantrySpending = pantryPurchasesThisMonth.reduce((acc, p) => acc + p.total_cost, 0);

  // Total spending
  const totalSpent = totalPaidBills + totalDailyExpenses + totalPantrySpending;
  const remainingBudget = monthlyBudget > 0 ? (monthlyBudget - totalSpent) : 0;

  return {
    user,
    currency,
    currentMonth,
    monthlyBudget,
    totalSpent,
    remainingBudget,
    bills: {
      all: bills,
      pending: pendingBills,
      overdue: overdueBills,
      paidThisMonth: paidBillsThisMonth,
      totalPaid: totalPaidBills,
      totalPending: totalPendingBills,
      totalOverdue: totalOverdueBills
    },
    expenses: {
      recent: expenses.slice(0, 10),
      thisMonthCount: expensesThisMonth.length,
      totalThisMonth: totalDailyExpenses,
      byCategory: categoryTotals
    },
    pantry: {
      totalItems: pantryItems.length,
      items: pantryItems,
      lowStock: lowStockPantry,
      totalSpendingThisMonth: totalPantrySpending,
      recentPurchases: pantryPurchases.slice(0, 5)
    }
  };
}

/**
 * AI Assistant Chat: answers questions using actual household data.
 */
async function processAIChat(userId, userMessage, conversationHistory = []) {
  const context = getUserHouseholdContext(userId);
  const currency = context.currency;

  const systemContext = `
You are the intelligent Household Financial & Management Assistant for ${context.user ? context.user.name : 'the user'}.
You have direct access to their real stored household management database for ${context.currentMonth}:

FINANCIAL SNAPSHOT:
- Currency: ${currency}
- Monthly Budget: ${currency}${context.monthlyBudget.toFixed(2)}
- Total Money Spent this Month: ${currency}${context.totalSpent.toFixed(2)} (Paid Bills: ${currency}${context.bills.totalPaid.toFixed(2)}, Daily Expenses: ${currency}${context.expenses.totalThisMonth.toFixed(2)}, Pantry Spending: ${currency}${context.pantry.totalSpendingThisMonth.toFixed(2)})
- Remaining Budget: ${currency}${context.remainingBudget.toFixed(2)}
- Unpaid Bills: ${context.bills.pending.length} pending (${currency}${context.bills.totalPending.toFixed(2)}), ${context.bills.overdue.length} overdue (${currency}${context.bills.totalOverdue.toFixed(2)})

OVERDUE / PENDING BILLS:
${context.bills.pending.concat(context.bills.overdue).map(b => `- ${b.name} (${b.category}): ${currency}${b.amount.toFixed(2)} | Due: ${b.due_date} | Status: ${b.status}`).join('\n') || 'None'}

EXPENSE BREAKDOWN BY CATEGORY:
${Object.entries(context.expenses.byCategory).map(([cat, amt]) => `- ${cat}: ${currency}${amt.toFixed(2)}`).join('\n') || 'No expenses recorded for this month.'}

PANTRY LOW STOCK ITEMS:
${context.pantry.lowStock.map(p => `- ${p.name}: ${p.quantity} ${p.unit} remaining (Threshold: ${p.min_threshold} ${p.unit})`).join('\n') || 'All pantry items are adequately stocked.'}

ALL PANTRY INVENTORY:
${context.pantry.items.map(p => `- ${p.name} (${p.category}): ${p.quantity} ${p.unit}`).join('\n') || 'Pantry is empty.'}

RULES:
1. Answer concisely, professionally, and accurately using ONLY the real numbers and items above.
2. If asked for a meal recipe or grocery list, base it strictly on what items exist in the pantry.
3. If no data exists for a specific query, state so honestly (e.g., "You have not recorded any transport expenses yet.").
4. Format with clean markdown, bullet points, and highlight important numbers.
`;

  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `${systemContext}\n\nUser question: ${userMessage}`;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (err) {
      console.warn('Gemini API call failed, falling back to contextual reasoning engine:', err.message);
    }
  }

  // Deterministic Intelligent Rule & Context Engine (Zero Dummy Data Guarantee)
  const q = userMessage.toLowerCase();
  
  if (q.includes('budget') || q.includes('remaining') || q.includes('how much do i have')) {
    if (context.monthlyBudget === 0) {
      return `You haven't set a monthly budget for **${context.currentMonth}** yet. Please set your budget in the Budget Management section to track spending against limits.`;
    }
    const pct = ((context.totalSpent / context.monthlyBudget) * 100).toFixed(1);
    return `### Budget Overview for ${context.currentMonth}
- **Monthly Limit:** ${currency}${context.monthlyBudget.toFixed(2)}
- **Total Spent:** ${currency}${context.totalSpent.toFixed(2)} (${pct}% utilized)
- **Remaining Balance:** ${currency}${context.remainingBudget.toFixed(2)}

**Spending Breakdown:**
- Paid Bills: ${currency}${context.bills.totalPaid.toFixed(2)}
- Daily Expenses: ${currency}${context.expenses.totalThisMonth.toFixed(2)}
- Pantry Purchases: ${currency}${context.pantry.totalSpendingThisMonth.toFixed(2)}`;
  }

  if (q.includes('bill') || q.includes('rent') || q.includes('due') || q.includes('overdue')) {
    if (context.bills.all.length === 0) {
      return `You currently have no bills recorded in your system. Add your rent and utility bills in the Bills & Rent Management section.`;
    }
    const unpaid = [...context.bills.overdue, ...context.bills.pending];
    if (unpaid.length === 0) {
      return `Great news! All recorded bills for **${context.currentMonth}** are marked as **Paid**. Total paid: ${currency}${context.bills.totalPaid.toFixed(2)}.`;
    }
    return `### Upcoming & Unpaid Bills
You have **${unpaid.length}** unpaid bill(s) totaling **${currency}${(context.bills.totalPending + context.bills.totalOverdue).toFixed(2)}**:
${unpaid.map(b => `- **${b.name}** (${b.category}): ${currency}${b.amount.toFixed(2)} — Due **${b.due_date}** (${b.status})`).join('\n')}`;
  }

  if (q.includes('pantry') || q.includes('food') || q.includes('low') || q.includes('shopping list') || q.includes('cook') || q.includes('recipe')) {
    if (context.pantry.totalItems === 0) {
      return `Your pantry inventory is currently empty. You can add your staples in the Pantry Management section.`;
    }
    if (context.pantry.lowStock.length > 0) {
      return `### Pantry Low-Stock Alert
You have **${context.pantry.lowStock.length}** item(s) running low:
${context.pantry.lowStock.map(p => `- **${p.name}**: ${p.quantity} ${p.unit} remaining (Threshold: ${p.min_threshold} ${p.unit})`).join('\n')}

These items have been automatically compiled into your Suggested Shopping List.`;
    }
    return `All **${context.pantry.totalItems}** pantry items have adequate stock levels. Total pantry purchases this month: ${currency}${context.pantry.totalSpendingThisMonth.toFixed(2)}.`;
  }

  if (q.includes('expense') || q.includes('spent') || q.includes('category') || q.includes('history')) {
    const cats = Object.entries(context.expenses.byCategory);
    if (cats.length === 0) {
      return `No daily expenses recorded for **${context.currentMonth}** yet. Click "Add Expense" to track your daily food, transport, or utility costs.`;
    }
    return `### Daily Expense Summary (${context.currentMonth})
- **Total Recorded Expenses:** ${currency}${context.expenses.totalThisMonth.toFixed(2)} across ${context.expenses.thisMonthCount} transaction(s).
- **Category Breakdown:**
${cats.map(([cat, amt]) => `  - **${cat}:** ${currency}${amt.toFixed(2)} (${((amt / context.expenses.totalThisMonth) * 100).toFixed(1)}%)`).join('\n')}`;
  }

  // General executive response
  return `### Household Management Summary (${context.currentMonth})
Hello ${context.user ? context.user.name : ''}! Here is your current household status:

- 💰 **Budget:** ${context.monthlyBudget > 0 ? `${currency}${context.remainingBudget.toFixed(2)} remaining of ${currency}${context.monthlyBudget.toFixed(2)}` : 'No monthly budget set'}
- 💳 **Bills:** ${context.bills.pending.length + context.bills.overdue.length} unpaid bill(s) totaling ${currency}${(context.bills.totalPending + context.bills.totalOverdue).toFixed(2)}
- 📊 **Daily Expenses:** ${currency}${context.expenses.totalThisMonth.toFixed(2)} recorded this month
- 🥫 **Pantry:** ${context.pantry.lowStock.length} item(s) running low out of ${context.pantry.totalItems} total items

How can I assist you further with your bills, expenses, pantry, or budget?`;
}

/**
 * Smart Recommendations based strictly on real user data.
 */
function generateSmartRecommendations(userId) {
  const context = getUserHouseholdContext(userId);
  const currency = context.currency;
  const recommendations = [];

  // 1. Budget recommendations
  if (context.monthlyBudget === 0) {
    recommendations.push({
      id: 'rec-set-budget',
      priority: 'High',
      category: 'Budget Management',
      title: 'Set Monthly Household Budget',
      description: 'Setting an estimated monthly budget enables real-time threshold monitoring, saving alerts, and burn rate analytics.',
      metric: 'No budget allocated',
      actionUrl: 'budget'
    });
  } else {
    const pct = (context.totalSpent / context.monthlyBudget) * 100;
    if (pct >= 100) {
      recommendations.push({
        id: 'rec-budget-exceeded',
        priority: 'Urgent',
        category: 'Budget & Savings',
        title: 'Monthly Budget Limit Exceeded',
        description: `Spending has surpassed your limit by ${currency}${(context.totalSpent - context.monthlyBudget).toFixed(2)}. Pause non-essential purchases for the remainder of ${context.currentMonth}.`,
        metric: `${pct.toFixed(0)}% budget consumed`,
        actionUrl: 'budget'
      });
    } else if (pct >= 80) {
      recommendations.push({
        id: 'rec-budget-80',
        priority: 'High',
        category: 'Budget Management',
        title: 'Budget Approaching Limit',
        description: `You have used ${pct.toFixed(0)}% of your monthly budget with ${currency}${context.remainingBudget.toFixed(2)} remaining. Review upcoming expenses.`,
        metric: `${currency}${context.remainingBudget.toFixed(2)} left`,
        actionUrl: 'budget'
      });
    }
  }

  // 2. Overdue & Pending Bills recommendations
  if (context.bills.overdue.length > 0) {
    recommendations.push({
      id: 'rec-bills-overdue',
      priority: 'Urgent',
      category: 'Bills & Rent',
      title: `Pay ${context.bills.overdue.length} Overdue Bill(s)`,
      description: `You have overdue bills totaling ${currency}${context.bills.totalOverdue.toFixed(2)}. Settle them promptly to avoid penalties.`,
      metric: `${currency}${context.bills.totalOverdue.toFixed(2)} overdue`,
      actionUrl: 'bills'
    });
  }

  const urgentPending = context.bills.pending.filter(b => {
    const diff = (new Date(b.due_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
    return diff >= 0 && diff <= 4;
  });

  if (urgentPending.length > 0) {
    recommendations.push({
      id: 'rec-bills-imminent',
      priority: 'High',
      category: 'Bills & Rent',
      title: `${urgentPending.length} Bill(s) Due Within 4 Days`,
      description: `Upcoming payments: ${urgentPending.map(b => b.name).join(', ')}. Ensure sufficient funds are allocated.`,
      metric: `${currency}${urgentPending.reduce((a, b) => a + b.amount, 0).toFixed(2)} due soon`,
      actionUrl: 'bills'
    });
  }

  // 3. Pantry recommendations
  if (context.pantry.lowStock.length > 0) {
    recommendations.push({
      id: 'rec-pantry-replenish',
      priority: 'Medium',
      category: 'Pantry Management',
      title: `Replenish ${context.pantry.lowStock.length} Low-Stock Pantry Staple(s)`,
      description: `Items needing restock: ${context.pantry.lowStock.map(p => p.name).join(', ')}. Use the Market Purchase feature to update quantities.`,
      metric: `${context.pantry.lowStock.length} items low`,
      actionUrl: 'pantry'
    });
  }

  // 4. Expense distribution insight
  const cats = Object.entries(context.expenses.byCategory).sort((a, b) => b[1] - a[1]);
  if (cats.length > 0 && context.expenses.totalThisMonth > 0) {
    const topCat = cats[0];
    const topPct = ((topCat[1] / context.expenses.totalThisMonth) * 100).toFixed(0);
    recommendations.push({
      id: 'rec-expense-top-category',
      priority: 'Low',
      category: 'Expense Optimization',
      title: `${topCat[0]} is Your Top Daily Expense Category`,
      description: `${topCat[0]} represents ${topPct}% (${currency}${topCat[1].toFixed(2)}) of your daily expense spending this month.`,
      metric: `${currency}${topCat[1].toFixed(2)} (${topPct}%)`,
      actionUrl: 'expenses'
    });
  }

  return recommendations;
}

/**
 * AI Summary: High-level financial briefing based on real data.
 */
function generateAISummary(userId) {
  const context = getUserHouseholdContext(userId);
  const currency = context.currency;

  const summary = {
    month: context.currentMonth,
    generatedAt: new Date().toISOString(),
    overallStatus: context.totalSpent > context.monthlyBudget && context.monthlyBudget > 0 ? 'Critical' : (context.bills.overdue.length > 0 ? 'Needs Attention' : 'Healthy'),
    totalSpent: context.totalSpent,
    monthlyBudget: context.monthlyBudget,
    remainingBudget: context.remainingBudget,
    breakdown: {
      paidBills: context.bills.totalPaid,
      dailyExpenses: context.expenses.totalThisMonth,
      pantrySpending: context.pantry.totalSpendingThisMonth
    },
    unpaidObligations: context.bills.totalPending + context.bills.totalOverdue,
    lowStockCount: context.pantry.lowStock.length,
    narrative: `During ${context.currentMonth}, your total household expenditure stands at ${currency}${context.totalSpent.toFixed(2)}. ` +
      (context.monthlyBudget > 0 
        ? `You have utilized ${((context.totalSpent / context.monthlyBudget) * 100).toFixed(1)}% of your ${currency}${context.monthlyBudget.toFixed(2)} monthly budget, leaving a balance of ${currency}${context.remainingBudget.toFixed(2)}. `
        : `No monthly budget is configured for this period. `) +
      `You have ${context.bills.pending.length + context.bills.overdue.length} unpaid bill(s) amounting to ${currency}${(context.bills.totalPending + context.bills.totalOverdue).toFixed(2)} and ${context.pantry.lowStock.length} pantry item(s) currently below safety thresholds.`
  };

  return summary;
}

/**
 * AI-Generated Pie Chart: Synthesizes dynamic slice distributions based on query.
 */
function generateAIPieChart(userId, prompt = '') {
  const context = getUserHouseholdContext(userId);
  const currency = context.currency;
  const q = (prompt || '').toLowerCase();

  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', 
    '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
    '#F97316', '#6366F1', '#14B8A6', '#D946EF'
  ];

  let title = 'Household Spending Distribution';
  let slices = [];
  let insight = '';

  if (q.includes('bill') || q.includes('rent')) {
    title = 'Bills by Category';
    const byCategory = {};
    for (const b of context.bills.all) {
      byCategory[b.category] = (byCategory[b.category] || 0) + b.amount;
    }
    slices = Object.entries(byCategory).map(([label, value], idx) => ({
      label,
      value: Number(value.toFixed(2)),
      color: colors[idx % colors.length]
    }));
    insight = slices.length > 0 
      ? `Total bills across ${slices.length} categories: ${currency}${slices.reduce((a, b) => a + b.value, 0).toFixed(2)}.`
      : 'No bills recorded yet.';
  } else if (q.includes('expense') || q.includes('daily')) {
    title = 'Daily Expenses by Category';
    slices = Object.entries(context.expenses.byCategory).map(([label, value], idx) => ({
      label,
      value: Number(value.toFixed(2)),
      color: colors[idx % colors.length]
    }));
    insight = slices.length > 0
      ? `Daily expenses total: ${currency}${context.expenses.totalThisMonth.toFixed(2)}.`
      : 'No daily expenses recorded for this month.';
  } else if (q.includes('status') || q.includes('paid vs pending') || q.includes('payment')) {
    title = 'Bill Payment Status Distribution';
    slices = [
      { label: 'Paid Bills', value: context.bills.totalPaid, color: '#10B981' },
      { label: 'Pending Bills', value: context.bills.totalPending, color: '#F59E0B' },
      { label: 'Overdue Bills', value: context.bills.totalOverdue, color: '#EF4444' }
    ].filter(s => s.value > 0);
    insight = `Paid: ${currency}${context.bills.totalPaid.toFixed(2)} | Pending: ${currency}${context.bills.totalPending.toFixed(2)} | Overdue: ${currency}${context.bills.totalOverdue.toFixed(2)}.`;
  } else {
    title = `Overall Spending Breakdown (${context.currentMonth})`;
    slices = [
      { label: 'Paid Bills', value: Number(context.bills.totalPaid.toFixed(2)), color: '#3B82F6' },
      { label: 'Daily Expenses', value: Number(context.expenses.totalThisMonth.toFixed(2)), color: '#10B981' },
      { label: 'Pantry Purchases', value: Number(context.pantry.totalSpendingThisMonth.toFixed(2)), color: '#F59E0B' }
    ].filter(s => s.value > 0);

    insight = slices.length > 0
      ? `Total spending for ${context.currentMonth} is ${currency}${context.totalSpent.toFixed(2)}.`
      : 'No expenditures recorded for this month yet.';
  }

  const total = slices.reduce((acc, s) => acc + s.value, 0);
  const formattedSlices = slices.map(s => ({
    ...s,
    percentage: total > 0 ? Number(((s.value / total) * 100).toFixed(1)) : 0
  }));

  return {
    query: prompt || 'Overall Spending Breakdown',
    title,
    totalValue: Number(total.toFixed(2)),
    currency,
    slices: formattedSlices,
    insight
  };
}

module.exports = {
  getUserHouseholdContext,
  processAIChat,
  generateSmartRecommendations,
  generateAISummary,
  generateAIPieChart
};
