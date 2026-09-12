import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, 
  Printer, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  ArrowRight, 
  PieChart as PieIcon, 
  Receipt, 
  CreditCard, 
  Package, 
  CheckCircle2, 
  BarChart3
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDataSync } from '../context/DataSyncContext';
import { getCurrencySymbol } from '../utils/currency';
import { IMAGES, getBillCategoryImage } from '../visuals';
import PageHero, { CardVisual, EmptyVisualState } from './PageHero';
import PieChart from './Visualizations/PieChart';

export default function ExpenseSummary() {
  const { authFetch, user } = useAuth();
  const { subscribeToChanges } = useDataSync();
  const currency = getCurrencySymbol(user?.currency);

  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/summary/complete?month=${month}`);
      if (res.ok) {
        setSummaryData(await res.json());
      }
    } catch (err) {
      console.error('Failed to load complete summary:', err);
    } finally {
      setLoading(false);
    }
  }, [authFetch, month]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    const unsub = subscribeToChanges(fetchSummary);
    return unsub;
  }, [subscribeToChanges, fetchSummary]);

  const current = summaryData?.current;
  const previous = summaryData?.previous;
  const categoryBreakdown = summaryData?.categoryBreakdown || [];

  const handlePrint = () => {
    window.print();
  };

  const diffAmount = (current?.totalSpent || 0) - (previous?.totalSpent || 0);
  const diffPct = previous?.totalSpent > 0 ? ((diffAmount / previous.totalSpent) * 100).toFixed(1) : null;

  return (
    <div className="space-y-8 animate-fade-in print:p-0">
      {/* ── Visual Page Hero ── */}
      <PageHero
        badge="Audit & Financial Report"
        icon={FileText}
        badgeClass="bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200/60 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300"
        iconClass="text-indigo-500"
        title="Complete Expense Summary"
        subtitle="Consolidated Household Audits, MoM Comparisons & Print Statements"
        description="Comprehensive audit of all household financial outflows. Analyze utility bills against daily living expenses and evaluate historical variance against prior periods."
        image={IMAGES.charts}
        imageAlt="Financial audit statement, spreadsheets and graphical charts"
        imageCaption="Financial Audit Report • Consolidated statements & visual comparisons"
        printHidden={true}
      >
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-xs glass"
          />
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-all shadow-xs btn-press glass"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print Report</span>
          </button>
        </div>
      </PageHero>

      {/* ── Printable Title Banner ── */}
      <div className="hidden print:block text-center border-b pb-4 mb-6">
        <h1 className="text-2xl font-bold">HomeSphere Household Ledger Summary</h1>
        <p className="text-sm text-slate-600">Period: {month} • Generated for {user?.name}</p>
      </div>

      {/* ── Overview Cards with Real Photography ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 shadow-sm card-hover glass overflow-hidden group">
          <CardVisual src={IMAGES.charts} alt="Total monthly outflow analytics" height="h-24" />
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Monthly Outflow
          </span>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              {currency}{current?.totalSpent ? current.totalSpent.toFixed(2) : '0.00'}
            </span>
          </div>
          {diffPct !== null && (
            <p className={`text-xs font-bold mt-2 flex items-center gap-1 ${diffAmount > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
              {diffAmount > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span>{Math.abs(Number(diffPct))}% vs previous month</span>
            </p>
          )}
        </div>

        <div className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 shadow-sm card-hover glass overflow-hidden group">
          <CardVisual src={IMAGES.invoices} alt="Paid bills and rent statements" height="h-24" />
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Paid Bills & Rent
          </span>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-sky-600 dark:text-sky-400 tracking-tight">
              {currency}{current?.paidBills ? current.paidBills.toFixed(2) : '0.00'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            <strong className="text-slate-700 dark:text-slate-200">{current?.billsCount || 0}</strong> bill record(s) settled
          </p>
        </div>

        <div className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 shadow-sm card-hover glass overflow-hidden group">
          <CardVisual src={IMAGES.payments} alt="Daily expenses card terminal" height="h-24" />
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Daily Expenses
          </span>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
              {currency}{current?.dailyExpenses ? current.dailyExpenses.toFixed(2) : '0.00'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            <strong className="text-slate-700 dark:text-slate-200">{current?.expensesCount || 0}</strong> daily transaction(s)
          </p>
        </div>

        <div className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 shadow-sm card-hover glass overflow-hidden group">
          <CardVisual src={IMAGES.grocery} alt="Pantry grocery market purchases" height="h-24" />
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Pantry Purchases
          </span>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
              {currency}{current?.pantrySpending ? current.pantrySpending.toFixed(2) : '0.00'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            <strong className="text-slate-700 dark:text-slate-200">{current?.pantryPurchasesCount || 0}</strong> market restock(s)
          </p>
        </div>
      </div>

      {/* ── Primary Category Distribution Pie Chart ── */}
      <div className="p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 shadow-sm flex flex-col justify-center glass">
        <PieChart
          data={categoryBreakdown}
          currency={currency}
          title={`All Expenditures by Category (${month})`}
          subtitle="Consolidated distribution across bills, daily expenses, and pantry restocks"
          size={260}
        />
      </div>

      {/* ── Month-over-Month Comparison Section ── */}
      <div className="p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 shadow-sm space-y-6 glass">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Month-over-Month Comparison
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Compare spending distribution between {summaryData?.currentMonth} and {summaryData?.previousMonth}.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 pt-2">
          {/* Current Month Pie */}
          <div className="p-6 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 flex flex-col items-center">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">
              Current Month: {summaryData?.currentMonth} ({currency}{current?.totalSpent ? current.totalSpent.toFixed(2) : '0.00'})
            </h4>
            <PieChart
              data={current?.pie || []}
              currency={currency}
              title=""
              size={200}
            />
          </div>

          {/* Previous Month Pie */}
          <div className="p-6 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 flex flex-col items-center">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">
              Previous Month: {summaryData?.previousMonth} ({currency}{previous?.totalSpent ? previous.totalSpent.toFixed(2) : '0.00'})
            </h4>
            <PieChart
              data={previous?.pie || []}
              currency={currency}
              title=""
              size={200}
            />
          </div>
        </div>
      </div>

      {/* ── Comprehensive Category Table ── */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 shadow-sm overflow-hidden glass">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Category Breakdown Ledger
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Detailed spending amounts and proportional weight per household category
          </p>
        </div>

        {categoryBreakdown.length === 0 ? (
          <EmptyVisualState
            image={IMAGES.charts}
            title="No Expenditures Recorded for This Period"
            message="No bills, expenses, or pantry restocks recorded for this calendar month yet."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-6">Expense Category</th>
                  <th className="py-4 px-6">Total Spent</th>
                  <th className="py-4 px-6">Percentage of Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {categoryBreakdown.map((cat, idx) => {
                  const catImg = getBillCategoryImage(cat.label);
                  return (
                    <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-4 px-6 font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 shadow-xs ring-1 ring-slate-200 dark:ring-slate-700">
                            <img src={catImg} alt={cat.label} className="w-full h-full object-cover" />
                          </div>
                          <span>{cat.label}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-black text-slate-900 dark:text-white text-sm">
                        {currency}{cat.value.toFixed(2)}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-28 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden p-0.5">
                            <div
                              className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full"
                              style={{ width: `${cat.percentage}%` }}
                            />
                          </div>
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {cat.percentage}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
