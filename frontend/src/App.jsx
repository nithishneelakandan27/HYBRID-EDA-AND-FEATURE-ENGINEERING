import React, { useState, useEffect } from 'react'

function App() {
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('http://localhost:8000/api/health')
      .then(res => res.json())
      .then(data => {
        setHealth(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-700">
        <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
          Hybrid EDA & Feature Engineering
        </h1>
        <p className="text-slate-300 mb-6">
          Supply Chain Data Preprocessing & Automated Decision Engine Framework
        </p>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 mb-6">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Backend Status</h2>
          {loading && <p className="text-yellow-400 animate-pulse">Connecting to backend...</p>}
          {error && <p className="text-red-400">Error connecting to backend: {error}</p>}
          {health && (
            <div className="flex items-center space-x-3">
              <span className="w-3 h-3 bg-emerald-400 rounded-full animate-ping"></span>
              <span className="text-emerald-400 font-medium">Connected ({health.service} v{health.version})</span>
            </div>
          )}
        </div>

        <div className="text-xs text-slate-500">
          Phase 1: Foundation & Architecture initialized successfully.
        </div>
      </div>
    </div>
  )
}

export default App
