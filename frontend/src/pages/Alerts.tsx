import React, { useEffect, useState } from 'react'
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Trash2,
  RefreshCw,
} from 'lucide-react'

import {
  getStoredAlerts,
  clearSystemAlerts,
  type SystemAlert,
} from '../services/alertStore'

const Alerts: React.FC = () => {
  const [alerts, setAlerts] =
    useState<SystemAlert[]>([])

  const loadAlerts = () => {
    setAlerts(getStoredAlerts())
  }

  useEffect(() => {
    loadAlerts()

    const handleUpdate = () => {
      loadAlerts()
    }

    window.addEventListener(
      'polar-alerts-updated',
      handleUpdate
    )

    window.addEventListener(
      'storage',
      handleUpdate
    )

    return () => {
      window.removeEventListener(
        'polar-alerts-updated',
        handleUpdate
      )

      window.removeEventListener(
        'storage',
        handleUpdate
      )
    }
  }, [])

  const clearAll = () => {
    clearSystemAlerts()
    setAlerts([])
  }

  const critical =
    alerts.filter(
      (a) => a.severity === 'CRITICAL'
    ).length

  const warnings =
    alerts.filter(
      (a) => a.severity === 'WARNING'
    ).length

  const info =
    alerts.filter(
      (a) => a.severity === 'INFO'
    ).length

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">

        <div>
          <h1 className="text-3xl font-bold text-white">
            Alerts & Notifications
          </h1>

          <p className="mt-1 text-sm text-slate-400">
            Live operational alerts generated from dashboard
            forecasts and simulation scenarios.
          </p>
        </div>

        <button
          onClick={loadAlerts}
          className="rounded-xl border border-slate-700 bg-slate-900 p-3 text-slate-300 hover:border-cyan-600"
        >
          <RefreshCw size={18} />
        </button>

      </div>


      <div className="grid gap-4 md:grid-cols-4">

        <Stat
          title="Total"
          value={alerts.length}
        />

        <Stat
          title="Critical"
          value={critical}
        />

        <Stat
          title="Warnings"
          value={warnings}
        />

        <Stat
          title="Information"
          value={info}
        />

      </div>


      {alerts.length === 0 ? (

        <div className="rounded-2xl border border-green-800 bg-green-950/20 p-10 text-center">

          <CheckCircle2
            size={42}
            className="mx-auto text-green-400"
          />

          <h2 className="mt-4 text-lg font-semibold text-green-300">
            No active alerts
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            The system has not detected a new operational condition.
          </p>

        </div>

      ) : (

        <div className="space-y-4">

          <div className="flex justify-end">

            <button
              onClick={clearAll}
              className="flex items-center gap-2 rounded-xl border border-red-800 px-4 py-2 text-xs text-red-300 hover:bg-red-950/30"
            >
              <Trash2 size={15} />
              Clear Alerts
            </button>

          </div>

          {alerts.map((alert) => {

            const styles =
              alert.severity === 'CRITICAL'
                ? 'border-red-700 bg-red-950/20 text-red-300'
                : alert.severity === 'WARNING'
                  ? 'border-yellow-700 bg-yellow-950/20 text-yellow-300'
                  : 'border-blue-700 bg-blue-950/20 text-blue-300'

            return (
              <div
                key={alert.id}
                className={`rounded-2xl border p-5 ${styles}`}
              >

                <div className="flex gap-4">

                  {alert.severity === 'CRITICAL' ? (
                    <AlertTriangle size={22} />
                  ) : (
                    <Bell size={22} />
                  )}

                  <div className="flex-1">

                    <div className="flex items-center justify-between">

                      <span className="text-xs font-bold">
                        {alert.severity}
                      </span>

                      <span className="text-[10px] opacity-60">
                        {new Date(
                          alert.timestamp
                        ).toLocaleTimeString()}
                      </span>

                    </div>

                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {alert.message}
                    </p>

                  </div>

                </div>

              </div>
            )
          })}

        </div>

      )}

    </div>
  )
}


const Stat = ({
  title,
  value,
}: {
  title: string
  value: number
}) => (
  <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

    <p className="text-sm text-slate-500">
      {title}
    </p>

    <p className="mt-2 text-2xl font-bold text-white">
      {value}
    </p>

  </div>
)

export default Alerts