/**
 * STARFORGE TCG - Sound Manager
 *
 * Procedural audio engine using Web Audio API.
 * All sounds are synthesized — no audio files needed.
 * Supports mute toggle and volume control.
 */

type SoundName =
  | 'cardPlay'
  | 'cardDraw'
  | 'attack'
  | 'spellCast'
  | 'minionDeath'
  | 'heroDamage'
  | 'heal'
  | 'heroPower'
  | 'turnStart'
  | 'turnEnd'
  | 'gameWin'
  | 'gameLose'
  | 'starforge'
  | 'barrierBreak'
  | 'buttonClick'
  | 'error'
  | 'coinFlip'
  | 'buffApplied'
  | 'legendaryPlay';

class SoundManagerClass {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private _muted = false;
  private _volume = 0.5;
  private _musicVolume = 0.3;
  private musicGain: GainNode | null = null;
  private musicOsc: OscillatorNode | null = null;
  private musicPlaying = false;

  /** Lazily create AudioContext (must be after user gesture) */
  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this._muted ? 0 : this._volume;
      this.masterGain.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this._muted ? 0 : this._musicVolume;
      this.musicGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  get muted(): boolean { return this._muted; }

  set muted(value: boolean) {
    this._muted = value;
    if (this.masterGain) {
      this.masterGain.gain.value = value ? 0 : this._volume;
    }
    if (this.musicGain) {
      this.musicGain.gain.value = value ? 0 : this._musicVolume;
    }
  }

  get volume(): number { return this._volume; }

  set volume(value: number) {
    this._volume = Math.max(0, Math.min(1, value));
    if (this.masterGain && !this._muted) {
      this.masterGain.gain.value = this._volume;
    }
  }

  toggle(): boolean {
    this.muted = !this._muted;
    return !this._muted;
  }

  // ── Sound Primitives ──────────────────────────────────────────────

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    startTime = 0,
    endFreq?: number,
    gainEnvelope?: { attack: number; decay: number; sustain: number; release: number },
  ) {
    const ctx = this.ensureContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
    if (endFreq) {
      osc.frequency.exponentialRampToValueAtTime(
        endFreq,
        ctx.currentTime + startTime + duration,
      );
    }

    const t = ctx.currentTime + startTime;
    if (gainEnvelope) {
      const { attack, decay, sustain, release } = gainEnvelope;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.8, t + attack);
      gain.gain.linearRampToValueAtTime(sustain, t + attack + decay);
      gain.gain.linearRampToValueAtTime(sustain, t + duration - release);
      gain.gain.linearRampToValueAtTime(0, t + duration);
    } else {
      gain.gain.setValueAtTime(0.6, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    }

    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(t);
    osc.stop(t + duration);
  }

  private playNoise(duration: number, startTime = 0, filterFreq = 4000) {
    const ctx = this.ensureContext();
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;

    const gain = ctx.createGain();
    const t = ctx.currentTime + startTime;
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);
    source.start(t);
    source.stop(t + duration);
  }

  // ── Sound Definitions ─────────────────────────────────────────────

  play(sound: SoundName): void {
    if (this._muted) return;
    try {
      switch (sound) {
        case 'cardPlay':
          this.playTone(600, 0.08, 'sine');
          this.playTone(800, 0.1, 'sine', 0.05);
          break;

        case 'cardDraw':
          this.playTone(400, 0.06, 'triangle');
          this.playTone(500, 0.06, 'triangle', 0.04);
          break;

        case 'attack':
          this.playNoise(0.15, 0, 2000);
          this.playTone(200, 0.15, 'sawtooth', 0, 80);
          break;

        case 'spellCast':
          this.playTone(300, 0.3, 'sine', 0, 1200, {
            attack: 0.02, decay: 0.05, sustain: 0.4, release: 0.1,
          });
          this.playTone(450, 0.25, 'triangle', 0.05, 900);
          this.playTone(600, 0.2, 'sine', 0.1, 1400);
          break;

        case 'minionDeath':
          this.playTone(400, 0.2, 'sawtooth', 0, 100);
          this.playNoise(0.25, 0.05, 1500);
          break;

        case 'heroDamage':
          this.playTone(150, 0.3, 'square', 0, 60);
          this.playNoise(0.2, 0, 3000);
          break;

        case 'heal':
          this.playTone(500, 0.15, 'sine');
          this.playTone(700, 0.15, 'sine', 0.1);
          this.playTone(900, 0.2, 'sine', 0.2);
          break;

        case 'heroPower':
          this.playTone(350, 0.1, 'triangle');
          this.playTone(500, 0.1, 'triangle', 0.08);
          this.playTone(700, 0.15, 'sine', 0.15);
          break;

        case 'turnStart':
          this.playTone(440, 0.1, 'sine');
          this.playTone(550, 0.1, 'sine', 0.08);
          this.playTone(660, 0.15, 'sine', 0.16);
          break;

        case 'turnEnd':
          this.playTone(500, 0.08, 'triangle');
          this.playTone(400, 0.1, 'triangle', 0.06);
          break;

        case 'gameWin':
          this.playTone(523, 0.2, 'sine');       // C5
          this.playTone(659, 0.2, 'sine', 0.15); // E5
          this.playTone(784, 0.2, 'sine', 0.3);  // G5
          this.playTone(1047, 0.4, 'sine', 0.45, undefined, {
            attack: 0.02, decay: 0.1, sustain: 0.5, release: 0.15,
          }); // C6
          break;

        case 'gameLose':
          this.playTone(400, 0.3, 'sawtooth', 0, 200);
          this.playTone(300, 0.3, 'sawtooth', 0.2, 150);
          this.playTone(200, 0.5, 'sawtooth', 0.4, 80);
          break;

        case 'starforge':
          // Epic ascending arpeggio with shimmer
          this.playTone(400, 0.15, 'sine');
          this.playTone(500, 0.15, 'sine', 0.1);
          this.playTone(600, 0.15, 'sine', 0.2);
          this.playTone(800, 0.15, 'triangle', 0.3);
          this.playTone(1000, 0.2, 'sine', 0.4);
          this.playTone(1200, 0.3, 'sine', 0.5, 1600, {
            attack: 0.02, decay: 0.05, sustain: 0.6, release: 0.15,
          });
          this.playNoise(0.1, 0.55, 8000);
          break;

        case 'barrierBreak':
          this.playTone(800, 0.08, 'square', 0, 200);
          this.playNoise(0.15, 0.03, 5000);
          break;

        case 'buttonClick':
          this.playTone(700, 0.04, 'sine');
          break;

        case 'error':
          this.playTone(200, 0.1, 'square');
          this.playTone(150, 0.15, 'square', 0.08);
          break;

        case 'coinFlip':
          this.playTone(800, 0.05, 'sine');
          this.playTone(600, 0.05, 'sine', 0.15);
          this.playTone(1000, 0.1, 'sine', 0.3);
          break;

        case 'buffApplied':
          this.playTone(500, 0.08, 'sine');
          this.playTone(650, 0.1, 'sine', 0.06);
          break;

        case 'legendaryPlay':
          // Deep boom + ascending sparkle
          this.playTone(100, 0.4, 'sine', 0, 50);
          this.playNoise(0.2, 0, 600);
          this.playTone(500, 0.15, 'sine', 0.15);
          this.playTone(700, 0.15, 'sine', 0.25);
          this.playTone(1000, 0.2, 'triangle', 0.35);
          break;
      }
    } catch {
      // Silently fail if audio context is blocked
    }
  }

  // ── Ambient Music (simple procedural loop) ────────────────────────

  startMusic(): void {
    if (this.musicPlaying) return;
    try {
      const ctx = this.ensureContext();
      this.musicPlaying = true;

      const playChord = (notes: number[], startTime: number, dur: number) => {
        for (const freq of notes) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0, ctx.currentTime + startTime);
          gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + startTime + 0.5);
          gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + startTime + dur - 0.5);
          gain.gain.linearRampToValueAtTime(0, ctx.currentTime + startTime + dur);
          osc.connect(gain);
          gain.connect(this.musicGain!);
          osc.start(ctx.currentTime + startTime);
          osc.stop(ctx.currentTime + startTime + dur);
        }
      };

      // Ambient space chord progression - each chord 4 seconds, loop of 16s
      const chords = [
        [130.81, 196.00, 261.63],  // C3, G3, C4
        [146.83, 220.00, 293.66],  // D3, A3, D4
        [164.81, 246.94, 329.63],  // E3, B3, E4
        [130.81, 196.00, 261.63],  // C3, G3, C4
      ];

      const loopDuration = 16;
      chords.forEach((notes, i) => {
        playChord(notes, i * 4, 4.5);
      });

      // Re-trigger the loop
      const loopInterval = setInterval(() => {
        if (!this.musicPlaying || this._muted) return;
        try {
          chords.forEach((notes, i) => {
            playChord(notes, i * 4, 4.5);
          });
        } catch {
          clearInterval(loopInterval);
        }
      }, loopDuration * 1000);

      // Store for cleanup
      (this as any)._musicInterval = loopInterval;
    } catch {
      // Audio context may be blocked
    }
  }

  stopMusic(): void {
    this.musicPlaying = false;
    if ((this as any)._musicInterval) {
      clearInterval((this as any)._musicInterval);
      (this as any)._musicInterval = null;
    }
  }
}

/** Global singleton sound manager */
export const SoundManager = new SoundManagerClass();
