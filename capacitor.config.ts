import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.codeoj.app',
  appName: 'Code OJ',
  webDir: 'dist',
  server: {
    url: 'http://38.76.205.183:5000',
    androidScheme: 'https',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
