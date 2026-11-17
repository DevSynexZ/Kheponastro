"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import CombatTransition from "@/components/CombatTransition";

interface HealthStatus {
  status: string;
  engine: string;
  solvers_ready: string[];
}

interface TrajectoryData {
  trajectory: Array<{ t: number; x: number; y: number; vx: number; vy: number; v: number }>;
  max_height: number;
  range: number;
  flight_time: number;
  apex_time: number;
  impact_velocity: number;
  params: {
    v0: number;
    angle: number;
    g: number;
    drag_coeff: number;
    mass: number;
    dt: number;
  };
}

export default function KheponastroHome() {
  const router = useRouter();
  const [backend, setBackend] = useState<HealthStatus | null>(null);
  const [backendError, setBackendError] = useState<boolean>(false);
  const [isEntering, setIsEntering] = useState<boolean>(false);
  const [trajectoryData, setTrajectoryData] = useState<TrajectoryData | null>(null);
  const [trajectoryLoading, setTrajectoryLoading] = useState(false);

  useEffect(() => {
    fetch("/api/py/health")
      .then((res) => {
        if (!res.ok) throw new Error("API offline");
        return res.json();
      })
      .then((data: HealthStatus) => setBackend(data))
      .catch(() => setBackendError(true));
  }, []);

  // Pre-fetch trajectory data for smoother transition
  const preloadTrajectory = async () => {
    setTrajectoryLoading(true);
    try {
      const res = await fetch("/api/py/simulate-trajectory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ v0: 50, angle: 45, drag_coeff: 0.02, mass: 1.0, dt: 0.01 }),
      });
      if (res.ok) {
        const data = await res.json();
        setTrajectoryData(data);
      }
    } catch (err) {
      console.warn("Failed to preload trajectory:", err);
    } finally {
      setTrajectoryLoading(false);
    }
  };

  const handleEnterArena = () => {
    router.push("/arena");
  };

  const handleLoadingComplete = () => {
    router.push("/arena");
  };

  return (
    <main className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden text-slate-100 font-sans selection:bg-emerald-500/40 bg-[#030508]">
      {/* Cinematic Transition Overlay Component */}
      <CombatTransition
        isEntering={isEntering}
        onLoadingComplete={handleLoadingComplete}
        trajectoryData={trajectoryData}
      />

      {/* Background War Image Layer */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-65 scale-105"
        style={{ backgroundImage: `url('/images/homepage/warHome.jpg')` }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-[#030508]/90 via-[#030508]/50 to-[#030508]/30 pointer-events-none" />

      {/* Top Header HUD */}
      <div className="relative z-20 w-full px-6 py-4 flex justify-between items-center text-xs font-mono text-cyan-400">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${backendError ? 'bg-red-500' : 'bg-emerald-400 animate-pulse'}`} />
          <span>SYS STATUS: {backendError ? 'OFFLINE' : backend?.status || 'INITIALIZING...'}</span>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-slate-400">
          <span>ENGINE: {backend?.engine || 'FASTAPI / NUMPY'}</span>
        </div>
      </div>

      {/* Center Hero Content */}
      <section className="relative z-20 max-w-6xl mx-auto px-6 py-16 flex flex-col items-center text-center my-auto space-y-8">
        {/* Cinematic Floating Headline with Perfectly Sized Custom Tank-K & Scope-O Images */}
        <div className="space-y-3">
          <h2 className="text-4xl sm:text-7xl lg:text-8xl font-tactical tracking-widest text-zinc-400 uppercase flex items-center justify-center flex-nowrap gap-1.5 sm:gap-3 drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)] [-webkit-text-stroke:2px_#27272a]">
            {/* Tank-K Image replacing K with precise text-relative sizing */}
            <span className="inline-flex items-center justify-center align-middle hover:scale-110 transition-transform duration-300">
              <img
                src="/images/homepage/tank-k.png"
                alt="Tank K"
                className="h-[2.5em] w-auto object-contain"
              />
            </span>
            <span>HEP</span>

            {/* Scope-O Image replacing O with precise text-relative sizing */}
            <span className="inline-flex items-center justify-center align-middle hover:scale-110 transition-transform duration-300">
              <img
                src="/images/homepage/scope-o.png"
                alt="Scope O"
                className="h-[2em] w-auto object-contain"
              />
            </span>

            <span>NASTRO</span>
          </h2>

          <p className="text-xs sm:text-sm font-mono text-cyan-400 tracking-[0.3em] uppercase pt-2 drop-shadow-md">
            Control THE DYNAMIC GAMING ENVIRONMENT — ADAPT. INTERCEPT.
            DESTROY.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={handleEnterArena}
            className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-extrabold text-sm tracking-wider uppercase transition shadow-[0_0_25px_rgba(16,185,129,0.5)] cursor-pointer transform hover:-translate-y-0.5 active:scale-95"
          >
            <Play className="w-5 h-5 fill-current" />
            ENTER COMBAT ARENA
          </button>

          {/* Quick Start direct link */}
          <a
            href="/arena"
            className="inline-flex items-center gap-2 px-6 py-4 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 font-mono text-xs border border-cyan-500/30 transition"
          >
            <span>⚡</span>
            <span>INSTANT DEPLOY</span>
          </a>

          {/* Preload indicator */}
          {trajectoryLoading && (
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400/70">
              <span className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
              <span>PRELOADING BALLISTICS...</span>
            </div>
          )}
          {trajectoryData && !trajectoryLoading && (
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>TRAJECTORY READY</span>
            </div>
          )}
        </div>
      </section>

      {/* Bottom Footer Status Bar */}
      <footer className="relative z-20 w-full px-6 py-4 border-t border-white/10 backdrop-blur-md bg-black/60 flex flex-wrap items-center justify-between text-xs font-mono text-slate-400">
        <div>KHEPONASTRO BATTLEFIELD ENGINE © 2026</div>
        <div>SECURE LINK ACTIVE</div>
      </footer>
    </main>
  );
}