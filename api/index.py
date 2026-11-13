import sys
import os

# Ensure the root/parent directory is in sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any

from api.solvers.engine import (
    bisection_method, false_position_method, newton_raphson_method,
    gauss_elimination, gauss_jordan, euler_method, modified_euler_method,
    rk4_projectile, knapsack_ordnance_selector
)

app = FastAPI(title="Ballistix Numerical Engine", docs_url="/api/py/docs")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/py/health")
def health_check():
    return {
        "status": "ONLINE",
        "engine": "Python FastAPI + NumPy",
        "solvers_ready": [
            "Bisection", "False Position", "Newton-Raphson",
            "Gauss Elimination", "Gauss-Jordan", "Euler",
            "Modified Euler", "RK4", "0/1 Knapsack"
        ]
    }

class KnapsackRequest(BaseModel):
    capacity: int
    items: List[Dict[str, Any]]

@app.post("/api/py/optimize-ordnance")
def optimize_ordnance(req: KnapsackRequest):
    try:
        # Extract weights and values lists from the incoming request items
        weights = [float(item.get("weight", 0)) for item in req.items]
        values = [float(item.get("value", 0)) for item in req.items]
        
        result = knapsack_ordnance_selector(weights, values, float(req.capacity))
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

class SimulationRequest(BaseModel):
    v0: float
    angle: float
    drag_coeff: float = 0.02
    mass: float = 1.0

@app.post("/api/py/simulate-trajectory")
def simulate_trajectory(req: SimulationRequest):
    try:
        result = rk4_projectile(req.v0, req.angle)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))