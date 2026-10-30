/**
 * Generador Procedural de Efectos de Sonido con Web Audio API para Halloween 3D
 * Totalmente autónomo: no requiere archivos MP3 externos ni dependencias.
 */

class HalloweenAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private scratchOsc: OscillatorNode | null = null;
  private scratchGain: GainNode | null = null;
  private scratchTimer: any = null;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && this.ctx) {
      this.stopQuillScratch();
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Silenciado: Eliminado el ruido blanco continuo durante el dibujo
   */
  public startQuillScratch() {
    // Ruido blanco eliminado para mantener el audio limpio y sin estática
  }

  public stopQuillScratch() {
    if (this.scratchTimer) {
      clearInterval(this.scratchTimer);
      this.scratchTimer = null;
    }
    this.scratchGain = null;
  }

  /**
   * Campanada espectral de medianoche cuando llega un regalo
   */
  public playSpookyChime(pitchMultiplier = 1.0) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const baseFreqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 espectral

    baseFreqs.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * pitchMultiplier, now + idx * 0.05);

      gain.gain.setValueAtTime(0.12 / (idx + 1), now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.05 + 1.8);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 2.0);
    });
  }

  /**
   * Trueno y rayo de ultratumba (Sub-bass armónico limpio, sin ruido blanco)
   */
  public playThunder() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(24, now + 1.8);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 2.1);
  }

  /**
   * Risa siniestra / acorde tétrico al invocar un retrato legendario
   */
  public playWitchLaugh() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Ráfaga de notas staccato descendentes
    const notes = [650, 720, 680, 600, 520, 480, 430];
    notes.forEach((freq, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = now + i * 0.12;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, startTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.85, startTime + 0.1);

      gain.gain.setValueAtTime(0.14, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.11);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.12);
    });
  }

  /**
   * Fanfarria triunfal cuando el dibujo se completa
   */
  public playVictoryFanfare() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const chords = [
      { f: 440, t: 0 },
      { f: 554.37, t: 0.12 },
      { f: 659.25, t: 0.24 },
      { f: 880, t: 0.38 },
      { f: 1108.73, t: 0.52 },
    ];

    chords.forEach(({ f, t }) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + t);

      gain.gain.setValueAtTime(0.18, now + t);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 1.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + t);
      osc.stop(now + t + 1.3);
    });
  }
}

export const halloweenAudio = new HalloweenAudioEngine();
