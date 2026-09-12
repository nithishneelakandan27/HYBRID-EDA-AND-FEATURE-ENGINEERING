import React from 'react'
import { useApp } from '../../context/AppContext'
import {
  MenuIcon,
  DatabaseIcon,
  UploadCloudIcon,
  RefreshCwIcon
} from '../common/Icons'

export default function Header() {
  const {
    currentRoute,
    navigateTo,
    sidebarCollapsed,
    setSidebarCollapsed,
    setMobileSidebarOpen,
    backendStatus,
    datasetResult,
    file,
    checkHealth,
    resetDataset
  } = useApp()

  // Map route to human-friendly titles & subtitles
  const routeMeta = {
    '/dashboard': {
      title: 'Dataset Dashboard',
      subtitle: "Here's what we discovered about your data."
    },
    '/upload': {
      title: 'Data Ingestion & Profiling',
      subtitle: 'Upload a CSV dataset to initiate automated profiling and analysis.'
    },
    '/overview': {
      title: 'Understand Your Data',
      subtitle: 'See what each column represents and how your dataset is structured.'
    },
    '/quality': {
      title: 'Data Quality',
      subtitle: 'Find problems that could affect your machine-learning results.'
    },
    '/decisions': {
      title: 'Smart Decisions',
      subtitle: 'The system combines expert rules with statistical evidence to choose the best preprocessing method.'
    },
    '/preparation': {
      title: 'Prepare the Dataset',
      subtitle: 'Apply recommended transformations and create an ML-ready dataset with zero data leakage.'
    },
    '/feature-engineering': {
      title: 'Create Better Features',
      subtitle: 'Transform existing information into useful signals that help predict late deliveries.'
    },
    '/feature-selection': {
      title: 'Find the Most Useful Features',
      subtitle: 'Filter low variance and multi-collinear features to retain only high-impact signals.'
    },
    '/evaluation': {
      title: 'Model Results',
      subtitle: 'See how well the prepared dataset predicts late delivery risks across 3 benchmark pipelines.'
    },
    '/how-it-works': {
      title: 'How the System Works',
      subtitle: 'Plain English walkthrough of the automated hybrid pipeline from raw data to ML evaluation.'
    },
    '/about': {
      title: 'About the Project',
      subtitle: 'Academic research context, DataCo Smart Supply Chain background, and system architecture.'
    }
  }

  const meta = routeMeta[currentRoute] || {
    title: 'Hybrid EDA & Feature Intelligence',
    subtitle: 'Automated Supply Chain Preprocessing & ML Evaluation'
  }

  const toggleSidebar = () => {
    // On mobile, toggle drawer; on desktop, toggle collapsed state
    if (window.innerWidth < 1024) {
      setMobileSidebarOpen(true)
    } else {
      setSidebarCollapsed(!sidebarCollapsed)
    }
  }

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 py-3 transition-all">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Hamburger & Dynamic Page Header */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <button
            onClick={toggleSidebar}
            aria-label="Toggle navigation menu"
            className="p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0"
          >
            <MenuIcon className="w-5 h-5" />
          </button>

          <div className="flex flex-col truncate">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate tracking-tight">
              {meta.title}
            </h1>
            <p className="text-xs text-slate-500 truncate hidden sm:block">
              {meta.subtitle}
            </p>
          </div>
        </div>

        {/* Right: Dataset Name Badge & Backend Health Indicator */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Dataset Status Pill */}
          {datasetResult ? (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs text-slate-700 max-w-[200px] sm:max-w-xs truncate shadow-2xs">
              <DatabaseIcon className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="font-semibold truncate">
                {datasetResult.filename || file?.name || 'Dataset Active'}
              </span>
              <span className="text-[11px] text-slate-400 font-mono hidden md:inline shrink-0">
                ({datasetResult.summary.num_rows.toLocaleString()} rows)
              </span>
              <button
                onClick={resetDataset}
                title="Upload a different dataset"
                className="text-slate-400 hover:text-indigo-600 p-0.5 ml-1 transition-colors cursor-pointer"
              >
                <RefreshCwIcon className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigateTo('/upload')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              <UploadCloudIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Upload a dataset to begin</span>
              <span className="sm:hidden">Upload</span>
            </button>
          )}

          {/* Backend Online Pill */}
          <button
            onClick={checkHealth}
            title="Click to check backend connectivity"
            className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs text-slate-700 hover:border-slate-300 transition-colors cursor-pointer shadow-2xs"
          >
            <span className="relative flex h-2 w-2 shrink-0">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  backendStatus === 'connected' ? 'bg-emerald-400' : 'bg-red-400'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  backendStatus === 'connected' ? 'bg-emerald-500' : 'bg-red-500'
                }`}
              />
            </span>
            <span className="font-medium hidden sm:inline">
              {backendStatus === 'connected' ? 'Online' : 'Offline'}
            </span>
          </button>
        </div>
      </div>
    </header>
  )
}
