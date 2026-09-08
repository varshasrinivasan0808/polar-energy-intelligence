import React, { useEffect, useState } from 'react'
import {
  Sun,
  Wind,
  Gauge,
  Battery,
  Zap,
  CalendarDays,
  RefreshCw,
  ArrowUpRight,
} from 'lucide-react'

import {
  renewableAPI,
  type DateRenewableForecast,
} from '../services/api'

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

const formatDate = (dateString: string): string => {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString(
    'en-IN',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }
  )
}

// ============================================================
// COMPONENT
// ============================================================

const Equipment: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(addDays(1))

  const [data, setData] =
    useState<DateRenewableForecast | null>(null)

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [error, setError] =
    useState<string | null>(null)

  // ==========================================================
  // LOAD RENEWABLE FORECAST
  // ==========================================================

  const loadRenewable = async (date: string) => {
    try {
      setRefreshing(true)
      setError(null)

      const result =
        await renewableAPI.getForDate(date)

      setSelectedDate(date)
      setData(result)

    } catch (err) {
      console.error(
        'Renewable forecast error:',
        err
      )

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load renewable forecast'
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    loadRenewable(addDays(1))
  }, [])

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="text-center">

          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-cyan-400" />

          <p className="text-slate-300">
            Loading renewable resource forecast...
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Reading NASA POWER resource data
          </p>

        </div>
      </div>
    )
  }

  // ==========================================================
  // ERROR
  // ==========================================================

  if (error && !data) {
    return (
      <div className="rounded-2xl border border-red-800 bg-red-950/20 p-6">

        <h2 className="font-semibold text-red-300">
          Unable to load renewable forecast
        </h2>

        <p className="mt-2 text-sm text-slate-400">
          {error}
        </p>

        <button
          onClick={() =>
            loadRenewable(selectedDate)
          }
          className="mt-4 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold hover:bg-cyan-500"
        >
          Retry
        </button>

      </div>
    )
  }

  if (!data) {
    return null
  }

  // ==========================================================
  // STATUS
  // ==========================================================

  const statusConfig = {
    HIGH: {
      label: 'HIGH',
      border: 'border-green-700',
      background: 'bg-green-950/20',
      text: 'text-green-300',
    },

    MODERATE: {
      label: 'MODERATE',
      border: 'border-yellow-700',
      background: 'bg-yellow-950/20',
      text: 'text-yellow-300',
    },

    LOW: {
      label: 'LOW',
      border: 'border-red-700',
      background: 'bg-red-950/20',
      text: 'text-red-300',
    },
  }

  const status =
    statusConfig[data.status]

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="space-y-6">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div>

        <div className="flex items-center gap-3">

          <div className="rounded-xl bg-cyan-950/40 p-2">
            <Sun
              size={26}
              className="text-cyan-400"
            />
          </div>

          <div>

            <h1 className="text-3xl font-bold text-white">
              Renewable Energy
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Date-specific solar and wind resource assessment
              for polar station energy planning.
            </p>

          </div>

        </div>

      </div>


      {/* ======================================================
          DATE SELECTOR
      ====================================================== */}

      <div className="rounded-2xl border border-cyan-900 bg-slate-900 p-5">

        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">

          <div>

            <div className="flex items-center gap-2">

              <CalendarDays
                size={19}
                className="text-cyan-400"
              />

              <h2 className="font-semibold text-white">
                Resource Forecast Date
              </h2>

            </div>

            <p className="mt-1 text-xs text-slate-500">
              Evaluate renewable potential for tomorrow,
              two days later, or a selected date.
            </p>

          </div>


          <div className="flex flex-wrap gap-2">

            <input
              type="date"
              value={selectedDate}
              onChange={(event) =>
                loadRenewable(
                  event.target.value
                )
              }
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500"
            />

            <button
              onClick={() =>
                loadRenewable(addDays(1))
              }
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-xs text-slate-300 hover:border-cyan-600"
            >
              Tomorrow
            </button>

            <button
              onClick={() =>
                loadRenewable(addDays(2))
              }
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-xs text-slate-300 hover:border-cyan-600"
            >
              2 Days Later
            </button>

            <button
              onClick={() =>
                loadRenewable(addDays(7))
              }
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-xs text-slate-300 hover:border-cyan-600"
            >
              7 Days Later
            </button>

            <button
              onClick={() =>
                loadRenewable(selectedDate)
              }
              disabled={refreshing}
              className="flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-3 text-xs font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
            >

              <RefreshCw
                size={15}
                className={
                  refreshing
                    ? 'animate-spin'
                    : ''
                }
              />

              {refreshing
                ? 'Updating...'
                : 'Refresh'}

            </button>

          </div>

        </div>

      </div>


      {/* ======================================================
          DATE + STATUS
      ====================================================== */}

      <div
        className={`rounded-2xl border p-5 ${status.border} ${status.background}`}
      >

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <p className="text-xs uppercase tracking-wide text-slate-500">
              Renewable outlook
            </p>

            <h2 className="mt-1 text-2xl font-bold text-white">
              {formatDate(data.date)}
            </h2>

          </div>

          <span
            className={`w-fit rounded-full border px-4 py-2 text-xs font-bold ${status.text}`}
          >
            {status.label} RESOURCE POTENTIAL
          </span>

        </div>

      </div>


      {/* ======================================================
          MAIN KPI CARDS
      ====================================================== */}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

        <ResourceCard
          title="Solar Potential"
          value={`${data.solar.potential.toFixed(1)}`}
          unit="/ 100"
          detail={
            data.solar.value !== null
              ? `${data.solar.value} kWh/m²/day`
              : 'No value available'
          }
          icon={<Sun size={22} />}
        />

        <ResourceCard
          title="Wind Potential"
          value={`${data.wind.potential.toFixed(1)}`}
          unit="/ 100"
          detail={
            data.wind.value !== null
              ? `${data.wind.value} m/s`
              : 'No value available'
          }
          icon={<Wind size={22} />}
        />

        <ResourceCard
          title="Renewable Index"
          value={`${data.renewableIndex.toFixed(1)}`}
          unit="/ 100"
          detail={data.status}
          icon={<Gauge size={22} />}
        />

      </div>


      {/* ======================================================
          SOLAR + WIND
      ====================================================== */}

      <div className="grid gap-6 lg:grid-cols-2">

        {/* SOLAR */}

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

          <div className="flex items-center gap-3">

            <div className="rounded-xl bg-yellow-950/30 p-3">
              <Sun
                size={24}
                className="text-yellow-400"
              />
            </div>

            <div>

              <h2 className="text-lg font-semibold text-white">
                Solar Resource
              </h2>

              <p className="text-xs text-slate-500">
                NASA POWER surface solar radiation
              </p>

            </div>

          </div>


          <div className="mt-6">

            <div className="flex items-end justify-between">

              <div>

                <p className="text-3xl font-bold text-white">
                  {data.solar.value !== null
                    ? data.solar.value
                    : '—'}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  kWh/m²/day
                </p>

              </div>

              <p className="text-sm font-semibold text-yellow-400">
                {data.solar.potential.toFixed(1)}/100
              </p>

            </div>


            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-800">

              <div
                className="h-full rounded-full bg-yellow-500"
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(
                      0,
                      data.solar.potential
                    )
                  )}%`,
                }}
              />

            </div>

          </div>

        </div>


        {/* WIND */}

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

          <div className="flex items-center gap-3">

            <div className="rounded-xl bg-cyan-950/30 p-3">
              <Wind
                size={24}
                className="text-cyan-400"
              />
            </div>

            <div>

              <h2 className="text-lg font-semibold text-white">
                Wind Resource
              </h2>

              <p className="text-xs text-slate-500">
                NASA POWER wind-speed assessment
              </p>

            </div>

          </div>


          <div className="mt-6">

            <div className="flex items-end justify-between">

              <div>

                <p className="text-3xl font-bold text-white">
                  {data.wind.value !== null
                    ? data.wind.value
                    : '—'}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  m/s
                </p>

              </div>

              <p className="text-sm font-semibold text-cyan-400">
                {data.wind.potential.toFixed(1)}/100
              </p>

            </div>


            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-800">

              <div
                className="h-full rounded-full bg-cyan-500"
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(
                      0,
                      data.wind.potential
                    )
                  )}%`,
                }}
              />

            </div>

          </div>

        </div>

      </div>


      {/* ======================================================
          ENERGY MANAGEMENT GUIDANCE
      ====================================================== */}

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

        <div className="flex items-center gap-3">

          <BrainIcon />

          <div>

            <h2 className="text-xl font-semibold text-white">
              Energy Management Guidance
            </h2>

            <p className="text-xs text-slate-500">
              Renewable-resource-based operational guidance
            </p>

          </div>

        </div>


        <div className="mt-6 grid gap-4 md:grid-cols-3">

          <GuidanceCard
            icon={<Battery size={19} />}
            title="Battery"
            text={
              data.renewableIndex >= 70
                ? 'Prioritize charging during the renewable-rich window.'
                : data.renewableIndex < 40
                  ? 'Preserve battery energy for critical demand periods.'
                  : 'Maintain balanced charging and discharge operation.'
            }
          />

          <GuidanceCard
            icon={<Zap size={19} />}
            title="Flexible Loads"
            text={
              data.renewableIndex >= 70
                ? 'Schedule flexible loads when renewable potential is strongest.'
                : data.renewableIndex < 40
                  ? 'Reduce or defer non-essential flexible loads.'
                  : 'Keep flexible loads balanced around expected demand.'
            }
          />

          <GuidanceCard
            icon={<ArrowUpRight size={19} />}
            title="Generator Strategy"
            text={
              data.renewableIndex >= 70
                ? 'Minimize unnecessary generator use where renewable resources can support demand.'
                : data.renewableIndex < 40
                  ? 'Maintain adequate generator reserve for critical loads.'
                  : 'Maintain normal generator readiness and monitor conditions.'
            }
          />

        </div>

      </div>


      {/* ======================================================
          DATA NOTE
      ====================================================== */}

      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">

        <p className="text-xs leading-5 text-slate-500">
          Renewable values represent normalized resource potential
          based on NASA POWER solar and wind data. They are not
          measurements of actual renewable electricity generation.
          For dates beyond the available NASA observations, the
          system uses historical seasonal resource patterns.
        </p>

      </div>

    </div>
  )
}


// ============================================================
// COMPONENTS
// ============================================================

const ResourceCard: React.FC<{
  title: string
  value: string
  unit: string
  detail: string
  icon: React.ReactNode
}> = ({
  title,
  value,
  unit,
  detail,
  icon,
}) => (
  <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

    <div className="flex items-center justify-between">

      <p className="text-sm text-slate-400">
        {title}
      </p>

      <span className="text-cyan-400">
        {icon}
      </span>

    </div>

    <div className="mt-4 flex items-baseline gap-1">

      <span className="text-3xl font-bold text-white">
        {value}
      </span>

      <span className="text-sm text-slate-500">
        {unit}
      </span>

    </div>

    <p className="mt-2 text-xs text-slate-500">
      {detail}
    </p>

  </div>
)


const GuidanceCard: React.FC<{
  icon: React.ReactNode
  title: string
  text: string
}> = ({
  icon,
  title,
  text,
}) => (
  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">

    <div className="flex items-center gap-2">

      <span className="text-cyan-400">
        {icon}
      </span>

      <h3 className="font-semibold text-white">
        {title}
      </h3>

    </div>

    <p className="mt-3 text-sm leading-6 text-slate-400">
      {text}
    </p>

  </div>
)


const BrainIcon: React.FC = () => (
  <div className="rounded-xl bg-cyan-950/40 p-2">
    <Gauge
      size={22}
      className="text-cyan-400"
    />
  </div>
)

export default Equipment