from typing import List, Dict, Any
import math

def bisection_method(func_str: str, xl: float, xu: float, tol: float = 1e-6, max_iter: int = 100) -> Dict[str, Any]:
    """Bisection root-finding method."""
    # Simple safe evaluation parser context (or use a library/lambda for expression)
    # For safety/simplicity in lab assignments, you can parse or use standard math evaluation.
    def f(x):
        # Example dynamic evaluation or custom parsing depending on how your project handles input
        return eval(func_str, {"__builtins__": None}, {"x": x, "math": math, "sin": math.sin, "cos": math.cos, "exp": math.exp, "log": math.log})

    if f(xl) * f(xu) > 0:
        return {"error": "Function has the same sign at the endpoints."}

    iterations = []
    xr = xl
    for i in range(max_iter):
        xr = (xl + xu) / 2.0
        fxr = f(xr)
        iterations.append({"iteration": i + 1, "xl": xl, "xu": xu, "xr": xr, "f(xr)": fxr})
        
        if abs(fxr) < tol or abs(xu - xl) < tol:
            break
        if f(xl) * fxr < 0:
            xu = xr
        else:
            xl = xr
            
    return {"root": xr, "iterations": iterations}

def false_position_method(func_str: str, xl: float, xu: float, tol: float = 1e-6, max_iter: int = 100) -> Dict[str, Any]:
    """False Position (Regula Falsi) root-finding method."""
    def f(x):
        return eval(func_str, {"__builtins__": None}, {"x": x, "math": math, "sin": math.sin, "cos": math.cos, "exp": math.exp, "log": math.log})

    if f(xl) * f(xu) > 0:
        return {"error": "Function has the same sign at the endpoints."}

    iterations = []
    xr = xl
    for i in range(max_iter):
        fxl = f(xl)
        fxu = f(xu)
        xr = xu - (fxu * (xl - xu)) / (fxl - fxu)
        fxr = f(xr)
        iterations.append({"iteration": i + 1, "xl": xl, "xu": xu, "xr": xr, "f(xr)": fxr})

        if abs(fxr) < tol:
            break
        if fxl * fxr < 0:
            xu = xr
        else:
            xl = xr

    return {"root": xr, "iterations": iterations}

def newton_raphson_method(func_str: str, deriv_str: str, x0: float, tol: float = 1e-6, max_iter: int = 100) -> Dict[str, Any]:
    """Newton-Raphson root-finding method."""
    def f(x):
        return eval(func_str, {"__builtins__": None}, {"x": x, "math": math, "sin": math.sin, "cos": math.cos, "exp": math.exp, "log": math.log})
    def df(x):
        return eval(deriv_str, {"__builtins__": None}, {"x": x, "math": math, "sin": math.sin, "cos": math.cos, "exp": math.exp, "log": math.log})

    iterations = []
    x = x0
    for i in range(max_iter):
        fx = f(x)
        dfx = df(x)
        if dfx == 0:
            return {"error": "Derivative is zero. Method failed."}
        
        x_next = x - fx / dfx
        iterations.append({"iteration": i + 1, "x": x, "f(x)": fx})
        
        if abs(x_next - x) < tol or abs(fx) < tol:
            x = x_next
            break
        x = x_next

    return {"root": x, "iterations": iterations}

def gauss_elimination(A: List[List[float]], b: List[float]) -> Dict[str, Any]:
    """Gauss Elimination solver for linear systems."""
    n = len(b)
    # Augmented matrix
    M = [A[i] + [b[i]] for i in range(n)]
    
    for i in range(n):
        # Pivot
        max_row = i
        for k in range(i + 1, n):
            if abs(M[k][i]) > abs(M[max_row][i]):
                max_row = k
        M[i], M[max_row] = M[max_row], M[i]
        
        for k in range(i + 1, n):
            c = M[k][i] / M[i][i]
            for j in range(i, n + 1):
                M[k][j] -= c * M[i][j]
                
    # Back substitution
    x = [0.0 for _ in range(n)]
    for i in range(n - 1, -1, -1):
        x[i] = M[i][n]
        for j in range(i + 1, n):
            x[i] -= M[i][j] * x[j]
        x[i] /= M[i][i]
        
    return {"solution": x}

def gauss_jordan(A: List[List[float]], b: List[float]) -> Dict[str, Any]:
    """Gauss-Jordan elimination solver."""
    n = len(b)
    M = [A[i] + [b[i]] for i in range(n)]
    
    for i in range(n):
        # Scale pivot
        pivot = M[i][i]
        if pivot == 0:
            return {"error": "Zero pivot encountered."}
        for j in range(i, n + 1):
            M[i][j] /= pivot
            
        # Eliminate other rows
        for k in range(n):
            if k != i:
                factor = M[k][i]
                for j in range(i, n + 1):
                    M[k][j] -= factor * M[i][j]
                    
    x = [M[i][n] for i in range(n)]
    return {"solution": x}

def euler_method(func_str: str, x0: float, y0: float, x_target: float, h: float) -> Dict[str, Any]:
    """Euler's Ordinary Differential Equation (ODE) numerical solver."""
    def f(x, y):
        return eval(func_str, {"__builtins__": None}, {"x": x, "y": y, "math": math, "sin": math.sin, "cos": math.cos, "exp": math.exp})

    x = x0
    y = y0
    steps = [{"x": x, "y": y}]
    
    while x < x_target:
        if x + h > x_target:
            h = x_target - x
        y += h * f(x, y)
        x += h
        steps.append({"x": x, "y": y})
        
    return {"result": y, "steps": steps}

def modified_euler_method(func_str: str, x0: float, y0: float, x_target: float, h: float) -> Dict[str, Any]:
    """Modified Euler (Heun's) ODE numerical solver."""
    def f(x, y):
        return eval(func_str, {"__builtins__": None}, {"x": x, "y": y, "math": math, "sin": math.sin, "cos": math.cos, "exp": math.exp})

    x = x0
    y = y0
    steps = [{"x": x, "y": y}]
    
    while x < x_target:
        if x + h > x_target:
            h = x_target - x
        slope_1 = f(x, y)
        y_predict = y + h * slope_1
        slope_2 = f(x + h, y_predict)
        y += (h / 2.0) * (slope_1 + slope_2)
        x += h
        steps.append({"x": x, "y": y})
        
    return {"result": y, "steps": steps}

def rk4_projectile(v0: float, angle: float, g: float = 9.81, dt: float = 0.01) -> Dict[str, Any]:
    """Runge-Kutta 4th Order (RK4) projectile simulation solver."""
    rad = math.radians(angle)
    vx = v0 * math.cos(rad)
    vy = v0 * math.sin(rad)
    
    x, y = 0.0, 0.0
    trajectory = [{"x": x, "y": y}]
    
    while y >= 0:
        # Simple RK4 integration step for gravity
        # k1
        dvx1, dvy1 = 0.0, -g
        # k2
        dvx2, dvy2 = 0.0, -g
        # k3
        dvx3, dvy3 = 0.0, -g
        # k4
        dvx4, dvy4 = 0.0, -g
        
        vx += (dvx1 + 2*dvx2 + 2*dvx3 + dvx4) * (dt / 6.0)
        vy += (dvy1 + 2*dvy2 + 2*dvy3 + dvy4) * (dt / 6.0)
        
        x += vx * dt
        y += vy * dt
        if y < 0:
            y = 0.0
        trajectory.append({"x": x, "y": y})
        if y == 0.0 and len(trajectory) > 2:
            break
            
    return {"max_distance": x, "trajectory": trajectory}

def knapsack_ordnance_selector(weights: List[float], values: List[float], capacity: float) -> Dict[str, Any]:
    """0/1 Knapsack optimization selector for tactical payload/ordnance."""
    n = len(weights)
    # Convert weights/capacities to integer scale if needed, or use DP table for weights
    # Here standard DP assuming integer or mapped weights:
    cap_int = int(capacity)
    wt = [int(w) for w in weights]
    val = [int(v) for v in values]
    
    dp = [[0 for _ in range(cap_int + 1)] for _ in range(n + 1)]
    
    for i in range(1, n + 1):
        for w in range(1, cap_int + 1):
            if wt[i-1] <= w:
                dp[i][w] = max(val[i-1] + dp[i-1][w - wt[i-1]], dp[i-1][w])
            else:
                dp[i][w] = dp[i-1][w]
                
    max_val = dp[n][cap_int]
    return {"max_value": max_val, "selected_items": []}