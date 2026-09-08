import React, { useState, useEffect } from 'react'

function App() {
  const [health, setHealth] = useState(null)
  const [backendStatus, setBackendStatus] = useState('checking')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [datasetResult, setDatasetResult] = useState(null)
  const [activeTab, setActiveTab] = useState('summary') // 'summary' | 'columns' | 'leakage'

  // Column table filtering states
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all') // 'all' | 'numeric' | 'categorical/text'
  const [flagFilter, setFlagFilter] = useState('all')

  useEffect(() => {
    fetch('http://localhost:8000/api/health')
      .then(res => res.json())
      .then(data => {
        setHealth(data)
        setBackendStatus('connected')
      })
      .catch(() => {
        setBackendStatus('error')
      })
  }, [])

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setUploadError(null)
    }
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file) {
      setUploadError('Please select a CSV file first.')
      return
    }

    setUploading(true)
    setUploadError(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('http://localhost:8000/api/datasets/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.detail || 'Failed to upload and profile dataset.')
      }

      const data = await response.json()
      setDatasetResult(data)
      setActiveTab('summary')
    } catch (err) {
      setUploadError(err.message)
    } finally {
      setUploading(false)
    }
  }

  // Filter columns based on user search & type/flag filter
  const filteredColumns = (datasetResult?.column_profiles || []).filter(col => {
    const matchesSearch = col.column_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = typeFilter === 'all' || col.inferred_type === typeFilter
    const matchesFlag = flagFilter === 'all' || (col.data_quality_flags && col.data_quality_flags.includes(flagFilter))
    return matchesSearch && matchesType && matchesFlag
  })

  // All unique flags present in dataset for dropdown filter
  const availableFlags = Array.from(
    new Set((datasetResult?.column_profiles || []).flatMap(col => col.data_quality_flags || []))
  )

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header & Backend Connection Status */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg gap-4">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Automated EDA & Feature Engineering Framework
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Phase 2: Dataset Ingestion, Validation & Statistical Profiling
            </p>
          </div>
          <div className="flex items-center space-x-3 bg-slate-900 px-4 py-2 rounded-lg border border-slate-700">
            <span className={`w-3 h-3 rounded-full ${backendStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : backendStatus === 'error' ? 'bg-red-400' : 'bg-yellow-400'}`}></span>
            <span className="text-sm font-medium text-slate-300">
              {backendStatus === 'connected' ? `Backend Online (${health?.version})` : backendStatus === 'error' ? 'Backend Disconnected' : 'Checking Connection...'}
            </span>
          </div>
        </header>

        {/* Upload Control Section */}
        <section className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
          <h2 className="text-lg font-semibold mb-4 text-slate-200">Dataset Ingestion & Profiling</h2>
          <form onSubmit={handleUpload} className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
            />
            <button
              type="submit"
              disabled={uploading || !file}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors shadow-md w-full sm:w-auto flex-shrink-0"
            >
              {uploading ? 'Ingesting & Profiling...' : 'Upload & Profile CSV'}
            </button>
          </form>
          {uploadError && (
            <div className="mt-4 p-3 bg-red-900/50 border border-red-700 text-red-200 rounded-lg text-sm">
              <span className="font-semibold">Validation Error:</span> {uploadError}
            </div>
          )}
        </section>

        {/* Dataset Profile Dashboard */}
        {datasetResult && (
          <div className="space-y-6">
            
            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-700">
              <button
                onClick={() => setActiveTab('summary')}
                className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors ${activeTab === 'summary' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                Overview & Target Profile
              </button>
              <button
                onClick={() => setActiveTab('columns')}
                className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors ${activeTab === 'columns' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                Column Profiles ({datasetResult.column_profiles.length})
              </button>
              <button
                onClick={() => setActiveTab('leakage')}
                className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors ${activeTab === 'leakage' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                Leakage Review ({datasetResult.leakage_review.length})
              </button>
            </div>

            {/* TAB 1: Summary & Target Profile */}
            {activeTab === 'summary' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow">
                    <span className="text-xs font-semibold text-slate-400 uppercase">Dimensions</span>
                    <div className="text-2xl font-bold mt-2 text-blue-400">
                      {datasetResult.summary.num_rows.toLocaleString()} rows
                    </div>
                    <div className="text-sm text-slate-400 mt-1">
                      {datasetResult.summary.num_cols} columns ({datasetResult.summary.numeric_column_count} numeric, {datasetResult.summary.categorical_column_count} categorical)
                    </div>
                  </div>

                  <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow">
                    <span className="text-xs font-semibold text-slate-400 uppercase">Missing Values</span>
                    <div className="text-2xl font-bold mt-2 text-amber-400">
                      {datasetResult.summary.missing_value_count.toLocaleString()}
                    </div>
                    <div className="text-sm text-slate-400 mt-1">
                      {datasetResult.summary.missing_value_percentage}% overall missingness
                    </div>
                  </div>

                  <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow">
                    <span className="text-xs font-semibold text-slate-400 uppercase">Exact Row Duplicates</span>
                    <div className="text-2xl font-bold mt-2 text-emerald-400">
                      {datasetResult.summary.duplicate_row_count.toLocaleString()}
                    </div>
                    <div className="text-sm text-slate-400 mt-1">
                      0 fully duplicated rows expected
                    </div>
                  </div>

                  <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow">
                    <span className="text-xs font-semibold text-slate-400 uppercase">In-Memory Size</span>
                    <div className="text-2xl font-bold mt-2 text-purple-400">
                      {datasetResult.summary.memory_size_mb} MB
                    </div>
                    <div className="text-sm text-slate-400 mt-1 truncate">
                      File: {datasetResult.filename}
                    </div>
                  </div>
                </div>

                {/* Target Profile Card */}
                {datasetResult.target_profile ? (
                  <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-200">Target Profile: Late_delivery_risk</h3>
                        <p className="text-sm text-slate-400">
                          Target column identified | Missing values: {datasetResult.target_profile.missing_target_values}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-slate-900 p-4 rounded-lg border border-slate-700">
                        <span className="text-xs font-semibold text-slate-400 uppercase">Class Distribution (Counts)</span>
                        <ul className="mt-2 space-y-2 text-sm">
                          {Object.entries(datasetResult.target_profile.class_counts).map(([cls, count]) => (
                            <li key={cls} className="flex justify-between items-center">
                              <span className="text-slate-300 font-medium">Class {cls} ({cls === '1' ? 'Late Delivery Risk' : 'On-Time / Early'}):</span>
                              <span className="font-mono font-bold text-blue-400">{count.toLocaleString()}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="bg-slate-900 p-4 rounded-lg border border-slate-700">
                        <span className="text-xs font-semibold text-slate-400 uppercase">Class Breakdown (Percentages)</span>
                        <ul className="mt-2 space-y-2 text-sm">
                          {Object.entries(datasetResult.target_profile.class_percentages).map(([cls, pct]) => (
                            <li key={cls} className="flex justify-between items-center">
                              <span className="text-slate-300 font-medium">Class {cls}:</span>
                              <span className="font-mono font-bold text-emerald-400">{pct}%</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 text-slate-400">
                    Target candidate column 'Late_delivery_risk' was not detected in this dataset.
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Column Profiles Table with Filters */}
            {activeTab === 'columns' && (
              <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg overflow-hidden space-y-4 p-4">
                
                {/* Search & Filter Controls */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-900 p-4 rounded-lg border border-slate-700">
                  <input
                    type="text"
                    placeholder="Search column by name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-slate-200 px-4 py-2 rounded-lg text-sm w-full sm:w-64 focus:outline-none focus:border-blue-500"
                  />
                  <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full sm:w-auto">
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="bg-slate-800 border border-slate-700 text-slate-200 px-3 py-2 rounded-lg text-sm focus:outline-none"
                    >
                      <option value="all">All Column Types</option>
                      <option value="numeric">Numeric</option>
                      <option value="categorical/text">Categorical/Text</option>
                    </select>
                    <select
                      value={flagFilter}
                      onChange={(e) => setFlagFilter(e.target.value)}
                      className="bg-slate-800 border border-slate-700 text-slate-200 px-3 py-2 rounded-lg text-sm focus:outline-none"
                    >
                      <option value="all">All Profile Flags</option>
                      {availableFlags.map(flag => (
                        <option key={flag} value={flag}>{flag}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-900 text-slate-400 border-b border-slate-700 uppercase text-xs">
                        <th className="p-3">Column Name</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Missing %</th>
                        <th className="p-3">Unique / Card</th>
                        <th className="p-3">Key Statistics (Min / Mean / Median / Skew / Outliers)</th>
                        <th className="p-3">Profile Flags</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {filteredColumns.map((col, idx) => (
                        <tr key={idx} className="hover:bg-slate-700/30">
                          <td className="p-3 font-medium text-slate-200">{col.column_name}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${col.inferred_type === 'numeric' ? 'bg-blue-900/60 text-blue-300 border border-blue-700' : 'bg-purple-900/60 text-purple-300 border border-purple-700'}`}>
                              {col.inferred_type}
                            </span>
                          </td>
                          <td className="p-3 text-slate-300">{col.missing_percentage}% ({col.missing_count})</td>
                          <td className="p-3 text-slate-300">{col.unique_count} ({col.cardinality})</td>
                          <td className="p-3 text-xs text-slate-400 font-mono">
                            {col.inferred_type === 'numeric' ? (
                              <div className="space-y-0.5">
                                <div>Min: {col.min ?? 'N/A'} | Mean: {col.mean ?? 'N/A'} | Max: {col.max ?? 'N/A'}</div>
                                <div>Median: {col.median ?? 'N/A'} | Skew: {col.skewness ?? 'N/A'}</div>
                                <div>IQR: {col.iqr ?? 'N/A'} | Outliers: {col.outlier_count} ({col.outlier_percentage}%)</div>
                              </div>
                            ) : (
                              <div>Mode: <span className="text-slate-200">{col.most_frequent_value ?? 'N/A'}</span> ({col.most_frequent_frequency} freq, {col.most_frequent_percentage}%)</div>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1">
                              {col.data_quality_flags.map((flag, fIdx) => {
                                let colorClass = "bg-slate-700 text-slate-300 border-slate-600"
                                if (flag === "completely missing" || flag === "high missingness") colorClass = "bg-amber-900/60 text-amber-300 border-amber-700"
                                else if (flag === "highly skewed" || flag === "outlier-heavy") colorClass = "bg-rose-900/60 text-rose-300 border-rose-700"
                                else if (flag === "low cardinality" || flag === "high cardinality") colorClass = "bg-indigo-900/60 text-indigo-300 border-indigo-700"
                                else if (flag === "constant/near-constant" || flag === "potential identifier") colorClass = "bg-purple-900/60 text-purple-300 border-purple-700"
                                return (
                                  <span key={fIdx} className={`px-2 py-0.5 rounded text-[11px] border ${colorClass}`}>
                                    {flag}
                                  </span>
                                )
                              })}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredColumns.length === 0 && (
                    <div className="p-8 text-center text-slate-400">
                      No columns match the current filter criteria.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: Leakage Review */}
            {activeTab === 'leakage' && (
              <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg space-y-4">
                <h3 className="text-lg font-semibold text-slate-200">Target Leakage Detection Review</h3>
                <p className="text-sm text-slate-300">
                  Per research methodology, post-event feature leakage columns are detected during profiling and flagged for downstream handling (preventing leakage during feature engineering). Raw data remains completely intact during profiling.
                </p>
                {datasetResult.leakage_review.length > 0 ? (
                  <div className="space-y-3">
                    {datasetResult.leakage_review.map((item, idx) => (
                      <div key={idx} className="bg-slate-900 p-4 rounded-lg border border-amber-600/40">
                        <div className="font-semibold text-amber-400">{item.column_name}</div>
                        <div className="text-sm text-slate-300 mt-1">Reason: {item.reason}</div>
                        <div className="text-xs text-slate-400 mt-1 italic">Recommendation: {item.recommendation}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-400">No known target leakage columns detected in the uploaded dataset.</div>
                )}
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  )
}

export default App
