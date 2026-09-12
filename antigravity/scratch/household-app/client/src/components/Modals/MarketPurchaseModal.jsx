import React, { useState, useEffect } from 'react';
import { X, ShoppingBag, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../Toast';
import { useDataSync } from '../../context/DataSyncContext';
import { getCurrencySymbol } from '../../utils/currency';
import { IMAGES } from '../../visuals';

const UNITS = ['pcs', 'kg', 'g', 'lbs', 'oz', 'liters', 'ml', 'packs', 'cans', 'bottles', 'boxes'];

export default function MarketPurchaseModal({ isOpen, onClose, onSuccess, preselectedItem = null, pantryItems = [] }) {
  const { authFetch, user } = useAuth();
  const { success, error } = useToast();
  const { notifyDataChanged } = useDataSync();

  const [selectedItemId, setSelectedItemId] = useState('');
  const [customItemName, setCustomItemName] = useState('');
  const [quantityBought, setQuantityBought] = useState('1');
  const [unit, setUnit] = useState('pcs');
  const [totalCost, setTotalCost] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (preselectedItem) {
      setSelectedItemId(preselectedItem.id.toString());
      setCustomItemName(preselectedItem.name);
      setUnit(preselectedItem.unit);
      if (preselectedItem.unit_cost && preselectedItem.suggestedReplenishQuantity) {
        setQuantityBought(preselectedItem.suggestedReplenishQuantity.toString());
        setTotalCost((preselectedItem.suggestedReplenishQuantity * preselectedItem.unit_cost).toFixed(2));
      } else {
        setQuantityBought('1');
        setTotalCost('');
      }
    } else {
      setSelectedItemId(pantryItems.length > 0 ? pantryItems[0].id.toString() : 'new');
      setCustomItemName('');
      setQuantityBought('1');
      setUnit(pantryItems.length > 0 ? pantryItems[0].unit : 'pcs');
      setTotalCost('');
    }
    setPurchaseDate(new Date().toISOString().slice(0, 10));
    setNotes('');
  }, [preselectedItem, pantryItems, isOpen]);

  if (!isOpen) return null;

  const handleItemSelect = (e) => {
    const val = e.target.value;
    setSelectedItemId(val);
    if (val !== 'new') {
      const found = pantryItems.find(i => i.id.toString() === val);
      if (found) {
        setUnit(found.unit);
        setCustomItemName(found.name);
        if (found.unit_cost > 0) {
          const qty = parseFloat(quantityBought) || 1;
          setTotalCost((qty * found.unit_cost).toFixed(2));
        }
      }
    } else {
      setCustomItemName('');
    }
  };

  const handleQtyChange = (e) => {
    const qtyStr = e.target.value;
    setQuantityBought(qtyStr);
    const qty = parseFloat(qtyStr) || 0;
    if (selectedItemId !== 'new') {
      const found = pantryItems.find(i => i.id.toString() === selectedItemId);
      if (found && found.unit_cost > 0) {
        setTotalCost((qty * found.unit_cost).toFixed(2));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const isNew = selectedItemId === 'new';
    const finalName = isNew ? customItemName.trim() : (pantryItems.find(i => i.id.toString() === selectedItemId)?.name || customItemName.trim());

    if (!finalName) {
      error('Please select or specify the item purchased.');
      return;
    }

    const numQty = parseFloat(quantityBought);
    const numCost = parseFloat(totalCost);

    if (isNaN(numQty) || numQty <= 0) {
      error('Please enter a valid quantity.');
      return;
    }

    if (isNaN(numCost) || numCost < 0) {
      error('Please enter a valid total cost.');
      return;
    }

    setLoading(true);
    try {
      const res = await authFetch('/api/pantry/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pantry_item_id: isNew ? null : parseInt(selectedItemId),
          item_name: finalName,
          quantity_bought: numQty,
          unit,
          total_cost: numCost,
          purchase_date: purchaseDate,
          notes: notes.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record market purchase');

      success(`Recorded purchase for ${finalName}. Pantry stock updated!`);
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
            src={IMAGES.grocery}
            alt="Market groceries restock purchase"
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
              Market Restock Flow
            </span>
          </div>
        </div>

        <div className="px-6 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Market Purchase & Restock
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Increases pantry quantity & logs expenditure in spending ledger.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Select Pantry Item or Add New *
            </label>
            <select
              value={selectedItemId}
              onChange={handleItemSelect}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-2 transition-colors"
            >
              {pantryItems.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name} (Current: {item.quantity} {item.unit})
                </option>
              ))}
              <option value="new">+ Add New Market Item to Pantry</option>
            </select>

            {selectedItemId === 'new' && (
              <input
                type="text"
                required
                placeholder="Enter new item name (e.g. Fresh Tomatoes, Olive Oil)"
                value={customItemName}
                onChange={(e) => setCustomItemName(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
              />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Quantity Bought *
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                required
                value={quantityBought}
                onChange={handleQtyChange}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Unit
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3.5 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
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
                Total Price Paid ({getCurrencySymbol(user?.currency)}) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.00"
                required
                placeholder="0.00"
                value={totalCost}
                onChange={(e) => setTotalCost(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Purchase Date *
              </label>
              <input
                type="date"
                required
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Store / Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Farmer Market, Whole Foods, Supermarket"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
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
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-all shadow-md shadow-emerald-600/20 btn-press"
            >
              {loading ? 'Processing...' : 'Record Purchase & Restock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
