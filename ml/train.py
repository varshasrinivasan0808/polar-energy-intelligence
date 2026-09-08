"""
ML Training Pipeline for Polar Energy Intelligence

Targets:
    electricity_kwh -> Load Forecast
    fuel_litres     -> Fuel Forecast

Features:
    - Monthly time features
    - Previous-month load/fuel values
    - Seasonal lag (12 months)
    - Rolling averages
    - Solar radiation
    - Wind speed
    - Wind direction
    - Temperature
    - Relative humidity
    - Pressure

Models:
    - Random Forest Regressor
    - Seasonal Naive (12-month lag) baseline

The better model is selected using test-set RMSE.
The ACTUAL selected model is saved using joblib.
"""

import sys
from pathlib import Path
from datetime import datetime
from typing import Tuple, Dict, List

import joblib
import numpy as np
import pandas as pd

from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score
)


# ============================================================================
# CONFIGURATION
# ============================================================================

DATA_PATH = Path(
    "data/processed/mawson_monthly_energy_weather.csv"
)

MODELS_DIR = Path("models")
METADATA_DIR = MODELS_DIR / "metadata"

MODELS_DIR.mkdir(parents=True, exist_ok=True)
METADATA_DIR.mkdir(parents=True, exist_ok=True)


# Actual columns present in your dataset
TARGETS = {
    "load": "electricity_kwh",
    "fuel": "fuel_litres"
}


# Weather/resource columns available in your processed dataset
WEATHER_FEATURES = [
    "ALLSKY_SFC_SW_DWN",
    "WS50M",
    "WD50M",
    "PS",
    "T2M",
    "RH2M",
    "T2M_MAX",
    "T2M_MIN",
    "WS10M_MAX",
    "WS10M_MIN"
]


# ============================================================================
# TIME FEATURES
# ============================================================================

def create_time_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Create monthly temporal features.
    """

    df = df.copy()

    df["year"] = df["date"].dt.year
    df["month"] = df["date"].dt.month
    df["quarter"] = df["date"].dt.quarter

    # Cyclic representation of month
    df["month_sin"] = np.sin(
        2 * np.pi * df["month"] / 12
    )

    df["month_cos"] = np.cos(
        2 * np.pi * df["month"] / 12
    )

    return df


# ============================================================================
# LAG FEATURES
# ============================================================================

def create_lag_features(
    df: pd.DataFrame,
    target_col: str,
    lags: List[int]
) -> pd.DataFrame:
    """
    Create lag features.

    Example:
        lag_1  -> previous month
        lag_2  -> two months ago
        lag_3  -> three months ago
        lag_6  -> six months ago
        lag_12 -> same month previous year
    """

    df = df.copy()

    for lag in lags:
        df[f"{target_col}_lag_{lag}"] = (
            df[target_col].shift(lag)
        )

    return df


# ============================================================================
# ROLLING FEATURES
# ============================================================================

def create_rolling_features(
    df: pd.DataFrame,
    target_col: str,
    windows: List[int]
) -> pd.DataFrame:
    """
    Create rolling averages using only previous months.

    shift(1) ensures that the current month's target
    is NOT used in its own prediction.
    """

    df = df.copy()

    for window in windows:

        df[
            f"{target_col}_rolling_mean_{window}"
        ] = (
            df[target_col]
            .shift(1)
            .rolling(window=window)
            .mean()
        )

    return df


# ============================================================================
# FEATURE ENGINEERING
# ============================================================================

def engineer_features(
    df: pd.DataFrame,
    target_col: str
) -> Tuple[pd.DataFrame, List[str]]:
    """
    Complete feature engineering pipeline.
    """

    df = df.copy()

    # Time features
    df = create_time_features(df)

    # Lag features
    df = create_lag_features(
        df,
        target_col,
        lags=[1, 2, 3, 6, 12]
    )

    # Rolling averages
    df = create_rolling_features(
        df,
        target_col,
        windows=[3, 6, 12]
    )

    # ------------------------------------------------------------------------
    # Weather features
    # ------------------------------------------------------------------------

    available_weather = [
        col
        for col in WEATHER_FEATURES
        if col in df.columns
    ]

    # ------------------------------------------------------------------------
    # Feature list
    # ------------------------------------------------------------------------

    lag_features = [
        f"{target_col}_lag_{lag}"
        for lag in [1, 2, 3, 6, 12]
    ]

    rolling_features = [
        f"{target_col}_rolling_mean_{window}"
        for window in [3, 6, 12]
    ]

    time_features = [
        "year",
        "month",
        "quarter",
        "month_sin",
        "month_cos"
    ]

    feature_cols = (
        time_features
        + lag_features
        + rolling_features
        + available_weather
    )

    # Keep only columns that actually exist
    feature_cols = [
        col for col in feature_cols
        if col in df.columns
    ]

    # ------------------------------------------------------------------------
    # Remove rows with missing values
    # ------------------------------------------------------------------------

    # We only remove rows where the target or required features
    # are unavailable. We do NOT replace missing energy values with zero.
    df = df.dropna(
        subset=[target_col] + feature_cols
    ).copy()

    return df, feature_cols


# ============================================================================
# SEASONAL NAIVE BASELINE
# ============================================================================

class SeasonalNaiveModel:
    """
    Seasonal Naive model.

    Prediction:
        current month prediction =
        value from the same month one year ago

    Uses target_lag_12.
    """

    def __init__(self, target_col: str):
        self.target_col = target_col
        self.train_mean = None
        self.lag_column = f"{target_col}_lag_12"

    def fit(
        self,
        X_train: pd.DataFrame,
        y_train: pd.Series
    ):
        self.train_mean = float(y_train.mean())
        return self

    def predict(
        self,
        X_test: pd.DataFrame
    ) -> np.ndarray:

        if self.lag_column not in X_test.columns:
            return np.full(
                len(X_test),
                self.train_mean
            )

        predictions = X_test[
            self.lag_column
        ].to_numpy(dtype=float)

        # Fallback only if a lag value is unavailable
        predictions = np.where(
            np.isnan(predictions),
            self.train_mean,
            predictions
        )

        return predictions


# ============================================================================
# RANDOM FOREST
# ============================================================================

def train_random_forest(
    X_train: pd.DataFrame,
    y_train: pd.Series
) -> RandomForestRegressor:
    """
    Train Random Forest for monthly energy forecasting.
    """

    model = RandomForestRegressor(
        n_estimators=300,
        max_depth=10,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1
    )

    model.fit(X_train, y_train)

    return model


# ============================================================================
# MODEL EVALUATION
# ============================================================================

def calculate_mape(
    y_true: np.ndarray,
    y_pred: np.ndarray
) -> float:
    """
    Calculate MAPE safely.
    """

    y_true = np.asarray(y_true)
    y_pred = np.asarray(y_pred)

    mask = y_true != 0

    if mask.sum() == 0:
        return np.nan

    return float(
        np.mean(
            np.abs(
                (y_true[mask] - y_pred[mask])
                / y_true[mask]
            )
        ) * 100
    )


def evaluate_model(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    model_name: str
) -> Dict[str, float]:
    """
    Calculate regression metrics.
    """

    mae = mean_absolute_error(
        y_true,
        y_pred
    )

    rmse = np.sqrt(
        mean_squared_error(
            y_true,
            y_pred
        )
    )

    mape = calculate_mape(
        y_true,
        y_pred
    )

    r2 = r2_score(
        y_true,
        y_pred
    )

    return {
        "model": model_name,
        "MAE": float(mae),
        "RMSE": float(rmse),
        "MAPE": float(mape)
        if not np.isnan(mape)
        else np.nan,
        "R2": float(r2)
    }


# ============================================================================
# PRINT METRICS
# ============================================================================

def print_metrics(
    rf_metrics: Dict[str, float],
    baseline_metrics: Dict[str, float]
):

    print("\n" + "-" * 90)

    print(
        f"{'Metric':<15}"
        f"{'RandomForest':<25}"
        f"{'Seasonal Naive':<25}"
    )

    print("-" * 90)

    for metric in [
        "MAE",
        "RMSE",
        "MAPE",
        "R2"
    ]:

        rf_value = rf_metrics[metric]
        baseline_value = baseline_metrics[metric]

        if np.isnan(rf_value):
            rf_text = "N/A"
        else:
            rf_text = f"{rf_value:.4f}"

        if np.isnan(baseline_value):
            baseline_text = "N/A"
        else:
            baseline_text = f"{baseline_value:.4f}"

        if metric == "MAPE":

            rf_text += (
                "%"
                if rf_text != "N/A"
                else ""
            )

            baseline_text += (
                "%"
                if baseline_text != "N/A"
                else ""
            )

        print(
            f"{metric:<15}"
            f"{rf_text:<25}"
            f"{baseline_text:<25}"
        )

    print("-" * 90)


# ============================================================================
# TRAIN ONE TARGET
# ============================================================================

def train_target(
    df: pd.DataFrame,
    target_name: str,
    target_col: str
):

    print("\n" + "=" * 90)

    print(
        f"TRAINING {target_name.upper()} FORECAST MODEL"
    )

    print("=" * 90)

    # ------------------------------------------------------------------------
    # Target information
    # ------------------------------------------------------------------------

    print(f"\nTarget column: {target_col}")

    missing_count = df[target_col].isna().sum()

    print(
        f"Total records: {len(df)}"
    )

    print(
        f"Missing target values: {missing_count}"
    )

    # Do not replace missing target values with zero
    df_target = df.dropna(
        subset=[target_col]
    ).copy()

    print(
        f"Usable target records: {len(df_target)}"
    )

    if len(df_target) < 30:

        print(
            "❌ Not enough records for training."
        )

        return None

    # ------------------------------------------------------------------------
    # Feature engineering
    # ------------------------------------------------------------------------

    print("\n🔧 Creating features...")

    df_features, feature_cols = engineer_features(
        df_target,
        target_col
    )

    print(
        f"Records after feature engineering: "
        f"{len(df_features)}"
    )

    print(
        f"Number of features: "
        f"{len(feature_cols)}"
    )

    print("\nFeatures:")

    for feature in feature_cols:
        print(f"  • {feature}")

    if len(df_features) < 20:

        print(
            "\n❌ Not enough samples after "
            "feature engineering."
        )

        return None

    # ------------------------------------------------------------------------
    # Chronological split
    # ------------------------------------------------------------------------

    split_idx = int(
        len(df_features) * 0.80
    )

    train_data = (
        df_features
        .iloc[:split_idx]
        .copy()
    )

    test_data = (
        df_features
        .iloc[split_idx:]
        .copy()
    )

    X_train = train_data[
        feature_cols
    ]

    y_train = train_data[
        target_col
    ]

    X_test = test_data[
        feature_cols
    ]

    y_test = test_data[
        target_col
    ]

    print("\n📈 Chronological Train/Test Split")

    print(
        f"Train samples: {len(train_data)}"
    )

    print(
        f"Train period: "
        f"{train_data['date'].min().date()} "
        f"to "
        f"{train_data['date'].max().date()}"
    )

    print(
        f"Test samples: {len(test_data)}"
    )

    print(
        f"Test period: "
        f"{test_data['date'].min().date()} "
        f"to "
        f"{test_data['date'].max().date()}"
    )

    # ------------------------------------------------------------------------
    # Random Forest
    # ------------------------------------------------------------------------

    print(
        "\n🤖 Training Random Forest..."
    )

    model_rf = train_random_forest(
        X_train,
        y_train
    )

    y_pred_rf = model_rf.predict(
        X_test
    )

    rf_metrics = evaluate_model(
        y_test.to_numpy(),
        y_pred_rf,
        "RandomForest"
    )

    print(
        "✓ Random Forest trained"
    )

    # ------------------------------------------------------------------------
    # Seasonal Naive
    # ------------------------------------------------------------------------

    print(
        "\n📊 Evaluating Seasonal Naive "
        "(12-month lag)..."
    )

    model_baseline = SeasonalNaiveModel(
        target_col
    )

    model_baseline.fit(
        X_train,
        y_train
    )

    y_pred_baseline = (
        model_baseline.predict(
            X_test
        )
    )

    baseline_metrics = evaluate_model(
        y_test.to_numpy(),
        y_pred_baseline,
        "Seasonal Naive"
    )

    print(
        "✓ Seasonal Naive evaluated"
    )

    # ------------------------------------------------------------------------
    # Compare models
    # ------------------------------------------------------------------------

    print(
        f"\n📊 MODEL COMPARISON"
    )

    print_metrics(
        rf_metrics,
        baseline_metrics
    )

    # Lower RMSE is better
    if rf_metrics["RMSE"] <= baseline_metrics["RMSE"]:

        selected_model = model_rf
        selected_name = "RandomForest"
        selected_metrics = rf_metrics

    else:

        selected_model = model_baseline
        selected_name = "Seasonal Naive (Lag-12)"
        selected_metrics = baseline_metrics

    print(
        f"\n✅ Selected model: "
        f"{selected_name}"
    )

    print(
        f"   RMSE: "
        f"{selected_metrics['RMSE']:.4f}"
    )

    # ------------------------------------------------------------------------
    # Feature importance
    # ------------------------------------------------------------------------

    feature_importance = {}

    if hasattr(
        model_rf,
        "feature_importances_"
    ):

        feature_importance = dict(
            sorted(
                zip(
                    feature_cols,
                    model_rf.feature_importances_
                ),
                key=lambda x: x[1],
                reverse=True
            )
        )

    # ------------------------------------------------------------------------
    # Save model
    # ------------------------------------------------------------------------

    model_path = (
        MODELS_DIR
        / f"{target_name}_model.joblib"
    )

    joblib.dump(
        selected_model,
        model_path
    )

    print(
        f"\n💾 Model saved:"
    )

    print(
        f"   {model_path}"
    )

    # ------------------------------------------------------------------------
    # Save metadata
    # ------------------------------------------------------------------------

    metadata = {

        "target_name": target_name,

        "target_column": target_col,

        "target_unit": (
            "kWh"
            if target_name == "load"
            else "litres"
        ),

        "selected_model": selected_name,

        "features": feature_cols,

        "n_features": len(feature_cols),

        "training_samples": len(train_data),

        "testing_samples": len(test_data),

        "train_start": str(
            train_data["date"].min()
        ),

        "train_end": str(
            train_data["date"].max()
        ),

        "test_start": str(
            test_data["date"].min()
        ),

        "test_end": str(
            test_data["date"].max()
        ),

        "metrics": {

            "MAE": float(
                selected_metrics["MAE"]
            ),

            "RMSE": float(
                selected_metrics["RMSE"]
            ),

            "MAPE": (
                float(
                    selected_metrics["MAPE"]
                )
                if not np.isnan(
                    selected_metrics["MAPE"]
                )
                else None
            ),

            "R2": float(
                selected_metrics["R2"]
            )
        },

        "random_forest_metrics": rf_metrics,

        "seasonal_naive_metrics": baseline_metrics,

        "feature_importance": feature_importance,

        "training_date": datetime.now().isoformat(),

        "data_source": (
            "Mawson monthly energy + "
            "weather dataset"
        )
    }

    metadata_path = (
        METADATA_DIR
        / f"{target_name}_metadata.joblib"
    )

    joblib.dump(
        metadata,
        metadata_path
    )

    print(
        f"✓ Metadata saved:"
    )

    print(
        f"   {metadata_path}"
    )

    return {
        "target": target_name,
        "selected_model": selected_name,
        "metrics": selected_metrics,
        "samples": len(df_features)
    }


# ============================================================================
# MAIN
# ============================================================================

def main():

    print("=" * 90)

    print(
        "POLAR ENERGY INTELLIGENCE"
    )

    print(
        "ML TRAINING PIPELINE"
    )

    print("=" * 90)

    # ------------------------------------------------------------------------
    # Check dataset
    # ------------------------------------------------------------------------

    if not DATA_PATH.exists():

        print(
            f"\n❌ Dataset not found:"
        )

        print(
            f"   {DATA_PATH}"
        )

        print(
            "\nMake sure the processed dataset exists."
        )

        sys.exit(1)

    # ------------------------------------------------------------------------
    # Load dataset
    # ------------------------------------------------------------------------

    print(
        f"\n📂 Loading dataset:"
    )

    print(
        f"   {DATA_PATH}"
    )

    df = pd.read_csv(
        DATA_PATH
    )

    # ------------------------------------------------------------------------
    # Validate date
    # ------------------------------------------------------------------------

    if "date" not in df.columns:

        print(
            "\n❌ Error: 'date' column not found."
        )

        sys.exit(1)

    df["date"] = pd.to_datetime(
        df["date"],
        errors="coerce"
    )

    df = df.dropna(
        subset=["date"]
    )

    df = (
        df
        .sort_values("date")
        .reset_index(drop=True)
    )

    # ------------------------------------------------------------------------
    # Dataset information
    # ------------------------------------------------------------------------

    print(
        f"\n✓ Loaded {len(df)} records"
    )

    print(
        f"Date range: "
        f"{df['date'].min().date()} "
        f"to "
        f"{df['date'].max().date()}"
    )

    print(
        "\nDataset columns:"
    )

    for column in df.columns:
        print(f"  • {column}")

    # ------------------------------------------------------------------------
    # Validate targets
    # ------------------------------------------------------------------------

    print(
        "\n🎯 Target Mapping:"
    )

    print(
        "  Load → electricity_kwh"
    )

    print(
        "  Fuel → fuel_litres"
    )

    for target_name, target_col in TARGETS.items():

        if target_col not in df.columns:

            print(
                f"\n❌ Missing target column: "
                f"{target_col}"
            )

            print(
                "Available columns:"
            )

            print(
                df.columns.tolist()
            )

            sys.exit(1)

    # ------------------------------------------------------------------------
    # Weather feature information
    # ------------------------------------------------------------------------

    available_weather = [
        col
        for col in WEATHER_FEATURES
        if col in df.columns
    ]

    print(
        "\n🌦️ Available weather/resource features:"
    )

    for feature in available_weather:
        print(f"  • {feature}")

    # ------------------------------------------------------------------------
    # Train models
    # ------------------------------------------------------------------------

    results = []

    for target_name, target_col in TARGETS.items():

        result = train_target(
            df,
            target_name,
            target_col
        )

        if result is not None:
            results.append(result)

    # ------------------------------------------------------------------------
    # Final summary
    # ------------------------------------------------------------------------

    print(
        "\n" + "=" * 90
    )

    print(
        "TRAINING SUMMARY"
    )

    print(
        "=" * 90
    )

    if not results:

        print(
            "\n❌ No models were successfully trained."
        )

        sys.exit(1)

    for result in results:

        print(
            f"\n{result['target'].upper()} FORECAST"
        )

        print(
            f"  Selected model: "
            f"{result['selected_model']}"
        )

        print(
            f"  Samples used: "
            f"{result['samples']}"
        )

        metrics = result["metrics"]

        print(
            f"  MAE:  {metrics['MAE']:.4f}"
        )

        print(
            f"  RMSE: {metrics['RMSE']:.4f}"
        )

        if np.isnan(metrics["MAPE"]):

            print(
                "  MAPE: N/A"
            )

        else:

            print(
                f"  MAPE: {metrics['MAPE']:.4f}%"
            )

        print(
            f"  R²:   {metrics['R2']:.4f}"
        )

    # ------------------------------------------------------------------------
    # Files
    # ------------------------------------------------------------------------

    print(
        "\n" + "=" * 90
    )

    print(
        "FILES CREATED"
    )

    print(
        "=" * 90
    )

    for result in results:

        target = result["target"]

        print(
            f"  ✓ models/{target}_model.joblib"
        )

        print(
            f"  ✓ models/metadata/"
            f"{target}_metadata.joblib"
        )

    print(
        "\n✅ ML training completed successfully!"
    )

    print(
        "=" * 90
    )


# ============================================================================
# ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    main()