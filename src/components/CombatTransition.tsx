"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CombatTransitionProps {
  isEntering: boolean;
  onLoadingComplete: () => void;
}

export default function CombatTransition({
  isEntering,
  onLoadingComplete,
}: CombatTransitionProps) {
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [phase, setPhase] = useState<"idle" | "launch" | "zoom" | "loaded">("idle");

  useEffect(() => {
    if (isEntering) {
      setPhase("launch");

      // Simulate heavy packages / environment loading progress
      const interval = setInterval(() => {
        setLoadingProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => {
              setPhase("zoom");
              setTimeout(onLoadingComplete, 800); // Complete transition after zoom
            }, 400);
            return 100;
          }
          return prev + 12;
        });
      }, 150);

      return () => clearInterval(interval);
    }
  }, [isEntering, onLoadingComplete]);

  if (!isEntering) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex items-center justify-center overflow-hidden"
      >
        {/* Tactical Grid Background Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#06b6d410_1px,transparent_1px),linear-gradient(to_bottom,#06b6d410_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

        {/* Dual Missile Launch Animation */}
        {phase === "launch" && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {/* Missile 1 */}
            <motion.div
              initial={{ x: -300, y: 150, opacity: 0, scale: 0.5 }}
              animate={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="absolute flex items-center gap-2"
            >
              <div className="w-12 h-2 bg-gradient-to-r from-transparent via-cyan-400 to-emerald-400 rounded-full shadow-[0_0_15px_#22d3ee]" />
              <div className="w-3 h-3 bg-cyan-300 rounded-full animate-ping" />
            </motion.div>

            {/* Missile 2 */}
            <motion.div
              initial={{ x: -300, y: 180, opacity: 0, scale: 0.5 }}
              animate={{ x: 0, y: 30, opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
              className="absolute flex items-center gap-2"
            >
              <div className="w-12 h-2 bg-gradient-to-r from-transparent via-cyan-400 to-emerald-400 rounded-full shadow-[0_0_15px_#22d3ee]" />
              <div className="w-3 h-3 bg-cyan-300 rounded-full animate-ping" />
            </motion.div>
          </div>
        )}

        {/* Scope-O Fullscreen Cinematic Zoom & HUD */}
        <motion.div
          initial={{ scale: 0.1, opacity: 0, rotate: -45 }}
          animate={
            phase === "zoom" || phase === "launch"
              ? { scale: [0.1, 1, 1.1], opacity: 1, rotate: 0 }
              : {}
          }
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative flex flex-col items-center justify-center"
        >
          {/* Scope Outer Ring */}
          <div className="relative w-[320px] h-[320px] sm:w-[450px] sm:h-[450px] rounded-full border-4 border-cyan-500/60 shadow-[0_0_50px_rgba(6,182,212,0.4)] flex items-center justify-center bg-slate-900/80 backdrop-blur-md">
            
            {/* Crosshairs */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-full h-[1px] bg-cyan-500/30" />
              <div className="absolute h-full w-[1px] bg-cyan-500/30" />
              <div className="w-3 h-3 rounded-full border-2 border-emerald-400 bg-emerald-500/20 animate-pulse" />
            </div>

            {/* Scope Image Centerpiece */}
            <img
              src="/images/homepage/scope-o.png"
              alt="Scope Lens"
              className="w-36 h-36 object-contain filter drop-shadow-[0_0_20px_rgba(6,182,212,0.8)] animate-spin-slow"
            />

            {/* Tactical Readouts around scope */}
            <div className="absolute bottom-10 text-center">
              <p className="text-cyan-400 font-mono text-xs tracking-widest uppercase mb-1">
                INITIALIZING COMBAT ARENA
              </p>
              <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-cyan-500/30">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-150"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
              <p className="text-emerald-400 font-mono text-xs mt-2">
                LOADING ASSETS: {loadingProgress}%
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}