"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { playHUDBeep, playCannonFire } from "@/lib/audio";
import { AimState, Vector2 } from "@/lib/gameTypes";

interface AimingControlsProps {
  aimState: AimState;
  onAimChange: (angle: number, power: number, azimuth?: number) => void;
  onFire: (azimuth?: number) => void;
  active: boolean;
  disabled?: boolean;
  canvasRef: React.RefObject<HTMLDivElement | null>;
}

export default function AimingControls({
  aimState,
  onAimChange,
  onFire,
  active,
  disabled = false,
  canvasRef,
}: AimingControlsProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<Vector2 | null>(null);
  const aimStartRef = useRef({
    angle: aimState.angle,
    power: aimState.power,
    azimuth: aimState.azimuth ?? 0,
  });
  const lastFireTime = useRef(0);
  const fireCooldown = 600; // ms

  // Clamp helper functions
  const clampAngle = (a: number) => Math.max(5, Math.min(85, a));
  const clampPower = (p: number) => Math.max(10, Math.min(100, p));
  const clampAzimuth = (az: number) => Math.max(-60, Math.min(60, az));

  // Pointer Down (Mouse or Touch on Arena Canvas)
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (disabled || !active) return;

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      dragStartRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      aimStartRef.current = {
        angle: aimState.angle,
        power: aimState.power,
        azimuth: aimState.azimuth ?? 0,
      };
      setIsDragging(true);
    },
    [disabled, active, aimState.angle, aimState.power, aimState.azimuth, canvasRef]
  );

  // Pointer Move (Drag to adjust azimuth and elevation)
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging || !dragStartRef.current || disabled || !active) return;

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;

      const deltaX = currentX - dragStartRef.current.x;
      const deltaY = dragStartRef.current.y - currentY; // Up is positive

      // Horizontal drag adjusts azimuth bearing (-60 to +60 deg)
      // Vertical drag adjusts elevation angle (5 to 85 deg)
      const azDelta = deltaX * 0.15;
      const angleDelta = deltaY * 0.15;

      const newAzimuth = clampAzimuth(aimStartRef.current.azimuth + azDelta);
      const newAngle = clampAngle(aimStartRef.current.angle + angleDelta);

      onAimChange(
        Math.round(newAngle * 10) / 10,
        aimStartRef.current.power,
        Math.round(newAzimuth * 10) / 10
      );
    },
    [isDragging, disabled, active, onAimChange, canvasRef]
  );

  const handlePointerUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    dragStartRef.current = null;
  }, [isDragging]);

  // Fire handler with safety cooldown
  const handleFire = useCallback(() => {
    if (disabled || !active) return;
    const now = Date.now();
    if (now - lastFireTime.current < fireCooldown) return;
    lastFireTime.current = now;

    playCannonFire();
    onFire(aimState.azimuth ?? 0);
  }, [disabled, active, onFire, aimState.azimuth]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled || !active) return;
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName)) return;

      let newAngle = aimState.angle;
      let newPower = aimState.power;
      let newAzimuth = aimState.azimuth ?? 0;
      let changed = false;

      switch (e.key) {
        // Bearing / Azimuth
        case "ArrowLeft":
        case "a":
        case "A":
          newAzimuth = clampAzimuth(newAzimuth - 2);
          changed = true;
          break;
        case "ArrowRight":
        case "d":
        case "D":
          newAzimuth = clampAzimuth(newAzimuth + 2);
          changed = true;
          break;

        // Elevation Angle
        case "ArrowUp":
        case "w":
        case "W":
          newAngle = clampAngle(newAngle + 1);
          changed = true;
          break;
        case "ArrowDown":
        case "s":
        case "S":
          newAngle = clampAngle(newAngle - 1);
          changed = true;
          break;

        // Power adjustment
        case "q":
        case "Q":
        case "[":
          newPower = clampPower(newPower - 5);
          changed = true;
          break;
        case "e":
        case "E":
        case "]":
          newPower = clampPower(newPower + 5);
          changed = true;
          break;

        // Fire
        case " ":
        case "Enter":
          e.preventDefault();
          handleFire();
          return;
      }

      if (changed) {
        onAimChange(newAngle, newPower, newAzimuth);
        playHUDBeep(700, 0.03, 0.1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [disabled, active, aimState.angle, aimState.power, aimState.azimuth, onAimChange, handleFire]);

  // Bind mouse/pointer events to the canvas container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onDown = (e: PointerEvent) => handlePointerDown(e as unknown as React.PointerEvent<HTMLDivElement>);
    const onMove = (e: PointerEvent) => handlePointerMove(e as unknown as React.PointerEvent<HTMLDivElement>);
    const onUp = () => handlePointerUp();

    canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [handlePointerDown, handlePointerMove, handlePointerUp, canvasRef]);

  if (!active) return null;

  return (
    <>
      {/* Visual drag indicator overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-10 pointer-events-none flex items-center justify-center bg-cyan-950/10"
          >
            <div className="bg-slate-950/80 backdrop-blur-md px-4 py-2 rounded-xl border border-cyan-500/30 text-center font-mono">
              <span className="text-cyan-400 text-xs">AIMING: </span>
              <span className="text-emerald-400 font-bold">{aimState.angle.toFixed(1)}° ELEV</span>
              <span className="text-slate-400 mx-2">|</span>
              <span className="text-amber-400 font-bold">{(aimState.azimuth ?? 0).toFixed(1)}° AZ</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Tactical Aiming Console (Desktop & Mobile accessible) */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-20 pointer-events-auto flex flex-col items-center gap-2">
        {/* On-Screen Fine Controls Bar */}
        <div className="bg-slate-950/90 backdrop-blur-xl border border-cyan-500/30 px-3 py-2 rounded-2xl flex flex-wrap items-center justify-center gap-3 shadow-[0_4px_25px_rgba(0,0,0,0.8)]">
          {/* Azimuth / Yaw */}
          <div className="flex items-center gap-1.5 bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-700/60 font-mono text-xs">
            <span className="text-slate-400 text-[10px]">BEARING:</span>
            <button
              onClick={() => onAimChange(aimState.angle, aimState.power, clampAzimuth((aimState.azimuth ?? 0) - 2))}
              disabled={disabled}
              className="px-2 py-0.5 bg-slate-800 hover:bg-cyan-500/30 active:scale-95 text-cyan-400 font-bold rounded cursor-pointer transition disabled:opacity-40"
              title="Turn Left (A / Left Arrow)"
            >
              ◄
            </button>
            <span className="text-amber-400 font-bold min-w-[44px] text-center tabular-nums">
              {(aimState.azimuth ?? 0) > 0 ? `+${(aimState.azimuth ?? 0).toFixed(0)}°` : `${(aimState.azimuth ?? 0).toFixed(0)}°`}
            </span>
            <button
              onClick={() => onAimChange(aimState.angle, aimState.power, clampAzimuth((aimState.azimuth ?? 0) + 2))}
              disabled={disabled}
              className="px-2 py-0.5 bg-slate-800 hover:bg-cyan-500/30 active:scale-95 text-cyan-400 font-bold rounded cursor-pointer transition disabled:opacity-40"
              title="Turn Right (D / Right Arrow)"
            >
              ►
            </button>
          </div>

          {/* Elevation Angle */}
          <div className="flex items-center gap-1.5 bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-700/60 font-mono text-xs">
            <span className="text-slate-400 text-[10px]">ELEV:</span>
            <button
              onClick={() => onAimChange(clampAngle(aimState.angle - 1), aimState.power, aimState.azimuth)}
              disabled={disabled}
              className="px-2 py-0.5 bg-slate-800 hover:bg-cyan-500/30 active:scale-95 text-cyan-400 font-bold rounded cursor-pointer transition disabled:opacity-40"
              title="Lower Elevation (S / Down Arrow)"
            >
              ▼
            </button>
            <span className="text-cyan-400 font-bold min-w-[36px] text-center tabular-nums">
              {aimState.angle.toFixed(0)}°
            </span>
            <button
              onClick={() => onAimChange(clampAngle(aimState.angle + 1), aimState.power, aimState.azimuth)}
              disabled={disabled}
              className="px-2 py-0.5 bg-slate-800 hover:bg-cyan-500/30 active:scale-95 text-cyan-400 font-bold rounded cursor-pointer transition disabled:opacity-40"
              title="Raise Elevation (W / Up Arrow)"
            >
              ▲
            </button>
          </div>

          {/* Power */}
          <div className="flex items-center gap-1.5 bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-700/60 font-mono text-xs">
            <span className="text-slate-400 text-[10px]">PWR:</span>
            <button
              onClick={() => onAimChange(aimState.angle, clampPower(aimState.power - 5), aimState.azimuth)}
              disabled={disabled}
              className="px-2 py-0.5 bg-slate-800 hover:bg-cyan-500/30 active:scale-95 text-cyan-400 font-bold rounded cursor-pointer transition disabled:opacity-40"
              title="Reduce Power (Q / [)"
            >
              −
            </button>
            <span className="text-emerald-400 font-bold min-w-[36px] text-center tabular-nums">
              {aimState.power}%
            </span>
            <button
              onClick={() => onAimChange(aimState.angle, clampPower(aimState.power + 5), aimState.azimuth)}
              disabled={disabled}
              className="px-2 py-0.5 bg-slate-800 hover:bg-cyan-500/30 active:scale-95 text-cyan-400 font-bold rounded cursor-pointer transition disabled:opacity-40"
              title="Increase Power (E / ])"
            >
              +
            </button>
          </div>

          {/* Big Fire Button */}
          <button
            onClick={handleFire}
            disabled={disabled}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 active:scale-95 text-white font-extrabold text-sm tracking-wider uppercase shadow-[0_0_20px_rgba(239,68,68,0.6)] cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none border border-red-400/50"
            title="FIRE CANNON (SPACE / ENTER)"
          >
            <span>🔥</span>
            <span>FIRE</span>
          </button>
        </div>

        {/* Quick Help Tip */}
        <p className="font-mono text-[10px] text-cyan-400/60 bg-slate-950/70 px-3 py-0.5 rounded-full backdrop-blur border border-cyan-500/10">
          Aim: Drag on screen or A/D (Yaw), W/S (Pitch), [ / ] (Power), SPACE to Fire
        </p>
      </div>
    </>
  );
}
