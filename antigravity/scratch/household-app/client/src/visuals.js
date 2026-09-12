export const IMAGES = {
  hero: '/images/hero-billing.jpg',
  invoices: '/images/invoices.jpg',
  payments: '/images/payments.jpg',
  analytics: '/images/analytics.jpg',
  cards: '/images/cards-wallet.jpg',
  power: '/images/utilities-power.jpg',
  water: '/images/utilities-water.jpg',
  gas: '/images/utilities-gas.jpg',
  internet: '/images/utilities-internet.jpg',
  education: '/images/fees-education.jpg',
  charts: '/images/finance-charts.jpg',
  budgetCoins: '/images/budget-coins.jpg',
  savings: '/images/savings.jpg',
  receipts: '/images/receipts.jpg',
  grocery: '/images/grocery-spend.jpg',
  pantryStock: '/images/pantry-stock.jpg',
  aiChip: '/images/ai-chip.jpg',
  ledgerAudit: '/images/ledger-audit.jpg',
};

export const getBillCategoryImage = (category) => {
  const cat = (category || '').toLowerCase();
  if (cat.includes('electric')) return IMAGES.power;
  if (cat.includes('water')) return IMAGES.water;
  if (cat.includes('gas')) return IMAGES.gas;
  if (cat.includes('internet') || cat.includes('wifi')) return IMAGES.internet;
  if (cat.includes('school') || cat.includes('college') || cat.includes('university') || cat.includes('education')) return IMAGES.education;
  if (cat.includes('shopping') || cat.includes('package')) return IMAGES.payments;
  if (cat.includes('rent') || cat.includes('household')) return IMAGES.invoices;
  return IMAGES.receipts;
};

export const getExpenseCategoryImage = (category) => {
  const cat = (category || '').toLowerCase();
  if (cat.includes('food')) return IMAGES.grocery;
  if (cat.includes('transport')) return IMAGES.cards;
  if (cat.includes('utilit')) return IMAGES.power;
  return IMAGES.receipts;
};
