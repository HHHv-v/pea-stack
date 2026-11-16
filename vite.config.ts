import aitDevtools from '@apps-in-toss/devtools/unplugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// 개발 서버에서는 devtools가 앱인토스 SDK를 흉내 내요. 프로덕션 빌드에서는 꺼져요.
export default defineConfig({
  plugins: [react(), aitDevtools.vite()],
  server: { host: true },
});
