from fastapi import FastAPI, HTTPException, Query
from datetime import date
import pandas as pd
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.services.model_service import EnergyModelService
from backend.services.renewable import RenewableService
from backend.services.optimizer import OptimizationService
from backend.services.recommendation_engine import RecommendationEngine

app = FastAPI(
    title="Polar Energy Intelligence API",
    version="1.0.0",
    description="Mawson-based polar energy decision-support backend.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

models = EnergyModelService()
renewable = RenewableService(models)
optimizer = OptimizationService(models, renewable)
recommender = RecommendationEngine(models, renewable, optimizer)


class SimulationParams(BaseModel):
    load: float = Field(..., ge=0)
    renewableGeneration: float = Field(..., ge=0)
    batterySOC: float = Field(default=65, ge=0, le=100)
    fuelConsumption: float = Field(..., ge=0)


@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "Polar Energy Intelligence API",
        "data_source": "Mawson historical energy + NASA POWER weather",
    }


@app.get("/api/health")
def health():
    return models.health_check()


@app.get("/api/dashboard")
def dashboard():
    try:
        return recommender.dashboard()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/load-forecast")
def load_forecast():
    try:
        return models.load_forecast()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/renewable")
def renewable_forecast(
    forecast_date: str | None = None
):
    try:
        if forecast_date:
            return renewable.forecast_for_date(
                forecast_date
            )

        return renewable.forecast()

    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc)
        )


@app.get("/api/fuel-forecast")
def fuel_forecast():
    try:
        return models.fuel_forecast()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/recommendations")
def recommendations():
    try:
        return recommender.recommendations()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@app.get("/api/forecast")
def forecast_for_date(
    forecast_date: str
):
    try:
        return recommender.forecast_for_date(
            forecast_date
        )

    except Exception as exc:

        raise HTTPException(
            status_code=400,
            detail=str(exc)
        )


@app.post("/api/simulate")
def simulate(params: SimulationParams):
    try:
        return recommender.simulate(params.model_dump())
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
