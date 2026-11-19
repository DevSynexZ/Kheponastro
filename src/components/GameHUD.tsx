
"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GameHUDState, WeaponType, WEAPON_REGISTRY } from "@/lib/gameTypes";
import { toggleAudioMute, isAudioMuted, playHUDBeep } from "@/lib/audio";

interface GameHUDProps {
  hud: GameHUDState;
  onWeaponSelect: (w: WeaponType) => void;
  onPauseToggle: () => void;
  onNextWave: () => void;
  onRestart: () => void;
  onExit: () => void;
}

const SECTOR_WIDTH = 1600;
const SECTOR_HEIGHT = 1000;

function TacticalRadar({ radar }: { radar?: GameHUDState["radar"] }) {
  if (!radar) return null;

  const spanX = Math.max(1, radar.worldMaxX - radar.worldMinX);
  const spanY = Math.max(1, radar.worldMaxY - radar.worldMinY);

  const SECTOR_BG_IMAGES: Record<
    NonNullable<GameHUDState["radar"]>["sectors"][number]["key"],
    string
  > = {
    main: "/BG31Main.webp",
    right: "/BG32RightMain.jpeg",
    bottom: "/BG33BottomMain.jpeg",
    diagonal: "/BG34DiagonalMain.jpeg",
  };

  return (
    <aside
      aria-label="Tactical Sector Radar"
      className="fixed top-14 right-3 md:bottom-6 md:right-6 z-30 pointer-events-none select-none"
    >
      <div className="bg-slate-950/90 backdrop-blur-md p-3 rounded-2xl border border-cyan-500/30 shadow-[0_4px_25px_rgba(0,0,0,0.8)] w-56 sm:w-64 md:w-72">
        <div className="flex items-center justify-between text-[10px] font-mono mb-1.5">
          <span className="text-cyan-400 font-bold tracking-wider">RADAR</span>
          <span className="text-slate-400 tabular-nums">
            {radar.sectors.length}/4 SEC
          </span>
        </div>

        <div className="relative w-full aspect-[16/10] bg-slate-900/95 rounded-lg border border-slate-800 overflow-hidden">
          {radar.sectors.map((sec, idx) => {
            const leftPct =
              ((sec.col * SECTOR_WIDTH - radar.worldMinX) / spanX) * 100;
            const topPct =
              ((sec.row * SECTOR_HEIGHT - radar.worldMinY) / spanY) * 100;
            const widthPct = (SECTOR_WIDTH / spanX) * 100;
            const heightPct = (SECTOR_HEIGHT / spanY) * 100;

            return (
              <div
                key={`${sec.key}-${sec.col}-${sec.row}-${idx}`}
                className="absolute border border-cyan-500/35 bg-slate-950 overflow-hidden"
                style={{
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  width: `${widthPct}%`,
                  height: `${heightPct}%`,
                }}
              >
                <img
                  src={SECTOR_BG_IMAGES[sec.key]}
                  alt={sec.label ?? `Sector 0${idx + 1}`}
                  className="w-full h-full object-cover opacity-65 pointer-events-none"
                  draggable={false}
                />
                <div className="absolute inset-0 bg-slate-950/30 pointer-events-none" />
                <span className="relative z-10 block p-0.5 text-[7px] font-mono font-bold text-cyan-200 drop-shadow leading-none">
                  0{idx + 1}
                </span>
              </div>
            );
          })}

          {radar.enemies.map((en, i) => (
            <span
              key={i}
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full ${
                en.type === "boss"
                  ? "w-2.5 h-2.5 bg-red-500 ring-2 ring-red-400/50"
                  : en.type === "heavy"
                    ? "w-2 h-2 bg-amber-400"
                    : "w-1.5 h-1.5 bg-rose-400"
              }`}
              style={{
                left: `${Math.max(2, Math.min(98, en.nx * 100))}%`,
                top: `${Math.max(2, Math.min(98, en.ny * 100))}%`,
              }}
            />
          ))}

          <span
            className="absolute -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-cyan-400 border border-white shadow-[0_0_8px_rgba(34,211,238,0.95)]"
            style={{
              left: `${Math.max(2, Math.min(98, radar.player.nx * 100))}%`,
              top: `${Math.max(2, Math.min(98, radar.player.ny * 100))}%`,
            }}
          />
        </div>
      </div>
    </aside>
  );
}

export default function GameHUD({
  hud,
  onWeaponSelect,
  onPauseToggle,
  onNextWave,
  onRestart,
  onExit,
}: GameHUDProps) {
  const [muted, setMuted] = useState(isAudioMuted());
  const currentWeaponInfo =
    WEAPON_REGISTRY[hud.weapon] || WEAPON_REGISTRY.cannon;

  const handleMute = () => {
    const isNowMuted = toggleAudioMute();
    setMuted(isNowMuted);
    if (!isNowMuted) playHUDBeep(800, 0.05, 0.2);
  };

  const hpPct = Math.max(0, Math.min(100, (hud.health / hud.maxHealth) * 100));
  const shieldPct = Math.max(
    0,
    Math.min(100, (hud.shield / hud.maxShield) * 100),
  );

  return (
    <>
      {/* Top Tactical HUD Header */}
      <header className="fixed top-0 left-0 right-0 z-30 px-3 py-2 pointer-events-none md:px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 bg-slate-950/85 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-cyan-500/20 shadow-[0_4px_25px_rgba(0,0,0,0.7)]">
          {/* Left: Player Vital Signs */}
          <div className="flex flex-wrap items-center gap-4 pointer-events-auto">
            {/* Health Bar */}
            <div className="flex flex-col gap-0.5 min-w-[130px] sm:min-w-[160px]">
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <span>💚</span> HP
                </span>
                <span className="text-white font-bold tabular-nums">
                  {Math.round(hud.health)}/{hud.maxHealth}
                </span>
              </div>
              <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden border border-emerald-500/30">
                <div
                  className="h-full bg-gradient-to-r from-red-500 via-amber-400 to-emerald-400 transition-all duration-200"
                  style={{ width: `${hpPct}%` }}
                />
              </div>
            </div>

            {/* Shield Bar */}
            <div className="flex flex-col gap-0.5 min-w-[110px] sm:min-w-[140px]">
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="text-cyan-400 font-bold flex items-center gap-1">
                  <span>🛡️</span> SHIELD
                </span>
                <span className="text-white font-bold tabular-nums">
                  {Math.round(hud.shield)}/{hud.maxShield}
                </span>
              </div>
              <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden border border-cyan-500/30">
                <div
                  className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-200"
                  style={{ width: `${shieldPct}%` }}
                />
              </div>
            </div>

            {/* Wave Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 rounded-lg border border-cyan-500/30 font-mono">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-xs font-extrabold text-cyan-300">
                WAVE {hud.wave}
              </span>
            </div>

            {/* Enemies Alive */}
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 rounded-lg border border-red-500/30 font-mono">
              <span className="text-[10px] text-red-400 font-bold uppercase">
                HOSTILES
              </span>
              <span className="text-sm font-extrabold text-red-400 tabular-nums">
                {hud.enemiesRemaining}
              </span>
            </div>
          </div>

          {/* Right: Score & Menu Controls */}
          <div className="flex items-center gap-3 pointer-events-auto">
            {/* Score */}
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-900/90 rounded-lg border border-slate-700 font-mono">
              <span className="text-[10px] text-slate-400">SCORE</span>
              <span className="text-base font-extrabold text-emerald-400 tabular-nums">
                {hud.score}
              </span>
            </div>

            {/* High Score */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-900/90 rounded-lg border border-slate-700 font-mono">
              <span className="text-[10px] text-slate-400">HI</span>
              <span className="text-sm font-bold text-cyan-400 tabular-nums">
                {hud.highScore}
              </span>
            </div>

            {/* Sound Toggle */}
            <button
              onClick={handleMute}
              className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg transition text-xs cursor-pointer"
              title={muted ? "Unmute Sound" : "Mute Sound"}
            >
              {muted ? "🔇" : "🔊"}
            </button>

            {/* Pause */}
            <button
              onClick={onPauseToggle}
              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-mono text-xs rounded-lg transition cursor-pointer"
            >
              {hud.isPaused ? "RESUME" : "PAUSE"}
            </button>

            {/* Exit to Menu */}
            <button
              onClick={onExit}
              className="px-2.5 py-1 bg-slate-900/60 hover:bg-red-950/40 border border-slate-800 hover:border-red-500/40 text-slate-400 hover:text-red-400 font-mono text-xs rounded-lg transition cursor-pointer"
            >
              EXIT
            </button>
          </div>
        </div>
      </header>

      {/* Corner Tactical Radar */}
      <TacticalRadar radar={hud.radar} />

      {/* Bottom Weapon Bar */}
      <footer className="fixed bottom-3 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
        <div className="bg-slate-950/90 backdrop-blur-md px-3 py-2 rounded-2xl border border-cyan-500/30 flex items-center gap-2 shadow-[0_4px_25px_rgba(0,0,0,0.8)]">
          {/* Active Weapon Card */}
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 rounded-xl border border-emerald-500/40 font-mono">
            <span className="text-xl">{currentWeaponInfo.icon}</span>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">
                {currentWeaponInfo.name}
              </span>
              <span className="text-[10px] text-emerald-400 font-bold tabular-nums">
                {hud.weaponAmmo < 0
                  ? "INFINITE AMMO"
                  : `${hud.weaponAmmo} ROUNDS LEFT`}
              </span>
            </div>
          </div>

          {/* Weapon Quick Selector Pills */}
          <div className="hidden sm:flex items-center gap-1.5 pl-2 border-l border-slate-800">
            {(Object.keys(WEAPON_REGISTRY) as WeaponType[]).map((wKey, idx) => {
              const w = WEAPON_REGISTRY[wKey];
              const isActive = hud.weapon === wKey;
              return (
                <button
                  key={wKey}
                  onClick={() => onWeaponSelect(wKey)}
                  className={`px-2.5 py-1 rounded-lg font-mono text-xs flex items-center gap-1 transition cursor-pointer ${
                    isActive
                      ? "bg-cyan-500 text-slate-950 font-extrabold shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                      : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
                  }`}
                  title={`${w.name} (Key ${idx + 1})`}
                >
                  <span>{w.icon}</span>
                  <span className="text-[10px]">{idx + 1}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Help Tip */}
          <div className="hidden lg:block pl-3 border-l border-slate-800 font-mono text-[10px] text-slate-400">
            <span className="text-cyan-400">WASD:</span> Move |{" "}
            <span className="text-emerald-400">Mouse:</span> Aim |{" "}
            <span className="text-amber-400">Click / Space:</span> Fire
          </div>
        </div>
      </footer>

      {/* Wave Cleared Overlay */}
      <AnimatePresence>
        {hud.isWaveCleared && !hud.isGameOver && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-auto"
          >
            <div className="bg-slate-950/95 border-2 border-emerald-500/50 rounded-3xl p-8 max-w-md w-full mx-4 text-center shadow-[0_0_60px_rgba(16,185,129,0.3)]">
              <div className="text-4xl mb-3">✓</div>
              <h2 className="font-tactical text-3xl font-extrabold text-emerald-400 tracking-wider mb-1">
                WAVE {hud.wave} CLEARED!
              </h2>
              <p className="font-mono text-xs text-slate-400 mb-6">
                SECTOR SECURED • SHIELD & ARMOR RESTORED
              </p>

              <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 mb-6 font-mono">
                <span className="text-xs text-slate-400">TOTAL SCORE: </span>
                <span className="text-2xl font-extrabold text-emerald-400 tabular-nums">
                  {hud.score}
                </span>
              </div>

              <button
                onClick={onNextWave}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-extrabold text-sm rounded-xl transition cursor-pointer shadow-[0_0_25px_rgba(16,185,129,0.5)] active:scale-95"
              >
                START WAVE {hud.wave + 1} (SPACE) ▶
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over Overlay */}
      <AnimatePresence>
        {hud.isGameOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-md pointer-events-auto"
          >
            <div className="bg-slate-950/95 border-2 border-red-500/50 rounded-3xl p-8 max-w-md w-full mx-4 text-center shadow-[0_0_60px_rgba(239,68,68,0.35)]">
              <div className="text-4xl mb-2">💥</div>
              <h2 className="font-tactical text-3xl font-extrabold text-red-500 tracking-wider mb-1">
                AIRCRAFT DESTROYED
              </h2>
              <p className="font-mono text-xs text-slate-400 mb-6">
                YOU SURVIVED UNTIL WAVE {hud.wave}
              </p>

              <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 mb-6 space-y-2 font-mono">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">FINAL SCORE:</span>
                  <span className="text-2xl font-extrabold text-emerald-400 tabular-nums">
                    {hud.score}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">HIGH SCORE:</span>
                  <span className="text-xl font-bold text-cyan-400 tabular-nums">
                    {hud.highScore}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onRestart}
                  className="flex-1 py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-extrabold text-sm rounded-xl transition cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.5)] active:scale-95"
                >
                  PLAY AGAIN (R)
                </button>
                <button
                  onClick={onExit}
                  className="px-5 py-3.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold text-sm rounded-xl transition cursor-pointer"
                >
                  MENU
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
