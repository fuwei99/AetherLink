import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.llmhouse.app',
  appName: 'AetherLink',
  webDir: 'dist',
  android: {
    initialFocus: true,
    captureInput: false,
    webContentsDebuggingEnabled: true,
    //  Android WebView 允许混合内容
    allowMixedContent: true
  },
  ios: {
    scheme: 'AetherLink',
    webContentsDebuggingEnabled: true,
    allowsLinkPreview: false,
    handleApplicationNotifications: false
  },
  server: {
    androidScheme: 'https',  // 保持https以避免数据丢失
    allowNavigation: [],
    cleartext: true  // 允许HTTP明文传输
  },
  plugins: {
    CapacitorHttp: {
      enabled: false  //  禁用CapacitorHttp，使用标准fetch支持流式输出
    },
    CorsBypass: {
      // CORS 绕过插件配置 - 暂时不启用功能，仅确保插件加载
    },
    WebView: {
      scrollEnabled: true,
      allowFileAccess: true
    },
    Keyboard: {
      resizeOnFullScreen: true
    },
    StatusBar: {
      backgroundColor: '#475569', // 浅色模式默认颜色
      style: 'DARK', // 深色文字适合浅色背景
      overlaysWebView: false // 确保背景色生效，避免内容被覆盖
    },
    SplashScreen: {
      launchShowDuration: 0
    }
  }
};

export default config;
