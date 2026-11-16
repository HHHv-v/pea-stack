import type { CapacitorConfig } from '@capacitor/cli';

/**
 * 게임 등급분류용 안드로이드 앱 설정이에요.
 * 원스토어에 "정식 앱(APK)"으로 올려 자체등급분류를 받고, 그 등급으로 앱인토스에 등록해요.
 * 토스 미니앱과 같은 dist/ 빌드를 그대로 감싸요.
 */
const config: CapacitorConfig = {
  appId: 'io.github.hhhvv.peastack',
  appName: '완두콩의 높이 쌓기',
  webDir: 'dist',
  android: {
    backgroundColor: '#78C8FF',
  },
};

export default config;
