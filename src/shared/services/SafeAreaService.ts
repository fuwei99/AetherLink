/**
 * 安全区域管理服务
 * 处理 Android 15 底部导航栏重叠问题和各平台的安全区域
 */
// import { SafeArea, initialize } from '@capacitor-community/safe-area'; // 暂时禁用
import { initialize } from '@capacitor-community/safe-area';
import { Capacitor } from '@capacitor/core';

export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * 安全区域管理服务类
 */
export class SafeAreaService {
  private static instance: SafeAreaService;
  private currentInsets: SafeAreaInsets = { top: 0, right: 0, bottom: 0, left: 0 };
  private isInitialized = false;
  private listeners: Array<(insets: SafeAreaInsets) => void> = [];
  private cssWatchTimer?: number;

  private constructor() {}

  public static getInstance(): SafeAreaService {
    if (!SafeAreaService.instance) {
      SafeAreaService.instance = new SafeAreaService();
    }
    return SafeAreaService.instance;
  }

  /**
   * 初始化安全区域服务
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // 首先调用 initialize 函数来设置基础 CSS 变量
      initialize();

      if (Capacitor.isNativePlatform()) {
        // 原生平台：使用新的 Safe Area 插件 API
        await this.initializeNativeSafeArea();
      } else {
        // Web 平台：使用 CSS env() 变量
        this.initializeWebSafeArea();
      }

      // 应用安全区域到 CSS 变量
      this.applySafeAreaToCSS();

      this.isInitialized = true;
      console.log('[SafeAreaService] 安全区域服务初始化完成', this.currentInsets);
    } catch (error) {
      console.error('[SafeAreaService] 安全区域服务初始化失败:', error);
      // 使用默认值
      this.setFallbackInsets();
      this.applySafeAreaToCSS();
      this.isInitialized = true; // 即使失败也标记为已初始化，避免重复尝试
    }
  }

  /**
   * 初始化原生平台安全区域
   */
  private async initializeNativeSafeArea(): Promise<void> {
    try {
      // 暂时禁用SafeArea插件，避免与键盘弹出时的动态变化冲突
      console.log('[SafeAreaService] 暂时禁用SafeArea插件，使用回退值');

      // 直接使用回退值，不启用插件
      this.setFallbackInsets();

      console.log('[SafeAreaService] 原生安全区域初始化完成（使用回退值）:', this.currentInsets);

      /* 原来的插件启用代码，暂时注释掉
      await SafeArea.enable({
        config: {
          customColorsForSystemBars: false, // 不自定义颜色，避免与StatusBarService冲突
          offset: 0
        }
      });

      console.log('[SafeAreaService] SafeArea 插件已启用');

      // 等待一小段时间让插件设置CSS变量
      await new Promise(resolve => setTimeout(resolve, 100));

      // 新版本的插件会自动将安全区域值注入到 CSS 变量中
      // 我们需要从 CSS 变量中读取这些值
      this.readSafeAreaFromCSS();

      // 启动CSS变量监听器，以便在值变化时更新
      this.startCSSWatcher();

      console.log('[SafeAreaService] 原生安全区域获取成功:', this.currentInsets);
      */

    } catch (error) {
      console.error('[SafeAreaService] 原生安全区域获取失败:', error);
      // 不再抛出错误，而是使用回退值
      this.setFallbackInsets();
    }
  }

  /**
   * 从CSS变量中读取安全区域值 - 暂时禁用
   */
  /*
  private readSafeAreaFromCSS(): void {
    const root = document.documentElement;
    const computedStyle = window.getComputedStyle(root);

    // 尝试从 --safe-area-inset-* 变量读取
    const topValue = computedStyle.getPropertyValue('--safe-area-inset-top').trim();
    const rightValue = computedStyle.getPropertyValue('--safe-area-inset-right').trim();
    const bottomValue = computedStyle.getPropertyValue('--safe-area-inset-bottom').trim();
    const leftValue = computedStyle.getPropertyValue('--safe-area-inset-left').trim();

    this.currentInsets = {
      top: this.parsePxValue(topValue) || 0,
      right: this.parsePxValue(rightValue) || 0,
      bottom: this.parsePxValue(bottomValue) || 0,
      left: this.parsePxValue(leftValue) || 0
    };

    // 如果所有值都是0，可能是插件还没有设置值，使用回退值
    if (this.currentInsets.top === 0 && this.currentInsets.bottom === 0) {
      this.setFallbackInsets();
    }
  }
  */

  /**
   * 启动CSS变量监听器 - 暂时禁用
   */
  /*
  private startCSSWatcher(): void {
    // 清除之前的定时器
    if (this.cssWatchTimer) {
      clearInterval(this.cssWatchTimer);
    }

    // 每500ms检查一次CSS变量是否有变化
    this.cssWatchTimer = window.setInterval(() => {
      const previousInsets = { ...this.currentInsets };
      this.readSafeAreaFromCSS();

      // 检查是否有变化
      const hasChanged =
        previousInsets.top !== this.currentInsets.top ||
        previousInsets.right !== this.currentInsets.right ||
        previousInsets.bottom !== this.currentInsets.bottom ||
        previousInsets.left !== this.currentInsets.left;

      if (hasChanged) {
        console.log('[SafeAreaService] 安全区域已更新:', this.currentInsets);
        this.applySafeAreaToCSS();
        this.notifyListeners();
      }
    }, 500);
  }
  */

  /**
   * 初始化 Web 平台安全区域
   */
  private initializeWebSafeArea(): void {
    // 在 Web 平台，尝试从 CSS env() 变量获取安全区域
    const testElement = document.createElement('div');
    testElement.style.position = 'fixed';
    testElement.style.top = 'env(safe-area-inset-top, 0px)';
    testElement.style.right = 'env(safe-area-inset-right, 0px)';
    testElement.style.bottom = 'env(safe-area-inset-bottom, 0px)';
    testElement.style.left = 'env(safe-area-inset-left, 0px)';
    testElement.style.visibility = 'hidden';
    testElement.style.pointerEvents = 'none';

    document.body.appendChild(testElement);

    const computedStyle = window.getComputedStyle(testElement);

    this.currentInsets = {
      top: this.parsePxValue(computedStyle.top),
      right: this.parsePxValue(computedStyle.right),
      bottom: this.parsePxValue(computedStyle.bottom),
      left: this.parsePxValue(computedStyle.left)
    };

    document.body.removeChild(testElement);

    console.log('[SafeAreaService] Web 安全区域获取成功:', this.currentInsets);
  }

  /**
   * 设置回退安全区域值
   */
  private setFallbackInsets(): void {
    // 根据平台设置默认值
    if (Capacitor.getPlatform() === 'android') {
      // Android 默认值，特别考虑 Android 15
      this.currentInsets = { top: 24, right: 0, bottom: 48, left: 0 };
    } else if (Capacitor.getPlatform() === 'ios') {
      // iOS 默认值，考虑刘海屏
      this.currentInsets = { top: 44, right: 0, bottom: 34, left: 0 };
    } else {
      // Web 默认值
      this.currentInsets = { top: 0, right: 0, bottom: 0, left: 0 };
    }
    
    console.log('[SafeAreaService] 使用回退安全区域值:', this.currentInsets);
  }

  /**
   * 应用安全区域到 CSS 变量
   */
  private applySafeAreaToCSS(): void {
    const root = document.documentElement;
    
    // 设置基础安全区域变量
    root.style.setProperty('--safe-area-inset-top', `${this.currentInsets.top}px`);
    root.style.setProperty('--safe-area-inset-right', `${this.currentInsets.right}px`);
    root.style.setProperty('--safe-area-inset-bottom', `${this.currentInsets.bottom}px`);
    root.style.setProperty('--safe-area-inset-left', `${this.currentInsets.left}px`);
    
    // 设置常用的组合变量
    root.style.setProperty('--safe-area-top', `${this.currentInsets.top}px`);
    root.style.setProperty('--safe-area-bottom', `${this.currentInsets.bottom}px`);
    
    // 特别为 Android 15 底部导航栏设置变量
    if (Capacitor.getPlatform() === 'android' && this.currentInsets.bottom > 0) {
      root.style.setProperty('--android-nav-bar-height', `${this.currentInsets.bottom}px`);
      root.style.setProperty('--chat-input-bottom-padding', `${this.currentInsets.bottom + 8}px`);
    } else {
      root.style.setProperty('--android-nav-bar-height', '0px');
      root.style.setProperty('--chat-input-bottom-padding', '8px');
    }
    
    // 为聊天界面设置专用变量
    root.style.setProperty('--chat-container-padding-top', `${this.currentInsets.top}px`);
    root.style.setProperty('--chat-container-padding-bottom', `${this.currentInsets.bottom}px`);
    
    console.log('[SafeAreaService] CSS 变量已更新');
  }

  /**
   * 解析像素值
   */
  private parsePxValue(value: string): number {
    if (!value || value === 'none' || value === 'auto') {
      return 0;
    }

    // 匹配 px 值
    const pxMatch = value.match(/^(\d+(?:\.\d+)?)px$/);
    if (pxMatch) {
      return parseFloat(pxMatch[1]);
    }

    // 匹配纯数字
    const numMatch = value.match(/^(\d+(?:\.\d+)?)$/);
    if (numMatch) {
      return parseFloat(numMatch[1]);
    }

    return 0;
  }

  /**
   * 获取当前安全区域
   */
  public getCurrentInsets(): SafeAreaInsets {
    return { ...this.currentInsets };
  }

  /**
   * 添加安全区域变化监听器
   */
  public addListener(callback: (insets: SafeAreaInsets) => void): () => void {
    this.listeners.push(callback);
    
    // 返回移除监听器的函数
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * 通知所有监听器 - 暂时禁用
   */
  /*
  private notifyListeners(): void {
    this.listeners.forEach(callback => {
      try {
        callback(this.currentInsets);
      } catch (error) {
        console.error('[SafeAreaService] 监听器回调失败:', error);
      }
    });
  }
  */

  /**
   * 检查是否已初始化
   */
  public isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * 获取特定区域的安全距离
   */
  public getInset(side: 'top' | 'right' | 'bottom' | 'left'): number {
    return this.currentInsets[side];
  }

  /**
   * 检查是否有底部安全区域（用于判断是否有底部导航栏）
   */
  public hasBottomInset(): boolean {
    return this.currentInsets.bottom > 0;
  }

  /**
   * 获取聊天输入框应该使用的底部边距
   */
  public getChatInputBottomPadding(): number {
    return this.currentInsets.bottom > 0 ? this.currentInsets.bottom + 8 : 8;
  }

  /**
   * 清理资源
   */
  public cleanup(): void {
    if (this.cssWatchTimer) {
      clearInterval(this.cssWatchTimer);
      this.cssWatchTimer = undefined;
    }
    this.listeners = [];
  }
}

// 导出单例实例
export const safeAreaService = SafeAreaService.getInstance();
