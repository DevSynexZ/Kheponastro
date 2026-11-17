/**
 * Game Engine - Core Gameplay Logic
 * Handles targeting, ballistics, damage, scoring
 */

import {
  Vector2,
  Vector3,
  Target,
  OrdnanceItem,
  Loadout,
  ShotResult,
  TrajectoryPoint,
  GameState,
  GamePhase,
  GameConfig,
  DEFAULT_GAME_CONFIG,
  ORDNANCE_DATABASE,
  TARGET_TEMPLATES,
  TargetType,
} from "./gameTypes";

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function distance3d(a: Vector3, b: Vector3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function distance2d(a: Vector2, b: Vector2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// ============================================================================
// TARGET SPAWNING
// ============================================================================

export function spawnTargets(
  count: number,
  arenaSize: { width: number; depth: number },
  round: number
): Target[] {
  const targets: Target[] = [];
  const types: TargetType[] = ["light", "medium", "heavy", "command", "supply"];

  // Weighted distribution based on round
  const weights = {
    light: 30 + round * 2,
    medium: 25 + round * 1,
    heavy: 15 + round * 1,
    command: 5,
    supply: 10,
  };

  for (let i = 0; i < count; i++) {
    // Pick type by weight
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    let roll = Math.random() * totalWeight;
    let selectedType: TargetType = "light";

    for (const [type, weight] of Object.entries(weights)) {
      roll -= weight;
      if (roll <= 0) {
        selectedType = type as TargetType;
        break;
      }
    }

    // Spawn position - avoid clustering
    let position: Vector3;
    let attempts = 0;
    do {
      position = {
        x: (Math.random() - 0.5) * arenaSize.width * 0.8,
        y: 0,
        z: Math.random() * arenaSize.depth * 0.7 + arenaSize.depth * 0.15,
      };
      attempts++;
    } while (
      attempts < 20 &&
      targets.some((t) => distance3d(t.position, position) < 30)
    );

    const template = TARGET_TEMPLATES[selectedType];
    targets.push({
      id: generateId(),
      position,
      ...template,
    });
  }

  return targets;
}

// ============================================================================
// LOADOUT / ORDNANCE MANAGEMENT
// ============================================================================

export function createLoadout(capacity: number = 200): Loadout {
  // Generous tactical loadout so player has plenty of shells
  const defaultAllocations: Record<string, number> = {
    he_105: 6,       // Standard HE
    ap_105: 4,       // Armor piercing
    heat_105: 3,     // High explosive anti-tank
    cluster_105: 2,  // Cluster bomb
    smoke_105: 1,    // Screening smoke
  };

  const items = ORDNANCE_DATABASE.map((ord) => ({
    ...ord,
    quantity: defaultAllocations[ord.id] || 0,
  }));

  const totalWeight = items.reduce((sum, i) => sum + i.weight * i.quantity, 0);

  return {
    items,
    totalWeight,
    capacity: totalWeight,
    maxCapacity: Math.max(capacity, totalWeight),
  };
}

export function getAvailableOrdnance(loadout: Loadout): OrdnanceItem[] {
  return loadout.items.filter((i) => i.quantity > 0);
}

export function consumeOrdnance(loadout: Loadout, ordnanceId: string): Loadout {
  const items = loadout.items.map((i) =>
    i.id === ordnanceId ? { ...i, quantity: Math.max(0, i.quantity - 1) } : i
  );
  const totalWeight = items.reduce((sum, i) => sum + i.weight * i.quantity, 0);
  return { ...loadout, items, totalWeight, capacity: totalWeight };
}

// ============================================================================
// BALLISTICS & TRAJECTORY
// ============================================================================

export interface TrajectoryParams {
  v0: number;
  angle: number;      // degrees
  azimuth: number;    // degrees (horizontal angle)
  gravity: number;
  dragCoeff: number;
  mass: number;
  wind: Vector2;
  dt: number;
}

export function computeTrajectory(params: TrajectoryParams): TrajectoryPoint[] {
  const {
    v0,
    angle,
    azimuth,
    gravity,
    dragCoeff,
    mass,
    wind,
    dt,
  } = params;

  const rad = (angle * Math.PI) / 180;
  const azRad = (azimuth * Math.PI) / 180;

  // Initial velocity vector
  const vx = v0 * Math.cos(rad) * Math.sin(azRad);
  const vy = v0 * Math.sin(rad);
  const vz = v0 * Math.cos(rad) * Math.cos(azRad);

  let x = 0, y = 0, z = 0;
  let velX = vx, velY = vy, velZ = vz;
  const k = dragCoeff / mass;
  const trajectory: TrajectoryPoint[] = [];

  trajectory.push({ t: 0, x, y, z, vx: velX, vy: velY, vz: velZ, v: v0 });

  let t = 0;
  const maxTime = 60; // seconds

  while (y >= 0 && t < maxTime) {
    // Current velocity magnitude
    const vMag = Math.sqrt(velX * velX + velY * velY + velZ * velZ);
    if (vMag < 1e-6) break;

    // Drag acceleration (opposite to velocity)
    const dragX = -k * vMag * velX;
    const dragY = -k * vMag * velY;
    const dragZ = -k * vMag * velZ;

    // Wind effect (affects horizontal components)
    const windAccelX = wind.x * 0.01;
    const windAccelZ = wind.y * 0.01;

    // Total acceleration
    const ax = dragX + windAccelX;
    const ay = -gravity + dragY;
    const az = dragZ + windAccelZ;

    // RK4 integration
    // k1
    const k1vx = ax, k1vy = ay, k1vz = az;
    const k1x = velX, k1y = velY, k1z = velZ;

    // k2
    const vx2 = velX + 0.5 * dt * k1vx;
    const vy2 = velY + 0.5 * dt * k1vy;
    const vz2 = velZ + 0.5 * dt * k1vz;
    const vMag2 = Math.sqrt(vx2 * vx2 + vy2 * vy2 + vz2 * vz2);
    const k2x = vx2, k2y = vy2, k2z = vz2;
    const k2vx = -k * vMag2 * vx2 + windAccelX;
    const k2vy = -gravity - k * vMag2 * vy2;
    const k2vz = -k * vMag2 * vz2 + windAccelZ;

    // k3
    const vx3 = velX + 0.5 * dt * k2vx;
    const vy3 = velY + 0.5 * dt * k2vy;
    const vz3 = velZ + 0.5 * dt * k2vz;
    const vMag3 = Math.sqrt(vx3 * vx3 + vy3 * vy3 + vz3 * vz3);
    const k3x = vx3, k3y = vy3, k3z = vz3;
    const k3vx = -k * vMag3 * vx3 + windAccelX;
    const k3vy = -gravity - k * vMag3 * vy3;
    const k3vz = -k * vMag3 * vz3 + windAccelZ;

    // k4
    const vx4 = velX + dt * k3vx;
    const vy4 = velY + dt * k3vy;
    const vz4 = velZ + dt * k3vz;
    const vMag4 = Math.sqrt(vx4 * vx4 + vy4 * vy4 + vz4 * vz4);
    const k4x = vx4, k4y = vy4, k4z = vz4;
    const k4vx = -k * vMag4 * vx4 + windAccelX;
    const k4vy = -gravity - k * vMag4 * vy4;
    const k4vz = -k * vMag4 * vz4 + windAccelZ;

    // Update velocities
    velX += (dt / 6) * (k1vx + 2 * k2vx + 2 * k3vx + k4vx);
    velY += (dt / 6) * (k1vy + 2 * k2vy + 2 * k3vy + k4vy);
    velZ += (dt / 6) * (k1vz + 2 * k2vz + 2 * k3vz + k4vz);

    // Update positions
    x += (dt / 6) * (k1x + 2 * k2x + 2 * k3x + k4x);
    y += (dt / 6) * (k1y + 2 * k2y + 2 * k3y + k4y);
    z += (dt / 6) * (k1z + 2 * k2z + 2 * k3z + k4z);

    t += dt;

    if (y < 0) y = 0;

    const vMagEnd = Math.sqrt(velX * velX + velY * velY + velZ * velZ);
    trajectory.push({ t, x, y, z, vx: velX, vy: velY, vz: velZ, v: vMagEnd });

    if (y === 0 && trajectory.length > 2) break;
  }

  return trajectory;
}

// ============================================================================
// IMPACT & DAMAGE CALCULATION
// ============================================================================

export interface ImpactResult {
  hitTarget: Target | null;
  impactPoint: Vector3;
  damageDealt: number;
  splashDamage: Array<{ target: Target; damage: number }>;
}

export function calculateImpact(
  trajectory: TrajectoryPoint[],
  targets: Target[],
  ordnance: OrdnanceItem
): ImpactResult {
  const impactPoint = trajectory[trajectory.length - 1];
  const impactPos: Vector3 = { x: impactPoint.x, y: impactPoint.y, z: impactPoint.z };

  // Find primary hit (direct hit on target)
  let hitTarget: Target | null = null;
  let minDist = Infinity;

  for (const target of targets) {
    if (target.destroyed) continue;
    const dist = distance3d(target.position, impactPos);
    if (dist < target.size && dist < minDist) {
      minDist = dist;
      hitTarget = target;
    }
  }

  // Calculate splash damage to nearby targets
  const splashDamage: Array<{ target: Target; damage: number }> = [];

  for (const target of targets) {
    if (target.destroyed) continue;
    const dist = distance3d(target.position, impactPos);
    if (dist <= ordnance.radius) {
      // Falloff: linear from center to edge
      const falloff = 1 - dist / ordnance.radius;
      const baseDamage = ordnance.damage * falloff;
      // Armor reduction
      const effectiveDamage = baseDamage * (1 - target.armor);
      splashDamage.push({ target, damage: Math.max(0, effectiveDamage) });
    }
  }

  // Primary hit gets full damage (if direct hit)
  let damageDealt = 0;
  if (hitTarget) {
    // Direct hit: full damage, armor applies
    damageDealt = ordnance.damage * (1 - hitTarget.armor);
    // Remove from splash if already counted
    const splashIdx = splashDamage.findIndex((s) => s.target.id === hitTarget!.id);
    if (splashIdx >= 0) splashDamage.splice(splashIdx, 1);
  }

  return {
    hitTarget,
    impactPoint: impactPos,
    damageDealt: Math.max(0, damageDealt),
    splashDamage,
  };
}

// ============================================================================
// SCORING
// ============================================================================

export function calculateScore(
  result: ImpactResult,
  config: GameConfig,
  trajectory: TrajectoryPoint[],
  ordnance: OrdnanceItem
): number {
  let score = 0;

  if (result.hitTarget) {
    score += config.scoring.hitBonus;

    if (result.hitTarget.health - result.damageDealt <= 0) {
      score += config.scoring.killBonus;
      score += result.hitTarget.points;
    }

    // Accuracy bonus - based on how close to center
    const dist = distance3d(result.hitTarget.position, result.impactPoint);
    const accuracy = 1 - dist / result.hitTarget.size;
    score += Math.round(config.scoring.accuracyBonus * accuracy);
  }

  // Efficiency bonus - damage per kg of ordnance
  const efficiency = result.damageDealt / ordnance.weight;
  score += Math.round(config.scoring.efficiencyBonus * Math.min(1, efficiency / 20));

  return score;
}

// ============================================================================
// GAME STATE MACHINE
// ============================================================================

export function createInitialGameState(config: GameConfig = DEFAULT_GAME_CONFIG): GameState {
  const wind: Vector2 = {
    x: (Math.random() - 0.5) * config.windVariance * 2,
    y: (Math.random() - 0.5) * config.windVariance * 2,
  };

  const loadout = createLoadout(200);
  const available = getAvailableOrdnance(loadout);
  const activeOrdnance = available[0] || null;
  const remainingShots = available.reduce((sum, o) => sum + o.quantity, 0);

  return {
    phase: "aiming",
    round: 1,
    maxRounds: config.maxRounds,
    score: 0,
    highScore: 0,
    targets: spawnTargets(4, config.arenaSize, 1),
    activeOrdnance,
    remainingShots,
    loadout,
    aimState: {
      angle: 45,
      power: 50,
      velocity: 200,
      isAiming: false,
      azimuth: 0,
    },
    wind,
    gravity: config.baseGravity,
  };
}

export function startRound(state: GameState, config: GameConfig = DEFAULT_GAME_CONFIG): GameState {
  const targetCount = Math.floor(
    Math.random() * (config.targetsPerRound.max - config.targetsPerRound.min + 1) +
      config.targetsPerRound.min
  );

  // Update wind slightly each round
  const wind: Vector2 = {
    x: clamp(state.wind.x + (Math.random() - 0.5) * 2, -config.windVariance, config.windVariance),
    y: clamp(state.wind.y + (Math.random() - 0.5) * 2, -config.windVariance, config.windVariance),
  };

  const targets = spawnTargets(targetCount, config.arenaSize, state.round);
  
  // Ensure player has adequate ammo each round
  let currentLoadout = state.loadout;
  let availableOrdnance = getAvailableOrdnance(currentLoadout);
  let remainingShots = availableOrdnance.reduce((sum, o) => sum + o.quantity, 0);

  if (remainingShots < 4) {
    currentLoadout = createLoadout(200);
    availableOrdnance = getAvailableOrdnance(currentLoadout);
    remainingShots = availableOrdnance.reduce((sum, o) => sum + o.quantity, 0);
  }

  const activeOrdnance = (state.activeOrdnance && state.activeOrdnance.quantity > 0)
    ? currentLoadout.items.find(i => i.id === state.activeOrdnance?.id && i.quantity > 0) || availableOrdnance[0] || null
    : availableOrdnance[0] || null;

  return {
    ...state,
    phase: "aiming",
    targets,
    loadout: currentLoadout,
    activeOrdnance,
    remainingShots,
    wind,
    lastShot: undefined,
    aimState: {
      ...state.aimState,
      isAiming: false,
    },
  };
}

export function selectOrdnance(state: GameState, ordnanceId: string): GameState {
  const ordnance = state.loadout.items.find((i) => i.id === ordnanceId);
  if (!ordnance || ordnance.quantity <= 0) return state;

  return {
    ...state,
    activeOrdnance: ordnance,
  };
}

export function updateAim(
  state: GameState,
  angle: number,
  power: number,
  azimuth?: number
): GameState {
  const clampedAngle = clamp(angle, 5, 85);
  const clampedPower = clamp(power, 10, 100);
  const clampedAzimuth = clamp(azimuth ?? state.aimState.azimuth ?? 0, -60, 60);
  const velocity = lerp(50, 500, clampedPower / 100);

  return {
    ...state,
    aimState: {
      ...state.aimState,
      angle: clampedAngle,
      power: clampedPower,
      azimuth: clampedAzimuth,
      velocity,
      isAiming: true,
    },
  };
}

export function fireOrdnance(
  state: GameState,
  azimuth?: number,
  config: GameConfig = DEFAULT_GAME_CONFIG
): { newState: GameState; shotResult: ShotResult } {
  if (!state.activeOrdnance || state.remainingShots <= 0) {
    return { newState: state, shotResult: null as unknown as ShotResult };
  }

  const ordnance = state.activeOrdnance;
  const aim = state.aimState;
  const fireAzimuth = azimuth ?? aim.azimuth ?? 0;

  // Compute trajectory
  const trajectory = computeTrajectory({
    v0: ordnance.velocity * (aim.velocity / 300), // Scale by selected power
    angle: aim.angle,
    azimuth: fireAzimuth,
    gravity: state.gravity,
    dragCoeff: ordnance.dragCoeff,
    mass: ordnance.weight / 1000, // Convert to metric tons for physics
    wind: state.wind,
    dt: 0.01,
  });

  // Calculate impact
  const impact = calculateImpact(trajectory, state.targets, ordnance);

  // Apply damage
  const updatedTargets = state.targets.map((t) => {
    if (impact.hitTarget && t.id === impact.hitTarget.id) {
      const newHealth = Math.max(0, t.health - impact.damageDealt);
      return { ...t, health: newHealth, destroyed: newHealth <= 0, hit: true };
    } 
    const splash = impact.splashDamage.find((s) => s.target.id === t.id);
    if (splash) {
      const newHealth = Math.max(0, t.health - splash.damage);
      return { ...t, health: newHealth, destroyed: newHealth <= 0, hit: true };
    }
    return t;
  });

  // Calculate score
  const score = calculateScore(impact, config, trajectory, ordnance);

  // Consume ordnance
  const newLoadout = consumeOrdnance(state.loadout, ordnance.id);
  const newAvailable = getAvailableOrdnance(newLoadout);
  const newRemainingShots = newAvailable.reduce((sum, o) => sum + o.quantity, 0);

  // Keep current weapon if it still has ammo, otherwise switch to next available
  const currentStillAvailable = newAvailable.find((o) => o.id === ordnance.id);
  const nextActive = (currentStillAvailable && currentStillAvailable.quantity > 0)
    ? currentStillAvailable
    : (newAvailable[0] || null);

  const shotResult: ShotResult = {
    hit: impact.hitTarget !== null,
    targetId: impact.hitTarget?.id,
    impactPoint: impact.impactPoint,
    damageDealt: impact.damageDealt,
    targetDestroyed: impact.hitTarget !== null && impact.hitTarget.health - impact.damageDealt <= 0,
    pointsEarned: score,
    trajectory,
  };

  const newState: GameState = {
    ...state,
    phase: "firing",
    targets: updatedTargets,
    score: state.score + score,
    loadout: newLoadout,
    remainingShots: newRemainingShots,
    lastShot: shotResult,
    trajectoryPreview: undefined,
    activeOrdnance: nextActive,
  };

  return { newState, shotResult };
}

export function checkRoundEnd(state: GameState): GameState {
  const aliveTargets = state.targets.filter((t) => !t.destroyed);
  const hasShots = state.remainingShots > 0;

  if (aliveTargets.length === 0) {
    // All targets destroyed - round victory
    return {
      ...state,
      phase: "roundEnd",
      round: state.round + 1,
    };
  }

  if (!hasShots) {
    // Out of ammo - round ends
    return {
      ...state,
      phase: "roundEnd",
      round: state.round + 1,
    };
  }

  // Combat continues - return to aiming!
  return {
    ...state,
    phase: "aiming",
  };
}

export function advanceRound(state: GameState, config: GameConfig = DEFAULT_GAME_CONFIG): GameState {
  if (state.round > config.maxRounds) {
    return {
      ...state,
      phase: "gameOver",
      highScore: Math.max(state.highScore, state.score),
    };
  }

  // Provide resupplied loadout for new round
  const freshLoadout = createLoadout(200);
  return startRound({ ...state, loadout: freshLoadout }, config);
}

export function computeTrajectoryPreview(
  state: GameState,
  azimuth?: number
): TrajectoryPoint[] | undefined {
  if (!state.activeOrdnance) return undefined;

  const ordnance = state.activeOrdnance;
  const aim = state.aimState;
  const previewAzimuth = azimuth ?? aim.azimuth ?? 0;

  return computeTrajectory({
    v0: ordnance.velocity * (aim.velocity / 300),
    angle: aim.angle,
    azimuth: previewAzimuth,
    gravity: state.gravity,
    dragCoeff: ordnance.dragCoeff,
    mass: ordnance.weight / 1000,
    wind: state.wind,
    dt: 0.02, // Lower res for preview
  });
}