"""
Ballistix Numerical Engine — Core Solvers

Production-ready numerical methods implemented with NumPy.
No eval() — all functions accept callable Python functions or pre-defined models.
"""

from __future__ import annotations
import math
from typing import Callable, List, Dict, Any, Tuple
import numpy as np
from numpy.typing import NDArray


# =============================================================================
# TYPE ALIASES & UTILITIES
# =============================================================================

FloatArray = NDArray[np.float64]
Func1D = Callable[[float], float]
Func2D = Callable[[float, float], float]


def _ensure_array(arr: List[float] | FloatArray, dtype: type = np.float64) -> FloatArray:
    """Convert list to contiguous NumPy array."""
    return np.asarray(arr, dtype=dtype)


# =============================================================================
# ROOT-FINDING METHODS
# =============================================================================

def bisection_method(
    f: Func1D,
    xl: float,
    xu: float,
    tol: float = 1e-6,
    max_iter: int = 100
) -> Dict[str, Any]:
    """Bisection root-finding method."""
    fxl = f(xl)
    fxu = f(xu)

    if fxl * fxu > 0:
        raise ValueError("Function has the same sign at the endpoints. Root not bracketed.")

    iterations = []
    xr = xl

    for i in range(max_iter):
        xr = (xl + xu) / 2.0
        fxr = f(xr)
        iterations.append({
            "iteration": i + 1,
            "xl": xl,
            "xu": xu,
            "xr": xr,
            "f_xr": fxr,
            "interval_width": abs(xu - xl)
        })

        if abs(fxr) < tol or abs(xu - xl) < tol:
            return {
                "root": xr,
                "converged": True,
                "iterations": iterations,
                "final_error": abs(fxr)
            }

        if fxl * fxr < 0:
            xu = xr
            fxu = fxr
        else:
            xl = xr
            fxl = fxr

    return {
        "root": xr,
        "converged": False,
        "iterations": iterations,
        "final_error": abs(f(xr)),
        "warning": "Max iterations reached without convergence"
    }


def false_position_method(
    f: Func1D,
    xl: float,
    xu: float,
    tol: float = 1e-6,
    max_iter: int = 100
) -> Dict[str, Any]:
    """False Position (Regula Falsi) root-finding method."""
    fxl = f(xl)
    fxu = f(xu)

    if fxl * fxu > 0:
        raise ValueError("Function has the same sign at the endpoints. Root not bracketed.")

    iterations = []
    xr = xl

    for i in range(max_iter):
        xr = xu - (fxu * (xl - xu)) / (fxl - fxu)
        fxr = f(xr)

        iterations.append({
            "iteration": i + 1,
            "xl": xl,
            "xu": xu,
            "xr": xr,
            "f_xr": fxr
        })

        if abs(fxr) < tol:
            return {
                "root": xr,
                "converged": True,
                "iterations": iterations,
                "final_error": abs(fxr)
            }

        if fxl * fxr < 0:
            xu = xr
            fxu = fxr
        else:
            xl = xr
            fxl = fxr

    return {
        "root": xr,
        "converged": False,
        "iterations": iterations,
        "final_error": abs(fxr),
        "warning": "Max iterations reached without convergence"
    }


def newton_raphson_method(
    f: Func1D,
    df: Func1D,
    x0: float,
    tol: float = 1e-6,
    max_iter: int = 100
) -> Dict[str, Any]:
    """Newton-Raphson root-finding method."""
    iterations = []
    x = x0

    for i in range(max_iter):
        fx = f(x)
        dfx = df(x)

        if abs(dfx) < 1e-14:
            raise ValueError(f"Derivative near zero at x={x}. Method failed.")

        x_next = x - fx / dfx

        iterations.append({
            "iteration": i + 1,
            "x": x,
            "f_x": fx,
            "df_x": dfx,
            "step": abs(x_next - x)
        })

        if abs(x_next - x) < tol or abs(fx) < tol:
            return {
                "root": x_next,
                "converged": True,
                "iterations": iterations,
                "final_error": abs(f(x_next))
            }

        x = x_next

    return {
        "root": x,
        "converged": False,
        "iterations": iterations,
        "final_error": abs(f(x)),
        "warning": "Max iterations reached without convergence"
    }


# =============================================================================
# LINEAR ALGEBRA SOLVERS
# =============================================================================

def gauss_elimination(
    A: List[List[float]] | FloatArray,
    b: List[float] | FloatArray
) -> Dict[str, Any]:
    """Gauss Elimination with partial pivoting for linear systems Ax = b."""
    A = _ensure_array(A).copy()
    b = _ensure_array(b).copy()

    n = A.shape[0]
    if A.shape != (n, n):
        raise ValueError(f"A must be square, got {A.shape}")
    if b.shape != (n,):
        raise ValueError(f"b must be length {n}, got {b.shape}")

    row_swaps = 0

    for i in range(n):
        pivot_row = i + np.argmax(np.abs(A[i:, i]))
        if abs(A[pivot_row, i]) < 1e-14:
            raise ValueError("Matrix is singular or nearly singular")

        if pivot_row != i:
            A[[i, pivot_row]] = A[[pivot_row, i]]
            b[[i, pivot_row]] = b[[pivot_row, i]]
            row_swaps += 1

        for k in range(i + 1, n):
            factor = A[k, i] / A[i, i]
            A[k, i:] -= factor * A[i, i:]
            b[k] -= factor * b[i]

    x = np.zeros(n)
    for i in range(n - 1, -1, -1):
        x[i] = (b[i] - np.dot(A[i, i + 1:], x[i + 1:])) / A[i, i]

    det = ((-1) ** row_swaps) * np.prod(np.diag(A))

    return {
        "solution": x.tolist(),
        "determinant": float(det),
        "condition_estimate": float(np.linalg.cond(A)) if n > 1 else 1.0
    }


def gauss_jordan(
    A: List[List[float]] | FloatArray,
    b: List[float] | FloatArray
) -> Dict[str, Any]:
    """Gauss-Jordan elimination for linear systems Ax = b."""
    A = _ensure_array(A).copy()
    b = _ensure_array(b).copy()

    n = A.shape[0]
    if A.shape != (n, n):
        raise ValueError(f"A must be square, got {A.shape}")
    if b.shape != (n,):
        raise ValueError(f"b must be length {n}, got {b.shape}")

    aug = np.hstack([A, np.eye(n)])
    b_aug = b.copy()

    for i in range(n):
        pivot = aug[i, i]
        if abs(pivot) < 1e-14:
            raise ValueError("Zero pivot encountered. Matrix is singular.")

        aug[i] /= pivot
        b_aug[i] /= pivot

        for k in range(n):
            if k != i:
                factor = aug[k, i]
                aug[k] -= factor * aug[i]
                b_aug[k] -= factor * b_aug[i]

    return {
        "solution": b_aug.tolist(),
        "inverse": aug[:, n:].tolist()
    }


# =============================================================================
# ODE & BALLISTICS SOLVERS
# =============================================================================

def rk4_projectile(
    v0: float,
    angle: float,
    g: float = 9.81,
    drag_coeff: float = 0.02,
    mass: float = 1.0,
    wind_speed: float = 0.0,
    dt: float = 0.01,
    max_time: float = 100.0
) -> Dict[str, Any]:
    """
    RK4 projectile simulation with quadratic drag model and live wind speed.

    Equations:
        dvx/dt = -k * v_rel * (vx - wind_speed)
        dvy/dt = -g - k * v_rel * vy
    """
    if v0 <= 0:
        raise ValueError("Initial velocity must be positive")
    if not (0 < angle < 90):
        raise ValueError("Angle must be between 0 and 90 degrees")
    if dt <= 0:
        raise ValueError("Time step must be positive")
    if mass <= 0:
        raise ValueError("Mass must be positive")

    rad = math.radians(angle)
    vx = v0 * math.cos(rad)
    vy = v0 * math.sin(rad)

    x, y = 0.0, 0.0
    t = 0.0
    k = drag_coeff / mass

    trajectory = [{"t": t, "x": x, "y": y, "vx": vx, "vy": vy, "v": v0}]
    max_height = 0.0
    apex_time = 0.0

    def acceleration(vx_curr: float, vy_curr: float) -> Tuple[float, float]:
        v_rel_x = vx_curr - wind_speed
        v_mag = math.hypot(v_rel_x, vy_curr)
        if v_mag < 1e-12:
            return 0.0, -g
        drag_x = -k * v_mag * v_rel_x
        drag_y = -k * v_mag * vy_curr
        return drag_x, -g + drag_y

    while y >= 0 and t < max_time:
        ax1, ay1 = acceleration(vx, vy)
        
        vx2 = vx + 0.5 * dt * ax1
        vy2 = vy + 0.5 * dt * ay1
        ax2, ay2 = acceleration(vx2, vy2)
        
        vx3 = vx + 0.5 * dt * ax2
        vy3 = vy + 0.5 * dt * ay2
        ax3, ay3 = acceleration(vx3, vy3)
        
        vx4 = vx + dt * ax3
        vy4 = vy + dt * ay3
        ax4, ay4 = acceleration(vx4, vy4)

        vx += (dt / 6.0) * (ax1 + 2*ax2 + 2*ax3 + ax4)
        vy += (dt / 6.0) * (ay1 + 2*ay2 + 2*ay3 + ay4)

        x += vx * dt
        y += vy * dt
        t += dt

        v_mag = math.hypot(vx, vy)

        if y > max_height:
            max_height = y
            apex_time = t

        if y < 0:
            y = 0.0

        trajectory.append({
            "t": round(t, 4),
            "x": round(x, 4),
            "y": round(y, 4),
            "vx": round(vx, 4),
            "vy": round(vy, 4),
            "v": round(v_mag, 4)
        })

        if y == 0.0 and len(trajectory) > 2:
            break

    return {
        "trajectory": trajectory,
        "max_height": round(max_height, 4),
        "range": round(x, 4),
        "flight_time": round(t, 4),
        "apex_time": round(apex_time, 4),
        "impact_velocity": round(v_mag, 4),
        "params": {
            "v0": v0,
            "angle": angle,
            "g": g,
            "drag_coeff": drag_coeff,
            "mass": mass,
            "wind_speed": wind_speed,
            "dt": dt
        }
    }


def knapsack_ordnance_selector(
    weights: List[float] | FloatArray,
    values: List[float] | FloatArray,
    capacity: float
) -> Dict[str, Any]:
    """0/1 Knapsack solver using dynamic programming."""
    weights = _ensure_array(weights)
    values = _ensure_array(values)

    n = len(weights)
    if len(values) != n:
        raise ValueError("weights and values must have same length")
    if n == 0:
        return {"max_value": 0.0, "selected_items": [], "total_weight": 0.0, "efficiency": 0.0}
    if capacity <= 0:
        raise ValueError("Capacity must be positive")

    scale = 1000
    w_int = np.round(weights * scale).astype(int)
    v_int = np.round(values * scale).astype(int)
    cap_int = int(round(capacity * scale))

    dp = np.zeros((n + 1, cap_int + 1), dtype=int)

    for i in range(1, n + 1):
        wi = w_int[i - 1]
        vi = v_int[i - 1]
        dp[i, :wi] = dp[i - 1, :wi]
        dp[i, wi:] = np.maximum(dp[i - 1, wi:], vi + dp[i - 1, :-wi])

    max_val_scaled = dp[n, cap_int]
    max_val = max_val_scaled / scale

    selected = []
    w = cap_int
    for i in range(n, 0, -1):
        if dp[i, w] != dp[i - 1, w]:
            selected.append(i - 1)
            w -= w_int[i - 1]

    selected.reverse()
    total_weight = float(np.sum(weights[selected])) if selected else 0.0

    return {
        "max_value": float(max_val),
        "selected_items": selected,
        "total_weight": total_weight,
        "remaining_capacity": float(capacity - total_weight),
        "efficiency": float(max_val / total_weight) if total_weight > 0 else 0.0,
        "item_count": len(selected)
    }


__all__ = [
    "bisection_method",
    "false_position_method",
    "newton_raphson_method",
    "gauss_elimination",
    "gauss_jordan",
    "rk4_projectile",
    "knapsack_ordnance_selector",
]