import { useCallback, useEffect, useRef, useState } from 'react';
import { PeaStackGame } from './game/engine';
import { type Progress, dailyTarget, dayKey, loadProgress, saveProgress, touchStreak } from './game/progress';
import { Sound } from './game/sound';
import {
  canOpenLeaderboard,
  haptic,
  isRewardedAdReady,
  openLeaderboard,
  preloadRewardedAd,
  showRewardedAd,
  submitScore,
} from './platform/toss';

type Screen = 'home' | 'play' | 'over';

interface OverInfo {
  score: number;
  newBest: boolean;
}

const TARGET = dailyTarget();

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<PeaStackGame | null>(null);
  const soundRef = useRef(new Sound());
  const progressRef = useRef<Progress | null>(null);

  const [progress, setProgress] = useState<Progress | null>(null);
  const [screen, setScreen] = useState<Screen>('home');
  const [score, setScore] = useState(0);
  const [night, setNight] = useState(false);
  const [over, setOver] = useState<OverInfo | null>(null);
  const [adBusy, setAdBusy] = useState(false);
  const [adReady, setAdReady] = useState(false);

  const dailyDone = progress?.dailyDoneOn === dayKey();

  const updateProgress = useCallback((fn: (p: Progress) => Progress) => {
    const prev = progressRef.current;
    if (!prev) return;
    const next = fn(prev);
    progressRef.current = next;
    setProgress(next);
    saveProgress(next);
  }, []);

  /* 저장된 기록 불러오기 */
  useEffect(() => {
    let alive = true;
    void loadProgress().then((p) => {
      if (!alive) return;
      progressRef.current = p;
      soundRef.current.muted = p.muted;
      setProgress(p);
    });
    preloadRewardedAd();
    return () => {
      alive = false;
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
  }, [updateProgress]);

  /* 손을 떼는 건 화면 어디서든 잡아요 */
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

  const start = () => {
    const game = gameRef.current;
    if (!game) return;
    soundRef.current.unlock();
    soundRef.current.ui();
    updateProgress(touchStreak);
    game.start({ dailyTarget: TARGET, dailyDone: progressRef.current?.dailyDoneOn === dayKey() });
    setOver(null);
    setScreen('play');
    preloadRewardedAd();
  };

  const revive = async () => {
    if (adBusy) return;
    soundRef.current.ui();
    setAdBusy(true);
    const ok = await showRewardedAd();
    setAdBusy(false);
    if (!ok) {
      setAdReady(isRewardedAdReady());
      return;
    }
    gameRef.current?.revive();
    setOver(null);
    setScreen('play');
  };

  const toggleSound = () => {
    const muted = !soundRef.current.muted;
    soundRef.current.muted = muted;
    if (!muted) {
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
          e.preventDefault();
          gameRef.current?.press();
        }}
      >
        <canvas ref={canvasRef} aria-label="완두콩의 높이 쌓기 게임 화면" />
      </div>

      <div className="topbar">
        <span className="chip">최고 {best}층</span>
        <button className="chip" type="button" aria-pressed={!progress?.muted} onClick={toggleSound}>
          {progress?.muted ? '소리 끔' : '소리 켬'}
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
                <b>{progress?.best ?? 0}</b>
                <span>최고 층</span>
              </div>
              <div className="stat">
                <b>{TARGET}층</b>
                <span>오늘의 도전</span>
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
            {canOpenLeaderboard() && (
              <button className="link" type="button" onClick={openLeaderboard}>
                순위 보기
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
