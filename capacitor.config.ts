/// <reference types="@capawesome/capacitor-android-edge-to-edge-support" />

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
      resizeOnFullScreen: false // 根据edge-to-edge插件要求设置为false
    },
    StatusBar: {
      // 移除硬编码的背景色，由StatusBarService动态设置
      // backgroundColor: '#475569',
      style: 'DEFAULT', // 使用默认样式，由StatusBarService动态控制
      overlaysWebView: false // 确保背景色生效，避免内容被覆盖
    },
    SplashScreen: {
      launchShowDuration: 1000, // 显示1秒启动画面，首次安装时会动态延长
      launchAutoHide: false, // 手动控制启动画面隐藏
      backgroundColor: '#ffffff', // 设置启动画面背景色
      androidSplashResourceName: 'splash', // Android启动画面资源
      iosSplashResourceName: 'Splash' // iOS启动画面资源
    },
    EdgeToEdge: {
      backgroundColor: '#ffffff' // 默认背景色，将由StatusBarService动态更新
    }
  }
};

export default config;
