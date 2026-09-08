import React, { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  Fuel,
  Gauge,
  Sun,
  Wind,
  Zap,
  Brain,
  RefreshCw,
  Database,
  Sparkles,
} from 'lucide-react'

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

import {
  forecastAPI,
  loadForecastAPI,
  type DateForecastResponse,
  type LoadForecast,
} from '../services/api'

import { addSystemAlert } from '../services/alertStore'


// ============================================================
// DATE HELPERS
// ============================================================

const formatLocalISO = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const addDays = (days: number): string => {
  const date = new Date()
  date.setDate(date.getDate() + days)

  return formatLocalISO(date)
}

const formatDisplayDate = (dateString: string): string => {
  const date = new Date(`${dateString}T00:00:00`)

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}


// ============================================================
// DASHBOARD
// ============================================================

const Dashboard: React.FC = () => {
  // Date selection exists ONLY on Dashboard.
  const [selectedDate, setSelectedDate] = useState(
    addDays(1)
  )

  const [forecast, setForecast] =
    useState<DateForecastResponse | null>(null)

  const [loadForecast, setLoadForecast] =
    useState<LoadForecast | null>(null)

  const [loading, setLoading] = useState(true)
  const [predicting, setPredicting] = useState(false)
  const [error, setError] =
    useState<string | null>(null)


  // ==========================================================
  // INITIAL DATE FORECAST
  // ==========================================================

  useEffect(() => {
    let cancelled = false

    const loadInitialForecast = async () => {
      try {
        setLoading(true)
        setError(null)

        const result =
          await forecastAPI.getForDate(selectedDate)

        if (!cancelled) {
          setForecast(result)
        }
      } catch (err) {
        console.error(
          'Dashboard forecast error:',
          err
        )

        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load dashboard'
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadInitialForecast()

    return () => {
      cancelled = true
    }
  }, [])


  // ==========================================================
  // HISTORICAL + FORECAST GRAPH
  // ==========================================================

  useEffect(() => {
    let cancelled = false

    const loadGraph = async () => {
      try {
        const result =
          await loadForecastAPI.getForecast()

        if (!cancelled) {
          setLoadForecast(result)
        }
      } catch (err) {
        console.warn(
          'Historical forecast graph unavailable:',
          err
        )

        if (!cancelled) {
          setLoadForecast(null)
        }
      }
    }

    void loadGraph()

    return () => {
      cancelled = true
    }
  }, [])


  // ==========================================================
  // DATE PREDICTION
  // ==========================================================

  const predictDate = async (date: string) => {
    if (!date) {
      return
    }

    try {
      setPredicting(true)
      setError(null)

      const result =
        await forecastAPI.getForDate(date)

      setSelectedDate(date)
      setForecast(result)

      // ========================================================
      // ALERTS
      // Only generate operational alerts for FUTURE forecasts.
      // Historical dates are for validation and should not create
      // live operational warnings.
      // ========================================================

      const isHistorical =
        result.load.dataType === 'HISTORICAL_ACTUAL'

      if (!isHistorical) {
        const renewableIndex =
          result.renewable.renewableIndex

        const dailyFuel =
          result.fuel.estimatedDailyFuelLitres

        const dailyLoad =
          result.load.estimatedDailyLoadKwh

        // Very low renewable availability
        if (renewableIndex < 30) {
          addSystemAlert({
            severity: 'CRITICAL',
            message:
              `Very low renewable potential for ${result.date}. Preserve battery energy and maintain generator reserve.`,
          })
        }
        // Low renewable availability
        else if (renewableIndex < 40) {
          addSystemAlert({
            severity: 'WARNING',
            message:
              `Low renewable potential for ${result.date}. Consider reducing flexible demand and preserving stored energy.`,
          })
        }

        // High fuel requirement
        if (dailyFuel > 1200) {
          addSystemAlert({
            severity: 'WARNING',
            message:
              `High fuel requirement predicted for ${result.date}: ${dailyFuel.toFixed(0)} L/day.`,
          })
        }

        // High load
        if (dailyLoad > 3500) {
          addSystemAlert({
            severity: 'CRITICAL',
            message:
              `High energy demand predicted for ${result.date}: ${dailyLoad.toFixed(0)} kWh/day. Review flexible loads.`,
          })
        }

        // Strong renewable opportunity
        if (renewableIndex >= 70) {
          addSystemAlert({
            severity: 'INFO',
            message:
              `Strong renewable conditions predicted for ${result.date}. Prioritize renewable utilization and battery charging.`,
          })
        }
      }

    } catch (err) {
      console.error(
        'Date prediction error:',
        err
      )

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to generate prediction'
      )
    } finally {
      setPredicting(false)
    }
  }


  // ==========================================================
  // GRAPH DATA
  // ==========================================================

  const chartData = useMemo(() => {
    if (!loadForecast) {
      return []
    }

    const historicalRows =
      (loadForecast.historicalHours ?? []).map(
        (
          period: string,
          index: number
        ) => ({
          period,
          historical:
            loadForecast.historical[index] ?? null,
          predicted: null,
        })
      )

    const forecastRows =
      loadForecast.hours.map(
        (
          period: string,
          index: number
        ) => ({
          period,
          historical: null,
          predicted:
            loadForecast.predicted[index] ?? null,
        })
      )

    return [
      ...historicalRows,
      ...forecastRows,
    ]
  }, [loadForecast])


  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">

        <div className="text-center">

          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-cyan-400" />

          <p className="text-slate-300">
            Generating energy forecast...
          </p>

          <p className="mt-2 text-xs text-slate-500">
            Connecting to the Polar Energy Intelligence backend
          </p>

        </div>

      </div>
    )
  }


  // ==========================================================
  // ERROR
  // ==========================================================

  if (error && !forecast) {
    return (
      <div className="rounded-2xl border border-red-800 bg-red-950/30 p-6">

        <h2 className="font-semibold text-red-300">
          Unable to load dashboard
        </h2>

        <p className="mt-2 text-sm text-slate-400">
          {error}
        </p>

        <button
          onClick={() =>
            predictDate(selectedDate)
          }
          className="mt-4 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500"
        >
          Retry
        </button>

      </div>
    )
  }


  if (!forecast) {
    return null
  }


  // ==========================================================
  // DATA
  // ==========================================================

  const load = forecast.load
  const fuel = forecast.fuel
  const renewable = forecast.renewable
  const recommendation =
    forecast.recommendation

  const isHistorical =
    load.dataType === 'HISTORICAL_ACTUAL'


  // ==========================================================
  // DISPLAY VALUES
  // ==========================================================

  const displayLoad =
    isHistorical
      ? load.actualMonthlyLoadKwh
      : load.estimatedDailyLoadKwh

  const displayFuel =
    isHistorical
      ? fuel.actualMonthlyFuelLitres
      : fuel.estimatedDailyFuelLitres


  const displayLoadValue =
    displayLoad !== null &&
    displayLoad !== undefined
      ? displayLoad.toLocaleString(
          'en-IN',
          {
            maximumFractionDigits: 0,
          }
        )
      : '—'


  const displayFuelValue =
    displayFuel !== null &&
    displayFuel !== undefined
      ? displayFuel.toLocaleString(
          'en-IN',
          {
            maximumFractionDigits: 0,
          }
        )
      : '—'


  return (
    <div className="space-y-6">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div>

        <h1 className="text-3xl font-bold text-white">
          Polar Energy Intelligence
        </h1>

        <p className="mt-1 text-sm text-slate-400">
          Date-aware energy monitoring, forecasting and
          operational decision support
        </p>

      </div>


      {/* ======================================================
          DATE SELECTOR
      ====================================================== */}

      <div className="rounded-2xl border border-cyan-900 bg-slate-900 p-5">

        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">

          <div>

            <div className="flex items-center gap-2">

              <CalendarDays
                size={20}
                className="text-cyan-400"
              />

              <h2 className="font-semibold text-white">
                Select Date
              </h2>

            </div>

            <p className="mt-1 max-w-xl text-sm text-slate-500">
              Select a historical date to verify observed Mawson
              data, or a future date to generate an ML-based forecast.
            </p>

          </div>


          <div className="flex flex-wrap gap-2">

            <input
              type="date"
              value={selectedDate}
              onChange={(event) =>
                predictDate(
                  event.target.value
                )
              }
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500"
            />

            <button
              onClick={() =>
                predictDate(addDays(1))
              }
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-xs font-medium text-slate-300 hover:border-cyan-600 hover:text-cyan-300"
            >
              Tomorrow
            </button>

            <button
              onClick={() =>
                predictDate(addDays(2))
              }
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-xs font-medium text-slate-300 hover:border-cyan-600 hover:text-cyan-300"
            >
              2 Days Later
            </button>

            <button
              onClick={() =>
                predictDate(addDays(7))
              }
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-xs font-medium text-slate-300 hover:border-cyan-600 hover:text-cyan-300"
            >
              7 Days Later
            </button>

            <button
              onClick={() =>
                predictDate(selectedDate)
              }
              disabled={predicting}
              className="flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-3 text-xs font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
            >

              <RefreshCw
                size={15}
                className={
                  predicting
                    ? 'animate-spin'
                    : ''
                }
              />

              {predicting
                ? 'Loading...'
                : 'Predict'}

            </button>

          </div>

        </div>

      </div>


      {/* ======================================================
          DATE STATUS
      ====================================================== */}

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <div>

            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Selected date
            </p>

            <h2 className="mt-1 text-2xl font-bold text-cyan-300">
              {formatDisplayDate(
                forecast.date
              )}
            </h2>

            <div className="mt-3 flex flex-wrap items-center gap-2">

              <span
                className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${
                  isHistorical
                    ? 'border-green-700 bg-green-950/30 text-green-300'
                    : 'border-cyan-700 bg-cyan-950/30 text-cyan-300'
                }`}
              >

                {isHistorical ? (
                  <Database size={14} />
                ) : (
                  <Sparkles size={14} />
                )}

                {isHistorical
                  ? 'HISTORICAL ACTUAL'
                  : 'FUTURE FORECAST'}

              </span>


              <span className="text-xs text-slate-500">
                {isHistorical
                  ? 'Source: Mawson dataset'
                  : 'Source: Random Forest + seasonal context'}
              </span>

            </div>

          </div>

        </div>


        {/* SOURCE BADGES */}

        <div className="mt-4 flex flex-wrap gap-2">

          <SourceBadge
            text={
              isHistorical
                ? 'Load: Mawson dataset'
                : 'Load: Random Forest forecast'
            }
          />

          <SourceBadge
            text={
              isHistorical
                ? 'Fuel: Mawson dataset'
                : 'Fuel: Random Forest forecast'
            }
          />

          <SourceBadge
            text={`Renewable: ${renewable.dataType}`}
          />

        </div>

      </div>


      {/* ======================================================
          KPI CARDS
      ====================================================== */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">

        <MetricCard
          title={
            isHistorical
              ? 'Actual Monthly Load'
              : 'Estimated Daily Load'
          }
          value={displayLoadValue}
          unit={
            isHistorical
              ? 'kWh/month'
              : 'kWh/day'
          }
          icon={<Zap size={22} />}
        />

        <MetricCard
          title={
            isHistorical
              ? 'Actual Monthly Fuel'
              : 'Estimated Daily Fuel'
          }
          value={displayFuelValue}
          unit={
            isHistorical
              ? 'L/month'
              : 'L/day'
          }
          icon={<Fuel size={22} />}
        />

        <MetricCard
          title="Solar Potential"
          value={renewable.solar.potential.toFixed(1)}
          unit="/ 100"
          icon={<Sun size={22} />}
        />

        <MetricCard
          title="Wind Potential"
          value={renewable.wind.potential.toFixed(1)}
          unit="/ 100"
          icon={<Wind size={22} />}
        />

        <MetricCard
          title="Renewable Index"
          value={renewable.renewableIndex.toFixed(1)}
          unit="/ 100"
          icon={<Gauge size={22} />}
        />

      </div>


      {/* ======================================================
          HISTORICAL / FORECAST EXPLANATION
      ====================================================== */}

      <div
        className={`rounded-2xl border p-5 ${
          isHistorical
            ? 'border-green-800 bg-green-950/20'
            : 'border-cyan-800 bg-cyan-950/20'
        }`}
      >

        <div className="flex items-start gap-3">

          {isHistorical ? (
            <Database
              size={21}
              className="mt-0.5 shrink-0 text-green-400"
            />
          ) : (
            <Sparkles
              size={21}
              className="mt-0.5 shrink-0 text-cyan-400"
            />
          )}

          <div>

            <p
              className={`font-semibold ${
                isHistorical
                  ? 'text-green-300'
                  : 'text-cyan-300'
              }`}
            >
              {isHistorical
                ? 'Historical Data Validation'
                : 'Future Forecast Mode'}
            </p>

            <p className="mt-1 text-sm leading-6 text-slate-400">

              {isHistorical
                ? `This date belongs to a month available in the Mawson dataset. Load (${displayLoadValue} kWh/month) and fuel (${displayFuelValue} L/month) are the actual observed monthly values.`
                : 'This date is beyond the available historical energy dataset. Load and fuel are therefore estimated using the trained Random Forest models and historical seasonal context.'}

            </p>

          </div>

        </div>

      </div>


      {/* ======================================================
          OPERATIONAL DECISION
      ====================================================== */}

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

        <div className="mb-5 flex items-center gap-3">

          <Brain
            size={24}
            className="text-cyan-400"
          />

          <div>

            <h2 className="text-xl font-semibold text-white">
              Operational Decision
            </h2>

            <p className="text-xs text-slate-500">
              Energy-management action for the selected condition
            </p>

          </div>

        </div>


        <div
          className={`rounded-xl border p-5 ${
            recommendation.severity === 'WARNING'
              ? 'border-yellow-700 bg-yellow-950/20'
              : recommendation.severity === 'OPTIMIZE'
                ? 'border-green-700 bg-green-950/20'
                : recommendation.severity === 'CRITICAL'
                  ? 'border-red-700 bg-red-950/20'
                  : 'border-blue-700 bg-blue-950/20'
          }`}
        >

          <div className="flex flex-wrap items-center justify-between gap-3">

            <span className="rounded-full border px-3 py-1 text-xs font-bold">
              {recommendation.severity}
            </span>

            <span className="text-xs text-slate-400">
              Confidence:{' '}
              {Math.round(
                recommendation.confidence * 100
              )}%
            </span>

          </div>


          <div className="mt-5 space-y-4">

            <div>

              <p className="text-xs uppercase text-slate-500">
                Situation
              </p>

              <p className="mt-1 text-sm leading-6 text-slate-300">
                {recommendation.situation}
              </p>

            </div>


            <div className="rounded-xl border border-cyan-800 bg-cyan-950/20 p-4">

              <p className="text-xs font-bold uppercase text-cyan-300">
                Recommended Action
              </p>

              <p className="mt-2 text-sm font-semibold leading-6 text-white">
                {recommendation.action}
              </p>

            </div>


            <div>

              <p className="text-xs uppercase text-slate-500">
                Why?
              </p>

              <p className="mt-1 text-sm leading-6 text-slate-400">
                {recommendation.reason}
              </p>

            </div>


            {recommendation.factors.length > 0 && (

              <div>

                <p className="text-xs uppercase text-slate-500">
                  Factors
                </p>

                <div className="mt-2 flex flex-wrap gap-2">

                  {recommendation.factors.map(
                    (factor) => (
                      <span
                        key={factor}
                        className="rounded-full bg-slate-950 px-3 py-1 text-xs text-slate-400"
                      >
                        {factor}
                      </span>
                    )
                  )}

                </div>

              </div>

            )}

          </div>

        </div>

      </div>


      {/* ======================================================
          LOAD GRAPH
      ====================================================== */}

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

        <div className="mb-5">

          <h2 className="text-lg font-semibold text-white">
            Load Forecast History
          </h2>

          <p className="text-sm text-slate-500">
            Historical Mawson observations followed by model forecast
          </p>

        </div>


        {chartData.length > 0 ? (

          <ResponsiveContainer
            width="100%"
            height={380}
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
                name="Historical Actual"
                stroke="#38bdf8"
                strokeWidth={2}
                dot={false}
                connectNulls={false}
              />

              <Line
                type="monotone"
                dataKey="predicted"
                name="Forecast"
                stroke="#22c55e"
                strokeWidth={3}
                dot
                connectNulls={false}
              />

            </LineChart>

          </ResponsiveContainer>

        ) : (

          <div className="flex h-[380px] items-center justify-center">

            <p className="text-sm text-slate-500">
              Forecast graph is unavailable right now.
            </p>

          </div>

        )}

      </div>


      {/* ======================================================
          MODEL INFORMATION
      ====================================================== */}

      <div className="grid gap-4 md:grid-cols-3">

        <InfoBox
          label="Load Source"
          value={
            isHistorical
              ? 'Mawson electricity dataset'
              : 'Random Forest forecast'
          }
        />

        <InfoBox
          label="Load MAPE"
          value={
            load.metrics.MAPE !== null
              ? `${load.metrics.MAPE.toFixed(1)}%`
              : 'N/A'
          }
        />

        <InfoBox
          label="Fuel Source"
          value={
            isHistorical
              ? 'Mawson fuel dataset'
              : 'Random Forest forecast'
          }
        />

      </div>


      {/* ======================================================
          DATA NOTE
      ====================================================== */}

      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">

        <p className="text-xs leading-5 text-slate-500">

          <span className="font-semibold text-slate-400">
            Data interpretation:
          </span>{' '}

          Historical electricity and fuel observations are monthly.
          A historical day therefore maps to its corresponding
          observed month. Future dates use model-based estimates.
          Historical renewable values use NASA daily observations;
          future renewable values use historical seasonal resource
          patterns.

        </p>

      </div>

    </div>
  )
}


// ============================================================
// METRIC CARD
// ============================================================

const MetricCard: React.FC<{
  title: string
  value: string
  unit: string
  icon: React.ReactNode
}> = ({
  title,
  value,
  unit,
  icon,
}) => (
  <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

    <div className="mb-4 flex items-center justify-between">

      <span className="text-sm text-slate-400">
        {title}
      </span>

      <span className="text-cyan-400">
        {icon}
      </span>

    </div>

    <p className="text-2xl font-bold text-white">
      {value}
    </p>

    <p className="mt-1 text-xs text-slate-500">
      {unit}
    </p>

  </div>
)


// ============================================================
// INFO BOX
// ============================================================

const InfoBox: React.FC<{
  label: string
  value: string
}> = ({
  label,
  value,
}) => (
  <div className="rounded-xl bg-slate-950 p-4">

    <p className="text-xs text-slate-500">
      {label}
    </p>

    <p className="mt-1 text-sm font-semibold text-slate-200">
      {value}
    </p>

  </div>
)


// ============================================================
// SOURCE BADGE
// ============================================================

const SourceBadge: React.FC<{
  text: string
}> = ({
  text,
}) => (
  <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-500">
    {text}
  </span>
)


export default Dashboard