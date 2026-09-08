import React, { useEffect, useState } from 'react'
import {
  Brain,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Fuel,
  Sun,
  Wind,
  Gauge,
  RefreshCw,
  Zap,
} from 'lucide-react'

import {
  forecastAPI,
  type DateForecastResponse,
  type Recommendation,
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

const Recommendations: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(addDays(1))

  const [data, setData] =
    useState<DateForecastResponse | null>(null)

  const [loading, setLoading] = useState(true)
  const [predicting, setPredicting] = useState(false)

  const [error, setError] =
    useState<string | null>(null)

  // ==========================================================
  // LOAD DATE-SPECIFIC RECOMMENDATION
  // ==========================================================

  const loadRecommendation = async (
    date: string
  ) => {
    try {
      setPredicting(true)
      setError(null)

      const result =
        await forecastAPI.getForDate(date)

      setSelectedDate(date)
      setData(result)

    } catch (err) {
      console.error(
        'Recommendation loading error:',
        err
      )

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to generate recommendation'
      )
    } finally {
      setLoading(false)
      setPredicting(false)
    }
  }

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    loadRecommendation(addDays(1))
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
            Generating AI recommendation...
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Combining load, fuel and renewable forecasts
          </p>

        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="rounded-2xl border border-red-800 bg-red-950/20 p-6">

        <div className="flex items-center gap-3">

          <AlertTriangle
            size={22}
            className="text-red-400"
          />

          <div>

            <h2 className="font-semibold text-red-300">
              Unable to generate recommendation
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              {error}
            </p>

          </div>

        </div>

        <button
          onClick={() =>
            loadRecommendation(selectedDate)
          }
          className="mt-5 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold hover:bg-cyan-500"
        >
          Retry
        </button>

      </div>
    )
  }

  if (!data) {
    return null
  }

  const recommendation: Recommendation =
    data.recommendation

  const renewable = data.renewable

  const severity = recommendation.severity

  const severityConfig = {
    NORMAL: {
      border: 'border-blue-700',
      background: 'bg-blue-950/20',
      icon: CheckCircle2,
      iconClass: 'text-blue-400',
      badge: 'border-blue-700 bg-blue-950/40 text-blue-300',
    },

    OPTIMIZE: {
      border: 'border-green-700',
      background: 'bg-green-950/20',
      icon: TrendingUp,
      iconClass: 'text-green-400',
      badge: 'border-green-700 bg-green-950/40 text-green-300',
    },

    WARNING: {
      border: 'border-yellow-700',
      background: 'bg-yellow-950/20',
      icon: AlertTriangle,
      iconClass: 'text-yellow-400',
      badge: 'border-yellow-700 bg-yellow-950/40 text-yellow-300',
    },

    CRITICAL: {
      border: 'border-red-700',
      background: 'bg-red-950/20',
      icon: AlertTriangle,
      iconClass: 'text-red-400',
      badge: 'border-red-700 bg-red-950/40 text-red-300',
    },
  }

  const config =
    severityConfig[severity]

  const SeverityIcon =
    config.icon

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
            <Brain
              size={26}
              className="text-cyan-400"
            />
          </div>

          <div>

            <h1 className="text-3xl font-bold text-white">
              AI Recommendations
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Convert energy forecasts into actionable station
              operating decisions.
            </p>

          </div>

        </div>

      </div>


      {/* ======================================================
          DATE SELECTOR
      ====================================================== */}

      <div className="rounded-2xl border border-cyan-900 bg-slate-900 p-5">

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

          <div>

            <p className="text-sm font-semibold text-white">
              Recommendation Date
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Generate a recommendation for tomorrow,
              two days later, or any selected date.
            </p>

          </div>

          <div className="flex flex-wrap gap-2">

            <input
              type="date"
              value={selectedDate}
              onChange={(event) =>
                loadRecommendation(
                  event.target.value
                )
              }
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white"
            />

            <button
              onClick={() =>
                loadRecommendation(addDays(1))
              }
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-xs text-slate-300 hover:border-cyan-600"
            >
              Tomorrow
            </button>

            <button
              onClick={() =>
                loadRecommendation(addDays(2))
              }
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-xs text-slate-300 hover:border-cyan-600"
            >
              2 Days Later
            </button>

            <button
              onClick={() =>
                loadRecommendation(addDays(7))
              }
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-xs text-slate-300 hover:border-cyan-600"
            >
              7 Days Later
            </button>

            <button
              onClick={() =>
                loadRecommendation(selectedDate)
              }
              disabled={predicting}
              className="flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-3 text-xs font-semibold hover:bg-cyan-500 disabled:opacity-50"
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
                ? 'Analyzing...'
                : 'Generate'}

            </button>

          </div>

        </div>

      </div>


      {/* ======================================================
          DATE
      ====================================================== */}

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

        <p className="text-xs uppercase tracking-wide text-slate-500">
          Decision for
        </p>

        <h2 className="mt-1 text-2xl font-bold text-cyan-300">
          {formatDate(data.date)}
        </h2>

      </div>


      {/* ======================================================
          INPUT CONDITIONS
      ====================================================== */}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">

        <ConditionCard
          title="Estimated Load"
          value={`${data.load.estimatedDailyLoadKwh.toLocaleString(
            'en-IN',
            {
              maximumFractionDigits: 0,
            }
          )} kWh`}
          subtitle="Daily estimate"
          icon={<Zap size={20} />}
        />

        <ConditionCard
          title="Estimated Fuel"
          value={`${data.fuel.estimatedDailyFuelLitres.toLocaleString(
            'en-IN',
            {
              maximumFractionDigits: 0,
            }
          )} L`}
          subtitle="Daily requirement"
          icon={<Fuel size={20} />}
        />

        <ConditionCard
          title="Solar Potential"
          value={`${data.renewable.solar.potential.toFixed(
            1
          )}/100`}
          subtitle="Resource potential"
          icon={<Sun size={20} />}
        />

        <ConditionCard
          title="Wind Potential"
          value={`${data.renewable.wind.potential.toFixed(
            1
          )}/100`}
          subtitle="Resource potential"
          icon={<Wind size={20} />}
        />

        <ConditionCard
          title="Renewable Index"
          value={`${data.renewable.renewableIndex.toFixed(
            1
          )}/100`}
          subtitle={data.renewable.status}
          icon={<Gauge size={20} />}
        />

      </div>


      {/* ======================================================
          MAIN RECOMMENDATION
      ====================================================== */}

      <div
        className={`rounded-2xl border p-6 ${config.border} ${config.background}`}
      >

        <div className="flex flex-col gap-5 md:flex-row md:items-start">

          <div className="rounded-2xl bg-slate-950/50 p-4">

            <SeverityIcon
              size={32}
              className={config.iconClass}
            />

          </div>

          <div className="flex-1">

            <div className="flex flex-wrap items-center gap-3">

              <span
                className={`rounded-full border px-4 py-1.5 text-xs font-bold ${config.badge}`}
              >
                {severity}
              </span>

              <span className="text-xs text-slate-500">
                Confidence:{' '}
                {Math.round(
                  recommendation.confidence * 100
                )}
                %
              </span>

            </div>

            <h2 className="mt-4 text-2xl font-bold text-white">
              WHAT SHOULD WE DO NEXT?
            </h2>

            <p className="mt-3 text-lg font-semibold leading-8 text-cyan-200">
              {recommendation.action}
            </p>

          </div>

        </div>


        {/* Situation */}

        <div className="mt-6 grid gap-4 md:grid-cols-2">

          <div className="rounded-xl bg-slate-950/50 p-5">

            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Situation
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-300">
              {recommendation.situation}
            </p>

          </div>


          <div className="rounded-xl bg-slate-950/50 p-5">

            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Why?
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-300">
              {recommendation.reason}
            </p>

          </div>

        </div>


        {/* Factors */}

        <div className="mt-5">

          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
            Contributing Factors
          </p>

          <div className="flex flex-wrap gap-2">

            {recommendation.factors.map(
              (factor) => (
                <span
                  key={factor}
                  className="rounded-full bg-slate-950 px-3 py-1.5 text-xs text-slate-300"
                >
                  {factor}
                </span>
              )
            )}

          </div>

        </div>

      </div>


      {/* ======================================================
          EXPECTED IMPACT
      ====================================================== */}

      <div>

        <h2 className="mb-4 text-xl font-semibold text-white">
          Expected Impact
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

          <ImpactCard
            title="Fuel Saving Opportunity"
            value={`${recommendation.expectedImpact.fuelSaved?.toFixed(
              1
            ) ?? '0.0'} L`}
            description="Scenario-based estimate"
            icon={<Fuel size={21} />}
          />

          <ImpactCard
            title="Peak Load Reduction"
            value={`${recommendation.expectedImpact.peakLoadReduction?.toFixed(
              1
            ) ?? '0.0'}%`}
            description="Expected optimization effect"
            icon={<TrendingUp size={21} />}
          />

          <ImpactCard
            title="Renewable Utilization"
            value={`${recommendation.expectedImpact.renewableUtilization?.toFixed(
              1
            ) ?? '0.0'}%`}
            description="Resource potential index"
            icon={<Sun size={21} />}
          />

        </div>

      </div>


      {/* ======================================================
          DECISION PIPELINE
      ====================================================== */}

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

        <h2 className="text-xl font-semibold text-white">
          Decision Pipeline
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          How the recommendation is generated
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-4">

          <PipelineStep
            step="01"
            title="Forecast"
            text="Estimate future load and fuel requirement."
          />

          <PipelineStep
            step="02"
            title="Assess"
            text="Evaluate solar and wind resource potential."
          />

          <PipelineStep
            step="03"
            title="Optimize"
            text="Balance demand, renewable opportunity and fuel dependency."
          />

          <PipelineStep
            step="04"
            title="Recommend"
            text="Generate the next operational action."
          />

        </div>

      </div>


      {/* ======================================================
          DATA NOTE
      ====================================================== */}

      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">

        <p className="text-xs leading-5 text-slate-500">
          Recommendations are decision-support outputs based on the
          trained historical Mawson forecasting models and NASA POWER
          renewable-resource data. Load and fuel values are daily
          estimates derived from monthly-trained models, while fuel
          savings are scenario-based optimization estimates.
        </p>

      </div>

    </div>
  )
}



// ============================================================
// CONDITION CARD
// ============================================================

const ConditionCard: React.FC<{
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

    <p className="mt-4 text-xl font-bold text-white">
      {value}
    </p>

    <p className="mt-1 text-xs text-slate-500">
      {subtitle}
    </p>

  </div>
)


// ============================================================
// IMPACT CARD
// ============================================================

const ImpactCard: React.FC<{
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

    <div className="flex items-center gap-3">

      <span className="text-green-400">
        {icon}
      </span>

      <p className="text-sm text-slate-400">
        {title}
      </p>

    </div>

    <p className="mt-4 text-2xl font-bold text-white">
      {value}
    </p>

    <p className="mt-1 text-xs text-slate-500">
      {description}
    </p>

  </div>
)


// ============================================================
// PIPELINE STEP
// ============================================================

const PipelineStep: React.FC<{
  step: string
  title: string
  text: string
}> = ({
  step,
  title,
  text,
}) => (

  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">

    <p className="text-xs font-bold text-cyan-400">
      {step}
    </p>

    <h3 className="mt-2 font-semibold text-white">
      {title}
    </h3>

    <p className="mt-2 text-xs leading-5 text-slate-500">
      {text}
    </p>

  </div>
)

export default Recommendations