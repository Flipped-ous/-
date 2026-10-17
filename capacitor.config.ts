import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jinriyouxu.app',
  appName: '今日有序',
  webDir: 'dist',
  backgroundColor: '#F5F1E8',
  plugins: {
    SystemBars: {
      insetsHandling: 'css',
      initialViewportFitValueHint: 'cover',
      style: 'LIGHT',
    },
  },
  android: {
    minWebViewVersion: 111,
    backgroundColor: '#F5F1E8',
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
