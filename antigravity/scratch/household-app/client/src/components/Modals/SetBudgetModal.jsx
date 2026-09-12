import React, { useState, useEffect } from 'react';
import { X, Target } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../Toast';
import { useDataSync } from '../../context/DataSyncContext';
import { getCurrencySymbol } from '../../utils/currency';
import { IMAGES } from '../../visuals';

export default function SetBudgetModal({ isOpen, onClose, onSuccess, currentBudget = 0, currentMonth = '' }) {
  const { authFetch, user } = useAuth();
  const { success, error } = useToast();
  const { notifyDataChanged } = useDataSync();

  const [monthlyLimit, setMonthlyLimit] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMonthlyLimit(currentBudget > 0 ? currentBudget.toString() : '');
  }, [currentBudget, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numLimit = parseFloat(monthlyLimit);
    if (isNaN(numLimit) || numLimit < 0) {
      error('Please enter a valid positive budget limit.');
      return;
    }

    setLoading(true);
    try {
      const res = await authFetch('/api/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthly_limit: numLimit,
          month_year: currentMonth || new Date().toISOString().slice(0, 7)
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update budget');

      success('Monthly household budget configured successfully!');
      notifyDataChanged();
      onSuccess();
      onClose();
    } catch (err) {
      error(err.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col glass-card animate-fade-in-scale">
        {/* Visual Banner */}
        <div className="relative h-24 sm:h-28 overflow-hidden shrink-0">
          <img
            src={IMAGES.budgetCoins}
            alt="Household budget targets and coins"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-slate-900 via-slate-900/25 to-slate-950/40" />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-white bg-slate-900/60 hover:bg-slate-900/90 p-2 rounded-xl transition-colors btn-press"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="absolute bottom-2 left-6 flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-white/90 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 shadow-sm">
              Monthly Spend Target
            </span>
          </div>
        </div>

        <div className="px-6 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Set Monthly Budget
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Target period: {currentMonth || new Date().toISOString().slice(0, 7)}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Monthly Budget Target ({getCurrencySymbol(user?.currency)}) *
            </label>
            <input
              type="number"
              step="1"
              min="0"
              required
              placeholder="e.g. 3500"
              value={monthlyLimit}
              onChange={(e) => setMonthlyLimit(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base font-bold focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              The system computes your total spent across paid bills, daily expenses, and pantry restocks, and proactively alerts you at 80% and 100% capacity.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors btn-press"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 disabled:opacity-50 transition-all shadow-md shadow-sky-500/20 btn-press"
            >
              {loading ? 'Saving...' : 'Set Budget'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
