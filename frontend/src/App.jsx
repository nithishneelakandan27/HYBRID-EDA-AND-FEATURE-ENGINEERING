import React from 'react'
import { AppProvider, useApp } from './context/AppContext'
import AppShell from './components/layout/AppShell'

// Pages
import Dashboard from './pages/Dashboard'
import Upload from './pages/Upload'
import DataOverview from './pages/DataOverview'
import DataQuality from './pages/DataQuality'
import SmartDecisions from './pages/SmartDecisions'
import DataPreparation from './pages/DataPreparation'
import FeatureEngineering from './pages/FeatureEngineering'
import FeatureSelection from './pages/FeatureSelection'
import ModelEvaluation from './pages/ModelEvaluation'
import HowItWorks from './pages/HowItWorks'
import About from './pages/About'

function AppContent() {
  const { currentRoute } = useApp()

  const renderPage = () => {
    switch (currentRoute) {
      case '/dashboard':
        return <Dashboard />
      case '/upload':
        return <Upload />
      case '/overview':
        return <DataOverview />
      case '/quality':
        return <DataQuality />
      case '/decisions':
        return <SmartDecisions />
      case '/preparation':
        return <DataPreparation />
      case '/feature-engineering':
        return <FeatureEngineering />
      case '/feature-selection':
        return <FeatureSelection />
      case '/evaluation':
        return <ModelEvaluation />
      case '/how-it-works':
        return <HowItWorks />
      case '/about':
        return <About />
      default:
        return <Dashboard />
    }
  }

  return <AppShell>{renderPage()}</AppShell>
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}
