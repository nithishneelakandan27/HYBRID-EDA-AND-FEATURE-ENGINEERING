import React, { useState, useEffect, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import MetricCard from '../components/common/MetricCard'
import {
  BrainCircuitIcon,
  ActivityIcon,
  TrendingUpIcon,
  TargetIcon,
  PlayIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  ClockIcon,
  DownloadIcon,
  RefreshCwIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  SparklesIcon,
  LayersIcon,
  FilterIcon,
  SlidersIcon,
  BarChart3Icon,
  ZapIcon,
  InfoIcon,
  ScaleIcon
} from '../components/common/Icons'

// ── Constants ──────────────────────────────────────────────────────────────

const MODEL_META = {
  logistic_regression: {
    color: 'blue',
    gradient: 'from-blue-50 to-blue-100/60',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-700',
    dot: 'bg-blue-500',
    label: 'Logistic Regression',
    short: 'LR',
    explainability: 'High',
    explainBg: 'bg-emerald-100 text-emerald-700',
  },
  decision_tree: {
    color: 'amber',
    gradient: 'from-amber-50 to-amber-100/60',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-700',
    dot: 'bg-amber-500',
    label: 'Decision Tree',
    short: 'DT',
    explainability: 'High',
    explainBg: 'bg-emerald-100 text-emerald-700',
  },
  random_forest: {
    color: 'indigo',
    gradient: 'from-indigo-50 to-indigo-100/60',
    border: 'border-indigo-200',
    badge: 'bg-indigo-100 text-indigo-700',
    dot: 'bg-indigo-500',
    label: 'Random Forest',
    short: 'RF',
    explainability: 'Medium',
    explainBg: 'bg-amber-100 text-amber-700',
  },
  gradient_boosting: {
    color: 'rose',
    gradient: 'from-rose-50 to-rose-100/60',
    border: 'border-rose-200',
    badge: 'bg-rose-100 text-rose-700',
    dot: 'bg-rose-500',
    label: 'Gradient Boosting',
    short: 'GB',
    explainability: 'Low',
    explainBg: 'bg-rose-100 text-rose-700',
  },
}

function pct(val) {
  if (val == null) return '—'
  return (val * 100).toFixed(1) + '%'
}
function fmt4(val) {
  if (val == null) return '—'
  return Number(val).toFixed(4)
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4.5 h-4.5 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}

function ModelCard({ modelType, catalog, result, isTraining, error, onTrain, selectedModel, onSelect }) {
  const meta = MODEL_META[modelType] || {}
  const catEntry = catalog?.find(m => m.model_type === modelType) || {}
  const trained = !!result
  const active = selectedModel === modelType

  return (
    <div
      className={`relative rounded-2xl p-5 border cursor-pointer transition-all duration-200 ${
        active
          ? `bg-gradient-to-br ${meta.gradient} ${meta.border} shadow-md ring-2 ring-offset-1 ring-${meta.color}-400`
          : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-sm'
      }`}
      onClick={() => onSelect(modelType)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-2 h-2 rounded-full ${meta.dot}`} />
            <span className="text-sm font-semibold text-slate-900">{catEntry.label || meta.label}</span>
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${meta.badge}`}>
            Explainability: {catEntry.explainability || meta.explainability}
          </span>
        </div>
        <div className="flex flex-col items-end gap-1">
          {trained && (
            <div className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <CheckCircleIcon className="w-3 h-3" />
              <span>Trained</span>
            </div>
          )}
          {isTraining && (
            <div className="flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200 animate-pulse">
              <RefreshCwIcon className="w-3 h-3 animate-spin" />
              <span>Training…</span>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-slate-500 leading-relaxed mb-4">
        {catEntry.description}
      </p>

      {/* Quick metrics if trained */}
      {trained && result.metrics && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-white/70 rounded-lg p-2 border border-slate-100">
            <div className="text-xs text-slate-500">Accuracy</div>
            <div className="text-sm font-bold text-slate-900">{pct(result.metrics.accuracy)}</div>
          </div>
          <div className="bg-white/70 rounded-lg p-2 border border-slate-100">
            <div className="text-xs text-slate-500">ROC-AUC</div>
            <div className="text-sm font-bold text-slate-900">{fmt4(result.metrics.roc_auc)}</div>
          </div>
          <div className="bg-white/70 rounded-lg p-2 border border-slate-100">
            <div className="text-xs text-slate-500">F1 Score</div>
            <div className="text-sm font-bold text-slate-900">{fmt4(result.metrics.f1)}</div>
          </div>
          <div className="bg-white/70 rounded-lg p-2 border border-slate-100">
            <div className="text-xs text-slate-500">Train time</div>
            <div className="text-sm font-bold text-slate-900">{result.timing?.model_training_sec}s</div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-3">
          {error}
        </div>
      )}

      {/* Train button */}
      <button
        onClick={(e) => { e.stopPropagation(); onTrain(modelType) }}
        disabled={isTraining}
        className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
          isTraining
            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
            : trained
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
        }`}
      >
        {isTraining ? (
          <><RefreshCwIcon className="w-3.5 h-3.5 animate-spin" /> Training…</>
        ) : trained ? (
          <><RefreshCwIcon className="w-3.5 h-3.5" /> Re-train</>
        ) : (
          <><PlayIcon className="w-3.5 h-3.5" /> Train Model</>
        )}
      </button>
    </div>
  )
}

function ConfusionMatrix({ cm, labels }) {
  if (!cm || cm.length === 0) return null
  const total = cm.flat().reduce((a, b) => a + b, 0)
  const maxVal = Math.max(...cm.flat())
  const labelNames = labels || cm.map((_, i) => `Class ${i}`)

  return (
    <div>
      <div className="text-xs text-slate-500 mb-3">Predicted →</div>
      <div className="grid gap-1" style={{ gridTemplateColumns: `80px repeat(${cm[0].length}, 1fr)` }}>
        {/* Header row */}
        <div />
        {labelNames.map((l, ci) => (
          <div key={ci} className="text-center text-xs font-semibold text-slate-600 pb-1 truncate" title={String(l)}>
            {String(l)}
          </div>
        ))}
        {/* Data rows */}
        {cm.map((row, ri) => (
          <React.Fragment key={ri}>
            <div className="flex items-center text-xs font-semibold text-slate-600 pr-2 truncate" title={String(labelNames[ri] || ri)}>
              {String(labelNames[ri] || ri)}
            </div>
            {row.map((val, ci) => {
              const isDiagonal = ri === ci
              const intensity = total > 0 ? val / maxVal : 0
              const bg = isDiagonal
                ? `rgba(99,102,241,${0.15 + intensity * 0.55})`
                : `rgba(239,68,68,${0.08 + intensity * 0.35})`
              return (
                <div
                  key={ci}
                  className="rounded-lg p-3 text-center flex flex-col items-center justify-center min-h-[60px] border"
                  style={{
                    background: bg,
                    borderColor: isDiagonal ? 'rgba(99,102,241,0.3)' : 'rgba(239,68,68,0.2)',
                  }}
                >
                  <div className="text-lg font-bold text-slate-900">{val.toLocaleString()}</div>
                  <div className="text-xs text-slate-500">{total > 0 ? ((val / total) * 100).toFixed(1) : 0}%</div>
                </div>
              )
            })}
          </React.Fragment>
        ))}
      </div>
      <div className="flex gap-3 mt-2">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <div className="w-3 h-3 rounded bg-indigo-300 border border-indigo-400" />
          <span>Correct predictions (diagonal)</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <div className="w-3 h-3 rounded bg-rose-200 border border-rose-300" />
          <span>Misclassifications</span>
        </div>
      </div>
    </div>
  )
}

function FeatureImportanceBar({ features }) {
  if (!features || features.length === 0) {
    return <p className="text-sm text-slate-400 italic">Feature importance not available for this model.</p>
  }
  const maxPct = Math.max(...features.map(f => f.importance_pct))

  return (
    <div className="space-y-2">
      {features.slice(0, 15).map((f, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="text-xs text-slate-500 w-4 text-right flex-shrink-0">{i + 1}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-xs font-medium text-slate-700 truncate max-w-[200px]" title={f.feature}>
                {f.feature}
              </span>
              <span className="text-xs text-slate-500 ml-2 flex-shrink-0">{f.importance_pct.toFixed(2)}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all duration-500"
                style={{ width: `${(f.importance_pct / maxPct) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function ComparisonTable({ results }) {
  const modelTypes = Object.keys(results)
  if (modelTypes.length < 2) return null

  const metrics = ['accuracy', 'precision', 'recall', 'f1', 'roc_auc']
  const metricLabels = {
    accuracy: 'Accuracy',
    precision: 'Precision',
    recall: 'Recall',
    f1: 'F1 Score',
    roc_auc: 'ROC-AUC',
  }

  // Find best value for each metric
  const best = {}
  metrics.forEach(m => {
    best[m] = Math.max(...modelTypes.map(t => results[t]?.metrics?.[m] ?? -1))
  })

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Metric</th>
            {modelTypes.map(t => (
              <th key={t} className="text-center text-xs font-semibold text-slate-600 px-4 py-3">
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${MODEL_META[t]?.dot}`} />
                  {MODEL_META[t]?.short || t}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {metrics.map((m, i) => (
            <tr key={m} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
              <td className="px-4 py-3 text-xs font-medium text-slate-700">{metricLabels[m]}</td>
              {modelTypes.map(t => {
                const val = results[t]?.metrics?.[m]
                const isBest = val != null && Math.abs(val - best[m]) < 0.0001
                return (
                  <td key={t} className="px-4 py-3 text-center">
                    <span className={`text-sm font-semibold ${isBest ? 'text-indigo-600' : 'text-slate-700'}`}>
                      {val != null ? (val >= 0.01 ? (val * 100).toFixed(1) + '%' : fmt4(val)) : '—'}
                    </span>
                    {isBest && <div className="text-xs text-indigo-400 mt-0.5">★ best</div>}
                  </td>
                )
              })}
            </tr>
          ))}
          <tr className="bg-slate-50 border-t border-slate-200">
            <td className="px-4 py-3 text-xs font-medium text-slate-700">Train Time</td>
            {modelTypes.map(t => (
              <td key={t} className="px-4 py-3 text-center text-sm text-slate-600">
                {results[t]?.timing?.model_training_sec ?? '—'}s
              </td>
            ))}
          </tr>
          <tr className="bg-white border-t border-slate-200">
            <td className="px-4 py-3 text-xs font-medium text-slate-700">Features</td>
            {modelTypes.map(t => (
              <td key={t} className="px-4 py-3 text-center text-sm text-slate-600">
                {results[t]?.feature_info?.post_selection ?? '—'}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function PredictionExplorer({ result, modelType, onPredict, predResult, isPredicting }) {
  const [selectedIdx, setSelectedIdx] = useState(0)
  const samples = result?.sample_records || []
  const currentSample = samples[selectedIdx] || null

  return (
    <div className="space-y-5">
      {/* Record selector */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-2">
          Select a Test Record ({samples.length} available)
        </label>
        <div className="grid grid-cols-5 gap-1.5">
          {samples.map((s, i) => (
            <button
              key={i}
              onClick={() => setSelectedIdx(i)}
              className={`rounded-lg p-2 text-xs font-medium border transition-all ${
                selectedIdx === i
                  ? 'bg-indigo-600 text-white border-indigo-700'
                  : s.correct
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
              }`}
            >
              #{i + 1}
            </button>
          ))}
        </div>
        <div className="flex gap-3 mt-1.5">
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <div className="w-2.5 h-2.5 rounded bg-emerald-200 border border-emerald-300" />
            Correct
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <div className="w-2.5 h-2.5 rounded bg-rose-200 border border-rose-300" />
            Incorrect
          </div>
        </div>
      </div>

      {currentSample && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Record details */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div className="text-xs font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
              <FilterIcon className="w-3.5 h-3.5" />
              Record #{selectedIdx + 1} Features
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {Object.entries(currentSample.features).slice(0, 12).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between text-xs py-0.5 border-b border-slate-100">
                  <span className="text-slate-500 truncate max-w-[140px]">{k}</span>
                  <span className="font-medium text-slate-700 ml-2">{typeof v === 'number' ? v.toFixed(3) : String(v)}</span>
                </div>
              ))}
              {Object.keys(currentSample.features).length > 12 && (
                <div className="text-xs text-slate-400 pt-1 text-center">
                  +{Object.keys(currentSample.features).length - 12} more features
                </div>
              )}
            </div>
          </div>

          {/* Ground truth & prediction */}
          <div className="space-y-3">
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <div className="text-xs font-semibold text-slate-500 mb-1">Ground Truth</div>
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                <div className="w-2 h-2 rounded-full bg-indigo-500" />
                {String(currentSample.true_label)}
              </div>
            </div>

            <div className={`rounded-xl p-4 border ${currentSample.correct ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
              <div className="text-xs font-semibold text-slate-500 mb-1">Stored Prediction</div>
              <div className={`flex items-center gap-2 text-sm font-bold ${currentSample.correct ? 'text-emerald-700' : 'text-rose-700'}`}>
                <div className={`w-2 h-2 rounded-full ${currentSample.correct ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                {String(currentSample.predicted_label)}
              </div>
              <div className={`text-xs mt-1 font-medium ${currentSample.correct ? 'text-emerald-600' : 'text-rose-600'}`}>
                {currentSample.correct ? '✓ Correct prediction' : '✗ Incorrect prediction'}
              </div>
              {currentSample.probability_late != null && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>Target Class Probability</span>
                    <span>{(currentSample.probability_late * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                      style={{ width: `${currentSample.probability_late * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => onPredict(modelType, null, selectedIdx)}
              disabled={isPredicting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
            >
              {isPredicting ? (
                <><RefreshCwIcon className="w-3.5 h-3.5 animate-spin" /> Predicting…</>
              ) : (
                <><SparklesIcon className="w-3.5 h-3.5" /> Run Live Prediction</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Live prediction result */}
      {predResult && predResult.model_type === modelType && (
        <div className="rounded-xl p-5 border-2 bg-indigo-50/50 border-indigo-200">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-bold text-slate-900">Live Prediction Result</div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              predResult.confidence_level === 'High' ? 'bg-emerald-100 text-emerald-800' :
              predResult.confidence_level === 'Medium' ? 'bg-amber-100 text-amber-800' :
              'bg-slate-200 text-slate-800'
            }`}>
              {predResult.risk_level || `${predResult.confidence_level} Confidence`}
            </span>
          </div>
          <div className="text-lg font-bold text-indigo-900">
            {predResult.predicted_label}
          </div>
          {predResult.probabilities && Object.keys(predResult.probabilities).length > 0 && (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(predResult.probabilities).map(([clsLabel, prob]) => (
                <div key={clsLabel} className="bg-white/80 rounded-lg p-3 border border-slate-200">
                  <div className="text-xs text-slate-500 truncate" title={clsLabel}>P({clsLabel})</div>
                  <div className="text-base font-bold text-indigo-600">{(prob * 100).toFixed(1)}%</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Prediction Preview Table: Actual vs Predicted across test records ── */}
      {samples.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs mt-4">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Prediction Preview Table (Actual vs Predicted)
              </h4>
              <p className="text-[11px] text-slate-500">
                Ground Truth vs Model Predictions on representative unseen test records.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                {samples.filter(s => s.correct).length} / {samples.length} Correct ({((samples.filter(s => s.correct).length / samples.length) * 100).toFixed(0)}%)
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 text-slate-600 border-b border-slate-200 font-semibold">
                  <th className="py-2.5 px-3">Record</th>
                  <th className="py-2.5 px-3">Actual (Ground Truth)</th>
                  <th className="py-2.5 px-3">Model Prediction</th>
                  <th className="py-2.5 px-3">Target Probability</th>
                  <th className="py-2.5 px-3">Result</th>
                  <th className="py-2.5 px-3">Key Features Sample</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {samples.map((s, idx) => {
                  const isSelected = selectedIdx === idx
                  return (
                    <tr
                      key={idx}
                      className={`transition-colors cursor-pointer ${
                        isSelected ? 'bg-indigo-50/70' : 'hover:bg-slate-50/80'
                      }`}
                      onClick={() => setSelectedIdx(idx)}
                    >
                      <td className="py-2.5 px-3 text-slate-500 font-bold">
                        #{idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-sans font-semibold text-slate-900">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-slate-400" />
                          {s.true_label}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-sans font-semibold">
                        <span className={`inline-flex items-center gap-1.5 ${s.correct ? 'text-emerald-700' : 'text-rose-700'}`}>
                          <span className={`w-2 h-2 rounded-full ${s.correct ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          {s.predicted_label}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {s.probability_late != null ? (
                          <div className="flex items-center gap-2">
                            <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-500 rounded-full"
                                style={{ width: `${s.probability_late * 100}%` }}
                              />
                            </div>
                            <span className="text-slate-700 font-mono">{(s.probability_late * 100).toFixed(1)}%</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            s.correct
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {s.correct ? '✓ Match' : '✗ Error'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-500 text-[11px] truncate max-w-[200px]" title={Object.entries(s.features).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(' | ')}>
                        {Object.entries(s.features).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(' | ')}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedIdx(idx)
                            onPredict(modelType, null, idx)
                          }}
                          className="px-2 py-1 bg-white hover:bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          Test Live
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function MLModeling() {
  const {
    datasetResult,
    navigateTo,
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
  } = useApp()

  const [selectedModel, setSelectedModel] = useState('random_forest')
  const [activeTab, setActiveTab] = useState('metrics') // 'metrics' | 'importance' | 'matrix' | 'prediction'
  const [showComparison, setShowComparison] = useState(false)

  // Fetch model catalog on mount
  useEffect(() => {
    fetchModelConfig()
  }, [fetchModelConfig])

  // Active target column display
  const allColumns = modelConfig?.columns || []
  const lateCol = allColumns.find(c => c.toLowerCase() === 'late_delivery_risk')
  const detectedTarget = modelConfig?.target_candidates?.column || modelConfig?.target_candidates?.detected_column || null
  const defaultTarget = lateCol || detectedTarget
  const GEO_COLS = ['state', 'city', 'warehouse', 'country', 'region', 'zipcode', 'zip_code', 'postal_code', 'latitude', 'longitude', 'street', 'address', 'market', 'territory', 'store', 'department']
  const isTargetGeo = modelingTargetCol && GEO_COLS.some(g => modelingTargetCol.toLowerCase().includes(g))

  const effectiveTarget = (!isTargetGeo && modelingTargetCol) ? modelingTargetCol : defaultTarget
  const activeTarget = effectiveTarget || 'Auto-detect'
  const targetCandidates = modelConfig?.target_candidates?.candidate_columns || []
  const domainProfiles = modelConfig?.domain_profiles || []
  const activeDomain = modelingDomainProfile || modelConfig?.detected_domain || 'general'

  const [trainingAll, setTrainingAll] = useState(false)
  const isAnyTraining = trainingModels.size > 0 || trainingAll

  const handleTrain = useCallback(async (modelType) => {
    try {
      await trainModel(modelType, {
        target_column: effectiveTarget || undefined,
        domain_profile: modelingDomainProfile || undefined,
        test_size: 0.20,
        random_state: 42,
      })
      setSelectedModel(modelType)
      setActiveTab('metrics')
    } catch (err) {
      // Error stored in modelingErrors
    }
  }, [trainModel, effectiveTarget, modelingDomainProfile])

  const handleTrainAll = useCallback(async () => {
    setTrainingAll(true)
    const models = ['logistic_regression', 'decision_tree', 'random_forest', 'gradient_boosting']
    for (const mt of models) {
      try {
        await trainModel(mt, {
          target_column: effectiveTarget || undefined,
          domain_profile: modelingDomainProfile || undefined,
          test_size: 0.20,
          random_state: 42,
        })
      } catch (err) {
        console.error(`Failed training ${mt}:`, err)
      }
    }
    setTrainingAll(false)
    setShowComparison(true)
  }, [trainModel, effectiveTarget, modelingDomainProfile])

  const currentResult = modelingResults[selectedModel]
  const catalog = modelConfig?.models || []
  const hasAnyTrained = Object.keys(modelingResults).length > 0
  const trainedCount = Object.keys(modelingResults).length

  const exportResults = useCallback(() => {
    if (!currentResult) return
    const { metrics, feature_importance, feature_info, split_info, timing } = currentResult
    const data = {
      model_type: currentResult.model_type,
      model_label: currentResult.model_label,
      metrics,
      feature_info,
      split_info,
      timing,
      feature_importance: feature_importance?.slice(0, 15),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ml_results_${selectedModel}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [currentResult, selectedModel])

  const exportComparison = useCallback(() => {
    const rows = Object.entries(modelingResults).map(([modelType, result]) => ({
      model_type: modelType,
      model_label: result.model_label,
      ...result.metrics,
      training_sec: result.timing?.model_training_sec,
      features: result.feature_info?.post_selection,
    }))
    const headers = Object.keys(rows[0] || {})
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => r[h] ?? '').join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'ml_model_comparison.csv'
    a.click()
    URL.revokeObjectURL(url)
  }, [modelingResults])

  // ── No dataset guard ────────────────────────────────────────────────────
  if (!datasetResult) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 px-4">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
          <BrainCircuitIcon className="w-8 h-8 text-indigo-400" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Dataset Required</h2>
          <p className="text-sm text-slate-500 max-w-md">
            Upload a CSV dataset first. Phase II ML Modeling runs on top of the Phase I
            preprocessing pipeline — the same dataset used for EDA and feature engineering.
          </p>
        </div>
        <button
          onClick={() => navigateTo('/upload')}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          Go to Data Upload
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-sm">
              <BrainCircuitIcon className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">ML Modeling</h1>
            <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-full border border-indigo-200">
              Phase II
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Train and compare ML classifiers using the Phase I feature-engineered representation.
            Target: <span className="font-semibold text-slate-700">{activeTarget}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleTrainAll}
            disabled={isAnyTraining}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            {trainingAll ? (
              <>
                <RefreshCwIcon className="w-3.5 h-3.5 animate-spin" />
                <span>Training All 4 Models…</span>
              </>
            ) : (
              <>
                <SparklesIcon className="w-3.5 h-3.5" />
                <span>Train All 4 Models</span>
              </>
            )}
          </button>
          {hasAnyTrained && (
            <>
              <button
                onClick={() => setShowComparison(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  showComparison ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                <ScaleIcon className="w-3.5 h-3.5" />
                Compare ({trainedCount})
              </button>
              <button
                onClick={exportComparison}
                className="flex items-center gap-1.5 px-3 py-2 bg-white text-slate-700 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-semibold transition-all"
              >
                <DownloadIcon className="w-3.5 h-3.5" />
                Export CSV
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Dataset & Target Configuration Controls ─────────────────────── */}
      <div className="bg-gradient-to-r from-slate-50 to-indigo-50/40 rounded-2xl p-4 border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
              <BarChart3Icon className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <div>
              <div className="text-xs text-slate-500">Dataset</div>
              <div className="text-xs font-semibold text-slate-800">{datasetResult.summary?.filename || 'Uploaded file'}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
              <LayersIcon className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <div>
              <div className="text-xs text-slate-500">Records</div>
              <div className="text-xs font-semibold text-slate-800">{datasetResult.summary?.num_rows?.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Target & Domain Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Target Selector Dropdown */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
            <TargetIcon className="w-4 h-4 text-indigo-600" />
            <div className="flex flex-col">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Classification Target</label>
              <select
                value={effectiveTarget || ''}
                onChange={(e) => setModelingTargetCol(e.target.value || null)}
                className="text-xs font-semibold text-slate-800 bg-transparent border-none p-0 focus:ring-0 cursor-pointer"
              >
                <option value="">Auto-Detect ({modelConfig?.target_candidates?.column || 'Best candidate'})</option>
                {allColumns.map(col => {
                  const isCandidate = targetCandidates.includes(col)
                  return (
                    <option key={col} value={col}>
                      {col} {isCandidate ? '★ (Recommended)' : ''}
                    </option>
                  )
                })}
              </select>
            </div>
          </div>

          {/* Domain Profile Selector */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
            <ActivityIcon className="w-4 h-4 text-slate-500" />
            <div className="flex flex-col">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Domain Profile</label>
              <select
                value={modelingDomainProfile || ''}
                onChange={(e) => setModelingDomainProfile(e.target.value || null)}
                className="text-xs font-semibold text-slate-800 bg-transparent border-none p-0 focus:ring-0 cursor-pointer"
              >
                <option value="">Auto-Detect ({activeDomain})</option>
                {domainProfiles.map(p => (
                  <option key={p.key} value={p.key}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ── Comparison Table (toggled) ─────────────────────────────────── */}
      {showComparison && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <SectionHeader
            icon={ScaleIcon}
            title="Model Comparison"
            subtitle="Side-by-side evaluation metrics across all trained models"
          />
          <ComparisonTable results={modelingResults} />
        </div>
      )}

      {/* ── Model Selection Grid ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
        <SectionHeader
          icon={SlidersIcon}
          title="Model Selection"
          subtitle="Select a model to view results or train a new one. Click a card to set it as active."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {['logistic_regression', 'decision_tree', 'random_forest', 'gradient_boosting'].map(mt => (
            <ModelCard
              key={mt}
              modelType={mt}
              catalog={catalog}
              result={modelingResults[mt]}
              isTraining={trainingModels.has(mt)}
              error={modelingErrors[mt]}
              onTrain={handleTrain}
              selectedModel={selectedModel}
              onSelect={setSelectedModel}
            />
          ))}
        </div>
      </div>

      {/* ── Results Section (only when model trained) ──────────────────── */}
      {currentResult ? (
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          {/* Header with tabs and export */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: MODEL_META[selectedModel]?.gradient.split(' ')[1] || '#eef2ff' }}>
                <ActivityIcon className="w-4.5 h-4.5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  {currentResult.model_label} — Evaluation Results
                </h2>
                <p className="text-xs text-slate-500">
                  {currentResult.split_info?.test_rows?.toLocaleString()} test records ·{' '}
                  {currentResult.feature_info?.post_selection} features ·{' '}
                  {currentResult.timing?.total_pipeline_sec}s total
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={exportResults}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-600 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-semibold transition-all"
              >
                <DownloadIcon className="w-3.5 h-3.5" /> Export JSON
              </button>
            </div>
          </div>

          {/* Tab navigation */}
          <div className="flex gap-1 mb-5 bg-slate-100 rounded-xl p-1 w-fit">
            {[
              { key: 'metrics', label: 'Metrics', icon: ActivityIcon },
              { key: 'matrix', label: 'Confusion Matrix', icon: ScaleIcon },
              { key: 'importance', label: 'Feature Importance', icon: BarChart3Icon },
              { key: 'prediction', label: 'Prediction Explorer', icon: SparklesIcon },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === tab.key
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Tab: Metrics ─────────────────────────────────────────────── */}
          {activeTab === 'metrics' && (
            <div className="space-y-5">
              {/* Core metric cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
                {[
                  { key: 'accuracy', label: 'Accuracy', color: 'indigo', tip: 'Fraction of all correct predictions.' },
                  { key: 'precision', label: 'Precision', color: 'blue', tip: 'Of all predicted "Late", what fraction were truly late?' },
                  { key: 'recall', label: 'Recall', color: 'emerald', tip: 'Of all truly "Late" records, what fraction did the model catch?' },
                  { key: 'f1', label: 'F1 Score', color: 'amber', tip: 'Harmonic mean of Precision and Recall.' },
                  { key: 'roc_auc', label: 'ROC-AUC', color: 'purple', tip: 'Area under the ROC curve. 1.0 = perfect, 0.5 = random.' },
                ].map(({ key, label, color, tip }) => (
                  <MetricCard
                    key={key}
                    title={label}
                    value={currentResult.metrics[key] != null
                      ? (currentResult.metrics[key] * 100).toFixed(2) + '%'
                      : '—'}
                    subtitle={tip}
                    colorScheme={color}
                    icon={ActivityIcon}
                    tooltipText={tip}
                  />
                ))}
              </div>

              {/* Split & feature info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <h3 className="text-xs font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
                    <ScaleIcon className="w-3.5 h-3.5 text-slate-500" />
                    Dataset Split
                  </h3>
                  <div className="space-y-2">
                    {[
                      ['Total Records', currentResult.split_info?.total_rows?.toLocaleString()],
                      ['Training Set', currentResult.split_info?.train_rows?.toLocaleString()],
                      ['Test Set', currentResult.split_info?.test_rows?.toLocaleString()],
                      ['Test %', `${currentResult.split_info?.test_percentage}%`],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">{k}</span>
                        <span className="font-semibold text-slate-800">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <h3 className="text-xs font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
                    <FilterIcon className="w-3.5 h-3.5 text-slate-500" />
                    Feature Pipeline
                  </h3>
                  <div className="space-y-2">
                    {[
                      ['Raw Input Features', currentResult.feature_info?.raw_input_features],
                      ['After Preprocessing', currentResult.feature_info?.post_preprocessing],
                      ['After Feature Eng.', currentResult.feature_info?.post_feature_engineering],
                      ['After Selection', currentResult.feature_info?.post_selection],
                      ['Leakage Excluded', currentResult.leakage_info?.leakage_count],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">{k}</span>
                        <span className="font-semibold text-slate-800">{v ?? '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Timing */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <h3 className="text-xs font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
                  <ClockIcon className="w-3.5 h-3.5 text-slate-500" />
                  Pipeline Timing
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                  {[
                    ['Preprocessing', currentResult.timing?.preprocessing_sec],
                    ['Feature Eng.', currentResult.timing?.feature_engineering_sec],
                    ['Feature Sel.', currentResult.timing?.feature_selection_sec],
                    ['Model Training', currentResult.timing?.model_training_sec],
                    ['Prediction', currentResult.timing?.prediction_sec],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-white rounded-lg p-2.5 border border-slate-200 text-center">
                      <div className="text-lg font-bold text-slate-900">{v}s</div>
                      <div className="text-xs text-slate-400">{k}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Target & Class Imbalance Distribution */}
              {currentResult.target_info && (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <TargetIcon className="w-3.5 h-3.5 text-indigo-600" />
                      Target Column & Class Imbalance Distribution
                    </h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md font-mono bg-indigo-50 border border-indigo-200 text-indigo-700">
                      {currentResult.target_info.classification_type}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-white p-3 rounded-lg border border-slate-200">
                      <div className="text-[11px] text-slate-500 font-medium">Target Column</div>
                      <div className="text-sm font-bold text-slate-900 font-mono mt-0.5 truncate">
                        {currentResult.target_info.target_column}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        Domain: {currentResult.domain_profile || 'supply_chain'}
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-slate-200">
                      <div className="text-[11px] text-slate-500 font-medium">Training Class Split</div>
                      <div className="flex items-center justify-between text-xs mt-1 font-mono">
                        {Object.entries(currentResult.target_info.train_class_distribution || {}).map(([c, count]) => (
                          <div key={c} className="flex flex-col">
                            <span className="text-[10px] text-slate-400">Class {c}</span>
                            <span className="font-bold text-slate-800">{count.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2 flex">
                        {(() => {
                          const dist = Object.values(currentResult.target_info.train_class_distribution || {})
                          const total = dist.reduce((a, b) => a + b, 0)
                          if (total === 0) return null
                          const p0 = (dist[0] / total) * 100
                          return (
                            <>
                              <div className="bg-slate-400 h-full" style={{ width: `${p0}%` }} title={`Class 0: ${p0.toFixed(1)}%`} />
                              <div className="bg-indigo-500 h-full flex-1" title={`Class 1: ${(100 - p0).toFixed(1)}%`} />
                            </>
                          )
                        })()}
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-slate-200">
                      <div className="text-[11px] text-slate-500 font-medium">Test Class Split (Unseen)</div>
                      <div className="flex items-center justify-between text-xs mt-1 font-mono">
                        {Object.entries(currentResult.target_info.test_class_distribution || {}).map(([c, count]) => (
                          <div key={c} className="flex flex-col">
                            <span className="text-[10px] text-slate-400">Class {c}</span>
                            <span className="font-bold text-slate-800">{count.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2 flex">
                        {(() => {
                          const dist = Object.values(currentResult.target_info.test_class_distribution || {})
                          const total = dist.reduce((a, b) => a + b, 0)
                          if (total === 0) return null
                          const p0 = (dist[0] / total) * 100
                          return (
                            <>
                              <div className="bg-slate-400 h-full" style={{ width: `${p0}%` }} title={`Class 0: ${p0.toFixed(1)}%`} />
                              <div className="bg-indigo-500 h-full flex-1" title={`Class 1: ${(100 - p0).toFixed(1)}%`} />
                            </>
                          )
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Classification Report Table */}
              {currentResult.classification_report && (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <h3 className="text-xs font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
                    <ActivityIcon className="w-3.5 h-3.5 text-slate-500" />
                    Classification Report (Per-Class Precision, Recall & F1)
                  </h3>
                  <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                          <th className="py-2.5 px-3">Class / Average</th>
                          <th className="py-2.5 px-3 text-right">Precision</th>
                          <th className="py-2.5 px-3 text-right">Recall</th>
                          <th className="py-2.5 px-3 text-right">F1-Score</th>
                          <th className="py-2.5 px-3 text-right">Support</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {Object.entries(currentResult.classification_report)
                          .filter(([key]) => key !== 'accuracy')
                          .map(([key, m]) => {
                            const isAvg = key.includes('avg')
                            const label = currentResult.class_labels?.[key] || key
                            return (
                              <tr key={key} className={isAvg ? 'bg-slate-50/50 font-semibold' : 'hover:bg-slate-50'}>
                                <td className="py-2 px-3 font-sans text-slate-800">
                                  {isAvg ? key : `Class ${key} (${label})`}
                                </td>
                                <td className="py-2 px-3 text-right text-slate-700">
                                  {m.precision != null ? (m.precision * 100).toFixed(1) + '%' : '—'}
                                </td>
                                <td className="py-2 px-3 text-right text-slate-700">
                                  {m.recall != null ? (m.recall * 100).toFixed(1) + '%' : '—'}
                                </td>
                                <td className="py-2 px-3 text-right text-indigo-600 font-bold">
                                  {m['f1-score'] != null ? (m['f1-score'] * 100).toFixed(1) + '%' : '—'}
                                </td>
                                <td className="py-2 px-3 text-right text-slate-500">
                                  {m.support?.toLocaleString() ?? '—'}
                                </td>
                              </tr>
                            )
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Confusion Matrix ─────────────────────────────────────── */}
          {activeTab === 'matrix' && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                <div className="text-xs font-semibold text-slate-700 mb-1">← True Label</div>
                <ConfusionMatrix
                  cm={currentResult.metrics?.confusion_matrix}
                  labels={currentResult.metrics?.confusion_matrix_labels}
                />
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="text-xs font-semibold text-amber-800 mb-1.5 flex items-center gap-1.5">
                  <InfoIcon className="w-3.5 h-3.5" />
                  Reading the Confusion Matrix
                </div>
                <p className="text-xs text-amber-700">
                  Rows = true labels (what actually happened), Columns = predicted labels (what the model said).
                  Diagonal cells (blue) are correct predictions. Off-diagonal cells (red) are errors.
                  {currentResult.domain_profile === 'supply_chain'
                    ? ' For supply chain: high recall is preferred to minimise missed late deliveries (false negatives).'
                    : ' High recall minimizes false negatives; high precision minimizes false positives.'}
                </p>
              </div>
            </div>
          )}

          {/* ── Tab: Feature Importance ───────────────────────────────────── */}
          {activeTab === 'importance' && (
            <div className="space-y-4">
              <FeatureImportanceBar features={currentResult.feature_importance} />
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                <div className="text-xs font-semibold text-indigo-800 mb-1.5 flex items-center gap-1.5">
                  <InfoIcon className="w-3.5 h-3.5" />
                  Interpretation Note
                </div>
                <p className="text-xs text-indigo-700">
                  Feature importance reflects each feature's statistical contribution to the model's decisions
                  on the training data. Higher importance means the model relied more heavily on that feature
                  to distinguish target classes. This reflects predictive correlation, not causal relationship.
                </p>
              </div>
            </div>
          )}

          {/* ── Tab: Prediction Explorer ──────────────────────────────────── */}
          {activeTab === 'prediction' && (
            <PredictionExplorer
              result={currentResult}
              modelType={selectedModel}
              onPredict={predictSingleRecord}
              predResult={predictionResult}
              isPredicting={predictingModel === selectedModel}
            />
          )}
        </div>
      ) : (
        /* No results yet for selected model */
        <div className="bg-white rounded-2xl p-8 border border-slate-200/80 shadow-sm text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto mb-4">
            <PlayIcon className="w-6 h-6 text-indigo-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 mb-2">
            {MODEL_META[selectedModel]?.label} Not Yet Trained
          </h3>
          <p className="text-sm text-slate-500 mb-5 max-w-md mx-auto">
            Click <strong>Train Model</strong> on the card above to run the full Phase I → Phase II pipeline:
            preprocessing, feature engineering, feature selection, and model training on your dataset.
          </p>
          <button
            onClick={() => handleTrain(selectedModel)}
            disabled={trainingModels.has(selectedModel)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {trainingModels.has(selectedModel) ? (
              <><RefreshCwIcon className="w-4 h-4 animate-spin" /> Training…</>
            ) : (
              <><PlayIcon className="w-4 h-4" /> Train {MODEL_META[selectedModel]?.label}</>
            )}
          </button>
        </div>
      )}

      {/* ── Leakage Transparency Banner ──────────────────────────────────── */}
      <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <AlertTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-amber-900 mb-1">Leakage Prevention</h3>
            <p className="text-xs text-amber-700 leading-relaxed">
              All post-event and leakage columns are automatically excluded before any training
              {currentResult?.leakage_info?.leakage_columns_excluded?.length > 0 && (
                <>: <span className="font-semibold">{currentResult.leakage_info.leakage_columns_excluded.join(', ')}</span></>
              )}.
              The target column <span className="font-semibold">{currentResult?.target_info?.target_column || activeTarget}</span> is never in X.
              All transformers are fitted exclusively on X_train — no test-set information contaminates the model.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
