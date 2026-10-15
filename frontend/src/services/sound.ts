/**
 * Premium Soft Sound Engine for Lucky Pop Shuffle (TypeScript).
 * - Gentle wooden wheel clicks (warm sine wave, zero harsh sawtooth/buzzing)
 * - Throttled playback so fast spinning never sounds like a drill/machine gun
 * - Warm melodic countdown & victory chime
 * - Zero external assets, pure Web Audio API
 */

class SoundEffects {
  private ctx: AudioContext | null = null;
  public isMuted: boolean;
  private lastTickTime = 0;

  constructor() {
    this.isMuted = localStorage.getItem('mystery_sound_muted') === 'true';
  }

  public init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    localStorage.setItem('mystery_sound_muted', this.isMuted.toString());
    return this.isMuted;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    localStorage.setItem('mystery_sound_muted', this.isMuted.toString());
  }

  /**
   * Soft Marimba Countdown Pip (gentle & pleasant)
   */
  public playCountdownTick(count: number) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const freqs: Record<number, number> = { 3: 440, 2: 523, 1: 659 };
      const freq = freqs[count] || 440;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.98, now + 0.12);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {
      // Ignore
    }
  }

  /**
   * Gentle Wooden Wheel Tick (warm, muted, zero harshness)
   * Throttled to prevent buzzing/machine-gun noise.
   */
  public playSoftTick(pitchRatio = 1, force = false) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    // Rate-limit during fast spins to max 7-8 ticks per second (~130ms min gap)
    const nowMs = performance.now();
    if (!force && nowMs - this.lastTickTime < 130) {
      return;
    }
    this.lastTickTime = nowMs;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // Warm wooden peg pop: pure sine wave dropping quickly
      osc.type = 'sine';
      const baseFreq = 260 * Math.max(0.7, Math.min(1.4, pitchRatio));
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.035);

      // Low, gentle volume (never loud or piercing)
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.035);
    } catch (e) {
      // Ignore
    }
  }

  /**
   * Soft Impact on final lock
   */
  public playImpact() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.25);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch (e) {
      // Ignore
    }
  }

  /**
   * Sweet, warm chime victory fanfare (soft and celebratory)
   */
  public playFanfare() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // Gentle major pentatonic chime chords (C, E, G, C)
      const notes = [
        { f: 523.25, time: 0.0, dur: 0.5 },  // C5
        { f: 659.25, time: 0.12, dur: 0.5 }, // E5
        { f: 783.99, time: 0.24, dur: 0.6 }, // G5
        { f: 1046.50, time: 0.38, dur: 1.0 }, // C6
      ];

      notes.forEach(({ f, time, dur }) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + time);

        gain.gain.setValueAtTime(0, now + time);
        gain.gain.linearRampToValueAtTime(0.08, now + time + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + time);
        osc.stop(now + time + dur);
      });
    } catch (e) {
      // Ignore
    }
  }

  // Compatibility aliases
  public playShuffleTick(pitchRatio = 1) {
    this.playSoftTick(pitchRatio);
  }
}

export const sound = new SoundEffects();
