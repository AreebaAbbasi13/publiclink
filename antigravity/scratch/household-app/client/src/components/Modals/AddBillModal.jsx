import React, { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, Tag, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../Toast';
import { useDataSync } from '../../context/DataSyncContext';
import { getCurrencySymbol } from '../../utils/currency';
import { getBillCategoryImage } from '../../visuals';

const CATEGORIES = [
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

export default function AddBillModal({ isOpen, onClose, onSuccess, initialBill = null, editingBill = null }) {
  const currentBill = editingBill || initialBill;
  const { authFetch, user } = useAuth();
  const { success, error } = useToast();
  const { notifyDataChanged } = useDataSync();

  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentBill) {
      setName(currentBill.name);
      setCategory(currentBill.category);
      setAmount(currentBill.amount.toString());
      setDueDate(currentBill.due_date);
      setNotes(currentBill.notes || '');
    } else {
      setName('');
      setCategory(CATEGORIES[0]);
      setAmount('');
      const d = new Date();
      d.setDate(d.getDate() + 7);
      setDueDate(d.toISOString().slice(0, 10));
      setNotes('');
    }
  }, [currentBill, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !amount || !dueDate) {
      error('Please fill in all required fields.');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      error('Please enter a valid positive amount.');
      return;
    }

    setLoading(true);
    try {
      const url = currentBill ? `/api/bills/${currentBill.id}` : '/api/bills';
      const method = currentBill ? 'PUT' : 'POST';

      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          category,
          amount: numAmount,
          due_date: dueDate,
          notes: notes.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save bill');

      success(currentBill ? 'Bill updated successfully!' : 'Bill added successfully!');
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
      <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] glass-card animate-fade-in-scale">
        {/* Dynamic Category Visual Header */}
        <div className="relative h-24 sm:h-28 overflow-hidden shrink-0">
          <img
            src={getBillCategoryImage(category)}
            alt={category}
            className="w-full h-full object-cover transition-all duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-slate-900 via-slate-900/25 to-slate-950/40" />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-white bg-slate-900/60 hover:bg-slate-900/90 p-2 rounded-xl transition-colors btn-press"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="absolute bottom-2 left-6">
            <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-white/90 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 shadow-sm">
              {category}
            </span>
          </div>
        </div>

        {/* Title */}
        <div className="px-6 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {currentBill ? 'Edit Bill & Rent' : 'Add Bill / Rent Payment'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Set due dates and amounts to track payments & 7-tier reminders.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Bill / Obligation Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Monthly Apartment Rent, Home Internet Fiber"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Amount ({getCurrencySymbol(user?.currency)}) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Due Date *
            </label>
            <div className="relative">
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Account reference, payment link, or notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none transition-colors"
            />
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
              {loading ? 'Saving...' : initialBill ? 'Update Bill' : 'Save Bill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
