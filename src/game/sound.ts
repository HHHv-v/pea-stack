/**
 * 소리: 음원 파일 없이 Web Audio로 합성해요.
 * 누르는 동안 이어지는 음은 막대 폭이 아래층과 같아지는 순간 항상 같은 높이(라, 440Hz)가 돼요.
 */
type Ctx = AudioContext;

const PENTA = [0, 2, 4, 7, 9];
const note = (n: number) => {
  const k = Math.min(n, 14);
  return 523.25 * Math.pow(2, (Math.floor(k / 5) * 12 + PENTA[k % 5]) / 12);
};

export class Sound {
  muted = false;
  private ac: Ctx | null = null;
  private holdOsc: OscillatorNode | null = null;
  private holdGain: GainNode | null = null;

  /** 사용자 동작(탭) 안에서 한 번 불러야 소리가 나요. */
  unlock() {
    this.ctx();
  }

  private ctx(): Ctx | null {
    if (this.muted) return null;
    try {
      if (!this.ac) {
        const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!C) return null;
        this.ac = new C();
      }
      if (this.ac.state === 'suspended') void this.ac.resume().catch(() => {});
      return this.ac;
    } catch {
      return null;
    }
  }

  private tone(f: number, d: number, type: OscillatorType = 'sine', vol = 0.15, to?: number, delay = 0) {
    const a = this.ctx();
    if (!a) return;
    try {
      const t = a.currentTime + delay;
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f, t);
      if (to) o.frequency.exponentialRampToValueAtTime(to, t + d);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g);
      g.connect(a.destination);
      o.start(t);
      o.stop(t + d + 0.03);
    } catch {
      /* 소리는 없어도 게임은 계속돼요 */
    }
  }

  perfect(combo: number) {
    const f = note(combo - 1);
    this.tone(f, 0.34, 'triangle', 0.2);
    this.tone(f * 2, 0.24, 'sine', 0.07, undefined, 0.03);
    this.tone(110, 0.09, 'sine', 0.16, 70);
  }
  place(accuracy: number) {
    this.tone(170 + accuracy * 110, 0.13, 'sine', 0.2, 120);
    this.tone(88, 0.07, 'square', 0.04);
  }
  cut() {
    this.tone(150, 0.1, 'sawtooth', 0.05, 70, 0.02);
  }
  over() {
    this.tone(330, 0.55, 'triangle', 0.16, 70);
    this.tone(196, 0.55, 'sine', 0.1, 52, 0.06);
  }
  win() {
    [0, 2, 4, 7, 9].forEach((n, i) => this.tone(note(n + 5), 0.28, 'triangle', 0.14, undefined, i * 0.09));
  }
  ui() {
    this.tone(700, 0.06, 'sine', 0.07);
  }

  holdStart() {
    const a = this.ctx();
    if (!a) return;
    try {
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = 'triangle';
      o.frequency.value = 220;
      g.gain.setValueAtTime(0.0001, a.currentTime);
      g.gain.exponentialRampToValueAtTime(0.09, a.currentTime + 0.03);
      o.connect(g);
      g.connect(a.destination);
      o.start();
      this.holdOsc = o;
      this.holdGain = g;
    } catch {
      this.holdOsc = null;
      this.holdGain = null;
    }
  }

  /** ratio = 현재 폭 / 아래층 폭. 1일 때 440Hz예요. */
  holdPitch(ratio: number) {
    if (!this.holdOsc || !this.ac) return;
    try {
      this.holdOsc.frequency.setTargetAtTime(220 * Math.pow(2, ratio), this.ac.currentTime, 0.01);
    } catch {
      /* noop */
    }
  }

  holdStop() {
    const o = this.holdOsc;
    const g = this.holdGain;
    this.holdOsc = null;
    this.holdGain = null;
    if (!o || !g || !this.ac) return;
    try {
      const t = this.ac.currentTime;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      o.stop(t + 0.08);
    } catch {
      /* noop */
    }
  }
}
