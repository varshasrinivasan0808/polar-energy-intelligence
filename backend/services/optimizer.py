import numpy as np


class OptimizationService:
    """Transparent fuel-saving opportunity calculator."""

    def __init__(self, models, renewable):
        self.models = models
        self.renewable = renewable

    def optimize(self):
        load = self.models.load_forecast(12)
        fuel = self.models.fuel_forecast(12)
        renew = self.renewable.forecast()

        load_peak = float(load["peakLoad"])
        predicted_fuel = float(fuel["expectedConsumption"])
        renewable_index = float(np.mean(renew["renewableIndex"]))

        load_q75 = float(self.models.df["electricity_kwh"].dropna().quantile(0.75))
        high_load = load_peak >= load_q75

        renewable_saving_pct = min(12.0, max(0.0, renewable_index * 0.12))
        shift_pct = 4.0 if high_load else 2.0
        total_pct = min(15.0, renewable_saving_pct + shift_pct)
        estimated_saving = predicted_fuel * total_pct / 100.0

        return {
            "predictedLoad": round(float(np.mean(load["predicted"])), 2),
            "peakLoad": round(load_peak, 2),
            "predictedFuel": round(predicted_fuel, 2),
            "renewableIndex": round(renewable_index, 1),
            "estimatedSavingPct": round(total_pct, 2),
            "estimatedFuelSaving": round(estimated_saving, 2),
            "assumption": (
                "Scenario estimate only: actual renewable capacity and "
                "generator efficiency curves are unavailable."
            ),
        }
