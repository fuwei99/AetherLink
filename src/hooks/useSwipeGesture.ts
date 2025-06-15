import { useCallback, useRef, useState } from 'react';
import { useDrag } from '@use-gesture/react';

interface SwipeGestureOptions {
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  onSwipeProgress?: (progress: number, direction: 'left' | 'right') => void; // 滑动进度回调
  threshold?: number; // 触发手势的最小距离
  velocityThreshold?: number; // 触发手势的最小速度
  preventDefaultOnSwipe?: boolean; // 是否在滑动时阻止默认行为
  enabled?: boolean; // 是否启用手势
  edgeThreshold?: number; // 边缘触发区域宽度（像素）
  enableEdgeDetection?: boolean; // 是否启用边缘检测
}

/**
 * 基于 @use-gesture/react 的滑动手势Hook
 * 支持左滑和右滑检测，可用于侧边栏控制等场景
 */
export const useSwipeGesture = (options: SwipeGestureOptions = {}) => {
  const {
    onSwipeRight,
    onSwipeLeft,
    onSwipeProgress,
    threshold = 50, // 最小滑动距离50px
    velocityThreshold = 0.3, // 最小速度0.3px/ms
    preventDefaultOnSwipe = false,
    enabled = true,
    edgeThreshold = 50, // 边缘区域宽度50px
    enableEdgeDetection = false // 默认不启用边缘检测
  } = options;

  const [isSwipeActive, setIsSwipeActive] = useState(false);
  const startPositionRef = useRef<{ x: number; y: number } | null>(null);

  // 使用 @use-gesture/react 的 useDrag Hook
  const bind = useDrag(
    ({
      movement: [mx, my],
      velocity: [vx],
      initial: [ix, iy],
      cancel,
      first,
      last,
      event
    }) => {
      // 如果手势被禁用，直接返回
      if (!enabled) return;

      // 记录起始位置（用于边缘检测）
      if (first) {
        startPositionRef.current = { x: ix, y: iy };
        setIsSwipeActive(true);
      }

      // 检查是否为水平滑动（垂直滑动距离不应超过水平滑动距离）
      const isHorizontalSwipe = Math.abs(mx) > Math.abs(my);

      if (!isHorizontalSwipe && Math.abs(my) > 20) {
        // 如果垂直滑动距离过大，取消手势
        cancel();
        return;
      }

      // 边缘检测逻辑
      if (enableEdgeDetection && startPositionRef.current) {
        const startX = startPositionRef.current.x;
        const isStartInLeftEdge = startX <= edgeThreshold;

        // 右滑：必须从左边缘开始（打开侧边栏）
        // 左滑：任意位置都可以（关闭侧边栏）
        const shouldAllowGesture = (mx > 0 && isStartInLeftEdge) || (mx < 0);

        if (!shouldAllowGesture) {
          cancel();
          return;
        }
      }

      // 滑动进度回调
      if (onSwipeProgress && Math.abs(mx) > 10) {
        let shouldShowProgress = true;

        if (enableEdgeDetection && startPositionRef.current) {
          const startX = startPositionRef.current.x;
          const isStartInLeftEdge = startX <= edgeThreshold;

          // 只在有效的边缘区域内才显示进度
          shouldShowProgress = (mx > 0 && isStartInLeftEdge) || (mx < 0);
        }

        if (shouldShowProgress) {
          const progress = Math.min(Math.abs(mx), threshold * 2) / threshold * 50;
          const direction = mx > 0 ? 'right' : 'left';
          onSwipeProgress(progress, direction);
        }
      }

      // 手势结束时的处理
      if (last) {
        const isDistanceEnough = Math.abs(mx) > threshold;
        const isVelocityEnough = Math.abs(vx) > velocityThreshold;

        if (isHorizontalSwipe && (isDistanceEnough || isVelocityEnough)) {
          // 边缘检测验证
          if (enableEdgeDetection && startPositionRef.current) {
            const startX = startPositionRef.current.x;
            const isStartInLeftEdge = startX <= edgeThreshold;

            if (mx > 0 && onSwipeRight && isStartInLeftEdge) {
              // 右滑：从左边缘开始，用于打开侧边栏
              onSwipeRight();
            } else if (mx < 0 && onSwipeLeft) {
              // 左滑：任意位置都可以，用于关闭侧边栏
              onSwipeLeft();
            }
          } else {
            // 不启用边缘检测时的逻辑
            if (mx > 0 && onSwipeRight) {
              onSwipeRight();
            } else if (mx < 0 && onSwipeLeft) {
              onSwipeLeft();
            }
          }
        }

        // 重置进度
        if (onSwipeProgress) {
          onSwipeProgress(0, 'right');
        }

        setIsSwipeActive(false);
        startPositionRef.current = null;
      }

      // 阻止默认行为
      if (preventDefaultOnSwipe && Math.abs(mx) > threshold / 2) {
        event.preventDefault();
      }
    },
    {
      enabled,
      axis: 'lock', // 锁定到检测到的第一个轴
      threshold: [threshold / 4, threshold / 4], // 设置较小的阈值以便早期检测
      preventDefault: preventDefaultOnSwipe,
      pointer: { touch: true }, // 启用触摸支持
      filterTaps: true, // 过滤点击事件
    }
  );

  // 重置滑动状态
  const resetSwipeState = useCallback(() => {
    setIsSwipeActive(false);
    startPositionRef.current = null;
  }, []);

  return {
    ...bind(),
    isSwipeActive,
    resetSwipeState
  };
};

/**
 * 专门用于侧边栏的滑动手势Hook
 * 预配置了适合侧边栏的参数，基于 @use-gesture/react
 */
export const useSidebarSwipeGesture = (
  onOpenSidebar?: () => void,
  onCloseSidebar?: () => void,
  enabled: boolean = true,
  onSwipeProgress?: (progress: number, direction: 'left' | 'right') => void
) => {
  return useSwipeGesture({
    onSwipeRight: onOpenSidebar,
    onSwipeLeft: onCloseSidebar,
    onSwipeProgress,
    threshold: 80, // 侧边栏需要更大的滑动距离
    velocityThreshold: 0.5, // 更高的速度要求
    preventDefaultOnSwipe: true, // 阻止默认行为
    enabled,
    enableEdgeDetection: true, // 启用边缘检测
    edgeThreshold: 30 // 边缘区域30px，比较小的区域更精确
  });
};
