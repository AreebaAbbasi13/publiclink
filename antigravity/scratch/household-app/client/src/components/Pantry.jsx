import React, { useState, useEffect, useCallback } from 'react';
import { 
  Package, 
  Plus, 
  Minus, 
  ShoppingCart, 
  AlertTriangle, 
  Trash2, 
  RefreshCw, 
  TrendingUp, 
  DollarSign, 
  Tag, 
  CheckCircle2, 
  ArrowRight,
  ShoppingBag
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { useDataSync } from '../context/DataSyncContext';
import { getCurrencySymbol } from '../utils/currency';
import { IMAGES } from '../visuals';
import PageHero, { CardVisual, EmptyVisualState } from './PageHero';
import AddPantryModal from './Modals/AddPantryModal';
import MarketPurchaseModal from './Modals/MarketPurchaseModal';

export default function Pantry() {
  const { authFetch, user } = useAuth();
  const { success, error } = useToast();
  const { notifyDataChanged, subscribeToChanges } = useDataSync();
  const currency = getCurrencySymbol(user?.currency);

  const [pantryData, setPantryData] = useState(null);
  const [suggestedList, setSuggestedList] = useState(null);
  const [spendingData, setSpendingData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isMarketModalOpen, setIsMarketModalOpen] = useState(false);
  const [preselectedPurchaseItem, setPreselectedPurchaseItem] = useState(null);

  const fetchPantryData = useCallback(async () => {
    setLoading(true);
    try {
      const [pantryRes, suggestedRes, spendingRes] = await Promise.all([
        authFetch('/api/pantry'),
        authFetch('/api/pantry/suggested'),
        authFetch('/api/pantry/spending')
      ]);

      if (pantryRes.ok) setPantryData(await pantryRes.json());
      if (suggestedRes.ok) setSuggestedList(await suggestedRes.json());
      if (spendingRes.ok) setSpendingData(await spendingRes.json());
    } catch (err) {
      console.error('Failed to load pantry data:', err);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchPantryData();
  }, [fetchPantryData]);

  useEffect(() => {
    const unsub = subscribeToChanges(fetchPantryData);
    return unsub;
  }, [subscribeToChanges, fetchPantryData]);

  const handleAdjustQuantity = async (item, delta) => {
    setPantryData(prev => {
      if (!prev || !prev.items) return prev;
      const newItems = prev.items.map(i => i.id === item.id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i);
      return {
        ...prev,
        items: newItems,
        lowStockItems: newItems.filter(i => i.quantity <= i.min_threshold)
      };
    });
    try {
      const res = await authFetch(`/api/pantry/${item.id}/quantity`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta })
      });
      if (!res.ok) throw new Error('Failed to update quantity');
      notifyDataChanged();
      fetchPantryData();
    } catch (err) {
      error(err.message);
      fetchPantryData();
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this item from pantry?')) return;
    setPantryData(prev => {
      if (!prev || !prev.items) return prev;
      const newItems = prev.items.filter(i => i.id !== id);
      return {
        ...prev,
        items: newItems,
        totalCount: newItems.length,
        lowStockItems: newItems.filter(i => i.quantity <= i.min_threshold)
      };
    });
    try {
      const res = await authFetch(`/api/pantry/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete item');
      success('Item removed.');
      notifyDataChanged();
      fetchPantryData();
    } catch (err) {
      error(err.message);
      fetchPantryData();
    }
  };

  const handleBuyItem = (item) => {
    setPreselectedPurchaseItem(item);
    setIsMarketModalOpen(true);
  };

  const items = pantryData?.items || [];
  const lowItems = pantryData?.lowStockItems || [];
  const suggestions = suggestedList?.suggestedItems || [];
  const purchases = spendingData?.purchases || [];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── Visual Page Hero ── */}
      <PageHero
        badge="Kitchen & Provisions"
        icon={Package}
        badgeClass="bg-amber-50 dark:bg-amber-950/60 border-amber-200/60 dark:border-amber-800/60 text-amber-700 dark:text-amber-300"
        iconClass="text-amber-500"
        title="Household Pantry & Restock"
        subtitle="Kitchen Inventory, Safety Thresholds & Automated Market Lists"
        description="Monitor daily grocery provisions, receive depleted staple warnings, and record market restock purchases that automatically sync to your household cash expenditure log."
        image={IMAGES.pantryStock}
        imageAlt="Fresh household groceries, produce and kitchen pantry staples on shelves"
        imageCaption="Active Pantry Inventory • Staples, safety stock & market replenishment"
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => {
              setPreselectedPurchaseItem(null);
              setIsMarketModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md shadow-emerald-600/20 btn-press"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Market Purchase</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white transition-all shadow-md shadow-sky-500/20 btn-press"
          >
            <Plus className="w-4 h-4" />
            <span>Add Item</span>
          </button>
        </div>
      </PageHero>

      {/* ── Running-Low Alerts Banner ── */}
      {lowItems.length > 0 && (
        <div className="p-5 sm:p-6 rounded-3xl border border-amber-300/80 dark:border-amber-900/60 bg-gradient-to-br from-amber-50/90 to-orange-50/50 dark:from-amber-950/40 dark:to-orange-950/20 shadow-xs glass animate-slide-in-up">
          <div className="flex items-center justify-between gap-3 mb-3.5">
            <div className="flex items-center gap-2.5 text-amber-950 dark:text-amber-100">
              <div className="p-1.5 rounded-xl bg-amber-200/60 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h3 className="text-sm sm:text-base font-bold">
                Running-Low Alert: {lowItems.length} Staple(s) Below Safety Threshold
              </h3>
            </div>
            <span className="text-xs font-extrabold text-amber-700 dark:text-amber-300">
              Restock Recommended
            </span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {lowItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-amber-200 dark:border-amber-800 text-xs shadow-xs"
              >
                <span className="font-bold text-slate-800 dark:text-slate-200">{item.name}</span>
                <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                  {item.quantity} {item.unit} left (Min: {item.min_threshold})
                </span>
                <button
                  onClick={() => handleBuyItem(item)}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-xs"
                >
                  Buy
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Top 3 KPI Cards with Matching Photography ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 shadow-sm card-hover glass overflow-hidden group">
          <CardVisual src={IMAGES.pantryStock} alt="Pantry household goods" height="h-24" />
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Pantry Items
          </span>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              {items.length}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            <strong className="text-amber-600 dark:text-amber-400 font-bold">{lowItems.length}</strong> item(s) running low
          </p>
        </div>

        <div className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 shadow-sm card-hover glass overflow-hidden group">
          <CardVisual src={IMAGES.grocery} alt="Grocery spending cart" height="h-24" />
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Pantry Spending
          </span>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              {currency}{spendingData?.totalPantrySpending ? spendingData.totalPantrySpending.toFixed(2) : '0.00'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Across <strong className="text-slate-700 dark:text-slate-200">{purchases.length}</strong> recorded market purchases
          </p>
        </div>

        <div className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 shadow-sm card-hover glass overflow-hidden group">
          <CardVisual src={IMAGES.payments} alt="Market checkout purchase" height="h-24" />
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Suggested Restock Cost
          </span>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
              {currency}{suggestedList?.totalEstimatedSpend ? suggestedList.totalEstimatedSpend.toFixed(2) : '0.00'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            For <strong className="text-slate-700 dark:text-slate-200">{suggestions.length}</strong> items needing replenishment
          </p>
        </div>
      </div>

      {/* ── Suggested Shopping List Section ── */}
      <div className="p-6 sm:p-7 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 shadow-sm glass">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Suggested Shopping List
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Calculated automatically based strictly on low-stock items in your pantry.
              </p>
            </div>
          </div>
        </div>

        {suggestions.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs">
            ✨ All tracked pantry items are currently above their safety thresholds. No restock needed right now!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {suggestions.map((item) => (
              <div
                key={item.pantry_item_id}
                className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-800/50 flex items-center justify-between gap-3 shadow-xs"
              >
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">{item.name}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Need: <strong className="text-slate-800 dark:text-slate-200">{item.needed_quantity} {item.unit}</strong> • Est: <strong>{currency}{item.estimated_cost.toFixed(2)}</strong>
                  </p>
                </div>
                <button
                  onClick={() => handleBuyItem({ id: item.pantry_item_id, name: item.name, quantity: 0, unit: item.unit })}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs btn-press"
                >
                  Buy Now
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Pantry Items Table ── */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 shadow-sm overflow-hidden glass">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Pantry Inventory Items
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live stock counts with instant quantity adjustments
            </p>
          </div>
          <span className="text-xs font-bold text-slate-400">
            {items.length} total item(s)
          </span>
        </div>

        {items.length === 0 ? (
          <EmptyVisualState
            image={IMAGES.pantryStock}
            title="Your Pantry is Currently Empty"
            message="Add kitchen staples like rice, milk, cooking oil, or coffee to manage stock levels and automate shopping lists."
            actionText="+ Add First Pantry Item"
            onAction={() => setIsAddModalOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-6">Item Name</th>
                  <th className="py-4 px-6">Category</th>
                  <th className="py-4 px-6">Quantity in Stock</th>
                  <th className="py-4 px-6">Threshold</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {items.map((item) => {
                  const isLow = item.quantity <= item.min_threshold;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-4 px-6 font-bold text-slate-900 dark:text-white">
                        {item.name}
                      </td>
                      <td className="py-4 px-6 text-slate-500 dark:text-slate-400 font-medium">
                        {item.category}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAdjustQuantity(item, -1)}
                            className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center transition-colors font-bold shadow-xs btn-press"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-black text-sm text-slate-900 dark:text-white min-w-[40px] text-center">
                            {item.quantity} {item.unit}
                          </span>
                          <button
                            onClick={() => handleAdjustQuantity(item, 1)}
                            className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center transition-colors font-bold shadow-xs btn-press"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-slate-500 dark:text-slate-400 font-medium">
                        {item.min_threshold} {item.unit}
                      </td>
                      <td className="py-4 px-6">
                        {isLow ? (
                          <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 shadow-xs">
                            ⚠ Low Stock
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 shadow-xs">
                            ✓ In Stock
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleBuyItem(item)}
                            title="Purchase more"
                            className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 font-bold text-xs transition-colors shadow-xs"
                          >
                            Restock
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            title="Delete"
                            className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* ── Modals ── */}
      <AddPantryModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchPantryData}
      />
      <MarketPurchaseModal
        isOpen={isMarketModalOpen}
        onClose={() => {
          setIsMarketModalOpen(false);
          setPreselectedPurchaseItem(null);
        }}
        onSuccess={fetchPantryData}
        preselectedItem={preselectedPurchaseItem}
        pantryItems={items}
      />
    </div>
  );
}
