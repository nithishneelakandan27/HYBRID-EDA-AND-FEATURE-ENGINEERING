import React, { useState } from 'react'
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
  BarChart3Icon,
  SlidersIcon,
  ArrowRightIcon
} from '../components/common/Icons'

export default function FeatureSelection() {
  const { datasetResult, evaluationResult, preprocessingSession, navigateTo } = useApp()
  const [activeTab, setActiveTab] = useState('correlation')

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
  const removedLowRelevanceList = fsReport?.removed_low_relevance || []
  const removedLowRelevanceCount = fsReport?.removed_low_relevance_count || removedLowRelevanceList.length
  const relevanceScores = fsReport?.relevance_scores || {}
  const selectedCount = fsReport?.selected_count || preprocessingSession?.features_summary?.transformed_feature_count || 0

  // Sort relevance scores descending by f_statistic for ranking inspection
  const sortedRelevance = Object.entries(relevanceScores)
    .map(([feature, stats]) => ({
      feature,
      f_statistic: stats.f_statistic,
      p_value: stats.p_value,
      isRemoved: removedLowRelevanceList.includes(feature),
    }))
    .sort((a, b) => (b.f_statistic || 0) - (a.f_statistic || 0))

  return (
    <PageContainer>
      {/* Overview 4-Metric Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Stage 1: Low-Variance"
          value={removedLowVarianceCount}
          subtitle="Quasi-constant (<1e-4 variance)"
          icon={LayersIcon}
          badge={removedLowVarianceCount > 0 ? 'Filtered' : 'Zero Constant'}
          badgeStatus={removedLowVarianceCount > 0 ? 'warning' : 'success'}
          colorScheme="amber"
          tooltipText="Features with near-zero variation provide negligible predictive discrimination."
        />

        <MetricCard
          title="Stage 2: High-Correlation"
          value={removedCorrCount}
          subtitle="Collinear duplicates (|r| > 0.95)"
          icon={GitBranchIcon}
          badge="Pruned"
          badgeStatus="info"
          colorScheme="blue"
          tooltipText="Pairs with Pearson |r| > 0.95 introduce collinear weight instability in linear models."
        />

        <MetricCard
          title="Stage 3: Low-Relevance"
          value={removedLowRelevanceCount}
          subtitle="ANOVA F-test (p > 0.05)"
          icon={BarChart3Icon}
          badge={removedLowRelevanceCount > 0 ? 'Pruned' : 'All Significant'}
          badgeStatus={removedLowRelevanceCount > 0 ? 'warning' : 'success'}
          colorScheme="purple"
          tooltipText="Features with p > 0.05 fail the null-hypothesis test for mean differences across target classes."
        />

        <MetricCard
          title="Retained Selected Features"
          value={selectedCount > 0 ? selectedCount : 'Awaiting Run'}
          subtitle="Passed directly into ML estimator"
          icon={CheckCircleIcon}
          badge="ML-Ready"
          badgeStatus="success"
          colorScheme="emerald"
          tooltipText="Optimal, compact, non-redundant feature matrix."
        />
      </div>

      {/* Three-Stage Selection Methodology Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Automated Three-Stage Selection Engine (Multi-Filter Architecture)
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Standardizing the feature space into orthogonal, numerically well-conditioned, statistically significant predictors without target leakage or manual guesswork.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              Computes pairwise correlation matrix on training features. When two features exhibit |r| &gt; 0.95, the redundant column is pruned to prevent inflated coefficient variance.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
            <span className="text-[10px] font-mono font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
              Stage 3: Statistical Relevance
            </span>
            <h4 className="text-sm font-bold text-slate-900 mt-1">ANOVA F-Test (p &le; 0.05)</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Evaluates univariate association with the target on the training set using <code>f_classif</code>. Eliminates uninformative signals failing the 95% confidence threshold.
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation for Selection Audit Reports */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('correlation')}
          className={`pb-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'correlation'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <GitBranchIcon className="w-3.5 h-3.5" />
          Collinear Pairs Pruned ({removedCorrList.length})
        </button>
        <button
          onClick={() => setActiveTab('relevance')}
          className={`pb-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'relevance'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <BarChart3Icon className="w-3.5 h-3.5" />
          Stage 3 Relevance Pruning ({removedLowRelevanceList.length})
        </button>
        <button
          onClick={() => setActiveTab('ranking')}
          className={`pb-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'ranking'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <SlidersIcon className="w-3.5 h-3.5" />
          Feature Significance Ranking ({sortedRelevance.length})
        </button>
      </div>

      {/* Tab 1: Detailed Table of Multi-Collinear Removals */}
      {activeTab === 'correlation' && (
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
                  {removedCorrList.slice(0, 20).map((pair, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-slate-400 font-sans">{idx + 1}</td>
                      <td className="py-2.5 px-3 text-rose-700 font-semibold">{pair.removed_feature}</td>
                      <td className="py-2.5 px-3 text-emerald-700 font-semibold">{pair.kept_feature}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {typeof pair.correlation === 'number' ? pair.correlation.toFixed(4) : pair.correlation}
                      </td>
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
      )}

      {/* Tab 2: Stage 3 Low-Relevance Pruned Features */}
      {activeTab === 'relevance' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Stage 3 Statistical Relevance Pruning Audit (p &gt; 0.05)
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Features eliminated because univariate ANOVA F-test showed no statistically significant relationship with target class.
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-full">
              {removedLowRelevanceList.length} Low-Relevance Features Pruned
            </span>
          </div>

          {removedLowRelevanceList.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold uppercase">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Pruned Feature Name</th>
                    <th className="py-2.5 px-3">F-Statistic</th>
                    <th className="py-2.5 px-3">p-value</th>
                    <th className="py-2.5 px-3">Threshold Condition</th>
                    <th className="py-2.5 px-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {removedLowRelevanceList.map((feat, idx) => {
                    const stats = relevanceScores[feat] || {}
                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 text-slate-400 font-sans">{idx + 1}</td>
                        <td className="py-2.5 px-3 text-rose-700 font-semibold">{feat}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-700">
                          {stats.f_statistic !== undefined ? Number(stats.f_statistic).toFixed(4) : 'N/A'}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-rose-600">
                          {stats.p_value !== undefined ? Number(stats.p_value).toFixed(4) : 'N/A'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 font-sans">p &gt; 0.05 (H₀ not rejected)</td>
                        <td className="py-2.5 px-3 font-sans">
                          <StatusBadge status="danger">Pruned (Low Relevance)</StatusBadge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl space-y-2">
              <CheckCircleIcon className="w-6 h-6 text-emerald-500 mx-auto" />
              <p className="font-semibold text-slate-700">
                {evaluationResult
                  ? 'All non-collinear features exhibited statistically significant target association (p ≤ 0.05).'
                  : 'Run Model Evaluation to view the live Stage 3 statistical relevance audit.'}
              </p>
              <p className="text-[11px] text-slate-400">
                Zero informative features were eliminated unnecessarily.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Feature Significance Ranking */}
      {activeTab === 'ranking' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Top Features Ranked by Univariate F-Statistic
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluated on training set via ANOVA F-test (<code>f_classif</code>). Higher F indicates greater variance between class means relative to within-class variance.
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-full">
              {sortedRelevance.length} Scored Features
            </span>
          </div>

          {sortedRelevance.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold uppercase">
                    <th className="py-2.5 px-3">Rank</th>
                    <th className="py-2.5 px-3">Feature Name</th>
                    <th className="py-2.5 px-3">F-Statistic</th>
                    <th className="py-2.5 px-3">p-value</th>
                    <th className="py-2.5 px-3">Significance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {sortedRelevance.slice(0, 25).map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-slate-400 font-sans font-medium">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{item.feature}</td>
                      <td className="py-2.5 px-3 font-bold text-indigo-700">
                        {item.f_statistic !== null && item.f_statistic !== undefined
                          ? Number(item.f_statistic).toFixed(2)
                          : 'N/A'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {item.p_value !== null && item.p_value !== undefined
                          ? Number(item.p_value) < 1e-4
                            ? '< 0.0001'
                            : Number(item.p_value).toFixed(4)
                          : 'N/A'}
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        {item.isRemoved ? (
                          <StatusBadge status="danger">Pruned (p &gt; 0.05)</StatusBadge>
                        ) : (
                          <StatusBadge status="success">Retained (p &le; 0.05)</StatusBadge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl">
              {evaluationResult
                ? 'No relevance scores recorded.'
                : 'Run Model Evaluation to view feature significance rankings.'}
            </div>
          )}
        </div>
      )}
    </PageContainer>
  )
}

