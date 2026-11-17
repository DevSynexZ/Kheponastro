# Numerical Methods: Slide Preparation Notes

This document maps the numerical methods in the project to their actual use.

## 1. Methods Used Directly During Gameplay

### Runge-Kutta 4th Order (RK4)

**What it is:** RK4 estimates the next position and velocity by evaluating the motion four times during each time step and combining those estimates.

**Where it is used:** `src/lib/topDownEngine.ts:589` calls `rk4Projectile`, implemented in `src/lib/numericalMethods.ts:461`.

**Game problem solved:** It calculates realistic rocket and artillery trajectories while considering gravity, drag, wind, flight time, range, and impact velocity. Without this calculation, projectiles would follow a much simpler and less realistic path.

### Newton-Raphson Method

**What it is:** Newton-Raphson repeatedly improves an initial estimate using a function and its derivative until it reaches a sufficiently accurate solution.

**Where it is used:** `calculateInterceptAngle` calls it at `src/lib/numericalMethods.ts:711`.

**Game problem solved:** It estimates the time when a projectile can meet a moving target. This allows enemy AI to aim ahead of a moving player instead of aiming at the player's current position.

### Bisection Method

**What it is:** Bisection finds a root by repeatedly dividing an interval into two smaller parts and keeping the part that contains the solution.

**Where it is used:** `calculateInterceptAngle` uses it as a fallback at `src/lib/numericalMethods.ts:731`.

**Game problem solved:** It provides a reliable backup for finding an interception time when Newton-Raphson cannot converge. This helps the targeting calculation still produce a result in difficult situations.

### Modified Euler Step

**What it is:** Modified Euler uses a prediction and correction step to estimate motion more accurately than basic Euler integration.

**Where it is used:** `src/lib/topDownEngine.ts:745` calls `modifiedEulerStep`, implemented in `src/lib/numericalMethods.ts:884`.

**Game problem solved:** It updates enemy positions and velocities from movement forces and separation forces. This produces smoother and more stable enemy movement.

### Drag Calculation

**What it is:** The drag calculation estimates how air resistance reduces an object's velocity as it moves.

**Where it is used:** `applyDrag` is called from `src/lib/topDownEngine.ts:665`, `:681`, and `:933`; it is implemented at `src/lib/numericalMethods.ts:923`.

**Game problem solved:** It slows rockets and bullets over time, making projectile behavior more realistic instead of allowing constant-speed motion.

### 0/1 Knapsack Dynamic Programming

**What it is:** The knapsack method checks possible item combinations to maximize total value while staying within a fixed capacity.

**Where it is used:** `src/lib/topDownEngine.ts:775` calls `knapsackOrdnanceSelector`, implemented in `src/lib/numericalMethods.ts:585`.

**Game problem solved:** It selects the most valuable combination of weapons or ammunition when the player's ordnance capacity is limited.

## 2. Other Implemented Numerical Methods

### False Position Method

**What it is:** False Position estimates a root using the line between two points and keeps the interval containing the solution.

**Where it is implemented:** `src/lib/numericalMethods.ts:99`.

**Project problem solved:** It provides another root-finding technique for solving equations such as interception or trajectory conditions. It is available in the numerical engine, but it is not currently called by the main arena loop.

### Euler Method

**What it is:** Euler estimates the next value using the current rate of change and a small step size.

**Where it is implemented:** `src/lib/numericalMethods.ts:361`.

**Project problem solved:** It provides a simple method for solving ordinary differential equations and demonstrating step-by-step motion calculations. The live game uses more specialized integration functions instead.

### General Modified Euler Method

**What it is:** This method improves an Euler estimate by predicting the next value and then correcting it.

**Where it is implemented:** `src/lib/numericalMethods.ts:389`.

**Project problem solved:** It can solve general ordinary differential equations for physics experiments. The arena uses the related `modifiedEulerStep` function for enemy motion.

### Gaussian Elimination

**What it is:** Gaussian Elimination transforms a system of equations into an easier form and then uses back-substitution to find the unknowns.

**Where it is implemented:** `src/lib/numericalMethods.ts:224`.

**Project problem solved:** It solves simultaneous linear equations, which can support multi-variable game calculations such as coordinated interception or other future physics features. It is not currently part of the main arena frame loop.

### Gauss-Jordan Elimination

**What it is:** Gauss-Jordan reduces a matrix directly to a form where the solution can be read out, and it can also calculate the matrix inverse.

**Where it is implemented:** `src/lib/numericalMethods.ts:300`.

**Project problem solved:** It solves linear systems and calculates matrix inverses for numerical analysis tasks. It is available through the numerical engine but is not currently used in the live arena loop.

### Optimal-Angle Search

**What it is:** This method tests different firing angles and compares the projectile simulations to find a useful or best angle.

**Where it is implemented:** `src/lib/numericalMethods.ts:820`.

**Project problem solved:** It searches for an angle that gives a suitable range or trajectory. It reuses RK4 simulations and is available as a targeting utility.

## 3. Python Backend Usage

The Python FastAPI backend exposes the same categories of numerical solvers through API endpoints in `api/index.py`.

The homepage actively calls:

- `/api/py/health` to show backend status.
- `/api/py/simulate-trajectory` to preload a sample trajectory before entering the arena.

The backend also exposes endpoints for root finding, linear algebra, ODE solving, and ordnance optimization. These are available numerical tools, but the live arena gameplay is primarily driven by the TypeScript engine.

## 4. Simple Gameplay Connection

1. The game reads the tank, target, weapon, and projectile state.
2. A numerical method calculates the next position, velocity, firing angle, or loadout.
3. The result is applied to the game state.
4. The process repeats every frame or whenever a targeting decision is needed.

**In short:** numerical methods convert projectile physics, enemy AI calculations, movement forces, and resource limits into playable game behavior.
