import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  CheckCircle2, 
  AlertTriangle, 
  PieChart as PieIcon, 
  FileText, 
  TrendingUp, 
  RefreshCw, 
  Lightbulb, 
  ArrowRight, 
  Zap, 
  Cpu
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { useDataSync } from '../context/DataSyncContext';
import { getCurrencySymbol } from '../utils/currency';
import { IMAGES } from '../visuals';
import PageHero, { CardVisual, InlineVisual, EmptyVisualState } from './PageHero';
import PieChart from './Visualizations/PieChart';

export default function AIFeatures({ setActiveTab }) {
  const { authFetch, user } = useAuth();
  const { success, error } = useToast();
  const { subscribeToChanges } = useDataSync();
  const currency = getCurrencySymbol(user?.currency);

  const [activeSubTab, setActiveSubTab] = useState('assistant'); // 'assistant' | 'recommendations' | 'summary' | 'piechart'

  // 1. Assistant State
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hello ${user?.name || ''}! I am your Household AI Assistant. I have live access to your stored bills, daily expenses, pantry stock, and budget.\n\nAsk me anything like:\n- *"What is my biggest expense this month?"*\n- *"What bills are due this week?"*\n- *"What can I cook based on my pantry?"*\n- *"How can I stay within my monthly budget?"*`
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  // 2. Recommendations State
  const [recommendations, setRecommendations] = useState([]);
  const [isRecsLoading, setIsRecsLoading] = useState(false);

  // 3. AI Summary State
  const [aiSummary, setAiSummary] = useState(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);

  // 4. AI Pie Chart State
  const [pieChartPrompt, setPieChartPrompt] = useState('Overall Spending Breakdown');
  const [generatedChart, setGeneratedChart] = useState(null);
  const [isChartLoading, setIsChartLoading] = useState(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load recommendations & summary on mount
  useEffect(() => {
    fetchRecommendations();
    fetchSummary();
    handleGeneratePieChart('Overall Spending Breakdown');
  }, []);

  useEffect(() => {
    const unsub = subscribeToChanges(() => {
      fetchRecommendations();
      fetchSummary();
    });
    return unsub;
  }, [subscribeToChanges]);

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputMessage.trim() || isChatLoading) return;

    const userText = inputMessage.trim();
    setInputMessage('');
    setMessages(prev => [...prev, { role: 'user', content: userText }]);
    setIsChatLoading(true);

    try {
      const res = await authFetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to get response');

      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (err) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Error: ${err.message || 'Could not process request. Please try again.'}` 
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const fetchRecommendations = async () => {
    setIsRecsLoading(true);
    try {
      const res = await authFetch('/api/ai/recommendations');
      if (res.ok) {
        const data = await res.json();
        setRecommendations(data.recommendations || []);
      }
    } catch (err) {
      console.error('Failed to load recommendations:', err);
    } finally {
      setIsRecsLoading(false);
    }
  };

  const fetchSummary = async () => {
    setIsSummaryLoading(true);
    try {
      const res = await authFetch('/api/ai/summary');
      if (res.ok) {
        setAiSummary(await res.json());
      }
    } catch (err) {
      console.error('Failed to load summary:', err);
    } finally {
      setIsSummaryLoading(false);
    }
  };

  const handleGeneratePieChart = async (customPrompt) => {
    const promptToUse = customPrompt || pieChartPrompt;
    setIsChartLoading(true);
    try {
      const res = await authFetch('/api/ai/pie-chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptToUse })
      });
      if (res.ok) {
        setGeneratedChart(await res.json());
      }
    } catch (err) {
      console.error('Failed to generate pie chart:', err);
    } finally {
      setIsChartLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── Visual Page Hero ── */}
      <PageHero
        badge="Neural Intelligence Suite"
        icon={Sparkles}
        badgeClass="bg-violet-50 dark:bg-violet-950/60 border-violet-200/60 dark:border-violet-800/60 text-violet-700 dark:text-violet-300"
        iconClass="text-violet-500"
        title="AI Household Financial Intelligence"
        subtitle="Context-Aware Assistant, Smart Insights & Dynamic Visualizations"
        description="Interact directly with your household database. Query upcoming rent and utility deadlines, evaluate grocery replenishment, and synthesize on-demand pie charts."
        image={IMAGES.aiChip}
        imageAlt="AI Neural Processor and household analytics engine"
        imageCaption="Live Context Engine • Database synchronization & AI insights"
      />

      {/* ── Sub Tabs Navigation ── */}
      <div className="flex rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 p-1.5 max-w-2xl glass shadow-xs">
        <button
          onClick={() => setActiveSubTab('assistant')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 btn-press ${
            activeSubTab === 'assistant'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Bot className="w-4 h-4 text-sky-500" />
          <span>AI Assistant</span>
        </button>

        <button
          onClick={() => setActiveSubTab('recommendations')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 btn-press ${
            activeSubTab === 'recommendations'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Lightbulb className="w-4 h-4 text-amber-500" />
          <span>Smart Insights</span>
        </button>

        <button
          onClick={() => setActiveSubTab('summary')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 btn-press ${
            activeSubTab === 'summary'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4 text-indigo-500" />
          <span>Executive Briefing</span>
        </button>

        <button
          onClick={() => setActiveSubTab('piechart')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 btn-press ${
            activeSubTab === 'piechart'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <PieIcon className="w-4 h-4 text-emerald-500" />
          <span>AI Pie Chart</span>
        </button>
      </div>

      {/* ── Tab 1: AI Chat Assistant ── */}
      {activeSubTab === 'assistant' && (
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 shadow-sm overflow-hidden flex flex-col h-[580px] glass">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((m, idx) => {
              const isUser = m.role === 'user';
              return (
                <div
                  key={idx}
                  className={`flex gap-3.5 max-w-2xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                    isUser
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'bg-violet-600 text-white shadow-sm shadow-violet-500/20'
                  }`}>
                    {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                    isUser
                      ? 'bg-sky-600 text-white rounded-tr-none'
                      : 'bg-slate-100/90 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60 rounded-tl-none'
                  }`}>
                    {m.content}
                  </div>
                </div>
              );
            })}
            {isChatLoading && (
              <div className="flex gap-3.5 mr-auto max-w-xl">
                <div className="w-8 h-8 rounded-xl bg-violet-600 text-white flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs flex items-center gap-1.5">
                  <span>Synthesizing database context</span>
                  <span className="animate-pulse">...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Preset Prompts */}
          <div className="px-6 py-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto text-[11px] bg-slate-50/50 dark:bg-slate-900/30">
            <span className="text-slate-400 font-bold shrink-0">Quick Ask:</span>
            {[
              "What bills are due this week?",
              "What is my biggest expense?",
              "What can I cook from pantry?",
              "How to save 10% on utilities?"
            ].map((prompt, i) => (
              <button
                key={i}
                onClick={() => {
                  setInputMessage(prompt);
                }}
                className="px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 hover:border-sky-400 text-slate-600 dark:text-slate-300 hover:text-sky-600 shrink-0 transition-colors bg-white/70 dark:bg-slate-800/60"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 bg-white/50 dark:bg-slate-900/50">
            <input
              type="text"
              placeholder="Ask about bills, daily expenses, recipes from pantry, or savings..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={isChatLoading}
              className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors"
            />
            <button
              type="submit"
              disabled={isChatLoading || !inputMessage.trim()}
              className="p-3.5 rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 disabled:opacity-50 text-white transition-all shadow-md shadow-sky-500/20 btn-press"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* ── Tab 2: Smart Recommendations ── */}
      {activeSubTab === 'recommendations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Data-backed optimization opportunities synthesized directly from your real ledger.
            </p>
            <button
              onClick={fetchRecommendations}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all btn-press glass"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRecsLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Insights</span>
            </button>
          </div>

          {recommendations.length === 0 ? (
            <EmptyVisualState
              image={IMAGES.savings}
              title="Everything is Optimal!"
              message="No budget overruns, overdue bills, or depleted pantry staples detected at this time."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {recommendations.map((rec) => {
                const isUrgent = rec.priority === 'Urgent';
                const isHigh = rec.priority === 'High';

                return (
                  <div
                    key={rec.id}
                    className={`p-6 rounded-3xl border transition-all duration-200 flex flex-col justify-between card-hover glass ${
                      isUrgent
                        ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20'
                        : isHigh
                        ? 'border-amber-300 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20'
                        : 'border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {rec.category}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            isUrgent
                              ? 'bg-rose-500 text-white shadow-xs shadow-rose-500/30'
                              : isHigh
                              ? 'bg-amber-500 text-white shadow-xs shadow-amber-500/30'
                              : 'bg-sky-500 text-white shadow-xs shadow-sky-500/30'
                          }`}
                        >
                          {rec.priority}
                        </span>
                      </div>

                      <h4 className="text-base font-bold text-slate-900 dark:text-white">
                        {rec.title}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                        {rec.description}
                      </p>
                    </div>

                    <div className="mt-6 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-500 dark:text-slate-400">
                        {rec.metric}
                      </span>
                      {rec.actionUrl && (
                        <button
                          onClick={() => setActiveTab(rec.actionUrl)}
                          className="font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                        >
                          <span>Take Action</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Tab 3: AI Summary ── */}
      {activeSubTab === 'summary' && (
        <div className="p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 shadow-sm space-y-6 glass overflow-hidden">
          <CardVisual src={IMAGES.ledgerAudit} alt="Household executive briefing audit" height="h-28" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Executive Household Briefing
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Month: {aiSummary?.month} • Overall Status: <strong className="text-sky-600 dark:text-sky-400 font-bold">{aiSummary?.overallStatus}</strong>
                </p>
              </div>
            </div>
            <button
              onClick={fetchSummary}
              className="p-2.5 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isSummaryLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="p-6 rounded-2xl bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
            {aiSummary?.narrative || 'Generating summary from real records...'}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-2">
            <div className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 text-xs border border-slate-100 dark:border-slate-800/60">
              <span className="text-slate-500 dark:text-slate-400 font-semibold">Total Expenditure</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1.5 tracking-tight">
                {currency}{aiSummary?.totalSpent ? aiSummary.totalSpent.toFixed(2) : '0.00'}
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 text-xs border border-slate-100 dark:border-slate-800/60">
              <span className="text-slate-500 dark:text-slate-400 font-semibold">Unpaid Obligations</span>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1.5 tracking-tight">
                {currency}{aiSummary?.unpaidObligations ? aiSummary.unpaidObligations.toFixed(2) : '0.00'}
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 text-xs border border-slate-100 dark:border-slate-800/60">
              <span className="text-slate-500 dark:text-slate-400 font-semibold">Low Stock Pantry Items</span>
              <p className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-1.5 tracking-tight">
                {aiSummary?.lowStockCount || 0} item(s)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 4: AI-Generated Pie Chart ── */}
      {activeSubTab === 'piechart' && (
        <div className="p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 shadow-sm space-y-6 glass">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Dynamic AI-Generated Pie Chart
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Type any query or click presets to render tailored spending slices on the fly.
            </p>
          </div>

          {/* Prompt query input */}
          <div className="flex items-center gap-2.5">
            <input
              type="text"
              placeholder="e.g. 'Show bills by category', 'Show daily expenses', 'Show paid vs pending bills'"
              value={pieChartPrompt}
              onChange={(e) => setPieChartPrompt(e.target.value)}
              className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors shadow-xs"
            />
            <button
              onClick={() => handleGeneratePieChart()}
              disabled={isChartLoading}
              className="px-6 py-3 rounded-2xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-all shadow-md shadow-emerald-600/20 btn-press"
            >
              {isChartLoading ? 'Rendering...' : 'Generate Chart'}
            </button>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Presets:</span>
            {[
              'Overall Spending Breakdown',
              'Bills by Category',
              'Daily Expenses by Category',
              'Bill Payment Status'
            ].map((p, i) => (
              <button
                key={i}
                onClick={() => {
                  setPieChartPrompt(p);
                  handleGeneratePieChart(p);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors btn-press shadow-xs"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Chart Display Area */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center">
            {generatedChart ? (
              <div className="w-full space-y-4">
                <PieChart
                  data={generatedChart.slices || []}
                  currency={currency}
                  title={generatedChart.title}
                  subtitle={generatedChart.insight}
                  size={260}
                />
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">
                Click Generate Chart to view dynamic visualization.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
