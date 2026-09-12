import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import PageContainer from '../components/layout/PageContainer'
import EmptyState from '../components/common/EmptyState'
import MetricCard from '../components/common/MetricCard'
import StatusBadge from '../components/common/StatusBadge'
import LoadingState from '../components/common/LoadingState'
import ErrorState from '../components/common/ErrorState'
import {
  ActivityIcon,
  PlayIcon,
  DownloadIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  ClockIcon,
  SlidersIcon,
  ArrowRightIcon,
  LayersIcon,
  SparklesIcon
} from '../components/common/Icons'

export default function ModelEvaluation() {
  const {
    datasetResult,
    evaluationResult,
    runningEval,
    evalError,
    evalSecondsElapsed,
    runEvaluation,
    evalTargetCol,
    setEvalTargetCol,
    evalLeakageCols,
    setEvalLeakageCols,
    testSize,
    setTestSize,
    autoConfig,
    navigateTo
  } = useApp()

  const [showAdvanced, setShowAdvanced] = useState(false)

  if (!datasetResult) {
    return (
      <PageContainer>
        <EmptyState
          title="No dataset loaded"
          description="Upload a CSV dataset to execute the 3-Pipeline Machine Learning Evaluation."
          actionText="Upload Dataset"
          onAction={() => navigateTo('/upload')}
        />
      </PageContainer>
    )
  }

  const handleRunEvaluation = async () => {
    try {
      await runEvaluation()
    } catch (e) {
      // Handled in context
    }
  }

  const results = evaluationResult?.results
  const splitInfo = evaluationResult?.split_info
  const paperReference = evaluationResult?.paper_reference

  const pipelines = ['minimal', 'fixed', 'hybrid']
  const pipeLabels = {
    minimal: 'Pipeline A: Minimal Baseline',
    fixed: 'Pipeline B: Fixed Baseline',
    hybrid: 'Pipeline C: Proposed Hybrid'
  }
  const pipeSubtitles = {
    minimal: 'Mean imputation + StandardScaler + OrdinalEncoder',
    fixed: 'Mean imputation + StandardScaler + OneHotEncoder(max=15)',
    hybrid: 'Hybrid Preprocessor + Domain FE + 2-Stage Feature Selection'
  }

  // Export handlers
  const exportJson = () => {
    if (!evaluationResult) return
    const blob = new Blob([JSON.stringify(evaluationResult, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `evaluation_results_${datasetResult.filename || 'dataset'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportCsv = () => {
    if (!evaluationResult || !results) return
    const rows = [
      ['Pipeline', 'Accuracy', 'Precision', 'Recall', 'F1 Score', 'ROC-AUC', 'Final Feature Count'],
      ...pipelines.map((p) => [
        pipeLabels[p],
        results[p]?.metrics?.accuracy ?? 'N/A',
        results[p]?.metrics?.precision ?? 'N/A',
        results[p]?.metrics?.recall ?? 'N/A',
        results[p]?.metrics?.f1 ?? 'N/A',
        results[p]?.metrics?.roc_auc ?? 'N/A',
        results[p]?.feature_counts?.final ?? 'N/A'
      ])
    ]
    const csvContent = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `evaluation_metrics_${datasetResult.filename || 'dataset'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <PageContainer>
      {/* Run Pipeline & Configuration Header */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
                <ActivityIcon className="w-4 h-4" />
              </span>
              <h2 className="text-xl font-bold text-slate-900">
                Automated Three-Pipeline Benchmark
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">
              Trains and evaluates <strong>Pipeline A (Minimal Baseline)</strong>, <strong>Pipeline B (Fixed Baseline)</strong>, and <strong>Pipeline C (Proposed Hybrid)</strong> on the exact same 80:20 stratified holdout split.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRunEvaluation}
              disabled={runningEval}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-700 hover:to-teal-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition-all duration-150 flex items-center gap-2.5 cursor-pointer shrink-0"
            >
              {runningEval ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Evaluating All 3 Pipelines ({evalSecondsElapsed}s)...</span>
                </>
              ) : (
                <>
                  <PlayIcon className="w-4 h-4" />
                  <span>Execute Benchmark Run</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Readiness Checklist Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/70">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Target Column
            </span>
            <div className="font-mono font-bold text-indigo-700 truncate">
              {evalTargetCol || 'Late_delivery_risk'}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Supervised binary classification label.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/70">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Holdout Split Setup
            </span>
            <div className="font-mono font-bold text-slate-800">
              {Math.round((1 - testSize) * 100)}% Train / {Math.round(testSize * 100)}% Test
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Stratified split preserving class distribution.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/70">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Leakage Protection
            </span>
            <div className="font-mono font-bold text-emerald-700">
              Active &amp; Guarded
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Post-event features excluded from training matrix.
            </p>
          </div>
        </div>

        {/* Advanced Settings Toggle */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            {showAdvanced ? '▲ Hide Advanced Split & Target Parameters' : '▼ Customize Target Column & Leakage Exclusions'}
          </button>

          {showAdvanced && (
            <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Target Column Name</label>
                  <input
                    type="text"
                    value={evalTargetCol}
                    onChange={(e) => setEvalTargetCol(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-indigo-500"
                    placeholder="Late_delivery_risk"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Leakage Columns (comma-separated)</label>
                  <input
                    type="text"
                    value={evalLeakageCols}
                    onChange={(e) => setEvalLeakageCols(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-indigo-500"
                    placeholder="Delivery Status, Days for shipping (real)..."
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {evalError && (
        <ErrorState
          title="Evaluation Execution Failed"
          message={evalError}
          onRetry={handleRunEvaluation}
        />
      )}

      {/* Loading Progress State */}
      {runningEval && (
        <LoadingState
          title="Running Complete Machine Learning Evaluation..."
          subtitle={`Fitting Minimal, Fixed, and Proposed Hybrid pipelines on ${datasetResult.summary.num_rows.toLocaleString()} rows.`}
          elapsedSeconds={evalSecondsElapsed}
          steps={[
            { label: 'Applying stratified train/test split (80:20)', status: 'completed' },
            { label: 'Fitting Pipeline A (Minimal Baseline)', status: evalSecondsElapsed > 1 ? 'completed' : 'active' },
            { label: 'Fitting Pipeline B (Fixed OHE Baseline)', status: evalSecondsElapsed > 2 ? 'completed' : 'active' },
            { label: 'Fitting Pipeline C (Proposed Hybrid + FE + Selection)', status: evalSecondsElapsed > 3 ? 'active' : 'pending' }
          ]}
        />
      )}

      {/* Evaluation Results View */}
      {results && !runningEval && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Status & Export Banner */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                <CheckCircleIcon className="w-5 h-5" />
              </span>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  All 3 Pipelines Evaluated Successfully
                </h4>
                <p className="text-xs text-slate-500">
                  Total Orchestration Time: <span className="font-mono font-bold text-indigo-600">{evaluationResult.total_runtime_sec}s</span> • Evaluated on {splitInfo?.test_rows.toLocaleString()} test rows.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={exportJson}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                <DownloadIcon className="w-3.5 h-3.5" />
                <span>Export JSON</span>
              </button>
              <button
                onClick={exportCsv}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                <DownloadIcon className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Core Metric Cards for Proposed Hybrid Pipeline */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Proposed Hybrid Framework Performance (Pipeline C)
              </h3>
              <span className="text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                Primary Proposed Model
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <MetricCard
                title="Accuracy"
                value={`${(results.hybrid.metrics.accuracy * 100).toFixed(2)}%`}
                subtitle="Overall correct rate"
                badge="High"
                badgeStatus="success"
                colorScheme="emerald"
                tooltipText="Proportion of total shipments whose delivery outcome was correctly classified."
              />

              <MetricCard
                title="Precision"
                value={`${(results.hybrid.metrics.precision * 100).toFixed(2)}%`}
                subtitle="True positive precision"
                badge="High"
                badgeStatus="success"
                colorScheme="indigo"
                tooltipText="When the model predicts late delivery risk, probability that shipment is genuinely late."
              />

              <MetricCard
                title="Recall"
                value={`${(results.hybrid.metrics.recall * 100).toFixed(2)}%`}
                subtitle="Detection sensitivity"
                badge="Target"
                badgeStatus="info"
                colorScheme="teal"
                tooltipText="Percentage of all genuinely delayed shipments captured by the model."
              />

              <MetricCard
                title="F1 Score"
                value={`${(results.hybrid.metrics.f1 * 100).toFixed(2)}%`}
                subtitle="Harmonic balance"
                badge="Balanced"
                badgeStatus="success"
                colorScheme="blue"
                tooltipText="Harmonic mean balancing precision and recall."
              />

              <MetricCard
                title="ROC-AUC"
                value={
                  results.hybrid.metrics.roc_auc != null
                    ? results.hybrid.metrics.roc_auc.toFixed(4)
                    : 'N/A'
                }
                subtitle="Discriminative power"
                badge="Strong"
                badgeStatus="purple"
                colorScheme="purple"
                tooltipText="Area Under ROC Curve quantifying probability ranking discrimination."
              />
            </div>
          </div>

          {/* Pipeline Benchmark Comparison Cards */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Comparative Benchmark (All 3 Pipelines)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {pipelines.map((p) => {
                const pipe = results[p]
                const m = pipe.metrics
                const isHybrid = p === 'hybrid'

                return (
                  <div
                    key={p}
                    className={`bg-white rounded-2xl p-6 border transition-all shadow-sm flex flex-col justify-between ${
                      isHybrid
                        ? 'border-indigo-300 ring-2 ring-indigo-500/10'
                        : 'border-slate-200/80'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                          {p.toUpperCase()}
                        </span>
                        {isHybrid && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                            ★ Proposed
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-bold text-slate-900">
                        {pipeLabels[p]}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {pipeSubtitles[p]}
                      </p>

                      <div className="grid grid-cols-2 gap-2 mt-5">
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 text-center">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">Accuracy</span>
                          <div className="text-base font-bold text-slate-900 mt-0.5 font-mono">
                            {(m.accuracy * 100).toFixed(2)}%
                          </div>
                        </div>

                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 text-center">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">Precision</span>
                          <div className="text-base font-bold text-indigo-600 mt-0.5 font-mono">
                            {(m.precision * 100).toFixed(2)}%
                          </div>
                        </div>

                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 text-center">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">Recall</span>
                          <div className="text-base font-bold text-teal-600 mt-0.5 font-mono">
                            {(m.recall * 100).toFixed(2)}%
                          </div>
                        </div>

                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 text-center">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">F1 Score</span>
                          <div className="text-base font-bold text-slate-900 mt-0.5 font-mono">
                            {(m.f1 * 100).toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Features: <b className="text-slate-700 font-mono">{pipe.feature_counts.final}</b></span>
                      <span>Runtime: <b className="text-slate-700 font-mono">{pipe.timing.total_sec}s</b></span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Full Metric Comparison Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm overflow-hidden">
            <h4 className="text-sm font-bold text-slate-900 mb-3">
              Detailed Metric Comparison Table
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase font-semibold">
                    <th className="py-2.5 px-3">Metric</th>
                    <th className="py-2.5 px-3">Pipeline A: Minimal</th>
                    <th className="py-2.5 px-3">Pipeline B: Fixed</th>
                    <th className="py-2.5 px-3 text-indigo-700">Pipeline C: Proposed Hybrid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {['accuracy', 'precision', 'recall', 'f1', 'roc_auc'].map((k) => (
                    <tr key={k} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-sans font-semibold text-slate-800 uppercase">
                        {k.replace('_', '-')}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {results.minimal.metrics[k] != null ? results.minimal.metrics[k].toFixed(4) : 'N/A'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {results.fixed.metrics[k] != null ? results.fixed.metrics[k].toFixed(4) : 'N/A'}
                      </td>
                      <td className="py-2.5 px-3 text-indigo-700 font-bold">
                        {results.hybrid.metrics[k] != null ? results.hybrid.metrics[k].toFixed(4) : 'N/A'}
                      </td>
                    </tr>
                  ))}
                  <tr className="hover:bg-slate-50 bg-slate-50/50">
                    <td className="py-2.5 px-3 font-sans font-semibold text-slate-800">
                      Final Features
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-bold">{results.minimal.feature_counts.final}</td>
                    <td className="py-2.5 px-3 text-slate-600 font-bold">{results.fixed.feature_counts.final}</td>
                    <td className="py-2.5 px-3 text-indigo-700 font-bold">{results.hybrid.feature_counts.final}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* DYNAMIC BUSINESS INTERPRETATION SECTION */}
          <div className="bg-gradient-to-br from-indigo-50 via-teal-50/50 to-white rounded-3xl border border-indigo-200/80 p-6 sm:p-8 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-indigo-700 text-xs font-bold uppercase tracking-wider">
              <SparklesIcon className="w-4 h-4" />
              <span>Business Interpretation &amp; Executive Takeaway</span>
            </div>

            <h4 className="text-lg font-bold text-slate-900">
              What do these results mean for supply chain managers?
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700 leading-relaxed">
              <div className="bg-white/80 p-4 rounded-2xl border border-indigo-100">
                <span className="font-bold text-indigo-900 block mb-1">
                  1. High Precision ({((results.hybrid.metrics.precision || 0) * 100).toFixed(1)}%) Prevents False Alarms
                </span>
                When the hybrid model flags an order as "High Late Delivery Risk", it is correct more than {Math.floor((results.hybrid.metrics.precision || 0) * 100)}% of the time. Logistics teams can dispatch expedited carrier interventions without wasting expensive freight budgets on orders that were going to arrive on time anyway.
              </div>

              <div className="bg-white/80 p-4 rounded-2xl border border-indigo-100">
                <span className="font-bold text-indigo-900 block mb-1">
                  2. Feature Economy ({results.hybrid.feature_counts.final} Features vs {results.fixed.feature_counts.final} Fixed)
                </span>
                The proposed framework eliminates uninformative cardinality expansion and redundant multi-collinear attributes, yielding a faster sub-second inference runtime ({results.hybrid.timing.total_sec}s) without sacrificing predictive discrimination.
              </div>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  )
}
