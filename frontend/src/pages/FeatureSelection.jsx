import React from 'react'
import { useApp } from '../context/AppContext'
import PageContainer from '../components/layout/PageContainer'
import EmptyState from '../components/common/EmptyState'
import MetricCard from '../components/common/MetricCard'
import StatusBadge from '../components/common/StatusBadge'
import {
  GitBranchIcon,
  LayersIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  ArrowRightIcon
} from '../components/common/Icons'

export default function FeatureSelection() {
  const { datasetResult, evaluationResult, preprocessingSession, navigateTo } = useApp()

  if (!datasetResult) {
    return (
      <PageContainer>
        <EmptyState
          title="No dataset loaded"
          description="Upload a CSV dataset to execute feature selection filtering and collinearity removal."
          actionText="Upload Dataset"
          onAction={() => navigateTo('/upload')}
        />
      </PageContainer>
    )
  }

  const fsReport = evaluationResult?.results?.hybrid?.feature_selection_report
  const removedCorrList = fsReport?.removed_high_corr || []
  const removedLowVarianceCount = fsReport?.removed_low_variance_count || 0
  const removedCorrCount = fsReport?.removed_high_corr_count || removedCorrList.length
  const selectedCount = fsReport?.selected_count || preprocessingSession?.features_summary?.transformed_feature_count || 0

  return (
    <PageContainer>
      {/* Overview Metric Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Low-Variance Removed"
          value={removedLowVarianceCount}
          subtitle="Constant / Quasi-constant (<1e-4 variance)"
          icon={LayersIcon}
          badge={removedLowVarianceCount > 0 ? 'Filtered' : 'Zero Constant'}
          badgeStatus={removedLowVarianceCount > 0 ? 'warning' : 'success'}
          colorScheme="amber"
          tooltipText="Features with near-zero variation provide negligible predictive discrimination."
        />

        <MetricCard
          title="High-Correlation Removed"
          value={removedCorrCount}
          subtitle="Multi-collinear duplicate features (|r| > 0.95)"
          icon={GitBranchIcon}
          badge="Pruned"
          badgeStatus="info"
          colorScheme="blue"
          tooltipText="Pairs with Pearson |r| > 0.95 introduce collinear weight instability in linear models."
        />

        <MetricCard
          title="Retained Selected Features"
          value={selectedCount > 0 ? selectedCount : 'Awaiting Run'}
          subtitle="Passed directly into final ML estimator"
          icon={CheckCircleIcon}
          badge="ML-Ready"
          badgeStatus="success"
          colorScheme="emerald"
          tooltipText="Optimal, compact, non-redundant feature matrix."
        />
      </div>

      {/* Two-Stage Selection Methodology Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Automated Two-Stage Selection Engine
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Standardizing the supply chain feature space into orthogonal, numerically well-conditioned predictors without manual guesswork.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
            <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
              Stage 1: Variance Thresholding
            </span>
            <h4 className="text-sm font-bold text-slate-900 mt-1">Variance Filter (var &gt; 1e-4)</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Detects and removes zero-variance or quasi-constant columns where over 99.9% of values are identical across the training set.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
            <span className="text-[10px] font-mono font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
              Stage 2: Multi-Collinearity Pruning
            </span>
            <h4 className="text-sm font-bold text-slate-900 mt-1">Correlation Filter (|r| &gt; 0.95)</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Computes pairwise correlation matrix on training features. When two features exhibit |r| &gt; 0.95, the redundant column is pruned to prevent inflated coefficient variance in Logistic Regression.
            </p>
          </div>
        </div>
      </div>

      {/* Detailed Table of Multi-Collinear Removals */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              Pruned High-Correlation Feature Pairs (|r| &gt; 0.95)
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Identified duplicate signals removed strictly to safeguard L-BFGS solver stability.
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-full">
            {removedCorrList.length} Redundancies Pruned
          </span>
        </div>

        {removedCorrList.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold uppercase">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Pruned Redundant Feature</th>
                  <th className="py-2.5 px-3">Retained Reference Feature</th>
                  <th className="py-2.5 px-3">Pearson Correlation (|r|)</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {removedCorrList.slice(0, 15).map((pair, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 text-slate-400 font-sans">{idx + 1}</td>
                    <td className="py-2.5 px-3 text-rose-700 font-semibold">{pair.removed_feature}</td>
                    <td className="py-2.5 px-3 text-emerald-700 font-semibold">{pair.kept_feature}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{typeof pair.correlation === 'number' ? pair.correlation.toFixed(4) : pair.correlation}</td>
                    <td className="py-2.5 px-3 font-sans">
                      <StatusBadge status="danger">Pruned (|r| &gt; 0.95)</StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl">
            {evaluationResult
              ? 'No multi-collinear pairs exceeded the 0.95 correlation threshold in this dataset.'
              : 'Run Model Evaluation to view the live correlation pruning audit trail.'}
          </div>
        )}
      </div>
    </PageContainer>
  )
}
