import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './context/AuthContext';
import { useDataSync } from './context/DataSyncContext';
import Welcome from './components/Welcome';
import Navbar from './components/Navbar';
import NotificationsDrawer from './components/NotificationsDrawer';
import Dashboard from './components/Dashboard';
import BillsRent from './components/BillsRent';
import Expenses from './components/Expenses';
import Pantry from './components/Pantry';
import Budget from './components/Budget';
import AIFeatures from './components/AIFeatures';
import ExpenseSummary from './components/ExpenseSummary';

export default function App() {
  const { isAuthenticated, loading, authFetch } = useAuth();
  const { subscribeToChanges } = useDataSync();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [tabChanging, setTabChanging] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await authFetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  }, [isAuthenticated, authFetch]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      const timer = setInterval(fetchNotifications, 60000);
      return () => clearInterval(timer);
    }
  }, [isAuthenticated, fetchNotifications]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const unsubscribe = subscribeToChanges(fetchNotifications);
    return unsubscribe;
  }, [isAuthenticated, subscribeToChanges, fetchNotifications]);

  // Animated tab switching
  const handleTabChange = (tab) => {
    if (tab === activeTab) return;
    setTabChanging(true);
    setTimeout(() => {
      setActiveTab(tab);
      setTabChanging(false);
    }, 120);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-sky-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-100">
        {/* Floating background orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-sky-400/10 dark:bg-sky-500/5 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-indigo-400/10 dark:bg-indigo-500/5 rounded-full blur-3xl animate-float-slow" />
        </div>

        <div className="flex flex-col items-center gap-4 animate-fade-in-scale relative z-10">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center shadow-2xl shadow-sky-500/30 animate-bounce-gentle">
              <span className="font-black text-xl">HS</span>
            </div>
            {/* Spinning ring */}
            <div className="absolute inset-0 rounded-2xl border-2 border-sky-400/40 animate-spin-slow" style={{ borderTopColor: 'transparent', borderRightColor: 'transparent' }} />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">HomeSphere</p>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 tracking-wide">
              Loading household ledger...
            </p>
          </div>
          {/* Animated dots */}
          <div className="flex gap-1.5">
            {[0,1,2].map(i => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-sky-400"
                style={{ animation: `bounce-gentle 1.2s ease-in-out ${i * 0.2}s infinite` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Welcome />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col selection:bg-sky-500 selection:text-white">
      {/* Subtle ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-sky-400/5 dark:bg-sky-500/3 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-400/5 dark:bg-indigo-500/3 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-400/3 dark:bg-violet-500/2 rounded-full blur-3xl" />
      </div>

      <Navbar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        unreadCount={notifications.length}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
      />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div
          className={`transition-all duration-150 ${
            tabChanging ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
          }`}
        >
          {activeTab === 'dashboard' && <Dashboard setActiveTab={handleTabChange} />}
          {activeTab === 'bills'     && <BillsRent />}
          {activeTab === 'expenses'  && <Expenses />}
          {activeTab === 'pantry'    && <Pantry />}
          {activeTab === 'budget'    && <Budget setActiveTab={handleTabChange} />}
          {activeTab === 'ai'        && <AIFeatures setActiveTab={handleTabChange} />}
          {activeTab === 'summary'   && <ExpenseSummary />}
        </div>
      </main>

      <NotificationsDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onRefresh={fetchNotifications}
        onNavigate={(tab) => {
          handleTabChange(tab);
          setIsNotificationsOpen(false);
        }}
      />
    </div>
  );
}
