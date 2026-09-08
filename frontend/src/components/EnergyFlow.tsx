import React from 'react'
import { Zap, Battery, Wind, Fuel } from 'lucide-react'

interface EnergyFlowProps {
  load: number
  renewable: number
  battery: number
  diesel: number
  maxValue?: number
}

const EnergyFlow: React.FC<EnergyFlowProps> = ({ load, renewable, battery, diesel, maxValue = 100 }) => {
  const getPercentage = (value: number) => (value / maxValue) * 100

  return (
    <div className="p-6 rounded-lg border border-blue-700 bg-blue-900/30 backdrop-blur-sm">
      <h3 className="text-lg font-semibold text-white mb-6">Energy Flow (Real-time)</h3>

      <div className="space-y-6">
        {/* Load */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap className="text-blue-400" size={20} />
              <span className="text-sm font-semibold text-white">Current Load</span>
            </div>
            <span className="text-sm font-bold text-blue-300">{load.toFixed(1)} kW</span>
          </div>
          <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${Math.min(getPercentage(load), 100)}%` }}
            />
          </div>
        </div>

        {/* Sources */}
        <div className="grid grid-cols-3 gap-4">
          {/* Renewable */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1">
                <Wind className="text-green-400" size={18} />
                <span className="text-xs font-semibold text-white">Renewable</span>
              </div>
              <span className="text-xs font-bold text-green-300">{renewable.toFixed(0)}%</span>
            </div>
            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-green-500" style={{ width: `${renewable}%` }} />
            </div>
          </div>

          {/* Battery */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1">
                <Battery className="text-yellow-400" size={18} />
                <span className="text-xs font-semibold text-white">Battery</span>
              </div>
              <span className="text-xs font-bold text-yellow-300">{battery.toFixed(0)}%</span>
            </div>
            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-yellow-500" style={{ width: `${battery}%` }} />
            </div>
          </div>

          {/* Diesel */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1">
                <Fuel className="text-red-400" size={18} />
                <span className="text-xs font-semibold text-white">Diesel</span>
              </div>
              <span className="text-xs font-bold text-red-300">{diesel.toFixed(0)}%</span>
            </div>
            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-red-500" style={{ width: `${diesel}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EnergyFlow
