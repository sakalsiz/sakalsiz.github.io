/**
 * BBS Sound Engine
 *
 * Web Audio API-based sound effects for the BBS experience:
 * - DTMF touch tones (phone dialing)
 * - US phone ring
 * - Modem negotiation noise (carrier, scramble, handshake)
 * - Disconnect/busy tone
 *
 * Usage:
 *   const sounds = new BBSSounds();
 *   sounds.dialDigit(5);
 *   sounds.ring();
 *   sounds.modemNegotiation(3.5);
 *   sounds.disconnect();
 */

class BBSSounds {
  constructor(opts) {
    this.enabled = opts?.enabled !== false;
    this.ctx = null;
  }

  _getCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this.ctx;
  }

  _tone(freq, duration, type, vol) {
    if (!this.enabled) return;
    const ctx = this._getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.value = vol || 0.15;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.stop(ctx.currentTime + duration);
  }

  // DTMF dual-tone for a digit (0-9)
  dialDigit(digit, duration) {
    if (!this.enabled) return;
    const lo = [697,697,697,770,770,770,852,852,852,941][digit];
    const hi = [1209,1336,1477,1209,1336,1477,1209,1336,1477,1336][digit];
    this._tone(lo, duration || 0.12, 'sine', 0.12);
    this._tone(hi, duration || 0.12, 'sine', 0.12);
  }

  // Dial a full number string (digits only, ignores non-digits)
  dialNumber(number, onComplete) {
    if (!this.enabled) { if (onComplete) onComplete(); return; }
    const digits = number.replace(/\D/g, '').split('').map(Number);
    digits.forEach((d, i) => {
      setTimeout(() => this.dialDigit(d), i * 120);
    });
    if (onComplete) {
      setTimeout(onComplete, digits.length * 120 + 100);
    }
  }

  // US phone ring (440+480 Hz, two bursts)
  ring() {
    if (!this.enabled) return;
    this._tone(440, 0.8, 'sine', 0.1);
    this._tone(480, 0.8, 'sine', 0.1);
    setTimeout(() => {
      this._tone(440, 0.8, 'sine', 0.1);
      this._tone(480, 0.8, 'sine', 0.1);
    }, 200);
  }

  // Modem negotiation screech
  modemNegotiation(duration) {
    if (!this.enabled) return;
    duration = duration || 3.5;
    const ctx = this._getCtx();
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    const third = Math.floor(bufferSize / 3);

    // Phase 1: carrier tones
    for (let i = 0; i < third; i++) {
      const t = i / ctx.sampleRate;
      data[i] = 0.08 * Math.sin(2 * Math.PI * 1200 * t) +
                0.06 * Math.sin(2 * Math.PI * 2400 * t);
    }
    // Phase 2: scrambled negotiation
    for (let i = third; i < third * 2; i++) {
      const t = i / ctx.sampleRate;
      const freq = 600 + 2000 * Math.sin(t * 50);
      data[i] = 0.07 * Math.sin(2 * Math.PI * freq * t) +
                0.04 * (Math.random() * 2 - 1);
    }
    // Phase 3: handshake squeal
    for (let i = third * 2; i < bufferSize; i++) {
      const t = i / ctx.sampleRate;
      const sweep = 1800 + 600 * Math.sin(t * 30);
      data[i] = 0.06 * Math.sin(2 * Math.PI * sweep * t) +
                0.03 * Math.sin(2 * Math.PI * (sweep * 1.5) * t);
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = 0.5;
    source.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    source.start();
  }

  // Disconnect / busy tone
  disconnect() {
    if (!this.enabled) return;
    this._tone(480, 0.3, 'sine', 0.15);
    this._tone(620, 0.3, 'sine', 0.15);
    setTimeout(() => {
      this._tone(480, 0.3, 'sine', 0.12);
      this._tone(620, 0.3, 'sine', 0.12);
    }, 500);
  }

  // Keyboard click sound (subtle)
  keyClick() {
    if (!this.enabled) return;
    this._tone(800, 0.02, 'square', 0.03);
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }
}

export default BBSSounds;
