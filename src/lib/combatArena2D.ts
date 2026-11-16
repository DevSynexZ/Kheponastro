/**
 * 2D Canvas Combat Arena - High-Performance Tactical Artillery Battlefield
 * Procedural rendering with smooth 60fps animations, projectile tracer,
 * dynamic explosions, particle systems, and interactive targeting.
 */

import { Target } from "./gameTypes";

export interface Arena2DConfig {
  container: HTMLDivElement;
  onProgress?: (progress: number) => void;
  onReady?: () => void;
  onError?: (error: Error) => void;
  onTargetHover?: (target: Target | null) => void;
  onTargetClick?: (target: TargetClickPayload) => void;
}

export type TargetClickPayload = Target | {
  position: { x: number; y: number; z: number };
  computedAzimuth?: number;
  computedPower?: number;
};

export interface Arena2DScene {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  animate: () => void;
  stop: () => void;
  setSize: () => void;
  loadTrajectory: (trajectoryData: { trajectory?: TrajectoryPoint[] } | null) => void;
  loadTargets: (targets: Target[]) => void;
  setImpactEffect: (point: { x: number; y: number; z: number }, radius: number, label?: string) => void;
  setCamera: (x: number, z: number, zoom: number) => void;
  setAimDirection: (azimuth: number, elevation?: number) => void;
  triggerFireAnimation: (trajectory: Array<{ x: number; y?: number; z: number }>) => void;
}

interface TrajectoryPoint {
  x: number;
  y: number;
  z: number;
  v?: number;
}

interface Target2D {
  id: string;
  x: number;
  y: number;
  z: number;
  size: number;
  type: string;
  health: number;
  maxHealth: number;
  armor: number;
  points: number;
  destroyed: boolean;
  hit: boolean;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  vy: number;
  life: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}

const TARGET_COLORS: Record<string, string> = {
  light: "#10b981",    // emerald
  medium: "#06b6d4",   // cyan
  heavy: "#f59e0b",    // amber
  command: "#ef4444",  // red
  supply: "#8b5cf6",   // violet
};

const TYPE_ICONS: Record<string, string> = {
  light: "▲",
  medium: "◆",
  heavy: "⬡",
  command: "★",
  supply: "■",
};

export function createCombatArena2D(config: Arena2DConfig): Arena2DScene {
  const { container, onProgress, onReady, onTargetHover, onTargetClick } = config;

  // Create canvas
  const canvas = document.createElement("canvas");
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.display = "block";
  canvas.style.cursor = "crosshair";
  container.appendChild(canvas);

  const ctx = canvas.getContext("2d", {
    alpha: false,
    desynchronized: true,
  })!;

  // State
  let trajectory: TrajectoryPoint[] = [];
  let targets: Target2D[] = [];
  let rawTargets: Target[] = [];
  let cameraX = 0;
  let cameraZ = 0;
  let cameraZoom = 1.0;
  let aimAzimuth = 0;
  let hoveredTargetId: string | null = null;
  const mouseScreenPos = { x: 0, y: 0 };

  // Projectile flight animation
  let inFlightTrajectory: TrajectoryPoint[] | null = null;
  let projectileIndex = -1;
  let projectileActive = false;

  // Visual effects
  const particles: Particle[] = [];
  const floatingTexts: FloatingText[] = [];
  const impactEffects: Array<{
    x: number;
    z: number;
    radius: number;
    time: number;
    maxTime: number;
    label?: string;
  }> = [];

  let muzzleFlashTime = 0;
  let radarAngle = 0;
  let animationId: number | null = null;
  let lastTime = performance.now();

  // Resize canvas
  function resize() {
    const rect = container.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // World to screen projection:
  // Battery is at bottom center (0, 0)
  // Forward towards enemy is UP (-screenY)
  // Lateral is horizontal (+screenX is right, -screenX is left)
  // wy is altitude (arcs upwards on screen)
  function worldToScreen(wx: number, wz: number, wy: number = 0): { x: number; y: number } {
    const rect = container.getBoundingClientRect();
    const centerX = rect.width / 2;
    // Base of cannon anchored near the bottom
    const baseY = rect.height - 85;

    // Scale world (width ~800, depth ~800) to fit view
    const scale = Math.min(rect.width / 950, (rect.height - 130) / 850) * cameraZoom;

    const screenX = centerX + (wx - cameraX) * scale;
    const screenY = baseY - (wz - cameraZ) * scale - wy * scale * 0.45;

    return { x: screenX, y: screenY };
  }

  // Screen to world (ground plane y=0)
  function screenToWorld(sx: number, sy: number): { x: number; z: number } {
    const rect = container.getBoundingClientRect();
    const centerX = rect.width / 2;
    const baseY = rect.height - 85;
    const scale = Math.min(rect.width / 950, (rect.height - 130) / 850) * cameraZoom;

    const wx = (sx - centerX) / scale + cameraX;
    const wz = (baseY - sy) / scale + cameraZ;

    return { x: wx, z: Math.max(0, wz) };
  }

  // Draw Tactical Background Grid & Range Rings
  function drawBackground() {
    const rect = container.getBoundingClientRect();

    // Background gradient
    const bgGradient = ctx.createLinearGradient(0, 0, 0, rect.height);
    bgGradient.addColorStop(0, "#03060a");
    bgGradient.addColorStop(0.5, "#040b12");
    bgGradient.addColorStop(1, "#020406");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Battery origin on screen
    const origin = worldToScreen(0, 0);

    ctx.save();

    // Draw range rings around battery: 100m, 200m, 300m, 400m, 500m, 600m, 700m
    const ranges = [100, 200, 300, 400, 500, 600, 700];
    ranges.forEach((rng) => {
      const pRng = worldToScreen(0, rng);
      const r = Math.abs(origin.y - pRng.y);

      ctx.beginPath();
      // Semi-circle forward arc
      ctx.arc(origin.x, origin.y, r, -Math.PI * 0.85, -Math.PI * 0.15, false);
      ctx.strokeStyle = "rgba(6, 182, 212, 0.12)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.stroke();

      // Range text label along right edge
      ctx.setLineDash([]);
      ctx.font = "9px monospace";
      ctx.fillStyle = "rgba(6, 182, 212, 0.35)";
      ctx.textAlign = "left";
      ctx.fillText(`${rng}m`, origin.x + r * Math.cos(-Math.PI * 0.2) + 4, origin.y + r * Math.sin(-Math.PI * 0.2));
    });

    // Radial bearing lines from battery: -45°, -30°, -15°, 0°, +15°, +30°, +45°
    const bearings = [-45, -30, -15, 0, 15, 30, 45];
    bearings.forEach((brg) => {
      const rad = (brg * Math.PI) / 180;
      const endDist = 720;
      const wx = endDist * Math.sin(rad);
      const wz = endDist * Math.cos(rad);
      const pEnd = worldToScreen(wx, wz);

      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(pEnd.x, pEnd.y);
      ctx.strokeStyle = brg === 0 ? "rgba(16, 185, 129, 0.25)" : "rgba(6, 182, 212, 0.08)";
      ctx.lineWidth = brg === 0 ? 1.5 : 1;
      ctx.setLineDash(brg === 0 ? [] : [2, 8]);
      ctx.stroke();

      // Bearing indicator at perimeter
      ctx.setLineDash([]);
      ctx.font = "9px monospace";
      ctx.fillStyle = "rgba(6, 182, 212, 0.4)";
      ctx.textAlign = "center";
      ctx.fillText(`${brg > 0 ? "+" : ""}${brg}°`, pEnd.x, pEnd.y - 6);
    });

    // Radar scan beam animation
    ctx.save();
    ctx.translate(origin.x, origin.y);
    const beamLength = Math.abs(origin.y - worldToScreen(0, 750).y);
    const grad = ctx.createLinearGradient(0, 0, Math.cos(radarAngle) * beamLength, Math.sin(radarAngle) * beamLength);
    grad.addColorStop(0, "rgba(6, 182, 212, 0.25)");
    grad.addColorStop(1, "rgba(6, 182, 212, 0.0)");

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, beamLength, radarAngle - 0.2, radarAngle);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  // Draw Player Artillery / Cannon
  function drawPlayerCannon() {
    const origin = worldToScreen(0, 0);
    const rad = (aimAzimuth * Math.PI) / 180;

    ctx.save();
    ctx.translate(origin.x, origin.y);

    // Defensive bunker / platform base
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
    ctx.fill();
    ctx.strokeStyle = "#06b6d4";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Bearing ring
    ctx.beginPath();
    ctx.arc(0, 0, 30, -Math.PI * 0.8, -Math.PI * 0.2);
    ctx.strokeStyle = "rgba(6, 182, 212, 0.4)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Turret chassis
    ctx.beginPath();
    ctx.roundRect(-14, -14, 28, 28, 6);
    ctx.fillStyle = "#1e293b";
    ctx.fill();
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Cannon barrel rotating to match azimuth
    ctx.save();
    // In our coordinate system, forward is UP (-Y), azimuth turns right (+X)
    ctx.rotate(rad);

    // Barrel
    const barrelLength = 32;
    const barrelWidth = 6;
    ctx.fillStyle = "#334155";
    ctx.fillRect(-barrelWidth / 2, -barrelLength, barrelWidth, barrelLength);
    ctx.strokeStyle = "#06b6d4";
    ctx.lineWidth = 1;
    ctx.strokeRect(-barrelWidth / 2, -barrelLength, barrelWidth, barrelLength);

    // Muzzle flash burst
    if (muzzleFlashTime > 0) {
      ctx.beginPath();
      ctx.arc(0, -barrelLength - 8, 14 * muzzleFlashTime, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(251, 191, 36, ${muzzleFlashTime * 0.8})`;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(0, -barrelLength - 8, 8 * muzzleFlashTime, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${muzzleFlashTime})`;
      ctx.fill();
    }

    ctx.restore();

    // Turret center hatch
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fillStyle = "#10b981";
    ctx.fill();
    ctx.strokeStyle = "#047857";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Battery label
    ctx.font = "bold 9px monospace";
    ctx.fillStyle = "#10b981";
    ctx.textAlign = "center";
    ctx.fillText("BATTERY 01", 0, 22);

    ctx.restore();
  }

  // Draw Trajectory Prediction Line & Target Crosshair
  function drawTrajectoryPrediction() {
    if (trajectory.length < 2) return;

    ctx.save();

    // Ground shadow line (points on ground y=0)
    ctx.beginPath();
    const startGround = worldToScreen(trajectory[0].x, trajectory[0].z, 0);
    ctx.moveTo(startGround.x, startGround.y);
    for (let i = 1; i < trajectory.length; i++) {
      const p = worldToScreen(trajectory[i].x, trajectory[i].z, 0);
      ctx.lineTo(p.x, p.y);
    }
    ctx.strokeStyle = "rgba(6, 182, 212, 0.25)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 5]);
    ctx.stroke();

    // 3D Parabolic arc line (with elevation y)
    ctx.beginPath();
    const startArc = worldToScreen(trajectory[0].x, trajectory[0].z, trajectory[0].y);
    ctx.moveTo(startArc.x, startArc.y);
    for (let i = 1; i < trajectory.length; i++) {
      const p = worldToScreen(trajectory[i].x, trajectory[i].z, trajectory[i].y);
      ctx.lineTo(p.x, p.y);
    }
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(6, 182, 212, 0.85)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Apex marker (highest point)
    let maxY = 0;
    let apexIdx = 0;
    for (let i = 0; i < trajectory.length; i++) {
      if (trajectory[i].y > maxY) {
        maxY = trajectory[i].y;
        apexIdx = i;
      }
    }
    if (apexIdx > 0 && maxY > 5) {
      const apexPos = worldToScreen(trajectory[apexIdx].x, trajectory[apexIdx].z, trajectory[apexIdx].y);
      ctx.beginPath();
      ctx.arc(apexPos.x, apexPos.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#10b981";
      ctx.fill();

      ctx.font = "8px monospace";
      ctx.fillStyle = "rgba(16, 185, 129, 0.8)";
      ctx.textAlign = "center";
      ctx.fillText(`APEX ${maxY.toFixed(0)}m`, apexPos.x, apexPos.y - 7);
    }

    // Impact point crosshair & range indicator
    const impactPoint = trajectory[trajectory.length - 1];
    const impactPos = worldToScreen(impactPoint.x, impactPoint.z, 0);

    // Crosshair rings
    ctx.beginPath();
    ctx.arc(impactPos.x, impactPos.y, 8, 0, Math.PI * 2);
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(impactPos.x, impactPos.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#ef4444";
    ctx.fill();

    // Crosshair ticks
    const cs = 14;
    ctx.beginPath();
    ctx.moveTo(impactPos.x - cs, impactPos.y);
    ctx.lineTo(impactPos.x + cs, impactPos.y);
    ctx.moveTo(impactPos.x, impactPos.y - cs);
    ctx.lineTo(impactPos.x, impactPos.y + cs);
    ctx.strokeStyle = "rgba(239, 68, 68, 0.7)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Impact distance label
    const groundDist = Math.sqrt(impactPoint.x * impactPoint.x + impactPoint.z * impactPoint.z);
    ctx.font = "bold 10px monospace";
    ctx.fillStyle = "#f87171";
    ctx.textAlign = "center";
    ctx.fillText(`${groundDist.toFixed(0)}m`, impactPos.x, impactPos.y + 20);

    ctx.restore();
  }

  // Draw In-Flight Projectile Tracer
  function drawInFlightProjectile() {
    if (!projectileActive || !inFlightTrajectory || projectileIndex < 0) return;

    const currentPt = inFlightTrajectory[projectileIndex];
    if (!currentPt) return;

    const screenPos = worldToScreen(currentPt.x, currentPt.z, currentPt.y);

    ctx.save();

    // Tracer smoke tail (last 10 points)
    const tailStart = Math.max(0, projectileIndex - 12);
    ctx.beginPath();
    const pStart = worldToScreen(inFlightTrajectory[tailStart].x, inFlightTrajectory[tailStart].z, inFlightTrajectory[tailStart].y);
    ctx.moveTo(pStart.x, pStart.y);
    for (let i = tailStart + 1; i <= projectileIndex; i++) {
      const p = worldToScreen(inFlightTrajectory[i].x, inFlightTrajectory[i].z, inFlightTrajectory[i].y);
      ctx.lineTo(p.x, p.y);
    }
    ctx.strokeStyle = "rgba(251, 191, 36, 0.8)";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Glowing warhead
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#fef08a";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(239, 68, 68, 0.5)";
    ctx.fill();

    ctx.restore();
  }

  // Draw Targets
  function drawTargets() {
    for (const target of targets) {
      const pos = worldToScreen(target.x, target.z, 0);
      const isHovered = hoveredTargetId === target.id;
      const size = Math.max(12, target.size * 2.2 * cameraZoom);

      ctx.save();
      ctx.translate(pos.x, pos.y);

      if (target.destroyed) {
        // Destroyed target wreckage
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.7, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(15, 23, 42, 0.7)";
        ctx.fill();
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.font = "bold 12px monospace";
        ctx.fillStyle = "#64748b";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("✕", 0, 0);

        ctx.font = "8px monospace";
        ctx.fillStyle = "#475569";
        ctx.fillText("DESTROYED", 0, size + 4);
        ctx.restore();
        continue;
      }

      const color = TARGET_COLORS[target.type] || "#06b6d4";
      const healthPct = Math.max(0, target.health / target.maxHealth);

      // Target lock bracket if hovered
      if (isHovered) {
        const b = size + 8;
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 2;

        // 4 corner brackets
        ctx.beginPath();
        ctx.moveTo(-b, -b + 6); ctx.lineTo(-b, -b); ctx.lineTo(-b + 6, -b);
        ctx.moveTo(b - 6, -b); ctx.lineTo(b, -b); ctx.lineTo(b, -b + 6);
        ctx.moveTo(b, b - 6); ctx.lineTo(b, b); ctx.lineTo(b - 6, b);
        ctx.moveTo(-b + 6, b); ctx.lineTo(-b, b); ctx.lineTo(-b, b - 6);
        ctx.stroke();

        // Pulsing lock ring
        ctx.beginPath();
        ctx.arc(0, 0, size + 12 + 2 * Math.sin(Date.now() * 0.01), 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(16, 185, 129, 0.4)";
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Ground shadow
      ctx.beginPath();
      ctx.ellipse(0, 4, size * 0.8, size * 0.3, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.fill();

      // Target Body Icon
      ctx.beginPath();
      if (target.type === "heavy") {
        // Hexagon
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
          const x = Math.cos(a) * size;
          const y = Math.sin(a) * size;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      } else if (target.type === "command") {
        // Star
        ctx.arc(0, 0, size, 0, Math.PI * 2);
      } else if (target.type === "supply") {
        // Square
        ctx.roundRect(-size * 0.8, -size * 0.8, size * 1.6, size * 1.6, 4);
      } else {
        // Triangle/Diamond for light/medium
        ctx.moveTo(0, -size);
        ctx.lineTo(size * 0.9, size * 0.7);
        ctx.lineTo(-size * 0.9, size * 0.7);
      }
      ctx.closePath();

      // Gradient Fill
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
      grad.addColorStop(0, color);
      grad.addColorStop(1, "#0f172a");
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = target.hit ? "#fef08a" : color;
      ctx.lineWidth = target.hit ? 3 : 1.5;
      ctx.stroke();

      // Center symbol
      ctx.font = `bold ${Math.max(10, size * 0.7)}px monospace`;
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(TYPE_ICONS[target.type] || "▲", 0, 0);

      // Health Bar
      const barW = size * 2.2;
      const barH = 4;
      const barX = -barW / 2;
      const barY = -size - 9;

      ctx.fillStyle = "rgba(15, 23, 42, 0.8)";
      ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

      const hpColor = healthPct > 0.5 ? "#10b981" : healthPct > 0.25 ? "#f59e0b" : "#ef4444";
      ctx.fillStyle = hpColor;
      ctx.fillRect(barX, barY, barW * healthPct, barH);

      // Target Label
      const dist = Math.sqrt(target.x * target.x + target.z * target.z);
      ctx.font = "bold 8px monospace";
      ctx.fillStyle = isHovered ? "#34d399" : "rgba(255, 255, 255, 0.75)";
      ctx.textAlign = "center";
      ctx.fillText(`${target.type.toUpperCase()} [${dist.toFixed(0)}m]`, 0, size + 12);

      ctx.restore();
    }
  }

  // Draw Explosions and Damage Shockwaves
  function drawImpacts(delta: number) {
    for (let i = impactEffects.length - 1; i >= 0; i--) {
      const imp = impactEffects[i];
      imp.time += delta;
      if (imp.time >= imp.maxTime) {
        impactEffects.splice(i, 1);
        continue;
      }

      const pos = worldToScreen(imp.x, imp.z, 0);
      const progress = imp.time / imp.maxTime;
      const radius = imp.radius * 2 * (1 + progress * 2.5);
      const alpha = 1 - progress;

      ctx.save();

      // Shockwave ring
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(239, 68, 68, ${alpha * 0.9})`;
      ctx.lineWidth = 3 * (1 - progress);
      ctx.stroke();

      // Inner fire blast
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(251, 191, 36, ${alpha * 0.6})`;
      ctx.fill();

      // Ground blast scorch mark
      ctx.beginPath();
      ctx.ellipse(pos.x, pos.y, radius * 0.35, radius * 0.15, 0, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(30, 20, 15, ${alpha * 0.7})`;
      ctx.fill();

      ctx.restore();
    }
  }

  // Draw Animated Particles
  function drawParticles(delta: number) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += delta;
      if (p.life >= p.maxLife) {
        particles.splice(i, 1);
        continue;
      }

      p.x += p.vx * delta * 60;
      p.y += p.vy * delta * 60;
      p.alpha = 1 - p.life / p.maxLife;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 - p.life / p.maxLife), 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }
  }

  // Draw Floating Damage Numbers & Combat Text
  function drawFloatingTexts(delta: number) {
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.life += delta;
      if (ft.life >= 1.5) {
        floatingTexts.splice(i, 1);
        continue;
      }

      ft.y += ft.vy * delta * 60;
      ft.alpha = 1 - ft.life / 1.5;

      ctx.save();
      ctx.font = "bold 13px monospace";
      ctx.fillStyle = ft.color;
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.textAlign = "center";
      ctx.shadowColor = "#000000";
      ctx.shadowBlur = 4;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  }

  // Draw Tactical Reticle under Mouse Cursor
  function drawTacticalCursor() {
    const worldCoord = screenToWorld(mouseScreenPos.x, mouseScreenPos.y);
    const dist = Math.sqrt(worldCoord.x * worldCoord.x + worldCoord.z * worldCoord.z);
    const brg = Math.atan2(worldCoord.x, worldCoord.z) * (180 / Math.PI);

    if (worldCoord.z > 0 && worldCoord.z < 800) {
      ctx.save();
      ctx.font = "9px monospace";
      ctx.fillStyle = "rgba(6, 182, 212, 0.6)";
      ctx.fillText(`RNG: ${dist.toFixed(0)}m | BRG: ${brg > 0 ? "+" : ""}${brg.toFixed(1)}°`, mouseScreenPos.x + 12, mouseScreenPos.y - 12);
      ctx.restore();
    }
  }

  // Render Loop
  function render(time: number) {
    const delta = Math.min((time - lastTime) / 1000, 0.1);
    lastTime = time;

    radarAngle -= delta * 1.5; // Radar sweep
    if (muzzleFlashTime > 0) {
      muzzleFlashTime = Math.max(0, muzzleFlashTime - delta * 3);
    }

    // Step in-flight projectile
    if (projectileActive && inFlightTrajectory) {
      const stepSpeed = Math.max(1, Math.floor(inFlightTrajectory.length / 25));
      projectileIndex += stepSpeed;
      if (projectileIndex >= inFlightTrajectory.length - 1) {
        projectileIndex = inFlightTrajectory.length - 1;
        projectileActive = false;

        // Trigger impact on landing
        const lastPt = inFlightTrajectory[inFlightTrajectory.length - 1];
        spawnImpactExplosion(lastPt.x, lastPt.z);
      }
    }

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw layers
    drawBackground();
    drawTrajectoryPrediction();
    drawTargets();
    drawInFlightProjectile();
    drawPlayerCannon();
    drawImpacts(delta);
    drawParticles(delta);
    drawFloatingTexts(delta);
    drawTacticalCursor();
  }

  function spawnImpactExplosion(x: number, z: number) {
    const pos = worldToScreen(x, z, 0);

    impactEffects.push({
      x,
      z,
      radius: 20,
      time: 0,
      maxTime: 1.2,
    });

    // Particle burst
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      particles.push({
        x: pos.x,
        y: pos.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        color: Math.random() > 0.4 ? "#f59e0b" : "#ef4444",
        size: Math.random() * 4 + 2,
        alpha: 1,
        life: 0,
        maxLife: Math.random() * 0.6 + 0.4,
      });
    }
  }

  function animate(time: number = performance.now()) {
    render(time);
    animationId = requestAnimationFrame(animate);
  }

  function stop() {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  }

  // Handle Mouse Events for Hover & Click Targeting
  function onPointerMove(e: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    mouseScreenPos.x = e.clientX - rect.left;
    mouseScreenPos.y = e.clientY - rect.top;

    let foundTarget: Target2D | null = null;
    for (const t of targets) {
      if (t.destroyed) continue;
      const tPos = worldToScreen(t.x, t.z, 0);
      const dx = mouseScreenPos.x - tPos.x;
      const dy = mouseScreenPos.y - tPos.y;
      if (Math.sqrt(dx * dx + dy * dy) < Math.max(22, t.size * 2)) {
        foundTarget = t;
        break;
      }
    }

    hoveredTargetId = foundTarget ? foundTarget.id : null;
    const rawTarget = rawTargets.find((r) => r.id === foundTarget?.id) || null;
    onTargetHover?.(rawTarget);
  }

  function onClick(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    // Check if clicked a target directly
    for (const t of targets) {
      if (t.destroyed) continue;
      const tPos = worldToScreen(t.x, t.z, 0);
      const dx = sx - tPos.x;
      const dy = sy - tPos.y;
      if (Math.sqrt(dx * dx + dy * dy) < Math.max(22, t.size * 2)) {
        const rawTarget = rawTargets.find((r) => r.id === t.id);
        if (rawTarget) {
          onTargetClick?.(rawTarget);
          return;
        }
      }
    }

    // Otherwise calculate click aim towards that ground point
    const world = screenToWorld(sx, sy);
    if (world.z > 50) {
      const az = Math.atan2(world.x, world.z) * (180 / Math.PI);
      const dist = Math.sqrt(world.x * world.x + world.z * world.z);
      const estPower = Math.min(100, Math.max(20, Math.round((dist / 500) * 80)));
      config.onTargetClick?.({
        position: { x: world.x, y: 0, z: world.z },
        computedAzimuth: az,
        computedPower: estPower,
      });
    }
  }

  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("click", onClick);

  // Initialize
  resize();
  window.addEventListener("resize", resize);
  onProgress?.(100);
  onReady?.();

  // Public Scene API
  const scene: Arena2DScene = {
    canvas,
    ctx,
    animate: () => {
      if (!animationId) animate();
    },
    stop: () => {
      stop();
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("click", onClick);
      window.removeEventListener("resize", resize);
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    },
    setSize: resize,
    loadTrajectory: (data: { trajectory?: TrajectoryPoint[] } | null) => {
      if (!data?.trajectory) {
        trajectory = [];
        return;
      }
      trajectory = data.trajectory.map((p) => ({
        x: p.x,
        y: p.y || 0,
        z: p.z || 0,
        v: p.v || 0,
      }));
    },
    loadTargets: (newTargets: Target[]) => {
      rawTargets = newTargets;
      targets = newTargets.map((t) => ({
        id: t.id,
        x: t.position.x,
        y: t.position.y || 0,
        z: t.position.z,
        size: t.size,
        type: t.type,
        health: t.health,
        maxHealth: t.maxHealth,
        armor: t.armor || 0,
        points: t.points || 100,
        destroyed: !!t.destroyed,
        hit: t.hit || false,
      }));
    },
    setImpactEffect: (point: { x: number; y: number; z: number }, radius: number, label?: string) => {
      spawnImpactExplosion(point.x, point.z);
      if (label) {
        const sPos = worldToScreen(point.x, point.z, 0);
        floatingTexts.push({
          x: sPos.x,
          y: sPos.y - 20,
          text: label,
          color: label.includes("DESTROYED") ? "#ef4444" : "#10b981",
          alpha: 1,
          vy: -1.2,
          life: 0,
        });
      }
    },
    setCamera: (x: number, z: number, zoom: number) => {
      cameraX = x;
      cameraZ = z;
      cameraZoom = Math.max(0.5, Math.min(2.5, zoom));
    },
    setAimDirection: (azimuth: number, elevation?: number) => {
      aimAzimuth = azimuth;
      if (elevation !== undefined) {
        // can be used for elevation effects
      }
    },
    triggerFireAnimation: (shotTrajectory) => {
      muzzleFlashTime = 1.0;
      inFlightTrajectory = shotTrajectory.map((p) => ({
        x: p.x,
        y: p.y || 0,
        z: p.z || 0,
      }));
      projectileIndex = 0;
      projectileActive = true;
    },
  };

  return scene;
}
