import React from 'react'
import Tooltip from './Tooltip'

export default function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  badge,
  badgeStatus = 'neutral',
  colorScheme = 'indigo', // 'indigo' | 'emerald' | 'amber' | 'blue' | 'rose' | 'purple' | 'teal'
  tooltipText,
  onClick
}) {
  const schemeStyles = {
    indigo: {
      iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-100',
      value: 'text-slate-900',
      borderHover: 'hover:border-indigo-300 hover:shadow-indigo-50/50'
    },
    blue: {
      iconBg: 'bg-blue-50 text-blue-600 border-blue-100',
      value: 'text-slate-900',
      borderHover: 'hover:border-blue-300 hover:shadow-blue-50/50'
    },
    emerald: {
      iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      value: 'text-slate-900',
      borderHover: 'hover:border-emerald-300 hover:shadow-emerald-50/50'
    },
    amber: {
      iconBg: 'bg-amber-50 text-amber-600 border-amber-100',
      value: 'text-slate-900',
      borderHover: 'hover:border-amber-300 hover:shadow-amber-50/50'
    },
    rose: {
      iconBg: 'bg-rose-50 text-rose-600 border-rose-100',
      value: 'text-slate-900',
      borderHover: 'hover:border-rose-300 hover:shadow-rose-50/50'
    },
    purple: {
      iconBg: 'bg-purple-50 text-purple-600 border-purple-100',
      value: 'text-slate-900',
      borderHover: 'hover:border-purple-300 hover:shadow-purple-50/50'
    },
    teal: {
      iconBg: 'bg-teal-50 text-teal-600 border-teal-100',
      value: 'text-slate-900',
      borderHover: 'hover:border-teal-300 hover:shadow-teal-50/50'
    }
  }

  const currentScheme = schemeStyles[colorScheme] || schemeStyles.indigo

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm transition-all duration-200 ${
        onClick ? 'cursor-pointer' : ''
      } ${currentScheme.borderHover}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {title}
          </span>
          {tooltipText && <Tooltip text={tooltipText} />}
        </div>
        {Icon && (
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center border ${currentScheme.iconBg}`}
          >
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <div className={`text-2xl font-bold tracking-tight ${currentScheme.value}`}>
          {value}
        </div>
        {badge && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              badgeStatus === 'success'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : badgeStatus === 'warning'
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : badgeStatus === 'danger'
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            {badge}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="mt-1.5 text-xs text-slate-500 flex items-center gap-1">
          {subtitle}
        </p>
      )}
    </div>
  )
}
