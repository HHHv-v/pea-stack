/**
 * 완두콩 꾸미기: 콩 종류(몸 색)와 소품.
 * 모두 코드로 그려서 이미지 파일이 없어요. 확률형 뽑기 없이 코인으로 바로 사요.
 */

export type BeanId =
  | 'pea' | 'soy' | 'mung' | 'red' | 'peanut' | 'kidney' | 'mint' | 'black' | 'sky' | 'cotton' | 'gold' | 'rainbow';
export type AccId =
  | 'none' | 'sprout' | 'ribbon' | 'flower' | 'roundglasses' | 'catears' | 'beanie' | 'glasses'
  | 'partyhat' | 'strawhat' | 'headphones' | 'gradcap' | 'halo' | 'crown';

export interface BeanStyle {
  id: BeanId;
  name: string;
  price: number;
  body: string;
  grad?: string[]; // 있으면 몸을 이 색들로 비스듬히 칠해요
  sparkle?: boolean; // 반짝이 두 점
  outline: string;
  shade: string;
  ink: string; // 눈·입 색
  cheek: string;
}

export interface AccStyle {
  id: AccId;
  name: string;
  price: number;
  helmet: number; // 우주 헬멧을 얼마나 크게 키울지(머리 위로 솟거나 옆으로 넓은 소품)
}

/*
 * 가격 기준: 코인은 하루 첫 3판(5층마다 1개, 딱 10번마다 1개, 판당 보통 20개 안팎)과
 * 오늘의 도전(20개), 출석(5개)으로 하루 80~90개쯤 모여요.
 * 싼 건 하루 이틀, 중간은 일주일쯤, 무지개콩·왕관(1000)은 한 달쯤 모아야 하는 목표예요.
 */
export const BEANS: BeanStyle[] = [
  { id: 'pea', name: '완두콩', price: 0, body: '#A9E28B', outline: '#6DB658', shade: 'rgba(96,170,80,.22)', ink: '#3F4A3A', cheek: 'rgba(255,150,160,.6)' },
  { id: 'soy', name: '메주콩', price: 60, body: '#FFE9A8', outline: '#D7B25C', shade: 'rgba(200,160,70,.22)', ink: '#4A3F2E', cheek: 'rgba(255,150,140,.6)' },
  { id: 'mung', name: '녹두', price: 80, body: '#D6E57E', outline: '#9AAE3E', shade: 'rgba(130,150,40,.22)', ink: '#3F4528', cheek: 'rgba(255,150,140,.55)' },
  { id: 'red', name: '팥', price: 120, body: '#E89090', outline: '#B4555C', shade: 'rgba(150,50,60,.22)', ink: '#3E2328', cheek: 'rgba(255,210,210,.7)' },
  { id: 'peanut', name: '땅콩', price: 160, body: '#EDCB9F', outline: '#B98B56', shade: 'rgba(160,110,50,.22)', ink: '#4A3624', cheek: 'rgba(255,140,130,.55)' },
  { id: 'kidney', name: '강낭콩', price: 200, body: '#F5B9D2', outline: '#C97C9E', shade: 'rgba(180,90,130,.2)', ink: '#4A2E3C', cheek: 'rgba(255,120,150,.55)' },
  { id: 'mint', name: '민트콩', price: 240, body: '#A8ECD8', outline: '#5DBA9C', shade: 'rgba(40,140,110,.2)', ink: '#2F4A42', cheek: 'rgba(255,150,170,.55)' },
  { id: 'black', name: '검은콩', price: 300, body: '#6E6880', outline: '#3E3948', shade: 'rgba(20,15,30,.25)', ink: '#FFFFFF', cheek: 'rgba(255,140,170,.55)' },
  { id: 'sky', name: '하늘콩', price: 360, body: '#B6DBFF', outline: '#6EA4DE', shade: 'rgba(50,110,180,.2)', ink: '#2E3D52', cheek: 'rgba(255,150,170,.55)' },
  { id: 'cotton', name: '솜사탕콩', price: 440, body: '#E4D0F0', grad: ['#FFC6DE', '#E4D0F0', '#BFE0FF'], outline: '#B795C8', shade: 'rgba(130,90,160,.16)', ink: '#463A52', cheek: 'rgba(255,120,160,.5)' },
  { id: 'gold', name: '황금콩', price: 600, body: '#FFD45E', sparkle: true, outline: '#D69B12', shade: 'rgba(200,130,0,.22)', ink: '#4A3510', cheek: 'rgba(255,140,110,.55)' },
  { id: 'rainbow', name: '무지개콩', price: 10000, body: '#C9E6B0', grad: ['#FFA3A3', '#FFD98A', '#B8E89A', '#9CD3FF', '#C9AEFF'], sparkle: true, outline: '#8C7CC0', shade: 'rgba(80,60,140,.14)', ink: '#3A3450', cheek: 'rgba(255,120,150,.5)' },
];

export const ACCS: AccStyle[] = [
  { id: 'none', name: '없음', price: 0, helmet: 0 },
  { id: 'sprout', name: '새싹', price: 40, helmet: 6 },
  { id: 'ribbon', name: '리본', price: 80, helmet: 0 },
  { id: 'flower', name: '꽃핀', price: 100, helmet: 0 },
  { id: 'roundglasses', name: '동그란 안경', price: 120, helmet: 0 },
  { id: 'catears', name: '고양이 귀', price: 160, helmet: 5 },
  { id: 'beanie', name: '털모자', price: 200, helmet: 3 },
  { id: 'glasses', name: '선글라스', price: 240, helmet: 0 },
  { id: 'partyhat', name: '고깔모자', price: 280, helmet: 6 },
  { id: 'strawhat', name: '밀짚모자', price: 320, helmet: 6 },
  { id: 'headphones', name: '헤드폰', price: 360, helmet: 0 },
  { id: 'gradcap', name: '학사모', price: 400, helmet: 4 },
  { id: 'halo', name: '천사 링', price: 500, helmet: 6 },
  { id: 'crown', name: '왕관', price: 10000, helmet: 6 },
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
  ctx.lineJoin = 'round';
  if (acc === 'catears') {
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + s * 15, cy - 6);
      ctx.lineTo(x + s * 13, cy - R - 8);
      ctx.lineTo(x + s * 3, cy - R + 1);
      ctx.closePath();
      ctx.fillStyle = '#FFF4EA';
      ctx.fill();
      ctx.strokeStyle = '#C99A86';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + s * 12.5, cy - 9);
      ctx.lineTo(x + s * 12, cy - R - 3);
      ctx.lineTo(x + s * 6, cy - R + 1);
      ctx.closePath();
      ctx.fillStyle = '#FFB3C6';
      ctx.fill();
    }
    ctx.lineJoin = 'miter';
    return;
  }
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
    case 'flower': {
      const fx = x - 10;
      const fy = cy - R + 5;
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#F29BB5';
      ctx.lineWidth = 1.3;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU - Math.PI / 2;
        ctx.beginPath();
        ctx.arc(fx + Math.cos(a) * 4.2, fy + Math.sin(a) * 4.2, 3.2, 0, TAU);
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = '#FFD54A';
      ctx.beginPath();
      ctx.arc(fx, fy, 2.6, 0, TAU);
      ctx.fill();
      break;
    }
    case 'roundglasses': {
      ctx.strokeStyle = '#6B4A3A';
      ctx.lineWidth = 1.8;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(x + s * 6.5, cy + 0.3, 5, 0, TAU);
        ctx.fillStyle = 'rgba(255,255,255,.28)';
        ctx.fill();
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(x - 1.5, cy - 0.5);
      ctx.quadraticCurveTo(x, cy - 2, x + 1.5, cy - 0.5);
      ctx.stroke();
      break;
    }
    case 'beanie': {
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, cy - 1, R + 1.6, Math.PI * 1.07, Math.PI * 1.93);
      ctx.closePath();
      ctx.fillStyle = '#FF9F7A';
      ctx.fill();
      ctx.clip();
      ctx.strokeStyle = 'rgba(200,90,60,.35)';
      ctx.lineWidth = 1.4;
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(x + i * 5, cy - 8);
        ctx.lineTo(x + i * 4, cy - R - 4);
        ctx.stroke();
      }
      ctx.restore();
      ctx.strokeStyle = '#D9694A';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(x, cy - 1, R + 1.6, Math.PI * 1.07, Math.PI * 1.93);
      ctx.closePath();
      ctx.stroke();
      // 접힌 단
      ctx.fillStyle = '#F07F5C';
      ctx.beginPath();
      ctx.roundRect(x - R - 0.5, cy - 9.5, 2 * R + 1, 5.5, 2.5);
      ctx.fill();
      ctx.stroke();
      // 방울
      ctx.fillStyle = '#FFF4EA';
      ctx.beginPath();
      ctx.arc(x, cy - R - 4, 4.4, 0, TAU);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'strawhat': {
      const by = cy - R + 6;
      ctx.fillStyle = '#F4D58A';
      ctx.strokeStyle = '#B98F3E';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(x, by, 11, Math.PI, TAU);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FF7A7A';
      ctx.fillRect(x - 10.6, by - 4, 21.2, 3.4);
      ctx.beginPath();
      ctx.ellipse(x, by, 23, 4.6, 0, 0, TAU);
      ctx.fillStyle = '#F7DD98';
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'gradcap': {
      const top = cy - R - 2;
      ctx.fillStyle = '#3F3B52';
      ctx.strokeStyle = '#2A2738';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.roundRect(x - 9, top + 1, 18, 7, 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x - 17, top);
      ctx.lineTo(x, top - 6);
      ctx.lineTo(x + 17, top);
      ctx.lineTo(x, top + 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#FFC93C';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x + 12, top + 1);
      ctx.lineTo(x + 12, top + 10);
      ctx.stroke();
      ctx.fillStyle = '#FFC93C';
      ctx.beginPath();
      ctx.arc(x + 12, top + 11, 1.8, 0, TAU);
      ctx.fill();
      break;
    }
    case 'halo': {
      const hy = cy - R - 7;
      ctx.strokeStyle = 'rgba(255,226,122,.45)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.ellipse(x, hy, 11, 3.6, 0, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = '#FFD54A';
      ctx.lineWidth = 2.6;
      ctx.stroke();
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
