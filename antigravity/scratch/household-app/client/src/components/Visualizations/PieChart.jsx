import React, { useState } from 'react';

const DEFAULT_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
  '#f97316', '#6366f1', '#14b8a6', '#d946ef'
];

export default function PieChart({
  data = [],
  title = '',
  subtitle = '',
  currency = 'Rs.',
  donut = true,
  size = 280,
  showLegend = true,
  height = 'auto'
}) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  // Filter valid data items
  const validData = (data || []).filter(item => Number(item.value) > 0);
  const total = validData.reduce((acc, item) => acc + Number(item.value), 0);

  if (validData.length === 0 || total === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="w-16 h-16 rounded-full border-4 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center mb-3 text-slate-400">
          <span className="text-xl">🥧</span>
        </div>
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
          {title || 'Pie Chart'}
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
          No expenditure data recorded yet for this view.
        </p>
      </div>
    );
  }

  // Calculate slice geometry
  const radius = size / 2;
  const innerRadius = donut ? radius * 0.6 : 0;
  let cumulativeAngle = 0;

  const slices = validData.map((item, index) => {
    const fraction = item.value / total;
    const sliceAngle = fraction * 2 * Math.PI;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + sliceAngle;
    cumulativeAngle += sliceAngle;

    // SVG coordinates
    const x1 = radius + radius * Math.sin(startAngle);
    const y1 = radius - radius * Math.cos(startAngle);
    const x2 = radius + radius * Math.sin(endAngle);
    const y2 = radius - radius * Math.cos(endAngle);

    const x1Inner = radius + innerRadius * Math.sin(startAngle);
    const y1Inner = radius - innerRadius * Math.cos(startAngle);
    const x2Inner = radius + innerRadius * Math.sin(endAngle);
    const y2Inner = radius - innerRadius * Math.cos(endAngle);

    const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;

    let pathData = '';
    if (donut) {
      pathData = `
        M ${x1} ${y1}
        A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}
        L ${x2Inner} ${y2Inner}
        A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x1Inner} ${y1Inner}
        Z
      `;
    } else {
      pathData = `
        M ${radius} ${radius}
        L ${x1} ${y1}
        A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}
        Z
      `;
    }

    const percentage = ((item.value / total) * 100).toFixed(1);
    const color = item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length];

    return {
      ...item,
      pathData,
      percentage,
      color,
      index
    };
  });

  const activeSlice = hoveredIdx !== null ? slices[hoveredIdx] : null;

  return (
    <div className="flex flex-col items-center w-full">
      {title && (
        <div className="w-full mb-4 text-left">
          <h4 className="text-base font-semibold text-slate-800 dark:text-slate-100">{title}</h4>
          {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      )}

      <div className="flex flex-col lg:flex-row items-center justify-center gap-6 w-full">
        {/* Pie Chart SVG */}
        <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="transform transition-transform duration-300"
          >
            {slices.map((slice, idx) => (
              <path
                key={idx}
                d={slice.pathData}
                fill={slice.color}
                className={`transition-all duration-200 cursor-pointer ${
                  hoveredIdx === idx ? 'opacity-100 scale-105' : hoveredIdx !== null ? 'opacity-40' : 'opacity-90 hover:opacity-100'
                }`}
                style={{ transformOrigin: `${radius}px ${radius}px` }}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            ))}
          </svg>

          {/* Center Donut Label */}
          {donut && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
              {activeSlice ? (
                <>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
                    {activeSlice.label}
                  </span>
                  <span className="text-base font-bold text-slate-900 dark:text-white">
                    {currency}{Number(activeSlice.value).toFixed(2)}
                  </span>
                  <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400">
                    {activeSlice.percentage}%
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500">
                    Total
                  </span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">
                    {currency}{total.toFixed(2)}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {slices.length} {slices.length === 1 ? 'slice' : 'slices'}
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Legend */}
        {showLegend && (
          <div className="flex flex-col gap-2 w-full max-w-xs max-h-56 overflow-y-auto pr-1">
            {slices.map((slice, idx) => (
              <div
                key={idx}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all duration-150 text-xs ${
                  hoveredIdx === idx
                    ? 'bg-slate-100 dark:bg-slate-800 scale-102'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                    {slice.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {currency}{Number(slice.value).toFixed(2)}
                  </span>
                  <span className="text-slate-400 dark:text-slate-500 w-10 text-right">
                    {slice.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
