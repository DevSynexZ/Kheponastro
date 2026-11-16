"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { OrdnanceItem, Loadout, OrdnanceType } from "@/lib/gameTypes";
import { playHUDBeep, playRadarPing } from "@/lib/audio";

interface OrdnancePanelProps {
  loadout: Loadout;
  activeOrdnanceId: string | null;
  availableOrdnance: OrdnanceItem[];
  onSelect: (id: string) => void;
  onClose: () => void;
  onDeploy?: () => void; // Called when DEPLOY TO ARENA clicked in briefing
  phase: "briefing" | "aiming" | "selecting";
  disabled?: boolean;
}

const TYPE_COLORS: Record<OrdnanceType, string> = {
  HE: "border-emerald-500/50 bg-emerald-500/10 text-emerald-400",
  AP: "border-cyan-500/50 bg-cyan-500/10 text-cyan-400",
  HEAT: "border-red-500/50 bg-red-500/10 text-red-400",
  SMOKE: "border-slate-500/50 bg-slate-500/10 text-slate-400",
  ILLUM: "border-yellow-500/50 bg-yellow-500/10 text-yellow-400",
  CLUSTER: "border-orange-500/50 bg-orange-500/10 text-orange-400",
};

const TYPE_ICONS: Record<OrdnanceType, string> = {
  HE: "💣",
  AP: "🎯",
  HEAT: "🔥",
  SMOKE: "🌫️",
  ILLUM: "✨",
  CLUSTER: "💥",
};

export default function OrdnancePanel({
  loadout,
  activeOrdnanceId,
  availableOrdnance,
  onSelect,
  onClose,
  onDeploy,
  phase,
  disabled = false,
}: OrdnancePanelProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const isBriefing = phase === "briefing";
  const isSelecting = phase === "selecting";

  const totalWeight = loadout.totalWeight;
  const maxCapacity = loadout.maxCapacity;
  const weightPct = (totalWeight / maxCapacity) * 100;

  if (!isBriefing && !isSelecting) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="fixed bottom-0 left-1/2 -translate-x-1/2 z-30 mx-4 mb-4 w-full max-w-5xl pointer-events-auto"
      >
        <motion.div
          className="bg-slate-950/95 backdrop-blur-xl border border-cyan-500/20 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(6,182,212,0.1)]"
          whileHover={{ y: -2, boxShadow: "0 20px 40px rgba(6,182,212,0.15)" }}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-cyan-500/20 bg-gradient-to-r from-slate-900/50 to-transparent flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.span
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="w-10 h-10 flex items-center justify-center rounded-lg bg-cyan-500/20 border border-cyan-500/30"
              >
                📦
              </motion.span>
              <div>
                <h3 className="font-mono text-xs text-cyan-400 tracking-widest uppercase">
                  {isBriefing ? "LOADOUT SELECTION" : "ORDNANCE SELECT"}
                </h3>
                <p className="font-mono text-[10px] text-slate-400">
                  Capacity: {totalWeight} / {maxCapacity} kg
                </p>
              </div>
            </div>

            {/* Weight bar */}
            <div className="w-48 h-2 bg-slate-800 rounded-full overflow-hidden border border-cyan-500/20">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400"
                style={{ width: `${weightPct}%` }}
                animate={{ width: `${weightPct}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>

            {/* Close button (only in selecting mode) */}
            {isSelecting && (
              <button
                onClick={() => { playHUDBeep(800, 0.05, 0.15); onClose(); }}
                className="p-2 rounded-lg bg-slate-800/50 border border-slate-600/50 text-slate-400 hover:border-cyan-500/50 hover:text-cyan-400 transition"
                aria-label="Close ordnance panel"
              >
                ✕
              </button>
            )}
          </div>

          {/* Ordnance Grid */}
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 max-h-[60vh] overflow-y-auto">
            {availableOrdnance.map((ord) => {
              const isActive = activeOrdnanceId === ord.id;
              const typeClasses = TYPE_COLORS[ord.type];
              const icon = TYPE_ICONS[ord.type];

              return (
                <motion.button
                  key={ord.id}
                  onClick={() => {
                    if (!disabled) {
                      playHUDBeep(800 + ord.value, 0.08, 0.2);
                      onSelect(ord.id);
                    }
                  }}
                  onMouseEnter={() => setHoveredId(ord.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  disabled={disabled || ord.quantity <= 0}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`
                    relative group p-3 rounded-xl border-2 transition-all duration-200
                    ${typeClasses}
                    ${isActive ? "border-2 ring-2 ring-offset-2 ring-offset-slate-950" : "hover:border-opacity-75"}
                    ${ord.quantity <= 0 ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
                    ${hoveredId === ord.id ? "shadow-[0_0_20px_rgba(6,182,212,0.3)]" : ""}
                  `}
                  aria-label={`${ord.name} - ${ord.quantity} remaining`}
                >
                  {/* Type icon */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{icon}</span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 bg-white/10 rounded">
                      ×{ord.quantity}
                    </span>
                  </div>

                  {/* Name */}
                  <div className="font-mono text-xs font-bold truncate">{ord.name}</div>

                  {/* Stats */}
                  <div className="mt-2 space-y-1 font-mono text-[10px] text-slate-400">
                    <div className="flex justify-between">
                      <span>DMG</span>
                      <span className="text-white">{ord.damage}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>RAD</span>
                      <span className="text-white">{ord.radius}m</span>
                    </div>
                    <div className="flex justify-between">
                      <span>VEL</span>
                      <span className="text-white">{ord.velocity}m/s</span>
                    </div>
                    <div className="flex justify-between">
                      <span>WGT</span>
                      <span className="text-white">{ord.weight}kg</span>
                    </div>
                  </div>

                  {/* Active indicator */}
                  {isActive && (
                    <motion.div
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="absolute inset-0 border-2 border-current rounded-xl pointer-events-none"
                    />
                  )}

                  {/* Disabled overlay */}
                  {ord.quantity <= 0 && (
                    <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center">
                      <span className="font-mono text-xs text-slate-500">DEPLETED</span>
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Selected Ordnance Detail */}
          {activeOrdnanceId && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="px-6 pb-4 border-t border-cyan-500/20"
            >
              {(() => {
                const ord = availableOrdnance.find((o) => o.id === activeOrdnanceId);
                if (!ord) return null;

                return (
                  <div className="grid grid-cols-4 gap-4 pt-4">
                    <div className="col-span-2">
                      <p className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">
                        SELECTED: {ord.name}
                      </p>
                      <p className="text-slate-500 text-sm mt-1 line-clamp-2">{ord.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-[10px] text-slate-400">QUANTITY</p>
                      <p className="font-mono text-xl font-bold text-emerald-400">{ord.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-[10px] text-slate-400">WEIGHT</p>
                      <p className="font-mono text-xl font-bold text-cyan-400">{ord.weight} kg</p>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          )}

          {/* Action Buttons */}
          <div className="px-6 py-4 border-t border-cyan-500/20 bg-slate-900/50 flex flex-wrap gap-3 justify-end">
            {isBriefing && (
              <motion.button
                onClick={() => { playRadarPing(); onDeploy?.(); onClose(); }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-slate-950 font-extrabold text-sm rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.4)]"
              >
                <span>▶</span>
                DEPLOY TO ARENA
              </motion.button>
            )}

            {isSelecting && (
              <>
                <button
                  onClick={() => { playHUDBeep(600, 0.05, 0.15); onClose(); }}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-800 border border-slate-600/50 text-slate-300 font-bold text-sm rounded-xl hover:border-cyan-500/50 transition"
                >
                  CANCEL
                </button>
                <motion.button
                  onClick={() => { playRadarPing(); onClose(); }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 text-slate-950 font-extrabold text-sm rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                >
                  CONFIRM
                  <span>✓</span>
                </motion.button>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}