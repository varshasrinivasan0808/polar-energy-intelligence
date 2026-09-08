# Polar Energy Intelligence Backend

Loads the trained Mawson load/fuel models and exposes them through FastAPI.

Run from the project root:
```powershell
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload
```

Open http://127.0.0.1:8000/docs

The renewable output is an estimated resource-potential index, not measured
renewable generation. Fuel savings are scenario estimates because actual
renewable capacity and generator efficiency curves are unavailable.
