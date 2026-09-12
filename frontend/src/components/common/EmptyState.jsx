import React from 'react'
import { UploadCloudIcon, DatabaseIcon, ArrowRightIcon } from './Icons'
import { useApp } from '../../context/AppContext'

export default function EmptyState({
  icon: Icon = DatabaseIcon,
  title = "No dataset uploaded yet",
  description = "Upload a CSV dataset to begin automated exploratory data analysis, hybrid preprocessing, and machine learning evaluation.",
  actionText = "Go to Data Upload",
  onAction
}) {
  const { navigateTo } = useApp()

  const handleAction = () => {
    if (onAction) {
      onAction()
    } else {
      navigateTo('/upload')
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-sm max-w-2xl mx-auto my-8">
      <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-4">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed mb-6">
        {description}
      </p>
      {actionText && (
        <button
          onClick={handleAction}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow transition-all duration-150 cursor-pointer"
        >
          <UploadCloudIcon className="w-4 h-4" />
          <span>{actionText}</span>
          <ArrowRightIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
