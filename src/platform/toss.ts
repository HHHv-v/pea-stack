/**
 * 앱인토스 SDK를 감싼 얇은 층이에요.
 * - 토스 앱 안에서는 SDK를 써요.
 * - 개발 서버에서는 @apps-in-toss/devtools가 SDK를 흉내 내요.
 * - 어느 쪽이든 실패하면 게임이 멈추지 않도록 조용히 대체 동작을 해요.
 */
import { Device, Game, Storage, loadFullScreenAd, showFullScreenAd } from '@apps-in-toss/web-framework';
import type { HapticFeedbackType } from '@apps-in-toss/web-framework';

/**
 * SDK 함수는 토스 앱 밖에서 바로 예외를 던지기도 하고, Promise를 거부하기도 해요.
 * 두 경우 모두 fallback으로 넘어가도록 감싸요.
 */
function attempt<T>(call: () => Promise<T>): Promise<T> {
  try {
    return call();
  } catch (e) {
    return Promise.reject(e);
  }
}

/* ---------- 햅틱 ---------- */
const VIBRATE_FALLBACK: Record<HapticFeedbackType, number | number[]> = {
  tickWeak: 6,
  tap: 10,
  tickMedium: 12,
  softMedium: 16,
  basicWeak: 14,
  basicMedium: 28,
  success: [12, 36, 18],
  error: [60, 40, 120],
  wiggle: [14, 30, 14],
  confetti: [20, 40, 20, 40, 60],
};

export function haptic(type: HapticFeedbackType) {
  attempt(() => Device.triggerHaptic({ type })).catch(() => {
    try {
      navigator.vibrate?.(VIBRATE_FALLBACK[type]);
    } catch {
      /* noop */
    }
  });
}

/* ---------- 저장소 ---------- */
const PREFIX = 'pea_';

export async function loadValue<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await attempt(() => Storage.getItem(PREFIX + key));
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw == null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  }
}

export function saveValue(key: string, value: unknown) {
  const raw = JSON.stringify(value);
  attempt(() => Storage.setItem(PREFIX + key, raw)).catch(() => {
    try {
      localStorage.setItem(PREFIX + key, raw);
    } catch {
      /* noop */
    }
  });
}

/* ---------- 리더보드 ---------- */
export function submitScore(score: number) {
  try {
    if (Game.setLeaderboardScore.isSupported()) void Game.setLeaderboardScore({ score: String(score) }).catch(() => {});
  } catch {
    /* noop */
  }
}

export function canOpenLeaderboard() {
  try {
    return Game.openLeaderboard.isSupported();
  } catch {
    return false;
  }
}

export function openLeaderboard() {
  try {
    void Game.openLeaderboard().catch(() => {});
  } catch {
    /* noop */
  }
}

/* ---------- 보상형 광고 (이어하기) ---------- */
/**
 * 콘솔에서 발급받은 광고 그룹 ID를 .env의 VITE_REWARDED_AD_GROUP_ID에 넣어요.
 * 값이 없으면 개발 중에는 광고 없이 바로 보상을 주고, 출시 빌드에서는 버튼을 숨겨요.
 */
const AD_GROUP_ID = (import.meta.env.VITE_REWARDED_AD_GROUP_ID as string | undefined) ?? '';
const SIMULATE = !AD_GROUP_ID && import.meta.env.DEV;

let loaded = false;
let loading = false;

function adSupported() {
  try {
    return !!AD_GROUP_ID && loadFullScreenAd.isSupported() && showFullScreenAd.isSupported();
  } catch {
    return false;
  }
}

/** 광고는 보여줄 때 불러오지 않고 미리 불러 둬야 해요(검수 기준). */
export function preloadRewardedAd() {
  if (!adSupported() || loaded || loading) return;
  loading = true;
  try {
    loadFullScreenAd({
      options: { adGroupId: AD_GROUP_ID },
      onEvent: (e) => {
        if (e.type === 'loaded') {
          loaded = true;
          loading = false;
        }
      },
      onError: () => {
        loading = false;
      },
    });
  } catch {
    loading = false;
  }
}

export function isRewardedAdReady() {
  return SIMULATE || (adSupported() && loaded);
}

/** 끝까지 보면 true, 중간에 닫거나 실패하면 false를 돌려줘요. */
export function showRewardedAd(): Promise<boolean> {
  if (SIMULATE) return Promise.resolve(true);
  if (!adSupported() || !loaded) return Promise.resolve(false);
  loaded = false;
  return new Promise((resolve) => {
    let earned = false;
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      resolve(ok);
      preloadRewardedAd();
    };
    try {
      showFullScreenAd({
        options: { adGroupId: AD_GROUP_ID },
        onEvent: (e) => {
          if (e.type === 'userEarnedReward') earned = true;
          if (e.type === 'dismissed') finish(earned);
          if (e.type === 'failedToShow') finish(false);
        },
        onError: () => finish(false),
      });
    } catch {
      finish(false);
    }
  });
}
