import { useCallback, useEffect, useRef, useState } from 'react';
import { PeaStackGame, STAGE_FLOORS } from './game/engine';
import { type Progress, dailyTarget, dayKey, loadProgress, saveProgress, touchStreak } from './game/progress';
import { Sound } from './game/sound';
import {
  canOpenLeaderboard,
  closeApp,
  getUserKey,
  haptic,
  isRewardedAdReady,
  keepAwake,
  lockPortrait,
  onBack,
  openLeaderboard,
  preloadRewardedAd,
  safeAreaTop,
  shareScore,
  showRewardedAd,
  submitScore,
} from './platform/toss';

type Screen = 'home' | 'play' | 'over';

interface OverInfo {
  score: number;
  newBest: boolean;
}

const TARGET = dailyTarget();

/** 개발 서버에서만: ?demo=30 이면 시작하자마자 30층까지 쌓아요(스크린샷용). */
const DEMO_FLOORS = import.meta.env.DEV ? Number(new URLSearchParams(location.search).get('demo') ?? 0) : 0;

function stageHint(score: number) {
  if (score < STAGE_FLOORS.sunset) return `노을까지 ${STAGE_FLOORS.sunset - score}층`;
  if (score < STAGE_FLOORS.space) return `우주까지 ${STAGE_FLOORS.space - score}층`;
  return '우주 여행 중';
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<PeaStackGame | null>(null);
  const soundRef = useRef(new Sound());
  const progressRef = useRef<Progress | null>(null);
  const screenRef = useRef<Screen>('home');

  const [progress, setProgress] = useState<Progress | null>(null);
  const [screen, setScreenState] = useState<Screen>('home');
  const [score, setScore] = useState(0);
  const [night, setNight] = useState(false);
  const [over, setOver] = useState<OverInfo | null>(null);
  const [adBusy, setAdBusy] = useState(false);
  const [adReady, setAdReady] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [shared, setShared] = useState(false);

  const dailyDone = progress?.dailyDoneOn === dayKey();

  const setScreen = useCallback((s: Screen) => {
    screenRef.current = s;
    setScreenState(s);
    keepAwake(s === 'play');
  }, []);

  const updateProgress = useCallback((fn: (p: Progress) => Progress) => {
    const prev = progressRef.current;
    if (!prev) return;
    const next = fn(prev);
    progressRef.current = next;
    setProgress(next);
    saveProgress(next);
  }, []);

  /* 사용자 식별 → 그 사용자의 기록 불러오기 */
  useEffect(() => {
    let alive = true;
    lockPortrait();
    const top = safeAreaTop();
    if (top > 0) document.documentElement.style.setProperty('--safe-top', `${top}px`);
    void getUserKey()
      .then((key) => loadProgress(key))
      .then((p) => {
        if (!alive) return;
        progressRef.current = p;
        soundRef.current.muted = p.muted;
        setProgress(p);
      });
    preloadRewardedAd();
    return () => {
      alive = false;
      keepAwake(false);
    };
  }, []);

  /* 게임 엔진 만들기 */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = new PeaStackGame(canvas, soundRef.current, haptic, {
      onScore: setScore,
      onNight: setNight,
      onDailyCleared: () => updateProgress((p) => ({ ...p, dailyDoneOn: dayKey() })),
      onOver: (s) => {
        const prevBest = progressRef.current?.best ?? 0;
        const newBest = s > prevBest;
        if (newBest) updateProgress((p) => ({ ...p, best: s }));
        submitScore(s);
        setAdReady(isRewardedAdReady());
        setShared(false);
        setOver({ score: s, newBest: newBest && s > 0 });
        setScreen('over');
      },
    });
    gameRef.current = game;
    const onResize = () => game.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      game.destroy();
      gameRef.current = null;
    };
  }, [updateProgress, setScreen]);

  /* 손을 떼는 건 화면 어디서든 잡아요. 키보드(스페이스·엔터)도 돼요. */
  useEffect(() => {
    const release = () => gameRef.current?.release();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.code !== 'Enter') return;
      if (document.activeElement instanceof HTMLButtonElement) return;
      e.preventDefault();
      if (!e.repeat) gameRef.current?.press();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') release();
    };
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    window.addEventListener('blur', release);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
      window.removeEventListener('blur', release);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  /* 백그라운드로 가면 소리를 바로 멈추고, 돌아오면 되살려요(검수 기준). */
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        gameRef.current?.release();
        soundRef.current.suspend();
        keepAwake(false);
      } else {
        soundRef.current.resume();
        keepAwake(screenRef.current === 'play');
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  /* 뒤로가기를 누르면 종료 확인 모달을 띄워요(검수 기준). */
  useEffect(() => onBack(() => setConfirmExit((open) => !open)), []);

  const start = () => {
    const game = gameRef.current;
    if (!game) return;
    soundRef.current.unlock();
    soundRef.current.ui();
    updateProgress(touchStreak);
    game.start({ dailyTarget: TARGET, dailyDone: progressRef.current?.dailyDoneOn === dayKey() });
    if (DEMO_FLOORS > 0) game.debugBuild(DEMO_FLOORS);
    setOver(null);
    setScreen('play');
    preloadRewardedAd();
  };

  const revive = async () => {
    if (adBusy) return;
    soundRef.current.ui();
    setAdBusy(true);
    soundRef.current.suspend(); // 광고가 나오는 동안 소리를 멈춰요
    const ok = await showRewardedAd();
    soundRef.current.resume();
    setAdBusy(false);
    if (!ok) {
      setAdReady(isRewardedAdReady());
      return;
    }
    gameRef.current?.revive();
    setOver(null);
    setScreen('play');
  };

  const share = async () => {
    if (!over) return;
    soundRef.current.ui();
    setShared(await shareScore(over.score));
  };

  const toggleSound = () => {
    const muted = !soundRef.current.muted;
    soundRef.current.muted = muted;
    if (muted) soundRef.current.suspend();
    else {
      soundRef.current.unlock();
      soundRef.current.ui();
    }
    updateProgress((p) => ({ ...p, muted }));
  };

  const best = Math.max(progress?.best ?? 0, screen === 'play' ? score : 0);
  const canRevive = !!over && !!gameRef.current?.canRevive && adReady;

  return (
    <div className={night ? 'app night' : 'app'}>
      <div
        className="stage"
        onPointerDown={(e) => {
          if (confirmExit) return;
          e.preventDefault();
          gameRef.current?.press();
        }}
      >
        <canvas ref={canvasRef} aria-label="완두콩의 높이 쌓기 게임 화면" />
      </div>

      {/* 오른쪽 위는 토스의 ··· ✕ 버튼 자리라 비워 둬요 */}
      <div className="topbar">
        <span className="chip">최고 {best}층</span>
        <button
          className="chip icon"
          type="button"
          aria-pressed={!progress?.muted}
          aria-label={progress?.muted ? '소리 켜기' : '소리 끄기'}
          onClick={toggleSound}
        >
          {progress?.muted ? <SoundOffIcon /> : <SoundOnIcon />}
        </button>
      </div>

      {screen === 'play' && (
        <div className="hud" aria-live="polite">
          <div className="floor">
            {score}
            <small>층</small>
          </div>
          <div className={dailyDone ? 'pill done' : 'pill'}>
            {dailyDone ? '오늘의 도전 달성' : `오늘의 도전 ${Math.min(score, TARGET)}/${TARGET}층`}
          </div>
          <div className="hint">{stageHint(score)}</div>
        </div>
      )}

      {screen === 'home' && (
        <div className="sheet">
          <div className="card">
            <h1>
              완두콩의
              <br />
              높이 쌓기
            </h1>
            <p className="lead">
              꾹 누르면 막대가 자라요.
              <br />
              아래층과 같은 폭일 때 손을 떼세요.
              <br />
              소리를 들으면 딱 맞는 음이 있어요.
            </p>
            <div className="stats">
              <div className="stat">
                <b>{progress?.best ?? 0}층</b>
                <span>최고 기록</span>
              </div>
              <div className="stat">
                <b>{TARGET}층</b>
                <span>{dailyDone ? '오늘 달성!' : '오늘의 도전'}</span>
              </div>
              <div className="stat">
                <b>{progress?.streak ?? 0}일</b>
                <span>연속 출석</span>
              </div>
            </div>
            <button className="btn" type="button" onClick={start} disabled={!progress}>
              쌓기 시작
            </button>
          </div>
        </div>
      )}

      {screen === 'over' && over && (
        <div className="sheet">
          <div className="card">
            <h2>{over.newBest ? '새 기록!' : over.score >= TARGET ? '잘 쌓았어요!' : '아쉽다!'}</h2>
            <div className="big">
              {over.score}
              <small>층</small>
            </div>
            <p className="lead">
              최고 {progress?.best ?? 0}층 · {dailyDone ? '오늘의 도전 달성' : `오늘의 도전까지 ${Math.max(0, TARGET - over.score)}층`}
            </p>
            {canRevive && (
              <button className="btn ghost" type="button" onClick={revive} disabled={adBusy}>
                {adBusy ? '광고 불러오는 중' : '광고 보고 이어하기 (1회)'}
              </button>
            )}
            <button className="btn" type="button" onClick={start}>
              다시 쌓기
            </button>
            <div className="links">
              {over.score > 0 && (
                <button className="link" type="button" onClick={share}>
                  {shared ? '공유했어요' : '기록 공유하기'}
                </button>
              )}
              {canOpenLeaderboard() && (
                <button className="link" type="button" onClick={openLeaderboard}>
                  순위 보기
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {confirmExit && (
        <div className="sheet modal" role="dialog" aria-modal="true" aria-labelledby="exit-title">
          <div className="card small">
            <h3 id="exit-title">게임을 그만할까요?</h3>
            <p className="lead">{screen === 'play' ? '지금 쌓던 탑은 저장되지 않아요.' : '최고 기록은 그대로 남아 있어요.'}</p>
            <div className="row">
              <button className="btn ghost" type="button" onClick={() => setConfirmExit(false)}>
                계속하기
              </button>
              <button className="btn" type="button" onClick={closeApp}>
                그만하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SoundOnIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
      <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SoundOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
      <path d="M17 9l5 6M22 9l-5 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
