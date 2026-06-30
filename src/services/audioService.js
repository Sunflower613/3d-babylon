/**
 * 音频服务（Task 2.3）。
 *
 * 短音效播放：宿主提供 `window.parent.playCustomSound` 时委托宿主，
 * 否则独立运行时回退到本地 Web Audio。行为与原 `playCustomSound` 一致。
 */
export class AudioService {
  constructor() {
    this.audioCtx = null;
  }

  play(freq, duration, type = 'sine', vol = 0.05) {
    if (window.parent && typeof window.parent.playCustomSound === 'function') {
      window.parent.playCustomSound(freq, duration, type, vol);
      return;
    }
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(vol, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (e) {
      console.warn('Play sound failed', e);
    }
  }
}
