import { createTheme, alpha } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';

// 主题风格类型
export type ThemeStyle = 'default' | 'claude' | 'minimal' | 'vibrant';

// 主题配置接口
export interface ThemeConfig {
  name: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent?: string;
    background: {
      light: string;
      dark: string;
    };
    paper: {
      light: string;
      dark: string;
    };
    text: {
      primary: {
        light: string;
        dark: string;
      };
      secondary: {
        light: string;
        dark: string;
      };
    };
  };
  gradients?: {
    primary: string;
    secondary?: string;
  };
  shadows?: {
    light: string[];
    dark: string[];
  };
}

// 预定义主题配置
export const themeConfigs: Record<ThemeStyle, ThemeConfig> = {
  default: {
    name: '默认主题',
    description: '简洁现代的默认设计风格',
    colors: {
      primary: '#64748B',
      secondary: '#10B981',
      background: {
        light: '#F8FAFC',
        dark: '#1A1A1A', // 统一使用稍微柔和的深灰色
      },
      paper: {
        light: '#FFFFFF',
        dark: '#2A2A2A', // 改为更柔和的深灰色，提高可读性
      },
      text: {
        primary: {
          light: '#1E293B',
          dark: '#F0F0F0', // 改为稍微柔和的白色，提高舒适度
        },
        secondary: {
          light: '#64748B',
          dark: '#B0B0B0', // 提高次要文字的对比度
        },
      },
    },
    gradients: {
      primary: 'linear-gradient(90deg, #9333EA, #754AB4)',
    },
  },

  claude: {
    name: 'Claude 风格',
    description: '温暖优雅的 Claude AI 设计风格',
    colors: {
      primary: '#D97706',
      secondary: '#059669',
      accent: '#DC2626',
      background: {
        light: '#FEF7ED',
        dark: '#1C1917',
      },
      paper: {
        light: '#FFFFFF',
        dark: '#292524',
      },
      text: {
        primary: {
          light: '#1C1917',
          dark: '#F5F5F4',
        },
        secondary: {
          light: '#78716C',
          dark: '#A8A29E',
        },
      },
    },
    gradients: {
      primary: 'linear-gradient(135deg, #D97706, #EA580C)',
      secondary: 'linear-gradient(135deg, #059669, #047857)',
    },
  },

  minimal: {
    name: '极简风格',
    description: '纯净简约的极简主义设计',
    colors: {
      primary: '#000000',
      secondary: '#6B7280',
      background: {
        light: '#FFFFFF',
        dark: '#1A1A1A', // 改为稍微柔和的深灰色，避免纯黑色过于刺眼
      },
      paper: {
        light: '#FAFAFA',
        dark: '#2A2A2A', // 改为更柔和的深灰色
      },
      text: {
        primary: {
          light: '#000000',
          dark: '#F0F0F0', // 改为稍微柔和的白色，避免纯白色过于刺眼
        },
        secondary: {
          light: '#6B7280',
          dark: '#A0A0A0', // 调整次要文字颜色，提高可读性
        },
      },
    },
    gradients: {
      primary: 'linear-gradient(90deg, #000000, #374151)',
    },
  },

  vibrant: {
    name: '活力风格',
    description: '充满活力的彩色设计风格',
    colors: {
      primary: '#8B5CF6',
      secondary: '#06B6D4',
      accent: '#F59E0B',
      background: {
        light: '#FAFBFF', // 改为更中性的浅色背景，提高文字对比度
        dark: '#0F172A',
      },
      paper: {
        light: '#FFFFFF',
        dark: '#1E293B',
      },
      text: {
        primary: {
          light: '#1E293B', // 改为更深的颜色，提高在浅色背景上的对比度
          dark: '#F1F5F9',
        },
        secondary: {
          light: '#334155', // 改为更深的颜色，提高可读性
          dark: '#CBD5E1',
        },
      },
    },
    gradients: {
      primary: 'linear-gradient(135deg, #8B5CF6, #06B6D4)',
      secondary: 'linear-gradient(135deg, #F59E0B, #EF4444)',
    },
  },
};

// 创建主题函数
export const createCustomTheme = (
  mode: 'light' | 'dark',
  themeStyle: ThemeStyle,
  fontSize: number = 16
): Theme => {
  const config = themeConfigs[themeStyle];
  const fontScale = fontSize / 16;

  return createTheme({
    palette: {
      mode,
      primary: {
        main: config.colors.primary,
        light: alpha(config.colors.primary, 0.7),
        dark: alpha(config.colors.primary, 0.9),
      },
      secondary: {
        main: config.colors.secondary,
        light: alpha(config.colors.secondary, 0.7),
        dark: alpha(config.colors.secondary, 0.9),
      },
      background: {
        default: config.colors.background[mode],
        paper: config.colors.paper[mode],
      },
      text: {
        primary: config.colors.text.primary[mode],
        secondary: config.colors.text.secondary[mode],
      },
      divider: mode === 'light' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)',
      error: {
        main: '#EF4444',
      },
      warning: {
        main: '#F59E0B',
      },
      info: {
        main: '#38BDF8',
      },
      success: {
        main: '#10B981',
      },
    },
    typography: {
      fontSize: fontSize,
      fontFamily: [
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
        '"Apple Color Emoji"',
        '"Segoe UI Emoji"',
        '"Segoe UI Symbol"',
      ].join(','),
      h1: { fontSize: `${2.5 * fontScale}rem` },
      h2: { fontSize: `${2 * fontScale}rem` },
      h3: { fontSize: `${1.75 * fontScale}rem` },
      h4: { fontSize: `${1.5 * fontScale}rem` },
      h5: { fontSize: `${1.25 * fontScale}rem` },
      h6: { fontSize: `${1.125 * fontScale}rem` },
      body1: { fontSize: `${1 * fontScale}rem` },
      body2: { fontSize: `${0.875 * fontScale}rem` },
      caption: { fontSize: `${0.75 * fontScale}rem` },
    },
    shape: {
      borderRadius: themeStyle === 'minimal' ? 4 : 8,
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            ...(themeStyle === 'claude' && {
              boxShadow: mode === 'light' 
                ? '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)'
                : '0 4px 6px rgba(0, 0, 0, 0.3)',
            }),
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            ...(config.gradients && {
              '&.MuiButton-contained': {
                background: config.gradients.primary,
                '&:hover': {
                  background: config.gradients.primary,
                  filter: 'brightness(0.9)',
                },
              },
            }),
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            ...(themeStyle === 'claude' && {
              background: mode === 'light'
                ? `rgba(254, 247, 237, 0.95)` // 使用Claude主题的米色背景
                : 'rgba(41, 37, 36, 0.95)',
              backdropFilter: 'blur(12px)',
            }),
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            ...(themeStyle === 'claude' && {
              background: mode === 'light'
                ? config.colors.background.light
                : config.colors.background.dark,
              borderRight: mode === 'light'
                ? '1px solid rgba(217, 119, 6, 0.1)'
                : '1px solid rgba(217, 119, 6, 0.2)',
            }),
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            ...(themeStyle === 'claude' && {
              '&:hover': {
                backgroundColor: mode === 'light'
                  ? 'rgba(217, 119, 6, 0.08)'
                  : 'rgba(217, 119, 6, 0.12)',
              },
              '&.Mui-selected': {
                backgroundColor: mode === 'light'
                  ? 'rgba(217, 119, 6, 0.12)'
                  : 'rgba(217, 119, 6, 0.16)',
                '&:hover': {
                  backgroundColor: mode === 'light'
                    ? 'rgba(217, 119, 6, 0.16)'
                    : 'rgba(217, 119, 6, 0.20)',
                },
              },
            }),
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            ...(themeStyle === 'claude' && {
              '& .MuiOutlinedInput-root': {
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: mode === 'light'
                    ? 'rgba(217, 119, 6, 0.5)'
                    : 'rgba(217, 119, 6, 0.7)',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: config.colors.primary,
                },
              },
            }),
          },
        },
      },
      // 移除全局Box样式覆盖，避免影响消息内容
      // 添加全局CssBaseline样式覆盖
      MuiCssBaseline: {
        styleOverrides: {
          ...(themeStyle === 'claude' && {
            body: {
              backgroundColor: config.colors.background[mode],
            },
            '#root': {
              backgroundColor: config.colors.background[mode],
            },
          }),
        },
      },
    },
  });
};

// 获取主题预览颜色
export const getThemePreviewColors = (themeStyle: ThemeStyle) => {
  const config = themeConfigs[themeStyle];
  return {
    primary: config.colors.primary,
    secondary: config.colors.secondary,
    background: config.colors.background.light,
    paper: config.colors.paper.light,
  };
};
