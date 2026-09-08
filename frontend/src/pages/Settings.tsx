import React, { useEffect, useState } from 'react'
import {
  Fuel,
  Battery,
  Sun,
  Wind,
  Brain,
  TrendingDown,
  CloudSun,
  RefreshCw,
  Zap,
  CalendarDays,
} from 'lucide-react'

import {
  forecastAPI,
  type DateForecastResponse,
} from '../services/api'


// ============================================================
// TYPES
// ============================================================

type MonthPlan = {
  date: string
  month: string
  data: DateForecastResponse
  batteryShare: number
  fuelShare: number
  strategy: string
}


// ============================================================
// DATE HELPERS
// ============================================================

const getMonthDate = (offset: number): string => {
  const now = new Date()

  const date = new Date(
    now.getFullYear(),
    now.getMonth() + offset,
    1
  )

  const year = date.getFullYear()

  const month = String(
    date.getMonth() + 1
  ).padStart(2, '0')

  return `${year}-${month}-01`
}


const formatMonth = (
  date: string
): string => {
  return new Date(
    `${date}T00:00:00`
  ).toLocaleDateString(
    'en-IN',
    {
      month: 'long',
      year: 'numeric',
    }
  )
}


// ============================================================
// DATA-DERIVED ENERGY MIX
//
// This is NOT measured battery dispatch data.
// It is a recommended source allocation derived from
// renewable-resource potential.
// ============================================================

const calculateEnergyMix = (
  renewableIndex: number
) => {

  const index = Math.max(
    0,
    Math.min(
      100,
      renewableIndex
    )
  )

  /*
    25% minimum battery/renewable contribution
    75% maximum battery/renewable contribution

    Higher renewable potential
    → higher battery/renewable share
    → lower fuel requirement

    Lower renewable potential
    → preserve battery
    → higher fuel contribution
  */

  const batteryShare = Math.round(
    25 + (index * 0.5)
  )

  const safeBatteryShare = Math.max(
    25,
    Math.min(
      75,
      batteryShare
    )
  )

  return {
    batteryShare: safeBatteryShare,
    fuelShare: 100 - safeBatteryShare,
  }
}


// ============================================================
// STRATEGY GENERATOR
// ============================================================

const getStrategy = (
  renewableIndex: number,
  solarPotential: number,
  windPotential: number,
  fuelLitres: number
): string => {

  if (renewableIndex >= 70) {

    return (
      'High renewable availability. Prioritize renewable energy and battery operation, shift flexible loads into renewable-rich periods, and preserve generator fuel for critical demand.'
    )

  }

  if (renewableIndex < 40) {

    return (
      'Low renewable availability. Preserve stored energy for critical demand, reduce non-essential flexible loads, and maintain sufficient generator fuel reserve.'
    )

  }

  if (windPotential > solarPotential + 15) {

    return (
      'Wind is the stronger renewable resource. Prioritize renewable utilization during favourable wind conditions while keeping fuel as backup for demand peaks.'
    )

  }

  if (solarPotential > windPotential + 15) {

    return (
      'Solar is the stronger renewable resource. Prioritize battery charging during better solar periods and reduce unnecessary generator operation.'
    )

  }

  if (fuelLitres > 35000) {

    return (
      'Fuel demand is relatively high. Reduce avoidable generator operation, use available renewable energy first, and reserve fuel for essential loads.'
    )

  }

  return (
    'Maintain a balanced energy mix, use renewable resources when available, keep the battery within a healthy operating range, and retain fuel reserve for critical demand.'
  )
}


// ============================================================
// COMPONENT
// ============================================================

const Settings: React.FC = () => {

  const [plans, setPlans] =
    useState<MonthPlan[]>([])

  const [loading, setLoading] =
    useState(true)

  const [refreshing, setRefreshing] =
    useState(false)

  const [error, setError] =
    useState<string | null>(null)


  // ==========================================================
  // LOAD CURRENT + NEXT TWO MONTHS
  // ==========================================================

  const loadFuelPlan = async (
    isRefresh = false
  ) => {

    try {

      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      setError(null)

      const dates = [
        getMonthDate(0),
        getMonthDate(1),
        getMonthDate(2),
      ]

      const responses =
        await Promise.all(
          dates.map(
            (date) =>
              forecastAPI.getForDate(
                date
              )
          )
        )

      const calculatedPlans =
        responses.map(
          (
            data,
            index
          ) => {

            const renewableIndex =
              data.renewable.renewableIndex

            const {
              batteryShare,
              fuelShare,
            } = calculateEnergyMix(
              renewableIndex
            )

            const strategy =
              getStrategy(
                renewableIndex,
                data.renewable.solar.potential,
                data.renewable.wind.potential,
                data.fuel.monthlyForecastLitres
              )

            return {
              date: dates[index],
              month: formatMonth(
                dates[index]
              ),
              data,
              batteryShare,
              fuelShare,
              strategy,
            }
          }
        )

      setPlans(
        calculatedPlans
      )

    } catch (err) {

      console.error(
        'Fuel optimization error:',
        err
      )

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load fuel optimization'
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
    loadFuelPlan()
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
            Forecasting fuel requirement...
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Analysing current and next two months
          </p>

        </div>

      </div>

    )
  }


  // ==========================================================
  // ERROR
  // ==========================================================

  if (error) {

    return (

      <div className="rounded-2xl border border-red-800 bg-red-950/20 p-6">

        <h2 className="font-semibold text-red-300">
          Unable to load fuel optimization
        </h2>

        <p className="mt-2 text-sm text-slate-400">
          {error}
        </p>

        <button
          onClick={() =>
            loadFuelPlan(true)
          }
          className="mt-5 flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500"
        >
          <RefreshCw size={15} />
          Retry
        </button>

      </div>

    )
  }


  // ==========================================================
  // SUMMARY
  // ==========================================================

  const totalFuel =
    plans.reduce(
      (
        total,
        plan
      ) =>
        total +
        plan.data.fuel.monthlyForecastLitres,
      0
    )


  const averageRenewable =
    plans.length > 0
      ? plans.reduce(
          (
            total,
            plan
          ) =>
            total +
            plan.data.renewable
              .renewableIndex,
          0
        ) / plans.length
      : 0


  const currentPlan =
    plans[0]


  return (

    <div className="space-y-6">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

        <div>

          <div className="flex items-center gap-3">

            <div className="rounded-xl bg-cyan-950/40 p-3">

              <Fuel
                size={26}
                className="text-cyan-400"
              />

            </div>

            <div>

              <h1 className="text-3xl font-bold text-white">
                Fuel Optimization
              </h1>

              <p className="mt-1 text-sm text-slate-400">
                Current-month planning plus the next two months
                of fuel forecasting and energy-source allocation.
              </p>

            </div>

          </div>

        </div>


        <button
          onClick={() =>
            loadFuelPlan(true)
          }
          disabled={refreshing}
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-300 hover:border-cyan-700 hover:text-cyan-300 disabled:opacity-50"
        >

          <RefreshCw
            size={16}
            className={
              refreshing
                ? 'animate-spin'
                : ''
            }
          />

          {refreshing
            ? 'Updating...'
            : 'Refresh Plan'}

        </button>

      </div>


      {/* ======================================================
          CURRENT PLANNING STATUS
      ====================================================== */}

      {currentPlan && (

        <div className="rounded-2xl border border-cyan-900 bg-cyan-950/20 p-5">

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

            <div>

              <div className="flex items-center gap-2">

                <CalendarDays
                  size={18}
                  className="text-cyan-400"
                />

                <p className="text-xs uppercase tracking-wide text-cyan-300">
                  Current Planning Month
                </p>

              </div>

              <h2 className="mt-1 text-2xl font-bold text-white">
                {currentPlan.month}
              </h2>

            </div>

            <span className="rounded-full border border-cyan-700 bg-cyan-950/40 px-4 py-2 text-xs font-bold text-cyan-300">
              FORECAST
            </span>

          </div>

          <p className="mt-3 text-xs leading-5 text-slate-500">
            The current calendar month is treated as a planning
            forecast because the available Mawson fuel dataset ends
            in February 2016. Live fuel consumption would require
            current station sensor data.
          </p>

        </div>

      )}


      {/* ======================================================
          SUMMARY CARDS
      ====================================================== */}

      <div className="grid gap-4 md:grid-cols-3">

        <SummaryCard
          title="Current Month Fuel"
          value={
            currentPlan
              ? `${currentPlan.data.fuel.monthlyForecastLitres.toLocaleString(
                  'en-IN',
                  {
                    maximumFractionDigits: 0,
                  }
                )} L`
              : '—'
          }
          subtitle="Forecast requirement"
          icon={<Fuel size={21} />}
        />

        <SummaryCard
          title="3-Month Fuel Requirement"
          value={`${totalFuel.toLocaleString(
            'en-IN',
            {
              maximumFractionDigits: 0,
            }
          )} L`}
          subtitle="Current + next 2 months"
          icon={<TrendingDown size={21} />}
        />

        <SummaryCard
          title="Average Renewable Index"
          value={`${averageRenewable.toFixed(1)}/100`}
          subtitle="Across planning horizon"
          icon={<Sun size={21} />}
        />

      </div>


      {/* ======================================================
          MONTHLY PLANS
      ====================================================== */}

      <div className="grid gap-6 xl:grid-cols-3">

        {plans.map(
          (
            plan,
            index
          ) => {

            const fuel =
              plan.data.fuel

            const renewable =
              plan.data.renewable

            const load =
              plan.data.load

            const isCurrent =
              index === 0


            return (

              <div
                key={plan.date}
                className={`rounded-2xl border p-5 ${
                  isCurrent
                    ? 'border-cyan-800 bg-cyan-950/10'
                    : 'border-slate-800 bg-slate-900'
                }`}
              >

                {/* MONTH */}

                <div className="flex items-start justify-between">

                  <div>

                    <p className="text-xs uppercase tracking-wide text-slate-500">

                      {isCurrent
                        ? 'Current month'
                        : `Month +${index}`}

                    </p>

                    <h2 className="mt-1 text-xl font-bold text-white">
                      {plan.month}
                    </h2>

                  </div>

                  <CloudSun
                    size={24}
                    className="text-cyan-400"
                  />

                </div>


                {/* FUEL */}

                <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-4">

                  <p className="text-xs text-slate-500">
                    Expected Fuel Requirement
                  </p>

                  <p className="mt-2 text-2xl font-bold text-white">
                    {fuel.monthlyForecastLitres.toLocaleString(
                      'en-IN',
                      {
                        maximumFractionDigits: 0,
                      }
                    )}{' '}
                    L
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    ≈{' '}
                    {fuel.estimatedDailyFuelLitres.toLocaleString(
                      'en-IN',
                      {
                        maximumFractionDigits: 0,
                      }
                    )}{' '}
                    L/day
                  </p>

                </div>


                {/* LOAD */}

                <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950 p-4">

                  <div className="flex items-center justify-between">

                    <div className="flex items-center gap-2">

                      <Zap
                        size={17}
                        className="text-yellow-400"
                      />

                      <p className="text-xs text-slate-500">
                        Expected Load
                      </p>

                    </div>

                    <p className="text-sm font-bold text-white">
                      {load.monthlyForecastKwh.toLocaleString(
                        'en-IN',
                        {
                          maximumFractionDigits: 0,
                        }
                      )}{' '}
                      kWh
                    </p>

                  </div>

                </div>


                {/* WEATHER */}

                <div className="mt-3 grid grid-cols-2 gap-3">

                  <ResourceCard
                    title="Solar"
                    value={
                      renewable.solar.value !== null
                        ? `${renewable.solar.value.toFixed(2)}`
                        : '—'
                    }
                    unit="kWh/m²/day"
                    potential={
                      renewable.solar.potential
                    }
                    icon={
                      <Sun
                        size={17}
                      />
                    }
                  />

                  <ResourceCard
                    title="Wind"
                    value={
                      renewable.wind.value !== null
                        ? `${renewable.wind.value.toFixed(2)}`
                        : '—'
                    }
                    unit="m/s"
                    potential={
                      renewable.wind.potential
                    }
                    icon={
                      <Wind
                        size={17}
                      />
                    }
                  />

                </div>


                {/* RENEWABLE INDEX */}

                <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950 p-4">

                  <div className="flex items-center justify-between">

                    <p className="text-xs text-slate-500">
                      Renewable Resource Index
                    </p>

                    <p className="text-sm font-bold text-cyan-300">
                      {renewable.renewableIndex.toFixed(
                        1
                      )}/100
                    </p>

                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">

                    <div
                      className="h-full rounded-full bg-cyan-500"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(
                            0,
                            renewable.renewableIndex
                          )
                        )}%`,
                      }}
                    />

                  </div>

                </div>


                {/* ENERGY MIX */}

                <div className="mt-5">

                  <div className="flex items-center justify-between">

                    <div>

                      <p className="text-sm font-semibold text-white">
                        Recommended Energy Mix
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Derived from renewable availability
                      </p>

                    </div>

                    <Battery
                      size={20}
                      className="text-cyan-400"
                    />

                  </div>


                  {/* MIX BAR */}

                  <div className="mt-4 flex h-5 overflow-hidden rounded-full bg-slate-800">

                    <div
                      className="bg-cyan-500"
                      style={{
                        width: `${plan.batteryShare}%`,
                      }}
                    />

                    <div
                      className="bg-orange-500"
                      style={{
                        width: `${plan.fuelShare}%`,
                      }}
                    />

                  </div>


                  {/* PERCENTAGES */}

                  <div className="mt-3 grid grid-cols-2 gap-3">

                    <div className="rounded-xl border border-cyan-800 bg-cyan-950/20 p-3">

                      <div className="flex items-center gap-2">

                        <Battery
                          size={16}
                          className="text-cyan-400"
                        />

                        <span className="text-xs text-slate-400">
                          Battery / Renewable
                        </span>

                      </div>

                      <p className="mt-2 text-2xl font-bold text-cyan-300">
                        {plan.batteryShare}%
                      </p>

                    </div>


                    <div className="rounded-xl border border-orange-800 bg-orange-950/20 p-3">

                      <div className="flex items-center gap-2">

                        <Fuel
                          size={16}
                          className="text-orange-400"
                        />

                        <span className="text-xs text-slate-400">
                          Fuel / Generator
                        </span>

                      </div>

                      <p className="mt-2 text-2xl font-bold text-orange-300">
                        {plan.fuelShare}%
                      </p>

                    </div>

                  </div>

                </div>


                {/* STRATEGY */}

                <div className="mt-5 rounded-xl border border-cyan-800 bg-cyan-950/20 p-4">

                  <p className="text-xs font-bold uppercase tracking-wide text-cyan-300">
                    Recommended Strategy
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {plan.strategy}
                  </p>

                </div>

              </div>

            )
          }
        )}

      </div>


      {/* ======================================================
          HOW IT IS CALCULATED
      ====================================================== */}

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

        <div className="flex items-center gap-3">

          <Brain
            size={23}
            className="text-cyan-400"
          />

          <div>

            <h2 className="text-xl font-semibold text-white">
              Fuel Planning Logic
            </h2>

            <p className="text-xs text-slate-500">
              Data → Forecast → Resource availability → Energy mix
            </p>

          </div>

        </div>


        <div className="mt-5 grid gap-4 md:grid-cols-4">

          <LogicStep
            number="01"
            title="Forecast Fuel"
            text="Random Forest estimates the monthly fuel requirement."
          />

          <LogicStep
            number="02"
            title="Assess Resources"
            text="Solar and wind potential are evaluated for the same planning month."
          />

          <LogicStep
            number="03"
            title="Allocate Sources"
            text="Higher renewable potential increases the recommended battery/renewable share."
          />

          <LogicStep
            number="04"
            title="Preserve Fuel"
            text="Fuel is retained as backup for critical demand and periods of weak renewable availability."
          />

        </div>

      </div>


      {/* ======================================================
          IMPORTANT NOTE
      ====================================================== */}

      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">

        <p className="text-xs leading-5 text-slate-500">

          <span className="font-semibold text-slate-400">
            Important:
          </span>{' '}

          Fuel requirements are model forecasts based on the
          historical Mawson dataset. The battery/fuel percentages
          are data-derived recommended source-allocation values
          calculated from renewable-resource potential; they are
          not measured battery-dispatch percentages because the
          available dataset does not contain battery state,
          generator dispatch or real-time station control data.

        </p>

      </div>

    </div>
  )
}


// ============================================================
// SUMMARY CARD
// ============================================================

const SummaryCard: React.FC<{
  title: string
  value: string
  subtitle: string
  icon: React.ReactNode
}> = ({
  title,
  value,
  subtitle,
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

    <p className="mt-4 text-2xl font-bold text-white">
      {value}
    </p>

    <p className="mt-1 text-xs text-slate-500">
      {subtitle}
    </p>

  </div>
)


// ============================================================
// RESOURCE CARD
// ============================================================

const ResourceCard: React.FC<{
  title: string
  value: string
  unit: string
  potential: number
  icon: React.ReactNode
}> = ({
  title,
  value,
  unit,
  potential,
  icon,
}) => (

  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">

    <div className="flex items-center gap-2">

      <span className="text-cyan-400">
        {icon}
      </span>

      <p className="text-sm text-slate-400">
        {title}
      </p>

    </div>

    <p className="mt-3 text-lg font-bold text-white">
      {value}
    </p>

    <p className="text-[11px] text-slate-600">
      {unit}
    </p>

    <p className="mt-2 text-xs font-semibold text-cyan-400">
      {potential.toFixed(1)}/100
    </p>

  </div>
)


// ============================================================
// LOGIC STEP
// ============================================================

const LogicStep: React.FC<{
  number: string
  title: string
  text: string
}> = ({
  number,
  title,
  text,
}) => (

  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">

    <p className="text-xs font-bold text-cyan-400">
      {number}
    </p>

    <h3 className="mt-2 font-semibold text-white">
      {title}
    </h3>

    <p className="mt-2 text-xs leading-5 text-slate-500">
      {text}
    </p>

  </div>
)


export default Settings