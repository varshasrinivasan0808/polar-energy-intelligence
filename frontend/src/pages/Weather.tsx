import React, { useEffect, useState } from 'react'
import {
  Sun,
  Wind,
  CloudSun,
  Thermometer,
  Droplets,
  RefreshCw,
  CalendarDays,
} from 'lucide-react'

import {
  renewableAPI,
  type DateRenewableForecast,
} from '../services/api'

type WeatherDay = {
  date: string
  data: DateRenewableForecast
}

const formatISO = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const getDateAfter = (days: number): string => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return formatISO(date)
}

const formatDate = (date: string): string => {
  return new Date(`${date}T00:00:00`).toLocaleDateString(
    'en-IN',
    {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    }
  )
}

const Weather: React.FC = () => {
  const [days, setDays] = useState<WeatherDay[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadWeather = async () => {
    try {
      setRefreshing(true)
      setError(null)

      const dates = [
        getDateAfter(0),
        getDateAfter(1),
        getDateAfter(2),
        getDateAfter(3),
        getDateAfter(4),
      ]

      const results = await Promise.all(
        dates.map((date) =>
          renewableAPI.getForDate(date)
        )
      )

      setDays(
        results.map((data, index) => ({
          date: dates[index],
          data,
        }))
      )
    } catch (err) {
      console.error(err)

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load weather outlook'
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadWeather()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-cyan-400" />

          <p className="text-slate-300">
            Loading weather outlook...
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Analysing available polar weather and renewable-resource data
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-800 bg-red-950/20 p-6">
        <p className="font-semibold text-red-300">
          Unable to load weather outlook
        </p>

        <p className="mt-2 text-sm text-slate-400">
          {error}
        </p>

        <button
          onClick={loadWeather}
          className="mt-4 flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white"
        >
          <RefreshCw size={15} />
          Retry
        </button>
      </div>
    )
  }

  const today = days[0]

  return (
    <div className="space-y-6">

      {/* HEADER */}

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">

            <div className="rounded-xl bg-cyan-950/40 p-3">
              <CloudSun
                size={26}
                className="text-cyan-400"
              />
            </div>

            <div>
              <h1 className="text-3xl font-bold text-white">
                Weather & Resource Outlook
              </h1>

              <p className="mt-1 text-sm text-slate-400">
                Present conditions and upcoming solar/wind conditions
                for energy planning.
              </p>
            </div>

          </div>
        </div>

        <button
          onClick={loadWeather}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-xs text-slate-300 hover:border-cyan-600 disabled:opacity-50"
        >
          <RefreshCw
            size={15}
            className={
              refreshing
                ? 'animate-spin'
                : ''
            }
          />
          Refresh
        </button>
      </div>


      {/* TODAY */}

      {today && (
        <div className="rounded-2xl border border-cyan-900 bg-cyan-950/20 p-6">

          <div className="flex items-center gap-2">
            <CalendarDays
              size={18}
              className="text-cyan-400"
            />

            <p className="text-xs uppercase tracking-wide text-cyan-300">
              Present outlook
            </p>
          </div>

          <h2 className="mt-2 text-2xl font-bold text-white">
            {formatDate(today.date)}
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-4">

            <WeatherMetric
              title="Solar Resource"
              value={`${today.data.solar.value?.toFixed(2) ?? '—'}`}
              unit="kWh/m²/day"
              icon={<Sun size={21} />}
            />

            <WeatherMetric
              title="Wind Speed"
              value={`${today.data.wind.value?.toFixed(2) ?? '—'}`}
              unit="m/s"
              icon={<Wind size={21} />}
            />

            <WeatherMetric
              title="Renewable Index"
              value={today.data.renewableIndex.toFixed(1)}
              unit="/100"
              icon={<CloudSun size={21} />}
            />

            <WeatherMetric
              title="Resource Status"
              value={today.data.status}
              unit=""
              icon={<Thermometer size={21} />}
            />

          </div>

          <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Energy planning guidance
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-300">
              {today.data.recommendedAction}
            </p>
          </div>

        </div>
      )}


      {/* NEXT 5 DAYS */}

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

        <div className="mb-5">
          <h2 className="text-xl font-semibold text-white">
            Next Few Days
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Solar and wind resource outlook used for energy planning.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">

          {days.map((day) => (

            <div
              key={day.date}
              className="rounded-xl border border-slate-800 bg-slate-950 p-4"
            >

              <p className="text-sm font-semibold text-white">
                {formatDate(day.date)}
              </p>

              <div className="mt-4 space-y-4">

                <div>
                  <div className="flex items-center gap-2">
                    <Sun
                      size={16}
                      className="text-yellow-400"
                    />

                    <span className="text-xs text-slate-500">
                      Solar
                    </span>
                  </div>

                  <p className="mt-1 text-sm font-bold text-white">
                    {day.data.solar.value?.toFixed(2) ?? '—'} kWh/m²/day
                  </p>

                  <div className="mt-2 h-1.5 rounded-full bg-slate-800">

                    <div
                      className="h-full rounded-full bg-yellow-500"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(
                            0,
                            day.data.solar.potential
                          )
                        )}%`,
                      }}
                    />

                  </div>
                </div>


                <div>
                  <div className="flex items-center gap-2">
                    <Wind
                      size={16}
                      className="text-cyan-400"
                    />

                    <span className="text-xs text-slate-500">
                      Wind
                    </span>
                  </div>

                  <p className="mt-1 text-sm font-bold text-white">
                    {day.data.wind.value?.toFixed(2) ?? '—'} m/s
                  </p>

                  <div className="mt-2 h-1.5 rounded-full bg-slate-800">

                    <div
                      className="h-full rounded-full bg-cyan-500"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(
                            0,
                            day.data.wind.potential
                          )
                        )}%`,
                      }}
                    />

                  </div>
                </div>


                <div className="rounded-lg bg-slate-900 p-3">
                  <p className="text-xs text-slate-500">
                    Renewable index
                  </p>

                  <p className="mt-1 text-lg font-bold text-cyan-300">
                    {day.data.renewableIndex.toFixed(1)}
                  </p>

                  <p className="text-[10px] text-slate-600">
                    {day.data.status}
                  </p>
                </div>

              </div>

            </div>

          ))}

        </div>

      </div>


      {/* WEATHER → ENERGY */}

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

        <div className="flex items-center gap-3">

          <Droplets
            size={21}
            className="text-cyan-400"
          />

          <div>
            <h2 className="text-xl font-semibold text-white">
              Weather-to-Energy Impact
            </h2>

            <p className="text-xs text-slate-500">
              How environmental conditions affect station energy planning
            </p>
          </div>

        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">

          <Impact
            title="Strong solar period"
            text="Increase renewable utilization and prioritize battery charging where available."
          />

          <Impact
            title="Strong wind period"
            text="Prioritize wind-supported renewable operation and reduce unnecessary generator loading."
          />

          <Impact
            title="Weak renewable period"
            text="Preserve stored energy, reduce flexible loads and maintain fuel reserve for critical demand."
          />

        </div>

      </div>


      {/* DATA NOTE */}

      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">

        <p className="text-xs leading-5 text-slate-500">
          Weather/resource values shown here are based on the renewable
          data currently available through the backend. Historical dates
          use NASA daily observations, while future dates use historical
          seasonal resource patterns. This page should therefore be
          presented as an energy-resource outlook, not as a live
          meteorological sensor feed.
        </p>

      </div>

    </div>
  )
}


// ============================================================
// COMPONENTS
// ============================================================

const WeatherMetric: React.FC<{
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
  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">

    <div className="flex items-center justify-between">

      <p className="text-xs text-slate-500">
        {title}
      </p>

      <span className="text-cyan-400">
        {icon}
      </span>

    </div>

    <p className="mt-3 text-xl font-bold text-white">
      {value}
    </p>

    {unit && (
      <p className="mt-1 text-[11px] text-slate-600">
        {unit}
      </p>
    )}

  </div>
)


const Impact: React.FC<{
  title: string
  text: string
}> = ({
  title,
  text,
}) => (
  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">

    <h3 className="font-semibold text-white">
      {title}
    </h3>

    <p className="mt-2 text-xs leading-5 text-slate-500">
      {text}
    </p>

  </div>
)

export default Weather