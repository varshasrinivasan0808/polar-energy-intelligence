from pathlib import Path

import numpy as np
import pandas as pd


class RenewableService:
    """
    Renewable resource potential service.

    IMPORTANT:
    This service estimates solar/wind RESOURCE POTENTIAL.
    It does not claim actual renewable electricity generation.

    For a date already available in the NASA daily dataset:
        -> uses the actual NASA daily value.

    For a future date:
        -> uses historical day-of-year climatology as an estimate.
    """

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

        # Load daily NASA data once.
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

        # Merge daily solar + wind
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

        # Historical distributions used for normalization.
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

        # Day-of-year climatology for future dates.
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

            return 50.0

        q20 = float(
            historical_values.quantile(0.20)
        )

        q80 = float(
            historical_values.quantile(0.80)
        )

        if q80 <= q20:

            return 50.0

        score = (
            (float(value) - q20)
            / (q80 - q20)
        ) * 100

        return float(
            np.clip(
                score,
                0,
                100
            )
        )

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

        # --------------------------------------------------------
        # First try actual NASA daily data
        # --------------------------------------------------------

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

            # If both are available, return actual NASA values.
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

        # --------------------------------------------------------
        # Future date:
        # Use historical day-of-year climatology.
        # --------------------------------------------------------

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

        if climatology_row.empty:

            # Fallback to monthly climatology
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
                        row["ALLSKY_SFC_SW_DWN"]
                    ),
                    float(
                        row["WS50M"]
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

        row = climatology_row.iloc[0]

        return (
            float(
                row["ALLSKY_SFC_SW_DWN"]
            )
            if pd.notna(
                row["ALLSKY_SFC_SW_DWN"]
            )
            else np.nan,

            float(
                row["WS50M"]
            )
            if pd.notna(
                row["WS50M"]
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

        solar_score = self._score(
            solar_value,
            self.solar_distribution
        )

        wind_score = self._score(
            wind_value,
            self.wind_distribution
        )

        # Weighted renewable-resource score
        renewable_index = (
            0.60 * solar_score
            + 0.40 * wind_score
        )

        # --------------------------------------------------------
        # Classify availability
        # --------------------------------------------------------

        if renewable_index >= 70:

            status = "HIGH"

        elif renewable_index >= 40:

            status = "MODERATE"

        else:

            status = "LOW"

        # --------------------------------------------------------
        # Recommendation
        # --------------------------------------------------------

        if renewable_index >= 70:

            action = (
                "Prioritize renewable-rich periods "
                "for flexible loads and reduce "
                "unnecessary generator dependence."
            )

        elif renewable_index < 40:

            action = (
                "Conserve fuel and prioritize "
                "essential loads because renewable "
                "resource potential is limited."
            )

        else:

            action = (
                "Maintain balanced renewable and "
                "generator operation while monitoring "
                "the next forecast period."
            )

        return {

            "date": date.strftime(
                "%Y-%m-%d"
            ),

            "solar": {
                "value": round(
                    solar_value,
                    3
                )
                if not np.isnan(solar_value)
                else None,

                "unit": (
                    "kWh/m²/day"
                ),

                "potential": round(
                    solar_score,
                    1
                )
            },

            "wind": {
                "value": round(
                    wind_value,
                    3
                )
                if not np.isnan(wind_value)
                else None,

                "unit": "m/s",

                "potential": round(
                    wind_score,
                    1
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

            "note": (
                "Renewable potential is a normalized "
                "resource-availability estimate. "
                "It is not measured renewable "
                "electricity generation."
            )
        }

    # ============================================================
    # EXISTING 12-MONTH RENEWABLE PROFILE
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

            solar_scores.append(
                self._score(
                    solar_value,
                    self.solar_distribution
                )
            )

            wind_scores.append(
                self._score(
                    wind_value,
                    self.wind_distribution
                )
            )

        renewable_scores = [
            0.60 * solar
            + 0.40 * wind
            for solar, wind in zip(
                solar_scores,
                wind_scores
            )
        ]

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

            "note": (
                "Estimated renewable resource "
                "potential, not measured generation."
            )
        }