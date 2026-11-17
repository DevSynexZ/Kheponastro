"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createTopDownEngine, TopDownEngine } from "@/lib/topDownEngine";
import GameHUD from "@/components/GameHUD";
import { GameHUDState, WeaponType } from "@/lib/gameTypes";
import { initAudio } from "@/lib/audio";

export default function GameArena() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<TopDownEngine | null>(null);

  // HUD State synced from the engine
  const [hud, setHud] = useState<GameHUDState>({
    health: 100,
    maxHealth: 100,
    shield: 50,
    maxShield: 50,
    score: 0,
    highScore: 0,
    wave: 1,
    enemiesRemaining: 0,
    weapon: "cannon",
    weaponAmmo: -1,
    isPaused: false,
    isGameOver: false,
    isWaveCleared: false,
  });

  // Track pressed keys
  const keysDown = useRef<Record<string, boolean>>({});

  // Initialize Audio & Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Start Web Audio on interaction
    initAudio();

    const engine = createTopDownEngine(canvas, {
      onHUDUpdate: (newHud) => setHud(newHud),
      onWaveClear: () => {},
      onGameOver: () => {},
    });

    engineRef.current = engine;
    engine.start();

    // Resize listener
    const handleResize = () => {
      engine.resize();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      engine.stop();
      engineRef.current = null;
    };
  }, []);

  // Keyboard Event Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) return;

      keysDown.current[e.key] = true;
      keysDown.current[e.code] = true;
      keysDown.current[e.key.toLowerCase()] = true;
      engineRef.current?.setKey(e.key, true);
      engineRef.current?.setKey(e.code, true);

      // Weapon switching shortcuts 1..5
      if (e.key === "1") engineRef.current?.selectWeapon("cannon");
      if (e.key === "2") engineRef.current?.selectWeapon("dual");
      if (e.key === "3") engineRef.current?.selectWeapon("rapid");
      if (e.key === "4") engineRef.current?.selectWeapon("shotgun");
      if (e.key === "5") engineRef.current?.selectWeapon("rocket");

      // Pause toggle (handled directly by engine to avoid double-toggle)
      if (e.key === "Escape") {
        e.preventDefault();
      }

      // Next wave or Restart
      if (e.key === "r" || e.key === "R") {
        if (hud.isGameOver) engineRef.current?.restart();
      }

      if (e.key === " " && hud.isWaveCleared) {
        e.preventDefault();
        engineRef.current?.nextWave();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      delete keysDown.current[e.key];
      delete keysDown.current[e.code];
      delete keysDown.current[e.key.toLowerCase()];
      engineRef.current?.setKey(e.key, false);
      engineRef.current?.setKey(e.code, false);
    };

    const handleBlur = () => {
      keysDown.current = {};
      engineRef.current?.setKeys({});
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, [hud.isPaused, hud.isGameOver, hud.isWaveCleared]);

  // Mouse & Touch Handlers
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    engineRef.current?.setMousePos(x, y);
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    initAudio();
    if (e.button === 0) {
      engineRef.current?.setMouseDown(true);
      engineRef.current?.triggerFire();
    }
  }, []);

  const handlePointerUp = useCallback(() => {
    engineRef.current?.setMouseDown(false);
  }, []);

  return (
    <main className="relative w-screen h-screen bg-[#030712] overflow-hidden select-none">
      {/* 2D Canvas Battlefield */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full cursor-crosshair"
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Action Tactical HUD */}
      <GameHUD
        hud={hud}
        onWeaponSelect={(w: WeaponType) => engineRef.current?.selectWeapon(w)}
        onPauseToggle={() => {
          engineRef.current?.togglePause();
        }}
        onNextWave={() => engineRef.current?.nextWave()}
        onRestart={() => engineRef.current?.restart()}
        onExit={() => {
          router.push("/");
        }}
      />
    </main>
  );
}
