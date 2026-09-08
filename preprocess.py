# ============================================================
# preprocess.py
# AI-Driven Smart Energy Management System
# Polar Research Station - Mawson
# ============================================================

from pathlib import Path
import pandas as pd
import numpy as np


# ============================================================
# 1. PROJECT PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

RAW_DIR = BASE_DIR / "data" / "raw"
NASA_DIR = RAW_DIR / "NASA"
PROCESSED_DIR = BASE_DIR / "data" / "processed"

PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

ELECTRICITY_FILE = RAW_DIR / "indicator_59.csv"
FUEL_FILE = RAW_DIR / "indicator_56.csv"

OUTPUT_FILE = (
    PROCESSED_DIR /
    "mawson_monthly_energy_weather.csv"
)


# ============================================================
# 2. NASA DATASET CONFIGURATION
# ============================================================

NASA_FILES = {
    "POWER_Point_Daily_realativehumidnew.csv": {
        "value_column": "RH2M",
        "skiprows": 9
    },

    "POWER_Point_Daily_solarnew.csv": {
        "value_column": "ALLSKY_SFC_SW_DWN",
        "skiprows": 9
    },

    "POWER_Point_Daily_surfacepressure new.csv": {
        "value_column": "PS",
        "skiprows": 9
    },

    "POWER_Point_Daily_tempn.csv": {
        "value_column": "T2M",
        "skiprows": 9
    },

    "POWER_Point_Daily_tempmmnew.csv": {
        "value_column": "T2M_MAX",
        "skiprows": 10
    },

    "POWER_Point_Daily_winddirec new.csv": {
        "value_column": "WD50M",
        "skiprows": 9
    },

    "POWER_Point_Daily_windnew.csv": {
        "value_column": "WS50M",
        "skiprows": 9
    },

    "POWER_Point_Daily_windspeedmmnew.csv": {
        "value_column": "WS10M_MAX",
        "skiprows": 10
    }
}


# ============================================================
# 3. HELPER FUNCTION
# ============================================================

def clean_numeric(series):
    """
    Convert values to numeric and replace NASA
    missing-value codes with NaN.
    """

    series = pd.to_numeric(
        series,
        errors="coerce"
    )

    series = series.replace(
        [-999, -999.0, -9999, -9999.0],
        np.nan
    )

    return series


# ============================================================
# 4. READ NASA DATA
# ============================================================

def read_nasa_file(
    filename,
    value_column,
    skiprows
):

    filepath = NASA_DIR / filename

    if not filepath.exists():
        raise FileNotFoundError(
            f"NASA file not found:\n{filepath}"
        )

    print(
        f"Reading NASA: {filename}"
    )

    df = pd.read_csv(
        filepath,
        skiprows=skiprows
    )

    # Clean column names
    df.columns = (
        df.columns
        .astype(str)
        .str.strip()
    )

    required_columns = [
        "YEAR",
        "MO",
        "DY",
        value_column
    ]

    missing_columns = [
        col
        for col in required_columns
        if col not in df.columns
    ]

    if missing_columns:

        raise ValueError(
            f"\nMissing columns in {filename}: "
            f"{missing_columns}\n"
            f"Available columns: "
            f"{list(df.columns)}"
        )

    df = df[
        required_columns
    ].copy()

    # Convert values
    for column in required_columns:

        df[column] = clean_numeric(
            df[column]
        )

    # Remove rows without valid date
    df = df.dropna(
        subset=[
            "YEAR",
            "MO",
            "DY"
        ]
    )

    # Create date
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
# 5. PROCESS NASA WEATHER DATA
# ============================================================

def process_nasa_weather():

    print(
        "\nMerging NASA weather datasets..."
    )

    nasa_daily = None

    for filename, config in NASA_FILES.items():

        df = read_nasa_file(
            filename,
            config["value_column"],
            config["skiprows"]
        )

        if nasa_daily is None:

            nasa_daily = df

        else:

            nasa_daily = nasa_daily.merge(
                df,
                on="date",
                how="outer"
            )

    if nasa_daily is None or nasa_daily.empty:

        raise ValueError(
            "NASA datasets could not be loaded."
        )

    nasa_daily = (
        nasa_daily
        .sort_values("date")
        .reset_index(drop=True)
    )

    print(
        "Converting daily NASA data "
        "to monthly averages..."
    )

    # Create monthly date
    nasa_daily["month_date"] = (
        nasa_daily["date"]
        .dt.to_period("M")
        .dt.to_timestamp()
    )

    weather_columns = [
        "ALLSKY_SFC_SW_DWN",
        "WS50M",
        "WD50M",
        "PS",
        "T2M",
        "RH2M",
        "T2M_MAX",
        "WS10M_MAX"
    ]

    # Monthly averages
    nasa_monthly = (
        nasa_daily
        .groupby("month_date")[
            weather_columns
        ]
        .mean()
        .reset_index()
    )

    nasa_monthly = (
        nasa_monthly
        .rename(
            columns={
                "month_date": "date"
            }
        )
    )

    # --------------------------------------------------------
    # Process minimum temperature and wind speed
    # --------------------------------------------------------

    minimum_files = {

        "POWER_Point_Daily_tempmmnew.csv": {
            "value_column": "T2M_MIN",
            "skiprows": 10
        },

        "POWER_Point_Daily_windspeedmmnew.csv": {
            "value_column": "WS10M_MIN",
            "skiprows": 10
        }
    }

    for filename, config in minimum_files.items():

        filepath = NASA_DIR / filename

        if not filepath.exists():

            print(
                f"Warning: {filename} not found."
            )

            continue

        df = pd.read_csv(
            filepath,
            skiprows=config["skiprows"]
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
            config["value_column"]
        ]

        if not all(
            column in df.columns
            for column in required
        ):

            print(
                f"Warning: required columns "
                f"not found in {filename}"
            )

            continue

        df = df[
            required
        ].copy()

        for column in required:

            df[column] = clean_numeric(
                df[column]
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

        df["month_date"] = (
            df["date"]
            .dt.to_period("M")
            .dt.to_timestamp()
        )

        monthly = (
            df
            .groupby("month_date")[
                config["value_column"]
            ]
            .mean()
            .reset_index()
            .rename(
                columns={
                    "month_date": "date"
                }
            )
        )

        nasa_monthly = nasa_monthly.merge(
            monthly,
            on="date",
            how="outer"
        )

    nasa_monthly = (
        nasa_monthly
        .sort_values("date")
        .reset_index(drop=True)
    )

    print(
        f"NASA monthly records: "
        f"{len(nasa_monthly)}"
    )

    return nasa_monthly


# ============================================================
# 6. PROCESS ELECTRICITY DATA
# ============================================================

def process_electricity():

    print(
        "\nReading electricity dataset..."
    )

    if not ELECTRICITY_FILE.exists():

        raise FileNotFoundError(
            f"Electricity file not found:\n"
            f"{ELECTRICITY_FILE}"
        )

    df = pd.read_csv(
        ELECTRICITY_FILE,
        header=1
    )

    df.columns = (
        df.columns
        .astype(str)
        .str.strip()
    )

    print(
        "Electricity columns:"
    )

    print(
        list(df.columns)
    )

    required = [
        "Date",
        "Place",
        "Value"
    ]

    for column in required:

        if column not in df.columns:

            raise ValueError(
                f"Column '{column}' "
                f"not found in electricity dataset."
            )

    # Filter Mawson
    df["Place"] = (
        df["Place"]
        .astype(str)
        .str.strip()
    )

    mawson = df[
        df["Place"]
        .str.contains(
            "Mawson",
            case=False,
            na=False
        )
    ].copy()

    print(
        f"Mawson electricity records: "
        f"{len(mawson)}"
    )

    # --------------------------------------------------------
    # IMPORTANT:
    # Dataset contains dates such as Jan-86.
    # Correct format = %b-%y
    # --------------------------------------------------------

    mawson["date"] = pd.to_datetime(
        mawson["Date"]
        .astype(str)
        .str.strip(),
        format="%b-%y",
        errors="coerce"
    )

    invalid_dates = (
        mawson["date"]
        .isna()
        .sum()
    )

    if invalid_dates > 0:

        print(
            f"Warning: {invalid_dates} "
            f"electricity dates could not be parsed."
        )

    mawson["electricity_kwh"] = (
        clean_numeric(
            mawson["Value"]
        )
    )

    mawson = mawson.dropna(
        subset=["date"]
    )

    # Ensure month-level date
    mawson["date"] = (
        mawson["date"]
        .dt.to_period("M")
        .dt.to_timestamp()
    )

    # Aggregate monthly electricity
    electricity_monthly = (
        mawson
        .groupby("date")[
            "electricity_kwh"
        ]
        .sum(min_count=1)
        .reset_index()
    )

    print(
        f"Monthly electricity records: "
        f"{len(electricity_monthly)}"
    )

    return electricity_monthly


# ============================================================
# 7. PROCESS FUEL DATA
# ============================================================

def process_fuel():

    print(
        "\nReading fuel dataset..."
    )

    if not FUEL_FILE.exists():

        raise FileNotFoundError(
            f"Fuel file not found:\n"
            f"{FUEL_FILE}"
        )

    df = pd.read_csv(
        FUEL_FILE,
        header=1
    )

    df.columns = (
        df.columns
        .astype(str)
        .str.strip()
    )

    print(
        "Fuel columns:"
    )

    print(
        list(df.columns)
    )

    required = [
        "Date",
        "Place",
        "Value"
    ]

    for column in required:

        if column not in df.columns:

            raise ValueError(
                f"Column '{column}' "
                f"not found in fuel dataset."
            )

    # Filter Mawson
    df["Place"] = (
        df["Place"]
        .astype(str)
        .str.strip()
    )

    mawson = df[
        df["Place"]
        .str.contains(
            "Mawson",
            case=False,
            na=False
        )
    ].copy()

    print(
        f"Mawson fuel records: "
        f"{len(mawson)}"
    )

    # --------------------------------------------------------
    # Fuel dates are Jan-93, Feb-93, etc.
    # Correct format = %b-%y
    # --------------------------------------------------------

    mawson["date"] = pd.to_datetime(
        mawson["Date"]
        .astype(str)
        .str.strip(),
        format="%b-%y",
        errors="coerce"
    )

    invalid_dates = (
        mawson["date"]
        .isna()
        .sum()
    )

    if invalid_dates > 0:

        print(
            f"Warning: {invalid_dates} "
            f"fuel dates could not be parsed."
        )

    mawson["fuel_litres"] = (
        clean_numeric(
            mawson["Value"]
        )
    )

    mawson = mawson.dropna(
        subset=["date"]
    )

    mawson["date"] = (
        mawson["date"]
        .dt.to_period("M")
        .dt.to_timestamp()
    )

    # Aggregate monthly fuel consumption
    fuel_monthly = (
        mawson
        .groupby("date")[
            "fuel_litres"
        ]
        .sum(min_count=1)
        .reset_index()
    )

    print(
        f"Monthly fuel records: "
        f"{len(fuel_monthly)}"
    )

    return fuel_monthly


# ============================================================
# 8. BUILD FINAL DATASET
# ============================================================

def build_final_dataset():

    # Process all three sources
    nasa_monthly = (
        process_nasa_weather()
    )

    electricity_monthly = (
        process_electricity()
    )

    fuel_monthly = (
        process_fuel()
    )

    print(
        "\nMerging electricity + "
        "fuel + NASA weather..."
    )

    # --------------------------------------------------------
    # Merge electricity + fuel
    # --------------------------------------------------------

    final_df = electricity_monthly.merge(
        fuel_monthly,
        on="date",
        how="outer"
    )

    # --------------------------------------------------------
    # Merge weather
    # --------------------------------------------------------

    final_df = final_df.merge(
        nasa_monthly,
        on="date",
        how="left"
    )

    # Sort chronologically
    final_df = (
        final_df
        .sort_values("date")
        .reset_index(drop=True)
    )

    # ========================================================
    # 9. TIME FEATURES
    # ========================================================

    final_df["year"] = (
        final_df["date"].dt.year
    )

    final_df["month"] = (
        final_df["date"].dt.month
    )

    final_df["quarter"] = (
        final_df["date"].dt.quarter
    )

    # ========================================================
    # 10. COLUMN ORDER
    # ========================================================

    desired_columns = [

        "date",

        # Energy targets
        "electricity_kwh",
        "fuel_litres",

        # Renewable / weather features
        "ALLSKY_SFC_SW_DWN",
        "WS50M",
        "WD50M",

        # Environmental conditions
        "PS",
        "T2M",
        "RH2M",
        "T2M_MAX",
        "T2M_MIN",

        # Wind extremes
        "WS10M_MAX",
        "WS10M_MIN",

        # Time features
        "year",
        "month",
        "quarter"
    ]

    existing_columns = [
        column
        for column in desired_columns
        if column in final_df.columns
    ]

    final_df = final_df[
        existing_columns
    ]

    # ========================================================
    # 11. SAVE DATASET
    # ========================================================

    final_df.to_csv(
        OUTPUT_FILE,
        index=False
    )

    # ========================================================
    # 12. VALIDATION
    # ========================================================

    print("\n")
    print("=" * 80)
    print("PREPROCESSING COMPLETE")
    print("=" * 80)

    print("\nOutput file:")
    print(OUTPUT_FILE)

    print(
        f"\nTotal monthly rows: "
        f"{len(final_df)}"
    )

    print(
        f"Total columns: "
        f"{len(final_df.columns)}"
    )

    if not final_df.empty:

        print("\nDate range:")

        print(
            f"{final_df['date'].min()} "
            f"-> "
            f"{final_df['date'].max()}"
        )

    print(
        "\nMissing electricity values: "
        f"{final_df['electricity_kwh'].isna().sum()}"
    )

    print(
        "Missing fuel values: "
        f"{final_df['fuel_litres'].isna().sum()}"
    )

    print("\nFinal columns:")

    for column in final_df.columns:

        print(
            f"  - {column}"
        )

    print("\nFirst 5 rows:")

    print(
        final_df
        .head(5)
        .to_string(index=False)
    )

    print("\nLast 5 rows:")

    print(
        final_df
        .tail(5)
        .to_string(index=False)
    )

    print("\n" + "=" * 80)

    print(
        "Dataset successfully saved."
    )

    print("=" * 80)

    return final_df


# ============================================================
# 13. MAIN
# ============================================================

if __name__ == "__main__":

    try:

        build_final_dataset()

    except Exception as error:

        print("\n")
        print("=" * 80)
        print("PREPROCESSING FAILED")
        print("=" * 80)

        print(
            f"\nError: {error}"
        )

        raise