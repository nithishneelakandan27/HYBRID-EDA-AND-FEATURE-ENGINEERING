import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AppContext = createContext(null)

export const API_BASE = import.meta.env.VITE_API_BASE_URL || (
  typeof window !== 'undefined' && window.location.port === '5173'
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : ''
)

export function AppProvider({ children }) {
  // Backend connection status
  const [health, setHealth] = useState(null)
  const [backendStatus, setBackendStatus] = useState('checking') // 'checking' | 'connected' | 'error'

  // Navigation & Routing state
  const getInitialRoute = () => {
    const path = window.location.pathname
    const validRoutes = [
      '/dashboard',
      '/upload',
      '/overview',
      '/quality',
      '/decisions',
      '/preparation',
      '/feature-engineering',
      '/feature-selection',
      '/evaluation',
      '/modeling',
      '/how-it-works',
      '/about'
    ]
    return validRoutes.includes(path) ? path : '/upload'
  }

  const [currentRoute, setCurrentRoute] = useState(getInitialRoute)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  // Listen to browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname
      const validRoutes = [
        '/dashboard',
        '/upload',
        '/overview',
        '/quality',
        '/decisions',
        '/preparation',
        '/feature-engineering',
        '/feature-selection',
        '/evaluation',
        '/modeling',
        '/how-it-works',
        '/about'
      ]
      if (validRoutes.includes(path)) {
        setCurrentRoute(path)
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigateTo = useCallback((route) => {
    setCurrentRoute(route)
    setMobileSidebarOpen(false)
    if (window.location.pathname !== route) {
      window.history.pushState({}, '', route)
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // Dataset & Results state
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [uploadStep, setUploadStep] = useState(0) // 0=idle, 1=uploading, 2=profiling, 3=running eda, 4=generating decisions

  const [datasetResult, setDatasetResult] = useState(null)
  const [edaResult, setEdaResult] = useState(null)
  const [decisionPlan, setDecisionPlan] = useState(null)
  const [preprocessingSession, setPreprocessingSession] = useState(null)
  const [preprocessingComparison, setPreprocessingComparison] = useState(null)
  const [evaluationResult, setEvaluationResult] = useState(null)

  // Sub-task loading & error states
  const [loadingEda, setLoadingEda] = useState(false)
  const [loadingDecision, setLoadingDecision] = useState(false)
  const [executingPrep, setExecutingPrep] = useState(false)
  const [downloadingCleaned, setDownloadingCleaned] = useState(false)
  const [prepError, setPrepError] = useState(null)
  const [runningEval, setRunningEval] = useState(false)
  const [evalError, setEvalError] = useState(null)
  const [evalSecondsElapsed, setEvalSecondsElapsed] = useState(0)

  // Preprocessing config state
  const [testSize, setTestSize] = useState(0.20)
  const [randomState, setRandomState] = useState(42)

  // Evaluation config state
  const [evalTargetCol, setEvalTargetCol] = useState(null)
  const [evalLeakageCols, setEvalLeakageCols] = useState(
    'Delivery Status,Days for shipping (real),shipping date (DateOrders),Product Description,Order Zipcode'
  )
  const [autoConfig, setAutoConfig] = useState(null)

  // ── Phase II: ML Modeling state ──────────────────────────────────────
  const [modelingTargetCol, setModelingTargetCol] = useState(null)
  const [modelingDomainProfile, setModelingDomainProfile] = useState(null)
  // modelingResults: { [model_type]: result_dict }
  const [modelingResults, setModelingResults] = useState({})
  // trainingModels: Set of model_type strings currently training
  const [trainingModels, setTrainingModels] = useState(new Set())
  // modelingErrors: { [model_type]: error message }
  const [modelingErrors, setModelingErrors] = useState({})
  // modelConfig: catalog & dataset info from /api/modeling/config
  const [modelConfig, setModelConfig] = useState(null)
  // predictionResult: last single-record prediction response
  const [predictionResult, setPredictionResult] = useState(null)
  const [predictingModel, setPredictingModel] = useState(null)

  const checkHealth = useCallback(() => {
    fetch(`${API_BASE}/api/health`)
      .then(res => {
        if (!res.ok) throw new Error('Status not ok')
        return res.json()
      })
      .then(data => {
        setHealth(data)
        setBackendStatus('connected')
      })
      .catch(() => {
        setBackendStatus('error')
      })
  }, [])

  useEffect(() => {
    checkHealth()
    const timer = setInterval(checkHealth, 4000)
    return () => clearInterval(timer)
  }, [checkHealth])

  // Timer for evaluation run
  useEffect(() => {
    let interval = null
    if (runningEval) {
      setEvalSecondsElapsed(0)
      interval = setInterval(() => {
        setEvalSecondsElapsed(s => Math.round((s + 0.1) * 10) / 10)
      }, 100)
    } else {
      clearInterval(interval)
    }
    return () => clearInterval(interval)
  }, [runningEval])

  // API Call: Fetch EDA Analysis
  const fetchEdaAnalysis = useCallback(async () => {
    setLoadingEda(true)
    try {
      const res = await fetch(`${API_BASE}/api/eda/analysis`)
      if (res.ok) {
        const data = await res.json()
        setEdaResult(data.eda)
        return data.eda
      }
    } catch (err) {
      console.error('Failed to fetch EDA analysis:', err)
    } finally {
      setLoadingEda(false)
    }
  }, [])

  // API Call: Fetch Hybrid Decision Plan
  const fetchDecisionPlan = useCallback(async () => {
    setLoadingDecision(true)
    try {
      const res = await fetch(`${API_BASE}/api/decision/plan`)
      if (res.ok) {
        const data = await res.json()
        setDecisionPlan(data.decision_plan)
        return data.decision_plan
      }
    } catch (err) {
      console.error('Failed to fetch decision plan:', err)
    } finally {
      setLoadingDecision(false)
    }
  }, [])

  // API Call: Ingest Dataset & Kick off Pipeline
  const uploadAndAnalyze = useCallback(async (fileToUpload) => {
    const targetFile = fileToUpload || file
    if (!targetFile) {
      setUploadError('Please select a CSV file first.')
      return
    }

    setUploading(true)
    setUploadError(null)
    setUploadStep(1)
    setPreprocessingSession(null)
    setEvaluationResult(null)

    const formData = new FormData()
    formData.append('file', targetFile)

    try {
      setUploadStep(2) // Profiling dataset
      const response = await fetch(`${API_BASE}/api/datasets/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.detail || `Upload failed (status ${response.status}): ${response.statusText || 'Server error'}`)
      }

      const data = await response.json()
      setDatasetResult(data)
      setFile(targetFile)

      if (data.auto_config) {
        setAutoConfig(data.auto_config)
        let tgt = data.auto_config.target?.column || data.auto_config.target?.detected_column || null
        const cols = data.columns || []
        const lateRiskCol = cols.find(c => {
          const name = typeof c === 'string' ? c : (c.name || '')
          return name.trim().toLowerCase() === 'late_delivery_risk'
        })
        if (lateRiskCol) {
          tgt = typeof lateRiskCol === 'string' ? lateRiskCol : lateRiskCol.name
        }
        if (tgt) {
          setEvalTargetCol(tgt)
          setModelingTargetCol(tgt)
        }
        if (data.auto_config.leakage_column_names && data.auto_config.leakage_column_names.length > 0) {
          setEvalLeakageCols(data.auto_config.leakage_column_names.join(', '))
        }
      }

      // Step 3 & 4: Fetch Automated EDA & Decision Plan concurrently
      setUploadStep(3)
      await Promise.all([
        fetchEdaAnalysis(),
        fetchDecisionPlan()
      ])

      setUploadStep(4)
      // Navigate to Dashboard after successful ingestion & profiling
      navigateTo('/dashboard')
    } catch (err) {
      setUploadError(err.message || 'An unexpected error occurred during upload.')
    } finally {
      setUploading(false)
      setUploadStep(0)
    }
  }, [file, fetchEdaAnalysis, fetchDecisionPlan, navigateTo])

  // API Call: Execute Preprocessing Pipeline
  const executePreprocessing = useCallback(async () => {
    setExecutingPrep(true)
    setPrepError(null)
    try {
      const res = await fetch(`${API_BASE}/api/preprocessing/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test_size: parseFloat(testSize),
          random_state: parseInt(randomState)
        })
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.detail || 'Failed to execute preprocessing.')
      }

      const data = await res.json()
      setPreprocessingSession(data)
      if (data.comparison) {
        setPreprocessingComparison(data.comparison)
      }
      return data
    } catch (err) {
      setPrepError(err.message || 'Preprocessing execution failed.')
      throw err
    } finally {
      setExecutingPrep(false)
    }
  }, [testSize, randomState])

  const fetchPreprocessingComparison = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/preprocessing/comparison`)
      if (res.ok) {
        const data = await res.json()
        if (data.has_preprocessed && data.comparison) {
          setPreprocessingComparison(data.comparison)
          return data.comparison
        }
      }
    } catch (err) {
      console.error('Failed to fetch preprocessing comparison:', err)
    }
    return null
  }, [])

  const downloadCleanedDataset = useCallback(async () => {
    setDownloadingCleaned(true)
    try {
      const res = await fetch(`${API_BASE}/api/preprocessing/export-cleaned`)
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.detail || 'Failed to download cleaned dataset.')
      }
      const blob = await res.blob()
      const contentDisposition = res.headers.get('content-disposition')
      let filename = 'cleaned_dataset.csv'
      if (contentDisposition) {
        const match = contentDisposition.match(/filename=["']?([^"';]+)["']?/)
        if (match && match[1]) {
          filename = match[1]
        }
      }
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      throw err
    } finally {
      setDownloadingCleaned(false)
    }
  }, [])

  // API Call: Run All 3 Evaluation Pipelines
  const runEvaluation = useCallback(async () => {
    setRunningEval(true)
    setEvalError(null)
    setEvaluationResult(null)
    try {
      const leakageList = evalLeakageCols
        ? evalLeakageCols.split(',').map(s => s.trim()).filter(Boolean)
        : null

      const res = await fetch(`${API_BASE}/api/evaluation/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_column: evalTargetCol ? evalTargetCol.trim() : null,
          leakage_columns: leakageList && leakageList.length > 0 ? leakageList : null,
          use_dataco_defaults: false,
          test_size: parseFloat(testSize) || 0.20,
          random_state: parseInt(randomState) || 42
        })
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.detail || 'Evaluation failed.')
      }

      const data = await res.json()
      setEvaluationResult(data)
      return data
    } catch (err) {
      setEvalError(err.message || 'Evaluation run failed.')
      throw err
    } finally {
      setRunningEval(false)
    }
  }, [evalTargetCol, evalLeakageCols, testSize, randomState])

  const fetchEvaluationSession = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/evaluation/session`)
      if (res.ok) {
        const data = await res.json()
        setEvaluationResult(data)
        return data
      }
    } catch (err) {
      // Session not available yet
    }
    return null
  }, [])

  // ── Phase II: ML Modeling API calls ─────────────────────────────────

  const fetchModelConfig = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/modeling/config`)
      if (res.ok) {
        const data = await res.json()
        setModelConfig(data)
        return data
      }
    } catch (err) {
      console.error('Failed to fetch model config:', err)
    }
  }, [])

  const trainModel = useCallback(async (modelType, options = {}) => {
    setTrainingModels(prev => new Set([...prev, modelType]))
    setModelingErrors(prev => ({ ...prev, [modelType]: null }))
    try {
      const res = await fetch(`${API_BASE}/api/modeling/train`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_type: modelType,
          target_column: options.target_column ?? modelingTargetCol ?? undefined,
          domain_profile: options.domain_profile ?? modelingDomainProfile ?? undefined,
          test_size: options.testSize ?? 0.20,
          random_state: options.randomState ?? 42,
          class_weight: options.classWeight ?? 'balanced',
          ...options,
        }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.detail || `Training failed for ${modelType}.`)
      }
      const data = await res.json()
      setModelingResults(prev => ({ ...prev, [modelType]: data }))
      // Refresh config to update status badges
      fetchModelConfig()
      return data
    } catch (err) {
      const msg = err.message || `Training failed for ${modelType}.`
      setModelingErrors(prev => ({ ...prev, [modelType]: msg }))
      throw err
    } finally {
      setTrainingModels(prev => {
        const next = new Set(prev)
        next.delete(modelType)
        return next
      })
    }
  }, [fetchModelConfig])

  const predictSingleRecord = useCallback(async (modelType, record = null, sampleIndex = null) => {
    setPredictingModel(modelType)
    setPredictionResult(null)
    try {
      const body = {}
      if (record !== null) body.record = record
      if (sampleIndex !== null) body.sample_index = sampleIndex
      const res = await fetch(`${API_BASE}/api/modeling/predict/${modelType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.detail || 'Prediction failed.')
      }
      const data = await res.json()
      setPredictionResult(data)
      return data
    } catch (err) {
      console.error('Prediction error:', err)
      throw err
    } finally {
      setPredictingModel(null)
    }
  }, [])

  // Reset all state for a new dataset
  const resetDataset = useCallback(() => {
    setFile(null)
    setDatasetResult(null)
    setEdaResult(null)
    setDecisionPlan(null)
    setPreprocessingSession(null)
    setPreprocessingComparison(null)
    setEvaluationResult(null)
    setUploadError(null)
    setPrepError(null)
    setEvalError(null)
    // Reset Phase II
    setModelingResults({})
    setModelingErrors({})
    setModelConfig(null)
    setPredictionResult(null)
    navigateTo('/upload')
  }, [navigateTo])

  const value = {
    // Backend health
    health,
    backendStatus,
    checkHealth,

    // Navigation & layout
    currentRoute,
    navigateTo,
    sidebarCollapsed,
    setSidebarCollapsed,
    mobileSidebarOpen,
    setMobileSidebarOpen,

    // State data
    file,
    setFile,
    datasetResult,
    edaResult,
    decisionPlan,
    preprocessingSession,
    preprocessingComparison,
    setPreprocessingComparison,
    evaluationResult,
    autoConfig,

    // Loading & progress
    uploading,
    uploadStep,
    uploadError,
    setUploadError,
    loadingEda,
    loadingDecision,
    executingPrep,
    downloadingCleaned,
    prepError,
    runningEval,
    evalError,
    evalSecondsElapsed,

    // Configuration
    testSize,
    setTestSize,
    randomState,
    setRandomState,
    evalTargetCol,
    setEvalTargetCol,
    evalLeakageCols,
    setEvalLeakageCols,

    // Actions (Phase I)
    uploadAndAnalyze,
    fetchEdaAnalysis,
    fetchDecisionPlan,
    executePreprocessing,
    fetchPreprocessingComparison,
    downloadCleanedDataset,
    runEvaluation,
    fetchEvaluationSession,
    setEvaluationResult,
    resetDataset,

    // Phase II: ML Modeling
    modelingTargetCol,
    setModelingTargetCol,
    modelingDomainProfile,
    setModelingDomainProfile,
    modelingResults,
    trainingModels,
    modelingErrors,
    modelConfig,
    predictionResult,
    predictingModel,
    fetchModelConfig,
    trainModel,
    predictSingleRecord,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}
