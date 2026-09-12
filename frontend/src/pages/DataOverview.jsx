import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import PageContainer from '../components/layout/PageContainer'
import EmptyState from '../components/common/EmptyState'
import StatusBadge from '../components/common/StatusBadge'
import {
  SearchIcon,
  DatabaseIcon,
  XIcon,
  SlidersIcon,
  LayersIcon,
  InfoIcon,
  ArrowRightIcon
} from '../components/common/Icons'

export default function DataOverview() {
  const { datasetResult, navigateTo } = useApp()
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [selectedColumn, setSelectedColumn] = useState(null)

  if (!datasetResult) {
    return (
      <PageContainer>
        <EmptyState
          title="No dataset loaded"
          description="Upload a CSV dataset to explore column attributes, data types, missing values, and detailed statistical profiles."
          actionText="Upload Dataset"
          onAction={() => navigateTo('/upload')}
        />
      </PageContainer>
    )
  }

  const { summary, column_profiles = [] } = datasetResult

  // Filter columns by search term and type
  const filteredColumns = column_profiles.filter((col) => {
    const matchesSearch = col.column_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType =
      typeFilter === 'all' ||
      (typeFilter === 'numeric' && col.inferred_type === 'numeric') ||
      (typeFilter === 'categorical' && col.inferred_type !== 'numeric')
    return matchesSearch && matchesType
  })

  return (
    <PageContainer>
      {/* Top Statistical Summary Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Rows</span>
          <div className="text-xl font-bold text-slate-900 mt-1">{summary.num_rows.toLocaleString()}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Transactional records</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Columns</span>
          <div className="text-xl font-bold text-indigo-600 mt-1">{summary.num_cols}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Schema attributes</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Numerical</span>
          <div className="text-xl font-bold text-blue-600 mt-1">{summary.numeric_column_count}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Continuous &amp; discrete</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Categorical</span>
          <div className="text-xl font-bold text-teal-600 mt-1">{summary.categorical_column_count}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Text &amp; category keys</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Missing Count</span>
          <div className="text-xl font-bold text-amber-600 mt-1">{summary.missing_value_count.toLocaleString()}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">{summary.missing_value_percentage}% overall</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Duplicates</span>
          <div className="text-xl font-bold text-emerald-600 mt-1">{summary.duplicate_row_count}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Exact row duplicates</div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Search & Filter Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/40">
          <div className="relative w-full sm:w-72">
            <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search columns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-indigo-500 shadow-2xs"
            >
              <option value="all">All Data Types</option>
              <option value="numeric">Numerical Only ({summary.numeric_column_count})</option>
              <option value="categorical">Categorical Only ({summary.categorical_column_count})</option>
            </select>

            <span className="text-xs text-slate-400 font-mono hidden md:inline">
              Showing {filteredColumns.length} of {column_profiles.length} columns
            </span>
          </div>
        </div>

        {/* Scrollable Column Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 border-b border-slate-200/80 uppercase font-semibold">
                <th className="py-3 px-4">Column Name</th>
                <th className="py-3 px-4">Data Type</th>
                <th className="py-3 px-4">Missing %</th>
                <th className="py-3 px-4">Unique Values</th>
                <th className="py-3 px-4">Inferred Role</th>
                <th className="py-3 px-4">Quality Flags</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredColumns.map((col, idx) => {
                const isTarget = col.column_name.toLowerCase() === 'late_delivery_risk'
                const isId = col.column_name.toLowerCase().includes('id') || col.column_name.toLowerCase().endsWith('_id')
                const isDate = col.column_name.toLowerCase().includes('date')
                const inferredRole = isTarget ? 'Target' : isId ? 'Identifier' : isDate ? 'Date / Timestamp' : 'Feature'

                return (
                  <tr
                    key={idx}
                    onClick={() => setSelectedColumn(col)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {col.column_name}
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={col.inferred_type === 'numeric' ? 'info' : 'teal'}>
                        {col.inferred_type}
                      </StatusBadge>
                    </td>

                    <td className="py-3.5 px-4 font-mono">
                      {col.missing_percentage > 0 ? (
                        <span className="text-amber-600 font-semibold">
                          {col.missing_percentage}% ({col.missing_count.toLocaleString()})
                        </span>
                      ) : (
                        <span className="text-slate-400">0%</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-700 font-mono">
                      {col.unique_count.toLocaleString()}{' '}
                      <span className="text-[10px] text-slate-400 font-sans">({col.cardinality})</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                          isTarget
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : isId
                            ? 'bg-slate-100 text-slate-600 border border-slate-200'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                        }`}
                      >
                        {inferredRole}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {(col.data_quality_flags || []).slice(0, 2).map((flag, fIdx) => (
                          <span
                            key={fIdx}
                            className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 border border-slate-200 font-mono"
                          >
                            {flag}
                          </span>
                        ))}
                        {(col.data_quality_flags || []).length > 2 && (
                          <span className="text-[10px] text-slate-400 font-semibold self-center">
                            +{col.data_quality_flags.length - 2}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedColumn(col)
                        }}
                        className="text-xs font-semibold text-indigo-600 group-hover:text-indigo-700 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Inspect</span>
                        <ArrowRightIcon className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Column Detail Drawer */}
      {selectedColumn && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-xs transition-opacity">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col overflow-y-auto border-l border-slate-200 p-6 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-200/80">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Column Profiling Inspector
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5 break-words">
                  {selectedColumn.column_name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedColumn(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {/* General Overview Section */}
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                  <span className="text-slate-400 font-medium">Data Type</span>
                  <div className="font-bold text-slate-800 capitalize mt-0.5">
                    {selectedColumn.inferred_type}
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                  <span className="text-slate-400 font-medium">Missingness</span>
                  <div className="font-bold text-amber-600 font-mono mt-0.5">
                    {selectedColumn.missing_percentage}% ({selectedColumn.missing_count})
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                  <span className="text-slate-400 font-medium">Unique Values</span>
                  <div className="font-bold text-slate-800 font-mono mt-0.5">
                    {selectedColumn.unique_count.toLocaleString()}
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                  <span className="text-slate-400 font-medium">Cardinality</span>
                  <div className="font-bold text-slate-800 capitalize mt-0.5">
                    {selectedColumn.cardinality}
                  </div>
                </div>
              </div>

              {/* Numeric Specific Metrics */}
              {selectedColumn.inferred_type === 'numeric' ? (
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Five-Number Summary &amp; Dispersion
                  </h4>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2 text-xs font-mono">
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500 font-sans">Minimum:</span>
                      <span className="font-bold text-slate-800">{selectedColumn.min ?? 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500 font-sans">Mean:</span>
                      <span className="font-bold text-slate-800">{selectedColumn.mean ?? 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500 font-sans">Median:</span>
                      <span className="font-bold text-emerald-600">{selectedColumn.median ?? 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500 font-sans">Maximum:</span>
                      <span className="font-bold text-slate-800">{selectedColumn.max ?? 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500 font-sans">Interquartile Range (IQR):</span>
                      <span className="font-bold text-slate-800">{selectedColumn.iqr ?? 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500 font-sans">Skewness Coefficient:</span>
                      <span className="font-bold text-indigo-600">{selectedColumn.skewness ?? 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500 font-sans">Outlier Percentage:</span>
                      <span className="font-bold text-amber-600">
                        {selectedColumn.outlier_percentage}% ({selectedColumn.outlier_count} records)
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Categorical Frequency Metrics
                  </h4>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Most Frequent Value:</span>
                      <span className="font-bold text-slate-800 max-w-[180px] truncate">
                        {selectedColumn.most_frequent_value ?? 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Mode Frequency:</span>
                      <span className="font-bold font-mono text-slate-800">
                        {selectedColumn.most_frequent_frequency?.toLocaleString() ?? 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Mode Percentage:</span>
                      <span className="font-bold font-mono text-teal-600">
                        {selectedColumn.most_frequent_percentage ?? 'N/A'}%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Data Quality Flags */}
              <div className="pt-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Assigned Profile Flags
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {(selectedColumn.data_quality_flags || []).map((flag, fIdx) => (
                    <span
                      key={fIdx}
                      className="px-2 py-1 rounded-md text-xs font-mono bg-slate-100 text-slate-700 border border-slate-200"
                    >
                      {flag}
                    </span>
                  ))}
                  {(!selectedColumn.data_quality_flags || selectedColumn.data_quality_flags.length === 0) && (
                    <span className="text-xs text-slate-400 italic">No anomalies flagged for this column.</span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-auto pt-4 border-t border-slate-200">
              <button
                onClick={() => setSelectedColumn(null)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  )
}
