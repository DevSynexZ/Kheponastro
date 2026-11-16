/**
 * Kheponastro Top-Down Tactical Tank Combat Engine
 * Real-time movable player tank (WASD), movable enemy tanks with AI,
 * dynamic projectiles, pickups, waves, and explosive visual feedback.
 */

import {
  PlayerTank,
  EnemyTank,
  EnemyType,
  Projectile,
  Pickup,
  PickupType,
  Particle,
  FloatingText,
  WeaponType,
  WEAPON_REGISTRY,
  GameHUDState,
} from "./gameTypes";

import {
  playPlayerShoot,
  playEnemyShoot,
  playHitSound,
  playExplosionImpact,
  playPickupSound,
} from "./audio";

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

export function createTopDownEngine(
  canvas: HTMLCanvasElement,
  callbacks: TopDownEngineCallbacks
): TopDownEngine {
  const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true })!;

  // Arena World Dimensions
  let arenaWidth = canvas.width || 1200;
  let arenaHeight = canvas.height || 800;

  // Input State
  const keys: Record<string, boolean> = {};
  let mouseX = arenaWidth / 2;
  let mouseY = arenaHeight / 2;
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
  const treadMarks: Array<{ x: number; y: number; angle: number; alpha: number; width: number }> = [];

  // Player State
  const player: PlayerTank = {
    x: arenaWidth / 2,
    y: arenaHeight / 2 + 100,
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

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    arenaWidth = rect.width;
    arenaHeight = rect.height;
  }

  // Generate Unique ID
  let nextId = 1;
  function getId(): string {
    return `e_${nextId++}_${Date.now()}`;
  }

  // Spawn Enemy Wave
  function spawnWave(waveNumber: number) {
    enemies = [];
    isWaveCleared = false;
    const isBossWave = waveNumber % 5 === 0;

    // Keep enemy count small, clear, and fun (not overwhelming)
    let count = 2;
    if (isBossWave) {
      count = 2; // 1 Boss + 1 Scout guard
    } else if (waveNumber === 1) {
      count = 2; // Wave 1: Just 2 agile scout tanks
    } else if (waveNumber === 2) {
      count = 3; // Wave 2: 3 tanks
    } else if (waveNumber === 3) {
      count = 3; // Wave 3: 3 tanks
    } else if (waveNumber === 4) {
      count = 4; // Wave 4: 4 tanks
    } else {
      count = Math.min(5, 2 + Math.floor(waveNumber / 2)); // Cap at 5 tanks max
    }

    for (let i = 0; i < count; i++) {
      let type: EnemyType = "scout";

      if (isBossWave && i === 0) {
        type = "boss";
      } else if (waveNumber >= 4 && i === 0) {
        type = "heavy";
      } else if (waveNumber >= 2 && i % 2 === 1) {
        type = "medium";
      } else {
        type = "scout";
      }

      // Spawn along the perimeter away from player
      let x = 0;
      let y = 0;
      const edge = Math.floor(Math.random() * 4);
      const margin = 50;

      if (edge === 0) { // Top
        x = Math.random() * (arenaWidth - margin * 2) + margin;
        y = margin;
      } else if (edge === 1) { // Bottom
        x = Math.random() * (arenaWidth - margin * 2) + margin;
        y = arenaHeight - margin;
      } else if (edge === 2) { // Left
        x = margin;
        y = Math.random() * (arenaHeight - margin * 2) + margin;
      } else { // Right
        x = arenaWidth - margin;
        y = Math.random() * (arenaHeight - margin * 2) + margin;
      }

      // Avoid spawning directly on top of player
      const distToPlayer = Math.hypot(x - player.x, y - player.y);
      if (distToPlayer < 200) {
        x = (x + arenaWidth / 2) % (arenaWidth - margin * 2) + margin;
        y = (y + arenaHeight / 2) % (arenaHeight - margin * 2) + margin;
      }

      const enemyConfig: Record<EnemyType, { speed: number; hp: number; size: number; color: string; cooldown: number; pts: number }> = {
        scout: { speed: 2.4, hp: 35, size: 15, color: "#10b981", cooldown: 2600, pts: 100 },
        medium: { speed: 1.7, hp: 75, size: 19, color: "#06b6d4", cooldown: 2400, pts: 250 },
        heavy: { speed: 1.2, hp: 160, size: 24, color: "#f59e0b", cooldown: 2100, pts: 500 },
        boss: { speed: 0.9, hp: 420, size: 36, color: "#ef4444", cooldown: 1600, pts: 2000 },
      };

      const ec = enemyConfig[type];

      enemies.push({
        id: getId(),
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

    addFloatingText(arenaWidth / 2, arenaHeight / 2 - 60, `WAVE ${waveNumber} START!`, "#38bdf8");
  }

  // Spawn visual particles
  function spawnParticles(x: number, y: number, color: string, count: number, speedMultiplier: number = 1) {
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

  // Drop random pickup from destroyed enemy
  function dropPickup(x: number, y: number) {
    if (Math.random() < 0.35) return; // 65% chance to drop!

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
      life: 14, // 14 seconds despawn
    });
  }

  // Player Shoot
  function shootPlayer() {
    if (isPaused || isGameOver) return;
    const now = performance.now();
    const wInfo = WEAPON_REGISTRY[player.weapon];

    if (now - player.lastShotTime < wInfo.cooldown) return;
    player.lastShotTime = now;

    // Consume ammo if special weapon
    if (player.weaponAmmo > 0) {
      player.weaponAmmo--;
      if (player.weaponAmmo <= 0) {
        player.weapon = "cannon";
        player.weaponAmmo = -1;
        addFloatingText(player.x, player.y - 24, "DEFAULT CANNON", "#38bdf8");
      }
    }

    playPlayerShoot(player.weapon);

    // Muzzle position in front of turret
    const barrelLength = 24;
    const baseAngle = player.turretAngle;

    if (wInfo.count === 1) {
      const spreadAngle = (Math.random() - 0.5) * wInfo.spread;
      const angle = baseAngle + spreadAngle;
      projectiles.push({
        id: getId(),
        x: player.x + Math.cos(baseAngle) * barrelLength,
        y: player.y + Math.sin(baseAngle) * barrelLength,
        vx: Math.cos(angle) * wInfo.speed,
        vy: Math.sin(angle) * wInfo.speed,
        damage: wInfo.damage,
        radius: wInfo.radius,
        color: wInfo.color,
        isPlayer: true,
        isRocket: player.weapon === "rocket",
        life: 0,
        maxLife: 2.2,
      });
    } else if (wInfo.count === 2) {
      // Twin cannons
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
      // Shotgun spread
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

    // Little recoil push
    player.vx -= Math.cos(baseAngle) * 0.8;
    player.vy -= Math.sin(baseAngle) * 0.8;
  }

  // Enemy Shoot
  function shootEnemy(enemy: EnemyTank) {
    playEnemyShoot();
    const barrelLength = enemy.size + 4;
    const angle = enemy.turretAngle;
    const speed = enemy.type === "scout" ? 5.8 : enemy.type === "heavy" ? 5.0 : 5.4;
    const dmg = enemy.type === "heavy" ? 22 : enemy.type === "boss" ? 28 : 12;

    projectiles.push({
      id: getId(),
      x: enemy.x + Math.cos(angle) * barrelLength,
      y: enemy.y + Math.sin(angle) * barrelLength,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      damage: dmg,
      radius: enemy.type === "heavy" ? 5 : 3.5,
      color: "#ef4444",
      isPlayer: false,
      life: 0,
      maxLife: 2.5,
    });
  }

  // Main Update Cycle
  function update(delta: number) {
    if (isPaused || isGameOver) return;

    const now = performance.now();

    // 1. Player Input & Movement (Instant responsive WASD & Arrows)
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

      // Add tread marks
      if (Math.random() < 0.3) {
        treadMarks.push({
          x: player.x,
          y: player.y,
          angle: player.bodyAngle,
          alpha: 0.35,
          width: 18,
        });
        if (treadMarks.length > 80) treadMarks.shift();
      }
    } else {
      // Snappy stop when keys released
      player.vx *= 0.7;
      player.vy *= 0.7;
      if (Math.abs(player.vx) < 0.05) player.vx = 0;
      if (Math.abs(player.vy) < 0.05) player.vy = 0;
    }

    player.x += player.vx;
    player.y += player.vy;

    // Clamp inside arena walls
    const pMargin = 22;
    player.x = Math.max(pMargin, Math.min(arenaWidth - pMargin, player.x));
    player.y = Math.max(pMargin, Math.min(arenaHeight - pMargin, player.y));

    // Player Turret Angle points towards mouse cursor
    player.turretAngle = Math.atan2(mouseY - player.y, mouseX - player.x);

    // Continuous fire on mouse down or space
    if (isMouseDown || keys[" "] || keys["Space"]) {
      shootPlayer();
    }

    if (player.invulnerableTime > 0) {
      player.invulnerableTime = Math.max(0, player.invulnerableTime - delta);
    }

    // 2. Enemy AI & Movement
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];

      // Distance and angle to player
      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const dist = Math.hypot(dx, dy);
      const angleToPlayer = Math.atan2(dy, dx);

      // Turret always tracks player
      e.turretAngle = angleToPlayer;

      // Behavior based on type
      let targetX = player.x;
      let targetY = player.y;

      if (e.type === "scout") {
        // Scouts circle around player at ~160 distance
        const circleAngle = angleToPlayer + Math.PI / 2;
        targetX = player.x + Math.cos(circleAngle) * 160;
        targetY = player.y + Math.sin(circleAngle) * 160;
      } else if (e.type === "heavy" || e.type === "boss") {
        // Heavy tanks hold ground at medium range
        if (dist < 220) {
          targetX = e.x - Math.cos(angleToPlayer) * 50;
          targetY = e.y - Math.sin(angleToPlayer) * 50;
        }
      }

      const moveAngle = Math.atan2(targetY - e.y, targetX - e.x);
      e.vx += Math.cos(moveAngle) * e.speed * 0.15;
      e.vy += Math.sin(moveAngle) * e.speed * 0.15;

      // Enemy-enemy repulsion to avoid stacking
      for (let j = 0; j < enemies.length; j++) {
        if (i === j) continue;
        const other = enemies[j];
        const sepX = e.x - other.x;
        const sepY = e.y - other.y;
        const sepDist = Math.hypot(sepX, sepY);
        const minDist = e.size + other.size + 4;
        if (sepDist < minDist && sepDist > 0) {
          const push = (minDist - sepDist) / minDist * 1.5;
          e.vx += (sepX / sepDist) * push;
          e.vy += (sepY / sepDist) * push;
        }
      }

      e.vx *= 0.88;
      e.vy *= 0.88;
      e.x += e.vx;
      e.y += e.vy;
      e.bodyAngle = Math.atan2(e.vy, e.vx);

      // Clamp inside arena
      const eMargin = e.size + 8;
      e.x = Math.max(eMargin, Math.min(arenaWidth - eMargin, e.x));
      e.y = Math.max(eMargin, Math.min(arenaHeight - eMargin, e.y));

      if (e.hitFlashTime > 0) {
        e.hitFlashTime = Math.max(0, e.hitFlashTime - delta);
      }

      // Enemy shooting logic
      if (dist < 550 && now - e.lastShotTime > e.shootCooldown) {
        e.lastShotTime = now + (Math.random() - 0.5) * 400;
        shootEnemy(e);
      }
    }

    // 3. Projectile Updates & Collision Detection
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life += delta;

      // Spawn faint rocket smoke
      if (p.isRocket && Math.random() < 0.6) {
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

      // Check wall bounce or despawn
      if (p.x < 0 || p.x > arenaWidth || p.y < 0 || p.y > arenaHeight || p.life >= p.maxLife) {
        projectiles.splice(i, 1);
        continue;
      }

      // Player Projectiles vs Enemies
      if (p.isPlayer) {
        let hitEnemy = false;
        for (let j = enemies.length - 1; j >= 0; j--) {
          const e = enemies[j];
          const dist = Math.hypot(p.x - e.x, p.y - e.y);

          if (dist < e.size + p.radius) {
            hitEnemy = true;
            playHitSound();

            if (p.isRocket) {
              // Splash damage to all nearby
              screenShake = 12;
              playExplosionImpact(1.2);
              spawnParticles(p.x, p.y, "#ef4444", 25, 1.4);
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
              // Direct hit
              e.health -= p.damage;
              e.hitFlashTime = 0.12;
              addFloatingText(e.x, e.y - 12, `-${p.damage}`, "#38bdf8");
              spawnParticles(p.x, p.y, "#38bdf8", 6);
            }

            // Check if enemy died
            if (e.health <= 0) {
              score += e.points;
              if (score > highScore) {
                highScore = score;
                try {
                  localStorage.setItem("kheponastro_high_score", String(highScore));
                } catch {}
              }

              playExplosionImpact(0.9);
              screenShake = Math.max(screenShake, e.type === "boss" ? 18 : 6);
              spawnParticles(e.x, e.y, e.color, e.type === "boss" ? 40 : 20, 1.2);
              addFloatingText(e.x, e.y - 20, `+${e.points}`, "#34d399");
              dropPickup(e.x, e.y);

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
        // Enemy Projectile vs Player
        const dist = Math.hypot(p.x - player.x, p.y - player.y);
        if (dist < 18 + p.radius && player.invulnerableTime <= 0) {
          projectiles.splice(i, 1);
          screenShake = 10;
          playHitSound();

          // Apply damage: Shield first, then Health
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
            isGameOver = true;
            playExplosionImpact(1.5);
            spawnParticles(player.x, player.y, "#ef4444", 50, 1.6);
            callbacks.onGameOver(score, highScore, wave);
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
          // Weapon pickup
          player.weapon = pk.type;
          const ammoMap: Record<string, number> = {
            dual: 50,
            rapid: 120,
            shotgun: 35,
            rocket: 15,
          };
          player.weaponAmmo = ammoMap[pk.type] || 40;
          addFloatingText(player.x, player.y - 24, `${pk.name.toUpperCase()}!`, "#f59e0b");
        }
      }
    }

    // 5. Check Wave Clear
    if (enemies.length === 0 && !isWaveCleared) {
      isWaveCleared = true;
      score += wave * 500;
      addFloatingText(arenaWidth / 2, arenaHeight / 2 - 20, "WAVE CLEARED! +BONUS", "#34d399");
      callbacks.onWaveClear(wave, score);
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

    // Decay screen shake
    if (screenShake > 0) {
      screenShake = Math.max(0, screenShake - delta * 30);
    }

    // Inform React HUD
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
    });
  }

  // Draw Function
  function draw() {
    ctx.save();

    // Screen Shake effect
    if (screenShake > 0) {
      const sx = (Math.random() - 0.5) * screenShake;
      const sy = (Math.random() - 0.5) * screenShake;
      ctx.translate(sx, sy);
    }

    // Background Arena Grid
    ctx.fillStyle = "#030712"; // Dark slate
    ctx.fillRect(0, 0, arenaWidth, arenaHeight);

    // Subtle tactical grid
    ctx.strokeStyle = "rgba(6, 182, 212, 0.06)";
    ctx.lineWidth = 1;
    const gridSize = 50;
    for (let x = 0; x <= arenaWidth; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, arenaHeight); ctx.stroke();
    }
    for (let y = 0; y <= arenaHeight; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(arenaWidth, y); ctx.stroke();
    }

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

    // Draw Pickups
    for (const pk of pickups) {
      ctx.save();
      ctx.translate(pk.x, pk.y);
      // Floating bobbing motion
      const bob = Math.sin(performance.now() * 0.006) * 3;
      ctx.translate(0, bob);

      // Glowing aura
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fillStyle = pk.type === "health" ? "rgba(16, 185, 129, 0.25)" : pk.type === "shield" ? "rgba(6, 182, 212, 0.25)" : "rgba(245, 158, 11, 0.25)";
      ctx.fill();

      // Icon
      ctx.font = "18px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(pk.icon, 0, 0);

      // Name tag
      ctx.font = "bold 9px monospace";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(pk.name, 0, 20);
      ctx.restore();
    }

    // Draw Enemies
    for (const e of enemies) {
      ctx.save();
      ctx.translate(e.x, e.y);

      // Tank Hull Body
      ctx.save();
      ctx.rotate(e.bodyAngle);

      // Tracks
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(-e.size, -e.size * 0.9, e.size * 2, e.size * 0.4);
      ctx.fillRect(-e.size, e.size * 0.5, e.size * 2, e.size * 0.4);

      // Hull
      ctx.beginPath();
      ctx.roundRect(-e.size * 0.8, -e.size * 0.7, e.size * 1.6, e.size * 1.4, 4);
      ctx.fillStyle = e.hitFlashTime > 0 ? "#ffffff" : e.color;
      ctx.fill();
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      // Turret
      ctx.save();
      ctx.rotate(e.turretAngle);
      // Barrel
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, -e.size * 0.18, e.size * 1.3, e.size * 0.36);
      ctx.strokeStyle = e.color;
      ctx.lineWidth = 1;
      ctx.strokeRect(0, -e.size * 0.18, e.size * 1.3, e.size * 0.36);

      // Turret Dome
      ctx.beginPath();
      ctx.arc(0, 0, e.size * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = "#0f172a";
      ctx.fill();
      ctx.strokeStyle = e.color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      // Health Bar
      const hpPct = Math.max(0, e.health / e.maxHealth);
      const barW = e.size * 2.2;
      const barH = 4;
      ctx.fillStyle = "rgba(15, 23, 42, 0.8)";
      ctx.fillRect(-barW / 2, -e.size - 10, barW, barH);
      ctx.fillStyle = hpPct > 0.5 ? "#10b981" : hpPct > 0.25 ? "#f59e0b" : "#ef4444";
      ctx.fillRect(-barW / 2, -e.size - 10, barW * hpPct, barH);

      ctx.restore();
    }

    // Draw Player Tank
    if (!isGameOver) {
      ctx.save();
      ctx.translate(player.x, player.y);

      // Shield bubble
      if (player.shield > 0) {
        ctx.beginPath();
        ctx.arc(0, 0, 30, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(56, 189, 248, ${0.4 + 0.2 * Math.sin(performance.now() * 0.008)})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "rgba(56, 189, 248, 0.06)";
        ctx.fill();
      }

      // Hull
      ctx.save();
      ctx.rotate(player.bodyAngle);

      // Player Treads
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(-16, -14, 32, 6);
      ctx.fillRect(-16, 8, 32, 6);

      // Player Chassis
      ctx.beginPath();
      ctx.roundRect(-13, -11, 26, 22, 4);
      ctx.fillStyle = player.invulnerableTime > 0 && Math.floor(performance.now() / 80) % 2 === 0 ? "#ffffff" : "#0284c7";
      ctx.fill();
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      // Turret
      ctx.save();
      ctx.rotate(player.turretAngle);

      // Gun Barrel
      const wInfo = WEAPON_REGISTRY[player.weapon];
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, -3, 22, 6);
      ctx.strokeStyle = wInfo.color;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(0, -3, 22, 6);

      // Turret Cupola
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.fillStyle = "#0f172a";
      ctx.fill();
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();
      ctx.restore();
    }

    // Draw Projectiles
    for (const p of projectiles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Draw Particles
    for (const pt of particles) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = Math.max(0, 1 - pt.life / pt.maxLife);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }

    // Draw Floating Text
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

    // Crosshair at Mouse
    ctx.save();
    ctx.strokeStyle = "rgba(56, 189, 248, 0.75)";
    ctx.lineWidth = 1.5;
    const chSize = 10;
    ctx.beginPath();
    ctx.arc(mouseX, mouseY, 7, 0, Math.PI * 2);
    ctx.moveTo(mouseX - chSize, mouseY); ctx.lineTo(mouseX + chSize, mouseY);
    ctx.moveTo(mouseX, mouseY - chSize); ctx.lineTo(mouseX, mouseY + chSize);
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  // Window Event Handlers for rock-solid zero-latency input
  function handleWindowKeyDown(e: KeyboardEvent) {
    if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;
    keys[e.key] = true;
    keys[e.key.toLowerCase()] = true;
    keys[e.code] = true;

    // Fast weapon hotkeys
    if (e.key === "1") { player.weapon = "cannon"; player.weaponAmmo = -1; }
    if (e.key === "2") { player.weapon = "dual"; if (player.weaponAmmo <= 0) player.weaponAmmo = WEAPON_REGISTRY.dual.maxAmmo; }
    if (e.key === "3") { player.weapon = "rapid"; if (player.weaponAmmo <= 0) player.weaponAmmo = WEAPON_REGISTRY.rapid.maxAmmo; }
    if (e.key === "4") { player.weapon = "shotgun"; if (player.weaponAmmo <= 0) player.weaponAmmo = WEAPON_REGISTRY.shotgun.maxAmmo; }
    if (e.key === "5") { player.weapon = "rocket"; if (player.weaponAmmo <= 0) player.weaponAmmo = WEAPON_REGISTRY.rocket.maxAmmo; }

    if (e.key === "Escape") {
      isPaused = !isPaused;
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
    player.health = 100;
    player.shield = 50;
    player.weapon = "cannon";
    player.weaponAmmo = -1;
    player.x = arenaWidth / 2;
    player.y = arenaHeight / 2 + 80;
    player.vx = 0;
    player.vy = 0;
    projectiles.length = 0;
    pickups.length = 0;
    particles.length = 0;
    floatingTexts.length = 0;
    treadMarks.length = 0;
    spawnWave(1);
  }

  function nextWaveAction() {
    wave++;
    player.health = Math.min(player.maxHealth, player.health + 25);
    player.shield = player.maxShield;
    spawnWave(wave);
  }

  // Animation Loop
  function loop(time: number) {
    const delta = Math.min((time - lastTime) / 1000, 0.1);
    lastTime = time;

    update(delta);
    draw();

    animationId = requestAnimationFrame(loop);
  }

  // Initialize
  resizeCanvas();
  spawnWave(wave);

  // Return Engine Controller
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
      isPaused = true;
    },
    resume: () => {
      isPaused = false;
      lastTime = performance.now();
    },
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
