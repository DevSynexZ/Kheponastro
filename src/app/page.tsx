"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import CombatTransition from "@/components/CombatTransition";
import HomeComponent from "@/components/HomeComponents/HomeComponent";
import MenuComponent from "@/components/MenuComponents/MenuComponent";

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
  const [inMenu, setInMenu] = useState<boolean>(false);
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
    setIsEntering(false);
    setInMenu(true);
    // router.push("/arena");
  };

 return (
  <main className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden text-slate-100 font-sans selection:bg-emerald-500/40 bg-[#030508]">
    {/* Cinematic Transition Overlay */}
    <CombatTransition
      isEntering={isEntering}
      onLoadingComplete={handleLoadingComplete}
      trajectoryData={trajectoryData}
    />

    {/* Top Header HUD (Global status) */}
    <div className="relative z-20 w-full px-6 py-4 flex justify-between items-center text-xs font-mono text-cyan-400">
      <div className="flex items-center gap-2">
        <span className={`w-2.5 h-2.5 rounded-full ${backendError ? 'bg-red-500' : 'bg-emerald-400 animate-pulse'}`} />
        <span>SYS STATUS: {backendError ? 'OFFLINE' : backend?.status || 'INITIALIZING...'}</span>
      </div>
      <div className="hidden sm:flex items-center gap-4 text-slate-400">
        <span>ENGINE: {backend?.engine || 'FASTAPI / NUMPY'}</span>
      </div>
    </div>

    {/* Conditional View Rendering (Pass props if needed by HomeComponent) */}
    <div className="flex-1 flex flex-col justify-center">
      {!inMenu ? (
        <HomeComponent 
          onEnterArena={handleLoadingComplete} 
          trajectoryLoading={trajectoryLoading}
          trajectoryData={trajectoryData}
        />
      ) : (
        <MenuComponent onReturnHome={() => setInMenu(false)} />
      )}
    </div>

    {/* Bottom Footer Status Bar */}
    <footer className="relative z-20 w-full px-6 py-4 border-t border-white/10 backdrop-blur-md bg-black/60 flex flex-wrap items-center justify-between text-xs font-mono text-slate-400">
      <div>KHEPONASTRO BATTLEFIELD ENGINE © 2026</div>
      <div>{inMenu ? "COMMAND MENU ACTIVE" : "SECURE LINK READY"}</div>
    </footer>
  </main>
);
}