/**
 * 앱인토스 SDK를 감싼 얇은 층이에요.
 * - 토스 앱 안에서는 SDK를 써요.
 * - 개발 서버에서는 @apps-in-toss/devtools가 SDK를 흉내 내요.
 * - 어느 쪽이든 실패하면 게임이 멈추지 않도록 조용히 대체 동작을 해요.
 */
import {
  Analytics,
  Device,
  Game,
  Review,
  SafeArea,
  Screen,
  Share,
  Storage,
  User,
  graniteEvent,
  loadFullScreenAd,
  showFullScreenAd,
} from '@apps-in-toss/web-framework';
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

/* ---------- 사용자 식별 ---------- */
/**
 * 검수 기준: 사용자 식별자를 확인·저장한 뒤 게임을 시작해요.
 * 토스 계정마다 기록을 따로 저장하는 데 써요. 토스 앱 밖에서는 'local'을 써요.
 */
export async function getUserKey(): Promise<string> {
  try {
    if (!User.getAnonymousKey.isSupported()) return 'local';
    const res = await User.getAnonymousKey();
    return res && typeof res === 'object' && 'hash' in res && res.hash ? String(res.hash) : 'local';
  } catch {
    return 'local';
  }
}

/* ---------- 화면 ---------- */
/** 위쪽 안전 영역(px). 토스 앱 밖에서는 0이고, CSS env()가 대신 처리해요. */
export function safeAreaTop(): number {
  try {
    return SafeArea.get()?.top ?? 0;
  } catch {
    return 0;
  }
}

/** 플레이 중에는 화면이 꺼지지 않게 해요. 상태가 바뀔 때만 불러요. */
export function keepAwake(enabled: boolean) {
  attempt(() => Screen.setAwakeMode({ enabled })).catch(() => {});
}

export function lockPortrait() {
  try {
    if (Screen.setOrientation.isSupported()) void Screen.setOrientation({ type: 'portrait' }).catch(() => {});
  } catch {
    /* noop */
  }
}

export function closeApp() {
  attempt(() => Screen.close()).catch(() => {
    try {
      window.close();
    } catch {
      /* noop */
    }
  });
}

/** 안드로이드 뒤로가기를 가로채요. 해제 함수를 돌려줘요. */
export function onBack(handler: () => void): () => void {
  try {
    return graniteEvent.addEventListener('backEvent', { onEvent: handler, onError: () => {} });
  } catch {
    return () => {};
  }
}

/* ---------- 공유 ---------- */
export async function shareScore(score: number): Promise<boolean> {
  const text = `완두콩을 ${score}층까지 올려 보냈어요! 나보다 높이 쌓을 수 있을까요?`;
  try {
    const link = await attempt(() => Share.createLink({ path: 'intoss://pea-stack' })).catch(() => '');
    await attempt(() => Share.sendMessage({ message: link ? `${text}\n${link}` : text }));
    return true;
  } catch {
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return true;
      }
    } catch {
      /* 취소 */
    }
    return false;
  }
}

/* ---------- 이벤트 기록 (콘솔 전환 지표용) ---------- */
type LogValue = string | number | boolean;

/** 앱인토스 콘솔에서 전환 지표로 쓸 이벤트를 남겨요. 토스 앱 밖에서는 조용히 무시돼요. */
export function logEvent(name: string, params: Record<string, LogValue> = {}) {
  attempt(() => Analytics.log({ log_name: name, log_type: 'event', params })).catch(() => {
    /* noop */
  });
}

/* ---------- 리뷰 요청 ---------- */
const REVIEW_KEY = 'review_asked';
let reviewAsked: boolean | null = null;

/**
 * 리뷰를 딱 한 번만 요청해요(기분 좋은 순간: 최고 기록 갱신 직후).
 * 지원하지 않는 토스 버전이거나 토스 밖이면 아무것도 하지 않아요.
 */
export async function requestReviewOnce() {
  if (import.meta.env.VITE_REVIEW_TEST === '1') {
    // 테스트 빌드: 조건·1회 제한 없이 바로 요청해요(기록도 남기지 않아요)
    attempt(() => Review.request()).catch(() => {
      /* noop */
    });
    return;
  }
  if (reviewAsked === null) reviewAsked = await loadValue(REVIEW_KEY, false);
  if (reviewAsked) return;
  let supported = false;
  try {
    supported = Review.request.isSupported();
  } catch {
    supported = false;
  }
  if (!supported) return;
  reviewAsked = true;
  saveValue(REVIEW_KEY, true);
  attempt(() => Review.request()).catch(() => {
    /* noop */
  });
}
