# Numerical Methods in Ballistix Project

This document describes the numerical methods implemented and used in the **Ballistix** tactical artillery game project. The project features a **Python FastAPI backend** (`api/solvers/engine.py`) exposing numerical solvers via REST endpoints, and a **TypeScript frontend** (`src/lib/gameEngine.ts`) that implements physics simulation for real-time gameplay.

---

## Summary of Methods Used

| Category | Method | Status | Location |
|----------|--------|--------|----------|
| **Root Finding** | Bisection Method | ✅ Used | `api/solvers/engine.py:33` |
| **Root Finding** | False Position (Regula Falsi) | ✅ Used | `api/solvers/engine.py:98` |
| **Root Finding** | Newton-Raphson Method | ✅ Used | `api/solvers/engine.py:164` |
| **Linear Algebra** | Gauss Elimination (with partial pivoting) | ✅ Used | `api/solvers/engine.py:227` |
| **Linear Algebra** | Gauss-Jordan Elimination | ✅ Used | `api/solvers/engine.py:286` |
| **ODE Solvers** | Euler Method | ✅ Used | `api/solvers/engine.py:343` |
| **ODE Solvers** | Modified Euler (Heun's Method) | ✅ Used | `api/solvers/engine.py:386` |
| **ODE Solvers** | **RK4 (Runge-Kutta 4th Order)** | ✅ Used | `api/solvers/engine.py:441`, `src/lib/gameEngine.ts:169` |
| **Optimization** | 0/1 Knapsack (Dynamic Programming) | ✅ Used | `api/solvers/engine.py:567` |

> **Note:** "Difference between analytical and numerical method" is a **conceptual topic**, not a computational method implemented in the codebase. It is discussed in the [Concepts](#conceptual-note-analytical-vs-numerical-methods) section below.

---

## 1. Root-Finding Methods

### 1.1 Bisection Method

**File:** `api/solvers/engine.py` (lines 33–95)  
**Endpoint:** `POST /api/py/root/bisection`  
**Batch Endpoint:** `POST /api/py/root/batch-bisection`

#### Algorithm
The bisection method repeatedly halves an interval `[xl, xu]` where `f(xl) * f(xu) < 0` (root bracketed):
```
xr = (xl + xu) / 2
if f(xl) * f(xr) < 0: xu = xr
else: xl = xr
```
Convergence guaranteed for continuous functions with sign change.

#### Purpose in Project
- **Educational/Demo API**: Exposes root-finding as a callable service for the frontend
- **Batch processing**: Vectorized version (`batch_bisection`) solves multiple intervals simultaneously using NumPy
- **Foundation**: Demonstrates guaranteed-convergence bracketing method

#### Problem Solved
Finds roots of nonlinear equations `f(x) = 0` where:
- Function is continuous
- Initial bracket `[xl, xu]` with opposite signs is known
- Robustness > speed (guaranteed convergence, linear rate)

#### Example Use Case
```python
# Find √2: solve x² - 2 = 0 on [1, 2]
f = lambda x: x**2 - 2
result = bisection_method(f, 1.0, 2.0, tol=1e-6)
# Returns: {"root": 1.414213..., "converged": true, "iterations": [...]}
```

---

### 1.2 False Position Method (Regula Falsi)

**File:** `api/solvers/engine.py` (lines 98–161)  
**Endpoint:** `POST /api/py/root/false-position`

#### Algorithm
Uses linear interpolation (secant line) instead of midpoint:
```
xr = xu - f(xu) * (xl - xu) / (f(xl) - f(xu))
```
Retains bracketing property but typically converges faster than bisection.

#### Purpose in Project
- **Alternative bracketing method** for comparison/demo
- Shows improvement over bisection via secant approximation
- Same API contract as bisection for easy swapping

#### Problem Solved
Same as bisection (root of `f(x)=0` with bracket) but with **superlinear convergence** when function is well-behaved. Can stagnate if one endpoint remains fixed.

---

### 1.3 Newton-Raphson Method

**File:** `api/solvers/engine.py` (lines 164–220)  
**Endpoint:** `POST /api/py/root/newton-raphson`

#### Algorithm
Iterative tangent-line approximation:
```
x_{n+1} = x_n - f(x_n) / f'(x_n)
```
Requires derivative `f'(x)` and initial guess `x₀`.

#### Purpose in Project
- **Fast local convergence** demonstration (quadratic near root)
- Requires analytical derivative input from user
- Shows trade-off: speed vs. derivative requirement + no bracket needed

#### Problem Solved
Root finding for **differentiable functions** where:
- Good initial guess available
- Derivative can be computed/provided
- Fast convergence desired (quadratic order)

#### Example Use Case
```python
# Find √2: solve x² - 2 = 0, derivative 2x
f = lambda x: x**2 - 2
df = lambda x: 2*x
result = newton_raphson_method(f, df, x0=1.5, tol=1e-10)
# Converges in ~4-5 iterations vs ~20 for bisection
```

---

## 2. Linear Algebra Solvers

### 2.1 Gauss Elimination (with Partial Pivoting)

**File:** `api/solvers/engine.py` (lines 227–283)  
**Endpoint:** `POST /api/py/linear/gauss-elimination`

#### Algorithm
1. **Forward elimination** with partial pivoting (row swaps for largest pivot)
2. **Back substitution** to solve upper-triangular system
3. Computes **determinant** and **condition estimate**

#### Purpose in Project
- **General-purpose linear system solver** `Ax = b`
- Partial pivoting ensures numerical stability
- Returns determinant and condition number for analysis

#### Problem Solved
Solves **square linear systems** `Ax = b` where:
- `A` is `n×n` non-singular matrix
- Need solution vector `x`, determinant, and conditioning info
- Production-ready with O(n³) complexity

#### Example Use Case
```python
# Solve:
# 2x + y = 3
# x - y = 0
A = [[2, 1], [1, -1]]
b = [3, 0]
result = gauss_elimination(A, b)
# Returns: {"solution": [1.0, 1.0], "determinant": -3.0, "condition_estimate": ...}
```

---

### 2.2 Gauss-Jordan Elimination

**File:** `api/solvers/engine.py` (lines 286–336)  
**Endpoint:** `POST /api/py/linear/gauss-jordan`

#### Algorithm
Reduces augmented matrix `[A | I]` to **reduced row echelon form** `[I | A⁻¹]`:
- Normalizes each pivot row
- Eliminates **all other rows** (not just below)
- Produces inverse matrix as byproduct

#### Purpose in Project
- **Alternative solver** that computes matrix inverse
- Useful when multiple RHS vectors need solving
- Demonstrates full reduction vs. triangular reduction

#### Problem Solved
Same linear systems as Gauss Elimination, but additionally provides **matrix inverse** for:
- Multiple right-hand sides
- Sensitivity analysis
- Educational comparison of elimination strategies

---

## 3. ODE Solvers (Initial Value Problems)

### 3.1 Euler Method

**File:** `api/solvers/engine.py` (lines 343–383)  
**Endpoint:** `POST /api/py/ode/euler`

#### Algorithm
First-order explicit method for `dy/dx = f(x, y)`:
```
y_{n+1} = y_n + h * f(x_n, y_n)
x_{n+1} = x_n + h
```

#### Purpose in Project
- **Baseline ODE solver** for comparison
- Simple, explicit, first-order accurate (O(h) global error)
- Educational reference for higher-order methods

#### Problem Solved
Approximates solution to **first-order ODEs** `dy/dx = f(x, y)` with:
- Initial condition `y(x₀) = y₀`
- Fixed step size `h`
- Low accuracy requirements / coarse integration

---

### 3.2 Modified Euler Method (Heun's Method)

**File:** `api/solvers/engine.py` (lines 386–434)  
**Endpoint:** `POST /api/py/ode/modified-euler`

#### Algorithm
Second-order Runge-Kutta (predictor-corrector):
```
k₁ = f(x_n, y_n)
k₂ = f(x_n + h, y_n + h*k₁)
y_{n+1} = y_n + (h/2) * (k₁ + k₂)
```

#### Purpose in Project
- **Improved ODE solver** with 2nd order accuracy (O(h²))
- Demonstrates predictor-corrector concept
- Better stability than Euler for same step size

#### Problem Solved
Same ODE IVPs as Euler but with **significantly better accuracy** for same computational cost (2 function evaluations per step vs 1).

---

### 3.3 RK4 (Runge-Kutta 4th Order) — **Core Game Physics**

**File:** `api/solvers/engine.py` (lines 441–564) — `rk4_projectile()`  
**File:** `src/lib/gameEngine.ts` (lines 169–274) — `computeTrajectory()`  
**Endpoint:** `POST /api/py/simulate-trajectory`

#### Algorithm
Classical 4th-order Runge-Kutta for projectile motion with **quadratic drag**:
```
State: [x, y, vx, vy]
Equations:
  dvx/dt = -k * v * vx
  dvy/dt = -g - k * v * vy
  where k = drag_coeff / mass, v = √(vx² + vy²)

RK4 stages (k1, k2, k3, k4) for each variable
```

#### Purpose in Project
**🎯 PRIMARY PHYSICS ENGINE** — Used in **both** backend API and frontend game engine:

| Context | Usage |
|---------|-------|
| **Python API** | `rk4_projectile()` — high-fidelity simulation endpoint for analysis, testing, AI training |
| **TypeScript Frontend** | `computeTrajectory()` — real-time 3D trajectory prediction, preview rendering, impact calculation |

#### Problem Solved
**Realistic ballistic trajectory simulation** with:
- Quadratic drag model (air resistance ∝ v²)
- Variable gravity, launch angle, velocity, mass
- Wind effects (frontend)
- 4th-order accuracy (O(h⁴) global error) — **gold standard** for non-stiff ODEs
- Computes: range, max height, flight time, apex, impact velocity, full trajectory points

#### Implementation Notes
- **Python**: 2D (x, y) with drag
- **TypeScript**: 3D (x, y, z) with drag + wind + azimuth
- Both use identical RK4 integration scheme
- Step size `dt = 0.01s` (Python) / `0.01-0.02s` (TypeScript preview)

---

## 4. Optimization

### 4.1 0/1 Knapsack (Dynamic Programming)

**File:** `api/solvers/engine.py` (lines 567–632)  
**Endpoint:** `POST /api/py/optimize-ordnance`

#### Algorithm
Dynamic programming with weight scaling for fractional weights:
```
dp[i][w] = max(dp[i-1][w], value[i] + dp[i-1][w - weight[i]])
```
- Scales weights/values by 1000 to handle decimals as integers
- Backtracks to recover selected item indices
- O(n × capacity) time, O(capacity) space with rolling array

#### Purpose in Project
**Ordnance loadout optimization** — Selects optimal weapon combination:
- **Weights** = ordnance weight (capacity constraint)
- **Values** = ordnance damage/utility
- **Capacity** = vehicle/mission weight limit

#### Problem Solved
**Tactical decision support**: Given limited payload capacity, choose ordnance mix maximizing total effectiveness.

#### Example Use Case
```python
# 4 shell types, 200kg capacity
weights = [15, 25, 35, 10]    # kg per shell
values  = [80, 120, 200, 40]  # damage points
capacity = 200

result = knapsack_ordnance_selector(weights, values, capacity)
# Returns: max_value, selected_items[], total_weight, efficiency
```

---

## Conceptual Note: Analytical vs Numerical Methods

> **This topic was in your list but is a concept, not an implemented method.**

| Aspect | Analytical Methods | Numerical Methods |
|--------|-------------------|-------------------|
| **Solution Form** | Exact closed-form formula | Approximate discrete values |
| **Existence** | Only for special problem classes | Almost any well-posed problem |
| **Computation** | Symbolic manipulation | Arithmetic operations (floating-point) |
| **Error** | Zero (exact) | Truncation + roundoff error |
| **Examples** | Quadratic formula, `∫x²dx = x³/3` | Newton-Raphson, RK4, Gauss Elimination |
| **Use When** | Simple, known forms exist | Complex, nonlinear, no closed form |

**In this project**: All solvers are **numerical** because:
- Ballistics with drag → **no analytical solution** (nonlinear ODE)
- Root finding for arbitrary `f(x)` → **no general formula**
- Linear systems → numerical linear algebra is standard practice
- Knapsack → combinatorial optimization, NP-hard (no efficient analytical solution)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        BALLISTIX PROJECT                        │
├───────────────────────────┬─────────────────────────────────────┤
│      PYTHON BACKEND       │      TYPESCRIPT FRONTEND            │
│    (api/solvers/)         │      (src/lib/)                     │
├───────────────────────────┼─────────────────────────────────────┤
│  engine.py                │  gameEngine.ts                      │
│  ├── bisection_method     │  ├── computeTrajectory()  ← RK4     │
│  ├── false_position_method│  ├── calculateImpact()              │
│  ├── newton_raphson_method│  ├── fireOrdnance()                 │
│  ├── gauss_elimination    │  └── ...game logic                  │
│  ├── gauss_jordan         │                                     │
│  ├── euler_method         │  combatArena2D.ts                   │
│  ├── modified_euler_method│  └── 2D canvas rendering            │
│  ├── rk4_projectile()  ───┼───► Shared physics algorithm        │
│  ├── knapsack_ordnance_   │                                     │
│  └── batch_bisection      │                                     │
├───────────────────────────┼─────────────────────────────────────┤
│  index.py (FastAPI)       │  Components (React)                 │
│  ├── /root/bisection      │  ├── AimingControls                 │
│  ├── /root/false-position │  ├── OrdnancePanel                  │
│  ├── /root/newton-raphson │  ├── TargetMarkers                  │
│  ├── /linear/gauss-*      │  └── GameHUD                        │
│  ├── /ode/euler           │                                     │
│  ├── /ode/modified-euler  │                                     │
│  ├── /simulate-trajectory │                                     │
│  ├── /optimize-ordnance   │                                     │
│  └── /root/batch-bisection│                                     │
└───────────────────────────┴─────────────────────────────────────┘
```

---

## API Endpoints Reference

### Root Finding
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/py/root/bisection` | POST | Bisection root finding |
| `/api/py/root/false-position` | POST | False position root finding |
| `/api/py/root/newton-raphson` | POST | Newton-Raphson (needs derivative) |
| `/api/py/root/batch-bisection` | POST | Vectorized multi-interval bisection |

### Linear Algebra
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/py/linear/gauss-elimination` | POST | Gauss elimination with pivoting |
| `/api/py/linear/gauss-jordan` | POST | Gauss-Jordan with inverse |

### ODE Solvers
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/py/ode/euler` | POST | Euler's method |
| `/api/py/ode/modified-euler` | POST | Modified Euler (Heun's) |

### Ballistics & Optimization
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/py/simulate-trajectory` | POST | RK4 projectile with drag |
| `/api/py/optimize-ordnance` | POST | 0/1 Knapsack loadout optimizer |

---

## Testing

All methods have **unit tests** in `api/solvers/test_engine.py`:
```bash
# Run tests
cd /home/mehrab/Kheponastro
python -m pytest api/solvers/test_engine.py -v
```

Tests verify:
- Convergence against known analytical solutions
- Error handling (singular matrices, bad brackets, zero derivatives)
- Accuracy benchmarks (RK4 vs analytical projectile motion)
- Edge cases (empty inputs, fractional weights, etc.)

---

## Key Design Decisions

1. **No `eval()` in production solvers** — All functions accept typed `Callable` (Python) or direct implementation (TypeScript). Expression parsing only at API boundary with strict allow-listing.

2. **NumPy for vectorization** — Batch bisection, linear algebra, and knapsack DP use NumPy for performance.

3. **Shared RK4 algorithm** — Identical integration scheme in Python and TypeScript ensures consistent physics.

4. **Partial pivoting mandatory** — Both Gauss solvers use row pivoting for numerical stability.

5. **Structured returns** — All solvers return rich dictionaries with metadata (iterations, convergence flag, error estimates, condition numbers).

---

## Further Reading

- **Source Code**: `api/solvers/engine.py` — Complete implementations with docstrings
- **Tests**: `api/solvers/test_engine.py` — Usage examples and verification
- **Frontend Physics**: `src/lib/gameEngine.ts:169` — TypeScript RK4 implementation
- **API Docs**: Run server and visit `http://localhost:8000/api/py/docs` (FastAPI Swagger UI)