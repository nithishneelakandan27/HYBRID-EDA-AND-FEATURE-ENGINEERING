import React from 'react'
import { useApp } from '../context/AppContext'
import PageContainer from '../components/layout/PageContainer'
import EmptyState from '../components/common/EmptyState'
import MetricCard from '../components/common/MetricCard'
import StatusBadge from '../components/common/StatusBadge'
import LoadingState from '../components/common/LoadingState'
import ErrorState from '../components/common/ErrorState'
import {
  SlidersIcon,
  PlayIcon,
  CheckCircleIcon,
  LayersIcon,
  DatabaseIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  SparklesIcon
} from '../components/common/Icons'

export default function DataPreparation() {
  const {
    datasetResult,
    decisionPlan,
    preprocessingSession,
    executingPrep,
    prepError,
    executePreprocessing,
    testSize,
    setTestSize,
    randomState,
    setRandomState,
    navigateTo
  } = useApp()

  if (!datasetResult) {
    return (
      <PageContainer>
        <EmptyState
          title="No dataset loaded"
          description="Upload a CSV dataset to execute the automated preprocessing pipeline."
          actionText="Upload Dataset"
          onAction={() => navigateTo('/upload')}
        />
      </PageContainer>
    )
  }

  const handleRunPreparation = async () => {
    try {
      await executePreprocessing()
    } catch (e) {
      // Error handled in context
    }
  }

  return (
    <PageContainer>
      {/* Control Card & Pipeline Action Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center">
              <SlidersIcon className="w-4 h-4" />
            </span>
            <h2 className="text-lg font-bold text-slate-900">
              Execute Preprocessing Pipeline
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">
            Splits the dataset and fits transformations (imputation, scaling, log transforms, and encodings) <strong>strictly on training data</strong> to prevent data leakage.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Split Ratio Selector */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-700">
            <span className="font-medium text-slate-500">Train/Test Split:</span>
            <select
              value={testSize}
              onChange={(e) => setTestSize(parseFloat(e.target.value))}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 font-semibold text-slate-800 focus:outline-none"
            >
              <option value={0.20}>80% Train / 20% Test</option>
              <option value={0.25}>75% Train / 25% Test</option>
              <option value={0.30}>70% Train / 30% Test</option>
            </select>
          </div>

          <button
            onClick={handleRunPreparation}
            disabled={executingPrep}
            className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow transition-all duration-150 flex items-center gap-2 cursor-pointer shrink-0"
          >
            {executingPrep ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Fitting Pipeline...</span>
              </>
            ) : (
              <>
                <PlayIcon className="w-3.5 h-3.5" />
                <span>Run Data Preparation</span>
              </>
            )}
          </button>
        </div>
      </div>

      {prepError && (
        <ErrorState
          title="Preprocessing Execution Failed"
          message={prepError}
          onRetry={handleRunPreparation}
        />
      )}

      {/* Visual Pipeline Progression Diagram */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
          Sequential Transformation Flow
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/60">
            <div className="text-[10px] font-mono font-bold text-slate-400">Step 1</div>
            <div className="text-xs font-bold text-slate-800 mt-1">Missing Imputation</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Mean (normal) / Median (skewed)</div>
          </div>
          <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/60">
            <div className="text-[10px] font-mono font-bold text-slate-400">Step 2</div>
            <div className="text-xs font-bold text-slate-800 mt-1">Log Transformation</div>
            <div className="text-[11px] text-slate-500 mt-0.5">log1p on heavy skew (|γ| &gt; 1)</div>
          </div>
          <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/60">
            <div className="text-[10px] font-mono font-bold text-slate-400">Step 3</div>
            <div className="text-xs font-bold text-slate-800 mt-1">Outlier-Aware Scaling</div>
            <div className="text-[11px] text-slate-500 mt-0.5">RobustScaler / StandardScaler</div>
          </div>
          <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/60">
            <div className="text-[10px] font-mono font-bold text-slate-400">Step 4</div>
            <div className="text-xs font-bold text-slate-800 mt-1">Categorical Encoding</div>
            <div className="text-[11px] text-slate-500 mt-0.5">One-Hot (&le;15) vs Ordinal (&gt;15)</div>
          </div>
          <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/50">
            <div className="text-[10px] font-mono font-bold text-teal-600">Step 5</div>
            <div className="text-xs font-bold text-teal-900 mt-1">ML-Ready Matrix</div>
            <div className="text-[11px] text-teal-700 mt-0.5">Finite numeric array output</div>
          </div>
        </div>
      </div>

      {/* Session Execution Results (if fitted) */}
      {preprocessingSession && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricCard
              title="Training Records"
              value={preprocessingSession.split_info.train_rows.toLocaleString()}
              subtitle={`${100 - preprocessingSession.split_info.test_percentage}% of dataset`}
              icon={DatabaseIcon}
              badge="Train Set"
              badgeStatus="success"
              colorScheme="teal"
            />

            <MetricCard
              title="Testing Records"
              value={preprocessingSession.split_info.test_rows.toLocaleString()}
              subtitle={`${preprocessingSession.split_info.test_percentage}% of dataset (Holdout)`}
              icon={DatabaseIcon}
              badge="Test Set"
              badgeStatus="info"
              colorScheme="blue"
            />

            <MetricCard
              title="Final ML Features"
              value={preprocessingSession.features_summary.transformed_feature_count}
              subtitle={`From ${preprocessingSession.features_summary.original_column_count} initial columns`}
              icon={LayersIcon}
              badge="Expanded"
              badgeStatus="success"
              colorScheme="indigo"
            />

            <MetricCard
              title="Excluded &amp; Leakage"
              value={preprocessingSession.features_summary.excluded_column_count}
              subtitle={`${preprocessingSession.features_summary.leakage_column_count} target leakage drops`}
              icon={ShieldCheckIcon}
              badge="Safe"
              badgeStatus="neutral"
              colorScheme="rose"
            />
          </div>

          {/* Numeric Operations Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm overflow-hidden">
            <h4 className="text-sm font-bold text-slate-900 mb-3">
              Fitted Numeric Transformations (Learned from Training Partition Only)
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold uppercase">
                    <th className="py-2.5 px-3">Numeric Feature</th>
                    <th className="py-2.5 px-3">Imputation Method</th>
                    <th className="py-2.5 px-3">Imputed Value</th>
                    <th className="py-2.5 px-3">Train Skewness</th>
                    <th className="py-2.5 px-3">Log1p Applied</th>
                    <th className="py-2.5 px-3">Scaler Applied</th>
                    <th className="py-2.5 px-3">Train Outliers</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {Object.entries(preprocessingSession.metadata.numeric_operations || {}).map(([col, ops], idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-sans font-semibold text-slate-800">{col}</td>
                      <td className="py-2.5 px-3 font-sans">
                        <StatusBadge status="amber">{ops.imputation_method}</StatusBadge>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{ops.imputed_value}</td>
                      <td className="py-2.5 px-3 text-indigo-600 font-bold">{ops.skewness}</td>
                      <td className="py-2.5 px-3">
                        {ops.log1p_applied ? (
                          <StatusBadge status="purple">log1p</StatusBadge>
                        ) : (
                          <span className="text-slate-400 font-sans">None</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        <StatusBadge status={ops.scaler_type === 'RobustScaler' ? 'info' : 'teal'}>
                          {ops.scaler_type}
                        </StatusBadge>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{ops.outlier_percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Matrix Preview */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  ML-Ready Transformed Matrix Preview
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  First 5 rows of the standardized training feature matrix.
                </p>
              </div>
              <span className="text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                100% Finite &amp; Scaled
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse font-mono">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase font-sans font-semibold">
                    <th className="py-2 px-3">#</th>
                    {preprocessingSession.feature_names.slice(0, 8).map((name, idx) => (
                      <th key={idx} className="py-2 px-3 whitespace-nowrap">{name}</th>
                    ))}
                    {preprocessingSession.feature_names.length > 8 && (
                      <th className="py-2 px-3 text-slate-400 font-normal italic">
                        +{preprocessingSession.feature_names.length - 8} more features
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(preprocessingSession.preview || []).map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 text-slate-400">{rIdx + 1}</td>
                      {preprocessingSession.feature_names.slice(0, 8).map((name, cIdx) => (
                        <td key={cIdx} className="py-2 px-3 text-slate-700 whitespace-nowrap">
                          {typeof row[name] === 'number' ? row[name].toFixed(4) : row[name] ?? '0.0000'}
                        </td>
                      ))}
                      {preprocessingSession.feature_names.length > 8 && (
                        <td className="py-2 px-3 text-slate-400 italic">...</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  )
}
