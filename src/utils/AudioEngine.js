class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.humOsc = null;
    this.humGain = null;
    this.isMuted = true;
    this.dripInterval = null;
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) return;
    
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.isMuted ? 0 : 0.4;
      this.masterGain.connect(this.ctx.destination);

      this.isInitialized = true;
      this.setupHum();
      this.setupDrips();
    } catch (e) {
      console.warn("Web Audio API not supported or blocked: ", e);
    }
  }

  setMute(mute) {
    this.isMuted = mute;
    if (!this.isInitialized) {
      this.init();
    }
    
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    if (this.masterGain) {
      // Smooth fade to prevent clicking
      const targetGain = mute ? 0 : 0.4;
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.ctx.currentTime);
      this.masterGain.gain.exponentialRampToValueAtTime(targetGain + 0.0001, this.ctx.currentTime + 0.3);
    }
  }

  setupHum() {
    if (!this.ctx) return;

    // Ballast Hum: Low frequency oscillator + filter + volume instability LFO
    this.humOsc = this.ctx.createOscillator();
    this.humOsc.type = 'sawtooth';
    this.humOsc.frequency.value = 60; // 60Hz mains hum

    // Lowpass filter to muffle the buzz, leaving a heavy low hum
    const humFilter = this.ctx.createBiquadFilter();
    humFilter.type = 'lowpass';
    humFilter.frequency.value = 120; // Cut off higher harmonics

    this.humGain = this.ctx.createGain();
    this.humGain.gain.value = 0.15;

    // LFO to modulate volume slightly, simulating unstable power bulb
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.45; // Very slow drift (every 2.2s)

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.04; // Amount of fluctuation

    // Connect LFO to hum gain
    lfo.connect(lfoGain);
    lfoGain.connect(this.humGain.gain);

    // Main connections
    this.humOsc.connect(humFilter);
    humFilter.connect(this.humGain);
    this.humGain.connect(this.masterGain);

    // Start oscillators
    this.humOsc.start();
    lfo.start();
  }

  setupDrips() {
    // Schedule random water drips in the background
    const scheduleNextDrip = () => {
      const nextTime = Math.random() * 8000 + 4000; // Every 4-12 seconds
      this.dripInterval = setTimeout(() => {
        if (!this.isMuted && this.ctx && this.ctx.state === 'running') {
          this.triggerDrip();
        }
        scheduleNextDrip();
      }, nextTime);
    };
    
    scheduleNextDrip();
  }

  triggerDrip() {
    if (!this.isInitialized || this.isMuted || !this.ctx) return;

    try {
      const now = this.ctx.currentTime;

      // Synthesizing a water drip: rapid pitch drop + fast decay
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(450, now);
      // Sweeps frequency upward slightly then downward rapidly
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.02);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.12);

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.2, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

      osc.connect(gainNode);
      gainNode.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.16);

      // Subtle drip echo/reverb simulator (very simple decay tap)
      setTimeout(() => {
        if (this.isMuted || !this.ctx) return;
        const echoTime = this.ctx.currentTime;
        const echoGain = this.ctx.createGain();
        const echoOsc = this.ctx.createOscillator();

        echoOsc.type = 'sine';
        echoOsc.frequency.setValueAtTime(250, echoTime);
        echoOsc.frequency.exponentialRampToValueAtTime(80, echoTime + 0.15);

        echoGain.gain.setValueAtTime(0.03, echoTime);
        echoGain.gain.exponentialRampToValueAtTime(0.0001, echoTime + 0.2);

        echoOsc.connect(echoGain);
        echoGain.connect(this.masterGain);

        echoOsc.start(echoTime);
        echoOsc.stop(echoTime + 0.21);
      }, 120);

    } catch (e) {
      console.warn("Failed to play drip sound: ", e);
    }
  }

  triggerClick() {
    if (!this.isInitialized || this.isMuted || !this.ctx) return;

    try {
      const now = this.ctx.currentTime;

      // Click: metallic spring pinch sound (short noise burst + high sine)
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1800, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.03);

      gainNode.gain.setValueAtTime(0.12, now);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

      // Create high-pass filter for metal sound
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 1000;

      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch (e) {
      console.warn("Failed to play click: ", e);
    }
  }

  triggerSplash() {
    if (!this.isInitialized || this.isMuted || !this.ctx) return;

    try {
      const now = this.ctx.currentTime;

      // Splash: low pass noise burst + sine wave sweep
      const bufferSize = this.ctx.sampleRate * 0.4; // 400ms buffer
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(150, now);
      filter.frequency.exponentialRampToValueAtTime(400, now + 0.15);
      filter.frequency.exponentialRampToValueAtTime(80, now + 0.4);

      const gainNode = this.ctx.createGain();
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      noise.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.masterGain);

      // Add a low bubbling sweep in parallel
      const sine = this.ctx.createOscillator();
      const sineGain = this.ctx.createGain();
      
      sine.type = 'sine';
      sine.frequency.setValueAtTime(100, now);
      sine.frequency.exponentialRampToValueAtTime(40, now + 0.3);

      sineGain.gain.setValueAtTime(0.15, now);
      sineGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

      sine.connect(sineGain);
      sineGain.connect(this.masterGain);

      noise.start(now);
      sine.start(now);
      noise.stop(now + 0.4);
      sine.stop(now + 0.3);
    } catch (e) {
      console.warn("Failed to play splash: ", e);
    }
  }

  destroy() {
    if (this.dripInterval) {
      clearTimeout(this.dripInterval);
    }
    if (this.humOsc) {
      try {
        this.humOsc.stop();
      } catch (e) {}
    }
    if (this.ctx) {
      this.ctx.close();
    }
    this.isInitialized = false;
  }
}

// Export singleton instance
const audioEngine = new AudioEngine();
export default audioEngine;
