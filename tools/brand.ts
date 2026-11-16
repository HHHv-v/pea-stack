/**
 * 앱인토스 콘솔 등록 이미지
 * - 앱 로고: 600×600 PNG, 배경색 필수(투명 불가), 둥근 모서리 불가
 * - 게임 썸네일: 1932×828 PNG, 핵심 플레이가 보이게
 * 게임과 같은 그리기 함수를 써서 화면과 똑같은 느낌을 내요.
 */
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import { BH, FONT, drawPea, drawPot, drawSlab } from '../src/game/draw';

const HUES = [140, 205, 330, 45, 265, 175, 15];

function tower(ctx: CanvasRenderingContext2D, cx: number, groundY: number, widths: number[], potW: number, mood: 'calm' | 'happy', helmet = false) {
  drawPot(ctx, cx, groundY, potW);
  let y = groundY - BH;
  widths.forEach((w, i) => {
    drawSlab(ctx, cx - w / 2 + (i % 2 ? 2 : -2), y, w, HUES[i % HUES.length]);
    y -= BH;
  });
  drawPea(ctx, cx, y + BH, mood, helmet);
}

function stars(ctx: CanvasRenderingContext2D, x0: number, x1: number, h: number, n: number, seed = 7) {
  let s = seed;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  ctx.fillStyle = '#fff';
  for (let i = 0; i < n; i++) {
    ctx.globalAlpha = 0.4 + rnd() * 0.6;
    ctx.beginPath();
    ctx.arc(x0 + rnd() * (x1 - x0), rnd() * h, 0.8 + rnd() * 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function cloud(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color = 'rgba(255,255,255,.85)') {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, 70 * s, 26 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 44 * s, y + 8 * s, 50 * s, 20 * s, 0, 0, Math.PI * 2);
  ctx.fill();
}

/* ---------- 앱 로고 600×600 ---------- */
function drawLogo() {
  const c = document.getElementById('logo') as HTMLCanvasElement;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, 600);
  g.addColorStop(0, '#78C8FF');
  g.addColorStop(1, '#E1F5FF');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 600, 600);
  ctx.fillStyle = '#FFE27A';
  ctx.beginPath();
  ctx.arc(470, 120, 52, 0, Math.PI * 2);
  ctx.fill();
  cloud(ctx, 90, 150, 1.1);
  ctx.save();
  ctx.translate(300, 0);
  ctx.scale(2.6, 2.6);
  tower(ctx, 0, 205, [118, 96, 78], 150, 'happy');
  ctx.restore();
}

/* ---------- 게임 썸네일 1932×828 ---------- */
function drawThumb() {
  const W = 1932;
  const H = 828;
  const c = document.getElementById('thumb') as HTMLCanvasElement;
  const ctx = c.getContext('2d')!;
  // 왼쪽 파란 하늘 → 가운데 노을 → 오른쪽 우주
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, '#78C8FF');
  g.addColorStop(0.42, '#9AD3FF');
  g.addColorStop(0.62, '#FF9A6A');
  g.addColorStop(0.8, '#3A2870');
  g.addColorStop(1, '#0E1238');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const v = ctx.createLinearGradient(0, 0, 0, H);
  v.addColorStop(0, 'rgba(255,255,255,0)');
  v.addColorStop(1, 'rgba(255,255,255,.25)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  stars(ctx, 1450, W, H * 0.8, 90);
  ctx.fillStyle = '#FFF3C4';
  ctx.beginPath();
  ctx.arc(1790, 150, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFB3C7';
  ctx.beginPath();
  ctx.arc(1640, 420, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.85)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(1640, 420, 42, 11, -0.35, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,241,201,.9)';
  ctx.beginPath();
  ctx.arc(1180, 560, 120, 0, Math.PI * 2);
  ctx.fill();
  cloud(ctx, 980, 190, 1.4);
  cloud(ctx, 1180, 420, 1.1, 'rgba(255,214,190,.85)');

  // 탑: 오른쪽, 꾹 눌러 자라는 막대가 위에 떠 있어요
  ctx.save();
  ctx.translate(1300, 0);
  ctx.scale(1.55, 1.55);
  tower(ctx, 0, 560, [190, 178, 168, 160, 150, 146, 140, 132, 126, 118], 230, 'happy');
  drawSlab(ctx, -62, 105, 124, 300);
  ctx.setLineDash([6, 7]);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = 'rgba(255,255,255,.75)';
  ctx.beginPath();
  ctx.moveTo(-59, 150);
  ctx.lineTo(-59, 175);
  ctx.moveTo(59, 150);
  ctx.lineTo(59, 175);
  ctx.stroke();
  ctx.restore();

  // 제목
  ctx.fillStyle = '#2B2540';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `800 132px ${FONT}`;
  ctx.fillText('완두콩의', 120, 330);
  ctx.fillText('높이 쌓기', 120, 480);
  ctx.font = `600 50px ${FONT}`;
  ctx.fillStyle = 'rgba(43,37,64,.72)';
  ctx.fillText('꾹 눌러 키우고, 딱 맞춰 쌓아', 124, 590);
  ctx.fillText('완두콩을 우주까지 올려 보내요', 124, 660);
}

void document.fonts.load(`800 132px ${FONT}`).then(() => document.fonts.ready).then(() => {
  drawLogo();
  drawThumb();
  document.body.dataset.ready = '1';
});
