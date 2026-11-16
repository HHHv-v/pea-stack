# 완두콩의 높이 쌓기 (pea-stack)

토스 앱인토스에 출시할 하이퍼캐주얼 쌓기 게임입니다.
화면을 꾹 눌러 막대를 키우고, 아래층과 같은 폭일 때 손을 떼서 완두콩을 우주까지 올려 보냅니다.

## 현재 상태

- [x] 게임 규칙 확정 (꾹 눌러 채우기)
- [x] 플레이 가능한 프로토타입 (`prototype/`)
- [x] React + 앱인토스 SDK 3.x 프로젝트로 이전
- [x] 보상형 광고 연동 코드 (이어하기, 광고 그룹 ID 필요)
- [ ] 앱인토스 콘솔 등록, 광고 그룹 ID 발급
- [ ] 게임 등급분류
- [ ] 앱인토스 검수 및 출시

## 게임 규칙

- 누르는 동안 막대가 양옆으로 자라고, 손을 떼면 내려앉습니다.
- 아래층과 폭이 같으면 "딱!", 연속으로 맞추면 폭이 조금씩 회복됩니다.
- 틀린 만큼 탑이 좁아집니다. 모자라면 그 폭 그대로, 넘치면 넘친 만큼 안쪽까지 부서집니다.
- 탑이 너무 가늘어지거나 끝까지 누르고 있으면 끝납니다.
- 누르는 동안 음이 올라가고, 폭이 딱 맞는 순간의 음 높이는 항상 같습니다.

## 화면 구성

- 하늘 3단계: 파란 하늘(0~8층) → 주황 노을(12~20층) → 우주(26층~)
- 캐릭터: 탑 꼭대기에 앉는 완두콩 (평소 / 웃음 / 놀람, 우주에서는 헬멧)
- 오늘의 도전, 연속 출석, 최고 기록
- 광고 보고 이어하기 (판당 1회, 프로토타입에서는 자리만 있음)

## 개발

```bash
npm install
cp .env.example .env   # 보상형 광고 그룹 ID 입력 (없으면 개발 중엔 광고 없이 바로 이어하기)
npm run dev            # 브라우저에서 열기, 오른쪽 아래 AIT 버튼으로 SDK 흉내 조작
npm run build          # dist/ 빌드 + pea-stack.ait 생성
npm run deploy         # ait deploy (콘솔 API 키 필요)
```

- 기술: React 19, TypeScript, Vite, `@apps-in-toss/web-framework` 3.x, `@apps-in-toss/devtools`
- 앱인토스 설정: `apps-in-toss.config.ts` (appName은 콘솔 등록 이름과 같아야 함)
- `@apps-in-toss/devtools`는 Node 24 이상을 권장합니다.

## 폴더

```
src/
  App.tsx              화면(시작·플레이 HUD·결과)과 입력
  game/engine.ts       게임 규칙, 카메라, 효과
  game/draw.ts         하늘·화분·젤리 막대·완두콩 그리기
  game/sound.ts        Web Audio 효과음 (음원 파일 없음)
  game/progress.ts     최고 기록, 오늘의 도전, 연속 출석
  platform/toss.ts     SDK 감싸기: 햅틱, 저장소, 보상형 광고, 리더보드
prototype/             규칙과 손맛을 확인하던 한 장짜리 HTML 프로토타입
```

## 메모

- 광고 ID 같은 키는 커밋하지 않습니다. `.env`에 두고 `.gitignore`로 제외합니다.
- 진동은 `Device.triggerHaptic`을 쓰고, 토스 앱 밖에서는 `navigator.vibrate`로 대신합니다.
- SDK 함수는 토스 앱 밖에서 예외를 던질 수 있어 `platform/toss.ts`에서 모두 감싸 둡니다.
