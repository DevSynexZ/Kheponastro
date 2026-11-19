from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from api.solvers.engine import rk4_projectile, newton_raphson_method

# 1. Instantiate FastAPI FIRST before declaring any routes
app = FastAPI(title="Kheponastro Numerical Engine", version="2.0.0")

# Enable CORS so Next.js frontend can communicate with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Health check endpoint
@app.get("/api/py/health")
def health_check():
    return {
        "status": "ONLINE",
        "engine": "Python FastAPI + NumPy",
        "version": "2.0.0"
    }

# 3. Player Firing Request Model & Endpoint (RK4 Physics + Wind)
class PlayerFireRequest(BaseModel):
    v0: float
    angle: float
    ammo_type: str
    drag_coeff: float = 0.02
    mass: float = 1.0
    wind_speed: float = 0.0

@app.post("/api/py/player-fire")
def player_fire(req: PlayerFireRequest):
    result = rk4_projectile(
        v0=req.v0,
        angle=req.angle,
        drag_coeff=req.drag_coeff,
        mass=req.mass,
        wind_speed=req.wind_speed,
        dt=0.01
    )
    return {
        "ammo_type": req.ammo_type,
        "trajectory": result.get("trajectory", []),
        "range": result.get("range", 0.0)
    }

# 4. Enemy Counter-Fire Request Model & Endpoint (Newton-Raphson Solver)
class EnemyAIAimRequest(BaseModel):
    target_x: float
    target_y: float
    enemy_x: float
    enemy_y: float
    wind_speed: float = 0.0

@app.post("/api/py/enemy-ai-aim")
def enemy_ai_aim(req: EnemyAIAimRequest):
    distance_to_player = abs(req.target_x - req.enemy_x)
    
    # Newton-Raphson optimization to find firing angle θ that bridges distance
    def f(theta):
        res = rk4_projectile(v0=175.0, angle=theta, drag_coeff=0.04, mass=2.8, wind_speed=req.wind_speed)
        return res.get("range", 0.0) - distance_to_player

    def df(theta):
        h = 1e-4
        res1 = rk4_projectile(v0=175.0, angle=theta + h, drag_coeff=0.04, mass=2.8, wind_speed=req.wind_speed)
        res2 = rk4_projectile(v0=175.0, angle=theta - h, drag_coeff=0.04, mass=2.8, wind_speed=req.wind_speed)
        return (res1.get("range", 0.0) - res2.get("range", 0.0)) / (2 * h)

    try:
        solution = newton_raphson_method(f, df, x0=55.0, tol=1e-4)
        firing_angle = solution.get("root", 55.0)
    except Exception:
        firing_angle = 55.0

    # Compute trajectory with solved angle
    traj_result = rk4_projectile(v0=175.0, angle=firing_angle, drag_coeff=0.04, mass=2.8, wind_speed=req.wind_speed)
    
    return {
        "angle": round(firing_angle, 2),
        "trajectory": traj_result.get("trajectory", [])
    }