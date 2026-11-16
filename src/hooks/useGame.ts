/**
 * useGame Hook - Game State Management
 * Central state machine for tactical gameplay
 */

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  GameState,
  GamePhase,
  GameConfig,
  DEFAULT_GAME_CONFIG,
  OrdnanceItem,
  Target,
  ShotResult,
  TrajectoryPoint,
  Vector2,
  Loadout,
} from "@/lib/gameTypes";
import {
  createInitialGameState,
  startRound,
  selectOrdnance,
  updateAim,
  fireOrdnance,
  checkRoundEnd,
  advanceRound,
  computeTrajectoryPreview,
  getAvailableOrdnance,
} from "@/lib/gameEngine";

export interface UseGameReturn {
  // State
  state: GameState;
  config: GameConfig;
  availableOrdnance: OrdnanceItem[];
  trajectoryPreview: TrajectoryPoint[] | undefined;

  // Actions
  startGame: () => void;
  selectOrdnance: (id: string) => void;
  setAim: (angle: number, power: number, azimuth?: number) => void;
  fire: (azimuth?: number) => void;
  aimAtTarget: (target: Target) => void;
  nextRound: () => void;
  resetGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;

  // Derived
  isBriefing: boolean;
  isAiming: boolean;
  isFiring: boolean;
  isImpact: boolean;
  isRoundEnd: boolean;
  isGameOver: boolean;
  isPaused: boolean;
  aliveTargets: Target[];
  currentRoundProgress: number;
}

export function useGame(initialConfig?: Partial<GameConfig>): UseGameReturn {
  const config = useMemo(
    () => ({ ...DEFAULT_GAME_CONFIG, ...initialConfig }),
    [initialConfig]
  );

  const [state, setState] = useState<GameState>(() => createInitialGameState(config));
  const [trajectoryPreview, setTrajectoryPreview] = useState<TrajectoryPoint[] | undefined>();
  const azimuthRef = useRef(state.aimState.azimuth || 0);

  // Compute available ordnance
  const availableOrdnance = useMemo(
    () => getAvailableOrdnance(state.loadout),
    [state.loadout]
  );

  // Compute alive targets
  const aliveTargets = useMemo(
    () => state.targets.filter((t) => !t.destroyed),
    [state.targets]
  );

  // Phase flags
  const isBriefing = state.phase === "briefing";
  const isAiming = state.phase === "aiming";
  const isFiring = state.phase === "firing";
  const isImpact = state.phase === "impact";
  const isRoundEnd = state.phase === "roundEnd";
  const isGameOver = state.phase === "gameOver";
  const isPaused = state.phase === "paused";

  // Round progress (0-1)
  const currentRoundProgress = useMemo(() => {
    const total = state.targets.length;
    if (total === 0) return 1;
    const destroyed = state.targets.filter((t) => t.destroyed).length;
    return destroyed / total;
  }, [state.targets]);

  // Update trajectory preview when aim changes or in aiming phase
  useEffect(() => {
    if ((state.phase === "aiming" || state.phase === "briefing") && state.activeOrdnance) {
      const az = state.aimState.azimuth ?? azimuthRef.current ?? 0;
      const preview = computeTrajectoryPreview(state, az);
      setTrajectoryPreview(preview);
    } else {
      setTrajectoryPreview(undefined);
    }
  }, [state.phase, state.activeOrdnance, state.aimState.angle, state.aimState.power, state.aimState.azimuth, state.aimState.velocity, state.wind, state.gravity]);

  // Handle phase progression: firing -> impact -> checkRoundEnd
  useEffect(() => {
    if (state.phase === "firing") {
      // Allow projectile to travel along trajectory
      const timer = setTimeout(() => {
        setState((s) => (s.phase === "firing" ? { ...s, phase: "impact" } : s));
      }, 1200);
      return () => clearTimeout(timer);
    }

    if (state.phase === "impact") {
      // Show explosion and damage numbers, then check round end or return to aiming
      const timer = setTimeout(() => {
        setState((s) => (s.phase === "impact" ? checkRoundEnd(s) : s));
      }, 1400);
      return () => clearTimeout(timer);
    }
  }, [state.phase]);

  // Actions
  const startGame = useCallback(() => {
    setState((s) => startRound(s, config));
  }, [config]);

  const handleSelectOrdnance = useCallback((id: string) => {
    setState((s) => selectOrdnance(s, id));
  }, []);

  const handleSetAim = useCallback((angle: number, power: number, azimuth?: number) => {
    if (azimuth !== undefined) {
      azimuthRef.current = azimuth;
    }
    setState((s) => updateAim(s, angle, power, azimuth ?? azimuthRef.current));
  }, []);

  const handleFire = useCallback((azimuth?: number) => {
    const fireAzimuth = azimuth !== undefined ? azimuth : (state.aimState.azimuth ?? azimuthRef.current ?? 0);
    azimuthRef.current = fireAzimuth;
    setState((s) => {
      const { newState } = fireOrdnance(s, fireAzimuth, config);
      return newState;
    });
  }, [config, state.aimState.azimuth]);

  // Aim at target helper: auto-calculates azimuth and firing solution
  const handleAimAtTarget = useCallback((target: Target) => {
    const dx = target.position.x;
    const dz = target.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const az = Math.atan2(dx, dz) * (180 / Math.PI);

    // Ballistic calculation: range ~ (v^2 * sin(2*theta)) / g
    // With 45 deg angle, range ~ v^2 / g => v ~ sqrt(range * g)
    // Target power roughly proportional to distance
    const estPower = Math.min(100, Math.max(20, Math.round((dist / 500) * 80)));
    const estAngle = 45;

    handleSetAim(estAngle, estPower, Math.round(az * 10) / 10);
  }, [handleSetAim]);

  const handleNextRound = useCallback(() => {
    setState((s) => advanceRound(s, config));
  }, [config]);

  const handleResetGame = useCallback(() => {
    setState(createInitialGameState(config));
    setTrajectoryPreview(undefined);
    azimuthRef.current = 0;
  }, [config]);

  const handlePause = useCallback(() => {
    setState((s) => (s.phase === "paused" ? { ...s, phase: "aiming" } : { ...s, phase: "paused" }));
  }, []);

  const handleResume = useCallback(() => {
    setState((s) => (s.phase === "paused" ? { ...s, phase: "aiming" } : s));
  }, []);

  return {
    state,
    config,
    availableOrdnance,
    trajectoryPreview,
    startGame,
    selectOrdnance: handleSelectOrdnance,
    setAim: handleSetAim,
    fire: handleFire,
    aimAtTarget: handleAimAtTarget,
    nextRound: handleNextRound,
    resetGame: handleResetGame,
    pauseGame: handlePause,
    resumeGame: handleResume,
    isBriefing,
    isAiming,
    isFiring,
    isImpact,
    isRoundEnd,
    isGameOver,
    isPaused,
    aliveTargets,
    currentRoundProgress,
  };
}