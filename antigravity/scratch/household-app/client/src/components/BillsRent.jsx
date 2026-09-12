import React, { useState, useEffect, useCallback } from 'react';
import { 
  Receipt, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Trash2, 
  Edit3, 
  Calendar, 
  DollarSign, 
  Search, 
  Filter, 
  RefreshCw, 
  Tag,
  Check,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { useDataSync } from '../context/DataSyncContext';
import { getCurrencySymbol } from '../utils/currency';
import { IMAGES, getBillCategoryImage } from '../visuals';
import PageHero, { CardVisual, EmptyVisualState } from './PageHero';
import PieChart from './Visualizations/PieChart';
import AddBillModal from './Modals/AddBillModal';

const CATEGORIES = [
  'All',
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

export default function BillsRent() {
  const { authFetch, user } = useAuth();
  const { success, error } = useToast();
  const { notifyDataChanged, subscribeToChanges } = useDataSync();
  const currency = getCurrencySymbol(user?.currency);

  const [bills, setBills] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'paid' | 'overdue'
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7));

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState(null);

  const fetchBillsAndSummary = useCallback(async () => {
    setLoading(true);
    try {
      const [billsRes, summaryRes] = await Promise.all([
        authFetch(`/api/bills?month=${monthFilter}`),
        authFetch(`/api/bills/summary/monthly?month=${monthFilter}`)
      ]);

      if (billsRes.ok) {
        setBills(await billsRes.json());
      }
      if (summaryRes.ok) {
        setSummary(await summaryRes.json());
      }
    } catch (err) {
      console.error('Failed to load bills:', err);
    } finally {
      setLoading(false);
    }
  }, [authFetch, monthFilter]);

  useEffect(() => {
    fetchBillsAndSummary();
  }, [fetchBillsAndSummary]);

  useEffect(() => {
    const unsub = subscribeToChanges(fetchBillsAndSummary);
    return unsub;
  }, [subscribeToChanges, fetchBillsAndSummary]);

  const handleMarkPaid = async (bill) => {
    setBills(prev => prev.map(b => b.id === bill.id ? { ...b, status: 'Paid', payment_date: new Date().toISOString().slice(0, 10) } : b));
    try {
      const res = await authFetch(`/api/bills/${bill.id}/pay`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_date: new Date().toISOString().slice(0, 10) })
      });
      if (!res.ok) throw new Error('Failed to mark bill as paid');
      success(`Bill "${bill.name}" marked as Paid.`);
      notifyDataChanged();
      fetchBillsAndSummary();
    } catch (err) {
      error(err.message);
      fetchBillsAndSummary();
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this bill record?')) return;
    setBills(prev => prev.filter(b => b.id !== id));
    try {
      const res = await authFetch(`/api/bills/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete bill');
      success('Bill deleted successfully.');
      notifyDataChanged();
      fetchBillsAndSummary();
    } catch (err) {
      error(err.message);
      fetchBillsAndSummary();
    }
  };

  // 7-Tier Reminder Engine Tag
  const getReminderTag = (dueDate, status) => {
    if (status === 'Paid') return null;

    const today = new Date();
    const due = new Date(dueDate + 'T23:59:59');
    const diffMs = due.getTime() - today.getTime();
    const diffHours = diffMs / (1000 * 3600);
    const diffDays = Math.ceil(diffHours / 24);

    if (diffMs < 0) {
      const daysOver = Math.abs(diffDays) === 0 ? 1 : Math.abs(diffDays);
      return { text: `Overdue by ${daysOver}d`, color: 'bg-rose-500 text-white shadow-xs shadow-rose-500/30' };
    }
    if (diffHours <= 24) {
      return { text: `Due Today (${Math.max(1, Math.round(diffHours))}h left)`, color: 'bg-rose-500 text-white animate-pulse shadow-xs shadow-rose-500/30' };
    }
    if (diffDays === 1) {
      return { text: '1 Day Left', color: 'bg-rose-500 text-white shadow-xs shadow-rose-500/30' };
    }
    if (diffDays <= 4) {
      return { text: `${diffDays} Days Left`, color: 'bg-amber-500 text-white shadow-xs shadow-amber-500/30' };
    }
    if (diffDays <= 7) {
      return { text: `${diffDays} Days Left`, color: 'bg-amber-500 text-white shadow-xs shadow-amber-500/30' };
    }
    if (diffDays <= 10) {
      return { text: `${diffDays} Days Left`, color: 'bg-sky-500 text-white shadow-xs shadow-sky-500/30' };
    }
    if (diffDays <= 15) {
      return { text: `${diffDays} Days Left`, color: 'bg-slate-500 text-white shadow-xs' };
    }
    return { text: `Due ${dueDate}`, color: 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300' };
  };

  // Filter bills
  const filteredBills = bills.filter(bill => {
    const matchesStatus = statusFilter === 'all' || bill.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesCategory = categoryFilter === 'All' || bill.category === categoryFilter;
    const matchesSearch = searchQuery === '' || 
      bill.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      bill.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (bill.notes && bill.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── Visual Page Hero ── */}
      <PageHero
        badge="Obligations & Utilities"
        icon={Receipt}
        title="Bills & Rent Management"
        subtitle="13 Household Categories • 7-Tier Due-Date Alerts"
        description="Comprehensive monitoring for electricity, water, natural gas, internet fiber, tuition fees, and apartment rent. Never miss a deadline with automated status lifecycle alerts."
        image={IMAGES.invoices}
        imageAlt="Household billing invoices, calculator, and payment documentation"
        imageCaption="Active Bill Registry • Verified statements & due dates"
      >
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-xs glass"
          />
          <button
            onClick={() => {
              setEditingBill(null);
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white transition-all shadow-md shadow-sky-500/20 btn-press"
          >
            <Plus className="w-4 h-4" />
            <span>Add Bill</span>
          </button>
        </div>
      </PageHero>

      {/* ── Summary & Pie Chart ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 shadow-sm flex flex-col justify-between glass group overflow-hidden">
          <CardVisual src={IMAGES.receipts} alt="Household bills financial summary ledger" />
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">
              Monthly Summary ({monthFilter})
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">Total Billed</span>
                <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                  {currency}{summary?.totalBilled ? summary.totalBilled.toFixed(2) : '0.00'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200">
                <span className="font-semibold">Total Paid</span>
                <span className="font-black text-sm text-emerald-600 dark:text-emerald-400">
                  {currency}{summary?.totalPaid ? summary.totalPaid.toFixed(2) : '0.00'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 text-amber-950 dark:text-amber-200">
                <span className="font-semibold">Total Pending</span>
                <span className="font-black text-sm text-amber-600 dark:text-amber-400">
                  {currency}{summary?.totalPending ? summary.totalPending.toFixed(2) : '0.00'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-rose-50/80 dark:bg-rose-950/30 text-rose-950 dark:text-rose-200">
                <span className="font-semibold">Total Overdue</span>
                <span className="font-black text-sm text-rose-600 dark:text-rose-400">
                  {currency}{summary?.totalOverdue ? summary.totalOverdue.toFixed(2) : '0.00'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Category Breakdown Pie Chart */}
        <div className="lg:col-span-8 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 shadow-sm flex flex-col justify-center glass">
          <PieChart
            data={summary?.pieSlices || []}
            currency={currency}
            title="Bills Category Breakdown"
            subtitle="Distribution of obligations across categories for the selected month"
            size={220}
          />
        </div>
      </div>

      {/* ── Filter Toolbar ── */}
      <div className="p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 shadow-sm space-y-3 glass">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 p-1">
            {['all', 'pending', 'paid', 'overdue'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all duration-150 ${
                  statusFilter === st
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Search & Category Filter */}
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search bills, rent, notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors"
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Bills Cards Grid with Real Category Visuals ── */}
      {filteredBills.length === 0 ? (
        <EmptyVisualState
          image={IMAGES.invoices}
          title="No Bills Found for This Filter"
          message="Add rent, utilities, tuition fees, or package instalments to monitor due dates and prevent late surcharges."
          actionText="+ Add First Bill"
          onAction={() => {
            setEditingBill(null);
            setIsAddModalOpen(true);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBills.map((bill) => {
            const reminder = getReminderTag(bill.due_date, bill.status);
            const isPaid = bill.status === 'Paid';
            const isOverdue = bill.status === 'Overdue';
            const categoryImg = getBillCategoryImage(bill.category);

            return (
              <div
                key={bill.id}
                className={`p-6 rounded-3xl border transition-all duration-200 flex flex-col justify-between bg-white/85 dark:bg-slate-900/85 card-hover glass overflow-hidden group ${
                  isOverdue
                    ? 'border-rose-300 dark:border-rose-900/60 shadow-sm shadow-rose-500/5 ring-1 ring-rose-400/20'
                    : isPaid
                    ? 'border-slate-200/60 dark:border-slate-800/60 opacity-90'
                    : 'border-slate-200/80 dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-700 shadow-sm'
                }`}
              >
                <CardVisual src={categoryImg} alt={bill.category} height="h-28" />

                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 truncate max-w-[160px]">
                      {bill.category}
                    </span>
                    {reminder && (
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${reminder.color}`}>
                        {reminder.text}
                      </span>
                    )}
                    {isPaid && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white shrink-0 shadow-xs shadow-emerald-500/30">
                        ✓ Paid
                      </span>
                    )}
                  </div>

                  <h4 className="text-base font-bold text-slate-900 dark:text-white truncate">
                    {bill.name}
                  </h4>

                  <div className="mt-2.5 flex items-baseline gap-1">
                    <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                      {currency}{bill.amount.toFixed(2)}
                    </span>
                  </div>

                  <div className="mt-2.5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Due: <strong>{bill.due_date}</strong></span>
                    {bill.payment_date && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold ml-auto">
                        Paid on {bill.payment_date}
                      </span>
                    )}
                  </div>

                  {bill.notes && (
                    <p className="mt-2 text-xs text-slate-400 italic line-clamp-2">
                      "{bill.notes}"
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setEditingBill(bill);
                        setIsAddModalOpen(true);
                      }}
                      className="p-2 rounded-xl text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-slate-800 transition-colors"
                      title="Edit bill"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(bill.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors"
                      title="Delete bill"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {!isPaid && (
                    <button
                      onClick={() => handleMarkPaid(bill)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-xs shadow-emerald-600/20 btn-press"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Mark Paid</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add / Edit Bill Modal ── */}
      <AddBillModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingBill(null);
        }}
        onSuccess={fetchBillsAndSummary}
        editingBill={editingBill}
      />
    </div>
  );
}
