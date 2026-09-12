import React, { useState, useEffect, useCallback } from 'react';
import { 
  Target, 
  DollarSign, 
  AlertTriangle, 
  TrendingDown, 
  TrendingUp, 
  CheckCircle2, 
  Edit3, 
  Sparkles, 
  ShieldAlert, 
  ArrowRight, 
  Receipt, 
  CreditCard, 
  Package,
  ShieldCheck,
  Flame,
  PiggyBank
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { useDataSync } from '../context/DataSyncContext';
import { getCurrencySymbol } from '../utils/currency';
import { IMAGES } from '../visuals';
import PageHero, { CardVisual } from './PageHero';
import PieChart from './Visualizations/PieChart';
import SetBudgetModal from './Modals/SetBudgetModal';

export default function Budget({ setActiveTab }) {
  const { authFetch, user } = useAuth();
  const { success } = useToast();
  const { subscribeToChanges } = useDataSync();
  const currency = getCurrencySymbol(user?.currency);

  const [budgetData, setBudgetData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7));
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchBudget = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/budget?month=${monthFilter}`);
      if (res.ok) {
        setBudgetData(await res.json());
      }
    } catch (err) {
      console.error('Failed to load budget data:', err);
    } finally {
      setLoading(false);
    }
  }, [authFetch, monthFilter]);

  useEffect(() => {
    fetchBudget();
  }, [fetchBudget]);

  useEffect(() => {
    const unsub = subscribeToChanges(fetchBudget);
    return unsub;
  }, [subscribeToChanges, fetchBudget]);

  const monthlyBudget = budgetData?.monthlyBudget || 0;
  const totalSpent = budgetData?.totalSpent || 0;
  const remainingMoney = budgetData?.remainingMoney || 0;
  const spentPct = budgetData?.spentPercentage || 0;
  const isRunningLow = budgetData?.isBudgetRunningLow;
  const isExceeded = budgetData?.isBudgetExceeded;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── Visual Page Hero ── */}
      <PageHero
        badge="Capital Allocation"
        icon={Target}
        title="Household Budget Management"
        subtitle="Monthly Targets, Burn Rate & Discretionary Reserve Guardrails"
        description="Configure household spending ceilings, evaluate real-time depletion curves, and safeguard discretionary savings buffers across utility bills and daily market expenses."
        image={IMAGES.budgetCoins}
        imageAlt="Household coins, piggy bank savings and financial budget ledger"
        imageCaption="Live Budget Guardrails • Real-time spend limits & savings targets"
      >
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-xs glass"
          />
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white transition-all shadow-md shadow-sky-500/20 btn-press"
          >
            <Edit3 className="w-4 h-4" />
            <span>{monthlyBudget > 0 ? 'Adjust Budget' : 'Set Budget'}</span>
          </button>
        </div>
      </PageHero>

      {/* ── Alert Banners ── */}
      {isExceeded && (
        <div className="p-5 sm:p-6 rounded-3xl border border-rose-300/80 dark:border-rose-900/60 bg-gradient-to-br from-rose-50/90 to-red-50/50 dark:from-rose-950/40 dark:to-red-950/20 text-rose-950 dark:text-rose-100 flex items-start gap-4 shadow-xs glass animate-slide-in-up">
          <div className="p-2 rounded-2xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300 shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm sm:text-base font-bold">
              Saving Alert: Monthly Budget Exceeded!
            </h3>
            <p className="text-xs mt-1 opacity-90 leading-relaxed">
              Your household spending of <strong>{currency}{totalSpent.toFixed(2)}</strong> has surpassed your allocated monthly budget of <strong>{currency}{monthlyBudget.toFixed(2)}</strong> by <strong>{currency}{(totalSpent - monthlyBudget).toFixed(2)}</strong>. Please review non-essential expenses and defer optional purchases.
            </p>
          </div>
        </div>
      )}

      {isRunningLow && !isExceeded && (
        <div className="p-5 sm:p-6 rounded-3xl border border-amber-300/80 dark:border-amber-900/60 bg-gradient-to-br from-amber-50/90 to-orange-50/50 dark:from-amber-950/40 dark:to-orange-950/20 text-amber-950 dark:text-amber-100 flex items-start gap-4 shadow-xs glass animate-slide-in-up">
          <div className="p-2 rounded-2xl bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-300 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm sm:text-base font-bold">
              Budget-Running-Low Alert ({spentPct.toFixed(0)}% Used)
            </h3>
            <p className="text-xs mt-1 opacity-90 leading-relaxed">
              You have utilized {spentPct.toFixed(0)}% of your monthly allocation. Only <strong>{currency}{remainingMoney.toFixed(2)}</strong> remains for the rest of {monthFilter}.
            </p>
          </div>
        </div>
      )}

      {/* ── 3 Core Metric Cards with Real Financial Photography ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Estimated Budget Card */}
        <div className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 shadow-sm flex flex-col justify-between card-hover glass overflow-hidden group">
          <CardVisual src={IMAGES.budgetCoins} alt="Household budget and coins jar" height="h-24" />
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Monthly Target Budget
              </span>
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <Target className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                {currency}{monthlyBudget.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Configured limit for {monthFilter}
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline text-left flex items-center gap-1"
          >
            <span>Change Budget Target</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Total Money Spent Card */}
        <div className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 shadow-sm flex flex-col justify-between card-hover glass overflow-hidden group">
          <CardVisual src={IMAGES.payments} alt="Money outflows and digital payments" height="h-24" />
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Total Money Spent
              </span>
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                {currency}{totalSpent.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Paid Bills + Daily Expenses + Pantry
            </p>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              Burn Rate: {spentPct.toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Total Money Remaining Card */}
        <div className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 shadow-sm flex flex-col justify-between card-hover glass overflow-hidden group">
          <CardVisual src={IMAGES.savings} alt="Discretionary savings and reserves" height="h-24" />
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Total Money Remaining
              </span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className={`text-3xl sm:text-4xl font-black tracking-tight ${remainingMoney < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {currency}{remainingMoney.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {remainingMoney < 0 ? 'Budget deficit detected' : 'Available discretionary balance'}
            </p>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  spentPct >= 100 ? 'bg-rose-500 shadow-xs shadow-rose-500/50' : spentPct >= 80 ? 'bg-amber-500 shadow-xs shadow-amber-500/50' : 'bg-emerald-500 shadow-xs shadow-emerald-500/50'
                }`}
                style={{ width: `${Math.min(100, spentPct)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Spending Stream Breakdown & Pie Chart ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        <div className="lg:col-span-5 p-6 sm:p-7 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 shadow-sm space-y-4 glass">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Spending Streams ({monthFilter})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Real expenditures computed strictly from stored records.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl overflow-hidden shadow-xs ring-1 ring-slate-200 dark:ring-slate-700 shrink-0">
                  <img src={IMAGES.invoices} alt="Paid bills and rent" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs">Paid Bills & Rent</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Fixed utilities & obligations</p>
                </div>
              </div>
              <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                {currency}{budgetData?.breakdown?.paidBills ? budgetData.breakdown.paidBills.toFixed(2) : '0.00'}
              </span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl overflow-hidden shadow-xs ring-1 ring-slate-200 dark:ring-slate-700 shrink-0">
                  <img src={IMAGES.cards} alt="Daily expenses and cards" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs">Daily Expenses</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Food, transit, daily needs</p>
                </div>
              </div>
              <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                {currency}{budgetData?.breakdown?.dailyExpenses ? budgetData.breakdown.dailyExpenses.toFixed(2) : '0.00'}
              </span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl overflow-hidden shadow-xs ring-1 ring-slate-200 dark:ring-slate-700 shrink-0">
                  <img src={IMAGES.grocery} alt="Pantry groceries restock" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs">Pantry & Groceries</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Market restocks & staples</p>
                </div>
              </div>
              <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                {currency}{budgetData?.breakdown?.pantrySpending ? budgetData.breakdown.pantrySpending.toFixed(2) : '0.00'}
              </span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 p-6 sm:p-7 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 shadow-sm flex flex-col justify-center glass">
          <PieChart
            data={budgetData?.pieSlices || []}
            currency={currency}
            title="Spending Distribution by Stream"
            subtitle="Visual breakdown of total household expenditures"
            size={240}
          />
        </div>
      </div>

      {/* ── Modal ── */}
      <SetBudgetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchBudget}
        currentBudget={monthlyBudget}
        currentMonth={monthFilter}
      />
    </div>
  );
}
