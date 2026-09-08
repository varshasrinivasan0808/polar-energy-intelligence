import React from 'react'

interface RiskBadgeProps {
  risk: number
  label?: string
}

const RiskBadge: React.FC<RiskBadgeProps> = ({ risk, label = '' }) => {
  let bgColor = 'bg-green-900/50 text-green-300'
  let borderColor = 'border-green-700'
  let riskLevel = 'LOW'

  if (risk >= 75) {
    bgColor = 'bg-red-900/50 text-red-300'
    borderColor = 'border-red-700'
    riskLevel = 'CRITICAL'
  } else if (risk >= 50) {
    bgColor = 'bg-yellow-900/50 text-yellow-300'
    borderColor = 'border-yellow-700'
    riskLevel = 'HIGH'
  } else if (risk >= 25) {
    bgColor = 'bg-blue-900/50 text-blue-300'
    borderColor = 'border-blue-700'
    riskLevel = 'MEDIUM'
  }

  return (
    <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${bgColor} ${borderColor}`}>
      {label ? label : `${risk.toFixed(0)}% - ${riskLevel}`}
    </div>
  )
}

export default RiskBadge
