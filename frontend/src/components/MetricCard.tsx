import React from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface MetricCardProps {
  label: string
  value: number | string
  unit?: string
  icon?: React.ReactNode
  trend?: 'up' | 'down' | 'stable'
  trendPercent?: number
  color?: 'blue' | 'green' | 'yellow' | 'red'
  onClick?: () => void
}

const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit,
  icon,
  trend,
  trendPercent,
  color = 'blue',
  onClick,
}) => {
  const colorClasses = {
    blue: 'bg-blue-900/30 border-blue-700',
    green: 'bg-green-900/30 border-green-700',
    yellow: 'bg-yellow-900/30 border-yellow-700',
    red: 'bg-red-900/30 border-red-700',
  }

  const trendColorClasses = {
    up: 'text-red-400',
    down: 'text-green-400',
    stable: 'text-blue-400',
  }

  return (
    <div
      onClick={onClick}
      className={`${
        onClick ? 'cursor-pointer hover:shadow-lg' : ''
      } p-6 rounded-lg border ${colorClasses[color]} backdrop-blur-sm transition-all duration-300`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-400 mb-2">{label}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">
              {typeof value === 'number' ? value.toFixed(1) : value}
            </span>
            {unit && <span className="text-sm text-gray-400">{unit}</span>}
          </div>
          {trend && trendPercent !== undefined && (
            <div className={`flex items-center gap-1 mt-2 ${trendColorClasses[trend]}`}>
              {trend === 'up' && <TrendingUp size={16} />}
              {trend === 'down' && <TrendingDown size={16} />}
              <span className="text-xs font-semibold">{trendPercent}%</span>
            </div>
          )}
        </div>
        {icon && <div className="text-3xl opacity-50">{icon}</div>}
      </div>
    </div>
  )
}

export default MetricCard
