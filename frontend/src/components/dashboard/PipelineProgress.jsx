import React from 'react'
import { useApp } from '../../context/AppContext'
import { CheckCircleIcon, ArrowRightIcon } from '../common/Icons'

export default function PipelineProgress() {
  const {
    datasetResult,
    edaResult,
    decisionPlan,
    preprocessingSession,
    evaluationResult,
    navigateTo
  } = useApp()

  const stages = [
    {
      id: 'upload',
      name: 'Uploaded',
      subtitle: datasetResult
        ? `${datasetResult.summary.num_rows.toLocaleString()} rows`
        : 'Waiting for CSV',
      route: '/upload',
      completed: !!datasetResult
    },
    {
      id: 'overview',
      name: 'Understood',
      subtitle: datasetResult
        ? `${datasetResult.summary.num_cols} columns profiled`
        : 'Schema profiling',
      route: '/overview',
      completed: !!datasetResult
    },
    {
      id: 'quality',
      name: 'Quality Checked',
      subtitle: edaResult
        ? `${edaResult.findings.length} findings detected`
        : 'Automated EDA',
      route: '/quality',
      completed: !!edaResult
    },
    {
      id: 'decisions',
      name: 'Decisions Made',
      subtitle: decisionPlan
        ? `${decisionPlan.columns.length} columns planned`
        : 'Hybrid rules & stats',
      route: '/decisions',
      completed: !!decisionPlan
    },
    {
      id: 'preparation',
      name: 'Data Prepared',
      subtitle: preprocessingSession
        ? `${preprocessingSession.features_summary.transformed_feature_count} features ready`
        : 'Train/test split & fit',
      route: '/preparation',
      completed: !!preprocessingSession
    },
    {
      id: 'feature-engineering',
      name: 'Features Created',
      subtitle: evaluationResult?.results?.hybrid?.feature_engineering_report
        ? `${evaluationResult.results.hybrid.feature_engineering_report.accepted.length} accepted`
        : 'Domain signals',
      route: '/feature-engineering',
      completed: !!evaluationResult?.results?.hybrid?.feature_engineering_report
    },
    {
      id: 'feature-selection',
      name: 'Features Selected',
      subtitle: evaluationResult?.results?.hybrid?.feature_selection_report
        ? `${evaluationResult.results.hybrid.feature_selection_report.selected_count} high-impact`
        : 'Variance & correlation',
      route: '/feature-selection',
      completed: !!evaluationResult?.results?.hybrid?.feature_selection_report
    },
    {
      id: 'evaluation',
      name: 'Model Evaluated',
      subtitle: evaluationResult
        ? `F1: ${(evaluationResult.results.hybrid.metrics.f1 * 100).toFixed(1)}%`
        : '3-Pipeline benchmark',
      route: '/evaluation',
      completed: !!evaluationResult
    }
  ]

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Your ML Preparation Journey
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            End-to-end automated pipeline progression from raw supply chain data to trained model.
          </p>
        </div>
        <div className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 self-start sm:self-auto">
          {stages.filter(s => s.completed).length} of {stages.length} Stages Completed
        </div>
      </div>

      {/* Pipeline Stepper Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {stages.map((stage, idx) => {
          return (
            <div
              key={stage.id}
              onClick={() => navigateTo(stage.route)}
              className={`p-3 rounded-xl border transition-all duration-150 cursor-pointer flex flex-col justify-between ${
                stage.completed
                  ? 'bg-emerald-50/40 border-emerald-200/80 hover:bg-emerald-50 hover:border-emerald-300'
                  : 'bg-slate-50/60 border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 opacity-80'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold text-slate-400">
                  0{idx + 1}
                </span>
                {stage.completed ? (
                  <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300" />
                )}
              </div>

              <div>
                <div
                  className={`text-xs font-bold leading-tight ${
                    stage.completed ? 'text-slate-900' : 'text-slate-600'
                  }`}
                >
                  {stage.name}
                </div>
                <div className="text-[10px] text-slate-500 mt-1 leading-tight truncate">
                  {stage.subtitle}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
