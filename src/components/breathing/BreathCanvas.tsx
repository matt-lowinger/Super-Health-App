import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BreathPattern, BreathPhase, DynamicBackgroundScene, VisualMode } from '../../types';

interface BreathCanvasProps {
  pattern: BreathPattern;
  isRunning: boolean;
  visualMode: VisualMode;
  backgroundScene: DynamicBackgroundScene;
  onPhaseChange?: (phase: BreathPhase) => void;
  onCycleComplete?: (cycles: number) => void;
  onSecondsTick?: (phase: BreathPhase, secondsRemaining: number) => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  color: string;
}

export default function BreathCanvas({
  pattern,
  isRunning,
  visualMode,
  backgroundScene,
  onPhaseChange,
  onCycleComplete,
  onSecondsTick
}: BreathCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Persistent Animation State (decoupled from React renders)
  const animStateRef = useRef({
    startTime: performance.now(),
    lastFrameTime: performance.now(),
    currentPhase: 'inhale' as BreathPhase,
    currentCycles: 0,
    lungVolume: 0, // 0.0 (empty) to 1.0 (full)
    particles: [] as Particle[],
    bgParticles: [] as Particle[],
    waveOffset: 0,
    lastSecondsReported: -1
  });

  // Callbacks refs to avoid stale closures inside requestAnimationFrame
  const callbacksRef = useRef({
    onPhaseChange,
    onCycleComplete,
    onSecondsTick
  });
  callbacksRef.current = { onPhaseChange, onCycleComplete, onSecondsTick };

  const patternRef = useRef(pattern);
  patternRef.current = pattern;

  const isRunningRef = useRef(isRunning);
  isRunningRef.current = isRunning;

  const visualModeRef = useRef(visualMode);
  visualModeRef.current = visualMode;

  const bgSceneRef = useRef(backgroundScene);
  bgSceneRef.current = backgroundScene;

  // Reset clock when running state changes to true
  useEffect(() => {
    if (isRunning) {
      animStateRef.current.startTime = performance.now();
      animStateRef.current.lastFrameTime = performance.now();
    }
  }, [isRunning]);

  // Main High-Precision Animation Loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Handle high-DPI crisp retina rendering
    const handleResize = () => {
      const container = containerRef.current;
      if (!container || !canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      const w = Math.floor(rect.width);
      const h = Math.floor(rect.height);

      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
      }
    };

    handleResize();
    const ro = new ResizeObserver(handleResize);
    if (containerRef.current) ro.observe(containerRef.current);

    // Initialize ambient background particles
    const initBgParticles = (width: number, height: number) => {
      const parts: Particle[] = [];
      const count = 40;
      for (let i = 0; i < count; i++) {
        parts.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.4,
          vy: -Math.random() * 0.4 - 0.1,
          size: Math.random() * 2 + 1,
          alpha: Math.random() * 0.5 + 0.2,
          life: Math.random() * 100,
          maxLife: 150 + Math.random() * 100,
          color: '#CCFF00'
        });
      }
      return parts;
    };

    animStateRef.current.bgParticles = initBgParticles(canvas.width, canvas.height);

    // Continuous Math Helpers
    // C2 Continuous Cosine Easing: f(t) = (1 - cos(pi * t)) / 2
    const smoothStep = (t: number) => (1 - Math.cos(Math.PI * Math.max(0, Math.min(1, t)))) / 2;

    const render = (now: number) => {
      const anim = animStateRef.current;
      const p = patternRef.current;
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width;
      const height = canvas.height;

      const dt = Math.min(64, now - anim.lastFrameTime); // ms delta clamped
      anim.lastFrameTime = now;

      // 1. Calculate Phase Timings
      const inhaleDur = Math.max(0.5, p.inhale) * 1000;
      const holdDur = Math.max(0, p.inhaleHold) * 1000;
      const exhaleDur = Math.max(0.5, p.exhale) * 1000;
      const restDur = Math.max(0, p.exhaleHold) * 1000;
      const totalCycleDur = inhaleDur + holdDur + exhaleDur + restDur;

      const elapsed = isRunningRef.current ? now - anim.startTime : 0;
      const cycleTime = elapsed % totalCycleDur;
      const completedCycles = Math.floor(elapsed / totalCycleDur);

      if (completedCycles > anim.currentCycles) {
        anim.currentCycles = completedCycles;
        if (callbacksRef.current.onCycleComplete) {
          callbacksRef.current.onCycleComplete(completedCycles);
        }
      }

      // Determine active phase & phase progress [0, 1]
      let activePhase: BreathPhase = 'inhale';
      let phaseTime = 0;
      let phaseDuration = inhaleDur;
      let lungVolume = 0;

      if (cycleTime < inhaleDur) {
        activePhase = 'inhale';
        phaseTime = cycleTime;
        phaseDuration = inhaleDur;
        const progress = phaseTime / phaseDuration;
        lungVolume = smoothStep(progress);
      } else if (cycleTime < inhaleDur + holdDur) {
        activePhase = 'inhaleHold';
        phaseTime = cycleTime - inhaleDur;
        phaseDuration = holdDur;
        // Subtle organic breathing micro-oscillation at crest
        const microOsc = Math.sin((phaseTime / 1000) * Math.PI) * 0.02;
        lungVolume = 1.0 - microOsc;
      } else if (cycleTime < inhaleDur + holdDur + exhaleDur) {
        activePhase = 'exhale';
        phaseTime = cycleTime - (inhaleDur + holdDur);
        phaseDuration = exhaleDur;
        const progress = phaseTime / phaseDuration;
        lungVolume = 1.0 - smoothStep(progress);
      } else {
        activePhase = 'exhaleHold';
        phaseTime = cycleTime - (inhaleDur + holdDur + exhaleDur);
        phaseDuration = restDur;
        lungVolume = 0.0;
      }

      anim.lungVolume = lungVolume;

      // Check for phase change
      if (activePhase !== anim.currentPhase) {
        anim.currentPhase = activePhase;
        if (callbacksRef.current.onPhaseChange) {
          callbacksRef.current.onPhaseChange(activePhase);
        }
      }

      // Report seconds remaining (throttled to tenth of second)
      const secRem = Math.max(0, Math.ceil((phaseDuration - phaseTime) / 1000));
      if (secRem !== anim.lastSecondsReported) {
        anim.lastSecondsReported = secRem;
        if (callbacksRef.current.onSecondsTick) {
          callbacksRef.current.onSecondsTick(activePhase, secRem);
        }
      }

      // 2. Draw Dynamic Cinematic Background
      drawBackground(ctx, width, height, bgSceneRef.current, anim, dt);

      // 3. Render Oceanic Continuous Wave Guided Visualization
      drawOceanicWave(ctx, width, height, anim, p, cycleTime, totalCycleDur, dpr);

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, []);

  // --- Rendering Functions ---

  const drawBackground = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    scene: DynamicBackgroundScene,
    anim: typeof animStateRef.current,
    dt: number
  ) => {
    const time = anim.lastFrameTime * 0.001;

    switch (scene) {
      case 'lake-tahoe': {
        // Deep underwater emerald & cyan caustics
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#041724');
        grad.addColorStop(0.5, '#062B3A');
        grad.addColorStop(1, '#02121B');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Water caustics shimmer
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        for (let i = 0; i < 3; i++) {
          const shift = (time * 0.4 + i * 1.5) % Math.PI;
          const radial = ctx.createRadialGradient(
            width * (0.3 + i * 0.2 + Math.sin(shift) * 0.1),
            height * 0.4,
            width * 0.05,
            width * 0.5,
            height * 0.5,
            width * 0.6
          );
          radial.addColorStop(0, `rgba(45, 212, 191, ${0.08 + Math.sin(time + i) * 0.03})`);
          radial.addColorStop(1, 'rgba(4, 23, 36, 0)');
          ctx.fillStyle = radial;
          ctx.fillRect(0, 0, width, height);
        }
        ctx.restore();
        break;
      }

      case 'aurora-borealis': {
        // Starfield + undulating emerald/violet aurora ribbons
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#060B18');
        grad.addColorStop(0.6, '#0B1528');
        grad.addColorStop(1, '#050811');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Aurora ribbons
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.beginPath();
        for (let x = 0; x <= width; x += 30) {
          const wave1 = Math.sin(x * 0.003 + time * 0.8) * 80;
          const wave2 = Math.cos(x * 0.006 - time * 0.5) * 40;
          const y = height * 0.35 + wave1 + wave2;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.lineTo(width, height * 0.65);
        ctx.lineTo(0, height * 0.65);
        ctx.closePath();

        const ribbonGrad = ctx.createLinearGradient(0, height * 0.2, width, height * 0.6);
        ribbonGrad.addColorStop(0, 'rgba(16, 185, 129, 0.12)');
        ribbonGrad.addColorStop(0.5, 'rgba(139, 92, 246, 0.16)');
        ribbonGrad.addColorStop(1, 'rgba(52, 211, 153, 0.08)');
        ctx.fillStyle = ribbonGrad;
        ctx.fill();
        ctx.restore();
        break;
      }

      case 'twilight-sunset': {
        // Warm magenta & deep amber dusk
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#1C0D26');
        grad.addColorStop(0.5, '#2D132C');
        grad.addColorStop(1, '#150819');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Soft sunset horizon glow
        const glow = ctx.createRadialGradient(
          width * 0.5,
          height * 0.85,
          10,
          width * 0.5,
          height * 0.85,
          width * 0.7
        );
        glow.addColorStop(0, 'rgba(245, 158, 11, 0.15)');
        glow.addColorStop(0.6, 'rgba(236, 72, 153, 0.08)');
        glow.addColorStop(1, 'rgba(21, 8, 25, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);
        break;
      }

      case 'forest-mist': {
        // Deep evergreen & rain mist
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#091512');
        grad.addColorStop(0.5, '#0E1F1A');
        grad.addColorStop(1, '#060E0B');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
        break;
      }

      case 'minimal-zen':
      default: {
        // Clean charcoal onyx vignette
        const grad = ctx.createRadialGradient(
          width * 0.5,
          height * 0.5,
          width * 0.1,
          width * 0.5,
          height * 0.5,
          width * 0.75
        );
        grad.addColorStop(0, '#181A1E');
        grad.addColorStop(1, '#0B0C0E');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
        break;
      }
    }

    // Drifting ambient dust particles
    ctx.save();
    anim.bgParticles.forEach((p) => {
      p.y += p.vy * (dt / 16);
      p.x += p.vx * (dt / 16);
      if (p.y < 0) p.y = height;
      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(204, 255, 0, ${p.alpha * 0.25})`;
      ctx.fill();
    });
    ctx.restore();
  };

  // --- 1. Oceanic Continuous Wave Renderer ---
  const drawOceanicWave = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    anim: typeof animStateRef.current,
    pattern: BreathPattern,
    cycleTime: number,
    totalCycleDur: number,
    dpr: number
  ) => {
    const centerY = height * 0.55;
    const waveAmp = height * 0.24;
    const orbX = width * 0.35; // Position of the guided celestial orb

    // Wave parameters: map time window around current cycleTime
    const timeSpan = totalCycleDur * 1.5; // Visible window in ms

    // Function to compute expected lung volume at arbitrary relative time `t`
    const getVolumeAtTime = (tMs: number) => {
      const wrapped = ((tMs % totalCycleDur) + totalCycleDur) % totalCycleDur;
      const inDur = pattern.inhale * 1000;
      const holdDur = pattern.inhaleHold * 1000;
      const exDur = pattern.exhale * 1000;
      const restDur = pattern.exhaleHold * 1000;

      const smooth = (val: number) => (1 - Math.cos(Math.PI * Math.max(0, Math.min(1, val)))) / 2;

      if (wrapped < inDur) {
        return smooth(wrapped / inDur);
      } else if (wrapped < inDur + holdDur) {
        return 1.0;
      } else if (wrapped < inDur + holdDur + exDur) {
        return 1.0 - smooth((wrapped - (inDur + holdDur)) / exDur);
      } else {
        return 0.0;
      }
    };

    // Draw the continuous guided wave line
    ctx.save();
    ctx.lineWidth = 3.5 * dpr;

    // Glowing wave gradient
    const waveGrad = ctx.createLinearGradient(0, centerY - waveAmp, 0, centerY + waveAmp);
    waveGrad.addColorStop(0, '#CCFF00');
    waveGrad.addColorStop(0.5, 'rgba(45, 212, 191, 0.85)');
    waveGrad.addColorStop(1, 'rgba(59, 130, 246, 0.4)');
    ctx.strokeStyle = waveGrad;

    ctx.beginPath();
    const stepPx = 6 * dpr;
    for (let x = 0; x <= width; x += stepPx) {
      // Map screen X to time offset relative to current cycleTime
      const timeOffset = ((x - orbX) / width) * timeSpan;
      const vol = getVolumeAtTime(cycleTime + timeOffset);
      const y = centerY + waveAmp * (0.5 - vol); // 0.0 vol = bottom (trough), 1.0 vol = top (crest)

      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Under-wave luminous atmospheric fill
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    const fillGrad = ctx.createLinearGradient(0, centerY - waveAmp, 0, height);
    fillGrad.addColorStop(0, 'rgba(204, 255, 0, 0.07)');
    fillGrad.addColorStop(0.5, 'rgba(45, 212, 191, 0.03)');
    fillGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = fillGrad;
    ctx.fill();

    // Subtle guide line on current position
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.setLineDash([4 * dpr, 6 * dpr]);
    ctx.moveTo(orbX, height * 0.15);
    ctx.lineTo(orbX, height * 0.85);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Celestial Guided Orb
    const orbY = centerY + waveAmp * (0.5 - anim.lungVolume);

    // Stardust Wake Particles (generated behind orb)
    if (Math.random() < 0.6) {
      anim.particles.push({
        x: orbX,
        y: orbY + (Math.random() - 0.5) * 10 * dpr,
        vx: -Math.random() * 2.5 * dpr - 1.2 * dpr,
        vy: (Math.random() - 0.5) * 1.5 * dpr,
        size: Math.random() * 3.5 * dpr + 1.5 * dpr,
        alpha: 0.9,
        life: 0,
        maxLife: 45 + Math.random() * 25,
        color: anim.lungVolume > 0.6 ? '#CCFF00' : '#2DD4BF'
      });
    }

    // Render Wake Particles
    ctx.save();
    for (let i = anim.particles.length - 1; i >= 0; i--) {
      const part = anim.particles[i];
      part.life += 1;
      part.x += part.vx;
      part.y += part.vy;
      const decay = 1 - part.life / part.maxLife;

      if (decay <= 0) {
        anim.particles.splice(i, 1);
        continue;
      }

      ctx.beginPath();
      ctx.arc(part.x, part.y, part.size * decay, 0, Math.PI * 2);
      ctx.fillStyle = part.color;
      ctx.globalAlpha = part.alpha * decay;
      ctx.fill();
    }
    ctx.restore();

    // Dynamic Breathing Aura around Core Ball
    const auraRadius = (28 + anim.lungVolume * 36) * dpr;
    const auraGrad = ctx.createRadialGradient(orbX, orbY, 4 * dpr, orbX, orbY, auraRadius);
    auraGrad.addColorStop(0, 'rgba(204, 255, 0, 0.85)');
    auraGrad.addColorStop(0.3, 'rgba(45, 212, 191, 0.45)');
    auraGrad.addColorStop(0.7, 'rgba(59, 130, 246, 0.15)');
    auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.save();
    ctx.beginPath();
    ctx.arc(orbX, orbY, auraRadius, 0, Math.PI * 2);
    ctx.fillStyle = auraGrad;
    ctx.fill();

    // Solid core celestial sphere
    ctx.beginPath();
    ctx.arc(orbX, orbY, 11 * dpr, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = '#CCFF00';
    ctx.shadowBlur = 18 * dpr;
    ctx.fill();
    ctx.restore();
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[300px] sm:h-[400px] md:h-[460px] rounded-2xl overflow-hidden shadow-2xl border border-[#2C2E33] select-none"
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}
