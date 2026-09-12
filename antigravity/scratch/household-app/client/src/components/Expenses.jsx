import React, { useState, useEffect, useCallback } from 'react';
import { 
  CreditCard, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Calendar, 
  Filter, 
  Tag, 
  DollarSign, 
  TrendingUp, 
  Download,
  Receipt,
  ShoppingBag,
  Car,
  Zap,
  MoreHorizontal
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { useDataSync } from '../context/DataSyncContext';
import { getCurrencySymbol } from '../utils/currency';
import { IMAGES, getExpenseCategoryImage } from '../visuals';
import PageHero, { CardVisual, EmptyVisualState } from './PageHero';
import PieChart from './Visualizations/PieChart';
import AddExpenseModal from './Modals/AddExpenseModal';

const CATEGORIES = ['All', 'Food', 'Transport', 'Utility', 'Other daily expenses'];

export default function Expenses() {
  const { authFetch, user } = useAuth();
  const { success, error } = useToast();
  const { notifyDataChanged, subscribeToChanges } = useDataSync();
  const currency = getCurrencySymbol(user?.currency);

  const [expenses, setExpenses] = useState([]);
  const [totalExpense, setTotalExpense] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7));

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/expenses?month=${monthFilter}`;
      if (categoryFilter !== 'All') url += `&category=${encodeURIComponent(categoryFilter)}`;
      if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery.trim())}`;

      const res = await authFetch(url);
      if (res.ok) {
        const data = await res.json();
        setExpenses(data.expenses || []);
        setTotalExpense(data.totalExpense || 0);
      }
    } catch (err) {
      console.error('Failed to load expenses:', err);
    } finally {
      setLoading(false);
    }
  }, [authFetch, monthFilter, categoryFilter, searchQuery]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  useEffect(() => {
    const unsub = subscribeToChanges(fetchExpenses);
    return unsub;
  }, [subscribeToChanges, fetchExpenses]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense transaction?')) return;
    setExpenses(prev => prev.filter(e => e.id !== id));
    try {
      const res = await authFetch(`/api/expenses/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete expense');
      success('Expense deleted.');
      notifyDataChanged();
      fetchExpenses();
    } catch (err) {
      error(err.message);
      fetchExpenses();
    }
  };

  // Pie Chart Data: Expenses by Category
  const categoryTotals = {};
  for (const exp of expenses) {
    categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
  }
  const pieSlices = Object.entries(categoryTotals).map(([cat, val]) => ({
    label: cat,
    value: Number(val.toFixed(2)),
    percentage: totalExpense > 0 ? Number(((val / totalExpense) * 100).toFixed(1)) : 0
  }));

  const categoryVisualCards = [
    { title: 'Food & Groceries', cat: 'Food', img: IMAGES.grocery },
    { title: 'Transport & Commute', cat: 'Transport', img: IMAGES.cards },
    { title: 'Daily Utilities', cat: 'Utility', img: IMAGES.power },
    { title: 'Other Living Costs', cat: 'Other daily expenses', img: IMAGES.receipts },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── Visual Page Hero ── */}
      <PageHero
        badge="Daily Ledger"
        icon={CreditCard}
        badgeClass="bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200/60 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300"
        iconClass="text-emerald-500"
        title="Household Daily Expenses"
        subtitle="Receipt Verification, Daily Outlays & Discretionary Purchases"
        description="Record groceries, transit, emergency maintenance, and daily cash transactions. Instant synchronization with your household burn rate and monthly allocation limits."
        image={IMAGES.payments}
        imageAlt="Contactless digital payment terminal and receipt verification"
        imageCaption="Live Expense Registry • Point-of-sale and merchant logs"
      >
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs glass"
          />
          <button
            onClick={() => {
              setEditingExpense(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md shadow-emerald-600/20 btn-press"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense</span>
          </button>
        </div>
      </PageHero>

      {/* ── 4 Category Overview Cards with Real Photography ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {categoryVisualCards.map((card) => {
          const amount = categoryTotals[card.cat] || 0;
          const pct = totalExpense > 0 ? ((amount / totalExpense) * 100).toFixed(0) : 0;
          const isSelected = categoryFilter === card.cat;

          return (
            <div
              key={card.cat}
              onClick={() => setCategoryFilter(categoryFilter === card.cat ? 'All' : card.cat)}
              className={`p-5 rounded-3xl border transition-all duration-200 flex flex-col justify-between cursor-pointer card-hover glass overflow-hidden group ${
                isSelected
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/20'
                  : 'border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 hover:border-emerald-300 dark:hover:border-emerald-700'
              }`}
            >
              <CardVisual src={card.img} alt={card.title} height="h-24" />
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {card.title}
                </span>
                <div className="mt-1.5 flex items-baseline justify-between">
                  <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {currency}{amount.toFixed(2)}
                  </span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md">
                    {pct}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Summary & Pie Chart ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 shadow-sm flex flex-col justify-between glass overflow-hidden group">
          <CardVisual src={IMAGES.receipts} alt="Household expense receipts and invoices" />
          <div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Expenses Recorded
            </span>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                {currency}{totalExpense.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              For {monthFilter} (<strong className="text-slate-700 dark:text-slate-200">{expenses.length}</strong> transaction{expenses.length === 1 ? '' : 's'})
            </p>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
            {Object.entries(categoryTotals).map(([cat, amt]) => (
              <div key={cat} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50">
                <span className="text-slate-600 dark:text-slate-400 font-semibold">{cat}</span>
                <span className="font-extrabold text-slate-900 dark:text-white">
                  {currency}{amt.toFixed(2)} <span className="text-slate-400 font-medium">({((amt / (totalExpense || 1)) * 100).toFixed(0)}%)</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-8 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 shadow-sm flex flex-col justify-center glass">
          <PieChart
            data={pieSlices}
            currency={currency}
            title="Expense Category Distribution"
            subtitle="Breakdown of daily expenditures for the selected period"
            size={220}
          />
        </div>
      </div>

      {/* ── Search & Filter Toolbar ── */}
      <div className="p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 glass">
        {/* Category Pills */}
        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 ${
                categoryFilter === cat
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
          />
        </div>
      </div>

      {/* ── Expenses History Table with Matching Row Visuals ── */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 shadow-sm overflow-hidden glass">
        {expenses.length === 0 ? (
          <EmptyVisualState
            image={IMAGES.receipts}
            title="No Expenses Recorded for this Period"
            message="Log your food, transit, household utility, or grocery expenditures to maintain an audited ledger."
            actionText="+ Add First Expense"
            onAction={() => {
              setEditingExpense(null);
              setIsModalOpen(true);
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-6">Description</th>
                  <th className="py-4 px-6">Category</th>
                  <th className="py-4 px-6">Date</th>
                  <th className="py-4 px-6">Amount</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-4 px-6 font-semibold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 shadow-xs ring-1 ring-slate-200/60 dark:ring-slate-700/60">
                          <img
                            src={getExpenseCategoryImage(exp.category)}
                            alt={exp.category}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{exp.title}</p>
                          {exp.notes && (
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 font-normal">
                              {exp.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-500 dark:text-slate-400 font-medium">
                      {exp.expense_date}
                    </td>
                    <td className="py-4 px-6 font-black text-slate-900 dark:text-white text-sm">
                      {currency}{exp.amount.toFixed(2)}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditingExpense(exp);
                            setIsModalOpen(true);
                          }}
                          title="Edit"
                          className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(exp.id)}
                          title="Delete"
                          className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add / Edit Modal ── */}
      <AddExpenseModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingExpense(null);
        }}
        onSuccess={fetchExpenses}
        initialExpense={editingExpense}
      />
    </div>
  );
}
