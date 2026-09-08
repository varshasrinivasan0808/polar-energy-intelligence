import { useEffect } from 'react'
import { getStoredAlerts } from './services/alertStore'
import React, { useState } from 'react'
import {
  Menu,
  X,
  LayoutDashboard,
  Zap,
  Sun,
  Fuel,
  Brain,
  FlaskConical,
  BarChart3,
  Bell,
  CloudSun,
} from 'lucide-react'

import Dashboard from './pages/Dashboard'
import Alerts from './pages/Alerts'
import Analytics from './pages/Analytics'
import Weather from './pages/Weather'
import Simulation from './pages/Simulation'

// These files were reused for the new sections.
import RenewablePage from './pages/Equipment'
import FuelOptimizationPage from './pages/Settings'

type Page =
  | 'dashboard'
  | 'load'
  | 'renewable'
  | 'fuel'
  | 'weather'
  | 'simulation'
  | 'analytics'
  | 'alerts'

const navItems = [
  {
    id: 'dashboard' as Page,
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    id: 'load' as Page,
    label: 'Load Forecast',
    icon: Zap,
  },
  {
    id: 'renewable' as Page,
    label: 'Renewable Energy',
    icon: Sun,
  },
  {
    id: 'fuel' as Page,
    label: 'Fuel Optimization',
    icon: Fuel,
  },
  {
  id: 'weather' as Page,
  label: 'Weather Outlook',
  icon: CloudSun,
  },
  {
    id: 'simulation' as Page,
    label: 'Simulation',
    icon: FlaskConical,
  },
  {
    id: 'analytics' as Page,
    label: 'Analytics',
    icon: BarChart3,
  },
  {
    id: 'alerts' as Page,
    label: 'Alerts',
    icon: Bell,
  },
]

const App: React.FC = () => {
  const [currentPage, setCurrentPage] =
    useState<Page>('dashboard')

  const [sidebarOpen, setSidebarOpen] =
    useState(true)
  const [alertCount, setAlertCount] = useState(
  getStoredAlerts().length
)

useEffect(() => {
  const updateAlertCount = () => {
    setAlertCount(getStoredAlerts().length)
  }

  window.addEventListener(
    'polar-alerts-updated',
    updateAlertCount
  )

  window.addEventListener(
    'storage',
    updateAlertCount
  )

  return () => {
    window.removeEventListener(
      'polar-alerts-updated',
      updateAlertCount
    )

    window.removeEventListener(
      'storage',
      updateAlertCount
    )
  }
}, [])

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />

      case 'load':
        return <LoadForecastPage />

      case 'renewable':
        return <RenewablePage />

      case 'fuel':
        return <FuelOptimizationPage />

      case 'weather':
        return <Weather />

      case 'simulation':
        return <Simulation />

      case 'analytics':
        return <Analytics />

      case 'alerts':
        return <Alerts />

      default:
        return <Dashboard />
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      <div className="flex min-h-screen">

        {/* =====================================================
            SIDEBAR
        ===================================================== */}

        <aside
          className={`${
            sidebarOpen
              ? 'w-64'
              : 'w-20'
          } flex-shrink-0 border-r border-slate-800 bg-slate-900 transition-all duration-300`}
        >

          {/* Brand */}

          <div className="flex items-center justify-between border-b border-slate-800 p-4">

            {sidebarOpen && (
              <div>

                <h1 className="text-lg font-bold text-cyan-300">
                  Polar Energy
                </h1>

                <p className="text-xs text-slate-500">
                  Intelligence System
                </p>

              </div>
            )}

            <button
              onClick={() =>
                setSidebarOpen(
                  (previous) => !previous
                )
              }
              className="rounded-lg p-2 text-slate-300 hover:bg-slate-800"
              aria-label="Toggle sidebar"
            >

              {sidebarOpen ? (
                <X size={20} />
              ) : (
                <Menu size={20} />
              )}

            </button>

          </div>


          {/* Navigation */}

          <nav className="space-y-2 p-3">

            {navItems.map((item) => {

              const Icon = item.icon

              const active =
                currentPage === item.id

              return (

                <button
                  key={item.id}
                  onClick={() =>
                    setCurrentPage(item.id)
                  }
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition ${
                    active
                      ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-950/30'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >

                  <Icon size={20} />
                  {
                  sidebarOpen && (
                    <span className="text-sm font-medium">
                     {item.label}
                    </span>
                  )}

                  {sidebarOpen &&
                   item.id === 'alerts' &&
                   alertCount > 0 && (
                     <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                      {alertCount > 9 ? '9+' : alertCount}
                     </span>
                  )}

                </button>

              )
            })}

          </nav>


          {/* Sidebar footer */}

          {sidebarOpen && (

            <div className="absolute bottom-0 w-64 border-t border-slate-800 bg-slate-900 p-4">

              <p className="text-[10px] uppercase tracking-wider text-slate-600">
                Data sources
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Mawson + NASA POWER
              </p>

            </div>

          )}

        </aside>


        {/* =====================================================
            MAIN CONTENT
        ===================================================== */}

        <main className="min-w-0 flex-1">

          {/* Header */}

          <header className="border-b border-slate-800 bg-slate-950 px-6 py-5">

            <div className="flex flex-wrap items-center justify-between gap-4">

              <div>

                <h2 className="text-2xl font-bold text-cyan-300">
                  Polar Energy Intelligence
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  AI-driven smart energy management for polar
                  research stations
                </p>

              </div>


              <div className="text-right">

                <p className="text-xs text-slate-500">
                  Historical model data: Mawson + NASA POWER
                </p>

                <div className="mt-1 flex items-center justify-end gap-2">

                  <span className="h-2 w-2 rounded-full bg-green-400" />

                  <p className="text-xs font-semibold text-green-400">
                    Backend Connected
                  </p>

                </div>

              </div>

            </div>

          </header>


          {/* Page */}

          <section className="p-6">

            {renderPage()}

          </section>

        </main>

      </div>

    </div>
  )
}


/* =============================================================
   LOAD FORECAST PAGE
   Uses the existing real Load Forecast API.
============================================================= */

import {
  loadForecastAPI,
  type LoadForecast,
} from './services/api'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'


const LoadForecastPage: React.FC = () => {

  const [data, setData] =
    React.useState<LoadForecast | null>(null)

  const [loading, setLoading] =
    React.useState(true)

  const [error, setError] =
    React.useState<string | null>(null)


  React.useEffect(() => {

    let cancelled = false

    const fetchForecast = async () => {

      try {

        setLoading(true)
        setError(null)

        const result =
          await loadForecastAPI.getForecast()

        if (!cancelled) {
          setData(result)
        }

      } catch (err) {

        console.error(
          'Load forecast error:',
          err
        )

        if (!cancelled) {

          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load forecast'
          )

        }

      } finally {

        if (!cancelled) {
          setLoading(false)
        }

      }

    }

    fetchForecast()

    return () => {
      cancelled = true
    }

  }, [])


  if (loading) {

    return (

      <div className="flex min-h-[70vh] items-center justify-center">

        <div className="text-center">

          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-cyan-400" />

          <p className="text-slate-300">
            Loading load forecast...
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Running the trained Mawson forecasting model
          </p>

        </div>

      </div>

    )
  }


  if (error) {

    return (

      <div className="rounded-2xl border border-red-800 bg-red-950/20 p-6">

        <h2 className="font-semibold text-red-300">
          Unable to load forecast
        </h2>

        <p className="mt-2 text-sm text-slate-400">
          {error}
        </p>

        <p className="mt-3 text-xs text-slate-600">
          The date-specific forecast on the Dashboard remains
          available independently.
        </p>

      </div>

    )
  }


  if (!data) {
    return null
  }


  const chartData =
    data.hours.map(
      (period, index) => ({
        period,
        historical:
          data.historical[index] ?? null,
        predicted:
          data.predicted[index] ?? null,
      })
    )


  const averageConfidence =
    data.confidence.length > 0
      ? data.confidence.reduce(
          (sum, value) => sum + value,
          0
        ) / data.confidence.length
      : 0


  return (

    <div className="space-y-6">

      {/* Header */}

      <div>

        <h1 className="text-3xl font-bold text-white">
          Load Forecast
        </h1>

        <p className="mt-1 text-sm text-slate-400">
          Monthly electricity-demand forecasting using the
          trained Mawson Random Forest model
        </p>

      </div>


      {/* Metrics */}

      <div className="grid gap-4 md:grid-cols-3">

        <MetricBox
          title="Peak Forecast"
          value={`${data.peakLoad.toLocaleString(
            'en-IN',
            {
              maximumFractionDigits: 0,
            }
          )} kWh`}
          subtitle={data.peakTime}
        />

        <MetricBox
          title="Latest Observed"
          value={`${data.latestObservedLoad.toLocaleString(
            'en-IN',
            {
              maximumFractionDigits: 0,
            }
          )} kWh`}
          subtitle="Last available Mawson observation"
        />

        <MetricBox
          title="Model Confidence"
          value={`${(
            averageConfidence * 100
          ).toFixed(1)}%`}
          subtitle="Model confidence indicator"
        />

      </div>


      {/* Chart */}

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

        <h2 className="text-lg font-semibold text-white">
          Historical vs Predicted Load
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Chronological model forecast
        </p>


        <div className="mt-5">

          <ResponsiveContainer
            width="100%"
            height={420}
          >

            <LineChart
              data={chartData}
              margin={{
                top: 10,
                right: 20,
                left: 10,
                bottom: 10,
              }}
            >

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#334155"
              />

              <XAxis
                dataKey="period"
                stroke="#94a3b8"
              />

              <YAxis
                stroke="#94a3b8"
              />

              <Tooltip />

              <Legend />

              <Line
                type="monotone"
                dataKey="historical"
                name="Historical"
                stroke="#38bdf8"
                strokeWidth={2}
                dot={false}
              />

              <Line
                type="monotone"
                dataKey="predicted"
                name="Predicted"
                stroke="#22c55e"
                strokeWidth={3}
                dot
              />

            </LineChart>

          </ResponsiveContainer>

        </div>

      </div>


      {/* Model metrics */}

      <div className="grid gap-4 md:grid-cols-4">

        <MetricBox
          title="MAE"
          value={data.metrics.MAE.toFixed(2)}
          subtitle="Mean Absolute Error"
        />

        <MetricBox
          title="RMSE"
          value={data.metrics.RMSE.toFixed(2)}
          subtitle="Root Mean Squared Error"
        />

        <MetricBox
          title="MAPE"
          value={
            data.metrics.MAPE !== null
              ? `${data.metrics.MAPE.toFixed(2)}%`
              : 'N/A'
          }
          subtitle="Mean Absolute Percentage Error"
        />

        <MetricBox
          title="R²"
          value={data.metrics.R2.toFixed(3)}
          subtitle="Coefficient of determination"
        />

      </div>


      {/* Model info */}

      <div className="rounded-2xl border border-cyan-900 bg-cyan-950/20 p-5">

        <p className="text-xs uppercase tracking-wide text-slate-500">
          Selected model
        </p>

        <p className="mt-1 text-xl font-bold text-cyan-300">
          {data.model}
        </p>

        <p className="mt-2 text-xs leading-5 text-slate-500">
          Evaluation uses a chronological 80/20 holdout split
          from the historical Mawson dataset.
        </p>

      </div>

    </div>

  )
}


/* =============================================================
   SMALL COMPONENTS
============================================================= */

const MetricBox: React.FC<{
  title: string
  value: string
  subtitle: string
}> = ({
  title,
  value,
  subtitle,
}) => (

  <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

    <p className="text-sm text-slate-500">
      {title}
    </p>

    <p className="mt-2 text-2xl font-bold text-white">
      {value}
    </p>

    <p className="mt-1 text-xs text-slate-600">
      {subtitle}
    </p>

  </div>

)

export default App