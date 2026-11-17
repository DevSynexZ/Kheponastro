/**
 * Web Audio API - Tactical Sound Engine
 * Generates synthesized sounds for missile launch, explosions, HUD feedback
 * No external audio files needed - fully procedural
 */

// Singleton AudioContext for the app
let audioContext: AudioContext | null = null;
let audioMuted = false;

export function toggleAudioMute(): boolean {
  audioMuted = !audioMuted;
  return audioMuted;
}

export function isAudioMuted(): boolean {
  return audioMuted;
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined" || audioMuted) return null;
  try {
    if (!audioContext) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      audioContext = new AudioCtx();
    }
    // Resume if suspended (browser autoplay policy)
    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }
    return audioContext;
  } catch {
    return null;
  }
}

/**
 * Missile Launch Hum - Low-frequency rumble with pitch sweep
 */
export function playMissileLaunchHum(duration: number = 2.0): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Main oscillator - low frequency rumble
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(60, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + duration * 0.3);
    osc.frequency.exponentialRampToValueAtTime(80, now + duration);

    // Sub-oscillator for depth
    const subOsc = ctx.createOscillator();
    subOsc.type = "sine";
    subOsc.frequency.setValueAtTime(30, now);
    subOsc.frequency.exponentialRampToValueAtTime(20, now + duration);

    // Noise for "rocket" texture
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = false;

    // Filter for noise - bandpass around 200Hz
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.setValueAtTime(200, now);
    noiseFilter.Q.setValueAtTime(10, now);

    // Gain envelopes
    const mainGain = ctx.createGain();
    mainGain.gain.setValueAtTime(0, now);
    mainGain.gain.linearRampToValueAtTime(0.3, now + 0.1);
    mainGain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0, now);
    subGain.gain.linearRampToValueAtTime(0.2, now + 0.1);
    subGain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0, now);
    noiseGain.gain.linearRampToValueAtTime(0.15, now + 0.05);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + duration * 0.5);

    // Master gain
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.5, now);

    // Connect
    osc.connect(mainGain).connect(masterGain);
    subOsc.connect(subGain).connect(masterGain);
    noise.connect(noiseFilter).connect(noiseGain).connect(masterGain);
    masterGain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.1);
    subOsc.start(now);
    subOsc.stop(now + duration + 0.1);
    noise.start(now);
    noise.stop(now + duration + 0.1);
  } catch {
    // Ignore audio failures
  }
}

/**
 * Explosion Impact - Broadband noise with low-pass filter sweep
 */
export function playExplosionImpact(intensity: number = 1.0): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const dur = 1.5 * intensity;

    // Noise source
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.3));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    // Low-pass filter sweep - starts open, closes
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2000, now);
    filter.frequency.exponentialRampToValueAtTime(80, now + dur);
    filter.Q.setValueAtTime(2, now);

    // Gain envelope - sharp attack, exponential decay
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.6 * intensity, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    // Add a low "thump" oscillator
    const thump = ctx.createOscillator();
    thump.type = "sine";
    thump.frequency.setValueAtTime(60, now);
    thump.frequency.exponentialRampToValueAtTime(20, now + 0.3);

    const thumpGain = ctx.createGain();
    thumpGain.gain.setValueAtTime(0, now);
    thumpGain.gain.linearRampToValueAtTime(0.4 * intensity, now + 0.02);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    thump.connect(thumpGain).connect(gain);
    noise.connect(filter).connect(gain);
    gain.connect(ctx.destination);

    thump.start(now);
    thump.stop(now + 0.5);
    noise.start(now);
    noise.stop(now + dur);
  } catch {
    // Ignore audio failures
  }
}

/**
 * HUD Tick/UI Beep - Short tonal beep
 */
export function playHUDBeep(frequency: number = 800, duration: number = 0.1, volume: number = 0.3): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(frequency, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  } catch {
    // Ignore audio failures
  }
}

/**
 * Radar Sweep - Periodic ping sound
 */
export function playRadarPing(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.3);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  } catch {
    // Ignore audio failures
  }
}

/**
 * Target Lock - Rising tone sequence
 */
export function playTargetLock(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [440, 554, 660, 880]; // A4, C#5, E5, A5

    notes.forEach((freq, i) => {
      const t = now + i * 0.08;
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, t);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.2, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  } catch {
    // Ignore audio failures
  }
}

/**
 * Warning Alarm - Alternating high/low
 */
export function playWarningAlarm(duration: number = 2.0): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const cycles = Math.floor(duration / 0.5);

    for (let i = 0; i < cycles; i++) {
      const t = now + i * 0.5;
      const osc1 = ctx.createOscillator();
      osc1.type = "square";
      osc1.frequency.setValueAtTime(1000, t);
      const gain1 = ctx.createGain();
      gain1.gain.setValueAtTime(0, t);
      gain1.gain.linearRampToValueAtTime(0.15, t + 0.01);
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc1.connect(gain1).connect(ctx.destination);
      osc1.start(t);
      osc1.stop(t + 0.2);

      const osc2 = ctx.createOscillator();
      osc2.type = "square";
      osc2.frequency.setValueAtTime(600, t + 0.25);
      const gain2 = ctx.createGain();
      gain2.gain.setValueAtTime(0, t + 0.25);
      gain2.gain.linearRampToValueAtTime(0.15, t + 0.26);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc2.connect(gain2).connect(ctx.destination);
      osc2.start(t + 0.25);
      osc2.stop(t + 0.45);
    }
  } catch {
    // Ignore audio failures
  }
}

// Sound buffers cache for game sound files
const soundBuffers: Record<string, AudioBuffer | null> = {
  "fire-1": null,
  "fire-2": null,
  "fire-3": null,
  "fire-4": null,
  "fire-5": null,
  "enemy-die": null,
};
let isPreloading = false;
let audioBuffersLoaded = false;

/**
 * Preload MP3 audio files into Web Audio PCM buffers for 0ms latency playback
 */
export async function preloadGameSounds(): Promise<void> {
  if (typeof window === "undefined" || audioBuffersLoaded || isPreloading) return;
  isPreloading = true;

  const ctx = getAudioContext();
  if (!ctx) {
    isPreloading = false;
    return;
  }

  const soundUrls: Record<string, string> = {
    "fire-1": "/sounds/fire-1.mp3",
    "fire-2": "/sounds/fire-2.mp3",
    "fire-3": "/sounds/fire-3.mp3",
    "fire-4": "/sounds/fire-4.mp3",
    "fire-5": "/sounds/fire-5.mp3",
    "enemy-die": "/sounds/enemy-die.mp3",
  };

  await Promise.all(
    Object.entries(soundUrls).map(async ([key, url]) => {
      try {
        const response = await fetch(url);
        if (!response.ok) return;
        const arrayBuffer = await response.arrayBuffer();
        const decoded = await ctx.decodeAudioData(arrayBuffer);
        soundBuffers[key] = decoded;
      } catch (err) {
        // Fallback to HTMLAudioElement if decode fails
      }
    })
  );

  audioBuffersLoaded = true;
  isPreloading = false;
}

/**
 * Helper to play a pre-buffered or HTMLAudio sound
 */
function playBufferSound(
  key: string,
  volume: number = 0.5,
  pitchVariance: number = 0.04
): boolean {
  if (audioMuted) return true;
  try {
    const ctx = getAudioContext();
    if (!ctx) return false;

    // Trigger preloading in the background if not yet loaded
    if (!audioBuffersLoaded && !isPreloading) {
      preloadGameSounds().catch(() => {});
    }

    const buffer = soundBuffers[key];
    if (buffer) {
      const source = ctx.createBufferSource();
      source.buffer = buffer;

      if (pitchVariance > 0) {
        source.playbackRate.value = 1.0 + (Math.random() - 0.5) * pitchVariance * 2;
      }

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), ctx.currentTime);

      source.connect(gain);
      gain.connect(ctx.destination);
      source.start(0);
      return true;
    }

    // HTMLAudioElement fallback while buffer is fetching
    const fallback = new Audio(`/sounds/${key}.mp3`);
    fallback.volume = Math.max(0, Math.min(1, volume));
    fallback.play().catch(() => {});
    return true;
  } catch {
    return false;
  }
}

/**
 * Cannon Firing Sound
 */
export function playCannonFire(): void {
  playPlayerShoot("cannon");
}

/**
 * Player Shoot Sound - 5 distinct fire sounds mapped to the 5 weapon types:
 * 1. Cannon  -> fire-1.mp3
 * 2. Dual    -> fire-2.mp3
 * 3. Rapid   -> fire-3.mp3
 * 4. Shotgun -> fire-4.mp3
 * 5. Rocket  -> fire-5.mp3
 */
export function playPlayerShoot(weapon: string = "cannon"): void {
  try {
    let key = "fire-1";
    let vol = 0.5;

    switch (weapon) {
      case "cannon":
        key = "fire-1";
        vol = 0.52;
        break;
      case "dual":
        key = "fire-2";
        vol = 0.5;
        break;
      case "rapid":
        key = "fire-3";
        vol = 0.42;
        break;
      case "shotgun":
        key = "fire-4";
        vol = 0.6;
        break;
      case "rocket":
        key = "fire-5";
        vol = 0.7;
        break;
      default:
        key = "fire-1";
        vol = 0.5;
        break;
    }

    playBufferSound(key, vol, 0.04);
  } catch {
    // Ignore audio failures
  }
}

/**
 * Enemy Die Sound - Uses enemy-die from sounds folder
 */
export function playEnemyDie(isBoss: boolean = false): void {
  try {
    playBufferSound("enemy-die", isBoss ? 0.85 : 0.6, isBoss ? 0.02 : 0.06);
  } catch {
    // Ignore audio failures
  }
}

export function playEnemyShoot(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  } catch {
    // Ignore
  }
}

export function playHitSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.08);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  } catch {
    // Ignore
  }
}

export function playPickupSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

    notes.forEach((freq, i) => {
      const t = now + i * 0.05;
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.15);
    });
  } catch {
    // Ignore
  }
}

/**
 * Initialize audio context on first user interaction (required by browsers)
 */
export function initAudio(): void {
  const ctx = getAudioContext();
  if (ctx && !audioBuffersLoaded) {
    preloadGameSounds().catch(() => {});
  }
}

/**
 * Cleanup
 */
export function closeAudio(): void {
  if (audioContext) {
    try {
      audioContext.close();
    } catch {}
    audioContext = null;
  }
}
