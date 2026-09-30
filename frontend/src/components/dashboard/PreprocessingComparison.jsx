import React, { useState, useEffect } from 'react'
import {
  BarChart3Icon,
  ShieldCheckIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  RefreshCwIcon,
  PlayIcon,
  FilterIcon,
  ArrowRightIcon,
  SlidersIcon,
  ActivityIcon,
  InfoIcon
} from '../common/Icons'

export default function PreprocessingComparison({
  comparison,
  session,
  isExecuting,
  onExecute,
  error,
  navigateTo
}) {
  const [selectedCol, setSelectedCol] = useState(null)

  // Derive column list from comparison data
  const columnsMap = comparison?.columns || {}
  const columnKeys = Object.keys(columnsMap)

  // Separate numeric and categorical column names
  const numericCols = columnKeys.filter(k => columnsMap[k]?.type === 'numeric')
  const categoricalCols = columnKeys.filter(k => columnsMap[k]?.type === 'categorical')

  // Auto-select first column with missing values or first numeric column
  useEffect(() => {
    if (!selectedCol && columnKeys.length > 0) {
      const colWithMissing = columnKeys.find(k => columnsMap[k]?.before?.missing > 0)
      setSelectedCol(colWithMissing || numericCols[0] || columnKeys[0])
    }
  }, [columnKeys, selectedCol, columnsMap, numericCols])

  // If no comparison data yet
  if (!comparison) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                <BarChart3Icon className="w-4 h-4" />
              </span>
              <h3 className="text-base font-bold text-slate-900">
                Preprocessing Impact & Transformation Evidence
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Empirical visual comparison: Raw Data → Automated Preprocessing → Cleaned Data
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-200 w-fit">
            Awaiting Pipeline Execution
          </span>
        </div>

        <div className="bg-gradient-to-br from-slate-50 to-indigo-50/30 rounded-xl p-8 border border-slate-200/70 text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100/70 text-indigo-600 flex items-center justify-center mx-auto mb-3">
            <SlidersIcon className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 mb-1">
            Execute Preprocessing to Inspect Before vs After Transformation
          </h4>
          <p className="text-xs text-slate-600 max-w-md mx-auto mb-5 leading-relaxed">
            Run the automated Hybrid Preprocessing pipeline to generate empirical evidence of how missing values are imputed, outliers treated, duplicates verified, and distributions normalized.
          </p>

          {error && (
            <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-3 max-w-md mx-auto mb-4">
              {error}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={onExecute}
              disabled={isExecuting}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {isExecuting ? (
                <>
                  <RefreshCwIcon className="w-4 h-4 animate-spin" />
                  <span>Executing Preprocessing…</span>
                </>
              ) : (
                <>
                  <PlayIcon className="w-4 h-4" />
                  <span>Execute Preprocessing Pipeline</span>
                </>
              )}
            </button>
            <button
              onClick={() => navigateTo && navigateTo('/preparation')}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              <span>View Data Preparation Plan</span>
              <ArrowRightIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  const overall = comparison.overall || {}
  const beforeOverall = overall.before || {}
  const afterOverall = overall.after || {}
  const missingResolvedPct = overall.missing_resolved_pct ?? 100

  const activeColData = selectedCol ? columnsMap[selectedCol] : null
  const isNumeric = activeColData?.type === 'numeric'

  // Max value calculation for chart scaling
  let maxFreq = 1
  if (isNumeric && activeColData?.histogram) {
    maxFreq = Math.max(
      1,
      ...activeColData.histogram.map(b => Math.max(b.before_count || 0, b.after_count || 0))
    )
  } else if (!isNumeric && activeColData?.categories) {
    maxFreq = Math.max(
      1,
      ...activeColData.categories.map(c => Math.max(c.before_count || 0, c.after_count || 0))
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
      {/* ── Section Title & Re-run Action ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
              <BarChart3Icon className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-slate-900">
              Preprocessing Impact: Before vs After Transformation
            </h3>
            <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
              Empirical Evidence
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Real data transformations computed between raw inputs and Phase 1 preprocessed dataset.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onExecute}
            disabled={isExecuting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
            title="Re-run the preprocessing pipeline"
          >
            <RefreshCwIcon className={`w-3.5 h-3.5 ${isExecuting ? 'animate-spin' : ''}`} />
            <span>{isExecuting ? 'Processing…' : 'Re-run Preprocessing'}</span>
          </button>
        </div>
      </div>

      {/* ── Summary Comparison Cards (Before vs After) ────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Missing Values Card */}
        <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
            <span>Missing Values</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
              {missingResolvedPct}% Resolved
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <div>
              <span className="text-xs text-slate-400 font-medium">Before: </span>
              <span className="text-lg font-bold text-slate-700">
                {beforeOverall.missing_values?.toLocaleString() ?? 0}
              </span>
            </div>
            <ArrowRightIcon className="w-3.5 h-3.5 text-slate-400" />
            <div>
              <span className="text-xs text-slate-400 font-medium">After: </span>
              <span className="text-lg font-bold text-emerald-600">
                {afterOverall.missing_values?.toLocaleString() ?? 0}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Skew-aware numeric median/mean & categorical mode imputation.
          </p>
        </div>

        {/* Outliers Card */}
        <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
            <span>Outliers Detected</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
              IQR Scaled
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <div>
              <span className="text-xs text-slate-400 font-medium">Before: </span>
              <span className="text-lg font-bold text-slate-700">
                {beforeOverall.outliers?.toLocaleString() ?? 0}
              </span>
            </div>
            <ArrowRightIcon className="w-3.5 h-3.5 text-slate-400" />
            <div>
              <span className="text-xs text-slate-400 font-medium">After: </span>
              <span className="text-lg font-bold text-indigo-600">
                Treated
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            RobustScaler & log1p bounds protect against extreme leverage points.
          </p>
        </div>

        {/* Duplicate Rows Card */}
        <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
            <span>Duplicate Records</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
              Validated
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <div>
              <span className="text-xs text-slate-400 font-medium">Before: </span>
              <span className="text-lg font-bold text-slate-700">
                {beforeOverall.duplicate_rows?.toLocaleString() ?? 0}
              </span>
            </div>
            <ArrowRightIcon className="w-3.5 h-3.5 text-slate-400" />
            <div>
              <span className="text-xs text-slate-400 font-medium">After: </span>
              <span className="text-lg font-bold text-blue-600">
                {afterOverall.duplicate_rows?.toLocaleString() ?? 0}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Preserves genuine duplicate-free dataset integrity across rows.
          </p>
        </div>

        {/* Columns & Leakage Quarantine Card */}
        <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
            <span>Usable Columns</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
              Leakage-Free
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <div>
              <span className="text-xs text-slate-400 font-medium">Raw: </span>
              <span className="text-lg font-bold text-slate-700">
                {beforeOverall.columns ?? 0}
              </span>
            </div>
            <ArrowRightIcon className="w-3.5 h-3.5 text-slate-400" />
            <div>
              <span className="text-xs text-slate-400 font-medium">Cleaned: </span>
              <span className="text-lg font-bold text-purple-600">
                {afterOverall.columns ?? 0}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Post-event leakage columns quarantined from feature space.
          </p>
        </div>
      </div>

      {/* ── Feature Selection Dropdown & Detailed Comparison ──────────────── */}
      <div className="bg-slate-50/50 rounded-2xl border border-slate-200/80 p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FilterIcon className="w-4 h-4 text-slate-500" />
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Select Feature to Compare:
            </label>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedCol || ''}
              onChange={(e) => setSelectedCol(e.target.value)}
              className="bg-white border border-slate-300 text-slate-800 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
            >
              <optgroup label={`Numerical Features (${numericCols.length})`}>
                {numericCols.map(col => {
                  const hasMissing = (columnsMap[col]?.before?.missing || 0) > 0
                  return (
                    <option key={col} value={col}>
                      {col} {hasMissing ? `⚠️ (${columnsMap[col].before.missing} missing)` : ''}
                    </option>
                  )
                })}
              </optgroup>
              <optgroup label={`Categorical Features (${categoricalCols.length})`}>
                {categoricalCols.map(col => {
                  const hasMissing = (columnsMap[col]?.before?.missing || 0) > 0
                  return (
                    <option key={col} value={col}>
                      {col} {hasMissing ? `⚠️ (${columnsMap[col].before.missing} missing)` : ''}
                    </option>
                  )
                })}
              </optgroup>
            </select>
          </div>
        </div>

        {activeColData && (
          <div className="space-y-4">
            {/* Feature Header Badge Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-bold text-slate-900 font-mono">
                  {activeColData.name}
                </span>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md font-mono ${
                  isNumeric ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-purple-50 text-purple-700 border border-purple-200'
                }`}>
                  {activeColData.type}
                </span>
                <span className="text-xs font-medium px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200">
                  Strategy: {activeColData.strategy}
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <div>
                  <span className="text-slate-400">Missing Before: </span>
                  <span className={`font-semibold ${activeColData.before.missing > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                    {activeColData.before.missing.toLocaleString()} ({activeColData.before.missing_pct}%)
                  </span>
                </div>
                <ArrowRightIcon className="w-3 h-3 text-slate-300" />
                <div>
                  <span className="text-slate-400">Missing After: </span>
                  <span className="font-semibold text-emerald-600">
                    {activeColData.after.missing} (0.00%)
                  </span>
                </div>
              </div>
            </div>

            {/* Feature Stats Metric Grid (for Numerical) */}
            {isNumeric && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {[
                  { label: 'Mean', before: activeColData.before.mean, after: activeColData.after.mean },
                  { label: 'Median', before: activeColData.before.median, after: activeColData.after.median },
                  { label: 'Std Dev', before: activeColData.before.std, after: activeColData.after.std },
                  { label: 'Min', before: activeColData.before.min, after: activeColData.after.min },
                  { label: 'Max', before: activeColData.before.max, after: activeColData.after.max },
                  { label: 'Outliers (IQR)', before: activeColData.before.outliers, after: activeColData.after.outliers },
                ].map((stat, i) => (
                  <div key={i} className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                      {stat.label}
                    </span>
                    <div className="flex items-center justify-between text-xs mt-1">
                      <span className="text-slate-500 font-mono" title="Before Preprocessing">
                        {stat.before != null ? Number(stat.before).toLocaleString() : '—'}
                      </span>
                      <ArrowRightIcon className="w-2.5 h-2.5 text-slate-300 mx-1 flex-shrink-0" />
                      <span className="font-bold text-slate-800 font-mono" title="After Preprocessing">
                        {stat.after != null ? Number(stat.after).toLocaleString() : '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Distribution Visual Comparison Bar Chart */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <ActivityIcon className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    {isNumeric ? 'Value Range Distribution (10-Bin Histogram)' : 'Top Category Frequency Distribution'}
                  </h4>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-slate-300 border border-slate-400 inline-block" />
                    <span className="text-slate-600 font-medium">Before Preprocessing (Raw)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-indigo-500 border border-indigo-600 inline-block" />
                    <span className="text-indigo-700 font-bold">After Preprocessing (Cleaned)</span>
                  </div>
                </div>
              </div>

              {/* Numerical Histogram Bars */}
              {isNumeric && activeColData.histogram && (
                <div className="space-y-3 pt-2">
                  {activeColData.histogram.map((bin, idx) => {
                    const beforePct = maxFreq > 0 ? (bin.before_count / maxFreq) * 100 : 0
                    const afterPct = maxFreq > 0 ? (bin.after_count / maxFreq) * 100 : 0

                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-600 font-semibold">{bin.range}</span>
                          <div className="flex items-center gap-3 text-[11px]">
                            <span className="text-slate-500">
                              Before: <strong className="text-slate-700">{bin.before_count.toLocaleString()}</strong>
                            </span>
                            <span className="text-indigo-600">
                              After: <strong className="text-indigo-700">{bin.after_count.toLocaleString()}</strong>
                            </span>
                          </div>
                        </div>
                        {/* Dual Bar Track */}
                        <div className="space-y-1">
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-slate-400 rounded-full transition-all duration-300"
                              style={{ width: `${Math.max(beforePct, 0.5)}%` }}
                              title={`Before: ${bin.before_count}`}
                            />
                          </div>
                          <div className="h-2 w-full bg-indigo-50 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                              style={{ width: `${Math.max(afterPct, 0.5)}%` }}
                              title={`After: ${bin.after_count}`}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Categorical Distribution Bars */}
              {!isNumeric && activeColData.categories && (
                <div className="space-y-3 pt-2">
                  {activeColData.categories.map((cat, idx) => {
                    const beforePct = maxFreq > 0 ? (cat.before_count / maxFreq) * 100 : 0
                    const afterPct = maxFreq > 0 ? (cat.after_count / maxFreq) * 100 : 0

                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800 font-mono truncate max-w-[200px]" title={cat.category}>
                            {cat.category}
                          </span>
                          <div className="flex items-center gap-3 text-[11px] font-mono">
                            <span className="text-slate-500">
                              Before: <strong className="text-slate-700">{cat.before_count.toLocaleString()}</strong>
                            </span>
                            <span className="text-indigo-600">
                              After: <strong className="text-indigo-700">{cat.after_count.toLocaleString()}</strong>
                            </span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-slate-400 rounded-full transition-all duration-300"
                              style={{ width: `${Math.max(beforePct, 0.5)}%` }}
                              title={`Before: ${cat.before_count}`}
                            />
                          </div>
                          <div className="h-2 w-full bg-purple-50 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-600 rounded-full transition-all duration-300"
                              style={{ width: `${Math.max(afterPct, 0.5)}%` }}
                              title={`After: ${cat.after_count}`}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Oral Defense Presentation Note Box */}
            <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-xl p-4 flex items-start gap-3">
              <InfoIcon className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-indigo-900 leading-relaxed">
                <span className="font-bold">Project Presentation Rationale: </span>
                This visualization demonstrates that data cleaning directly remedies anomalies flagged by the Automated EDA engine without distorting genuine feature semantics. Missing values are filled using skew-conditioned measures of central tendency, extreme outlier tails are constrained through RobustScaler IQR scaling, and post-event target leakage columns are quarantined before machine learning training.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
