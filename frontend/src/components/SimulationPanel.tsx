import React, { useState } from 'react'
import { Play, Pause, RotateCcw, ChevronDown } from 'lucide-react'

interface SimulationPanelProps {
  isRunning: boolean
  onStart: () => void
  onPause: () => void
  onReset: () => void
  speed: number
  onSpeedChange: (speed: number) => void
  timeStep: string
}

const SimulationPanel: React.FC<SimulationPanelProps> = ({
  isRunning,
  onStart,
  onPause,
  onReset,
  speed,
  onSpeedChange,
  timeStep,
}) => {
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)

  const speedOptions = [0.5, 1, 2, 5, 10]

  return (
    <div className="p-6 rounded-lg border border-purple-700 bg-purple-900/30 backdrop-blur-sm">
      <h3 className="text-lg font-semibold text-white mb-4">Simulation Controls</h3>

      <div className="space-y-4">
        {/* Controls */}
        <div className="flex gap-2">
          <button
            onClick={isRunning ? onPause : onStart}
            className="flex items-center justify-center gap-2 flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
          >
            {isRunning ? (
              <>
                <Pause size={18} />
                Pause
              </>
            ) : (
              <>
                <Play size={18} />
                Start
              </>
            )}
          </button>

          <button
            onClick={onReset}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-semibold transition-colors"
          >
            <RotateCcw size={18} />
            Reset
          </button>
        </div>

        {/* Speed Control */}
        <div className="relative">
          <button
            onClick={() => setShowSpeedMenu(!showSpeedMenu)}
            className="w-full flex items-center justify-between px-4 py-2 rounded-lg bg-gray-900/50 border border-gray-700 text-white hover:border-gray-600 transition-colors"
          >
            <div>
              <p className="text-xs text-gray-400">Simulation Speed</p>
              <p className="text-sm font-semibold">{speed}x</p>
            </div>
            <ChevronDown size={18} className={`transition-transform ${showSpeedMenu ? 'rotate-180' : ''}`} />
          </button>

          {showSpeedMenu && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden z-10">
              {speedOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => {
                    onSpeedChange(option)
                    setShowSpeedMenu(false)
                  }}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-700 transition-colors ${
                    speed === option ? 'bg-blue-600 text-white' : 'text-gray-300'
                  }`}
                >
                  {option}x
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Time Display */}
        <div className="p-4 rounded-lg bg-gray-900/50 border border-gray-700">
          <p className="text-xs text-gray-400 mb-1">Simulation Time</p>
          <p className="text-2xl font-bold text-blue-400 font-mono">{timeStep}</p>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2 text-sm">
          <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
          <span className="text-gray-300">{isRunning ? 'Running' : 'Paused'}</span>
        </div>
      </div>
    </div>
  )
}

export default SimulationPanel
