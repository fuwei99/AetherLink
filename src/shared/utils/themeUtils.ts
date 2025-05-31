import { Theme, alpha } from '@mui/material/styles';
import { ThemeStyle } from '../config/themes';

/**
 * 主题工具函数，帮助组件获取主题相关的颜色和样式
 */

// 获取主题适配的颜色
export const getThemeColors = (theme: Theme, themeStyle?: ThemeStyle) => {
  const isDark = theme.palette.mode === 'dark';
  
  // 基础颜色
  const baseColors = {
    primary: theme.palette.primary.main,
    secondary: theme.palette.secondary.main,
    background: theme.palette.background.default,
    paper: theme.palette.background.paper,
    textPrimary: theme.palette.text.primary,
    textSecondary: theme.palette.text.secondary,
    divider: theme.palette.divider,
  };

  // 根据主题风格调整特定颜色
  const styleSpecificColors = {
    // AI消息气泡颜色
    aiBubbleColor: themeStyle === 'claude'
      ? (isDark ? alpha('#D97706', 0.2) : alpha('#D97706', 0.15))
      : (isDark ? '#1a3b61' : '#e6f4ff'),

    aiBubbleActiveColor: themeStyle === 'claude'
      ? (isDark ? alpha('#D97706', 0.3) : alpha('#D97706', 0.2))
      : (isDark ? '#234b79' : '#d3e9ff'),

    // 用户消息气泡颜色
    userBubbleColor: themeStyle === 'claude'
      ? (isDark ? alpha('#059669', 0.2) : alpha('#059669', 0.15))
      : (isDark ? '#333333' : theme.palette.primary.light),

    // 按钮和交互元素颜色
    buttonPrimary: themeStyle === 'claude' ? '#D97706' : theme.palette.primary.main,
    buttonSecondary: themeStyle === 'claude' ? '#059669' : theme.palette.secondary.main,

    // 图标颜色
    iconColor: isDark ? '#64B5F6' : '#1976D2',
    iconColorSuccess: '#4CAF50',
    iconColorWarning: '#FF9800',
    iconColorError: '#f44336',
    iconColorInfo: '#2196F3',

    // 悬停和选中状态
    hoverColor: themeStyle === 'claude'
      ? (isDark ? alpha('#D97706', 0.12) : alpha('#D97706', 0.08))
      : (isDark ? alpha(theme.palette.primary.main, 0.12) : alpha(theme.palette.primary.main, 0.08)),

    selectedColor: themeStyle === 'claude'
      ? (isDark ? alpha('#D97706', 0.16) : alpha('#D97706', 0.12))
      : (isDark ? alpha(theme.palette.primary.main, 0.16) : alpha(theme.palette.primary.main, 0.12)),

    // 边框颜色
    borderColor: themeStyle === 'claude'
      ? (isDark ? alpha('#D97706', 0.2) : alpha('#D97706', 0.1))
      : theme.palette.divider,

    // 工具栏样式
    toolbarBg: isDark ? 'rgba(30, 30, 30, 0.85)' : 'rgba(255, 255, 255, 0.85)',
    toolbarBorder: isDark ? 'rgba(60, 60, 60, 0.8)' : 'rgba(230, 230, 230, 0.8)',
    toolbarShadow: isDark ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.07)',
  };

  return {
    ...baseColors,
    ...styleSpecificColors,
    isDark,
  };
};

// 获取消息样式
export const getMessageStyles = (theme: Theme, themeStyle?: ThemeStyle, isUserMessage: boolean = false) => {
  const colors = getThemeColors(theme, themeStyle);
  
  return {
    backgroundColor: isUserMessage ? colors.userBubbleColor : colors.aiBubbleColor,
    color: colors.textPrimary,
    borderColor: colors.borderColor,
    '&:hover': {
      backgroundColor: isUserMessage 
        ? alpha(colors.userBubbleColor, 0.8)
        : colors.aiBubbleActiveColor,
    },
  };
};

// 获取按钮样式
export const getButtonStyles = (theme: Theme, themeStyle?: ThemeStyle, variant: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' = 'primary') => {
  const colors = getThemeColors(theme, themeStyle);
  
  const colorMap = {
    primary: colors.buttonPrimary,
    secondary: colors.buttonSecondary,
    success: colors.iconColorSuccess,
    warning: colors.iconColorWarning,
    error: colors.iconColorError,
    info: colors.iconColorInfo,
  };

  const baseColor = colorMap[variant];

  return {
    color: baseColor,
    borderColor: alpha(baseColor, 0.5),
    backgroundColor: alpha(baseColor, 0.08),
    '&:hover': {
      backgroundColor: alpha(baseColor, 0.12),
      borderColor: alpha(baseColor, 0.7),
    },
    '&:active': {
      backgroundColor: alpha(baseColor, 0.16),
    },
  };
};

// 获取列表项样式
export const getListItemStyles = (theme: Theme, themeStyle?: ThemeStyle, isSelected: boolean = false) => {
  const colors = getThemeColors(theme, themeStyle);
  
  return {
    backgroundColor: isSelected ? colors.selectedColor : 'transparent',
    '&:hover': {
      backgroundColor: isSelected ? alpha(colors.selectedColor, 1.2) : colors.hoverColor,
    },
    borderRadius: theme.shape.borderRadius,
    marginBottom: 0.5,
  };
};

// 获取输入框样式
export const getInputStyles = (theme: Theme, themeStyle?: ThemeStyle) => {
  const colors = getThemeColors(theme, themeStyle);
  
  return {
    '& .MuiOutlinedInput-root': {
      backgroundColor: colors.paper,
      '& fieldset': {
        borderColor: colors.borderColor,
      },
      '&:hover fieldset': {
        borderColor: alpha(colors.primary, 0.5),
      },
      '&.Mui-focused fieldset': {
        borderColor: colors.primary,
      },
    },
  };
};

// 获取工具栏样式
export const getToolbarStyles = (theme: Theme, themeStyle?: ThemeStyle) => {
  const colors = getThemeColors(theme, themeStyle);
  
  return {
    buttonBg: colors.toolbarBg,
    buttonBorder: colors.toolbarBorder,
    buttonShadow: colors.toolbarShadow,
    hoverBg: colors.isDark ? 'rgba(40, 40, 40, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    hoverShadow: colors.isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.1)',
    borderRadius: '50px',
    backdropFilter: 'blur(5px)',
  };
};

// 获取侧边栏样式
export const getSidebarStyles = (theme: Theme, themeStyle?: ThemeStyle) => {
  const colors = getThemeColors(theme, themeStyle);
  
  return {
    backgroundColor: colors.background,
    borderColor: colors.borderColor,
    itemHoverColor: colors.hoverColor,
    itemSelectedColor: colors.selectedColor,
  };
};

// 检查是否为Claude主题
export const isClaudeTheme = (themeStyle?: ThemeStyle): boolean => {
  return themeStyle === 'claude';
};

// 获取Claude主题特定的样式
export const getClaudeThemeStyles = (theme: Theme) => {
  if (theme.palette.mode === 'dark') {
    return {
      background: '#1C1917',
      paper: '#292524',
      primary: '#D97706',
      secondary: '#059669',
      accent: '#DC2626',
    };
  } else {
    return {
      background: '#FEF7ED',
      paper: '#FFFFFF',
      primary: '#D97706',
      secondary: '#059669',
      accent: '#DC2626',
    };
  }
};
