/**
 * Kheponastro Sprite Asset Engine
 * Manages loading, caching, animation, and high-performance Canvas 2D rendering
 * for Player ships, Enemies, FX, Exhaust, Projectiles, and Explosions.
 */

import { PlayerTank, EnemyTank, Projectile, AnimatedExplosion } from "./gameTypes";

export interface SpriteSet {
  m: HTMLImageElement;
  l1: HTMLImageElement;
  l2: HTMLImageElement;
  r1: HTMLImageElement;
  r2: HTMLImageElement;
}

export interface SpriteManager {
  isLoaded: boolean;
  bg: HTMLImageElement | null;
  bgPattern: CanvasPattern | null;
  player: SpriteSet;
  exhaust: HTMLImageElement[];
  enemies: {
    scout: SpriteSet;
    medium: SpriteSet;
    heavy: SpriteSet;
    boss: SpriteSet;
  };
  mines: {
    mine1: HTMLImageElement[];
    mine2: HTMLImageElement[];
  };
  fx: {
    plasma1: HTMLImageElement;
    plasma2: HTMLImageElement;
    vulcan: HTMLImageElement[];
    proton: HTMLImageElement[];
  };
  explosions: {
    series1: HTMLImageElement[];
    series2: HTMLImageElement[];
    series3: HTMLImageElement[];
  };
}

let cachedManager: SpriteManager | null = null;

function loadImage(src: string): HTMLImageElement {
  const img = new Image();
  img.src = src;
  return img;
}

function loadFrames(basePath: string, count: number, padDigits: number = 2): HTMLImageElement[] {
  const frames: HTMLImageElement[] = [];
  for (let i = 1; i <= count; i++) {
    const numStr = String(i).padStart(padDigits, "0");
    frames.push(loadImage(`${basePath}${numStr}.png`));
  }
  return frames;
}

export function initSpriteManager(): SpriteManager {
  if (cachedManager) return cachedManager;

  const bg = loadImage("/BG.png");

  const player: SpriteSet = {
    m: loadImage("/Player/player_b_m.png"),
    l1: loadImage("/Player/player_b_l1.png"),
    l2: loadImage("/Player/player_b_l2.png"),
    r1: loadImage("/Player/player_b_r1.png"),
    r2: loadImage("/Player/player_b_r2.png"),
  };

  const exhaust = [
    loadImage("/FX/exhaust_01.png"),
    loadImage("/FX/exhaust_02.png"),
    loadImage("/FX/exhaust_03.png"),
    loadImage("/FX/exhaust_04.png"),
    loadImage("/FX/exhaust_05.png"),
  ];

  const scout: SpriteSet = {
    m: loadImage("/Enemies/enemy_1_g_m.png"),
    l1: loadImage("/Enemies/enemy_1_g_l1.png"),
    l2: loadImage("/Enemies/enemy_1_g_l2.png"),
    r1: loadImage("/Enemies/enemy_1_g_r1.png"),
    r2: loadImage("/Enemies/enemy_1_g_r2.png"),
  };

  const medium: SpriteSet = {
    m: loadImage("/Enemies/enemy_2_g_m.png"),
    l1: loadImage("/Enemies/enemy_2_g_l1.png"),
    l2: loadImage("/Enemies/enemy_2_g_l2.png"),
    r1: loadImage("/Enemies/enemy_2_g_r1.png"),
    r2: loadImage("/Enemies/enemy_2_g_r2.png"),
  };

  const heavy: SpriteSet = {
    m: loadImage("/Enemies/enemy_2_b_m.png"),
    l1: loadImage("/Enemies/enemy_2_b_l1.png"),
    l2: loadImage("/Enemies/enemy_2_b_l2.png"),
    r1: loadImage("/Enemies/enemy_2_b_r1.png"),
    r2: loadImage("/Enemies/enemy_2_b_r2.png"),
  };

  const boss: SpriteSet = {
    m: loadImage("/Enemies/enemy_2_r_m.png"),
    l1: loadImage("/Enemies/enemy_2_r_l1.png"),
    l2: loadImage("/Enemies/enemy_2_r_l2.png"),
    r1: loadImage("/Enemies/enemy_2_r_r1.png"),
    r2: loadImage("/Enemies/enemy_2_r_r2.png"),
  };

  const mine1 = loadFrames("/Enemies/mine_1_", 9, 2);
  const mine2 = loadFrames("/Enemies/mine_2_", 4, 2);

  const fx = {
    plasma1: loadImage("/FX/plasma_1.png"),
    plasma2: loadImage("/FX/plasma_2.png"),
    vulcan: [
      loadImage("/FX/vulcan_1.png"),
      loadImage("/FX/vulcan_2.png"),
      loadImage("/FX/vulcan_3.png"),
    ],
    proton: [
      loadImage("/FX/proton_01.png"),
      loadImage("/FX/proton_02.png"),
      loadImage("/FX/proton_03.png"),
    ],
  };

  const explosions = {
    series1: loadFrames("/Explosions/explosion_1_", 11, 2),
    series2: loadFrames("/Explosions/explosion_2_", 9, 2),
    series3: loadFrames("/Explosions/explosion_3_", 9, 2),
  };

  const manager: SpriteManager = {
    isLoaded: false,
    bg,
    bgPattern: null,
    player,
    exhaust,
    enemies: {
      scout,
      medium,
      heavy,
      boss,
    },
    mines: {
      mine1,
      mine2,
    },
    fx,
    explosions,
  };

  // Check background load for pattern creation
  bg.onload = () => {
    manager.isLoaded = true;
  };

  cachedManager = manager;
  return manager;
}

/**
 * Render seamless space arena background
 */
export function drawBackground(
  ctx: CanvasRenderingContext2D,
  sm: SpriteManager,
  width: number,
  height: number
) {
  // Always fill dark background first
  ctx.fillStyle = "#030712";
  ctx.fillRect(0, 0, width, height);

  try {
    if (sm.bg && sm.bg.complete && sm.bg.naturalWidth > 0) {
      if (!sm.bgPattern) {
        sm.bgPattern = ctx.createPattern(sm.bg, "repeat");
      }
      if (sm.bgPattern) {
        ctx.fillStyle = sm.bgPattern;
        ctx.fillRect(0, 0, width, height);
      } else {
        ctx.drawImage(sm.bg, 0, 0, width, height);
      }
    }
  } catch {}

  // Tactical sci-fi grid overlay
  ctx.save();
  ctx.strokeStyle = "rgba(6, 182, 212, 0.07)";
  ctx.lineWidth = 1;
  const gridSize = 64;
  for (let x = 0; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Soft vignette (guarded against zero/negative dimensions)
  if (width > 60 && height > 60) {
    try {
      const minDim = Math.min(width, height);
      const maxDim = Math.max(width, height);
      const r0 = Math.max(1, minDim * 0.35);
      const r1 = Math.max(r0 + 1, maxDim * 0.75);
      const radGrad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        r0,
        width / 2,
        height / 2,
        r1
      );
      radGrad.addColorStop(0, "rgba(3, 7, 18, 0.15)");
      radGrad.addColorStop(1, "rgba(3, 7, 18, 0.75)");
      ctx.fillStyle = radGrad;
      ctx.fillRect(0, 0, width, height);
    } catch {}
  }
  ctx.restore();
}

/**
 * Render player ship with banking animation & engine exhaust
 */
export function drawPlayerSprite(
  ctx: CanvasRenderingContext2D,
  sm: SpriteManager,
  player: PlayerTank,
  animTime: number
) {
  ctx.save();
  ctx.translate(player.x, player.y);

  // Rotate to player body angle (image faces UP natively, so add PI/2)
  ctx.rotate(player.bodyAngle + Math.PI / 2);

  const speed = Math.hypot(player.vx, player.vy);

  // 1. Draw animated engine exhaust plume when moving
  if (speed > 0.3) {
    const exhaustFrame = sm.exhaust[Math.floor(animTime * 18) % sm.exhaust.length];
    if (exhaustFrame && exhaustFrame.complete) {
      ctx.save();
      const exWidth = 32;
      const exHeight = 32;
      // Position directly behind player's thrusters (positive Y is behind when facing up)
      ctx.drawImage(exhaustFrame, -exWidth / 2, 14, exWidth, exHeight);
      ctx.restore();
    }
  } else {
    // Subtle engine idle glow
    ctx.save();
    ctx.fillStyle = "rgba(56, 189, 248, 0.35)";
    ctx.beginPath();
    ctx.arc(0, 22, 4 + Math.sin(animTime * 10) * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 2. Select banking sprite based on horizontal turn / velocity
  let sprite = sm.player.m;
  if (player.vx < -2.2) {
    sprite = sm.player.l2;
  } else if (player.vx < -0.5) {
    sprite = sm.player.l1;
  } else if (player.vx > 2.2) {
    sprite = sm.player.r2;
  } else if (player.vx > 0.5) {
    sprite = sm.player.r1;
  }

  // Draw player ship
  const pSize = 52;
  if (sprite && sprite.complete && sprite.naturalWidth > 0) {
    ctx.drawImage(sprite, -pSize / 2, -pSize / 2, pSize, pSize);
  } else {
    // Fallback vector drawing
    ctx.fillStyle = "#38bdf8";
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(16, 18);
    ctx.lineTo(0, 10);
    ctx.lineTo(-16, 18);
    ctx.closePath();
    ctx.fill();
  }

  // 3. Invulnerability shield bubble
  if (player.invulnerableTime > 0) {
    ctx.save();
    ctx.strokeStyle = "rgba(56, 189, 248, 0.85)";
    ctx.lineWidth = 2.5;
    ctx.shadowColor = "#38bdf8";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(0, 0, 32, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();

  // 4. Subtle aim reticle vector towards cursor
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.turretAngle);
  ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(24, 0);
  ctx.lineTo(34, 0);
  ctx.stroke();
  ctx.restore();
}

/**
 * Render enemy warship with banking & hit flash
 */
export function drawEnemySprite(
  ctx: CanvasRenderingContext2D,
  sm: SpriteManager,
  enemy: EnemyTank,
  animTime: number
) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);

  // Rotate towards target (turret angle + PI/2)
  ctx.rotate(enemy.turretAngle + Math.PI / 2);

  // Pick sprite set based on enemy type
  let set: SpriteSet = sm.enemies.scout;
  let baseSize = 44;

  if (enemy.type === "scout") {
    set = sm.enemies.scout;
    baseSize = 42;
  } else if (enemy.type === "medium") {
    set = sm.enemies.medium;
    baseSize = 48;
  } else if (enemy.type === "heavy") {
    set = sm.enemies.heavy;
    baseSize = 58;
  } else if (enemy.type === "boss") {
    set = sm.enemies.boss;
    baseSize = 88;
  }

  // Banking selection based on lateral movement
  let sprite = set.m;
  const bankThreshold = Math.max(0.6, enemy.speed * 0.45);
  if (enemy.vx < -bankThreshold) sprite = set.l1;
  else if (enemy.vx > bankThreshold) sprite = set.r1;

  // Hit flash overlay
  if (enemy.hitFlashTime > 0) {
    try {
      ctx.filter = "brightness(3) contrast(1.5)";
    } catch {}
  }

  if (sprite && sprite.complete && sprite.naturalWidth > 0) {
    ctx.drawImage(sprite, -baseSize / 2, -baseSize / 2, baseSize, baseSize);
  } else {
    // Fallback vector drawing
    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.size, 0, Math.PI * 2);
    ctx.fill();
  }

  try {
    ctx.filter = "none";
  } catch {}

  ctx.restore();

  // Health bar above enemy ship
  const barWidth = Math.max(32, enemy.size * 2);
  const barHeight = 4;
  const barY = enemy.y - enemy.size - 14;
  const hpPct = Math.max(0, Math.min(1, enemy.health / enemy.maxHealth));

  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
  ctx.fillRect(enemy.x - barWidth / 2 - 1, barY - 1, barWidth + 2, barHeight + 2);

  ctx.fillStyle = enemy.type === "boss" ? "#ef4444" : enemy.type === "heavy" ? "#f59e0b" : "#10b981";
  ctx.fillRect(enemy.x - barWidth / 2, barY, barWidth * hpPct, barHeight);
  ctx.restore();
}

/**
 * Render projectile using FX sprite assets
 */
export function drawProjectileSprite(
  ctx: CanvasRenderingContext2D,
  sm: SpriteManager,
  p: Projectile,
  animTime: number
) {
  ctx.save();
  ctx.translate(p.x, p.y);
  const angle = Math.atan2(p.vy, p.vx);
  ctx.rotate(angle + Math.PI / 2);

  if (p.isPlayer) {
    if (p.isRocket) {
      // Rocket: Proton warhead with trailing exhaust
      const proton = sm.fx.proton[0];
      if (proton && proton.complete) {
        ctx.drawImage(proton, -8, -8, 16, 16);
      } else {
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      // Rocket exhaust flame behind
      const exFrame = sm.exhaust[Math.floor(animTime * 24) % sm.exhaust.length];
      if (exFrame && exFrame.complete) {
        ctx.drawImage(exFrame, -8, 4, 16, 16);
      }
    } else {
      // Plasma bolt / Vulcan tracer
      const plasma = sm.fx.plasma1;
      if (plasma && plasma.complete) {
        ctx.drawImage(plasma, -4, -12, 8, 24);
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else {
    // Enemy projectile: Red/Orange plasma
    const plasma = sm.fx.plasma2;
    if (plasma && plasma.complete) {
      ctx.drawImage(plasma, -5, -12, 10, 24);
    } else {
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

/**
 * Create a new animated explosion instance
 */
export function createAnimatedExplosion(
  x: number,
  y: number,
  series: 1 | 2 | 3 = 1,
  scale: number = 1
): AnimatedExplosion {
  const maxFrames = series === 1 ? 11 : 9;
  return {
    id: `exp_${Date.now()}_${Math.random()}`,
    x,
    y,
    series,
    frame: 0,
    maxFrames,
    scale,
    fps: 26,
    timeAcc: 0,
    rotation: Math.random() * Math.PI * 2,
    done: false,
  };
}

/**
 * Update and render animated explosions
 */
export function updateAndDrawExplosions(
  ctx: CanvasRenderingContext2D,
  sm: SpriteManager,
  explosions: AnimatedExplosion[],
  delta: number
) {
  for (let i = explosions.length - 1; i >= 0; i--) {
    const exp = explosions[i];
    exp.timeAcc += delta;

    if (exp.timeAcc >= 1 / exp.fps) {
      exp.timeAcc -= 1 / exp.fps;
      exp.frame++;
      if (exp.frame >= exp.maxFrames) {
        exp.done = true;
        explosions.splice(i, 1);
        continue;
      }
    }

    // Render current frame
    let frameList: HTMLImageElement[] = sm.explosions.series1;
    if (exp.series === 2) frameList = sm.explosions.series2;
    else if (exp.series === 3) frameList = sm.explosions.series3;

    const img = frameList && frameList[exp.frame];
    if (!img) {
      explosions.splice(i, 1);
      continue;
    }
    if (img.complete && img.naturalWidth > 0) {
      ctx.save();
      ctx.translate(exp.x, exp.y);
      ctx.rotate(exp.rotation);
      const size = 52 * exp.scale;
      ctx.drawImage(img, -size / 2, -size / 2, size, size);
      ctx.restore();
    }
  }
}
