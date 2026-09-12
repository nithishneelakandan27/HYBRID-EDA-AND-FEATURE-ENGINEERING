import React, { useState, useRef } from 'react'
import { useApp } from '../context/AppContext'
import PageContainer from '../components/layout/PageContainer'
import {
  UploadCloudIcon,
  CheckCircleIcon,
  DatabaseIcon,
  ArrowRightIcon,
  AlertTriangleIcon,
  SparklesIcon,
  ClockIcon,
  ShieldCheckIcon
} from '../components/common/Icons'
import LoadingState from '../components/common/LoadingState'

export default function Upload() {
  const {
    file,
    setFile,
    uploading,
    uploadStep,
    uploadError,
    setUploadError,
    uploadAndAnalyze,
    datasetResult,
    navigateTo
  } = useApp()

  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  const handleFile = (selectedFile) => {
    if (!selectedFile) return
    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      setUploadError('Invalid file type. Please upload a standard CSV file (.csv).')
      return
    }
    setFile(selectedFile)
    setUploadError(null)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleAnalyze = () => {
    if (!file) {
      setUploadError('Please choose a CSV file first.')
      return
    }
    uploadAndAnalyze(file)
  }

  const stepLabels = [
    { label: 'Reading and validating CSV structure', status: uploadStep >= 1 ? (uploadStep > 1 ? 'completed' : 'active') : 'pending' },
    { label: 'Computing statistical column distributions', status: uploadStep >= 2 ? (uploadStep > 2 ? 'completed' : 'active') : 'pending' },
    { label: 'Running automated EDA & leakage detection', status: uploadStep >= 3 ? (uploadStep > 3 ? 'completed' : 'active') : 'pending' },
    { label: 'Synthesizing hybrid preprocessing recommendations', status: uploadStep >= 4 ? (uploadStep > 4 ? 'completed' : 'active') : 'pending' }
  ]

  return (
    <PageContainer>
      {/* If currently uploading/analyzing, show step-by-step loading state */}
      {uploading ? (
        <LoadingState
          title="Ingesting & Analyzing Dataset..."
          subtitle="Running end-to-end dataset profiling, outlier detection, and hybrid rule generation."
          steps={stepLabels}
        />
      ) : (
        <div className="space-y-8 max-w-4xl mx-auto">
          {/* Main Upload Card */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-8 sm:p-12 shadow-sm text-center relative overflow-hidden">
            {/* Background Decorative Accent */}
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-indigo-50/50 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-teal-50/50 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center mx-auto mb-5 shadow-xs">
                <UploadCloudIcon className="w-8 h-8" />
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Upload your dataset
              </h2>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Start by uploading a CSV file. We'll automatically understand its schema, detect data quality issues, and synthesize intelligent preprocessing rules.
              </p>

              {/* Drag and Drop Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`mt-8 border-2 border-dashed rounded-2xl p-8 transition-all duration-200 cursor-pointer flex flex-col items-center justify-center ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-50/50'
                    : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-white'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={(e) => e.target.files && handleFile(e.target.files[0])}
                  className="hidden"
                />

                <UploadCloudIcon className={`w-8 h-8 mb-3 transition-colors ${isDragging ? 'text-indigo-600' : 'text-slate-400'}`} />
                <div className="text-sm font-semibold text-slate-800">
                  Click to browse or drag and drop your file here
                </div>
                <div className="text-xs text-slate-400 mt-1 font-mono">
                  Supported format: CSV (.csv)
                </div>
              </div>

              {/* Selected File Card */}
              {file && (
                <div className="mt-6 p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 text-left flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 shadow-2xs">
                      <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 truncate max-w-xs">
                        {file.name}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB • text/csv
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAnalyze}
                    className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  >
                    <SparklesIcon className="w-4 h-4" />
                    <span>Analyze Dataset</span>
                    <ArrowRightIcon className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Upload Error Banner */}
              {uploadError && (
                <div className="mt-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-left flex items-start gap-3">
                  <AlertTriangleIcon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-rose-900">Upload / Validation Error</div>
                    <div className="text-xs text-rose-700 mt-0.5 leading-relaxed">{uploadError}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* HOW IT WORKS 3-STEP SECTION */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center">
              HOW IT WORKS
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100">
                    01 Upload
                  </span>
                  <h4 className="text-base font-bold text-slate-900 mt-3">Choose your CSV dataset</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Provide raw supply chain records with transactional, shipping, customer, and financial columns.
                  </p>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 text-[11px] text-slate-400 font-medium">
                  Validated against schema standards
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-xs font-mono font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded-md border border-teal-100">
                    02 Analyze
                  </span>
                  <h4 className="text-base font-bold text-slate-900 mt-3">Automated quality check</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    The engine automatically detects missingness, skewness, outliers, target candidates, and data leakage.
                  </p>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 text-[11px] text-slate-400 font-medium">
                  Deep statistical profiling
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                    03 Prepare
                  </span>
                  <h4 className="text-base font-bold text-slate-900 mt-3">Smart hybrid decisions</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Expert domain rules pair with statistical metrics to recommend optimal imputation, scaling, and encoding.
                  </p>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 text-[11px] text-slate-400 font-medium">
                  Guaranteed zero data leakage
                </div>
              </div>
            </div>
          </div>

          {/* Active Dataset Quick Jump (if dataset is already in memory) */}
          {datasetResult && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
                <div className="text-xs text-emerald-950">
                  Dataset <span className="font-bold">{datasetResult.filename}</span> is already active ({datasetResult.summary.num_rows.toLocaleString()} rows).
                </div>
              </div>
              <button
                onClick={() => navigateTo('/dashboard')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
              >
                <span>Go to Dashboard</span>
                <ArrowRightIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </PageContainer>
  )
}
