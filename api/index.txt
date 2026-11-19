import sys
import os

# Ensure the root/parent directory is in sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import math

from api.solvers.engine import (
    bisection_method, false_position_method, newton_raphson_method,
    gauss_elimination, gauss_jordan, euler_method, modified_euler_method,
    rk4_projectile, knapsack_ordnance_selector
)

# Pre-defined safe functions for root-finding API
SAFE_FUNCTIONS = {
    "sin": math.sin,
    "cos": math.cos,
    "tan": math.tan,
    "exp": math.exp,
    "log": math.log,
    "sqrt": math.sqrt,
    "abs": abs,
    "pi": math.pi,
    "e": math.e,
}

def _make_func(expr: str) -> callable:
    """Safely create a function from a mathematical expression string."""
    # Validate expression only contains safe characters
    allowed_chars = set("0123456789.+-*/()x ")
    allowed_names = set(SAFE_FUNCTIONS.keys())

    # Check for disallowed names
    import re
    names = re.findall(r'\b[a-zA-Z_][a-zA-Z0-9_]*\b', expr)
    for name in names:
        if name not in allowed_names and name != 'x':
            raise ValueError(f"Disallowed function/name: {name}")

    code = compile(expr, "<string>", "eval")
    # Verify no dangerous bytecode
    for const in code.co_names:
        if const not in allowed_names and const != 'x':
            raise ValueError(f"Disallowed name in expression: {const}")

    def f(x: float) -> float:
        return eval(code, {"__builtins__": {}}, {**SAFE_FUNCTIONS, "x": x})

    return f


def _make_func_2d(expr: str) -> callable:
    """Safely create a 2D function f(x, y) from expression."""
    allowed_names = set(SAFE_FUNCTIONS.keys()) | {'x', 'y'}

    import re
    names = re.findall(r'\b[a-zA-Z_][a-zA-Z0-9_]*\b', expr)
    for name in names:
        if name not in allowed_names:
            raise ValueError(f"Disallowed function/name: {name}")

    code = compile(expr, "<string>", "eval")

    def f(x: float, y: float) -> float:
        return eval(code, {"__builtins__": {}}, {**SAFE_FUNCTIONS, "x": x, "y": y})

    return f


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
        "version": "2.0.0",
        "solvers_ready": [
            "Bisection", "False Position", "Newton-Raphson",
            "Gauss Elimination", "Gauss-Jordan", "Euler",
            "Modified Euler", "RK4 Projectile", "0/1 Knapsack"
        ]
    }


# =============================================================================
# ROOT-FINDING ENDPOINTS
# =============================================================================

class BisectionRequest(BaseModel):
    function: str = Field(..., description="Expression in x, e.g. 'x**2 - 4' or 'sin(x) - 0.5'")
    xl: float = Field(..., description="Lower bound")
    xu: float = Field(..., description="Upper bound")
    tol: float = Field(1e-6, gt=0, description="Tolerance")
    max_iter: int = Field(100, gt=0, le=10000, description="Max iterations")


@app.post("/api/py/root/bisection")
def root_bisection(req: BisectionRequest):
    try:
        f = _make_func(req.function)
        result = bisection_method(f, req.xl, req.xu, req.tol, req.max_iter)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


class FalsePositionRequest(BaseModel):
    function: str = Field(..., description="Expression in x")
    xl: float = Field(..., description="Lower bound")
    xu: float = Field(..., description="Upper bound")
    tol: float = Field(1e-6, gt=0)
    max_iter: int = Field(100, gt=0, le=10000)


@app.post("/api/py/root/false-position")
def root_false_position(req: FalsePositionRequest):
    try:
        f = _make_func(req.function)
        result = false_position_method(f, req.xl, req.xu, req.tol, req.max_iter)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


class NewtonRaphsonRequest(BaseModel):
    function: str = Field(..., description="Expression in x, e.g. 'x**2 - 4'")
    derivative: str = Field(..., description="Derivative expression in x, e.g. '2*x'")
    x0: float = Field(..., description="Initial guess")
    tol: float = Field(1e-6, gt=0)
    max_iter: int = Field(100, gt=0, le=10000)


@app.post("/api/py/root/newton-raphson")
def root_newton_raphson(req: NewtonRaphsonRequest):
    try:
        f = _make_func(req.function)
        df = _make_func(req.derivative)
        result = newton_raphson_method(f, df, req.x0, req.tol, req.max_iter)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# =============================================================================
# LINEAR ALGEBRA ENDPOINTS
# =============================================================================

class LinearSystemRequest(BaseModel):
    A: List[List[float]] = Field(..., description="Coefficient matrix (n x n)")
    b: List[float] = Field(..., description="Right-hand side vector (n)")


@app.post("/api/py/linear/gauss-elimination")
def linear_gauss_elimination(req: LinearSystemRequest):
    try:
        result = gauss_elimination(req.A, req.b)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/py/linear/gauss-jordan")
def linear_gauss_jordan(req: LinearSystemRequest):
    try:
        result = gauss_jordan(req.A, req.b)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# =============================================================================
# ODE ENDPOINTS
# =============================================================================

class ODERequest(BaseModel):
    function: str = Field(..., description="Expression in x and y, e.g. 'x + y' or '-y'")
    x0: float = Field(..., description="Initial x")
    y0: float = Field(..., description="Initial y")
    x_target: float = Field(..., description="Target x value")
    h: float = Field(..., gt=0, description="Step size")


@app.post("/api/py/ode/euler")
def ode_euler(req: ODERequest):
    try:
        f = _make_func_2d(req.function)
        result = euler_method(f, req.x0, req.y0, req.x_target, req.h)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/py/ode/modified-euler")
def ode_modified_euler(req: ODERequest):
    try:
        f = _make_func_2d(req.function)
        result = modified_euler_method(f, req.x0, req.y0, req.x_target, req.h)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# =============================================================================
# BALLISTICS ENDPOINTS
# =============================================================================

class KnapsackRequest(BaseModel):
    capacity: float = Field(..., gt=0, description="Maximum capacity")
    items: List[Dict[str, Any]] = Field(..., description="List of items with 'weight' and 'value'")


@app.post("/api/py/optimize-ordnance")
def optimize_ordnance(req: KnapsackRequest):
    try:
        weights = [float(item.get("weight", 0)) for item in req.items]
        values = [float(item.get("value", 0)) for item in req.items]

        if len(weights) != len(values):
            raise ValueError("Each item must have both weight and value")

        result = knapsack_ordnance_selector(weights, values, req.capacity)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


class SimulationRequest(BaseModel):
    v0: float = Field(..., gt=0, description="Initial velocity (m/s)")
    angle: float = Field(..., gt=0, lt=90, description="Launch angle (degrees)")
    drag_coeff: float = Field(0.02, ge=0, description="Drag coefficient (kg/m)")
    mass: float = Field(1.0, gt=0, description="Projectile mass (kg)")
    dt: float = Field(0.01, gt=0, le=1, description="Time step (s)")


@app.post("/api/py/simulate-trajectory")
def simulate_trajectory(req: SimulationRequest):
    try:
        result = rk4_projectile(
            v0=req.v0,
            angle=req.angle,
            drag_coeff=req.drag_coeff,
            mass=req.mass,
            dt=req.dt
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# =============================================================================
# BATCH ENDPOINTS
# =============================================================================

class BatchBisectionRequest(BaseModel):
    function: str = Field(..., description="Expression in x")
    xl: List[float] = Field(..., description="Array of lower bounds")
    xu: List[float] = Field(..., description="Array of upper bounds")
    tol: float = Field(1e-6, gt=0)
    max_iter: int = Field(100, gt=0, le=10000)


@app.post("/api/py/root/batch-bisection")
def root_batch_bisection(req: BatchBisectionRequest):
    try:
        import numpy as np
        from api.solvers.engine import batch_bisection

        f = _make_func(req.function)
        # Vectorize the function
        f_vec = np.vectorize(f)

        xl_arr = np.array(req.xl, dtype=np.float64)
        xu_arr = np.array(req.xu, dtype=np.float64)

        roots = batch_bisection(f_vec, xl_arr, xu_arr, req.tol, req.max_iter)
        return {"roots": roots.tolist()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))