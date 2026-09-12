import React from 'react'
import { useApp } from '../../context/AppContext'
import {
  BarChart3Icon,
  UploadCloudIcon,
  DatabaseIcon,
  ShieldCheckIcon,
  CpuIcon,
  SlidersIcon,
  ZapIcon,
  GitBranchIcon,
  ActivityIcon,
  HelpCircleIcon,
  InfoIcon,
  SparklesIcon,
  XIcon
} from '../common/Icons'

export default function Sidebar() {
  const {
    currentRoute,
    navigateTo,
    sidebarCollapsed,
    mobileSidebarOpen,
    setMobileSidebarOpen,
    backendStatus,
    health,
    datasetResult
  } = useApp()

  const navSections = [
    {
      title: 'HOME',
      items: [
        {
          route: '/dashboard',
          label: 'Dashboard',
          subtitle: 'Dataset intelligence overview',
          icon: BarChart3Icon,
          badge: datasetResult ? `${datasetResult.summary.num_rows.toLocaleString()}` : null
        }
      ]
    },
    {
      title: 'DATA',
      items: [
        {
          route: '/upload',
          label: 'Data Upload',
          subtitle: 'Select & validate your CSV',
          icon: UploadCloudIcon
        },
        {
          route: '/overview',
          label: 'Data Overview',
          subtitle: 'Understand columns & types',
          icon: DatabaseIcon,
          badge: datasetResult ? `${datasetResult.summary.num_cols}` : null
        },
        {
          route: '/quality',
          label: 'Data Quality',
          subtitle: 'Find problems in your data',
          icon: ShieldCheckIcon
        }
      ]
    },
    {
      title: 'INTELLIGENCE',
      items: [
        {
          route: '/decisions',
          label: 'Smart Decisions',
          subtitle: 'Rules + statistical evidence',
          icon: CpuIcon,
          isHighlight: true
        }
      ]
    },
    {
      title: 'PREPARATION',
      items: [
        {
          route: '/preparation',
          label: 'Data Preparation',
          subtitle: 'Impute, scale & encode',
          icon: SlidersIcon
        },
        {
          route: '/feature-engineering',
          label: 'Feature Engineering',
          subtitle: 'Create predictive signals',
          icon: ZapIcon
        },
        {
          route: '/feature-selection',
          label: 'Feature Selection',
          subtitle: 'Select top predictive signals',
          icon: GitBranchIcon
        }
      ]
    },
    {
      title: 'RESULTS',
      items: [
        {
          route: '/evaluation',
          label: 'Model Evaluation',
          subtitle: 'Evaluate 3 ML pipelines',
          icon: ActivityIcon
        }
      ]
    },
    {
      title: 'HELP',
      items: [
        {
          route: '/how-it-works',
          label: 'How It Works',
          subtitle: 'Plain English walkthrough',
          icon: HelpCircleIcon
        },
        {
          route: '/about',
          label: 'About Project',
          subtitle: 'Research & architecture',
          icon: InfoIcon
        }
      ]
    }
  ]

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 bg-white border-r border-slate-200 flex flex-col transition-all duration-300 ease-in-out ${
          // Mobile state
          mobileSidebarOpen ? 'translate-x-0 w-72 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        } ${
          // Desktop collapsed state
          sidebarCollapsed ? 'lg:w-20' : 'lg:w-72'
        }`}
      >
        {/* Brand / Logo Header */}
        <div className="h-16 px-4 border-b border-slate-200/80 flex items-center justify-between">
          <div
            onClick={() => navigateTo('/dashboard')}
            className="flex items-center gap-3 cursor-pointer overflow-hidden group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-teal-400 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <SparklesIcon className="w-5 h-5 text-white" />
            </div>

            {!sidebarCollapsed && (
              <div className="flex flex-col truncate">
                <span className="font-bold text-sm tracking-tight text-slate-900 leading-tight">
                  Hybrid EDA
                </span>
                <span className="text-[11px] font-medium text-indigo-600 leading-tight">
                  Feature Intelligence
                </span>
              </div>
            )}
          </div>

          {/* Mobile Close Button */}
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 lg:hidden"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items List */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin">
          {navSections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1">
              {!sidebarCollapsed && (
                <div className="px-3 pb-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  {section.title}
                </div>
              )}

              {section.items.map((item, iIdx) => {
                const isActive = currentRoute === item.route
                const Icon = item.icon

                return (
                  <button
                    key={iIdx}
                    onClick={() => navigateTo(item.route)}
                    title={sidebarCollapsed ? `${item.label} — ${item.subtitle}` : undefined}
                    className={`w-full text-left rounded-xl transition-all duration-150 flex items-center gap-3 cursor-pointer relative ${
                      sidebarCollapsed ? 'px-3 py-3 justify-center' : 'px-3 py-2.5'
                    } ${
                      isActive
                        ? 'bg-indigo-50/80 text-indigo-700 font-semibold shadow-xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                    } ${
                      item.isHighlight && !isActive
                        ? 'text-indigo-600 hover:text-indigo-700'
                        : ''
                    }`}
                  >
                    {/* Active Accent Bar */}
                    {isActive && (
                      <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-indigo-600" />
                    )}

                    <div
                      className={`shrink-0 transition-colors ${
                        isActive
                          ? 'text-indigo-600'
                          : item.isHighlight
                          ? 'text-indigo-500'
                          : 'text-slate-400 group-hover:text-slate-600'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    {!sidebarCollapsed && (
                      <div className="flex-1 min-w-0 flex items-center justify-between">
                        <div className="truncate">
                          <div className="text-xs truncate">{item.label}</div>
                          <div className="text-[10px] text-slate-400 truncate font-normal">
                            {item.subtitle}
                          </div>
                        </div>

                        {item.badge && (
                          <span
                            className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full font-mono font-medium ${
                              isActive
                                ? 'bg-indigo-100 text-indigo-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer: System Status */}
        <div className="p-3 border-t border-slate-200/80 bg-slate-50/50">
          <div
            className={`flex items-center rounded-xl p-2 bg-white border border-slate-200/80 shadow-xs ${
              sidebarCollapsed ? 'justify-center' : 'justify-between'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    backendStatus === 'connected' ? 'bg-emerald-400' : 'bg-red-400'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    backendStatus === 'connected' ? 'bg-emerald-500' : 'bg-red-500'
                  }`}
                />
              </span>
              {!sidebarCollapsed && (
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-700 leading-none">
                    {backendStatus === 'connected' ? 'Backend Online' : 'Backend Disconnected'}
                  </span>
                  <span className="text-[10px] text-slate-400 leading-tight mt-0.5">
                    FastAPI {health?.version ? `v${health.version}` : 'v1.0.0'}
                  </span>
                </div>
              )}
            </div>
            {!sidebarCollapsed && (
              <span className="text-[10px] font-mono text-slate-400 font-semibold bg-slate-100 px-1.5 py-0.5 rounded">
                ML Ready
              </span>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
