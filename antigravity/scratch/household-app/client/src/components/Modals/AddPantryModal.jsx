import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../Toast';
import { useDataSync } from '../../context/DataSyncContext';
import { getCurrencySymbol } from '../../utils/currency';
import { IMAGES } from '../../visuals';

const UNITS = ['pcs', 'kg', 'g', 'lbs', 'oz', 'liters', 'ml', 'packs', 'cans', 'bottles', 'boxes'];
const CATEGORIES = ['Grains & Pasta', 'Dairy & Eggs', 'Produce & Veggies', 'Meat & Seafood', 'Canned Goods', 'Baking & Spices', 'Beverages', 'Cleaning & Household', 'Snacks', 'General'];

export default function AddPantryModal({ isOpen, onClose, onSuccess, initialItem = null }) {
  const { authFetch, user } = useAuth();
  const { success, error } = useToast();
  const { notifyDataChanged } = useDataSync();

  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState(UNITS[0]);
  const [minThreshold, setMinThreshold] = useState('1');
  const [unitCost, setUnitCost] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialItem) {
      setName(initialItem.name);
      setCategory(initialItem.category);
      setQuantity(initialItem.quantity.toString());
      setUnit(initialItem.unit);
      setMinThreshold(initialItem.min_threshold.toString());
      setUnitCost(initialItem.unit_cost ? initialItem.unit_cost.toString() : '');
    } else {
      setName('');
      setCategory(CATEGORIES[0]);
      setQuantity('1');
      setUnit(UNITS[0]);
      setMinThreshold('1');
      setUnitCost('');
    }
  }, [initialItem, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      error('Please enter an item name.');
      return;
    }

    const numQty = parseFloat(quantity) || 0;
    const numMin = parseFloat(minThreshold) || 1;
    const numCost = parseFloat(unitCost) || 0;

    setLoading(true);
    try {
      const res = await authFetch('/api/pantry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          category,
          quantity: numQty,
          unit,
          min_threshold: numMin,
          unit_cost: numCost
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save pantry item');

      success('Pantry item added successfully!');
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
        {/* Visual Header */}
        <div className="relative h-24 sm:h-28 overflow-hidden shrink-0">
          <img
            src={IMAGES.pantryStock}
            alt="Pantry supplies and staples"
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
              Kitchen & Pantry Stock
            </span>
          </div>
        </div>

        <div className="px-6 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {initialItem ? 'Edit Pantry Item' : 'Add Pantry Item'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Track stock levels, low-threshold alarms, and estimated purchase cost.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Item Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Basmati Rice, Olive Oil, Eggs, Milk"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Category
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
                Unit of Measure
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3.5 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors"
              >
                {UNITS.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Initial Stock Quantity
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Minimum Alert Threshold
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                required
                value={minThreshold}
                onChange={(e) => setMinThreshold(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Estimated Unit Cost ({getCurrencySymbol(user?.currency)})
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors"
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
              {loading ? 'Adding...' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
