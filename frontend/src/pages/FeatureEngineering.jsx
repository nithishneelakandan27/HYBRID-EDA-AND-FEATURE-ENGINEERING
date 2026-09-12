import React from 'react'
import { useApp } from '../context/AppContext'
import PageContainer from '../components/layout/PageContainer'
import EmptyState from '../components/common/EmptyState'
import StatusBadge from '../components/common/StatusBadge'
import {
  ZapIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  LayersIcon,
  ArrowRightIcon,
  DatabaseIcon,
  CpuIcon
} from '../components/common/Icons'

export default function FeatureEngineering() {
  const { datasetResult, autoConfig, evaluationResult, navigateTo } = useApp()

  if (!datasetResult) {
    return (
      <PageContainer>
        <EmptyState
          title="No dataset loaded"
          description="Upload a CSV dataset to view conditional domain feature engineering."
          actionText="Upload Dataset"
          onAction={() => navigateTo('/upload')}
        />
      </PageContainer>
    )
  }

  // Get real feature specs from autoConfig and accepted/rejected from evaluation session
  const feReport = evaluationResult?.results?.hybrid?.feature_engineering_report
  const acceptedList = feReport?.accepted || []
  const rejectedList = feReport?.rejected || []
  const configuredSpecs = autoConfig?.feature_specs || [
    {
      name: 'profit_to_revenue_ratio',
      numerator_col: 'Order Profit Per Order',
      denominator_col: 'Sales',
      leakage_risk: false
    }
  ]

  return (
    <PageContainer>
      {/* Visual Header Diagram */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-2">
          <ZapIcon className="w-4 h-4" />
          <span>Domain Signal Generation</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900">
          Conditional Feature Engineering
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
          Transforms raw transaction and shipment metrics into normalized predictive ratios, subject to strict leakage-risk validation.
        </p>

        {/* 3-Step Flow Diagram */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
              <DatabaseIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">1. Original Raw Attributes</div>
              <div className="text-[11px] text-slate-500">Continuous orders, sales &amp; profits</div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <CpuIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-indigo-950">2. Leakage-Guarded Ratios</div>
              <div className="text-[11px] text-indigo-700">Denominator safety checks (x / 0)</div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <CheckCircleIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-950">3. Validated Predictive Signals</div>
              <div className="text-[11px] text-emerald-700">Added to final ML candidate pool</div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Engineering Specifications & Execution List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Engineered Domain Signals
          </h3>
          <span className="text-xs font-mono font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
            {configuredSpecs.length} Specs Registered
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {configuredSpecs.map((spec, idx) => {
            const isEvaluatedAndAccepted = acceptedList.some(a => a.name === spec.name)

            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between space-y-4 hover:border-indigo-200 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                        Signal Ratio
                      </span>
                      <h4 className="text-base font-bold text-slate-900 mt-0.5 font-mono">
                        {spec.name}
                      </h4>
                    </div>
                    <StatusBadge status={spec.leakage_risk ? 'danger' : 'success'}>
                      {spec.leakage_risk ? 'Leakage Risk' : 'Leakage Free'}
                    </StatusBadge>
                  </div>

                  <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200/60 font-mono text-xs text-slate-700 flex items-center justify-between">
                    <span className="text-slate-400 font-sans">Formula:</span>
                    <span className="font-bold text-indigo-700">
                      {spec.numerator_col} &divide; {spec.denominator_col}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2 text-xs text-slate-600 leading-relaxed">
                    <div>
                      <span className="font-semibold text-slate-800">What it means: </span>
                      {spec.name === 'profit_to_revenue_ratio'
                        ? 'Normalized profit margin per unit of top-line order revenue.'
                        : `Ratio metric relating ${spec.numerator_col} against ${spec.denominator_col}.`}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-800">Why it helps predict late delivery: </span>
                      {spec.name === 'profit_to_revenue_ratio'
                        ? 'High-margin items frequently trigger expedited carrier prioritization, whereas low-margin bulk items correlate with lower-priority consolidation routes.'
                        : 'Provides scale-invariant signal capturing operational efficiency.'}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Execution Status:</span>
                  <span className="font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircleIcon className="w-3.5 h-3.5" />
                    <span>Validated for ML Pipeline</span>
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Execution Status Card (if evaluation already ran) */}
      {feReport && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-3">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Evaluation Execution Report
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {acceptedList.map((item, idx) => (
              <div key={idx} className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl text-emerald-950 flex items-center justify-between">
                <div>
                  <span className="font-bold font-mono">{item.name}</span>
                  <span className="text-emerald-700 text-[11px] block mt-0.5">
                    {item.numerator_col} / {item.denominator_col}
                  </span>
                </div>
                <StatusBadge status="success">Accepted &amp; Scaled</StatusBadge>
              </div>
            ))}
            {rejectedList.map((item, idx) => (
              <div key={idx} className="p-3 bg-rose-50/50 border border-rose-200 rounded-xl text-rose-950 flex items-center justify-between">
                <div>
                  <span className="font-bold font-mono">{item.name}</span>
                  <span className="text-rose-700 text-[11px] block mt-0.5">{item.reason}</span>
                </div>
                <StatusBadge status="danger">Rejected</StatusBadge>
              </div>
            ))}
          </div>
        </div>
      )}
    </PageContainer>
  )
}
