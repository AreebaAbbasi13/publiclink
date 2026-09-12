import React, { useState } from 'react';
import { 
  Home, 
  Receipt, 
  CreditCard, 
  Package, 
  PieChart as PieIcon, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight,
  Sun,
  Moon,
  CheckCircle2,
  Lock,
  Mail,
  User,
  DollarSign,
  Star,
  Zap,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from './Toast';
import { CURRENCIES, DEFAULT_CURRENCY } from '../utils/currency';
import { IMAGES } from '../visuals';

const FeatureCard = ({ icon: Icon, title, desc, color, delay = 0, image, imageAlt }) => (
  <div
    className="rounded-2xl border border-white/60 dark:border-slate-700/60 bg-white/60 dark:bg-slate-800/40 backdrop-blur-sm overflow-hidden card-hover animate-fade-in"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="relative h-24 overflow-hidden">
      <img src={image} alt={imageAlt} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent dark:from-slate-800 dark:via-slate-800/30" />
    </div>
    <div className="p-4 flex items-start gap-3.5">
      <div className={`p-2.5 rounded-xl ${color} shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </div>
  </div>
);

const StatBadge = ({ value, label }) => (
  <div className="text-center">
    <div className="text-2xl font-black text-slate-900 dark:text-white">{value}</div>
    <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">{label}</div>
  </div>
);

export default function Welcome() {
  const { login, register } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { success, error } = useToast();

  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      error('Please enter both email and password.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'signup') {
        if (!name.trim()) {
          error('Please enter your full name.');
          setLoading(false);
          return;
        }
        await register(name.trim(), email.trim(), password, currency);
        success('Account created successfully! Welcome to HomeSphere.');
      } else {
        await login(email.trim(), password);
        success('Welcome back!');
      }
    } catch (err) {
      error(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field) => `w-full pl-10 pr-4 py-3 rounded-xl border text-sm focus:outline-none transition-all duration-200 ${
    focusedField === field
      ? 'border-sky-400 dark:border-sky-500 bg-white dark:bg-slate-800 ring-2 ring-sky-500/20 dark:ring-sky-500/20'
      : 'border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80'
  } text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/40 to-indigo-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/30 text-slate-900 dark:text-slate-100 flex flex-col selection:bg-sky-500 selection:text-white">

      {/* ── Background Elements ── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Large orbs */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-sky-400/8 dark:bg-sky-500/4 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3 animate-float-slow" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-400/8 dark:bg-indigo-500/4 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 animate-float" />
        <div className="absolute top-1/2 left-1/3 w-72 h-72 bg-violet-400/5 dark:bg-violet-500/3 rounded-full blur-3xl" />

        {/* Mesh grid */}
        <div className="absolute inset-0 mesh-grid opacity-60" />

        {/* Floating particles */}
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full bg-sky-400/30 dark:bg-sky-400/20 animate-twinkle"
            style={{
              left: `${15 + i * 15}%`,
              top: `${10 + (i % 3) * 30}%`,
              animationDelay: `${i * 0.4}s`,
              animationDuration: `${2 + i * 0.5}s`
            }}
          />
        ))}
      </div>

      {/* ── Top Bar ── */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3 animate-fade-in">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-sky-500/25">
            <Home className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-xl font-extrabold tracking-tight bg-gradient-to-r from-sky-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent dark:from-sky-400 dark:via-indigo-400 dark:to-violet-400">
              HomeSphere
            </span>
            <span className="block text-[10px] uppercase tracking-widest font-semibold text-slate-400 dark:text-slate-500">
              Household OS
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-all btn-press glass"
          >
            {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
          </button>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

        {/* ── Left: Hero Section ── */}
        <div className="lg:col-span-7 space-y-8">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-sky-200/80 dark:border-sky-800/60 bg-sky-50/80 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 text-xs font-semibold animate-fade-in backdrop-blur-sm shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-sky-500" />
            <span>Complete Production Household Management OS</span>
          </div>

          {/* Headline */}
          <div className="space-y-4 animate-fade-in" style={{ animationDelay: '80ms' }}>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.08]">
              Master your{' '}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500 bg-clip-text text-transparent">
                  household
                </span>
              </span>
              {' '}finances with{' '}
              <span className="bg-gradient-to-r from-emerald-500 to-sky-500 bg-clip-text text-transparent">
                precision.
              </span>
            </h1>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
              Track rent, bills, daily expenses, pantry inventory, and budget thresholds — all in one place, powered by live AI intelligence.
            </p>
          </div>

          <figure className="relative aspect-[16/9] sm:aspect-[21/10] rounded-3xl overflow-hidden shadow-2xl shadow-sky-900/10 dark:shadow-black/50 ring-1 ring-white/60 dark:ring-white/10 animate-fade-in" style={{ animationDelay: '120ms' }}>
            <img
              src={IMAGES.hero}
              alt="Household invoices, calculator, and billing documents on a desk"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/70 via-slate-900/35 to-transparent dark:from-slate-950/80 dark:via-slate-950/45" />
            <figcaption className="absolute bottom-4 left-4 right-4 sm:bottom-5 sm:left-5 sm:right-auto sm:max-w-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-sky-200 mb-1">Home Billing Management</p>
              <p className="text-sm sm:text-base font-bold text-white leading-snug">
                Invoices, utilities, and digital payments — one household ledger.
              </p>
            </figcaption>
          </figure>

          {/* 4 Core Household Utilities Showcase */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in" style={{ animationDelay: '140ms' }}>
            {[
              { src: IMAGES.power, label: 'Electricity Grid', alt: 'Electrical power transmission for household utilities' },
              { src: IMAGES.water, label: 'Water Utility', alt: 'Water stream for household utilities' },
              { src: IMAGES.gas, label: 'Natural Gas', alt: 'Natural gas blue flame burner' },
              { src: IMAGES.internet, label: 'Broadband Fiber', alt: 'High speed Wi-Fi and fiber networking' },
            ].map((item) => (
              <figure key={item.label} className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-md shadow-slate-900/10 dark:shadow-black/40 ring-1 ring-white/50 dark:ring-white/10 group">
                <img src={item.src} alt={item.alt} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/25 to-transparent" />
                <figcaption className="absolute bottom-2 left-2 right-2 text-[10px] sm:text-[11px] font-bold text-white leading-tight">
                  {item.label}
                </figcaption>
              </figure>
            ))}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-8 py-4 px-6 rounded-2xl bg-white/50 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-700/40 backdrop-blur-sm w-fit animate-fade-in" style={{ animationDelay: '160ms' }}>
            <StatBadge value="13" label="Bill Types" />
            <div className="w-px h-10 bg-slate-200 dark:bg-slate-700" />
            <StatBadge value="7-Tier" label="Reminders" />
            <div className="w-px h-10 bg-slate-200 dark:bg-slate-700" />
            <StatBadge value="AI" label="Powered" />
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <FeatureCard
              icon={Receipt}
              title="Bills & Rent Engine"
              desc="15d, 10d, 7d, 4d, 3d, 1d & hours-left due-date reminders with email alerts."
              color="bg-sky-500/10 text-sky-600 dark:text-sky-400"
              delay={200}
              image={IMAGES.invoices}
              imageAlt="Person reviewing household invoices and billing paperwork"
            />
            <FeatureCard
              icon={Package}
              title="Pantry & Market Restock"
              desc="Stock levels, running-low alerts, and smart suggested shopping lists."
              color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              delay={260}
              image={IMAGES.pantryStock}
              imageAlt="Grocery shopping and pantry items"
            />
            <FeatureCard
              icon={Sparkles}
              title="AI Assistant & Summary"
              desc="Intelligent recommendations and insights using real household data."
              color="bg-violet-500/10 text-violet-600 dark:text-violet-400"
              delay={320}
              image={IMAGES.aiChip}
              imageAlt="AI Neural processor and spending insights"
            />
            <FeatureCard
              icon={PieIcon}
              title="Budget & Strict Pie Charts"
              desc="Category distributions, monthly ceilings & spending comparisons."
              color="bg-amber-500/10 text-amber-600 dark:text-amber-400"
              delay={380}
              image={IMAGES.budgetCoins}
              imageAlt="Household budget coins and savings planning"
            />
          </div>

          {/* Trust bar */}
          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 animate-fade-in" style={{ animationDelay: '440ms' }}>
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Persistent SQLite database • Zero dummy data • Fully isolated accounts</span>
          </div>
        </div>

        {/* ── Right: Auth Card ── */}
        <div className="lg:col-span-5 w-full animate-fade-in" style={{ animationDelay: '100ms' }}>
          <div className="relative">
            {/* Card glow */}
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-sky-400/20 via-indigo-400/20 to-violet-400/20 dark:from-sky-500/10 dark:via-indigo-500/10 dark:to-violet-500/10 blur-xl" />

            <div className="relative bg-white/90 dark:bg-slate-900/90 border border-white/80 dark:border-slate-700/60 rounded-3xl shadow-2xl shadow-slate-200/60 dark:shadow-slate-950/60 overflow-hidden glass-card">
              <div className="relative h-28 sm:h-32">
                <img
                  src={IMAGES.cards}
                  alt="Credit cards used for household digital payments"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-slate-900 via-white/40 dark:via-slate-900/50 to-slate-900/20" />
                <p className="absolute bottom-3 left-6 sm:left-8 text-[10px] font-bold uppercase tracking-widest text-sky-700 dark:text-sky-300">
                  Secure household ledger access
                </p>
              </div>

              <div className="p-6 sm:p-8 pt-4">
              {/* Tab switcher */}
              <div className="flex rounded-xl bg-slate-100/80 dark:bg-slate-800/80 p-1 mb-6">
                {['signin', 'signup'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all duration-200 btn-press ${
                      mode === m
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {m === 'signin' ? 'Sign In' : 'Create Account'}
                  </button>
                ))}
              </div>

              {/* Heading */}
              <div className="mb-6">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {mode === 'signup' ? 'Get Started Free' : 'Welcome back'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {mode === 'signup'
                    ? 'Create your isolated household ledger with real data persistence.'
                    : 'Enter your credentials to access your household records.'}
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4 text-left">
                {mode === 'signup' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Your Name</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Sarah Jenkins"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onFocus={() => setFocusedField('name')}
                        onBlur={() => setFocusedField(null)}
                        className={inputClass('name')}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      required
                      placeholder="you@household.app"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                      className={inputClass('email')}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      className={inputClass('password')}
                    />
                  </div>
                </div>

                {mode === 'signup' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Preferred Currency</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full px-3.5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-400 transition-all"
                    >
                      {CURRENCIES.map(c => (
                        <option key={c.code} value={c.code}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-sky-600 via-indigo-600 to-violet-600 hover:from-sky-500 hover:via-indigo-500 hover:to-violet-500 disabled:opacity-50 transition-all duration-200 shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 hover:-translate-y-0.5 flex items-center justify-center gap-2 btn-press"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>{mode === 'signup' ? 'Create Account & Enter' : 'Sign In to HomeSphere'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Trust footer */}
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Persistent SQLite Database • Zero Dummy Data</span>
              </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-xs text-slate-400 dark:text-slate-600">
        HomeSphere — Professional Household Management Application
      </footer>
    </div>
  );
}
