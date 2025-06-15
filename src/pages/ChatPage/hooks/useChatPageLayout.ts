import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMediaQuery, useTheme } from '@mui/material';

/**
 * 处理聊天页面布局相关逻辑的钩子
 * 负责响应式布局、导航跳转等功能
 */
export const useChatPageLayout = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(!isMobile);

  // 优化屏幕尺寸变化处理，使用防抖避免频繁更新
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const updateDrawerState = () => {
      setDrawerOpen(!isMobile);
    };

    // 使用防抖，避免频繁的状态更新
    timeoutId = setTimeout(updateDrawerState, 100);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isMobile]);

  // 使用useCallback缓存setDrawerOpen函数，避免子组件重新渲染
  const handleSetDrawerOpen = useCallback((open: boolean) => {
    setDrawerOpen(open);
  }, []);

  return {
    isMobile,
    drawerOpen,
    setDrawerOpen: handleSetDrawerOpen,
    navigate
  };
};