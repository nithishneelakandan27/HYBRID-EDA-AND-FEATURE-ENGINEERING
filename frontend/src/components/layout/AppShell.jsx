import React from 'react'
import { useApp } from '../../context/AppContext'
import Sidebar from './Sidebar'
import Header from './Header'

export default function AppShell({ children }) {
  const { sidebarCollapsed } = useApp()

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex">
      {/* Persistent Left Sidebar */}
      <Sidebar />

      {/* Main App Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72'
        }`}
      >
        <Header />
        <main className="flex-1 pb-16">
          {children}
        </main>
      </div>
    </div>
  )
}
