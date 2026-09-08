from pathlib import Path
from typing import List

import joblib
import numpy as np
import pandas as pd


class EnergyModelService:
    """
    Energy forecasting service for the Polar Energy Intelligence system.

    Historical dates:
        Returns the exact monthly Mawson electricity/fuel value when
        that month exists in the dataset.

    Future dates:
        Uses the trained Random Forest model with historical seasonal
        context to generate a monthly forecast.

    Important:
        Mawson electricity/fuel data is monthly. Therefore, when a
        specific day is entered for a historical month, the system
        returns that month's exact monthly observation and also shows
        a simple daily equivalent for comparison.
    """

    def __init__(self):
        # ============================================================
        # PATHS
        # ============================================================

        self.root = Path(__file__).resolve().parents[2]

        self.data_path = (
            self.root
            / "data"
            / "processed"
            / "mawson_monthly_energy_weather.csv"
        )

        self.models_path = self.root / "models"

        if not self.data_path.exists():
            raise FileNotFoundError(
                f"Processed dataset not found: {self.data_path}"
            )

        # ============================================================
        # LOAD DATA
        # ============================================================

        self.df = pd.read_csv(self.data_path)

        if "date" not in self.df.columns:
            raise ValueError(
                "Processed dataset must contain a 'date' column."
            )

        self.df["date"] = pd.to_datetime(
            self.df["date"],
            errors="coerce"
        )

        self.df = (
            self.df
            .dropna(subset=["date"])
            .sort_values("date")
            .reset_index(drop=True)
        )

        # ============================================================
        # LOAD MODELS
        # ============================================================

        self.load_model = self._load_model(
            "load_model.joblib"
        )

        self.fuel_model = self._load_model(
            "fuel_model.joblib"
        )

        # ============================================================
        # LOAD METADATA
        # ============================================================

        self.load_meta = self._load_metadata(
            "load_metadata.joblib"
        )

        self.fuel_meta = self._load_metadata(
            "fuel_metadata.joblib"
        )

        self.load_features = self.load_meta["features"]
        self.fuel_features = self.fuel_meta["features"]

        # ============================================================
        # HISTORICAL LOAD
        # ============================================================

        self.load_history = (
            self.df[
                [
                    "date",
                    "electricity_kwh"
                ]
            ]
            .dropna()
            .sort_values("date")
            .copy()
        )

        # ============================================================
        # HISTORICAL FUEL
        # ============================================================

        self.fuel_history = (
            self.df[
                [
                    "date",
                    "fuel_litres"
                ]
            ]
            .dropna()
            .sort_values("date")
            .copy()
        )

        # ============================================================
        # FAST LOOKUPS
        # ============================================================

        self.load_history_indexed = (
            self.load_history
            .set_index("date")["electricity_kwh"]
            .to_dict()
        )

        self.fuel_history_indexed = (
            self.fuel_history
            .set_index("date")["fuel_litres"]
            .to_dict()
        )

        # ============================================================
        # WEATHER CLIMATOLOGY
        # ============================================================

        self.weather_climatology = (
            self._build_weather_climatology()
        )

    # ================================================================
    # FILE LOADING
    # ================================================================

    def _load_model(self, filename):

        path = self.models_path / filename

        if not path.exists():
            raise FileNotFoundError(
                f"Model not found: {path}"
            )

        return joblib.load(path)

    def _load_metadata(self, filename):

        path = (
            self.models_path
            / "metadata"
            / filename
        )

        if not path.exists():
            raise FileNotFoundError(
                f"Metadata not found: {path}"
            )

        return joblib.load(path)

    # ================================================================
    # HEALTH CHECK
    # ================================================================

    def health_check(self):

        return {
            "status": "ok",
            "dataset_rows": int(len(self.df)),
            "date_start": str(
                self.df["date"].min().date()
            ),
            "date_end": str(
                self.df["date"].max().date()
            ),
            "load_model": self.load_meta.get(
                "selected_model"
            ),
            "fuel_model": self.fuel_meta.get(
                "selected_model"
            ),
        }

    # ================================================================
    # TIME FEATURES
    # ================================================================

    @staticmethod
    def _time_features(date):

        month = int(date.month)

        return {
            "year": int(date.year),
            "month": month,
            "quarter": int(date.quarter),
            "month_sin": float(
                np.sin(
                    2 * np.pi * month / 12
                )
            ),
            "month_cos": float(
                np.cos(
                    2 * np.pi * month / 12
                )
            ),
        }

    # ================================================================
    # WEATHER CLIMATOLOGY
    # ================================================================

    def _build_weather_climatology(self):

        weather_columns = [
            "ALLSKY_SFC_SW_DWN",
            "WS50M",
            "WD50M",
            "PS",
            "T2M",
            "RH2M",
            "T2M_MAX",
            "T2M_MIN",
            "WS10M_MAX",
            "WS10M_MIN",
        ]

        available = [
            column
            for column in weather_columns
            if column in self.df.columns
        ]

        if not available:
            return pd.DataFrame()

        weather = self.df[
            self.df["date"] >=
            pd.Timestamp("1993-01-01")
        ].copy()

        weather["calendar_month"] = (
            weather["date"].dt.month
        )

        return (
            weather
            .groupby("calendar_month")[available]
            .mean(numeric_only=True)
        )

    # ================================================================
    # TRAINING MEDIANS
    # ================================================================

    def _training_medians(
        self,
        columns: List[str]
    ):

        result = {}

        for column in columns:

            if column not in self.df.columns:
                continue

            value = pd.to_numeric(
                self.df[column],
                errors="coerce"
            ).median()

            result[column] = (
                float(value)
                if pd.notna(value)
                else 0.0
            )

        return result

    # ================================================================
    # HISTORY LOOKUP
    # ================================================================

    def _history_for_target(
        self,
        target_col
    ):

        if target_col == "electricity_kwh":
            return self.load_history_indexed

        if target_col == "fuel_litres":
            return self.fuel_history_indexed

        raise ValueError(
            f"Unsupported target: {target_col}"
        )

    # ================================================================
    # FIND VALID HISTORICAL ANALOGUE
    # ================================================================

    def _find_reference_month(
        self,
        target_date,
        target_col
    ):

        history = self._history_for_target(
            target_col
        )

        if not history:
            raise ValueError(
                f"No historical data for {target_col}."
            )

        target_month = int(
            target_date.month
        )

        candidates = sorted(
            [
                pd.Timestamp(d)
                for d in history.keys()
                if pd.Timestamp(d).month
                == target_month
            ],
            reverse=True
        )

        for candidate in candidates:

            valid = True

            # Required lag values
            for lag in [
                1,
                2,
                3,
                6,
                12
            ]:

                check_date = (
                    candidate
                    - pd.DateOffset(
                        months=lag
                    )
                )

                if check_date not in history:
                    valid = False
                    break

            if not valid:
                continue

            # Required rolling-history values
            for window in [
                3,
                6,
                12
            ]:

                for offset in range(
                    1,
                    window + 1
                ):

                    check_date = (
                        candidate
                        - pd.DateOffset(
                            months=offset
                        )
                    )

                    if check_date not in history:
                        valid = False
                        break

                if not valid:
                    break

            if valid:
                return candidate

        raise ValueError(
            f"No valid historical analogue found "
            f"for month {target_month}."
        )

    # ================================================================
    # BUILD MODEL ROW
    # ================================================================

    def _build_fast_model_row(
        self,
        requested_date,
        target_col,
        features
    ):

        requested_date = pd.Timestamp(
            requested_date
        ).normalize()

        reference_date = (
            self._find_reference_month(
                requested_date,
                target_col
            )
        )

        history = self._history_for_target(
            target_col
        )

        row = self._time_features(
            requested_date
        )

        # ------------------------------------------------------------
        # LAGS
        # ------------------------------------------------------------

        for lag in [
            1,
            2,
            3,
            6,
            12
        ]:

            column = (
                f"{target_col}_lag_{lag}"
            )

            if column in features:

                lag_date = (
                    reference_date
                    - pd.DateOffset(
                        months=lag
                    )
                )

                row[column] = float(
                    history[lag_date]
                )

        # ------------------------------------------------------------
        # ROLLING MEANS
        # ------------------------------------------------------------

        for window in [
            3,
            6,
            12
        ]:

            column = (
                f"{target_col}"
                f"_rolling_mean_{window}"
            )

            if column in features:

                values = []

                for offset in range(
                    1,
                    window + 1
                ):

                    check_date = (
                        reference_date
                        - pd.DateOffset(
                            months=offset
                        )
                    )

                    values.append(
                        float(
                            history[check_date]
                        )
                    )

                row[column] = float(
                    np.mean(values)
                )

        # ------------------------------------------------------------
        # WEATHER
        # ------------------------------------------------------------

        month = int(
            requested_date.month
        )

        if (
            not self.weather_climatology.empty
            and month in self.weather_climatology.index
        ):

            weather_values = (
                self.weather_climatology
                .loc[month]
                .dropna()
                .to_dict()
            )

            row.update(
                weather_values
            )

        # ------------------------------------------------------------
        # FALLBACK MEDIANS
        # ------------------------------------------------------------

        medians = self._training_medians(
            features
        )

        values = {}

        for feature in features:

            if feature in row:

                values[feature] = row[
                    feature
                ]

            else:

                values[feature] = medians.get(
                    feature,
                    0.0
                )

        x = pd.DataFrame(
            [values],
            columns=features
        )

        x = x.apply(
            pd.to_numeric,
            errors="coerce"
        )

        for feature in features:

            if pd.isna(
                x.loc[0, feature]
            ):

                x.loc[0, feature] = (
                    medians.get(
                        feature,
                        0.0
                    )
                )

        return x, reference_date

    # ================================================================
    # FAST MONTH PREDICTION
    # ================================================================

    def _fast_month_prediction(
        self,
        requested_date,
        target_col,
        model,
        features
    ):

        target_date = pd.Timestamp(
            requested_date
        ).normalize()

        target_month = (
            target_date
            .to_period("M")
            .to_timestamp()
        )

        history = self._history_for_target(
            target_col
        )

        # Exact historical month available
        if target_month in history:

            return (
                float(
                    history[target_month]
                ),
                True
            )

        # Otherwise generate one ML prediction
        x, reference_date = (
            self._build_fast_model_row(
                target_date,
                target_col,
                features
            )
        )

        prediction = float(
            model.predict(x)[0]
        )

        prediction = max(
            0.0,
            prediction
        )

        return (
            prediction,
            False
        )

    # ================================================================
    # DATE-SPECIFIC LOAD
    # ================================================================

    def forecast_load_for_date(
        self,
        requested_date
    ):

        date = pd.Timestamp(
            requested_date
        ).normalize()

        target_month = (
            date
            .to_period("M")
            .to_timestamp()
        )

        history = self.load_history_indexed

        # ============================================================
        # HISTORICAL ACTUAL
        # ============================================================

        if target_month in history:

            actual_monthly = float(
                history[target_month]
            )

            days = int(
                date.days_in_month
            )

            return {

                "date": date.strftime(
                    "%Y-%m-%d"
                ),

                "monthlyForecastKwh": round(
                    actual_monthly,
                    2
                ),

                "estimatedDailyLoadKwh": round(
                    actual_monthly / days,
                    2
                ),

                "actualMonthlyLoadKwh": round(
                    actual_monthly,
                    2
                ),

                "unit": "kWh/day",

                "isHistoricalActual": True,

                "dataType":
                    "HISTORICAL_ACTUAL",

                "source":
                    "Mawson electricity dataset",

                "model": None,

                "confidence": 1.0,

                "metrics":
                    self.load_meta.get(
                        "metrics",
                        {}
                    ),

                "forecastType":
                    "Historical actual from Mawson monthly dataset"
            }

        # ============================================================
        # FUTURE FORECAST
        # ============================================================

        monthly_value, _ = (
            self._fast_month_prediction(
                date,
                "electricity_kwh",
                self.load_model,
                self.load_features
            )
        )

        days = int(
            date.days_in_month
        )

        daily_value = (
            monthly_value / days
        )

        r2 = float(
            self.load_meta["metrics"]["R2"]
        )

        confidence = float(
            np.clip(
                0.55
                + max(r2, 0) * 0.35,
                0.55,
                0.90
            )
        )

        return {

            "date": date.strftime(
                "%Y-%m-%d"
            ),

            "monthlyForecastKwh": round(
                monthly_value,
                2
            ),

            "estimatedDailyLoadKwh": round(
                daily_value,
                2
            ),

            "actualMonthlyLoadKwh": None,

            "unit": "kWh/day",

            "isHistoricalActual": False,

            "dataType": "FORECAST",

            "source":
                "Random Forest model + historical seasonal context",

            "model":
                self.load_meta.get(
                    "selected_model"
                ),

            "confidence": round(
                confidence,
                3
            ),

            "metrics":
                self.load_meta.get(
                    "metrics",
                    {}
                ),

            "forecastType":
                "Future estimate from monthly-trained Random Forest model"
        }

    # ================================================================
    # DATE-SPECIFIC FUEL
    # ================================================================

    def forecast_fuel_for_date(
        self,
        requested_date
    ):

        date = pd.Timestamp(
            requested_date
        ).normalize()

        target_month = (
            date
            .to_period("M")
            .to_timestamp()
        )

        history = self.fuel_history_indexed

        # ============================================================
        # HISTORICAL ACTUAL
        # ============================================================

        if target_month in history:

            actual_monthly = float(
                history[target_month]
            )

            days = int(
                date.days_in_month
            )

            return {

                "date": date.strftime(
                    "%Y-%m-%d"
                ),

                "monthlyForecastLitres": round(
                    actual_monthly,
                    2
                ),

                "estimatedDailyFuelLitres": round(
                    actual_monthly / days,
                    2
                ),

                "actualMonthlyFuelLitres": round(
                    actual_monthly,
                    2
                ),

                "unit": "litres/day",

                "isHistoricalActual": True,

                "dataType":
                    "HISTORICAL_ACTUAL",

                "source":
                    "Mawson fuel dataset",

                "model": None,

                "confidence": 1.0,

                "metrics":
                    self.fuel_meta.get(
                        "metrics",
                        {}
                    ),

                "forecastType":
                    "Historical actual from Mawson monthly dataset"
            }

        # ============================================================
        # FUTURE FORECAST
        # ============================================================

        monthly_value, _ = (
            self._fast_month_prediction(
                date,
                "fuel_litres",
                self.fuel_model,
                self.fuel_features
            )
        )

        days = int(
            date.days_in_month
        )

        daily_value = (
            monthly_value / days
        )

        r2 = float(
            self.fuel_meta["metrics"]["R2"]
        )

        confidence = float(
            np.clip(
                0.50
                + max(r2, 0) * 0.40,
                0.50,
                0.75
            )
        )

        return {

            "date": date.strftime(
                "%Y-%m-%d"
            ),

            "monthlyForecastLitres": round(
                monthly_value,
                2
            ),

            "estimatedDailyFuelLitres": round(
                daily_value,
                2
            ),

            "actualMonthlyFuelLitres": None,

            "unit": "litres/day",

            "isHistoricalActual": False,

            "dataType": "FORECAST",

            "source":
                "Random Forest model + historical seasonal context",

            "model":
                self.fuel_meta.get(
                    "selected_model"
                ),

            "confidence": round(
                confidence,
                3
            ),

            "metrics":
                self.fuel_meta.get(
                    "metrics",
                    {}
                ),

            "forecastType":
                "Future estimate from monthly-trained Random Forest model"
        }

    # ================================================================
    # 12-MONTH LOAD FORECAST
    # ================================================================

    def _recursive_forecast(
        self,
        target_col,
        model,
        features,
        horizon
    ):

        if target_col == "electricity_kwh":
            history = self.load_history.copy()
        else:
            history = self.fuel_history.copy()

        if len(history) < 24:
            raise ValueError(
                f"Not enough {target_col} history."
            )

        values = (
            history[target_col]
            .astype(float)
            .tolist()
        )

        last_date = (
            history["date"].max()
        )

        future_dates = pd.date_range(
            last_date
            + pd.offsets.MonthBegin(1),
            periods=horizon,
            freq="MS"
        )

        predictions = []

        for date in future_dates:

            x, _ = (
                self._build_fast_model_row(
                    date,
                    target_col,
                    features
                )
            )

            prediction = max(
                0.0,
                float(
                    model.predict(x)[0]
                )
            )

            values.append(
                prediction
            )

            predictions.append(
                prediction
            )

        return (
            future_dates,
            predictions
        )

    # ================================================================
    # LOAD FORECAST
    # ================================================================

    def load_forecast(
        self,
        horizon=12
    ):

        dates, predictions = (
            self._recursive_forecast(
                "electricity_kwh",
                self.load_model,
                self.load_features,
                horizon
            )
        )

        historical = (
            self.load_history
            .tail(24)
            .sort_values("date")
        )

        peak_idx = int(
            np.argmax(predictions)
        )

        latest = float(
            self.load_history[
                "electricity_kwh"
            ].iloc[-1]
        )

        r2 = float(
            self.load_meta["metrics"]["R2"]
        )

        confidence = float(
            np.clip(
                0.55
                + max(r2, 0) * 0.35,
                0.55,
                0.90
            )
        )

        return {

            "hours": [
                date.strftime("%Y-%m")
                for date in dates
            ],

            "historicalHours": [
                date.strftime("%Y-%m")
                for date in historical["date"]
            ],

            "historical": (
                historical[
                    "electricity_kwh"
                ]
                .round(2)
                .tolist()
            ),

            "predicted": [
                round(
                    value,
                    2
                )
                for value in predictions
            ],

            "peakLoad": round(
                predictions[peak_idx],
                2
            ),

            "peakTime": (
                dates[peak_idx]
                .strftime("%B %Y")
            ),

            "confidence": [
                confidence
                for _ in predictions
            ],

            "latestObservedLoad": round(
                latest,
                2
            ),

            "unit": "kWh/month",

            "model": self.load_meta.get(
                "selected_model"
            ),

            "metrics": self.load_meta.get(
                "metrics",
                {}
            )
        }

    # ================================================================
    # FUEL FORECAST
    # ================================================================

    def fuel_forecast(
        self,
        horizon=12
    ):

        dates, predictions = (
            self._recursive_forecast(
                "fuel_litres",
                self.fuel_model,
                self.fuel_features,
                horizon
            )
        )

        latest = float(
            self.fuel_history[
                "fuel_litres"
            ].iloc[-1]
        )

        r2 = float(
            self.fuel_meta["metrics"]["R2"]
        )

        confidence = float(
            np.clip(
                0.50
                + max(r2, 0) * 0.40,
                0.50,
                0.75
            )
        )

        if (
            predictions[-1]
            > predictions[0] * 1.05
        ):
            trend = "UP"

        elif (
            predictions[-1]
            < predictions[0] * 0.95
        ):
            trend = "DOWN"

        else:
            trend = "STABLE"

        return {

            "hours": [
                date.strftime("%Y-%m")
                for date in dates
            ],

            "predicted": [
                round(
                    value,
                    2
                )
                for value in predictions
            ],

            "currentConsumption": round(
                latest,
                2
            ),

            "expectedConsumption": round(
                float(
                    np.mean(
                        predictions
                    )
                ),
                2
            ),

            "peakConsumption": round(
                float(
                    np.max(
                        predictions
                    )
                ),
                2
            ),

            "trend": trend,

            "avoidableFuel": 0.0,

            "estimatedSavings": 0.0,

            "confidence": round(
                confidence,
                3
            ),

            "unit": "litres/month",

            "model": self.fuel_meta.get(
                "selected_model"
            ),

            "metrics": self.fuel_meta.get(
                "metrics",
                {}
            )
        }