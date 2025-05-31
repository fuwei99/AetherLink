import { useTheme } from '@mui/material';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';

export const useInputStyles = () => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  
  // 获取输入框风格设置
  const inputBoxStyle = useSelector((state: RootState) =>
    (state.settings as any).inputBoxStyle || 'default'
  );

  // 获取样式配置
  const getStyles = () => {
    const baseStyles = {
      inputBg: 'transparent',
      iconBg: isDarkMode ? 'rgba(40, 40, 40, 0.8)' : 'rgba(248, 250, 252, 0.8)',
      border: isDarkMode ? '1px solid rgba(60, 60, 60, 0.8)' : '1px solid rgba(230, 230, 230, 0.8)',
      borderRadius: '20px',
      boxShadow: isDarkMode ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
    };

    switch (inputBoxStyle) {
      case 'modern':
        return {
          ...baseStyles,
          inputBg: 'transparent',
          borderRadius: '24px',
          boxShadow: isDarkMode ? '0 4px 16px rgba(0,0,0,0.4)' : '0 4px 16px rgba(0,0,0,0.15)',
        };
      case 'minimal':
        return {
          ...baseStyles,
          inputBg: 'transparent',
          border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
          borderRadius: '16px',
          boxShadow: 'none',
        };
      default:
        return baseStyles;
    }
  };

  return {
    styles: getStyles(),
    isDarkMode,
    inputBoxStyle
  };
};
