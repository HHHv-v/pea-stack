/**
 * 원스토어 웹게임(H5) SDK 연결.
 * SDK 스크립트는 원스토어용 웹 빌드(`npm run build:web`)의 index.html에만 들어가요(vite.config.ts).
 * 토스 빌드나 일반 브라우저에서는 window.__onestore가 없거나 initializeAsync가 err를 돌려줘서 아무것도 안 해요.
 */
interface OneStoreSDK {
  on(event: 'pause' | 'resume' | 'exit', fn: (ev: unknown) => void): void;
  onBackPressed(fn: () => boolean): void;
  initializeAsync(): Promise<{ err?: string }>;
  setLoadingProgress(n: number): void;
  startGameAsync(): Promise<void>;
}

export interface OneStoreHandlers {
  pause: () => void;
  resume: () => void;
  /** 게임이 뒤로가기를 처리했으면 true(동기, 200ms 안) */
  back: () => boolean;
}

/** SDK 스크립트가 늦게 끝날 수도 있어서 잠깐(최대 3초) 기다려요. 원스토어 빌드가 아니면 바로 끝나요. */
async function waitForSDK(): Promise<OneStoreSDK | undefined> {
  const w = window as unknown as { __onestore?: OneStoreSDK };
  if (!document.querySelector('script[type="module"]:not([src])')) return w.__onestore;
  for (let i = 0; i < 30 && !w.__onestore; i++) await new Promise((r) => setTimeout(r, 100));
  return w.__onestore;
}

export async function initOneStore(h: OneStoreHandlers) {
  const sdk = await waitForSDK();
  if (!sdk) return false;
  try {
    sdk.on('pause', h.pause);
    sdk.on('resume', h.resume);
    // 진행 상황은 바뀔 때마다 바로 저장하고 있어서 exit에서 따로 할 일은 없어요.
    sdk.on('exit', () => {});
    sdk.onBackPressed(() => {
      try {
        return h.back() === true;
      } catch {
        return false;
      }
    });
    const info = await sdk.initializeAsync();
    if (info?.err) return false;
    sdk.setLoadingProgress(100);
    await sdk.startGameAsync();
    return true;
  } catch (e) {
    console.warn('[onestore] 초기화 실패', e);
    return false;
  }
}
