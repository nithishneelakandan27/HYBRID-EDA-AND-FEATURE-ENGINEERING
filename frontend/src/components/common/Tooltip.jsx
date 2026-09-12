import React, { useState } from 'react'
import { InfoIcon } from './Icons'

export default function Tooltip({ text, children, position = 'top' }) {
  const [visible, setVisible] = useState(false)

  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  }

  return (
    <div className="relative inline-flex items-center group">
      {children || (
        <button
          type="button"
          onMouseEnter={() => setVisible(true)}
          onMouseLeave={() => setVisible(false)}
          onClick={() => setVisible(!visible)}
          className="text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer p-0.5"
          aria-label="Information tooltip"
        >
          <InfoIcon className="w-3.5 h-3.5" />
        </button>
      )}

      {visible && (
        <div
          className={`absolute z-50 ${positions[position] || positions.top} w-56 p-2.5 bg-slate-900 text-slate-100 text-xs rounded-lg shadow-xl pointer-events-none transition-all duration-150 leading-relaxed`}
        >
          {text}
          <div
            className={`absolute w-2 h-2 bg-slate-900 rotate-45 ${
              position === 'bottom'
                ? '-top-1 left-1/2 -translate-x-1/2'
                : 'bottom-[-4px] left-1/2 -translate-x-1/2'
            }`}
          />
        </div>
      )}
    </div>
  )
}
