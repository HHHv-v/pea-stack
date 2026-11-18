import aitDevtools from '@apps-in-toss/devtools/unplugin';
import react from '@vitejs/plugin-react';
import { type Plugin, defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/** 원스토어 웹게임 SDK. 버전은 원스토어 개발자 문서 '08. 릴리즈 노트'에서 확인해요. */
const ONESTORE_SDK = 'https://h5sdk.onestore.net/lib/v1.1.0/onestore-h5-sdk.min.js';

/** 원스토어용 웹 빌드(--mode onestore)에서만 SDK를 게임 코드보다 먼저 불러와요. */
function oneStoreSdk(): Plugin {
  return {
    name: 'onestore-h5-sdk',
    transformIndexHtml: {
      order: 'post', // Vite가 번들로 합치지 않고 HTML에 그대로 남기도록
      handler: (html) =>
        html.replace(
          '</title>',
          `</title>\n    <script type="module">import { createSDK } from "${ONESTORE_SDK}"; window.__onestore = createSDK();</script>`,
        ),
    },
  };
}

/**
 * Microsoft Store용 PWA 빌드(--mode pwa). 게임 코드는 토스·원스토어 버전과 같아요.
 * 원스토어 SDK는 넣지 않고, 설치·오프라인을 위한 매니페스트와 서비스 워커만 더해요.
 * 아이콘은 public-pwa/에만 있어서 토스(.ait)·원스토어 빌드에는 들어가지 않아요.
 */
function pwa() {
  return VitePWA({
    registerType: 'autoUpdate',
    injectRegister: 'auto',
    includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
    manifest: {
      id: './',
      name: '완두콩의 높이 쌓기',
      short_name: '완두콩 쌓기',
      description:
        '화면을 꾹 누르면 막대가 자라요. 아래층과 같은 폭에서 손을 떼면 딱! 하고 쌓여요. 완두콩을 하늘 너머 우주까지 쌓아 올리는 타이밍 게임이에요.',
      lang: 'ko',
      dir: 'ltr',
      start_url: './',
      scope: './',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#78C8FF',
      theme_color: '#78C8FF',
      categories: ['games'],
      icons: [
        { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      // 게임에 필요한 파일을 모두 미리 받아 두어 오프라인에서도 열려요.
      globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      cleanupOutdatedCaches: true,
    },
  });
}

// 개발 서버에서는 devtools가 앱인토스 SDK를 흉내 내요. 프로덕션 빌드에서는 꺼져요.
// 원스토어 웹 빌드: npm run build:web (GitHub Pages /pea-stack/ 경로, dist-web 폴더)
// Microsoft Store PWA 빌드: npm run build:pwa (GitHub Pages /pea-stack/pwa/ 경로, dist-pwa 폴더)
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    aitDevtools.vite(),
    ...(mode === 'onestore' ? [oneStoreSdk()] : []),
    ...(mode === 'pwa' ? [pwa()] : []),
  ],
  publicDir: mode === 'pwa' ? 'public-pwa' : 'public',
  server: { host: true },
}));
