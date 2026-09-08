import React from 'react'
import { AlertCircle, CheckCircle, Info, Clock, TrendingDown } from 'lucide-react'
import type { Recommendation } from '../services/api'

interface RecommendationCardProps {
  recommendation: Recommendation
  onClick?: () => void
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({ recommendation, onClick }) => {
  const severityConfig = {
    NORMAL: {
      bg: 'bg-blue-900/40',
      border: 'border-blue-600',
      badge: 'bg-blue-600',
      icon: Info,
      textColor: 'text-blue-300',
    },
    OPTIMIZE: {
      bg: 'bg-green-900/40',
      border: 'border-green-600',
      badge: 'bg-green-600',
      icon: CheckCircle,
      textColor: 'text-green-300',
    },
    WARNING: {
      bg: 'bg-yellow-900/40',
      border: 'border-yellow-600',
      badge: 'bg-yellow-600',
      icon: AlertCircle,
      textColor: 'text-yellow-300',
    },
    CRITICAL: {
      bg: 'bg-red-900/40',
      border: 'border-red-600',
      badge: 'bg-red-600',
      icon: AlertCircle,
      textColor: 'text-red-300',
    },
  }

  const config = severityConfig[recommendation.severity]
  const IconComponent = config.icon

  return (
    <div
      onClick={onClick}
      className={`${
        onClick ? 'cursor-pointer hover:shadow-lg' : ''
      } p-6 rounded-lg border ${config.border} ${config.bg} backdrop-blur-sm transition-all duration-300`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <IconComponent className={config.textColor} size={24} />
          <div>
            <h3 className="text-lg font-bold text-white">{recommendation.severity}</h3>
            <p className="text-xs text-gray-400">Confidence: {(recommendation.confidence * 100).toFixed(0)}%</p>
          </div>
        </div>
      </div>

      {/* Situation */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-gray-300 uppercase mb-1">Situation</p>
        <p className="text-sm text-gray-200 leading-relaxed">{recommendation.situation}</p>
      </div>

      {/* Recommended Action - HIGHLIGHTED */}
      <div className="mb-4 p-4 bg-black/30 rounded-lg border-l-4 border-blue-500">
        <p className="text-xs font-semibold text-blue-300 uppercase mb-2">✓ Recommended Action</p>
        <p className="text-base font-bold text-blue-100">{recommendation.action}</p>
      </div>

      {/* Reason */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-gray-300 uppercase mb-1">Why</p>
        <p className="text-sm text-gray-300">{recommendation.reason}</p>
      </div>

      {/* Contributing Factors */}
      {recommendation.factors.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-300 uppercase mb-2">Key Factors</p>
          <div className="flex flex-wrap gap-2">
            {recommendation.factors.map((factor, idx) => (
              <span key={idx} className="text-xs bg-gray-700/50 text-gray-300 px-3 py-1 rounded-full">
                {factor}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Expected Impact */}
      <div className="mb-4 p-4 rounded-lg bg-gray-900/50 border border-gray-700">
        <p className="text-xs font-semibold text-gray-300 uppercase mb-3 flex items-center gap-2">
          <TrendingDown size={14} /> Expected Impact
        </p>
        <div className="grid grid-cols-2 gap-3">
          {recommendation.expectedImpact.fuelSaved !== undefined && (
            <div>
              <p className="text-xs text-gray-400">Fuel Saved</p>
              <p className="text-sm font-bold text-green-400">{recommendation.expectedImpact.fuelSaved} L</p>
            </div>
          )}
          {recommendation.expectedImpact.peakLoadReduction !== undefined && (
            <div>
              <p className="text-xs text-gray-400">Peak Load Reduction</p>
              <p className="text-sm font-bold text-green-400">{recommendation.expectedImpact.peakLoadReduction}%</p>
            </div>
          )}
          {recommendation.expectedImpact.renewableUtilization !== undefined && (
            <div>
              <p className="text-xs text-gray-400">Renewable Utilization</p>
              <p className="text-sm font-bold text-green-400">{recommendation.expectedImpact.renewableUtilization}%</p>
            </div>
          )}
          {recommendation.expectedImpact.failureRiskReduction !== undefined && (
            <div>
              <p className="text-xs text-gray-400">Failure Risk Reduction</p>
              <p className="text-sm font-bold text-green-400">{recommendation.expectedImpact.failureRiskReduction}%</p>
            </div>
          )}
        </div>
      </div>

      {/* Time Window */}
      <div className="flex items-center gap-2 text-sm text-gray-300">
        <Clock size={16} />
        <span>{recommendation.timeWindow}</span>
      </div>
    </div>
  )
}

export default RecommendationCard
