import { useCallback, useEffect, useRef, useState } from "react";
import Shop, { PeaPreview } from "./Shop";
import {
  ACCS,
  type AccId,
  BEANS,
  type BeanId,
  isOwned,
  itemKey,
} from "./game/cosmetics";
import { PeaStackGame, STAGE_FLOORS } from "./game/engine";
import {
  COIN_RULES,
  type Progress,
  coinRunsLeft,
  coinsForRun,
  dayKey,
  loadProgress,
  recordToday,
  refreshDaily,
  saveProgress,
  spendCoinRun,
  streakBonus,
  todayBestOf,
  touchStreak,
} from "./game/progress";
import bgUrl from "./assets/ui/bg.webp";
import peaUrl from "./assets/ui/pea.webp";
import titleUrl from "./assets/ui/title.webp";
import { Sound } from "./game/sound";
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
  logEvent,
  requestReviewOnce,
  shareScore,
  showRewardedAd,
  submitScore,
} from "./platform/toss";
import { initOneStore } from "./platform/onestore";

type Screen = "home" | "play" | "over";

interface OverInfo {
  score: number;
  newBest: boolean;
  todayBest: boolean; // 오늘 최고 기록을 새로 세웠는지
  earned: number; // 이번에 받은 코인
  runCoins: number; // 이번 판(이어하기 포함) 전체 코인, 2배 광고 보상 기준
  earns: boolean; // 이번 판이 층·딱 코인을 받는 판이었는지
  runsLeft: number; // 이 판이 끝난 뒤 오늘 남은 코인 판
  streak: { days: number; coins: number } | null; // 이번 판을 시작할 때 받은 연속 출석 보상
}

/** 개발 서버에서만: ?demo=30 이면 시작하자마자 30층까지 쌓아요(스크린샷용). */
const DEMO_FLOORS = import.meta.env.DEV
  ? Number(new URLSearchParams(location.search).get("demo") ?? 0)
  : 0;
/** 리뷰는 이 층 이상에서 최고 기록을 깼을 때만 요청해요(너무 이른 요청 방지). */
const REVIEW_MIN_FLOOR = 20;

function stageHint(score: number) {
  if (score < STAGE_FLOORS.sunset)
    return `노을까지 ${STAGE_FLOORS.sunset - score}층`;
  if (score < STAGE_FLOORS.space)
    return `우주까지 ${STAGE_FLOORS.space - score}층`;
  return "우주 여행 중";
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<PeaStackGame | null>(null);
  const soundRef = useRef(new Sound());
  const progressRef = useRef<Progress | null>(null);
  const screenRef = useRef<Screen>("home");
  const runRef = useRef<{
    awarded: number;
    doubled: boolean;
    earns: boolean;
    counted: boolean;
    streak: OverInfo["streak"];
  }>({
    awarded: 0,
    doubled: false,
    earns: true,
    counted: false,
    streak: null,
  });

  const [progress, setProgress] = useState<Progress | null>(null);
  const [screen, setScreenState] = useState<Screen>("home");
  const [score, setScore] = useState(0);
  const [night, setNight] = useState(false);
  const [over, setOver] = useState<OverInfo | null>(null);
  const [adBusy, setAdBusy] = useState<"revive" | "double" | null>(null);
  const [adReady, setAdReady] = useState(false);
  const [doubled, setDoubled] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [shared, setShared] = useState(false);

  const dailyDone = progress?.dailyDoneOn === dayKey();
  // 지금 코인으로 살 수 있는 새 꾸미기가 있으면 버튼에 점을 찍어요
  const canBuySomething =
    !!progress &&
    (BEANS.some(
      (b) =>
        !isOwned(progress.owned, "bean", b.id, b.price) &&
        b.price <= progress.coins,
    ) ||
      ACCS.some(
        (a) =>
          !isOwned(progress.owned, "acc", a.id, a.price) &&
          a.price <= progress.coins,
      ));
  const target = progress?.dailyTarget ?? 10;

  const setScreen = useCallback((s: Screen) => {
    screenRef.current = s;
    setScreenState(s);
    keepAwake(s === "play");
  }, []);

  const updateProgress = useCallback((fn: (p: Progress) => Progress) => {
    const prev = progressRef.current;
    if (!prev) return;
    const next = fn(prev);
    progressRef.current = next;
    setProgress(next);
    saveProgress(next);
    if (gameRef.current)
      gameRef.current.look = { bean: next.bean, acc: next.acc };
  }, []);

  /* 사용자 식별 → 그 사용자의 기록 불러오기 */
  useEffect(() => {
    let alive = true;
    lockPortrait();
    const top = safeAreaTop();
    if (top > 0)
      document.documentElement.style.setProperty("--safe-top", `${top}px`);
    void getUserKey()
      .then((key) => loadProgress(key))
      .then((p) => {
        if (!alive) return;
        progressRef.current = p;
        soundRef.current.muted = p.muted;
        if (gameRef.current)
          gameRef.current.look = { bean: p.bean, acc: p.acc };
        setProgress(p);
        saveProgress(p);
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
      onDailyCleared: () => {
        updateProgress((p) => ({ ...p, dailyDoneOn: dayKey() }));
        logEvent("daily_clear", {
          target: progressRef.current?.dailyTarget ?? 0,
        });
      },
      onOver: (r) => {
        const prevBest = progressRef.current?.best ?? 0;
        const newBest = r.score > prevBest;
        const newToday = r.score > todayBestOf(progressRef.current);
        // 이어하기로 같은 판이 다시 끝나도 코인이 두 번 들어오지 않게, 이번 판 누적에서 이미 준 만큼 빼요
        const run = runRef.current;
        const runCoins = coinsForRun({ ...r, earns: run.earns });
        const earned = Math.max(0, runCoins - run.awarded);
        run.awarded = runCoins;
        // 코인 받는 판은 처음 끝날 때 한 번만 세요(이어하기로 다시 끝나도 그대로).
        // 0층에서 바로 끝난 판은 실수로 보고 세지 않아요.
        const spend = run.earns && !run.counted && r.score > 0;
        run.counted = true;
        updateProgress((p) => {
          const q = recordToday(
            { ...p, best: Math.max(p.best, r.score), coins: p.coins + earned },
            r.score,
          );
          return spend ? spendCoinRun(q) : q;
        });
        const runsLeft = progressRef.current
          ? coinRunsLeft(progressRef.current)
          : 0;
        submitScore(r.score);
        logEvent("game_over", {
          score: r.score,
          perfects: r.perfects,
          new_best: newBest && r.score > 0,
          daily_cleared: r.dailyCleared,
        });
        if (
          (newBest && prevBest > 0 && r.score >= REVIEW_MIN_FLOOR) ||
          import.meta.env.VITE_REVIEW_TEST === "1"
        ) {
          // 결과 화면을 먼저 보여준 뒤 리뷰를 요청해요(이전 기록이 있는 사람이 기록을 깬 순간, 평생 한 번)
          window.setTimeout(() => void requestReviewOnce(), 1500);
        }
        setAdReady(isRewardedAdReady());
        setShared(false);
        setOver({
          score: r.score,
          newBest: newBest && r.score > 0,
          todayBest: newToday && r.score > 0,
          earned,
          runCoins,
          earns: run.earns,
          runsLeft,
          streak: run.streak,
        });
        setScreen("over");
      },
    });
    if (progressRef.current)
      game.look = {
        bean: progressRef.current.bean,
        acc: progressRef.current.acc,
      };
    gameRef.current = game;
    const onResize = () => game.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      game.destroy();
      gameRef.current = null;
    };
  }, [updateProgress, setScreen]);

  /* 손을 떼는 건 화면 어디서든 잡아요. 키보드(스페이스·엔터)도 돼요. */
  useEffect(() => {
    const release = () => gameRef.current?.release();
    const cancel = () => gameRef.current?.cancelHold();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.code !== "Enter") return;
      if (document.activeElement instanceof HTMLButtonElement) return;
      e.preventDefault();
      if (!e.repeat) gameRef.current?.press();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "Enter") release();
    };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("blur", cancel);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("blur", cancel);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  /* 백그라운드로 가면 소리를 바로 멈추고, 돌아오면 되살려요(검수 기준). */
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        gameRef.current?.cancelHold();
        soundRef.current.suspend();
        keepAwake(false);
      } else {
        soundRef.current.resume();
        keepAwake(screenRef.current === "play");
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  /* 뒤로가기: 꾸미기가 열려 있으면 닫고, 아니면 종료 확인 모달(검수 기준). */
  const shopOpenRef = useRef(false);
  shopOpenRef.current = shopOpen;
  const confirmExitRef = useRef(false);
  confirmExitRef.current = confirmExit;

  /* 원스토어 앱 안에서 실행될 때: 일시정지·재개, 안드로이드 뒤로가기 */
  useEffect(() => {
    void initOneStore({
      pause: () => {
        gameRef.current?.cancelHold();
        soundRef.current.suspend();
      },
      resume: () => soundRef.current.resume(),
      back: () => {
        if (shopOpenRef.current) {
          setShopOpen(false);
          return true;
        }
        if (confirmExitRef.current) {
          setConfirmExit(false);
          return true;
        }
        return false; // 원스토어 앱의 종료 확인 팝업
      },
    });
  }, []);
  useEffect(
    () =>
      onBack(() => {
        if (shopOpenRef.current) setShopOpen(false);
        else setConfirmExit((c) => !c);
      }),
    [],
  );

  const start = () => {
    const game = gameRef.current;
    if (!game) return;
    soundRef.current.unlock();
    soundRef.current.ui();
    // 그날 처음 플레이하면 연속 출석을 갱신하고, 출석 코인(매일 5, 7일째마다 +20)을 줘요
    const firstToday = progressRef.current?.lastPlayed !== dayKey();
    updateProgress((p) => touchStreak(refreshDaily(p)));
    let streak: OverInfo["streak"] = null;
    const days = progressRef.current?.streak ?? 0;
    const bonus = firstToday ? streakBonus(days) : 0;
    if (firstToday) logEvent("attendance", { days });
    if (bonus > 0) {
      streak = { days, coins: bonus };
      updateProgress((q) => ({ ...q, coins: q.coins + bonus }));
    }
    const p = progressRef.current;
    runRef.current = {
      awarded: 0,
      doubled: false,
      earns: p ? coinRunsLeft(p) > 0 : true,
      counted: false,
      streak,
    };
    setDoubled(false);
    game.start({
      dailyTarget: p?.dailyTarget ?? 30,
      dailyDone: p?.dailyDoneOn === dayKey(),
    });
    logEvent("game_start", { first_today: firstToday });
    if (DEMO_FLOORS > 0) game.debugBuild(DEMO_FLOORS);
    setOver(null);
    setScreen("play");
    preloadRewardedAd();
  };

  const watchAd = async (): Promise<boolean> => {
    soundRef.current.ui();
    soundRef.current.suspend(); // 광고가 나오는 동안 소리를 멈춰요
    const ok = await showRewardedAd();
    soundRef.current.resume();
    setAdReady(isRewardedAdReady());
    return ok;
  };

  const revive = async () => {
    if (adBusy) return;
    setAdBusy("revive");
    const ok = await watchAd();
    setAdBusy(null);
    if (!ok) return;
    logEvent("ad_reward", { kind: "revive" });
    gameRef.current?.revive();
    setOver(null);
    setScreen("play");
  };

  const doubleCoins = async () => {
    if (adBusy || !over || runRef.current.doubled) return;
    setAdBusy("double");
    const ok = await watchAd();
    setAdBusy(null);
    if (!ok) return;
    logEvent("ad_reward", { kind: "double" });
    runRef.current.doubled = true;
    setDoubled(true);
    const bonus = over.runCoins;
    updateProgress((p) => ({ ...p, coins: p.coins + bonus }));
    haptic("confetti");
    soundRef.current.win();
  };

  const share = async () => {
    if (!over) return;
    soundRef.current.ui();
    const ok = await shareScore(over.score);
    setShared(ok);
    if (ok) logEvent("share", { score: over.score });
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

  const buy = (kind: "bean" | "acc", id: string, price: number) => {
    const p = progressRef.current;
    if (!p || p.coins < price) return;
    soundRef.current.win();
    haptic("success");
    logEvent("shop_buy", { kind, id, price });
    updateProgress((q) => ({
      ...q,
      coins: q.coins - price,
      owned: [...q.owned, itemKey(kind, id)],
      ...(kind === "bean" ? { bean: id as BeanId } : { acc: id as AccId }),
    }));
  };

  const equip = (kind: "bean" | "acc", id: string) => {
    soundRef.current.ui();
    haptic("tap");
    updateProgress((q) => ({
      ...q,
      ...(kind === "bean" ? { bean: id as BeanId } : { acc: id as AccId }),
    }));
  };

  const best = Math.max(progress?.best ?? 0, screen === "play" ? score : 0);
  const canRevive = !!over && !!gameRef.current?.canRevive && adReady;
  const canDouble = !!over && over.runCoins > 0 && !doubled && adReady;

  return (
    <div className={night ? "app night" : "app"}>
      <div
        className="stage"
        onPointerDown={(e) => {
          if (confirmExit || shopOpen) return;
          e.preventDefault();
          gameRef.current?.press();
        }}
      >
        <canvas ref={canvasRef} aria-label="완두콩의 높이 쌓기 게임 화면" />
      </div>

      {/* 오른쪽 위는 토스의 ··· ✕ 버튼 자리라 비워 둬요 */}
      <div className="topbar">
        {screen !== "home" && <span className="chip">최고 {best}층</span>}
        <button
          className="chip icon"
          type="button"
          aria-pressed={!progress?.muted}
          aria-label={progress?.muted ? "소리 켜기" : "소리 끄기"}
          onClick={toggleSound}
        >
          {progress?.muted ? <SoundOffIcon /> : <SoundOnIcon />}
        </button>
      </div>

      {screen === "play" && (
        <div className="hud" aria-live="polite">
          <div className="floor">
            {score}
            <small>층</small>
          </div>
          <div className={dailyDone ? "pill done" : "pill"}>
            {dailyDone
              ? "오늘의 도전 달성"
              : `오늘의 도전 ${Math.min(score, target)}/${target}층`}
          </div>
          <div className="hint">{stageHint(score)}</div>
        </div>
      )}

      {screen === "home" && !shopOpen && (
        <div className="home" style={{ backgroundImage: `url(${bgUrl})` }}>
          <div className="badges">
            <div className="badge">
              <span>최고 기록</span>
              <b>{progress?.best ?? 0}층</b>
            </div>
            <div className="badge">
              <span>오늘 기록</span>
              <b>{todayBestOf(progress)}층</b>
            </div>
            <div className="badge">
              <span>연속 출석</span>
              <b>{progress?.streak ?? 0}일</b>
            </div>
          </div>
          <h1 className="home-title">
            <img src={titleUrl} alt="완두콩의 높이 쌓기" draggable={false} />
          </h1>
          <button
            type="button"
            className="home-pea"
            onClick={() => setShopOpen(true)}
            disabled={!progress}
            aria-label="내 완두콩 보기"
          >
            {progress &&
            (progress.bean !== "pea" || progress.acc !== "none") ? (
              <PeaPreview
                bean={progress.bean}
                acc={progress.acc}
                size={100}
                mood="happy"
              />
            ) : (
              <img src={peaUrl} alt="" draggable={false} />
            )}
          </button>
          <div className="home-bottom">
            <p className="home-how">
              꾹 눌러 스택을 키우고, 같은 폭에서 손을 떼요!
            </p>
            <button
              className="btn3d orange"
              type="button"
              onClick={start}
              disabled={!progress}
            >
              쌓기 시작
            </button>
            <button
              className="btn3d white"
              type="button"
              onClick={() => setShopOpen(true)}
              disabled={!progress}
            >
              완두콩 꾸미기
              {canBuySomething && (
                <span
                  className="new-dot"
                  aria-label="살 수 있는 꾸미기가 있어요"
                />
              )}
            </button>
          </div>
        </div>
      )}

      {screen === "over" && over && !shopOpen && (
        <div className="over-dim">
          <div className="over-card">
            <h2>
              {over.newBest
                ? "새 최고 기록!"
                : over.todayBest
                  ? "오늘의 최고 기록!"
                  : over.score >= target
                    ? "잘 쌓았어요!"
                    : "아쉽다!"}
            </h2>
            <div className="over-score">
              {over.score}
              <small>층</small>
            </div>
            <OverCoins over={over} doubled={doubled} dailyDone={dailyDone} />
            {canRevive && (
              <button
                className="btn3d pink"
                type="button"
                onClick={revive}
                disabled={!!adBusy}
              >
                {adBusy === "revive"
                  ? "광고 불러오는 중"
                  : "광고 보고 이어서 쌓기"}
              </button>
            )}
            {canDouble && (
              <button
                className="btn3d yellow"
                type="button"
                onClick={doubleCoins}
                disabled={!!adBusy}
              >
                {adBusy === "double"
                  ? "광고 불러오는 중"
                  : `광고 보고 코인 2배 +${over.runCoins}`}
              </button>
            )}
            <button className="btn3d orange" type="button" onClick={start}>
              다시 쌓기
            </button>
            <div className="over-links">
              <button type="button" onClick={() => setShopOpen(true)}>
                꾸미기
                {canBuySomething && (
                  <span
                    className="new-dot"
                    aria-label="살 수 있는 꾸미기가 있어요"
                  />
                )}
              </button>
              {over.score > 0 && (
                <button type="button" onClick={share}>
                  {shared ? "공유했어요" : "기록 공유하기"}
                </button>
              )}
              {canOpenLeaderboard() && (
                <button type="button" onClick={openLeaderboard}>
                  순위보기
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {shopOpen && progress && (
        <Shop
          coins={progress.coins}
          owned={progress.owned}
          bean={progress.bean}
          acc={progress.acc}
          onBuy={buy}
          onEquip={equip}
          onClose={() => setShopOpen(false)}
        />
      )}

      {confirmExit && (
        <div
          className="sheet modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="exit-title"
        >
          <div className="card small">
            <h3 id="exit-title">게임을 그만할까요?</h3>
            <p className="lead">
              {screen === "play"
                ? "지금 쌓던 탑은 저장되지 않아요."
                : "최고 기록과 코인은 그대로 남아 있어요."}
            </p>
            <div className="row">
              <button
                className="btn ghost"
                type="button"
                onClick={() => setConfirmExit(false)}
              >
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

/** 게임오버: 코인 받는 판(●●●)과 이번 판 코인 */
function OverCoins({
  over,
  doubled,
  dailyDone,
}: {
  over: OverInfo;
  doubled: boolean;
  dailyDone: boolean;
}) {
  const total = COIN_RULES.runsPerDay;
  const got =
    over.earned + (doubled ? over.runCoins : 0) + (over.streak?.coins ?? 0);
  let text: string;
  if (got > 0)
    text = `+${got} 코인${doubled ? " (2배!)" : ""}${over.streak ? ` · 출석 +${over.streak.coins}` : ""}`;
  else if (over.runsLeft > 0) text = `코인 받는 판 ${over.runsLeft}번 남음`;
  else
    text = dailyDone
      ? "오늘 코인 판은 끝"
      : `오늘의 도전 달성 시 +${COIN_RULES.dailyBonus}`;
  return (
    <p className="over-coins">
      <span className="dots" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={i < total - over.runsLeft ? "dot used" : "dot"}
          />
        ))}
      </span>
      {text}
    </p>
  );
}

function SoundOnIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
      <path
        d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SoundOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
      <path
        d="M17 9l5 6M22 9l-5 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
