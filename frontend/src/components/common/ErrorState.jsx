import React, { useState } from 'react'
import { AlertTriangleIcon, ChevronDownIcon, RefreshCwIcon } from './Icons'

export default function ErrorState({
  title = "Something went wrong",
  message = "We couldn't complete the requested operation. Please verify your data and try again.",
  details,
  onRetry
}) {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <div className="bg-white rounded-2xl border border-rose-200 p-6 shadow-sm max-w-lg mx-auto my-6">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0">
          <AlertTriangleIcon className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-bold text-slate-900">{title}</h4>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">{message}</p>

          {details && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 font-medium transition-colors cursor-pointer"
              >
                <span>{showDetails ? 'Hide technical details' : 'View technical details'}</span>
                <ChevronDownIcon
                  className={`w-3.5 h-3.5 transition-transform ${
                    showDetails ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {showDetails && (
                <pre className="mt-2 p-3 bg-slate-900 text-rose-300 font-mono text-[11px] rounded-lg overflow-x-auto max-h-40 whitespace-pre-wrap">
                  {details}
                </pre>
              )}
            </div>
          )}

          {onRetry && (
            <div className="mt-4">
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
              >
                <RefreshCwIcon className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
