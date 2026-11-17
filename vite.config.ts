import aitDevtools from '@apps-in-toss/devtools/unplugin';
import react from '@vitejs/plugin-react';
import { type Plugin, defineConfig } from 'vite';

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

// 개발 서버에서는 devtools가 앱인토스 SDK를 흉내 내요. 프로덕션 빌드에서는 꺼져요.
// 원스토어 웹 빌드: npm run build:web (GitHub Pages /pea-stack/ 경로, dist-web 폴더)
export default defineConfig(({ mode }) => ({
  plugins: [react(), aitDevtools.vite(), ...(mode === 'onestore' ? [oneStoreSdk()] : [])],
  server: { host: true },
}));
