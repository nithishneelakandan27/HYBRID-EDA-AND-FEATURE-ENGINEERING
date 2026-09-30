import React, { useState, useEffect, useMemo } from 'react'
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
  ArrowRightIcon,
  InfoIcon
} from '../components/common/Icons'

export default function FeatureSelection() {
  const { datasetResult, evaluationResult, preprocessingSession, navigateTo, fetchEvaluationSession } = useApp()
  const [activeTab, setActiveTab] = useState('correlation') // 'correlation' | 'relevance' | 'ranking'

  // Attempt to restore evaluation session if available in backend
  useEffect(() => {
    if (!evaluationResult && typeof fetchEvaluationSession === 'function') {
      fetchEvaluationSession()
    }
  }, [evaluationResult, fetchEvaluationSession])

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
  const pValueThreshold = fsReport?.p_value_threshold ?? 0.05
  const relevanceScores = fsReport?.relevance_scores || {}

  // Stage 1 & 2 extractions
  const removedCorrList = Array.isArray(fsReport?.removed_high_corr) ? fsReport.removed_high_corr : []
  const removedLowVarianceCount = fsReport?.removed_low_variance_count || 0
  const removedCorrCount = fsReport?.removed_high_corr_count ?? removedCorrList.length

  // Stage 3 extractions & normalization (safely handles array of objects OR array of strings)
  const rawRemovedLowRelevance = Array.isArray(fsReport?.removed_low_relevance)
    ? fsReport.removed_low_relevance
    : []

  const normalizedRemovedRelevance = useMemo(() => {
    return rawRemovedLowRelevance.map((item) => {
      if (typeof item === 'string') {
        const stats = relevanceScores[item] || {}
        return {
          feature: item,
          f_statistic: stats.f_statistic,
          p_value: stats.p_value,
          threshold: pValueThreshold,
          reason:
            stats.p_value !== undefined && Number(stats.p_value) > pValueThreshold
              ? `ANOVA p-value (${Number(stats.p_value).toFixed(4)}) > ${pValueThreshold}`
              : 'Low statistical relevance to target'
        }
      }
      return {
        feature: item?.feature || item?.column_name || 'Unknown Feature',
        f_statistic: item?.f_statistic ?? relevanceScores[item?.feature]?.f_statistic,
        p_value: item?.p_value ?? relevanceScores[item?.feature]?.p_value,
        threshold: item?.threshold ?? pValueThreshold,
        reason:
          item?.reason ||
          `ANOVA p-value exceeds significance threshold (p > ${pValueThreshold})`
      }
    })
  }, [rawRemovedLowRelevance, relevanceScores, pValueThreshold])

  const removedRelevanceNameSet = useMemo(() => {
    return new Set(normalizedRemovedRelevance.map((r) => r.feature))
  }, [normalizedRemovedRelevance])

  const removedLowRelevanceCount = fsReport?.removed_low_relevance_count ?? normalizedRemovedRelevance.length
  const totalEvaluatedFeatures = Object.keys(relevanceScores).length
  const retainedRelevanceCount = Math.max(0, totalEvaluatedFeatures - removedLowRelevanceCount)
  const selectedCount =
    fsReport?.selected_count ||
    (Array.isArray(fsReport?.selected_features) ? fsReport.selected_features.length : 0) ||
    preprocessingSession?.features_summary?.transformed_feature_count ||
    0

  // Sort relevance scores descending by f_statistic for ranking inspection
  const sortedRelevance = useMemo(() => {
    if (!relevanceScores || typeof relevanceScores !== 'object') return []
    return Object.entries(relevanceScores)
      .map(([feature, stats]) => ({
        feature,
        f_statistic: stats?.f_statistic,
        p_value: stats?.p_value,
        isRemoved:
          removedRelevanceNameSet.has(feature) ||
          (stats?.p_value !== undefined && Number(stats.p_value) > pValueThreshold)
      }))
      .sort((a, b) => (Number(b.f_statistic) || 0) - (Number(a.f_statistic) || 0))
  }, [relevanceScores, removedRelevanceNameSet, pValueThreshold])

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
          onClick={() => setActiveTab('correlation')}
        />

        <MetricCard
          title="Stage 3: Low-Relevance"
          value={removedLowRelevanceCount}
          subtitle={`ANOVA F-test (p > ${pValueThreshold})`}
          icon={BarChart3Icon}
          badge={removedLowRelevanceCount > 0 ? 'Pruned' : 'All Significant'}
          badgeStatus={removedLowRelevanceCount > 0 ? 'warning' : 'success'}
          colorScheme="purple"
          tooltipText="Features with p > 0.05 fail the null-hypothesis test for mean differences across target classes."
          onClick={() => setActiveTab('relevance')}
        />

        <MetricCard
          title="Retained Selected Features"
          value={selectedCount > 0 ? selectedCount : (fsReport ? 0 : 'Awaiting Run')}
          subtitle="Passed directly into ML estimator"
          icon={CheckCircleIcon}
          badge="ML-Ready"
          badgeStatus="success"
          colorScheme="emerald"
          tooltipText="Optimal, compact, non-redundant feature matrix."
          onClick={() => setActiveTab('ranking')}
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
            <h4 className="text-sm font-bold text-slate-900 mt-1">ANOVA F-Test (p &le; {pValueThreshold})</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Evaluates univariate association with the target on the training set using <code>f_classif</code>. Eliminates uninformative signals failing the 95% confidence threshold.
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation for Selection Audit Reports */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          type="button"
          onClick={() => setActiveTab('correlation')}
          className={`pb-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'correlation'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <GitBranchIcon className="w-3.5 h-3.5" />
          <span>Collinear Pairs Pruned ({removedCorrCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('relevance')}
          className={`pb-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'relevance'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <BarChart3Icon className="w-3.5 h-3.5" />
          <span>Stage 3 Relevance Pruning ({removedLowRelevanceCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ranking')}
          className={`pb-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'ranking'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <SlidersIcon className="w-3.5 h-3.5" />
          <span>Feature Significance Ranking ({sortedRelevance.length})</span>
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
              {removedCorrCount} Redundancies Pruned
            </span>
          </div>

          {!fsReport ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl space-y-3">
              <p className="text-xs text-slate-600 font-medium">
                No collinearity pruning results are available yet. Run Model Evaluation to generate the correlation analysis.
              </p>
              <button
                type="button"
                onClick={() => navigateTo('/evaluation')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <span>Go to Model Evaluation</span>
                <ArrowRightIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : removedCorrList.length > 0 ? (
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
                  {removedCorrList.map((pair, idx) => (
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
            <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl space-y-2">
              <CheckCircleIcon className="w-6 h-6 text-emerald-500 mx-auto" />
              <p className="font-semibold text-slate-700">
                No multi-collinear pairs exceeded the 0.95 correlation threshold in this dataset.
              </p>
              <p className="text-[11px] text-slate-400">All features are sufficiently orthogonal.</p>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Stage 3 Low-Relevance Pruned Features */}
      {activeTab === 'relevance' && (
        <div className="space-y-4">
          {!fsReport ? (
            /* Proper Empty State before Model Evaluation */
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center mx-auto text-purple-600">
                <BarChart3Icon className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-900">Stage 3 Relevance Pruning</h4>
                <p className="text-sm font-semibold text-slate-700">
                  No relevance-pruning results are available yet.
                </p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Run Model Evaluation to generate the statistical relevance analysis, ANOVA F-test scores, and pruning audit.
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => navigateTo('/evaluation')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <span>Go to Model Evaluation</span>
                  <ArrowRightIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* Full Stage 3 Statistical Relevance Audit Results */
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden p-6 space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Stage 3 Statistical Relevance Pruning Audit (ANOVA F-Test, p &le; {pValueThreshold})
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Evaluates univariate association against the target class using ANOVA F-tests (<code className="font-mono text-indigo-600">f_classif</code>).
                  </p>
                </div>
                <span className="text-xs font-mono font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full whitespace-nowrap self-start sm:self-auto">
                  {removedLowRelevanceCount} Low-Relevance Pruned
                </span>
              </div>

              {/* 4 Summary Stat Cards for Stage 3 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Features Evaluated</span>
                  <div className="text-lg font-bold text-slate-900 mt-0.5">{totalEvaluatedFeatures}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Tested via ANOVA F-test</div>
                </div>

                <div className="p-3.5 rounded-xl border border-emerald-200/80 bg-emerald-50/40">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Relevant Retained</span>
                  <div className="text-lg font-bold text-emerald-700 mt-0.5">{retainedRelevanceCount}</div>
                  <div className="text-[11px] text-emerald-600 mt-0.5">p &le; {pValueThreshold} (Significant)</div>
                </div>

                <div className="p-3.5 rounded-xl border border-amber-200/80 bg-amber-50/40">
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Irrelevant Removed</span>
                  <div className="text-lg font-bold text-amber-700 mt-0.5">{removedLowRelevanceCount}</div>
                  <div className="text-[11px] text-amber-600 mt-0.5">p &gt; {pValueThreshold} (Pruned)</div>
                </div>

                <div className="p-3.5 rounded-xl border border-indigo-200/80 bg-indigo-50/40">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Significance Threshold</span>
                  <div className="text-lg font-bold text-indigo-700 font-mono mt-0.5">&alpha; = {pValueThreshold}</div>
                  <div className="text-[11px] text-indigo-600 mt-0.5">95% Confidence Level</div>
                </div>
              </div>

              {/* If features were pruned in Stage 3, show Pruned Table */}
              {normalizedRemovedRelevance.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Pruned Low-Relevance Features (Failed Significance Threshold)
                    </h5>
                    <span className="text-[11px] text-rose-600 font-semibold font-mono">
                      {normalizedRemovedRelevance.length} features dropped
                    </span>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold uppercase text-[11px]">
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">Pruned Feature Name</th>
                          <th className="py-2.5 px-3">ANOVA F-Statistic</th>
                          <th className="py-2.5 px-3">p-value</th>
                          <th className="py-2.5 px-3">Significance Cutoff</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Audit Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {normalizedRemovedRelevance.map((feat, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-3 text-slate-400 font-sans">{idx + 1}</td>
                            <td className="py-2.5 px-3 text-rose-700 font-semibold">{feat.feature}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-700">
                              {feat.f_statistic !== undefined && feat.f_statistic !== null
                                ? Number(feat.f_statistic).toFixed(4)
                                : 'N/A'}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-rose-600">
                              {feat.p_value !== undefined && feat.p_value !== null
                                ? Number(feat.p_value).toFixed(6)
                                : 'N/A'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 font-sans">
                              p &gt; {pValueThreshold}
                            </td>
                            <td className="py-2.5 px-3 font-sans">
                              <StatusBadge status="danger">Pruned (p &gt; {pValueThreshold})</StatusBadge>
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 font-sans text-[11px] max-w-xs truncate" title={feat.reason}>
                              {feat.reason}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* If 0 features were pruned, show Success Message */}
              {normalizedRemovedRelevance.length === 0 && (
                <div className="p-6 text-center text-xs bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-2">
                  <CheckCircleIcon className="w-7 h-7 text-emerald-600 mx-auto" />
                  <p className="font-bold text-emerald-900 text-sm">
                    All {totalEvaluatedFeatures} Evaluated Features Passed Statistical Significance (p &le; {pValueThreshold})
                  </p>
                  <p className="text-slate-600 text-xs max-w-lg mx-auto">
                    Univariate ANOVA F-tests confirmed statistically significant target class discrimination for every non-collinear feature. Zero informative features were eliminated unnecessarily.
                  </p>
                </div>
              )}

              {/* Complete Stage 3 Evaluated Features Relevance Table */}
              {sortedRelevance.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Stage 3 Statistical Relevance Evaluation ({sortedRelevance.length} Features)
                      </h5>
                      <p className="text-[11px] text-slate-500">
                        All predictors ranked by univariate F-statistic with significance threshold p &le; {pValueThreshold}.
                      </p>
                    </div>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold uppercase text-[11px]">
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">Feature Name</th>
                          <th className="py-2.5 px-3">ANOVA F-Statistic</th>
                          <th className="py-2.5 px-3">p-value</th>
                          <th className="py-2.5 px-3">Threshold Condition</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {sortedRelevance.map((item, idx) => {
                          const isPruned = item.isRemoved
                          return (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                              <td className="py-2.5 px-3 text-slate-400 font-sans">{idx + 1}</td>
                              <td className={`py-2.5 px-3 font-semibold ${isPruned ? 'text-rose-700' : 'text-slate-900'}`}>
                                {item.feature}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-indigo-700">
                                {item.f_statistic !== null && item.f_statistic !== undefined
                                  ? Number(item.f_statistic).toFixed(4)
                                  : 'N/A'}
                              </td>
                              <td className="py-2.5 px-3">
                                {item.p_value !== null && item.p_value !== undefined ? (
                                  <span className={Number(item.p_value) > pValueThreshold ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                                    {Number(item.p_value) < 1e-4 ? '< 0.0001' : Number(item.p_value).toFixed(6)}
                                  </span>
                                ) : (
                                  'N/A'
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-sans text-slate-500 text-[11px]">
                                {item.p_value !== null && item.p_value !== undefined && Number(item.p_value) <= pValueThreshold
                                  ? `p \u2264 ${pValueThreshold} (Significant)`
                                  : `p > ${pValueThreshold} (Not Significant)`}
                              </td>
                              <td className="py-2.5 px-3 font-sans">
                                {isPruned ? (
                                  <StatusBadge status="danger">Pruned (p &gt; {pValueThreshold})</StatusBadge>
                                ) : (
                                  <StatusBadge status="success">Retained (p &le; {pValueThreshold})</StatusBadge>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
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

          {!fsReport ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl space-y-3">
              <p className="text-xs text-slate-600 font-medium">
                No feature significance rankings are available yet. Run Model Evaluation to calculate ANOVA F-test scores.
              </p>
              <button
                type="button"
                onClick={() => navigateTo('/evaluation')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <span>Go to Model Evaluation</span>
                <ArrowRightIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : sortedRelevance.length > 0 ? (
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
                  {sortedRelevance.slice(0, 50).map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-slate-400 font-sans font-medium">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{item.feature}</td>
                      <td className="py-2.5 px-3 font-bold text-indigo-700">
                        {item.f_statistic !== null && item.f_statistic !== undefined
                          ? Number(item.f_statistic).toFixed(4)
                          : 'N/A'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {item.p_value !== null && item.p_value !== undefined
                          ? Number(item.p_value) < 1e-4
                            ? '< 0.0001'
                            : Number(item.p_value).toFixed(6)
                          : 'N/A'}
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        {item.isRemoved ? (
                          <StatusBadge status="danger">Pruned (p &gt; {pValueThreshold})</StatusBadge>
                        ) : (
                          <StatusBadge status="success">Retained (p &le; {pValueThreshold})</StatusBadge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl">
              No relevance scores recorded.
            </div>
          )}
        </div>
      )}
    </PageContainer>
  )
}
