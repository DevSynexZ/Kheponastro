
/**
 * Core Game Types - Top-Down Tactical Tank Combat & Legacy Compatibility
 */

export interface Vector2 {
  x: number;
  y: number;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

// ============================================================================
// TOP-DOWN ACTION TANK COMBAT TYPES
// ============================================================================

export type WeaponType = "cannon" | "dual" | "rapid" | "shotgun" | "rocket";

export interface WeaponInfo {
  id: WeaponType;
  name: string;
  damage: number;
  cooldown: number; // ms
  speed: number;
  radius: number;
  color: string;
  count: number;
  spread: number;
  icon: string;
  description: string;
  maxAmmo: number;
}

export interface PlayerTank {
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  bodyAngle: number;
  turretAngle: number;
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  weapon: WeaponType;
  weaponAmmo: number;
  lastShotTime: number;
  invulnerableTime: number;
}

export type EnemyUnitClass = "jet" | "tank";

export type EnemyType = "scout" | "medium" | "heavy" | "boss" | "panzer" | "heavy_tank";

export interface EnemyTank {
  id: string;
  unitClass?: EnemyUnitClass;
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  bodyAngle: number;
  turretAngle: number;
  type: EnemyType;
  health: number;
  maxHealth: number;
  size: number;
  color: string;
  shootCooldown: number;
  lastShotTime: number;
  hitFlashTime: number;
  points: number;
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  radius: number;
  color: string;
  isPlayer: boolean;
  isRocket?: boolean;
  life: number;
  maxLife: number;
  // Numerical methods integration
  trajectory?: import("./numericalMethods").RK4SystemResult;
  trajectoryIndex?: number;
}

export type PickupType = "health" | "shield" | "dual" | "rapid" | "shotgun" | "rocket";

export interface Pickup {
  id: string;
  x: number;
  y: number;
  type: PickupType;
  icon: string;
  name: string;
  life: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  vy: number;
}

export interface AnimatedExplosion {
  id: string;
  x: number;
  y: number;
  series: 1 | 2 | 3;
  frame: number;
  maxFrames: number;
  scale: number;
  fps: number;
  timeAcc: number;
  rotation: number;
  done: boolean;
}

export interface RadarSectorBlip {
  key: "main" | "right" | "bottom" | "diagonal";
  col: number;
  row: number;
  label?: string;
}

export interface RadarEntityBlip {
  /** Normalized 0..1 position inside [worldMinX..worldMaxX, worldMinY..worldMaxY] */
  nx: number;
  ny: number;
  type?: "player" | EnemyType;
  unitClass?: EnemyUnitClass;
  angle?: number;
}

export interface RadarState {
  sectors: RadarSectorBlip[];
  worldMinX: number;
  worldMaxX: number;
  worldMinY: number;
  worldMaxY: number;
  player: RadarEntityBlip;
  enemies: RadarEntityBlip[];
}

export interface GameHUDState {
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  score: number;
  highScore: number;
  wave: number;
  enemiesRemaining: number;
  weapon: WeaponType;
  weaponAmmo: number;
  isPaused: boolean;
  isGameOver: boolean;
  isWaveCleared: boolean;
  radar?: RadarState;
}

export const WEAPON_REGISTRY: Record<WeaponType, WeaponInfo> = {
  cannon: {
    id: "cannon",
    name: "75mm Cannon",
    damage: 45,
    cooldown: 280,
    speed: 14,
    radius: 4,
    color: "#38bdf8",
    count: 1,
    spread: 0,
    icon: "💣",
    description: "Standard balanced high-velocity tank cannon.",
    maxAmmo: -1,
  },
  dual: {
    id: "dual",
    name: "Twin Autocannon",
    damage: 32,
    cooldown: 200,
    speed: 15,
    radius: 3.5,
    color: "#10b981",
    count: 2,
    spread: 0.1,
    icon: "⚡",
    description: "Fires twin parallel high-explosive shells.",
    maxAmmo: 60,
  },
  rapid: {
    id: "rapid",
    name: "Vulcan Gatling",
    damage: 18,
    cooldown: 95,
    speed: 17,
    radius: 3,
    color: "#f59e0b",
    count: 1,
    spread: 0.08,
    icon: "🔥",
    description: "Extremely high rate-of-fire chain gun.",
    maxAmmo: 120,
  },
  shotgun: {
    id: "shotgun",
    name: "Heavy Flak Scatter",
    damage: 22,
    cooldown: 450,
    speed: 13,
    radius: 3.5,
    color: "#a855f7",
    count: 5,
    spread: 0.38,
    icon: "💥",
    description: "Fires a wide spread of 5 deadly shrapnel pellets.",
    maxAmmo: 35,
  },
  rocket: {
    id: "rocket",
    name: "Guided Missile",
    damage: 130,
    cooldown: 650,
    speed: 11,
    radius: 6,
    color: "#ef4444",
    count: 1,
    spread: 0,
    icon: "🚀",
    description: "High-yield explosive missile with large blast radius.",
    maxAmmo: 25,
  },
};

// ============================================================================
// LEGACY COMPATIBILITY MODELS (FOR RETROFIT / SHARED ACCESS)
// ============================================================================

export interface AimState {
  angle: number;
  power: number;
  velocity: number;
  isAiming: boolean;
  azimuth: number;
  aimStart?: Vector2;
  aimCurrent?: Vector2;
}

export type TargetType = "light" | "medium" | "heavy" | "command" | "supply";

export interface Target {
  id: string;
  position: Vector3;
  size: number;
  health: number;
  maxHealth: number;
  armor: number;
  type: TargetType;
  points: number;
  hit?: boolean;
  destroyed?: boolean;
}

export type OrdnanceType = "HE" | "AP" | "HEAT" | "SMOKE" | "ILLUM" | "CLUSTER";

export interface OrdnanceItem {
  id: string;
  name: string;
  type: OrdnanceType;
  weight: number;
  value: number;
  damage: number;
  radius: number;
  velocity: number;
  dragCoeff: number;
  description: string;
  icon: string;
  quantity: number;
}

export interface Loadout {
  items: OrdnanceItem[];
  totalWeight: number;
  capacity: number;
  maxCapacity: number;
}

export interface TrajectoryPoint {
  t: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  v: number;
}

export interface ShotResult {
  hit: boolean;
  targetId?: string;
  impactPoint: Vector3;
  damageDealt: number;
  targetDestroyed: boolean;
  pointsEarned: number;
  trajectory: TrajectoryPoint[];
}

export type GamePhase = "briefing" | "aiming" | "firing" | "impact" | "roundEnd" | "gameOver" | "paused";

export interface GameState {
  phase: GamePhase;
  round: number;
  maxRounds: number;
  score: number;
  highScore: number;
  targets: Target[];
  activeOrdnance: OrdnanceItem | null;
  remainingShots: number;
  loadout: Loadout;
  aimState: AimState;
  lastShot?: ShotResult;
  trajectoryPreview?: TrajectoryPoint[];
  wind: Vector2;
  gravity: number;
}

export interface GameConfig {
  maxRounds: number;
  targetsPerRound: { min: number; max: number };
  arenaSize: { width: number; depth: number; height: number };
  windVariance: number;
  baseGravity: number;
  scoring: {
    hitBonus: number;
    killBonus: number;
    accuracyBonus: number;
    efficiencyBonus: number;
  };
}

export const DEFAULT_GAME_CONFIG: GameConfig = {
  maxRounds: 5,
  targetsPerRound: { min: 3, max: 6 },
  arenaSize: { width: 800, depth: 800, height: 200 },
  windVariance: 5,
  baseGravity: 9.81,
  scoring: {
    hitBonus: 100,
    killBonus: 500,
    accuracyBonus: 200,
    efficiencyBonus: 150,
  },
};

export const ORDNANCE_DATABASE: OrdnanceItem[] = [
  {
    id: "he_105",
    name: "105mm HE",
    type: "HE",
    weight: 15,
    value: 50,
    damage: 200,
    radius: 15,
    velocity: 400,
    dragCoeff: 0.015,
    description: "Standard high explosive shell. Good splash damage.",
    icon: "💣",
    quantity: 0,
  },
  {
    id: "ap_105",
    name: "105mm AP",
    type: "AP",
    weight: 18,
    value: 60,
    damage: 350,
    radius: 3,
    velocity: 500,
    dragCoeff: 0.012,
    description: "Armor-piercing round. High penetration, low splash.",
    icon: "🎯",
    quantity: 0,
  },
  {
    id: "heat_105",
    name: "105mm HEAT",
    type: "HEAT",
    weight: 16,
    value: 70,
    damage: 500,
    radius: 5,
    velocity: 350,
    dragCoeff: 0.02,
    description: "Shaped charge. Defeats heavy armor at cost of velocity.",
    icon: "🔥",
    quantity: 0,
  },
  {
    id: "smoke_105",
    name: "105mm Smoke",
    type: "SMOKE",
    weight: 14,
    value: 20,
    damage: 0,
    radius: 30,
    velocity: 380,
    dragCoeff: 0.018,
    description: "Creates visual screen. No damage.",
    icon: "🌫️",
    quantity: 0,
  },
  {
    id: "illum_105",
    name: "105mm Illum",
    type: "ILLUM",
    weight: 13,
    value: 25,
    damage: 0,
    radius: 50,
    velocity: 300,
    dragCoeff: 0.022,
    description: "Parachute flare. Reveals targets in area.",
    icon: "✨",
    quantity: 0,
  },
  {
    id: "cluster_105",
    name: "105mm Cluster",
    type: "CLUSTER",
    weight: 20,
    value: 80,
    damage: 120,
    radius: 40,
    velocity: 380,
    dragCoeff: 0.018,
    description: "Disperses submunitions. Wide area, moderate damage.",
    icon: "💥",
    quantity: 0,
  },
];

export const TARGET_TEMPLATES: Record<TargetType, Omit<Target, "id" | "position">> = {
  light: {
    size: 5,
    health: 100,
    maxHealth: 100,
    armor: 0.1,
    type: "light",
    points: 100,
  },
  medium: {
    size: 8,
    health: 250,
    maxHealth: 250,
    armor: 0.3,
    type: "medium",
    points: 250,
  },
  heavy: {
    size: 12,
    health: 600,
    maxHealth: 600,
    armor: 0.6,
    type: "heavy",
    points: 500,
  },
  command: {
    size: 10,
    health: 300,
    maxHealth: 300,
    armor: 0.4,
    type: "command",
    points: 750,
  },
  supply: {
    size: 15,
    health: 150,
    maxHealth: 150,
    armor: 0.05,
    type: "supply",
    points: 300,
  },
};