from pathlib import Path

import numpy as np
import pandas as pd


class RenewableService:
    """
    Renewable resource potential service for Antarctic research stations.

    IMPORTANT:
    This service estimates renewable RESOURCE AVAILABILITY.
    It does NOT represent actual renewable electricity generation.

    Solar logic:
    - Antarctica can have periods with very low or no usable solar resource.
    - Solar is considered AVAILABLE only when daily solar radiation
      is above the configured minimum threshold.
    - When solar is below the threshold, solar potential is treated
      as unavailable and the system relies on other resources such
      as wind, battery and diesel backup.

    Wind is evaluated independently.

    For dates already present in NASA data:
        -> uses actual NASA daily observations.

    For future dates:
        -> uses historical day-of-year climatology.
    """

    # ============================================================
    # POLAR SOLAR AVAILABILITY THRESHOLD
    # ============================================================

    # Below this value, solar is treated as unavailable for
    # practical station-level energy planning.
    #
    # Example:
    # 2.775 kWh/m²/day -> SOLAR UNAVAILABLE
    #
    # Higher summer values can become available automatically.
    SOLAR_MIN_RESOURCE = 3.0

    def __init__(self, models):

        self.models = models

        self.root = Path(__file__).resolve().parents[2]

        self.nasa_dir = (
            self.root
            / "data"
            / "raw"
            / "NASA"
        )

        self.solar_file = (
            self.nasa_dir
            / "POWER_Point_Daily_solarnew.csv"
        )

        self.wind_file = (
            self.nasa_dir
            / "POWER_Point_Daily_windnew.csv"
        )

        # ========================================================
        # LOAD NASA DAILY DATA
        # ========================================================

        self.solar_daily = self._load_nasa_daily(
            self.solar_file,
            "ALLSKY_SFC_SW_DWN",
            skiprows=9
        )

        self.wind_daily = self._load_nasa_daily(
            self.wind_file,
            "WS50M",
            skiprows=9
        )

        # ========================================================
        # MERGE SOLAR + WIND
        # ========================================================

        self.daily = self.solar_daily.merge(
            self.wind_daily,
            on="date",
            how="outer"
        )

        self.daily = (
            self.daily
            .sort_values("date")
            .reset_index(drop=True)
        )

        # ========================================================
        # HISTORICAL DISTRIBUTIONS
        # ========================================================

        self.solar_distribution = (
            self.daily[
                "ALLSKY_SFC_SW_DWN"
            ]
            .dropna()
        )

        self.wind_distribution = (
            self.daily[
                "WS50M"
            ]
            .dropna()
        )

        # ========================================================
        # DAY-OF-YEAR CLIMATOLOGY
        # ========================================================

        self.day_of_year_climatology = (
            self._build_day_of_year_climatology()
        )

    # ============================================================
    # NASA READER
    # ============================================================

    @staticmethod
    def _load_nasa_daily(
        filepath,
        value_column,
        skiprows
    ):

        if not filepath.exists():

            raise FileNotFoundError(
                f"NASA file not found: {filepath}"
            )

        df = pd.read_csv(
            filepath,
            skiprows=skiprows
        )

        df.columns = (
            df.columns
            .astype(str)
            .str.strip()
        )

        required = [
            "YEAR",
            "MO",
            "DY",
            value_column
        ]

        missing = [
            col
            for col in required
            if col not in df.columns
        ]

        if missing:

            raise ValueError(
                f"Missing columns in "
                f"{filepath.name}: {missing}"
            )

        df = df[required].copy()

        for col in [
            "YEAR",
            "MO",
            "DY",
            value_column
        ]:

            df[col] = pd.to_numeric(
                df[col],
                errors="coerce"
            )

        # NASA missing-data marker
        df[value_column] = (
            df[value_column]
            .replace(
                [-999, -999.0],
                np.nan
            )
        )

        df = df.dropna(
            subset=[
                "YEAR",
                "MO",
                "DY"
            ]
        )

        df["date"] = pd.to_datetime(
            dict(
                year=df["YEAR"].astype(int),
                month=df["MO"].astype(int),
                day=df["DY"].astype(int)
            ),
            errors="coerce"
        )

        df = df.dropna(
            subset=["date"]
        )

        return df[
            ["date", value_column]
        ]

    # ============================================================
    # DAY-OF-YEAR CLIMATOLOGY
    # ============================================================

    def _build_day_of_year_climatology(self):

        df = self.daily.copy()

        df["month"] = (
            df["date"].dt.month
        )

        df["day"] = (
            df["date"].dt.day
        )

        climatology = (
            df
            .groupby(
                ["month", "day"]
            )[
                [
                    "ALLSKY_SFC_SW_DWN",
                    "WS50M"
                ]
            ]
            .mean()
            .reset_index()
        )

        return climatology

    # ============================================================
    # NORMALIZE RESOURCE VALUE TO 0-100
    # ============================================================

    @staticmethod
    def _score(
        value,
        historical_values
    ):

        if pd.isna(value):

            return 0.0

        if historical_values.empty:

            return 0.0

        q20 = float(
            historical_values.quantile(0.20)
        )

        q80 = float(
            historical_values.quantile(0.80)
        )

        if q80 <= q20:

            return 50.0

        score = (
            (
                float(value) - q20
            )
            /
            (
                q80 - q20
            )
        ) * 100

        return float(
            np.clip(
                score,
                0,
                100
            )
        )

    # ============================================================
    # SOLAR AVAILABILITY
    # ============================================================

    def _evaluate_solar(
        self,
        solar_value
    ):

        # No valid solar observation
        if pd.isna(solar_value):

            return {
                "available": False,
                "potential": 0.0,
                "status": "UNAVAILABLE",
                "reason": (
                    "No usable solar resource "
                    "is available for this period."
                )
            }

        # Very low solar radiation
        if (
            float(solar_value)
            < self.SOLAR_MIN_RESOURCE
        ):

            return {
                "available": False,
                "potential": 0.0,
                "status": "UNAVAILABLE",
                "reason": (
                    "Solar radiation is below the "
                    "minimum usable threshold for "
                    "the Antarctic station."
                )
            }

        # Solar is sufficiently available
        solar_score = self._score(
            solar_value,
            self.solar_distribution
        )

        return {
            "available": True,
            "potential": round(
                solar_score,
                1
            ),
            "status": "AVAILABLE",
            "reason": (
                "Solar resource is sufficient "
                "for renewable-energy planning."
            )
        }

    # ============================================================
    # WIND AVAILABILITY
    # ============================================================

    def _evaluate_wind(
        self,
        wind_value
    ):

        if pd.isna(wind_value):

            return {
                "available": False,
                "potential": 0.0,
                "status": "UNAVAILABLE"
            }

        wind_score = self._score(
            wind_value,
            self.wind_distribution
        )

        return {
            "available": True,
            "potential": round(
                wind_score,
                1
            ),
            "status": "AVAILABLE"
        }

    # ============================================================
    # GET RESOURCE VALUES FOR A DATE
    # ============================================================

    def _get_values_for_date(
        self,
        requested_date
    ):

        date = pd.Timestamp(
            requested_date
        ).normalize()

        # ========================================================
        # FIRST: ACTUAL NASA DAILY DATA
        # ========================================================

        actual = self.daily[
            self.daily["date"] == date
        ]

        if not actual.empty:

            row = actual.iloc[0]

            solar_value = row[
                "ALLSKY_SFC_SW_DWN"
            ]

            wind_value = row[
                "WS50M"
            ]

            if (
                pd.notna(solar_value)
                or pd.notna(wind_value)
            ):

                return (
                    float(solar_value)
                    if pd.notna(solar_value)
                    else np.nan,

                    float(wind_value)
                    if pd.notna(wind_value)
                    else np.nan,

                    True
                )

        # ========================================================
        # FUTURE DATE:
        # HISTORICAL DAY-OF-YEAR CLIMATOLOGY
        # ========================================================

        month = int(
            date.month
        )

        day = int(
            date.day
        )

        climatology_row = (
            self.day_of_year_climatology[
                (
                    self.day_of_year_climatology[
                        "month"
                    ] == month
                )
                &
                (
                    self.day_of_year_climatology[
                        "day"
                    ] == day
                )
            ]
        )

        # ========================================================
        # FALLBACK TO MONTHLY CLIMATOLOGY
        # ========================================================

        if climatology_row.empty:

            df = self.daily.copy()

            df["month"] = (
                df["date"].dt.month
            )

            monthly = (
                df.groupby("month")[
                    [
                        "ALLSKY_SFC_SW_DWN",
                        "WS50M"
                    ]
                ]
                .mean()
            )

            if month in monthly.index:

                row = monthly.loc[month]

                return (
                    float(
                        row[
                            "ALLSKY_SFC_SW_DWN"
                        ]
                    ),

                    float(
                        row[
                            "WS50M"
                        ]
                    ),

                    False
                )

            return (
                float(
                    self.solar_distribution.mean()
                ),

                float(
                    self.wind_distribution.mean()
                ),

                False
            )

        # ========================================================
        # DAY-OF-YEAR ESTIMATE
        # ========================================================

        row = climatology_row.iloc[0]

        return (
            float(
                row[
                    "ALLSKY_SFC_SW_DWN"
                ]
            )
            if pd.notna(
                row[
                    "ALLSKY_SFC_SW_DWN"
                ]
            )
            else np.nan,

            float(
                row[
                    "WS50M"
                ]
            )
            if pd.notna(
                row[
                    "WS50M"
                ]
            )
            else np.nan,

            False
        )

    # ============================================================
    # DATE-SPECIFIC RENEWABLE FORECAST
    # ============================================================

    def forecast_for_date(
        self,
        requested_date
    ):

        date = pd.Timestamp(
            requested_date
        ).normalize()

        solar_value, wind_value, is_actual = (
            self._get_values_for_date(
                date
            )
        )

        # ========================================================
        # EVALUATE SOLAR
        # ========================================================

        solar = self._evaluate_solar(
            solar_value
        )

        # ========================================================
        # EVALUATE WIND
        # ========================================================

        wind = self._evaluate_wind(
            wind_value
        )

        solar_available = (
            solar["available"]
        )

        wind_available = (
            wind["available"]
        )

        # ========================================================
        # RENEWABLE INDEX
        # ========================================================

        available_scores = []

        if solar_available:

            available_scores.append(
                solar["potential"]
            )

        if wind_available:

            available_scores.append(
                wind["potential"]
            )

        if available_scores:

            renewable_index = (
                sum(available_scores)
                /
                len(available_scores)
            )

        else:

            renewable_index = 0.0

        # ========================================================
        # STATUS
        # ========================================================

        if (
            not solar_available
            and not wind_available
        ):

            status = "LOW"

        elif (
            not solar_available
            and wind_available
        ):

            status = "WIND-DEPENDENT"

        elif (
            solar_available
            and not wind_available
        ):

            status = "SOLAR-DEPENDENT"

        elif renewable_index >= 70:

            status = "HIGH"

        elif renewable_index >= 40:

            status = "MODERATE"

        else:

            status = "LOW"

        # ========================================================
        # RECOMMENDED ACTION
        # ========================================================

        if (
            not solar_available
            and wind_available
        ):

            action = (
                "Solar resource is currently "
                "unavailable. Prioritize available "
                "wind generation, use stored battery "
                "energy when required, and retain "
                "fuel as backup for critical loads."
            )

        elif (
            not solar_available
            and not wind_available
        ):

            action = (
                "Solar and wind resources are currently "
                "limited. Preserve battery energy, "
                "prioritize essential loads, and "
                "maintain sufficient generator fuel reserve."
            )

        elif (
            solar_available
            and not wind_available
        ):

            action = (
                "Solar resource is available. "
                "Prioritize solar utilization and "
                "battery charging while retaining "
                "fuel as backup."
            )

        elif renewable_index >= 70:

            action = (
                "Strong renewable conditions are available. "
                "Prioritize renewable utilization and "
                "battery charging while reducing "
                "unnecessary generator use."
            )

        elif renewable_index < 40:

            action = (
                "Renewable resource availability is limited. "
                "Conserve fuel, preserve stored energy, "
                "and prioritize essential loads."
            )

        else:

            action = (
                "Maintain balanced renewable and generator "
                "operation while monitoring the next "
                "forecast period."
            )

        # ========================================================
        # RETURN API RESPONSE
        # ========================================================

        return {

            "date": date.strftime(
                "%Y-%m-%d"
            ),

            "solar": {

                "value": (
                    round(
                        solar_value,
                        3
                    )
                    if not np.isnan(
                        solar_value
                    )
                    else None
                ),

                "unit": (
                    "kWh/m²/day"
                ),

                "potential": round(
                    solar["potential"],
                    1
                ),

                "available": (
                    solar["available"]
                ),

                "status": (
                    solar["status"]
                ),

                "reason": (
                    solar["reason"]
                )
            },

            "wind": {

                "value": (
                    round(
                        wind_value,
                        3
                    )
                    if not np.isnan(
                        wind_value
                    )
                    else None
                ),

                "unit": "m/s",

                "potential": round(
                    wind["potential"],
                    1
                ),

                "available": (
                    wind["available"]
                ),

                "status": (
                    wind["status"]
                )
            },

            "renewableIndex": round(
                renewable_index,
                1
            ),

            "status": status,

            "recommendedAction": action,

            "dataType": (
                "NASA daily observation"
                if is_actual
                else "Historical day-of-year estimate"
            ),

            "solarThreshold": (
                self.SOLAR_MIN_RESOURCE
            ),

            "note": (
                "Renewable potential represents "
                "resource availability, not measured "
                "renewable electricity generation. "
                "Solar is treated as unavailable when "
                "solar radiation is below "
                f"{self.SOLAR_MIN_RESOURCE} "
                "kWh/m²/day."
            )
        }

    # ============================================================
    # 12-MONTH RENEWABLE PROFILE
    # ============================================================

    def forecast(self):

        df = self.daily.copy()

        df["month"] = (
            df["date"].dt.month
        )

        climatology = (
            df.groupby("month")[
                [
                    "ALLSKY_SFC_SW_DWN",
                    "WS50M"
                ]
            ]
            .mean()
        )

        labels = []

        solar_scores = []

        wind_scores = []

        renewable_scores = []

        solar_availability = []

        wind_availability = []

        # ========================================================
        # MONTHLY CALCULATION
        # ========================================================

        for month in range(1, 13):

            labels.append(
                pd.Timestamp(
                    2000,
                    month,
                    1
                ).strftime("%b")
            )

            solar_value = float(
                climatology.loc[
                    month,
                    "ALLSKY_SFC_SW_DWN"
                ]
            )

            wind_value = float(
                climatology.loc[
                    month,
                    "WS50M"
                ]
            )

            # ----------------------------------------------------
            # SOLAR
            # ----------------------------------------------------

            solar = self._evaluate_solar(
                solar_value
            )

            # ----------------------------------------------------
            # WIND
            # ----------------------------------------------------

            wind = self._evaluate_wind(
                wind_value
            )

            solar_scores.append(
                solar["potential"]
            )

            wind_scores.append(
                wind["potential"]
            )

            solar_availability.append(
                solar["available"]
            )

            wind_availability.append(
                wind["available"]
            )

            # ----------------------------------------------------
            # RENEWABLE INDEX
            # ----------------------------------------------------

            available_scores = []

            if solar["available"]:

                available_scores.append(
                    solar["potential"]
                )

            if wind["available"]:

                available_scores.append(
                    wind["potential"]
                )

            if available_scores:

                renewable_index = (
                    sum(available_scores)
                    /
                    len(available_scores)
                )

            else:

                renewable_index = 0.0

            renewable_scores.append(
                round(
                    renewable_index,
                    1
                )
            )

        # ========================================================
        # BEST RENEWABLE MONTH
        # ========================================================

        best_index = int(
            np.argmax(
                renewable_scores
            )
        )

        return {

            "months": labels,

            "solarPotential": [
                round(v, 1)
                for v in solar_scores
            ],

            "windPotential": [
                round(v, 1)
                for v in wind_scores
            ],

            "renewableIndex": [
                round(v, 1)
                for v in renewable_scores
            ],

            "solarAvailability": (
                solar_availability
            ),

            "windAvailability": (
                wind_availability
            ),

            "predictedGeneration": round(
                renewable_scores[0],
                1
            ),

            "currentGeneration": round(
                wind_scores[0],
                1
            ),

            "batteryChargingPeriods": [
                labels[best_index]
            ],

            "flexibleLoadPeriods": [
                labels[best_index]
            ],

            "unit": (
                "resource potential index"
            ),

            "solarThreshold": (
                self.SOLAR_MIN_RESOURCE
            ),

            "note": (
                "Estimated renewable resource "
                "potential, not measured generation. "
                "Solar is marked unavailable when "
                "resource availability is below "
                f"{self.SOLAR_MIN_RESOURCE} "
                "kWh/m²/day."
            )
        }