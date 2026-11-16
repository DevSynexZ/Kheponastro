"use client";

import React, { useEffect, useState } from "react";
import CombatTransition from "@/components/CombatTransition";
import HomeComponent from "@/components/HomeComponents/HomeComponent";
import MenuComponent from "@/components/MenuComponents/MenuComponent";

interface HealthStatus {
  status: string;
  engine: string;
  solvers_ready: string[];
}

export default function KheponastroHome() {
  const [backend, setBackend] = useState<HealthStatus | null>(null);
  const [backendError, setBackendError] = useState<boolean>(false);
  const [isEntering, setIsEntering] = useState<boolean>(false);
  const [inMenu, setInMenu] = useState<boolean>(false);

  useEffect(() => {
    fetch("/api/py/health")
      .then((res) => {
        if (!res.ok) throw new Error("API offline");
        return res.json();
      })
      .then((data: HealthStatus) => setBackend(data))
      .catch(() => setBackendError(true));
  }, []);

  const handleEnterArena = () => {
    setIsEntering(true);
  };

  const handleLoadingComplete = () => {
    setIsEntering(false);
    setInMenu(true);
  };

  return (
    <main className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden text-slate-100 font-sans selection:bg-emerald-500/40 bg-[#030508]">
      {/* Cinematic Transition Overlay */}
      <CombatTransition
        isEntering={isEntering}
        onLoadingComplete={handleLoadingComplete}
      />

      {/* Background War Image Layer */}
      {/* <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-65 scale-105 transition-all duration-1000"
        style={{ backgroundImage: `url('/images/homepage/warHome.jpg')` }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-[#030508]/90 via-[#030508]/50 to-[#030508]/30 pointer-events-none" /> */}

      {/* Conditional View Rendering */}
      {!inMenu ? (
        <HomeComponent onEnterArena={handleEnterArena} />
      ) : (
        <MenuComponent onReturnHome={() => setInMenu(false)} />
      )}

      {/* Bottom Footer Status Bar */}
      <footer className="relative z-20 w-full px-6 py-4 border-t border-white/10 backdrop-blur-md bg-black/60 flex flex-wrap items-center justify-between text-xs font-mono text-slate-400">
        <div>KHEPONASTRO BATTLEFIELD ENGINE © 2026</div>
        <div>{inMenu ? "COMMAND MENU ACTIVE" : "SECURE LINK READY"}</div>
      </footer>
    </main>
  );
}