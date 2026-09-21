import React from 'react'
import { useApp } from '../../context/AppContext'
import { ActivityIcon } from '../common/Icons'

const PALETTE = [
  { bg: 'bg-emerald-500', text: 'text-emerald-800', lightBg: 'bg-emerald-50/50', border: 'border-emerald-100', pctText: 'text-emerald-700' },
  { bg: 'bg-rose-500', text: 'text-rose-800', lightBg: 'bg-rose-50/50', border: 'border-rose-100', pctText: 'text-rose-700' },
  { bg: 'bg-indigo-500', text: 'text-indigo-800', lightBg: 'bg-indigo-50/50', border: 'border-indigo-100', pctText: 'text-indigo-700' },
  { bg: 'bg-amber-500', text: 'text-amber-800', lightBg: 'bg-amber-50/50', border: 'border-amber-100', pctText: 'text-amber-700' },
  { bg: 'bg-purple-500', text: 'text-purple-800', lightBg: 'bg-purple-50/50', border: 'border-purple-100', pctText: 'text-purple-700' },
]

export default function TargetDistribution() {
  const { datasetResult } = useApp()

  if (!datasetResult) return null

  const targetProfile = datasetResult.target_profile

  if (!targetProfile || !targetProfile.target_column) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between">
        <div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Target Distribution
          </span>
          <p className="text-xs text-slate-500 mt-2">
            Target column was not detected. Please select a target column in ML Modeling.
          </p>
        </div>
      </div>
    )
  }

  const targetCol = targetProfile.target_column
  const counts = targetProfile.class_counts || {}
  const percentages = targetProfile.class_percentages || {}

  const classes = Object.keys(counts)
  const isBinary = classes.length === 2
  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Target Distribution: {targetCol}
          </span>
          <span className="text-xs font-mono font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
            {isBinary ? 'Binary Classification Target' : `Multiclass Target (${classes.length} classes)`}
          </span>
        </div>

        {/* Proportional Stacked Bar */}
        <div className="space-y-2 mb-4">
          <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
            {classes.map((cls, idx) => {
              const pct = percentages[cls] || 0
              const color = PALETTE[idx % PALETTE.length]
              return (
                <div
                  key={cls}
                  style={{ width: `${pct}%` }}
                  className={`${color.bg} transition-all duration-500`}
                  title={`Class ${cls}: ${pct}%`}
                />
              )
            })}
          </div>

          <div className="flex justify-between items-center text-[11px] text-slate-500 font-mono">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Category Breakdown Cards */}
        <div className={`grid gap-3 mt-4 ${classes.length > 2 ? 'grid-cols-3 sm:grid-cols-3' : 'grid-cols-2'}`}>
          {classes.map((cls, idx) => {
            const count = counts[cls] || 0
            const pct = percentages[cls] || 0
            const color = PALETTE[idx % PALETTE.length]
            return (
              <div key={cls} className={`${color.lightBg} border ${color.border} rounded-xl p-3 text-left`}>
                <div className={`flex items-center gap-1.5 text-xs font-semibold ${color.text} truncate`} title={`Class: ${cls}`}>
                  <span className={`w-2.5 h-2.5 rounded-full ${color.bg} shrink-0`} />
                  <span className="truncate">{cls}</span>
                </div>
                <div className="text-lg font-bold text-slate-900 mt-1">
                  {count.toLocaleString()}
                </div>
                <div className={`text-[11px] font-mono ${color.pctText} font-semibold mt-0.5`}>
                  {pct}% of total
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <p className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
        Stratified train/test split automatically preserves class distribution to prevent imbalance skew.
      </p>
    </div>
  )
}
