import React from 'react'
import { useApp } from '../../context/AppContext'
import { AlertTriangleIcon, AlertCircleIcon, InfoIcon, ArrowRightIcon } from '../common/Icons'

export default function KeyFindingsList() {
  const { edaResult, datasetResult, navigateTo } = useApp()

  if (!edaResult || !edaResult.findings || edaResult.findings.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Key Quality Findings
          </span>
        </div>
        <p className="text-xs text-slate-500">
          No active EDA findings available. Run automated EDA to populate issues.
        </p>
      </div>
    )
  }

  // Pick the top 4-5 findings with priority to High/Critical severity
  const sortedFindings = [...edaResult.findings].sort((a, b) => {
    const weights = { critical: 3, high: 2, warning: 1, info: 0 }
    return (weights[b.severity?.toLowerCase()] || 0) - (weights[a.severity?.toLowerCase()] || 0)
  }).slice(0, 5)

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Key Automated Findings
          </span>
          <span className="ml-2 text-xs font-mono font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
            {edaResult.findings.length} Total Findings
          </span>
        </div>
        <button
          onClick={() => navigateTo('/quality')}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
        >
          <span>View All in Data Quality</span>
          <ArrowRightIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-3">
        {sortedFindings.map((finding, idx) => {
          const isHigh = finding.severity?.toLowerCase() === 'high' || finding.severity?.toLowerCase() === 'critical'
          const isWarning = finding.severity?.toLowerCase() === 'warning'

          return (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border flex items-start gap-3 transition-colors ${
                isHigh
                  ? 'bg-rose-50/40 border-rose-200/80 text-rose-950'
                  : isWarning
                  ? 'bg-amber-50/40 border-amber-200/80 text-amber-950'
                  : 'bg-slate-50 border-slate-200/80 text-slate-900'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {isHigh ? (
                  <AlertCircleIcon className="w-4 h-4 text-rose-600" />
                ) : isWarning ? (
                  <AlertTriangleIcon className="w-4 h-4 text-amber-600" />
                ) : (
                  <InfoIcon className="w-4 h-4 text-blue-600" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded font-mono bg-white border border-slate-200 text-slate-700">
                    {finding.category || 'General'}
                  </span>
                  <span
                    className={`text-[10px] font-semibold uppercase ${
                      isHigh ? 'text-rose-700 font-bold' : isWarning ? 'text-amber-700' : 'text-slate-500'
                    }`}
                  >
                    {finding.severity || 'Info'}
                  </span>
                </div>
                <p className="text-xs mt-1 leading-relaxed text-slate-800 font-medium">
                  {finding.message}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
