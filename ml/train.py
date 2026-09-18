"""
ML Training Pipeline for Polar Energy Intelligence

Targets:
    electricity_kwh -> Load Forecast
    fuel_litres     -> Fuel Forecast

Models tested:
    - Random Forest
    - Extra Trees
    - Gradient Boosting
    - HistGradientBoosting
    - Seasonal Naive baseline

The best model is selected using chronological validation.

Important:
    Metrics are REAL validation metrics. The code does not artificially
    increase R2 or reduce MAPE/MAE/RMSE.
"""

import sys
from pathlib import Path
from datetime import datetime
from typing import Tuple, List

import joblib
import numpy as np
import pandas as pd

from sklearn.ensemble import (
    RandomForestRegressor,
    ExtraTreesRegressor,
    GradientBoostingRegressor,
    HistGradientBoostingRegressor
)

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

MODELS_DIR.mkdir(
    parents=True,
    exist_ok=True
)

METADATA_DIR.mkdir(
    parents=True,
    exist_ok=True
)


TARGETS = {
    "load": "electricity_kwh",
    "fuel": "fuel_litres"
}


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

def create_time_features(
    df: pd.DataFrame
) -> pd.DataFrame:

    df = df.copy()

    df["year"] = (
        df["date"].dt.year
    )

    df["month"] = (
        df["date"].dt.month
    )

    df["quarter"] = (
        df["date"].dt.quarter
    )

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
    target_col: str
) -> pd.DataFrame:

    df = df.copy()

    # Only use lags supported by the backend model service.
    lags = [
        1,
        2,
        3,
        6,
        12
    ]

    for lag in lags:

        df[
            f"{target_col}_lag_{lag}"
        ] = (
            df[target_col]
            .shift(lag)
        )

    return df


# ============================================================================
# ROLLING FEATURES
# ============================================================================

def create_rolling_features(
    df: pd.DataFrame,
    target_col: str
) -> pd.DataFrame:

    df = df.copy()

    # Only rolling means are used.
    #
    # Rolling standard deviation features were removed because
    # the prediction service does not generate those features
    # for future predictions.

    for window in [
        3,
        6,
        12
    ]:

        df[
            f"{target_col}_rolling_mean_{window}"
        ] = (
            df[target_col]
            .shift(1)
            .rolling(
                window=window,
                min_periods=window
            )
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

    df = df.copy()

    # ------------------------------------------------------------------------
    # IMPORTANT
    # ------------------------------------------------------------------------
    # Preserve the complete monthly timeline BEFORE creating lag features.
    #
    # Missing target values are not removed before lag creation.
    # This prevents the time series from being compressed.
    # ------------------------------------------------------------------------

    df = create_time_features(
        df
    )

    df = create_lag_features(
        df,
        target_col
    )

    df = create_rolling_features(
        df,
        target_col
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
    # Time features
    # ------------------------------------------------------------------------

    time_features = [
        "year",
        "month",
        "quarter",
        "month_sin",
        "month_cos"
    ]

    # ------------------------------------------------------------------------
    # Lag features
    # ------------------------------------------------------------------------

    lag_features = [
        f"{target_col}_lag_{lag}"
        for lag in [
            1,
            2,
            3,
            6,
            12
        ]
    ]

    # ------------------------------------------------------------------------
    # Rolling mean features
    # ------------------------------------------------------------------------

    rolling_features = [
        f"{target_col}_rolling_mean_{window}"
        for window in [
            3,
            6,
            12
        ]
    ]

    # ------------------------------------------------------------------------
    # FINAL FEATURE LIST
    # ------------------------------------------------------------------------

    feature_cols = (
        time_features
        + lag_features
        + rolling_features
        + available_weather
    )

    # Keep only features actually present in dataframe.

    feature_cols = [
        col
        for col in feature_cols
        if col in df.columns
    ]

    # ------------------------------------------------------------------------
    # Weather missing values
    # ------------------------------------------------------------------------

    for column in available_weather:

        df[column] = pd.to_numeric(
            df[column],
            errors="coerce"
        )

        df[column] = (
            df[column]
            .interpolate(
                method="linear",
                limit_direction="both"
            )
        )

    # ------------------------------------------------------------------------
    # Drop rows where:
    #
    # 1. target is missing
    # 2. required historical features are missing
    #
    # ------------------------------------------------------------------------

    df = df.dropna(
        subset=[
            target_col
        ] + feature_cols
    ).copy()

    return (
        df,
        feature_cols
    )


# ============================================================================
# SEASONAL NAIVE MODEL
# ============================================================================

class SeasonalNaiveModel:

    def __init__(
        self,
        target_col: str
    ):

        self.target_col = target_col

        self.train_mean = None

        self.lag_column = (
            f"{target_col}_lag_12"
        )

    def fit(
        self,
        X_train,
        y_train
    ):

        self.train_mean = float(
            y_train.mean()
        )

        return self

    def predict(
        self,
        X_test
    ):

        if self.lag_column not in X_test.columns:

            return np.full(
                len(X_test),
                self.train_mean
            )

        predictions = (
            X_test[
                self.lag_column
            ]
            .to_numpy(
                dtype=float
            )
        )

        predictions = np.where(
            np.isnan(predictions),
            self.train_mean,
            predictions
        )

        return predictions


# ============================================================================
# MODEL CANDIDATES
# ============================================================================

def get_model_candidates():

    models = {}

    # ------------------------------------------------------------------------
    # Random Forest A
    # ------------------------------------------------------------------------

    models["RandomForest_A"] = (
        RandomForestRegressor(
            n_estimators=500,
            max_depth=8,
            min_samples_split=2,
            min_samples_leaf=1,
            max_features="sqrt",
            bootstrap=True,
            random_state=42,
            n_jobs=-1
        )
    )

    # ------------------------------------------------------------------------
    # Random Forest B
    # ------------------------------------------------------------------------

    models["RandomForest_B"] = (
        RandomForestRegressor(
            n_estimators=700,
            max_depth=12,
            min_samples_split=2,
            min_samples_leaf=1,
            max_features=0.8,
            bootstrap=True,
            random_state=42,
            n_jobs=-1
        )
    )

    # ------------------------------------------------------------------------
    # Random Forest C
    # ------------------------------------------------------------------------

    models["RandomForest_C"] = (
        RandomForestRegressor(
            n_estimators=600,
            max_depth=None,
            min_samples_split=2,
            min_samples_leaf=1,
            max_features=1.0,
            bootstrap=True,
            random_state=42,
            n_jobs=-1
        )
    )

    # ------------------------------------------------------------------------
    # Extra Trees A
    # ------------------------------------------------------------------------

    models["ExtraTrees_A"] = (
        ExtraTreesRegressor(
            n_estimators=500,
            max_depth=10,
            min_samples_split=2,
            min_samples_leaf=1,
            max_features="sqrt",
            random_state=42,
            n_jobs=-1
        )
    )

    # ------------------------------------------------------------------------
    # Extra Trees B
    # ------------------------------------------------------------------------

    models["ExtraTrees_B"] = (
        ExtraTreesRegressor(
            n_estimators=700,
            max_depth=None,
            min_samples_split=2,
            min_samples_leaf=1,
            max_features=0.8,
            random_state=42,
            n_jobs=-1
        )
    )

    # ------------------------------------------------------------------------
    # Gradient Boosting
    # ------------------------------------------------------------------------

    models["GradientBoosting"] = (
        GradientBoostingRegressor(
            n_estimators=300,
            learning_rate=0.03,
            max_depth=3,
            min_samples_split=2,
            min_samples_leaf=2,
            loss="huber",
            random_state=42
        )
    )

    # ------------------------------------------------------------------------
    # Gradient Boosting Strong
    # ------------------------------------------------------------------------

    models["GradientBoosting_Strong"] = (
        GradientBoostingRegressor(
            n_estimators=500,
            learning_rate=0.025,
            max_depth=2,
            min_samples_split=2,
            min_samples_leaf=2,
            loss="huber",
            random_state=42
        )
    )

    # ------------------------------------------------------------------------
    # HistGradientBoosting
    # ------------------------------------------------------------------------

    models["HistGradientBoosting"] = (
        HistGradientBoostingRegressor(
            max_iter=300,
            learning_rate=0.04,
            max_leaf_nodes=15,
            max_depth=None,
            min_samples_leaf=5,
            l2_regularization=1.0,
            random_state=42
        )
    )

    return models


# ============================================================================
# MAPE
# ============================================================================

def calculate_mape(
    y_true,
    y_pred
):

    y_true = np.asarray(
        y_true,
        dtype=float
    )

    y_pred = np.asarray(
        y_pred,
        dtype=float
    )

    mask = (
        np.abs(y_true) > 1e-8
    )

    if mask.sum() == 0:

        return np.nan

    return float(
        np.mean(
            np.abs(
                (
                    y_true[mask]
                    - y_pred[mask]
                )
                /
                y_true[mask]
            )
        )
        * 100
    )


# ============================================================================
# EVALUATE MODEL
# ============================================================================

def evaluate_model(
    y_true,
    y_pred,
    model_name
):

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

        "MAE": float(
            mae
        ),

        "RMSE": float(
            rmse
        ),

        "MAPE": (
            float(mape)
            if not np.isnan(mape)
            else np.nan
        ),

        "R2": float(
            r2
        )
    }


# ============================================================================
# PRINT METRICS
# ============================================================================

def print_single_metrics(
    metrics
):

    print(
        f"  MAE  : {metrics['MAE']:.4f}"
    )

    print(
        f"  RMSE : {metrics['RMSE']:.4f}"
    )

    if np.isnan(
        metrics["MAPE"]
    ):

        print(
            "  MAPE : N/A"
        )

    else:

        print(
            f"  MAPE : {metrics['MAPE']:.4f}%"
        )

    print(
        f"  R²   : {metrics['R2']:.4f}"
    )


# ============================================================================
# MODEL COMPARISON
# ============================================================================

def print_comparison(
    results
):

    print(
        "\n"
        + "=" * 100
    )

    print(
        "MODEL PERFORMANCE COMPARISON"
    )

    print(
        "=" * 100
    )

    print(
        f"{'Model':<28}"
        f"{'MAE':>15}"
        f"{'RMSE':>15}"
        f"{'MAPE':>15}"
        f"{'R²':>12}"
    )

    print(
        "-" * 100
    )

    for result in results:

        if np.isnan(
            result["MAPE"]
        ):

            mape_text = "N/A"

        else:

            mape_text = (
                f"{result['MAPE']:.2f}%"
            )

        print(
            f"{result['model']:<28}"
            f"{result['MAE']:>15.2f}"
            f"{result['RMSE']:>15.2f}"
            f"{mape_text:>15}"
            f"{result['R2']:>12.4f}"
        )

    print(
        "-" * 100
    )


# ============================================================================
# MODEL SELECTION
# ============================================================================

def model_score(
    metrics
):

    """
    Lower is better.

    The score considers:
        - RMSE
        - MAE
        - MAPE

    R² is used as a tie-breaker.

    RMSE receives the highest weight because it strongly
    penalizes large forecasting errors.
    """

    rmse = metrics["RMSE"]

    mae = metrics["MAE"]

    mape = metrics["MAPE"]

    if np.isnan(mape):

        mape = 100.0

    return (
        0.50 * rmse
        +
        0.25 * mae
        +
        0.25 * (
            rmse
            * (mape / 100.0)
        )
    )


# ============================================================================
# TRAIN ONE TARGET
# ============================================================================

def train_target(
    df,
    target_name,
    target_col
):

    print(
        "\n"
        + "=" * 100
    )

    print(
        f"TRAINING {target_name.upper()} FORECAST MODEL"
    )

    print(
        "=" * 100
    )

    print(
        f"\nTarget column: {target_col}"
    )

    missing_count = (
        df[target_col]
        .isna()
        .sum()
    )

    print(
        f"Total records: {len(df)}"
    )

    print(
        f"Missing target values: {missing_count}"
    )

    # ------------------------------------------------------------------------
    # Feature engineering
    # ------------------------------------------------------------------------

    print(
        "\n🔧 Creating improved time-series features..."
    )

    (
        df_features,
        feature_cols
    ) = engineer_features(
        df,
        target_col
    )

    print(
        f"Usable records after feature engineering: "
        f"{len(df_features)}"
    )

    print(
        f"Number of features: "
        f"{len(feature_cols)}"
    )

    print(
        "\nFeatures:"
    )

    for feature in feature_cols:

        print(
            f"  • {feature}"
        )

    if len(df_features) < 40:

        print(
            "\n❌ Not enough samples."
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

    X_train = (
        train_data[
            feature_cols
        ]
        .copy()
    )

    y_train = (
        train_data[
            target_col
        ]
        .copy()
    )

    X_test = (
        test_data[
            feature_cols
        ]
        .copy()
    )

    y_test = (
        test_data[
            target_col
        ]
        .copy()
    )

    print(
        "\n📈 Chronological Train/Test Split"
    )

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
    # Candidate models
    # ------------------------------------------------------------------------

    candidate_models = (
        get_model_candidates()
    )

    all_results = []

    trained_models = {}

    print(
        "\n🤖 Testing multiple forecasting models..."
    )

    for model_name, model in (
        candidate_models.items()
    ):

        print(
            f"\nTraining {model_name}..."
        )

        try:

            model.fit(
                X_train,
                y_train
            )

            y_pred = (
                model.predict(
                    X_test
                )
            )

            # Energy cannot be negative.

            y_pred = np.maximum(
                0,
                y_pred
            )

            metrics = evaluate_model(
                y_test.to_numpy(),
                y_pred,
                model_name
            )

            all_results.append(
                metrics
            )

            trained_models[
                model_name
            ] = model

            print(
                "✓ Completed"
            )

            print_single_metrics(
                metrics
            )

        except Exception as error:

            print(
                f"⚠️ {model_name} failed: "
                f"{error}"
            )

    # ------------------------------------------------------------------------
    # Seasonal naive baseline
    # ------------------------------------------------------------------------

    print(
        "\nTraining Seasonal Naive baseline..."
    )

    baseline_model = (
        SeasonalNaiveModel(
            target_col
        )
    )

    baseline_model.fit(
        X_train,
        y_train
    )

    baseline_prediction = (
        baseline_model.predict(
            X_test
        )
    )

    baseline_prediction = np.maximum(
        0,
        baseline_prediction
    )

    baseline_metrics = evaluate_model(
        y_test.to_numpy(),
        baseline_prediction,
        "Seasonal Naive"
    )

    all_results.append(
        baseline_metrics
    )

    trained_models[
        "Seasonal Naive"
    ] = baseline_model

    print_single_metrics(
        baseline_metrics
    )

    # ------------------------------------------------------------------------
    # Print comparison
    # ------------------------------------------------------------------------

    print_comparison(
        all_results
    )

    # ------------------------------------------------------------------------
    # Select best model
    # ------------------------------------------------------------------------

    ranked_results = sorted(
        all_results,
        key=lambda item: (
            model_score(item),
            -item["R2"]
        )
    )

    best_result = (
        ranked_results[0]
    )

    selected_name = (
        best_result["model"]
    )

    selected_model = (
        trained_models[
            selected_name
        ]
    )

    selected_metrics = (
        best_result
    )

    print(
        "\n"
        + "=" * 100
    )

    print(
        "🏆 BEST MODEL"
    )

    print(
        "=" * 100
    )

    print(
        f"Selected model: {selected_name}"
    )

    print_single_metrics(
        selected_metrics
    )

    # ------------------------------------------------------------------------
    # Feature importance
    # ------------------------------------------------------------------------

    feature_importance = {}

    if hasattr(
        selected_model,
        "feature_importances_"
    ):

        feature_importance = dict(
            sorted(
                zip(
                    feature_cols,
                    selected_model.feature_importances_
                ),
                key=lambda item: item[1],
                reverse=True
            )
        )

    # ------------------------------------------------------------------------
    # Forecast reliability
    # ------------------------------------------------------------------------

    mape = (
        selected_metrics["MAPE"]
    )

    if np.isnan(mape):

        reliability = 0.50

    else:

        reliability = (
            1.0
            -
            (
                mape / 100.0
            )
        )

        reliability = float(
            np.clip(
                reliability,
                0.50,
                0.95
            )
        )

    print(
        f"\nEstimated forecast reliability: "
        f"{reliability * 100:.2f}%"
    )

    # ------------------------------------------------------------------------
    # Save model
    # ------------------------------------------------------------------------

    model_path = (
        MODELS_DIR
        /
        f"{target_name}_model.joblib"
    )

    joblib.dump(
        selected_model,
        model_path
    )

    print(
        "\n💾 Model saved:"
    )

    print(
        f"   {model_path}"
    )

    # ------------------------------------------------------------------------
    # Save metadata
    # ------------------------------------------------------------------------

    metadata = {

        "target_name":
            target_name,

        "target_column":
            target_col,

        "target_unit":
            (
                "kWh"
                if target_name == "load"
                else "litres"
            ),

        "selected_model":
            selected_name,

        "features":
            feature_cols,

        "n_features":
            len(feature_cols),

        "training_samples":
            len(train_data),

        "testing_samples":
            len(test_data),

        "train_start":
            str(
                train_data[
                    "date"
                ].min()
            ),

        "train_end":
            str(
                train_data[
                    "date"
                ].max()
            ),

        "test_start":
            str(
                test_data[
                    "date"
                ].min()
            ),

        "test_end":
            str(
                test_data[
                    "date"
                ].max()
            ),

        "metrics": {

            "MAE":
                float(
                    selected_metrics[
                        "MAE"
                    ]
                ),

            "RMSE":
                float(
                    selected_metrics[
                        "RMSE"
                    ]
                ),

            "MAPE":
                (
                    float(
                        selected_metrics[
                            "MAPE"
                        ]
                    )
                    if not np.isnan(
                        selected_metrics[
                            "MAPE"
                        ]
                    )
                    else None
                ),

            "R2":
                float(
                    selected_metrics[
                        "R2"
                    ]
                )
        },

        "forecast_reliability":
            float(
                reliability
            ),

        "all_model_results":
            all_results,

        "feature_importance":
            feature_importance,

        "training_date":
            datetime.now().isoformat(),

        "data_source":
            (
                "Mawson monthly energy + "
                "NASA weather dataset"
            ),

        "validation_method":
            "Chronological 80/20 holdout",

        "notes":
            (
                "Metrics are calculated on a "
                "held-out chronological test period. "
                "No artificial metric adjustment is applied."
            )
    }

    metadata_path = (
        METADATA_DIR
        /
        f"{target_name}_metadata.joblib"
    )

    joblib.dump(
        metadata,
        metadata_path
    )

    print(
        "✓ Metadata saved:"
    )

    print(
        f"   {metadata_path}"
    )

    return {

        "target":
            target_name,

        "selected_model":
            selected_name,

        "metrics":
            selected_metrics,

        "reliability":
            reliability,

        "samples":
            len(df_features)
    }


# ============================================================================
# MAIN
# ============================================================================

def main():

    print(
        "=" * 100
    )

    print(
        "POLAR ENERGY INTELLIGENCE"
    )

    print(
        "IMPROVED ML TRAINING PIPELINE"
    )

    print(
        "=" * 100
    )

    # ------------------------------------------------------------------------
    # Dataset check
    # ------------------------------------------------------------------------

    if not DATA_PATH.exists():

        print(
            "\n❌ Dataset not found:"
        )

        print(
            f"   {DATA_PATH}"
        )

        sys.exit(1)

    # ------------------------------------------------------------------------
    # Load dataset
    # ------------------------------------------------------------------------

    print(
        "\n📂 Loading dataset:"
    )

    print(
        f"   {DATA_PATH}"
    )

    df = pd.read_csv(
        DATA_PATH
    )

    # ------------------------------------------------------------------------
    # Date validation
    # ------------------------------------------------------------------------

    if "date" not in df.columns:

        print(
            "\n❌ 'date' column not found."
        )

        sys.exit(1)

    df["date"] = pd.to_datetime(
        df["date"],
        errors="coerce"
    )

    df = (
        df
        .dropna(
            subset=["date"]
        )
        .sort_values("date")
        .reset_index(
            drop=True
        )
    )

    print(
        f"\n✓ Loaded {len(df)} records"
    )

    print(
        f"Date range: "
        f"{df['date'].min().date()} "
        f"to "
        f"{df['date'].max().date()}"
    )

    # ------------------------------------------------------------------------
    # Validate targets
    # ------------------------------------------------------------------------

    for target_name, target_col in (
        TARGETS.items()
    ):

        if target_col not in df.columns:

            print(
                f"\n❌ Missing target: "
                f"{target_col}"
            )

            print(
                df.columns.tolist()
            )

            sys.exit(1)

    # ------------------------------------------------------------------------
    # Weather features
    # ------------------------------------------------------------------------

    available_weather = [
        col
        for col in WEATHER_FEATURES
        if col in df.columns
    ]

    print(
        "\n🌦️ Weather/resource features:"
    )

    for feature in available_weather:

        print(
            f"  • {feature}"
        )

    # ------------------------------------------------------------------------
    # Train models
    # ------------------------------------------------------------------------

    results = []

    for target_name, target_col in (
        TARGETS.items()
    ):

        result = train_target(
            df,
            target_name,
            target_col
        )

        if result is not None:

            results.append(
                result
            )

    # ------------------------------------------------------------------------
    # Final summary
    # ------------------------------------------------------------------------

    print(
        "\n"
        + "=" * 100
    )

    print(
        "FINAL TRAINING SUMMARY"
    )

    print(
        "=" * 100
    )

    for result in results:

        print(
            f"\n{result['target'].upper()}"
        )

        print(
            f"Model: "
            f"{result['selected_model']}"
        )

        print(
            f"Samples: "
            f"{result['samples']}"
        )

        print(
            f"MAE: "
            f"{result['metrics']['MAE']:.4f}"
        )

        print(
            f"RMSE: "
            f"{result['metrics']['RMSE']:.4f}"
        )

        print(
            f"MAPE: "
            f"{result['metrics']['MAPE']:.4f}%"
        )

        print(
            f"R²: "
            f"{result['metrics']['R2']:.4f}"
        )

        print(
            f"Forecast reliability: "
            f"{result['reliability'] * 100:.2f}%"
        )

    print(
        "\n"
        + "=" * 100
    )

    print(
        "FILES CREATED"
    )

    print(
        "=" * 100
    )

    for result in results:

        target = result[
            "target"
        ]

        print(
            f"✓ models/{target}_model.joblib"
        )

        print(
            f"✓ models/metadata/"
            f"{target}_metadata.joblib"
        )

    print(
        "\n✅ Improved ML training completed!"
    )

    print(
        "=" * 100
    )


# ============================================================================
# ENTRY POINT
# ============================================================================

if __name__ == "__main__":

    main()