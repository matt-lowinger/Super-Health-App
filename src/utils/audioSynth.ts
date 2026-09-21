/**
 * Web Audio API Synthesizer for Pocket Breath Coach
 * High-fidelity phase transition chimes and procedural ambient soundscapes.
 * Decoupled, zero external audio asset dependencies, pristine acoustic transients.
 */

import { AmbientSoundscape, BreathPhase } from '../types';

class BreathAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private soundscapeGain: GainNode | null = null;
  private chimeGain: GainNode | null = null;

  // Active Soundscape Nodes
  private activeSoundscape: AmbientSoundscape = 'none';
  private soundscapeSourceNodes: (AudioNode | number)[] = [];
  private isMuted: boolean = false;
  private volume: number = 0.5;

  private initContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.soundscapeGain = this.ctx.createGain();
      this.soundscapeGain.gain.setValueAtTime(0.65, this.ctx.currentTime);
      this.soundscapeGain.connect(this.masterGain);

      this.chimeGain = this.ctx.createGain();
      this.chimeGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.chimeGain.connect(this.masterGain);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public getVolume(): number {
    return this.volume;
  }

  /**
   * Plays harmonic crystal bowl bell chime tuned to specific breath phase
   */
  public playPhaseChime(phase: BreathPhase) {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;

      // Frequencies tuned to harmonic ratios (432Hz Verdi / Solfeggio resonant foundations)
      let fundamental = 432;
      let overtoneRatio = 1.5; // Perfect 5th

      switch (phase) {
        case 'inhale':
          fundamental = 528; // Transformation & expansion
          overtoneRatio = 1.5;
          break;
        case 'inhaleHold':
          fundamental = 639; // Pure high stillness
          overtoneRatio = 1.333;
          break;
        case 'exhale':
          fundamental = 396; // Grounding downward release
          overtoneRatio = 1.5;
          break;
        case 'exhaleHold':
          fundamental = 324; // Deep resting void
          overtoneRatio = 1.5;
          break;
      }

      // Bell chime: 2 sine oscillators with soft attack and exponential decay
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const bellGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      // Low-pass filter to eliminate click transients
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2200, now);
      filter.Q.setValueAtTime(2, now);

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(fundamental, now);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(fundamental * overtoneRatio, now);

      // Envelope: gentle 20ms attack, 2.5s exponential decay
      bellGain.gain.setValueAtTime(0.0001, now);
      bellGain.gain.linearRampToValueAtTime(0.35, now + 0.035);
      bellGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);

      osc1.connect(bellGain);
      osc2.connect(bellGain);
      bellGain.connect(filter);
      if (this.chimeGain) {
        filter.connect(this.chimeGain);
      }

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 3.0);
      osc2.stop(now + 3.0);
    } catch {
      // AudioContext could be blocked if user hasn't interacted yet
    }
  }

  /**
   * Start procedural soundscapes (Ocean Waves, Forest Rain, Tibetan Bowls, Brown Noise)
   */
  public startSoundscape(type: AmbientSoundscape) {
    this.stopSoundscape();
    this.activeSoundscape = type;

    if (type === 'none') return;

    try {
      const ctx = this.initContext();

      switch (type) {
        case 'ocean-waves':
          this.buildOceanWaves(ctx);
          break;
        case 'forest-rain':
          this.buildForestRain(ctx);
          break;
        case 'tibetan-bowls':
          this.buildTibetanBowls(ctx);
          break;
        case 'brown-noise':
          this.buildBrownNoise(ctx);
          break;
      }
    } catch (e) {
      console.warn('Could not start ambient soundscape:', e);
    }
  }

  public stopSoundscape() {
    this.soundscapeSourceNodes.forEach((node) => {
      if (typeof node === 'number') {
        window.clearInterval(node);
      } else if (node && 'stop' in node && typeof (node as AudioScheduledSourceNode).stop === 'function') {
        try {
          (node as AudioScheduledSourceNode).stop();
          node.disconnect();
        } catch {}
      } else if (node && 'disconnect' in node) {
        try {
          node.disconnect();
        } catch {}
      }
    });
    this.soundscapeSourceNodes = [];
    this.activeSoundscape = 'none';
  }

  public getActiveSoundscape(): AmbientSoundscape {
    return this.activeSoundscape;
  }

  // --- Procedural Audio Generators ---

  private buildBrownNoise(ctx: AudioContext) {
    const bufferSize = ctx.sampleRate * 4;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5; // Gain boost
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(380, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(gain);
    if (this.soundscapeGain) gain.connect(this.soundscapeGain);

    whiteNoise.start();
    this.soundscapeSourceNodes.push(whiteNoise, filter, gain);
  }

  private buildOceanWaves(ctx: AudioContext) {
    // Brown noise base + LFO modulated bandpass filter
    const bufferSize = ctx.sampleRate * 4;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.025 * white) / 1.02;
      lastOut = output[i];
      output[i] *= 3.0;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    // Filter that creates wave resonance
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(260, ctx.currentTime);

    // LFO for periodic wave crashing in and receding (0.12 Hz ~ 8 sec period)
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.12, ctx.currentTime);

    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(220, ctx.currentTime); // mod range

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    const swellGain = ctx.createGain();
    swellGain.gain.setValueAtTime(0.35, ctx.currentTime);

    noiseSource.connect(filter);
    filter.connect(swellGain);
    if (this.soundscapeGain) swellGain.connect(this.soundscapeGain);

    noiseSource.start();
    lfo.start();

    this.soundscapeSourceNodes.push(noiseSource, lfo, filter, lfoGain, swellGain);
  }

  private buildForestRain(ctx: AudioContext) {
    // Filtered pinkish noise with subtle high-cut and raindrop texture
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }

    const rainSource = ctx.createBufferSource();
    rainSource.buffer = noiseBuffer;
    rainSource.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(950, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.38, ctx.currentTime);

    rainSource.connect(filter);
    filter.connect(gain);
    if (this.soundscapeGain) gain.connect(this.soundscapeGain);

    rainSource.start();
    this.soundscapeSourceNodes.push(rainSource, filter, gain);
  }

  private buildTibetanBowls(ctx: AudioContext) {
    // Drone harmony of 216Hz and 220Hz (creates a calming 4Hz binaural theta pulsation)
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const osc3 = ctx.createOscillator(); // 1st harmonic

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(216, ctx.currentTime);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(220, ctx.currentTime);

    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(432, ctx.currentTime);

    const bowlGain = ctx.createGain();
    bowlGain.gain.setValueAtTime(0.22, ctx.currentTime);

    const harmonicGain = ctx.createGain();
    harmonicGain.gain.setValueAtTime(0.08, ctx.currentTime);

    osc1.connect(bowlGain);
    osc2.connect(bowlGain);
    osc3.connect(harmonicGain);
    harmonicGain.connect(bowlGain);

    if (this.soundscapeGain) bowlGain.connect(this.soundscapeGain);

    osc1.start();
    osc2.start();
    osc3.start();

    this.soundscapeSourceNodes.push(osc1, osc2, osc3, bowlGain, harmonicGain);
  }
}

export const breathAudio = new BreathAudioEngine();
