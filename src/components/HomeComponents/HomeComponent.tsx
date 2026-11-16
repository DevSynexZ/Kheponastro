"use client";

import React from "react";
import { Play } from "lucide-react";

interface HomeComponentProps {
  onEnterArena: () => void;
}

export default function HomeComponent({ onEnterArena }: HomeComponentProps) {
  return (
<div className="relative w-full flex-grow flex flex-col justify-center">
     <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-65 scale-105 transition-all duration-1000"
        style={{ backgroundImage: `url('/images/homepage/warHome.jpg')` }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-[#030508]/90 via-[#030508]/50 to-[#030508]/30 pointer-events-none" />
    <section className="relative z-20 max-w-6xl mx-auto px-6 py-16 flex flex-col items-center text-center my-auto space-y-8">
        
      <div className="space-y-3">
        <h2 className="text-4xl sm:text-7xl lg:text-8xl font-tactical tracking-widest text-zinc-400 uppercase flex items-center justify-center flex-nowrap gap-1.5 sm:gap-3 drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)] [-webkit-text-stroke:2px_#27272a]">
          {/* Tank-K Image */}
          <span className="inline-flex items-center justify-center align-middle hover:scale-110 transition-transform duration-300">
            <img
              src="/images/homepage/tank-k.png"
              alt="Tank K"
              className="h-[2.5em] w-auto object-contain"
            />
          </span>
          <span>HEP</span>

          {/* Scope-O Image */}
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
          Control THE DYNAMIC GAMING ENVIRONMENT — ADAPT. INTERCEPT. DESTROY.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="pt-4 flex flex-wrap justify-center gap-4">
        <button
          onClick={onEnterArena}
          className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-extrabold text-sm tracking-wider uppercase transition shadow-[0_0_25px_rgba(16,185,129,0.5)] cursor-pointer transform hover:-translate-y-0.5"
        >
          <Play className="w-5 h-5 fill-current" />
          ENTER COMBAT ARENA
        </button>
      </div>
    </section>
    </div>
  );
}