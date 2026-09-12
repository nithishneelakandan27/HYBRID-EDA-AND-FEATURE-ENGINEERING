import React from 'react'

export default function StatusBadge({ status = 'info', children, className = '' }) {
  const styles = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-500/10',
    warning: 'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-500/10',
    danger: 'bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-rose-500/10',
    critical: 'bg-red-50 text-red-700 border-red-200 ring-1 ring-red-500/10',
    info: 'bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-500/10',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-1 ring-indigo-500/10',
    teal: 'bg-teal-50 text-teal-700 border-teal-200 ring-1 ring-teal-500/10',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200 ring-1 ring-slate-400/10',
    purple: 'bg-purple-50 text-purple-700 border-purple-200 ring-1 ring-purple-500/10'
  }

  const selectedStyle = styles[status] || styles.info

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${selectedStyle} ${className}`}
    >
      {children}
    </span>
  )
}
