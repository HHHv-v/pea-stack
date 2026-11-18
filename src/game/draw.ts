/** 화면에 그리는 함수들. 상태는 갖지 않고, 받은 값대로 그리기만 해요. */
import { type AccId, type BeanId, accStyle, beanStyle, drawAccBack, drawAccFront } from './cosmetics';

export const BH = 38; // 한 층의 높이(px)
export const FONT = "'Pretendard Variable', Pretendard, -apple-system, 'Apple SD Gothic Neo', sans-serif";

type RGB = [number, number, number];
export type Mood = 'calm' | 'happy' | 'shock';

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const mix = (a: RGB, b: RGB, k: number): RGB => [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * k)) as RGB;

/**
 * 하늘 색은 '하늘 층' 기준으로 그려요(파란 하늘 0~8 → 노을 14~20 → 우주 28~).
 * 실제 층수는 skyFloor()로 이 기준에 맞춰 바꿔요: 노을이 25층, 우주가 60층쯤에 오도록.
 */
const SKY_MAP: [number, number][] = [
  [0, 0],
  [25, 12],
  [60, 26],
  [120, 60],
];

/** 실제 층수(소수 가능) → 하늘 그림 기준 층수 */
export function skyFloor(n: number) {
  for (let i = 0; i < SKY_MAP.length - 1; i++) {
    const [a, fa] = SKY_MAP[i];
    const [b, fb] = SKY_MAP[i + 1];
    if (n <= b) return fa + ((n - a) / (b - a)) * (fb - fa);
  }
  const [a, fa] = SKY_MAP[SKY_MAP.length - 2];
  const [b, fb] = SKY_MAP[SKY_MAP.length - 1];
  return fb + ((n - b) / (b - a)) * (fb - fa);
}

/* 하늘 3단계: 파란 하늘(0~8) → 주황 노을(14~20) → 우주(28~), '하늘 층' 기준 */
const STOPS: [number, RGB, RGB][] = [
  [0, [120, 200, 255], [225, 245, 255]],
  [8, [120, 200, 255], [225, 245, 255]],
  [14, [255, 150, 95], [255, 220, 170]],
  [20, [245, 120, 100], [255, 200, 150]],
  [28, [14, 18, 56], [58, 40, 110]],
  [60, [5, 7, 20], [26, 24, 70]],
];

export function skyColors(f: number): [RGB, RGB] {
  let i = 0;
  while (i < STOPS.length - 2 && f > STOPS[i + 1][0]) i++;
  const A = STOPS[i];
  const B = STOPS[i + 1];
  const k = clamp01((f - A[0]) / (B[0] - A[0]));
  return [mix(A[1], B[1], k), mix(A[2], B[2], k)];
}

export const isNightSky = (c: RGB) => c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11 < 150;

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const q = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + q, y);
  ctx.lineTo(x + w - q, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + q);
  ctx.lineTo(x + w, y + h - q);
  ctx.quadraticCurveTo(x + w, y + h, x + w - q, y + h);
  ctx.lineTo(x + q, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - q);
  ctx.lineTo(x, y + q);
  ctx.quadraticCurveTo(x, y, x + q, y);
  ctx.closePath();
}

const STARS = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.4 + 0.4, p: Math.random() * 6 }));
const CLOUDS = [
  { x: 0.15, y: 0.16, s: 1 },
  { x: 0.72, y: 0.3, s: 0.75 },
  { x: 0.45, y: 0.52, s: 0.55 },
];

/** 배경: 하늘 그라데이션, 해·지는 해·별·달·행성·구름 */
export function drawSky(ctx: CanvasRenderingContext2D, W: number, H: number, f: number, t: number, cam: number) {
  const [c1, c2] = skyColors(f);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, `rgb(${c1})`);
  g.addColorStop(1, `rgb(${c2})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const dayA = clamp01(1 - (f - 7) / 6);
  if (dayA > 0) {
    const sx = W * 0.8;
    const sy = H * 0.17;
    ctx.globalAlpha = dayA;
    ctx.fillStyle = 'rgba(255,236,150,.35)';
    ctx.beginPath();
    ctx.arc(sx, sy, 46 + 3 * Math.sin(t / 600), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFE27A';
    ctx.beginPath();
    ctx.arc(sx, sy, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  const setA = clamp01((f - 9) / 4) * clamp01(1 - (f - 21) / 5);
  if (setA > 0) {
    const sy = H * (0.5 + clamp01((f - 9) / 17) * 0.22);
    ctx.globalAlpha = setA;
    ctx.fillStyle = 'rgba(255,245,210,.3)';
    ctx.beginPath();
    ctx.arc(W * 0.5, sy, 96, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFF1C9';
    ctx.beginPath();
    ctx.arc(W * 0.5, sy, 64, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  const sa = clamp01((f - 22) / 6);
  if (sa > 0) {
    ctx.fillStyle = '#fff';
    for (const s of STARS) {
      ctx.globalAlpha = sa * (0.55 + 0.45 * Math.sin(t / 700 + s.p));
      ctx.beginPath();
      ctx.arc(s.x * W, s.y * H * 0.9, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = sa;
    const mx = W * 0.2;
    const my = H * 0.2;
    ctx.fillStyle = '#FFF3C4';
    ctx.beginPath();
    ctx.arc(mx, my, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(230,200,140,.6)';
    ctx.beginPath();
    ctx.arc(mx - 8, my - 6, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(mx + 9, my + 8, 3.5, 0, Math.PI * 2);
    ctx.fill();
    const px = W * 0.82;
    const py = H * 0.44;
    ctx.fillStyle = '#FFB3C7';
    ctx.beginPath();
    ctx.arc(px, py, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(px, py, 26, 7, -0.35, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  const ca = clamp01(1 - (f - 18) / 6);
  if (ca > 0) {
    ctx.fillStyle = `rgba(${mix([255, 255, 255], [255, 214, 190], clamp01((f - 8) / 6))},${0.8 * ca})`;
    for (const c of CLOUDS) {
      const x = ((c.x * W + t * 0.006 * c.s) % (W + 200)) - 100;
      const y = c.y * H + cam * 0.25;
      ctx.beginPath();
      ctx.ellipse(x, y, 70 * c.s, 26 * c.s, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 44 * c.s, y + 8 * c.s, 50 * c.s, 20 * c.s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** 받침대: 위가 넓고 아래로 좁아지는 화분 */
export function drawPot(ctx: CanvasRenderingContext2D, cx: number, gy: number, baseW: number) {
  const a = baseW * 0.4;
  const b = a * 0.62;
  const D = 260;
  ctx.lineJoin = 'round';
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#DCA680';
  ctx.beginPath();
  ctx.moveTo(cx - a, gy + 16);
  ctx.lineTo(cx + a, gy + 16);
  ctx.lineTo(cx + b, gy + 16 + D);
  ctx.lineTo(cx - b, gy + 16 + D);
  ctx.closePath();
  ctx.fillStyle = '#F6CBAB';
  ctx.fill();
  ctx.stroke();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = 'rgba(220,150,110,.28)';
  ctx.fillRect(cx - a, gy + 16, a * 2, 14);
  ctx.restore();
  roundRect(ctx, cx - a - 12, gy, a * 2 + 24, 24, 12);
  ctx.fillStyle = '#FBDCC2';
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.6)';
  ctx.beginPath();
  ctx.ellipse(cx - a + 6, gy + 8, 9, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineJoin = 'miter';
}

/**
 * 젤리 막대. 폭이 계속 변하므로 이미지 대신 코드로 그려요.
 * squash: 착지 직후 눌리는 정도(0~1), flash: 딱 맞췄을 때 빛나는 정도(0~1)
 */
export function drawSlab(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, hue: number, squash = 0, flash = 0) {
  const hh = BH * (1 - 0.2 * squash) - 3;
  const ww = w * (1 + 0.06 * squash);
  const px = x - (ww - w) / 2;
  const py = y + BH - hh - 1.5;
  const r = Math.min(15, ww / 2, hh / 2);
  ctx.save();
  roundRect(ctx, px, py, ww, hh, r);
  ctx.clip();
  ctx.fillStyle = `hsl(${hue} 80% 75%)`;
  ctx.fillRect(px, py, ww, hh);
  ctx.fillStyle = `hsl(${hue} 72% 67%)`;
  ctx.fillRect(px, py + hh * 0.68, ww, hh);
  ctx.fillStyle = `hsl(${hue} 92% 85% / .75)`;
  ctx.fillRect(px, py + 3, ww, hh * 0.2);
  if (flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${0.7 * flash})`;
    ctx.fillRect(px, py, ww, hh);
  }
  ctx.restore();
  roundRect(ctx, px, py, ww, hh, r);
  ctx.strokeStyle = `hsl(${hue} 48% 55%)`;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  if (ww > 36) {
    ctx.fillStyle = 'rgba(255,255,255,.78)';
    ctx.beginPath();
    ctx.ellipse(px + 16, py + 9, 7, 3.4, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px + 28, py + 8, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** 완두콩: 탑 꼭대기에 앉는 동그란 캐릭터. 표정은 눈과 입만 바뀌어요. (x, y)는 발밑 가운데. */
export function drawPea(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  mood: Mood,
  helmet: boolean,
  look: { bean: BeanId; acc: AccId } = { bean: 'pea', acc: 'none' },
) {
  const R = 17;
  const cy = y - R;
  const st = beanStyle(look.bean);
  const INK = st.ink;
  const TAU = Math.PI * 2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  drawAccBack(ctx, look.acc, x, cy, R);

  ctx.beginPath();
  ctx.arc(x, cy, R, 0, TAU);
  if (st.grad) {
    const g = ctx.createLinearGradient(x - R, cy - R, x + R, cy + R);
    st.grad.forEach((c, i) => g.addColorStop(i / (st.grad!.length - 1), c));
    ctx.fillStyle = g;
  } else ctx.fillStyle = st.body;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = st.outline;
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, cy, R - 1.2, 0, TAU);
  ctx.clip();
  ctx.fillStyle = st.shade;
  ctx.beginPath();
  ctx.arc(x + 3, cy + 13, R, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = 'rgba(255,255,255,.8)';
  ctx.beginPath();
  ctx.ellipse(x - 7, cy - 9, 4.6, 2.5, -0.6, 0, TAU);
  ctx.fill();
  if (st.sparkle) {
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.beginPath();
    ctx.arc(x + 9, cy - 8, 1.6, 0, TAU);
    ctx.arc(x + 12, cy - 3, 1, 0, TAU);
    ctx.fill();
  }

  ctx.fillStyle = st.cheek;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(x + s * 10, cy + 5, 3.6, 2.6, 0, 0, TAU);
    ctx.fill();
  }

  ctx.fillStyle = INK;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(x + s * 6, cy, mood === 'shock' ? 3 : 2.3, 0, TAU);
    ctx.fill();
  }

  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.8;
  if (mood === 'happy') {
    ctx.beginPath();
    ctx.arc(x, cy + 4, 3.8, 0, Math.PI);
    ctx.closePath();
    ctx.fillStyle = '#FBA3AE';
    ctx.fill();
    ctx.stroke();
  } else if (mood === 'shock') {
    ctx.beginPath();
    ctx.ellipse(x, cy + 6.5, 1.9, 2.5, 0, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = '#9FD4FF';
    ctx.beginPath();
    ctx.arc(x + 19, cy - 9, 2.6, 0, TAU);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(x, cy + 3, 2.6, 0.12 * Math.PI, 0.88 * Math.PI);
    ctx.stroke();
  }

  drawAccFront(ctx, look.acc, x, cy, R);

  if (helmet) {
    const hr = 25 + accStyle(look.acc).helmet;
    const hc = cy - (hr - 25);
    ctx.beginPath();
    ctx.arc(x, hc, hr, 0, TAU);
    ctx.fillStyle = 'rgba(190,225,255,.16)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, hc, hr - 5, 1.15 * Math.PI, 1.45 * Math.PI);
    ctx.strokeStyle = 'rgba(255,255,255,.7)';
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
}
