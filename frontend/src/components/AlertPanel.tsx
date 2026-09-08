import React from 'react'
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react'
import type { Alert } from '../services/api'

interface AlertPanelProps {
  alerts: Alert[]
  onDismiss?: (id: string) => void
}

const AlertPanel: React.FC<AlertPanelProps> = ({ alerts, onDismiss }) => {
  if (alerts.length === 0) {
    return null
  }

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'INFO':
        return { icon: Info, color: 'text-blue-400', bg: 'bg-blue-900/30', border: 'border-blue-700' }
      case 'WARNING':
        return { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-900/30', border: 'border-yellow-700' }
      case 'CRITICAL':
        return { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-900/30', border: 'border-red-700' }
      default:
        return { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-900/30', border: 'border-green-700' }
    }
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert) => {
        const config = getSeverityConfig(alert.severity)
        const Icon = config.icon

        return (
          <div key={alert.id} className={`flex items-start gap-3 p-4 rounded-lg border ${config.border} ${config.bg} backdrop-blur-sm`}>
            <Icon className={`${config.color} flex-shrink-0 mt-1`} size={20} />
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">{alert.severity}</p>
              <p className="text-sm text-gray-300 mt-1">{alert.message}</p>
              <p className="text-xs text-gray-500 mt-2">{new Date(alert.timestamp).toLocaleTimeString()}</p>
            </div>
            {onDismiss && (
              <button
                onClick={() => onDismiss(alert.id)}
                className="flex-shrink-0 hover:opacity-70 transition-opacity"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default AlertPanel
