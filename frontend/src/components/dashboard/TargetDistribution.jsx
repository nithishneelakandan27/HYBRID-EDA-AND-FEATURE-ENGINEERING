import React from 'react'
import { useApp } from '../../context/AppContext'
import { ActivityIcon, InfoIcon } from '../common/Icons'

export default function TargetDistribution() {
  const { datasetResult } = useApp()

  if (!datasetResult) return null

  const targetProfile = datasetResult.target_profile

  if (!targetProfile) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between">
        <div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Target Distribution
          </span>
          <p className="text-xs text-slate-500 mt-2">
            Target column <code className="font-semibold text-slate-700">Late_delivery_risk</code> was not detected.
          </p>
        </div>
      </div>
    )
  }

  const counts = targetProfile.class_counts || {}
  const percentages = targetProfile.class_percentages || {}

  const onTimeCount = counts['0'] || 0
  const lateCount = counts['1'] || 0
  const onTimePct = percentages['0'] || 0
  const latePct = percentages['1'] || 0
  const total = onTimeCount + lateCount

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Target Distribution: Late_delivery_risk
          </span>
          <span className="text-xs font-mono font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
            Binary Classification Target
          </span>
        </div>

        {/* Dynamic Plain-English Explanation Banner */}
        <div className="bg-indigo-50/70 border border-indigo-100/80 rounded-xl p-3.5 mb-5 flex items-start gap-2.5">
          <ActivityIcon className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <p className="text-xs text-indigo-900 leading-relaxed">
            <span className="font-semibold">About {latePct}% of shipments</span> were flagged with late delivery risk (<span className="font-semibold">{lateCount.toLocaleString()}</span> orders delayed vs <span className="font-semibold">{onTimeCount.toLocaleString()}</span> on-time).
          </p>
        </div>

        {/* Proportional Stacked Bar */}
        <div className="space-y-2 mb-4">
          <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
            <div
              style={{ width: `${onTimePct}%` }}
              className="bg-emerald-500 hover:bg-emerald-600 transition-all duration-500"
              title={`Class 0 (On-Time / Early): ${onTimePct}%`}
            />
            <div
              style={{ width: `${latePct}%` }}
              className="bg-rose-500 hover:bg-rose-600 transition-all duration-500"
              title={`Class 1 (Late Delivery Risk): ${latePct}%`}
            />
          </div>

          <div className="flex justify-between items-center text-[11px] text-slate-500 font-mono">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Category Breakdown Cards */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3 text-left">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Class 0: On-Time</span>
            </div>
            <div className="text-lg font-bold text-slate-900 mt-1">
              {onTimeCount.toLocaleString()}
            </div>
            <div className="text-[11px] font-mono text-emerald-700 font-semibold mt-0.5">
              {onTimePct}% of total orders
            </div>
          </div>

          <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-3 text-left">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-800">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>Class 1: Late Risk</span>
            </div>
            <div className="text-lg font-bold text-slate-900 mt-1">
              {lateCount.toLocaleString()}
            </div>
            <div className="text-[11px] font-mono text-rose-700 font-semibold mt-0.5">
              {latePct}% of total orders
            </div>
          </div>
        </div>
      </div>

      <p className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
        Stratified train/test split automatically preserves this {latePct}% to {onTimePct}% ratio to prevent class imbalance skew.
      </p>
    </div>
  )
}
