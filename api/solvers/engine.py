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
    """
    Bisection root-finding method.

    Args:
        f: Continuous function f(x) returning float
        xl: Lower bound (f(xl) * f(xu) < 0 required)
        xu: Upper bound
        tol: Convergence tolerance on |f(xr)| or interval width
        max_iter: Maximum iterations

    Returns:
        Dict with root, iterations list, converged flag
    """
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
    """
    False Position (Regula Falsi) root-finding method.

    Args:
        f: Continuous function f(x)
        xl: Lower bound
        xu: Upper bound
        tol: Convergence tolerance
        max_iter: Maximum iterations

    Returns:
        Dict with root, iterations, converged flag
    """
    fxl = f(xl)
    fxu = f(xu)

    if fxl * fxu > 0:
        raise ValueError("Function has the same sign at the endpoints. Root not bracketed.")

    iterations = []
    xr = xl

    for i in range(max_iter):
        # Secant formula
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
    """
    Newton-Raphson root-finding method.

    Args:
        f: Function f(x)
        df: Derivative f'(x)
        x0: Initial guess
        tol: Convergence tolerance on |x_{n+1} - x_n| or |f(x)|
        max_iter: Maximum iterations

    Returns:
        Dict with root, iterations, converged flag
    """
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
    """
    Gauss Elimination with partial pivoting for linear systems Ax = b.

    Args:
        A: Coefficient matrix (n x n)
        b: Right-hand side vector (n)

    Returns:
        Dict with solution vector, determinant, condition estimate
    """
    A = _ensure_array(A).copy()
    b = _ensure_array(b).copy()

    n = A.shape[0]
    if A.shape != (n, n):
        raise ValueError(f"A must be square, got {A.shape}")
    if b.shape != (n,):
        raise ValueError(f"b must be length {n}, got {b.shape}")

    # Track row swaps for determinant sign
    row_swaps = 0

    # Forward elimination with partial pivoting
    for i in range(n):
        # Partial pivot
        pivot_row = i + np.argmax(np.abs(A[i:, i]))
        if abs(A[pivot_row, i]) < 1e-14:
            raise ValueError("Matrix is singular or nearly singular")

        if pivot_row != i:
            A[[i, pivot_row]] = A[[pivot_row, i]]
            b[[i, pivot_row]] = b[[pivot_row, i]]
            row_swaps += 1

        # Eliminate below
        for k in range(i + 1, n):
            factor = A[k, i] / A[i, i]
            A[k, i:] -= factor * A[i, i:]
            b[k] -= factor * b[i]

    # Back substitution
    x = np.zeros(n)
    for i in range(n - 1, -1, -1):
        x[i] = (b[i] - np.dot(A[i, i + 1:], x[i + 1:])) / A[i, i]

    # Determinant
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
    """
    Gauss-Jordan elimination for linear systems Ax = b.
    Produces reduced row echelon form.

    Args:
        A: Coefficient matrix (n x n)
        b: Right-hand side vector (n)

    Returns:
        Dict with solution vector, inverse matrix (optional)
    """
    A = _ensure_array(A).copy()
    b = _ensure_array(b).copy()

    n = A.shape[0]
    if A.shape != (n, n):
        raise ValueError(f"A must be square, got {A.shape}")
    if b.shape != (n,):
        raise ValueError(f"b must be length {n}, got {b.shape}")

    # Augment with identity for inverse computation
    aug = np.hstack([A, np.eye(n)])
    b_aug = b.copy()

    for i in range(n):
        # Scale pivot row
        pivot = aug[i, i]
        if abs(pivot) < 1e-14:
            raise ValueError("Zero pivot encountered. Matrix is singular.")

        aug[i] /= pivot
        b_aug[i] /= pivot

        # Eliminate all other rows
        for k in range(n):
            if k != i:
                factor = aug[k, i]
                aug[k] -= factor * aug[i]
                b_aug[k] -= factor * b_aug[i]

    x = b_aug
    A_inv = aug[:, n:]

    return {
        "solution": x.tolist(),
        "inverse": A_inv.tolist()
    }


# =============================================================================
# ODE SOLVERS
# =============================================================================

def euler_method(
    f: Func2D,
    x0: float,
    y0: float,
    x_target: float,
    h: float
) -> Dict[str, Any]:
    """
    Euler's method for dy/dx = f(x, y).

    Args:
        f: Function f(x, y) returning dy/dx
        x0: Initial x
        y0: Initial y
        x_target: Target x value
        h: Step size

    Returns:
        Dict with final y, trajectory steps
    """
    if h <= 0:
        raise ValueError("Step size h must be positive")
    if x_target <= x0:
        raise ValueError("x_target must be greater than x0")

    x = x0
    y = y0
    steps = [{"x": x, "y": y}]

    while x < x_target:
        # Adjust final step to land exactly on x_target
        h_eff = min(h, x_target - x)
        y += h_eff * f(x, y)
        x += h_eff
        steps.append({"x": float(x), "y": float(y)})

    return {
        "result": float(y),
        "steps": steps,
        "num_steps": len(steps) - 1
    }


def modified_euler_method(
    f: Func2D,
    x0: float,
    y0: float,
    x_target: float,
    h: float
) -> Dict[str, Any]:
    """
    Modified Euler (Heun's) method for dy/dx = f(x, y).
    Second-order Runge-Kutta.

    Args:
        f: Function f(x, y) returning dy/dx
        x0: Initial x
        y0: Initial y
        x_target: Target x value
        h: Step size

    Returns:
        Dict with final y, trajectory steps
    """
    if h <= 0:
        raise ValueError("Step size h must be positive")
    if x_target <= x0:
        raise ValueError("x_target must be greater than x0")

    x = x0
    y = y0
    steps = [{"x": x, "y": y}]

    while x < x_target:
        h_eff = min(h, x_target - x)

        # Predictor (Euler step)
        k1 = f(x, y)
        y_pred = y + h_eff * k1

        # Corrector (average slope)
        k2 = f(x + h_eff, y_pred)
        y += (h_eff / 2.0) * (k1 + k2)

        x += h_eff
        steps.append({"x": float(x), "y": float(y)})

    return {
        "result": float(y),
        "steps": steps,
        "num_steps": len(steps) - 1
    }


# =============================================================================
# BALLISTICS SOLVERS
# =============================================================================

def rk4_projectile(
    v0: float,
    angle: float,
    g: float = 9.81,
    drag_coeff: float = 0.02,
    mass: float = 1.0,
    dt: float = 0.01,
    max_time: float = 100.0
) -> Dict[str, Any]:
    """
    RK4 projectile simulation with quadratic drag model.

    Equations:
        dvx/dt = -k * v * vx
        dvy/dt = -g - k * v * vy
        where k = drag_coeff / mass, v = sqrt(vx^2 + vy^2)

    Args:
        v0: Initial velocity (m/s)
        angle: Launch angle (degrees)
        g: Gravity (m/s^2)
        drag_coeff: Drag coefficient (kg/m)
        mass: Projectile mass (kg)
        dt: Time step (s)
        max_time: Maximum simulation time (s)

    Returns:
        Dict with trajectory, max_height, range, flight_time, apex_time
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
        v_mag = math.hypot(vx_curr, vy_curr)
        if v_mag < 1e-12:
            return 0.0, -g
        drag_x = -k * v_mag * vx_curr
        drag_y = -k * v_mag * vy_curr
        return drag_x, -g + drag_y

    while y >= 0 and t < max_time:
        # RK4 integration
        # k1
        ax1, ay1 = acceleration(vx, vy)
        # k2
        vx2 = vx + 0.5 * dt * ax1
        vy2 = vy + 0.5 * dt * ay1
        ax2, ay2 = acceleration(vx2, vy2)
        # k3
        vx3 = vx + 0.5 * dt * ax2
        vy3 = vy + 0.5 * dt * ay2
        ax3, ay3 = acceleration(vx3, vy3)
        # k4
        vx4 = vx + dt * ax3
        vy4 = vy + dt * ay3
        ax4, ay4 = acceleration(vx4, vy4)

        # Update velocities
        vx += (dt / 6.0) * (ax1 + 2*ax2 + 2*ax3 + ax4)
        vy += (dt / 6.0) * (ay1 + 2*ay2 + 2*ay3 + ay4)

        # Update positions
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

    range_ = x
    flight_time = t

    return {
        "trajectory": trajectory,
        "max_height": round(max_height, 4),
        "range": round(range_, 4),
        "flight_time": round(flight_time, 4),
        "apex_time": round(apex_time, 4),
        "impact_velocity": round(v_mag, 4),
        "params": {
            "v0": v0,
            "angle": angle,
            "g": g,
            "drag_coeff": drag_coeff,
            "mass": mass,
            "dt": dt
        }
    }


def knapsack_ordnance_selector(
    weights: List[float] | FloatArray,
    values: List[float] | FloatArray,
    capacity: float
) -> Dict[str, Any]:
    """
    0/1 Knapsack solver using dynamic programming.
    Returns optimal value AND selected items.

    Args:
        weights: Item weights (cost/weight)
        values: Item values (utility/damage)
        capacity: Maximum capacity

    Returns:
        Dict with max_value, selected_items (indices), total_weight, efficiency
    """
    weights = _ensure_array(weights)
    values = _ensure_array(values)

    n = len(weights)
    if len(values) != n:
        raise ValueError("weights and values must have same length")
    if n == 0:
        return {"max_value": 0.0, "selected_items": [], "total_weight": 0.0, "efficiency": 0.0}
    if capacity <= 0:
        raise ValueError("Capacity must be positive")

    # Scale to integers for DP (multiply by 1000 to preserve 3 decimal places)
    scale = 1000
    w_int = np.round(weights * scale).astype(int)
    v_int = np.round(values * scale).astype(int)
    cap_int = int(round(capacity * scale))

    # DP table: dp[i][w] = max value using first i items with weight limit w
    dp = np.zeros((n + 1, cap_int + 1), dtype=int)

    for i in range(1, n + 1):
        wi = w_int[i - 1]
        vi = v_int[i - 1]
        # Vectorized update
        dp[i, :wi] = dp[i - 1, :wi]
        dp[i, wi:] = np.maximum(dp[i - 1, wi:], vi + dp[i - 1, :-wi])

    max_val_scaled = dp[n, cap_int]
    max_val = max_val_scaled / scale

    # Backtrack to find selected items
    selected = []
    w = cap_int
    for i in range(n, 0, -1):
        if dp[i, w] != dp[i - 1, w]:
            selected.append(i - 1)  # 0-indexed
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


# =============================================================================
# VECTORIZED BATCH SOLVERS (for multiple initial conditions)
# =============================================================================

def batch_bisection(
    f: Func1D,
    xl_arr: FloatArray,
    xu_arr: FloatArray,
    tol: float = 1e-6,
    max_iter: int = 100
) -> FloatArray:
    """
    Vectorized bisection for multiple independent intervals.

    Args:
        f: Vectorized function f(x) where x is array
        xl_arr: Array of lower bounds
        xu_arr: Array of upper bounds
        tol: Tolerance
        max_iter: Max iterations

    Returns:
        Array of roots
    """
    xl = _ensure_array(xl_arr)
    xu = _ensure_array(xu_arr)

    if xl.shape != xu.shape:
        raise ValueError("xl and xu must have same shape")

    fxl = f(xl)
    fxu = f(xu)

    if np.any(fxl * fxu > 0):
        raise ValueError("Some intervals do not bracket a root")

    xr = xl.copy()

    for _ in range(max_iter):
        xr = (xl + xu) / 2.0
        fxr = f(xr)

        converged = (np.abs(fxr) < tol) | (np.abs(xu - xl) < tol)
        if np.all(converged):
            break

        # Update bounds where not converged
        mask = fxl * fxr < 0
        xu = np.where(mask & ~converged, xr, xu)
        xl = np.where(~mask & ~converged, xr, xl)
        fxl = f(xl)
        fxu = f(xu)

    return xr


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    "bisection_method",
    "false_position_method",
    "newton_raphson_method",
    "gauss_elimination",
    "gauss_jordan",
    "euler_method",
    "modified_euler_method",
    "rk4_projectile",
    "knapsack_ordnance_selector",
    "batch_bisection",
]