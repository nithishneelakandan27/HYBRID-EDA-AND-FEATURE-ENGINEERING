import React from 'react'
import PageContainer from '../components/layout/PageContainer'
import {
  UploadCloudIcon,
  DatabaseIcon,
  ShieldCheckIcon,
  CpuIcon,
  SlidersIcon,
  ZapIcon,
  GitBranchIcon,
  ActivityIcon,
  CheckCircleIcon,
  SparklesIcon
} from '../components/common/Icons'

export default function HowItWorks() {
  const steps = [
    {
      step: '01',
      title: 'Upload Your Data',
      icon: UploadCloudIcon,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50 border-indigo-100',
      what: 'You provide a raw tabular dataset in CSV format containing supply chain, order, customer, and shipping records.',
      why: 'Starting with raw, untampered data ensures an objective baseline and prevents accidental prior human biases from contaminating the analysis.'
    },
    {
      step: '02',
      title: 'Understand the Data',
      icon: DatabaseIcon,
      color: 'text-blue-600',
      bg: 'bg-blue-50 border-blue-100',
      what: 'The system scans every column, infers its data type (numerical vs. categorical vs. dates), computes cardinalities, and identifies the target variable.',
      why: 'Different data types require fundamentally different mathematical handling. An algorithm cannot perform calculations on text strings without prior profiling.'
    },
    {
      step: '03',
      title: 'Find Data Problems',
      icon: ShieldCheckIcon,
      color: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-100',
      what: 'The automated engine audits for missing fields, extreme outliers, asymmetric skewness, constant columns, and target leakage.',
      why: 'Poor data quality silently degrades machine learning algorithms. Missing values crash estimators, extreme outliers skew weights, and leakage causes illusory overconfidence.'
    },
    {
      step: '04',
      title: 'Make Intelligent Preprocessing Decisions',
      icon: CpuIcon,
      color: 'text-purple-600',
      bg: 'bg-purple-50 border-purple-100',
      what: 'Instead of applying one generic rule to all columns, the hybrid engine pairs domain rules with statistical thresholds (skewness, outliers, cardinality) to recommend personalized strategies for every feature.',
      why: 'This represents the core research contribution. Skewed features get median imputation and log transformations; high-outlier columns get RobustScaler; high-cardinality columns avoid dimensional explosion.'
    },
    {
      step: '05',
      title: 'Prepare the Data',
      icon: SlidersIcon,
      color: 'text-teal-600',
      bg: 'bg-teal-50 border-teal-100',
      what: 'The dataset is split into 80% training and 20% testing sets. All scalers and imputers are strictly learned from the training data before transforming test rows.',
      why: 'Computing mean, median, or scaling parameters on the entire dataset before splitting causes information leakage, invalidating academic research conclusions.'
    },
    {
      step: '06',
      title: 'Create Useful Features',
      icon: ZapIcon,
      color: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-100',
      what: 'The system constructs domain-specific interaction ratios, such as comparing profit margin relative to order revenue.',
      why: 'Raw numbers in isolation often miss context. Ratios provide normalized, scale-invariant signals that give machine learning models a clearer signal of operational delay risks.'
    },
    {
      step: '07',
      title: 'Select Important Features',
      icon: GitBranchIcon,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50 border-indigo-100',
      what: 'Features with near-zero variation or extreme multi-collinear duplication (|r| > 0.95) are automatically pruned.',
      why: 'Redundant features increase computational memory, slow down training, and cause numerical instability in regression solvers.'
    },
    {
      step: '08',
      title: 'Evaluate Machine Learning Performance',
      icon: ActivityIcon,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 border-emerald-100',
      what: 'The prepared dataset is tested alongside Minimal and Fixed baseline pipelines using identical holdout data to measure Accuracy, Precision, Recall, and F1.',
      why: 'Fair benchmarking proves whether the hybrid preprocessing decisions genuinely improved model precision, prevented overfitting, and reduced runtime.'
    }
  ]

  return (
    <PageContainer>
      {/* Header Introduction */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm text-center max-w-3xl mx-auto space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center mx-auto">
          <SparklesIcon className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          How the Hybrid System Works
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto leading-relaxed">
          An end-to-end walkthrough designed for project presentation, academic defense, and non-technical stakeholders.
        </p>
      </div>

      {/* 8-Step Timeline */}
      <div className="space-y-4 max-w-3xl mx-auto">
        {steps.map((s, idx) => {
          const Icon = s.icon
          return (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:border-indigo-200 transition-all duration-150 flex flex-col sm:flex-row items-start gap-5"
            >
              <div
                className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${s.bg} ${s.color}`}
              >
                <Icon className="w-6 h-6" />
              </div>

              <div className="flex-1 min-w-0 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-slate-400">
                    Step {s.step}
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    {s.title}
                  </h3>
                </div>

                <div className="space-y-2 text-xs leading-relaxed">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                    <span className="font-bold text-slate-800">What happens: </span>
                    <span className="text-slate-600">{s.what}</span>
                  </div>

                  <div className="bg-indigo-50/40 p-3 rounded-xl border border-indigo-100/60">
                    <span className="font-bold text-indigo-900">Why it matters: </span>
                    <span className="text-indigo-800">{s.why}</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </PageContainer>
  )
}
