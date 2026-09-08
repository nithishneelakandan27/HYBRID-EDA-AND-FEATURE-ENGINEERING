import React, { useState, useEffect } from 'react'

function App() {
  const [health, setHealth] = useState(null)
  const [backendStatus, setBackendStatus] = useState('checking')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [datasetResult, setDatasetResult] = useState(null)
  const [edaResult, setEdaResult] = useState(null)
  const [decisionPlan, setDecisionPlan] = useState(null)
  const [preprocessingSession, setPreprocessingSession] = useState(null)
  const [loadingEda, setLoadingEda] = useState(false)
  const [loadingDecision, setLoadingDecision] = useState(false)
  const [executingPrep, setExecutingPrep] = useState(false)
  const [prepError, setPrepError] = useState(null)
  const [activeTab, setActiveTab] = useState('summary') // 'summary' | 'columns' | 'eda' | 'decisions' | 'preprocessing' | 'evaluation' | 'leakage'
  const [evaluationResult, setEvaluationResult] = useState(null)
  const [runningEval, setRunningEval] = useState(false)
  const [evalError, setEvalError] = useState(null)
  const [evalTargetCol, setEvalTargetCol] = useState('Late_delivery_risk')
  const [evalLeakageCols, setEvalLeakageCols] = useState('Delivery Status,Days for shipping (real),shipping date (DateOrders),Product Description,Order Zipcode')

  // Preprocessing config state
  const [testSize, setTestSize] = useState(0.20)
  const [randomState, setRandomState] = useState(42)

  // Column table filtering states
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [flagFilter, setFlagFilter] = useState('all')

  // Decision table filtering states
  const [decisionSearch, setDecisionSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    fetch('/api/health')
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

  const fetchEdaAnalysis = async () => {
    setLoadingEda(true)
    try {
      const res = await fetch('/api/eda/analysis')
      if (res.ok) {
        const data = await res.json()
        setEdaResult(data.eda)
      }
    } catch (err) {
      console.error('Failed to fetch EDA analysis:', err)
    } finally {
      setLoadingEda(false)
    }
  }

  const fetchDecisionPlan = async () => {
    setLoadingDecision(true)
    try {
      const res = await fetch('/api/decision/plan')
      if (res.ok) {
        const data = await res.json()
        setDecisionPlan(data.decision_plan)
      }
    } catch (err) {
      console.error('Failed to fetch decision plan:', err)
    } finally {
      setLoadingDecision(false)
    }
  }

  const executePreprocessing = async () => {
    setExecutingPrep(true)
    setPrepError(null)
    try {
      const res = await fetch('/api/preprocessing/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test_size: parseFloat(testSize),
          random_state: parseInt(randomState)
        })
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.detail || 'Failed to execute preprocessing.')
      }

      const data = await res.json()
      setPreprocessingSession(data)
      setActiveTab('preprocessing')
    } catch (err) {
      setPrepError(err.message)
    } finally {
      setExecutingPrep(false)
    }
  }

  const runEvaluation = async () => {
    setRunningEval(true)
    setEvalError(null)
    try {
      const leakageList = evalLeakageCols
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
      const res = await fetch('/api/evaluation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_column: evalTargetCol,
          leakage_columns: leakageList.length > 0 ? leakageList : null,
          use_dataco_defaults: false,
          test_size: 0.20,
          random_state: 42
        })
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.detail || 'Evaluation failed.')
      }
      const data = await res.json()
      setEvaluationResult(data)
      setActiveTab('evaluation')
    } catch (err) {
      setEvalError(err.message)
    } finally {
      setRunningEval(false)
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
    setPreprocessingSession(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/datasets/upload', {
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

      // Fetch Automated EDA & Decision Plan concurrently
      await Promise.all([fetchEdaAnalysis(), fetchDecisionPlan()])
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

  // Filter decision columns
  const filteredDecisions = (decisionPlan?.columns || []).filter(col => {
    const matchesSearch = col.column_name.toLowerCase().includes(decisionSearch.toLowerCase())
    const matchesStatus = statusFilter === 'all' || col.status === statusFilter
    return matchesSearch && matchesStatus
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
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent">
              Hybrid EDA & Feature Engineering Framework
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              End-to-End Pipeline: Ingestion → EDA → Hybrid Decisions → Preprocessing → Feature Engineering → Feature Selection → ML Evaluation
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
          <h2 className="text-lg font-semibold mb-4 text-slate-200">Dataset Ingestion & Automated Profiling</h2>
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
              {uploading ? 'Ingesting & Analyzing...' : 'Upload & Analyze CSV'}
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
            <div className="flex border-b border-slate-700 overflow-x-auto">
              <button
                onClick={() => setActiveTab('summary')}
                className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'summary' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                Overview & Target Profile
              </button>
              <button
                onClick={() => setActiveTab('columns')}
                className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'columns' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                Column Profiles ({datasetResult.column_profiles.length})
              </button>
              <button
                onClick={() => {
                  setActiveTab('eda')
                  if (!edaResult) fetchEdaAnalysis()
                }}
                className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'eda' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                <span>Automated EDA</span>
                {edaResult && <span className="bg-indigo-900/80 text-indigo-300 text-xs px-2 py-0.5 rounded-full border border-indigo-700">{edaResult.findings.length} findings</span>}
              </button>
              <button
                onClick={() => {
                  setActiveTab('decisions')
                  if (!decisionPlan) fetchDecisionPlan()
                }}
                className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'decisions' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                <span>Hybrid Decisions</span>
                {decisionPlan && <span className="bg-emerald-900/80 text-emerald-300 text-xs px-2 py-0.5 rounded-full border border-emerald-700">{decisionPlan.columns.length} columns planned</span>}
              </button>
              <button
                onClick={() => setActiveTab('preprocessing')}
                className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'preprocessing' ? 'border-teal-500 text-teal-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                <span>Preprocessing Pipeline</span>
                {preprocessingSession && <span className="bg-teal-900/80 text-teal-300 text-xs px-2 py-0.5 rounded-full border border-teal-700">Fitted ({preprocessingSession.features_summary.transformed_feature_count} features)</span>}
              </button>
              <button
                onClick={() => setActiveTab('evaluation')}
                className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'evaluation' ? 'border-violet-500 text-violet-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                <span>ML Evaluation</span>
                {evaluationResult && <span className="bg-violet-900/80 text-violet-300 text-xs px-2 py-0.5 rounded-full border border-violet-700">3 Pipelines</span>}
              </button>
              <button
                onClick={() => setActiveTab('leakage')}
                className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'leakage' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
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

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-900 text-slate-400 border-b border-slate-700 uppercase text-xs">
                        <th className="p-3">Column Name</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Missing %</th>
                        <th className="p-3">Unique / Card</th>
                        <th className="p-3">Key Statistics</th>
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
                              {col.data_quality_flags.map((flag, fIdx) => (
                                <span key={fIdx} className="px-2 py-0.5 rounded text-[11px] border bg-slate-700 text-slate-300 border-slate-600">
                                  {flag}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: AUTOMATED EDA DASHBOARD */}
            {activeTab === 'eda' && (
              <div className="space-y-6">
                {loadingEda ? (
                  <div className="p-8 bg-slate-800 rounded-xl border border-slate-700 text-center text-slate-400">
                    Running automated dataset-aware EDA engine...
                  </div>
                ) : edaResult ? (
                  <div className="space-y-6">
                    
                    {/* Execution Summary */}
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg space-y-3">
                      <h3 className="text-lg font-semibold text-slate-200">Dataset-Aware Execution Summary</h3>
                      <div className="flex flex-wrap gap-3 text-xs">
                        <span className={`px-3 py-1 rounded-full border ${edaResult.analysis_flags.missing_charts_generated ? 'bg-amber-900/40 text-amber-300 border-amber-700' : 'bg-emerald-900/40 text-emerald-300 border-emerald-700'}`}>
                          Missing Analysis: {edaResult.missing_analysis.has_missing_values ? `Active (${edaResult.missing_analysis.columns_with_missing.length} cols with missing)` : 'No Missing Values Detected'}
                        </span>
                        <span className="px-3 py-1 rounded-full border bg-blue-900/40 text-blue-300 border-blue-700">
                          Numeric Analysis: {edaResult.numeric_analysis.numeric_column_count} Columns Analyzed
                        </span>
                        <span className="px-3 py-1 rounded-full border bg-purple-900/40 text-purple-300 border-purple-700">
                          Categorical Analysis: {edaResult.categorical_analysis.categorical_column_count} Columns Analyzed
                        </span>
                        <span className={`px-3 py-1 rounded-full border ${edaResult.correlation_analysis.can_compute_correlation ? 'bg-indigo-900/40 text-indigo-300 border-indigo-700' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                          Correlation Analysis: {edaResult.correlation_analysis.can_compute_correlation ? `Active (${edaResult.correlation_analysis.high_correlation_pairs.length} high pairs)` : 'Skipped (< 2 numeric cols)'}
                        </span>
                      </div>
                    </div>

                    {/* Dynamic Findings Panel */}
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg space-y-4">
                      <h3 className="text-lg font-semibold text-slate-200 flex items-center justify-between">
                        <span>Automated Insights & Findings</span>
                        <span className="text-xs bg-slate-900 px-3 py-1 rounded-lg border border-slate-700 text-slate-400">{edaResult.findings.length} Auto-Generated Insights</span>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {edaResult.findings.map((f, idx) => (
                          <div key={idx} className="p-4 rounded-lg border border-slate-700 bg-slate-900 space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded border bg-slate-800 text-slate-300 border-slate-700">{f.category}</span>
                              <span className="text-[10px] text-slate-400 uppercase">{f.severity}</span>
                            </div>
                            <p className="text-sm text-slate-200 font-medium mt-1">{f.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Missingness EDA */}
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg space-y-4">
                      <h3 className="text-lg font-semibold text-slate-200">1. Missing-Value EDA</h3>
                      {edaResult.missing_analysis.has_missing_values ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-sm">
                            <thead>
                              <tr className="bg-slate-900 text-slate-400 border-b border-slate-700 uppercase text-xs">
                                <th className="p-3">Rank</th>
                                <th className="p-3">Column Name</th>
                                <th className="p-3">Missing Count</th>
                                <th className="p-3">Missing Percentage</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                              {edaResult.missing_analysis.columns_with_missing.map((col, idx) => (
                                <tr key={idx} className="hover:bg-slate-700/30">
                                  <td className="p-3 text-slate-400 font-mono">#{idx + 1}</td>
                                  <td className="p-3 font-medium text-slate-200">{col.column_name}</td>
                                  <td className="p-3 text-slate-300">{col.missing_count.toLocaleString()}</td>
                                  <td className="p-3 text-amber-400 font-mono font-semibold">{col.missing_percentage}%</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="p-4 bg-emerald-900/30 border border-emerald-700 rounded-lg text-emerald-200 text-sm">
                          No missing values present in this dataset.
                        </div>
                      )}
                    </div>

                    {/* Numeric EDA */}
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg space-y-4">
                      <h3 className="text-lg font-semibold text-slate-200">2. Numeric EDA Distributions & Boxplots</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {edaResult.numeric_analysis.visualizations.map((viz, idx) => (
                          <div key={idx} className="bg-slate-900 p-4 rounded-lg border border-slate-700 space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-blue-400 text-sm">{viz.column_name}</span>
                              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                                Skew: {viz.skewness}
                              </span>
                            </div>
                            <div className="text-xs text-slate-400 font-mono bg-slate-950 p-2 rounded border border-slate-800 flex justify-between">
                              <span>Min: {viz.boxplot.min}</span>
                              <span>Q1: {viz.boxplot.q1}</span>
                              <span className="text-emerald-400 font-bold">Med: {viz.boxplot.median}</span>
                              <span>Q3: {viz.boxplot.q3}</span>
                              <span>Max: {viz.boxplot.max}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                ) : null}
              </div>
            )}

            {/* TAB 4: HYBRID DECISIONS DASHBOARD */}
            {activeTab === 'decisions' && (
              <div className="space-y-6">
                {loadingDecision ? (
                  <div className="p-8 bg-slate-800 rounded-xl border border-slate-700 text-center text-slate-400">
                    Generating hybrid rule-based preprocessing decisions...
                  </div>
                ) : decisionPlan ? (
                  <div className="space-y-6">
                    
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase">Imputation</span>
                        <div className="text-xl font-bold mt-1 text-amber-400">
                          {decisionPlan.summary_counts.mean_imputations + decisionPlan.summary_counts.median_imputations + decisionPlan.summary_counts.most_frequent_imputations}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {decisionPlan.summary_counts.mean_imputations} Mean | {decisionPlan.summary_counts.median_imputations} Median
                        </div>
                      </div>

                      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase">Scaling</span>
                        <div className="text-xl font-bold mt-1 text-blue-400">
                          {decisionPlan.summary_counts.robust_scalers + decisionPlan.summary_counts.standard_scalers}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {decisionPlan.summary_counts.robust_scalers} Robust | {decisionPlan.summary_counts.standard_scalers} Standard
                        </div>
                      </div>

                      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase">Log1p Transform</span>
                        <div className="text-xl font-bold mt-1 text-purple-400">
                          {decisionPlan.summary_counts.log1p_transformations}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          |skew| &gt; 1 &amp; min &ge; 0
                        </div>
                      </div>

                      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase">Encoding</span>
                        <div className="text-xl font-bold mt-1 text-emerald-400">
                          {decisionPlan.summary_counts.one_hot_encodings + decisionPlan.summary_counts.label_encodings}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {decisionPlan.summary_counts.one_hot_encodings} OneHot | {decisionPlan.summary_counts.label_encodings} Label
                        </div>
                      </div>

                      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase">Excluded Columns</span>
                        <div className="text-xl font-bold mt-1 text-rose-400">
                          {decisionPlan.summary_counts.excluded_columns}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          100% missing / Constant
                        </div>
                      </div>

                      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase">Target Leakage</span>
                        <div className="text-xl font-bold mt-1 text-orange-400">
                          {decisionPlan.summary_counts.leakage_columns}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Excluded from features
                        </div>
                      </div>
                    </div>

                    {/* Filter & Table */}
                    <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg overflow-hidden space-y-4 p-4">
                      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-900 p-4 rounded-lg border border-slate-700">
                        <input
                          type="text"
                          placeholder="Search column in decisions..."
                          value={decisionSearch}
                          onChange={(e) => setDecisionSearch(e.target.value)}
                          className="bg-slate-800 border border-slate-700 text-slate-200 px-4 py-2 rounded-lg text-sm w-full sm:w-64 focus:outline-none focus:border-emerald-500"
                        />
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="bg-slate-800 border border-slate-700 text-slate-200 px-3 py-2 rounded-lg text-sm focus:outline-none"
                        >
                          <option value="all">All Column Statuses</option>
                          <option value="usable_numeric">Usable Numeric</option>
                          <option value="usable_categorical">Usable Categorical</option>
                          <option value="leakage_candidate">Leakage Candidate</option>
                          <option value="completely_missing">Completely Missing</option>
                          <option value="constant">Constant</option>
                        </select>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                          <thead>
                            <tr className="bg-slate-900 text-slate-400 border-b border-slate-700 uppercase text-xs">
                              <th className="p-3">Column Name</th>
                              <th className="p-3">Type &amp; Status</th>
                              <th className="p-3">Statistical Profile</th>
                              <th className="p-3">Recommended Actions</th>
                              <th className="p-3">Explanatory Rationale</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-700">
                            {filteredDecisions.map((col, idx) => (
                              <tr key={idx} className="hover:bg-slate-700/30">
                                <td className="p-3 font-medium text-slate-200">{col.column_name}</td>
                                <td className="p-3">
                                  <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${col.data_type === 'numeric' ? 'bg-blue-900/60 text-blue-300 border border-blue-700' : 'bg-purple-900/60 text-purple-300 border border-purple-700'}`}>
                                    {col.data_type}
                                  </span>
                                </td>
                                <td className="p-3 text-xs text-slate-400 font-mono">
                                  Missing: {col.statistics.missing_percentage}%
                                </td>
                                <td className="p-3">
                                  <div className="flex flex-wrap gap-1">
                                    {col.decisions.map((d, dIdx) => d.operation !== 'none' && (
                                      <span key={dIdx} className="px-2 py-0.5 rounded text-[11px] font-medium border bg-slate-700 text-slate-300 border-slate-600">
                                        {d.operation}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="p-3 text-xs text-slate-300 max-w-xs space-y-1">
                                  {col.decisions.map((d, dIdx) => (
                                    <div key={dIdx} className="text-slate-300">
                                      <span className="text-slate-400 font-semibold">• {d.step}: </span>
                                      {d.reason}
                                    </div>
                                  ))}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>
                ) : null}
              </div>
            )}

            {/* TAB 5: ACTUAL PREPROCESSING PIPELINE EXECUTION */}
            {activeTab === 'preprocessing' && (
              <div className="space-y-6">
                {/* Configuration & Action Header */}
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg space-y-4">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-200">Execute Hybrid Preprocessing Pipeline</h3>
                      <p className="text-sm text-slate-400 mt-0.5">
                        Applies Phase 4 decisions fitted strictly on training data (preventing data leakage).
                      </p>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                      <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300">
                        <span>Test Split:</span>
                        <select
                          value={testSize}
                          onChange={(e) => setTestSize(e.target.value)}
                          className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs"
                        >
                          <option value={0.20}>80 / 20 (Standard)</option>
                          <option value={0.25}>75 / 25</option>
                          <option value={0.30}>70 / 30</option>
                        </select>
                      </div>
                      <button
                        onClick={executePreprocessing}
                        disabled={executingPrep}
                        className="px-6 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors shadow-md text-sm flex-shrink-0"
                      >
                        {executingPrep ? 'Executing Pipeline...' : 'Execute Preprocessing'}
                      </button>
                    </div>
                  </div>

                  {prepError && (
                    <div className="p-3 bg-red-900/50 border border-red-700 text-red-200 rounded-lg text-sm">
                      <span className="font-semibold">Execution Error:</span> {prepError}
                    </div>
                  )}
                </div>

                {/* Preprocessing Session Results */}
                {preprocessingSession ? (
                  <div className="space-y-6">
                    {/* Execution Metric Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow">
                        <span className="text-xs font-semibold text-slate-400 uppercase">Train / Test Split</span>
                        <div className="text-2xl font-bold mt-2 text-teal-400">
                          {preprocessingSession.split_info.train_rows.toLocaleString()} / {preprocessingSession.split_info.test_rows.toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          {100 - preprocessingSession.split_info.test_percentage}% Train / {preprocessingSession.split_info.test_percentage}% Test (Seed {preprocessingSession.split_info.random_state})
                        </div>
                      </div>

                      <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow">
                        <span className="text-xs font-semibold text-slate-400 uppercase">Retained Features</span>
                        <div className="text-2xl font-bold mt-2 text-blue-400">
                          {preprocessingSession.features_summary.retained_columns_before_encoding}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          From {preprocessingSession.features_summary.original_column_count} original columns
                        </div>
                      </div>

                      <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow">
                        <span className="text-xs font-semibold text-slate-400 uppercase">Transformed Dimensions</span>
                        <div className="text-2xl font-bold mt-2 text-emerald-400">
                          {preprocessingSession.features_summary.transformed_feature_count} features
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          After One-Hot &amp; Ordinal Encoding
                        </div>
                      </div>

                      <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow">
                        <span className="text-xs font-semibold text-slate-400 uppercase">Excluded / Leakage</span>
                        <div className="text-2xl font-bold mt-2 text-rose-400">
                          {preprocessingSession.features_summary.excluded_column_count}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          {preprocessingSession.features_summary.leakage_column_count} leakage candidates excluded
                        </div>
                      </div>
                    </div>

                    {/* Numeric Pipeline Execution Details */}
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg space-y-4">
                      <h4 className="text-md font-semibold text-slate-200">Fitted Numeric Preprocessing Operations (Learned on Train Only)</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                          <thead>
                            <tr className="bg-slate-900 text-slate-400 border-b border-slate-700 uppercase text-xs">
                              <th className="p-3">Numeric Feature</th>
                              <th className="p-3">Imputation Method</th>
                              <th className="p-3">Learned Impute Value</th>
                              <th className="p-3">Train Skewness</th>
                              <th className="p-3">Log1p Applied</th>
                              <th className="p-3">Scaler Type</th>
                              <th className="p-3">Train Outlier %</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-700">
                            {Object.entries(preprocessingSession.metadata.numeric_operations).map(([col, ops], idx) => (
                              <tr key={idx} className="hover:bg-slate-700/30">
                                <td className="p-3 font-medium text-slate-200">{col}</td>
                                <td className="p-3">
                                  <span className="px-2 py-0.5 rounded text-xs bg-amber-900/60 text-amber-300 border border-amber-700">
                                    {ops.imputation_method}
                                  </span>
                                </td>
                                <td className="p-3 font-mono text-slate-300">{ops.imputed_value}</td>
                                <td className="p-3 font-mono text-slate-300">{ops.skewness}</td>
                                <td className="p-3">
                                  {ops.log1p_applied ? (
                                    <span className="px-2 py-0.5 rounded text-xs bg-purple-900/60 text-purple-300 border border-purple-700">log1p</span>
                                  ) : (
                                    <span className="text-xs text-slate-500">None</span>
                                  )}
                                </td>
                                <td className="p-3">
                                  <span className={`px-2 py-0.5 rounded text-xs ${ops.scaler_type === 'RobustScaler' ? 'bg-blue-900/60 text-blue-300 border border-blue-700' : 'bg-cyan-900/60 text-cyan-300 border border-cyan-700'}`}>
                                    {ops.scaler_type}
                                  </span>
                                </td>
                                <td className="p-3 font-mono text-slate-300">{ops.outlier_percentage}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Categorical Pipeline Execution Details */}
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg space-y-4">
                      <h4 className="text-md font-semibold text-slate-200">Fitted Categorical Preprocessing Operations</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                          <thead>
                            <tr className="bg-slate-900 text-slate-400 border-b border-slate-700 uppercase text-xs">
                              <th className="p-3">Categorical Feature</th>
                              <th className="p-3">Train Cardinality</th>
                              <th className="p-3">Selected Encoder</th>
                              <th className="p-3">Strategy Details</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-700">
                            {Object.entries(preprocessingSession.metadata.categorical_operations).map(([col, ops], idx) => (
                              <tr key={idx} className="hover:bg-slate-700/30">
                                <td className="p-3 font-medium text-slate-200">{col}</td>
                                <td className="p-3 font-mono text-slate-300">{ops.cardinality} categories</td>
                                <td className="p-3">
                                  <span className={`px-2 py-0.5 rounded text-xs ${ops.encoder_type === 'OneHotEncoder' ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700' : 'bg-teal-900/60 text-teal-300 border border-teal-700'}`}>
                                    {ops.encoder_type}
                                  </span>
                                </td>
                                <td className="p-3 text-xs text-slate-400">
                                  {ops.encoder_type === 'OneHotEncoder' ? 'Cardinality <= 15: Full one-hot expansion' : 'Cardinality > 15: Safe Ordinal encoding with unknown=-1'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Transformed Output Preview */}
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="text-md font-semibold text-slate-200">Transformed Training Matrix Preview (5 Rows × {preprocessingSession.features_summary.transformed_feature_count} Features)</h4>
                        <span className="text-xs bg-slate-900 px-2 py-1 rounded text-emerald-400 border border-slate-700">ML-Ready</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-900 text-slate-400 border-b border-slate-700 uppercase">
                              <th className="p-2">#</th>
                              {preprocessingSession.feature_names.slice(0, 10).map((name, idx) => (
                                <th key={idx} className="p-2 whitespace-nowrap">{name}</th>
                              ))}
                              {preprocessingSession.feature_names.length > 10 && (
                                <th className="p-2 text-slate-500 italic">+{preprocessingSession.feature_names.length - 10} more cols</th>
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-700">
                            {preprocessingSession.preview.map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-slate-700/30 font-mono">
                                <td className="p-2 text-slate-500">{rIdx + 1}</td>
                                {preprocessingSession.feature_names.slice(0, 10).map((name, cIdx) => (
                                  <td key={cIdx} className="p-2 text-slate-300 whitespace-nowrap">{row[name] ?? '0.0'}</td>
                                ))}
                                {preprocessingSession.feature_names.length > 10 && (
                                  <td className="p-2 text-slate-500 italic">...</td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="p-8 bg-slate-800 rounded-xl border border-slate-700 text-center text-slate-400">
                    Click <strong>"Execute Preprocessing"</strong> above to run train/test split and fit the hybrid pipeline.
                  </div>
                )}
              </div>
            )}

            {/* TAB 7: ML Evaluation */}
            {activeTab === 'evaluation' && (
              <div className="space-y-6">
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg space-y-4">
                  <h3 className="text-lg font-semibold text-violet-300">ML Evaluation — Three Pipeline Comparison</h3>
                  <p className="text-sm text-slate-400">Runs Minimal, Fixed, and Hybrid pipelines on the same 80/20 stratified split (random_state=42). All fitting is strictly on training data.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Target Column</label>
                      <input type="text" value={evalTargetCol} onChange={e => setEvalTargetCol(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
                        placeholder="Late_delivery_risk" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Leakage Columns (comma-separated)</label>
                      <input type="text" value={evalLeakageCols} onChange={e => setEvalLeakageCols(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
                        placeholder="Delivery Status, Days for shipping (real), ..." />
                    </div>
                  </div>
                  <button onClick={runEvaluation} disabled={runningEval}
                    className="px-6 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors shadow-md">
                    {runningEval ? 'Running Pipelines...' : 'Run All 3 Pipelines'}
                  </button>
                  {evalError && (
                    <div className="p-3 bg-red-900/50 border border-red-700 text-red-200 rounded-lg text-sm">
                      <span className="font-semibold">Error:</span> {evalError}
                    </div>
                  )}
                </div>

                {evaluationResult && (() => {
                  const { results, split_info, paper_reference } = evaluationResult
                  const pipelines = ['minimal', 'fixed', 'hybrid']
                  const labels = { minimal: 'Minimal', fixed: 'Fixed', hybrid: 'Hybrid (Proposed)' }
                  const colors = { minimal: 'text-amber-400', fixed: 'text-sky-400', hybrid: 'text-violet-400' }
                  const bgColors = { minimal: 'bg-amber-900/20 border-amber-700/40', fixed: 'bg-sky-900/20 border-sky-700/40', hybrid: 'bg-violet-900/20 border-violet-700/40' }
                  const metricKeys = ['accuracy', 'precision', 'recall', 'f1', 'roc_auc']
                  const metricLabels = { accuracy: 'Accuracy', precision: 'Precision', recall: 'Recall', f1: 'F1', roc_auc: 'ROC-AUC' }
                  return (
                    <div className="space-y-6">
                      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                        <h4 className="text-sm font-semibold text-slate-300 mb-3">Dataset Split</h4>
                        <div className="flex flex-wrap gap-4 text-sm">
                          <span className="text-slate-400">Total: <b className="text-slate-200">{split_info.total_rows.toLocaleString()}</b></span>
                          <span className="text-slate-400">Train: <b className="text-emerald-400">{split_info.train_rows.toLocaleString()}</b></span>
                          <span className="text-slate-400">Test: <b className="text-sky-400">{split_info.test_rows.toLocaleString()}</b></span>
                          <span className="text-slate-400">Target: <b className="text-violet-300">{split_info.target_column}</b></span>
                          <span className="text-slate-400">Input features: <b className="text-slate-200">{split_info.original_feature_count}</b></span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {pipelines.map(p => {
                          const r = results[p]; const m = r.metrics
                          return (
                            <div key={p} className={`p-5 rounded-xl border ${bgColors[p]} space-y-3`}>
                              <h4 className={`font-semibold text-sm ${colors[p]}`}>{labels[p]}</h4>
                              <p className="text-xs text-slate-400 leading-relaxed">{r.description}</p>
                              <div className="grid grid-cols-2 gap-2">
                                {metricKeys.map(k => (
                                  <div key={k} className="bg-slate-900/60 p-2 rounded-lg text-center">
                                    <div className="text-xs text-slate-400">{metricLabels[k]}</div>
                                    <div className={`text-lg font-bold mt-0.5 ${colors[p]}`}>{m[k] != null ? m[k].toFixed(4) : 'N/A'}</div>
                                    {paper_reference[p] && paper_reference[p][k] != null && (
                                      <div className="text-xs text-slate-500 mt-0.5">paper: {paper_reference[p][k]}</div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
                        <h4 className="text-md font-semibold text-slate-200 mb-4">Metric Comparison Table</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left border-collapse">
                            <thead><tr className="bg-slate-900 text-slate-400 border-b border-slate-700">
                              <th className="p-3 font-semibold">Metric</th>
                              <th className="p-3 text-amber-400">Minimal</th>
                              <th className="p-3 text-sky-400">Fixed</th>
                              <th className="p-3 text-violet-400">Hybrid (Proposed)</th>
                            </tr></thead>
                            <tbody className="divide-y divide-slate-700">
                              {metricKeys.map(k => (
                                <tr key={k} className="hover:bg-slate-700/30">
                                  <td className="p-3 font-medium text-slate-300">{metricLabels[k]}</td>
                                  {pipelines.map(p => (
                                    <td key={p} className={`p-3 font-mono font-semibold ${colors[p]}`}>
                                      {results[p].metrics[k] != null ? results[p].metrics[k].toFixed(4) : 'N/A'}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
                        <h4 className="text-md font-semibold text-slate-200 mb-4">Feature Reduction Summary</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left border-collapse">
                            <thead><tr className="bg-slate-900 text-slate-400 border-b border-slate-700">
                              <th className="p-3">Pipeline</th><th className="p-3">Original</th>
                              <th className="p-3">Post-Preprocess</th><th className="p-3">Post-FE</th>
                              <th className="p-3 text-emerald-400">Final (Selected)</th>
                            </tr></thead>
                            <tbody className="divide-y divide-slate-700">
                              {pipelines.map(p => {
                                const fc = results[p].feature_counts
                                return (
                                  <tr key={p} className="hover:bg-slate-700/30">
                                    <td className={`p-3 font-semibold ${colors[p]}`}>{labels[p]}</td>
                                    <td className="p-3 text-slate-300 font-mono">{fc.original}</td>
                                    <td className="p-3 text-slate-300 font-mono">{fc.post_preprocessing}</td>
                                    <td className="p-3 text-slate-300 font-mono">{fc.post_feature_engineering}</td>
                                    <td className="p-3 font-mono font-bold text-emerald-400">{fc.final}</td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
                        <h4 className="text-md font-semibold text-slate-200 mb-4">Timing Breakdown (seconds)</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left border-collapse">
                            <thead><tr className="bg-slate-900 text-slate-400 border-b border-slate-700">
                              <th className="p-3">Stage</th>
                              {pipelines.map(p => <th key={p} className={`p-3 ${colors[p]}`}>{labels[p]}</th>)}
                            </tr></thead>
                            <tbody className="divide-y divide-slate-700">
                              {['preprocessing_sec','feature_engineering_sec','feature_selection_sec','model_training_sec','prediction_sec'].map(stage => (
                                <tr key={stage} className="hover:bg-slate-700/30">
                                  <td className="p-3 text-slate-300 capitalize">{stage.replace(/_sec$/,'').replace(/_/g,' ')}</td>
                                  {pipelines.map(p => (
                                    <td key={p} className="p-3 font-mono text-slate-400">{(results[p].timing[stage] ?? 0).toFixed(4)}s</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      {results.hybrid.feature_selection_report && (
                        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg space-y-4">
                          <h4 className="text-md font-semibold text-violet-300">Hybrid — Feature Selection Detail</h4>
                          <div className="flex flex-wrap gap-4 text-sm">
                            <span className="bg-slate-900 px-3 py-1 rounded-lg border border-slate-700">Variance removed: <b className="text-amber-400">{results.hybrid.feature_selection_report.removed_low_variance_count}</b></span>
                            <span className="bg-slate-900 px-3 py-1 rounded-lg border border-slate-700">Correlation removed: <b className="text-sky-400">{results.hybrid.feature_selection_report.removed_high_corr_count}</b></span>
                            <span className="bg-slate-900 px-3 py-1 rounded-lg border border-slate-700">Final selected: <b className="text-emerald-400">{results.hybrid.feature_selection_report.selected_count}</b></span>
                          </div>
                          {results.hybrid.feature_selection_report.removed_high_corr.length > 0 && (
                            <div>
                              <p className="text-xs text-slate-400 mb-2">High-correlation removals (|r| &gt; 0.95):</p>
                              <div className="space-y-1 max-h-48 overflow-y-auto">
                                {results.hybrid.feature_selection_report.removed_high_corr.slice(0,20).map((r,i) => (
                                  <div key={i} className="text-xs bg-slate-900 px-3 py-1.5 rounded border border-slate-700 text-slate-300">
                                    Removed <span className="text-red-400 font-mono">{r.removed_feature}</span> — kept <span className="text-emerald-400 font-mono">{r.kept_feature}</span> (r={r.correlation})
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {results.hybrid.feature_engineering_report && (
                        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg space-y-3">
                          <h4 className="text-md font-semibold text-violet-300">Hybrid — Feature Engineering</h4>
                          {results.hybrid.feature_engineering_report.accepted.map((f,i) => (
                            <div key={i} className="bg-slate-900 p-3 rounded-lg border border-emerald-700/40 text-sm">
                              <span className="text-emerald-400 font-semibold">{f.name}</span>
                              <span className="text-slate-400 ml-2">= {f.numerator_col} / {f.denominator_col}</span>
                              <span className="ml-2 text-xs text-emerald-600">✓ accepted</span>
                            </div>
                          ))}
                          {results.hybrid.feature_engineering_report.rejected.map((f,i) => (
                            <div key={i} className="bg-slate-900 p-3 rounded-lg border border-red-700/40 text-sm">
                              <span className="text-red-400 font-semibold">{f.name}</span>
                              <span className="text-slate-400 ml-2">Reason: {f.reason}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                        <h4 className="text-sm font-semibold text-slate-300 mb-3">Export Results</h4>
                        <div className="flex flex-wrap gap-3">
                          <button onClick={() => {
                            const blob = new Blob([JSON.stringify(evaluationResult, null, 2)], { type: 'application/json' })
                            const url = URL.createObjectURL(blob)
                            const a = document.createElement('a'); a.href = url; a.download = 'evaluation_results.json'; a.click(); URL.revokeObjectURL(url)
                          }} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded-lg border border-slate-600 transition-colors">
                            ↓ Export JSON
                          </button>
                          <button onClick={() => {
                            const rows = [
                              ['Pipeline','Accuracy','Precision','Recall','F1','ROC-AUC','Final Features'],
                              ...pipelines.map(p => [labels[p], results[p].metrics.accuracy, results[p].metrics.precision, results[p].metrics.recall, results[p].metrics.f1, results[p].metrics.roc_auc ?? 'N/A', results[p].feature_counts.final])
                            ]
                            const csv = rows.map(r => r.join(',')).join('\n')
                            const blob = new Blob([csv], { type: 'text/csv' })
                            const url = URL.createObjectURL(blob)
                            const a = document.createElement('a'); a.href = url; a.download = 'evaluation_metrics.csv'; a.click(); URL.revokeObjectURL(url)
                          }} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded-lg border border-slate-600 transition-colors">
                            ↓ Export CSV
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })()}
                {!evaluationResult && !runningEval && (
                  <div className="p-8 bg-slate-800 rounded-xl border border-slate-700 text-center text-slate-400">
                    Configure the target column above and click <strong>"Run All 3 Pipelines"</strong> to start the experiment.
                  </div>
                )}
              </div>
            )}

            {/* TAB 8: Leakage Review */}

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
