import React from 'react'
import { AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react'
import type { EquipmentItem } from '../services/api'
import RiskBadge from './RiskBadge'

interface EquipmentCardProps {
  equipment: EquipmentItem
  onClick?: () => void
}

const EquipmentCard: React.FC<EquipmentCardProps> = ({ equipment, onClick }) => {
  const statusConfig = {
    HEALTHY: { color: 'text-green-400', bg: 'bg-green-900/30', icon: CheckCircle },
    CAUTION: { color: 'text-yellow-400', bg: 'bg-yellow-900/30', icon: AlertTriangle },
    CRITICAL: { color: 'text-red-400', bg: 'bg-red-900/30', icon: AlertCircle },
  }

  const config = statusConfig[equipment.status]
  const StatusIcon = config.icon

  return (
    <div
      onClick={onClick}
      className={`${
        onClick ? 'cursor-pointer hover:shadow-lg' : ''
      } p-5 rounded-lg border border-gray-700 bg-gray-900/50 backdrop-blur-sm transition-all duration-300`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <h4 className="text-lg font-semibold text-white">{equipment.name}</h4>
        <div className={`flex items-center gap-1 ${config.color}`}>
          <StatusIcon size={20} />
        </div>
      </div>

      {/* Health Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-gray-400">Health Status</span>
          <span className={`text-sm font-bold ${equipment.health > 70 ? 'text-green-400' : equipment.health > 40 ? 'text-yellow-400' : 'text-red-400'}`}>
            {equipment.health}%
          </span>
        </div>
        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              equipment.health > 70
                ? 'bg-green-500'
                : equipment.health > 40
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
            }`}
            style={{ width: `${equipment.health}%` }}
          />
        </div>
      </div>

      {/* Failure Risk */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-gray-400">Failure Risk</span>
          <RiskBadge risk={equipment.failureRisk} />
        </div>
        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              equipment.failureRisk < 30
                ? 'bg-green-500'
                : equipment.failureRisk < 60
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
            }`}
            style={{ width: `${equipment.failureRisk}%` }}
          />
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
        {equipment.temperature !== undefined && (
          <div>
            <p className="text-xs text-gray-400">Temperature</p>
            <p className="font-semibold text-white">{equipment.temperature}°C</p>
          </div>
        )}
        {equipment.vibration !== undefined && (
          <div>
            <p className="text-xs text-gray-400">Vibration</p>
            <p className="font-semibold text-white">{equipment.vibration} mm/s</p>
          </div>
        )}
        {equipment.efficiency !== undefined && (
          <div>
            <p className="text-xs text-gray-400">Efficiency</p>
            <p className="font-semibold text-white">{equipment.efficiency}%</p>
          </div>
        )}
      </div>

      {/* Maintenance Alert */}
      {equipment.maintenanceAlert && (
        <div className="p-3 rounded-lg bg-red-900/30 border border-red-700 text-xs text-red-300">
          ⚠️ {equipment.maintenanceAlert}
        </div>
      )}
    </div>
  )
}

export default EquipmentCard
