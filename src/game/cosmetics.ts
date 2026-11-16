/**
 * 완두콩 꾸미기: 콩 종류(몸 색)와 소품.
 * 모두 코드로 그려서 이미지 파일이 없어요. 확률형 뽑기 없이 코인으로 바로 사요.
 */

export type BeanId = 'pea' | 'soy' | 'red' | 'kidney' | 'black' | 'gold';
export type AccId = 'none' | 'sprout' | 'ribbon' | 'partyhat' | 'glasses' | 'headphones' | 'crown';

export interface BeanStyle {
  id: BeanId;
  name: string;
  price: number;
  body: string;
  outline: string;
  shade: string;
  ink: string; // 눈·입 색
  cheek: string;
}

export interface AccStyle {
  id: AccId;
  name: string;
  price: number;
  tall: boolean; // 머리 위로 높이 솟는지(우주 헬멧 크기 조절용)
}

export const BEANS: BeanStyle[] = [
  { id: 'pea', name: '완두콩', price: 0, body: '#A9E28B', outline: '#6DB658', shade: 'rgba(96,170,80,.22)', ink: '#3F4A3A', cheek: 'rgba(255,150,160,.6)' },
  { id: 'soy', name: '메주콩', price: 100, body: '#FFE9A8', outline: '#D7B25C', shade: 'rgba(200,160,70,.22)', ink: '#4A3F2E', cheek: 'rgba(255,150,140,.6)' },
  { id: 'red', name: '팥', price: 150, body: '#E89090', outline: '#B4555C', shade: 'rgba(150,50,60,.22)', ink: '#3E2328', cheek: 'rgba(255,210,210,.7)' },
  { id: 'kidney', name: '강낭콩', price: 200, body: '#F5B9D2', outline: '#C97C9E', shade: 'rgba(180,90,130,.2)', ink: '#4A2E3C', cheek: 'rgba(255,120,150,.55)' },
  { id: 'black', name: '검은콩', price: 300, body: '#6E6880', outline: '#3E3948', shade: 'rgba(20,15,30,.25)', ink: '#FFFFFF', cheek: 'rgba(255,140,170,.55)' },
  { id: 'gold', name: '황금콩', price: 800, body: '#FFD45E', outline: '#D69B12', shade: 'rgba(200,130,0,.22)', ink: '#4A3510', cheek: 'rgba(255,140,110,.55)' },
];

export const ACCS: AccStyle[] = [
  { id: 'none', name: '없음', price: 0, tall: false },
  { id: 'sprout', name: '새싹', price: 60, tall: true },
  { id: 'ribbon', name: '리본', price: 120, tall: false },
  { id: 'glasses', name: '선글라스', price: 200, tall: false },
  { id: 'partyhat', name: '고깔모자', price: 250, tall: true },
  { id: 'headphones', name: '헤드폰', price: 350, tall: false },
  { id: 'crown', name: '왕관', price: 600, tall: true },
];

export const beanStyle = (id: BeanId) => BEANS.find((b) => b.id === id) ?? BEANS[0];
export const accStyle = (id: AccId) => ACCS.find((a) => a.id === id) ?? ACCS[0];

export const itemKey = (kind: 'bean' | 'acc', id: string) => `${kind}:${id}`;

export function isOwned(owned: string[], kind: 'bean' | 'acc', id: string, price: number) {
  return price === 0 || owned.includes(itemKey(kind, id));
}

const TAU = Math.PI * 2;

/** 소품 중 얼굴 뒤에 그릴 것(헤드폰 머리띠) */
export function drawAccBack(ctx: CanvasRenderingContext2D, acc: AccId, x: number, cy: number, R: number) {
  if (acc !== 'headphones') return;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#4C4A63';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, cy - 2, R + 3, 1.1 * Math.PI, 1.9 * Math.PI);
  ctx.stroke();
}

/** 소품 중 얼굴 앞에 그릴 것 */
export function drawAccFront(ctx: CanvasRenderingContext2D, acc: AccId, x: number, cy: number, R: number) {
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  switch (acc) {
    case 'sprout': {
      const top = cy - R + 1;
      ctx.strokeStyle = '#4E9A3A';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.quadraticCurveTo(x + 1, top - 7, x - 1, top - 11);
      ctx.stroke();
      ctx.fillStyle = '#7ED36A';
      ctx.strokeStyle = '#4E9A3A';
      ctx.lineWidth = 1.6;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(x + s * 6, top - 12, 6, 3.4, s * -0.5, 0, TAU);
        ctx.fill();
        ctx.stroke();
      }
      break;
    }
    case 'ribbon': {
      const rx = x + 10;
      const ry = cy - R + 3;
      ctx.fillStyle = '#FF7A9C';
      ctx.strokeStyle = '#D24D72';
      ctx.lineWidth = 1.6;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx + s * 9, ry - 6);
        ctx.lineTo(rx + s * 9, ry + 5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(rx, ry, 3, 0, TAU);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'glasses': {
      ctx.fillStyle = 'rgba(40,36,60,.92)';
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(x + s * 6.5, cy + 0.5, 5.6, 4.4, 0, 0, TAU);
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(40,36,60,.92)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(x - 1.5, cy - 0.5);
      ctx.lineTo(x + 1.5, cy - 0.5);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(x + s * 6.5 - 2, cy - 1.2, 1.6, 1, -0.4, 0, TAU);
        ctx.fill();
      }
      break;
    }
    case 'partyhat': {
      const base = cy - R + 4;
      ctx.save();
      ctx.translate(x + 3, base);
      ctx.rotate(0.18);
      ctx.beginPath();
      ctx.moveTo(-9, 0);
      ctx.lineTo(9, 0);
      ctx.lineTo(0, -20);
      ctx.closePath();
      ctx.fillStyle = '#7FB8FF';
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.fillStyle = '#FFE27A';
      for (let i = 0; i < 3; i++) ctx.fillRect(-10, -4 - i * 7, 20, 3);
      ctx.restore();
      ctx.strokeStyle = '#4C82CC';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.fillStyle = '#FF7A9C';
      ctx.beginPath();
      ctx.arc(0, -21, 3.2, 0, TAU);
      ctx.fill();
      ctx.restore();
      break;
    }
    case 'headphones': {
      for (const s of [-1, 1]) {
        ctx.fillStyle = '#FF8FA8';
        ctx.strokeStyle = '#4C4A63';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(x + s * (R + 1), cy - 1, 4.5, 7, 0, 0, TAU);
        ctx.fill();
        ctx.stroke();
      }
      break;
    }
    case 'crown': {
      const b = cy - R + 3;
      ctx.beginPath();
      ctx.moveTo(x - 10, b);
      ctx.lineTo(x - 11, b - 11);
      ctx.lineTo(x - 5, b - 5);
      ctx.lineTo(x, b - 14);
      ctx.lineTo(x + 5, b - 5);
      ctx.lineTo(x + 11, b - 11);
      ctx.lineTo(x + 10, b);
      ctx.closePath();
      ctx.fillStyle = '#FFD54A';
      ctx.fill();
      ctx.strokeStyle = '#C9921A';
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.fillStyle = '#FF6B8A';
      ctx.beginPath();
      ctx.arc(x, b - 4, 2.2, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#6EC6FF';
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(x + s * 6.5, b - 3, 1.7, 0, TAU);
        ctx.fill();
      }
      break;
    }
    default:
      break;
  }
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
}
