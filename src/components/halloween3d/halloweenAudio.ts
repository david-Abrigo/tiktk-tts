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
   * Sonido continuo o pulsado de raspado de pluma / tiza sobre lienzo
   */
  public startQuillScratch() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    if (this.scratchGain) return; // Ya está sonando

    try {
      // Buffer de ruido blanco filtrado para simular fricción de pluma/pincel sobre papel rugoso
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const bandpass = this.ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.value = 1800;
      bandpass.Q.value = 3.5;

      const gain = this.ctx.createGain();
      gain.gain.value = 0.08;

      whiteNoise.connect(bandpass);
      bandpass.connect(gain);
      gain.connect(this.ctx.destination);

      whiteNoise.start();

      this.scratchGain = gain;

      // Micro modulaciones para que suene como trazos vivos
      this.scratchTimer = setInterval(() => {
        if (!this.scratchGain || !this.ctx) return;
        const targetGain = 0.04 + Math.random() * 0.09;
        this.scratchGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
      }, 80);
    } catch (e) {
      // Audio context might be restricted before user gesture
    }
  }

  public stopQuillScratch() {
    if (this.scratchTimer) {
      clearInterval(this.scratchTimer);
      this.scratchTimer = null;
    }
    if (this.scratchGain && this.ctx) {
      try {
        this.scratchGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      } catch {}
      this.scratchGain = null;
    }
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
   * Trueno y rayo de ultratumba para regalos grandes o legendarios
   */
  public playThunder() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 2.5;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.8));
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const lowpass = this.ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(400, now);
    lowpass.frequency.exponentialRampToValueAtTime(60, now + 2.0);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.4);

    whiteNoise.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(this.ctx.destination);

    whiteNoise.start(now);
    whiteNoise.stop(now + 2.5);
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
