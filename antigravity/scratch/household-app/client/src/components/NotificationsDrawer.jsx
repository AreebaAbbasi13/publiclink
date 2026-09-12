import React, { useState } from 'react';
import { 
  X, 
  Bell, 
  AlertTriangle, 
  Clock, 
  AlertCircle, 
  ShoppingCart, 
  RefreshCw, 
  CheckCircle2, 
  Mail, 
  ExternalLink,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { IMAGES } from '../visuals';

export default function NotificationsDrawer({ isOpen, onClose, notifications = [], onRefresh, onNavigate }) {
  const { authFetch, user } = useAuth();
  const { success, error, info } = useToast();
  const [sendingTest, setSendingTest] = useState(false);

  const handleSendTestEmail = async () => {
    setSendingTest(true);
    try {
      const res = await authFetch('/api/notifications/test-email', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send test email');
      success(data.message);
      if (data.previewUrl) {
        window.open(data.previewUrl, '_blank');
      }
    } catch (err) {
      error(err.message || 'Failed to send test email');
    } finally {
      setSendingTest(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white/95 dark:bg-slate-900/95 border-l border-slate-200/80 dark:border-slate-800/80 shadow-2xl flex flex-col glass">
          {/* Header */}
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-sky-500/20">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Notifications & Reminders
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  <strong className="text-sky-600 dark:text-sky-400">{notifications.length}</strong> active household alert(s)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={onRefresh}
                title="Refresh Reminders"
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors btn-press"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors btn-press"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* List Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3.5">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-full h-36 rounded-2xl overflow-hidden mb-4 relative shadow-sm ring-1 ring-slate-200/60 dark:ring-slate-700/60">
                  <img
                    src={IMAGES.savings}
                    alt="Clean household balance and peace of mind"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent flex items-end p-3">
                    <span className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Household Ledger in Order
                    </span>
                  </div>
                </div>
                <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
                  All Clear!
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mt-1 leading-relaxed">
                  No overdue obligations, imminent deadlines, or low pantry stocks at this moment.
                </p>
              </div>
            ) : (
              notifications.map((notif, idx) => {
                const isOverdue = notif.urgency === 'danger' || notif.level === 'overdue';
                const isWarning = notif.urgency === 'warning' || notif.level === 'today' || notif.level === '1d';

                let borderClass = 'border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80';
                let iconColor = 'text-sky-500';

                if (isOverdue) {
                  borderClass = 'border-rose-200 dark:border-rose-900/50 bg-rose-50/70 dark:bg-rose-950/30';
                  iconColor = 'text-rose-500';
                } else if (isWarning) {
                  borderClass = 'border-amber-200 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/30';
                  iconColor = 'text-amber-500';
                }

                return (
                  <div
                    key={idx}
                    className={`p-4 sm:p-5 rounded-3xl border transition-all duration-200 shadow-xs card-hover ${borderClass}`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div className={`p-2 rounded-2xl bg-white dark:bg-slate-800 shadow-xs shrink-0 ${iconColor}`}>
                        {notif.type === 'bill_reminder' && <Clock className="w-4 h-4" />}
                        {notif.type === 'pantry_low' && <ShoppingCart className="w-4 h-4" />}
                        {notif.type === 'budget_alert' && <AlertTriangle className="w-4 h-4" />}
                        {notif.type === 'saving_alert' && <AlertCircle className="w-4 h-4" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {notif.title}
                          </h4>
                          {notif.badge && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                              {notif.badge}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                          {notif.message}
                        </p>

                        <div className="mt-3.5 flex items-center gap-3">
                          {notif.type === 'bill_reminder' && (
                            <button
                              onClick={() => {
                                onNavigate('bills');
                                onClose();
                              }}
                              className="text-xs font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1 hover:underline"
                            >
                              <span>Go to Bills</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer with Real Email Dispatch Test */}
          <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>Email target:</span>
              <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[180px]">{user?.email}</span>
            </div>
            <button
              onClick={handleSendTestEmail}
              disabled={sendingTest}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs transition-all shadow-md shadow-sky-500/20 btn-press"
            >
              <Mail className="w-4 h-4" />
              <span>{sendingTest ? 'Sending Test Email...' : 'Send Test Notification Email'}</span>
            </button>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center">
              Delivered via configured SMTP/Gmail or previewed in Ethereal sandbox.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
