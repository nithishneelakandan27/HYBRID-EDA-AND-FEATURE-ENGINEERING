import React from 'react'
import PageContainer from '../components/layout/PageContainer'
import {
  InfoIcon,
  DatabaseIcon,
  CpuIcon,
  ShieldCheckIcon,
  LayersIcon,
  SparklesIcon
} from '../components/common/Icons'

export default function About() {
  return (
    <PageContainer>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Project Header Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 sm:p-10 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider">
            <SparklesIcon className="w-4 h-4" />
            <span>Academic Research Project</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Hybrid Rule-Based and Statistical Framework for Automated EDA and Feature Engineering in Supply Chain Preprocessing
          </h2>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            This application implements an end-to-end, zero-configuration intelligent data preprocessing pipeline tailored for complex tabular supply chain records. By synergizing deterministic domain rules with live statistical distributions, the framework eliminates heuristic guesswork while ensuring rigorous prevention of data leakage.
          </p>

          <div className="flex flex-wrap gap-2 pt-2">
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold border border-indigo-100">
              Supply Chain Analytics
            </span>
            <span className="px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-xs font-semibold border border-teal-100">
              Automated Exploratory Data Analysis
            </span>
            <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-semibold border border-purple-100">
              Hybrid Decision Synthesis
            </span>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold border border-emerald-100">
              Zero Data Leakage Pipeline
            </span>
          </div>
        </div>

        {/* Dataset Information Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-indigo-600">
            <DatabaseIcon className="w-5 h-5" />
            <h3 className="text-base font-bold text-slate-900">
              Reference Benchmark: DataCo Smart Supply Chain Dataset
            </h3>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            The framework was developed and empirically benchmarked using the public DataCo Smart Supply Chain dataset, consisting of <strong>180,519 records</strong> and <strong>53 attributes</strong> covering transactions, customer demographics, orders, shipping modes, and delivery statuses.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70">
              <span className="font-bold text-slate-800 block">Target Variable</span>
              <span className="text-slate-500 font-mono mt-1 block">Late_delivery_risk (Binary)</span>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70">
              <span className="font-bold text-slate-800 block">Dimensions</span>
              <span className="text-slate-500 font-mono mt-1 block">180,519 rows &times; 53 columns</span>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70">
              <span className="font-bold text-slate-800 block">Class Distribution</span>
              <span className="text-slate-500 font-mono mt-1 block">~57.3% Late / ~42.7% On-Time</span>
            </div>
          </div>
        </div>

        {/* Core Research Contributions */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900">
            Core Research Innovations
          </h3>

          <div className="space-y-3 text-xs text-slate-600">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 font-bold font-mono text-xs">
                1
              </span>
              <div>
                <strong className="text-slate-900 block mb-0.5">Skew-Aware Imputation &amp; Transformation</strong>
                Normal numerical columns receive Mean imputation and StandardScaler; skewed distributions (|&gamma;| &gt; 1) automatically transition to Median imputation and log1p transformation.
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 font-bold font-mono text-xs">
                2
              </span>
              <div>
                <strong className="text-slate-900 block mb-0.5">Outlier-Aware Scaling</strong>
                Columns with high outlier contamination (&gt; 2%) employ RobustScaler (IQR-based) rather than StandardScaler to insulate against weight degradation.
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 font-bold font-mono text-xs">
                3
              </span>
              <div>
                <strong className="text-slate-900 block mb-0.5">Cardinality-Bound Encoding</strong>
                Low-cardinality categorical variables (&le; 15) are expanded into full One-Hot encodings; high-cardinality features (&gt; 15) use compact Ordinal encoding with out-of-vocabulary safeguards.
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold font-mono text-xs">
                4
              </span>
              <div>
                <strong className="text-slate-900 block mb-0.5">Automated Leakage &amp; Multi-Collinearity Defense</strong>
                Post-event shipment tracking attributes are automatically isolated, while pairwise Pearson filtering (|r| &gt; 0.95) eliminates collinear feature inflation.
              </div>
            </div>
          </div>
        </div>

        {/* Technology Stack Specifications */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900">
            Technology Stack &amp; Architecture
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1">
              <span className="font-bold text-slate-800 block">Backend Server</span>
              <p className="text-slate-600">FastAPI, Uvicorn, Python 3.10+, Pydantic V2</p>
              <p className="text-slate-500 text-[11px]">Asynchronous API routing with threadpool execution</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1">
              <span className="font-bold text-slate-800 block">Machine Learning Engine</span>
              <p className="text-slate-600">Scikit-Learn, Pandas, NumPy, SciPy</p>
              <p className="text-slate-500 text-[11px]">Strict train/test fitting discipline, L-BFGS solver</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1">
              <span className="font-bold text-slate-800 block">Frontend Application</span>
              <p className="text-slate-600">React 18, Vite 5, Tailwind CSS 3.4</p>
              <p className="text-slate-500 text-[11px]">Modern enterprise analytics UI with client-side routing</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1">
              <span className="font-bold text-slate-800 block">Testing &amp; Verification</span>
              <p className="text-slate-600">Pytest, Automated Unit &amp; Integration Suites</p>
              <p className="text-slate-500 text-[11px]">Invariant matrix shape and non-NaN numerical checks</p>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
