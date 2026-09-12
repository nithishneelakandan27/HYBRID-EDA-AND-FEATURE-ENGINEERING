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
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedColumn, setSelectedColumn] = useState(null)

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
    leakage_columns: 0
  }

  const filteredColumns = columns.filter((col) => {
    const matchesSearch = col.column_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || col.status === statusFilter
    return matchesSearch && matchesStatus
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

      {/* Interactive Decisions Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/40">
          <div className="relative w-full sm:w-72">
            <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search column in decisions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-2xs"
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
    </PageContainer>
  )
}
