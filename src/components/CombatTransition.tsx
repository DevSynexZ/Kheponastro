"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { playMissileLaunchHum, playExplosionImpact, playHUDBeep, playRadarPing, initAudio } from "@/lib/audio";
import { createCombatArena } from "@/lib/combatArena";

interface CombatTransitionProps {
  isEntering: boolean;
  onLoadingComplete: () => void;
  trajectoryData?: any; // Optional trajectory data from backend
}

export default function CombatTransition({
  isEntering,
  onLoadingComplete,
  trajectoryData,
}: CombatTransitionProps) {
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [phase, setPhase] = useState<"idle" | "launch" | "zoom" | "arena" | "loaded">("idle");
  const [arenaReady, setArenaReady] = useState(false);
  const arenaContainerRef = useRef<HTMLDivElement>(null);
  const arenaRef = useRef<any>(null);
  const audioInitialized = useRef(false);
  const phaseStartTime = useRef<number>(0);

  // Initialize audio on first interaction
  const ensureAudio = useCallback(() => {
    if (!audioInitialized.current) {
      initAudio();
      audioInitialized.current = true;
    }
  }, []);

  // Initialize Three.js arena during zoom phase
  useEffect(() => {
    if (phase === "zoom" && arenaContainerRef.current && !arenaRef.current) {
      try {
        const arena = createCombatArena({
          container: arenaContainerRef.current,
          onProgress: (p) => setLoadingProgress(p),
          onReady: () => {
            setArenaReady(true);
            // Load trajectory if provided
            if (trajectoryData) {
              arena.loadTrajectory(trajectoryData);
            }
          },
          onError: (err) => console.error("Arena init error:", err),
        });
        arenaRef.current = arena;
      } catch (err) {
        console.error("Failed to create arena:", err);
      }
    }

    // Cleanup on phase change or unmount
    return () => {
      if (arenaRef.current && phase !== "zoom" && phase !== "arena") {
        arenaRef.current.dispose();
        arenaRef.current = null;
        setArenaReady(false);
      }
    };
  }, [phase, trajectoryData]);

  // Main transition sequence
  useEffect(() => {
    if (isEntering) {
      ensureAudio();
      setPhase("launch");
      phaseStartTime.current = Date.now();

      // Play missile launch sound
      playMissileLaunchHum(2.5);

      // Phase 1: Launch (0-2s) - missiles animate
      // Phase 2: Zoom (2-3s) - scope zoom, arena initializes
      // Phase 3: Arena (3-5s) - Three.js scene loads, trajectory renders
      // Phase 4: Loaded - transition complete

      const launchTimeout = setTimeout(() => {
        setPhase("zoom");
        playRadarPing(); // Radar ping at zoom start
      }, 2000);

      const zoomTimeout = setTimeout(() => {
        setPhase("arena");
        playHUDBeep(600, 0.15, 0.25); // HUD ready beep
      }, 3000);

      const arenaTimeout = setTimeout(() => {
        setPhase("loaded");
        playExplosionImpact(0.8); // Impact sound on transition complete
        setTimeout(onLoadingComplete, 500);
      }, 5000);

      return () => {
        clearTimeout(launchTimeout);
        clearTimeout(zoomTimeout);
        clearTimeout(arenaTimeout);
      };
    } else {
      // Reset on exit
      setPhase("idle");
      setLoadingProgress(0);
      setArenaReady(false);
      if (arenaRef.current) {
        arenaRef.current.dispose();
        arenaRef.current = null;
      }
    }
  }, [isEntering, onLoadingComplete, ensureAudio, trajectoryData]);

  // Handle resize for Three.js
  useEffect(() => {
    if (arenaRef.current && arenaContainerRef.current) {
      const { clientWidth, clientHeight } = arenaContainerRef.current;
      arenaRef.current.setSize(clientWidth, clientHeight);
    }
  }, [phase]);

  // Allow pressing Escape to immediately skip
  useEffect(() => {
    if (!isEntering) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === " " || e.key === "Enter") {
        onLoadingComplete();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEntering, onLoadingComplete]);

  if (!isEntering) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.3 } }}
        className="fixed inset-0 z-50 bg-slate-950/98 backdrop-blur-xl flex items-center justify-center overflow-hidden"
        role="dialog"
        aria-label="Combat arena loading"
      >
        {/* Skip button in top right */}
        <div className="absolute top-6 right-6 z-50">
          <button
            onClick={onLoadingComplete}
            className="px-4 py-2 bg-slate-900/90 hover:bg-slate-800 text-cyan-400 hover:text-emerald-300 font-mono text-xs rounded-xl border border-cyan-500/30 transition cursor-pointer flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
          >
            <span>SKIP TRANSITION</span>
            <span>▶▶</span>
          </button>
        </div>
        {/* Tactical Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#06b6d410_1px,transparent_1px),linear-gradient(to_bottom,#06b6d410_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

        {/* Phase 1: Dual Missile Launch */}
        {phase === "launch" && (
          <motion.div
            key="launch"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            className="absolute inset-0 pointer-events-none flex items-center justify-center"
          >
            {/* Missile 1 */}
            <motion.div
              initial={{ x: -400, y: 100, opacity: 0, scale: 0.3, rotate: -15 }}
              animate={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="absolute flex items-center gap-3"
            >
              <motion.div
                animate={{ scaleX: [0, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-16 h-1.5 bg-gradient-to-r from-transparent via-cyan-400 to-emerald-400 rounded-full shadow-[0_0_20px_#22d3ee]"
              />
              <div className="w-4 h-4 bg-cyan-300 rounded-full shadow-[0_0_10px_#22d3ee] animate-ping" />
            </motion.div>

            {/* Missile 2 */}
            <motion.div
              initial={{ x: -400, y: 140, opacity: 0, scale: 0.3, rotate: 15 }}
              animate={{ x: 0, y: 40, opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
              className="absolute flex items-center gap-3"
            >
              <motion.div
                animate={{ scaleX: [0, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.1 }}
                className="w-16 h-1.5 bg-gradient-to-r from-transparent via-cyan-400 to-emerald-400 rounded-full shadow-[0_0_20px_#22d3ee]"
              />
              <div className="w-4 h-4 bg-cyan-300 rounded-full shadow-[0_0_10px_#22d3ee] animate-ping" />
            </motion.div>

            {/* Launch trail particles */}
            <div className="absolute bottom-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 pointer-events-none">
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0, opacity: 0.6 }}
                  animate={{ scale: 1, opacity: 0 }}
                  transition={{ duration: 1.5, delay: i * 0.1, repeat: Infinity, ease: "easeOut" }}
                  className="absolute w-2 h-2 bg-cyan-400/50 rounded-full"
                  style={{
                    left: `${50 + (Math.random() - 0.5) * 40}%`,
                    top: `${50 + (Math.random() - 0.5) * 40}%`,
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Phase 2 & 3: Scope Zoom + Three.js Arena */}
        <motion.div
          initial={{ scale: 0.1, opacity: 0, rotate: -45 }}
          animate={
            phase === "zoom" || phase === "arena" || phase === "loaded"
              ? { scale: [0.1, 1, 1.05], opacity: 1, rotate: 0 }
              : {}
          }
          exit={{ scale: 2, opacity: 0, rotate: 45 }}
          transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
          className="relative flex flex-col items-center justify-center w-full h-full"
        >
          {/* Three.js Arena Container (renders behind scope) */}
          {(phase === "arena" || phase === "loaded") && arenaContainerRef.current && (
            <div
              ref={arenaContainerRef}
              className="absolute inset-0 w-full h-full z-0"
              style={{ filter: "contrast(1.1) saturate(1.2)" }}
            />
          )}

          {/* Scope-O Fullscreen Cinematic Zoom & HUD */}
          <div className="relative z-10 flex flex-col items-center justify-center">
            {/* Scope Outer Ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="relative w-[320px] h-[320px] sm:w-[450px] sm:h-[450px] rounded-full border-4 border-cyan-500/60 shadow-[0_0_60px_rgba(6,182,212,0.5),inset_0_0_60px_rgba(6,182,212,0.1)] flex items-center justify-center bg-slate-900/90 backdrop-blur-md border-dashed"
            >
              {/* Crosshairs */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
                <div className="absolute h-full w-[1px] bg-gradient-to-b from-transparent via-cyan-500/50 to-transparent" />
                {/* Range indicators */}
                {[1, 2, 3].map((ring) => (
                  <motion.div
                    key={ring}
                    animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 2, delay: ring * 0.3, repeat: Infinity }}
                    className="absolute rounded-full border border-cyan-500/30"
                    style={{
                      width: `${60 + ring * 40}px`,
                      height: `${60 + ring * 40}px`,
                    }}
                  />
                ))}
                {/* Center dot */}
                <motion.div
                  animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="w-3 h-3 rounded-full border-2 border-emerald-400 bg-emerald-500/30"
                />
              </div>

              {/* Scope Image Centerpiece */}
              <motion.img
                src="/images/homepage/scope-o.png"
                alt="Scope Lens"
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="w-40 h-40 object-contain filter drop-shadow-[0_0_30px_rgba(6,182,212,0.9)]"
              />

              {/* Tactical Readouts around scope */}
              <div className="absolute bottom-12 text-center w-full px-4">
                <p className="text-cyan-400 font-mono text-xs tracking-widest uppercase mb-2 animate-pulse">
                  {phase === "zoom" ? "INITIALIZING COMBAT ARENA" : "ARENA ONLINE - TACTICAL SYSTEMS ACTIVE"}
                </p>
                <div className="w-64 h-2 bg-slate-800 rounded-full overflow-hidden border border-cyan-500/30 mx-auto">
                  <motion.div
                    className="h-full bg-gradient-to-r from-cyan-500 via-emerald-400 to-cyan-500 transition-all duration-300"
                    style={{ width: `${loadingProgress}%` }}
                    animate={{ backgroundPosition: ["0%", "200%", "0%"] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  />
                </div>
                <div className="flex justify-between text-xs font-mono text-slate-400 mt-2 px-2">
                  <span>ASSETS</span>
                  <span className="text-emerald-400">{loadingProgress}%</span>
                </div>
                {phase === "arena" && (
                  <p className="text-cyan-400 font-mono text-xs mt-2 animate-pulse">
                    TRAJECTORY DATA LOADED • RENDERING BALLISTICS
                  </p>
                )}
              </div>
            </motion.div>

            {/* Phase indicator */}
            <div className="mt-8 flex items-center gap-4 text-xs font-mono text-slate-500">
              <span className={`w-2 h-2 rounded-full ${phase === "launch" ? "bg-cyan-400 animate-pulse" : "bg-slate-600"}`} />
              <span className={`w-2 h-2 rounded-full ${phase === "zoom" || phase === "arena" ? "bg-cyan-400 animate-pulse" : "bg-slate-600"}`} />
              <span className={`w-2 h-2 rounded-full ${phase === "loaded" ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
            </div>
          </div>
        </motion.div>

        {/* HUD Corner Elements */}
        <div className="absolute inset-0 pointer-events-none p-6">
          {/* Top Left: System Status */}
          <div className="absolute top-0 left-0 flex flex-col gap-2">
            <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-lg border border-cyan-500/20">
              <span className={`w-2 h-2 rounded-full ${arenaReady ? "bg-emerald-400 animate-pulse" : "bg-cyan-400"}`} />
              <span className="font-mono text-xs text-cyan-400">RENDERER: {arenaReady ? "ACTIVE" : "INIT"}</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-lg border border-cyan-500/20">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span className="font-mono text-xs text-cyan-400">PHYSICS: RUNNING</span>
            </div>
          </div>

          {/* Top Right: Tactical Data */}
          <div className="absolute top-0 right-0 flex flex-col gap-2 items-end">
            <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-lg border border-cyan-500/20">
              <span className="font-mono text-xs text-slate-400">T+</span>
              <span className="font-mono text-xs text-cyan-400 tabular-nums">
                {(Date.now() - phaseStartTime.current) / 1000 > 0 ? ((Date.now() - phaseStartTime.current) / 1000).toFixed(1) : "0.0"}
              </span>
              <span className="font-mono text-xs text-slate-400">s</span>
            </div>
          </div>

          {/* Bottom Left: Coordinates */}
          <div className="absolute bottom-0 left-0 bg-slate-900/80 backdrop-blur px-4 py-2 rounded-lg border border-cyan-500/20">
            <div className="font-mono text-xs text-slate-400">COORDINATES</div>
            <div className="font-mono text-sm text-cyan-400 tabular-nums font-bold">
              X: 0.00  Y: 0.00  Z: 0.00
            </div>
          </div>

          {/* Bottom Right: Weapon Systems */}
          <div className="absolute bottom-0 right-0 bg-slate-900/80 backdrop-blur px-4 py-2 rounded-lg border border-cyan-500/20 text-right">
            <div className="font-mono text-xs text-slate-400">ORDNANCE</div>
            <div className="font-mono text-sm text-emerald-400 tabular-nums font-bold">READY</div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}