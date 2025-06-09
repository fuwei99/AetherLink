import React from 'react';
import { Box } from '@mui/material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

/**
 * 标签面板组件，用于在标签页中显示内容
 */
export default function TabPanel(props: TabPanelProps) {
  const { children, value, index } = props;

  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      id={`sidebar-tabpanel-${index}`}
      aria-labelledby={`sidebar-tab-${index}`}
      sx={{
        height: 'calc(100% - 48px)',
        overflow: 'auto',
        padding: '10px',
        display: value === index ? 'block' : 'none',
        // 移动端滚动优化
        WebkitOverflowScrolling: 'touch', // iOS 平滑滚动
        scrollBehavior: 'smooth', // 平滑滚动行为
        // 性能优化
        willChange: 'scroll-position', // 提示浏览器优化滚动
        transform: 'translateZ(0)', // 启用硬件加速
        // 滚动条样式优化
        scrollbarWidth: 'thin', // Firefox 细滚动条
        // 自定义滚动条样式
        '&::-webkit-scrollbar': {
          width: '4px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          background: 'rgba(0, 0, 0, 0.2)',
          borderRadius: '2px',
          '&:hover': {
            background: 'rgba(0, 0, 0, 0.3)',
          },
        },
        // 防止过度滚动
        overscrollBehavior: 'contain',
        // 防止内容溢出导致的滚动问题
        minHeight: 'fit-content',
      }}
    >
      {children}
    </Box>
  );
}

/**
 * 生成标签页的辅助属性
 */
export function a11yProps(index: number) {
  return {
    id: `sidebar-tab-${index}`,
    'aria-controls': `sidebar-tabpanel-${index}`,
  };
}
