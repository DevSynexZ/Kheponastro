
/**
 * Kheponastro Top-Down Tactical Tank Combat Engine
 * Real-time movable player tank (WASD), movable enemy tanks & jets with AI,
 * dynamic projectiles, pickups, waves, and explosive visual feedback.
 */

import {
  PlayerTank,
  EnemyTank,
  EnemyType,
  EnemyUnitClass,
  Projectile,
  Pickup,
  PickupType,
  Particle,
  FloatingText,
  AnimatedExplosion,
  WeaponType,
  WEAPON_REGISTRY,
  GameHUDState,
  RadarState,
} from "./gameTypes";

import {
  playPlayerShoot,
  playEnemyShoot,
  playHitSound,
  playEnemyDie,
  playExplosionImpact,
  playPickupSound,
} from "./audio";

import {
  initSpriteManager,
  drawBackground,
  drawPlayerSprite,
  drawEnemySprite,
  drawProjectileSprite,
  createAnimatedExplosion,
  updateAndDrawExplosions,
  ActiveSector,
  SectorKey,
} from "./gameSprites";

import {
  rk4Projectile,
  calculateInterceptAngle,
  modifiedEulerStep,
  applyDrag,
  knapsackOrdnanceSelector,
  RK4SystemResult,
} from "./numericalMethods";

export interface TopDownEngineCallbacks {
  onHUDUpdate: (hud: GameHUDState) => void;
  onWaveClear: (wave: number, score: number) => void;
  onGameOver: (finalScore: number, highScore: number, wave: number) => void;
}

export interface TopDownEngine {
  start: () => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  togglePause: () => void;
  isPaused: () => boolean;
  restart: () => void;
  nextWave: () => void;
  setKeys: (keys: Record<string, boolean>) => void;
  setKey: (key: string, isDown: boolean) => void;
  setMousePos: (x: number, y: number) => void;
  setMouseDown: (down: boolean) => void;
  selectWeapon: (weapon: WeaponType) => void;
  triggerFire: () => void;
  resize: () => void;
}

const SECTOR_WIDTH = 1600;
const SECTOR_HEIGHT = 1000;
const EXPANSION_EDGE_THRESHOLD = 180;

const SECTOR_META: Record<SectorKey, { col: number; row: number; label: string }> = {
  main: { col: 0, row: 0, label: "SECTOR 01 // MAIN YARD" },
  right: { col: 1, row: 0, label: "SECTOR 02 // EAST FLANK" },
  bottom: { col: 0, row: 1, label: "SECTOR 03 // SOUTH DEPOT" },
  diagonal: { col: 1, row: 1, label: "SECTOR 04 // SOUTHEAST FOUNDRY" },
};

export function createTopDownEngine(
  canvas: HTMLCanvasElement,
  callbacks: TopDownEngineCallbacks
): TopDownEngine {
  const ctx = canvas.getContext("2d")!;

  function getViewportDimensions() {
    const rect = canvas.getBoundingClientRect();
    const w =
      rect.width > 50
        ? rect.width
        : typeof window !== "undefined"
        ? window.innerWidth
        : 1200;
    const h =
      rect.height > 50
        ? rect.height
        : typeof window !== "undefined"
        ? window.innerHeight
        : 800;
    return { w, h };
  }

  // Viewport & Dynamic World Dimensions
  const initialDim = getViewportDimensions();
  let viewportWidth = initialDim.w;
  let viewportHeight = initialDim.h;

  let activeSectors: ActiveSector[] = [
    { col: 0, row: 0, key: "main", label: SECTOR_META.main.label },
  ];

  let worldMinX = 0;
  let worldMaxX = SECTOR_WIDTH;
  let worldMinY = 0;
  let worldMaxY = SECTOR_HEIGHT;

  const camera = {
    x: 0,
    y: 0,
  };

  function recalculateWorldBounds() {
    let minCol = 0;
    let maxCol = 0;
    let minRow = 0;
    let maxRow = 0;

    for (const s of activeSectors) {
      if (s.col < minCol) minCol = s.col;
      if (s.col > maxCol) maxCol = s.col;
      if (s.row < minRow) minRow = s.row;
      if (s.row > maxRow) maxRow = s.row;
    }

    worldMinX = minCol * SECTOR_WIDTH;
    worldMaxX = (maxCol + 1) * SECTOR_WIDTH;
    worldMinY = minRow * SECTOR_HEIGHT;
    worldMaxY = (maxRow + 1) * SECTOR_HEIGHT;
  }

  function hasSector(key: SectorKey): boolean {
    return activeSectors.some((s) => s.key === key);
  }

  function unlockSector(key: SectorKey) {
    if (hasSector(key)) return;
    const meta = SECTOR_META[key];
    activeSectors.push({
      col: meta.col,
      row: meta.row,
      key,
      label: meta.label,
    });
    recalculateWorldBounds();

    const centerX = meta.col * SECTOR_WIDTH + SECTOR_WIDTH / 2;
    const centerY = meta.row * SECTOR_HEIGHT + SECTOR_HEIGHT / 2;
    addFloatingText(centerX, centerY, `EXPANDED: ${meta.label}`, "#22d3ee");

    const sectorEnemyType: EnemyType =
      key === "diagonal" ? "heavy_tank" : key === "right" ? "panzer" : "medium";

    spawnEnemyInRect(
      meta.col * SECTOR_WIDTH + 120,
      meta.row * SECTOR_HEIGHT + 120,
      (meta.col + 1) * SECTOR_WIDTH - 120,
      (meta.row + 1) * SECTOR_HEIGHT - 120,
      sectorEnemyType
    );
  }

  function updateWorldExpansion() {
    if (isGameOver || isPaused) return;

    const nearRight = player.x >= worldMaxX - EXPANSION_EDGE_THRESHOLD;
    const nearBottom = player.y >= worldMaxY - EXPANSION_EDGE_THRESHOLD;

    if (nearRight && !hasSector("right")) {
      unlockSector("right");
    }

    if (nearBottom && !hasSector("bottom")) {
      unlockSector("bottom");
    }

    const inDiagonalApproach =
      (nearRight && nearBottom) ||
      (player.x >= SECTOR_WIDTH * 0.75 && player.y >= SECTOR_HEIGHT * 0.75);

    if (
      hasSector("right") &&
      hasSector("bottom") &&
      !hasSector("diagonal") &&
      inDiagonalApproach
    ) {
      unlockSector("diagonal");
    }
  }

  function updateCamera(delta: number) {
    const targetX = player.x - viewportWidth / 2;
    const targetY = player.y - viewportHeight / 2;

    const minCamX = worldMinX;
    const maxCamX = Math.max(worldMinX, worldMaxX - viewportWidth);
    const minCamY = worldMinY;
    const maxCamY = Math.max(worldMinY, worldMaxY - viewportHeight);

    const clampedTargetX = Math.max(minCamX, Math.min(maxCamX, targetX));
    const clampedTargetY = Math.max(minCamY, Math.min(maxCamY, targetY));

    const smooth = Math.min(1, delta * 8);
    camera.x += (clampedTargetX - camera.x) * smooth;
    camera.y += (clampedTargetY - camera.y) * smooth;
  }

  function snapCameraToPlayer() {
    const minCamX = worldMinX;
    const maxCamX = Math.max(worldMinX, worldMaxX - viewportWidth);
    const minCamY = worldMinY;
    const maxCamY = Math.max(worldMinY, worldMaxY - viewportHeight);

    camera.x = Math.max(minCamX, Math.min(maxCamX, player.x - viewportWidth / 2));
    camera.y = Math.max(minCamY, Math.min(maxCamY, player.y - viewportHeight / 2));
  }

  // Input State (mouseX, mouseY are screen-space canvas coordinates)
  const keys: Record<string, boolean> = {};
  let mouseX = viewportWidth / 2;
  let mouseY = viewportHeight / 2;
  let isMouseDown = false;

  // Game Progression State
  let wave = 1;
  let score = 0;
  let highScore = 0;
  try {
    const saved = localStorage.getItem("kheponastro_high_score");
    if (saved) highScore = parseInt(saved, 10) || 0;
  } catch {}

  let isPaused = false;
  let isGameOver = false;
  let isWaveCleared = false;
  let animationId: number | null = null;
  let lastTime = performance.now();
  let screenShake = 0;

  // Track trails left by tanks
  const treadMarks: Array<{
    x: number;
    y: number;
    angle: number;
    alpha: number;
    width: number;
  }> = [];

  // Player State (in world coordinates)
  const player: PlayerTank = {
    x: SECTOR_WIDTH / 2,
    y: SECTOR_HEIGHT / 2 + 80,
    vx: 0,
    vy: 0,
    speed: 5.2,
    bodyAngle: -Math.PI / 2,
    turretAngle: -Math.PI / 2,
    health: 100,
    maxHealth: 100,
    shield: 50,
    maxShield: 50,
    weapon: "cannon",
    weaponAmmo: -1,
    lastShotTime: 0,
    invulnerableTime: 0,
  };

  // Game Entities
  let enemies: EnemyTank[] = [];
  const projectiles: Projectile[] = [];
  const pickups: Pickup[] = [];
  const particles: Particle[] = [];
  const floatingTexts: FloatingText[] = [];
  const animatedExplosions: AnimatedExplosion[] = [];
  const spriteManager = initSpriteManager();

  function resizeCanvas() {
    const { w, h } = getViewportDimensions();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    viewportWidth = w;
    viewportHeight = h;
    snapCameraToPlayer();
  }

  // Generate Unique ID
  let nextId = 1;
  function getId(): string {
    return `e_${nextId++}_${Date.now()}`;
  }

  function buildRadarState(): RadarState {
    const spanX = Math.max(1, worldMaxX - worldMinX);
    const spanY = Math.max(1, worldMaxY - worldMinY);

    return {
      sectors: activeSectors.map((s) => ({
        key: s.key,
        col: s.col,
        row: s.row,
        label: s.label,
      })),
      worldMinX,
      worldMaxX,
      worldMinY,
      worldMaxY,
      player: {
        nx: (player.x - worldMinX) / spanX,
        ny: (player.y - worldMinY) / spanY,
        type: "player",
        angle: player.bodyAngle,
      },
      enemies: enemies.map((e) => ({
        nx: (e.x - worldMinX) / spanX,
        ny: (e.y - worldMinY) / spanY,
        type: e.type,
        unitClass: e.unitClass,
        angle: e.bodyAngle,
      })),
    };
  }

  // Notify React HUD with the single source of truth from the engine
  function notifyHUD() {
    callbacks.onHUDUpdate({
      health: player.health,
      maxHealth: player.maxHealth,
      shield: player.shield,
      maxShield: player.maxShield,
      score,
      highScore,
      wave,
      enemiesRemaining: enemies.length,
      weapon: player.weapon,
      weaponAmmo: player.weaponAmmo,
      isPaused,
      isGameOver,
      isWaveCleared,
      radar: buildRadarState(),
    });
  }

  function pauseGame() {
    isPaused = true;
    notifyHUD();
  }

  function resumeGame() {
    isPaused = false;
    lastTime = performance.now();
    notifyHUD();
  }

  function togglePauseGame() {
    if (isPaused) {
      resumeGame();
    } else {
      pauseGame();
    }
  }

  function spawnEnemyInRect(
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    type: EnemyType
  ) {
    const safeMinX = Math.min(minX, maxX - 40);
    const safeMaxX = Math.max(safeMinX + 40, maxX);
    const safeMinY = Math.min(minY, maxY - 40);
    const safeMaxY = Math.max(safeMinY + 40, maxY);

    let x = safeMinX + Math.random() * (safeMaxX - safeMinX);
    let y = safeMinY + Math.random() * (safeMaxY - safeMinY);

    if (Math.hypot(x - player.x, y - player.y) < 220) {
      x = safeMinX + ((x - safeMinX + (safeMaxX - safeMinX) * 0.5) % (safeMaxX - safeMinX));
      y = safeMinY + ((y - safeMinY + (safeMaxY - safeMinY) * 0.5) % (safeMaxY - safeMinY));
    }

    const enemyConfig: Record<
      EnemyType,
      {
        unitClass: EnemyUnitClass;
        speed: number;
        hp: number;
        size: number;
        color: string;
        cooldown: number;
        pts: number;
      }
    > = {
      scout: { unitClass: "jet", speed: 2.4, hp: 35, size: 15, color: "#10b981", cooldown: 2600, pts: 100 },
      medium: { unitClass: "jet", speed: 1.8, hp: 75, size: 19, color: "#06b6d4", cooldown: 2400, pts: 250 },
      heavy: { unitClass: "jet", speed: 1.35, hp: 160, size: 24, color: "#f59e0b", cooldown: 2100, pts: 500 },
      boss: { unitClass: "jet", speed: 0.95, hp: 420, size: 36, color: "#ef4444", cooldown: 1600, pts: 2000 },
      panzer: { unitClass: "tank", speed: 1.55, hp: 110, size: 22, color: "#84cc16", cooldown: 2300, pts: 350 },
      heavy_tank: { unitClass: "tank", speed: 1.05, hp: 240, size: 28, color: "#f97316", cooldown: 2000, pts: 700 },
    };

    const ec = enemyConfig[type];

    enemies.push({
      id: getId(),
      unitClass: ec.unitClass,
      x,
      y,
      vx: 0,
      vy: 0,
      speed: ec.speed * (0.95 + Math.random() * 0.1),
      bodyAngle: Math.random() * Math.PI * 2,
      turretAngle: 0,
      type,
      health: ec.hp,
      maxHealth: ec.hp,
      size: ec.size,
      color: ec.color,
      shootCooldown: ec.cooldown,
      lastShotTime: performance.now() + Math.random() * 1200,
      hitFlashTime: 0,
      points: ec.pts,
    });
  }

  // Spawn Enemy Wave across active world bounds (mix of medium/heavy jets and panzer/heavy_tank tanks)
  function spawnWave(waveNumber: number) {
    enemies = [];
    isWaveCleared = false;
    const isBossWave = waveNumber % 5 === 0;

    const count = isBossWave
      ? 4
      : Math.min(7, 3 + Math.floor(waveNumber * 0.8));

    const margin = 70;
    for (let i = 0; i < count; i++) {
      let type: EnemyType = "panzer";

      if (isBossWave && i === 0) {
        type = "boss";
      } else if (i % 4 === 0) {
        type = "medium"; // jet
      } else if (i % 4 === 1) {
        type = "panzer"; // tank
      } else if (i % 4 === 2) {
        type = waveNumber >= 2 ? "heavy" : "medium"; // jet
      } else {
        type = waveNumber >= 2 ? "heavy_tank" : "panzer"; // tank
      }

      spawnEnemyInRect(
        worldMinX + margin,
        worldMinY + margin,
        worldMaxX - margin,
        worldMaxY - margin,
        type
      );
    }

    addFloatingText(
      player.x,
      player.y - 70,
      `WAVE ${waveNumber} START!`,
      "#38bdf8"
    );
  }

  // Spawn visual particles
  function spawnParticles(
    x: number,
    y: number,
    color: string,
    count: number,
    speedMultiplier: number = 1
  ) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = (Math.random() * 4 + 1.5) * speedMultiplier;
      particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        color,
        size: Math.random() * 4 + 2,
        life: 0,
        maxLife: Math.random() * 0.5 + 0.3,
      });
    }
  }

  // Floating Combat Damage Numbers
  function addFloatingText(x: number, y: number, text: string, color: string) {
    floatingTexts.push({
      id: getId(),
      x,
      y,
      text,
      color,
      life: 0,
      vy: -1.4,
    });
  }

  // Trigger player death & game over
  function killPlayer(reason: string = "HULL DESTROYED") {
    if (isGameOver) return;
    player.health = 0;
    player.shield = 0;
    isGameOver = true;
    playExplosionImpact(2.0);
    screenShake = 30;
    spawnParticles(player.x, player.y, "#ef4444", 60, 2.0);
    spawnParticles(player.x, player.y, "#f59e0b", 40, 1.8);
    spawnParticles(player.x, player.y, "#ffffff", 25, 2.2);
    animatedExplosions.push(createAnimatedExplosion(player.x, player.y, 3, 2.5));
    addFloatingText(player.x, player.y - 30, reason, "#ef4444");

    if (score > highScore) {
      highScore = score;
      try {
        localStorage.setItem("kheponastro_high_score", highScore.toString());
      } catch {}
    }

    callbacks.onGameOver(score, highScore, wave);
    notifyHUD();
  }

  // Drop random pickup from destroyed enemy
  function dropPickup(x: number, y: number) {
    if (Math.random() < 0.35) return;

    const roll = Math.random();
    let type: PickupType = "health";
    let icon = "💚";
    let name = "+35 Health";

    if (roll < 0.28) {
      type = "health";
      icon = "💚";
      name = "+35 Health";
    } else if (roll < 0.48) {
      type = "shield";
      icon = "🛡️";
      name = "+50 Shield";
    } else if (roll < 0.65) {
      type = "dual";
      icon = "⚡";
      name = "Twin Autocannon";
    } else if (roll < 0.82) {
      type = "rapid";
      icon = "🔥";
      name = "Vulcan Gatling";
    } else if (roll < 0.93) {
      type = "shotgun";
      icon = "💥";
      name = "Flak Scatter";
    } else {
      type = "rocket";
      icon = "🚀";
      name = "Guided Missiles";
    }

    pickups.push({
      id: getId(),
      x,
      y,
      type,
      icon,
      name,
      life: 14,
    });
  }

  // Player Shoot
  function shootPlayer() {
    if (isPaused || isGameOver) return;
    const now = performance.now();
    const wInfo = WEAPON_REGISTRY[player.weapon];

    if (now - player.lastShotTime < wInfo.cooldown) return;
    player.lastShotTime = now;

    if (player.weaponAmmo > 0) {
      player.weaponAmmo--;
      if (player.weaponAmmo <= 0) {
        player.weapon = "cannon";
        player.weaponAmmo = -1;
        addFloatingText(player.x, player.y - 24, "DEFAULT CANNON", "#38bdf8");
      }
    }

    playPlayerShoot(player.weapon);

    const barrelLength = 24;
    const baseAngle = player.turretAngle;

    const isRocket = player.weapon === "rocket";
    let rocketTrajectory: RK4SystemResult | null = null;
    if (isRocket) {
      rocketTrajectory = computeBallisticTrajectory(
        wInfo.speed,
        (baseAngle * 180) / Math.PI,
        0.015,
        1.0,
        9.81 * 0.1,
        0,
        0
      );
      addFloatingText(player.x, player.y - 30, "🚀 RK4 BALLISTIC", "#ef4444");
    }

    if (wInfo.count === 1) {
      const spreadAngle = (Math.random() - 0.5) * wInfo.spread;
      const angle = baseAngle + spreadAngle;
      const vx = Math.cos(angle) * wInfo.speed;
      const vy = Math.sin(angle) * wInfo.speed;

      projectiles.push({
        id: getId(),
        x: player.x + Math.cos(baseAngle) * barrelLength,
        y: player.y + Math.sin(baseAngle) * barrelLength,
        vx,
        vy,
        damage: wInfo.damage,
        radius: wInfo.radius,
        color: wInfo.color,
        isPlayer: true,
        isRocket,
        life: 0,
        maxLife: isRocket ? 5.0 : 2.2,
        trajectory: rocketTrajectory,
        trajectoryIndex: 0,
      } as Projectile & { trajectory?: RK4SystemResult; trajectoryIndex?: number });
    } else if (wInfo.count === 2) {
      const offset = 6;
      const perpAngle = baseAngle + Math.PI / 2;
      for (const sign of [-1, 1]) {
        const ox = Math.cos(perpAngle) * offset * sign;
        const oy = Math.sin(perpAngle) * offset * sign;
        projectiles.push({
          id: getId(),
          x: player.x + Math.cos(baseAngle) * barrelLength + ox,
          y: player.y + Math.sin(baseAngle) * barrelLength + oy,
          vx: Math.cos(baseAngle) * wInfo.speed,
          vy: Math.sin(baseAngle) * wInfo.speed,
          damage: wInfo.damage,
          radius: wInfo.radius,
          color: wInfo.color,
          isPlayer: true,
          life: 0,
          maxLife: 2.2,
        });
      }
    } else if (wInfo.count > 2) {
      for (let i = 0; i < wInfo.count; i++) {
        const spreadOffset = (i / (wInfo.count - 1) - 0.5) * wInfo.spread;
        const angle = baseAngle + spreadOffset + (Math.random() - 0.5) * 0.05;
        const spd = wInfo.speed * (0.9 + Math.random() * 0.2);
        projectiles.push({
          id: getId(),
          x: player.x + Math.cos(baseAngle) * barrelLength,
          y: player.y + Math.sin(baseAngle) * barrelLength,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          damage: wInfo.damage,
          radius: wInfo.radius,
          color: wInfo.color,
          isPlayer: true,
          life: 0,
          maxLife: 1.6,
        });
      }
    }

    player.vx -= Math.cos(baseAngle) * 0.8;
    player.vy -= Math.sin(baseAngle) * 0.8;
  }

  // Enemy Shoot
  function shootEnemy(enemy: EnemyTank) {
    playEnemyShoot();
    const barrelLength = enemy.size + 4;

    const speed = enemy.type === "scout" ? 5.8 : enemy.type === "heavy_tank" ? 5.0 : 5.4;
    const dmg = enemy.type === "heavy_tank" || enemy.type === "heavy" ? 22 : enemy.type === "boss" ? 28 : 12;

    let angle = enemy.turretAngle;
    const isHeavyOrBoss =
      enemy.type === "heavy" || enemy.type === "boss" || enemy.type === "heavy_tank";

    if (isHeavyOrBoss) {
      const interceptAngle = calculateEnemyInterceptAngle(
        enemy,
        player.x,
        player.y,
        player.vx,
        player.vy,
        speed,
        false
      );
      angle = interceptAngle;
      enemy.turretAngle = interceptAngle;
      addFloatingText(enemy.x, enemy.y - 20, "🎯 NEWTON-RAPHSON", "#f59e0b");
    }

    projectiles.push({
      id: getId(),
      x: enemy.x + Math.cos(angle) * barrelLength,
      y: enemy.y + Math.sin(angle) * barrelLength,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      damage: dmg,
      radius: isHeavyOrBoss ? 5 : 3.5,
      color: "#ef4444",
      isPlayer: false,
      life: 0,
      maxLife: 2.5,
    });
  }

  // ============================================================================
  // NUMERICAL METHODS INTEGRATION
  // ============================================================================

  const trajectoryCache = new Map<string, RK4SystemResult>();

  function getTrajectoryCacheKey(
    v0: number,
    angle: number,
    dragCoeff: number,
    mass: number
  ): string {
    return `${v0.toFixed(1)}_${angle.toFixed(1)}_${dragCoeff.toFixed(3)}_${mass.toFixed(1)}`;
  }

  function computeBallisticTrajectory(
    v0: number,
    angleDeg: number,
    dragCoeff: number = 0.02,
    mass: number = 1.0,
    gravity: number = 9.81,
    windX: number = 0,
    windY: number = 0
  ): RK4SystemResult {
    const safeAngle = Math.max(1, Math.min(89, Math.abs(angleDeg) % 90 || 45));
    const key = getTrajectoryCacheKey(v0, safeAngle, dragCoeff, mass);
    const cached = trajectoryCache.get(key);
    if (cached) return cached;

    const result = rk4Projectile({
      v0,
      angle: safeAngle,
      g: gravity,
      dragCoeff,
      mass,
      dt: 0.01,
      maxTime: 10.0,
      windX,
      windY,
    });

    if (trajectoryCache.size > 100) {
      const firstKey = trajectoryCache.keys().next().value;
      if (firstKey) trajectoryCache.delete(firstKey);
    }
    trajectoryCache.set(key, result);
    return result;
  }

  function calculateEnemyInterceptAngle(
    enemy: EnemyTank,
    targetX: number,
    targetY: number,
    targetVx: number,
    targetVy: number,
    projectileSpeed: number,
    isRocket: boolean
  ): number {
    const dragCoeff = isRocket ? 0.015 : 0.0;
    const gravity = 0.0;

    try {
      const intercept = calculateInterceptAngle(
        { x: enemy.x, y: enemy.y },
        { x: targetX, y: targetY },
        { x: targetVx, y: targetVy },
        projectileSpeed,
        gravity,
        dragCoeff,
        5.0
      );

      if (intercept.feasible) {
        const angleRad = (intercept.angle * Math.PI) / 180;
        const variation = (Math.random() - 0.5) * 0.05;
        return angleRad + variation;
      }
    } catch {}

    const dx = targetX - enemy.x;
    const dy = targetY - enemy.y;
    const dist = Math.hypot(dx, dy);
    const timeToTarget = dist / projectileSpeed;
    const leadX = targetX + targetVx * timeToTarget;
    const leadY = targetY + targetVy * timeToTarget;
    return Math.atan2(leadY - enemy.y, leadX - enemy.x);
  }

  function updateProjectilePhysics(projectile: Projectile, delta: number): void {
    if (projectile.isRocket) {
      const dragResult = applyDrag(projectile.vx, projectile.vy, 0.015, 1.0, delta);
      projectile.vx = dragResult.vx;
      projectile.vy = dragResult.vy;
      projectile.x += projectile.vx * delta * 60;
      projectile.y += projectile.vy * delta * 60;
    } else {
      if (projectile.vx !== 0 || projectile.vy !== 0) {
        const dragResult = applyDrag(projectile.vx, projectile.vy, 0.001, 1.0, delta);
        projectile.vx = dragResult.vx;
        projectile.vy = dragResult.vy;
      }
      projectile.x += projectile.vx * delta * 60;
      projectile.y += projectile.vy * delta * 60;
    }
    projectile.life += delta;
  }

  function updateEnemyPhysics(
    enemy: EnemyTank,
    targetX: number,
    targetY: number,
    delta: number,
    allEnemies: EnemyTank[]
  ): void {
    const dt = delta * 60;
    if (dt <= 0) return;

    const dx = targetX - enemy.x;
    const dy = targetY - enemy.y;
    const dist = Math.hypot(dx, dy);

    let desiredVx = 0;
    let desiredVy = 0;
    if (dist > 1.0) {
      desiredVx = (dx / dist) * enemy.speed;
      desiredVy = (dy / dist) * enemy.speed;
    }

    const kp = 0.18;
    const forceX = (desiredVx - enemy.vx) * kp;
    const forceY = (desiredVy - enemy.vy) * kp;

    let repForceX = 0;
    let repForceY = 0;
    for (let j = 0; j < allEnemies.length; j++) {
      const other = allEnemies[j];
      if (other.id === enemy.id) continue;
      const sepX = enemy.x - other.x;
      const sepY = enemy.y - other.y;
      const sepDist = Math.hypot(sepX, sepY);
      const minDist = enemy.size + other.size + 4;
      if (sepDist < minDist && sepDist > 0) {
        const push = ((minDist - sepDist) / minDist) * 1.5;
        repForceX += (sepX / sepDist) * push;
        repForceY += (sepY / sepDist) * push;
      }
    }

    const newState = modifiedEulerStep(
      { x: enemy.x, y: enemy.y, vx: enemy.vx, vy: enemy.vy },
      1.0,
      [
        { x: forceX, y: forceY },
        { x: repForceX, y: repForceY },
      ],
      dt
    );

    enemy.x = newState.x;
    enemy.y = newState.y;
    enemy.vx = newState.vx;
    enemy.vy = newState.vy;

    if (Math.hypot(enemy.vx, enemy.vy) > 0.05) {
      enemy.bodyAngle = Math.atan2(enemy.vy, enemy.vx);
    }
  }

  function computeOptimalLoadout(
    availableWeapons: Array<{ id: string; weight: number; value: number; damage: number }>,
    capacity: number
  ): Array<{ id: string; weight: number; value: number; damage: number }> {
    const weights = availableWeapons.map((w) => w.weight);
    const values = availableWeapons.map((w) => w.value);
    const result = knapsackOrdnanceSelector(weights, values, capacity);
    return result.selectedItems.map((idx) => availableWeapons[idx]);
  }

  // Main Update Cycle
  function update(delta: number) {
    if (isPaused || isGameOver) {
      notifyHUD();
      return;
    }

    const now = performance.now();

    // 1. Player Input & Movement
    let moveX = 0;
    let moveY = 0;
    if (keys["w"] || keys["W"] || keys["KeyW"] || keys["ArrowUp"]) moveY -= 1;
    if (keys["s"] || keys["S"] || keys["KeyS"] || keys["ArrowDown"]) moveY += 1;
    if (keys["a"] || keys["A"] || keys["KeyA"] || keys["ArrowLeft"]) moveX -= 1;
    if (keys["d"] || keys["D"] || keys["KeyD"] || keys["ArrowRight"]) moveX += 1;

    if (moveX !== 0 || moveY !== 0) {
      const len = Math.hypot(moveX, moveY);
      moveX /= len;
      moveY /= len;

      player.vx = moveX * player.speed;
      player.vy = moveY * player.speed;
      player.bodyAngle = Math.atan2(moveY, moveX);

      if (Math.random() < 0.3) {
        treadMarks.push({
          x: player.x,
          y: player.y,
          angle: player.bodyAngle,
          alpha: 0.35,
          width: 18,
        });
        if (treadMarks.length > 140) treadMarks.shift();
      }
    } else {
      player.vx *= 0.7;
      player.vy *= 0.7;
      if (Math.abs(player.vx) < 0.05) player.vx = 0;
      if (Math.abs(player.vy) < 0.05) player.vy = 0;
    }

    player.x += player.vx;
    player.y += player.vy;

    updateWorldExpansion();

    const pMargin = 22;
    player.x = Math.max(worldMinX + pMargin, Math.min(worldMaxX - pMargin, player.x));
    player.y = Math.max(worldMinY + pMargin, Math.min(worldMaxY - pMargin, player.y));

    const worldMouseX = mouseX + camera.x;
    const worldMouseY = mouseY + camera.y;
    player.turretAngle = Math.atan2(worldMouseY - player.y, worldMouseX - player.x);

    if (isMouseDown || keys[" "] || keys["Space"]) {
      shootPlayer();
    }

    if (player.invulnerableTime > 0) {
      player.invulnerableTime = Math.max(0, player.invulnerableTime - delta);
    }

    // 2. Enemy AI & Movement
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];

      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const dist = Math.hypot(dx, dy);
      const angleToPlayer = Math.atan2(dy, dx);

      e.turretAngle = angleToPlayer;

      let targetX = player.x;
      let targetY = player.y;

      if (e.type === "scout" || e.type === "medium") {
        const circleAngle = angleToPlayer + Math.PI / 2;
        targetX = player.x + Math.cos(circleAngle) * 160;
        targetY = player.y + Math.sin(circleAngle) * 160;
      } else if (e.type === "heavy" || e.type === "boss" || e.type === "heavy_tank") {
        if (dist < 220) {
          targetX = e.x - Math.cos(angleToPlayer) * 50;
          targetY = e.y - Math.sin(angleToPlayer) * 50;
        }
      }

      updateEnemyPhysics(e, targetX, targetY, delta, enemies);

      const eMargin = e.size + 8;
      e.x = Math.max(worldMinX + eMargin, Math.min(worldMaxX - eMargin, e.x));
      e.y = Math.max(worldMinY + eMargin, Math.min(worldMaxY - eMargin, e.y));
      e.bodyAngle = Math.atan2(e.vy, e.vx);

      const playerRadius = 20;
      const currentDist = Math.hypot(player.x - e.x, player.y - e.y);
      if (!isGameOver && currentDist < playerRadius + e.size) {
        animatedExplosions.push(createAnimatedExplosion(e.x, e.y, 2, 2.0));
        spawnParticles(e.x, e.y, "#ef4444", 35, 1.8);
        e.health = 0;
        killPlayer("MID-AIR COLLISION!");
        break;
      }

      if (e.hitFlashTime > 0) {
        e.hitFlashTime = Math.max(0, e.hitFlashTime - delta);
      }

      if (dist < 650 && now - e.lastShotTime > e.shootCooldown) {
        e.lastShotTime = now + (Math.random() - 0.5) * 400;
        shootEnemy(e);
      }
    }

    // 3. Projectile Updates & Collision Detection
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];

      if (p.isRocket) {
        updateProjectilePhysics(p, delta);

        if (Math.random() < 0.6) {
          particles.push({
            x: p.x,
            y: p.y,
            vx: -p.vx * 0.2 + (Math.random() - 0.5),
            vy: -p.vy * 0.2 + (Math.random() - 0.5),
            color: "#94a3b8",
            size: 3,
            life: 0,
            maxLife: 0.35,
          });
        }
      } else {
        const dragResult = applyDrag(p.vx, p.vy, 0.001, 1.0, delta);
        p.vx = dragResult.vx;
        p.vy = dragResult.vy;
        p.x += p.vx;
        p.y += p.vy;
        p.life += delta;
      }

      if (
        p.x < worldMinX ||
        p.x > worldMaxX ||
        p.y < worldMinY ||
        p.y > worldMaxY ||
        p.life >= p.maxLife
      ) {
        projectiles.splice(i, 1);
        continue;
      }

      if (p.isPlayer) {
        let hitEnemy = false;
        for (let j = enemies.length - 1; j >= 0; j--) {
          const e = enemies[j];
          const dist = Math.hypot(p.x - e.x, p.y - e.y);

          if (dist < e.size + p.radius) {
            hitEnemy = true;
            playHitSound();

            if (p.isRocket) {
              screenShake = 12;
              playExplosionImpact(1.2);
              spawnParticles(p.x, p.y, "#ef4444", 25, 1.4);
              animatedExplosions.push(createAnimatedExplosion(p.x, p.y, 1, 1.4));
              for (const nearby of enemies) {
                const splashDist = Math.hypot(p.x - nearby.x, p.y - nearby.y);
                if (splashDist < 90) {
                  const splashDmg = Math.round(p.damage * (1 - splashDist / 90));
                  nearby.health -= splashDmg;
                  nearby.hitFlashTime = 0.15;
                  addFloatingText(nearby.x, nearby.y - 12, `-${splashDmg}`, "#f87171");
                }
              }
            } else {
              e.health -= p.damage;
              e.hitFlashTime = 0.12;
              addFloatingText(e.x, e.y - 12, `-${p.damage}`, "#38bdf8");
              spawnParticles(p.x, p.y, "#38bdf8", 6);
            }

            if (e.health <= 0) {
              score += e.points;
              if (score > highScore) {
                highScore = score;
                try {
                  localStorage.setItem("kheponastro_high_score", String(highScore));
                } catch {}
              }

              playEnemyDie(e.type === "boss" || e.type === "heavy_tank");
              screenShake = Math.max(screenShake, e.type === "boss" ? 18 : 6);
              spawnParticles(e.x, e.y, e.color, e.type === "boss" ? 40 : 20, 1.2);
              addFloatingText(e.x, e.y - 20, `+${e.points}`, "#34d399");
              dropPickup(e.x, e.y);

              const expSeries: 1 | 2 | 3 =
                e.type === "boss" ? 3 : e.type === "scout" ? 2 : 1;
              const expScale =
                e.type === "boss" ? 2.4 : e.type === "heavy" || e.type === "heavy_tank" ? 1.6 : 1.2;
              animatedExplosions.push(createAnimatedExplosion(e.x, e.y, expSeries, expScale));

              enemies.splice(j, 1);
            }

            break;
          }
        }

        if (hitEnemy) {
          projectiles.splice(i, 1);
          continue;
        }
      } else {
        const dist = Math.hypot(p.x - player.x, p.y - player.y);
        if (dist < 18 + p.radius && player.invulnerableTime <= 0) {
          projectiles.splice(i, 1);
          screenShake = 10;
          playHitSound();

          let dmg = p.damage;
          if (player.shield > 0) {
            const absorb = Math.min(player.shield, dmg);
            player.shield -= absorb;
            dmg -= absorb;
            addFloatingText(player.x, player.y - 16, `SHIELD -${absorb}`, "#38bdf8");
          }

          if (dmg > 0) {
            player.health = Math.max(0, player.health - dmg);
            addFloatingText(player.x, player.y - 28, `-${dmg} HP`, "#ef4444");
            spawnParticles(player.x, player.y, "#ef4444", 12);
          }

          if (player.health <= 0) {
            killPlayer("HULL DESTROYED");
          }

          continue;
        }
      }
    }

    // 4. Pickup Collection
    for (let i = pickups.length - 1; i >= 0; i--) {
      const pk = pickups[i];
      pk.life -= delta;
      if (pk.life <= 0) {
        pickups.splice(i, 1);
        continue;
      }

      const dist = Math.hypot(pk.x - player.x, pk.y - player.y);
      if (dist < 32) {
        playPickupSound();
        pickups.splice(i, 1);

        if (pk.type === "health") {
          player.health = Math.min(player.maxHealth, player.health + 35);
          addFloatingText(player.x, player.y - 24, "+35 HEALTH 💚", "#10b981");
        } else if (pk.type === "shield") {
          player.shield = Math.min(player.maxShield, player.shield + 50);
          addFloatingText(player.x, player.y - 24, "+50 SHIELD 🛡️", "#38bdf8");
        } else {
          player.weapon = pk.type;
          const ammoMap: Record<string, number> = {
            dual: 50,
            rapid: 120,
            shotgun: 35,
            rocket: 15,
          };
          player.weaponAmmo = ammoMap[pk.type] || 40;
          addFloatingText(player.x, player.y - 24, `${pk.name.toUpperCase()}!`, "#f59e0b");

          const availableWeapons = [
            {
              id: "cannon",
              weight: 10,
              value: WEAPON_REGISTRY.cannon.damage,
              damage: WEAPON_REGISTRY.cannon.damage,
            },
            {
              id: "dual",
              weight: 15,
              value: WEAPON_REGISTRY.dual.damage * 2,
              damage: WEAPON_REGISTRY.dual.damage * 2,
            },
            {
              id: "rapid",
              weight: 12,
              value: WEAPON_REGISTRY.rapid.damage * 8,
              damage: WEAPON_REGISTRY.rapid.damage * 8,
            },
            {
              id: "shotgun",
              weight: 18,
              value: WEAPON_REGISTRY.shotgun.damage * 5,
              damage: WEAPON_REGISTRY.shotgun.damage * 5,
            },
            {
              id: "rocket",
              weight: 25,
              value: WEAPON_REGISTRY.rocket.damage,
              damage: WEAPON_REGISTRY.rocket.damage,
            },
          ];
          const optimalLoadout = computeOptimalLoadout(availableWeapons, 50);
          const optimalNames = optimalLoadout.map((w) => w.id.toUpperCase()).join(" + ");
          addFloatingText(
            player.x,
            player.y - 40,
            `OPTIMAL: ${optimalNames} (Knapsack DP)`,
            "#10b981"
          );
        }
      }
    }

    // 5. Check Wave Clear
    if (enemies.length === 0 && !isWaveCleared) {
      isWaveCleared = true;
      score += wave * 500;
      addFloatingText(player.x, player.y - 20, "WAVE CLEARED! +BONUS", "#34d399");
      callbacks.onWaveClear(wave, score);

      setTimeout(() => {
        if (isWaveCleared && !isGameOver) {
          nextWaveAction();
        }
      }, 2200);
    }

    // 6. Update Particles & Floating Text
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.95;
      p.vy *= 0.95;
      p.life += delta;
      if (p.life >= p.maxLife) particles.splice(i, 1);
    }

    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.y += ft.vy;
      ft.life += delta;
      if (ft.life >= 1.2) floatingTexts.splice(i, 1);
    }

    // 7. Update Camera smoothly after player moves
    updateCamera(delta);

    if (screenShake > 0) {
      screenShake = Math.max(0, screenShake - delta * 30);
    }

    notifyHUD();
  }

  // Draw Function
  function draw(delta: number) {
    ctx.save();

    if (screenShake > 0) {
      const sx = (Math.random() - 0.5) * screenShake;
      const sy = (Math.random() - 0.5) * screenShake;
      ctx.translate(sx, sy);
    }

    // 1. Draw multi-sector map & world-aligned grid
    drawBackground(ctx, spriteManager, viewportWidth, viewportHeight, {
      cameraX: camera.x,
      cameraY: camera.y,
      sectorWidth: SECTOR_WIDTH,
      sectorHeight: SECTOR_HEIGHT,
      activeSectors,
      worldBounds: {
        minX: worldMinX,
        maxX: worldMaxX,
        minY: worldMinY,
        maxY: worldMaxY,
      },
    });

    // 2. Render world-space entities shifted by camera
    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    // Tread marks
    for (const tm of treadMarks) {
      ctx.save();
      ctx.translate(tm.x, tm.y);
      ctx.rotate(tm.angle);
      ctx.fillStyle = `rgba(15, 23, 42, ${tm.alpha})`;
      ctx.fillRect(-6, -tm.width / 2, 12, 4);
      ctx.fillRect(-6, tm.width / 2 - 4, 12, 4);
      ctx.restore();
    }

    // Pickups
    for (const pk of pickups) {
      ctx.save();
      ctx.translate(pk.x, pk.y);
      const bob = Math.sin(performance.now() * 0.006) * 3;
      ctx.translate(0, bob);

      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fillStyle =
        pk.type === "health"
          ? "rgba(16, 185, 129, 0.25)"
          : pk.type === "shield"
          ? "rgba(6, 182, 212, 0.25)"
          : "rgba(245, 158, 11, 0.25)";
      ctx.fill();

      ctx.font = "18px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(pk.icon, 0, 0);

      ctx.font = "bold 9px monospace";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(pk.name, 0, 20);
      ctx.restore();
    }

    const nowSec = performance.now() * 0.001;

    for (const e of enemies) {
      drawEnemySprite(ctx, spriteManager, e, nowSec);
    }

    if (!isGameOver) {
      drawPlayerSprite(ctx, spriteManager, player, nowSec);
    }

    for (const p of projectiles) {
      drawProjectileSprite(ctx, spriteManager, p, nowSec);
    }

    updateAndDrawExplosions(ctx, spriteManager, animatedExplosions, isPaused ? 0 : delta);

    for (const pt of particles) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = Math.max(0, 1 - pt.life / pt.maxLife);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }

    for (const ft of floatingTexts) {
      ctx.save();
      ctx.font = "bold 13px monospace";
      ctx.fillStyle = ft.color;
      ctx.shadowColor = "#000000";
      ctx.shadowBlur = 4;
      ctx.globalAlpha = Math.max(0, 1 - ft.life / 1.2);
      ctx.textAlign = "center";
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }

    ctx.restore();

    // 3. Crosshair at Mouse (screen space)
    ctx.save();
    ctx.strokeStyle = "rgba(56, 189, 248, 0.75)";
    ctx.lineWidth = 1.5;
    const chSize = 10;
    ctx.beginPath();
    ctx.arc(mouseX, mouseY, 7, 0, Math.PI * 2);
    ctx.moveTo(mouseX - chSize, mouseY);
    ctx.lineTo(mouseX + chSize, mouseY);
    ctx.moveTo(mouseX, mouseY - chSize);
    ctx.lineTo(mouseX, mouseY + chSize);
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  function handleWindowKeyDown(e: KeyboardEvent) {
    if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;
    keys[e.key] = true;
    keys[e.key.toLowerCase()] = true;
    keys[e.code] = true;

    if (e.key === "1") {
      player.weapon = "cannon";
      player.weaponAmmo = -1;
    }
    if (e.key === "2") {
      player.weapon = "dual";
      if (player.weaponAmmo <= 0) player.weaponAmmo = WEAPON_REGISTRY.dual.maxAmmo;
    }
    if (e.key === "3") {
      player.weapon = "rapid";
      if (player.weaponAmmo <= 0) player.weaponAmmo = WEAPON_REGISTRY.rapid.maxAmmo;
    }
    if (e.key === "4") {
      player.weapon = "shotgun";
      if (player.weaponAmmo <= 0) player.weaponAmmo = WEAPON_REGISTRY.shotgun.maxAmmo;
    }
    if (e.key === "5") {
      player.weapon = "rocket";
      if (player.weaponAmmo <= 0) player.weaponAmmo = WEAPON_REGISTRY.rocket.maxAmmo;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      togglePauseGame();
    }
    if ((e.key === "r" || e.key === "R") && isGameOver) {
      restartGame();
    }
    if (e.key === " " && isWaveCleared) {
      e.preventDefault();
      nextWaveAction();
    }
  }

  function handleWindowKeyUp(e: KeyboardEvent) {
    keys[e.key] = false;
    keys[e.key.toLowerCase()] = false;
    keys[e.code] = false;
  }

  function handleWindowBlur() {
    for (const k of Object.keys(keys)) {
      keys[k] = false;
    }
    isMouseDown = false;
  }

  function handleWindowPointerUp() {
    isMouseDown = false;
  }

  function restartGame() {
    wave = 1;
    score = 0;
    isGameOver = false;
    isWaveCleared = false;
    isPaused = false;

    activeSectors = [{ col: 0, row: 0, key: "main", label: SECTOR_META.main.label }];
    recalculateWorldBounds();

    player.health = 100;
    player.shield = 50;
    player.weapon = "cannon";
    player.weaponAmmo = -1;
    player.x = SECTOR_WIDTH / 2;
    player.y = SECTOR_HEIGHT / 2 + 80;
    player.vx = 0;
    player.vy = 0;
    snapCameraToPlayer();

    projectiles.length = 0;
    pickups.length = 0;
    particles.length = 0;
    floatingTexts.length = 0;
    treadMarks.length = 0;
    animatedExplosions.length = 0;
    spawnWave(1);
    notifyHUD();
  }

  function nextWaveAction() {
    wave++;
    player.health = Math.min(player.maxHealth, player.health + 25);
    player.shield = player.maxShield;
    spawnWave(wave);
    notifyHUD();
  }

  function loop(time: number) {
    animationId = requestAnimationFrame(loop);

    const delta = Math.min((time - lastTime) / 1000, 0.1);
    lastTime = time;

    try {
      update(delta);
      draw(delta);
    } catch (err) {
      console.error("Game loop tick error:", err);
    }
  }

  resizeCanvas();
  spawnWave(wave);
  notifyHUD();

  return {
    start: () => {
      window.addEventListener("keydown", handleWindowKeyDown);
      window.addEventListener("keyup", handleWindowKeyUp);
      window.addEventListener("blur", handleWindowBlur);
      window.addEventListener("pointerup", handleWindowPointerUp);
      if (!animationId) {
        lastTime = performance.now();
        animationId = requestAnimationFrame(loop);
      }
    },
    stop: () => {
      window.removeEventListener("keydown", handleWindowKeyDown);
      window.removeEventListener("keyup", handleWindowKeyUp);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("pointerup", handleWindowPointerUp);
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
    },
    pause: () => {
      pauseGame();
    },
    resume: () => {
      resumeGame();
    },
    togglePause: () => {
      togglePauseGame();
    },
    isPaused: () => isPaused,
    restart: () => {
      restartGame();
    },
    nextWave: () => {
      nextWaveAction();
    },
    setKeys: (newKeys) => {
      for (const k of Object.keys(keys)) {
        keys[k] = false;
      }
      for (const [k, v] of Object.entries(newKeys)) {
        if (v) {
          keys[k] = true;
          keys[k.toLowerCase()] = true;
        }
      }
    },
    setKey: (key, isDown) => {
      keys[key] = isDown;
      keys[key.toLowerCase()] = isDown;
    },
    setMousePos: (x, y) => {
      mouseX = x;
      mouseY = y;
    },
    setMouseDown: (down) => {
      isMouseDown = down;
    },
    selectWeapon: (w) => {
      player.weapon = w;
      if (w === "cannon") {
        player.weaponAmmo = -1;
      } else if (player.weaponAmmo <= 0) {
        player.weaponAmmo = WEAPON_REGISTRY[w].maxAmmo;
      }
    },
    triggerFire: () => {
      shootPlayer();
    },
    resize: () => {
      resizeCanvas();
    },
  };
}
