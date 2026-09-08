import React, { useState } from 'react'
import {
  Play,
  RotateCcw,
  Zap,
  Fuel,
  Sun,
  Battery,
  Brain,
  TrendingDown,
  ShieldCheck,
} from 'lucide-react'

import {
  simulationAPI,
  type SimulationParams,
  type SimulationResult,
} from '../services/api'

const Simulation: React.FC = () => {
  const [params, setParams] = useState<SimulationParams>({
    load: 70,
    renewableGeneration: 30,
    batterySOC: 65,
    fuelConsumption: 150,
  })

  const [result, setResult] =
    useState<SimulationResult | null>(null)

  const [loading, setLoading] = useState(false)

  const [error, setError] =
    useState<string | null>(null)

  const updateParam = (
    key: keyof SimulationParams,
    value: number
  ) => {
    setParams((current) => ({
      ...current,
      [key]: value,
    }))
  }

  const runSimulation = async () => {
    try {
      setLoading(true)
      setError(null)

      const simulation =
        await simulationAPI.simulate(params)

      setResult(simulation)
    } catch (err) {
      console.error(
        'Simulation error:',
        err
      )

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to run simulation'
      )
    } finally {
      setLoading(false)
    }
  }

  const resetSimulation = () => {
    setParams({
      load: 70,
      renewableGeneration: 30,
      batterySOC: 65,
      fuelConsumption: 150,
    })

    setResult(null)
    setError(null)
  }

  return (
    <div className="space-y-6">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div>
        <h1 className="text-3xl font-bold text-white">
          Energy Scenario Simulation
        </h1>

        <p className="mt-1 text-sm text-slate-400">
          Test different operating conditions and see the
          recommended energy-management strategy.
        </p>
      </div>


      {/* ======================================================
          EXPLANATION
      ====================================================== */}

      <div className="rounded-2xl border border-cyan-900 bg-cyan-950/20 p-5">

        <div className="flex gap-3">

          <Brain
            size={22}
            className="mt-0.5 shrink-0 text-cyan-400"
          />

          <div>

            <h2 className="font-semibold text-cyan-300">
              How the simulation works
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-400">
              Change the expected load, renewable availability,
              battery state-of-charge and fuel consumption.
              The optimization engine evaluates the scenario and
              returns an estimated fuel-saving opportunity and
              recommended operating action.
            </p>

          </div>

        </div>

      </div>


      <div className="grid gap-6 lg:grid-cols-2">

        {/* ====================================================
            INPUTS
        ==================================================== */}

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

          <div className="mb-6 flex items-center justify-between">

            <div>

              <h2 className="text-xl font-semibold text-white">
                Scenario Inputs
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Adjust the operating conditions
              </p>

            </div>

            <button
              onClick={resetSimulation}
              className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-400 hover:text-white"
            >
              <RotateCcw size={14} />
              Reset
            </button>

          </div>


          <SliderField
            label="Expected Load"
            value={params.load}
            min={0}
            max={150}
            unit="kW"
            icon={<Zap size={19} />}
            onChange={(value) =>
              updateParam('load', value)
            }
          />


          <SliderField
            label="Renewable Generation"
            value={params.renewableGeneration}
            min={0}
            max={150}
            unit="kW"
            icon={<Sun size={19} />}
            onChange={(value) =>
              updateParam(
                'renewableGeneration',
                value
              )
            }
          />


          <SliderField
            label="Battery State of Charge"
            value={params.batterySOC}
            min={0}
            max={100}
            unit="%"
            icon={<Battery size={19} />}
            onChange={(value) =>
              updateParam(
                'batterySOC',
                value
              )
            }
          />


          <SliderField
            label="Fuel Consumption"
            value={params.fuelConsumption}
            min={0}
            max={300}
            unit="L"
            icon={<Fuel size={19} />}
            onChange={(value) =>
              updateParam(
                'fuelConsumption',
                value
              )
            }
          />


          <button
            onClick={runSimulation}
            disabled={loading}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-5 py-3 font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
          >

            {loading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Running Simulation...
              </>
            ) : (
              <>
                <Play size={18} />
                Run Simulation
              </>
            )}

          </button>

        </div>


        {/* ====================================================
            RESULTS
        ==================================================== */}

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

          <h2 className="text-xl font-semibold text-white">
            Simulation Result
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Optimization output for the selected scenario
          </p>


          {error && (
            <div className="mt-5 rounded-xl border border-red-800 bg-red-950/20 p-4 text-sm text-red-300">
              {error}
            </div>
          )}


          {!result && !error && (
            <div className="flex min-h-[400px] items-center justify-center text-center">

              <div>

                <Play
                  size={42}
                  className="mx-auto text-slate-700"
                />

                <p className="mt-4 text-sm text-slate-400">
                  Configure the scenario and run the simulation.
                </p>

              </div>

            </div>
          )}


          {result && (

            <div className="mt-6 space-y-4">

              <ResultCard
                title="Predicted Load"
                value={`${result.predictedLoad.toFixed(1)} kW`}
                icon={<Zap size={20} />}
              />

              <ResultCard
                title="Estimated Optimized Fuel"
                value={`${result.estimatedOptimizedFuel.toFixed(1)} L`}
                icon={<Fuel size={20} />}
              />

              <ResultCard
                title="Estimated Fuel Saving"
                value={`${result.estimatedFuelSaving.toFixed(1)} L`}
                icon={<TrendingDown size={20} />}
              />

              <ResultCard
                title="Reliability Score"
                value={`${result.reliabilityScore.toFixed(1)}%`}
                icon={<ShieldCheck size={20} />}
              />


              <div className="rounded-xl border border-cyan-800 bg-cyan-950/20 p-5">

                <div className="flex items-center gap-2">

                  <Brain
                    size={19}
                    className="text-cyan-400"
                  />

                  <p className="text-xs font-bold uppercase tracking-wide text-cyan-300">
                    Recommended Action
                  </p>

                </div>

                <p className="mt-3 text-sm font-semibold leading-6 text-white">
                  {result.recommendation}
                </p>

              </div>


              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">

                <p className="text-xs leading-5 text-slate-500">
                  {result.note}
                </p>

              </div>

            </div>
          )}

        </div>

      </div>


      {/* ======================================================
          SCENARIO EXAMPLES
      ====================================================== */}

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

        <h2 className="text-xl font-semibold text-white">
          Example Scenarios
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Useful scenarios to demonstrate to the examiner
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-3">

          <ScenarioCard
            title="High Load + Low Renewable"
            text="Test whether the system recommends conservation and fuel preservation."
            values="Load 120 kW • Renewable 15 kW"
            onSelect={() => {
              setParams({
                load: 120,
                renewableGeneration: 15,
                batterySOC: 45,
                fuelConsumption: 220,
              })
              setResult(null)
            }}
          />

          <ScenarioCard
            title="High Renewable Availability"
            text="Test whether the system prioritizes renewable utilization."
            values="Load 70 kW • Renewable 110 kW"
            onSelect={() => {
              setParams({
                load: 70,
                renewableGeneration: 110,
                batterySOC: 60,
                fuelConsumption: 150,
              })
              setResult(null)
            }}
          />

          <ScenarioCard
            title="Balanced Operation"
            text="Show how the system behaves under moderate conditions."
            values="Load 60 kW • Renewable 45 kW"
            onSelect={() => {
              setParams({
                load: 60,
                renewableGeneration: 45,
                batterySOC: 70,
                fuelConsumption: 130,
              })
              setResult(null)
            }}
          />

        </div>

      </div>


      {/* ======================================================
          DEMO NOTE
      ====================================================== */}

      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">

        <p className="text-xs leading-5 text-slate-500">
          Simulation results are scenario-based estimates. They are
          intended to demonstrate the optimization logic and are not
          measurements of actual station fuel savings.
        </p>

      </div>

    </div>
  )
}


// ============================================================
// SLIDER
// ============================================================

const SliderField: React.FC<{
  label: string
  value: number
  min: number
  max: number
  unit: string
  icon: React.ReactNode
  onChange: (value: number) => void
}> = ({
  label,
  value,
  min,
  max,
  unit,
  icon,
  onChange,
}) => (
  <div className="mb-7">

    <div className="mb-3 flex items-center justify-between">

      <div className="flex items-center gap-2">

        <span className="text-cyan-400">
          {icon}
        </span>

        <span className="text-sm text-slate-300">
          {label}
        </span>

      </div>

      <span className="text-sm font-bold text-white">
        {value} {unit}
      </span>

    </div>

    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(event) =>
        onChange(
          Number(event.target.value)
        )
      }
      className="w-full accent-cyan-500"
    />

    <div className="mt-1 flex justify-between text-[10px] text-slate-600">
      <span>{min} {unit}</span>
      <span>{max} {unit}</span>
    </div>

  </div>
)


// ============================================================
// RESULT CARD
// ============================================================

const ResultCard: React.FC<{
  title: string
  value: string
  icon: React.ReactNode
}> = ({
  title,
  value,
  icon,
}) => (
  <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-4">

    <div className="flex items-center gap-3">

      <span className="text-cyan-400">
        {icon}
      </span>

      <span className="text-sm text-slate-400">
        {title}
      </span>

    </div>

    <span className="font-bold text-white">
      {value}
    </span>

  </div>
)


// ============================================================
// SCENARIO CARD
// ============================================================

const ScenarioCard: React.FC<{
  title: string
  text: string
  values: string
  onSelect: () => void
}> = ({
  title,
  text,
  values,
  onSelect,
}) => (
  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">

    <h3 className="font-semibold text-white">
      {title}
    </h3>

    <p className="mt-2 text-xs leading-5 text-slate-500">
      {text}
    </p>

    <p className="mt-3 text-xs font-medium text-cyan-400">
      {values}
    </p>

    <button
      onClick={onSelect}
      className="mt-4 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:border-cyan-700 hover:text-cyan-300"
    >
      Load Scenario
    </button>

  </div>
)

export default Simulation