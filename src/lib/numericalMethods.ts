/**
 * Numerical Analysis Methods for Game Logic
 * TypeScript implementation of numerical methods from the Python engine
 * Used for: Ballistic trajectories, AI intercept prediction, physics integration, loadout optimization
 */

export type Vec2 = { x: number; y: number };
export type Func1D = (x: number) => number;
export type Func2D = (x: number, y: number) => number;

// ============================================================================
// ROOT-FINDING METHODS
// ============================================================================

export interface RootFindingResult {
  root: number;
  converged: boolean;
  iterations: Array<{
    iteration: number;
    // Bisection/False Position fields
    xl?: number;
    xu?: number;
    xr?: number;
    f_xr?: number;
    interval_width?: number;
    // Newton-Raphson fields
    x?: number;
    f_x?: number;
    df_x?: number;
    step?: number;
  }>;
  final_error: number;
  warning?: string;
}

/**
 * Bisection Method - Robust root finding for continuous functions
 * Used for: AI intercept angle calculation, trajectory parameter solving
 */
export function bisectionMethod(
  f: Func1D,
  xl: number,
  xu: number,
  tol: number = 1e-6,
  maxIter: number = 100
): RootFindingResult {
  const fxl = f(xl);
  const fxu = f(xu);

  if (fxl * fxu > 0) {
    throw new Error("Function has the same sign at the endpoints. Root not bracketed.");
  }

  const iterations: RootFindingResult["iterations"] = [];
  let xr = xl;

  for (let i = 0; i < maxIter; i++) {
    xr = (xl + xu) / 2.0;
    const fxr = f(xr);

    iterations.push({
      iteration: i + 1,
      xl,
      xu,
      xr,
      f_xr: fxr,
      interval_width: Math.abs(xu - xl),
    });

    if (Math.abs(fxr) < tol || Math.abs(xu - xl) < tol) {
      return {
        root: xr,
        converged: true,
        iterations,
        final_error: Math.abs(fxr),
      };
    }

    if (fxl * fxr < 0) {
      xu = xr;
    } else {
      xl = xr;
    }
  }

  return {
    root: xr,
    converged: false,
    iterations,
    final_error: Math.abs(f(xr)),
    warning: "Max iterations reached without convergence",
  };
}

/**
 * False Position (Regula Falsi) Method - Faster convergence than bisection
 * Used for: Quick intercept calculations
 */
export function falsePositionMethod(
  f: Func1D,
  xl: number,
  xu: number,
  tol: number = 1e-6,
  maxIter: number = 100
): RootFindingResult {
  let fxl = f(xl);
  let fxu = f(xu);

  if (fxl * fxu > 0) {
    throw new Error("Function has the same sign at the endpoints. Root not bracketed.");
  }

  const iterations: RootFindingResult["iterations"] = [];
  let xr = xl;

  for (let i = 0; i < maxIter; i++) {
    // Secant formula
    xr = xu - (fxu * (xl - xu)) / (fxl - fxu);
    const fxr = f(xr);

    iterations.push({
      iteration: i + 1,
      xl,
      xu,
      xr,
      f_xr: fxr,
    });

    if (Math.abs(fxr) < tol) {
      return {
        root: xr,
        converged: true,
        iterations,
        final_error: Math.abs(fxr),
      };
    }

    if (fxl * fxr < 0) {
      xu = xr;
      fxu = fxr;
    } else {
      xl = xr;
      fxl = fxr;
    }
  }

  return {
    root: xr,
    converged: false,
    iterations,
    final_error: Math.abs(f(xr)),
    warning: "Max iterations reached without convergence",
  };
}

/**
 * Newton-Raphson Method - Fast quadratic convergence
 * Used for: Precise intercept angle calculation, optimization
 */
export function newtonRaphsonMethod(
  f: Func1D,
  df: Func1D,
  x0: number,
  tol: number = 1e-6,
  maxIter: number = 100
): RootFindingResult {
  const iterations: RootFindingResult["iterations"] = [];
  let x = x0;

  for (let i = 0; i < maxIter; i++) {
    const fx = f(x);
    const dfx = df(x);

    if (Math.abs(dfx) < 1e-14) {
      throw new Error(`Derivative near zero at x=${x}. Method failed.`);
    }

    const xNext = x - fx / dfx;

    iterations.push({
      iteration: i + 1,
      x,
      f_x: fx,
      df_x: dfx,
      step: Math.abs(xNext - x),
    });

    if (Math.abs(xNext - x) < tol || Math.abs(fx) < tol) {
      return {
        root: xNext,
        converged: true,
        iterations,
        final_error: Math.abs(f(xNext)),
      };
    }

    x = xNext;
  }

  return {
    root: x,
    converged: false,
    iterations,
    final_error: Math.abs(f(x)),
    warning: "Max iterations reached without convergence",
  };
}

// ============================================================================
// LINEAR ALGEBRA SOLVERS
// ============================================================================

export interface LinearSystemResult {
  solution: number[];
  determinant?: number;
  condition_estimate?: number;
  inverse?: number[][];
}

/**
 * Gauss Elimination with Partial Pivoting
 * Used for: Solving simultaneous equations for multi-target interception
 */
export function gaussElimination(
  A: number[][],
  b: number[]
): LinearSystemResult {
  const n = A.length;
  const A_copy = A.map(row => [...row]);
  const b_copy = [...b];
  let rowSwaps = 0;

  // Forward elimination with partial pivoting
  for (let i = 0; i < n; i++) {
    // Partial pivot
    let pivotRow = i;
    let maxVal = Math.abs(A_copy[i][i]);
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(A_copy[k][i]) > maxVal) {
        maxVal = Math.abs(A_copy[k][i]);
        pivotRow = k;
      }
    }

    if (maxVal < 1e-14) {
      throw new Error("Matrix is singular or nearly singular");
    }

    if (pivotRow !== i) {
      [A_copy[i], A_copy[pivotRow]] = [A_copy[pivotRow], A_copy[i]];
      [b_copy[i], b_copy[pivotRow]] = [b_copy[pivotRow], b_copy[i]];
      rowSwaps++;
    }

    // Eliminate below
    for (let k = i + 1; k < n; k++) {
      const factor = A_copy[k][i] / A_copy[i][i];
      for (let j = i; j < n; j++) {
        A_copy[k][j] -= factor * A_copy[i][j];
      }
      b_copy[k] -= factor * b_copy[i];
    }
  }

  // Back substitution
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = b_copy[i];
    for (let j = i + 1; j < n; j++) {
      sum -= A_copy[i][j] * x[j];
    }
    x[i] = sum / A_copy[i][i];
  }

  // Determinant
  let det = rowSwaps % 2 === 0 ? 1 : -1;
  for (let i = 0; i < n; i++) {
    det *= A_copy[i][i];
  }

  // Condition estimate (simplified)
  let condEst = 1;
  if (n > 1) {
    const maxRowSum = Math.max(...A_copy.map(row => row.reduce((sum, val) => sum + Math.abs(val), 0)));
    const minDiag = Math.min(...A_copy.map((row, i) => Math.abs(row[i])));
    condEst = minDiag > 0 ? maxRowSum / minDiag : 1e10;
  }

  return {
    solution: x,
    determinant: det,
    condition_estimate: condEst,
  };
}

/**
 * Gauss-Jordan Elimination - Also computes matrix inverse
 * Used for: Batch solving multiple intercept scenarios
 */
export function gaussJordan(
  A: number[][],
  b: number[]
): LinearSystemResult {
  const n = A.length;
  // Create augmented matrix [A | I]
  const aug: number[][] = [];
  for (let i = 0; i < n; i++) {
    const identityRow = new Array(n).fill(0);
    identityRow[i] = 1;
    aug.push([...A[i], ...identityRow]);
  }
  const b_aug = [...b];

  for (let i = 0; i < n; i++) {
    // Scale pivot row
    const pivot = aug[i][i];
    if (Math.abs(pivot) < 1e-14) {
      throw new Error("Zero pivot encountered. Matrix is singular.");
    }

    for (let j = 0; j < 2 * n; j++) {
      aug[i][j] /= pivot;
    }
    b_aug[i] /= pivot;

    // Eliminate all other rows
    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = aug[k][i];
        for (let j = 0; j < 2 * n; j++) {
          aug[k][j] -= factor * aug[i][j];
        }
        b_aug[k] -= factor * b_aug[i];
      }
    }
  }

  const x = b_aug;
  const inverse = aug.map(row => row.slice(n));

  return {
    solution: x,
    inverse,
  };
}

// ============================================================================
// ODE SOLVERS (For Physics Integration)
// ============================================================================

export interface ODEResult {
  result: number;
  steps: Array<{ x: number; y: number }>;
  num_steps: number;
}

/**
 * Euler's Method - First order ODE solver
 * Used for: Simple physics integration, particle systems
 */
export function eulerMethod(
  f: Func2D,
  x0: number,
  y0: number,
  xTarget: number,
  h: number
): ODEResult {
  if (h <= 0) throw new Error("Step size h must be positive");
  if (xTarget <= x0) throw new Error("x_target must be greater than x0");

  let x = x0;
  let y = y0;
  const steps = [{ x, y }];

  while (x < xTarget) {
    const hEff = Math.min(h, xTarget - x);
    y += hEff * f(x, y);
    x += hEff;
    steps.push({ x, y });
  }

  return { result: y, steps, num_steps: steps.length - 1 };
}

/**
 * Modified Euler (Heun's) Method - Second order Runge-Kutta
 * Used for: More accurate physics integration, projectile motion
 */
export function modifiedEulerMethod(
  f: Func2D,
  x0: number,
  y0: number,
  xTarget: number,
  h: number
): ODEResult {
  if (h <= 0) throw new Error("Step size h must be positive");
  if (xTarget <= x0) throw new Error("x_target must be greater than x0");

  let x = x0;
  let y = y0;
  const steps = [{ x, y }];

  while (x < xTarget) {
    const hEff = Math.min(h, xTarget - x);

    // Predictor (Euler step)
    const k1 = f(x, y);
    const yPred = y + hEff * k1;

    // Corrector (average slope)
    const k2 = f(x + hEff, yPred);
    y += (hEff / 2.0) * (k1 + k2);

    x += hEff;
    steps.push({ x, y });
  }

  return { result: y, steps, num_steps: steps.length - 1 };
}

/**
 * RK4 Integration for System of ODEs
 * Used for: Full ballistic simulation with drag (coupled x,y equations)
 */
export interface RK4SystemResult {
  trajectory: Array<{
    t: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    v: number;
  }>;
  maxHeight: number;
  range: number;
  flightTime: number;
  apexTime: number;
  impactVelocity: number;
}

export interface ProjectileParams {
  v0: number;           // Initial velocity (m/s)
  angle: number;        // Launch angle (degrees)
  g?: number;           // Gravity (m/s^2)
  dragCoeff?: number;   // Drag coefficient (kg/m)
  mass?: number;        // Projectile mass (kg)
  dt?: number;          // Time step (s)
  maxTime?: number;     // Maximum simulation time (s)
  windX?: number;       // Wind velocity X
  windY?: number;       // Wind velocity Y
}

/**
 * RK4 Projectile Simulation with Quadratic Drag Model
 * This is the CORE numerical method for realistic ballistic trajectories
 * Equations:
 *   dvx/dt = -k * v * vx + windX
 *   dvy/dt = -g - k * v * vy + windY
 *   where k = drag_coeff / mass, v = sqrt(vx^2 + vy^2)
 */
export function rk4Projectile(params: ProjectileParams): RK4SystemResult {
  const {
    v0,
    angle,
    g = 9.81,
    dragCoeff = 0.02,
    mass = 1.0,
    dt = 0.01,
    maxTime = 100.0,
    windX = 0,
    windY = 0,
  } = params;

  if (v0 <= 0) throw new Error("Initial velocity must be positive");
  if (angle <= 0 || angle >= 90) throw new Error("Angle must be between 0 and 90 degrees");
  if (dt <= 0) throw new Error("Time step must be positive");
  if (mass <= 0) throw new Error("Mass must be positive");

  const rad = (angle * Math.PI) / 180;
  let vx = v0 * Math.cos(rad);
  let vy = v0 * Math.sin(rad);

  let x = 0.0;
  let y = 0.0;
  let t = 0.0;
  const k = dragCoeff / mass;

  const trajectory: RK4SystemResult["trajectory"] = [
    { t, x, y, vx, vy, v: v0 },
  ];
  let maxHeight = 0.0;
  let apexTime = 0.0;

  function acceleration(vxCurr: number, vyCurr: number): { ax: number; ay: number } {
    const vMag = Math.hypot(vxCurr, vyCurr);
    if (vMag < 1e-12) {
      return { ax: windX, ay: -g + windY };
    }
    const dragX = -k * vMag * vxCurr + windX;
    const dragY = -k * vMag * vyCurr - g + windY;
    return { ax: dragX, ay: dragY };
  }

  while (y >= 0 && t < maxTime) {
    // RK4 integration for coupled system
    // k1
    const { ax: ax1, ay: ay1 } = acceleration(vx, vy);

    // k2
    const vx2 = vx + 0.5 * dt * ax1;
    const vy2 = vy + 0.5 * dt * ay1;
    const { ax: ax2, ay: ay2 } = acceleration(vx2, vy2);

    // k3
    const vx3 = vx + 0.5 * dt * ax2;
    const vy3 = vy + 0.5 * dt * ay2;
    const { ax: ax3, ay: ay3 } = acceleration(vx3, vy3);

    // k4
    const vx4 = vx + dt * ax3;
    const vy4 = vy + dt * ay3;
    const { ax: ax4, ay: ay4 } = acceleration(vx4, vy4);

    // Update velocities (RK4 weighted average)
    vx += (dt / 6.0) * (ax1 + 2 * ax2 + 2 * ax3 + ax4);
    vy += (dt / 6.0) * (ay1 + 2 * ay2 + 2 * ay3 + ay4);

    // Update positions (using average velocity during step)
    x += vx * dt;
    y += vy * dt;
    t += dt;

    const vMag = Math.hypot(vx, vy);

    if (y > maxHeight) {
      maxHeight = y;
      apexTime = t;
    }

    if (y < 0) y = 0.0;

    trajectory.push({
      t: Math.round(t * 10000) / 10000,
      x: Math.round(x * 10000) / 10000,
      y: Math.round(y * 10000) / 10000,
      vx: Math.round(vx * 10000) / 10000,
      vy: Math.round(vy * 10000) / 10000,
      v: Math.round(vMag * 10000) / 10000,
    });

    if (y === 0.0 && trajectory.length > 2) break;
  }

  const range = x;
  const flightTime = t;
  const impactVelocity = Math.hypot(vx, vy);

  return {
    trajectory,
    maxHeight: Math.round(maxHeight * 10000) / 10000,
    range: Math.round(range * 10000) / 10000,
    flightTime: Math.round(flightTime * 10000) / 10000,
    apexTime: Math.round(apexTime * 10000) / 10000,
    impactVelocity: Math.round(impactVelocity * 10000) / 10000,
  };
}

// ============================================================================
// OPTIMIZATION - 0/1 KNAPSACK
// ============================================================================

export interface KnapsackResult {
  maxValue: number;
  selectedItems: number[];
  totalWeight: number;
  remainingCapacity: number;
  efficiency: number;
  itemCount: number;
}

/**
 * 0/1 Knapsack using Dynamic Programming
 * Used for: Optimal weapon/ammo loadout selection, resource allocation
 */
export function knapsackOrdnanceSelector(
  weights: number[],
  values: number[],
  capacity: number
): KnapsackResult {
  const n = weights.length;
  if (values.length !== n) {
    throw new Error("weights and values must have same length");
  }
  if (n === 0) {
    return { maxValue: 0, selectedItems: [], totalWeight: 0, remainingCapacity: capacity, efficiency: 0, itemCount: 0 };
  }
  if (capacity <= 0) throw new Error("Capacity must be positive");

  // Scale to integers for DP (preserve 3 decimal places)
  const scale = 1000;
  const wInt = weights.map(w => Math.round(w * scale));
  const vInt = values.map(v => Math.round(v * scale));
  const capInt = Math.round(capacity * scale);

  // DP table
  const dp = Array.from({ length: n + 1 }, () => new Array(capInt + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    const wi = wInt[i - 1];
    const vi = vInt[i - 1];
    for (let w = 0; w <= capInt; w++) {
      if (w < wi) {
        dp[i][w] = dp[i - 1][w];
      } else {
        dp[i][w] = Math.max(dp[i - 1][w], vi + dp[i - 1][w - wi]);
      }
    }
  }

  const maxValScaled = dp[n][capInt];
  const maxVal = maxValScaled / scale;

  // Backtrack to find selected items
  const selected: number[] = [];
  let w = capInt;
  for (let i = n; i >= 1; i--) {
    if (dp[i][w] !== dp[i - 1][w]) {
      selected.push(i - 1);
      w -= wInt[i - 1];
    }
  }

  selected.reverse();
  const totalWeight = selected.reduce((sum, idx) => sum + weights[idx], 0);

  return {
    maxValue: Math.round(maxVal * 1000) / 1000,
    selectedItems: selected,
    totalWeight: Math.round(totalWeight * 1000) / 1000,
    remainingCapacity: Math.round((capacity - totalWeight) * 1000) / 1000,
    efficiency: totalWeight > 0 ? Math.round((maxVal / totalWeight) * 1000) / 1000 : 0,
    itemCount: selected.length,
  };
}

// ============================================================================
// INTERCEPT PREDICTION (AI TARGETING)
// ============================================================================

export interface InterceptSolution {
  angle: number;        // Required launch angle (degrees)
  timeToImpact: number; // Time until impact (seconds)
  impactPoint: Vec2;    // Predicted impact position
  feasible: boolean;    // Whether intercept is possible
  method: string;       // Numerical method used
}

/**
 * Calculate intercept angle for moving target using numerical root-finding
 * Solves for angle where projectile and target positions coincide at same time
 * Uses Newton-Raphson for fast convergence
 */
export function calculateInterceptAngle(
  shooterPos: Vec2,
  targetPos: Vec2,
  targetVel: Vec2,
  projectileSpeed: number,
  gravity: number = 9.81,
  dragCoeff: number = 0.0,
  maxTime: number = 10.0
): InterceptSolution {
  // Relative position
  const dx = targetPos.x - shooterPos.x;
  const dy = targetPos.y - shooterPos.y;

  // Function to solve: f(angle) = 0 where projectile hits target
  // We solve for the time of flight that satisfies both x and y equations
  // Using Newton-Raphson on the time variable, then computing angle

  // For no-drag case, we can solve analytically for time, then angle
  if (dragCoeff === 0) {
    // Projectile motion: x = v0*cos(θ)*t, y = v0*sin(θ)*t - 0.5*g*t^2
    // Target motion: x_t = dx + vx*t, y_t = dy + vy*t
    // At intercept: v0*cos(θ)*t = dx + vx*t
    //               v0*sin(θ)*t - 0.5*g*t^2 = dy + vy*t

    // Eliminate θ: (v0*cos(θ)*t)^2 + (v0*sin(θ)*t)^2 = (dx + vx*t)^2 + (dy + vy*t + 0.5*g*t^2)^2
    // v0^2*t^2 = (dx + vx*t)^2 + (dy + vy*t + 0.5*g*t^2)^2

    // Solve for t using Newton-Raphson
    const f = (t: number) => {
      const tx = dx + targetVel.x * t;
      const ty = dy + targetVel.y * t + 0.5 * gravity * t * t;
      return projectileSpeed * projectileSpeed * t * t - (tx * tx + ty * ty);
    };

    const df = (t: number) => {
      const tx = dx + targetVel.x * t;
      const ty = dy + targetVel.y * t + 0.5 * gravity * t * t;
      const dtx = targetVel.x;
      const dty = targetVel.y + gravity * t;
      return 2 * projectileSpeed * projectileSpeed * t - 2 * (tx * dtx + ty * dty);
    };

    // Find positive root for t
    let tGuess = Math.hypot(dx, dy) / projectileSpeed;
    if (tGuess < 0.1) tGuess = 0.1;
    if (tGuess > maxTime) tGuess = maxTime;

    try {
      const result = newtonRaphsonMethod(f, df, tGuess, 1e-6, 50);
      if (result.converged && result.root > 0 && result.root <= maxTime) {
        const t = result.root;
        const tx = dx + targetVel.x * t;
        const ty = dy + targetVel.y * t + 0.5 * gravity * t * t;
        const angle = Math.atan2(ty, tx) * 180 / Math.PI;
        return {
          angle,
          timeToImpact: t,
          impactPoint: { x: targetPos.x + targetVel.x * t, y: targetPos.y + targetVel.y * t },
          feasible: true,
          method: "Newton-Raphson (analytical no-drag)",
        };
      }
    } catch {
      // Fall through to bisection
    }

    // Fallback: bisection on time
    try {
      const result = bisectionMethod(f, 0.01, maxTime, 1e-6, 100);
      if (result.converged && result.root > 0) {
        const t = result.root;
        const tx = dx + targetVel.x * t;
        const ty = dy + targetVel.y * t + 0.5 * gravity * t * t;
        const angle = Math.atan2(ty, tx) * 180 / Math.PI;
        return {
          angle,
          timeToImpact: t,
          impactPoint: { x: targetPos.x + targetVel.x * t, y: targetPos.y + targetVel.y * t },
          feasible: true,
          method: "Bisection (analytical no-drag)",
        };
      }
    } catch {
      // No solution
    }

    return {
      angle: 0,
      timeToImpact: 0,
      impactPoint: targetPos,
      feasible: false,
      method: "None - no intercept possible",
    };
  }

  // With drag: Use numerical trajectory simulation + root-finding
  // This is more complex - we'll use a simplified approach
  // For game AI, we can use the no-drag solution as approximation
  // and adjust iteratively

  const noDragSolution = calculateInterceptAngle(
    shooterPos, targetPos, targetVel, projectileSpeed, gravity, 0, maxTime
  );

  if (!noDragSolution.feasible) {
    return { ...noDragSolution, method: "Failed (no-drag approximation infeasible)" };
  }

  // Verify with drag simulation
  const sim = rk4Projectile({
    v0: projectileSpeed,
    angle: noDragSolution.angle,
    g: gravity,
    dragCoeff,
    mass: 1.0,
    dt: 0.01,
    maxTime,
  });

  // Check if trajectory gets close to target at predicted time
  let closestDist = Infinity;
  let closestIdx = 0;
  for (let i = 0; i < sim.trajectory.length; i++) {
    const p = sim.trajectory[i];
    const targetX = targetPos.x + targetVel.x * p.t;
    const targetY = targetPos.y + targetVel.y * p.t;
    const dist = Math.hypot(p.x - targetX, p.y - targetY);
    if (dist < closestDist) {
      closestDist = dist;
      closestIdx = i;
    }
  }

  if (closestDist < 20) { // Within 20 units
    const p = sim.trajectory[closestIdx];
    return {
      angle: noDragSolution.angle,
      timeToImpact: p.t,
      impactPoint: { x: p.x, y: p.y },
      feasible: true,
      method: "Newton-Raphson + RK4 verification (with drag)",
    };
  }

  return {
    angle: noDragSolution.angle,
    timeToImpact: noDragSolution.timeToImpact,
    impactPoint: noDragSolution.impactPoint,
    feasible: false,
    method: "Approximate - drag verification failed",
  };
}

/**
 * Calculate optimal launch angle for maximum range (with drag)
 * Uses golden-section search or Newton-Raphson on range function
 */
export function calculateOptimalAngle(
  v0: number,
  gravity: number = 9.81,
  dragCoeff: number = 0.02,
  mass: number = 1.0
): { angle: number; maxRange: number } {
  // Golden-section search for maximum range
  const phi = (Math.sqrt(5) - 1) / 2; // ~0.618
  let a = 1.0; // degrees
  let b = 89.0;
  let tol = 0.01;

  const rangeAtAngle = (angle: number) => {
    const sim = rk4Projectile({ v0, angle, g: gravity, dragCoeff, mass, dt: 0.01 });
    return sim.range;
  };

  let c = b - phi * (b - a);
  let d = a + phi * (b - a);
  let fc = rangeAtAngle(c);
  let fd = rangeAtAngle(d);

  while (Math.abs(b - a) > tol) {
    if (fc < fd) {
      a = c;
      c = d;
      fc = fd;
      d = a + phi * (b - a);
      fd = rangeAtAngle(d);
    } else {
      b = d;
      d = c;
      fd = fc;
      c = b - phi * (b - a);
      fc = rangeAtAngle(c);
    }
  }

  const optimalAngle = (a + b) / 2;
  const maxRange = rangeAtAngle(optimalAngle);

  return { angle: optimalAngle, maxRange };
}

// ============================================================================
// PHYSICS INTEGRATION HELPERS
// ============================================================================

/**
 * Modified Euler integration for position/velocity update
 * Used for: Smooth entity movement with forces
 */
export interface PhysicsState {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface Force {
  x: number;
  y: number;
}

export function modifiedEulerStep(
  state: PhysicsState,
  mass: number,
  forces: Force | Force[],
  dt: number
): PhysicsState {
  const forceArray = Array.isArray(forces) ? forces : [forces];

  // Net force
  const fx = forceArray.reduce((sum, f) => sum + f.x, 0);
  const fy = forceArray.reduce((sum, f) => sum + f.y, 0);

  // Acceleration
  const ax = fx / mass;
  const ay = fy / mass;

  // Predictor (Euler step)
  const vxPred = state.vx + ax * dt;
  const vyPred = state.vy + ay * dt;
  const xPred = state.x + state.vx * dt;
  const yPred = state.y + state.vy * dt;

  // Forces at predicted position (simplified - using same forces)
  // In a full simulation, forces might depend on position
  const axPred = fx / mass;
  const ayPred = fy / mass;

  // Corrector (average acceleration)
  const vxNew = state.vx + 0.5 * (ax + axPred) * dt;
  const vyNew = state.vy + 0.5 * (ay + ayPred) * dt;
  const xNew = state.x + 0.5 * (state.vx + vxPred) * dt;
  const yNew = state.y + 0.5 * (state.vy + vyPred) * dt;

  return { x: xNew, y: yNew, vx: vxNew, vy: vyNew };
}

/**
 * Apply drag force to velocity
 */
export function applyDrag(
  vx: number,
  vy: number,
  dragCoeff: number,
  mass: number,
  dt: number
): { vx: number; vy: number } {
  const v = Math.hypot(vx, vy);
  if (v < 1e-6) return { vx: 0, vy: 0 };

  const dragForce = dragCoeff * v * v;
  const dragAccel = dragForce / mass;
  const dragX = -dragAccel * (vx / v);
  const dragY = -dragAccel * (vy / v);

  return {
    vx: vx + dragX * dt,
    vy: vy + dragY * dt,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const NumericalMethods = {
  // Root finding
  bisectionMethod,
  falsePositionMethod,
  newtonRaphsonMethod,

  // Linear algebra
  gaussElimination,
  gaussJordan,

  // ODE solvers
  eulerMethod,
  modifiedEulerMethod,
  rk4Projectile,

  // Optimization
  knapsackOrdnanceSelector,

  // AI targeting
  calculateInterceptAngle,
  calculateOptimalAngle,

  // Physics
  modifiedEulerStep,
  applyDrag,
};