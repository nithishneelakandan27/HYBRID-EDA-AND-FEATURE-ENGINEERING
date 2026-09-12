import React from 'react'
import { CheckCircleIcon, SparklesIcon } from './Icons'

export default function LoadingState({
  title = "Analyzing your dataset...",
  subtitle = "The engine is performing comprehensive automated profiling and intelligent rule generation.",
  steps = [
    { label: "Reading CSV file and validating schema", status: "completed" },
    { label: "Extracting statistical column profiles", status: "active" },
    { label: "Checking data quality issues & outliers", status: "pending" },
    { label: "Synthesizing hybrid preprocessing recommendations", status: "pending" }
  ],
  elapsedSeconds = null
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-sm max-w-lg mx-auto my-8 text-center">
      <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-4 relative">
        <SparklesIcon className="w-7 h-7 animate-pulse text-indigo-600" />
        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-indigo-600"></span>
        </span>
      </div>

      <h3 className="text-lg font-bold text-slate-900 mb-1">{title}</h3>
      <p className="text-xs text-slate-500 mb-6 max-w-xs mx-auto">{subtitle}</p>

      {elapsedSeconds !== null && (
        <div className="inline-block px-3 py-1 bg-slate-100 rounded-full text-xs font-mono text-slate-700 mb-6">
          Elapsed: <span className="font-bold text-indigo-600">{elapsedSeconds}s</span>
        </div>
      )}

      <div className="space-y-3 text-left max-w-xs mx-auto">
        {steps.map((step, idx) => (
          <div key={idx} className="flex items-center gap-3 text-xs">
            {step.status === 'completed' ? (
              <CheckCircleIcon className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : step.status === 'active' ? (
              <div className="w-4 h-4 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin shrink-0" />
            ) : (
              <div className="w-4 h-4 rounded-full border border-slate-300 bg-slate-50 shrink-0" />
            )}
            <span
              className={`font-medium ${
                step.status === 'completed'
                  ? 'text-slate-700'
                  : step.status === 'active'
                  ? 'text-indigo-600 font-semibold'
                  : 'text-slate-400'
              }`}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
