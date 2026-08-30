class RetroAudio {
  private ctx: AudioContext | null = null;

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private playTone(type: OscillatorType, freq1: number, freq2: number, duration: number, vol = 0.1) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = type;
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(freq1, now);
    if (freq1 !== freq2) {
      osc.frequency.exponentialRampToValueAtTime(freq2, now + duration);
    }

    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    osc.start(now);
    osc.stop(now + duration);
  }

  playLaser() {
    this.playTone('square', 800, 200, 0.15, 0.1);
  }

  playBounce() {
    this.playTone('sine', 400, 600, 0.1, 0.1);
  }

  playHit() {
    this.playTone('sawtooth', 150, 100, 0.2, 0.1);
  }

  playScore() {
    this.playTone('square', 800, 1200, 0.1, 0.05);
  }

  playShatter() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 0.2; // 200ms
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    
    noise.start();
  }
}

const audioEngine = new RetroAudio();

export const useRetroAudio = (isMuted: boolean) => {
  return {
    init: () => {
      if (!isMuted) audioEngine.init();
    },
    playLaser: () => {
      if (!isMuted) audioEngine.playLaser();
    },
    playBounce: () => {
      if (!isMuted) audioEngine.playBounce();
    },
    playHit: () => {
      if (!isMuted) audioEngine.playHit();
    },
    playScore: () => {
      if (!isMuted) audioEngine.playScore();
    },
    playShatter: () => {
      if (!isMuted) audioEngine.playShatter();
    }
  };
};
