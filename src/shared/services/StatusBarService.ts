import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { EdgeToEdge } from '@capawesome/capacitor-android-edge-to-edge-support';
import { themeConfigs, type ThemeStyle } from '../config/themes';

/**
 * 状态栏管理服务
 * 提供统一的状态栏样式管理
 * 使用动态主题颜色，避免硬编码
 */
export class StatusBarService {
  private static instance: StatusBarService;
  private currentTheme: 'light' | 'dark' = 'light';
  private currentThemeStyle: ThemeStyle = 'default';
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): StatusBarService {
    if (!StatusBarService.instance) {
      StatusBarService.instance = new StatusBarService();
    }
    return StatusBarService.instance;
  }

  /**
   * 初始化状态栏
   * @param theme 当前主题模式
   * @param themeStyle 主题风格
   */
  public async initialize(theme: 'light' | 'dark', themeStyle: ThemeStyle = 'default'): Promise<void> {
    // 无论任何平台，先设置初始状态
    this.currentTheme = theme;
    this.currentThemeStyle = themeStyle;

    if (!Capacitor.isNativePlatform()) {
      // Web平台也需要执行初始化设置，并标记为已初始化
      console.log('[StatusBarService] Web平台，执行Web状态栏初始化');
      this.updateWebStatusBar();
      this.isInitialized = true;
      return;
    }

    // --- Native Platform Only ---
    try {
      // Android平台：启用edge-to-edge支持
      if (Capacitor.getPlatform() === 'android') {
        try {
          await EdgeToEdge.enable();
          console.log('[StatusBarService] Android edge-to-edge已启用');
        } catch (e) {
          console.warn('[StatusBarService] Android edge-to-edge 启用失败，可能插件未安装或配置:', e);
        }
      }

      // 设置状态栏不覆盖WebView
      await StatusBar.setOverlaysWebView({ overlay: false });

      // 根据主题设置样式，使用抽取的方法
      await this.applyNativeThemeStyle();

      this.isInitialized = true;
      console.log(`[StatusBarService] 状态栏初始化完成 - 主题: ${theme}, 风格: ${themeStyle}`);
    } catch (error) {
      console.error('[StatusBarService] 状态栏初始化失败:', error);
      throw error;
    }
  }

  /**
   * 更新主题
   * @param theme 新主题模式
   * @param themeStyle 主题风格
   */
  public async updateTheme(theme: 'light' | 'dark', themeStyle?: ThemeStyle): Promise<void> {
    // !!! 必须在任何分支和 return 之前，首先更新内部状态 !!!
    this.currentTheme = theme;
    if (themeStyle) {
      this.currentThemeStyle = themeStyle;
    }

    if (!Capacitor.isNativePlatform()) {
      // Web 平台：更新 CSS 变量和 meta 标签
      // 此时 this.currentThemeStyle 已经是最新值，updateWebStatusBar 内部逻辑会正确
      this.updateWebStatusBar();
      return;
    }

    // 增加初始化检查（可选，但更安全）
    if (!this.isInitialized) {
      console.warn("[StatusBarService] updateTheme called before initialize on native platform. Skipping.");
      return;
    }

    // --- Native Platform Only ---
    try {
      // 调用抽取出的应用样式方法
      await this.applyNativeThemeStyle();
      console.log(`[StatusBarService] 主题已更新: ${this.currentTheme}, 风格: ${this.currentThemeStyle}`);
    } catch (error) {
      console.error('[StatusBarService] 主题更新失败:', error);
      throw error;
    }
  }

  /**
   * 显示状态栏
   */
  public async show(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      await StatusBar.show();
      console.log('[StatusBarService] 状态栏已显示');
    } catch (error) {
      console.error('[StatusBarService] 显示状态栏失败:', error);
      throw error;
    }
  }

  /**
   * 隐藏状态栏
   */
  public async hide(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      await StatusBar.hide();
      console.log('[StatusBarService] 状态栏已隐藏');
    } catch (error) {
      console.error('[StatusBarService] 隐藏状态栏失败:', error);
      throw error;
    }
  }

  /**
   * 获取状态栏信息
   */
  public async getInfo() {
    if (!Capacitor.isNativePlatform()) {
      return null;
    }

    try {
      const info = await StatusBar.getInfo();
      console.log('[StatusBarService] 状态栏信息:', info);
      return info;
    } catch (error) {
      console.error('[StatusBarService] 获取状态栏信息失败:', error);
      throw error;
    }
  }

  /**
   * 设置状态栏是否覆盖WebView
   * @param overlay 是否覆盖
   */
  public async setOverlaysWebView(overlay: boolean): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      await StatusBar.setOverlaysWebView({ overlay });
      console.log(`[StatusBarService] 状态栏覆盖设置: ${overlay}`);
    } catch (error) {
      console.error('[StatusBarService] 设置状态栏覆盖失败:', error);
      throw error;
    }
  }

  /**
   * 获取当前主题模式
   */
  public getCurrentTheme(): 'light' | 'dark' {
    return this.currentTheme;
  }

  /**
   * 获取当前主题风格
   */
  public getCurrentThemeStyle(): ThemeStyle {
    return this.currentThemeStyle;
  }

  /**
   * 检查是否已初始化
   */
  public isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * 获取EdgeToEdge插件的insets信息 (仅Android)
   */
  public async getEdgeToEdgeInsets() {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
      return null;
    }

    try {
      const insets = await EdgeToEdge.getInsets();
      console.log('[StatusBarService] EdgeToEdge insets:', insets);
      return insets;
    } catch (error) {
      console.error('[StatusBarService] 获取EdgeToEdge insets失败:', error);
      return null;
    }
  }

  /**
   * 禁用EdgeToEdge模式 (仅Android)
   */
  public async disableEdgeToEdge(): Promise<void> {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
      return;
    }

    try {
      await EdgeToEdge.disable();
      console.log('[StatusBarService] EdgeToEdge已禁用');
    } catch (error) {
      console.error('[StatusBarService] 禁用EdgeToEdge失败:', error);
      throw error;
    }
  }

  /**
   * 抽取 Native 平台设置样式的公共逻辑，供 initialize 和 updateTheme 复用
   */
  private async applyNativeThemeStyle(): Promise<void> {
    // 获取当前主题配置，使用最新的 this.currentThemeStyle
    const themeConfig = themeConfigs[this.currentThemeStyle];
    if (!themeConfig) {
      console.error(`[StatusBarService] Theme config not found for style: ${this.currentThemeStyle}`);
      return;
    }

    let backgroundColor: string;
    // 使用最新的 this.currentTheme
    if (this.currentTheme === 'dark') {
      // 深色模式：黑底白字
      await StatusBar.setStyle({ style: Style.Dark }); // 文字/图标为浅色
      // 使用当前主题的深色背景色
      backgroundColor = themeConfig.colors.background.dark;
    } else {
      // 浅色模式：白底黑字
      await StatusBar.setStyle({ style: Style.Light }); // 文字/图标为深色
      backgroundColor = '#FFFFFF'; // 背景色为白色
    }

    // 设置状态栏背景色
    await StatusBar.setBackgroundColor({ color: backgroundColor });

    // Android平台：同时设置EdgeToEdge背景色以保持一致性
    // 【重要】这里设置的背景色会影响Android 15的底部导航栏区域颜色
    if (Capacitor.getPlatform() === 'android') {
      try {
        await EdgeToEdge.setBackgroundColor({ color: backgroundColor });
      } catch (e) {
        console.warn('[StatusBarService] EdgeToEdge.setBackgroundColor failed:', e);
      }
    }
  }


  /**
   * Web 平台状态栏处理
   * 使用当前实例的主题状态进行更新
   */
  private updateWebStatusBar(): void {
    try {
      // 确保使用最新的 this. 状态
      const currentStyle = this.currentThemeStyle; // 直接用 this.
      const currentThemeMode = this.currentTheme; // 直接用 this.

      const themeConfig = themeConfigs[currentStyle];
      if (!themeConfig) {
        console.error(`[StatusBarService] Web: Theme config not found for style: ${currentStyle}`);
        return;
      }

      // 更新 theme-color meta 标签（影响浏览器状态栏）
      let themeColorMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
      if (!themeColorMeta) {
        themeColorMeta = document.createElement('meta');
        themeColorMeta.name = 'theme-color';
        document.head.appendChild(themeColorMeta);
      }

      // 更新 apple-mobile-web-app-status-bar-style（iOS Safari）
      let appleStatusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]') as HTMLMetaElement;
      if (!appleStatusBarMeta) {
        appleStatusBarMeta = document.createElement('meta');
        appleStatusBarMeta.name = 'apple-mobile-web-app-status-bar-style';
        document.head.appendChild(appleStatusBarMeta);
      }

      // 使用与原生平台一致的颜色配置
      let statusBarColor: string;
      // 确保使用最新的 this. 状态
      if (currentThemeMode === 'dark') {
        // 深色模式：黑底白字，使用当前主题的深色背景色
        statusBarColor = themeConfig.colors.background.dark;
        appleStatusBarMeta.content = 'black'; // 与深色背景一致
      } else {
        // 浅色模式：白底黑字
        statusBarColor = '#FFFFFF';
        appleStatusBarMeta.content = 'default';
      }

      themeColorMeta.content = statusBarColor;

      // 更新 CSS 变量用于安全区域
      document.documentElement.style.setProperty('--status-bar-height', 'env(safe-area-inset-top, 20px)');
      document.documentElement.style.setProperty('--status-bar-color', statusBarColor);

      console.log(`[StatusBarService] Web 状态栏已更新: ${currentThemeMode}, 风格: ${currentStyle}, 颜色: ${statusBarColor}`);
    } catch (error) {
      console.error('[StatusBarService] Web 状态栏更新失败:', error);
    }
  }
}

// 导出单例实例
export const statusBarService = StatusBarService.getInstance();
