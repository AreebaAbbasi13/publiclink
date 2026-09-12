import React from 'react';

export function CardVisual({ src, alt, height = 'h-24 sm:h-28' }) {
  return (
    <div className={`relative -mx-5 sm:-mx-6 -mt-5 sm:-mt-6 mb-4 ${height} overflow-hidden rounded-t-3xl`}>
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/30 via-slate-900/10 to-white dark:to-slate-900 transition-colors duration-200" />
    </div>
  );
}

export function InlineVisual({ src, alt, className = '' }) {
  return (
    <figure className={`relative overflow-hidden rounded-2xl shadow-lg shadow-slate-900/10 dark:shadow-black/40 ring-1 ring-white/60 dark:ring-white/10 ${className}`}>
      <img src={src} alt={alt} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/40 via-transparent to-sky-900/10 dark:from-slate-950/65 dark:to-indigo-950/20 pointer-events-none" />
    </figure>
  );
}

export function EmptyVisualState({ image, title, message, actionText, onAction }) {
  return (
    <div className="p-8 sm:p-12 text-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 backdrop-blur-sm flex flex-col items-center justify-center space-y-4">
      {image && (
        <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-2xl overflow-hidden shadow-xl shadow-slate-900/10 dark:shadow-black/50 ring-1 ring-white/60 dark:ring-white/10">
          <img src={image} alt={title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent" />
        </div>
      )}
      <div className="max-w-md space-y-1">
        <h4 className="text-base font-bold text-slate-900 dark:text-white">{title}</h4>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{message}</p>
      </div>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white shadow-md shadow-sky-500/20 btn-press"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}

export default function PageHero({
  badge,
  icon: Icon,
  badgeClass = 'bg-sky-50 dark:bg-sky-950/60 border-sky-200/60 dark:border-sky-800/60 text-sky-700 dark:text-sky-300',
  iconClass = 'text-sky-500',
  title,
  subtitle,
  description,
  image,
  imageAlt,
  imageCaption,
  children,
  printHidden = false,
}) {
  return (
    <section
      className={`relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/75 dark:bg-slate-900/75 shadow-sm glass transition-all ${
        printHidden ? 'print:hidden' : ''
      }`}
    >
      <div className="absolute inset-0 mesh-grid opacity-50 pointer-events-none" />
      <div className="absolute -top-24 -right-16 w-80 h-80 bg-sky-400/10 dark:bg-sky-500/5 rounded-full blur-3xl pointer-events-none animate-float-slow" />
      <div className="absolute -bottom-24 -left-16 w-64 h-64 bg-indigo-400/10 dark:bg-indigo-500/5 rounded-full blur-3xl pointer-events-none animate-float" />

      <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 sm:p-8 items-center z-10">
        <div className="lg:col-span-7 space-y-4">
          {badge && (
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold ${badgeClass} shadow-xs`}>
              {Icon && <Icon className={`w-3.5 h-3.5 ${iconClass}`} />}
              <span>{badge}</span>
            </div>
          )}
          
          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm sm:text-base font-semibold text-sky-600 dark:text-sky-400">
                {subtitle}
              </p>
            )}
          </div>

          {description && (
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
              {description}
            </p>
          )}

          {children && (
            <div className="flex items-center gap-3 flex-wrap pt-2">{children}</div>
          )}
        </div>

        <div className="lg:col-span-5">
          <figure className="relative aspect-[16/10] sm:aspect-[21/11] lg:aspect-[16/10] rounded-2xl overflow-hidden shadow-2xl shadow-slate-900/15 dark:shadow-black/60 ring-1 ring-white/60 dark:ring-white/10 group">
            <img
              src={image}
              alt={imageAlt}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/25 to-transparent dark:from-slate-950/85 dark:via-slate-950/40" />
            {imageCaption && (
              <figcaption className="absolute bottom-3.5 left-4 right-4 text-xs font-semibold text-white/95 drop-shadow-md">
                {imageCaption}
              </figcaption>
            )}
          </figure>
        </div>
      </div>
    </section>
  );
}
