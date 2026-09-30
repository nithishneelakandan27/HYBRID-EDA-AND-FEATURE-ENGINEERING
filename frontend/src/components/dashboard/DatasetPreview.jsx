import React, { useState, useMemo, useRef } from 'react'
import {
  SearchIcon,
  FilterIcon,
  RefreshCwIcon,
  AlertCircleIcon,
  InfoIcon
} from '../common/Icons'

export default function DatasetPreview({
  previewData,
  columnProfiles = [],
  summary,
  loading = false,
  error = null,
  onRetry
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all') // 'all' | 'numeric' | 'categorical'
  const [hoveredHeader, setHoveredHeader] = useState(null)
  const [headerTooltipPos, setHeaderTooltipPos] = useState({ top: 0, left: 0 })

  // Extract columns & rows
  const allColumns = useMemo(() => {
    if (previewData?.columns && previewData.columns.length > 0) {
      return previewData.columns
    }
    if (columnProfiles && columnProfiles.length > 0) {
      return columnProfiles.map((c) => c.column_name)
    }
    return []
  }, [previewData, columnProfiles])

  // Profile lookup map for fast column info & type inference
  const profileMap = useMemo(() => {
    const map = new Map()
    if (columnProfiles && columnProfiles.length > 0) {
      columnProfiles.forEach((cp) => map.set(cp.column_name, cp))
    }
    return map
  }, [columnProfiles])

  // Metadata lookup map from previewData.columns_metadata if available
  const metaMap = useMemo(() => {
    const map = new Map()
    if (previewData?.columns_metadata && previewData.columns_metadata.length > 0) {
      previewData.columns_metadata.forEach((cm) => map.set(cm.column_name, cm))
    }
    return map
  }, [previewData])

  // Helper to check if a column is numeric
  const isColNumeric = (colName) => {
    const profile = profileMap.get(colName)
    if (profile) return profile.inferred_type === 'numeric'
    const meta = metaMap.get(colName)
    if (meta) return meta.inferred_type === 'numeric'
    return false
  }

  // Filter columns based on search term & type filter
  const visibleColumns = useMemo(() => {
    return allColumns.filter((colName) => {
      const matchesSearch = colName.toLowerCase().includes(searchTerm.toLowerCase().trim())
      const isNum = isColNumeric(colName)
      const matchesType =
        typeFilter === 'all' ||
        (typeFilter === 'numeric' && isNum) ||
        (typeFilter === 'categorical' && !isNum)
      return matchesSearch && matchesType
    })
  }, [allColumns, searchTerm, typeFilter, profileMap, metaMap])

  // Numeric and categorical counts
  const numericCount = summary?.numeric_column_count ?? allColumns.filter(isColNumeric).length
  const categoricalCount =
    summary?.categorical_column_count ?? allColumns.filter((c) => !isColNumeric(c)).length
  const previewRows = previewData?.rows || []
  const totalColumns = allColumns.length

  // Check if a value is considered missing
  const isMissingValue = (val) => {
    return (
      val === null ||
      val === undefined ||
      val === '' ||
      val === 'NaN' ||
      val === 'nan' ||
      val === 'None' ||
      val === 'null'
    )
  }

  // Handle header hover for rich tooltip
  const handleHeaderMouseEnter = (e, colName) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setHeaderTooltipPos({
      top: rect.top - 8,
      left: Math.max(120, Math.min(window.innerWidth - 140, rect.left + rect.width / 2))
    })

    const profile = profileMap.get(colName)
    const meta = metaMap.get(colName)
    const isNum = profile ? profile.inferred_type === 'numeric' : meta?.inferred_type === 'numeric'

    setHoveredHeader({
      name: colName,
      type: isNum ? 'Numerical' : 'Categorical / Text',
      isNumeric: isNum,
      missingPct: profile?.missing_percentage ?? (summary?.missing_value_percentage || 0),
      missingCount: profile?.missing_count ?? 0,
      uniqueCount: profile?.unique_count ?? '—',
      quality:
        profile?.data_quality_flags && profile.data_quality_flags.length > 0
          ? profile.data_quality_flags.join(', ')
          : 'Clean'
    })
  }

  const handleHeaderMouseLeave = () => {
    setHoveredHeader(null)
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      {/* 1. Header Section */}
      <div className="p-4 sm:p-5 border-b border-slate-200/80 bg-slate-50/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Dataset Preview</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/70 font-mono shadow-2xs">
                {previewRows.length} rows × {totalColumns} columns
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              First {previewRows.length} rows of your dataset
            </p>
          </div>

          {/* 6. Search & Filter Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative w-full sm:w-64">
              <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search columns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-2xs transition-colors"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs px-1"
                >
                  ×
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-white border border-slate-200 text-slate-700 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-indigo-500 shadow-2xs cursor-pointer"
              >
                <option value="all">All Data Types</option>
                <option value="numeric">Numerical Only ({numericCount})</option>
                <option value="categorical">Categorical Only ({categoricalCount})</option>
              </select>

              <span className="text-xs text-slate-400 font-mono whitespace-nowrap hidden sm:inline pl-1">
                Showing {visibleColumns.length} of {totalColumns} columns
              </span>
            </div>
          </div>
        </div>

        {/* Small screen column counter */}
        <div className="mt-2 text-xs text-slate-400 font-mono sm:hidden">
          Showing {visibleColumns.length} of {totalColumns} columns
        </div>
      </div>

      {/* 2 & 8 & 9. Scrollable Data Table Container */}
      <div className="relative">
        {loading ? (
          <div className="p-8 text-center space-y-3 bg-white">
            <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 animate-spin mb-1">
              <RefreshCwIcon className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-slate-700">Loading dataset preview rows...</p>
            <p className="text-[11px] text-slate-400">Fetching the first 50 records from backend</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center bg-rose-50/40 border-y border-rose-100 space-y-3">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-rose-100 text-rose-600 mb-1">
              <AlertCircleIcon className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-rose-800">Dataset Preview Error</h4>
            <p className="text-xs text-rose-600 max-w-md mx-auto">{error}</p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <RefreshCwIcon className="w-3.5 h-3.5" />
                <span>Retry Preview</span>
              </button>
            )}
          </div>
        ) : previewRows.length === 0 ? (
          <div className="p-12 text-center bg-white space-y-2">
            <p className="text-xs font-medium text-slate-500">Upload a dataset to preview your data.</p>
          </div>
        ) : visibleColumns.length === 0 ? (
          <div className="p-10 text-center bg-slate-50/50 space-y-2">
            <p className="text-xs font-medium text-slate-600">
              No columns match the current filter <span className="font-semibold">"{searchTerm}"</span>.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchTerm('')
                setTypeFilter('all')
              }}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
            >
              Reset column search &amp; filter
            </button>
          </div>
        ) : (
          <div className="overflow-auto max-h-[520px] bg-white scrollbar-thin scrollbar-thumb-slate-300">
            <table className="min-w-full border-separate border-spacing-0 text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200">
                  {/* Sticky Row Number (#) Header */}
                  <th
                    scope="col"
                    className="sticky top-0 left-0 z-30 bg-slate-100/95 backdrop-blur-xs py-3 px-3 text-center font-mono font-bold text-slate-500 uppercase tracking-wider text-[11px] border-b border-r border-slate-200 select-none shadow-xs min-w-[56px] w-14"
                  >
                    #
                  </th>

                  {/* Dynamic Column Headers with badges & hover tooltip triggers */}
                  {visibleColumns.map((colName) => {
                    const isNum = isColNumeric(colName)
                    const profile = profileMap.get(colName)
                    const missingPct = profile?.missing_percentage ?? 0
                    const uniqueCount = profile?.unique_count ?? '—'
                    const quality =
                      profile?.data_quality_flags && profile.data_quality_flags.length > 0
                        ? profile.data_quality_flags.join(', ')
                        : 'Clean'

                    return (
                      <th
                        key={colName}
                        scope="col"
                        onMouseEnter={(e) => handleHeaderMouseEnter(e, colName)}
                        onMouseLeave={handleHeaderMouseLeave}
                        title={`Column: ${colName}\nType: ${isNum ? 'Numerical' : 'Categorical/Text'}\nMissing: ${missingPct}%\nUnique: ${uniqueCount}\nQuality: ${quality}`}
                        className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-xs py-2.5 px-3.5 border-b border-r border-slate-200 text-slate-700 font-semibold shadow-xs select-none min-w-[150px] max-w-[240px] transition-colors hover:bg-slate-100/90 cursor-default"
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="truncate font-semibold text-slate-800" title={colName}>
                            {colName}
                          </span>

                          {/* Data Type Badge Indicator */}
                          {isNum ? (
                            <span
                              className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 font-mono"
                              title="Numerical Column"
                            >
                              123
                            </span>
                          ) : (
                            <span
                              className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-200/80 font-mono"
                              title="Categorical / Text Column"
                            >
                              Aa
                            </span>
                          )}
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {previewRows.map((row, rIdx) => {
                  const rowNumber = rIdx + 1

                  return (
                    <tr key={rIdx} className="hover:bg-slate-50/80 transition-colors">
                      {/* Sticky Row Number Column (#) */}
                      <td className="sticky left-0 z-10 bg-slate-50/95 backdrop-blur-xs py-2 px-3 font-mono text-[11px] font-semibold text-slate-400 text-center border-r border-b border-slate-200 select-none">
                        {rowNumber}
                      </td>

                      {/* Data Cells */}
                      {visibleColumns.map((colName) => {
                        const rawVal = row[colName]
                        const isMissing = isMissingValue(rawVal)
                        const isNum = isColNumeric(colName)

                        if (isMissing) {
                          return (
                            <td
                              key={colName}
                              title="Missing value (null / NaN)"
                              className="py-2 px-3 border-r border-b border-slate-100 text-center bg-amber-100/50 hover:bg-amber-100/80 text-amber-700 font-mono italic text-xs min-w-[150px] max-w-[240px] transition-colors"
                            >
                              <span className="select-all font-semibold">—</span>
                            </td>
                          )
                        }

                        // Formatted display value
                        let displayVal = String(rawVal)
                        if (typeof rawVal === 'number') {
                          if (!Number.isInteger(rawVal)) {
                            // Display cleanly without unnecessary float representation quirks
                            displayVal = Number(rawVal.toFixed(4)).toString()
                          }
                        }

                        return (
                          <td
                            key={colName}
                            title={String(rawVal)}
                            className={`py-2 px-3 border-r border-b border-slate-100 text-xs min-w-[150px] max-w-[240px] truncate transition-colors ${
                              isNum
                                ? 'bg-blue-50/20 hover:bg-blue-50/50 text-slate-800 font-mono text-right'
                                : 'bg-teal-50/15 hover:bg-teal-50/40 text-slate-800 text-left'
                            }`}
                          >
                            <div className={`truncate ${isNum ? 'text-right' : 'text-left'}`}>
                              {displayVal}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Legend & Dynamic Summary Footer */}
      <div className="px-4 py-3 bg-slate-50/60 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-4 text-slate-600 font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-blue-100"></span>
            <span className="font-semibold text-slate-700">Numerical</span>
            <span className="text-[10px] px-1 bg-blue-50 text-blue-600 rounded border border-blue-200 font-mono">
              123
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-500 ring-2 ring-teal-100"></span>
            <span className="font-semibold text-slate-700">Categorical / Text</span>
            <span className="text-[10px] px-1 bg-teal-50 text-teal-600 rounded border border-teal-200 font-mono">
              Aa
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-amber-100"></span>
            <span className="font-semibold text-slate-700">Missing</span>
            <span className="text-[10px] px-1.5 bg-amber-100 text-amber-700 rounded border border-amber-200 font-mono font-bold">
              —
            </span>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 font-mono">
          Showing first {previewRows.length} rows &bull; Horizontally &amp; vertically scrollable
        </div>
      </div>

      {/* Floating Header Info Tooltip (Escapes table overflow) */}
      {hoveredHeader && (
        <div
          style={{
            top: `${headerTooltipPos.top}px`,
            left: `${headerTooltipPos.left}px`
          }}
          className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-1.5 bg-slate-900/95 text-slate-100 rounded-xl shadow-2xl p-3 text-xs w-64 border border-slate-700/80 backdrop-blur-xs animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="font-bold text-white text-xs mb-1.5 border-b border-slate-800 pb-1.5 break-words">
            {hoveredHeader.name}
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Type:</span>
              <span
                className={`font-semibold px-1.5 py-0.5 rounded text-[10px] ${
                  hoveredHeader.isNumeric
                    ? 'bg-blue-900/60 text-blue-300 border border-blue-700/50'
                    : 'bg-teal-900/60 text-teal-300 border border-teal-700/50'
                }`}
              >
                {hoveredHeader.type}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Missing:</span>
              <span
                className={`font-mono ${
                  hoveredHeader.missingPct > 0 ? 'text-amber-400 font-semibold' : 'text-slate-300'
                }`}
              >
                {hoveredHeader.missingPct}%{' '}
                {hoveredHeader.missingCount > 0 && `(${hoveredHeader.missingCount.toLocaleString()})`}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Unique:</span>
              <span className="font-mono text-slate-200">
                {typeof hoveredHeader.uniqueCount === 'number'
                  ? hoveredHeader.uniqueCount.toLocaleString()
                  : hoveredHeader.uniqueCount}
              </span>
            </div>
            <div className="flex justify-between items-center pt-0.5">
              <span className="text-slate-400">Quality:</span>
              <span className="font-medium text-indigo-300 truncate max-w-[150px]">
                {hoveredHeader.quality}
              </span>
            </div>
          </div>
          {/* Arrow */}
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 rotate-45 border-r border-b border-slate-700/80"></div>
        </div>
      )}
    </div>
  )
}
