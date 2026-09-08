import React, { useEffect, useMemo, useState } from 'react'
import {
  Brain,
  Fuel,
  Gauge,
  TrendingUp,
  Zap,
  BarChart3,
} from 'lucide-react'

import {
  loadForecastAPI,
  fuelForecastAPI,
  type LoadForecast,
  type FuelForecast,
} from '../services/api'

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'


const Analytics: React.FC = () => {
  const [loadData, setLoadData] =
    useState<LoadForecast | null>(null)

  const [fuelData, setFuelData] =
    useState<FuelForecast | null>(null)

  const [loading, setLoading] = useState(true)

  const [error, setError] =
    useState<string | null>(null)


  // ============================================================
  // LOAD REAL ML RESULTS
  // ============================================================

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true)
        setError(null)

        const load =
          await loadForecastAPI.getForecast()

        setLoadData(load)

        const fuel =
          await fuelForecastAPI.getForecast()

        setFuelData(fuel)

      } catch (err) {
        console.error(
          'Analytics loading error:',
          err
        )

        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load analytics'
        )
      } finally {
        setLoading(false)
      }
    }

    loadAnalytics()
  }, [])


  // ============================================================
  // LOAD GRAPH
  // ============================================================

  const loadChartData = useMemo(() => {
    if (!loadData) {
      return []
    }

    return loadData.hours.map(
      (period, index) => ({
        period,

        predicted:
          loadData.predicted[index] ?? 0,
      })
    )
  }, [loadData])


  // ============================================================
  // FUEL GRAPH
  // ============================================================

  const fuelChartData = useMemo(() => {
    if (!fuelData) {
      return []
    }

    return fuelData.hours.map(
      (period, index) => ({
        period,

        predicted:
          fuelData.predicted[index] ?? 0,
      })
    )
  }, [fuelData])


  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">

        <div className="text-center">

          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-cyan-400" />

          <p className="text-slate-300">
            Loading model analytics...
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Reading trained Mawson forecasting models
          </p>

        </div>

      </div>
    )
  }


  // ============================================================
  // ERROR
  // ============================================================

  if (error) {
    return (
      <div className="rounded-2xl border border-red-800 bg-red-950/20 p-6">

        <div className="flex items-center gap-3">

          <Gauge
            size={22}
            className="text-red-400"
          />

          <div>

            <h2 className="font-semibold text-red-300">
              Unable to load analytics
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              {error}
            </p>

          </div>

        </div>

      </div>
    )
  }


  return (
    <div className="space-y-6">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div>

        <div className="flex items-center gap-3">

          <BarChart3
            size={28}
            className="text-cyan-400"
          />

          <h1 className="text-3xl font-bold text-white">
            Analytics
          </h1>

        </div>

        <p className="mt-1 text-sm text-slate-400">
          Model performance, forecast trends and historical
          energy analytics from the Mawson dataset
        </p>

      </div>


      {/* ======================================================
          MODEL SUMMARY
      ====================================================== */}

      <div className="grid gap-4 md:grid-cols-2">

        {/* LOAD MODEL */}

        <ModelCard
          title="Load Forecast Model"
          model={loadData?.model ?? '—'}
          mape={
            loadData?.metrics.MAPE !== null &&
            loadData?.metrics.MAPE !== undefined
              ? `${loadData.metrics.MAPE.toFixed(2)}%`
              : 'N/A'
          }
          rmse={
            loadData?.metrics.RMSE !== undefined
              ? `${loadData.metrics.RMSE.toLocaleString(
                  'en-IN',
                  {
                    maximumFractionDigits: 0,
                  }
                )} kWh`
              : '—'
          }
          r2={
            loadData?.metrics.R2 !== undefined
              ? loadData.metrics.R2.toFixed(3)
              : '—'
          }
          icon={<Zap size={21} />}
        />


        {/* FUEL MODEL */}

        <ModelCard
          title="Fuel Forecast Model"
          model={fuelData?.model ?? '—'}
          mape={
            fuelData?.metrics.MAPE !== null &&
            fuelData?.metrics.MAPE !== undefined
              ? `${fuelData.metrics.MAPE.toFixed(2)}%`
              : 'N/A'
          }
          rmse={
            fuelData?.metrics.RMSE !== undefined
              ? `${fuelData.metrics.RMSE.toLocaleString(
                  'en-IN',
                  {
                    maximumFractionDigits: 0,
                  }
                )} L`
              : '—'
          }
          r2={
            fuelData?.metrics.R2 !== undefined
              ? fuelData.metrics.R2.toFixed(3)
              : '—'
          }
          icon={<Fuel size={21} />}
        />

      </div>


      {/* ======================================================
          KEY PERFORMANCE INDICATORS
      ====================================================== */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <KpiCard
          title="Load MAPE"
          value={
            loadData?.metrics.MAPE !== null &&
            loadData?.metrics.MAPE !== undefined
              ? `${loadData.metrics.MAPE.toFixed(2)}%`
              : 'N/A'
          }
          description="Holdout test error"
          icon={<TrendingUp size={20} />}
        />

        <KpiCard
          title="Load R²"
          value={
            loadData?.metrics.R2 !== undefined
              ? loadData.metrics.R2.toFixed(3)
              : '—'
          }
          description="Model explanatory score"
          icon={<Brain size={20} />}
        />

        <KpiCard
          title="Fuel MAPE"
          value={
            fuelData?.metrics.MAPE !== null &&
            fuelData?.metrics.MAPE !== undefined
              ? `${fuelData.metrics.MAPE.toFixed(2)}%`
              : 'N/A'
          }
          description="Holdout test error"
          icon={<Fuel size={20} />}
        />

        <KpiCard
          title="Fuel R²"
          value={
            fuelData?.metrics.R2 !== undefined
              ? fuelData.metrics.R2.toFixed(3)
              : '—'
          }
          description="Model explanatory score"
          icon={<Gauge size={20} />}
        />

      </div>


      {/* ======================================================
          LOAD FORECAST CHART
      ====================================================== */}

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

        <div className="mb-5">

          <h2 className="text-lg font-semibold text-white">
            Predicted Electricity Demand
          </h2>

          <p className="text-sm text-slate-500">
            12-month forecast generated by the trained Load model
          </p>

        </div>

        {loadChartData.length > 0 ? (

          <ResponsiveContainer
            width="100%"
            height={360}
          >

            <LineChart data={loadChartData}>

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

              <Line
                type="monotone"
                dataKey="predicted"
                name="Predicted Load"
                stroke="#22c55e"
                strokeWidth={3}
                dot
              />

            </LineChart>

          </ResponsiveContainer>

        ) : (

          <div className="flex h-[360px] items-center justify-center text-slate-500">
            Load forecast unavailable.
          </div>

        )}

      </div>


      {/* ======================================================
          FUEL FORECAST CHART
      ====================================================== */}

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

        <div className="mb-5">

          <h2 className="text-lg font-semibold text-white">
            Predicted Fuel Requirement
          </h2>

          <p className="text-sm text-slate-500">
            12-month fuel forecast from the trained Fuel model
          </p>

        </div>

        {fuelChartData.length > 0 ? (

          <ResponsiveContainer
            width="100%"
            height={360}
          >

            <BarChart data={fuelChartData}>

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

              <Bar
                dataKey="predicted"
                name="Predicted Fuel"
                fill="#38bdf8"
              />

            </BarChart>

          </ResponsiveContainer>

        ) : (

          <div className="flex h-[360px] items-center justify-center text-slate-500">
            Fuel forecast unavailable.
          </div>

        )}

      </div>


      {/* ======================================================
          PEAK INFORMATION
      ====================================================== */}

      <div className="grid gap-4 md:grid-cols-2">

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

          <div className="flex items-center gap-3">

            <Zap
              size={22}
              className="text-cyan-400"
            />

            <div>

              <p className="text-sm text-slate-500">
                Expected Peak Electricity Load
              </p>

              <p className="mt-1 text-2xl font-bold text-white">
                {loadData
                  ? `${loadData.peakLoad.toLocaleString(
                      'en-IN',
                      {
                        maximumFractionDigits: 0,
                      }
                    )} kWh`
                  : '—'}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {loadData?.peakTime ?? '—'}
              </p>

            </div>

          </div>

        </div>


        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

          <div className="flex items-center gap-3">

            <Fuel
              size={22}
              className="text-cyan-400"
            />

            <div>

              <p className="text-sm text-slate-500">
                Expected Average Fuel
              </p>

              <p className="mt-1 text-2xl font-bold text-white">
                {fuelData
                  ? `${fuelData.expectedConsumption.toLocaleString(
                      'en-IN',
                      {
                        maximumFractionDigits: 0,
                      }
                    )} L`
                  : '—'}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Trend: {fuelData?.trend ?? '—'}
              </p>

            </div>

          </div>

        </div>

      </div>


      {/* ======================================================
          MODEL INTERPRETATION
      ====================================================== */}

      <div className="rounded-2xl border border-cyan-900 bg-cyan-950/20 p-6">

        <div className="flex gap-4">

          <Brain
            size={24}
            className="mt-0.5 shrink-0 text-cyan-400"
          />

          <div>

            <h2 className="font-semibold text-cyan-300">
              Model Interpretation
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-300">
              The Load Forecast model achieved an R² of{' '}
              <span className="font-semibold text-white">
                {loadData?.metrics.R2.toFixed(3)}
              </span>{' '}
              with a MAPE of{' '}
              <span className="font-semibold text-white">
                {loadData?.metrics.MAPE?.toFixed(2)}%
              </span>
              . The Fuel Forecast model achieved an R² of{' '}
              <span className="font-semibold text-white">
                {fuelData?.metrics.R2.toFixed(3)}
              </span>{' '}
              with a MAPE of{' '}
              <span className="font-semibold text-white">
                {fuelData?.metrics.MAPE?.toFixed(2)}%
              </span>
              .
            </p>

          </div>

        </div>

      </div>


      {/* ======================================================
          DATA NOTE
      ====================================================== */}

      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">

        <p className="text-xs leading-5 text-slate-500">
          Analytics are calculated from the real Mawson historical
          electricity/fuel dataset and NASA POWER weather features.
          Model metrics shown above are from the chronological
          holdout evaluation performed during training.
        </p>

      </div>

    </div>
  )
}


// ============================================================
// MODEL CARD
// ============================================================

const ModelCard: React.FC<{
  title: string
  model: string
  mape: string
  rmse: string
  r2: string
  icon: React.ReactNode
}> = ({
  title,
  model,
  mape,
  rmse,
  r2,
  icon,
}) => (

  <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

    <div className="flex items-center gap-3">

      <span className="text-cyan-400">
        {icon}
      </span>

      <div>

        <h3 className="font-semibold text-white">
          {title}
        </h3>

        <p className="text-xs text-cyan-400">
          {model}
        </p>

      </div>

    </div>


    <div className="mt-6 grid grid-cols-3 gap-3">

      <Metric
        label="MAPE"
        value={mape}
      />

      <Metric
        label="RMSE"
        value={rmse}
      />

      <Metric
        label="R²"
        value={r2}
      />

    </div>

  </div>
)


// ============================================================
// METRIC
// ============================================================

const Metric: React.FC<{
  label: string
  value: string
}> = ({
  label,
  value,
}) => (

  <div className="rounded-xl bg-slate-950 p-3">

    <p className="text-xs text-slate-500">
      {label}
    </p>

    <p className="mt-1 text-sm font-bold text-white">
      {value}
    </p>

  </div>
)


// ============================================================
// KPI
// ============================================================

const KpiCard: React.FC<{
  title: string
  value: string
  description: string
  icon: React.ReactNode
}> = ({
  title,
  value,
  description,
  icon,
}) => (

  <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

    <div className="flex items-center justify-between">

      <div>

        <p className="text-sm text-slate-400">
          {title}
        </p>

        <p className="mt-2 text-2xl font-bold text-white">
          {value}
        </p>

        <p className="mt-1 text-xs text-slate-500">
          {description}
        </p>

      </div>

      <span className="text-cyan-400">
        {icon}
      </span>

    </div>

  </div>
)

export default Analytics