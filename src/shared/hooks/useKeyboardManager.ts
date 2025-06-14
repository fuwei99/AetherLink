import { useState, useEffect } from 'react';
import { Keyboard as CapacitorKeyboard } from '@capacitor/keyboard';

/**
 * 键盘管理 Hook
 * 统一处理键盘显示/隐藏事件，避免页面切换时的输入法闪烁问题
 */
export const useKeyboardManager = () => {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [isPageTransitioning, setIsPageTransitioning] = useState(false);

  // Capacitor 键盘事件监听器
  useEffect(() => {
    let keyboardShowListener: any = null;
    let keyboardHideListener: any = null;

    const setupKeyboardListeners = async () => {
      try {
        // 监听键盘显示事件
        keyboardShowListener = await CapacitorKeyboard.addListener('keyboardWillShow', () => {
          console.log('[KeyboardManager] 键盘将要显示');
          setIsKeyboardVisible(true);
          setIsPageTransitioning(false); // 键盘显示时清除页面切换状态
        });

        // 监听键盘隐藏事件
        keyboardHideListener = await CapacitorKeyboard.addListener('keyboardDidHide', () => {
          console.log('[KeyboardManager] 键盘已隐藏');
          setIsKeyboardVisible(false);
        });

        console.log('[KeyboardManager] 键盘事件监听器设置成功');
      } catch (error) {
        console.warn('[KeyboardManager] 键盘事件监听器设置失败:', error);
      }
    };

    setupKeyboardListeners();

    return () => {
      if (keyboardShowListener) {
        keyboardShowListener.remove();
      }
      if (keyboardHideListener) {
        keyboardHideListener.remove();
      }
    };
  }, []);

  // 页面切换检测
  useEffect(() => {
    // 组件挂载时标记为页面切换状态
    setIsPageTransitioning(true);
    console.log('[KeyboardManager] 页面切换状态开始');
    
    // 延迟清除页面切换状态，避免初始化时的焦点操作
    const timer = setTimeout(() => {
      setIsPageTransitioning(false);
      console.log('[KeyboardManager] 页面切换状态结束');
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, []); // 只在组件挂载时执行

  /**
   * 手动隐藏键盘
   */
  const hideKeyboard = async () => {
    try {
      await CapacitorKeyboard.hide();
      console.log('[KeyboardManager] 手动隐藏键盘');
    } catch (error) {
      console.warn('[KeyboardManager] 隐藏键盘失败:', error);
    }
  };

  /**
   * 检查是否应该执行焦点操作
   * 在页面切换期间避免不必要的焦点操作
   */
  const shouldHandleFocus = () => {
    return !isPageTransitioning;
  };

  return {
    isKeyboardVisible,
    isPageTransitioning,
    hideKeyboard,
    shouldHandleFocus
  };
};
