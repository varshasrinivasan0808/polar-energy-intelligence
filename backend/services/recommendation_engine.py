import numpy as np


class RecommendationEngine:

    def __init__(self, models, renewable, optimizer):
        self.models = models
        self.renewable_service = renewable
        self.optimizer = optimizer

    # ============================================================
    # HELPERS
    # ============================================================

    def _historical_thresholds(self):

        load_history = (
            self.models.df["electricity_kwh"]
            .dropna()
            .astype(float)
        )

        fuel_history = (
            self.models.df["fuel_litres"]
            .dropna()
            .astype(float)
        )

        return {
            "load_q25": float(load_history.quantile(0.25)),
            "load_q50": float(load_history.quantile(0.50)),
            "load_q75": float(load_history.quantile(0.75)),
            "fuel_q25": float(fuel_history.quantile(0.25)),
            "fuel_q50": float(fuel_history.quantile(0.50)),
            "fuel_q75": float(fuel_history.quantile(0.75)),
        }

    def _recommendation_from_conditions(
        self,
        *,
        monthly_load,
        monthly_fuel,
        renewable_index,
        solar_potential,
        wind_potential,
        battery_soc=None,
        historical=False,
    ):

        thresholds = self._historical_thresholds()

        high_load = monthly_load >= thresholds["load_q75"]
        low_load = monthly_load <= thresholds["load_q25"]

        high_fuel = monthly_fuel >= thresholds["fuel_q75"]
        low_fuel = monthly_fuel <= thresholds["fuel_q25"]

        high_renewable = renewable_index >= 70
        low_renewable = renewable_index < 40

        strong_solar = (
            solar_potential >= 65
            and solar_potential >= wind_potential
        )

        strong_wind = (
            wind_potential >= 65
            and wind_potential > solar_potential
        )

        # ========================================================
        # HISTORICAL DATE
        # ========================================================

        if historical:

            return {
                "severity": "INFO",
                "confidence": 0.98,
                "situation": (
                    "The selected date belongs to a period "
                    "with observed Mawson energy data."
                ),
                "action": (
                    "Use this date for historical validation and "
                    "performance comparison; no future operating "
                    "action is required for the historical record."
                ),
                "reason": (
                    "The electricity and fuel values are actual "
                    "historical observations rather than forecasts."
                ),
                "factors": [
                    "Historical Mawson data available",
                    "Observed electricity consumption",
                    "Observed fuel consumption",
                ],
                "peakLoadReduction": 0.0,
            }

        # ========================================================
        # 1. CRITICAL: HIGH LOAD + LOW RENEWABLE
        # ========================================================

        if high_load and low_renewable:

            return {
                "severity": "CRITICAL",
                "confidence": 0.90,
                "situation": (
                    "Demand is in the high historical range while "
                    "renewable resource availability is weak."
                ),
                "action": (
                    "Immediately defer non-essential flexible loads, "
                    "maintain generator reserve for critical systems, "
                    "and preserve stored energy for demand peaks."
                ),
                "reason": (
                    "High demand combined with weak renewable support "
                    "creates the strongest risk of increased generator "
                    "and fuel dependency."
                ),
                "factors": [
                    "High predicted load",
                    "Low renewable potential",
                    "High fuel-dependency risk",
                ],
                "peakLoadReduction": 8.0,
            }

        # ========================================================
        # 2. HIGH LOAD + STRONG SOLAR
        # ========================================================

        if high_load and strong_solar:

            return {
                "severity": "OPTIMIZE",
                "confidence": 0.87,
                "situation": (
                    "Demand is high, but solar resource potential "
                    "is favourable."
                ),
                "action": (
                    "Schedule energy-intensive flexible loads during "
                    "the stronger solar window and prioritize battery "
                    "charging from available renewable energy."
                ),
                "reason": (
                    "Moving flexible demand toward the solar-rich "
                    "period can reduce generator loading during "
                    "higher-demand periods."
                ),
                "factors": [
                    "High predicted load",
                    "Strong solar potential",
                    "Load-shifting opportunity",
                ],
                "peakLoadReduction": 7.0,
            }

        # ========================================================
        # 3. HIGH LOAD + STRONG WIND
        # ========================================================

        if high_load and strong_wind:

            return {
                "severity": "OPTIMIZE",
                "confidence": 0.87,
                "situation": (
                    "Demand is high and wind resource potential "
                    "is favourable."
                ),
                "action": (
                    "Prioritize wind-supported operation during the "
                    "stronger wind period and reduce unnecessary "
                    "generator loading for flexible demand."
                ),
                "reason": (
                    "Favourable wind conditions provide an opportunity "
                    "to reduce the amount of fuel-based generation "
                    "required for non-critical demand."
                ),
                "factors": [
                    "High predicted load",
                    "Strong wind potential",
                    "Generator-loading reduction opportunity",
                ],
                "peakLoadReduction": 6.0,
            }

        # ========================================================
        # 4. HIGH FUEL + MODERATE/LOW RENEWABLE
        # ========================================================

        if high_fuel and low_renewable:

            return {
                "severity": "WARNING",
                "confidence": 0.86,
                "situation": (
                    "Fuel requirement is in the high historical range "
                    "while renewable availability is limited."
                ),
                "action": (
                    "Activate fuel-conservation measures, eliminate "
                    "avoidable generator operation, and defer "
                    "non-critical flexible loads."
                ),
                "reason": (
                    "High fuel demand with weak renewable support "
                    "indicates that reducing discretionary consumption "
                    "has immediate value."
                ),
                "factors": [
                    "High predicted fuel requirement",
                    "Low renewable potential",
                    "Fuel conservation priority",
                ],
                "peakLoadReduction": 5.0,
            }

        # ========================================================
        # 5. HIGH FUEL + STRONG RENEWABLE
        # ========================================================

        if high_fuel and high_renewable:

            return {
                "severity": "OPTIMIZE",
                "confidence": 0.88,
                "situation": (
                    "Fuel demand is high, but renewable resource "
                    "availability is also strong."
                ),
                "action": (
                    "Maximize renewable utilization and battery use "
                    "during the favourable resource period to reduce "
                    "generator fuel consumption."
                ),
                "reason": (
                    "Strong renewable availability creates the best "
                    "opportunity to offset a high fuel requirement."
                ),
                "factors": [
                    "High predicted fuel requirement",
                    "High renewable potential",
                    "Battery utilization opportunity",
                ],
                "peakLoadReduction": 4.0,
            }

        # ========================================================
        # 6. LOW BATTERY
        # ========================================================

        if (
            battery_soc is not None
            and battery_soc < 30
        ):

            return {
                "severity": "WARNING",
                "confidence": 0.89,
                "situation": (
                    "Stored battery energy is approaching a low "
                    "operating level."
                ),
                "action": (
                    "Preserve remaining battery energy for critical "
                    "loads, avoid unnecessary discharge, and maintain "
                    "generator readiness until renewable charging "
                    "conditions improve."
                ),
                "reason": (
                    "A low state of charge reduces the station's "
                    "ability to absorb future demand peaks or respond "
                    "to renewable variability."
                ),
                "factors": [
                    "Low battery state of charge",
                    "Reduced energy reserve",
                    "Reliability protection",
                ],
                "peakLoadReduction": 4.0,
            }

        # ========================================================
        # 7. HIGH RENEWABLE
        # ========================================================

        if high_renewable:

            if strong_solar:

                return {
                    "severity": "OPTIMIZE",
                    "confidence": 0.86,
                    "situation": (
                        "Solar resource potential is high and "
                        "renewable availability is favourable."
                    ),
                    "action": (
                        "Charge the battery during the strongest "
                        "solar period and move flexible loads into "
                        "that window to reduce generator operation."
                    ),
                    "reason": (
                        "Using available solar energy directly or "
                        "through storage can reduce unnecessary fuel use."
                    ),
                    "factors": [
                        "High renewable index",
                        "Strong solar resource",
                        "Battery charging opportunity",
                    ],
                    "peakLoadReduction": 3.0,
                }

            if strong_wind:

                return {
                    "severity": "OPTIMIZE",
                    "confidence": 0.86,
                    "situation": (
                        "Wind resource potential is high and "
                        "renewable availability is favourable."
                    ),
                    "action": (
                        "Prioritize wind-supported operation and "
                        "use excess renewable energy for battery "
                        "charging where available."
                    ),
                    "reason": (
                        "Strong wind conditions provide an opportunity "
                        "to reduce generator contribution and preserve fuel."
                    ),
                    "factors": [
                        "High renewable index",
                        "Strong wind resource",
                        "Fuel preservation opportunity",
                    ],
                    "peakLoadReduction": 2.0,
                }

            return {
                "severity": "OPTIMIZE",
                "confidence": 0.82,
                "situation": (
                    "Overall renewable resource potential is high."
                ),
                "action": (
                    "Increase renewable utilization, charge available "
                    "storage, and shift flexible loads toward the "
                    "renewable-rich operating window."
                ),
                "reason": (
                    "High renewable availability provides an opportunity "
                    "to reduce reliance on fuel-based generation."
                ),
                "factors": [
                    "High renewable potential",
                    "Energy-storage opportunity",
                    "Flexible-load shifting opportunity",
                ],
                "peakLoadReduction": 2.0,
            }

        # ========================================================
        # 8. LOW RENEWABLE
        # ========================================================

        if low_renewable:

            return {
                "severity": "WARNING",
                "confidence": 0.81,
                "situation": (
                    "Renewable resource availability is expected "
                    "to be limited."
                ),
                "action": (
                    "Preserve battery energy for critical loads, "
                    "reduce discretionary consumption, and maintain "
                    "adequate generator fuel reserve."
                ),
                "reason": (
                    "Weak renewable support increases the importance "
                    "of stored energy and fuel availability."
                ),
                "factors": [
                    "Low renewable potential",
                    "Battery preservation",
                    "Fuel-reserve protection",
                ],
                "peakLoadReduction": 3.0,
            }

        # ========================================================
        # 9. LOW FUEL / LOW LOAD
        # ========================================================

        if low_fuel and low_load:

            return {
                "severity": "NORMAL",
                "confidence": 0.80,
                "situation": (
                    "Demand and fuel requirements are both below "
                    "their historical upper ranges."
                ),
                "action": (
                    "Maintain normal operating levels and use the "
                    "lower-demand period to perform non-disruptive "
                    "maintenance or recharge storage when practical."
                ),
                "reason": (
                    "Lower demand reduces immediate fuel pressure "
                    "and provides an operationally favourable period."
                ),
                "factors": [
                    "Low predicted load",
                    "Low predicted fuel requirement",
                    "Operational flexibility",
                ],
                "peakLoadReduction": 0.0,
            }

        # ========================================================
        # 10. MODERATE BALANCED CONDITION
        # ========================================================

        return {
            "severity": "NORMAL",
            "confidence": 0.76,
            "situation": (
                "Load, fuel and renewable conditions are within "
                "a moderate operating range."
            ),
            "action": (
                "Maintain balanced generator and renewable operation, "
                "keep battery reserve within the planned operating range, "
                "and continue monitoring the next energy period."
            ),
            "reason": (
                "No dominant stress condition or major renewable "
                "opportunity requires an immediate operating change."
            ),
            "factors": [
                "Moderate predicted load",
                "Moderate fuel requirement",
                "Moderate renewable availability",
            ],
            "peakLoadReduction": 0.0,
        }

    # ============================================================
    # DATE-SPECIFIC FORECAST + RECOMMENDATION
    # ============================================================

    def forecast_for_date(self, requested_date):

        date = np.datetime64(
            requested_date,
            "D"
        )

        # --------------------------------------------------------
        # LOAD
        # --------------------------------------------------------

        load_result = (
            self.models.forecast_load_for_date(
                date
            )
        )

        # --------------------------------------------------------
        # FUEL
        # --------------------------------------------------------

        fuel_result = (
            self.models.forecast_fuel_for_date(
                date
            )
        )

        # --------------------------------------------------------
        # RENEWABLE
        # --------------------------------------------------------

        renewable_result = (
            self.renewable_service.forecast_for_date(
                date
            )
        )

        # --------------------------------------------------------
        # VALUES
        # --------------------------------------------------------

        monthly_load = float(
            load_result["monthlyForecastKwh"]
        )

        monthly_fuel = float(
            fuel_result["monthlyForecastLitres"]
        )

        daily_load = float(
            load_result["estimatedDailyLoadKwh"]
        )

        daily_fuel = float(
            fuel_result["estimatedDailyFuelLitres"]
        )

        renewable_index = float(
            renewable_result["renewableIndex"]
        )

        solar_potential = float(
            renewable_result["solar"]["potential"]
        )

        wind_potential = float(
            renewable_result["wind"]["potential"]
        )

        historical = bool(
            load_result.get(
                "isHistoricalActual",
                False
            )
        )

        # --------------------------------------------------------
        # RECOMMENDATION
        # --------------------------------------------------------

        decision = (
            self._recommendation_from_conditions(
                monthly_load=monthly_load,
                monthly_fuel=monthly_fuel,
                renewable_index=renewable_index,
                solar_potential=solar_potential,
                wind_potential=wind_potential,
                historical=historical,
            )
        )

        # --------------------------------------------------------
        # FUEL-SAVING ESTIMATE
        # --------------------------------------------------------

        if historical:

            estimated_fuel_saving = 0.0

        else:

            if renewable_index >= 70:
                saving_pct = 10.0
            elif renewable_index >= 50:
                saving_pct = 6.0
            elif renewable_index >= 40:
                saving_pct = 3.0
            else:
                saving_pct = 1.0

            if monthly_load >= self._historical_thresholds()["load_q75"]:
                saving_pct += 2.0

            saving_pct = min(
                saving_pct,
                15.0
            )

            estimated_fuel_saving = (
                daily_fuel
                * saving_pct
                / 100
            )

        # --------------------------------------------------------
        # FINAL RESPONSE
        # --------------------------------------------------------

        return {

            "date": str(
                requested_date
            ),

            "load": load_result,

            "fuel": fuel_result,

            "renewable": renewable_result,

            "recommendation": {

                "severity": decision[
                    "severity"
                ],

                "confidence": round(
                    decision["confidence"],
                    3
                ),

                "situation": decision[
                    "situation"
                ],

                "action": decision[
                    "action"
                ],

                "reason": decision[
                    "reason"
                ],

                "factors": decision[
                    "factors"
                ],

                "timeWindow": str(
                    requested_date
                ),

                "expectedImpact": {

                    "fuelSaved": round(
                        estimated_fuel_saving,
                        2
                    ),

                    "peakLoadReduction":
                        decision[
                            "peakLoadReduction"
                        ],

                    "renewableUtilization": round(
                        renewable_index,
                        1
                    ),
                },
            },

            "summary": {

                "estimatedDailyLoadKwh": round(
                    daily_load,
                    2
                ),

                "estimatedDailyFuelLitres": round(
                    daily_fuel,
                    2
                ),

                "renewableIndex": round(
                    renewable_index,
                    1
                ),

                "estimatedFuelSavingLitres": round(
                    estimated_fuel_saving,
                    2
                ),
            },

            "importantNote": (
                "Historical dates return observed Mawson energy "
                "values. Future dates use the trained forecasting "
                "models. Renewable values represent resource "
                "potential rather than measured renewable electricity "
                "generation. Fuel savings are scenario estimates."
            ),
        }

    # ============================================================
    # 12-MONTH RECOMMENDATION
    # ============================================================

    def recommendations(self):

        load = self.models.load_forecast(12)
        fuel = self.models.fuel_forecast(12)
        renew = self.renewable_service.forecast()

        load_values = np.array(
            load["predicted"],
            dtype=float
        )

        fuel_values = np.array(
            fuel["predicted"],
            dtype=float
        )

        renewable_values = np.array(
            renew["renewableIndex"],
            dtype=float
        )

        peak_idx = int(
            np.argmax(load_values)
        )

        peak_month = load["hours"][peak_idx]

        peak_load = float(
            load_values[peak_idx]
        )

        average_fuel = float(
            np.mean(fuel_values)
        )

        average_renewable = float(
            np.mean(renewable_values)
        )

        historical_fuel = (
            self.models.df[
                "fuel_litres"
            ]
            .dropna()
            .astype(float)
        )

        historical_load = (
            self.models.df[
                "electricity_kwh"
            ]
            .dropna()
            .astype(float)
        )

        high_peak = (
            peak_load
            >= historical_load.quantile(
                0.75
            )
        )

        high_fuel = (
            average_fuel
            >= historical_fuel.quantile(
                0.75
            )
        )

        high_renewable = (
            average_renewable >= 70
        )

        low_renewable = (
            average_renewable < 40
        )

        # ========================================================
        # HORIZON DECISION
        # ========================================================

        if high_peak and low_renewable:

            severity = "CRITICAL"

            situation = (
                f"The forecast horizon contains a high-demand "
                f"peak around {peak_month} while average renewable "
                f"potential remains weak."
            )

            action = (
                f"Plan flexible-load reduction before {peak_month}, "
                "preserve battery energy for the peak period, and "
                "secure sufficient generator fuel reserve."
            )

            reason = (
                "The combination of high predicted demand and weak "
                "renewable support creates the greatest operational stress."
            )

            factors = [
                "High forecast peak",
                "Low renewable availability",
                "Fuel-reserve requirement",
            ]

            peak_reduction = 8.0

        elif high_renewable and high_fuel:

            severity = "OPTIMIZE"

            situation = (
                "The forecast horizon shows strong renewable "
                "potential while fuel demand remains high."
            )

            action = (
                "Prioritize renewable-rich periods for battery "
                "charging and flexible loads so generator operation "
                "can be reduced during those periods."
            )

            reason = (
                "Strong renewable conditions provide the clearest "
                "opportunity to offset a high fuel requirement."
            )

            factors = [
                "High renewable potential",
                "High fuel requirement",
                "Battery utilization opportunity",
            ]

            peak_reduction = 4.0

        elif high_renewable:

            severity = "OPTIMIZE"

            situation = (
                "Renewable potential remains strong across the "
                "forecast horizon."
            )

            action = (
                "Schedule flexible demand around renewable-rich "
                "periods and use available storage before increasing "
                "fuel-based generation."
            )

            reason = (
                "Higher renewable availability can reduce unnecessary "
                "generator operation."
            )

            factors = [
                "Strong renewable potential",
                "Flexible-load opportunity",
                "Fuel preservation",
            ]

            peak_reduction = 3.0

        elif high_fuel:

            severity = "WARNING"

            situation = (
                "Average fuel demand is in the high historical range "
                "over the forecast horizon."
            )

            action = (
                "Plan fuel-conservation measures, reduce avoidable "
                "generator operation, and defer non-critical loads "
                "during high-demand periods."
            )

            reason = (
                "Persistently high fuel demand increases the value "
                "of demand-side reduction."
            )

            factors = [
                "High fuel forecast",
                "Generator dependency",
                "Fuel conservation priority",
            ]

            peak_reduction = 4.0

        else:

            severity = "NORMAL"

            situation = (
                f"Forecast conditions show a peak around "
                f"{peak_month} without a dominant high-risk condition."
            )

            action = (
                f"Maintain planned operation while monitoring the "
                f"{peak_month} demand peak and adjusting flexible loads "
                "if actual conditions deviate from the forecast."
            )

            reason = (
                "No dominant high-risk combination was detected "
                "across the forecast horizon."
            )

            factors = [
                "Load forecast",
                "Fuel forecast",
                "Renewable outlook",
            ]

            peak_reduction = 0.0

        return [
            {

                "id": "energy-horizon-recommendation",

                "severity": severity,

                "confidence": 0.82,

                "situation": situation,

                "action": action,

                "reason": reason,

                "factors": factors,

                "expectedImpact": {

                    "fuelSaved": 0.0,

                    "peakLoadReduction":
                        peak_reduction,

                    "renewableUtilization":
                        round(
                            average_renewable,
                            1
                        ),
                },

                "timeWindow": peak_month,
            }
        ]

    # ============================================================
    # DASHBOARD
    # ============================================================

    def dashboard(self):

        load = self.models.load_forecast(12)
        fuel = self.models.fuel_forecast(12)
        renew = self.renewable_service.forecast()

        recs = self.recommendations()

        # --------------------------------------------------------
        # SYSTEM HEALTH
        # --------------------------------------------------------

        score = 90.0

        if max(
            load["predicted"]
        ) >= np.percentile(
            load["predicted"],
            75
        ):
            score -= 8

        if np.mean(
            renew["renewableIndex"]
        ) < 35:
            score -= 7

        # --------------------------------------------------------
        # ALERTS
        # --------------------------------------------------------

        alerts = []

        for rec in recs:

            if rec["severity"] != "NORMAL":

                alerts.append(
                    {
                        "id": rec["id"],
                        "severity": rec["severity"],
                        "message": rec["action"],
                        "timestamp": rec["timeWindow"],
                    }
                )

        return {

            "currentLoad":
                load["latestObservedLoad"],

            "predictedLoad":
                round(
                    float(
                        np.mean(
                            load["predicted"]
                        )
                    ),
                    2
                ),

            "fuelConsumption":
                fuel["currentConsumption"],

            "systemHealth":
                round(
                    max(
                        0,
                        min(
                            100,
                            score
                        )
                    ),
                    1
                ),

            "alerts":
                alerts,

            "recommendations":
                recs,
        }

    # ============================================================
    # SIMULATION
    # ============================================================

    def simulate(self, params):

        load = float(
            params["load"]
        )

        renewable_generation = float(
            params["renewableGeneration"]
        )

        fuel = float(
            params["fuelConsumption"]
        )

        battery_soc = float(
            params.get(
                "batterySOC",
                65
            )
        )

        renewable_ratio = min(
            1.0,
            renewable_generation
            / max(
                load,
                1.0
            )
        )

        # --------------------------------------------------------
        # FUEL SAVING
        # --------------------------------------------------------

        if renewable_ratio >= 0.75:

            saving_pct = 15.0

        elif renewable_ratio >= 0.50:

            saving_pct = 10.0

        elif renewable_ratio >= 0.25:

            saving_pct = 5.0

        else:

            saving_pct = 2.0

        if load > 80:
            saving_pct += 2.0

        if battery_soc >= 80:
            saving_pct += 2.0

        if battery_soc < 30:
            saving_pct -= 2.0

        saving_pct = max(
            0.0,
            min(
                saving_pct,
                20.0
            )
        )

        optimized_fuel = (
            fuel
            * (
                1
                - saving_pct / 100
            )
        )

        fuel_saving = max(
            0.0,
            fuel - optimized_fuel
        )

        # --------------------------------------------------------
        # RELIABILITY
        # --------------------------------------------------------

        stress = max(
            0.0,
            load - renewable_generation
        )

        reliability = (
            100
            - stress * 0.35
        )

        if battery_soc < 30:
            reliability -= 8

        reliability = max(
            0.0,
            min(
                100.0,
                reliability
            )
        )

        # --------------------------------------------------------
        # SCENARIO ACTION
        # --------------------------------------------------------

        if reliability < 60:

            action = (
                "Reduce non-critical flexible load, preserve "
                "battery energy for essential demand, and retain "
                "fuel reserve for reliability protection."
            )

        elif renewable_ratio >= 0.75:

            action = (
                "Prioritize renewable generation, charge available "
                "battery storage, and minimize generator operation."
            )

        elif renewable_ratio >= 0.50:

            action = (
                "Use renewable generation for flexible demand and "
                "maintain the generator at the lowest practical loading."
            )

        elif (
            load > 80
            and renewable_generation < 30
        ):

            action = (
                "Shift flexible demand away from the peak, preserve "
                "battery energy, and maintain generator reserve."
            )

        elif battery_soc < 30:

            action = (
                "Preserve remaining battery energy for critical loads "
                "and maintain generator readiness."
            )

        else:

            action = (
                "Maintain balanced operation and monitor load, "
                "renewable availability and fuel consumption."
            )

        return {

            "predictedLoad":
                round(
                    load,
                    2
                ),

            "fuelImpact":
                round(
                    (
                        (
                            optimized_fuel
                            - fuel
                        )
                        / max(
                            fuel,
                            1
                        )
                    )
                    * 100,
                    2
                ),

            "reliabilityScore":
                round(
                    reliability,
                    1
                ),

            "estimatedOptimizedFuel":
                round(
                    optimized_fuel,
                    2
                ),

            "estimatedFuelSaving":
                round(
                    fuel_saving,
                    2
                ),

            "recommendation":
                action,

            "note":
                "Scenario estimate only.",
        }