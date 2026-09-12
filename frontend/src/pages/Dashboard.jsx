import React from 'react'
import { useApp } from '../context/AppContext'
import PageContainer from '../components/layout/PageContainer'
import MetricCard from '../components/common/MetricCard'
import EmptyState from '../components/common/EmptyState'
import PipelineProgress from '../components/dashboard/PipelineProgress'
import DatasetHealth from '../components/dashboard/DatasetHealth'
import DataTypesChart from '../components/dashboard/DataTypesChart'
import TargetDistribution from '../components/dashboard/TargetDistribution'
import KeyFindingsList from '../components/dashboard/KeyFindingsList'
import {
  DatabaseIcon,
  LayersIcon,
  AlertTriangleIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  CpuIcon,
  SlidersIcon,
  SparklesIcon
} from '../components/common/Icons'

export default function Dashboard() {
  const {
    datasetResult,
    edaResult,
    decisionPlan,
    preprocessingSession,
    evaluationResult,
    navigateTo
  } = useApp()

  if (!datasetResult) {
    return (
      <PageContainer>
        <EmptyState
          title="No dataset active in session"
          description="Upload a CSV dataset to initiate automated exploratory analysis, statistical profiling, and intelligent preprocessing recommendations."
          actionText="Upload Dataset"
          onAction={() => navigateTo('/upload')}
        />
      </PageContainer>
    )
  }

  const { summary } = datasetResult
  const findingsCount = edaResult?.findings?.length || 0
  const isPreprocessed = !!preprocessingSession
  const isEvaluated = !!evaluationResult

  return (
    <PageContainer>
      {/* Top 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <MetricCard
          title="Total Records"
          value={summary.num_rows.toLocaleString()}
          subtitle={`${summary.memory_size_mb} MB in-memory memory footprint`}
          icon={DatabaseIcon}
          badge="100% Valid"
          badgeStatus="success"
          colorScheme="indigo"
          tooltipText="Total count of ingested transactional supply chain records."
          onClick={() => navigateTo('/overview')}
        />

        <MetricCard
          title="Total Columns"
          value={summary.num_cols}
          subtitle={`${summary.numeric_column_count} numeric, ${summary.categorical_column_count} categorical`}
          icon={LayersIcon}
          badge="Profiled"
          badgeStatus="info"
          colorScheme="blue"
          tooltipText="Total features and attributes profiled for statistical distributions and cardinality."
          onClick={() => navigateTo('/overview')}
        />

        <MetricCard
          title="Data Issues Found"
          value={findingsCount}
          subtitle={`${summary.missing_value_percentage}% overall missingness`}
          icon={AlertTriangleIcon}
          badge={findingsCount > 0 ? `${findingsCount} Findings` : 'Clean'}
          badgeStatus={findingsCount > 10 ? 'warning' : 'info'}
          colorScheme="amber"
          tooltipText="Automated EDA findings detecting outliers, high skewness, missing values, and leakage."
          onClick={() => navigateTo('/quality')}
        />

        <MetricCard
          title="ML Readiness"
          value={isEvaluated ? 'Evaluated' : isPreprocessed ? 'Prepared' : 'Ready to Plan'}
          subtitle={
            isEvaluated
              ? `Hybrid F1: ${(evaluationResult.results.hybrid.metrics.f1 * 100).toFixed(1)}%`
              : isPreprocessed
              ? `${preprocessingSession.features_summary.transformed_feature_count} features ready`
              : 'Decisions synthesized'
          }
          icon={ShieldCheckIcon}
          badge={isEvaluated ? 'Complete' : 'Pending Run'}
          badgeStatus={isEvaluated ? 'success' : 'neutral'}
          colorScheme="emerald"
          tooltipText="Indicates whether the data has been transformed into a finite, leak-free feature matrix."
          onClick={() => navigateTo(isEvaluated ? '/evaluation' : isPreprocessed ? '/preparation' : '/decisions')}
        />
      </div>

      {/* SECTION: Dataset at a Glance */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Dataset at a Glance
          </h2>
          <span className="text-xs text-slate-500">
            Real-time automated statistical intelligence
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DataTypesChart />
          <TargetDistribution />
        </div>
      </div>

      {/* SECTION: Dataset Health & Quality + Key Findings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DatasetHealth />
        <KeyFindingsList />
      </div>

      {/* SECTION: Pipeline Progress Journey */}
      <PipelineProgress />

      {/* Next Best Action Banner */}
      <div className="bg-gradient-to-r from-indigo-500 via-indigo-600 to-teal-500 rounded-3xl p-6 sm:p-8 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1 max-w-xl">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-100 uppercase tracking-wider">
            <SparklesIcon className="w-4 h-4" />
            <span>Recommended Next Step</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight">
            {!isPreprocessed
              ? 'Review Smart Preprocessing Decisions'
              : !isEvaluated
              ? 'Run 3-Pipeline ML Evaluation'
              : 'Explore Model Benchmark Results'}
          </h3>
          <p className="text-xs sm:text-sm text-indigo-100/90 leading-relaxed">
            {!isPreprocessed
              ? 'The engine has formulated skew-aware imputation, outlier-aware scaling, and cardinality-aware encoding plans.'
              : !isEvaluated
              ? 'Compare the Proposed Hybrid framework against Minimal and Fixed baselines on a shared 80:20 stratified split.'
              : 'Examine detailed classification accuracy, precision, recall, F1, ROC-AUC, and feature selection reductions.'}
          </p>
        </div>

        <button
          onClick={() =>
            navigateTo(
              !isPreprocessed
                ? '/decisions'
                : !isEvaluated
                ? '/evaluation'
                : '/evaluation'
            )
          }
          className="px-6 py-3 bg-white text-indigo-700 hover:bg-slate-50 text-sm font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-150 flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <span>
            {!isPreprocessed
              ? 'Inspect Smart Decisions'
              : !isEvaluated
              ? 'Proceed to Evaluation'
              : 'View Model Evaluation'}
          </span>
          <ArrowRightIcon className="w-4 h-4" />
        </button>
      </div>
    </PageContainer>
  )
}
