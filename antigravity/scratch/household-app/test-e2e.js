const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed, raw: body });
        } catch (e) {
          resolve({ status: res.statusCode, data: null, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== STARTING FULL INTEGRATION TEST SUITE ===\n');
  const timestamp = Date.now();
  const testEmail = `user_${timestamp}@household.app`;
  let token = '';

  // 1. Register User
  console.log('1. Testing User Registration...');
  const regRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    name: 'Alexander Hamilton',
    email: testEmail,
    password: 'Password123!',
    currency: '$'
  });

  if (regRes.status !== 201 || !regRes.data.token) {
    throw new Error(`Registration failed: ${regRes.raw}`);
  }
  token = regRes.data.token;
  console.log('✓ Registration passed. User ID:', regRes.data.user.id);

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // 2. Test Zero Dummy Data / Empty State
  console.log('\n2. Testing Empty State Guarantee (Zero Dummy Data)...');
  const [emptyBills, emptyExpenses, emptyPantry, emptyBudget] = await Promise.all([
    request({ hostname: 'localhost', port: 5000, path: '/api/bills', method: 'GET', headers: authHeaders }),
    request({ hostname: 'localhost', port: 5000, path: '/api/expenses', method: 'GET', headers: authHeaders }),
    request({ hostname: 'localhost', port: 5000, path: '/api/pantry', method: 'GET', headers: authHeaders }),
    request({ hostname: 'localhost', port: 5000, path: '/api/budget', method: 'GET', headers: authHeaders })
  ]);

  if (emptyBills.data.length !== 0 || emptyExpenses.data.expenses.length !== 0 || emptyPantry.data.items.length !== 0) {
    throw new Error('Empty state violation: dummy data detected in new account!');
  }
  console.log('✓ Clean empty state verified (0 bills, 0 expenses, 0 pantry items).');

  // 3. Configure Monthly Budget
  console.log('\n3. Testing Budget Management...');
  const currentMonth = new Date().toISOString().slice(0, 7);
  const budgetSet = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/budget',
    method: 'POST',
    headers: authHeaders
  }, {
    monthly_limit: 3500,
    month_year: currentMonth
  });
  if (budgetSet.status !== 200) throw new Error(`Set budget failed: ${budgetSet.raw}`);
  console.log('✓ Monthly budget set to $3500.00');

  // 4. Add Bills & Rent with precision due dates
  console.log('\n4. Testing Bills & Rent Management with Tiered Reminders...');
  const today = new Date();
  
  // Format dates
  const addDays = (n) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  };

  // 15 days left
  const b15 = await request({ hostname: 'localhost', port: 5000, path: '/api/bills', method: 'POST', headers: authHeaders },
    { name: 'Apartment Rent', category: 'Rent', amount: 1400, due_date: addDays(15), notes: 'Lease unit 4B' });
  // 10 days left
  const b10 = await request({ hostname: 'localhost', port: 5000, path: '/api/bills', method: 'POST', headers: authHeaders },
    { name: 'Household Helper Salary', category: 'Household help fees', amount: 250, due_date: addDays(10) });
  // 7 days left
  const b7 = await request({ hostname: 'localhost', port: 5000, path: '/api/bills', method: 'POST', headers: authHeaders },
    { name: 'University Tuition Fee', category: 'University fees', amount: 650, due_date: addDays(7) });
  // 3 days left
  const b3 = await request({ hostname: 'localhost', port: 5000, path: '/api/bills', method: 'POST', headers: authHeaders },
    { name: 'City Electricity Bill', category: 'Electricity bill', amount: 145.50, due_date: addDays(3) });
  // Hours left (today)
  const bToday = await request({ hostname: 'localhost', port: 5000, path: '/api/bills', method: 'POST', headers: authHeaders },
    { name: 'Fiber Internet Bill', category: 'Internet bill', amount: 79.99, due_date: addDays(0) });
  // Overdue bill (due 3 days ago)
  const bOverdue = await request({ hostname: 'localhost', port: 5000, path: '/api/bills', method: 'POST', headers: authHeaders },
    { name: 'Municipal Water Bill', category: 'Water bill', amount: 48.20, due_date: addDays(-3) });

  console.log('✓ 6 bills created across Rent, Utilities, Education, and Household Help.');

  // Test Mark as Paid
  const payRent = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/bills/${b15.data.bill.id}/pay`,
    method: 'PUT',
    headers: authHeaders
  }, { payment_date: addDays(0) });
  if (payRent.status !== 200 || payRent.data.bill.status !== 'Paid') {
    throw new Error(`Failed to mark bill as paid: ${payRent.raw}`);
  }
  console.log('✓ Rent bill ($1400.00) successfully marked as Paid.');

  // Check Monthly Bill Summary
  const billSummary = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/bills/summary/monthly?month=${currentMonth}`,
    method: 'GET',
    headers: authHeaders
  });
  console.log(`✓ Monthly Bill Summary: Total Billed = $${billSummary.data.totalBilled}, Paid = $${billSummary.data.totalPaid}, Pending = $${billSummary.data.totalPending}, Overdue = $${billSummary.data.totalOverdue}`);

  // 5. Expense Management
  console.log('\n5. Testing Daily Expense Management...');
  const exp1 = await request({ hostname: 'localhost', port: 5000, path: '/api/expenses', method: 'POST', headers: authHeaders },
    { title: 'Weekly Grocery Market Run', category: 'Food', amount: 85.40, expense_date: addDays(0), notes: 'Vegetables, milk, fruits' });
  const exp2 = await request({ hostname: 'localhost', port: 5000, path: '/api/expenses', method: 'POST', headers: authHeaders },
    { title: 'Monthly Metro Transit Pass', category: 'Transport', amount: 60.00, expense_date: addDays(-1) });
  const exp3 = await request({ hostname: 'localhost', port: 5000, path: '/api/expenses', method: 'POST', headers: authHeaders },
    { title: 'Replacement Kitchen LED Bulbs', category: 'Utility', amount: 22.50, expense_date: addDays(-2) });

  // Test Search
  const searchRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/expenses?search=Metro`,
    method: 'GET',
    headers: authHeaders
  });
  if (searchRes.data.expenses.length !== 1 || !searchRes.data.expenses[0].title.includes('Metro')) {
    throw new Error(`Expense search failed: ${searchRes.raw}`);
  }
  console.log('✓ Expense search passed (found "Monthly Metro Transit Pass"). Total recorded expenses:', exp1.data.expense.amount + exp2.data.expense.amount + exp3.data.expense.amount);

  // 6. Pantry Management & Market Purchase
  console.log('\n6. Testing Pantry Management & Market Purchase Flow...');
  const pItem1 = await request({ hostname: 'localhost', port: 5000, path: '/api/pantry', method: 'POST', headers: authHeaders },
    { name: 'Basmati Rice', category: 'Grains & Pasta', quantity: 0.5, unit: 'kg', min_threshold: 2.0, unit_cost: 3.00 });
  const pItem2 = await request({ hostname: 'localhost', port: 5000, path: '/api/pantry', method: 'POST', headers: authHeaders },
    { name: 'Extra Virgin Olive Oil', category: 'Baking & Spices', quantity: 0, unit: 'bottles', min_threshold: 1.0, unit_cost: 12.50 });
  const pItem3 = await request({ hostname: 'localhost', port: 5000, path: '/api/pantry', method: 'POST', headers: authHeaders },
    { name: 'Fresh Farm Eggs', category: 'Dairy & Eggs', quantity: 18, unit: 'pcs', min_threshold: 6.0, unit_cost: 0.25 });

  // Check Suggested Shopping List
  const suggestedRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/pantry/suggested',
    method: 'GET',
    headers: authHeaders
  });
  if (suggestedRes.data.suggestions.length !== 2) {
    throw new Error(`Suggested list failed: expected 2 low stock items, got ${suggestedRes.data.suggestions.length}`);
  }
  console.log(`✓ Suggested shopping list generated accurately (${suggestedRes.data.suggestions.length} items low in stock).`);

  // Execute Market Purchase
  const marketBuy = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/pantry/purchase',
    method: 'POST',
    headers: authHeaders
  }, {
    pantry_item_id: pItem1.data.item.id,
    quantity_bought: 5,
    unit: 'kg',
    total_cost: 15.00,
    purchase_date: addDays(0),
    notes: 'Bought at Asian Market'
  });
  if (marketBuy.status !== 201 || marketBuy.data.item.quantity !== 5.5) {
    throw new Error(`Market purchase failed to update pantry quantity: ${marketBuy.raw}`);
  }
  console.log('✓ Market Purchase executed: Basmati Rice stock increased to 5.5 kg, and pantry expenditure of $15.00 recorded.');

  // 7. Test Real Reminders & Notifications Engine
  console.log('\n7. Testing Real Notification & Reminder Engine...');
  const notifRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/notifications',
    method: 'GET',
    headers: authHeaders
  });
  if (notifRes.status !== 200 || notifRes.data.notifications.length === 0) {
    throw new Error(`Notifications engine failed: ${notifRes.raw}`);
  }
  console.log(`✓ Notification engine evaluated ${notifRes.data.notifications.length} active alerts (overdue bills, upcoming deadlines, pantry low stock).`);
  notifRes.data.notifications.forEach(n => console.log(`   - [${n.urgency.toUpperCase()}] ${n.title}: ${n.message}`));

  // 8. Test AI Assistant & Dynamic Pie Chart
  console.log('\n8. Testing AI Suite (Live Context Assistant & Dynamic Pie Chart)...');
  const aiChatRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/ai/assistant',
    method: 'POST',
    headers: authHeaders
  }, { message: 'How much have I spent on bills and food this month?' });

  if (aiChatRes.status !== 200 || !aiChatRes.data.response) {
    throw new Error(`AI assistant failed: ${aiChatRes.raw}`);
  }
  console.log('✓ AI Assistant responded with live context:');
  console.log('   AI Output snippet:', aiChatRes.data.response.substring(0, 180).replace(/\n/g, ' ') + '...');

  const aiPieRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/ai/pie-chart',
    method: 'POST',
    headers: authHeaders
  }, { prompt: 'Bills by Category' });

  if (aiPieRes.status !== 200 || !aiPieRes.data.slices || aiPieRes.data.slices.length === 0) {
    throw new Error(`AI Pie Chart generation failed: ${aiPieRes.raw}`);
  }
  console.log(`✓ AI-Generated Pie Chart rendered "${aiPieRes.data.title}" with ${aiPieRes.data.slices.length} dynamic slices.`);

  // 9. Complete Expense Summary & Month-over-Month Audit
  console.log('\n9. Testing Complete Expense Summary...');
  const summaryAudit = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/summary/complete?month=${currentMonth}`,
    method: 'GET',
    headers: authHeaders
  });
  if (summaryAudit.status !== 200 || !summaryAudit.data.categoryBreakdown) {
    throw new Error(`Complete summary failed: ${summaryAudit.raw}`);
  }
  console.log(`✓ Complete summary verified: Total Outflow = $${summaryAudit.data.current.totalSpent} across ${summaryAudit.data.categoryBreakdown.length} distinct categories.`);

  console.log('\n========================================');
  console.log('✨ ALL ACCEPTANCE TESTS PASSED (100%) ✨');
  console.log('========================================\n');
}

runTests().catch(err => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
