import React, { useState, useEffect, useCallback } from 'react';
import { 
  DollarSign, 
  Receipt, 
  CreditCard, 
  Package, 
  AlertTriangle, 
  Plus, 
  ArrowUpRight, 
  Clock, 
  Sparkles,
  TrendingDown,
  TrendingUp,
  ShoppingCart,
  CheckCircle2,
  RefreshCw,
  Calendar,
  Wallet,
  ArrowRight,
  ShieldAlert,
  Activity
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDataSync } from '../context/DataSyncContext';
import { getCurrencySymbol } from '../utils/currency';
import { IMAGES, getExpenseCategoryImage } from '../visuals';
import PageHero, { CardVisual, InlineVisual, EmptyVisualState } from './PageHero';
import PieChart from './Visualizations/PieChart';
import AddBillModal from './Modals/AddBillModal';
import AddExpenseModal from './Modals/AddExpenseModal';
import AddPantryModal from './Modals/AddPantryModal';
import MarketPurchaseModal from './Modals/MarketPurchaseModal';
import SetBudgetModal from './Modals/SetBudgetModal';

export default function Dashboard({ setActiveTab }) {
  const { authFetch, user } = useAuth();
  const { subscribeToChanges } = useDataSync();
  const currency = getCurrencySymbol(user?.currency);

  const [loading, setLoading] = useState(true);
  const [budgetData, setBudgetData] = useState(null);
  const [bills, setBills] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [pantryData, setPantryData] = useState(null);
  const [notifications, setNotifications] = useState([]);

  // Modals state
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isPantryModalOpen, setIsPantryModalOpen] = useState(false);
  const [isMarketModalOpen, setIsMarketModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);

      const [budgetRes, billsRes, expRes, pantryRes, notifRes] = await Promise.all([
        authFetch(`/api/budget?month=${currentMonth}`),
        authFetch(`/api/bills?month=${currentMonth}`),
        authFetch(`/api/expenses?month=${currentMonth}`),
        authFetch('/api/pantry'),
        authFetch('/api/notifications')
      ]);

      if (budgetRes.ok) setBudgetData(await budgetRes.json());
      if (billsRes.ok) setBills(await billsRes.json());
      if (expRes.ok) {
        const expData = await expRes.json();
        setExpenses(expData.expenses || []);
      }
      if (pantryRes.ok) setPantryData(await pantryRes.json());
      if (notifRes.ok) {
        const notifData = await notifRes.json();
        setNotifications(notifData.notifications || []);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    const unsub = subscribeToChanges(fetchDashboardData);
    return unsub;
  }, [subscribeToChanges, fetchDashboardData]);

  const unpaidBills = bills.filter(b => b.status !== 'Paid');
  const overdueBills = bills.filter(b => b.status === 'Overdue');
  const totalUnpaidAmount = unpaidBills.reduce((acc, b) => acc + b.amount, 0);

  const lowStockPantryItems = pantryData?.lowStockItems || [];
  const urgentAlerts = notifications.filter(n => n.urgency === 'danger' || n.urgency === 'warning');

  // Greeting helper
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── Strong Visual Hero Section ── */}
      <PageHero
        badge={`${greeting}, ${user?.name || 'HomeSphere User'}`}
        icon={Sparkles}
        title="Home Billing Management System"
        subtitle="Household Financial & Utilities Intelligence"
        description="Comprehensive real-time tracking for electricity, water, gas, internet, rent, daily living expenses, and smart pantry restock. All records synchronized with automated tiered deadline alerts."
        image={IMAGES.hero}
        imageAlt="Household billing documents, invoices, calculator and tax records on desk"
        imageCaption="Active Ledger • Invoices, utilities, payments & budget balance"
      >
        <button
          onClick={fetchDashboardData}
          title="Refresh Dashboard"
          className="p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-all shadow-xs btn-press"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-500' : ''}`} />
        </button>

        <button
          onClick={() => setIsExpenseModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md shadow-emerald-600/25 hover:shadow-emerald-600/35 btn-press"
        >
          <Plus className="w-4 h-4" />
          <span>Add Expense</span>
        </button>

        <button
          onClick={() => setIsBillModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white transition-all shadow-md shadow-sky-600/25 hover:shadow-sky-600/35 btn-press"
        >
          <Plus className="w-4 h-4" />
          <span>Add Bill</span>
        </button>
      </PageHero>

      {/* ── Urgent Alerts Banner (if any) ── */}
      {urgentAlerts.length > 0 && (
        <div className="space-y-2.5 animate-slide-in-up">
          {urgentAlerts.slice(0, 2).map((alert) => (
            <div
              key={alert.id}
              className={`p-4 sm:p-5 rounded-3xl border flex items-center justify-between gap-4 transition-all shadow-xs ${
                alert.urgency === 'danger'
                  ? 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-950 dark:text-rose-100'
                  : 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 text-amber-950 dark:text-amber-100'
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className={`p-2.5 rounded-2xl shrink-0 ${
                  alert.urgency === 'danger'
                    ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300'
                    : 'bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-300'
                }`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold truncate">{alert.title}</p>
                  <p className="text-xs opacity-90 truncate mt-0.5">{alert.message}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (alert.type === 'bill_reminder') setActiveTab('bills');
                  else if (alert.type === 'pantry_low') setActiveTab('pantry');
                  else setActiveTab('budget');
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 transition-colors shadow-xs"
              >
                Review →
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── 4 Main KPI Cards with Real Matching Visuals ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* 1. Monthly Budget Card */}
        <div className="p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 shadow-sm relative overflow-hidden flex flex-col justify-between card-hover glass group">
          <CardVisual src={IMAGES.budgetCoins} alt="Household budget and coins savings" />
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Monthly Budget
              </span>
              <button
                onClick={() => setIsBudgetModalOpen(true)}
                className="text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/60 transition-colors"
              >
                {budgetData?.monthlyBudget > 0 ? 'Edit' : '+ Set'}
              </button>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {currency}{budgetData?.monthlyBudget ? budgetData.monthlyBudget.toFixed(2) : '0.00'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
              <span>Total Spent:</span>
              <strong className="text-slate-700 dark:text-slate-200 font-bold">{currency}{budgetData?.totalSpent ? budgetData.totalSpent.toFixed(2) : '0.00'}</strong>
            </p>
          </div>

          <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center justify-between text-xs font-medium mb-2">
              <span className="text-slate-500">Remaining Limit</span>
              <span className={`font-extrabold ${budgetData?.remainingMoney < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {currency}{budgetData?.remainingMoney !== undefined ? budgetData.remainingMoney.toFixed(2) : '0.00'}
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  (budgetData?.spentPercentage || 0) >= 100
                    ? 'bg-rose-500 shadow-sm shadow-rose-500/50'
                    : (budgetData?.spentPercentage || 0) >= 80
                    ? 'bg-amber-500 shadow-sm shadow-amber-500/50'
                    : 'bg-sky-500 shadow-sm shadow-sky-500/50'
                }`}
                style={{ width: `${Math.min(100, budgetData?.spentPercentage || 0)}%` }}
              />
            </div>
          </div>
        </div>

        {/* 2. Unpaid Bills Card */}
        <div 
          onClick={() => setActiveTab('bills')}
          className="p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 shadow-sm cursor-pointer hover:border-sky-300 dark:hover:border-sky-700 transition-all flex flex-col justify-between card-hover glass group"
        >
          <CardVisual src={IMAGES.invoices} alt="Household utility bills and invoices" />
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Unpaid Bills
              </span>
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 group-hover:scale-110 transition-transform">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {currency}{totalUnpaidAmount.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              <strong className="text-slate-700 dark:text-slate-200">{unpaidBills.length}</strong> pending ({overdueBills.length} overdue)
            </p>
          </div>

          <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-sky-600 dark:text-sky-400 font-bold">
            <span>Manage Bills & Rent</span>
            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </div>

        {/* 3. Daily Expenses Card */}
        <div 
          onClick={() => setActiveTab('expenses')}
          className="p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 shadow-sm cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700 transition-all flex flex-col justify-between card-hover glass group"
        >
          <CardVisual src={IMAGES.payments} alt="Card contactless digital payment" />
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Daily Expenses
              </span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {currency}{budgetData?.breakdown?.dailyExpenses ? budgetData.breakdown.dailyExpenses.toFixed(2) : '0.00'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              <strong className="text-slate-700 dark:text-slate-200">{expenses.length}</strong> transaction(s) recorded
            </p>
          </div>

          <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-bold">
            <span>View Expense Log</span>
            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </div>

        {/* 4. Pantry Stock Card */}
        <div 
          onClick={() => setActiveTab('pantry')}
          className="p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 shadow-sm cursor-pointer hover:border-amber-300 dark:hover:border-amber-700 transition-all flex flex-col justify-between card-hover glass group"
        >
          <CardVisual src={IMAGES.pantryStock} alt="Pantry household groceries and staples" />
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Pantry Inventory
              </span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className={`text-2xl sm:text-3xl font-black ${lowStockPantryItems.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'} tracking-tight`}>
                {lowStockPantryItems.length} Low
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Out of <strong className="text-slate-700 dark:text-slate-200">{pantryData?.totalCount || 0}</strong> total staples tracked
            </p>
          </div>

          <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-amber-600 dark:text-amber-400 font-bold">
            <span>View Suggested List</span>
            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </div>
      </div>

      {/* ── Visualizations & Activity Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        
        {/* Pie Chart Card */}
        <div className="lg:col-span-6 p-6 sm:p-7 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 shadow-sm flex flex-col justify-between glass">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/50 text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1">
                Visual Analytics
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Monthly Spending Distribution
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Bills vs Daily Expenses vs Pantry Purchases
              </p>
            </div>
            <button
              onClick={() => setActiveTab('summary')}
              className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 transition-colors shadow-xs"
            >
              Full Summary →
            </button>
          </div>

          <div className="py-4">
            <PieChart
              data={budgetData?.pieSlices || []}
              currency={currency}
              title=""
              size={240}
            />
          </div>
        </div>

        {/* Right Side: Quick AI Card & Recent Expenses */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Quick AI Assistant Card with Real Visual */}
          <div className="p-6 rounded-3xl border border-sky-200/80 dark:border-sky-900/60 bg-gradient-to-br from-sky-50/90 via-indigo-50/60 to-violet-50/50 dark:from-sky-950/50 dark:via-indigo-950/40 dark:to-violet-950/40 shadow-sm flex flex-col justify-between glass overflow-hidden relative">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-sky-500/25 shrink-0">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Household AI Assistant
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                    Get instant insights on upcoming bills, pantry restock, and monthly savings.
                  </p>
                </div>
              </div>
              <div className="hidden sm:block w-20 h-16 rounded-xl overflow-hidden shadow-md ring-1 ring-white/50 dark:ring-white/10 shrink-0">
                <img src={IMAGES.aiChip} alt="AI Intelligence Processor" className="w-full h-full object-cover" />
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-sky-200/60 dark:border-sky-900/40 flex items-center justify-between flex-wrap gap-2">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                Live Data Synthesizer
              </span>
              <button
                onClick={() => setActiveTab('ai')}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-sky-500/20 btn-press"
              >
                Launch AI Suite →
              </button>
            </div>
          </div>

          {/* Recent Expenses List with Real Visuals */}
          <div className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 shadow-sm glass">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Recent Expenses
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Latest recorded purchases and payments
                </p>
              </div>
              <button
                onClick={() => setActiveTab('expenses')}
                className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                View all ({expenses.length}) →
              </button>
            </div>

            {expenses.length === 0 ? (
              <EmptyVisualState
                image={IMAGES.receipts}
                title="No Expenses Logged This Month"
                message="Add daily household purchases such as groceries, fuel, or utilities to maintain your ledger."
                actionText="+ Add First Expense"
                onAction={() => setIsExpenseModalOpen(true)}
              />
            ) : (
              <div className="space-y-2.5">
                {expenses.slice(0, 4).map((exp) => (
                  <div
                    key={exp.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-3">
                      <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 shadow-xs ring-1 ring-slate-200/60 dark:ring-slate-700/60">
                        <img
                          src={getExpenseCategoryImage(exp.category)}
                          alt={exp.category}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                          {exp.title}
                        </p>
                        <p className="text-slate-400 text-[11px] mt-0.5">
                          {exp.category} • {exp.expense_date}
                        </p>
                      </div>
                    </div>
                    <span className="font-extrabold text-slate-900 dark:text-white shrink-0 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700/60 shadow-xs">
                      {currency}{exp.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      <AddBillModal
        isOpen={isBillModalOpen}
        onClose={() => setIsBillModalOpen(false)}
        onSuccess={fetchDashboardData}
      />
      <AddExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSuccess={fetchDashboardData}
      />
      <AddPantryModal
        isOpen={isPantryModalOpen}
        onClose={() => setIsPantryModalOpen(false)}
        onSuccess={fetchDashboardData}
      />
      <MarketPurchaseModal
        isOpen={isMarketModalOpen}
        onClose={() => setIsMarketModalOpen(false)}
        onSuccess={fetchDashboardData}
        pantryItems={pantryData?.items || []}
      />
      <SetBudgetModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        onSuccess={fetchDashboardData}
        currentBudget={budgetData?.monthlyBudget || 0}
        currentMonth={budgetData?.month}
      />
    </div>
  );
}
