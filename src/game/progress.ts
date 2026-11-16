import { loadValue, saveValue } from '../platform/toss';

export const dayKey = (d = new Date()) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

/** 날짜마다 정해지는 오늘의 도전 층수(15~35층). 모든 사용자에게 같아요. */
export function dailyTarget(d = new Date()) {
  const n = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  return 15 + (((n * 9301 + 49297) % 233280) % 21);
}

export interface Progress {
  best: number;
  streak: number;
  lastPlayed: string;
  dailyDoneOn: string;
  muted: boolean;
}

const EMPTY: Progress = { best: 0, streak: 0, lastPlayed: '', dailyDoneOn: '', muted: false };

export async function loadProgress(): Promise<Progress> {
  const p = await loadValue<Partial<Progress>>('progress', {});
  return { ...EMPTY, ...p };
}

export function saveProgress(p: Progress) {
  saveValue('progress', p);
}

/** 오늘 처음 플레이하면 연속 출석을 갱신해요. 어제 했으면 +1, 아니면 1부터 다시. */
export function touchStreak(p: Progress): Progress {
  const today = dayKey();
  if (p.lastPlayed === today) return p;
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return { ...p, lastPlayed: today, streak: p.lastPlayed === dayKey(y) ? p.streak + 1 : 1 };
}
