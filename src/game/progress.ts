import { loadValue, saveValue } from '../platform/toss';
import type { AccId, BeanId } from './cosmetics';

export const dayKey = (d = new Date()) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

/**
 * 오늘의 도전 층수. 그 사람의 최고 기록에 맞춰 정해요.
 * - 처음에는 10층
 * - 그 뒤로는 최고 기록의 85% 근처에서, 날짜마다 -2~+3층씩 흔들려요
 * - 하루 동안은 바뀌지 않도록 그날 처음 정한 값을 저장해 둬요
 */
export function dailyTargetFor(best: number, d = new Date()) {
  if (best <= 0) return 10;
  const n = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  const jitter = (((n * 9301 + 49297) % 233280) % 6) - 2;
  return Math.max(8, Math.min(80, Math.round(best * 0.85) + jitter));
}

export interface Progress {
  best: number;
  streak: number;
  lastPlayed: string;
  dailyDoneOn: string;
  dailyDay: string;
  dailyTarget: number;
  muted: boolean;
  coins: number;
  owned: string[]; // 'bean:soy', 'acc:crown' 같은 형식
  bean: BeanId;
  acc: AccId;
}

const EMPTY: Progress = {
  best: 0,
  streak: 0,
  lastPlayed: '',
  dailyDoneOn: '',
  dailyDay: '',
  dailyTarget: 10,
  muted: false,
  coins: 0,
  owned: [],
  bean: 'pea',
  acc: 'none',
};

/** 기록은 토스 사용자 키별로 따로 저장해요. */
let storageKey = 'progress_local';

export async function loadProgress(userKey: string): Promise<Progress> {
  storageKey = `progress_${userKey}`;
  const p = await loadValue<Partial<Progress>>(storageKey, {});
  return refreshDaily({ ...EMPTY, ...p });
}

export function saveProgress(p: Progress) {
  saveValue(storageKey, p);
}

/** 날짜가 바뀌었으면 오늘의 도전 목표를 새로 정해요. */
export function refreshDaily(p: Progress): Progress {
  const today = dayKey();
  if (p.dailyDay === today) return p;
  return { ...p, dailyDay: today, dailyTarget: dailyTargetFor(p.best) };
}

/** 오늘 처음 플레이하면 연속 출석을 갱신해요. 어제 했으면 +1, 아니면 1부터 다시. */
export function touchStreak(p: Progress): Progress {
  const today = dayKey();
  if (p.lastPlayed === today) return p;
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return { ...p, lastPlayed: today, streak: p.lastPlayed === dayKey(y) ? p.streak + 1 : 1 };
}

/* ---------- 코인 ---------- */
export const COIN_RULES = {
  floorsPerCoin: 3, // 3층마다 1개
  perPerfect: 1, // 딱 맞출 때마다 추가로
  dailyBonus: 20, // 오늘의 도전 달성
} as const;

export function coinsForRun(r: { score: number; perfects: number; dailyCleared: boolean }) {
  return Math.floor(r.score / COIN_RULES.floorsPerCoin) + r.perfects * COIN_RULES.perPerfect + (r.dailyCleared ? COIN_RULES.dailyBonus : 0);
}
