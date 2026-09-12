import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import PageContainer from '../components/layout/PageContainer'
import EmptyState from '../components/common/EmptyState'
import StatusBadge from '../components/common/StatusBadge'
import {
  ShieldCheckIcon,
  AlertTriangleIcon,
  AlertCircleIcon,
  InfoIcon,
  ArrowRightIcon,
  FilterIcon
} from '../components/common/Icons'

export default function DataQuality() {
  const { datasetResult, edaResult, navigateTo } = useApp()
  const [severityFilter, setSeverityFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

  if (!datasetResult) {
    return (
      <PageContainer>
        <EmptyState
          title="No dataset loaded"
          description="Upload a CSV dataset to execute automated exploratory data analysis and inspect data quality findings."
          actionText="Upload Dataset"
          onAction={() => navigateTo('/upload')}
        />
      </PageContainer>
    )
  }

  const findings = edaResult?.findings || []
  const missingAnalysis = edaResult?.missing_analysis
  const numericAnalysis = edaResult?.numeric_analysis
  const leakageItems = datasetResult?.leakage_review || []

  // Count severities
  const criticalCount = findings.filter(f => f.severity?.toLowerCase() === 'critical' || f.severity?.toLowerCase() === 'high').length
  const warningCount = findings.filter(f => f.severity?.toLowerCase() === 'warning').length
  const infoCount = findings.filter(f => f.severity?.toLowerCase() === 'info' || f.severity?.toLowerCase() === 'informational').length

  // Filtered findings
  const filteredFindings = findings.filter(f => {
    const sev = f.severity?.toLowerCase() || 'info'
    const matchesSev =
      severityFilter === 'all' ||
      (severityFilter === 'critical' && (sev === 'critical' || sev === 'high')) ||
      (severityFilter === 'warning' && sev === 'warning') ||
      (severityFilter === 'info' && (sev === 'info' || sev === 'informational'))

    const matchesCat = categoryFilter === 'all' || f.category?.toLowerCase() === categoryFilter.toLowerCase()
    return matchesSev && matchesCat
  })

  const uniqueCategories = Array.from(new Set(findings.map(f => f.category).filter(Boolean)))

  return (
    <PageContainer>
      {/* Header Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Findings</span>
            <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
              <ShieldCheckIcon className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{findings.length}</div>
          <p className="text-xs text-slate-500 mt-1">Automated algorithmic checks</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Critical / High</span>
            <span className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
              <AlertCircleIcon className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-rose-600 mt-2">{criticalCount}</div>
          <p className="text-xs text-slate-500 mt-1">Directly impacts modeling integrity</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Warnings</span>
            <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <AlertTriangleIcon className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-2">{warningCount}</div>
          <p className="text-xs text-slate-500 mt-1">Skew, outliers, or cardinality</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Target Leakage</span>
            <span className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
              <InfoIcon className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-purple-600 mt-2">{leakageItems.length}</div>
          <p className="text-xs text-slate-500 mt-1">Post-event features to exclude</p>
        </div>
      </div>

      {/* Target Leakage Review Alert Box */}
      {leakageItems.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200/80 rounded-2xl p-5 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <ShieldCheckIcon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-purple-900">
                Target Leakage Protection: {leakageItems.length} Columns Safely Flagged
              </h3>
              <p className="text-xs text-purple-700 mt-1 leading-relaxed">
                Supply chain datasets often contain post-event columns (e.g. <code>Delivery Status</code>, <code>Days for shipping (real)</code>) that artificially inflate model performance during research. The framework flags and safely excludes them before feature transformation.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {leakageItems.map((item, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 bg-white/80 border border-purple-200 rounded-lg text-xs font-mono font-medium text-purple-800 shadow-2xs"
                  >
                    {item.column_name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Findings Catalog */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Detailed Automated Findings</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Specific problems detected in the dataset and their recommended resolutions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3 py-1.5 text-xs font-medium focus:outline-none"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical / High ({criticalCount})</option>
              <option value="warning">Warnings ({warningCount})</option>
              <option value="info">Informational ({infoCount})</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3 py-1.5 text-xs font-medium focus:outline-none"
            >
              <option value="all">All Categories</option>
              {uniqueCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Findings List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredFindings.map((finding, idx) => {
            const sev = finding.severity?.toLowerCase()
            const isCritical = sev === 'critical' || sev === 'high'
            const isWarning = sev === 'warning'

            return (
              <div
                key={idx}
                className={`p-5 rounded-2xl border transition-all duration-150 flex flex-col justify-between ${
                  isCritical
                    ? 'bg-rose-50/40 border-rose-200 hover:border-rose-300'
                    : isWarning
                    ? 'bg-amber-50/40 border-amber-200 hover:border-amber-300'
                    : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md font-mono bg-white border border-slate-200 text-slate-700">
                      {finding.category || 'General'}
                    </span>
                    <StatusBadge status={isCritical ? 'critical' : isWarning ? 'warning' : 'info'}>
                      {finding.severity || 'Info'}
                    </StatusBadge>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 mt-1">
                    {finding.message}
                  </h4>

                  <div className="mt-3 text-xs text-slate-600 leading-relaxed bg-white/70 p-3 rounded-xl border border-slate-200/60">
                    <span className="font-semibold text-slate-700">Why it matters: </span>
                    {finding.category === 'missingness' || finding.category === 'missing'
                      ? 'Missing information can introduce bias or crash machine learning estimators.'
                      : finding.category === 'skewness'
                      ? 'Heavily skewed continuous features degrade gradient and distance-based convergence.'
                      : finding.category === 'outliers'
                      ? 'Extreme outlier values distort mean and variance estimates under standard scaling.'
                      : finding.category === 'leakage'
                      ? 'Target leakage causes unrealistic over-optimistic evaluation metrics.'
                      : 'Data quality anomalies directly degrade predictive generalizability.'}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-medium">Recommended Action:</span>
                  <button
                    onClick={() => navigateTo('/decisions')}
                    className="font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                  >
                    <span>View Plan</span>
                    <ArrowRightIcon className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Missing Values Table Section */}
        {missingAnalysis && missingAnalysis.has_missing_values && (
          <div className="mt-8 pt-6 border-t border-slate-100">
            <h4 className="text-sm font-bold text-slate-900 mb-3">
              Ranked Columns with Missing Data
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase font-semibold">
                    <th className="py-2.5 px-3">Rank</th>
                    <th className="py-2.5 px-3">Column Name</th>
                    <th className="py-2.5 px-3">Missing Count</th>
                    <th className="py-2.5 px-3">Missing Percentage</th>
                    <th className="py-2.5 px-3">Resolution Strategy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {missingAnalysis.columns_with_missing.map((col, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-slate-400">#{idx + 1}</td>
                      <td className="py-2.5 px-3 font-sans font-semibold text-slate-800">{col.column_name}</td>
                      <td className="py-2.5 px-3 text-slate-700">{col.missing_count.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-amber-600 font-bold">{col.missing_percentage}%</td>
                      <td className="py-2.5 px-3 font-sans text-slate-600">
                        {col.missing_percentage > 90 ? 'Exclude column (>90% missing)' : 'Skew-aware imputation'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  )
}
