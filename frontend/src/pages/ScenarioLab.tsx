import React, { useMemo, useState } from 'react'
import {
  Activity,
  Battery,
  Cloud,
  Gauge,
  Play,
  RotateCcw,
  Settings2,
  Snowflake,
  Sun,
  Wind,
  Zap,
} from 'lucide-react'

const ScenarioLab: React.FC = () => {
  const [temperature, setTemperature] = useState(-19)
  const [windSpeed, setWindSpeed] = useState(18)
  const [batterySoc, setBatterySoc] = useState(74)
  const [demandMultiplier, setDemandMultiplier] = useState(1)
  const [renewableAvailability, setRenewableAvailability] = useState(100)
  const [fuelInventory, setFuelInventory] = useState(18420)
  const [cloudCover, setCloudCover] = useState(32)

  const [hasRun, setHasRun] = useState(false)

  const simulation = useMemo(() => {
    /*
     * Simple scenario calculation.
     *
     * This is intentionally isolated from the existing ML models.
     * It allows Scenario Lab to work without changing the deployed
     * Load Forecast / Fuel Optimization pipeline.
     */

    const windContribution = Math.min(windSpeed * 2.2, 45)
    const solarContribution =
      Math.max(0, 100 - cloudCover) * 0.35

    const renewable =
      ((windContribution + solarContribution) *
        (renewableAvailability / 100))

    const effectiveRenewable = Math.min(renewable, 100)

    const temperaturePenalty =
      temperature < -10
        ? Math.abs(temperature + 10) * 0.7
        : 0

    const demand =
      demandMultiplier * 100 + temperaturePenalty

    const batterySupport =
      batterySoc > 60
        ? 15
        : batterySoc > 30
          ? 8
          : 2

    const renewableUsed = Math.min(
      effectiveRenewable,
      demand
    )

    const batteryUsed = Math.min(
      batterySupport,
      Math.max(0, demand - renewableUsed)
    )

    const fuelRequired = Math.max(
      0,
      demand - renewableUsed - batteryUsed
    )

    const fuelSaved = Math.max(
      0,
      42 - fuelRequired * 0.25
    )

    const autonomyGain =
      batterySoc >= 70
        ? 0.3
        : batterySoc >= 40
          ? 0.15
          : 0.05

    let risk = 'LOW'

    if (
      batterySoc < 30 ||
      fuelInventory < 5000 ||
      renewableUsed < 35
    ) {
      risk = 'HIGH'
    } else if (
      batterySoc < 50 ||
      fuelInventory < 10000 ||
      renewableUsed < 55
    ) {
      risk = 'MEDIUM'
    }

    const recommendations: string[] = []

    if (renewableUsed < 60) {
      recommendations.push(
        'Prioritize available renewable generation.'
      )
    }

    if (batterySoc > 70) {
      recommendations.push(
        'Use battery support during renewable shortfalls.'
      )
    }

    if (batterySoc < 35) {
      recommendations.push(
        'Preserve battery charge for critical loads.'
      )
    }

    if (demandMultiplier > 1.1) {
      recommendations.push(
        'Reduce non-critical loads during the event.'
      )
    }

    if (fuelInventory < 10000) {
      recommendations.push(
        'Preserve fuel reserve and avoid unnecessary generator usage.'
      )
    }

    if (recommendations.length === 0) {
      recommendations.push(
        'Maintain the current dispatch strategy and monitor conditions.'
      )
    }

    return {
      renewableUsed,
      batteryUsed,
      fuelRequired,
      fuelSaved,
      autonomyGain,
      risk,
      recommendations,
    }
  }, [
    temperature,
    windSpeed,
    batterySoc,
    demandMultiplier,
    renewableAvailability,
    fuelInventory,
    cloudCover,
  ])

  const resetScenario = () => {
    setTemperature(-19)
    setWindSpeed(18)
    setBatterySoc(74)
    setDemandMultiplier(1)
    setRenewableAvailability(100)
    setFuelInventory(18420)
    setCloudCover(32)
    setHasRun(false)
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-500/10 p-3">
            <Settings2 className="h-6 w-6 text-blue-400" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-white">
              Scenario Lab
            </h1>

            <p className="text-sm text-slate-400">
              Explore energy-management scenarios under polar
              operating conditions.
            </p>
          </div>
        </div>
      </div>

      {/* Scenario Controls */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Left: Inputs */}
        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-6">

          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Scenario Inputs
              </h2>

              <p className="text-sm text-slate-400">
                Adjust station conditions and run the scenario.
              </p>
            </div>

            <Snowflake className="h-5 w-5 text-cyan-400" />
          </div>

          <div className="space-y-6">

            {/* Temperature */}
            <div>
              <div className="mb-2 flex justify-between">
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <Snowflake className="h-4 w-4" />
                  Exterior temperature
                </label>

                <span className="font-semibold text-white">
                  {temperature} °C
                </span>
              </div>

              <input
                type="range"
                min="-40"
                max="5"
                value={temperature}
                onChange={(e) =>
                  setTemperature(Number(e.target.value))
                }
                className="w-full accent-blue-500"
              />
            </div>

            {/* Wind */}
            <div>
              <div className="mb-2 flex justify-between">
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <Wind className="h-4 w-4" />
                  Wind speed
                </label>

                <span className="font-semibold text-white">
                  {windSpeed} m/s
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="40"
                value={windSpeed}
                onChange={(e) =>
                  setWindSpeed(Number(e.target.value))
                }
                className="w-full accent-blue-500"
              />
            </div>

            {/* Battery */}
            <div>
              <div className="mb-2 flex justify-between">
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <Battery className="h-4 w-4" />
                  Battery SOC
                </label>

                <span className="font-semibold text-white">
                  {batterySoc}%
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                value={batterySoc}
                onChange={(e) =>
                  setBatterySoc(Number(e.target.value))
                }
                className="w-full accent-blue-500"
              />
            </div>

            {/* Demand */}
            <div>
              <div className="mb-2 flex justify-between">
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <Gauge className="h-4 w-4" />
                  Demand multiplier
                </label>

                <span className="font-semibold text-white">
                  {demandMultiplier.toFixed(1)}×
                </span>
              </div>

              <input
                type="range"
                min="0.7"
                max="1.5"
                step="0.1"
                value={demandMultiplier}
                onChange={(e) =>
                  setDemandMultiplier(Number(e.target.value))
                }
                className="w-full accent-blue-500"
              />
            </div>

            {/* Renewable */}
            <div>
              <div className="mb-2 flex justify-between">
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <Sun className="h-4 w-4" />
                  Renewable availability
                </label>

                <span className="font-semibold text-white">
                  {renewableAvailability}%
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                value={renewableAvailability}
                onChange={(e) =>
                  setRenewableAvailability(Number(e.target.value))
                }
                className="w-full accent-blue-500"
              />
            </div>

            {/* Fuel */}
            <div>
              <div className="mb-2 flex justify-between">
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <Zap className="h-4 w-4" />
                  Fuel inventory
                </label>

                <span className="font-semibold text-white">
                  {fuelInventory.toLocaleString()} L
                </span>
              </div>

              <input
                type="range"
                min="1000"
                max="30000"
                step="100"
                value={fuelInventory}
                onChange={(e) =>
                  setFuelInventory(Number(e.target.value))
                }
                className="w-full accent-blue-500"
              />
            </div>

            {/* Cloud */}
            <div>
              <div className="mb-2 flex justify-between">
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <Cloud className="h-4 w-4" />
                  Cloud cover
                </label>

                <span className="font-semibold text-white">
                  {cloudCover}%
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                value={cloudCover}
                onChange={(e) =>
                  setCloudCover(Number(e.target.value))
                }
                className="w-full accent-blue-500"
              />
            </div>

          </div>

          {/* Buttons */}
          <div className="mt-7 flex gap-3">

            <button
              onClick={() => setHasRun(true)}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500"
            >
              <Play className="h-4 w-4" />
              Run Simulation
            </button>

            <button
              onClick={resetScenario}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-3 text-slate-300 transition hover:bg-slate-800"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>

          </div>

        </div>

        {/* Right: Results */}
        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-6">

          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Optimizer Result
              </h2>

              <p className="text-sm text-slate-400">
                Scenario-based dispatch recommendation.
              </p>
            </div>

            <Activity className="h-5 w-5 text-blue-400" />
          </div>

          {!hasRun ? (
            <div className="flex min-h-[430px] items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950/40 p-8 text-center">
              <div>
                <Play className="mx-auto mb-4 h-10 w-10 text-slate-600" />

                <p className="font-medium text-slate-300">
                  No scenario executed yet
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Adjust the conditions and click Run Simulation.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-3">

                <div className="rounded-xl bg-slate-950/60 p-4">
                  <p className="text-xs text-slate-500">
                    Renewable used
                  </p>

                  <p className="mt-1 text-2xl font-bold text-white">
                    {simulation.renewableUsed.toFixed(1)}%
                  </p>
                </div>

                <div className="rounded-xl bg-slate-950/60 p-4">
                  <p className="text-xs text-slate-500">
                    Battery support
                  </p>

                  <p className="mt-1 text-2xl font-bold text-white">
                    {simulation.batteryUsed.toFixed(1)}%
                  </p>
                </div>

                <div className="rounded-xl bg-slate-950/60 p-4">
                  <p className="text-xs text-slate-500">
                    Fuel saved
                  </p>

                  <p className="mt-1 text-2xl font-bold text-emerald-400">
                    +{simulation.fuelSaved.toFixed(1)} L/d
                  </p>
                </div>

                <div className="rounded-xl bg-slate-950/60 p-4">
                  <p className="text-xs text-slate-500">
                    Autonomy gained
                  </p>

                  <p className="mt-1 text-2xl font-bold text-cyan-400">
                    +{simulation.autonomyGain.toFixed(1)} d
                  </p>
                </div>

              </div>

              {/* Risk */}
              <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-4">

                <div className="flex items-center justify-between">

                  <div>
                    <p className="text-xs text-slate-500">
                      Scenario risk
                    </p>

                    <p className="mt-1 font-semibold text-white">
                      Protected outcome
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      simulation.risk === 'HIGH'
                        ? 'bg-red-500/10 text-red-400'
                        : simulation.risk === 'MEDIUM'
                          ? 'bg-yellow-500/10 text-yellow-400'
                          : 'bg-emerald-500/10 text-emerald-400'
                    }`}
                  >
                    {simulation.risk}
                  </span>

                </div>

              </div>

              {/* Recommendations */}
              <div>
                <h3 className="mb-3 font-semibold text-white">
                  Recommended actions
                </h3>

                <div className="space-y-2">

                  {simulation.recommendations.map(
                    (recommendation, index) => (
                      <div
                        key={index}
                        className="rounded-lg border border-slate-700/60 bg-slate-950/50 p-3 text-sm text-slate-300"
                      >
                        <span className="mr-2 text-blue-400">
                          {index + 1}.
                        </span>

                        {recommendation}
                      </div>
                    )
                  )}

                </div>
              </div>

              {/* Fuel requirement */}
              <div className="rounded-xl bg-blue-500/5 p-4">

                <div className="flex items-center justify-between">

                  <span className="text-sm text-slate-400">
                    Estimated fuel requirement
                  </span>

                  <span className="font-semibold text-white">
                    {simulation.fuelRequired.toFixed(1)} units
                  </span>

                </div>

              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  )
}

export default ScenarioLab