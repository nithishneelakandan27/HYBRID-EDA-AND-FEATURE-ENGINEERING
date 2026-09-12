import React from 'react'
import { useApp } from '../../context/AppContext'
import { PieChartIcon } from '../common/Icons'

export default function DataTypesChart() {
  const { datasetResult } = useApp()

  if (!datasetResult) return null

  const summary = datasetResult.summary
  const totalCols = summary.num_cols || 1

  // Count inferred column types from profiles
  let numericCount = summary.numeric_column_count || 0
  let categoricalCount = summary.categorical_column_count || 0
  let dateCount = 0
  let idCount = 0

  if (datasetResult.column_profiles) {
    datasetResult.column_profiles.forEach(col => {
      const name = col.column_name.toLowerCase()
      if (name.includes('date') || name.includes('time') || name.includes('timestamp')) {
        dateCount++
      } else if (name.endsWith('_id') || name.includes(' id') || name === 'id') {
        idCount++
      }
    })
  }

  // Adjust non-overlapping representation
  const generalCategorical = Math.max(0, categoricalCount - dateCount)
  const generalNumeric = Math.max(0, numericCount - idCount)

  const segments = [
    { label: 'Numeric Features', count: generalNumeric, color: '#4F46E5', bg: 'bg-indigo-600', ring: 'ring-indigo-100' },
    { label: 'Categorical Attributes', count: generalCategorical, color: '#0D9488', bg: 'bg-teal-600', ring: 'ring-teal-100' },
    { label: 'Date / Timestamp Fields', count: dateCount, color: '#F59E0B', bg: 'bg-amber-500', ring: 'ring-amber-100' },
    { label: 'Identifiers / System Keys', count: idCount, color: '#64748B', bg: 'bg-slate-500', ring: 'ring-slate-100' }
  ].filter(s => s.count > 0)

  // Compute SVG Donut Chart Paths
  let cumulativeAngle = 0
  const radius = 38
  const strokeWidth = 14
  const circumference = 2 * Math.PI * radius

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Data Type Distribution
          </span>
          <span className="text-xs font-mono font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
            {totalCols} Columns Analyzed
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6 my-2">
          {/* SVG Donut Chart */}
          <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
            <svg className="w-36 h-36 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r={radius} fill="none" stroke="#F1F5F9" strokeWidth={strokeWidth} />
              {segments.map((seg, idx) => {
                const segPercentage = (seg.count / totalCols)
                const dashLength = segPercentage * circumference
                const dashOffset = -cumulativeAngle
                cumulativeAngle += dashLength

                return (
                  <circle
                    key={idx}
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${dashLength} ${circumference}`}
                    strokeDashoffset={dashOffset}
                    className="transition-all duration-500 hover:opacity-90"
                  />
                )
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-slate-900 leading-none">{totalCols}</span>
              <span className="text-[10px] text-slate-400 font-medium mt-0.5">Fields</span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex-1 w-full space-y-2.5">
            {segments.map((seg, idx) => {
              const pct = Math.round((seg.count / totalCols) * 100)
              return (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${seg.bg}`} />
                    <span className="text-slate-600 truncate font-medium">{seg.label}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 font-mono">
                    <span className="font-bold text-slate-800">{seg.count}</span>
                    <span className="text-slate-400 text-[11px]">({pct}%)</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <p className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 leading-relaxed">
        Engine applies separate statistical rules depending on feature classification (e.g., skewness on numerics, cardinality on text).
      </p>
    </div>
  )
}
