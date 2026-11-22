/**
 * 완두콩의 높이 쌓기 게임 엔진.
 *
 * 규칙
 * - 누르는 동안 막대가 양옆으로 자라고, 손을 떼면 내려앉아요.
 * - 아래층과 폭이 같으면(오차 3.5% 이내) "딱!". 3번 연속부터는 딱마다 폭이 6px씩 회복돼요.
 * - 틀리면 틀린 폭의 1.4배만큼 탑이 좁아져요(넘친 부분과 가장자리가 함께 부서져요).
 * - 폭이 36px(시작 폭의 15%)보다 좁아지거나, 누르는 동안 막대는 아래층의 1.7배까지 자랐다 줄었다를 반복해요.
 * - 블록마다 자라는 속도가 달라서 박자로 외울 수 없어요.
 */
import type { HapticFeedbackType } from '@apps-in-toss/web-framework';
import { BH, FONT, type Mood, clamp01, drawPea, drawPot, drawSky, drawSlab, isNightSky, roundRect, skyColors, skyFloor } from './draw';
import type { AccId, BeanId } from './cosmetics';
import type { Sound } from './sound';

export type Phase = 'ready' | 'play' | 'over';
export type Stage = 0 | 1 | 2; // 파란 하늘, 노을, 우주

/** 단계가 바뀌는 층수 */
export const STAGE_FLOORS = { sunset: 25, space: 60 } as const;

/**
 * 난이도. 초반은 넉넉하게 시작해서 층이 올라갈수록 조금씩 빡빡해져요(TUNING.ramp층에서 최종값).
 * 시뮬레이션(친구들 v4 실제 기록으로 실력 보정): 서툰 사람 ~70층, 보통 ~85층, 잘하는 사람 ~120층.
 */
export const TUNING = {
  ramp: 140, // 이 층수에 걸쳐 아래 '시작 → 끝' 값으로 바뀌어요
  perfectMinPx: 3.5,
  missPenalty: [0.25, 0.9], // 틀린 폭의 몇 배만큼 좁아지는지
  recoverAfter: 2, // 몇 번 연속 딱부터 폭이 회복되는지
  recoverPx: 10,
  speedBase: 140, // 막대가 자라는 속도(px/s)
  speedPerFloor: 1.6,
  speedMax: 320,
  minWidthPx: 36, // 탑 폭이 이보다(또는 시작 폭의 15%보다) 좁아지면 끝 — 연타로 버티는 것 방지
  minWidthRatio: 0.15,
  comboSpeedUp: 0.08, // 연속 딱 1번마다 막대 속도 +8% (층과 상관없이, 실수하면 원래대로)
  comboSpeedMax: 1.0, // 최대 +100% (13콤보부터)
  swingMax: 1.7, // 누르는 동안 막대가 아래층의 이 배수까지 자랐다가 다시 줄어들어요
} as const;

/**
 * 딱 판정 비율(아래층 폭 대비 ±).
 * 0~59층: 9%에서 20층마다 1.5%p씩 → 9, 7.5, 6
 * 60층부터: 20층마다 1%p씩 → 5, 4, 3, 2 — 2%에서 더 줄지 않아요.
 */
export function perfectRatio(n: number) {
  if (n < 60) return 0.09 - 0.015 * Math.floor(n / 20);
  return Math.max(0.02, 0.06 - 0.01 * (Math.floor((n - 60) / 20) + 1));
}

/** 층수 n에서의 값(시작 → 끝을 ramp층에 걸쳐 직선으로) */
export function tuned(pair: readonly [number, number], n: number) {
  const t = Math.min(1, Math.max(0, n / TUNING.ramp));
  return pair[0] + (pair[1] - pair[0]) * t;
}

export interface GameCallbacks {
  onScore?: (score: number) => void;
  onStage?: (stage: Stage) => void;
  onNight?: (night: boolean) => void;
  onDailyCleared?: () => void;
  onOver?: (result: { score: number; perfects: number; dailyCleared: boolean }) => void;
}

interface Block { x: number; w: number; hue: number; t: number; flash: number }
interface Current { w: number; hold: boolean; speed: number; hue: number; dir: 1 | -1 }
interface Debris { x: number; y: number; w: number; vx: number; vy: number; r: number; vr: number; hue: number }
interface Particle { x: number; y: number; vx: number; vy: number; t: number; hue: number }
interface Ring { x: number; y: number; w: number; t: number }
interface Float { x: number; y: number; t: number; s: string; big?: boolean }

const reduceMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function nextHue(prev: number) {
  let h: number;
  let d: number;
  do {
    h = Math.floor(Math.random() * 360);
    d = Math.abs(((h - prev + 540) % 360) - 180);
  } while (d < 45); // 바로 아래층과 비슷한 색은 피해요
  return h;
}

export class PeaStackGame {
  phase: Phase = 'ready';

  private ctx: CanvasRenderingContext2D;
  private W = 0;
  private H = 0;
  private dpr = 1;
  private raf = 0;
  private ro: ResizeObserver | null = null;
  private lastT = 0;
  private now = 0;

  private blocks: Block[] = [];
  private cur: Current | null = null;
  private debris: Debris[] = [];
  private parts: Particle[] = [];
  private rings: Ring[] = [];
  private floats: Float[] = [];

  private baseW = 240;
  private combo = 0;
  private cam = 0;
  private shake = 0;
  private bgF = 0;
  private stage: Stage = 0;
  private mood: Mood = 'calm';
  private moodUntil = 0;
  private night = false;
  private revived = false;
  private perfects = 0;
  private dailyClearedThisRun = false;
  /** 꾸미기에서 고른 콩·소품 */
  look: { bean: BeanId; acc: AccId } = { bean: 'pea', acc: 'none' };
  private dailyTarget = Infinity;
  private dailyDone = true;

  private canvas: HTMLCanvasElement;
  private sound: Sound;
  private haptic: (type: HapticFeedbackType) => void;
  private cb: GameCallbacks;

  constructor(
    canvas: HTMLCanvasElement,
    sound: Sound,
    haptic: (type: HapticFeedbackType) => void,
    cb: GameCallbacks = {},
  ) {
    this.canvas = canvas;
    this.sound = sound;
    this.haptic = haptic;
    this.cb = cb;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('캔버스를 만들 수 없어요.');
    this.ctx = ctx;
    this.resize();
    this.reset();
    // 웹뷰에 따라 처음 잰 크기가 CSS 적용 전 기본값(300×150)이거나 0일 수 있어요.
    // 캔버스 크기가 바뀌면 바로 다시 재요.
    if (typeof ResizeObserver !== 'undefined') {
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(canvas);
    }
    this.raf = requestAnimationFrame(this.frame);
  }

  get score() {
    return Math.max(0, this.blocks.length - 1);
  }

  get canRevive() {
    return !this.revived && this.score > 0;
  }

  /** 캔버스의 실제 화면 크기에 맞춰 그리는 해상도를 맞춰요. 크기가 그대로면 아무것도 안 해요. */
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const r = this.canvas.getBoundingClientRect();
    const w = r.width || window.innerWidth;
    const h = r.height || window.innerHeight;
    if (w <= 0 || h <= 0) return; // 아직 화면에 안 붙었어요. 다음에 다시 재요.
    if (Math.abs(w - this.W) < 0.5 && Math.abs(h - this.H) < 0.5 && dpr === this.dpr) return;
    this.dpr = dpr;
    this.W = w;
    this.H = h;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    // 시작 전이면 바뀐 폭에 맞춰 받침 폭도 다시 정해요(게임 중에는 쌓인 층을 그대로 둬요).
    if (this.phase === 'ready' && this.blocks.length <= 1) this.reset();
  }

  destroy() {
    this.ro?.disconnect();
    this.ro = null;
    cancelAnimationFrame(this.raf);
    this.sound.holdStop();
  }

  private reset() {
    this.baseW = Math.min(this.W * 0.58, 250);
    this.blocks = [{ x: -this.baseW / 2, w: this.baseW, hue: Math.floor(Math.random() * 360), t: -1e4, flash: -1e4 }];
    this.debris = [];
    this.parts = [];
    this.rings = [];
    this.floats = [];
    this.combo = 0;
    this.cam = 0;
    this.shake = 0;
    this.bgF = 0;
    this.stage = 0;
    this.moodUntil = 0;
    this.revived = false;
    this.perfects = 0;
    this.dailyClearedThisRun = false;
    this.cur = null;
  }

  start(opts: { dailyTarget: number; dailyDone: boolean }) {
    this.reset();
    this.dailyTarget = opts.dailyTarget;
    this.dailyDone = opts.dailyDone;
    this.phase = 'play';
    this.spawn();
    this.cb.onScore?.(0);
    this.cb.onStage?.(0);
  }

  /** 광고를 본 뒤 한 번 이어해요. 맨 위층 폭을 처음 폭의 60%까지 넓혀 줘요. */
  revive() {
    if (!this.canRevive || this.phase !== 'over') return;
    this.revived = true;
    const top = this.blocks[this.blocks.length - 1];
    const w = Math.max(top.w, this.baseW * 0.6);
    const c = top.x + top.w / 2;
    top.w = w;
    top.x = c - w / 2;
    top.flash = this.now;
    this.phase = 'play';
    this.combo = 0;
    this.spawn();
  }

  /** 개발용: n층까지 쌓인 상태로 바로 만들어요(스크린샷·확인용). */
  debugBuild(n: number) {
    if (this.phase !== 'play') return;
    let hue = this.blocks[0].hue;
    for (let i = 0; i < n; i++) {
      hue = nextHue(hue);
      const w = this.baseW * (0.9 - 0.25 * Math.random() * (i / Math.max(1, n)));
      this.blocks.push({ x: -w / 2 + (Math.random() - 0.5) * 6, w, hue, t: -1e4, flash: -1e4 });
    }
    this.stage = n >= STAGE_FLOORS.space ? 2 : n >= STAGE_FLOORS.sunset ? 1 : 0;
    this.bgF = n;
    this.cam = Math.max(0, Math.max(this.H * 0.55, 365) - this.H * 0.8 + this.blocks.length * BH);
    if (!this.dailyDone && this.score >= this.dailyTarget) {
      this.dailyDone = true;
      this.cb.onDailyCleared?.();
    }
    this.cb.onScore?.(this.score);
    this.spawn();
  }

  private spawn() {
    const n = this.blocks.length;
    this.cur = {
      w: 12,
      dir: 1,
      hold: false,
      speed:
        Math.min(TUNING.speedBase + n * TUNING.speedPerFloor, TUNING.speedMax) *
        (1 + Math.min(this.combo * TUNING.comboSpeedUp, TUNING.comboSpeedMax)),
      hue: nextHue(this.blocks[n - 1].hue),
    };
  }

  private blockY(i: number) {
    return this.H * 0.8 - (i + 1) * BH + this.cam;
  }

  press() {
    if (this.phase !== 'play' || !this.cur || this.cur.hold) return;
    this.cur.hold = true;
    this.sound.holdStart();
    this.haptic('tickWeak');
  }

  /** 누르던 중에 앱이 가려지거나 손가락 입력이 취소되면 놓지 않고 처음부터 다시 누르게 해요. */
  cancelHold() {
    const cur = this.cur;
    if (this.phase !== 'play' || !cur || !cur.hold) return;
    this.sound.holdStop();
    cur.hold = false;
    cur.w = 12;
    cur.dir = 1;
  }

  release() {
    const cur = this.cur;
    if (this.phase !== 'play' || !cur || !cur.hold) return;
    this.sound.holdStop();
    const now = this.now;
    const top = this.blocks[this.blocks.length - 1];
    const n = this.blocks.length;
    const c = top.x + top.w / 2;
    const w = cur.w;
    const diff = w - top.w;
    const tol = Math.max(TUNING.perfectMinPx, top.w * perfectRatio(n));
    const y = this.blockY(n);

    if (Math.abs(diff) <= tol) {
      this.combo++;
      this.perfects++;
      let nw = top.w;
      if (this.combo >= TUNING.recoverAfter && nw < this.baseW) nw = Math.min(this.baseW, nw + TUNING.recoverPx);
      const nx = c - nw / 2;
      this.blocks.push({ x: nx, w: nw, hue: cur.hue, t: now, flash: now });
      this.rings.push({ x: nx, y, w: nw, t: now });
      for (let i = 0; i < 14; i++) {
        const side = i % 2 ? 1 : -1;
        this.parts.push({
          x: nx + (side > 0 ? nw : 0), y: y + BH / 2,
          vx: side * (60 + Math.random() * 160), vy: -80 - Math.random() * 200,
          t: now, hue: cur.hue,
        });
      }
      this.floats.push({ x: c, y: y - 8, t: now, s: this.combo > 1 ? `딱! ×${this.combo}` : '딱!' });
      this.sound.perfect(this.combo);
      this.haptic('success');
      this.shake = 2.5;
      this.setMood('happy', 700);
    } else {
      const err = Math.abs(diff);
      const nw = top.w - err * tuned(TUNING.missPenalty, n);
      this.combo = 0;
      const cut = (w - Math.max(0, nw)) / 2; // 양쪽 가장자리에서 부서지는 폭
      if (cut > 1) {
        this.debris.push({ x: c - w / 2, y, w: cut, vx: -90, vy: -40, r: 0, vr: -2.4, hue: cur.hue });
        this.debris.push({ x: c + w / 2 - cut, y, w: cut, vx: 90, vy: -40, r: 0, vr: 2.4, hue: cur.hue });
      }
      if (nw < Math.max(TUNING.minWidthPx, this.baseW * TUNING.minWidthRatio)) {
        if (nw > 1) this.debris.push({ x: c - nw / 2, y, w: nw, vx: 0, vy: 0, r: 0, vr: 1.2, hue: cur.hue });
        this.cur = null;
        this.gameOver();
        return;
      }
      this.blocks.push({ x: c - nw / 2, w: nw, hue: cur.hue, t: now, flash: -1e4 });
      this.floats.push({ x: c, y: y - 8, t: now, s: diff > 0 ? '넘쳤다!' : '모자라!' });
      this.sound.place(nw / top.w);
      if (diff > 0) this.sound.cut();
      this.haptic(diff > 0 ? 'basicMedium' : 'basicWeak');
      this.shake = diff > 0 ? 5 : 3;
      this.setMood('shock', 500);
    }

    const s = this.score;
    if (!this.dailyDone && s >= this.dailyTarget) {
      this.dailyDone = true;
      this.dailyClearedThisRun = true;
      this.floats.push({ x: 0, y: this.H * 0.3, t: now, s: '오늘의 도전 달성!', big: true });
      this.sound.win();
      this.haptic('confetti');
      this.cb.onDailyCleared?.();
    }
    const ns: Stage = s >= STAGE_FLOORS.space ? 2 : s >= STAGE_FLOORS.sunset ? 1 : 0;
    if (ns > this.stage) {
      this.stage = ns;
      this.floats.push({ x: 0, y: this.H * 0.38, t: now, s: ns === 2 ? '우주 도착!' : '노을이 져요', big: true });
      if (ns === 2) this.sound.win();
      this.haptic('wiggle');
      this.cb.onStage?.(ns);
    }
    this.cb.onScore?.(s);
    this.spawn();
  }

  private gameOver() {
    this.phase = 'over';
    this.sound.holdStop();
    this.sound.over();
    this.haptic('error');
    this.shake = 9;
    const s = this.score;
    window.setTimeout(() => {
      if (this.phase === 'over') this.cb.onOver?.({ score: s, perfects: this.perfects, dailyCleared: this.dailyClearedThisRun });
    }, 650);
  }

  private setMood(m: Mood, ms: number) {
    this.mood = m;
    this.moodUntil = this.now + ms;
  }

  private frame = (t: number) => {
    // ResizeObserver가 없거나 늦는 웹뷰를 위한 안전장치: 화면 크기와 다르면 다시 재요.
    const cw = this.canvas.clientWidth;
    const ch = this.canvas.clientHeight;
    if (cw > 0 && ch > 0 && (Math.abs(cw - this.W) > 1 || Math.abs(ch - this.H) > 1)) this.resize();
    this.now = t;
    const dt = Math.min(0.033, (t - this.lastT) / 1000 || 0);
    this.lastT = t;
    this.update(dt);
    this.render(t, dt);
    this.raf = requestAnimationFrame(this.frame);
  };

  private update(dt: number) {
    const cur = this.cur;
    if (this.phase === 'play' && cur?.hold) {
      const tw = this.blocks[this.blocks.length - 1].w;
      // 아래층의 1.7배까지 자랐다가 다시 줄어들고, 처음 폭까지 줄면 또 자라요(누르는 동안 계속 왕복).
      const maxW = tw * TUNING.swingMax;
      cur.w += cur.dir * cur.speed * dt;
      if (cur.w >= maxW) { cur.w = maxW - (cur.w - maxW); cur.dir = -1; }
      else if (cur.w <= 12) { cur.w = 12 + (12 - cur.w); cur.dir = 1; }
      this.sound.holdPitch(cur.w / tw);
    }
    // 맨 위층이 화면 절반쯤(작은 폰에서는 HUD 아래 365px)에 오도록 카메라를 올려요
    const topTarget = Math.max(this.H * 0.55, 365);
    const camT = Math.max(0, topTarget - this.H * 0.8 + this.blocks.length * BH);
    this.cam += (camT - this.cam) * Math.min(1, dt * 7);
    this.bgF += (this.score - this.bgF) * Math.min(1, dt * 2.5);
    this.shake *= Math.exp(-dt * 13);

    const night = isNightSky(skyColors(skyFloor(this.bgF))[0]);
    if (night !== this.night) {
      this.night = night;
      this.cb.onNight?.(night);
    }
  }

  private render(t: number, dt: number) {
    const { ctx, W, H } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    drawSky(ctx, W, H, skyFloor(this.bgF), t, this.cam);

    ctx.save();
    if (!reduceMotion() && this.shake > 0.1) ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    const cx = W / 2;
    const gy = H * 0.8 + this.cam;
    if (gy < H + 20) drawPot(ctx, cx, gy, this.baseW);

    for (let i = 0; i < this.blocks.length; i++) {
      const b = this.blocks[i];
      const y = this.blockY(i);
      if (y > H + BH) continue;
      drawSlab(ctx, cx + b.x, y, b.w, b.hue, Math.max(0, 1 - (t - b.t) / 170), Math.max(0, 1 - (t - b.flash) / 260));
    }

    { // 새 층이 쌓이면 완두콩이 폴짝 올라타요
      const i = this.blocks.length - 1;
      const tb = this.blocks[i];
      const k = clamp01((t - tb.t) / 260);
      const py = this.blockY(i) + (1 - k) * BH - Math.sin(Math.PI * k) * 16;
      const mood: Mood = t < this.moodUntil ? this.mood : this.phase === 'over' ? 'shock' : 'calm';
      drawPea(ctx, cx + tb.x + tb.w / 2, py, mood, skyFloor(this.bgF) > 24, this.look);
    }

    const cur = this.cur;
    if (cur && this.phase === 'play') {
      const top = this.blocks[this.blocks.length - 1];
      const c = cx + top.x + top.w / 2;
      const ty = this.blockY(this.blocks.length - 1);
      const hy = this.blockY(this.blocks.length) - 54;
      if (this.score < 3) { // 처음 세 층만 맞출 폭을 점선으로 알려줘요
        ctx.setLineDash([5, 6]);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(43,37,64,.35)';
        ctx.beginPath();
        ctx.moveTo(c - top.w / 2, ty);
        ctx.lineTo(c - top.w / 2, hy - 8);
        ctx.moveTo(c + top.w / 2, ty);
        ctx.lineTo(c + top.w / 2, hy - 8);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      const pw = cur.hold ? cur.w : 12 + 3 * Math.sin(t / 180);
      drawSlab(ctx, c - pw / 2, hy, pw, cur.hue);
      if (this.score === 0 && !cur.hold) {
        ctx.textAlign = 'center';
        ctx.font = `600 16px ${FONT}`;
        ctx.fillStyle = 'rgba(43,37,64,.8)';
        ctx.fillText('화면을 꾹 누르고 있다가 떼세요', cx, hy - 22);
      }
    }

    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      d.vy += 1500 * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.r += d.vr * dt;
      if (d.y > H + 80) {
        this.debris.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.translate(cx + d.x + d.w / 2, d.y + BH / 2);
      ctx.rotate(d.r);
      drawSlab(ctx, -d.w / 2, -BH / 2, d.w, d.hue);
      ctx.restore();
    }

    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      const k = (t - r.t) / 380;
      if (k >= 1) {
        this.rings.splice(i, 1);
        continue;
      }
      const e = 18 * k;
      roundRect(ctx, cx + r.x - e, r.y - e, r.w + e * 2, BH + e * 2, 12 + e);
      ctx.strokeStyle = `rgba(255,255,255,${1 - k})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      const k = (t - p.t) / 520;
      if (k >= 1) {
        this.parts.splice(i, 1);
        continue;
      }
      p.vy += 900 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = `hsl(${p.hue} 95% 85%)`;
      ctx.beginPath();
      ctx.arc(cx + p.x, p.y, 4 * (1 - k) + 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.textAlign = 'center';
    for (let i = this.floats.length - 1; i >= 0; i--) {
      const f = this.floats[i];
      const k = (t - f.t) / (f.big ? 1500 : 700);
      if (k >= 1) {
        this.floats.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = k < 0.8 ? 1 : (1 - k) * 5;
      ctx.font = `800 ${f.big ? 28 : 22}px ${FONT}`;
      ctx.lineWidth = 5;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(43,37,64,.85)';
      ctx.fillStyle = '#fff';
      const yy = f.y - 34 * k;
      ctx.strokeText(f.s, cx + f.x, yy);
      ctx.fillText(f.s, cx + f.x, yy);
      ctx.globalAlpha = 1;
      ctx.lineJoin = 'miter';
    }
    ctx.restore();
  }
}
