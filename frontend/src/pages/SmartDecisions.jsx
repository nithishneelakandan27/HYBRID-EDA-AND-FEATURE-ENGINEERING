import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import PageContainer from '../components/layout/PageContainer'
import EmptyState from '../components/common/EmptyState'
import StatusBadge from '../components/common/StatusBadge'
import {
  CpuIcon,
  SearchIcon,
  CheckCircleIcon,
  SlidersIcon,
  ArrowRightIcon,
  SparklesIcon,
  ZapIcon,
  ShieldCheckIcon
} from '../components/common/Icons'

export default function SmartDecisions() {
  const { decisionPlan, datasetResult, navigateTo } = useApp()
  const [activeTab, setActiveTab] = useState('trace') // 'trace' | 'matrix'
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [stageFilter, setStageFilter] = useState('all')

  if (!datasetResult) {
    return (
      <PageContainer>
        <EmptyState
          title="No dataset loaded"
          description="Upload a CSV dataset to execute the Hybrid Decision Engine and view synthesized preprocessing strategies."
          actionText="Upload Dataset"
          onAction={() => navigateTo('/upload')}
        />
      </PageContainer>
    )
  }

  const columns = decisionPlan?.columns || []
  const decisionTrace = decisionPlan?.decision_trace || []
  const summary = decisionPlan?.summary_counts || {
    mean_imputations: 0,
    median_imputations: 0,
    most_frequent_imputations: 0,
    robust_scalers: 0,
    standard_scalers: 0,
    log1p_transformations: 0,
    one_hot_encodings: 0,
    label_encodings: 0,
    excluded_columns: 0,
    leakage_columns: 0,
    total_decisions_logged: 0
  }

  const filteredColumns = columns.filter((col) => {
    const matchesSearch = col.column_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || col.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const filteredTrace = decisionTrace.filter((item) => {
    const matchesSearch =
      (item.feature || item.column_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.rule_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.reason || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStage = stageFilter === 'all' || item.stage === stageFilter
    return matchesSearch && matchesStage
  })

  return (
    <PageContainer>
      {/* Visual Architectural Banner: The Core Research Contribution */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-lg relative overflow-hidden">
        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
            <SparklesIcon className="w-4 h-4 text-teal-400" />
            <span>Core Research Innovation</span>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Hybrid Rule-Based &amp; Statistical Decision Architecture
            </h2>
            <p className="text-xs sm:text-sm text-indigo-200 mt-1 max-w-2xl leading-relaxed">
              Eliminating arbitrary manual preprocessing choices by coupling deterministic supply-chain domain heuristics with live distributional statistics.
            </p>
          </div>

          {/* Interactive Flowchart Diagram */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex flex-col justify-between">
              <span className="text-[10px] font-mono font-bold text-teal-300 uppercase">Step 01</span>
              <div className="mt-2">
                <div className="font-bold text-sm text-white">Domain Knowledge</div>
                <p className="text-xs text-indigo-200 mt-1">
                  Supply chain rules, temporal constraints &amp; target leakage bounds.
                </p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex flex-col justify-between">
              <span className="text-[10px] font-mono font-bold text-teal-300 uppercase">Step 02</span>
              <div className="mt-2">
                <div className="font-bold text-sm text-white">Statistical Evidence</div>
                <p className="text-xs text-indigo-200 mt-1">
                  Skewness (|γ| &gt; 1), outlier rates (&gt; 2%), and cardinality (&gt; 15).
                </p>
              </div>
            </div>

            <div className="bg-white/15 backdrop-blur-md p-4 rounded-2xl border border-teal-400/40 shadow-inner flex flex-col justify-between">
              <span className="text-[10px] font-mono font-bold text-teal-300 uppercase">Step 03</span>
              <div className="mt-2">
                <div className="font-bold text-sm text-teal-200">Hybrid Decision</div>
                <p className="text-xs text-indigo-100 mt-1">
                  Deterministic synthesis of optimal transformation paths.
                </p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex flex-col justify-between">
              <span className="text-[10px] font-mono font-bold text-teal-300 uppercase">Step 04</span>
              <div className="mt-2">
                <div className="font-bold text-sm text-white">Prepared Execution</div>
                <p className="text-xs text-indigo-200 mt-1">
                  Fitted strictly on train data to guarantee 100% leak-free matrices.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Decision Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Imputation</span>
          <div className="text-xl font-bold text-amber-600 mt-1">
            {summary.mean_imputations + summary.median_imputations + summary.most_frequent_imputations}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {summary.mean_imputations} Mean | {summary.median_imputations} Median
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Scaling</span>
          <div className="text-xl font-bold text-blue-600 mt-1">
            {summary.robust_scalers + summary.standard_scalers}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {summary.robust_scalers} Robust | {summary.standard_scalers} Standard
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Log1p Transform</span>
          <div className="text-xl font-bold text-purple-600 mt-1">
            {summary.log1p_transformations}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            High skewness (&gt;1.0)
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Encoding</span>
          <div className="text-xl font-bold text-teal-600 mt-1">
            {summary.one_hot_encodings + summary.label_encodings}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {summary.one_hot_encodings} OneHot | {summary.label_encodings} Ordinal
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Excluded</span>
          <div className="text-xl font-bold text-rose-600 mt-1">
            {summary.excluded_columns}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Constant / 100% missing
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Leakage</span>
          <div className="text-xl font-bold text-orange-600 mt-1">
            {summary.leakage_columns}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Post-event exclusion
          </div>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('trace')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'trace'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <SparklesIcon className="w-3.5 h-3.5" />
            <span>Decision Trace: "Why This Decision?" ({decisionTrace.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'matrix'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <SlidersIcon className="w-3.5 h-3.5" />
            <span>Column Preprocessing Matrix ({columns.length})</span>
          </button>
        </div>

        <span className="text-xs font-mono text-slate-400 hidden sm:inline">
          Deterministic Rule Engine
        </span>
      </div>

      {/* TAB 1: DECISION TRACE / "WHY THIS DECISION?" */}
      {activeTab === 'trace' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Filters Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search trace by feature, rule, or reason..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-2xs"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
              {['all', 'column_evaluation', 'imputation', 'scaling', 'log_transformation', 'encoding'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStageFilter(st)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer capitalize ${
                    stageFilter === st
                      ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Trace Cards Feed */}
          <div className="space-y-3">
            {filteredTrace.map((item, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-indigo-200 transition-all space-y-3"
              >
                {/* Card Header: Feature & Stage */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-slate-900">
                      {item.feature || item.column_name}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 font-mono">
                      {item.stage?.replace('_', ' ')}
                    </span>
                  </div>

                  <span className="text-[11px] font-mono text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100 font-semibold">
                    {item.rule_id}
                  </span>
                </div>

                {/* 5-Step Explainability Chain */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  {/* Step 1: Finding / Statistical Evidence */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      1. Dataset Finding
                    </span>
                    <div className="font-mono text-slate-700 text-[11px] space-y-0.5">
                      {item.detected_statistic && typeof item.detected_statistic === 'object'
                        ? Object.entries(item.detected_statistic).slice(0, 4).map(([k, v]) => (
                            <div key={k} className="truncate">
                              <span className="text-slate-400">{k}:</span> <b>{String(v)}</b>
                            </div>
                          ))
                        : 'Statistical profile verified'}
                    </div>
                  </div>

                  {/* Step 2: Rule Condition */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      2. Rule Triggered / Condition
                    </span>
                    <div className="font-mono text-indigo-700 font-semibold text-[11px] break-words">
                      {item.threshold_condition || 'Deterministic condition check'}
                    </div>
                  </div>

                  {/* Step 3: Action Selected */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      3. Selected Action
                    </span>
                    <div className="font-bold text-slate-900 font-mono text-[11px] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                      <span className="truncate">{item.selected_action || 'none'}</span>
                    </div>
                  </div>

                  {/* Step 4: Resulting Change */}
                  <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-200/70">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block mb-1">
                      4. Resulting Feature Change
                    </span>
                    <div className="text-emerald-900 text-[11px] font-medium leading-relaxed">
                      {item.resulting_feature_change || 'Representation maintained'}
                    </div>
                  </div>
                </div>

                {/* Human-Readable Rationale */}
                <div className="text-xs text-slate-600 bg-slate-50/60 p-3 rounded-xl border border-slate-100 flex items-start gap-2">
                  <span className="font-bold text-slate-800 shrink-0">Why this decision:</span>
                  <span>{item.reason}</span>
                </div>
              </div>
            ))}

            {filteredTrace.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">
                No decision trace records match the selected stage and search filters.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: COLUMN PREPROCESSING MATRIX */}
      {activeTab === 'matrix' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden animate-in fade-in duration-150">
          <div className="p-4 sm:p-5 border-b border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/40">
            <div className="relative w-full sm:w-72">
              <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search column in decisions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-2xs"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white border border-slate-200 text-slate-700 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-indigo-500 shadow-2xs"
              >
                <option value="all">All Column Statuses</option>
                <option value="usable_numeric">Usable Numeric</option>
                <option value="usable_categorical">Usable Categorical</option>
                <option value="leakage_candidate">Leakage Candidate</option>
                <option value="completely_missing">Completely Missing</option>
                <option value="constant">Constant / Zero Variance</option>
              </select>

              <span className="text-xs text-slate-400 font-mono hidden md:inline">
                Showing {filteredColumns.length} of {columns.length} columns
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 border-b border-slate-200/80 uppercase font-semibold">
                  <th className="py-3 px-4">Feature Name</th>
                  <th className="py-3 px-4">Type &amp; Status</th>
                  <th className="py-3 px-4">Statistical Evidence</th>
                  <th className="py-3 px-4">Hybrid Decision</th>
                  <th className="py-3 px-4">Method &amp; Explanation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredColumns.map((col, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {col.column_name}
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge
                        status={
                          col.data_type === 'numeric'
                            ? 'info'
                            : col.status === 'leakage_candidate'
                            ? 'danger'
                            : 'teal'
                        }
                      >
                        {col.data_type} • {col.status.replace(/_/g, ' ')}
                      </StatusBadge>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      <div>Missing: {col.statistics?.missing_percentage ?? 0}%</div>
                      {col.data_type === 'numeric' && col.statistics && (
                        <div className="text-[11px] text-slate-400">
                          Skew: {col.statistics.skewness ?? 'N/A'} | Outliers: {col.statistics.outlier_percentage ?? 0}%
                        </div>
                      )}
                      {col.data_type !== 'numeric' && col.statistics && (
                        <div className="text-[11px] text-slate-400">
                          Cardinality: {col.statistics.cardinality ?? 'N/A'}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {col.decisions.map((d, dIdx) => (
                          d.operation !== 'none' && (
                            <span
                              key={dIdx}
                              className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100"
                            >
                              {d.operation}
                            </span>
                          )
                        ))}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 space-y-1 max-w-sm">
                      {col.decisions.map((d, dIdx) => (
                        <div key={dIdx} className="text-xs">
                          <span className="font-semibold text-slate-800 capitalize">{d.step}: </span>
                          <span>{d.reason}</span>
                        </div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageContainer>
  )
}
